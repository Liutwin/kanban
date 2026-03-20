/**
 * @file Dashboard.tsx
 * Page principale du tableau Kanban.
 *
 * Orchestration de haut niveau :
 * - Chargement du tableau, colonnes, tâches et membres.
 * - Synchronisation temps réel via WebSocket (`useBoardSocket`).
 * - Gestion du drag & drop déléguée au hook `useDragDrop`.
 * - Délégation du rendu aux composants `KanbanColumn`, modales et `DragMirror`.
 */

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../utils/apiHelpers";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { useDragDrop } from "../hooks/useDragDrop";
import type { Board, Column, Task, User, Member } from "../model/interfaces";
import type { ColumnWithTasks } from "../model/interfaces";
import "../styles/dashboard.css";

import TaskDetailModal    from "../components/TaskDetailModal";
import Tooltip            from "../components/Tooltip";
import { prefetchAvatars } from "../components/UserAvatar";
import { useBoardSocket } from "../hooks/useBoardSocket";
import type { BoardUpdateMessage } from "../model/websockets";

import KanbanColumn      from "../components/kanban/KanbanColumn";
import DragMirror        from "../components/kanban/DragMirror";
import ConfirmModal      from "../components/kanban/ConfirmModal";
import CreateTaskModal   from "../components/kanban/CreateTaskModal";
import CreateColumnModal from "../components/kanban/CreateColumnModal";

