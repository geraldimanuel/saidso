"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BaseError } from "viem";
import { useConnection, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CHAIN } from "@/lib/contract";

/** Switch the wallet to CHAIN if needed, writeContract, wait for receipt, then refetch every read. */
export function useTx() {
  const { chainId } = useConnection();
  const switchChain = useSwitchChain();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const qc = useQueryClient();

  useEffect(() => {
    if (receipt.isSuccess) qc.invalidateQueries();
  }, [receipt.isSuccess, qc]);

  // Wallets sign on whatever network they're on, so move them to CHAIN first (adds it to the wallet if missing).
  // Cast keeps write.mutate's generic signature (payable `value` etc.); args pass through untouched.
  const send = ((...args: Parameters<typeof write.mutate>) =>
    void (chainId === CHAIN.id ? Promise.resolve() : switchChain.mutateAsync({ chainId: CHAIN.id }))
      .then(() => write.mutate(...args))
      .catch(() => {})) as typeof write.mutate; // a rejected switch shows up via switchChain.error

  const error = switchChain.error ?? write.error ?? receipt.error;
  const status = switchChain.isPending
    ? "Switch network in wallet…"
    : write.isPending
    ? "Confirm in wallet…"
    : receipt.isLoading
      ? "Waiting for confirmation…"
      : receipt.isSuccess
        ? "Confirmed ✓"
        : error
          ? ((error as BaseError).shortMessage ?? error.message)
          : null;

  return { send, busy: switchChain.isPending || write.isPending || receipt.isLoading, status, isError: !!error, isSuccess: receipt.isSuccess };
}
