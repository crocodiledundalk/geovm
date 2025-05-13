'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { TrixelTable } from './tables/TrixelTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useWorldTrixels, TrixelData as HookTrixelData } from '@/hooks/useTrixels';
import { IdlAccounts } from '@coral-xyz/anchor';
import { Geovm } from '@/idl/geovm';
import { useQueryClient } from '@tanstack/react-query';

// Define the type for the World account data based on the IDL
type WorldAccountData = IdlAccounts<Geovm>['world'];

// Define the props for ResolutionTabs
interface ResolutionTabsProps {
  worldPubkey: PublicKey;
  canonicalResolution: number;
  worldAccount: WorldAccountData;
  onJumpToTrixel?: (trixelData: HookTrixelData) => void; // MODIFIED - Add optional callback prop
}

export function ResolutionTabs({
  worldPubkey,
  canonicalResolution,
  worldAccount,
  onJumpToTrixel, // Receive the prop
}: ResolutionTabsProps) {
  const [selectedResolution, setSelectedResolution] = useState(canonicalResolution);
  const resolutions = [0, ...Array.from({ length: canonicalResolution }, (_, i) => i + 1)];
  const queryClient = useQueryClient();

  // DEBUG LOGS START
  console.log("[ResolutionTabs] Props received - canonicalResolution:", canonicalResolution);
  console.log("[ResolutionTabs] Generated resolutions array:", JSON.stringify(resolutions));
  console.log("[ResolutionTabs] Initial selectedResolution:", selectedResolution);

  useEffect(() => {
    console.log("[ResolutionTabs] selectedResolution changed to:", selectedResolution);
  }, [selectedResolution]);
  // DEBUG LOGS END

  const {
    onChainTrixelsQuery, 
    trixelStats, 
    prefetchResolutionTrixels
  } = useWorldTrixels(worldPubkey, {
    canonicalResolution
  });

  const isLoadingOnChain = onChainTrixelsQuery.isLoading;

  useEffect(() => {
    if (!isLoadingOnChain) {
      prefetchResolutionTrixels(canonicalResolution);
    }
  }, [canonicalResolution, isLoadingOnChain, prefetchResolutionTrixels]);

  const handleTrixelUpdate = () => {
    console.log(`[ResolutionTabs] Invalidating queries for world ${worldPubkey.toBase58()} and resolution ${selectedResolution}`);
    queryClient.invalidateQueries({
      queryKey: ['trixels', worldPubkey.toBase58(), selectedResolution]
    });
    queryClient.invalidateQueries({
        queryKey: ['worldAccount', worldPubkey.toBase58()]
    });
  };

  const handleResolutionChange = (value: string) => {
    const newResolution = Number(value);
    console.log("[ResolutionTabs] handleResolutionChange - newResolution:", newResolution);
    setSelectedResolution(newResolution);
    prefetchResolutionTrixels(newResolution); // Keep prefetching on resolution change
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-4 pt-2 pb-1 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Trixels</h2>
          <div className="text-sm text-muted-foreground">
            {isLoadingOnChain ? (
              "Loading on-chain trixels..."
            ) : (
              <>
                <span className="font-medium">{trixelStats.totalOnChain}</span> trixels on-chain
                {selectedResolution > 0 && trixelStats.byResolution[selectedResolution - 1] && (
                  <> • <span className="font-medium">
                    {trixelStats.byResolution[selectedResolution - 1].onChainCount}
                  </span> at resolution {selectedResolution}</>
                )}
                {selectedResolution === 0 && (
                  <> • <span className="font-medium">
                    {trixelStats.byResolution[0]?.onChainCount || 0}
                  </span> at resolution 0</>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="md:hidden flex flex-col flex-grow px-4 pb-4 overflow-hidden">
        <Tabs
          value={selectedResolution.toString()}
          onValueChange={handleResolutionChange}
          className="flex flex-col flex-grow overflow-hidden"
        >
          <div className="flex-shrink-0 pb-1">
            <Select
              value={selectedResolution.toString()}
              onValueChange={handleResolutionChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                {resolutions.map((resolution) => (
                  <SelectItem key={resolution} value={resolution.toString()}>
                    Resolution {resolution}
                    {resolution === canonicalResolution && ' (Canonical)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsContent value={selectedResolution.toString()} className="flex-grow overflow-y-auto min-h-0">
            <TrixelTable
              worldPubkey={worldPubkey}
              resolution={selectedResolution}
              canonicalResolution={canonicalResolution}
              worldAccount={worldAccount}
              onTrixelUpdate={handleTrixelUpdate}
              onJumpToTrixel={onJumpToTrixel}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden md:flex flex-col flex-grow px-4 pb-4 overflow-hidden">
        <Tabs
          value={selectedResolution.toString()}
          onValueChange={handleResolutionChange}
          className="flex flex-col flex-grow overflow-hidden"
        >
          <div className="flex-shrink-0 pb-1">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${resolutions.length > 0 ? resolutions.length : 1}, minmax(0, 1fr))` }}>
              {resolutions.map((resolution) => (
                <TabsTrigger
                  key={resolution}
                  value={resolution.toString()}
                  className="relative"
                >
                  {resolution}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value={selectedResolution.toString()} className="flex-grow overflow-y-auto min-h-0">
            <TrixelTable
              worldPubkey={worldPubkey}
              resolution={selectedResolution}
              canonicalResolution={canonicalResolution}
              worldAccount={worldAccount}
              onTrixelUpdate={handleTrixelUpdate}
              onJumpToTrixel={onJumpToTrixel}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 