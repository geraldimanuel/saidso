import { parseAbi, type Address } from "viem";
import { createConfig, http, injected } from "wagmi";
import { baseSepolia, foundry } from "wagmi/chains";

export const MARKET_ADDRESS = process.env.NEXT_PUBLIC_MARKET_ADDRESS as Address | undefined;
export const CHAIN = process.env.NEXT_PUBLIC_CHAIN === "anvil" ? foundry : baseSepolia;

// First block to scan for events, per deployment (receipts in contracts/broadcast/Deploy.s.sol/<chain>/).
const DEPLOY_BLOCKS: Record<string, bigint> = {
  "0xa1c736e608b9a3afb2f28a2fc1a9c13083cf070f": 51_071_527n, // v3, Base Sepolia
};
export const DEPLOY_BLOCK = (MARKET_ADDRESS && DEPLOY_BLOCKS[MARKET_ADDRESS.toLowerCase()]) ?? 0n;

export const marketAbi = parseAbi([
  "struct Market { address creator; uint64 deadline; uint8 outcome; bool arbitrated; address arbiter; uint64 resolvedAt; uint64 disputedAt; uint256 yesPool; uint256 noPool; string question; }",
  "function marketCount() view returns (uint256)",
  "function getMarket(uint256 id) view returns (Market)",
  "function yesStake(uint256 id, address user) view returns (uint256)",
  "function noStake(uint256 id, address user) view returns (uint256)",
  "function claimed(uint256 id, address user) view returns (bool)",
  "function RESOLVE_WINDOW() view returns (uint64)",
  "function DISPUTE_WINDOW() view returns (uint64)",
  "function ARBITER_WINDOW() view returns (uint64)",
  "function createMarket(string question, uint64 deadline, address arbiter) returns (uint256)",
  "function bet(uint256 id, bool yes, uint256 amount)",
  "function token() view returns (address)",
  "function resolve(uint256 id, uint8 outcome)",
  "function dispute(uint256 id)",
  "function arbitrate(uint256 id, uint8 outcome)",
  "function claim(uint256 id) returns (uint256)",
  "event BetPlaced(uint256 indexed id, address indexed bettor, bool yes, uint256 amount)",
]);

export const wagmiConfig = createConfig({
  chains: [CHAIN],
  connectors: [injected()],
  transports: { [CHAIN.id]: http() } as Record<typeof CHAIN.id, ReturnType<typeof http>>,
  ssr: true,
});

/** Bets are in USDC (6 decimals). ponytail: hardcoded; read token.decimals() if markets ever take other tokens. */
export const DECIMALS = 6;

export const Outcome = { Unresolved: 0, Yes: 1, No: 2, Invalid: 3 } as const;

/** Seconds the creator / bettors / arbiter get after each step. Set per deployment, read from the contract. */
export type Windows = { resolve: number; dispute: number; arbiter: number };

export type Market = {
  id: number;
  creator: Address;
  arbiter: Address;
  deadline: number; // unix seconds
  outcome: number; // creator's call, or the arbiter's once arbitrated
  arbitrated: boolean;
  resolvedAt: number; // 0 = not resolved
  disputedAt: number; // 0 = not disputed
  yesPool: bigint;
  noPool: bigint;
  question: string;
  windows: Windows;
};

export const REPO_URL = "https://github.com/geraldimanuel/saidso";
