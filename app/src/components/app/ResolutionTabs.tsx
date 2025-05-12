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
import { useWorldTrixels } from '@/hooks/useTrixels';
import { IdlAccounts } from '@coral-xyz/anchor';
import { Geovm } from '@/idl/geovm';
import { useQueryClient } from '@tanstack/react-query';

// Define the type for the World account data based on the IDL
type WorldAccountData = IdlAccounts<Geovm>['world'];

interface ResolutionTabsProps {
  worldPubkey: PublicKey;
  canonicalResolution: number;
  worldAccount: WorldAccountData;
}

export function ResolutionTabs({ worldPubkey, canonicalResolution, worldAccount }: ResolutionTabsProps) {
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
    onChainTrixels, 
    isLoadingOnChain, 
    trixelStats, 
    prefetchResolutionTrixels
  } = useWorldTrixels(worldPubkey, {
    canonicalResolution
  });

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
    <div className="space-y-4">
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
      
      {/* Mobile view */}
      <div className="md:hidden">
        <Tabs
          value={selectedResolution.toString()}
          onValueChange={handleResolutionChange}
        >
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
          <TabsContent value={selectedResolution.toString()}>
            <TrixelTable
              worldPubkey={worldPubkey}
              resolution={selectedResolution}
              canonicalResolution={canonicalResolution}
              worldAccount={worldAccount}
              onTrixelUpdate={handleTrixelUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <Tabs
          value={selectedResolution.toString()}
          onValueChange={handleResolutionChange}
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${resolutions.length > 0 ? resolutions.length : 1}, minmax(0, 1fr))` }}>
            {resolutions.map((resolution) => (
              <TabsTrigger
                key={resolution}
                value={resolution.toString()}
                className="relative"
              >
                {resolution}
                {/* {resolution === canonicalResolution && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
                {resolution > 0 && trixelStats.byResolution[resolution - 1]?.onChainCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                )}
                {resolution === 0 && trixelStats.byResolution[0]?.onChainCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                )} */}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={selectedResolution.toString()}>
            <TrixelTable
              worldPubkey={worldPubkey}
              resolution={selectedResolution}
              canonicalResolution={canonicalResolution}
              worldAccount={worldAccount}
              onTrixelUpdate={handleTrixelUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 