import { EclipseMark } from "./EclipseMark";

const columns = [
  {
    title: "Protocol",
    links: ["Overview", "Vaults", "Strategists", "Ledger"],
  },
  {
    title: "Developers",
    links: ["Contracts", "Enclave runtime", "Relayer", "FDC integration"],
  },
  {
    title: "Resources",
    links: ["Whitepaper", "Attestation", "Github", "Discord"],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-eclipse-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <EclipseMark className="h-6 w-6" />
            <span className="font-serif text-lg italic text-eclipse-text">Eclipse Protocol</span>
          </div>
          <p className="mt-3 text-sm text-eclipse-muted">
            Verifiable alpha, invisible strategy. Built for the Flare Summer Signal Hackathon —
            Bounty 2.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-10 text-sm">
          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-3 text-xs uppercase tracking-wider text-eclipse-muted">
                {col.title}
              </div>
              <ul className="space-y-2 text-eclipse-text/80">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-eclipse-text">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-eclipse-border">
        <div className="mx-auto max-w-7xl px-6 py-5 text-center text-xs uppercase tracking-wider text-eclipse-muted">
          © {new Date().getFullYear()} Eclipse Protocol · Attested by Google Confidential Space ·
          Anchored on Flare
        </div>
      </div>
    </footer>
  );
}
