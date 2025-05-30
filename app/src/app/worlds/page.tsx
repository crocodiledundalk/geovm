'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProgram } from '@/contexts/ProgramContext';
import { Button } from '@/components/ui/button';
import { useConnection } from '@solana/wallet-adapter-react';
import { WorldsTable } from '@/components/app/tables/WorldsTable';
import { AppLayout } from '@/components/app/AppLayout';

export default function WorldsPage() {
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

  const handleRefreshWorlds = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (program && initialized) {
        const worldAccounts = await program.account.world.all();
        setWorlds(worldAccounts);
      }
    } catch (err) {
      setError('Failed to fetch worlds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Worlds</h1>
          <Button 
            onClick={() => router.push('/')}
            variant="outline"
          >
            Back to Home
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-8">
          <div>
            <WorldsTable 
              worlds={worlds}
              isLoading={loading}
              error={error}
              onRefresh={handleRefreshWorlds}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 