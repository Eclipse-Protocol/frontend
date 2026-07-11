import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { EclipseMark } from "./EclipseMark";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletButton } from "./WalletButton";

const links = [
  { to: "/vaults", label: "Vaults" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/strategist", label: "Strategist" },
  { to: "/deploy", label: "Deploy" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-eclipse-border bg-eclipse-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="eclipse-ring-glow"><EclipseMark className="h-8 w-8" /></span>
          <span className="font-serif text-xl italic text-eclipse-text">Eclipse Protocol</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active ? "text-eclipse-text" : "text-eclipse-muted hover:text-eclipse-text",
                )}
              >
                {l.label}
              </Link>
            );
          })}
          <a href="#" className="rounded-md px-3 py-1.5 text-sm text-eclipse-muted hover:text-eclipse-text">Docs</a>
        </nav>

        <div className="flex items-center gap-2">
          <WalletButton className="hidden md:inline-flex" />
          <button
            className="rounded-md border border-eclipse-border p-2 text-eclipse-text md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-eclipse-border bg-eclipse-surface md:hidden">
          <nav className="flex flex-col p-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-eclipse-text hover:bg-eclipse-purple/10"
              >
                {l.label}
              </Link>
            ))}
            <WalletButton className="mt-2 w-full justify-center" />
          </nav>
        </div>
      )}
    </header>
  );
}
