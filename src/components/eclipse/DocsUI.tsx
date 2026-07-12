import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocsHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="mb-14">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">{eyebrow}</div>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eclipse-text md:text-5xl">{title}</h1>
      {lede && <p className="mt-4 max-w-2xl text-base leading-relaxed text-eclipse-muted">{lede}</p>}
    </div>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      {eyebrow && (
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">{eyebrow}</div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-eclipse-text md:text-[28px]">{title}</h2>
      <div className="prose-docs mt-5 space-y-4 text-[15px] leading-relaxed text-eclipse-text/80">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="!mt-8 text-lg font-semibold text-eclipse-text">{children}</h3>;
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  const Icon = tone === "danger" ? ShieldAlert : tone === "warning" ? AlertTriangle : Info;
  const toneCls =
    tone === "danger"
      ? "border-eclipse-danger/30 bg-eclipse-danger/5"
      : tone === "warning"
        ? "border-eclipse-gold/30 bg-eclipse-gold/5"
        : "border-eclipse-purple/30 bg-eclipse-purple/5";
  const iconCls = tone === "danger" ? "text-eclipse-danger" : tone === "warning" ? "text-eclipse-gold" : "text-eclipse-purple";
  return (
    <div className={cn("rounded-lg border p-4 text-sm text-eclipse-text/85", toneCls)}>
      <div className={cn("mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", iconCls)}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

export function DocsTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="not-prose my-2 overflow-x-auto rounded-lg border border-eclipse-border">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-eclipse-border bg-eclipse-surface-2/60">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider text-eclipse-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-eclipse-border/60 last:border-0 even:bg-white/[0.015]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top text-eclipse-text/85">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CodeTree({ children }: { children: string }) {
  return (
    <pre className="not-prose my-2 overflow-x-auto rounded-lg border border-eclipse-border bg-eclipse-surface/80 p-4 font-mono text-[12.5px] leading-relaxed text-eclipse-text/85">
      {children}
    </pre>
  );
}

export interface FlowNode {
  icon: LucideIcon;
  label: string;
  note?: string;
}

export function FlowChain({ nodes }: { nodes: FlowNode[] }) {
  return (
    <div className="not-prose my-2 flex flex-col items-stretch gap-0 md:flex-row md:items-center">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex flex-1 flex-col items-center md:flex-row">
          <div className="glass-card glass-card-hover flex w-full flex-col items-center gap-1.5 p-4 text-center">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-eclipse-purple/15 text-eclipse-purple">
              <n.icon className="h-4.5 w-4.5" />
            </div>
            <div className="text-sm font-semibold text-eclipse-text">{n.label}</div>
            {n.note && <div className="text-xs text-eclipse-muted">{n.note}</div>}
          </div>
          {i < nodes.length - 1 && (
            <div className="flex shrink-0 items-center justify-center py-2 text-eclipse-purple/50 md:px-2 md:py-0">
              <ArrowDown className="h-4 w-4 md:hidden" />
              <ArrowRight className="hidden h-4 w-4 md:block" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export interface TimelineStep {
  from: string;
  to?: string;
  action: string;
  detail?: string;
  emphasis?: boolean;
}

export function Timeline({ title, steps }: { title?: string; steps: TimelineStep[] }) {
  return (
    <div className="not-prose my-2 rounded-xl border border-eclipse-border bg-eclipse-surface/40 p-5 md:p-6">
      {title && <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">{title}</div>}
      <ol className="relative ml-3 space-y-6 border-l border-eclipse-border pl-6">
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[9px]",
                s.emphasis
                  ? "border-eclipse-purple bg-eclipse-purple/25 text-eclipse-purple glow-purple"
                  : "border-eclipse-border bg-eclipse-surface text-eclipse-muted",
              )}
            >
              {i + 1}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[12.5px]">
              <span className="text-eclipse-text">{s.from}</span>
              {s.to && (
                <>
                  <ArrowRight className="h-3 w-3 text-eclipse-muted" />
                  <span className="text-eclipse-text">{s.to}</span>
                </>
              )}
            </div>
            <div className="mt-1 text-sm text-eclipse-text/80">{s.action}</div>
            {s.detail && <div className="mt-1 text-xs text-eclipse-muted">{s.detail}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TwoUp({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="not-prose my-2 grid gap-4 md:grid-cols-2">
      <div className="glass-card p-5">{left}</div>
      <div className="glass-card p-5">{right}</div>
    </div>
  );
}

export function StatRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="not-prose my-2 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-eclipse-border bg-eclipse-surface/40 p-3.5">
          <div className="font-mono text-lg font-semibold text-eclipse-text">{it.value}</div>
          <div className="mt-0.5 text-xs text-eclipse-muted">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

export function PrevNext({
  prev,
  next,
}: {
  prev?: { to: string; label: string };
  next?: { to: string; label: string };
}) {
  return (
    <div className="mt-20 flex items-stretch gap-3 border-t border-eclipse-border pt-8">
      {prev ? (
        <Link
          to={prev.to}
          className="glass-card glass-card-hover flex flex-1 flex-col gap-1 p-4 text-left"
        >
          <span className="inline-flex items-center gap-1 text-xs text-eclipse-muted">
            <ArrowLeft className="h-3 w-3" /> Previous
          </span>
          <span className="text-sm font-medium text-eclipse-text">{prev.label}</span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          to={next.to}
          className="glass-card glass-card-hover flex flex-1 flex-col items-end gap-1 p-4 text-right"
        >
          <span className="inline-flex items-center gap-1 text-xs text-eclipse-muted">
            Next <ArrowRight className="h-3 w-3" />
          </span>
          <span className="text-sm font-medium text-eclipse-text">{next.label}</span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
