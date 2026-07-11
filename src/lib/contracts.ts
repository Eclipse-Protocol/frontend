import type { Address } from "viem";
import { ALPHA_VAULT_ABI } from "@/abi/alphaVault";
import { PERFORMANCE_LEDGER_ABI } from "@/abi/performanceLedger";
import { Strategy_Registry_ABI } from "@/abi/strategyRegistry";
import { ENCLAVE_REGISTRY_ABI } from "@/abi/enclaveRegistry";

function requiredAddress(value: string | undefined, name: string): Address {
  if (!value) {
    throw new Error(`Missing required env var ${name} — check your .env file`);
  }
  return value as Address;
}

export const ALPHA_VAULT = {
  address: requiredAddress(import.meta.env.VITE_ALPHA_VAULT_ADDRESS, "VITE_ALPHA_VAULT_ADDRESS"),
  abi: ALPHA_VAULT_ABI,
} as const;

export const PERFORMANCE_LEDGER = {
  address: requiredAddress(import.meta.env.VITE_PERFORMANCE_LEDGER_ADDRESS, "VITE_PERFORMANCE_LEDGER_ADDRESS"),
  abi: PERFORMANCE_LEDGER_ABI,
} as const;

export const STRATEGY_REGISTRY = {
  address: requiredAddress(import.meta.env.VITE_STRATEGY_REGISTRY_ADDRESS, "VITE_STRATEGY_REGISTRY_ADDRESS"),
  abi: Strategy_Registry_ABI,
} as const;

export const ENCLAVE_REGISTRY = {
  address: requiredAddress(import.meta.env.VITE_ENCLAVE_REGISTRY_ADDRESS, "VITE_ENCLAVE_REGISTRY_ADDRESS"),
  abi: ENCLAVE_REGISTRY_ABI,
} as const;

export const VAULT_ASSET_ADDRESS = requiredAddress(
  import.meta.env.VITE_VAULT_ASSET_ADDRESS,
  "VITE_VAULT_ASSET_ADDRESS",
);

// Minimal ERC-20 surface needed for the deposit/redeem flow (allowance, approve, decimals, balance).
export const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
