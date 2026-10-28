import { decodeEventLog, toEventSelector, type Hex } from "viem";
import { DEPLOY_BLOCK, MARKET_ADDRESS, marketAbi } from "@/lib/contract";

type RawLog = { data: Hex; topics: (Hex | null)[]; blockNumber: Hex; transactionHash: Hex; logIndex: Hex };
export type BetJson = { id: number; bettor: Hex; yes: boolean; amount: string };

const BLOCKSCOUT = "https://base-sepolia.blockscout.com/api";
const BET_PLACED = toEventSelector("BetPlaced(uint256,address,bool,uint256)");

/**
 * Every BetPlaced since deploy, fetched once on the server and cached at Vercel's edge, so all
 * visitors share one Blockscout call (its keyless API allows ~10 requests per IP per window).
 * Base's public RPC is no help here: it caps eth_getLogs at 200 blocks (~7 min).
 */
export async function GET() {
  if (!MARKET_ADDRESS) return Response.json([]);
  const key = process.env.BLOCKSCOUT_API_KEY; // optional, server-only: raises the rate limit
  const bets = new Map<string, BetJson>();
  let from = DEPLOY_BLOCK;
  for (;;) {
    const url = `${BLOCKSCOUT}?module=logs&action=getLogs&address=${MARKET_ADDRESS}&topic0=${BET_PLACED}&fromBlock=${from}&toBlock=latest${key ? `&apikey=${key}` : ""}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) }); // a hung indexer must not hang the page
    // errors are never cached, so the next visitor retries instead of seeing a stale failure
    if (!res.ok) return Response.json({ error: `indexer ${res.status}` }, { status: 502, headers: { "Cache-Control": "no-store" } });
    const page: RawLog[] = (await res.json()).result ?? [];
    for (const l of page) {
      const { args } = decodeEventLog({ abi: marketAbi, eventName: "BetPlaced", data: l.data, topics: l.topics.filter(Boolean) as [Hex, ...Hex[]] });
      bets.set(l.transactionHash + l.logIndex, { id: Number(args.id), bettor: args.bettor, yes: args.yes, amount: args.amount.toString() });
    }
    // Blockscout pages at 1,000 logs: restart from the last block seen; the Map drops the overlap
    if (page.length < 1000) break;
    from = BigInt(page[page.length - 1].blockNumber);
  }
  return Response.json([...bets.values()], {
    // fresh for 60 s, then served stale for up to 5 min while one request refreshes it in the background
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
