'use client';

import { TrixelData as HookTrixelData } from '@/hooks/useTrixels';
import { IdlAccounts } from '@coral-xyz/anchor';
import { Geovm } from '@/idl/geovm';
import { PublicKey } from '@solana/web3.js';

// Type for world account data, needed for formatting trixel data
type WorldAccountData = IdlAccounts<Geovm>['world'];

// Helper function to format trixel data for display (can be moved to a shared util if used elsewhere)
// This is a simplified version, assuming world.data is available to determine type.
// Actual implementation might need more robust type checking from world.data.
function getDataTypeEnumKeyFromWorldData(worldDataDefinition: any): string | null {
  if (!worldDataDefinition) return null;
  if (worldDataDefinition.count) return 'count';
  if (worldDataDefinition.aggregateOverwrite) return 'aggregateOverwrite';
  if (worldDataDefinition.aggregateAccumulate) return 'aggregateAccumulate';
  if (worldDataDefinition.meanOverwrite) return 'meanOverwrite';
  if (worldDataDefinition.meanAccumulate) return 'meanAccumulate';
  return null;
}

function formatDisplayData(trixelRawData: any, worldAccountDataDefinition: any): string {
  const worldDataTypeKey = getDataTypeEnumKeyFromWorldData(worldAccountDataDefinition);
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
        if (trixelRawData.meanOverwrite && trixelRawData.meanOverwrite.denominator && trixelRawData.meanOverwrite.denominator.toNumber() !== 0) {
          return (trixelRawData.meanOverwrite.numerator.toNumber() / trixelRawData.meanOverwrite.denominator.toNumber()).toFixed(3);
        }
        return trixelRawData.meanOverwrite?.numerator?.toString() || 'N/A (zero denominator or missing)';
      case 'meanAccumulate':
         if (trixelRawData.meanAccumulate && trixelRawData.meanAccumulate.denominator && trixelRawData.meanAccumulate.denominator.toNumber() !== 0) {
          return (trixelRawData.meanAccumulate.numerator.toNumber() / trixelRawData.meanAccumulate.denominator.toNumber()).toFixed(3);
        }
        return trixelRawData.meanAccumulate?.numerator?.toString() || 'N/A (zero denominator or missing)';
      default:
        return 'Unknown Data Type';
    }
  } catch (e) {
    console.error("Error formatting trixel data in overlay:", e, trixelRawData, worldDataTypeKey);
    return "Display Error";
  }
}


interface TrixelInfoOverlayProps {
  trixelInfo: HookTrixelData | null;
  worldAccount: WorldAccountData | null; // Pass the full world account for data formatting
  onClose?: () => void; // Optional close button
}

export function TrixelInfoOverlay({ trixelInfo, worldAccount, onClose }: TrixelInfoOverlayProps) {
  if (!trixelInfo) {
    return null;
  }

  // Calculate center coordinates for display (example: average of vertices)
  let centerRaDec = 'N/A';
  if (trixelInfo.sphericalCoords && trixelInfo.sphericalCoords.length > 0) {
    const avgRa = trixelInfo.sphericalCoords.reduce((sum, sc) => sum + sc.ra, 0) / trixelInfo.sphericalCoords.length;
    const avgDec = trixelInfo.sphericalCoords.reduce((sum, sc) => sum + sc.dec, 0) / trixelInfo.sphericalCoords.length;
    centerRaDec = `RA: ${avgRa.toFixed(2)}°, Dec: ${avgDec.toFixed(2)}°`;
  }
  
  const formattedData = worldAccount ? formatDisplayData(trixelInfo.data, worldAccount.data) : 'N/A (World type unknown)';

  return (
    <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-4 rounded-lg shadow-xl border dark:border-gray-700 text-sm max-w-xs z-10">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold">Trixel Details</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg leading-none">&times;</button>
        )}
      </div>
      <div className="space-y-1.5 text-xs font-mono overflow-hidden">
        <p>ID: <span className="font-bold text-primary">{trixelInfo.id.toString()}</span></p>
        <p>Res: {trixelInfo.resolution}</p>
        <p>Coords: {centerRaDec}</p>
        <p>Status: <span className={trixelInfo.exists ? 'text-green-500' : 'text-gray-500'}>{trixelInfo.exists ? 'On-chain' : 'Draft'}</span></p>
        {trixelInfo.pda && (
          <p className="truncate" title={trixelInfo.pda.toBase58()}>PDA: {trixelInfo.pda.toBase58().substring(0,10)}...</p>
        )}
        {trixelInfo.hash && (
          <p className="truncate" title={trixelInfo.hash}>Hash: {trixelInfo.hash.substring(0,10)}...</p>
        )}
        {trixelInfo.lastUpdate && trixelInfo.lastUpdate > 0 && (
          <p>Updated: {new Date(trixelInfo.lastUpdate * 1000).toLocaleString()}</p>
        )}
        <p>Data: <span className="font-semibold">{formattedData}</span></p>
      </div>
    </div>
  );
} 