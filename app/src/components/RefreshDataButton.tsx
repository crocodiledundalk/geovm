'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorldTrixels } from '@/hooks/useTrixels';

interface RefreshDataButtonProps {
  worldPubkey: PublicKey;
  specificTrixelIds?: number[]; // Optional specific trixels to refresh
  onRefreshStart?: () => void;
  onRefreshComplete?: () => void;
  className?: string;
  tooltipText?: string;
  showRefreshText?: boolean;
}

export function RefreshDataButton({
  worldPubkey,
  specificTrixelIds,
  onRefreshStart,
  onRefreshComplete,
  className = '',
  tooltipText = 'Refresh data',
  showRefreshText = false
}: RefreshDataButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  
  // Get the useWorldTrixels hook
  const { 
    refreshTrixels,
    refreshTrixelWithAncestors,
    refetchOnChainTrixels
  } = useWorldTrixels(worldPubkey, { canonicalResolution: 8 }); // Assuming default resolution

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    onRefreshStart?.();
    
    try {
      // Refresh world data
      await queryClient.invalidateQueries({ queryKey: ['world', worldPubkey.toString()] });
      
      // Refresh trixels based on the specificTrixelIds prop
      if (specificTrixelIds && specificTrixelIds.length > 0) {
        // If specificTrixelIds is provided, refresh only those trixels
        await refreshTrixels(specificTrixelIds);
        toast.success(`Refreshed ${specificTrixelIds.length} specific trixels`);
      } else {
        // Otherwise refresh all on-chain trixels
        await refetchOnChainTrixels();
        toast.success('Refreshed all world data');
      }
      
      onRefreshComplete?.();
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to refresh a specific trixel and all its ancestors
  const refreshTrixelAndAncestors = async (trixelId: number) => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    onRefreshStart?.();
    
    try {
      // Refresh world data
      await queryClient.invalidateQueries({ queryKey: ['world', worldPubkey.toString()] });
      
      // Refresh the trixel and all its ancestors
      await refreshTrixelWithAncestors(trixelId);
      toast.success(`Refreshed trixel ${trixelId} and ancestors`);
      
      onRefreshComplete?.();
    } catch (error) {
      console.error('Error refreshing trixel and ancestors:', error);
      toast.error('Failed to refresh trixel data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      className={`inline-flex items-center justify-center px-3 py-2 rounded-md bg-primary/20 hover:bg-primary/30 disabled:opacity-50 ${className}`}
      disabled={isRefreshing}
      title={tooltipText}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {showRefreshText && (
        <span className="ml-2">
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </span>
      )}
    </button>
  );
}

// Export a separate function for programmatic refresh
export const refreshWorldData = async (
  worldPubkey: PublicKey,
  queryClient: any,
  refreshTrixelsFn?: (ids: number[]) => Promise<any>,
  trixelIds?: number[]
) => {
  // Refresh world data
  await queryClient.invalidateQueries({ queryKey: ['world', worldPubkey.toString()] });
  
  // Refresh trixels if requested
  if (refreshTrixelsFn && trixelIds && trixelIds.length > 0) {
    await refreshTrixelsFn(trixelIds);
  } else {
    // Just invalidate all trixels
    await queryClient.invalidateQueries({ queryKey: ['onChainTrixels', worldPubkey.toString()] });
  }
}; 