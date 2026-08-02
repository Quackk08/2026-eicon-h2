import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  service: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false, service: "backend unavailable" }));
  }, []);

  return (
    <main className="app-shell">
      <section className="workspace-panel">
        <p className="eyebrow">React + Express workspace</p>
        <h1>26e Icon</h1>
        <p className="summary">
          The frontend and backend are split into separate workspaces, with Vite
          proxying API calls to Express during development.
        </p>
        <div className="status-row">
          <span className={health?.ok ? "status-dot online" : "status-dot"} />
          <span>
            API status: {health ? `${health.service} (${health.ok ? "ok" : "offline"})` : "checking"}
          </span>
        </div>
      </section>
    </main>
  );
}
