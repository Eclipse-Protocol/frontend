import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { AlertTriangle, ChevronDown, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { coston2 } from "@/lib/wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton({ className }: { className?: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== coston2.id;

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-eclipse-purple/50 bg-eclipse-purple/10 px-3.5 py-2 text-sm font-medium text-eclipse-text transition-all hover:bg-eclipse-purple/20 glow-purple disabled:opacity-60",
              className,
            )}
          >
            <Wallet className="h-4 w-4" />
            {isPending ? "Connecting…" : "Connect Wallet"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-eclipse-border bg-eclipse-surface">
          {connectors.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-eclipse-muted">No wallet extension detected</div>
          )}
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() =>
                connect(
                  { connector, chainId: coston2.id },
                  {
                    onError: (err) => toast.error("Connection failed", { description: err.message }),
                  },
                )
              }
              className="cursor-pointer text-eclipse-text focus:bg-eclipse-purple/10"
            >
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: coston2.id })}
        disabled={isSwitching}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-eclipse-danger/50 bg-eclipse-danger/10 px-3.5 py-2 text-sm font-medium text-eclipse-danger transition-all hover:bg-eclipse-danger/20 disabled:opacity-60",
          className,
        )}
      >
        <AlertTriangle className="h-4 w-4" />
        {isSwitching ? "Switching…" : "Switch to Coston2"}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-eclipse-teal/40 bg-eclipse-teal/10 px-3.5 py-2 text-sm font-medium text-eclipse-teal transition-all hover:bg-eclipse-teal/20",
            className,
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-eclipse-teal" />
          {truncate(address!)}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-eclipse-border bg-eclipse-surface">
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(address!);
            toast.success("Address copied");
          }}
          className="cursor-pointer text-eclipse-text focus:bg-eclipse-purple/10"
        >
          <Copy className="h-3.5 w-3.5" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer text-eclipse-text focus:bg-eclipse-purple/10">
          <a
            href={`${coston2.blockExplorers.default.url}/address/${address}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View on explorer
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="cursor-pointer text-eclipse-danger focus:bg-eclipse-danger/10 focus:text-eclipse-danger"
        >
          <LogOut className="h-3.5 w-3.5" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
