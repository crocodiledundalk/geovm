'use client';

import { createContext, useContext, useMemo } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, Idl } from '@coral-xyz/anchor';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import idl from '@/idl/geovm.json';
import { Geovm } from '@/idl/geovm';

interface ProgramContextType {
  program: Program<Geovm> | null;
  provider: AnchorProvider | null;
}

const ProgramContext = createContext<ProgramContextType>({
  program: null,
  provider: null,
});

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    
    return new Program(
      idl as Idl,
      provider
    ) as Program<Geovm>;
  }, [provider]);

  return (
    <ProgramContext.Provider value={{ program, provider }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within a ProgramProvider');
  }
  return context;
} 