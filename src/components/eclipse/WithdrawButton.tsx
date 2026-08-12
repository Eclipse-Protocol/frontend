import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Address } from "viem";
import { toast } from "sonner";
import { ALPHA_VAULT_ABI } from "@/abi/alphaVault";
import { wagmiConfig } from "@/lib/wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [txState, setTxState] = useState<{
    step: "idle" | "signing" | "confirming" | "success" | "reverted";
    txHash?: `0x${string}`;
    error?: string;
  }>({ step: "idle" });

  const isBusy = txState.step === "signing" || txState.step === "confirming";

  async function withdraw() {
    if (!address || shareBalance <= 0n) return;
    setTxState({ step: "signing" });
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: ALPHA_VAULT_ABI,
        functionName: "redeem",
        args: [shareBalance, address, address],
      });
      setTxState({ step: "confirming", txHash: hash });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      setTxState({ step: "success", txHash: hash });
      toast.success("Withdraw confirmed on-chain");
      onSuccess?.();
    } catch (err: any) {
      console.error("Withdraw failed", err);
      const errorMsg = err.shortMessage || err.message || String(err);
      setTxState({ step: "reverted", error: errorMsg });
      toast.error("Withdraw failed", { description: errorMsg.slice(0, 200) });
    }
  }

  return (
    <>
      <button
        onClick={withdraw}
        disabled={isBusy || shareBalance <= 0n}
        className="rounded-md border border-eclipse-border px-3 py-1 text-xs text-eclipse-text hover:border-eclipse-purple/60 disabled:opacity-60 cursor-pointer transition-colors"
      >
        {isBusy ? "Processing…" : "Withdraw"}
      </button>

      {txState.step !== "idle" && (
        <Dialog open onOpenChange={(open) => { if (!open && !isBusy) setTxState({ step: "idle" }); }}>
          <DialogContent className="border border-eclipse-border bg-eclipse-surface text-eclipse-text p-6 max-w-md rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center gap-2 text-eclipse-purple">
                <ShieldCheck className="h-5 w-5" />
                <DialogTitle className="text-lg font-semibold tracking-tight text-eclipse-text">
                  Withdrawal Status
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-eclipse-muted mt-1 font-sans">
                Track the on-chain execution of your share redemption.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4 font-mono text-xs">
              {txState.step === "signing" && (
                <div className="flex items-center gap-2">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-eclipse-purple border-t-transparent rounded-full" />
                  <span className="font-sans text-eclipse-muted">
                    Please confirm the withdrawal transaction in your connected wallet...
                  </span>
                </div>
              )}

              {txState.step === "confirming" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-eclipse-gold border-t-transparent rounded-full" />
                    <span className="font-sans text-eclipse-muted">
                      Waiting for block confirmation...
                    </span>
                  </div>
                  {txState.txHash && (
                    <div className="mt-1 bg-eclipse-bg/50 px-2.5 py-1.5 rounded border border-eclipse-border flex items-center justify-between">
                      <span className="text-[10px] text-eclipse-muted truncate mr-2">
                        {txState.txHash}
                      </span>
                      <a
                        href={`https://coston2-explorer.flare.network/tx/${txState.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-eclipse-purple hover:underline hover:text-eclipse-purple-bright inline-flex items-center gap-1 text-[10px] shrink-0"
                      >
                        Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {txState.step === "success" && (
                <div className="space-y-2 font-sans text-xs">
                  <div className="flex items-center gap-1.5 text-eclipse-teal font-semibold">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-eclipse-teal/20 text-eclipse-teal text-[10px] font-bold">
                      ✓
                    </span>
                    WITHDRAWAL CONFIRMED ON-CHAIN
                  </div>
                  <p className="text-[10px] text-eclipse-muted leading-relaxed">
                    Your shares have been redeemed and the underlying assets sent to your wallet.
                  </p>
                  {txState.txHash && (
                    <div className="bg-eclipse-bg/50 px-2.5 py-1.5 rounded border border-eclipse-border flex items-center justify-between font-mono">
                      <span className="text-[10px] text-eclipse-muted truncate mr-2">
                        {txState.txHash}
                      </span>
                      <a
                        href={`https://coston2-explorer.flare.network/tx/${txState.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-eclipse-purple hover:underline hover:text-eclipse-purple-bright inline-flex items-center gap-1 text-[10px] shrink-0"
                      >
                        Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {txState.step === "reverted" && (
                <div className="space-y-2 font-sans text-xs">
                  <div className="flex items-center gap-1.5 text-eclipse-danger font-semibold">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-eclipse-danger/20 text-eclipse-danger text-[10px] font-bold">
                      ✗
                    </span>
                    WITHDRAWAL FAILED / REVERTED
                  </div>
                  {txState.error && (
                    <p className="text-[10px] text-eclipse-danger/90 leading-relaxed bg-eclipse-danger/5 p-2 rounded border border-eclipse-danger/20 font-mono break-words">
                      {txState.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isBusy && (
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setTxState({ step: "idle" })}
                  className="rounded-lg border border-eclipse-border hover:border-eclipse-purple/50 bg-eclipse-surface-2 hover:bg-eclipse-surface px-4 py-2 text-xs font-medium text-eclipse-text transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
