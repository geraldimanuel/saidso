import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketDetail } from "@/components/market-detail";
import { idFromSlug, marketHref, odds, usdc } from "@/lib/market-math";
import { readMarket } from "@/lib/og";

/** The shared link's preview text: the question as title, live odds and pot as description. */
export async function generateMetadata({ params }: PageProps<"/markets/[slug]">): Promise<Metadata> {
  const id = idFromSlug((await params).slug);
  const m = id === null ? null : await readMarket(id);
  if (!m) return { title: "Market" };
  const o = odds(m);
  const description = `Yes ${o.yes}% · No ${o.no}% · Pot ${usdc(o.total)}. Think you know? Place your call on Saidso.`;
  return {
    title: m.question,
    description,
    alternates: { canonical: marketHref(m) },
    openGraph: { title: m.question, description, url: marketHref(m) },
  };
}

export default function MarketPage({ params }: PageProps<"/markets/[slug]">) {
  return (
    <Suspense>
      <MarketDetail params={params} />
    </Suspense>
  );
}
