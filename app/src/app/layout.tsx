import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ProgramProvider } from "@/contexts/ProgramContext";
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GeoVM",
  description: "A Solana-based virtual machine for geospatial data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <WalletProvider>
            <ProgramProvider>
              <div suppressHydrationWarning>
                {children}
              </div>
              <Toaster />
            </ProgramProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
