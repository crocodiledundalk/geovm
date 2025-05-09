'use client';

import { useState } from 'react';
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

interface ResolutionTabsProps {
  worldPubkey: PublicKey;
  maxResolution: number;
  canonicalResolution: number;
}

export function ResolutionTabs({ worldPubkey, maxResolution, canonicalResolution }: ResolutionTabsProps) {
  const [selectedResolution, setSelectedResolution] = useState(canonicalResolution);
  const resolutions = Array.from({ length: maxResolution }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Trixels</h2>
      
      {/* Mobile view */}
      <div className="md:hidden">
        <Tabs
          value={selectedResolution.toString()}
          onValueChange={(value: string) => setSelectedResolution(Number(value))}
        >
          <Select
            value={selectedResolution.toString()}
            onValueChange={(value: string) => setSelectedResolution(Number(value))}
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
          onValueChange={(value: string) => setSelectedResolution(Number(value))}
        >
          <TabsList className="grid w-full grid-cols-8">
            {resolutions.map((resolution) => (
              <TabsTrigger
                key={resolution}
                value={resolution.toString()}
                className="relative"
              >
                {resolution}
                {resolution === canonicalResolution && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
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