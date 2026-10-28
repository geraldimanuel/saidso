"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { foundry } from "wagmi/chains";
import type { BetJson } from "@/app/api/bets/route";
import { CHAIN, MARKET_ADDRESS, marketAbi, Outcome } from "./contract";
import { phaseOf, useMarkets, useNow } from "./markets";

type Bet = { id: number; bettor: Address; yes: boolean; amount: bigint };

export type Caller = { address: Address; profit: bigint; volume: bigint; calls: number; correct: number };

/**
 * Every BetPlaced since deploy. Anvil: straight from the node. Elsewhere: our /api/bets route,
 * which reads Blockscout's indexer once and caches it for everyone (see that file for why).
 * ponytail: all bets are refetched each time; past a few thousand, move to an indexer (Ponder).
 */
async function fetchBets(client: PublicClient): Promise<Bet[]> {
  if (CHAIN.id === foundry.id) {
    const logs = await client.getContractEvents({ address: MARKET_ADDRESS!, abi: marketAbi, eventName: "BetPlaced", fromBlock: 0n });
    return logs.map(({ args }) => ({ id: Number(args.id), bettor: args.bettor!, yes: args.yes!, amount: args.amount! }));
  }
  const res = await fetch("/api/bets");
  if (!res.ok) throw new Error(`bets ${res.status}`);
  return ((await res.json()) as BetJson[]).map((b) => ({ ...b, amount: BigInt(b.amount) }));
}

/** Callers ranked by net profit on final markets, using the contract's own payout formula (unclaimed wins count). */
export function useLeaderboard() {
  const client = usePublicClient();
  const { markets, isDemo } = useMarkets();
  const now = useNow();
  const bets = useQuery({
    queryKey: ["bets", MARKET_ADDRESS],
    queryFn: () => fetchBets(client!),
    enabled: !!MARKET_ADDRESS && !!client,
    staleTime: 60_000,
    retry: 1, // a rate-limited indexer won't recover in seconds; show the error instead of hammering it
  });

  if (isDemo) return { callers: DEMO_CALLERS, isDemo, isLoading: false, isError: false };

  // stakes[marketId][bettor] = [yes, no]
  const stakes = new Map<number, Map<Address, [bigint, bigint]>>();
  const callers = new Map<Address, Caller>();
  const caller = (a: Address) => callers.get(a) ?? callers.set(a, { address: a, profit: 0n, volume: 0n, calls: 0, correct: 0 }).get(a)!;
  for (const b of bets.data ?? []) {
    const byBettor = stakes.get(b.id) ?? stakes.set(b.id, new Map()).get(b.id)!;
    const s = byBettor.get(b.bettor) ?? [0n, 0n];
    byBettor.set(b.bettor, b.yes ? [s[0] + b.amount, s[1]] : [s[0], s[1] + b.amount]);
    caller(b.bettor).volume += b.amount;
  }

  for (const m of markets) {
    const { final } = phaseOf(m, now);
    if (final === Outcome.Unresolved || final === Outcome.Invalid) continue; // voids refund everyone: no win, no loss
    const winPool = final === Outcome.Yes ? m.yesPool : m.noPool;
    if (winPool === 0n) continue; // nobody on the winning side: refunds again
    for (const [address, [yes, no]] of stakes.get(m.id) ?? []) {
      const won = final === Outcome.Yes ? yes : no;
      const c = caller(address);
      c.profit += (won * (m.yesPool + m.noPool)) / winPool - (yes + no); // same math as claim()
      c.calls += 1;
      if (won > 0n) c.correct += 1;
    }
  }

  const ranked = [...callers.values()].sort((a, b) => (b.profit === a.profit ? Number(b.volume - a.volume) : b.profit > a.profit ? 1 : -1));
  return { callers: ranked, isDemo, isLoading: bets.isLoading, isError: bets.isError };
}

const demo = (address: string, profit: number, calls: number, correct: number): Caller => ({
  address: address as Address,
  profit: BigInt(profit * 1e6),
  volume: BigInt(calls * 25e6),
  calls,
  correct,
});

// ponytail: shown only when NEXT_PUBLIC_MARKET_ADDRESS is unset, like DEMO_MARKETS
const DEMO_CALLERS: Caller[] = [
  demo("0x8f3a6c1e0b7d4a92e15f3b8c7d6e5f4a3b2c21cd", 184, 14, 11),
  demo("0x1b77e2d9c4a8f0b3e6d1c5a7f9e2b4d6c8a09e04", 141, 21, 16),
  demo("0xc04e9a3b7d1f5c8e2a6b4d0f9c3e7a5b1d8f7a11", 96, 9, 6),
  demo("0x5d2f8b4e1a7c3d9f6b0e2a8c5d1f7b3e9a4cb3e8", 57, 16, 11),
];
