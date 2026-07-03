import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/eclipse/AppShell";
import { Check, Loader2, Rocket, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/deploy")({
  head: () => ({
    meta: [
      { title: "Deploy a Strategy — Eclipse Protocol" },
      { name: "description", content: "Deploy your trading strategy into an attested TEE enclave." },
      { property: "og:title", content: "Deploy a Strategy — Eclipse Protocol" },
      { property: "og:description", content: "Deploy your trading strategy into an attested TEE enclave." },
    ],
  }),
  component: Deploy,
});

interface Form {
  name: string;
  desc: string;
  pair: string;
  maxPosition: number;
  drawdown: number;
  mgmtFee: number;
  perfFee: number;
  bond: string;
}

const initial: Form = {
  name: "Momentum Alpha #7",
  desc: "Cross-asset momentum on ETH majors.",
  pair: "ETH/USDC",
  maxPosition: 25,
  drawdown: 15,
  mgmtFee: 1.5,
  perfFee: 15,
  bond: "",
};

const steps = ["Details", "Risk", "Fees", "Bond", "Review"] as const;

function Deploy() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initial);
  const [deploying, setDeploying] = useState(false);
  const [done, setDone] = useState(false);

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (deploying) return <DeploySequence onDone={() => { setDone(true); setDeploying(false); }} />;
  if (done) return <DeployedScreen name={form.name} />;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 pt-12 pb-20">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">Deploy</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eclipse-text">New strategy</h1>
        <p className="mt-2 text-eclipse-muted">Ship your edge into an enclave. Nobody — not even us — can read your code.</p>

        {/* Stepper */}
        <div className="mt-8 flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs",
                  i < step && "border-eclipse-teal/50 bg-eclipse-teal/15 text-eclipse-teal",
                  i === step && "border-eclipse-purple/60 bg-eclipse-purple/20 text-eclipse-text glow-purple",
                  i > step && "border-eclipse-border text-eclipse-muted",
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === step ? "text-eclipse-text" : "text-eclipse-muted")}>{label}</span>
              {i < steps.length - 1 && <div className="mx-1 h-px w-6 bg-eclipse-border" />}
            </div>
          ))}
        </div>

        <div className="glass-card mt-8 p-6">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Strategy name">
                <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea value={form.desc} onChange={(e) => update("desc", e.target.value)} rows={3} className={inputCls} />
              </Field>
              <Field label="Asset pair">
                <select value={form.pair} onChange={(e) => update("pair", e.target.value)} className={inputCls}>
                  {["ETH/USDC", "BTC/USDC", "SOL/USDC", "ETH/BTC", "FXRP/USDC"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-6">
              <SliderField label="Max position size (% of TVL)" value={form.maxPosition} min={5} max={100} onChange={(v) => update("maxPosition", v)} />
              <SliderField label="Drawdown circuit breaker (%)" value={form.drawdown} min={2} max={30} onChange={(v) => update("drawdown", v)} />
              <div className="rounded-lg border border-eclipse-border bg-eclipse-bg/40 p-3 text-xs text-eclipse-muted">
                If losses exceed the drawdown threshold in a single epoch, the enclave halts trading and pauses the vault.
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <SliderField label="Management fee (%/year)" value={form.mgmtFee} min={0} max={3} step={0.25} onChange={(v) => update("mgmtFee", v)} />
              <SliderField label="Performance fee (% of profits)" value={form.perfFee} min={0} max={30} onChange={(v) => update("perfFee", v)} />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <Field label="Bond amount (USDC)">
                <input
                  value={form.bond}
                  onChange={(e) => update("bond", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="100000"
                  className={inputCls}
                />
              </Field>
              <div className="rounded-lg border border-eclipse-danger/30 bg-eclipse-danger/5 p-4 text-xs text-eclipse-text">
                <div className="mb-1 font-semibold text-eclipse-danger">Slashing conditions</div>
                Your bond is slashed if the enclave signs invalid instructions, if drawdown exceeds
                the breaker, or if the code measurement diverges from the registered hash.
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <ReviewRow k="Name" v={form.name} />
              <ReviewRow k="Pair" v={form.pair} />
              <ReviewRow k="Max position" v={`${form.maxPosition}%`} />
              <ReviewRow k="Drawdown breaker" v={`${form.drawdown}%`} />
              <ReviewRow k="Management fee" v={`${form.mgmtFee}%/yr`} />
              <ReviewRow k="Performance fee" v={`${form.perfFee}%`} />
              <ReviewRow k="Bond" v={form.bond ? `$${Number(form.bond).toLocaleString()}` : "—"} />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text disabled:opacity-40"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-eclipse-purple px-5 py-2 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => setDeploying(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-eclipse-purple px-5 py-2 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright"
            >
              <Rocket className="h-4 w-4" /> Deploy enclave
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-lg border border-eclipse-border bg-eclipse-surface px-3 py-2 text-sm text-eclipse-text outline-none focus:border-eclipse-purple/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs text-eclipse-muted">{label}</div>
      {children}
    </label>
  );
}

function SliderField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-eclipse-muted">{label}</div>
        <div className="font-mono text-sm text-eclipse-text">{value}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#A855F7]"
      />
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-eclipse-border/70 pb-2">
      <span className="text-eclipse-muted">{k}</span>
      <span className="font-mono text-eclipse-text">{v}</span>
    </div>
  );
}

