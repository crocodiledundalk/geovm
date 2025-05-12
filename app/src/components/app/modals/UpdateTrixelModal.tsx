'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, AccountMeta, Transaction as Web3Transaction } from '@solana/web3.js';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Geovm } from '@/idl/geovm'; // Your IDL types
import { IdlAccounts } from '@coral-xyz/anchor';
// Assuming these are client-side utility functions
import { getTrixelAncestors, getTrixelPDA } from '@/sdk/utils'; 
import { useQueryClient } from '@tanstack/react-query';
import { useWorldTrixels } from '@/hooks/useTrixels';

// Define bytesToString locally if not available globally or from utils
function bytesToString(bytes: number[] | Uint8Array): string {
  const buffer = Buffer.from(bytes);
  const nullIndex = buffer.indexOf(0);
  // Ensure toString is called on Buffer, not TextDecoder if that was a previous approach
  return buffer.toString('utf8', 0, nullIndex === -1 ? buffer.length : nullIndex);
}

type WorldAccountData = IdlAccounts<Geovm>['world'];

// Mirrored from CreateWorldModal or a shared types file
const TRIXEL_DATA_TYPES_DISPLAY: { [key: string]: string } = {
  count: 'Count (Always +1)',
  aggregateOverwrite: 'Aggregate Overwrite (Set New Value)',
  aggregateAccumulate: 'Aggregate Accumulate (Add to Value)',
  meanOverwrite: 'Mean Overwrite (Set New Numerator, Denom -> 1)',
  meanAccumulate: 'Mean Accumulate (Add to Numerator, Denom -> 1)',
};

function getDataTypeEnumKey(dataEnum: any): keyof typeof TRIXEL_DATA_TYPES_DISPLAY | null {
  if (!dataEnum) return null;
  if (dataEnum.count) return 'count';
  if (dataEnum.aggregateOverwrite) return 'aggregateOverwrite';
  if (dataEnum.aggregateAccumulate) return 'aggregateAccumulate';
  if (dataEnum.meanOverwrite) return 'meanOverwrite';
  if (dataEnum.meanAccumulate) return 'meanAccumulate';
  return null;
}

interface UpdateTrixelModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldAccountData;
  worldPubkey: PublicKey; // Added to ensure we have the world's actual address for PDA seeds
  trixelId: BN; // ID of the trixel to update (must be canonical)
  trixelExists: boolean; // Added prop
  onUpdateSuccess?: (trixelId: number) => Promise<void>; // Optional callback for refreshing data
}

