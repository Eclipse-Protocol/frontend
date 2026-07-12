import { createFileRoute } from "@tanstack/react-router";
import { Callout, DocsHeader, DocsTable, PrevNext, Section, SubHeading } from "@/components/eclipse/DocsUI";

export const Route = createFileRoute("/docs/fees")({
  head: () => ({
    meta: [
      { title: "Fee Model — Eclipse Protocol Docs" },
      { name: "description", content: "Eclipse charges one fee, on real profit only: 10% above a 20% hurdle, minted as shares at harvest." },
    ],
  }),
  component: FeesPage,
});

function FeesPage() {
  return (
    <div>
      <DocsHeader
        eyebrow="Fee Model"
        title="One fee. Only on real, new profit."
        lede="No management fee. No listing fee. No withdrawal fee. A single performance fee, charged only above a high-water mark, gated behind a 20% hurdle before the protocol earns anything at all."
      />

      <Section eyebrow="Schedule" title="Fee table">
        <DocsTable
          head={["Fee type", "Rate", "Notes"]}
          rows={[
            ["Management fee", "0%", "Never charged on assets under management"],
            ["Listing fee", "0%", "Free for strategists to deploy a vault"],
            ["Withdrawal fee", "0%", "No penalty or friction on redeeming at any time"],
            ["Performance fee", "10% of new profit above the high-water mark", "Effectively gated behind a 20% hurdle — charged at every harvest(), not at withdrawal"],
            ["— split: Treasury", "3% of gross profit", "Minted as vault shares to the treasury address"],
            ["— split: Strategist", "7% of gross profit", "Minted as vault shares to the strategist's payout address"],
            ["Fee on losses", "0%", "Never charged — only triggers when price-per-share sets a new all-time high"],
          ]}
        />
      </Section>

      <Section eyebrow="Mechanics" title="How it's tracked, in plain terms">
        <p>
          Adapted from the standard global price-per-share high-water-mark pattern used by mature vault
          protocols.
        </p>
        <SubHeading>One NAV, one high-water mark — not tracked per depositor</SubHeading>
        <p>
          The vault's price-per-share (<code className="rounded bg-eclipse-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-eclipse-text">totalAssets() / totalSupply()</code>) is the single source of
          truth. Because ERC-4626 shares already price in the vault's current NAV at the moment of deposit, a
          depositor who joins after a gain automatically buys in at the higher price — they can never be
          charged a fee on profit that happened before they arrived. No per-user cost-basis bookkeeping
          needed.
        </p>
        <SubHeading>The 20% hurdle is the starting point, not a separate rule</SubHeading>
        <p>
          The high-water mark is seeded at vault genesis to <strong className="text-eclipse-text">1.20× the initial price-per-share</strong>, instead of 1.00×. No fee can trigger
          until the vault's price-per-share has grown more than 20% from inception. Once cleared for the first
          time, the mechanism behaves exactly like a standard high-water mark from then on — the hurdle only
          ever matters once.
        </p>
        <SubHeading>Fee triggers at harvest(), not at withdrawal</SubHeading>
        <p>
          Any address can call <code className="rounded bg-eclipse-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-eclipse-text">harvest()</code> — typically the relayer, right after
          the enclave's trade settles. If the new price-per-share exceeds the high-water mark, the fee is
          calculated on that gain and immediately minted as shares — no need to wait for an investor to
          withdraw.
        </p>
        <SubHeading>Paid as minted shares, never cash pulled from the vault</SubHeading>
        <p>
          The fee is never a token transfer out of vault reserves — it's new shares minted to the treasury and
          strategist, diluting all existing holders proportionally. Fee collection never reduces the vault's
          tradeable liquidity, and the treasury/strategist's payout is itself exposed to the vault's future
          performance since they hold shares, not cash, until they choose to redeem.
        </p>
        <SubHeading>The high-water mark only ever moves up</SubHeading>
        <p>
          If the vault dips after a gain and later recovers to the same peak, no fee is charged on that
          recovery — only genuinely new all-time-high profit is fee-eligible.
        </p>
      </Section>

      <Callout tone="info" title="Deliberately conservative">
        This is more conservative than most on-chain vaults and most traditional funds — 2/20 is the
        industry-standard hedge fund model. Eclipse's positioning is intentional: free to use, fee only on
        real new profit, capped at 10%, gated behind a 20% hurdle before the protocol earns anything at all.
      </Callout>

      <PrevNext
        prev={{ to: "/docs/trust", label: "Trust & Security" }}
        next={{ to: "/docs/roadmap", label: "Roadmap" }}
      />
    </div>
  );
}
