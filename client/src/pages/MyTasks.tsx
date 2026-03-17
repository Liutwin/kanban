import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import TaskDetailModal from "../components/TaskDetailModal";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../utils/apiHelpers";
import type { Task, Priority, Board, Column, User } from "../model/interfaces";

// ─────────────────────────────────────────────────────────────────────────────
// Types locaux
// ─────────────────────────────────────────────────────────────────────────────

/** Tâche enrichie avec les informations de sa colonne et de son tableau. */
interface EnrichedTask extends Task {
  boardId:   number;
  boardName: string;
  colName:   string;
}

/** Tableau enrichi du rôle de l'utilisateur, tel que retourné par `GET /api/v1/boards/user/{id}`. */
interface BoardWithRole extends Board {
  role: "admin" | "editeur" | "lecteur";
}

type SortKey  = "dueDate" | "priority" | "board";
type SortDir  = "asc" | "desc";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = { haute: 0, moyenne: 1, basse: 2 };

const priorityColor = (p: Priority) =>
  p === "haute" ? "#f28b82" : p === "moyenne" ? "#fdd663" : "#81c995";

const priorityBg = (p: Priority) =>
  p === "haute" ? "rgba(242,139,130,0.12)" : p === "moyenne" ? "rgba(253,214,99,0.1)" : "rgba(129,201,149,0.08)";

const priorityBorder = (p: Priority) =>
  p === "haute" ? "rgba(242,139,130,0.3)" : p === "moyenne" ? "rgba(253,214,99,0.3)" : "rgba(129,201,149,0.25)";

const priorityLabel = (p: Priority) =>
  p === "haute" ? "↑ Haute" : p === "moyenne" ? "→ Moyenne" : "↓ Basse";

/**
 * Formate une date ISO en chaîne lisible en français.
 * @param dt - Chaîne de date ISO ou null/undefined.
 */
const formatDate = (dt?: string | null) =>
  dt ? new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : null;

/**
 * Retourne `true` si la date est dans le passé.
 * @param dt - Chaîne de date ISO ou null/undefined.
 */
const isOverdue = (dt?: string | null) => !!dt && new Date(dt) < new Date();

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Page centralisant toutes les tâches assignées à l'utilisateur connecté,
 * tous tableaux confondus.
 *
 * Chargement en deux étapes :
 * 1. `GET /api/v1/tasks/assigned/{userId}` — liste des tâches.
 * 2. `GET /api/v1/boards/user/{userId}` + `GET /api/v1/boards/{boardId}/columns`
 *    — résolution des noms de tableau et de colonne pour chaque tâche.
 *
 * Fonctionnalités :
 * - Filtrage par priorité (chips).
 * - Tri par date limite, priorité ou tableau (asc/desc).
 * - Groupement par tableau.
 * - Navigation vers le tableau en cliquant sur une tâche.
 *
 * @returns La page "Mes tâches", wrappée dans {@link Layout}.
 */
