import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/eclipse/AppShell";
import { AttestationTicker } from "@/components/eclipse/AttestationTicker";
import { VaultCard } from "@/components/eclipse/VaultCard";
import { EclipseMark } from "@/components/eclipse/EclipseMark";
import { AttestationBadge } from "@/components/eclipse/AttestationBadge";
import { mockVaults } from "@/lib/mock-data";
import { ArrowRight, Cpu, EyeOff, FileCheck2, Lock, Rocket, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const featured = mockVaults.slice(0, 3);
  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="eclipse-grid-bg absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute left-1/2 top-20 h-[520px] w-[520px] -translate-x-1/2">
          <div className="eclipse-corona" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-16 text-center md:pt-24">
          <div className="mb-8 eclipse-ring-glow">
            <EclipseMark className="h-16 w-16" />
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-eclipse-border bg-eclipse-surface/60 px-3 py-1 text-xs text-eclipse-muted">
            <span className="live-dot" /> Confidential compute · TEE-attested trading
          </div>
          <h1 className="text-gradient-eclipse text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Verifiable Alpha.
            <br />
            Invisible Strategy.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-eclipse-muted md:text-lg">
            Trading strategies run inside hardware-attested Trusted Execution Environments.
            Investors verify every trade and every dollar of performance on-chain — without ever
            seeing the strategy itself.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/vaults"
              className="group inline-flex items-center gap-2 rounded-lg bg-eclipse-purple px-5 py-3 text-sm font-medium text-white glow-purple transition-all hover:bg-eclipse-purple-bright"
            >
              Explore Vaults
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/deploy"
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border bg-eclipse-surface/60 px-5 py-3 text-sm font-medium text-eclipse-text backdrop-blur-md hover:border-eclipse-purple/40"
            >
              Deploy a Strategy
            </Link>
          </div>
        </div>
        <div className="relative">
          <AttestationTicker />
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-7xl px-6 py-24">
        <SectionHeader eyebrow="How It Works" title="Four steps, cryptographically enforced." />
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            {
              icon: Cpu,
              title: "Strategy deployed",
              desc: "Strategist ships code into a Confidential Space enclave. Nobody — not even us — can read it.",
            },
            {
              icon: ShieldCheck,
              title: "Enclave attests",
              desc: "Hardware signs a measurement of the exact binary. The Flare Data Connector verifies it on-chain.",
            },
            {
              icon: Zap,
              title: "Enclave trades",
              desc: "The enclave signs every trade instruction with its registered key. No human in the loop.",
            },
            {
              icon: FileCheck2,
              title: "Ledger records",
              desc: "Every epoch NAV is hash-chained. Performance is publicly reconstructible, forever.",
            },
          ].map((s, i) => (
            <div key={i} className="glass-card glass-card-hover relative p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-eclipse-purple/15 text-eclipse-purple">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mb-1 font-mono text-[11px] text-eclipse-gold">STEP {i + 1}</div>
              <div className="text-base font-semibold text-eclipse-text">{s.title}</div>
              <p className="mt-2 text-sm text-eclipse-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why TEE */}
      <section className="relative mx-auto max-w-7xl px-6 py-16">
        <SectionHeader
          eyebrow="Why a TEE"
          title="Copy-trading platforms ask you to trust. We let you verify."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <ComparisonCard
            title="Traditional copy-trading"
            tone="muted"
            rows={[
              ["Strategy privacy", "Leaked the moment it's copied"],
              ["Track record", "Self-reported. Cherry-picked."],
              ["Trust model", "Trust the platform. Trust the strategist."],
              ["Front-running risk", "High — every trade is public"],
            ]}
          />
          <ComparisonCard
            title="Eclipse Protocol"
            tone="primary"
            rows={[
              ["Strategy privacy", "Sealed inside the enclave. Provably unreadable."],
              ["Track record", "Hash-chained on-chain. Independently reconstructible."],
              ["Trust model", "Trust hardware attestation, not humans."],
              ["Front-running risk", "Neutralized — signals never leave the enclave."],
            ]}
          />
        </div>
      </section>

      {/* Live vaults */}
      <section className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between">
          <SectionHeader eyebrow="Live Vaults" title="Alpha you can actually verify." />
          <Link
            to="/vaults"
            className="hidden text-sm text-eclipse-muted hover:text-eclipse-text md:inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featured.map((v) => (
            <VaultCard key={v.id} vault={v} />
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="glass-card relative overflow-hidden p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-eclipse-purple/20 blur-3xl" />
          <div className="mb-6 text-center text-xs uppercase tracking-widest text-eclipse-muted">
            Verified end-to-end
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-eclipse-text/80">
            <TrustBadge icon={Lock} label="Google Confidential Space" />
            <TrustBadge icon={Cpu} label="AMD SEV-SNP / Intel TDX" />
            <TrustBadge icon={ShieldCheck} label="Flare Data Connector" />
            <TrustBadge icon={FileCheck2} label="ERC-4626 Vaults" />
            <TrustBadge icon={EyeOff} label="Zero strategy leakage" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-xs text-eclipse-muted">
          <AttestationBadge label="Ready for institutions" />
        </div>
        <h3 className="text-3xl font-semibold tracking-tight text-eclipse-text md:text-4xl">
          Deploy your edge without giving it away.
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-eclipse-muted">
          Post a bond. Ship a strategy. Let the enclave prove your track record — while your alpha
          stays yours.
        </p>
        <Link
          to="/deploy"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-eclipse-purple px-5 py-3 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright"
        >
          <Rocket className="h-4 w-4" /> Deploy a Strategy
        </Link>
      </section>
    </AppShell>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">
        {eyebrow}
      </div>
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-eclipse-text md:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function ComparisonCard({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: [string, string][];
  tone: "muted" | "primary";
}) {
  const primary = tone === "primary";
  return (
    <div
      className={
        "glass-card p-6 " +
        (primary ? "border-eclipse-purple/40 shadow-[0_0_40px_-12px_rgba(168,85,247,0.5)]" : "")
      }
    >
      <div className="mb-4 flex items-center gap-2">
        {primary && <EclipseMark className="h-5 w-5" />}
        <div
          className={
            "text-base font-semibold " + (primary ? "text-eclipse-text" : "text-eclipse-muted")
          }
        >
          {title}
        </div>
      </div>
      <dl className="divide-y divide-eclipse-border">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-5 gap-4 py-3 text-sm">
            <dt className="col-span-2 text-eclipse-muted">{k}</dt>
            <dd
              className={"col-span-3 " + (primary ? "text-eclipse-text" : "text-eclipse-text/70")}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-eclipse-border bg-eclipse-surface/50 px-3.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-eclipse-purple" />
      {label}
    </span>
  );
}
