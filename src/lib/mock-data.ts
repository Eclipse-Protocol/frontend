// The vault-detail route still resolves its one real vault by this fixed id rather than by
// address (see src/routes/vaults.$id.tsx) — kept here as the single source of truth for that id
// now that every other export in this file (the old marketplace/dashboard mock arrays) has been
// replaced by real on-chain data.
export const LIVE_VAULT_ID = "eclipse-alpha-vault";
