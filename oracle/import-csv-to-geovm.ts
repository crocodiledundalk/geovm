import fs from 'fs';
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import path from 'path';
import { Geovm } from '../target/types/geovm';

// Custom delay function
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Utility functions
function getTrixelPDA(world: PublicKey, trixelId: number, programId: PublicKey): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("trixel"),
      world.toBuffer(),
      Buffer.from(new BN(trixelId).toArray("le", 8))
    ],
    programId
  );
  return [pda, bump];
}

function getTrixelAncestors(id: number): number[] {
  const idStr = id.toString();
  
  // Return empty array for level 0 triangles (1-8)
  if (idStr.length === 1 && parseInt(idStr) >= 1 && parseInt(idStr) <= 8) {
    return [];
  }
  
  // Initialize with explicit type and empty array
  const ancestors: Array<number> = [];
  
  // Remove one digit at a time from the left to get parent trixel IDs
  for (let i = 1; i < idStr.length; i++) {
    const ancestorId = idStr.substring(i);
    ancestors.push(parseInt(ancestorId));
  }
  
  // Sort by depth (shorter numbers first, which are higher in the tree)
  return ancestors.sort((a, b) => a.toString().length - b.toString().length);
}

// Simple CSV parser
function parseCSV(csvData: string): TrixelRecord[] {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const record: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (header === 'trixelId' && value) {
        record[header] = parseInt(value, 10);
      } else if (header === 'value' && value) {
        record[header] = parseInt(value, 10);
      }
    });
    
    return record as TrixelRecord;
  });
}

// Configure rate limiting and batch processing
const TX_PER_SECOND = 20;
const DELAY_MS = 1000 / TX_PER_SECOND;
const BATCH_SIZE = 5; // Number of transactions to process in parallel

// Define the interface for CSV records
interface TrixelRecord {
  trixelId: number;
  value: number;
}

// Define the interface for a transaction job
interface TransactionJob {
  trixelId: number;
  value: number;
  transaction: Transaction;
}

/**
 * Process a CSV file with trixel data and update the blockchain
 */
