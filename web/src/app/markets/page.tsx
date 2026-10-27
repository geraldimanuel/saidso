import { Suspense } from "react";
import { MarketsTable } from "@/components/markets-table";

export const metadata = { title: "Markets — Saidso" };

export default function MarketsPage() {
  return (
    <Suspense>
      <MarketsTable />
    </Suspense>
  );
}
