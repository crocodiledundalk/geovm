use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

const ABSOLUTE_MAX_RESOLUTION: u8 = 10;


#[derive(Default)]
#[account]
pub struct World {
    pub authority: Pubkey,
    pub max_resolution: u8,
    pub canonical_resolution: u8,
    pub root_hash: [u8;32],
    pub child_hashes: [[u8;32]; 8]
}

impl World {

    pub fn bytes() -> usize {
        8 + std::mem::size_of::<World>()
    }

    pub fn init(
        &mut self,
        authority: Pubkey,
        max_resolution: u8,
        canonical_resolution: u8,
    ) -> Result<()> {
        require!(
            max_resolution <= ABSOLUTE_MAX_RESOLUTION,
            ErrorCode::InvalidArgument
        );
        require!(
            max_resolution >= 1,
            ErrorCode::InvalidArgument
        );
        require!(
            canonical_resolution <= max_resolution,
            ErrorCode::InvalidArgument
        );
        require!(
            canonical_resolution >= 1,
            ErrorCode::InvalidArgument
        );
        self.authority = authority;
        self.max_resolution = max_resolution;
        self.canonical_resolution = canonical_resolution;
        self.child_hashes = [[0; 32]; 8];
        self.root_hash = self.compute_root_hash().unwrap();
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
        self.root_hash = new_root_hash;
        
        Ok(())
    }

}