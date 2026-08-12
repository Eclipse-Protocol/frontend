import { useEffect, useState } from "react";

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

export interface BackendStatus {
  vault?: string;
  enclaveSigner?: string;
  isRunning?: boolean;
  lastTickAt?: string;
  lastDecision?: string;
  logs?: LogEntry[];
}

export function useBackendStatus() {
  const url = import.meta.env.VITE_BACKEND_STATUS_URL ?? "http://localhost:3002/status";
  const [status, setStatus] = useState<BackendStatus>();
  const [checkedAt, setCheckedAt] = useState<number>();
  const [reachable, setReachable] = useState<boolean | undefined>(undefined);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSSEConnected, setIsSSEConnected] = useState<boolean>(false);

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
          if (data.logs) {
            setLogs(data.logs);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setReachable(false);
          setCheckedAt(Date.now());
        }
      }
    }

    check();
    const interval = setInterval(check, 5000); // Poll status every 5 seconds

    // SSE connection for real-time logs push
    const sseUrl = `${url}/logs-stream`;
    let eventSource: EventSource | null = null;

    function connectSSE() {
      if (cancelled) return;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        if (!cancelled) {
          setIsSSEConnected(true);
          setReachable(true);
        }
      };

      eventSource.onmessage = (event) => {
        if (!cancelled) {
          try {
            const data = JSON.parse(event.data) as LogEntry[];
            setLogs(data);
          } catch (err) {
            console.error("Failed to parse SSE logs", err);
          }
        }
      };

      eventSource.onerror = () => {
        if (!cancelled) {
          setIsSSEConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Retry connection after 3 seconds
          setTimeout(connectSSE, 3000);
        }
      };
    }

    connectSSE();

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [url]);

  return { status, reachable, checkedAt, url, logs, isSSEConnected };
}
