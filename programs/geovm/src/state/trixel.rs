use crate::errors::ErrorCode;
use anchor_lang::prelude::*;
use super::trixel_data::{TrixelData, TrixelDataType};



#[derive(Default)]
#[account]
pub struct Trixel {
    pub world: Pubkey,
    pub id: u64,
    pub resolution: u8,
    pub updates: u64,
    pub last_update: i64,
    pub hash: [u8;32],
    pub child_hashes: [[u8;32]; 4],
    pub data: TrixelData
}

impl Trixel {

    pub fn bytes() -> usize {
        8 + std::mem::size_of::<Trixel>() + 50 // arbitrary data
    }

    pub fn new()-> Self {
        Self::default()
    }

    pub fn init(
        &mut self,
        world: Pubkey,
        id: u64,
        resolution: u8,
        world_data_type: TrixelDataType
    ) -> Result<()> {
        self.world = world;
        self.id = id;
        self.resolution = resolution;
        self.child_hashes = [[0; 32]; 4];
        self.last_update = Clock::get()?.unix_timestamp;
        self.updates = 0;
        self.data = match world_data_type {
            TrixelDataType::Count => TrixelData::Count { count: 0 },
            TrixelDataType::AggregateOverwrite => TrixelData::AggregateOverwrite { metric: 0 },
            TrixelDataType::AggregateAccumulate => TrixelData::AggregateAccumulate { metric: 0 },
            TrixelDataType::MeanOverwrite => TrixelData::MeanOverwrite { numerator: 0, denominator: 0 },
            TrixelDataType::MeanAccumulate => TrixelData::MeanAccumulate { numerator: 0, denominator: 0 },
        };
        self.hash = self.compute_hash()?;
        Ok(())
    }

    /// Computes the hash of the trixel's data and child hashes
    pub fn compute_hash(&self) -> Result<[u8; 32]> {
        // Create a buffer to hold the data and child hashes
        let mut data_buffer = Vec::with_capacity(std::mem::size_of::<u64>() + 4 * 32); // Adjusted capacity estimation
        
        // Add the data value
        data_buffer.extend_from_slice(&self.data.try_to_vec()?); // Changed to try_to_vec()
        
        // Add all child hashes
        for hash in self.child_hashes.iter() {
            data_buffer.extend_from_slice(hash);
        }
        
        // Compute the SHA-256 hash
        let hash = anchor_lang::solana_program::hash::hash(&data_buffer);
        Ok(hash.to_bytes())
    }

    /// Refreshes the trixel's hash by recomputing it from current data and child hashes
    /// 
    /// # Returns
    /// 
    /// * `Result<[u8; 32]>` - The newly computed trixel hash
    pub fn refresh_hash(&mut self) -> Result<[u8; 32]> {
        self.hash = self.compute_hash()?;
        Ok(self.hash)
    }
    /// Updates the child hash at the specified index and recomputes the trixel's hash
    /// 
    /// # Arguments
    /// 
    /// * `child_idx` - The index of the child hash to update (0-3)
    /// * `new_hash` - The new hash value to set
    /// 
    /// # Returns
    /// 
    /// * `Result<[u8; 32]>` - The newly computed trixel hash
    pub fn update_child_hash(&mut self, child_idx: usize, new_hash: [u8; 32]) -> Result<[u8; 32]> {
        require!(child_idx < 4, ErrorCode::InvalidArgument);
        self.child_hashes[child_idx] = new_hash;
        self.hash = self.compute_hash()?;
        self.last_update = Clock::get()?.unix_timestamp;
        self.updates = self.updates.checked_add(1).unwrap();
        Ok(self.hash)
    }

    /// Updates the trixel's data and recomputes its hash
    /// 
    /// # Arguments
    /// 
    /// * `new_data` - The new data value
    /// 
    /// # Returns
    /// 
    /// * `Result<[u8; 32]>` - The newly computed trixel hash
    pub fn update_data(&mut self, new_data: TrixelData) -> Result<[u8; 32]> {
        // Update data based on the type (accumulate or overwrite)
        match (&mut self.data, new_data) {
            // Count accumulation
            (TrixelData::Count { count }, TrixelData::Count { count: new_count }) => {
                *count = count.checked_add(new_count).unwrap_or(u32::MAX);
            },
            // Aggregate accumulation
            (TrixelData::AggregateAccumulate { metric }, TrixelData::AggregateAccumulate { metric: new_metric }) => {
                *metric = metric.checked_add(new_metric).unwrap_or(u64::MAX);
            },
            // Mean accumulation
            (TrixelData::MeanAccumulate { numerator, denominator }, 
             TrixelData::MeanAccumulate { numerator: new_numerator, denominator: new_denominator }) => {
                *numerator = numerator.checked_add(new_numerator).unwrap_or(u64::MAX);
                *denominator = denominator.checked_add(new_denominator).unwrap_or(u64::MAX);
            },
            // For overwrite types, simply replace the data
            _ => self.data = new_data,
        }
        
        self.hash = self.compute_hash()?;
        self.last_update = Clock::get()?.unix_timestamp;
        self.updates = self.updates.checked_add(1).unwrap();
        Ok(self.hash)
    }
}