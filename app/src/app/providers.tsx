'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'; // Add other wallets if needed
import { clusterApiUrl } from '@solana/web3.js';
import React, { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export function AppProviders({ children }: { children: React.ReactNode }) {
    // React Query client setup
    const [queryClient] = useState(() => new QueryClient());

    // Solana Wallet setup
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
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>
                        {children}
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </QueryClientProvider>
    );
} 