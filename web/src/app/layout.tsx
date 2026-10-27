import type { Metadata } from "next";
import { Geist_Mono, Host_Grotesk, Syne } from "next/font/google";
import { Footer, Nav, Providers } from "@/components/chrome";
import { Motion } from "@/components/motion";
import "lenis/dist/lenis.css";
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
    <html lang="en" className={`${hostGrotesk.variable} ${geistMono.variable} ${syne.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* enable reveal states before first paint; un-hide everything if the app never boots */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.dataset.js="";setTimeout(function(){if(!document.documentElement.dataset.motion)delete document.documentElement.dataset.js},4000)`,
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Motion />
        <Providers>
          <Nav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
