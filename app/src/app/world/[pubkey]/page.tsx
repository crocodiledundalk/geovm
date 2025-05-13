'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { ResolutionTabs } from '@/components/app/ResolutionTabs';
import { Navbar } from '@/components/Navbar';
import DemoGlobe from '@/components/demo/demo-globe';
import { Copy, Check } from 'lucide-react';
import { TrixelData as HookTrixelData } from '@/hooks/useTrixels';

export default function WorldPage() {
  const params = useParams();
  const { program } = useProgram();
  const [world, setWorld] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [copied, setCopied] = useState<{[key: string]: boolean}>({});
  const [jumpToTrixelData, setJumpToTrixelData] = useState<HookTrixelData | null>(null);

  const worldPubkey = useMemo(() => {
    if (!params.pubkey || typeof params.pubkey !== 'string') {
      setError('World public key not found in URL.');
      return null;
    }

    // Check for common asset patterns to ignore
    // Updated to be a bit more specific for .map files and common dev assets
    const pubkeyString = params.pubkey as string; // Type assertion for string methods
    if (
      pubkeyString.endsWith('.js.map') || 
      pubkeyString.endsWith('.css.map') ||
      pubkeyString.startsWith('index.iife.min.js') || // Catches .map and .js
      pubkeyString === 'favicon.ico' ||
      pubkeyString.startsWith('chrome-extension:') || // Ignore chrome extension requests if they leak here
      pubkeyString.includes('.well-known') // Ignore .well-known paths
    ) {
      // console.warn(`Ignoring potential asset or special path in pubkey param: ${pubkeyString}`);
      // This request is not for this page, let it 404 or be handled elsewhere.
      // Returning null here will lead to the "World data not available" message,
      // which is better than a crash.
      return null; 
    }

    try {
      return new PublicKey(pubkeyString);
    } catch (e) {
      // This will now only catch actual base58 parsing errors for strings
      // that didn't match the asset patterns above.
      console.error('Invalid public key format:', pubkeyString, e);
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

  // Handler to trigger the jump in DemoGlobe
  const handleJumpRequest = (trixelData: HookTrixelData) => {
    console.log(`[WorldPage] Received jump request for trixel ID: ${trixelData.id}`);
    setJumpToTrixelData(trixelData);
  };

  // Handler for DemoGlobe to call when jump animation finishes
  const handleJumpComplete = () => {
    console.log("[WorldPage] Jump complete, resetting target.");
    setJumpToTrixelData(null);
  };

  return (
    <main className="flex flex-col h-[calc(100vh_-_4rem)] overflow-hidden">
      <Navbar />
      {loading ? (
        <div className="flex-grow flex items-center justify-center container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading world details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-grow flex items-center justify-center container mx-auto px-4">
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </div>
      ) : !world || !worldPubkey ? (
        <div className="flex-grow flex items-center justify-center container mx-auto px-4">
          <div className="text-center">
            <p className="text-muted-foreground">World data not available or invalid public key.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-grow overflow-hidden min-h-0">
          {/* Full width globe component with theme-aware background - Fixed Height */}
          <div className="relative w-full h-[60vh] bg-gray-100 dark:bg-gray-900 flex-shrink-0">
            <DemoGlobe 
              jumpToTrixelData={jumpToTrixelData}
              onJumpComplete={handleJumpComplete}
              worldAccount={world}
              worldPubkey={worldPubkey}
            />
            
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
          
          {/* Container for fixed "Resolution Details" title and scrollable ResolutionTabs */}
          <div className="container mx-auto px-4 pt-2 pb-2 flex flex-col flex-grow overflow-hidden min-h-0">
            {/* Fixed Title Part */}
            <div className="flex-shrink-0 pb-2">
              <h2 className="text-2xl font-bold">Resolution Details</h2>
            </div>
            
            {/* Scrollable ResolutionTabs Part */}
            <div className="flex-grow overflow-y-auto min-h-0">
              <ResolutionTabs
                worldPubkey={worldPubkey}
                canonicalResolution={Number(world.canonicalResolution)}
                worldAccount={world}
                onJumpToTrixel={handleJumpRequest}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 