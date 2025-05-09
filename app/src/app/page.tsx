'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProgram } from '@/contexts/ProgramContext';
import { Navbar } from '@/components/Navbar';
import { Globe } from '@/components/Globe';
import { Button } from '@/components/ui/button';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';

export default function Home() {
  const router = useRouter();
  const { program } = useProgram();
  const { connection } = useConnection();
  const [worlds, setWorlds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!connection) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      try {
        await connection.getVersion();
        setInitialized(true);
      } catch (err) {
        setError('Failed to connect to Solana network');
        setLoading(false);
      }
    };

    initialize();
  }, [connection]);

  useEffect(() => {
    const fetchWorlds = async () => {
      if (!program || !initialized) {
        setLoading(false);
        return;
      }

      try {
        const worldAccounts = await program.account.world.all();
        setWorlds(worldAccounts);
      } catch (err) {
        setError('Failed to fetch worlds');
      } finally {
        setLoading(false);
      }
    };

    fetchWorlds();
  }, [program, initialized]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="relative h-[600px] bg-card rounded-lg border overflow-hidden">
            <Globe />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-6">Available Worlds</h1>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading worlds...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            ) : worlds.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No worlds found</p>
                <Button onClick={() => router.push('/create')}>
                  Create World
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {worlds.map((world) => (
                  <div
                    key={world.publicKey.toString()}
                    className="p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/world/${world.publicKey.toString()}`)}
                  >
                    <h2 className="text-lg font-semibold mb-2">
                      World {world.publicKey.toString().slice(0, 8)}...
                    </h2>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Max Resolution:</span> {world.account.maxResolution}
                      </div>
                      <div>
                        <span className="font-medium">Canonical Resolution:</span> {world.account.canonicalResolution}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
