import { createFileRoute } from "@tanstack/react-router";
import { Callout, DocsHeader, DocsTable, PrevNext, Section, SubHeading, TwoUp } from "@/components/eclipse/DocsUI";

export const Route = createFileRoute("/docs/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Security — Eclipse Protocol Docs" },
      { name: "description", content: "What Eclipse Protocol trusts, what it explicitly does not, and how strategist bonding backstops the rest." },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div>
      <DocsHeader
        eyebrow="Trust & Security"
        title="Trust hardware, not humans"
        lede="Eclipse is designed so that the only thing an investor has to trust is a small, well-understood set of cryptographic and hardware primitives — never the strategist, never the platform operator."
      />

      <Section eyebrow="Trust Model" title="What's trusted, and what explicitly isn't">
        <TwoUp
          left={
            <div>
              <div className="mb-3 text-sm font-semibold text-eclipse-teal">Trusted</div>
              <ul className="space-y-2.5 text-sm text-eclipse-text/80">
                <li>Google Confidential Space's hardware attestation (AMD SEV-SNP / Intel TDX) — the same primitive used by Flare's own flare-ai-kit SDK</li>
                <li>Flare's FDC consensus (50%+ signature weight) for bringing the attestation proof on-chain</li>
                <li>Standard EVM contract security assumptions on Flare</li>
              </ul>
            </div>
          }
          right={
            <div>
              <div className="mb-3 text-sm font-semibold text-eclipse-danger">Not trusted / out of scope for MVP</div>
              <ul className="space-y-2.5 text-sm text-eclipse-text/80">
                <li>The relayer — it only forwards signed messages; it never holds the enclave's signing key and cannot forge instructions</li>
                <li>TEE hardware side-channel resistance — a known, disclosed, industry-wide limitation of any TEE system</li>
                <li>Strategist good behavior — backstopped economically via slashable bonding, not assumed</li>
              </ul>
            </div>
          }
        />
      </Section>

      <Section eyebrow="Backstop" title="Strategist bonding">
        <p>
          A relayer forwarding messages and a strategist running private code are both, in principle,
          untrusted parties. The protocol doesn't ask investors to trust either — it removes the relayer from
          the money path entirely (it can't hold funds or forge a signature it doesn't have), and it makes the
          strategist post collateral that is slashed the moment misbehavior is detectable on-chain.
        </p>
        <DocsTable
          head={["Slashing condition", "Why it's detectable on-chain"]}
          rows={[
            ["Enclave signs an instruction that fails risk checks", "AlphaVault enforces max position size and drawdown limits before executing — a violation reverts and is publicly visible"],
            ["Drawdown exceeds the circuit breaker", "PerformanceLedger's hash-chained NAV history makes any abnormal drop immediately observable"],
            ["Code measurement diverges from the registered hash", "EnclaveRegistry only accepts instructions from the exact attested key — a new, unattested key cannot register without repeating the FDC attestation flow"],
          ]}
        />
      </Section>

      <Section eyebrow="Auditability" title="Why the track record can't be faked">
        <p>
          <code className="rounded bg-eclipse-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-eclipse-text">
            PerformanceLedger.sol
          </code>{" "}
          stores epoch results as a hash chain:
        </p>
        <pre className="not-prose my-2 overflow-x-auto rounded-lg border border-eclipse-border bg-eclipse-surface/80 p-4 font-mono text-[12.5px] text-eclipse-text/85">
{`performanceHash[n] = keccak256(performanceHash[n-1], epochResult)`}
        </pre>
        <p>
          Editing any historical epoch changes its hash, which breaks every link after it. Because the chain
          is public and append-only, a retroactive edit is not just disallowed by convention — it is
          mathematically detectable by anyone who recomputes the chain.
        </p>
        <Callout tone="info" title="Numerai-style guarantee">
          Investors can verify the strategy ran inside genuine, unmodified, isolated hardware and that its
          performance history is real and untampered — without the strategist ever revealing a single line of
          code or a single signal.
        </Callout>
      </Section>

      <PrevNext
        prev={{ to: "/docs/architecture", label: "Architecture" }}
        next={{ to: "/docs/fees", label: "Fee Model" }}
      />
    </div>
  );
}
