'use client';

import { useState, useEffect } from 'react';
import { useGeoVmProgram } from '@/contexts/ProgramContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getTrixelStats } from '@/sdk/utils';

const ABSOLUTE_MAX_RESOLUTION = 10;

// Define TrixelDataType enum as expected by your program
// This should ideally be auto-generated or defined in a shared types file
const TRIXEL_DATA_TYPES = {
  COUNT: { count: {} },
  AGGREGATE_OVERWRITE: { aggregateOverwrite: {} },
  AGGREGATE_ACCUMULATE: { aggregateAccumulate: {} },
  MEAN_OVERWRITE: { meanOverwrite: {} },
  MEAN_ACCUMULATE: { meanAccumulate: {} },
} as const;

type TrixelDataTypeKeys = keyof typeof TRIXEL_DATA_TYPES;

interface CreateWorldModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorldModal({ isOpen, onClose }: CreateWorldModalProps) {
  const router = useRouter();
  const { program, provider } = useGeoVmProgram();
  const { publicKey } = useWallet();

  const [worldName, setWorldName] = useState<string>('');
  const [resolution, setResolution] = useState<number>(5);
  const [selectedDataTypeKey, setSelectedDataTypeKey] = useState<TrixelDataTypeKeys>('COUNT');
  const [permissionedUpdates, setPermissionedUpdates] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWorldName('');
      setResolution(5);
      setSelectedDataTypeKey('COUNT');
      setPermissionedUpdates(false);
      setError(null);
    }
  }, [isOpen]);

  const stats = getTrixelStats(resolution);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatArea = (area: number) => {
    if (area >= 1_000_000) {
      return `${(area / 1_000_000).toFixed(1)} million km²`;
    } else if (area >= 1_000) {
      return `${(area / 1_000).toFixed(1)} thousand km²`;
    } else {
      return `${area.toFixed(1)} km²`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !provider || !publicKey) {
      setError('Please connect your wallet to create a world');
      return;
    }
    if (!worldName.trim()) {
        setError('World name cannot be empty');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const worldKeypair = Keypair.generate();
      const worldPubkey = worldKeypair.publicKey;
      const nameBuffer = Buffer.from(worldName.trim().padEnd(32, "\0"));
      const nameArray = Array.from(nameBuffer);
      const dataType = TRIXEL_DATA_TYPES[selectedDataTypeKey];

      toast.promise(
        program.methods
          .createWorld({
            name: nameArray,
            canonicalResolution: resolution,
            dataType: dataType,
            permissionedUpdates: permissionedUpdates,
          })
          .accountsStrict({
            payer: publicKey,
            authority: publicKey,
            world: worldPubkey,
            systemProgram: SystemProgram.programId,
          })
          .signers([worldKeypair])
          .rpc(),
        {
          loading: 'Creating your world...',
          success: (tx: string) => {
            provider.connection.confirmTransaction(tx, 'confirmed')
              .then(() => {
                toast.success('World created successfully!');
                onClose();
                router.push(`/world/${worldPubkey.toBase58()}`);
              })
              .catch((err: Error) => {
                console.error('Error confirming transaction:', err);
                toast.error('Transaction confirmed but failed to load world');
              });
            return 'Transaction sent! Waiting for confirmation...';
          },
          error: (err: unknown) => {
            console.error('Error creating world:', err);
            if (err instanceof Error) {
              if (err.message.includes('insufficient funds')) {
                setError('Insufficient SOL to create world');
                return 'Insufficient SOL to create world';
              }
              return err.message;
            }
            return 'Failed to create world';
          }
        }
      );
    } catch (err) {
      console.error('Error creating world:', err);
      if (err instanceof Error) {
        if (err.message.includes('insufficient funds')) {
          setError('Insufficient SOL to create world');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to create world');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create New World</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-accent"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="worldName" className="block text-sm font-medium mb-1">
                World Name (up to 32 chars)
              </label>
              <input 
                id="worldName"
                type="text"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
                maxLength={32}
                className="w-full p-2 border rounded-md bg-input text-foreground"
                placeholder="e.g., My Awesome World"
              />
            </div>

            <div>
              <label htmlFor="dataType" className="block text-sm font-medium mb-1">
                Data Aggregation Type
              </label>
              <select 
                id="dataType"
                value={selectedDataTypeKey}
                onChange={(e) => setSelectedDataTypeKey(e.target.value as TrixelDataTypeKeys)}
                className="w-full p-2 border rounded-md bg-input text-foreground"
              >
                {Object.keys(TRIXEL_DATA_TYPES).map((key) => (
                  <option key={key} value={key}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Canonical Resolution ({resolution})
              </label>
              <input
                type="range"
                min="1"
                max={ABSOLUTE_MAX_RESOLUTION}
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                <span>1</span>
                <span>{ABSOLUTE_MAX_RESOLUTION}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox"
                id="permissionedUpdates"
                checked={permissionedUpdates}
                onChange={(e) => setPermissionedUpdates(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="permissionedUpdates" className="text-sm font-medium text-foreground">
                Permissioned Updates (Only authority can update trixels)
              </label>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium">Total Trixels:</span>{' '}
                {formatNumber(stats.totalTrixels)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Smallest Trixel Area:</span>{' '}
                {formatArea(stats.smallestTrixelArea)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Largest Trixel Area:</span>{' '}
                {formatArea(stats.largestTrixelArea)}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !publicKey}
            className="w-full bg-primary text-primary-foreground p-2 rounded hover:bg-primary/90 disabled:bg-muted"
          >
            {isLoading ? 'Creating...' : 'Create World'}
          </button>
        </form>
      </div>
    </div>
  );
} 