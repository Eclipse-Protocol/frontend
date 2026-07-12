import { createFileRoute } from "@tanstack/react-router";
import { Check, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocsHeader, PrevNext, Section } from "@/components/eclipse/DocsUI";

export const Route = createFileRoute("/docs/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — Eclipse Protocol Docs" },
      { name: "description", content: "From MVP build weeks to mainnet audit, a strategy marketplace, and multi-chain execution." },
    ],
  }),
  component: RoadmapPage,
});

const mvpWeeks = [
  {
    week: "Week 1",
    title: "Contracts & tests",
    items: [
      "EnclaveRegistry, AlphaVault (deposit / withdraw / instruction verification / harvest())",
      "FeeMath library with full unit coverage — profit, loss, hurdle, and multi-harvest sequences",
      "Foundry test suite; deploy to Coston2",
    ],
  },
  {
    week: "Week 2",
    title: "Enclave runtime",
    items: [
      "Containerized strategy runner — one real momentum/mean-reversion strategy on a live Flare-listed pair",
      "Attestation bootstrap, ephemeral key signing",
      "Start live testnet trading early to accumulate a real track record before demo day",
    ],
  },
  {
    week: "Week 3",
    title: "Relayer & FDC integration",
    items: [
      "Enclave attestation → on-chain registration",
      "PerformanceLedger wiring, DEX router execution",
      "End-to-end testnet run, including a real harvest() call crossing the high-water mark",
    ],
  },
  {
    week: "Week 4",
    title: "Frontend & polish",
    items: [
      "Investor dashboard — attestation badge + live NAV chart",
      "Strategist dashboard",
      "Demo video and submission writeup",
    ],
  },
];

const beyond = [
  { when: "Post-hackathon", title: "Audit & mainnet", desc: "Security audit of vault + registry contracts, mainnet deployment." },
  { when: "Q4 2026", title: "Strategy marketplace", desc: "Multiple concurrent strategist vaults, investor-facing strategy discovery and comparison." },
  { when: "2027", title: "Multi-chain execution", desc: "Solana/Anchor execution vaults alongside Flare EVM vaults, leveraging native Flare Confidential Compute (PMWs) once mainnet-live to reduce reliance on Google Confidential Space." },
  { when: "Longer term", title: "Institutional-grade rails", desc: "Compliance-gated vaults, strategist reputation scoring built on the attested track record, infrastructure licensing for the attested-compute + on-chain-verification pattern beyond trading." },
];

function RoadmapPage() {
  return (
    <div>
      <DocsHeader
        eyebrow="Roadmap"
        title="From hackathon MVP to mainnet"
        lede="Built for the Flare Summer Signal Hackathon — Bounty 2: Confidential Compute Apps. Every contract, the enclave runtime, the relayer, and the fee engine were built from zero during the hackathon window."
      />

      <Section eyebrow="MVP Scope" title="Build weeks (Aug 14 deadline)">
        <div className="not-prose grid gap-4 md:grid-cols-2">
          {mvpWeeks.map((w, i) => (
            <div key={w.week} className="glass-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-eclipse-purple/50 bg-eclipse-purple/15 font-mono text-[11px] text-eclipse-purple">
                  {i + 1}
                </span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-eclipse-gold">{w.week}</div>
                  <div className="text-sm font-semibold text-eclipse-text">{w.title}</div>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm text-eclipse-text/75">
                {w.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-eclipse-teal" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Beyond the Hackathon" title="Where the protocol goes next">
        <ol className="relative ml-3 space-y-7 border-l border-eclipse-border pl-6">
          {beyond.map((b, i) => (
            <li key={b.when} className="relative">
              <span
                className={cn(
                  "absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border",
                  i === 0
                    ? "border-eclipse-purple bg-eclipse-purple/25 text-eclipse-purple glow-purple"
                    : "border-eclipse-border bg-eclipse-surface",
                )}
              />
              <div className="font-mono text-[11px] uppercase tracking-widest text-eclipse-gold">{b.when}</div>
              <div className="mt-1 text-base font-semibold text-eclipse-text">{b.title}</div>
              <p className="mt-1 text-sm text-eclipse-text/75">{b.desc}</p>
            </li>
          ))}
        </ol>
      </Section>

      <div className="glass-card relative mt-4 overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-eclipse-purple/20 blur-3xl" />
        <h3 className="text-2xl font-semibold tracking-tight text-eclipse-text">
          Deploy your edge without giving it away.
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-eclipse-muted">
          Post a bond. Ship a strategy. Let the enclave prove your track record — while your alpha stays
          yours.
        </p>
        <a
          href="https://eclipse-protocol-delta.vercel.app/deploy"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-eclipse-purple px-5 py-3 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright"
        >
          <Rocket className="h-4 w-4" /> Deploy a Strategy
        </a>
      </div>

      <PrevNext prev={{ to: "/docs/fees", label: "Fee Model" }} />
    </div>
  );
}
