import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function AttestationBadge({ className, label = "TEE Verified" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        "border-eclipse-purple/40 bg-eclipse-purple/10 text-eclipse-purple",
        "shadow-[0_0_20px_-6px_rgba(168,85,247,0.55)]",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
