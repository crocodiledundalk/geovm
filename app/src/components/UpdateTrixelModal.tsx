'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGeoVmProgram } from '@/contexts/ProgramContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, AccountMeta, Transaction as Web3Transaction } from '@solana/web3.js';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Geovm } from '@/idl/geovm'; // Your IDL types
import { IdlAccounts } from '@coral-xyz/anchor';
// Assuming these are client-side utility functions
import { getTrixelAncestors, getTrixelPDA } from '@/sdk/utils'; 
import { createOrUpdateTrixelTransaction } from '@/lib/solana/transactions'; // Import the new utility
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
  meanAccumulate: 'Mean Accumulate (Add to Numerator, Denom -> 1 if new)',
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
  const { program, provider } = useGeoVmProgram();
  const { publicKey: walletPublicKey } = useWallet(); // Only need publicKey here now
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
    // Provider now comes from useProgram, walletPublicKey from useWallet
    if (!program || !provider || !walletPublicKey || !worldDataTypeKey) {
      setError('Required program/provider/wallet information missing.');
      return;
    }

    if (world.permissionedUpdates && !isUpdateAllowed) {
      setError('You are not authorized to update trixels in this world.');
      return;
    }

    let numericValue = new BN(0);
    if (worldDataTypeKey !== 'count') {
      const parsedValue = parseInt(inputValue, 10);
      if (isNaN(parsedValue)) {
        setError('Please enter a valid integer value.');
        return;
      }
      numericValue = new BN(parsedValue); // Convert to BN
      if ((worldDataTypeKey === 'aggregateOverwrite' || worldDataTypeKey === 'meanOverwrite') && numericValue.isNeg()) {
        setError('For Overwrite types, value must be non-negative.');
        return;
      }
    } else {
      numericValue = new BN(1); // Count always uses value 1 for update logic (even if program ignores it)
    }

    setIsLoading(true);
    setError(null);

    const toastMessage = trixelExists ? 'Updating trixel...' : 'Creating and updating trixel...';
    const operationType = trixelExists ? 'updated' : 'created and updated';

    toast.promise(
      // Call the reusable utility function
      createOrUpdateTrixelTransaction({
        program,
        provider,
        worldPubkey,
        trixelId,
        value: numericValue,
        trixelExists,
        payerPubkey: walletPublicKey
      }),
      {
        loading: toastMessage,
        success: async (signature: string) => {
          try {
            if (onUpdateSuccess) {
              await onUpdateSuccess(trixelId.toNumber());
            } else {
              await refreshTrixelWithAncestors(trixelId.toNumber());
            }
          } catch (refreshError) {
            console.error('Error refreshing data after trixel update:', refreshError);
          }
          onClose();
          return `Trixel ${operationType}! Sig: ${signature.substring(0,10)}...`;
        },
        error: (err: unknown) => {
          console.error('Error sending trixel transaction:', err);
          let message = 'Failed to process trixel.';
          if (err instanceof Error) message = err.message;
          setError(message);
          return message; // Return message for toast
        },
        finally: () => {
          setIsLoading(false);
        }
      }
    );
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
          <p><span className="font-semibold">Data Type:</span> {worldDataTypeDisplay}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {worldDataTypeKey !== 'count' && (
            <div>
              <label htmlFor="trixelValue" className="block text-sm font-medium mb-1">
                {getInputLabel()}
              </label>
              <input
                id="trixelValue"
                type="number" // Use number type for better input
                step="1" // Allow only integers
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full rounded-md border border-input p-2 text-sm"
                required // Ensure input is provided for non-count types
                disabled={isLoading}
              />
            </div>
          )}

          {!isUpdateAllowed && world.permissionedUpdates && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-800/50">
              <AlertCircle className="h-4 w-4 flex-shrink-0"/>
              <span>Updates are permissioned and your wallet ({walletPublicKey?.toBase58().substring(0,6)}...) is not the authority.</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800/50">
              <AlertCircle className="h-4 w-4 flex-shrink-0"/>
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-md border text-sm hover:bg-accent">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading || !isUpdateAllowed}
              className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${isLoading ? 'bg-gray-400' : isUpdateAllowed ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {isLoading ? 'Processing...' : 'Update Trixel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 