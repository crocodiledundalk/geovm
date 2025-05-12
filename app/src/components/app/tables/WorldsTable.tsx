'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { RefreshDataButton } from '../../RefreshDataButton';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTrixelCountAtResolution } from '@/sdk/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Helper function to format a public key for display
function formatPubkey(pubkey: PublicKey | null): string {
  if (!pubkey) return 'N/A';
  return `${pubkey.toString().slice(0, 4)}...${pubkey.toString().slice(-4)}`;
}

// Convert bytes to string for world names
function bytesToString(bytes: number[] | Uint8Array): string {
  const buffer = Buffer.from(bytes);
  const nullIndex = buffer.indexOf(0);
  return buffer.toString('utf8', 0, nullIndex === -1 ? buffer.length : nullIndex);
}

// Format a timestamp as a relative time string (e.g., "2 hours ago")
function formatRelativeTime(timestamp: bigint | undefined): string {
  if (!timestamp) return 'Never';
  
  const now = BigInt(Math.floor(Date.now() / 1000));
  const diffSeconds = Number(now - timestamp);
  
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} days ago`;
  
  // For older updates, show the actual date
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString();
}

// Define types for the world data
interface WorldData {
  publicKey: PublicKey;
  account: {
    authority: PublicKey;
    name: Uint8Array;
    maxResolution: number;
    canonicalResolution: number;
    permissionedUpdates: boolean;
    data: any;
    updates: number;
  };
}

interface WorldsTableProps {
  worlds: WorldData[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

// Loading skeleton for the table
function WorldsTableSkeleton() {
  return (
    <div className="pt-16">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name / Address</TableHead>
            <TableHead>Authority / Permissions</TableHead>
            <TableHead>Canonical Resolution</TableHead>
            <TableHead>Update Activity</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-3 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-10 mb-2" />
                <Skeleton className="h-3 w-24" />
              </TableCell>
              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
              <TableCell><Skeleton className="h-9 w-24" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function WorldsTable({ worlds, isLoading, error, onRefresh }: WorldsTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  
  // Track if we've ever been in a loading state
  const [hasStartedLoading, setHasStartedLoading] = useState(isLoading);
  // Track if we have stable content to show
  const [canShowContent, setCanShowContent] = useState(!isLoading && worlds.length > 0);
  // Use a ref to track the current worlds array length
  const worldsLengthRef = useRef(worlds.length);

  // Update the ref when worlds changes
  useEffect(() => {
    worldsLengthRef.current = worlds.length;
  }, [worlds]);
  
  // Manage loading state transition
  useEffect(() => {
    if (isLoading) {
      setHasStartedLoading(true);
      setCanShowContent(false);
    } else if (hasStartedLoading) {
      // Only transition to showing content when:
      // 1. We were previously loading (hasStartedLoading)
      // 2. We're no longer loading (isLoading is false)
      // 3. After a minimum delay for stability
      const timer = setTimeout(() => {
        setCanShowContent(true);
      }, 500); // Longer delay to ensure stable state
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasStartedLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCanShowContent(false);
    await onRefresh();
    
    // Add a small delay after refresh before showing content
    setTimeout(() => {
      setRefreshing(false);
      setCanShowContent(true);
    }, 300);
  };

  // Always show skeleton while loading or refreshing or when we haven't confirmed stable content
  if (isLoading || refreshing || !canShowContent) {
    return <WorldsTableSkeleton />;
  }

  // Only now can we show error or empty states
  if (error) {
    return (
      <div className="text-center py-8 pt-16">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    );
  }

  if (worlds.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-card p-8 mt-16">
        <p className="text-muted-foreground mb-4">No worlds found</p>
        <Button onClick={() => router.push('/create')}>
          Create World
        </Button>
      </div>
    );
  }

  // Only reach here when we have confirmed stable data to show
  return (
    <div className="space-y-4 transition-opacity duration-200 ease-in-out opacity-100 pt-16">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Worlds</h1>
        <RefreshDataButton 
          worldPubkey={new PublicKey('11111111111111111111111111111111')} // Dummy pubkey for worlds list refresh
          className="ml-auto"
          showRefreshText
          onRefreshStart={() => {
            setRefreshing(true);
            setCanShowContent(false);
          }}
          onRefreshComplete={() => {
            setTimeout(() => {
              setRefreshing(false);
              setCanShowContent(true);
            }, 300);
            onRefresh();
          }}
        />
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Address</TableHead>
              <TableHead>Authority / Permissions</TableHead>
              <TableHead>Canonical Resolution</TableHead>
              <TableHead>Update Activity</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {worlds.map((world) => (
              <TableRow 
                key={world.publicKey.toString()}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/world/${world.publicKey.toString()}`)}
              >
                <TableCell className="font-medium">
                  {world.account.name ? bytesToString(world.account.name) : `World ${formatPubkey(world.publicKey)}`} <br/>
                  <span className="text-xs text-muted-foreground mt-1 ">{formatPubkey(world.publicKey)}</span>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatPubkey(world.account.authority)} <br/>
                  <span className="text-xs text-muted-foreground mt-1 ">{world.account.permissionedUpdates ? 'Restricted' : 'Open'}</span>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{world.account.canonicalResolution}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getTrixelCountAtResolution(world.account.canonicalResolution).toLocaleString()} trixels
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {`${world.account.updates} updates`}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/world/${world.publicKey.toString()}`);
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 