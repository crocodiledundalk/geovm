use crate::errors::ErrorCode;
use anchor_lang::prelude::*;



#[derive(Default)]
#[account]
pub struct Trixel {
    pub world: Pubkey,
    pub id: u64,
    pub data: u64,
    pub hash: [u8;32],
    pub child_hashes: [[u8;32]; 4]
}

impl Trixel {

    pub fn bytes() -> usize {
        8 + std::mem::size_of::<Trixel>()
    }

    pub fn new()-> Self {
        Self::default()
    }

    pub fn init(
        &mut self,
        world: Pubkey,
        id: u64,
    ) -> Result<()> {
        self.world = world;
        self.id = id;
        self.data = 0;
        self.child_hashes = [[0; 32]; 4];
        self.hash = self.compute_hash()?;
        Ok(())
    }

    /// Computes the hash of the trixel's data and child hashes
    pub fn compute_hash(&self) -> Result<[u8; 32]> {
        // Create a buffer to hold the data and child hashes
        let mut data = Vec::with_capacity(8 + 4 * 32);
        
        // Add the data value
        data.extend_from_slice(&self.data.to_le_bytes());
        
        // Add all child hashes
        for hash in self.child_hashes.iter() {
            data.extend_from_slice(hash);
        }
        
        // Compute the SHA-256 hash
        let hash = anchor_lang::solana_program::hash::hash(&data);
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
    pub fn update_data(&mut self, new_data: u64) -> Result<[u8; 32]> {
        self.data = new_data;
        self.hash = self.compute_hash()?;
        Ok(self.hash)
    }
}