export default function MyTasks() {
  const { authFetch, user } = useAuth();
  const navigate            = useNavigate();

  // ── État ──────────────────────────────────────────────────
  const [tasks,      setTasks]      = useState<EnrichedTask[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [detailTask, setDetailTask] = useState<EnrichedTask | null>(null);
  const [members,    setMembers]    = useState<User[]>([]);

  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [sortKey,        setSortKey]        = useState<SortKey>("dueDate");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");
  const [groupByBoard,   setGroupByBoard]   = useState(true);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [hideValidated,  setHideValidated]  = useState(false);

  // ── Chargement ────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    load();
  }, [user?.id]);

  /**
   * Charge les tâches assignées puis les enrichit avec les infos de colonne
   * et de tableau en résolvant l'index `colId → { boardId, boardName, colName }`.
   */
  async function load() {
    setLoading(true);
    setError("");
    try {
      // 1. Tâches assignées à l'utilisateur
      const resTasks = await authFetch(ROUTES_API.tasksByAssigned(user!.id));
      if (!resTasks.ok) throw new Error(await extractErrorMessage(resTasks));
      const rawTasks: Task[] = await resTasks.json();

      if (rawTasks.length === 0) { setTasks([]); return; }

      // 2. Tableaux de l'utilisateur
      const resBoards = await authFetch(ROUTES_API.boardsByUser(user!.id));
      if (!resBoards.ok) throw new Error(await extractErrorMessage(resBoards));
      const boards: BoardWithRole[] = await resBoards.json();

      // 3. Colonnes de chaque tableau en parallèle
      const colIndex = new Map<number, { boardId: number; boardName: string; colName: string }>();
      await Promise.all(
        boards.map(async board => {
          try {
            const resCols = await authFetch(ROUTES_API.columns(board.id));
            if (!resCols.ok) return;
            const cols: Column[] = await resCols.json();
            cols.forEach(col => colIndex.set(col.id, {
              boardId:   board.id,
              boardName: board.name,
              colName:   col.name,
            }));
          } catch { /* silencieux */ }
        })
      );

      // 4. Enrichir les tâches
      const enriched: EnrichedTask[] = rawTasks.map(t => {
        const info = colIndex.get(t.boardColumnId);
        return {
          ...t,
          boardId:   info?.boardId   ?? 0,
          boardName: info?.boardName ?? "Tableau inconnu",
          colName:   info?.colName   ?? "Colonne inconnue",
        };
      });

      setTasks(enriched);

      // 5. Charger les membres de tous les tableaux pour la modale
      const userIds = new Set<number>();
      rawTasks.forEach(t => {
        if (t.creatorId)  userIds.add(t.creatorId);
        if (t.assignedId) userIds.add(t.assignedId);
      });
      if (user?.id) userIds.add(user.id);
      const userResults = await Promise.allSettled(
        [...userIds].map(uid =>
          authFetch(ROUTES_API.user(uid)).then(r => r.ok ? r.json() as Promise<User> : null)
        )
      );
      setMembers(
        userResults
          .filter((r): r is PromiseFulfilledResult<User> => r.status === "fulfilled" && r.value != null)
          .map(r => r.value)
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  // ── Filtrage + tri ────────────────────────────────────────

  const processed = useMemo(() => {
    let list = [...tasks];

    if (filterPriority) list = list.filter(t => t.priority === filterPriority);

    if (hideValidated) list = list.filter(t => !t.validated);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.details ?? "").toLowerCase().includes(q) ||
        t.boardName.toLowerCase().includes(q) ||
        t.colName.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = da - db;
      } else if (sortKey === "priority") {
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      } else if (sortKey === "board") {
        cmp = a.boardName.localeCompare(b.boardName);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [tasks, filterPriority, hideValidated, searchQuery, sortKey, sortDir]);

  /** Tâches groupées par tableau (Map préservant l'ordre d'insertion). */
  const grouped = useMemo(() => {
    const map = new Map<string, EnrichedTask[]>();
    processed.forEach(t => {
      const key = t.boardName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [processed]);

  // ── Helpers UI ────────────────────────────────────────────

  /** Bascule le tri : même clé → inverse la direction, autre clé → asc. */
  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return <span style={{ opacity: 0.3, fontSize: 10 }}>↕</span>;
    return <span style={{ color: "var(--accent)", fontSize: 10 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const overdueCount = tasks.filter(t => isOverdue(t.dueDate)).length;

  // ── Rendu ─────────────────────────────────────────────────

  return (
    <Layout title="Mes tâches">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Barre d'outils ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

          {/* Champ de recherche */}
          <div className="search-wrapper">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher une tâche…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Rechercher une tâche"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")} aria-label="Effacer la recherche">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Chips priorité */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterPriority("")}
              style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: filterPriority === "" ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: filterPriority === "" ? "var(--accent-dim)" : "var(--surface2)", border: `1px solid ${filterPriority === "" ? "rgba(176,166,255,0.35)" : "var(--border2)"}`, color: filterPriority === "" ? "var(--accent)" : "var(--text-3)" }}
            >
              Toutes ({tasks.length})
            </button>
            {(["haute", "moyenne", "basse"] as Priority[]).map(p => {
              const count = tasks.filter(t => t.priority === p).length;
              const active = filterPriority === p;
              return (
                <button key={p}
                  onClick={() => setFilterPriority(active ? "" : p)}
                  style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: active ? priorityBg(p) : "var(--surface2)", border: `1px solid ${active ? priorityBorder(p) : "var(--border2)"}`, color: active ? priorityColor(p) : "var(--text-3)" }}
                >
                  {priorityLabel(p)} ({count})
                </button>
              );
            })}
          </div>

          {/* Contrôles tri + groupement */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Trier par</span>
            {([["dueDate", "Date"], ["priority", "Priorité"], ["board", "Tableau"]] as [SortKey, string][]).map(([key, label]) => (
              <button key={key}
                onClick={() => handleSort(key)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: sortKey === key ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: sortKey === key ? "var(--accent-dim)" : "var(--surface2)", border: `1px solid ${sortKey === key ? "rgba(176,166,255,0.3)" : "var(--border2)"}`, color: sortKey === key ? "var(--accent)" : "var(--text-3)" }}
              >
                {label} {sortIcon(key)}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: "var(--border2)" }} />
            <button
              onClick={() => setGroupByBoard(g => !g)}
              style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: groupByBoard ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: groupByBoard ? "var(--accent-dim)" : "var(--surface2)", border: `1px solid ${groupByBoard ? "rgba(176,166,255,0.3)" : "var(--border2)"}`, color: groupByBoard ? "var(--accent)" : "var(--text-3)" }}
            >
              Grouper par tableau
            </button>
            <div style={{ width: 1, height: 20, background: "var(--border2)" }} />
            <button
              onClick={() => setHideValidated(v => !v)}
              title={hideValidated ? "Afficher aussi les tâches terminées" : "Masquer les tâches terminées"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 999, fontSize: 12,
                fontWeight: hideValidated ? 600 : 400, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
                background: hideValidated ? "rgba(129,201,149,0.12)" : "var(--surface2)",
                border: `1px solid ${hideValidated ? "rgba(129,201,149,0.35)" : "var(--border2)"}`,
                color: hideValidated ? "#81c995" : "var(--text-3)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                {hideValidated ? (
                  <path d="M1 6l3 3 7-7" stroke="#81c995" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <>
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </>
                )}
              </svg>
              {hideValidated ? "Terminées masquées" : "Masquer terminées"}
            </button>
          </div>
        </div>
        </div>

        {/* ── Alerte retard ── */}
        {!loading && overdueCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: "var(--radius)", background: "rgba(242,139,130,0.08)", border: "1px solid rgba(242,139,130,0.2)", color: "#f28b82", fontSize: 13 }}>
            <span>⚠</span>
            <span>{overdueCount} tâche{overdueCount > 1 ? "s" : ""} en retard</span>
          </div>
        )}

        {/* ── Contenu ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 0", color: "var(--text-3)", fontSize: 13 }}>
            <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--text-3)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Chargement…
          </div>
        ) : error ? (
          <div style={{ padding: "16px", borderRadius: "var(--radius)", background: "rgba(242,139,130,0.08)", border: "1px solid rgba(242,139,130,0.2)", color: "#f28b82", fontSize: 13 }}>
            ⚠ {error}
          </div>
        ) : processed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-3)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>
              {filterPriority ? "Aucune tâche pour ce filtre" : hideValidated ? "Toutes les tâches sont terminées" : "Aucune tâche assignée"}
            </p>
            <p style={{ fontSize: 13 }}>
              {filterPriority ? "Essayez un autre filtre." : hideValidated ? "Désactivez le filtre pour les afficher." : "Vous n'avez pas de tâche assignée pour le moment."}
            </p>
          </div>
        ) : groupByBoard ? (
          /* ── Vue groupée par tableau ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[...grouped.entries()].map(([boardName, boardTasks]) => {
              const boardId = boardTasks[0]?.boardId;
              return (
                <div key={boardName}>
                  {/* En-tête groupe */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <button
                      onClick={() => boardId && navigate(`/boards/${boardId}`)}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: boardId ? "pointer" : "default", padding: 0, fontFamily: "inherit" }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.01em" }}>{boardName}</span>
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'DM Mono', monospace" }}>{boardTasks.length}</span>
                    </button>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  </div>

                  {/* Tâches du groupe */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {boardTasks.map(task => <TaskRow key={task.id} task={task} onOpen={() => setDetailTask(task)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Vue liste plate ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {processed.map(task => (
              <TaskRow key={task.id} task={task} showBoard onOpen={() => setDetailTask(task)} />
            ))}
          </div>
        )}

      </div>

      {/* ── Modale détail tâche ── */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          columnName={detailTask.colName}
          members={members}
          onClose={() => setDetailTask(null)}
          onEdit={saved => {
            setTasks(prev => prev.map(t => t.id === saved.id ? { ...t, ...saved } : t));
            setDetailTask(prev => prev !== null ? { ...prev, ...saved } : null);
          }}
          onDelete={taskId => {
            setDetailTask(null);
            setTasks(prev => prev.filter(t => t.id !== taskId));
          }}
          currentRole="editeur"
        />
      )}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant ligne de tâche
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ligne représentant une tâche dans la liste "Mes tâches".
 *
 * @param task      - La tâche enrichie à afficher.
 * @param showBoard - Si `true`, affiche le nom du tableau (vue liste plate).
 * @param onOpen    - Callback déclenché au clic pour ouvrir la modale de détail.
 */
function TaskRow({ task, showBoard, onOpen }: {
  task: EnrichedTask;
  showBoard?: boolean;
  onOpen: () => void;
}) {
  const overdue = isOverdue(task.dueDate);
  const date    = formatDate(task.dueDate);
  const navigate = useNavigate();

  return (
    <div
      onClick={onOpen}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: "var(--elev-1)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--border2)";
        e.currentTarget.style.background  = "var(--surface2)";
        e.currentTarget.style.transform   = "translateY(-1px)";
        e.currentTarget.style.boxShadow   = "var(--elev-2)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background  = "var(--surface)";
        e.currentTarget.style.transform   = "none";
        e.currentTarget.style.boxShadow   = "var(--elev-1)";
      }}
    >
      {/* Badge priorité */}
      <span style={{
        padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: priorityBg(task.priority),
        border: `1px solid ${priorityBorder(task.priority)}`,
        color: priorityColor(task.priority),
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {priorityLabel(task.priority)}
      </span>

      {/* Titre + fil d'Ariane */}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: task.validated ? "#81c995" : "var(--text)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
          {task.validated && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="6.5" cy="6.5" r="6" fill="rgba(129,201,149,0.15)" stroke="rgba(129,201,149,0.4)" strokeWidth="1"/>
              <path d="M3.5 6.5l2 2 4-4" stroke="#81c995" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
        </p>
        <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {showBoard && <><span style={{ color: "var(--accent)", fontWeight: 500 }}>{task.boardName}</span> › </>}
          {task.colName}
        </p>
      </div>

      {/* Date limite */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {date ? (
          <>
            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: overdue ? "#f28b82" : "var(--text-3)", fontWeight: overdue ? 600 : 400 }}>
              ⏰ {date}
            </span>
            {overdue && (
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#f28b82", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>
                En retard
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", opacity: 0.5 }}>—</span>
        )}
      </div>

      {/* Bouton naviguer vers le tableau */}
      <button
        onClick={e => { e.stopPropagation(); navigate(`/boards/${task.boardId}`); }}
        title="Voir le tableau"
        style={{ background: "none", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text-3)", cursor: "pointer", fontSize: 13, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(176,166,255,0.35)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.background = "none"; }}
      >
        →
      </button>
    </div>
  );
}