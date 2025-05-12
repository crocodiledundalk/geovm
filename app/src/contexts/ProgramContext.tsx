'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import idlJson from '@/idl/geovm.json';
import { Geovm } from '@/idl/geovm';

export const PROGRAM_ID = idlJson.address;

interface ProgramContextType {
  program: Program<Geovm> | null;
  provider: AnchorProvider | null;
}

const ProgramContext = createContext<ProgramContextType>({
  program: null,
  provider: null,
});

export function GeoVmProgramProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet || !connection) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    
    if (!idlJson.address) {
        console.error("Program address not found in IDL!");
        return null;
    }

    try {
      return new Program(idlJson as Idl, provider) as Program<Geovm>;
    } catch (e) {
      console.error("Failed to create Program instance:", e);
      return null;
    }
  }, [provider]);

  return (
    <ProgramContext.Provider value={{ program, provider }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useGeoVmProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useGeoVmProgram must be used within a GeoVmProgramProvider');
  }
  return context;
}
