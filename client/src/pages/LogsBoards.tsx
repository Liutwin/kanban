import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_API } from "../config/api";
import { extractErrorMessage } from "../utils/apiHelpers";
import type { Log } from "../model/interfaces";
import "../styles/logs.css";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

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

const TYPE_ACCENTS: Record<string, string> = {
  creation:     "#b0a6ff",
  deplacement:  "#64d2c8",
  modification: "#fdd663",
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function LogsBoards() {
  const { boardId: boardIdParam } = useParams<{ boardId: string }>();
  const boardId = parseInt(boardIdParam ?? "", 10);
  const { authFetch }  = useAuth();
  const navigate       = useNavigate();
  const authFetchRef   = useRef(authFetch);
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);

  // ── Nom du tableau ────────────────────────────────────────────────────────
  const [boardName, setBoardName] = useState("");

  // ── Journal ───────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError,   setLogsError]   = useState("");

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [search,     setSearch]     = useState("");

  // ─────────────────────────────────────────────────────────────────────────
  // Chargement du nom du tableau
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isNaN(boardId)) return;
    authFetchRef.current(ROUTES_API.board(boardId))
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setBoardName((json?.data ?? json)?.name ?? ""); })
      .catch(() => {});
  }, [boardId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Chargement du journal
  // ─────────────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (type: string, from: string, to: string) => {
    if (isNaN(boardId)) return;
    setLoadingLogs(true);
    setLogsError("");
    try {
      const url = ROUTES_API.boardLogs(
        boardId,
        type !== "all" ? type : undefined,
        from || undefined,
        to   || undefined,
      );
      const res  = await authFetchRef.current(url);
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const json = await res.json();
      setLogs(Array.isArray(json) ? json : (json?.data ?? []));
    } catch (e: unknown) {
      setLogsError(e instanceof Error ? e.message : "Erreur de chargement du journal.");
    } finally {
      setLoadingLogs(false);
    }
  }, [boardId]);

  // Rechargement serveur quand type ou dates changent
  useEffect(() => {
    fetchLogs(typeFilter, dateFrom, dateTo);
  }, [typeFilter, dateFrom, dateTo, fetchLogs]);

  // ─────────────────────────────────────────────────────────────────────────
  // Filtrage local (recherche texte uniquement)
  // ─────────────────────────────────────────────────────────────────────────

  const filteredLogs = logs.filter(l => {
    const q = search.toLowerCase();
    return !q || l.description?.toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const formatDate = (dt: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(dt));

  const pageTitle = boardName ? `Journal — ${boardName}` : "Journal d'activité";

  // ─────────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout title={pageTitle}>
      <div className="logs-page">

        {/* ── Bouton retour ────────────────────────────────────────────── */}
        <button
          className="back-btn"
          onClick={() => navigate(`/boards/${boardId}`)}
          style={{ marginBottom: 16 }}
        >
          ← Retour au tableau
        </button>

        {/* ── Filtres ───────────────────────────────────────────────────── */}
        <div className="logs-toolbar">
          <div className="filter-tabs">
            {(["all", "creation", "deplacement", "modification"] as const).map(t => (
              <button
                key={t}
                className={`filter-tab ${typeFilter === t ? "active" : ""}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "Tous" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="logs-filters-right">
            <label className="logs-date-label">
              Du
              <input
                type="date"
                className="logs-date-input"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </label>
            <label className="logs-date-label">
              Au
              <input
                type="date"
                className="logs-date-input"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                className="logs-date-reset"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                title="Réinitialiser les dates"
              >
                ✕
              </button>
            )}
            <input
              type="text"
              className="form-input"
              style={{ maxWidth: 200 }}
              placeholder="🔍  Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Compteurs rapides ─────────────────────────────────────────── */}
        {!loadingLogs && !logsError && (
          <div className="logs-stats">
            {(["creation", "deplacement", "modification"] as const).map(t => {
              const count = logs.filter(l => l.type === t).length;
              return (
                <div key={t} className="stat-chip">
                  <div className="stat-chip-header">
                    <div className={`stat-icon ${t}`}>{TYPE_ICONS[t]}</div>
                    <span className="stat-count">{count}</span>
                  </div>
                  <span className="stat-label">{TYPE_LABELS[t]}{count > 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Chargement ────────────────────────────────────────────────── */}
        {loadingLogs && (
          <div className="admin-state admin-state--loading" aria-label="Chargement en cours">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="admin-skeleton-row">
                <div className="admin-skeleton" style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="admin-skeleton admin-skeleton--name" />
                  <div className="admin-skeleton admin-skeleton--email" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Erreur ────────────────────────────────────────────────────── */}
        {!loadingLogs && logsError && (
          <div className="admin-state admin-state--error" role="alert">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10" y1="6" x2="10" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="10" cy="14" r="0.8" fill="currentColor"/>
            </svg>
            <p>{logsError}</p>
            <button
              className="admin-btn admin-btn--ghost"
              onClick={() => fetchLogs(typeFilter, dateFrom, dateTo)}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ── Vide ──────────────────────────────────────────────────────── */}
        {!loadingLogs && !logsError && filteredLogs.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">≡</span>
            <p>Aucune entrée trouvée</p>
          </div>
        )}

        {/* ── Timeline ──────────────────────────────────────────────────── */}
        {!loadingLogs && !logsError && filteredLogs.length > 0 && (
          <div className="logs-timeline">
            {filteredLogs.map(log => (
              <div key={log.id} className={`log-entry log-entry-${log.type}`}>
                <div className={`log-bullet log-${log.type}`}>
                  {TYPE_ICONS[log.type]}
                </div>
                <div className="log-content">
                  <div className="log-desc">{log.description ?? "—"}</div>
                  <div className="log-meta">
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: TYPE_ACCENTS[log.type],
                    }}>
                      {TYPE_LABELS[log.type]}
                    </span>
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