export function UpdateTrixelModal({ 
  isOpen, 
  onClose, 
  world, 
  worldPubkey, // Use this for PDAs
  trixelId, 
  trixelExists, // Destructure new prop
  onUpdateSuccess
}: UpdateTrixelModalProps) {
  const { program, provider } = useProgram();
  const { publicKey: walletPublicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const { refreshTrixelWithAncestors } = useWorldTrixels(worldPubkey, { canonicalResolution: 8 });

  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const worldDataTypeKey = useMemo(() => getDataTypeEnumKey(world.data), [world.data]);
  const worldDataTypeDisplay = worldDataTypeKey ? TRIXEL_DATA_TYPES_DISPLAY[worldDataTypeKey] : 'Unknown';

  const isUpdateAllowed = useMemo(() => {
    if (!world.permissionedUpdates) {
      return true; 
    }
    if (walletPublicKey && world.authority.equals(walletPublicKey)) {
      return true; 
    }
    return false; 
  }, [world.permissionedUpdates, world.authority, walletPublicKey]);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !provider || !walletPublicKey || !sendTransaction || !worldDataTypeKey) {
      setError('Required information missing, connect wallet, or wallet adapter lacks sendTransaction.');
      return;
    }

    if (world.permissionedUpdates && !isUpdateAllowed) {
      setError('You are not authorized to update trixels in this world.');
      return;
    }

    let numericValue = 0;
    if (worldDataTypeKey !== 'count') {
      numericValue = parseInt(inputValue, 10);
      if (isNaN(numericValue)) {
        setError('Please enter a valid integer value.');
        return;
      }
      if ((worldDataTypeKey === 'aggregateOverwrite' || worldDataTypeKey === 'meanOverwrite') && numericValue < 0) {
        setError('For Overwrite types, value must be non-negative.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const ancestorIds = getTrixelAncestors(trixelId.toNumber()); 
      const ancestorAccountsMetas: AccountMeta[] = [];
      for (const id of ancestorIds) {
        const pdaTuple = await getTrixelPDA(worldPubkey, new BN(id).toNumber(), program.programId);
        ancestorAccountsMetas.push({ pubkey: pdaTuple[0], isSigner: false, isWritable: true });
      }
      
      const targetTrixelPda = (await getTrixelPDA(worldPubkey, trixelId.toNumber(), program.programId))[0];

      // Use web3.Transaction for flexibility with multiple program instructions
      const transaction = new Web3Transaction(); 
      let toastMessage = 'Updating trixel...';
      let operationType = 'update';

      if (!trixelExists) {
        toastMessage = 'Creating and updating trixel...';
        operationType = 'create_and_update';
        console.log(`Trixel ${trixelId.toString()} (PDA: ${targetTrixelPda.toBase58()}) does not exist. Adding create instruction.`);
        
        const createIx = await program.methods
          .createTrixelAndAncestors({ id: trixelId })
          .accountsStrict({
            world: worldPubkey, 
            trixel: targetTrixelPda,
            payer: walletPublicKey,
            systemProgram: SystemProgram.programId,
          })
          .remainingAccounts(ancestorAccountsMetas)
          .instruction();
        transaction.add(createIx);
      }

      console.log(`Adding update instruction for trixel ${trixelId.toString()} (PDA: ${targetTrixelPda.toBase58()}) with value ${numericValue}.`);
      const updateIx = await program.methods
        .updateTrixel({ id: trixelId, value: numericValue, coords: null })
        .accountsStrict({
          world: worldPubkey, 
          trixel: targetTrixelPda,
          payer: walletPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(ancestorAccountsMetas)
        .instruction();
      transaction.add(updateIx);
      
      // Set recent blockhash for the transaction
      transaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = walletPublicKey;

      toast.promise(
        // sendTransaction usually expects a fully signed or partially signed transaction
        // depending on the adapter. Here we send it to the provider after building it.
        // If sendTransaction from useWallet is used, it often handles signing.
        // For this explicit build, provider.sendAndConfirm might be more direct
        // OR ensure sendTransaction can handle this raw Web3Transaction.
        // Let's assume sendTransaction is robust or switch to provider.sendAndConfirm for clarity.
        provider.sendAndConfirm(transaction, [], {commitment: 'confirmed'}), // Simpler for fully built client-side tx
        {
          loading: toastMessage,
          success: async (signature: string) => {
            // After successful transaction, refresh data
            try {
              if (onUpdateSuccess) {
                await onUpdateSuccess(trixelId.toNumber());
              } else {
                // Refresh the trixel, its ancestors, and world data
                await refreshTrixelWithAncestors(trixelId.toNumber());
                
                // Also invalidate world data query
                queryClient.invalidateQueries({ queryKey: ['world', worldPubkey.toString()] });
              }
            } catch (refreshError) {
              console.error('Error refreshing data after trixel update:', refreshError);
              // Don't fail the operation if refresh fails
            }
            
            onClose();
            return `Trixel ${operationType === 'create_and_update' ? 'created and' : ''} updated! Sig: ${signature.substring(0,10)}...`;
          },
          error: (err: unknown) => {
            console.error('Error sending trixel transaction:', err);
            let message = 'Failed to process trixel.';
            if (err instanceof Error) message = err.message;
            setError(message);
            return message;
          }
        }
      );
    } catch (err) {
      console.error('Client-side error in handleSubmit:', err);
      if (err instanceof Error) setError(err.message);
      else setError('An unexpected client-side error occurred during setup.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getInputLabel = () => {
    switch (worldDataTypeKey) {
      case 'count':
        return 'Value (ignored, count increments by 1)';
      case 'aggregateOverwrite':
        return 'New Metric Value (integer)';
      case 'aggregateAccumulate':
        return 'Value to Add/Subtract (integer)';
      case 'meanOverwrite':
        return 'New Numerator Value (integer, denominator becomes 1)';
      case 'meanAccumulate':
        return 'Value to Add/Subtract from Numerator (integer, denominator becomes 1 if new)';
      default:
        return 'Value';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Update Trixel</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-accent">✕</button>
        </div>

        <div className="mb-4 space-y-1 text-sm">
          <p><span className="font-semibold">World:</span> {bytesToString(world.name)}</p>
          <p><span className="font-semibold">Trixel ID:</span> {trixelId.toString()}</p>
          <p><span className="font-semibold">Exists On-Chain:</span> <span className={trixelExists ? 'text-green-600' : 'text-orange-600'}>{trixelExists ? 'Yes' : 'No (will be created)'}</span></p>
          <p><span className="font-semibold">Data Type:</span> {worldDataTypeDisplay}</p>
          {world.permissionedUpdates && (
            <p className={`font-semibold ${isUpdateAllowed ? 'text-green-600' : 'text-destructive'}`}>
              {isUpdateAllowed ? 'Update allowed' : 'Update NOT allowed (permissioned)'}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {worldDataTypeKey !== 'count' && (
            <div>
              <label htmlFor="updateValue" className="block text-sm font-medium mb-1">
                {getInputLabel()}
              </label>
              <input
                id="updateValue"
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full p-2 border rounded-md bg-input text-foreground"
                placeholder="Enter integer value"
                disabled={isLoading || !isUpdateAllowed}
              />
            </div>
          )}
           {worldDataTypeKey === 'count' && (
             <p className="text-sm text-muted-foreground">For 'Count' type, update increments count by 1.</p>
           )}

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !isUpdateAllowed || !walletPublicKey}
            className="w-full bg-primary text-primary-foreground p-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (trixelExists ? 'Updating...' : 'Creating & Updating...') : (trixelExists ? 'Submit Update' : 'Create & Update Trixel')}
          </button>
        </form>
      </div>
    </div>
  );
} 