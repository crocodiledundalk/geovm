import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useGeoVmProgram } from '@/contexts/ProgramContext';
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
import { BN } from '@coral-xyz/anchor';

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
  lastUpdate: number;
  invalid?: boolean;
}

interface UseWorldTrixelsOptions {
  canonicalResolution: number;
  pageSize?: number;
}

const calculateResolutionFromId = (id: number): number => {
  if (id < 4) return 0;
  return Math.floor(Math.log2(id / 4) / 2);
};

export function useWorldTrixels(
  worldPubkey: PublicKey, 
  options: UseWorldTrixelsOptions
) {
  const { program } = useGeoVmProgram();
  const queryClient = useQueryClient();
  const { canonicalResolution, pageSize = 50 } = options;

  const onChainTrixelsQuery = useQuery<TrixelData[], Error>({
    queryKey: ['onChainTrixels', worldPubkey.toString()],
    queryFn: async () => {
      if (!program) throw new Error("Program not initialized");

      console.log(`[useTrixels] Fetching all on-chain trixels for world: ${worldPubkey.toString()}`);
      const accounts = await program.account.trixel.all([
        {
          memcmp: {
            offset: 8,
            bytes: worldPubkey.toBase58(),
          },
        },
      ]);
      console.log(`[useTrixels] Found ${accounts.length} raw trixel accounts.`);

      const validAccounts = accounts.filter(acc => acc.account && acc.account.id !== undefined);

      const mappedData = validAccounts.map(account => {
        const trixelId = account.account.id instanceof BN 
                          ? account.account.id.toNumber() 
                          : Number(account.account.id);

        if (isNaN(trixelId)) {
            console.warn(`[useTrixels] Invalid trixel ID found in account ${account.publicKey.toString()}:`, account.account.id);
            return null; 
        }
        
        const resolution = calculateResolutionFromId(trixelId);
        
        let vertices: Vector3D[] = [];
        let sphericalCoords: SphericalCoords[] = [];
        try {
            vertices = getTrixelVerticesFromId(trixelId);
            sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));
        } catch (vertexError) {
             console.warn(`[useTrixels] Error getting vertices for trixel ID ${trixelId}:`, vertexError);
             vertices = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }];
             sphericalCoords = [{ ra: 0, dec: 0 }, { ra: 0, dec: 0 }, { ra: 0, dec: 0 }];
        }

        const lastUpdate = account.account.lastUpdate instanceof BN 
                             ? account.account.lastUpdate.toNumber() 
                             : Number(account.account.lastUpdate || 0);

        return {
          id: trixelId,
          pda: account.publicKey,
          exists: true,
          hash: account.account.hash ? Buffer.from(account.account.hash).toString('hex') : "0".repeat(64),
          data: account.account.data,
          vertices,
          sphericalCoords,
          resolution,
          lastUpdate
        } as TrixelData;
      });
      
      const finalData = mappedData.filter(Boolean) as TrixelData[];
      console.log(`[useTrixels] Successfully fetched and mapped ${finalData.length} valid on-chain trixels.`);
      return finalData;
    },
    enabled: !!program,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const useResolutionTrixels = (resolution: number, page: number) => {
    return useQuery<TrixelData[], Error>({
      queryKey: ['resolutionTrixels', worldPubkey.toString(), resolution, page, pageSize], 
      queryFn: async () => {
        console.log(`[useTrixels] Querying resolutionTrixels for Res: ${resolution}, Page: ${page}, PageSize: ${pageSize}`);
        
        const trixelIds = getAllTrixelsAtResolution(resolution, pageSize, page);
        console.log(`[useTrixels] Found ${trixelIds.length} theoretical trixel IDs for Res ${resolution}, Page ${page}.`);

        if (onChainTrixelsQuery.isLoading) {
            console.log("[useTrixels] Waiting for onChainTrixelsQuery to load...");
             await onChainTrixelsQuery.refetch();
             if (onChainTrixelsQuery.isLoading) {
                 throw new Error("Upstream query still loading after refetch attempt.");
             }
        }
        if (onChainTrixelsQuery.isError) {
             console.error("[useTrixels] Error in upstream onChainTrixelsQuery:", onChainTrixelsQuery.error);
             throw new Error("Upstream query failed.");
        }

        const onChainTrixelsData = onChainTrixelsQuery.data || [];
        
        const onChainTrixelsMap = new Map<number, TrixelData>(
          onChainTrixelsData.map((trixel: TrixelData) => [trixel.id, trixel])
        );
        console.log(`[useTrixels] Created onChainTrixelsMap with ${onChainTrixelsMap.size} entries.`);

        const mappedData = trixelIds.map(id => {
          try {
              const onChainTrixel = onChainTrixelsMap.get(id);
              if (onChainTrixel) {
                 return onChainTrixel;
              }
    
              const currentProgramId = program?.programId;
              if (!currentProgramId) {
                  console.warn(`[useTrixels] Program ID not available when calculating PDA for trixel ${id}`);
                   return { id, vertices: [], sphericalCoords: [], exists: false, pda: PublicKey.default, resolution, invalid: true, lastUpdate: 0 } as TrixelData;
              }

              const [pda] = getTrixelPDA(worldPubkey, id, currentProgramId);
              const vertices = getTrixelVerticesFromId(id);
              const sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));
    
              return {
                id,
                vertices,
                sphericalCoords,
                exists: false,
                pda,
                hash: "0".repeat(64), 
                data: undefined, 
                resolution, 
                lastUpdate: 0,
              } as TrixelData;

          } catch (mapError) {
              console.warn(`[useTrixels] Error processing theoretical trixel ID ${id} for resolution ${resolution}:`, mapError);
              const [pda] = getTrixelPDA(worldPubkey, id, program?.programId!); 
               return { 
                   id, 
                   vertices: [], 
                   sphericalCoords: [], 
                   exists: false, 
                   pda: pda || PublicKey.default,
                   resolution, 
                   invalid: true, 
                   lastUpdate: 0 
               } as TrixelData;
          }
        });
        console.log(`[useTrixels] Successfully generated ${mappedData.length} trixels for Res ${resolution}, Page ${page}.`);
        return mappedData;
      },
      enabled: !!program,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    });
  };

  const trixelStats = useMemo(() => {
    const onChainData = onChainTrixelsQuery.data || [];
    const statsByRes: { [key: number]: { onChainCount: number; totalCount: number } } = {};

    for (let i = 0; i <= canonicalResolution; i++) {
        statsByRes[i] = { onChainCount: 0, totalCount: getTrixelCountAtResolution(i) };
    }

    onChainData.forEach((t: TrixelData) => {
        if (t.resolution >= 0 && t.resolution <= canonicalResolution) { 
            if (!statsByRes[t.resolution]) {
                 statsByRes[t.resolution] = { onChainCount: 0, totalCount: getTrixelCountAtResolution(t.resolution) };
            }
            statsByRes[t.resolution].onChainCount++;
        } else {
             console.warn(`[useTrixels] Found on-chain trixel ${t.id} with unexpected resolution ${t.resolution}`);
        }
    });

    return {
        totalOnChain: onChainData.length,
        byResolution: Object.entries(statsByRes).map(([res, counts]) => ({
            resolution: parseInt(res, 10),
            ...counts
        })).sort((a, b) => a.resolution - b.resolution),
    };
  }, [onChainTrixelsQuery.data, canonicalResolution]);

  const prefetchResolutionTrixels = useCallback(async (resolution: number) => {
    if (!queryClient || !program) return;
    
    console.log(`[useTrixels] Attempting to prefetch Res ${resolution}, Page 0`);

    if (onChainTrixelsQuery.isLoading || onChainTrixelsQuery.isError) {
        console.log(`[useTrixels] Skipping prefetch for Res ${resolution} because onChainTrixelsQuery is not ready.`);
        return;
    }
    
    try {
      const calcTrixelQueryKey = ['resolutionTrixels', worldPubkey.toString(), resolution, 0, pageSize];
      const existingData = queryClient.getQueryData(calcTrixelQueryKey);
      
      if (!existingData) {
        console.log(`[useTrixels] No existing data for Res ${resolution}, Page 0. Proceeding with prefetch.`);
        try {
          const trixelIds = getAllTrixelsAtResolution(resolution, pageSize, 0);
          const onChainTrixelsData = onChainTrixelsQuery.data || [];
          const onChainTrixelsMap = new Map<number, TrixelData>(
            onChainTrixelsData.map((trixel: TrixelData) => [trixel.id, trixel])
          );

          const data = trixelIds.map(id => {
            try {
              const onChainTrixel = onChainTrixelsMap.get(id);
              if (onChainTrixel) return onChainTrixel;

              const [pda] = getTrixelPDA(worldPubkey, id, program.programId);
              const vertices = getTrixelVerticesFromId(id);
              const sphericalCoords = vertices.map(vertex => getSphericalCoords(vertex));

              return {
                id,
                vertices,
                sphericalCoords,
                exists: false,
                pda,
                hash: "0".repeat(64), 
                data: undefined,
                resolution,
                lastUpdate: 0,
              } as TrixelData;
            } catch (err) {
              console.warn(`[useTrixels Prefetch] Skipping invalid trixel ID: ${id} for resolution ${resolution}`, err);
              const [pda] = getTrixelPDA(worldPubkey, id, program.programId); 
              return {
                id,
                vertices: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }],
                sphericalCoords: [{ ra: 0, dec: 0 }, { ra: 0, dec: 0 }, { ra: 0, dec: 0 }],
                exists: false,
                pda: pda || PublicKey.default,
                hash: "0".repeat(64),
                data: undefined,
                resolution: calculateResolutionFromId(id),
                invalid: true,
                lastUpdate: 0
              } as TrixelData;
            }
          });
          
          queryClient.setQueryData(calcTrixelQueryKey, data);
           console.log(`[useTrixels] Successfully prefetched and set data for Res ${resolution}, Page 0.`);
        } catch (innerError) {
          console.error(`[useTrixels] Error during prefetch generation for resolution ${resolution}:`, innerError);
          queryClient.setQueryData(calcTrixelQueryKey, []);
        }
      } else {
          console.log(`[useTrixels] Data already exists for Res ${resolution}, Page 0. Skipping prefetch.`);
      }
    } catch (error) {
      console.error("[useTrixels] Failed to prefetch trixels:", error);
    }
  }, [queryClient, program, worldPubkey, onChainTrixelsQuery.data, onChainTrixelsQuery.isLoading, onChainTrixelsQuery.isError, pageSize]);

  const refreshTrixels = useCallback(async (trixelIds: number[]) => {
    if (!program) {
         console.error("[useTrixels refreshTrixels] Program not initialized.");
         throw new Error("Program not initialized");
    }

    const uniqueTrixelIds = [...new Set(trixelIds)];
    if (uniqueTrixelIds.length === 0) return;

    // console.log(`[useTrixels refreshTrixels] Refreshing ${uniqueTrixelIds.length} trixels:`, uniqueTrixelIds);
    
    // Define the expected shape for a fulfilled promise
    type FulfilledTrixelFetch = {
      id: number;
      account: any | null; // Anchor account type or null if not found
      pda: PublicKey;
    };

    try {
      const fetchedAccounts = await Promise.allSettled<
        FulfilledTrixelFetch // Specify the type for fulfilled promises
      >(
        uniqueTrixelIds.map(async (trixelId) => {
          const [pda] = getTrixelPDA(worldPubkey, trixelId, program.programId);
          try {
            const account = await program.account.trixel.fetch(pda);
            return { id: trixelId, account, pda }; 
          } catch (err: any) {
            if (err.message?.includes("Account does not exist")) {
                 return { id: trixelId, account: null, pda }; 
            }
            // For other errors, rethrow to make the promise reject
            console.error(`[useTrixels refreshTrixels] Error fetching trixel ${trixelId} (PDA: ${pda.toString()}):`, err);
            throw err; // This will cause the promise to be 'rejected' in allSettled
          }
        })
      );

      // Process results and update React Query cache for onChainTrixels
      let didUpdateOnChainCache = false;
      queryClient.setQueryData(['onChainTrixels', worldPubkey.toString()], (oldData: TrixelData[] | undefined): TrixelData[] => {
        const currentData = oldData || [];
        const newDataMap = new Map<number, TrixelData>(currentData.map(t => [t.id, t]));
        let changed = false;

        fetchedAccounts.forEach(result => {
          if (result.status === 'fulfilled') {
            // Now result.value is correctly typed as FulfilledTrixelFetch
            const { id, account, pda } = result.value; 
            
            if (account) { // Trixel exists on chain
                const resolution = calculateResolutionFromId(id); 
                 let vertices: Vector3D[] = [];
                 let sphericalCoords: SphericalCoords[] = [];
                 try {
                     vertices = getTrixelVerticesFromId(id);
                     sphericalCoords = vertices.map(getSphericalCoords);
                 } catch (vErr) { console.warn(`[useTrixels refreshTrixels] Vertex error for updated trixel ${id}:`, vErr); }

                 const lastUpdate = account.lastUpdate instanceof BN 
                                     ? account.lastUpdate.toNumber() 
                                     : Number(account.lastUpdate || 0);

                 const updatedTrixel: TrixelData = {
                    id,
                    pda,
                    exists: true,
                    hash: account.hash ? Buffer.from(account.hash).toString('hex') : "0".repeat(64),
                    data: account.data,
                    vertices,
                    sphericalCoords,
                    resolution,
                    lastUpdate
                 };
                 const existing = newDataMap.get(id);
                 if (!existing || existing.hash !== updatedTrixel.hash || existing.lastUpdate !== updatedTrixel.lastUpdate) {
                     newDataMap.set(id, updatedTrixel);
                     changed = true;
                 }

            } else { // Trixel does NOT exist on chain (account is null in fulfilled result)
                if (newDataMap.has(id)) {
                    newDataMap.delete(id);
                    changed = true;
                }
            }
          } else {
              // Handle rejected promises (fetch errors other than not found)
              console.error("[useTrixels refreshTrixels] Fetch promise rejected:", result.reason);
          }
        });
        
        if (changed) {
            didUpdateOnChainCache = true;
            return Array.from(newDataMap.values());
        } else {
            return currentData; 
        }
      });

      // Only invalidate resolution queries if the underlying on-chain data actually changed
      if (didUpdateOnChainCache) {
          const resolutionsToInvalidate = new Set<number>();
          uniqueTrixelIds.forEach(id => {
              resolutionsToInvalidate.add(calculateResolutionFromId(id));
          });
          
          resolutionsToInvalidate.forEach(res => {
               console.log(`[useTrixels refreshTrixels] Invalidating queries for resolution ${res}`);
               queryClient.invalidateQueries({
                   queryKey: ['resolutionTrixels', worldPubkey.toString(), res],
                   refetchType: 'active'
               });
          });
      } else {
      }

    } catch (error) {
      console.error("[useTrixels refreshTrixels] Error during trixel refresh process:", error);
    }
  }, [program, worldPubkey, queryClient]);

  return { 
    useResolutionTrixels, 
    onChainTrixelsQuery, 
    trixelStats, 
    prefetchResolutionTrixels,
    refreshTrixels 
  };
} 