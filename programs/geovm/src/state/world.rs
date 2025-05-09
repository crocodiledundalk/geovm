use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

use super::trixel_data::{TrixelDataType, TrixelData};

const ABSOLUTE_MAX_RESOLUTION: u8 = 10;


#[derive(Default)]
#[account]
pub struct World {
    pub authority: Pubkey,
    pub name: [u8; 32],
    pub canonical_resolution: u8,
    pub permissioned_updates: bool,
    pub updates: u64,
    pub root_hash: [u8;32],
    pub child_hashes: [[u8;32]; 8],
    pub data: TrixelData
}

impl World {

    pub fn bytes() -> usize {
        8 + std::mem::size_of::<World>() + 50
    }

    pub fn init(
        &mut self,
        authority: Pubkey,
        name: [u8;32],
        canonical_resolution: u8,
        permissioned_updates: bool,
        data_type: TrixelDataType
    ) -> Result<()> {
        
        require!(
            canonical_resolution <= ABSOLUTE_MAX_RESOLUTION,
            ErrorCode::InvalidArgument
        );
        require!(
            canonical_resolution >= 1,
            ErrorCode::InvalidArgument
        );
        self.authority = authority;
        self.name = name;
        self.canonical_resolution = canonical_resolution;
        self.permissioned_updates = permissioned_updates;
        self.child_hashes = [[0; 32]; 8];
        self.root_hash = self.compute_root_hash().unwrap();
        self.updates = 0;
        
        // Initialize the appropriate TrixelData based on the data_type
        self.data = match data_type {
            TrixelDataType::Count => TrixelData::Count { count: 0 },
            TrixelDataType::AggregateOverwrite => TrixelData::AggregateOverwrite { metric: 0 },
            TrixelDataType::AggregateAccumulate => TrixelData::AggregateAccumulate { metric: 0 },
            TrixelDataType::MeanOverwrite => TrixelData::MeanOverwrite { numerator: 0, denominator: 0 },
            TrixelDataType::MeanAccumulate => TrixelData::MeanAccumulate { numerator: 0, denominator: 0 },
        };
        
        Ok(())
    }

    /// Computes the root hash from the child hashes
    pub fn compute_root_hash(&self) -> Result<[u8; 32]> {
        // Create a buffer to hold the child hashes
        let mut data = Vec::with_capacity(8 * 32);
        
        // Add all child hashes
        for hash in self.child_hashes.iter() {
            data.extend_from_slice(hash);
        }
        
        // Compute the SHA-256 hash
        let hash = anchor_lang::solana_program::hash::hash(&data);
        Ok(hash.to_bytes())
    }

    /// Updates the child hash at the specified index and recomputes the root hash
    /// 
    /// # Arguments
    /// 
    /// * `child_idx` - The index of the child hash to update (0-7)
    /// * `new_hash` - The new hash value to set
    /// 
    /// # Returns
    /// 
    /// * `Result<[u8; 32]>` - The newly computed root hash
    pub fn update_child_hash(&mut self, child_idx: usize, new_hash: [u8; 32]) -> Result<[u8; 32]> {
        require!(child_idx < 8, ErrorCode::InvalidArgument);
        self.child_hashes[child_idx] = new_hash;
        self.root_hash = self.compute_root_hash()?;
        Ok(self.root_hash)
    }

    /// Updates the child hash at the specified index, recalculates the root hash,
    /// and updates the stored root_hash field
    /// 
    /// # Arguments
    /// 
    /// * `child_idx` - The index of the child hash to update (0-7)
    /// * `new_hash` - The new hash value to set
    /// 
    /// # Returns
    /// 
    /// * `Result<()>` - Success or error
    pub fn update_child_hash_and_root(&mut self, child_idx: usize, new_hash: [u8; 32]) -> Result<()> {
        // Update the child hash and get the new root hash
        let new_root_hash = self.update_child_hash(child_idx, new_hash)?;
        
        // Update the stored root hash
        self.updates = self.updates.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
        self.root_hash = new_root_hash;
        
        Ok(())
    }

}