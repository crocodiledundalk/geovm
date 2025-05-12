'use client';

import { useEffect, useState, ChangeEvent, useMemo } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { BN, IdlAccounts } from '@coral-xyz/anchor';
import { Geovm } from '@/idl/geovm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  getTrixelVerticesFromId, 
  getTrixelPDA, 
  SphericalCoords, 
  Vector3D,
  cartesianToSpherical,
  getTrixelCountAtResolution,
  getAllTrixelsAtResolution
} from '@/sdk/utils';
import { ClipboardIcon, CheckIcon, SearchIcon, FilterIcon, Edit3Icon } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useWorldTrixels, TrixelData as HookTrixelData } from '@/hooks/useTrixels';
import { UpdateTrixelModal } from '../modals/UpdateTrixelModal';
import { formatDistanceToNow, format as formatDate } from 'date-fns';

type WorldAccountData = IdlAccounts<Geovm>['world'];

// Assuming TrixelData from IDL is structured like { count?: CountData, aggregateOverwrite?: MetricData, etc. }
// This type would represent the 'data' field within a Trixel account from the IDL.
// For now, we'll operate on `any` for trixel.data and rely on worldDataTypeKey for structure.
type TrixelIdlData = any; // Replace with specific IDL type for trixel.data if available

// Helper to get the string representation of the TrixelDataType enum key from world account data
// This function might be slightly different from UpdateTrixelModal if world.data structure differs
function getDataTypeEnumKeyFromWorld(worldData: WorldAccountData['data']): string | null {
  if (!worldData) return null;
  if (worldData.count) return 'count';
  if (worldData.aggregateOverwrite) return 'aggregateOverwrite';
  if (worldData.aggregateAccumulate) return 'aggregateAccumulate';
  if (worldData.meanOverwrite) return 'meanOverwrite';
  if (worldData.meanAccumulate) return 'meanAccumulate';
  return null;
}

// New helper function to format trixel data for display
function formatTrixelDisplayData(trixelRawData: TrixelIdlData, worldDataTypeKey: string | null): string {
  if (!trixelRawData || !worldDataTypeKey) return 'N/A';

  try {
    switch (worldDataTypeKey) {
      case 'count':
        return trixelRawData.count?.count?.toString() || '0';
      case 'aggregateOverwrite':
        return trixelRawData.aggregateOverwrite?.metric?.toString() || '0';
      case 'aggregateAccumulate':
        return trixelRawData.aggregateAccumulate?.metric?.toString() || '0';
      case 'meanOverwrite':
        if (trixelRawData.meanOverwrite) {
          const mean = (trixelRawData.meanOverwrite.numerator.toNumber() / trixelRawData.meanOverwrite.denominator.toNumber()).toString() || '0';
          return `${mean}`;
        }
        return 'N/A';
      case 'meanAccumulate':
        if (trixelRawData.meanAccumulate) {
          const mean = (trixelRawData.meanOverwrite.numerator.toNumber() / trixelRawData.meanOverwrite.denominator.toNumber()).toString() || '0';
          return `${mean}`;
        }
        return 'N/A';
      default:
        return 'Unknown Data Type';
    }
  } catch (e) {
    console.error("Error formatting trixel data:", e, trixelRawData, worldDataTypeKey);
    return "Error Displaying Data";
  }
}

interface TrixelTableProps {
  worldPubkey: PublicKey;
  resolution: number;
  canonicalResolution: number;
  worldAccount: WorldAccountData;
  onTrixelUpdate: () => void;
}


