import { useEffect, useState } from 'react';
import { useProgram } from '@/contexts/ProgramContext';
import { PublicKey } from '@solana/web3.js';
import { Geovm } from '@/idl/geovm'; // Assuming your IDL types are here
import { ResolutionTabs } from '@/components/ResolutionTabs'; // Assuming you have this
import { IdlAccounts } from '@coral-xyz/anchor'; // Import IdlAccounts

// Helper function to convert byte array (like name: [u8;32]) to string
function bytesToString(bytes: number[] | Uint8Array): string {
  const NUL = 0;
  let end = bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === NUL) {
      end = i;
      break;
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes.slice(0, end)));
}

// Helper to get the string representation of the TrixelDataType enum
function getDataTypeString(dataEnum: any): string {
  if (!dataEnum) return 'Unknown';
  if (dataEnum.count) return 'Count';
  if (dataEnum.aggregateOverwrite) return 'Aggregate Overwrite';
  if (dataEnum.aggregateAccumulate) return 'Aggregate Accumulate';
  if (dataEnum.meanOverwrite) return 'Mean Overwrite';
  if (dataEnum.meanAccumulate) return 'Mean Accumulate';
  return 'Unknown';
}

interface WorldPageProps {
  params: { id: string };
}

// Define the type for the World account data based on the IDL
type WorldAccountData = IdlAccounts<Geovm>['world'];

export default function WorldPage({ params }: WorldPageProps) {
  const { program } = useProgram();
  const [worldAccount, setWorldAccount] = useState<WorldAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const worldId = params.id;

  useEffect(() => {
    const fetchWorld = async () => {
      if (!program || !worldId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const worldPubkey = new PublicKey(worldId);
        const account = await program.account.world.fetch(worldPubkey);
        // Assuming 'account' is correctly typed as your World account structure from Geovm IDL types
        // For example: account: ProgramAccount<Geovm["accounts"]["World"]> or similar
        setWorldAccount(account as any); // Cast to any if direct type is complex, or use proper type
        setError(null);
      } catch (e) {
        console.error("Error fetching world:", e);
        if (e instanceof Error && e.message.includes("Account does not exist")) {
          setError("World not found. It may not have been created yet or the ID is incorrect.");
        } else if (e instanceof RangeError) {
          setError("Failed to decode world data. The account structure might be outdated. Try creating a new world.");
        } else {
          setError("Failed to fetch world data.");
        }
        setWorldAccount(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWorld();
  }, [program, worldId]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading world data...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!worldAccount) {
    return <div className="container mx-auto p-4 text-center">World data not available.</div>;
  }

  const displayName = bytesToString(worldAccount.name);
  const dataTypeString = getDataTypeString(worldAccount.data);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="bg-card p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-2">World: {displayName}</h1>
        <p className="text-sm text-muted-foreground mb-4">ID: {worldId}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <span className="font-semibold">Authority:</span>
            <p className="truncate">{worldAccount.authority.toBase58()}</p>
          </div>
          <div>
            <span className="font-semibold">Canonical Resolution:</span>
            <p>{worldAccount.canonicalResolution}</p>
          </div>
          <div>
            <span className="font-semibold">Data Aggregation Type:</span>
            <p>{dataTypeString}</p>
          </div>
          <div>
            <span className="font-semibold">Permissioned Updates:</span>
            <p>{worldAccount.permissionedUpdates ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="font-semibold">Total Updates:</span>
            <p>{worldAccount.updates.toString()}</p> 
          </div>
        </div>
        {/* You might want to display the root hash or other stats here */}
      </div>

      {/* Re-adding ResolutionTabs component */}
      <ResolutionTabs 
        worldPubkey={new PublicKey(worldId)} 
        canonicalResolution={worldAccount.canonicalResolution}
        maxResolution={worldAccount.canonicalResolution} // Using canonical as max for display
      />

      {/* Display specific data from worldAccount.data based on dataTypeString */}
      {dataTypeString === 'Count' && worldAccount.data.count && (
        <div className="bg-card p-4 rounded-lg shadow mt-4">
          <h3 className="text-lg font-semibold mb-2">World Aggregate Data (Count)</h3>
          <p>Total Count: {worldAccount.data.count.count.toString()}</p>
        </div>
      )}
      {dataTypeString === 'Aggregate Overwrite' && worldAccount.data.aggregateOverwrite && (
        <div className="bg-card p-4 rounded-lg shadow mt-4">
          <h3 className="text-lg font-semibold mb-2">World Aggregate Data (Aggregate Overwrite)</h3>
          <p>Current Metric: {worldAccount.data.aggregateOverwrite.metric.toString()}</p>
        </div>
      )}
       {dataTypeString === 'Aggregate Accumulate' && worldAccount.data.aggregateAccumulate && (
        <div className="bg-card p-4 rounded-lg shadow mt-4">
          <h3 className="text-lg font-semibold mb-2">World Aggregate Data (Aggregate Accumulate)</h3>
          <p>Accumulated Metric: {worldAccount.data.aggregateAccumulate.metric.toString()}</p>
        </div>
      )}
      {dataTypeString === 'Mean Overwrite' && worldAccount.data.meanOverwrite && (
        <div className="bg-card p-4 rounded-lg shadow mt-4">
          <h3 className="text-lg font-semibold mb-2">World Aggregate Data (Mean Overwrite)</h3>
          <p>Numerator: {worldAccount.data.meanOverwrite.numerator.toString()}</p>
          <p>Denominator: {worldAccount.data.meanOverwrite.denominator.toString()}</p>
          {worldAccount.data.meanOverwrite.denominator.gtn(0) && (
             <p>Mean: {(worldAccount.data.meanOverwrite.numerator.toNumber() / worldAccount.data.meanOverwrite.denominator.toNumber()).toFixed(2)}</p>
          )}
        </div>
      )}
      {dataTypeString === 'Mean Accumulate' && worldAccount.data.meanAccumulate && (
        <div className="bg-card p-4 rounded-lg shadow mt-4">
          <h3 className="text-lg font-semibold mb-2">World Aggregate Data (Mean Accumulate)</h3>
          <p>Numerator: {worldAccount.data.meanAccumulate.numerator.toString()}</p>
          <p>Denominator: {worldAccount.data.meanAccumulate.denominator.toString()}</p>
          {worldAccount.data.meanAccumulate.denominator.gtn(0) && (
             <p>Mean: {(worldAccount.data.meanAccumulate.numerator.toNumber() / worldAccount.data.meanAccumulate.denominator.toNumber()).toFixed(2)}</p>
          )}
        </div>
      )}

    </div>
  );
} 