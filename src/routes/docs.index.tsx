import { createFileRoute } from "@tanstack/react-router";
import { Callout, DocsHeader, DocsTable, PrevNext, Section, StatRow, SubHeading } from "@/components/eclipse/DocsUI";
import { EclipseMark } from "@/components/eclipse/EclipseMark";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Introduction — Eclipse Protocol Docs" },
      {
        name: "description",
        content: "Eclipse Protocol is a confidential-compute asset management protocol on Flare: hidden strategy, verifiable performance.",
      },
    ],
  }),
  component: DocsIntro,
});

function DocsIntro() {
  return (
    <div>
      <DocsHeader
        eyebrow="Introduction"
        title="Verifiable alpha. Invisible strategy."
        lede="Eclipse Protocol is a confidential-compute asset management protocol on Flare — trading strategies stay hidden inside a hardware-attested TEE, but every trade and every dollar of performance is cryptographically verifiable on-chain."
      />

      <div className="glass-card mb-14 flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <span className="eclipse-ring-glow shrink-0">
          <EclipseMark className="h-12 w-12" />
        </span>
        <p className="text-sm leading-relaxed text-eclipse-text/85">
          An eclipse hides the light source, but the effect it casts — the shadow, the corona, the measurable
          event — is undeniable and observable by anyone on Earth. That's the whole protocol in one image: the
          strategy is hidden inside the enclave. The alpha it generates is fully public, attested, and
          verifiable. Nobody has to trust the trader's word — they can verify the eclipse happened, down to
          the second, without ever seeing the sun.
        </p>
      </div>

      <StatRow
        items={[
          { label: "Management fee", value: "0%" },
          { label: "Withdrawal fee", value: "0%" },
          { label: "Performance fee", value: "10%" },
          { label: "Hurdle before fees", value: "20%" },
        ]}
      />

      <Section eyebrow="The Standoff" title="The problem">
        <p>
          Two groups in crypto trading have been talking past each other for years.
        </p>
        <p>
          <strong className="text-eclipse-text">Quant traders and strategists</strong> have real, profitable
          edge — but won't share the logic, signals, or model weights that generate it. The moment a strategy
          is published or copy-traded in the open, it gets front-run, reverse-engineered, or arbitraged away
          within days. So the best strategies stay private, off-chain, and largely inaccessible to outside
          capital.
        </p>
        <p>
          <strong className="text-eclipse-text">Investors and allocators</strong> want access to that edge, but
          every on-chain "copy trading" or "signal" platform today asks for blind trust:{" "}
          <em>"deposit your money, trust our black box."</em> There is no way to verify that a strategy's
          historical track record is real, that trades weren't cherry-picked after the fact, or that the same
          signals aren't being front-run by the platform operator itself.
        </p>
        <Callout tone="warning" title="The structural standoff">
          Real alpha stays private and inaccessible to capital. Accessible strategies are rarely the real
          alpha.
        </Callout>
      </Section>

      <Section eyebrow="The Fix" title="The solution">
        <p>
          Eclipse Protocol lets a strategist deploy their trading logic entirely inside a hardware-attested
          Trusted Execution Environment (TEE). The enclave:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-eclipse-purple">
          <li>Ingests market data and strategy state</li>
          <li>Runs the proprietary logic — signals, model, indicators, whatever it is — in complete isolation</li>
          <li>Emits <strong className="text-eclipse-text">only</strong> a signed trade instruction (direction, size, asset pair) — never the logic that produced it</li>
          <li>Maintains a running, tamper-evident performance ledger</li>
        </ul>
        <p>
          Every trade instruction is cryptographically signed by a key that only exists inside an attested
          enclave. Flare smart contracts verify that signature before executing anything, and an on-chain
          performance ledger accumulates a permanent, auditable track record — hash-chained so it cannot be
          edited retroactively.
        </p>
        <SubHeading>What each side gets</SubHeading>
        <DocsTable
          head={["Party", "What they get"]}
          rows={[
            [
              "Investors",
              "A Numerai-style guarantee: mathematical proof the strategy ran inside genuine, unmodified, isolated hardware, and that the performance history is real and untampered — without the strategist revealing a single line of code.",
            ],
            [
              "Strategists",
              "Access to permissionless capital without giving up their edge, and a fee structure that only pays out when they actually deliver.",
            ],
          ]}
        />
      </Section>

      <Section eyebrow="Why a TEE" title="Why this needs a TEE, not just a smart contract">
        <DocsTable
          head={["Requirement", "Why a contract alone can't do it", "What the TEE provides"]}
          rows={[
            [
              "Strategy logic must stay private",
              "All EVM state and calldata is public",
              "Enclave memory is encrypted and isolated from the host, hypervisor, and even Flare validators",
            ],
            [
              "Strategy must still act autonomously on live data",
              "On-chain compute is expensive and public — logic would leak via gas traces / calldata",
              "Enclave runs off-chain compute at full speed, privately, then emits only the final decision",
            ],
            [
              "Investors need to trust the output without trusting the operator",
              "A centralized backend claiming \"trust me\" is exactly the failure mode being replaced",
              "Remote attestation cryptographically proves the exact code that ran, before any output is trusted",
            ],
            [
              "Track record must be provably untampered",
              "A database can be edited after the fact",
              "Enclave-signed, hash-chained performance ledger — any retroactive edit breaks the chain and is publicly detectable",
            ],
          ]}
        />
      </Section>

      <PrevNext next={{ to: "/docs/how-it-works", label: "How It Works" }} />
    </div>
  );
}