const deploySteps = [
  "Booting Confidential Space",
  "Loading strategy binary into enclave",
  "Generating hardware attestation",
  "Verifying attestation via Flare Data Connector",
  "Registering enclave pubkey on-chain",
  "Staking strategist bond",
  "Vault live",
];

function DeploySequence({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= deploySteps.length) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((n) => n + 1), 700 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [i, onDone]);

  return (
    <AppShell>
      <div className="relative mx-auto max-w-xl px-6 pt-24 pb-32">
        <div className="pointer-events-none absolute inset-x-0 top-24 h-64">
          <div className="eclipse-corona mx-auto max-w-md" />
        </div>
        <div className="glass-card relative p-8">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-eclipse-purple" />
            <div>
              <div className="text-sm font-semibold text-eclipse-text">Deploying enclave</div>
              <div className="text-xs text-eclipse-muted">This normally takes ~15 seconds.</div>
            </div>
          </div>
          <ul className="space-y-3">
            {deploySteps.map((s, idx) => {
              const state = idx < i ? "done" : idx === i ? "active" : "pending";
              return (
                <li key={s} className="flex items-center gap-3 font-mono text-xs">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      state === "done" && "border-eclipse-teal/60 bg-eclipse-teal/15 text-eclipse-teal",
                      state === "active" && "border-eclipse-purple/60 bg-eclipse-purple/20 text-eclipse-purple glow-purple",
                      state === "pending" && "border-eclipse-border text-eclipse-muted",
                    )}
                  >
                    {state === "done" ? <Check className="h-3 w-3" /> : state === "active" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  </span>
                  <span className={cn(state === "pending" ? "text-eclipse-muted" : "text-eclipse-text")}>{s}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function DeployedScreen({ name }: { name: string }) {
  useEffect(() => { toast.success("Vault deployed", { description: name }); }, [name]);
  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
        <div className="glass-card w-full p-8">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-eclipse-teal/15 text-eclipse-teal">
            <Check className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-eclipse-text">Vault live</h1>
          <p className="mt-2 text-sm text-eclipse-muted">
            {name} is attested and accepting deposits. Investors can verify its code hash on-chain.
          </p>
          <div className="mt-6 flex gap-2">
            <Link to="/strategist" className="flex-1 rounded-lg border border-eclipse-border py-2.5 text-sm text-eclipse-text hover:border-eclipse-purple/60">
              Strategist dashboard
            </Link>
            <Link to="/vaults" className="flex-1 rounded-lg bg-eclipse-purple py-2.5 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright">
              View marketplace
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
