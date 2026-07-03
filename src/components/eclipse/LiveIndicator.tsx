import { cn } from "@/lib/utils";

export function LiveIndicator({ className, label = "Live" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-medium text-eclipse-teal", className)}>
      <span className="live-dot" />
      {label}
    </span>
  );
}
