import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Address } from "viem";
import { toast } from "sonner";
import { ALPHA_VAULT_ABI } from "@/abi/alphaVault";
import { wagmiConfig } from "@/lib/wagmi";

/** Redeems the caller's own full share balance in one vault. Self-redemption (owner === receiver
 * === msg.sender) needs no ERC-20 approval step in OZ's ERC4626 — `_spendAllowance` is only
 * invoked when the caller differs from the share owner — so there's no separate approve() leg here,
 * unlike the deposit flow. */
export function WithdrawButton({
  vaultAddress,
  shareBalance,
  onSuccess,
}: {
  vaultAddress: Address;
  shareBalance: bigint;
  onSuccess?: () => void;
}) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<"idle" | "pending" | "confirming">("idle");

  async function withdraw() {
    if (!address || shareBalance <= 0n) return;
    setStatus("pending");
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: ALPHA_VAULT_ABI,
        functionName: "redeem",
        args: [shareBalance, address, address],
      });
      setStatus("confirming");
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toast.success("Withdraw confirmed on-chain");
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Withdraw failed", { description: message.slice(0, 200) });
    } finally {
      setStatus("idle");
    }
  }

  return (
    <button
      onClick={withdraw}
      disabled={status !== "idle" || shareBalance <= 0n}
      className="rounded-md border border-eclipse-border px-3 py-1 text-xs text-eclipse-text hover:border-eclipse-purple/60 disabled:opacity-60"
    >
      {status === "pending"
        ? "Confirm in wallet…"
        : status === "confirming"
          ? "Withdrawing…"
          : "Withdraw"}
    </button>
  );
}
