"use client";

import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { DECIMALS, MARKET_ADDRESS, marketAbi, Outcome, type Market, type Windows } from "./contract";

export { idFromSlug, marketHref, odds, OUTCOME_LABEL, phaseOf, short, statusOf, timeLeft, usdc, type Phase, type Status } from "./market-math";

const H = 3600;
const PROD_WINDOWS: Windows = { resolve: 7 * 24 * H, dispute: 24 * H, arbiter: 3 * 24 * H };
const BASE = 1_793_000_000; // fixed so prerender and hydration agree
const demo = (id: number, question: string, dl: number, yes: string, no: string, outcome = 0): Market => ({
  id,
  question,
  deadline: BASE + dl,
  outcome,
  arbitrated: false,
  arbiter: `0x${"5a".repeat(20)}`,
  resolvedAt: outcome ? BASE + dl + H : 0,
  disputedAt: 0,
  windows: PROD_WINDOWS,
  yesPool: parseUnits(yes, DECIMALS),
  noPool: parseUnits(no, DECIMALS),
  creator: `0x${(id + 1).toString(16).padStart(4, "0")}${"a1".repeat(18)}` as Market["creator"],
});

// ponytail: shown only when NEXT_PUBLIC_MARKET_ADDRESS is unset, so the site demos without a deployment
export const DEMO_MARKETS: Market[] = [
  demo(0, "Will Budi be late to dinner on Friday?", 30 * H, "42", "18"),
  demo(1, "Will Sarah finish the marathon under 4 hours?", 70 * H, "60", "90"),
  demo(2, "Will the group trip actually happen this year?", 140 * H, "25", "110"),
  demo(3, "Will Andre's startup ship v1 before December?", 300 * H, "140", "35"),
  demo(4, "Will Kevin reply to the group chat within an hour?", -20 * H, "30", "50", Outcome.No),
  demo(5, "Will Mira beat everyone at karaoke night?", -60 * H, "80", "20", Outcome.Yes),
  demo(6, "Will Tom keep his gym streak for 30 days?", -90 * H, "15", "45", Outcome.Yes),
];

export function useMarkets() {
  const enabled = !!MARKET_ADDRESS;
  const count = useReadContract({
    address: MARKET_ADDRESS,
    abi: marketAbi,
    functionName: "marketCount",
    query: { enabled },
  });
  const n = Number(count.data ?? 0n);
  const win = useReadContracts({
    contracts: (["RESOLVE_WINDOW", "DISPUTE_WINDOW", "ARBITER_WINDOW"] as const).map((functionName) => ({ address: MARKET_ADDRESS, abi: marketAbi, functionName })),
    query: { enabled, staleTime: Infinity }, // immutable
  });
  const [rw, dw, aw] = (win.data ?? []).map((r) => Number(r.result ?? 0n));
  const windows: Windows = { resolve: rw, dispute: dw, arbiter: aw };
  const reads = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({
      address: MARKET_ADDRESS,
      abi: marketAbi,
      functionName: "getMarket",
      args: [BigInt(i)],
    })),
    query: { enabled: enabled && n > 0 },
  });

  const now = useNow();
  if (!enabled) {
    // demo deadlines stay relative to "now" so the demo never goes stale
    const shift = (now ?? BASE) - BASE;
    const markets = DEMO_MARKETS.map((m) => ({ ...m, deadline: m.deadline + shift, resolvedAt: m.resolvedAt && m.resolvedAt + shift }));
    return { markets, isDemo: true, isLoading: false, refetch: () => {} };
  }

  type Raw = Omit<Market, "id" | "windows" | "deadline" | "resolvedAt" | "disputedAt"> & Record<"deadline" | "resolvedAt" | "disputedAt", bigint>;
  const markets: Market[] = !win.data
    ? []
    : (reads.data ?? []).flatMap((r, id) => {
        if (r.status !== "success") return [];
        const x = r.result as Raw;
        return [{ ...x, id, windows, deadline: Number(x.deadline), resolvedAt: Number(x.resolvedAt), disputedAt: Number(x.disputedAt) }];
      });
  return {
    markets: markets.reverse(),
    isDemo: false,
    isLoading: count.isLoading || reads.isLoading || win.isLoading,
    refetch: () => {
      count.refetch();
      reads.refetch();
    },
  };
}

/** unix seconds; null until mounted so prerender and hydration agree */
export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

