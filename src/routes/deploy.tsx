import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { AppShell } from "@/components/eclipse/AppShell";
import {
  ALPHA_VAULT,
  PERFORMANCE_LEDGER,
  STRATEGY_REGISTRY,
  ENCLAVE_REGISTRY,
  VAULT_ASSET_ADDRESS,
  ERC20_ABI,
} from "@/lib/contracts";
import { coston2 } from "@/lib/wagmi";
import { useLiveVaults } from "@/hooks/useLiveVaults";
import { useStrategistActivity } from "@/hooks/useStrategistActivity";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { Check, Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/deploy")({
  head: () => ({
    meta: [
      { title: "Deploy a Strategy — Eclipse Protocol" },
      {
        name: "description",
        content: "Configure a strategy and see the real deployment lifecycle.",
      },
      { property: "og:title", content: "Deploy a Strategy — Eclipse Protocol" },
      {
        property: "og:description",
        content: "Configure a strategy and see the real deployment lifecycle.",
      },
    ],
  }),
  component: Deploy,
});

const fmtUSD = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

interface Form {
  name: string;
  desc: string;
  maxPosition: number;
  drawdown: number;
  bond: string;
}

const initial: Form = { name: "", desc: "", maxPosition: 20, drawdown: 20, bond: "" };
const steps = ["Details", "Review"] as const;

