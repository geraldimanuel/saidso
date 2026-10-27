"use client";

import { useState } from "react";
import { useConnection } from "wagmi";
import { DemoNotice } from "@/components/markets-table";
import { ArrowButton, Frame, Label, XLines } from "@/components/ui";
import { MARKET_ADDRESS, marketAbi } from "@/lib/contract";
import { useTx } from "@/lib/tx";

const EXAMPLES = ["Will Budi be late to dinner on Friday?", "Will the group trip actually happen?", "Will Kevin reply within an hour?"];

export function CreateForm() {
  const [question, setQuestion] = useState("");
  const [deadline, setDeadline] = useState("");
  const { isConnected } = useConnection();
  const tx = useTx();
  const ts = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : 0;
  const valid = question.trim().length > 0 && ts * 1000 > Date.now();

  return (
    <main className="relative border-b border-line">
      <XLines />
      <div className="wrap relative grid gap-12 pb-32 pt-36 md:grid-cols-2">
        <div>
          <Label>Create a market</Label>
          <h1 className="display mt-6 max-w-[520px] text-[clamp(32px,3.6vw,52px)]">Turn your hottest take into a market.</h1>
          <p className="mt-6 max-w-[440px] text-[16px] leading-[1.5]">
            Yes/no only. Pick a deadline: betting stops then, and you settle the result. Keep it honest, your friends are watching.
          </p>
          {!MARKET_ADDRESS && <DemoNotice />}
        </div>
        <Frame className="bg-black p-[clamp(20px,2.8vw,40px)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (MARKET_ADDRESS && valid)
                tx.send({ address: MARKET_ADDRESS, abi: marketAbi, functionName: "createMarket", args: [question.trim(), BigInt(ts)] });
            }}
          >
            <label htmlFor="q" className="text-[12px] uppercase text-white/55">
              Question
            </label>
            <textarea
              id="q"
              rows={3}
              className="input mt-2 resize-none"
              placeholder={EXAMPLES[0]}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={140}
              required
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setQuestion(ex)} className="border border-line px-2.5 py-1 text-[12px] text-white/70 hover:text-white">
                  {ex}
                </button>
              ))}
            </div>
            <label htmlFor="dl" className="mt-8 block text-[12px] uppercase text-white/55">
              Betting closes
            </label>
            <input id="dl" type="datetime-local" className="input mt-2 [color-scheme:dark]" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            <ArrowButton type="submit" className="mt-10" disabled={!MARKET_ADDRESS || !isConnected || !valid || tx.busy}>
              {isConnected || !MARKET_ADDRESS ? "Create market" : "Connect wallet first"}
            </ArrowButton>
            {tx.status && <p className={`mt-4 text-[13px] ${tx.isError ? "text-no" : "text-white/70"}`}>{tx.status}</p>}
            {tx.isSuccess && (
              <ArrowButton href="/markets" className="mt-6">
                See it live
              </ArrowButton>
            )}
          </form>
        </Frame>
      </div>
    </main>
  );
}
