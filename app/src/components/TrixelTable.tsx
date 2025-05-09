'use client';

import { useEffect, useState, ChangeEvent, useMemo } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  getTrixelVerticesFromId, 
  getTrixelPDA, 
  SphericalCoords, 
  Vector3D,
  cartesianToSpherical,
  getTrixelCountAtResolution,
  getAllTrixelsAtResolution
} from '@/sdk/utils';
import { ClipboardIcon, CheckIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { useWorldTrixels, TrixelData } from '@/hooks/useTrixels';

interface TrixelTableProps {
  worldPubkey: PublicKey;
  resolution: number;
  canonicalResolution: number;
}

export function TrixelTable({ worldPubkey, resolution, canonicalResolution }: TrixelTableProps) {
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

  // Memoize the options to prevent recreation on every render
  const trixelOptions = useMemo(() => ({
    maxResolution: Math.max(resolution, canonicalResolution),
    canonicalResolution
  }), [resolution, canonicalResolution]);
  
  // Get the trixel data from our hook
  const { useResolutionTrixels } = useWorldTrixels(worldPubkey, trixelOptions);

  // Get trixels for the current resolution and page
  const { 
    data: trixelsData = [], 
    isLoading: isFetchingTrixels,
    isError,
    error: trixelError
  } = useResolutionTrixels(resolution, currentPage);

  // Local filtering on the data we get from the query
  const [filteredTrixels, setFilteredTrixels] = useState<TrixelData[]>([]);
  
  // Reset page when resolution changes
  useEffect(() => {
    setCurrentPage(0);
  }, [resolution]);

  // Memoize the filtered data to prevent unnecessary re-renders
  const filteredData = useMemo(() => {
    let filtered = [...trixelsData];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(trixel => 
        trixel.id.toString().includes(searchTerm) ||
        trixel.pda.toString().includes(searchTerm) ||
        (trixel.data && trixel.data.includes(searchTerm))
      );
    }
    
    // Apply on-chain/off-chain filters
    if (filterOptions.onChainOnly) {
      filtered = filtered.filter(trixel => trixel.exists);
    }
    
    if (filterOptions.offChainOnly) {
      filtered = filtered.filter(trixel => !trixel.exists);
    }
    
    return filtered;
  }, [trixelsData, searchTerm, filterOptions]);

  // Update filtered trixels when the memoized data changes
  useEffect(() => {
    setFilteredTrixels(filteredData);
  }, [filteredData]);

  // Update loading state
  useEffect(() => {
    setLoading(isFetchingTrixels);
    if (isError && trixelError) {
      setError(trixelError.message);
    } else {
      setError(null);
    }
  }, [isFetchingTrixels, isError, trixelError]);

  // Memoize derived values that don't need to trigger re-renders
  const { totalFilteredTrixels, totalPages, displayedTrixels } = useMemo(() => {
    const count = filteredTrixels.length;
    const pages = Math.ceil(count / pageSize);
    const displayed = filteredTrixels.slice(0, pageSize);
    
    return {
      totalFilteredTrixels: count,
      totalPages: pages,
      displayedTrixels: displayed
    };
  }, [filteredTrixels, pageSize]);

  // Format a vector to display with limited decimal places
  const formatVector = (v: Vector3D) => {
    return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
  };

  // Format spherical coordinates
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
    setCurrentPage(0); // Reset to first page when changing page size
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    // Use a functional update to avoid stale closures
    setClipboard(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setClipboard(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Format address for display (truncate middle)
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const setPage = (page: number) => {
    setCurrentPage(page);
  };

  // Generate pagination buttons
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5; // Maximum number of buttons to show
    
    let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
    
    // If we're at the end, show more pages at the beginning
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(0, endPage - maxButtons + 1);
    }
    
    // Add "First" button if not at the beginning
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
      
      // Add ellipsis if there's a gap
      if (startPage > 1) {
        buttons.push(
          <span key="ellipsis1" className="px-2">
            ...
          </span>
        );
      }
    }
    
    // Add page buttons
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
    
    // Add "Last" button if not at the end
    if (endPage < totalPages - 1) {
      // Add ellipsis if there's a gap
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

  if (loading) {
    return <div className="text-center py-4">Loading trixels...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
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
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID or PDA..."
              className="pl-8 h-9"
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0); // Reset to first page when searching
              }}
            />
          </div>
          
          {/* Filter dropdown */}
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
          
          {/* Page size selector */}
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
              <th className="text-left p-4">Hash</th>
              <th className="text-left p-4">Data</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedTrixels.map((trixel) => (
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
                            <span className="text-sm">{sphericalText}</span>
                            <div className="absolute z-10 scale-0 group-hover:scale-100 transition-all duration-100 
                              bg-black text-white text-xs rounded p-2 shadow-lg -bottom-1 left-1/2 
                              transform -translate-x-1/2 translate-y-full origin-top whitespace-nowrap">
                              {vectorText} • {arrayFormat}
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
                    {trixel.exists ? 'On-chain' : 'Not on-chain'}
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
                </td>
                <td className="p-4 font-mono text-sm break-all">
                  {trixel.data || '-'}
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
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement update trixel
                        }}
                      >
                        Update
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
        
        {/* Page number buttons */}
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
    </div>
  );
} 