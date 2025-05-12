// 'use client';

// import { useQuery } from '@tanstack/react-query';
// import { useProgram } from '@/contexts/ProgramContext';
// import { PublicKey, ParsedTransactionWithMeta, ParsedInstruction, ConfirmedSignatureInfo } from '@solana/web3.js';
// import { Program, utils as anchorUtils } from '@coral-xyz/anchor';
// import { Geovm } from '@/idl/geovm';

// interface DecodedAnchorInstruction {
//   name: string;
//   data: any;
// }

// interface EnrichedParsedInstruction {
//   programId: PublicKey;
//   accounts?: PublicKey[];
//   data?: string | Buffer | object;
//   decodedAnchorData?: DecodedAnchorInstruction;
// }

// export interface EnrichedTransaction {
//   signature: string;
//   blockTime?: number | null;
//   meta?: ParsedTransactionWithMeta["meta"];
//   instructions: EnrichedParsedInstruction[];
//   rawTransaction: ParsedTransactionWithMeta;
// }

// async function fetchWorldTransactions(
//   program: Program<Geovm> | null,
//   provider: ReturnType<typeof useProgram>['provider'],
//   worldPubkey: PublicKey | null
// ): Promise<EnrichedTransaction[]> {
//   if (!provider || !program || !worldPubkey) {
//     return [];
//   }

//   try {
//     const signatures = await provider.connection.getSignaturesForAddress(worldPubkey, { limit: 25 });
//     if (!signatures || signatures.length === 0) {
//       return [];
//     }

//     const enrichedTransactions: EnrichedTransaction[] = [];

//     for (const sigInfo of signatures) {
//       const parsedTx = await provider.connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
      
//       if (parsedTx && parsedTx.transaction) {
//         const enrichedInstructions: EnrichedParsedInstruction[] = [];
        
//         const messageInstructions = Array.isArray(parsedTx.transaction.message.instructions) 
//             ? parsedTx.transaction.message.instructions 
//             : [parsedTx.transaction.message.instructions];

//         for (const instruction of messageInstructions) {
//           const pInstruction = instruction as ParsedInstruction;
          
//           const currentAccounts = 'accounts' in pInstruction ? pInstruction.accounts : undefined;
//           const currentData = 'data' in pInstruction ? (pInstruction as any).data : undefined;

//           let enrichedSingleInstruction: EnrichedParsedInstruction = {
//             programId: pInstruction.programId,
//             ...(currentAccounts && { accounts: currentAccounts }),
//             ...(currentData && { data: currentData }),
//           };

//           if (pInstruction.programId.equals(program.programId)) {
//             try {
//               const rawInstructionData = currentData;
//               if (typeof rawInstructionData === 'string') {
//                 const instructionBuffer = anchorUtils.bytes.bs58.decode(rawInstructionData);
//                 const decodedData = program.coder.instruction.decode(instructionBuffer); 
                
//                 if (decodedData) {
//                   enrichedSingleInstruction.decodedAnchorData = {
//                     name: decodedData.name,
//                     data: decodedData.data,
//                   };
//                 }
//               }
//             } catch (e) {
//               // console.warn(`Failed to decode Anchor instruction for program ${program.programId.toBase58()}:`, e);
//             }
//           }
//           enrichedInstructions.push(enrichedSingleInstruction);
//         }

//         enrichedTransactions.push({
//           signature: sigInfo.signature,
//           blockTime: sigInfo.blockTime,
//           meta: parsedTx.meta || undefined,
//           instructions: enrichedInstructions,
//           rawTransaction: parsedTx,
//         });
//       }
//     }
//     return enrichedTransactions.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));
//   } catch (error) {
//     console.error("Error fetching world transactions:", error);
//     throw error;
//   }
// }

// export function useWorldTransactions(worldPubkey: PublicKey | null) {
//   const { program, provider } = useProgram();

//   return useQuery<EnrichedTransaction[], Error>(
//     ['worldTransactions', worldPubkey?.toBase58()],
//     () => fetchWorldTransactions(program, provider, worldPubkey),
//     {
//       enabled: !!program && !!provider && !!worldPubkey,
//       refetchOnWindowFocus: false,
//     }
//   );
// } 