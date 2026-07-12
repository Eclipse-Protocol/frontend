import { createFileRoute } from "@tanstack/react-router";
import { Callout, DocsHeader, PrevNext, Section, Timeline } from "@/components/eclipse/DocsUI";

export const Route = createFileRoute("/docs/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Eclipse Protocol Docs" },
      { name: "description", content: "Enclave attestation, the live trading loop, harvest mechanics, and withdrawals." },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <div>
      <DocsHeader
        eyebrow="How It Works"
        title="Four flows, cryptographically enforced"
        lede="Everything in Eclipse reduces to four sequences: a one-time trust bootstrap, a repeating trading loop, a permissionless fee harvest, and a plain-vanilla withdrawal. Nothing else moves money or state."
      />

      <Section eyebrow="Step 1 — One time" title="Trust bootstrap: enclave attestation">
        <p>
          Before an enclave can ever move funds, it proves — cryptographically, not by promise — that it is
          running genuine, unmodified hardware and the exact code it claims to run. This happens once per
          strategy deployment.
        </p>
        <Timeline
          steps={[
            { from: "Enclave", action: "Boots inside Google Confidential Space (AMD SEV-SNP / Intel TDX)" },
            { from: "Enclave", to: "Google Attestation Service", action: "Requests an attestation token" },
            { from: "Google", to: "Enclave", action: "Returns a signed attestation JWT proving the exact code hash and genuine TEE hardware" },
            { from: "Enclave", action: "Generates an ephemeral signing keypair and binds the public key into the attestation claim", emphasis: true },
            { from: "Enclave", to: "Relayer", action: "Forwards the attestation JWT + enclave public key" },
            { from: "Relayer", to: "Flare Data Connector", action: "Submits a JsonApi attestation request (verifies JWT signature + code measurement)" },
            { from: "FDC", to: "Relayer", action: "Returns a Merkle proof of the verified attestation" },
            { from: "Relayer", to: "EnclaveRegistry.sol", action: "Calls registerEnclave(pubkey, proof)" },
            { from: "EnclaveRegistry", action: "Verifies the FDC proof against the Merkle root and stores the pubkey as a trusted signer", emphasis: true },
          ]}
        />
        <Callout tone="info" title="From this point on">
          Any trade instruction signed by this key is trusted on-chain — no further attestation is needed
          until the strategist redeploys new code.
        </Callout>
      </Section>

      <Section eyebrow="Step 2 — Every epoch" title="The live trading loop">
        <p>
          On a fixed cadence (e.g. every 15 minutes), the enclave reads live prices, runs its private logic,
          and — if it decides to act — signs a single instruction. Everything from signature check to fee
          accounting happens atomically, in one transaction.
        </p>
        <Timeline
          steps={[
            { from: "Enclave", to: "Flare FTSO", action: "Reads the live price feed" },
            { from: "Enclave", action: "Runs the private strategy logic — never observable outside the enclave" },
            { from: "Enclave", action: "Signs a trade instruction {action, asset, size} with its enclave key" },
            { from: "Enclave", to: "Relayer", action: "Sends the signed instruction" },
            { from: "Relayer", to: "AlphaVault.sol", action: "Calls submitInstruction(instruction, signature)", emphasis: true },
            { from: "AlphaVault", action: "Verifies the signature against EnclaveRegistry" },
            { from: "AlphaVault", action: "Checks risk limits — max position size, drawdown circuit breaker" },
            { from: "AlphaVault", to: "Flare DEX Router", action: "Executes the swap" },
            { from: "AlphaVault", to: "PerformanceLedger.sol", action: "Commits epoch NAV + hash-chain link: hash[n] = keccak(hash[n-1], epochResult)" },
            { from: "AlphaVault", action: "Compares new price-per-share to the high-water mark — mints the 3% / 7% fee split only if a new high was set", emphasis: true },
          ]}
        />
        <Callout tone="warning" title="Why the fee check lives inside submitInstruction()">
          Keeping the fee check embedded in the atomic trade path — instead of a separate call — closes the
          window where someone could front-run a pending fee mint by withdrawing right after a NAV update but
          before the fee is settled.
        </Callout>
      </Section>

      <Section eyebrow="Step 3 — Permissionless" title="Standalone harvest (passive NAV drift)">
        <p>
          <code className="rounded bg-eclipse-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-eclipse-text">
            harvest()
          </code>{" "}
          is also exposed as a standalone, permissionless, idempotent function — a no-op if price-per-share
          hasn't exceeded the high-water mark. This covers NAV growth from passive price appreciation on held
          assets between trades, using the exact same fee logic as the atomic path above.
        </p>
        <Timeline
          steps={[
            { from: "Anyone", to: "AlphaVault.sol", action: "Calls harvest()" },
            { from: "AlphaVault", action: "currentPPS = totalAssets() / totalSupply()" },
            { from: "AlphaVault", action: "If currentPPS ≤ highWaterMark — zero fee, no state change" },
            { from: "AlphaVault", action: "If currentPPS > highWaterMark — mints 3% to Treasury, 7% to Strategist, and raises the high-water mark", emphasis: true },
          ]}
        />
      </Section>

      <Section eyebrow="Step 4 — Anytime" title="Withdrawal (standard ERC-4626)">
        <p>
          Withdrawals carry no separate fee logic — any performance fee was already priced in via dilution at
          the most recent harvest.
        </p>
        <Timeline
          steps={[
            { from: "Investor", to: "AlphaVault.sol", action: "Calls redeem(shares)" },
            { from: "AlphaVault", action: "assets = shares × totalAssets() / totalSupply()" },
            { from: "AlphaVault", to: "Investor", action: "Transfers assets — zero withdrawal fee, no lockup" },
          ]}
        />
      </Section>

      <PrevNext
        prev={{ to: "/docs", label: "Introduction" }}
        next={{ to: "/docs/architecture", label: "Architecture" }}
      />
    </div>
  );
}
