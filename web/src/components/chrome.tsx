"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect, WagmiProvider } from "wagmi";
import { REPO_URL, wagmiConfig } from "@/lib/contract";
import { short } from "@/lib/markets";
import { d, Split, VideoBg } from "@/components/ui";
import { reveal } from "@/components/motion";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

function WalletButton() {
  const { address, isConnected } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const cls = "border-b border-white pb-px uppercase hover:text-white/70";

  if (isConnected && address)
    return (
      <button className={cls} onClick={() => disconnect.mutate()} title="Disconnect">
        {short(address)}
      </button>
    );
  return (
    <button className={cls} onClick={() => connectors[0] && connect.mutate({ connector: connectors[0] })} disabled={connect.isPending}>
      {connect.isPending ? "Connecting…" : "Connect"}
    </button>
  );
}

const LINKS = [
  ["/#about", "About"],
  ["/markets", "Markets"],
  ["/#how", "How it works"],
  ["/#callers", "Top callers"],
  ["/create", "Create"],
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header ref={reveal} className="rv fixed inset-x-0 top-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="wrap flex h-[62px] items-center justify-between text-[14px] uppercase">
        <Link href="/" className="wordmark text-[18px] tracking-[0.02em]">
          Saidso
        </Link>
        <nav className="hidden items-center gap-[30px] md:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-white/60">
              {label}
            </Link>
          ))}
          <span className="h-[22px] w-px bg-white/30" aria-hidden />
          <WalletButton />
        </nav>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Close" : "Menu +"}
        </button>
      </div>
      {open && (
        <nav className="wrap flex flex-col gap-4 border-t border-line py-6 text-[14px] uppercase md:hidden">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <WalletButton />
        </nav>
      )}
    </header>
  );
}

/** Giant wordmark + bracketed tagline. Animates when an ancestor `.rv` reveals. */
export function Wordmark({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 lg:flex-nowrap" style={d(delay)}>
      <span className="wordmark text-[clamp(56px,8vw,118px)]" aria-label="Saidso">
        <Split text="Saidso" by="char" step={60} />
      </span>
      <span className="dash hidden h-[5px] w-[100px] shrink-0 bg-white lg:block" aria-hidden />
      <span className="flex min-w-0 flex-1 basis-full items-center justify-between gap-4 lg:basis-auto">
        <span className="paren-l text-[clamp(48px,7vw,96px)] font-extralight leading-none" aria-hidden>
          (
        </span>
        <span className="display text-center text-[clamp(20px,2.4vw,34px)]" style={d(delay + 500)}>
          <Split text="Your friends' wildest takes," />
          <br />
          <Split text="settled onchain" />
        </span>
        <span className="paren-r text-[clamp(48px,7vw,96px)] font-extralight leading-none" aria-hidden>
          )
        </span>
      </span>
    </div>
  );
}

const FOOT = [
  [["/#about", "About"], ["/markets", "Markets"], ["/create", "Create market"], ["/#how", "How it works"]],
  [["/#callers", "Top callers"], ["/#settled", "Recently settled"], ["/#stats", "Stats"], ["/markets?f=open", "Open now"]],
  [["https://book.getfoundry.sh", "Foundry"], ["https://wagmi.sh", "wagmi"], ["https://viem.sh", "viem"], ["https://base.org", "Base"]],
  [[REPO_URL, "GitHub"], ["https://x.com", "X"], ["https://warpcast.com", "Farcaster"], ["https://sepolia.basescan.org", "Basescan"]],
] as const;

export function Footer() {
  return (
    <footer ref={reveal} className="rv relative isolate mt-auto overflow-hidden">
      <VideoBg />
      <div className="wrap pb-12 pt-20">
        <Wordmark />
        <div className="mt-14 grid grid-cols-2 gap-10 text-[14px] uppercase md:grid-cols-4">
          {FOOT.map((col, i) => (
            <ul key={i} className="space-y-2.5">
              <li className="mb-5 text-[18px] leading-none" aria-hidden>
                +
              </li>
              {col.map(([href, label]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white/60">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <div className="mt-24 flex flex-wrap justify-between gap-4 text-[14px] uppercase text-white/70">
          <span>© Saidso. Testnet only — not financial advice.</span>
          <span>Built with Solidity + Foundry</span>
        </div>
      </div>
    </footer>
  );
}