export function TrixelTable({ worldPubkey, resolution, canonicalResolution, worldAccount, onTrixelUpdate }: TrixelTableProps) {
  const { program } = useProgram();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [clipboard, setClipboard] = useState<{ [key: string]: boolean }>({});
  const [filterOptions, setFilterOptions] = useState({
    onChainOnly: false,
    offChainOnly: false,
  });
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedTrixelInfoForUpdate, setSelectedTrixelInfoForUpdate] = useState<{ id: BN; exists: boolean } | null>(null);

  const trixelOptions = useMemo(() => ({
    maxResolution: Math.max(resolution, canonicalResolution),
    canonicalResolution
  }), [resolution, canonicalResolution]);
  
  const { useResolutionTrixels } = useWorldTrixels(worldPubkey, trixelOptions);

  const { 
    data: trixelsData = [], 
    isLoading: isFetchingTrixels,
    isError,
    error: trixelError,
    refetch: refetchTrixelsForCurrentResolution 
  } = useResolutionTrixels(resolution, currentPage);

  const [filteredTrixels, setFilteredTrixels] = useState<HookTrixelData[]>([]);
  
  const worldDataTypeKey = useMemo(() => getDataTypeEnumKeyFromWorld(worldAccount.data), [worldAccount.data]);
  
  useEffect(() => {
    setCurrentPage(0);
  }, [resolution]);

  const filteredData = useMemo(() => {
    let filtered = [...trixelsData];
    if (searchTerm) {
      filtered = filtered.filter(trixel => 
        trixel.id.toString().includes(searchTerm) ||
        trixel.pda.toString().includes(searchTerm) ||
        (trixel.data && trixel.data.includes(searchTerm))
      );
    }
    if (filterOptions.onChainOnly) {
      filtered = filtered.filter(trixel => trixel.exists);
    }
    if (filterOptions.offChainOnly) {
      filtered = filtered.filter(trixel => !trixel.exists);
    }
    return filtered;
  }, [trixelsData, searchTerm, filterOptions]);

  useEffect(() => {
    setFilteredTrixels(filteredData);
  }, [filteredData]);

  useEffect(() => {
    setLoading(isFetchingTrixels);
    if (isError && trixelError) {
      setError(trixelError.message);
    } else {
      setError(null);
    }
  }, [isFetchingTrixels, isError, trixelError]);

  const { totalFilteredTrixels, totalPages, displayedTrixels } = useMemo(() => {
    const count = filteredTrixels.length;
    const pages = Math.ceil(count / pageSize);
    const displayed = filteredTrixels.slice(0, pageSize);
    return { totalFilteredTrixels: count, totalPages: pages, displayedTrixels: displayed };
  }, [filteredTrixels, pageSize]);

  const formatVector = (v: Vector3D) => {
    return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
  };

  const formatSpherical = (s: SphericalCoords) => {
    return `RA: ${s.ra.toFixed(2)}°, Dec: ${s.dec.toFixed(2)}°`;
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setClipboard(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setClipboard(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const setPage = (page: number) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    
    let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(0, endPage - maxButtons + 1);
    }
    
    if (startPage > 0) {
      buttons.push(
        <Button
          key="first"
          variant="outline"
          size="sm"
          onClick={() => setPage(0)}
          className="px-2 py-1"
        >
          1
        </Button>
      );
      
      if (startPage > 1) {
        buttons.push(
          <span key="ellipsis1" className="px-2">
            ...
          </span>
        );
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => setPage(i)}
          className="px-2 py-1"
        >
          {i + 1}
        </Button>
      );
    }
    
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis2" className="px-2">
            ...
          </span>
        );
      }
      
      buttons.push(
        <Button
          key="last"
          variant="outline"
          size="sm"
          onClick={() => setPage(totalPages - 1)}
          className="px-2 py-1"
        >
          {totalPages}
        </Button>
      );
    }
    
    return buttons;
  };

  const handleModalClose = () => {
    setIsUpdateModalOpen(false);
    setSelectedTrixelInfoForUpdate(null);
    onTrixelUpdate();
    if (refetchTrixelsForCurrentResolution) {
        refetchTrixelsForCurrentResolution();
    }
  };

  const openUpdateModal = (trixelId: number | string | BN, trixelExists: boolean) => {
    setSelectedTrixelInfoForUpdate({ id: new BN(trixelId.toString()), exists: trixelExists });
    setIsUpdateModalOpen(true);
  };

  if (isFetchingTrixels) {
    return <div className="text-center py-4">Loading trixels...</div>;
  }

  if (isError) {
    return <div className="text-center py-4 text-destructive">Error loading trixels: {trixelError?.message || 'Unknown error'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
        <div>
          <span className="text-sm text-muted-foreground">
            Total Results: {totalFilteredTrixels} | Page {currentPage + 1} of {totalPages || 1}
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID or PDA..."
              className="pl-8 h-9"
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <FilterIcon className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={filterOptions.onChainOnly}
                onCheckedChange={(checked: boolean) => {
                  setFilterOptions(prev => ({
                    ...prev,
                    onChainOnly: checked,
                    offChainOnly: prev.offChainOnly && !checked ? prev.offChainOnly : false,
                  }));
                  setCurrentPage(0);
                }}
              >
                On-chain only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterOptions.offChainOnly}
                onCheckedChange={(checked: boolean) => {
                  setFilterOptions(prev => ({
                    ...prev,
                    offChainOnly: checked,
                    onChainOnly: prev.onChainOnly && !checked ? prev.onChainOnly : false,
                  }));
                  setCurrentPage(0);
                }}
              >
                Off-chain only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm whitespace-nowrap">Page Size:</span>
            <select 
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm h-9"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">ID / Address</th>
              <th className="text-left p-4">Vertices</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Hash / Updated</th>
              <th className="text-left p-4">Data</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedTrixels.map((trixel: HookTrixelData) => {
              const lastUpdateTimestamp = trixel.lastUpdate ? trixel.lastUpdate * 1000 : null;

              return (
                <tr key={trixel.id.toString()} className="border-b">
                  <td className="p-4">
                    <div className="font-mono text-base font-medium">{trixel.id.toString()}</div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <span>{formatAddress(trixel.pda.toString())}</span>
                      <button 
                        className="ml-2"
                        onClick={() => copyToClipboard(trixel.pda.toString(), `pda-${trixel.id}`)}
                      >
                        {clipboard[`pda-${trixel.id}`] ? (
                          <CheckIcon className="h-3 w-3 text-green-500" />
                        ) : (
                          <ClipboardIcon className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-2 font-mono">
                      {trixel.vertices.map((vertex, i) => {
                        const sphericalText = formatSpherical(trixel.sphericalCoords[i]);
                        const vectorText = formatVector(vertex);
                        const arrayFormat = `[${vertex.x}, ${vertex.y}, ${vertex.z}]`;
                        
                        return (
                          <div key={i} className="relative group">
                            <div className="flex items-center">
                              <span className="text-xs">{sphericalText}</span>
                              <div className="absolute z-10 scale-0 group-hover:scale-100 transition-all duration-100 
                                bg-black text-white text-xs rounded p-2 shadow-lg -bottom-1 left-1/2 
                                transform -translate-x-1/2 translate-y-full origin-top whitespace-nowrap">
                                {vectorText}
                              </div>
                            </div>
                            <button 
                              className="invisible group-hover:visible absolute right-0 top-1"
                              onClick={() => copyToClipboard(arrayFormat, `vertex-${trixel.id}-${i}`)}
                              title="Copy as array"
                            >
                              {clipboard[`vertex-${trixel.id}-${i}`] ? (
                                <CheckIcon className="h-3 w-3 text-green-500" />
                              ) : (
                                <ClipboardIcon className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trixel.exists ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {trixel.exists ? 'On-chain' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm">
                    <div className="flex items-center">
                      <span>{trixel.hash ? formatAddress(trixel.hash) : '-'}</span>
                      {trixel.hash && (
                        <button 
                          className="ml-2"
                          onClick={() => copyToClipboard(trixel.hash!, `hash-${trixel.id}`)}
                        >
                          {clipboard[`hash-${trixel.id}`] ? (
                            <CheckIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <ClipboardIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                    {trixel.exists && lastUpdateTimestamp && (
                      <div 
                        className="text-xs text-muted-foreground mt-1 cursor-default" 
                        title={formatDate(new Date(lastUpdateTimestamp), 'PPpp')}
                      >
                        {formatDistanceToNow(new Date(lastUpdateTimestamp), { addSuffix: true })}
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-mono text-sm truncate max-w-xs">
                    {trixel.exists ? formatTrixelDisplayData(trixel.data, worldDataTypeKey) : 'N/A'}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement jump to trixel
                        }}
                      >
                        Jump
                      </Button>
                      {resolution === canonicalResolution && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUpdateModal(trixel.id, trixel.exists)}
                          className="flex items-center gap-1"
                        >
                          <Edit3Icon className="h-3.5 w-3.5" />
                          Update
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {displayedTrixels.length === 0 && (
              <tr>
                <td colSpan={resolution === canonicalResolution ? 8 : 7} className="px-4 py-4 text-center text-sm text-muted-foreground">
                  No trixels found for this resolution {searchTerm || filterOptions.onChainOnly || filterOptions.offChainOnly ? 'with current filters.' : '.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center space-x-2 mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrevPage} 
          disabled={currentPage === 0}
        >
          Previous
        </Button>
        
        <div className="flex items-center space-x-1">
          {renderPaginationButtons()}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNextPage} 
          disabled={currentPage >= totalPages - 1}
        >
          Next
        </Button>
      </div>

      {selectedTrixelInfoForUpdate && (
        <UpdateTrixelModal
          isOpen={isUpdateModalOpen}
          onClose={handleModalClose}
          world={worldAccount}
          worldPubkey={worldPubkey}
          trixelId={selectedTrixelInfoForUpdate.id}
          trixelExists={selectedTrixelInfoForUpdate.exists}
        />
      )}
    </div>
  );
} 