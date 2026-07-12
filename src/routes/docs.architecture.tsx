import { createFileRoute } from "@tanstack/react-router";
import {
  Blocks,
  Brain,
  Cpu,
  Database,
  Github,
  LineChart,
  Radio,
  Repeat,
  ShieldCheck,
  Users,
} from "lucide-react";
import { CodeTree, DocsHeader, DocsTable, FlowChain, PrevNext, Section, SubHeading } from "@/components/eclipse/DocsUI";

export const Route = createFileRoute("/docs/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Eclipse Protocol Docs" },
      { name: "description", content: "System overview, smart contracts, project layout, and tech stack behind Eclipse Protocol." },
    ],
  }),
  component: Architecture,
});

function Architecture() {
  return (
    <div>
      <DocsHeader
        eyebrow="Architecture"
        title="Five layers, one signature away from trust"
        lede="Strategy code, a confidential enclave, an attestation relayer, Flare smart contracts, and the investor-facing dashboard — each layer only trusts the one next to it through a cryptographic proof, never through reputation."
      />

      <Section eyebrow="System Overview" title="How the pieces connect">
        <p>
          The strategist's code deploys once into the enclave and never leaves it. From there, market data
          flows in, a signed instruction flows out, and Flare contracts do the rest — execution, ledger,
          fees — before results surface on the investor dashboard.
        </p>
        <FlowChain
          nodes={[
            { icon: Brain, label: "Strategist", note: "private code" },
            { icon: Cpu, label: "Confidential Enclave", note: "TEE runtime + signer" },
            { icon: Radio, label: "Relayer", note: "forwards signed instructions" },
            { icon: Blocks, label: "Flare Contracts", note: "vault · registry · ledger" },
            { icon: Users, label: "Investors", note: "deposit · verify · withdraw" },
          ]}
        />
        <DocsTable
          head={["Component", "Role"]}
          rows={[
            ["Flare FTSO", "Live price feeds the enclave reads for strategy decisions and the vault reads for NAV valuation"],
            ["Flare Data Connector (FDC)", "Brings the enclave's hardware attestation on-chain via consensus-verified Merkle proofs"],
            ["EnclaveRegistry.sol", "The on-chain root of trust — maps attested enclave public keys to strategies"],
            ["AlphaVault.sol", "ERC-4626 vault: deposits, withdrawals, signature-gated trade execution, fee harvest"],
            ["PerformanceLedger.sol", "Append-only, hash-chained record of every epoch's NAV commitment"],
            ["Flare DEX Router", "Executes the swap once a signed instruction clears risk checks"],
          ]}
        />
      </Section>

      <Section eyebrow="Contracts" title="Smart contract architecture">
        <p>
          Built with Foundry on <strong className="text-eclipse-text">OpenZeppelin</strong> primitives wherever
          possible, deployed to Coston2 (Flare testnet) ahead of mainnet.
        </p>

        <SubHeading>Core contracts</SubHeading>
        <DocsTable
          head={["Contract", "Responsibility"]}
          rows={[
            [
              "AlphaVault.sol",
              "ERC-4626-based vault (OpenZeppelin ERC4626). Handles deposits/withdrawals, verifies incoming trade instructions against the registered enclave signer, enforces risk limits (max position size, drawdown breaker via Pausable), executes swaps, and exposes harvest().",
            ],
            [
              "EnclaveRegistry.sol",
              "Stores attested enclave public keys → strategy/vault IDs. One-time registerEnclave() gated on a valid FDC proof; isValidSigner() is called by the vault on every instruction. Uses ECDSA + EIP712 for replay-safe verification.",
            ],
            [
              "PerformanceLedger.sol",
              "Append-only, hash-chained epoch NAV commitments (keccak256(previousHash, epochData)). Kept separate from AlphaVault so the audit trail survives vault upgrades or migrations.",
            ],
            [
              "StrategyRegistry.sol",
              "Strategy metadata, strategist bond/stake (slashable on misbehavior), and vault discovery data for the frontend marketplace.",
            ],
          ]}
        />

        <SubHeading>Libraries & interfaces</SubHeading>
        <DocsTable
          head={["File", "Purpose"]}
          rows={[
            ["FeeMath.sol", "Pure, stateless price-per-share / high-water-mark comparison and 3-7 fee-split math — independently unit-testable, no per-address storage."],
            ["IAlphaVault.sol / IEnclaveRegistry.sol", "Stable ABIs for the frontend, relayer, and any integrating protocol."],
            ["IDexRouter.sol", "Thin interface over the Flare DEX router (Uniswap-V2-style swapExactTokensForTokens shape)."],
            ["IFtsoV2.sol", "Interface over Flare's FTSOv2 price feeds, used for NAV valuation in a common unit."],
            ["IFdcVerification.sol", "Interface over Flare's Data Connector verification contracts, used for the one-time enclave attestation check."],
          ]}
        />

        <SubHeading>External libraries</SubHeading>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-eclipse-purple">
          <li><strong className="text-eclipse-text">OpenZeppelin Contracts</strong> — ERC4626, ERC20, AccessControl/Ownable2Step, ReentrancyGuard, Pausable, ECDSA, EIP712, SafeERC20</li>
          <li><strong className="text-eclipse-text">Flare periphery contracts</strong> — official interfaces/libraries for FTSOv2 and FDC integration</li>
          <li><strong className="text-eclipse-text">forge-std</strong> — Foundry's standard testing library</li>
        </ul>
      </Section>

      <Section eyebrow="Layout" title="Project structure">
        <CodeTree>{`eclipse-protocol/
├── contracts/
│   ├── src/
│   │   ├── core/            AlphaVault · EnclaveRegistry · PerformanceLedger · StrategyRegistry
│   │   ├── libraries/        FeeMath.sol
│   │   ├── interfaces/       IAlphaVault · IEnclaveRegistry · IDexRouter · IFtsoV2 · IFdcVerification
│   │   └── mocks/            MockDexRouter · MockFtsoV2 · MockFdcVerification · MockEnclaveSigner
│   ├── script/               DeployCoston2.s.sol · RegisterEnclave.s.sol
│   └── test/                 unit/ · AlphaVault.t.sol · integration/FullFlow.t.sol
├── enclave/
│   ├── src/                  strategy runtime (TypeScript)
│   └── attestation/           RA-TLS bootstrap logic
├── relayer/
│   └── src/                  signed-instruction submitter
└── frontend/
    ├── app/
    └── components/`}</CodeTree>
      </Section>

      <Section eyebrow="Stack" title="Tech stack">
        <DocsTable
          head={["Layer", "Technology"]}
          rows={[
            ["Confidential compute", "Google Cloud Confidential Space (AMD SEV-SNP / Intel TDX), RA-TLS attestation pattern"],
            ["Enclave runtime", "Node.js / TypeScript strategy runner, containerized (Docker)"],
            ["Smart contracts", "Solidity, Foundry, OpenZeppelin"],
            ["Oracle / attestation bridging", "Flare Data Connector (FDC) JsonApi attestation, Flare FTSOv2 price feeds"],
            ["Execution venue", "Flare-native DEX router (e.g. SparkDEX)"],
            ["Relayer", "Node.js / TypeScript, ethers.js / viem"],
            ["Frontend", "React, TanStack Start/Router, TypeScript, Tailwind CSS, wagmi / viem"],
            ["Network", "Coston2 testnet → Flare mainnet"],
          ]}
        />
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-eclipse-muted">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-eclipse-purple" /> Hardware attestation</span>
          <span className="inline-flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-eclipse-purple" /> Hash-chained ledger</span>
          <span className="inline-flex items-center gap-1.5"><LineChart className="h-3.5 w-3.5 text-eclipse-purple" /> ERC-4626 vaults</span>
          <span className="inline-flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5 text-eclipse-purple" /> Epoch-based execution</span>
          <span className="inline-flex items-center gap-1.5"><Github className="h-3.5 w-3.5 text-eclipse-purple" /> Open-source contracts</span>
        </div>
      </Section>

      <PrevNext
        prev={{ to: "/docs/how-it-works", label: "How It Works" }}
        next={{ to: "/docs/trust", label: "Trust & Security" }}
      />
    </div>
  );
}
