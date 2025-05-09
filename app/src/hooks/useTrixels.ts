import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from '@/contexts/ProgramContext';
import { 
  getTrixelVerticesFromId, 
  getTrixelPDA, 
  SphericalCoords, 
  Vector3D,
  cartesianToSpherical,
  getTrixelCountAtResolution,
  getAllTrixelsAtResolution,
  getTrixelAncestors
} from '@/sdk/utils';
import { useMemo, useCallback } from 'react';

// Cache for memoized spherical coordinates
const sphericalCoordsCache = new Map<string, SphericalCoords>();

// Helper to convert vertex to cached spherical coordinates
const getSphericalCoords = (vertex: Vector3D): SphericalCoords => {
  const key = `${vertex.x},${vertex.y},${vertex.z}`;
  if (!sphericalCoordsCache.has(key)) {
    sphericalCoordsCache.set(key, cartesianToSpherical(vertex));
  }
  return sphericalCoordsCache.get(key)!;
};

export interface TrixelData {
  id: number;
  vertices: Vector3D[];
  sphericalCoords: SphericalCoords[];
  exists: boolean;
  pda: PublicKey;
  hash?: string;
  data?: any;
  resolution: number;
  lastUpdate: number
}

interface UseWorldTrixelsOptions {
  canonicalResolution: number;
  pageSize?: number;
}

