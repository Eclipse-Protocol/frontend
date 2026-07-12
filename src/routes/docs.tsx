import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/eclipse/AppShell";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Cpu,
  ExternalLink,
  Github,
  Layers,
  Menu,
  Route as RouteIcon,
  ShieldCheck,
  Twitter,
  Wallet,
  X,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Eclipse Protocol" },
      {
        name: "description",
        content: "Introduction, architecture, trust model, fee mechanics, and roadmap for Eclipse Protocol.",
      },
    ],
  }),
  component: DocsLayout,
});

const navGroups: { title: string; items: { to: string; label: string; icon: typeof BookOpen }[] }[] = [
  {
    title: "Get Started",
    items: [
      { to: "/docs", label: "Introduction", icon: BookOpen },
      { to: "/docs/how-it-works", label: "How It Works", icon: RouteIcon },
    ],
  },
  {
    title: "Protocol",
    items: [
      { to: "/docs/architecture", label: "Architecture", icon: Layers },
      { to: "/docs/trust", label: "Trust & Security", icon: ShieldCheck },
      { to: "/docs/fees", label: "Fee Model", icon: Wallet },
    ],
  },
  {
    title: "More",
    items: [{ to: "/docs/roadmap", label: "Roadmap", icon: Cpu }],
  },
];

const externalLinks = [
  { href: "https://eclipse-protocol-delta.vercel.app/", label: "Launch App", icon: ExternalLink },
  { href: "https://github.com/Eclipse-Protocol", label: "GitHub", icon: Github },
  { href: "https://x.com/Eclipse_Protocol", label: "X / Twitter", icon: Twitter },
];

function DocsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AppShell>
      <div className="eclipse-grid-bg absolute inset-x-0 top-16 -z-10 h-72 opacity-30" />
      <div className="mx-auto flex max-w-7xl gap-10 px-6 pb-24 pt-10">
        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-eclipse-border bg-eclipse-surface-2 text-eclipse-text shadow-lg md:hidden"
          aria-label="Toggle docs navigation"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {/* Sidebar */}
        <aside
          className={cn(
            "shrink-0 md:sticky md:top-24 md:block md:h-[calc(100vh-7rem)] md:w-56 md:overflow-y-auto",
            mobileOpen
              ? "fixed inset-x-4 top-20 z-20 max-h-[75vh] overflow-y-auto rounded-xl border border-eclipse-border bg-eclipse-surface-2 p-4 shadow-2xl"
              : "hidden",
          )}
        >
          <DocsNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}

function DocsNav({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="space-y-7 text-sm">
      {navGroups.map((group) => (
        <div key={group.title}>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-eclipse-muted">
            {group.title}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors",
                      active
                        ? "bg-eclipse-purple/15 text-eclipse-text"
                        : "text-eclipse-muted hover:bg-white/[0.03] hover:text-eclipse-text",
                    )}
                  >
                    <item.icon className={cn("h-3.5 w-3.5", active ? "text-eclipse-purple" : "text-eclipse-muted")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-eclipse-muted">Resources</div>
        <ul className="space-y-0.5">
          {externalLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-eclipse-muted transition-colors hover:bg-white/[0.03] hover:text-eclipse-text"
              >
                <l.icon className="h-3.5 w-3.5" />
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