async function processTrixelData(
  csvFilePath: string,
  worldName: string,
  canonicalResolution: number,
  dataType: 'AggregateOverwrite' | 'MeanOverwrite',
  connection: Connection,
  wallet: Keypair,
): Promise<void> {
  console.log(`Processing CSV file: ${csvFilePath}`);
  console.log(`Creating world with name: ${worldName}, resolution: ${canonicalResolution}, dataType: ${dataType}`);
  console.log(`Using batch size: ${BATCH_SIZE}, rate limit: ${TX_PER_SECOND} TPS`);

  // Read and parse the CSV file
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parseCSV(csvData);

  console.log(`Loaded ${records.length} records from CSV`);

  // Create provider
  const provider = new AnchorProvider(
    connection as any,
    new anchor.Wallet(wallet as any),
    { commitment: 'confirmed' }
  );
  
  // Load the program from the local IDL file
  let idlFile;
  try {
    // First try to load from the target directory
    const idlPath = path.join(__dirname, '../target/idl/geovm.json');
    idlFile = fs.readFileSync(idlPath, 'utf-8');
    console.log(`Loaded IDL from ${idlPath}`);
  } catch (error) {
    // If that fails, try the relative path from the current directory
    try {
      const idlPath = path.join(__dirname, './target/idl/geovm.json');
      idlFile = fs.readFileSync(idlPath, 'utf-8');
      console.log(`Loaded IDL from ${idlPath}`);
    } catch (fallbackError) {
      console.error('Failed to load IDL file. Make sure to build the program first.', fallbackError);
      throw fallbackError;
    }
  }
  
  const idl = JSON.parse(idlFile);
  const program: Program<Geovm> = new Program(idl, provider);

  // Create a new world
  const worldKeypair = web3.Keypair.generate();
  console.log(`Creating new world with public key: ${worldKeypair.publicKey.toString()}`);

  // Prepare the name array (padded to 32 bytes)
  const worldNameArray = Array.from(Buffer.from(worldName.padEnd(32, '\0')));

  // Prepare the data type
  const worldDataType = dataType === 'AggregateOverwrite' 
    ? { aggregateOverwrite: {} } 
    : { meanOverwrite: {} };

  // Create the world
  await program.methods
    .createWorld({
      name: worldNameArray,
      canonicalResolution: canonicalResolution,
      dataType: worldDataType,
      permissionedUpdates: false,
    })
    .accountsStrict({
      world: worldKeypair.publicKey,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  console.log('World created successfully');

  // Process each batch of records with rate limiting
  let successCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batchRecords = records.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}, records ${i + 1}-${Math.min(i + BATCH_SIZE, records.length)}`);
    
    // Prepare all transactions in the batch
    const transactionJobs: TransactionJob[] = [];
    
    for (const record of batchRecords) {
      if (!record.trixelId) {
        console.error('Record missing trixelId, skipping...');
        errorCount++;
        continue;
      }

      const trixelId = record.trixelId;
      
      try {
        // Get the trixel PDA and ancestors
        const [trixelPda] = getTrixelPDA(worldKeypair.publicKey, trixelId, program.programId);
        const ancestorIds = getTrixelAncestors(trixelId);
        console.log("ancestorIds:", ancestorIds);
        
        // Get PDAs for ancestors
        const ancestorPDAs = await Promise.all(
          ancestorIds.map(async (ancestorId) => {
            const [pda] = getTrixelPDA(worldKeypair.publicKey, ancestorId, program.programId);
            return pda;
          })
        );
        
        // Create a transaction that combines both create and update instructions
        const transaction = new Transaction();
        
        // Add create instruction
        const createIx = await program.methods
          .createTrixelAndAncestors({ id: new BN(trixelId) })
          .accountsStrict({
            world: worldKeypair.publicKey,
            trixel: trixelPda,
            payer: wallet.publicKey,
            systemProgram: web3.SystemProgram.programId,
          })
          .remainingAccounts(
            ancestorPDAs.map(pda => ({
              pubkey: pda,
              isWritable: true,
              isSigner: false,
            }))
          )
          .instruction();
        
        transaction.add(createIx);
        
        // Add update instruction
        const updateIx = await program.methods
          .updateTrixel({
            id: new BN(trixelId),
            value: record.value,
            coords: null,
          })
          .accountsStrict({
            world: worldKeypair.publicKey,
            trixel: trixelPda,
            payer: wallet.publicKey,
            systemProgram: web3.SystemProgram.programId,
          })
          .remainingAccounts(
            ancestorPDAs.map(pda => ({
              pubkey: pda,
              isWritable: true,
              isSigner: false,
            }))
          )
          .instruction();
        
        transaction.add(updateIx);
        
        // Add to transaction jobs
        transactionJobs.push({
          trixelId,
          value: record.value,
          transaction
        });
      } catch (error) {
        console.error(`Error preparing transaction for trixel ${trixelId}:`, error);
        errorCount++;
      }
    }
    
    // Execute all transactions in the batch concurrently
    if (transactionJobs.length > 0) {
      console.log(`Sending ${transactionJobs.length} transactions in parallel...`);
      
      const results = await Promise.allSettled(
        transactionJobs.map(async (job) => {
          try {
            const signature = await sendAndConfirmTransaction(
              connection, 
              job.transaction, 
              [wallet],
              { commitment: 'confirmed' }
            );
            
            return {
              trixelId: job.trixelId,
              value: job.value,
              success: true,
              signature
            };
          } catch (error: any) {
            // If the error is due to the trixel already existing, try update only
            if (error.toString().includes("custom program error: 0x0")) {
              try {
                console.log(`Trixel ${job.trixelId} may already exist, trying update only...`);
                
                // Get the trixel PDA and ancestors
                const [trixelPda] = getTrixelPDA(worldKeypair.publicKey, job.trixelId, program.programId);
                const ancestorIds = getTrixelAncestors(job.trixelId);
                
                // Get PDAs for ancestors
                const ancestorPDAs = await Promise.all(
                  ancestorIds.map(async (ancestorId) => {
                    const [pda] = getTrixelPDA(worldKeypair.publicKey, ancestorId, program.programId);
                    return pda;
                  })
                );
                
                // Create update-only transaction
                const updateOnlyTx = new Transaction();
                
                const updateIx = await program.methods
                  .updateTrixel({
                    id: new BN(job.trixelId),
                    value: job.value,
                    coords: null,
                  })
                  .accountsStrict({
                    world: worldKeypair.publicKey,
                    trixel: trixelPda,
                    payer: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                  })
                  .remainingAccounts(
                    ancestorPDAs.map(pda => ({
                      pubkey: pda,
                      isWritable: true,
                      isSigner: false,
                    }))
                  )
                  .instruction();
                
                updateOnlyTx.add(updateIx);
                
                const updateSig = await sendAndConfirmTransaction(
                  connection, 
                  updateOnlyTx, 
                  [wallet],
                  { commitment: 'confirmed' }
                );
                
                return {
                  trixelId: job.trixelId,
                  value: job.value,
                  success: true,
                  signature: updateSig,
                  updateOnly: true
                };
              } catch (updateError) {
                return {
                  trixelId: job.trixelId,
                  value: job.value,
                  success: false,
                  error: updateError
                };
              }
            }
            
            return {
              trixelId: job.trixelId,
              value: job.value,
              success: false,
              error
            };
          }
        })
      );
      
      // Process results
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success) {
            console.log(`${data.updateOnly ? 'Updated' : 'Created and updated'} trixel ${data.trixelId} with value ${data.value}. Signature: ${data.signature}`);
            successCount++;
          } else {
            console.error(`Failed to process trixel ${data.trixelId}:`, data.error);
            errorCount++;
          }
        } else {
          console.error('Transaction rejected:', result.reason);
          errorCount++;
        }
      });
    }
    
    // Apply rate limiting between batches
    if (i + BATCH_SIZE < records.length) {
      const delayTime = Math.max(DELAY_MS * transactionJobs.length, 1000); // At least 1 second between batches
      console.log(`Waiting ${delayTime}ms before next batch...`);
      await delay(delayTime);
    }

    // After processing a batch, refresh the account data
    await refreshAccountData(
      connection,
      program,
      worldKeypair.publicKey,
      transactionJobs.map(job => job.trixelId)
    );
  }

  console.log(`Processing complete. Success: ${successCount}, Errors: ${errorCount}`);
}

/**
 * Refreshes account data for a trixel, its ancestors, and the world
 */
async function refreshAccountData(
  connection: Connection,
  program: Program<Geovm>,
  worldPubkey: PublicKey,
  trixelIds: number[]
): Promise<void> {
  try {
    // Create a set to track unique trixel IDs (avoid duplicates)
    const uniqueTrixelIds = new Set<number>(trixelIds);
    
    // Add all ancestors to the refresh list
    for (const trixelId of trixelIds) {
      const ancestors = getTrixelAncestors(trixelId);
      ancestors.forEach(id => uniqueTrixelIds.add(id));
    }
    
    console.log(`Refreshing data for ${uniqueTrixelIds.size} trixels and world...`);
    
    // Get all trixel PDAs
    const trixelPDAs = await Promise.all(
      Array.from(uniqueTrixelIds).map(async (id) => {
        const [pda] = getTrixelPDA(worldPubkey, id, program.programId);
        return { id, pda };
      })
    );
    
    // Fetch all trixel accounts in parallel
    const trixelFetches = trixelPDAs.map(({ id, pda }) => 
      program.account.trixel.fetchNullable(pda)
        .then(data => {
          if (data) {
            console.log(`Refreshed trixel ${id} data`);
          } else {
            console.log(`Trixel ${id} does not exist`);
          }
          return { id, data };
        })
        .catch(err => {
          console.error(`Error refreshing trixel ${id}:`, err);
          return { id, data: null };
        })
    );
    
    // Fetch world account
    const worldFetch = program.account.world.fetchNullable(worldPubkey)
      .then(data => {
        if (data) {
          console.log(`Refreshed world data`);
        } else {
          console.log(`World does not exist`);
        }
        return { data };
      })
      .catch(err => {
        console.error(`Error refreshing world:`, err);
        return { data: null };
      });
    
    // Wait for all fetches to complete
    const [worldResult, ...trixelResults] = await Promise.all([worldFetch, ...trixelFetches]);
    
    // Summarize the results
    const existingTrixels = trixelResults.filter(r => r.data !== null).length;
    console.log(`Refresh complete: World ${worldResult.data ? 'exists' : 'does not exist'}, ${existingTrixels}/${trixelResults.length} trixels exist`);
  } catch (error) {
    console.error('Error refreshing account data:', error);
  }
}

/**
 * Main function to run the script with command line arguments
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: ts-node import-csv-to-geovm.ts <csv-file-path> <world-name> <canonical-resolution> <data-type> [keypair-path] [batch-size]');
    console.log('  data-type: AggregateOverwrite or MeanOverwrite');
    console.log('  batch-size: Number of transactions to process in parallel (default: 5)');
    process.exit(1);
  }

  const csvFilePath = args[0];
  const worldName = args[1];
  const canonicalResolution = parseInt(args[2], 10);
  const dataType = args[3] as 'AggregateOverwrite' | 'MeanOverwrite';
  const keypairPath = args[4] || path.join(require('os').homedir(), '.config/solana/id.json');
  
  // Optional batch size parameter
  if (args[5]) {
    const customBatchSize = parseInt(args[5], 10);
    if (!isNaN(customBatchSize) && customBatchSize > 0) {
      (global as any).BATCH_SIZE = customBatchSize;
      console.log(`Using custom batch size: ${customBatchSize}`);
    }
  }

  // Validate arguments
  if (isNaN(canonicalResolution) || canonicalResolution < 1 || canonicalResolution > 10) {
    console.error('Error: Canonical resolution must be a number between 1 and 10');
    process.exit(1);
  }

  if (dataType !== 'AggregateOverwrite' && dataType !== 'MeanOverwrite') {
    console.error('Error: Data type must be either AggregateOverwrite or MeanOverwrite');
    process.exit(1);
  }

  // Load wallet from keypair file
  let wallet: Keypair;
  try {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    console.error('Error loading keypair file:', error);
    process.exit(1);
  }

  // Connect to Solana network
  const connection = new Connection('http://api.devnet.solana.com', 'confirmed');
  
  // Process the CSV file
  await processTrixelData(
    csvFilePath,
    worldName,
    canonicalResolution,
    dataType,
    connection,
    wallet,
  );
}

// Run the script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

// Example command:
// yarn start ./sample-data.csv "TestWorld" 1 MeanOverwrite ~/.config/solana/id.json 10

// Add a manual refresh function to the exported module
export async function refreshTrixelsAndWorld(
  connection: Connection,
  programId: PublicKey,
  worldPubkey: PublicKey,
  trixelIds: number[]
): Promise<void> {
  // Create a wallet from a dummy keypair (for provider only)
  const dummyKeypair = Keypair.generate();
  
  // Create a provider for reading data only
  const provider = new AnchorProvider(
    connection as any,
    new anchor.Wallet(dummyKeypair as any),
    { commitment: 'confirmed' }
  );
  
  // Load the IDL file
  let idlFile;
  try {
    const idlPath = path.join(__dirname, '../target/idl/geovm.json');
    idlFile = fs.readFileSync(idlPath, 'utf-8');
  } catch (error) {
    try {
      const idlPath = path.join(__dirname, './target/idl/geovm.json');
      idlFile = fs.readFileSync(idlPath, 'utf-8');
    } catch (fallbackError) {
      throw new Error('Failed to load IDL file');
    }
  }
  
  const idl = JSON.parse(idlFile);
  const program: Program<Geovm> = new Program(idl, provider);
  
  await refreshAccountData(connection, program, worldPubkey, trixelIds);
}
