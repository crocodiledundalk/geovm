'use client';

import { useEffect, useState } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { Button } from './ui/button';
import { getTrixelId, getTrixelPDA, SphericalCoords } from '@/sdk/utils';
import { BN } from '@coral-xyz/anchor';

interface TrixelTableProps {
  worldPubkey: PublicKey;
  resolution: number;
  canonicalResolution: number;
}

interface TrixelData {
  id: string;
  vertices: [number, number, number][];
  exists: boolean;
  hash?: string;
  data?: string;
}

export function TrixelTable({ worldPubkey, resolution, canonicalResolution }: TrixelTableProps) {
  const { program } = useProgram();
  const [trixels, setTrixels] = useState<TrixelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrixels = async () => {
      if (!program) return;

      try {
        // For now, we'll just fetch the first 8 trixels at this resolution
        const trixelData: TrixelData[] = [];
        
        for (let i = 0; i < 8; i++) {
          const coords: SphericalCoords = { ra: 0, dec: 0 }; // This should be calculated based on the trixel index
          const trixelId = getTrixelId(coords, resolution) + i;
          const [trixelPda] = getTrixelPDA(worldPubkey, trixelId, program.programId);
          
          try {
            const trixelAccount = await program.account.trixel.fetch(trixelPda);
            trixelData.push({
              id: trixelId.toString(),
              vertices: [], // We'll need to compute these from the trixel ID
              exists: true,
              hash: Buffer.from(trixelAccount.hash).toString('hex'),
              data: trixelAccount.data ? trixelAccount.data.toString() : undefined,
            });
          } catch {
            // Trixel doesn't exist on-chain
            trixelData.push({
              id: trixelId.toString(),
              vertices: [], // We'll need to compute these
              exists: false,
            });
          }
        }

        setTrixels(trixelData);
      } catch (err) {
        console.error('Error fetching trixels:', err);
        setError('Failed to fetch trixel data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrixels();
  }, [program, worldPubkey, resolution]);

  if (loading) {
    return <div className="text-center py-4">Loading trixels...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">ID</th>
            <th className="text-left p-4">Vertices</th>
            <th className="text-left p-4">Status</th>
            <th className="text-left p-4">Hash</th>
            <th className="text-left p-4">Data</th>
            <th className="text-left p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trixels.map((trixel) => (
            <tr key={trixel.id} className="border-b">
              <td className="p-4 font-mono">{trixel.id}</td>
              <td className="p-4">
                {trixel.vertices.length > 0 ? (
                  <div className="space-y-1">
                    {trixel.vertices.map((vertex, i) => (
                      <div key={i} className="font-mono text-sm">
                        [{vertex.join(', ')}]
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not computed</span>
                )}
              </td>
              <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  trixel.exists ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {trixel.exists ? 'On-chain' : 'Not on-chain'}
                </span>
              </td>
              <td className="p-4 font-mono text-sm break-all">
                {trixel.hash || '-'}
              </td>
              <td className="p-4 font-mono text-sm break-all">
                {trixel.data || '-'}
              </td>
              <td className="p-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement jump to trixel
                    }}
                  >
                    Jump
                  </Button>
                  {resolution === canonicalResolution && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement update trixel
                      }}
                    >
                      Update
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 