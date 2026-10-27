"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowButton, Frame, Label, OddsBar } from "@/components/ui";
import { eth, marketHref, odds, OUTCOME_LABEL, statusOf, timeLeft, useMarkets, useNow, type Status } from "@/lib/markets";

const FILTERS = ["all", "open", "closed", "settled"] as const;
type Filter = (typeof FILTERS)[number];

export function DemoNotice() {
  return (
    <p className="mt-6 border border-dashed border-white/30 px-4 py-3 text-[13px] text-white/70">
      Demo data. Deploy the contract and set <code className="text-white">NEXT_PUBLIC_MARKET_ADDRESS</code> to go live.
    </p>
  );
}

export function StatusTag({ status, outcome }: { status: Status; outcome: number }) {
  const text = status === "settled" ? OUTCOME_LABEL[outcome] : status;
  const color = status === "open" ? "text-yes" : status === "settled" ? "text-white" : "text-white/50";
  return <span className={`whitespace-nowrap text-[13px] uppercase ${color}`}>[ {text} ]</span>;
}

export function MarketsTable() {
  const initial = useSearchParams().get("f") as Filter | null;
  const [filter, setFilter] = useState<Filter>(FILTERS.includes(initial as Filter) ? initial! : "all");
  const { markets, isDemo, isLoading } = useMarkets();
  const now = useNow();
  const rows = markets.filter((m) => filter === "all" || statusOf(m, now) === filter);

  return (
    <main className="wrap pb-32 pt-36">
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <Label>All markets</Label>
        <div>
          <h1 className="display text-[clamp(30px,3.4vw,48px)]">Every call, every pot, every argument settled.</h1>
          {isDemo && <DemoNotice />}
        </div>
      </div>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-6">
        <div className="flex gap-6 text-[14px] uppercase" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={filter === f ? "text-white" : "text-white/45 hover:text-white/80"}
            >
              {filter === f ? `[ ${f} ]` : f}
            </button>
          ))}
        </div>
        <ArrowButton href="/create">New market</ArrowButton>
      </div>

      <Frame className="mt-8">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead className="text-[12px] uppercase text-white/55">
            <tr className="border-b border-line">
              <th className="hidden px-3 py-4 font-normal sm:table-cell sm:px-5">#</th>
              <th className="px-3 py-4 sm:px-5 font-normal">Question</th>
              <th className="hidden px-3 py-4 sm:px-5 font-normal md:table-cell">Closes</th>
              <th className="hidden w-[220px] px-3 py-4 sm:px-5 font-normal lg:table-cell">Odds</th>
              <th className="hidden px-3 py-4 sm:px-5 font-normal sm:table-cell">Pot</th>
              <th className="px-3 py-4 sm:px-5 font-normal">Status</th>
              <th className="px-3 py-4 sm:px-5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const o = odds(m);
              return (
                <tr key={m.id} className="group relative border-b border-line last:border-0 hover:bg-white/[0.04]">
                  <td className="hidden px-3 py-6 text-white/55 sm:table-cell sm:px-5">{String(m.id).padStart(2, "0")}</td>
                  <td className="px-3 py-6 sm:px-5">
                    <Link href={marketHref(m)} className="display text-[18px] leading-[1.25] after:absolute after:inset-0">
                      {m.question}
                    </Link>
                  </td>
                  <td className="hidden px-3 py-6 sm:px-5 uppercase md:table-cell">{timeLeft(m.deadline, now)}</td>
                  <td className="hidden px-3 py-6 sm:px-5 lg:table-cell">
                    <OddsBar yes={o.yes} />
                    <p className="mt-2 flex justify-between text-[12px]">
                      <span>Yes {o.yes}%</span>
                      <span>No {o.no}%</span>
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-6 sm:px-5 sm:table-cell">{eth(o.total)}</td>
                  <td className="px-3 py-6 sm:px-5">
                    <StatusTag status={statusOf(m, now)} outcome={m.outcome} />
                  </td>
                  <td className="px-3 py-6 sm:px-5 text-right transition-transform group-hover:translate-x-1" aria-hidden>
                    →
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-white/55">
                  {isLoading ? "Loading markets…" : "Nothing here yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Frame>
    </main>
  );
}
