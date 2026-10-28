import { Suspense } from "react";
import { MarketsTable } from "@/components/markets-table";

export const metadata = { title: "Markets" };

export default function MarketsPage() {
  return (
    <Suspense>
      <MarketsTable />
    </Suspense>
  );
}
