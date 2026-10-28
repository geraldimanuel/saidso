"use client";

import { Wordmark } from "@/components/chrome";
import { record, signed } from "@/components/leaderboard";
import { CountUp, reveal, Scrub } from "@/components/motion";
import { ArrowButton, d, Frame, Label, OddsBar, PixelMark, Split, VideoBg, XLines } from "@/components/ui";
import { Avatar, Glow, OddsChart } from "@/components/visuals";
import { REPO_URL } from "@/lib/contract";
import { useLeaderboard } from "@/lib/leaderboard";
import { usdc, marketHref, odds, OUTCOME_LABEL, phaseOf, short, statusOf, timeLeft, useMarkets, useNow } from "@/lib/markets";

export function Hero() {
  return (
    <section ref={reveal} className="rv relative isolate min-h-[100svh] overflow-hidden">
      <VideoBg />
      <XLines />
      <div className="wrap relative flex min-h-[100svh] flex-col justify-end pb-14 pt-32">
        <div className="mb-auto grid flex-1 items-center gap-10 md:grid-cols-2">
          <h1 className="display max-w-[460px] text-[clamp(32px,3.2vw,44px)]" style={d(500)}>
            <Split text="Where friends bet on each other's boldest claims." />
          </h1>
          <div className="max-w-[400px] md:justify-self-end">
            <p className="fade text-[16px] leading-[1.5]" style={d(900)}>
              Prediction markets for your group chat. Ask a yes/no question, everyone stakes USDC on their call, and when time&apos;s up the
              winners split the whole pot.
            </p>
            <div className="fade mt-12" style={d(1100)}>
              <ArrowButton href="/markets">Browse markets</ArrowButton>
            </div>
          </div>
        </div>
        <Wordmark delay={700} />
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="about" className="wrap scroll-mt-16 border-b border-line pt-28">
      <div className="grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col justify-between gap-12 pb-12">
          <PixelMark />
          <div ref={reveal} className="rv fade">
            <p className="max-w-[400px] text-[16px] leading-[1.5]">
              At Saidso, every "I said so" becomes a market. Put your money where your mouth is, and let a smart contract keep score.
            </p>
            <ArrowButton href="/create" className="mt-12">
              Create a market
            </ArrowButton>
          </div>
        </div>
        <div>
          <Label>About</Label>
          <Scrub className="display mt-5 text-[clamp(28px,3vw,42px)]" muted="Not a casino —" text="a group chat with a pot, where being right finally pays." />
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] sm:gap-5">
            <Glow seed="about-ticket" ref={reveal} className="rv wipe flex aspect-[46/28] flex-col justify-end p-6">
              <p className="text-[12px] uppercase text-white/80">[ Live market ]</p>
              <p className="display mt-2 text-[22px]">Will Budi be late to dinner?</p>
              <OddsBar yes={70} className="mt-4" />
              <p className="mt-2 flex justify-between text-[12px] uppercase">
                <span>Yes 70%</span>
                <span>No 30%</span>
              </p>
            </Glow>
            <Frame className="mt-8 flex items-center justify-center p-10 sm:mt-0" delay={250}>
              <div className="w-full space-y-3 text-[13px]">
                <p className="text-white/50">{"// after resolve()"}</p>
                <p>
                  claim(<span className="text-yes">0</span>)
                </p>
                <p className="display text-[34px] text-yes">+84 USDC</p>
                <p className="text-white/50">pulled, not pushed.</p>
              </div>
            </Frame>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Stats() {
  const { markets } = useMarkets();
  const now = useNow();
  const pot = markets.reduce((s, m) => s + m.yesPool + m.noPool, 0n);
  const stats = [
    [String(markets.length), "Markets", "Questions your friends couldn't let go"],
    [usdc(pot).replace(" USDC", ""), "USDC staked", "Put where their mouths are"],
    [String(markets.filter((m) => statusOf(m, now) === "open").length), "Open", "Still taking bets right now"],
    [String(markets.filter((m) => statusOf(m, now) === "settled").length), "Settled", "Arguments finally ended"],
  ];
  return (
    <section id="stats" className="wrap scroll-mt-16 pt-32">
      <div ref={reveal} className="rv text-center">
        <Label>Game changing stats</Label>
        <h2 className="display mx-auto mt-5 max-w-[760px] text-[clamp(28px,3vw,42px)]">
          <Split text="Sharp takes, real stakes, zero arguing about who said what." />
        </h2>
      </div>
      <Frame className="mt-16">
        <div className="relative h-[clamp(220px,28vw,400px)] bg-[radial-gradient(70%_120%_at_30%_100%,#123b2a_0%,#000_70%)]">
          <OddsChart />
        </div>
        <div className="grid grid-cols-2 border-t border-line bg-black/60 md:grid-cols-4">
          {stats.map(([n, label, desc]) => (
            <div key={label} className="px-[clamp(16px,3.5vw,50px)] py-9">
              <p className="flex flex-wrap items-start gap-2">
                <span className="wordmark text-[clamp(40px,4vw,54px)]">
                  <CountUp value={n} />
                </span>
                <span className="text-[14px] uppercase">[ {label} ]</span>
              </p>
              <p className="mt-6 max-w-[240px] text-[15px] uppercase">{desc}</p>
            </div>
          ))}
        </div>
      </Frame>
    </section>
  );
}

export function OpenMarkets() {
  const { markets } = useMarkets();
  const now = useNow();
  const open = markets.filter((m) => statusOf(m, now) === "open").slice(0, 4);
  return (
    <section id="markets" className="wrap scroll-mt-16 pt-32">
      <div ref={reveal} className="rv grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <Label>Open markets</Label>
        <h2 className="display text-[clamp(28px,3vw,42px)]">
          <Split text="Pick a side on the questions your friends can't stop arguing about." />
        </h2>
      </div>
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {open.map((m, i) => {
          const o = odds(m);
          return (
            <Frame key={m.id} className="flex flex-col bg-card p-5" bare delay={i * 120}>
              <p className="text-[13px] uppercase text-white/85">[ Closes in {timeLeft(m.deadline, now)} ]</p>
              <h3 className="display mt-4 min-h-[3.4em] text-[24px] leading-[1.15]">{m.question}</h3>
              <p className="mt-6 text-[13px] uppercase">Pot {usdc(o.total)}</p>
              <OddsBar yes={o.yes} className="mt-3" />
              <p className="mt-2 flex justify-between text-[13px]">
                <span>Yes {o.yes}%</span>
                <span>No {o.no}%</span>
              </p>
              <ArrowButton href={marketHref(m)} className="mt-8 self-start">
                Bet now
              </ArrowButton>
            </Frame>
          );
        })}
        {open.length === 0 && <p className="text-white/60">No open markets yet. Be the first to call it.</p>}
      </div>
    </section>
  );
}

const STACK = ["Solidity", "Foundry", "Base", "viem", "wagmi", "Next.js"];

export function BuiltWith() {
  return (
    <section ref={reveal} className="rv wrap pt-32">
      <div className="flex items-center gap-7">
        <PixelMark size={62} />
        <p className="fade max-w-[380px] text-[16px] leading-[1.5]">Built on boring, battle-tested tools so the only drama is in the questions.</p>
      </div>
      <ul className="mt-14 flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
        {STACK.map((s, i) => (
          <li key={s} style={d(200 + i * 80)} className="fade flex items-center gap-2.5 font-[family-name:var(--font-host-grotesk)] text-[22px] font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center border border-white/80 text-[12px]">{s[0]}</span>
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="wrap scroll-mt-16 space-y-10 pt-32">
      <Frame className="grid items-center gap-10 p-[clamp(20px,2.8vw,40px)] md:grid-cols-2">
        <div>
          <Label>Step 01</Label>
          <h3 className="display mt-4 text-[clamp(26px,2.6vw,36px)]">
            <Split text="Ask a yes/no question, set a deadline" />
          </h3>
          <p className="mt-5 max-w-[480px] text-[16px] leading-[1.5]">
            Anyone can open a market. Friends bet USDC on YES or NO until the deadline, and every bet is public, onchain and final.
          </p>
          <ArrowButton href="/create" className="mt-12">
            Create a market
          </ArrowButton>
        </div>
        <Glow seed="step-1" className="wipe aspect-[58/30] p-6 text-[13px] leading-[1.7]">
          <pre className="relative whitespace-pre-wrap">
            <span className="text-white/60">{"// one tx, that's the whole setup\n"}</span>
            {"pm.createMarket(\n  "}
            <span className="text-yes">{'"Will Budi be late?"'}</span>
            {",\n  friday8pm,\n  sarah "}
            <span className="text-white/60">{"// arbiter"}</span>
            {"\n);"}
          </pre>
        </Glow>
      </Frame>
      <Frame className="grid items-center gap-10 p-[clamp(20px,2.8vw,40px)] md:grid-cols-2">
        <Glow seed="step-2" className="wipe order-last aspect-[58/34] p-6 md:order-first">
          <div className="relative flex h-full flex-col justify-center gap-4">
            <p className="display text-[clamp(20px,2.2vw,30px)]">payout = stake × pot ÷ winning pool</p>
            <p className="text-[13px] text-white/80">10 USDC on YES · pot 80 USDC · YES pool 40 USDC → 20 USDC back</p>
          </div>
        </Glow>
        <div>
          <Label>Step 02</Label>
          <h3 className="display mt-4 text-[clamp(26px,2.6vw,36px)]">
            <Split text="Winners split the whole pot" />
          </h3>
          <p className="mt-5 max-w-[480px] text-[16px] leading-[1.5]">
            The creator calls the result after the deadline. Any bettor can dispute it for a day, and a neutral arbiter friend makes
            the final call. Winners claim pro-rata. Voided, nobody on the winning side, or the creator never calls it? Everyone gets
            refunded.
          </p>
          <ArrowButton href={REPO_URL} className="mt-12">
            Read the contract
          </ArrowButton>
        </div>
      </Frame>
    </section>
  );
}

export function RecentlySettled() {
  const { markets } = useMarkets();
  const now = useNow();
  const settled = markets.filter((m) => statusOf(m, now) === "settled").slice(0, 3);
  if (settled.length === 0) return null;
  return (
    <section id="settled" className="wrap scroll-mt-16 pt-32">
      <p ref={reveal} className="rv fade max-w-[360px] text-[16px] leading-[1.5]">Catch up on the latest calls — who was right, and who paid up.</p>
      <div className="mt-16 border-t border-line">
        {settled.map((m) => {
          const label = OUTCOME_LABEL[phaseOf(m, now).final];
          return (
            <article key={m.id} ref={reveal} className="rv grid items-center gap-8 border-b border-line py-8 md:grid-cols-2">
              <div>
                <h3 className="display text-[clamp(20px,1.8vw,24px)] leading-[1.35]">
                  <Split text={m.question} />
                </h3>
                <p className="mt-5 max-w-[480px] text-[14px] leading-[1.5]">
                  Settled {label.toUpperCase()}. {usdc(m.yesPool + m.noPool)} pot, created by {short(m.creator)}.
                </p>
                <ArrowButton href={marketHref(m)} className="mt-10">
                  View market
                </ArrowButton>
              </div>
              <Glow seed={`settled-${m.id}`} className="wipe grid aspect-[635/270] place-items-center" style={d(150)}>
                <span className="wordmark relative text-[clamp(56px,9vw,130px)]">{label}</span>
              </Glow>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function TopCallers() {
  const { callers, isDemo } = useLeaderboard();
  const top = callers.slice(0, 4);
  return (
    <section id="callers" className="wrap scroll-mt-16 pb-32 pt-32">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <Label>Top callers{isDemo ? " · sample" : ""}</Label>
        <ArrowButton href="/leaderboard">Full leaderboard</ArrowButton>
      </div>
      {top.length === 0 ? (
        <p className="mt-14 text-[16px] text-white/60">No calls yet. Place the first bet and take the top spot.</p>
      ) : (
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {top.map((c, i) => (
            <Frame key={c.address} className="p-[15px]" delay={i * 120}>
              <Avatar seed={c.address} className="wipe aspect-square w-full" />
              <h3 className={`display mt-8 text-[20px] ${c.profit > 0n ? "text-yes" : c.profit < 0n ? "text-no" : ""}`}>{signed(c.profit)}</h3>
              <p className="mt-1 text-[14px]">
                {short(c.address)} / {record(c)}
              </p>
            </Frame>
          ))}
        </div>
      )}
    </section>
  );
}

export function Cta() {
  return (
    <section ref={reveal} className="rv relative border-t border-line">
      <XLines />
      <div className="wrap relative grid min-h-[480px] gap-10 py-6 md:grid-cols-2">
        <Label>Your turn</Label>
        <div className="self-start pt-4 md:pl-[70px]">
          <h2 className="display text-[clamp(30px,3vw,42px)]">
            <Split text="Got a take your friends won't believe?" />
          </h2>
          <p className="fade mt-6 max-w-[580px] text-[16px] leading-[1.5]" style={d(300)}>
            Turn it into a market in one transaction. Share the link, let them bet against you, and collect when you&apos;re right.
          </p>
          <div className="fade mt-12" style={d(500)}>
            <ArrowButton href="/create">Create a market</ArrowButton>
          </div>
        </div>
      </div>
    </section>
  );
}
