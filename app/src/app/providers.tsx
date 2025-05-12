'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'; // Add other wallets if needed
import { clusterApiUrl } from '@solana/web3.js';
import React, { useMemo } from 'react';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProviders({ children }: { children: React.ReactNode }) {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    // Or, you can provide a custom RPC endpoint.
    const network = WalletAdapterNetwork.Devnet; // Or your desired network
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            // Add other wallet adapters here (e.g., SolflareWalletAdapter)
        ],
        [] // Removed 'network' dependency based on lint warning
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
} 