function copyText(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

function Deploy() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initial);

  const { vaults, strategyCount } = useLiveVaults();
  const vault = useMemo(
    () => vaults.find((v) => v.vaultAddress.toLowerCase() === ALPHA_VAULT.address.toLowerCase()),
    [vaults],
  );
  const isRegistered = useReadContract({
    ...STRATEGY_REGISTRY,
    functionName: "isRegistered",
    args: [ALPHA_VAULT.address],
  });
  const owner = useReadContract({ ...ALPHA_VAULT, functionName: "owner" });
  const assetSymbol = useReadContract({
    address: VAULT_ASSET_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
  });
  const { registeredSince, enclaveVerifiedAt } = useStrategistActivity(ALPHA_VAULT.address);
  const backend = useBackendStatus();

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function downloadSummary() {
    const summary = {
      note: "Configuration draft — no on-chain action was taken. This build has no factory contract or backend deploy API; a real deployment requires running the team's Foundry scripts against this config.",
      strategyName: form.name || null,
      description: form.desc || null,
      underlyingAsset: VAULT_ASSET_ADDRESS,
      maxPositionSizeBps: form.maxPosition * 100,
      maxDrawdownBps: form.drawdown * 100,
      bondAmountRequested: form.bond || null,
      performanceFeeBps: 1000,
      treasuryFeeBps: 300,
      strategistFeeBps: 700,
      managementFee: "none — this protocol charges zero management fee (fixed in contract)",
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eclipse-deployment-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 pt-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">
          Deploy
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eclipse-text">
          New strategy
        </h1>
        <p className="mt-2 text-eclipse-muted">
          Ship your edge into an enclave. Nobody — not even us — can read your code.
        </p>

        <div className="mt-4 rounded-lg border border-eclipse-gold/30 bg-eclipse-gold/5 p-3 text-xs text-eclipse-text">
          This build has no on-chain factory contract or backend deployment API — deploying a new
          vault today means running the team's Foundry scripts by hand (see{" "}
          <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">
            DEPLOYMENT.md
          </code>
          ). This wizard drafts a real, contract-backed configuration and lets you download it; it
          does not execute a deployment.
        </div>

        {/* Stepper */}
        <div className="mt-6 flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs",
                  i < step && "border-eclipse-teal/50 bg-eclipse-teal/15 text-eclipse-teal",
                  i === step &&
                    "border-eclipse-purple/60 bg-eclipse-purple/20 text-eclipse-text glow-purple",
                  i > step && "border-eclipse-border text-eclipse-muted",
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn("text-xs", i === step ? "text-eclipse-text" : "text-eclipse-muted")}
              >
                {label}
              </span>
              {i < steps.length - 1 && <div className="mx-1 h-px w-6 bg-eclipse-border" />}
            </div>
          ))}
        </div>

        <div className="glass-card mt-6 p-6">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Strategy name">
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Momentum Alpha #7"
                  className={inputCls}
                />
              </Field>
              <Field label="Description (not stored on-chain — for your own reference only)">
                <textarea
                  value={form.desc}
                  onChange={(e) => update("desc", e.target.value)}
                  rows={3}
                  className={inputCls}
                />
              </Field>
              <Field label="Underlying asset (fixed — this deployment's infrastructure is wired to one asset)">
                <input
                  readOnly
                  value={
                    assetSymbol.data
                      ? `${assetSymbol.data} (${VAULT_ASSET_ADDRESS})`
                      : VAULT_ASSET_ADDRESS
                  }
                  className={cn(inputCls, "cursor-not-allowed opacity-70")}
                />
              </Field>
              <SliderField
                label="Max position size (% of TVL) — AlphaVault constructor param"
                value={form.maxPosition}
                min={5}
                max={100}
                onChange={(v) => update("maxPosition", v)}
              />
              <SliderField
                label="Drawdown circuit breaker (%) — AlphaVault constructor param"
                value={form.drawdown}
                min={2}
                max={30}
                onChange={(v) => update("drawdown", v)}
              />
              <div className="rounded-lg border border-eclipse-border bg-eclipse-bg/40 p-3 text-xs text-eclipse-muted">
                Fees are not configurable per strategy:{" "}
                <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">
                  FeeMath
                </code>{" "}
                hardcodes a 10% performance fee (3% treasury / 7% strategist), zero management fee,
                for every vault on this contract version.
              </div>
              <Field label="Bond amount (bond token units)">
                <input
                  value={form.bond}
                  onChange={(e) => update("bond", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="1000"
                  className={inputCls}
                />
              </Field>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3 text-sm">
              <ReviewRow k="Strategy name" v={form.name || "—"} />
              <ReviewRow
                k="Underlying asset"
                v={
                  assetSymbol.data
                    ? `${assetSymbol.data} (${fmtAddr(VAULT_ASSET_ADDRESS)})`
                    : fmtAddr(VAULT_ASSET_ADDRESS)
                }
              />
              <ReviewRow k="Max position size" v={`${form.maxPosition}%`} />
              <ReviewRow k="Drawdown breaker" v={`${form.drawdown}%`} />
              <ReviewRow k="Performance fee (fixed)" v="10% (3% treasury / 7% strategist)" />
              <ReviewRow k="Management fee (fixed)" v="0%" />
              <ReviewRow k="Bond requested" v={form.bond ? form.bond : "—"} />
              <ReviewRow k="Owner wallet" v={address ? fmtAddr(address) : "Not connected"} />
              <div className="pt-2 text-xs text-eclipse-muted">
                Expected contracts: AlphaVault, PerformanceLedger, StrategyRegistry,
                EnclaveRegistry.
              </div>
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
              onClick={downloadSummary}
              className="inline-flex items-center gap-2 rounded-lg bg-eclipse-purple px-5 py-2 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright"
            >
              <Download className="h-4 w-4" /> Download deployment config
            </button>
          )}
        </div>
      </div>

      {/* Real lifecycle status of the one vault that actually exists — not gated on the wizard above */}
      <div className="mx-auto mt-16 max-w-3xl px-6 pb-20">
        <div className="mb-1 text-sm font-semibold text-eclipse-text">
          Current deployment status
        </div>
        <p className="mb-4 text-xs text-eclipse-muted">
          This is the real, live status of the one vault currently deployed — not a simulation of
          the form above.
        </p>

        {/* Step 3/4: Deployment timeline */}
        <div className="glass-card p-5">
          <div className="mb-3 text-sm font-semibold text-eclipse-text">Deployment timeline</div>
          <ul className="space-y-2.5 text-sm">
            <TimelineRow ok={!!vault} label="Strategy contract created (AlphaVault)" />
            <TimelineRow ok={!!vault} label="Vault created" />
            <TimelineRow ok={vault?.epochCount !== undefined} label="Performance Ledger created" />
            <TimelineRow
              ok={vault?.trustChecks.teeVerified}
              label="Enclave registered"
              pendingLabel="Waiting for enclave"
            />
            <TimelineRow
              ok={vault?.trustChecks.teeVerified}
              label="FDC verification"
              pendingLabel="Waiting for FDC verification"
            />
            <TimelineRow
              ok={isRegistered.data === true}
              label="Strategy registered"
              pendingLabel="Waiting for registration"
            />
            <TimelineRow
              ok={
                isRegistered.data === true &&
                vault?.trustChecks.teeVerified &&
                vault?.paused === false
              }
              label="Ready for investors"
              pendingLabel="Not yet ready"
            />
          </ul>
          <div className="mt-3 text-xs text-eclipse-muted">
            {backend.reachable === false
              ? "No backend deployment status available — /status is unreachable."
              : backend.status
                ? "Backend heartbeat reachable."
                : "Checking backend…"}
          </div>
        </div>

        {/* Step 5: Enclave Status */}
        <div className="glass-card mt-5 p-5">
          <div className="mb-3 text-sm font-semibold text-eclipse-text">Enclave status</div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Row
              k="Enclave registry address"
              v={<span className="font-mono text-xs">{ENCLAVE_REGISTRY.address}</span>}
            />
            <Row
              k="Current signer"
              v={
                vault?.enclaveSigner ? (
                  <span className="font-mono text-xs">{vault.enclaveSigner}</span>
                ) : (
                  <Pending label="Pending registration" />
                )
              }
            />
            <Row
              k="FDC verification"
              v={
                vault?.trustChecks.teeVerified ? (
                  "Verified"
                ) : (
                  <Pending label="Pending registration" />
                )
              }
            />
            <Row
              k="Registration status"
              v={
                isRegistered.data === true ? (
                  "Registered"
                ) : isRegistered.isLoading ? (
                  "Checking…"
                ) : (
                  <Pending label="Not yet registered" />
                )
              }
            />
            <Row
              k="Attestation status"
              v={
                vault?.trustChecks.teeVerified ? (
                  "Documented mock claim, FDC-verified on-chain"
                ) : (
                  <Pending label="Pending registration" />
                )
              }
            />
            <Row
              k="Owner"
              v={
                owner.data ? (
                  <span className="font-mono text-xs">{owner.data as string}</span>
                ) : (
                  "Unavailable"
                )
              }
            />
            <Row
              k="Verification timestamp"
              v={
                enclaveVerifiedAt.timestamp !== undefined
                  ? new Date(Number(enclaveVerifiedAt.timestamp) * 1000).toLocaleString()
                  : "Unavailable"
              }
            />
            <Row k="Backend version" v="Not exposed by /status" />
          </dl>
        </div>

        {/* Step 6: Contracts Created */}
        <div className="glass-card mt-5 p-5">
          <div className="mb-3 text-sm font-semibold text-eclipse-text">Contracts created</div>
          <ul className="space-y-2 text-sm">
            <ContractLink label="AlphaVault" address={ALPHA_VAULT.address} exists={!!vault} />
            <ContractLink
              label="PerformanceLedger"
              address={PERFORMANCE_LEDGER.address}
              exists={vault?.epochCount !== undefined}
            />
            <ContractLink
              label="StrategyRegistry entry"
              address={STRATEGY_REGISTRY.address}
              exists={isRegistered.data === true}
            />
            <ContractLink
              label="EnclaveRegistry registration"
              address={ENCLAVE_REGISTRY.address}
              exists={!!vault?.trustChecks.teeVerified}
            />
          </ul>
        </div>

        {/* Step 7: Post-deployment checklist */}
        <div className="glass-card mt-5 p-5">
          <div className="mb-3 text-sm font-semibold text-eclipse-text">
            Post-deployment checklist
          </div>
          <ul className="space-y-2 text-sm">
            <ChecklistRow ok={!!vault} label="Vault deployed" />
            <ChecklistRow ok={isRegistered.data === true} label="Strategy registered" />
            <ChecklistRow ok={!!vault?.trustChecks.bondLocked} label="Bond locked" />
            <ChecklistRow ok={!!vault?.trustChecks.teeVerified} label="Enclave registered" />
            <ChecklistRow ok={!!vault?.trustChecks.teeVerified} label="FDC verified" />
            <ChecklistRow
              ok={isRegistered.data === true && !!vault && vault.paused === false}
              label="Ready for deposits"
            />
          </ul>
        </div>

        {/* Step 8: Investor Readiness */}
        <div className="glass-card mt-5 p-5">
          <div className="mb-3 text-sm font-semibold text-eclipse-text">Investor readiness</div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row
              k="Deposits enabled"
              v={vault?.paused === undefined ? "…" : vault.paused ? "No — vault paused" : "Yes"}
            />
            <Row
              k="Vault paused"
              v={vault?.paused === undefined ? "…" : vault.paused ? "Yes" : "No"}
            />
            <Row
              k="Current TVL"
              v={
                vault?.totalAssets !== undefined && vault.underlyingDecimals !== undefined
                  ? fmtUSD(Number(formatUnits(vault.totalAssets, vault.underlyingDecimals)))
                  : "…"
              }
            />
            <Row
              k="Current share supply"
              v={
                vault?.totalSupply !== undefined && vault.shareDecimals !== undefined
                  ? Number(formatUnits(vault.totalSupply, vault.shareDecimals)).toLocaleString()
                  : "…"
              }
            />
            <Row
              k="Current investors"
              v={
                vault?.totalAssets === 0n
                  ? "Awaiting first investor"
                  : "See Strategist Dashboard for a real count"
              }
            />
            <Row k="Current position" v={vault?.positionSymbol ?? "None (fully in underlying)"} />
          </dl>
        </div>

        {/* Step 9: Next Actions */}
        <div className="glass-card mt-5 p-5">
          <div className="mb-3 text-sm font-semibold text-eclipse-text">Next actions</div>
          <div className="flex flex-wrap gap-3">
            {vault && (
              <Link
                to="/vaults/$id"
                params={{ id: "eclipse-alpha-vault" }}
                className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
              >
                View vault
              </Link>
            )}
            <Link
              to="/strategist"
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              Open strategist dashboard
            </Link>
            <a
              href={`${coston2.blockExplorers.default.url}/address/${ALPHA_VAULT.address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              <ExternalLink className="h-4 w-4" /> View on Blockscout
            </a>
            <button
              onClick={() => copyText(ALPHA_VAULT.address, "Vault address")}
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              <Copy className="h-4 w-4" /> Copy vault address
            </button>
            {vault?.strategistAddress && (
              <button
                onClick={() => copyText(vault.strategistAddress, "Strategy address")}
                className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
              >
                <Copy className="h-4 w-4" /> Copy strategy address
              </button>
            )}
            <button
              onClick={downloadSummary}
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              <Download className="h-4 w-4" /> Download deployment summary
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              <RefreshCw className="h-4 w-4" /> Refresh status
            </button>
          </div>
        </div>

        {/* Step 10: Deployment Summary */}
        <div className="glass-card mt-5 p-5" style={{ background: "#120E1F" }}>
          <div className="mb-3 text-sm font-semibold text-eclipse-text">Deployment summary</div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row
              k="Deployment time"
              v={
                registeredSince.timestamp !== undefined
                  ? new Date(Number(registeredSince.timestamp) * 1000).toLocaleString()
                  : "Unavailable"
              }
            />
            <Row
              k="Owner"
              v={
                owner.data ? (
                  <span className="font-mono text-xs">{fmtAddr(owner.data as string)}</span>
                ) : (
                  "Unavailable"
                )
              }
            />
            <Row
              k="Vault"
              v={<span className="font-mono text-xs">{fmtAddr(ALPHA_VAULT.address)}</span>}
            />
            <Row k="Strategy" v={vault?.name ?? "Unavailable"} />
            <Row
              k="Bond"
              v={
                vault?.bondDecimals !== undefined
                  ? `${Number(formatUnits(vault.bondAmount, vault.bondDecimals)).toLocaleString()} ${vault.bondSymbol ?? ""}`
                  : "Unavailable"
              }
            />
            <Row
              k="Enclave"
              v={
                vault?.enclaveSigner ? (
                  <span className="font-mono text-xs">{fmtAddr(vault.enclaveSigner)}</span>
                ) : (
                  "Not registered"
                )
              }
            />
            <Row
              k="Verification status"
              v={
                vault?.trustChecks.teeVerified
                  ? "FDC-verified (documented-mock attestation claim)"
                  : "Not verified"
              }
            />
            <Row
              k="Current TVL"
              v={
                vault?.totalAssets !== undefined && vault.underlyingDecimals !== undefined
                  ? fmtUSD(Number(formatUnits(vault.totalAssets, vault.underlyingDecimals)))
                  : "…"
              }
            />
            <Row
              k="Status"
              v={
                !vault
                  ? "Not deployed"
                  : vault.paused
                    ? "Paused"
                    : isRegistered.data === true
                      ? "Live"
                      : "Registered"
              }
            />
          </dl>
          {!isConnected && (
            <p className="mt-4 text-xs text-eclipse-muted">
              Connect a wallet to enable owner-gated actions elsewhere on the site.
            </p>
          )}
          {strategyCount === 0 && (
            <p className="mt-4 text-xs text-eclipse-muted">No deployed vaults yet.</p>
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

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-eclipse-muted">{k}</dt>
      <dd className="mt-1 text-sm text-eclipse-text">{v}</dd>
    </div>
  );
}

function Pending({ label }: { label: string }) {
  return <span className="text-eclipse-gold">{label}</span>;
}

function TimelineRow({
  ok,
  label,
  pendingLabel,
}: {
  ok: boolean | undefined;
  label: string;
  pendingLabel?: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[10px]",
          ok
            ? "border-eclipse-teal/60 bg-eclipse-teal/15 text-eclipse-teal"
            : "border-eclipse-border text-eclipse-muted",
        )}
      >
        {ok ? <Check className="h-3 w-3" /> : "◐"}
      </span>
      <span className={cn("text-sm", ok ? "text-eclipse-text" : "text-eclipse-muted")}>
        {ok ? label : (pendingLabel ?? label)}
      </span>
    </li>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[10px]",
          ok
            ? "border-eclipse-teal/60 bg-eclipse-teal/15 text-eclipse-teal"
            : "border-eclipse-border text-eclipse-muted",
        )}
      >
        {ok ? <Check className="h-3 w-3" /> : "—"}
      </span>
      <span className={cn("text-sm", ok ? "text-eclipse-text" : "text-eclipse-muted")}>
        {label}
      </span>
    </li>
  );
}

function ContractLink({
  label,
  address,
  exists,
}: {
  label: string;
  address: string;
  exists: boolean | undefined;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-eclipse-muted">{label}</span>
      {exists ? (
        <a
          href={`${coston2.blockExplorers.default.url}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-eclipse-purple hover:underline"
        >
          {fmtAddr(address)} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-xs text-eclipse-muted">Not deployed</span>
      )}
    </li>
  );
}
