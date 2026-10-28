"use client";

import { DemoNotice } from "@/components/markets-table";
import { ArrowButton, Frame, Label } from "@/components/ui";
import { Avatar } from "@/components/visuals";
import { CHAIN } from "@/lib/contract";
import { type Caller, useLeaderboard } from "@/lib/leaderboard";
import { short, usdc } from "@/lib/markets";

/** "+12.5 USDC" / "−3 USDC" */
export const signed = (v: bigint) => `${v < 0n ? "−" : "+"}${usdc(v < 0n ? -v : v)}`;
export const record = (c: Caller) => (c.calls ? `${c.correct}/${c.calls} correct` : "No settled calls yet");

export function LeaderboardTable() {
  const { callers, isDemo, isLoading, isError } = useLeaderboard();
  const explorer = CHAIN.blockExplorers?.default.url;

  return (
    <main className="wrap pb-32 pt-36">
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <Label>Top callers</Label>
        <div>
          <h1 className="display text-[clamp(30px,3.4vw,48px)]">Who actually called it.</h1>
          <p className="mt-5 max-w-[560px] text-[16px] leading-[1.5] text-white/70">
            Net profit on settled markets, from every bet ever placed onchain. Unclaimed winnings count; voided markets don&apos;t.
          </p>
          {isDemo && <DemoNotice />}
        </div>
      </div>

      <Frame className="mt-16">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead className="text-[12px] uppercase text-white/55">
            <tr className="border-b border-line">
              <th className="px-3 py-4 font-normal sm:px-5">#</th>
              <th className="px-3 py-4 font-normal sm:px-5">Caller</th>
              <th className="px-3 py-4 text-right font-normal sm:px-5">Profit</th>
              <th className="hidden px-3 py-4 font-normal sm:table-cell sm:px-5">Record</th>
              <th className="hidden px-3 py-4 text-right font-normal md:table-cell md:px-5">Staked</th>
            </tr>
          </thead>
          <tbody>
            {callers.map((c, i) => (
              <tr key={c.address} className="border-b border-line last:border-0">
                <td className="px-3 py-5 text-white/55 sm:px-5">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-3 py-5 sm:px-5">
                  <span className="flex items-center gap-3">
                    <Avatar seed={c.address} className="size-8 shrink-0" />
                    {explorer && !isDemo ? (
                      <a href={`${explorer}/address/${c.address}`} target="_blank" rel="noreferrer" className="hover:text-white/70">
                        {short(c.address)}
                      </a>
                    ) : (
                      short(c.address)
                    )}
                  </span>
                </td>
                <td className={`whitespace-nowrap px-3 py-5 text-right sm:px-5 ${c.profit > 0n ? "text-yes" : c.profit < 0n ? "text-no" : ""}`}>{signed(c.profit)}</td>
                <td className="hidden px-3 py-5 uppercase text-white/70 sm:table-cell sm:px-5">{record(c)}</td>
                <td className="hidden whitespace-nowrap px-3 py-5 text-right md:table-cell md:px-5">{usdc(c.volume)}</td>
              </tr>
            ))}
            {callers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-white/55">
                  {isError ? "Couldn't load bets from the indexer. Try again in a minute." : isLoading ? "Reading bets from the chain…" : "No bets yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Frame>
      <ArrowButton href="/markets" className="mt-10">
        Make your call
      </ArrowButton>
    </main>
  );
}
