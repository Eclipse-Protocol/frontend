import { useEffect, useState } from "react";

export interface BackendStatus {
  vault?: string;
  enclaveSigner?: string;
  lastTickAt?: string;
  lastDecision?: string;
}

/** The relayer's optional `/status` heartbeat only exists when `STATUS_PORT` is set in the
 * backend's `.env` and that process is reachable from wherever this page loads — by default that's
 * only true on the same machine running the loop. Set `VITE_BACKEND_STATUS_URL` to point at a
 * publicly reachable URL if the team exposes one; otherwise this honestly reports unreachable
 * rather than guessing at uptime. */
export function useBackendStatus() {
  const url = import.meta.env.VITE_BACKEND_STATUS_URL ?? "http://localhost:3002/status";
  const [status, setStatus] = useState<BackendStatus>();
  const [checkedAt, setCheckedAt] = useState<number>();
  const [reachable, setReachable] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BackendStatus;
        if (!cancelled) {
          setStatus(data);
          setReachable(true);
          setCheckedAt(Date.now());
        }
      } catch {
        if (!cancelled) {
          setReachable(false);
          setCheckedAt(Date.now());
        }
      }
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [url]);

  return { status, reachable, checkedAt, url };
}
