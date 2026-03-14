import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import "../styles/logs.css";

// Le journal est stocké en MariaDB via journal_log
// On suppose un endpoint GET /api/logs exposé par Tomcat
interface LogEntry {
  id:          number;
  type:        "creation" | "deplacement" | "modification";
  date:        string;
  description: string;
  auteurId:    number | null;
  tacheId:     number | null;
  tableauId:   number | null;
  tableauNom?: string;
}

interface APIResponse<T> {
  success: boolean;
  data?:   T;
  error?:  { code: string; message: string };
}

const TYPE_ICONS: Record<string, string> = {
  creation:     "✦",
  deplacement:  "⇄",
  modification: "✎",
};

const TYPE_LABELS: Record<string, string> = {
  creation:     "Création",
  deplacement:  "Déplacement",
  modification: "Modification",
};

export default function Logs() {
  const { authFetch } = useAuth();

  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res  = await authFetch("/api/logs");
        const json: APIResponse<LogEntry[]> = await res.json();
        if (!json.success || !json.data) throw new Error(json.error?.message ?? "Erreur.");
        setLogs(json.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = logs.filter(l => {
    const matchType   = filter === "all" || l.type === filter;
    const matchSearch = !search ||
      l.description?.toLowerCase().includes(search.toLowerCase()) ||
      l.auteurPseudo?.toLowerCase().includes(search.toLowerCase()) ||
      l.boardName?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const formatDate = (dt: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(dt));

  return (
    <Layout title="Journal d'activité">
      <div className="logs-page">
        {/* Filters */}
        <div className="logs-toolbar">
          <div className="filter-tabs">
            {["all", "creation", "deplacement", "modification"].map(t => (
              <button
                key={t}
                className={`filter-tab ${filter === t ? "active" : ""}`}
                onClick={() => setFilter(t)}
              >
                {t === "all" ? "Tous" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="form-input"
            style={{ maxWidth: 220 }}
            placeholder="🔍  Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div className="logs-stats">
            {(["creation", "deplacement", "modification"] as const).map(t => {
              const count = logs.filter(l => l.type === t).length;
              return (
                <div key={t} className="stat-chip">
                  <span className={`log-icon log-${t}`}>{TYPE_ICONS[t]}</span>
                  <span className="stat-count">{count}</span>
                  <span className="stat-label">{TYPE_LABELS[t]}{count > 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="loader">
            <span className="spinner" style={{ borderTopColor: "#a3e635" }} /> Chargement…
          </div>
        )}

        {error && <div className="alert alert-error">⚠ {error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">≡</span>
            <p>Aucune entrée trouvée</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="logs-timeline">
            {filtered.map(log => (
              <div key={log.id} className={`log-entry log-entry-${log.type}`}>
                <div className={`log-bullet log-${log.type}`}>
                  {TYPE_ICONS[log.type]}
                </div>
                <div className="log-content">
                  <div className="log-desc">{log.description}</div>
                  <div className="log-meta">
                    {log.auteurPseudo && (
                      <span className="log-author">
                        <span className="log-author-dot" />
                        {log.auteurPseudo}
                      </span>
                    )}
                    {log.tableauNom && (
                      <span className="log-table">▦ {log.boardName}</span>
                    )}
                    <span className="log-date">{formatDate(log.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
