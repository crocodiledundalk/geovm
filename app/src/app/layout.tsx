import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
        <Providers>
          <div suppressHydrationWarning>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
