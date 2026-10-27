"use client";

import { use, useState } from "react";
import { parseEther } from "viem";
import { useConnection, useReadContracts } from "wagmi";
import { DemoNotice, StatusTag } from "@/components/markets-table";
import { ArrowButton, Frame, Label, OddsBar } from "@/components/ui";
import { MARKET_ADDRESS, marketAbi, Outcome, type Market } from "@/lib/contract";
import { eth, odds, short, statusOf, timeLeft, useMarkets, useNow } from "@/lib/markets";
import { useTx } from "@/lib/tx";

export function MarketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { markets, isDemo, isLoading } = useMarkets();
  const now = useNow();
  const m = markets.find((x) => x.id === Number(id));

  if (!m)
    return (
      <main className="wrap pb-32 pt-40">
        <Label>Market #{id}</Label>
        <p className="display mt-6 text-[32px]">{isLoading ? "Loading…" : "Market not found."}</p>
        <ArrowButton href="/markets" className="mt-10">
          All markets
        </ArrowButton>
      </main>
    );

  const o = odds(m);
  const status = statusOf(m, now);
  const facts = [
    ["Pot", eth(o.total)],
    ["Yes pool", eth(m.yesPool)],
    ["No pool", eth(m.noPool)],
    [status === "open" ? "Closes in" : "Closed", status === "open" ? timeLeft(m.deadline, now) : new Date(m.deadline * 1000).toLocaleDateString()],
    ["Creator", short(m.creator)],
    ["Market", `#${String(m.id).padStart(2, "0")}`],
  ];

  return (
    <main className="wrap pb-32 pt-36">
      <div className="flex flex-wrap items-center gap-4">
        <Label>Market #{String(m.id).padStart(2, "0")}</Label>
        <StatusTag status={status} outcome={m.outcome} />
      </div>
      <h1 className="display mt-6 max-w-[1000px] text-[clamp(32px,4vw,58px)]">{m.question}</h1>
      {isDemo && <DemoNotice />}

      <div className="mt-16 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <Frame className="p-[clamp(20px,2.8vw,40px)]">
          <div className="flex items-end justify-between">
            <p>
              <span className="wordmark text-[clamp(48px,6vw,84px)] text-yes">{o.yes}%</span>
              <span className="ml-3 text-[14px] uppercase">[ Yes ]</span>
            </p>
            <p className="text-right">
              <span className="text-[14px] uppercase">[ No ]</span>
              <span className="wordmark ml-3 text-[clamp(32px,3.5vw,48px)] text-no">{o.no}%</span>
            </p>
          </div>
          <OddsBar yes={o.yes} className="mt-6 h-2" />
          <dl className="mt-12 grid grid-cols-2 border-t border-line sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="border-b border-line py-5 pr-4">
                <dt className="text-[12px] uppercase text-white/55">{k}</dt>
                <dd className="mt-2 text-[16px]">{v}</dd>
              </div>
            ))}
          </dl>
        </Frame>

        <Frame className="p-[clamp(20px,2.8vw,40px)]">
          {isDemo ? (
            <BetPanel m={m} disabled />
          ) : status === "open" ? (
            <BetPanel m={m} />
          ) : (
            <SettlePanel m={m} status={status} />
          )}
        </Frame>
      </div>
    </main>
  );
}

function BetPanel({ m, disabled = false }: { m: Market; disabled?: boolean }) {
  const [yes, setYes] = useState(true);
  const [amount, setAmount] = useState("0.01");
  const { isConnected } = useConnection();
  const tx = useTx();
  let value: bigint | null = null;
  try {
    value = parseEther(amount);
  } catch {}
  const o = odds(m);
  // what you'd get back if your side wins and nobody else bets
  const side = yes ? m.yesPool : m.noPool;
  const est = value && value > 0n ? (value * (o.total + value)) / (side + value) : 0n;

  return (
    <div>
      <Label>Place your call</Label>
      <div className="mt-6 grid grid-cols-2 border border-line" role="radiogroup">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            role="radio"
            aria-checked={yes === v}
            onClick={() => setYes(v)}
            className={`display py-5 text-[22px] transition-colors ${v ? "" : "border-l border-line"} ${
              yes === v ? (v ? "bg-yes text-black" : "bg-no text-black") : "hover:bg-white/5"
            }`}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
      <label className="mt-6 block text-[12px] uppercase text-white/55" htmlFor="amount">
        Amount (ETH)
      </label>
      <input id="amount" className="input mt-2" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <p className="mt-3 text-[13px] text-white/60">Win now → ~{eth(est)} back</p>
      <ArrowButton
        className="mt-8"
        disabled={disabled || !isConnected || !value || tx.busy}
        onClick={() =>
          MARKET_ADDRESS && value && tx.send({ address: MARKET_ADDRESS, abi: marketAbi, functionName: "bet", args: [BigInt(m.id), yes], value })
        }
      >
        {!isConnected && !disabled ? "Connect wallet first" : `Bet ${yes ? "Yes" : "No"}`}
      </ArrowButton>
      {tx.status && <p className={`mt-4 text-[13px] ${tx.isError ? "text-no" : "text-white/70"}`}>{tx.status}</p>}
    </div>
  );
}

function SettlePanel({ m, status }: { m: Market; status: "closed" | "settled" }) {
  const { address } = useConnection();
  const tx = useTx();
  const me = useReadContracts({
    contracts: (["yesStake", "noStake", "claimed"] as const).map((functionName) => ({
      address: MARKET_ADDRESS,
      abi: marketAbi,
      functionName,
      args: [BigInt(m.id), address!],
    })),
    query: { enabled: !!address },
  });
  const [yesStake, noStake, claimed] = (me.data ?? []).map((r) => r.result) as [bigint?, bigint?, boolean?];
  const isCreator = address?.toLowerCase() === m.creator.toLowerCase();
  const call = (functionName: "resolve" | "claim", args: readonly [bigint] | readonly [bigint, number]) =>
    MARKET_ADDRESS && tx.send({ address: MARKET_ADDRESS, abi: marketAbi, functionName, args } as Parameters<typeof tx.send>[0]);

  return (
    <div>
      <Label>{status === "closed" ? "Awaiting result" : "Settled"}</Label>
      {address && (
        <p className="mt-6 text-[14px]">
          Your stake: {eth(yesStake ?? 0n)} on Yes · {eth(noStake ?? 0n)} on No
        </p>
      )}

      {status === "closed" &&
        (isCreator ? (
          <div className="mt-8 space-y-3">
            <p className="text-[13px] text-white/60">You created this market. Call the result:</p>
            {(
              [
                ["Yes", Outcome.Yes],
                ["No", Outcome.No],
                ["Void (refund all)", Outcome.Invalid],
              ] as const
            ).map(([label, outcome]) => (
              <ArrowButton key={label} className="w-full justify-between" disabled={tx.busy} onClick={() => call("resolve", [BigInt(m.id), outcome])}>
                Resolve {label}
              </ArrowButton>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-[14px] text-white/60">Betting closed. Waiting for {short(m.creator)} to settle it.</p>
        ))}

      {status === "settled" &&
        (claimed ? (
          <p className="mt-6 text-[14px] text-yes">Claimed ✓</p>
        ) : (
          <ArrowButton className="mt-8" disabled={!address || tx.busy} onClick={() => call("claim", [BigInt(m.id)])}>
            Claim payout
          </ArrowButton>
        ))}
      {tx.status && <p className={`mt-4 text-[13px] ${tx.isError ? "text-no" : "text-white/70"}`}>{tx.status}</p>}
    </div>
  );
}
