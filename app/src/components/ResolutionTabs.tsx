'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { TrixelTable } from './TrixelTable';
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

interface ResolutionTabsProps {
  worldPubkey: PublicKey;
  canonicalResolution: number;
}

export function ResolutionTabs({ worldPubkey, canonicalResolution }: ResolutionTabsProps) {
  const [selectedResolution, setSelectedResolution] = useState(canonicalResolution);
  const resolutions = [0, ...Array.from({ length: canonicalResolution }, (_, i) => i + 1)];

  // DEBUG LOGS START
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

  const handleResolutionChange = (value: string) => {
    const newResolution = Number(value);
    console.log("[ResolutionTabs] handleResolutionChange - newResolution:", newResolution);
    setSelectedResolution(newResolution);
    prefetchResolutionTrixels(newResolution);
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
          <TabsList className="flex flex-wrap w-full gap-1 p-1 h-auto">
            {resolutions.map((resolution) => (
              <TabsTrigger
                key={resolution}
                value={resolution.toString()}
                className="relative px-3 py-1.5 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted"
              >
                {resolution}
                {resolution === canonicalResolution && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
                {resolution > 0 && trixelStats.byResolution[resolution - 1]?.onChainCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                )}
                {resolution === 0 && trixelStats.byResolution[0]?.onChainCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={selectedResolution.toString()}>
            <TrixelTable
              worldPubkey={worldPubkey}
              resolution={selectedResolution}
              canonicalResolution={canonicalResolution}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 