import { Suspense } from "react";
import { MarketDetail } from "@/components/market-detail";

export default function MarketPage({ params }: PageProps<"/markets/[id]">) {
  return (
    <Suspense>
      <MarketDetail params={params} />
    </Suspense>
  );
}
