import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_API } from "../config/api";
import { extractErrorMessage } from "../utils/apiHelpers";
import UserAvatar from "../components/UserAvatar";
import { toSlug } from "../utils/slug";
import type { UserProfileDTO, Log, User } from "../model/interfaces";
import "../styles/logs.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types locaux
// ─────────────────────────────────────────────────────────────────────────────

interface LogEntry extends Log {
  boardName?: string;
}

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
// Sous-composant : carte de stat profil
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileStatProps {
  icon:     React.ReactNode;
  value:    number | string;
  label:    string;
  accent:   string;
  loading?: boolean;
}

function ProfileStat({ icon, value, label, accent, loading }: ProfileStatProps) {
  return (
    <div className="admin-stat-card" style={{ "--stat-accent": accent } as React.CSSProperties}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-body">
        {loading
          ? <div className="admin-skeleton admin-skeleton--value" />
          : <span className="admin-stat-value">{value}</span>
        }
        <span className="admin-stat-label">{label}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Logs() {
  const { user, authFetch } = useAuth();
  const { userSlug }        = useParams<{ userSlug?: string }>();
  const navigate             = useNavigate();

  const authFetchRef = useRef(authFetch);
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);

  // ── Résolution de l'utilisateur cible ────────────────────────────────────
  const [targetId,     setTargetId]     = useState<number | null>(null);
  const [resolveError, setResolveError] = useState("");

  // ── Profil ────────────────────────────────────────────────────────────────
  const [profile,        setProfile]        = useState<UserProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError,   setProfileError]   = useState("");

  // ── Journal ───────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError,   setLogsError]   = useState("");

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState("all");
  const [search,     setSearch]     = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Résolution du targetId
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userSlug) {
      if (user?.id) setTargetId(user.id);
      return;
    }
    (async () => {
      setResolveError("");
      try {
        const res  = await authFetchRef.current(ROUTES_API.users);
        if (!res.ok) throw new Error(await extractErrorMessage(res));
        const json = await res.json();
        const all: User[] = Array.isArray(json) ? json : (json?.data ?? []);
        const found = all.find(
          u => `${toSlug(u.firstName)}-${toSlug(u.lastName)}` === userSlug
        );
        if (!found) throw new Error(`Utilisateur introuvable pour « ${userSlug} ».`);
        setTargetId(found.id);
      } catch (e: unknown) {
        setResolveError(e instanceof Error ? e.message : "Utilisateur introuvable.");
        setLoadingProfile(false);
        setLoadingLogs(false);
      }
    })();
  }, [userSlug, user?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Chargement du profil
  // ─────────────────────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async (id: number) => {
    setLoadingProfile(true);
    setProfileError("");
    try {
      const res  = await authFetchRef.current(ROUTES_API.userProfile(id));
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const json = await res.json();
      setProfile((json?.data ?? json) as UserProfileDTO);
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : "Erreur de chargement du profil.");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Chargement du journal
  // ─────────────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (id: number, from?: string, to?: string, type?: string) => {
    setLoadingLogs(true);
    setLogsError("");
    try {
      const url  = ROUTES_API.userLogs(id, type !== "all" ? type : undefined, from || undefined, to || undefined);
      const res  = await authFetchRef.current(url);
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const json = await res.json();
      const raw  = Array.isArray(json) ? json : (json?.data ?? []);
      setLogs(raw as LogEntry[]);
    } catch (e: unknown) {
      setLogsError(e instanceof Error ? e.message : "Erreur de chargement du journal.");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (targetId === null) return;
    fetchProfile(targetId);
    fetchLogs(targetId, dateFrom, dateTo, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  useEffect(() => {
    if (targetId === null) return;
    fetchLogs(targetId, dateFrom, dateTo, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, typeFilter]);

  // ─────────────────────────────────────────────────────────────────────────
  // Filtrage local
  // ─────────────────────────────────────────────────────────────────────────

  const filteredLogs = logs.filter(l => {
    const q = search.toLowerCase();
    return !q
      || l.description?.toLowerCase().includes(q)
      || l.boardName?.toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers d'affichage
  // ─────────────────────────────────────────────────────────────────────────

  const formatDate = (dt: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(dt));

  const formatDateShort = (dt?: string) => {
    if (!dt) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(dt));
  };

  const isSelf    = !userSlug || (user?.id !== undefined && targetId === user.id);
  const pageTitle = isSelf
    ? "Mes activités"
    : profile
      ? `Activités de ${profile.firstName} ${profile.lastName}`
      : "Activités";

  // ─────────────────────────────────────────────────────────────────────────
  // Rendu — erreur de résolution
  // ─────────────────────────────────────────────────────────────────────────

  if (resolveError) {
    return (
      <Layout title="Activités">
        <div className="logs-page">
          <div className="admin-state admin-state--error" role="alert">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10" y1="6" x2="10" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="10" cy="14" r="0.8" fill="currentColor"/>
            </svg>
            <p>{resolveError}</p>
            <button className="admin-btn admin-btn--ghost" onClick={() => navigate("/logs")}>
              Voir mon journal
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rendu principal
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout title={pageTitle}>
      <div className="logs-page">

        {/* ── Carte de profil ──────────────────────────────────────────── */}
        <div className="logs-profile-card">
          <div className="logs-profile-identity">
            {loadingProfile ? (
              <div className="admin-skeleton" style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0 }} />
            ) : (
              <UserAvatar
                userId={profile?.id ?? 0}
                firstName={profile?.firstName ?? ""}
                lastName={profile?.lastName ?? ""}
                hasAvatar={!!profile?.avatarURL}
                size={56}
                className="logs-profile-avatar"
              />
            )}
            <div className="logs-profile-text">
              {loadingProfile ? (
                <>
                  <div className="admin-skeleton" style={{ width: 160, height: 16, borderRadius: 4 }} />
                  <div className="admin-skeleton" style={{ width: 220, height: 12, borderRadius: 4, marginTop: 6 }} />
                </>
              ) : profileError ? (
                <span className="logs-profile-error">{profileError}</span>
              ) : profile ? (
                <>
                  <span className="logs-profile-name">
                    {profile.firstName} {profile.lastName}
                    {profile.admin && (
                      <span className="admin-user-self-tag" style={{ marginLeft: 8 }}>Admin</span>
                    )}
                    {isSelf && (
                      <span className="admin-user-self-tag" style={{ marginLeft: 8 }}>Vous</span>
                    )}
                  </span>
                  <span className="logs-profile-email">{profile.email}</span>
                  {profile.lastActivity && (
                    <span className="logs-profile-activity">
                      Dernière activité : {formatDateShort(profile.lastActivity)}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <div className="admin-stats-grid logs-profile-stats">
            <ProfileStat
              icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><rect x="2" y="3" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/><line x1="7" y1="3" x2="7" y2="17" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5"/><line x1="13" y1="3" x2="13" y2="17" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5"/></svg>}
              value={profile?.boardsCreated   ?? 0} label="Tableaux créés"    accent="#b0a6ff" loading={loadingProfile}
            />
            <ProfileStat
              icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1 17c0-3 2.7-5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M19 17c0-3-2.7-5-6-5s-6 2-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              value={profile?.participations  ?? 0} label="Participations"    accent="#64d2c8" loading={loadingProfile}
            />
            <ProfileStat
              icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><polyline points="7,10 9,12 13,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              value={profile?.tasksCreated    ?? 0} label="Tâches créées"     accent="#81c995" loading={loadingProfile}
            />
            <ProfileStat
              icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              value={profile?.tasksAssigned   ?? 0} label="Tâches assignées"  accent="#fdd663" loading={loadingProfile}
            />
            <ProfileStat
              icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M4 5h12M4 10h8M4 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              value={profile?.actions         ?? 0} label="Actions au total"  accent="#f5a97f" loading={loadingProfile}
            />
          </div>
        </div>

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

        {/* ── Erreur journal ────────────────────────────────────────────── */}
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
              onClick={() => targetId && fetchLogs(targetId, dateFrom, dateTo, typeFilter)}
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
                    {log.boardName && (
                      <span className="log-table">▦ {log.boardName}</span>
                    )}
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