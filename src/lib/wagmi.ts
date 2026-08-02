import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

const rpcUrl =
  import.meta.env.VITE_COSTON2_RPC_URL ?? "https://coston2-api.flare.network/ext/C/rpc";

export const coston2 = defineChain({
  id: 114,
  name: "Flare Testnet Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://coston2-explorer.flare.network" },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [coston2],
  connectors: [injected()],
  transports: {
    // Coston2 has no Multicall3 deployed at the canonical address, so contract-level multicall
    // isn't available here — JSON-RPC request batching is the closest available equivalent for
    // reducing round trips on pages that read many contracts at once (e.g. the vault marketplace).
    [coston2.id]: http(rpcUrl, { batch: true }),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
