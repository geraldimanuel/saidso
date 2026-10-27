"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BaseError } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/** writeContract + wait for receipt, then refetch every read. */
export function useTx() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const qc = useQueryClient();

  useEffect(() => {
    if (receipt.isSuccess) qc.invalidateQueries();
  }, [receipt.isSuccess, qc]);

  const error = write.error ?? receipt.error;
  const status = write.isPending
    ? "Confirm in wallet…"
    : receipt.isLoading
      ? "Waiting for confirmation…"
      : receipt.isSuccess
        ? "Confirmed ✓"
        : error
          ? ((error as BaseError).shortMessage ?? error.message)
          : null;

  return { send: write.mutate, busy: write.isPending || receipt.isLoading, status, isError: !!error, isSuccess: receipt.isSuccess };
}
