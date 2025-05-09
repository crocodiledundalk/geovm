'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { ResolutionTabs } from '@/components/ResolutionTabs';
import { Navbar } from '@/components/Navbar';

export default function WorldPage() {
  const params = useParams();
  const { program } = useProgram();
  const [world, setWorld] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorld = async () => {
      if (!program || !params.pubkey) {
        setLoading(false);
        return;
      }
      
      try {
        const pubkey = new PublicKey(params.pubkey as string);
        const worldAccount = await program.account.world.fetch(pubkey);
        setWorld(worldAccount);
      } catch (err) {
        console.error('Error fetching world:', err);
        setError('Failed to fetch world details');
      } finally {
        setLoading(false);
      }
    };

    fetchWorld();
  }, [program, params.pubkey]);

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
        ) : !world ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className="text-muted-foreground">World not found</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4">
              <h1 className="text-3xl font-bold">World Details</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-card rounded-lg border">
                  <h2 className="text-lg font-semibold mb-2">Max Resolution</h2>
                  <p className="text-muted-foreground">{world.maxResolution}</p>
                </div>
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
                worldPubkey={new PublicKey(params.pubkey as string)}
                maxResolution={Number(world.maxResolution)}
                canonicalResolution={Number(world.canonicalResolution)}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 