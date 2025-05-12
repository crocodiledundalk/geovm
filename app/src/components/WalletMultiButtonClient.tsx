'use client';

import dynamic from 'next/dynamic';
import { FC } from 'react';
import { cn } from '@/lib/utils';

// Dynamically import WalletMultiButton to avoid SSR issues
const WalletMultiButtonDynamic = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then(
      (m) => m.WalletMultiButton
    ),
  { ssr: false }
);

const WalletMultiButtonClient: FC = () => (
  <div className={cn("wallet-adapter-button-container")}>
    <style jsx global>{`
      /* Override wallet adapter default styles to match our design */
      .wallet-adapter-button {
        background-color: #6b46c1 !important; /* Purple color */
        border-radius: 0.375rem !important; /* rounded-md */
        padding: 0.5rem 1rem !important;
        height: auto !important;
        color: white !important;
        font-family: inherit !important;
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: background-color 0.2s ease-in-out !important;
      }
      
      .wallet-adapter-button:hover {
        background-color: #5a32a3 !important; /* Darker purple on hover */
      }
      
      .wallet-adapter-button-start-icon {
        margin-right: 0.5rem !important;
      }
    `}</style>
    <WalletMultiButtonDynamic />
  </div>
);

export default WalletMultiButtonClient; 