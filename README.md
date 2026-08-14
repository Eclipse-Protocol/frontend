# Eclipse Protocol — Frontend

The investor- and strategist-facing web app for **Eclipse Protocol**: a confidential asset
management protocol where trading strategies run inside a (documented-mock, see below) attested
enclave, sign trade instructions that are verified on-chain, and build a tamper-evident,
hash-chained performance track record — all independently checkable by anyone, without ever
exposing the strategy itself.

Built for the **Flare Summer Signal Hackathon** — FDC (Flare Data Connector) track.

---

## Live links

- **App**: https://eclipse-protocol-delta.vercel.app/
- **Demo video (YouTube)**: https://youtu.be/lRnY07jnV-M
- **Demo video (Vimeo)**: https://vimeo.com/1218172419
- A local copy of the demo recording is also included in this repo at
  [`Photos_Videos/Eclipse_Protocol_LiveDemo.mp4`](./Photos_Videos/Eclipse_Protocol_LiveDemo.mp4).
- **Network**: Coston2 testnet (chain id `114`) — every number the app shows is a live read from
  Coston2, not mocked or seeded data.

Other repos in this project:
- Contracts: [`Eclipse-Protocol/contracts`](https://github.com/Eclipse-Protocol/contracts) — full
  deployment addresses and incident history in that repo's `DEPLOYMENT.md`.
- Backend (enclave + relayer): [`Eclipse-Protocol/backend`](https://github.com/Eclipse-Protocol/backend)

---

## What this app actually does

- **Marketplace** (`/vaults`) — every registered vault, read live from `StrategyRegistry`, with
  real TVL, price-per-share, return, and an FDC-verification badge. No placeholder vaults.
- **Vault detail** (`/vaults/:id`) — NAV performance chart, live trade feed, hash-chained
  performance ledger (`verifyChain()` checked live), and a real deposit/redeem panel wired
  directly to `AlphaVault`'s ERC-4626 `deposit()`/`redeem()`.
- **Investor dashboard** (`/dashboard`) — a connected wallet's real positions, P&L (only shown
  where it can be honestly computed from on-chain events — labeled "not enough history" rather
  than guessed otherwise), and withdraw action.
- **Strategist dashboard** (`/strategist`) — operational view of the vault: enclave/attestation
  status, trading engine status (polls the relayer's live `/status` heartbeat and log stream),
  security checklist, and owner-gated actions (e.g. resetting the circuit breaker).
- **Deploy** (`/deploy`) — an honest config wizard. There is no on-chain factory contract or
  backend deploy API in this build, so this page does not pretend to deploy anything; it drafts a
  downloadable config and shows the real, live deployment status of the one vault that exists.

## Every claim on screen is independently verifiable

This was a deliberate design constraint, not just a feature list:

- Every numeric value (TVL, price-per-share, epoch count, bond amount, etc.) has a hover tooltip
  naming the exact on-chain read it came from (e.g. `AlphaVault.totalAssets()`).
- Every trust badge links to or names the exact on-chain check backing it — nothing is shown as
  "verified" without a way to verify it yourself.
- A persistent **Coston2 Testnet** badge is always visible so nobody mistakes this for mainnet.

### What's real vs. what's honestly disclosed as mocked

- **Real, on-chain, independently checkable**: FDC (`Web2Json`) attestation verification, enclave
  registration (`EnclaveRegistry.isValidSigner`), every trade (`AlphaVault.submitInstruction`),
  the hash-chained performance ledger, deposits/withdrawals.
- **Documented mock**: the attestation *claim itself* is a locally-generated JSON document with the
  same shape a genuine Google Confidential Space JWT would have — not real confidential-computing
  hardware. This was a deliberate scope cut after hitting a GCP billing wall (see the contracts
  repo's `DEPLOYMENT.md` for the full writeup). The app states this plainly on the Strategist
  dashboard and Docs → Trust page rather than implying genuine hardware attestation.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React, file-based routing, SSR)
- [wagmi](https://wagmi.sh) + [viem](https://viem.sh) for all contract reads/writes
- Tailwind CSS + shadcn/ui (Radix primitives)
- Recharts for NAV/performance charts

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env` with the deployed contract addresses (see `.env.example` — not committed,
gitignored intentionally):

```
VITE_ALPHA_VAULT_ADDRESS=0x0c06133c6F6F843707A239A24903b66b3004E19a
VITE_PERFORMANCE_LEDGER_ADDRESS=0x67f2CaACEf26472226FDe1341c90004A4BE5059a
VITE_STRATEGY_REGISTRY_ADDRESS=0xc1Ee140CAaEb8256bb80aE0E1aeE4bD8BfDC73a8
VITE_ENCLAVE_REGISTRY_ADDRESS=0x2aB29978069dd277B11da118D8fEb160c281A8Ac
VITE_VAULT_ASSET_ADDRESS=<current vault's underlying asset address>
VITE_BACKEND_STATUS_URL=http://localhost:3002/status   # optional — only resolves if the
                                                          # relayer is running on the same machine
```

Cross-check these against the "Deployed contracts (current, live)" table in the contracts repo's
`DEPLOYMENT.md` before trusting them — that file is the single source of truth if this one drifts.

`npm run build` produces a static/SSR build deployable to Vercel (or any Node-compatible host).

## Known limitations (disclosed, not hidden)

- Historical scans (transaction history, trade/harvest feeds) are bounded to a recent block window
  because Coston2's public RPC caps `eth_getLogs` at 30 blocks per call — there's no indexer behind
  this app. The UI labels this explicitly wherever it applies rather than silently showing
  incomplete data as complete.
- An individual investor's portfolio value at a *past* epoch can't be reconstructed from on-chain
  state alone (the performance ledger stores total vault NAV per epoch, not historical share
  supply) — the dashboard says "not enough history" rather than approximating a curve.
