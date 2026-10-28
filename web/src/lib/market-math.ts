import { formatUnits } from "viem";
import { DECIMALS, Outcome, type Market } from "./contract";

export type Status = "open" | "closed" | "settled";
export type Phase = "open" | "awaiting" | "disputable" | "disputed" | "final";

/**
 * Mirrors PredictionMarket.finalOutcome(): which step a market is in, its final outcome
 * (Unresolved until final) and when the current window ends.
 */
export function phaseOf(m: Market, now: number | null): { phase: Phase; final: number; until?: number } {
  const t = now ?? 0;
  const w = m.windows;
  if (t < m.deadline) return { phase: "open", final: Outcome.Unresolved, until: m.deadline };
  if (m.outcome === Outcome.Unresolved) {
    const until = m.deadline + w.resolve; // creator never called it -> void
    return t >= until ? { phase: "final", final: Outcome.Invalid } : { phase: "awaiting", final: Outcome.Unresolved, until };
  }
  if (!m.disputedAt) {
    const until = m.resolvedAt + w.dispute; // nobody disputed in time -> creator's call stands
    return t >= until ? { phase: "final", final: m.outcome } : { phase: "disputable", final: Outcome.Unresolved, until };
  }
  if (m.arbitrated) return { phase: "final", final: m.outcome };
  const until = m.disputedAt + w.arbiter; // arbiter stayed silent -> void
  return t >= until ? { phase: "final", final: Outcome.Invalid } : { phase: "disputed", final: Outcome.Unresolved, until };
}

export function statusOf(m: Market, now: number | null): Status {
  const { phase } = phaseOf(m, now);
  return phase === "open" ? "open" : phase === "final" ? "settled" : "closed";
}

export function odds(m: Market) {
  const total = m.yesPool + m.noPool;
  const yes = total === 0n ? 50 : Number((m.yesPool * 1000n) / total) / 10;
  return { yes, no: Math.round((100 - yes) * 10) / 10, total };
}

/** Token base units -> "1,234.5 USDC". */
export const usdc = (v: bigint) => `${Number(formatUnits(v, DECIMALS)).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;

export function timeLeft(deadline: number, now: number | null) {
  if (now === null) return "—";
  const s = deadline - now;
  if (s <= 0) return "Closed";
  if (s < 60) return "<1m";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const OUTCOME_LABEL = ["Pending", "Yes", "No", "Void"] as const;

/** `/markets/7-will-vani-be-accepted`: the leading number is the onchain id, the words are cosmetic. */
export function marketHref(m: Pick<Market, "id" | "question">) {
  const slug = m.question.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-+|-+$/g, "");
  return `/markets/${m.id}${slug && `-${slug}`}`;
}

/** Market id from a slug segment, or null if it doesn't start with one. */
export const idFromSlug = (slug: string) => {
  const id = /^(\d+)(?:-|$)/.exec(slug)?.[1];
  return id === undefined ? null : Number(id);
};

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
