'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { ResolutionTabs } from '@/components/ResolutionTabs';
import { Navbar } from '@/components/Navbar';
import { WorldGlobe } from '@/components/WorldGlobe';
import DemoGlobe from '@/components/demo/demo-globe';
import { Copy, Check } from 'lucide-react';

export default function WorldPage() {
  const params = useParams();
  const { program } = useProgram();
  const [world, setWorld] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [copied, setCopied] = useState<{[key: string]: boolean}>({});

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

  // Helper to truncate address or hash
  const truncateString = (str: string) => {
    if (str.length <= 16) return str;
    return `${str.substring(0, 6)}...${str.substring(str.length - 4)}`;
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied({...copied, [key]: true});
      setTimeout(() => {
        setCopied({...copied, [key]: false});
      }, 2000);
    });
  };

  // Component for address or hash display
  const AddressDisplay = ({ value, label }: { value: string, label: string }) => (
    <div className="flex items-center">
      <span className="text-xs font-mono">{truncateString(value)}</span>
      <button 
        onClick={() => copyToClipboard(value, label)}
        className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label={`Copy ${label}`}
      >
        {copied[label] ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3 text-gray-500" />
        )}
      </button>
    </div>
  );

  return (
    <main className="min-h-screen">
      <Navbar />
      {loading ? (
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto px-4 flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading world details...</p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center text-red-500">
              <p>{error}</p>
            </div>
          </div>
        </div>
      ) : !world || !worldPubkey ? ( // Ensure world and worldPubkey are available
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className="text-muted-foreground">World data not available or invalid public key.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Full width globe component with theme-aware background */}
          <div className="relative w-full h-[70vh] bg-gray-100 dark:bg-gray-900">
            <DemoGlobe maxResolution={Number(world.canonicalResolution)} />
            
            {/* Overlay card with world details */}
            <div className="absolute top-4 right-4 w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">World Details</h2>
                <button 
                  onClick={() => setShowDetails(!showDetails)} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showDetails ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showDetails && (
                <div className="space-y-4">
                  <div className="border-b pb-2 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">World ID</h3>
                    <AddressDisplay value={worldPubkey.toString()} label="worldId" />
                  </div>
                  
                  <div className="border-b pb-2 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Authority</h3>
                    <AddressDisplay value={world.authority.toString()} label="authority" />
                  </div>
                  
                  <div className="border-b pb-2 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Canonical Resolution</h3>
                    <p className="text-sm">{world.canonicalResolution}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Regular container for the resolution tabs */}
          <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-4">Resolution Details</h2>
            <ResolutionTabs
              worldPubkey={worldPubkey}
              canonicalResolution={Number(world.canonicalResolution)}
              worldAccount={world}
            />
          </div>
        </>
      )}
    </main>
  );
} 