export function useWorldTrixels(
  worldPubkey: PublicKey, 
  options: UseWorldTrixelsOptions
) {
  const { program } = useProgram();
  const queryClient = useQueryClient();
  const { canonicalResolution, pageSize = 50 } = options;

  // Query to fetch all on-chain trixels for this world
  const onChainTrixelsQuery = useQuery({
    queryKey: ['onChainTrixels', worldPubkey.toString()],
    queryFn: async () => {
      if (!program) throw new Error("Program not initialized");

      const accounts = await program.account.trixel.all([
        {
          memcmp: {
            offset: 8, // After the account discriminator
            bytes: worldPubkey.toBase58(),
          },
        },
      ]);

      return accounts.map(account => {
        const trixelId = Number(account.account.id);
        const resolution = calculateResolutionFromId(trixelId);
        const vertices = getTrixelVerticesFromId(trixelId);
        const sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));
        
        return {
          id: trixelId,
          pda: account.publicKey,
          exists: true,
          hash: Buffer.from(account.account.hash).toString('hex'),
          data: account.account.data,
          vertices,
          sphericalCoords,
          resolution,
          lastUpdate: Number(account.account.lastUpdate)
        };
      });
    },
    enabled: !!program,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Function to calculate resolution from ID
  const calculateResolutionFromId = (id: number) => {
    if (id >= 1 && id <= 8) return 0;
    
    // Count digits after the first digit
    let count = 0;
    let current = id;
    while (current > 8) {
      current = Math.floor(current / 10);
      count++;
    }
    return count;
  };

  // Query to get all calculated trixels for a specific resolution (not fetched from chain)
  const useResolutionTrixels = (resolution: number, page: number) => {
    return useQuery({
      queryKey: ['calculatedTrixels', worldPubkey.toString(), resolution, page],
      queryFn: async () => {
        const trixelIds = getAllTrixelsAtResolution(resolution, pageSize, page);
        const onChainTrixelsData = onChainTrixelsQuery.data || [];
        const onChainTrixelsMap = new Map<number, TrixelData>(
          onChainTrixelsData.map((trixel: TrixelData) => [trixel.id, trixel])
        );

        return trixelIds.map(id => {
          // Check if this trixel exists on-chain
          const onChainTrixel = onChainTrixelsMap.get(id);
          if (onChainTrixel) return onChainTrixel;

          // If not, return calculated version
          const [pda] = getTrixelPDA(worldPubkey, id, program?.programId!);
          const vertices = getTrixelVerticesFromId(id);
          const sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));

          return {
            id,
            vertices,
            sphericalCoords,
            exists: false,
            pda,
            hash: "0".repeat(64), // [0;32] as hex string
            resolution,
          } as TrixelData;
        });
      },
      enabled: !!program && onChainTrixelsQuery.isSuccess,
    });
  };

  // Stats about trixels
  const trixelStats = {
    totalOnChain: onChainTrixelsQuery.data?.length || 0,
    byResolution: Array.from({ length: canonicalResolution + 1 }, (_, i) => {
      const resolutionTrixels = onChainTrixelsQuery.data?.filter((t: TrixelData) => t.resolution === i) || [];
      return {
        resolution: i,
        onChainCount: resolutionTrixels.length,
        totalCount: getTrixelCountAtResolution(i),
      };
    }),
  };

  // Function to pre-fetch trixels for a resolution
  const prefetchResolutionTrixels = async (resolution: number) => {
    if (!queryClient) return;
    
    try {
      const calcTrixelQueryKey = ['calculatedTrixels', worldPubkey.toString(), resolution, 0];
      const existingData = queryClient.getQueryData(calcTrixelQueryKey);
      
      // Only prefetch if we don't already have data
      if (!existingData) {
        try {
          const trixelIds = getAllTrixelsAtResolution(resolution, pageSize, 0);
          const onChainTrixelsData = onChainTrixelsQuery.data || [];
          const onChainTrixelsMap = new Map<number, TrixelData>(
            onChainTrixelsData.map((trixel: TrixelData) => [trixel.id, trixel])
          );

          const data = trixelIds.map(id => {
            try {
              // Check if this trixel exists on-chain
              const onChainTrixel = onChainTrixelsMap.get(id);
              if (onChainTrixel) return onChainTrixel;

              // If not, return calculated version
              const [pda] = getTrixelPDA(worldPubkey, id, program?.programId!);
              const vertices = getTrixelVerticesFromId(id);
              const sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));

              return {
                id,
                vertices,
                sphericalCoords,
                exists: false,
                pda,
                hash: "0".repeat(64), // [0;32] as hex string
                resolution,
              } as TrixelData;
            } catch (err) {
              console.warn(`Skipping invalid trixel ID: ${id}`, err);
              // Return a placeholder for invalid trixels
              const [pda] = getTrixelPDA(worldPubkey, id, program?.programId!);
              return {
                id,
                vertices: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }],
                sphericalCoords: [{ ra: 0, dec: 0 }, { ra: 0, dec: 0 }, { ra: 0, dec: 0 }],
                exists: false,
                pda,
                hash: "0".repeat(64),
                resolution: calculateResolutionFromId(id),
                invalid: true,
                lastUpdate: 0
              } as TrixelData;
            }
          });
          
          queryClient.setQueryData(calcTrixelQueryKey, data);
        } catch (innerError) {
          console.error(`Error generating trixels for resolution ${resolution}:`, innerError);
          // Set empty data to prevent repeated failures
          queryClient.setQueryData(calcTrixelQueryKey, []);
        }
      }
    } catch (error) {
      console.error("Failed to prefetch trixels:", error);
    }
  };

  // Function to refresh specific trixels by their IDs
  const refreshTrixels = useCallback(async (trixelIds: number[]) => {
    if (!program) throw new Error("Program not initialized");

    // Create a unique set of trixel IDs to refresh
    const uniqueTrixelIds = [...new Set(trixelIds)];
    
    try {
      // Fetch the specific trixels from the chain
      const updatedTrixels = await Promise.all(
        uniqueTrixelIds.map(async (trixelId) => {
          const [pda] = getTrixelPDA(worldPubkey, trixelId, program.programId);
          try {
            const account = await program.account.trixel.fetch(pda);
            const resolution = calculateResolutionFromId(trixelId);
            const vertices = getTrixelVerticesFromId(trixelId);
            const sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));
            
            return {
              id: trixelId,
              pda,
              exists: true,
              hash: Buffer.from(account.hash).toString('hex'),
              data: account.data,
              vertices,
              sphericalCoords,
              resolution,
              lastUpdate: Number(account.lastUpdate)
            };
          } catch (err) {
            // If the trixel doesn't exist on chain, return the calculated version
            console.warn(`Trixel ${trixelId} not found on chain:`, err);
            const vertices = getTrixelVerticesFromId(trixelId);
            const sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));
            
            return {
              id: trixelId,
              vertices,
              sphericalCoords,
              exists: false,
              pda,
              hash: "0".repeat(64),
              resolution: calculateResolutionFromId(trixelId),
              lastUpdate: 0
            } as TrixelData;
          }
        })
      );
      
      // Update the cache with the updated trixels
      const currentData = queryClient.getQueryData(['onChainTrixels', worldPubkey.toString()]) as TrixelData[] || [];
      
      // Remove the old versions of the refreshed trixels
      const filteredData = currentData.filter(trixel => !uniqueTrixelIds.includes(trixel.id));
      
      // Add the updated trixels
      const newData = [...filteredData, ...updatedTrixels.filter(t => t.exists)];
      
      // Update the cache
      queryClient.setQueryData(['onChainTrixels', worldPubkey.toString()], newData);
      
      // Also invalidate the calculated trixels queries for any affected resolutions
      const resolutions = [...new Set(updatedTrixels.map(t => t.resolution))];
      resolutions.forEach(resolution => {
        queryClient.invalidateQueries({
          queryKey: ['calculatedTrixels', worldPubkey.toString(), resolution]
        });
      });
      
      return updatedTrixels;
    } catch (error) {
      console.error("Failed to refresh trixels:", error);
      throw error;
    }
  }, [program, worldPubkey, queryClient, calculateResolutionFromId]);

  // Function to refresh a trixel and all its ancestors
  const refreshTrixelWithAncestors = useCallback(async (trixelId: number) => {
    const ancestors = getTrixelAncestors(trixelId);
    const allTrixelsToRefresh = [trixelId, ...ancestors];
    return refreshTrixels(allTrixelsToRefresh);
  }, [refreshTrixels]);

  return {
    // All on-chain trixels
    onChainTrixels: onChainTrixelsQuery.data || [],
    isLoadingOnChain: onChainTrixelsQuery.isLoading,
    
    // Utility to get trixels for a specific resolution
    useResolutionTrixels,
    
    // Prefetching utility
    prefetchResolutionTrixels,
    
    // Refresh utilities
    refreshTrixels,
    refreshTrixelWithAncestors,
    
    // Stats
    trixelStats,
    
    // Refetch all
    refetchOnChainTrixels: onChainTrixelsQuery.refetch,
  };
} 