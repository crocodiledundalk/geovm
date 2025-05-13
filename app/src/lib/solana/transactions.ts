'use client'; // Keep client-side if it uses browser APIs or hooks indirectly

import { BN, IdlAccounts, Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, AccountMeta, Transaction as Web3Transaction } from '@solana/web3.js';
import { Geovm } from '@/idl/geovm'; // Your IDL types
import { getTrixelAncestors, getTrixelPDA } from '@/sdk/utils';

interface CreateOrUpdateTrixelParams {
  program: Program<Geovm>;
  provider: AnchorProvider; // Use AnchorProvider for connection and wallet context
  worldPubkey: PublicKey;
  trixelId: BN; // Already BN
  value: BN; // Already BN
  trixelExists: boolean;
  payerPubkey: PublicKey; // Explicitly require payer
}

/**
 * Creates and/or updates a trixel and its ancestors in a single transaction.
 * Handles the logic for checking existence and including necessary instructions.
 * 
 * @returns The transaction signature upon successful confirmation.
 * @throws Throws an error if the transaction fails.
 */
export async function createOrUpdateTrixelTransaction({
  program,
  provider,
  worldPubkey,
  trixelId,
  value,
  trixelExists,
  payerPubkey
}: CreateOrUpdateTrixelParams): Promise<string> {
  try {
    // 1. Derive PDAs
    const ancestorIds = getTrixelAncestors(trixelId.toNumber()); 
    const ancestorAccountsMetas: AccountMeta[] = [];
    for (const id of ancestorIds) {
      const [pda] = await getTrixelPDA(worldPubkey, new BN(id).toNumber(), program.programId);
      ancestorAccountsMetas.push({ pubkey: pda, isSigner: false, isWritable: true });
    }
    const [targetTrixelPda] = await getTrixelPDA(worldPubkey, trixelId.toNumber(), program.programId);

    // 2. Build Transaction
    const transaction = new Web3Transaction();

    // 2a. Add Create Instruction if needed
    if (!trixelExists) {
      console.log(`[TX Util] Trixel ${trixelId.toString()} (PDA: ${targetTrixelPda.toBase58()}) does not exist. Adding create instruction.`);
      const createIx = await program.methods
        .createTrixelAndAncestors({ id: trixelId })
        .accountsStrict({
          world: worldPubkey, 
          trixel: targetTrixelPda,
          payer: payerPubkey, // Use provided payer
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(ancestorAccountsMetas)
        .instruction();
      transaction.add(createIx);
    }

    // 2b. Add Update Instruction
    console.log(`[TX Util] Adding update instruction for trixel ${trixelId.toString()} (PDA: ${targetTrixelPda.toBase58()}) with value ${value.toString()}.`);
    const updateIx = await program.methods
      .updateTrixel({ id: trixelId, value: value, coords: null })
      .accountsStrict({
        world: worldPubkey, 
        trixel: targetTrixelPda,
        payer: payerPubkey, // Payer is the signer and implicitly the authority
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ancestorAccountsMetas) // Pass ancestors here too, might be needed by program logic
      .instruction();
    transaction.add(updateIx);

    // 3. Send and Confirm Transaction using the Provider
    // AnchorProvider's sendAndConfirm handles signing by the wallet 
    // associated with the provider.
    const signature = await provider.sendAndConfirm(transaction, [], { commitment: 'confirmed' });
    
    console.log(`[TX Util] Transaction successful with signature: ${signature}`);
    return signature;

  } catch (err) {
    console.error('[TX Util] Error creating/updating trixel transaction:', err);
    // Re-throw the error so the caller can handle it (e.g., show toast)
    throw err; 
  }
} 