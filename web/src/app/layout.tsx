import type { Metadata } from "next";
import { Geist_Mono, Host_Grotesk, Syne } from "next/font/google";
import { Footer, Nav, Providers } from "@/components/chrome";
import "./globals.css";

const hostGrotesk = Host_Grotesk({ variable: "--font-host-grotesk", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["700"] });

export const metadata: Metadata = {
  title: "Saidso — friend-group prediction markets",
  description: "Bet ETH with friends on yes/no questions. Creator resolves, winners split the pot. Onchain on Base.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hostGrotesk.variable} ${geistMono.variable} ${syne.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <Nav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
