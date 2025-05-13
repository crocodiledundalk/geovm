'use client';

import { useEffect, useState, ChangeEvent, useMemo } from 'react';
import { useGeoVmProgram } from '@/contexts/ProgramContext';
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
import { ClipboardIcon, CheckIcon, SearchIcon, FilterIcon, Edit3Icon, MapPin } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useWorldTrixels, TrixelData as HookTrixelData } from '@/hooks/useTrixels';
import { UpdateTrixelModal } from './UpdateTrixelModal';
import { formatDistanceToNow, format as formatDate } from 'date-fns';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

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
  onJumpToTrixel?: (trixelData: HookTrixelData) => void;
}

export function TrixelTable({ worldPubkey, resolution, canonicalResolution, worldAccount, onTrixelUpdate, onJumpToTrixel }: TrixelTableProps) {
  const { program } = useGeoVmProgram();
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
        (trixel.data && trixel.data.toString().includes(searchTerm))
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
    setLoading(isFetchingTrixels);
    if (isError && trixelError) {
      setError(trixelError.message);
    } else {
      setError(null);
    }
  }, [isFetchingTrixels, isError, trixelError]);

  const { totalFilteredTrixels, totalPages, displayedTrixels } = useMemo(() => {
    const count = filteredData.length;
    const pages = Math.ceil(count / pageSize);
    const displayed = filteredData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    return { totalFilteredTrixels: count, totalPages: pages, displayedTrixels: displayed };
  }, [filteredData, currentPage, pageSize]);

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
    refetchTrixelsForCurrentResolution();
  };

  const handleAction = (trixel: HookTrixelData) => {
    if (onJumpToTrixel) {
      onJumpToTrixel(trixel);
    }
  };

  const handleUpdateClick = (id: BN, exists: boolean) => {
    setSelectedTrixelInfoForUpdate({ id, exists });
    setIsUpdateModalOpen(true);
  };

  if (isFetchingTrixels) {
    return <div className="text-center py-4">Loading trixels...</div>;
  }

  if (isError) {
    return <div className="text-center py-4 text-destructive">Error loading trixels: {trixelError?.message || 'Unknown error'}</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-1 min-h-0">
      {/* Top Controls: Search, Filters, Page Info */}
      <div className="flex-shrink-0 space-y-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="text-sm text-muted-foreground">
            Total Results: {totalFilteredTrixels} | Page {currentPage + 1} of {totalPages}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by ID or PDA..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[200px] lg:w-[250px]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <FilterIcon className="h-4 w-4 mr-2" /> Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={filterOptions.onChainOnly}
                  onCheckedChange={(checked) => setFilterOptions(prev => ({ ...prev, onChainOnly: checked, offChainOnly: checked ? false : prev.offChainOnly }))}
                >
                  On-chain only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filterOptions.offChainOnly}
                  onCheckedChange={(checked) => setFilterOptions(prev => ({ ...prev, offChainOnly: checked, onChainOnly: checked ? false : prev.onChainOnly }))}
                >
                  Off-chain only
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="p-2 border rounded-md text-sm"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Table Area */}
      <div className="flex-grow overflow-y-auto min-h-0">
        {loading && <div className="text-center py-4">Loading trixels...</div>}
        {error && <div className="text-center py-4 text-red-500">Error: {error}</div>}
        {!loading && !error && displayedTrixels.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No trixels found for the current resolution or filters.
          </div>
        )}
        {!loading && !error && displayedTrixels.length > 0 && (
          <Table className="min-w-full">
            <TableBody>
              {displayedTrixels.map((trixel) => {
                const vertices = getTrixelVerticesFromId(trixel.id);
                const sphericalVertices = vertices.map(cartesianToSpherical);
                const displayData = formatTrixelDisplayData(trixel.data, worldDataTypeKey);

                return (
                  <TableRow key={trixel.id.toString()} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs w-[100px]">
                      <div>ID: {trixel.id.toString()}</div>
                      <div className="flex items-center">
                        PDA: {formatAddress(trixel.pda.toBase58())}
                        <button onClick={() => copyToClipboard(trixel.pda.toBase58(), trixel.id.toString() + '-pda')} className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                          {clipboard[trixel.id.toString() + '-pda'] ? <CheckIcon className="h-3 w-3 text-green-500" /> : <ClipboardIcon className="h-3 w-3 text-gray-500" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs w-[200px]">
                      {sphericalVertices.map((s, i) => (
                        <div key={i}>{formatSpherical(s)}</div>
                      ))}
                    </TableCell>
                    <TableCell className="w-[120px]">
                      <div className={`text-xs px-2 py-1 inline-block rounded-full ${trixel.exists ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {trixel.exists ? 'On-chain' : 'Draft'}
                      </div>
                      {trixel.exists && worldDataTypeKey && trixel.data && trixel.data[worldDataTypeKey]?.lastUpdated && (
                        <div className="text-xs text-muted-foreground mt-1">
                           {formatDistanceToNow(new Date(trixel.data[worldDataTypeKey].lastUpdated.toNumber() * 1000), { addSuffix: true })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs w-[100px]">
                      <div>{displayData}</div>
                      {trixel.exists && worldDataTypeKey && trixel.data && trixel.data[worldDataTypeKey]?.lastUpdated && (
                         <div className="text-xs text-muted-foreground mt-1">
                           Updated: {formatDate(new Date(trixel.data[worldDataTypeKey].lastUpdated.toNumber() * 1000), 'PPpp')}
                         </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right w-[180px]">
                      <div className="flex justify-end items-center space-x-1">
                        {onJumpToTrixel && (
                          <Button variant="outline" size="sm" onClick={() => onJumpToTrixel(trixel)} title="Jump to on map">
                            <MapPin className="h-3 w-3 mr-1" /> Jump
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUpdateClick(trixel.id, trixel.exists)}
                          disabled={!program || resolution !== canonicalResolution}
                          title={resolution !== canonicalResolution ? "Updates only allowed at canonical resolution" : (trixel.exists ? "Update Trixel" : "Create Trixel")}
                        >
                          <Edit3Icon className="h-3 w-3 mr-1" /> {trixel.exists ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bottom Pagination Controls */}
      {!loading && !error && displayedTrixels.length > 0 && totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center space-x-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="px-2 py-1"
          >
            Previous
          </Button>
          {renderPaginationButtons()}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            className="px-2 py-1"
          >
            Next
          </Button>
        </div>
      )}

      {selectedTrixelInfoForUpdate && (
        <UpdateTrixelModal
          isOpen={isUpdateModalOpen}
          onClose={handleModalClose}
          worldPubkey={worldPubkey}
          trixelId={selectedTrixelInfoForUpdate.id}
          trixelExists={selectedTrixelInfoForUpdate.exists}
          world={worldAccount}
          onUpdateSuccess={async (updatedTrixelId: number) => {
            // updatedTrixelId is passed by the modal, we can use it if needed in future,
            // for now, just calling the general update and refetch functions.
            onTrixelUpdate(); 
            await refetchTrixelsForCurrentResolution();
          }}
        />
      )}
    </div>
  );
}