export default function Dashboard() {
  const { id }      = useParams<{ id: string }>();
  const boardId     = parseInt(id ?? "", 10);
  const { authFetch, user } = useAuth();
  const navigate    = useNavigate();

  /**
   * Wrapper qui injecte `X-Board-Id` sur toutes les requêtes du Dashboard.
   * Permet au proxy Deno de broadcaster les événements WS même pour les routes
   * `/tasks/…` où le boardId n'apparaît pas dans l'URL.
   */
  const boardFetch = useCallback(
    (url: RequestInfo, init: RequestInit = {}) =>
      authFetch(url, {
        ...init,
        headers: { ...(init.headers ?? {}), "X-Board-Id": String(boardId) },
      }),
    [authFetch, boardId],
  );

  // ── État du tableau ─────────────────────────────────────────────────────────
  const [boardName,       setBoardName]       = useState("");
  const [board_creatorId, setBoardCreatorId]  = useState<number | null>(null);
  const [columns,         setColumns]         = useState<ColumnWithTasks[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [members,         setMembers]         = useState<User[]>([]);
  const [memberRoles,     setMemberRoles]     = useState<Map<number, Member["role"]>>(new Map());
  const [onlineUserIds,   setOnlineUserIds]   = useState<number[]>([]);

  // ── Modales ─────────────────────────────────────────────────────────────────
  const [taskModal,    setTaskModal]    = useState<{ colId: number } | null>(null);
  const [colModal,     setColModal]     = useState(false);
  const [detailTask,   setDetailTask]   = useState<Task | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const askConfirm = (message: string, onConfirm: () => void) =>
    setConfirmModal({ message, onConfirm });

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const [exporting,   setExporting]   = useState(false);
  const [exportError, setExportError] = useState("");

  // ── Édition inline du nom du tableau ────────────────────────────────────────
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameDraft,   setBoardNameDraft]   = useState("");
  const boardNameInputRef = useRef<HTMLInputElement>(null);

  // ── Édition inline des noms de colonnes ─────────────────────────────────────
  const [editingColId, setEditingColId] = useState<number | null>(null);
  const [colNameDraft, setColNameDraft] = useState("");
  const colNameInputRef = useRef<HTMLInputElement>(null);

  // ── Édition inline de la position d'une tâche ───────────────────────────────
  const [editingPosTaskId, setEditingPosTaskId] = useState<number | null>(null);
  const [posDraft,         setPosDraft]         = useState("");

  // ── Recherche / filtres ─────────────────────────────────────────────────────
  const [searchQuery,      setSearchQuery]      = useState("");
  const [searchPriorities, setSearchPriorities] = useState<Set<string>>(new Set());
  const [searchAssignees,  setSearchAssignees]  = useState<Set<number>>(new Set());
  const [hideCompleted,    setHideCompleted]    = useState(false);

  // Ref vers les colonnes courantes (accès stable dans les callbacks WS)
  const columnsRef = useRef<ColumnWithTasks[]>([]);
  useEffect(() => { columnsRef.current = columns; }, [columns]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Chargement
  // ─────────────────────────────────────────────────────────────────────────────

  // Déclaré avec `function` (hoisting) car référencé avant sa définition
  // par `useDragDrop` (qui en a besoin pour le rollback) et par `handleBoardUpdate`.
  async function fetchBoard(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const resBoard = await boardFetch(ROUTES_API.board(boardId), { signal });
      if (!resBoard.ok) throw new Error(await extractErrorMessage(resBoard));
      const board: Board = await resBoard.json();
      setBoardName(board.name);
      setBoardCreatorId(board.creatorId);

      const resCols = await boardFetch(ROUTES_API.columns(boardId), { signal });
      if (!resCols.ok) throw new Error(await extractErrorMessage(resCols));
      const cols: Column[] = await resCols.json();

      const colsWithTasks: ColumnWithTasks[] = await Promise.all(
        cols.map(async col => {
          const resTasks = await boardFetch(ROUTES_API.tasksByColumn(col.id), { signal });
          const tasks: Task[] = resTasks.ok ? await resTasks.json() : [];
          return { ...col, tasks };
        }),
      );
      colsWithTasks.sort((a, b) => a.numero - b.numero);
      setColumns(colsWithTasks);

      // Charge les membres + le créateur pour résoudre les IDs → noms.
      // Le créateur n'est pas forcément dans `participation_ptp`, d'où le fetch séparé.
      const userIdsToFetch = new Set<number>([board.creatorId]);
      const resMembers = await boardFetch(ROUTES_API.boardMembers(boardId), { signal });
      if (resMembers.ok) {
        const memberList: Member[] = await resMembers.json();
        const roles = new Map<number, Member["role"]>();
        memberList.forEach(m => { userIdsToFetch.add(m.userId); roles.set(m.userId, m.role); });
        setMemberRoles(roles);
      }

      const userResults = await Promise.allSettled(
        [...userIdsToFetch].map(uid =>
          boardFetch(ROUTES_API.user(uid), { signal })
            .then(r => r.ok ? r.json() as Promise<User> : null),
        ),
      );
      const resolvedMembers = userResults
        .filter((r): r is PromiseFulfilledResult<User> => r.status === "fulfilled" && r.value != null)
        .map(r => r.value);
      setMembers(resolvedMembers);

      // Précharge les avatars — les <UserAvatar> suivants trouveront le cache chaud.
      prefetchAvatars(resolvedMembers, authFetch);
    } catch (e: unknown) {
      // AbortError = nettoyage du useEffect (StrictMode ou changement de boardId).
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchBoard(controller.signal);
    return () => controller.abort();
  }, [boardId]);

  // ── Drag & drop (hook) ───────────────────────────────────────────────────────
  // `isReadOnly` est calculé après le chargement, mais le hook est initialisé ici.
  // La valeur est dérivée de `currentRole` plus bas et passée au hook en prop.
  const currentRole: Member["role"] = board_creatorId === user?.id
    ? "admin"
    : memberRoles.get(user?.id ?? -1) ?? "lecteur";
  const isReadOnly = currentRole === "lecteur";

  const dnd = useDragDrop({
    columns, setColumns, boardFetch, fetchBoard, boardId, isReadOnly,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Synchronisation WebSocket (rechargements partiels)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Recharge uniquement les tâches de chaque colonne (sans toucher à la structure).
   * Lit depuis `columnsRef` (stable) pour ne pas être une dépendance de
   * `handleBoardUpdate` — ce qui provoquerait une reconnexion WS à chaque update.
   */
  const fetchTasks = useCallback(async () => {
    const current = columnsRef.current;
    const updated = await Promise.all(
      current.map(async col => {
        const res = await boardFetch(ROUTES_API.tasksByColumn(col.id));
        const tasks: Task[] = res.ok ? await res.json() : col.tasks;
        return { ...col, tasks };
      }),
    );
    setColumns(updated);
    // Synchronise la modale de détail si une tâche est ouverte et a été modifiée
    setDetailTask(prev => {
      if (!prev) return null;
      return updated.flatMap(c => c.tasks).find(t => t.id === prev.id) ?? prev;
    });
    // Signal à la modale pour recharger commentaires / fichiers
    window.dispatchEvent(new CustomEvent("kanban:modal-refresh"));
  }, [boardFetch]);

  /**
   * Recharge uniquement la liste des colonnes (sans re-fetcher les tâches).
   * Préserve les tâches déjà chargées pour chaque colonne connue.
   */
  const fetchColumns = useCallback(async () => {
    const res = await boardFetch(ROUTES_API.columns(boardId));
    if (!res.ok) return;
    const cols: Column[] = await res.json();
    setColumns(prev =>
      cols
        .map(col => ({ ...col, tasks: prev.find(c => c.id === col.id)?.tasks ?? [] }))
        .sort((a, b) => a.numero - b.numero),
    );
  }, [boardId, boardFetch]);

  /**
   * Handler WebSocket : route chaque action vers le rechargement minimal approprié.
   *
   * - Tâches / commentaires / fichiers → `fetchTasks` (tâches + synchro modale)
   * - Colonnes                         → `fetchColumns` (structure uniquement)
   * - Membres                          → `fetchBoard`   (rechargement complet, rare)
   */
  const handleBoardUpdate = useCallback((msg: BoardUpdateMessage) => {
    switch (msg.action) {
      case "task_created":
      case "task_updated":
      case "task_deleted":
      case "task_moved":
      case "comment_updated":
      case "file_updated":
        fetchTasks();
        break;
      case "column_created":
      case "column_deleted":
      case "column_moved":
      case "column_updated":
        fetchColumns();
        break;
      case "member_updated":
        fetchBoard();
        break;
    }
  }, [fetchTasks, fetchColumns]);

  useBoardSocket(boardId, {
    onUpdate:      handleBoardUpdate,
    currentUserId: user?.id,
    onPresence:    useCallback((ids: number[]) => setOnlineUserIds(ids), []),
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Recherche / filtres
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{
        query?: string; priorities?: string[]; assigneeIds?: number[];
        priority?: string; assigneeId?: number | ""; hideCompleted?: boolean;
      }>).detail;
      setSearchQuery(d.query ?? "");
      setSearchPriorities(new Set(
        d.priorities?.length ? d.priorities : (d.priority ? [d.priority] : []),
      ));
      setSearchAssignees(new Set(
        d.assigneeIds?.length
          ? d.assigneeIds
          : (typeof d.assigneeId === "number" ? [d.assigneeId] : []),
      ));
      setHideCompleted(d.hideCompleted ?? false);
    };
    window.addEventListener("kanban:search", handler);
    return () => window.removeEventListener("kanban:search", handler);
  }, []);

  /** Filtre les tâches d'une colonne selon les critères de recherche actifs. */
  const filterTasks = useCallback((tasks: Task[], _colId: number) =>
    tasks.filter(t => {
      if (hideCompleted && t.validated) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q && !t.title.toLowerCase().includes(q) && !(t.details ?? "").toLowerCase().includes(q)) return false;
      if (searchPriorities.size > 0 && !searchPriorities.has(t.priority)) return false;
      if (searchAssignees.size > 0 && (t.assignedId == null || !searchAssignees.has(t.assignedId))) return false;
      return true;
    }),
  [searchQuery, searchPriorities, searchAssignees, hideCompleted]);

  const searchActive = searchQuery.trim() !== ""
    || searchPriorities.size > 0
    || searchAssignees.size > 0
    || hideCompleted;

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD tâches
  // ─────────────────────────────────────────────────────────────────────────────

  const handleDeleteTask = (taskId: number) => {
    askConfirm("Supprimer cette tâche ?", async () => {
      const res = await boardFetch(ROUTES_API.task(taskId), { method: "DELETE" });
      if (res.ok) {
        setColumns(cols => cols.map(c => ({ ...c, tasks: c.tasks.filter(t => t.id !== taskId) })));
      } else {
        fetchBoard();
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD colonnes
  // ─────────────────────────────────────────────────────────────────────────────

  const handleDeleteColumn = (colId: number) => {
    askConfirm("Supprimer cette colonne et toutes ses tâches ?", async () => {
      const res = await boardFetch(ROUTES_API.column(boardId, colId), { method: "DELETE" });
      if (res.ok) {
        setColumns(cols => cols.filter(c => c.id !== colId));
      } else {
        fetchBoard();
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Export PDF
  // ─────────────────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setExportError("");
    try {
      const res = await boardFetch(ROUTES_API.boardExport(boardId));
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `kanban-${boardId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Édition inline
  // ─────────────────────────────────────────────────────────────────────────────

  const startEditBoardName = () => { setBoardNameDraft(boardName); setEditingBoardName(true); };

  const commitBoardName = async () => {
    const trimmed = boardNameDraft.trim();
    setEditingBoardName(false);
    if (!trimmed || trimmed === boardName) return;
    const prev = boardName;
    setBoardName(trimmed);
    try {
      const res = await boardFetch(ROUTES_API.board(boardId), {
        method: "PUT", body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) setBoardName(prev);
    } catch { setBoardName(prev); }
  };

  const startEditColName = (col: ColumnWithTasks) => {
    setColNameDraft(col.name);
    setEditingColId(col.id);
  };

  const commitColName = async (col: ColumnWithTasks) => {
    const trimmed = colNameDraft.trim();
    setEditingColId(null);
    if (!trimmed || trimmed === col.name) return;
    const prev = col.name;
    setColumns(cols => cols.map(c => c.id === col.id ? { ...c, name: trimmed } : c));
    try {
      const res = await boardFetch(ROUTES_API.column(boardId, col.id), {
        method: "PUT", body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) setColumns(cols => cols.map(c => c.id === col.id ? { ...c, name: prev } : c));
    } catch { setColumns(cols => cols.map(c => c.id === col.id ? { ...c, name: prev } : c)); }
  };

  useLayoutEffect(() => { if (editingBoardName) boardNameInputRef.current?.focus(); }, [editingBoardName]);
  useLayoutEffect(() => { if (editingColId !== null) colNameInputRef.current?.focus(); }, [editingColId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Layout
      title={boardName || "Tableau"}
      boardId={boardId}
      boardRole={currentRole}
      boardCreatorId={board_creatorId ?? undefined}
      onlineUserIds={onlineUserIds}
    >
      <div className="dashboard-page">
        <button className="back-btn" onClick={() => navigate("/boards")}>
          ← Retour aux tableaux
        </button>

        {/* ── Nom du tableau + actions ────────────────────────────────────── */}
        {boardName && (
          <div className="board-name-heading">
            {editingBoardName ? (
              <input
                ref={boardNameInputRef}
                className="board-name-input"
                value={boardNameDraft}
                maxLength={50}
                onChange={e => setBoardNameDraft(e.target.value)}
                onBlur={commitBoardName}
                onKeyDown={e => {
                  if (e.key === "Enter")  { e.preventDefault(); commitBoardName(); }
                  if (e.key === "Escape") setEditingBoardName(false);
                }}
              />
            ) : currentRole === "admin" ? (
              <Tooltip text="Double-cliquer pour renommer">
                <h1
                  className="board-name-title"
                  onDoubleClick={startEditBoardName}
                  style={{ cursor: "text" }}
                >
                  {boardName}
                </h1>
              </Tooltip>
            ) : (
              <h1 className="board-name-title">{boardName}</h1>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tooltip text="Voir l'historique des actions sur ce tableau">
                <button
                  className="btn btn-ghost"
                  onClick={() => navigate(`/logs/boards/${boardId}`)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M4 5h12M4 10h8M4 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Journal d'activité
                </button>
              </Tooltip>

              <Tooltip text="Télécharger le tableau en PDF">
                <button
                  className="btn btn-ghost"
                  onClick={handleExport}
                  disabled={exporting}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {exporting ? (
                    <span className="spinner" style={{ borderTopColor: "currentColor", width: 14, height: 14 }} />
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  )}
                  {exporting ? "Export…" : "Exporter PDF"}
                </button>
              </Tooltip>
            </div>

            {exportError && (
              <span style={{ fontSize: 13, color: "var(--color-danger, #e24b4a)", marginLeft: 8 }}>
                ⚠ {exportError}
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="loader">
            <span className="spinner" style={{ borderTopColor: "#a3e635" }} /> Chargement…
          </div>
        )}
        {error && <div className="alert alert-error">⚠ {error}</div>}

        {/* ── Colonnes ──────────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="kanban-board">
            {columns.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                isReadOnly={isReadOnly}
                members={members}
                filterTasks={filterTasks}
                searchActive={searchActive}
                onAddTask={() => setTaskModal({ colId: col.id })}
                onDeleteTask={handleDeleteTask}
                onDeleteColumn={() => handleDeleteColumn(col.id)}
                onOpenTask={setDetailTask}
                editingColId={editingColId}
                colNameDraft={colNameDraft}
                setColNameDraft={setColNameDraft}
                colNameInputRef={colNameInputRef}
                onStartEditColName={() => startEditColName(col)}
                onCommitColName={() => commitColName(col)}
                editingPosTaskId={editingPosTaskId}
                setEditingPosTaskId={setEditingPosTaskId}
                posDraft={posDraft}
                setPosDraft={setPosDraft}
                dnd={dnd}
              />
            ))}

            {!isReadOnly && (
              <button className="kanban-col-new" onClick={() => setColModal(true)}>
                + Nouvelle colonne
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modales ─────────────────────────────────────────────────────────── */}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          columnName={columns.find(c => c.id === detailTask.boardColumnId)?.name ?? ""}
          members={members}
          boardId={boardId}
          onClose={() => setDetailTask(null)}
          onEdit={saved => {
            setColumns(cols => cols.map(col => ({
              ...col,
              tasks: col.tasks.map(t => t.id === saved.id ? saved : t),
            })));
            setDetailTask(saved);
          }}
          onDelete={taskId => { setDetailTask(null); handleDeleteTask(taskId); }}
          currentRole={currentRole}
        />
      )}

      {taskModal && user && (
        <CreateTaskModal
          colId={taskModal.colId}
          user={user}
          boardFetch={boardFetch}
          onCreated={task => {
            setColumns(cols => cols.map(c =>
              c.id === taskModal.colId ? { ...c, tasks: [...c.tasks, task] } : c,
            ));
            setTaskModal(null);
          }}
          onClose={() => setTaskModal(null)}
        />
      )}

      {colModal && (
        <CreateColumnModal
          boardId={boardId}
          boardFetch={boardFetch}
          onCreated={col => {
            setColumns(cols => [...cols, { ...col, tasks: [] }]);
            setColModal(false);
          }}
          onClose={() => setColModal(false)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* Ghost de drag personnalisé (remplace le ghost natif du navigateur) */}
      <DragMirror
        dragMirror={dnd.dragMirror}
        mirrorRef={dnd.mirrorRef}
        members={members}
      />
    </Layout>
  );
}
