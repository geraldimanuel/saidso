import { parseAbi, type Address } from "viem";
import { createConfig, http, injected } from "wagmi";
import { baseSepolia, foundry } from "wagmi/chains";

export const MARKET_ADDRESS = process.env.NEXT_PUBLIC_MARKET_ADDRESS as Address | undefined;
export const CHAIN = process.env.NEXT_PUBLIC_CHAIN === "anvil" ? foundry : baseSepolia;

export const marketAbi = parseAbi([
  "struct Market { address creator; uint64 deadline; uint8 outcome; uint256 yesPool; uint256 noPool; string question; }",
  "function marketCount() view returns (uint256)",
  "function getMarket(uint256 id) view returns (Market)",
  "function yesStake(uint256 id, address user) view returns (uint256)",
  "function noStake(uint256 id, address user) view returns (uint256)",
  "function claimed(uint256 id, address user) view returns (bool)",
  "function createMarket(string question, uint64 deadline) returns (uint256)",
  "function bet(uint256 id, bool yes, uint256 amount)",
  "function token() view returns (address)",
  "function resolve(uint256 id, uint8 outcome)",
  "function claim(uint256 id) returns (uint256)",
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

export type Market = {
  id: number;
  creator: Address;
  deadline: number; // unix seconds
  outcome: number;
  yesPool: bigint;
  noPool: bigint;
  question: string;
};

export const REPO_URL = "https://github.com/geraldimanuel/saidso";
