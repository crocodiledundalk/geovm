'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { ResolutionTabs } from '@/components/ResolutionTabs';
import { Navbar } from '@/components/Navbar';
import { WorldGlobe } from '@/components/WorldGlobe';

export default function WorldPage() {
  const params = useParams();
  const { program } = useProgram();
  const [world, setWorld] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const worldPubkey = useMemo(() => {
    if (!params.pubkey || typeof params.pubkey !== 'string') {
      setError('World public key not found in URL.');
      return null;
    }
    try {
      return new PublicKey(params.pubkey);
    } catch (e) {
      console.error('Invalid public key format:', params.pubkey, e);
      setError('Invalid world public key format.');
      return null;
    }
  }, [params.pubkey]);

  useEffect(() => {
    const fetchWorld = async () => {
      setLoading(true);
      if (!program) {
        setError('Program not initialized.');
        setLoading(false);
        return;
      }
      if (!worldPubkey) {
        // Error already set by useMemo or worldPubkey is not yet derived from params
        setLoading(false);
        return;
      }
      
      try {
        const worldAccount = await program.account.world.fetch(worldPubkey);
        setWorld(worldAccount);
        setError(null); // Clear previous errors
      } catch (err) {
        console.error('Error fetching world:', err);
        setError('Failed to fetch world details.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorld();
  }, [program, worldPubkey]); // Depend on memoized worldPubkey

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading world details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center text-red-500">
              <p>{error}</p>
            </div>
          </div>
        ) : !world || !worldPubkey ? ( // Ensure world and worldPubkey are available
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className="text-muted-foreground">World data not available or invalid public key.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* World Globe Visualization */}
            {/* <WorldGlobe 
              worldPubkey={worldPubkey} // Now guaranteed to be PublicKey
              maxResolution={Number(world.maxResolution)}
              canonicalResolution={Number(world.canonicalResolution)}
            /> */}
            
            <div className="grid gap-4">
              <h1 className="text-3xl font-bold">World Details</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
                <div className="p-4 bg-card rounded-lg border">
                  <h2 className="text-lg font-semibold mb-2">Canonical Resolution</h2>
                  <p className="text-muted-foreground">{world.canonicalResolution}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <h2 className="text-lg font-semibold mb-2">Authority</h2>
                  <p className="text-muted-foreground">{world.authority.toString()}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <h2 className="text-lg font-semibold mb-2">Root Hash</h2>
                  <p className="text-muted-foreground font-mono break-all">
                    {Buffer.from(world.rootHash).toString('hex')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <ResolutionTabs
                worldPubkey={worldPubkey} // Now guaranteed to be PublicKey
                canonicalResolution={Number(world.canonicalResolution)}
                worldAccount={world}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 