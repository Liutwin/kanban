import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../utils/apiHelpers";
import Layout from "../components/Layout";
import { getAvatarStyle } from "../utils/avatarColor";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import type { Board, Column, Task, Priority, User, Member } from "../model/interfaces";
import "../styles/dashboard.css";
import TaskDetailModal from "../components/TaskDetailModal";
import Tooltip from "../components/Tooltip";
import UserAvatar, { prefetchAvatars } from "../components/UserAvatar";
import { useBoardSocket } from "../hooks/useBoardSocket";
import type { BoardUpdateMessage } from "../model/websockets";

interface ColumnWithTasks extends Column {
  tasks: Task[];
}

export default function Dashboard() {
  const { id }        = useParams<{ id: string }>();
  const boardId       = parseInt(id ?? "", 10);
  console.log("boardId =", boardId, "isNaN =", isNaN(boardId));
  const { authFetch, user } = useAuth();

  // Wrapper qui injecte X-Board-Id sur toutes les requêtes du Dashboard,
  // permettant à Deno de broadcaster même pour les routes /tasks/...
  // où le boardId n'apparaît pas dans l'URL.
  const boardFetch = useCallback(
    (url: RequestInfo, init: RequestInit = {}) =>
      authFetch(url, {
        ...init,
        headers: { ...(init.headers ?? {}), "X-Board-Id": String(boardId) },
      }),
    [authFetch, boardId]
  );
  const navigate      = useNavigate();

  const [boardName, setBoardName] = useState("");
  const [board_creatorId, setBoardCreatorId] = useState<number | null>(null);
  const [columns, setColumns]     = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // Membres du tableau (pour résoudre creatorId/assignedId → prénom nom)
  const [members, setMembers] = useState<User[]>([]);
  // Rôles des membres (userId → role) pour contrôle d'accès frontend
  const [memberRoles, setMemberRoles] = useState<Map<number, Member["role"]>>(new Map());

  // Modale tâche
  const [taskModal, setTaskModal] = useState<{ colId: number } | null>(null);
  const [taskForm, setTaskForm]   = useState({
    title: "", details: "", dueDate: "", dueTime: "", priority: "moyenne" as Priority,
  });
  const [saving, setSaving]       = useState(false);
  const [taskError, setTaskError] = useState("");

  // Modale de confirmation de suppression générique
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirm = (message: string, onConfirm: () => void) =>
    setConfirmModal({ message, onConfirm });

  useEffect(() => {
    if (!confirmModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setConfirmModal(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [confirmModal]);

  // Modale détail tâche
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Mirror de drag : state pour afficher/masquer + contenu, ref pour la position (sans re-render)
  const [dragMirror, setDragMirror] = useState<{ ox: number; oy: number; width: number; kind: "task"; task: Task } | { ox: number; oy: number; width: number; kind: "col"; col: ColumnWithTasks } | null>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  // Drag & drop tâches
  const [dragTask, setDragTask]         = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<{ colId: number; beforeTaskId: number | null } | null>(null);
  const dragTaskRef = useRef<Task | null>(null);

  // Drag & drop colonnes
  const [dragCol, setDragCol]         = useState<ColumnWithTasks | null>(null);
  const [dragColOver, setDragColOver] = useState<number | null>(null);
  const dragColRef = useRef<ColumnWithTasks | null>(null);
  const colDropTargetRef = useRef<ColumnWithTasks | null>(null);

  /* ── Recherche ───────────────────────────────────────────── */
  const [searchQuery,      setSearchQuery]      = useState("");
  const [searchPriorities, setSearchPriorities] = useState<Set<string>>(new Set());
  const [searchAssignees,  setSearchAssignees]  = useState<Set<number>>(new Set());
  const [hideCompleted,    setHideCompleted]    = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{
        query: string;
        priorities?: string[];
        assigneeIds?: number[];
        priority?: string;
        assigneeId?: number | "";
        hideCompleted?: boolean;
      }>).detail;
      setSearchQuery(d.query ?? "");
      setSearchPriorities(new Set(d.priorities?.length ? d.priorities : (d.priority ? [d.priority] : [])));
      setSearchAssignees(new Set(
        d.assigneeIds?.length
          ? d.assigneeIds
          : (d.assigneeId && d.assigneeId !== "" ? [d.assigneeId as number] : [])
      ));
      setHideCompleted(d.hideCompleted ?? false);
    };
    window.addEventListener("kanban:search", handler);
    return () => window.removeEventListener("kanban:search", handler);
  }, []);

  /** Filtre les tâches d'une colonne selon la recherche en cours. */
  const filterTasks = useCallback((tasks: Task[], colId: number) => {
    return tasks.filter(t => {
      if (hideCompleted && t.validated) return false;
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(t.details ?? "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (searchPriorities.size > 0 && !searchPriorities.has(t.priority)) return false;
      if (searchAssignees.size > 0 && (t.assignedId == null || !searchAssignees.has(t.assignedId))) return false;
      return true;
    });
  }, [searchQuery, searchPriorities, searchAssignees, hideCompleted]);
  const columnsSnapshot   = useRef<ColumnWithTasks[]>([]);
  const columnsRef = useRef<ColumnWithTasks[]>([]);
  useEffect(() => { columnsRef.current = columns; }, [columns]);
  const didDrop           = useRef(false);
  const lastLiveTaskKey   = useRef<string>("");

  // Colonnes
  const [colModal, setColModal]   = useState(false);
  const [colName, setColName]     = useState("");
  const [colError, setColError]   = useState("");
  const [colSaving, setColSaving] = useState(false);

  // Export PDF
  const [exporting, setExporting]     = useState(false);
  const [exportError, setExportError] = useState("");

  // Édition inline du nom du tableau (admin uniquement)
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameDraft, setBoardNameDraft]     = useState("");
  const boardNameInputRef = useRef<HTMLInputElement>(null);

  // Édition inline des noms de colonnes (admin + éditeur)
  const [editingColId, setEditingColId]   = useState<number | null>(null);
  const [colNameDraft, setColNameDraft]   = useState("");
  const colNameInputRef = useRef<HTMLInputElement>(null);

  // Édition inline de la position d'une tâche
  const [editingPosTaskId, setEditingPosTaskId] = useState<number | null>(null);
  const [posDraft,         setPosDraft]         = useState("");

  // Présence temps réel : userId des membres actuellement connectés au tableau
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

  /* ── Chargement ──────────────────────────────────────────── */

  const fetchBoard = async (signal?: AbortSignal) => {
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
        })
      );

      colsWithTasks.sort((a, b) => a.numero - b.numero);
      setColumns(colsWithTasks);

      // Charger les membres + le créateur du tableau pour résoudre
      // creatorId/assignedId -> prénom nom dans TaskDetailModal.
      // Le créateur du tableau n'est pas forcément dans participation_ptp,
      // d'où le fetch séparé sur board.creatorId.
      const userIdsToFetch = new Set<number>();
      userIdsToFetch.add(board.creatorId);

      const resMembers = await boardFetch(ROUTES_API.boardMembers(boardId), { signal });
      if (resMembers.ok) {
        const memberList: Member[] = await resMembers.json();
        const roles = new Map<number, Member["role"]>();
        memberList.forEach(m => { userIdsToFetch.add(m.userId); roles.set(m.userId, m.role); });
        setMemberRoles(roles);
      }

      const userResults = await Promise.allSettled(
        [...userIdsToFetch].map(uid =>
          boardFetch(ROUTES_API.user(uid), { signal }).then(r => r.ok ? r.json() as Promise<User> : null)
        )
      );
      const resolvedMembers = userResults
          .filter((r): r is PromiseFulfilledResult<User> => r.status === "fulfilled" && r.value != null)
          .map(r => r.value);
      setMembers(resolvedMembers);

      // Précharge tous les avatars en parallèle dès que la liste est connue.
      // Les <UserAvatar> montés ensuite trouveront le cache déjà chaud.
      prefetchAvatars(resolvedMembers, authFetch);
    } catch (e: unknown) {
      // Requête annulée par le nettoyage du useEffect (StrictMode ou
      // changement de boardId) : on ignore silencieusement.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchBoard(controller.signal);
    return () => controller.abort();
  }, [boardId]);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (mirrorRef.current) {
        mirrorRef.current.style.left = `${e.clientX - dragMirror!.ox}px`;
        mirrorRef.current.style.top  = `${e.clientY - dragMirror!.oy}px`;
      }
    };
    // Phase de capture : s'exécute avant tout stopPropagation des enfants
    const onDragEnd = () => setDragMirror(null);
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("dragend",  onDragEnd,  true);
    return () => {
      document.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("dragend",  onDragEnd,  true);
    };
  }, [dragMirror]);

  /* ── CRUD tâches ─────────────────────────────────────────── */

  const openCreateTask = (colId: number) => {
    setTaskForm({ title: "", details: "", dueDate: "", dueTime: "", priority: "moyenne" });
    setTaskError("");
    setTaskModal({ colId });
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError("");
    if (!taskForm.title.trim()) { setTaskError("Le titre est requis."); return; }
    setSaving(true);
    try {
      const body = {
        title:         taskForm.title.trim(),
        details:       taskForm.details || null,
        dueDate:       taskForm.dueDate
          ? taskForm.dueTime
            ? `${taskForm.dueDate}T${taskForm.dueTime}`
            : `${taskForm.dueDate}T23:59`
          : null,
        priority:      taskForm.priority,
        boardColumnId: taskModal!.colId,
        creatorId:     user!.id,
      };
      const res = await boardFetch(ROUTES_API.tasks, { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const savedTask: Task = await res.json();
      setColumns(cols => cols.map(c =>
        c.id === taskModal!.colId ? { ...c, tasks: [...c.tasks, savedTask] } : c
      ));
      setTaskModal(null);
    } catch (e: unknown) {
      setTaskError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    askConfirm("Supprimer cette tâche ?", async () => {
      const res = await boardFetch(ROUTES_API.task(taskId), { method: "DELETE" });
      if (res.ok) {
        setColumns(cols => cols.map(c => ({ ...c, tasks: c.tasks.filter(t => t.id !== taskId) })));
      } else {
        fetchBoard();
      }
    });
  };

  /* ── Colonnes ────────────────────────────────────────────── */

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    setColError("");
    if (!colName.trim()) { setColError("Le nom est requis."); return; }
    setColSaving(true);
    try {
      const res = await boardFetch(ROUTES_API.columns(boardId), {
        method: "POST",
        body: JSON.stringify({ name: colName.trim() }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const newCol: Column = await res.json();
      setColumns(cols => [...cols, { ...newCol, tasks: [] }]);
      setColModal(false);
      setColName("");
    } catch (e: unknown) {
      setColError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setColSaving(false);
    }
  };

  const handleDeleteColumn = async (colId: number) => {
    askConfirm("Supprimer cette colonne et toutes ses tâches ?", async () => {
      const res = await boardFetch(ROUTES_API.column(boardId, colId), { method: "DELETE" });
      if (res.ok) {
        setColumns(cols => cols.filter(c => c.id !== colId));
      } else {
        fetchBoard();
      }
    });
  };


  /* u2500u2500 Export PDF u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500 */

  const handleExport = async () => {
    setExporting(true);
    setExportError("");
    try {
      const res = await boardFetch(ROUTES_API.boardExport(boardId));
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `kanban-${boardId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  /* ── Édition inline du nom du tableau ───────────────────── */

  const startEditBoardName = () => {
    setBoardNameDraft(boardName);
    setEditingBoardName(true);
  };

  const commitBoardName = async () => {
    const trimmed = boardNameDraft.trim();
    setEditingBoardName(false);
    if (!trimmed || trimmed === boardName) return;
    const prev = boardName;
    setBoardName(trimmed);
    try {
      const res = await boardFetch(ROUTES_API.board(boardId), {
        method: "PUT",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) { setBoardName(prev); }
    } catch { setBoardName(prev); }
  };

  /* ── Édition inline du nom d'une colonne ────────────────── */

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
        method: "PUT",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) { setColumns(cols => cols.map(c => c.id === col.id ? { ...c, name: prev } : c)); }
    } catch { setColumns(cols => cols.map(c => c.id === col.id ? { ...c, name: prev } : c)); }
  };

  /* ── Drag & drop ─────────────────────────────────────────── */

  const reorderTaskLive = (targetColId: number, task: Task, targetTaskId?: number) => {
    const key = `${targetColId}-${targetTaskId ?? "end"}`;
    if (lastLiveTaskKey.current === key) return;
    lastLiveTaskKey.current = key;

    const snap       = columnsSnapshot.current;
    const sameColumn = task.boardColumnId === targetColId;
    const targetCol  = snap.find(c => c.id === targetColId);
    if (!targetCol) return;

    const tasksWithoutDragged = sameColumn
      ? targetCol.tasks.filter(t => t.id !== task.id)
      : targetCol.tasks;

    let targetIndex: number;
    if (targetTaskId != null) {
      const filteredIdx = tasksWithoutDragged.findIndex(t => t.id === targetTaskId);
      if (sameColumn) {
        targetIndex = filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx;
      } else {
        targetIndex = filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx;
      }
    } else {
      targetIndex = tasksWithoutDragged.length;
    }
    const position = targetIndex;

    setColumns(snap.map(c => {
      if (sameColumn && c.id === targetColId) {
        const reordered = c.tasks.filter(t => t.id !== task.id);
        reordered.splice(position, 0, { ...task, position });
        return { ...c, tasks: reordered.map((t, i) => ({ ...t, position: i })) };
      }
      if (!sameColumn) {
        if (c.id === task.boardColumnId) return { ...c, tasks: c.tasks.filter(t => t.id !== task.id) };
        if (c.id === targetColId) {
          const inserted = [...c.tasks];
          inserted.splice(position, 0, { ...task, boardColumnId: targetColId, position });
          return { ...c, tasks: inserted.map((t, i) => ({ ...t, position: i })) };
        }
      }
      return c;
    }));
  };

  const handleDrop = (targetColId: number, task: Task, targetTaskId?: number) => {
    didDrop.current = true;
    setDragTask(null);

    const snap       = columnsSnapshot.current;
    const sameColumn = task.boardColumnId === targetColId;
    const targetCol  = snap.find(c => c.id === targetColId);
    if (!targetCol) return;

    const tasksWithoutDragged = sameColumn
      ? targetCol.tasks.filter(t => t.id !== task.id)
      : targetCol.tasks;

    let targetIndex: number;
    if (targetTaskId != null) {
      const filteredIdx = tasksWithoutDragged.findIndex(t => t.id === targetTaskId);
      if (sameColumn) {
        targetIndex = filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx;
      } else {
        targetIndex = filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx;
      }
    } else {
      targetIndex = tasksWithoutDragged.length;
    }
    const position = targetIndex;

    setColumns(snap.map(c => {
      if (sameColumn && c.id === targetColId) {
        const reordered = c.tasks.filter(t => t.id !== task.id);
        reordered.splice(position, 0, { ...task, position });
        return { ...c, tasks: reordered.map((t, i) => ({ ...t, position: i })) };
      }
      if (!sameColumn) {
        if (c.id === task.boardColumnId) return { ...c, tasks: c.tasks.filter(t => t.id !== task.id) };
        if (c.id === targetColId) {
          const inserted = [...c.tasks];
          inserted.splice(position, 0, { ...task, boardColumnId: targetColId, position });
          return { ...c, tasks: inserted.map((t, i) => ({ ...t, position: i })) };
        }
      }
      return c;
    }));

    boardFetch(
      `${ROUTES_API.taskMove(task.id)}?newId=${targetColId}&position=${position}`,
      { method: "PATCH", body: "{}" }
    ).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });
  };

  /* ── Déplacement par position saisie ────────────────────── */

  const commitPosition = useCallback((task: Task, col: ColumnWithTasks, rawValue: string) => {
    setEditingPosTaskId(null);
    const parsed = parseInt(rawValue, 10);
    if (isNaN(parsed)) return;
    // L'utilisateur saisit un numéro 1-based visible ; on le convertit en index 0-based
    const maxPos  = col.tasks.length - 1;
    const target  = Math.max(0, Math.min(parsed - 1, maxPos));
    if (target === task.position) return;

    // Optimistic UI : même logique que handleDrop pour la même colonne
    columnsSnapshot.current = columns;
    const reordered = col.tasks.filter(t => t.id !== task.id);
    reordered.splice(target, 0, task);
    setColumns(prev => prev.map(c =>
      c.id === col.id ? { ...c, tasks: reordered.map((t, i) => ({ ...t, position: i })) } : c
    ));

    boardFetch(
      `${ROUTES_API.taskMove(task.id)}?newId=${col.id}&position=${target}`,
      { method: "PATCH", body: "{}" }
    ).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });
  }, [columns, boardFetch, fetchBoard]);

  /* ── Drag & drop colonnes ────────────────────────────────── */

  /**
   * Réordonne les colonnes visuellement en temps réel pendant le drag.
   * Capture la colonne cible dans colDropTargetRef AVANT le réordonnancement,
   * car après le swap c'est la colonne draguée elle-même qui se retrouve
   * sous le curseur — rendant targetCol inutilisable dans handleColDrop.
   */
  const reorderColLive = (targetCol: ColumnWithTasks) => {
    const col = dragColRef.current;
    if (!col || col.id === targetCol.id) return;
    colDropTargetRef.current = targetCol; // numero original, avant tout swap
    setColumns(current => {
      const fromIdx = current.findIndex(c => c.id === col.id);
      const toIdx   = current.findIndex(c => c.id === targetCol.id);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return reordered; // numéros inchangés : handleColDrop lit target.numero
    });
  };

  /**
   * Déplace la colonne en cours de drag vers la position de la colonne cible
   * via `PATCH /api/v1/boards/{boardId}/columns/{id}/move?newNum={num}`.
   * Met à jour le state localement sans recharger le tableau entier.
   *
   * @param targetCol - Colonne sur laquelle on lâche.
   */
  const handleColDrop = (targetCol: ColumnWithTasks) => {
    // On capture dragColRef.current immédiatement : onDragEnd peut
    // s'être déclenché avant onDrop sur certains navigateurs et
    // avoir remis dragColRef.current à null.
    const col    = dragColRef.current;
    const target = colDropTargetRef.current; // capturé avant le swap live
    colDropTargetRef.current = null;
    if (!col || !target) { setDragCol(null); setDragColOver(null); return; }
    const colId  = col.id;
    const newNum = target.numero; // numero original, non modifié par reorderColLive
    setDragCol(null);
    setDragColOver(null);
    // reorderColLive a déjà mis à jour l'affichage ; on persiste uniquement.
    boardFetch(`${ROUTES_API.columnMove(boardId, colId)}?newNum=${newNum}`, {
      method: "PATCH",
      body:   "{}",
    }).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });
  };

  /* ── Helpers ─────────────────────────────────────────────── */

  const resolveUser = (id: number | null | undefined): User | undefined =>
    id != null ? members.find(m => m.id === id) : undefined;

  const assigneeInitials = (u: User) => {
    const f = u.firstName?.trim() ?? "";
    const l = u.lastName?.trim()  ?? "";
    return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase() || "?";
  };

  const priorityClass = (p: Priority) =>
    p === "haute" ? "badge-haute" : p === "moyenne" ? "badge-moyenne" : "badge-basse";

  const priorityLabel = (p: Priority) =>
    p === "haute" ? "↑ Haute" : p === "moyenne" ? "→ Moyenne" : "↓ Basse";

  const formatDate = (dt: string | null | undefined) =>
    dt ? new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : null;

  const isOverdue = (dt: string | null | undefined) =>
    dt ? new Date(dt) < new Date() : false;

  const overdueLabel = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `En retard de ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `En retard de ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `En retard de ${days}j`;
    const months = Math.floor(days / 30);
    return `En retard de ${months} mois`;
  };

  useLayoutEffect(() => { if (editingBoardName) boardNameInputRef.current?.focus(); }, [editingBoardName]);
  useLayoutEffect(() => { if (editingColId !== null) colNameInputRef.current?.focus(); }, [editingColId]);

  /* ── Auto-scroll colonnes pendant le drag ────────────────── */
  const scrollRafRef = useRef<number | null>(null);

  const startColAutoScroll = (el: HTMLElement, clientY: number) => {
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    const ZONE = 64;
    const MAX  = 14;
    const step = () => {
      const rect = el.getBoundingClientRect();
      const distTop    = clientY - rect.top;
      const distBottom = rect.bottom - clientY;
      if (distTop < ZONE && distTop > 0) {
        el.scrollTop -= MAX * (1 - distTop / ZONE);
        scrollRafRef.current = requestAnimationFrame(step);
      } else if (distBottom < ZONE && distBottom > 0) {
        el.scrollTop += MAX * (1 - distBottom / ZONE);
        scrollRafRef.current = requestAnimationFrame(step);
      } else {
        scrollRafRef.current = null;
      }
    };
    scrollRafRef.current = requestAnimationFrame(step);
  };

  const stopColAutoScroll = () => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  };

  /* ── Pixel transparent pour masquer le ghost natif ─────────── */
  const transparentPixel = (() => {
    const c = document.createElement("canvas");
    c.width = 1; c.height = 1;
    return c;
  })();

  /* ── Rôle de l'utilisateur courant ──────────────────────── */

  // Le créateur du tableau est toujours admin, sinon on lit memberRoles,
  // et on replie sur "lecteur" si l'utilisateur n'est pas dans la liste.
  const currentRole: Member["role"] = board_creatorId === user?.id
    ? "admin"
    : memberRoles.get(user?.id ?? -1) ?? "lecteur";

  const isReadOnly = currentRole === "lecteur";

  /**
   * Recharge uniquement les tâches de chaque colonne.
   * Utilisé par le handler WS pour les actions sur les tâches,
   * afin d'éviter un rechargement complet du tableau.
   *
   * Lit les colonnes depuis `columnsSnapshot` (ref stable) plutôt que
   * depuis le state `columns`, afin de ne pas figurer comme dépendance
   * de `handleBoardUpdate` — ce qui provoquerait une reconnexion WS
   * à chaque mise à jour des tâches.
   */
  const fetchTasks = useCallback(async () => {
    const current = columnsRef.current;
    const updated = await Promise.all(
      current.map(async col => {
        const res = await boardFetch(ROUTES_API.tasksByColumn(col.id));
        const tasks: Task[] = res.ok ? await res.json() : col.tasks;
        return { ...col, tasks };
      })
    );
    setColumns(updated);
  }, [boardFetch]);

  /**
   * Recharge uniquement la liste des colonnes (sans re-fetcher les tâches).
   * Utilisé par le handler WS pour les actions sur les colonnes.
   */
  const fetchColumns = useCallback(async () => {
    const res = await boardFetch(ROUTES_API.columns(boardId));
    if (!res.ok) return;
    const cols: Column[] = await res.json();
    setColumns(prev =>
      cols
        .map(col => ({ ...col, tasks: prev.find(c => c.id === col.id)?.tasks ?? [] }))
        .sort((a, b) => a.numero - b.numero)
    );
  }, [boardId, boardFetch]);

  /**
   * Handler WebSocket : met à jour uniquement la partie du tableau
   * impactée par l'action reçue, sans rechargement complet.
   *
   * - Tâches (création, modification, déplacement, suppression) → fetchTasks
   * - Colonnes (création, modification, déplacement, suppression) → fetchColumns
   * - Membres → fetchBoard (changement de rôles, rare)
   */
  const handleBoardUpdate = useCallback((msg: BoardUpdateMessage) => {
    switch (msg.action) {
      case "task_created":
      case "task_updated":
      case "task_deleted":
      case "task_moved":
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
  }, [fetchTasks, fetchColumns, fetchBoard]);

  useBoardSocket(boardId, {
    onUpdate: handleBoardUpdate,
    currentUserId: user?.id,
    onPresence: useCallback((ids: number[]) => setOnlineUserIds(ids), []),
  });

  /* ── Rendu ───────────────────────────────────────────────── */

  return (
    <Layout title={boardName || "Tableau"} boardId={boardId} boardRole={currentRole} boardCreatorId={board_creatorId ?? undefined} onlineUserIds={onlineUserIds}>
      <div className="dashboard-page">
        <button className="back-btn" onClick={() => navigate("/boards")}>
          ← Retour aux tableaux
        </button>

        {/* Nom du tableau éditable (admin uniquement, double-clic) + bouton export PDF */}
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
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitBoardName(); } if (e.key === "Escape") setEditingBoardName(false); }}
              />
            ) : currentRole === "admin" ? (
              <Tooltip text="Double-cliquer pour renommer">
                <h1
                  className="board-name-title"
                  onDoubleClick={() => startEditBoardName()}
                  style={{ cursor: "text" }}
                >
                  {boardName}
                </h1>
              </Tooltip>
            ) : (
              <h1 className="board-name-title">{boardName}</h1>
            )}

            {/* Boutons journal d'activité + export PDF */}
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

        {!loading && !error && (
          <div className="kanban-board">
            {columns.map(col => (
              <div
                key={col.id}
                className={`kanban-col ${dropTarget?.colId === col.id && !!dragTask ? "drag-over" : ""} ${dragColOver === col.id && !dragTask ? "drag-over" : ""}`}
                onDragOver={e => { e.preventDefault(); if (!isReadOnly && !dragTaskRef.current) { reorderColLive(col); setDragColOver(col.id); } }}
                onDragLeave={() => { setDragColOver(null); }}
                onDrop={e => { e.preventDefault(); didDrop.current = true; setDropTarget(null); setDragMirror(null); if (dragTaskRef.current) { handleDrop(col.id, dragTaskRef.current); } else if (!isReadOnly) { handleColDrop(col); } }}
              >
                  <div
                  className="col-header"
                  draggable={!isReadOnly}
                  onDragStart={e => {
                    if (isReadOnly) return;
                    e.stopPropagation();
                    columnsSnapshot.current = columns;
                    didDrop.current = false;
                    dragTaskRef.current = null;
                    setDragTask(null);
                    dragColRef.current = col;
                    setDragCol(col);
                    e.dataTransfer.setDragImage(transparentPixel, 0, 0);
                    const colEl = (e.currentTarget as HTMLElement).closest(".kanban-col") as HTMLElement;
                    const colRect = colEl?.getBoundingClientRect();
                    setDragMirror({ ox: colRect ? e.clientX - colRect.left : 20, oy: colRect ? e.clientY - colRect.top : 20, width: colEl?.offsetWidth ?? 280, kind: "col", col });
                  }}
                  onDragEnd={() => { if (!didDrop.current) setColumns(columnsSnapshot.current); dragColRef.current = null; colDropTargetRef.current = null; setDragCol(null); setDragColOver(null); setDragMirror(null); didDrop.current = false; }}
                  style={{ cursor: isReadOnly ? "default" : "grab" }}
                >
                  {editingColId === col.id ? (
                    <input
                      ref={colNameInputRef}
                      className="col-name-input"
                      value={colNameDraft}
                      maxLength={50}
                      onChange={e => setColNameDraft(e.target.value)}
                      onBlur={() => commitColName(col)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitColName(col); } if (e.key === "Escape") { setEditingColId(null); } }}
                      onClick={e => e.stopPropagation()}
                      onDragStart={e => e.stopPropagation()}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    !isReadOnly ? (
                      <Tooltip text="Double-cliquer pour renommer">
                        <span
                          className="col-name"
                          onDoubleClick={e => { e.stopPropagation(); startEditColName(col); }}
                          style={{ cursor: "text" }}
                        >{col.name}</span>
                      </Tooltip>
                    ) : (
                      <span className="col-name">{col.name}</span>
                    )
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="col-count">{filterTasks(col.tasks, col.id).length}{(searchQuery.trim() || searchPriorities.size > 0 || searchAssignees.size > 0 || hideCompleted) && filterTasks(col.tasks, col.id).length !== col.tasks.length ? `/${col.tasks.length}` : ""} {col.tasks.length > 1 ? "tâches" : "tâche"}</span>
                    {!isReadOnly && (
                      <Tooltip text="Supprimer la colonne">
                        <button
                          className="icon-btn danger"
                          onClick={() => handleDeleteColumn(col.id)}
                        >✕</button>
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div className="col-tasks"
                  onDragOver={e => {
                    e.preventDefault();
                    if (dragTaskRef.current) {
                      // Ne pas écraser beforeTaskId avec null quand le curseur
                      // traverse le gap entre deux cartes : on conserve la valeur
                      // courante si on reste dans la même colonne.
                      setDropTarget(prev => ({
                        colId: col.id,
                        beforeTaskId: prev?.colId === col.id ? prev.beforeTaskId : null,
                      }));
                      startColAutoScroll(e.currentTarget as HTMLElement, e.clientY);
                    }
                  }}
                  onDragLeave={() => { stopColAutoScroll(); }}
                  onDrop={e => {
                    e.preventDefault();
                    stopColAutoScroll();
                    if (dragTaskRef.current) {
                      // Stopper la propagation vers kanban-col pour éviter un second
                      // handleDrop sans targetTaskId qui enverrait la tâche en fin de colonne.
                      e.stopPropagation();
                      didDrop.current = true;
                      // Utiliser beforeTaskId du dernier onDragOver (mis à jour par les
                      // cartes) plutôt que de toujours passer undefined (= fin de colonne).
                      const targetId = dropTarget?.colId === col.id
                        ? (dropTarget.beforeTaskId ?? undefined)
                        : undefined;
                      setDropTarget(null);
                      setDragMirror(null);
                      handleDrop(col.id, dragTaskRef.current, targetId);
                    }
                  }}
                >
                  {filterTasks(col.tasks, col.id).map(task => (
                    <React.Fragment key={task.id}>
                      {dropTarget?.colId === col.id && dropTarget?.beforeTaskId === task.id && !(dragTask?.id === task.id && dragTask?.boardColumnId === col.id) && (
                        <div
                          className="task-drop-placeholder"
                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget({ colId: col.id, beforeTaskId: task.id }); }}
                          onDrop={e => { e.preventDefault(); e.stopPropagation(); didDrop.current = true; setDropTarget(null); setDragMirror(null); if (dragTaskRef.current) handleDrop(col.id, dragTaskRef.current, task.id); }}
                        />
                      )}
                      <div
                        className={`task-card ${dropTarget?.beforeTaskId === task.id && dragTaskRef.current?.boardColumnId === col.id ? "drag-over-task" : ""}`}
                        draggable={!isReadOnly}
                        style={{ cursor: "pointer", ...(dragTask?.id === task.id ? { display: "none" } : {}) }}
                        onClick={() => setDetailTask(task)}
                        onDragStart={e => {
                        if (isReadOnly) return;
                        e.stopPropagation();
                        columnsSnapshot.current = columns;
                        didDrop.current = false;
                        lastLiveTaskKey.current = "";
                        dragTaskRef.current = task;
                        setDragTask(task);
                        e.dataTransfer.setDragImage(transparentPixel, 0, 0);
                        const cardEl = e.currentTarget as HTMLElement;
                        const cardRect = cardEl.getBoundingClientRect();
                        setDragMirror({ ox: e.clientX - cardRect.left, oy: e.clientY - cardRect.top, width: cardEl.offsetWidth, kind: "task", task });
                      }}
                        onDragEnd={() => { stopColAutoScroll(); if (!didDrop.current) setColumns(columnsSnapshot.current); dragTaskRef.current = null; setDragTask(null); setDropTarget(null); setDragMirror(null); lastLiveTaskKey.current = ""; didDrop.current = false; }}
                        onDragOver={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Auto-scroll de la colonne parente
                          const colTasksEl = (e.currentTarget as HTMLElement).closest(".col-tasks") as HTMLElement | null;
                          if (colTasksEl && dragTaskRef.current) startColAutoScroll(colTasksEl, e.clientY);
                          if (!dragTaskRef.current || dragTaskRef.current.id === task.id) return;
                          const dragged = dragTaskRef.current;
                          const rect    = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const isTop   = e.clientY < rect.top + rect.height / 2;
                          const tasks   = col.tasks;
                          const idx     = tasks.findIndex(t => t.id === task.id);
                          const next    = tasks[idx + 1];
                          const target  = isTop ? task.id : (next ? next.id : null);
                          setDropTarget({ colId: col.id, beforeTaskId: target });
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          didDrop.current = true;
                          setDropTarget(null);
                          setDragMirror(null);
                          if (dragTaskRef.current) handleDrop(col.id, dragTaskRef.current, task.id);
                        }}
                      >
                        <div className="task-header">
                          <span className={`badge ${priorityClass(task.priority)}`}>
                            {priorityLabel(task.priority)}
                          </span>

                          <div className="task-header-right">
                            {/* Badge position — cliquable pour éditer (non-lecteur seulement) */}
                            {!isReadOnly ? (
                              editingPosTaskId === task.id ? (
                                <input
                                  className="task-pos-input"
                                  type="number"
                                  min={1}
                                  max={col.tasks.length}
                                  value={posDraft}
                                  autoFocus
                                  onClick={e => { e.stopPropagation(); (e.target as HTMLInputElement).select(); }}
                                  onFocus={e => e.target.select()}
                                  onChange={e => setPosDraft(e.target.value)}
                                  onBlur={() => commitPosition(task, col, posDraft)}
                                  onKeyDown={e => {
                                    e.stopPropagation();
                                    if (e.key === "Enter")  { (e.target as HTMLInputElement).blur(); }
                                    if (e.key === "Escape") { setEditingPosTaskId(null); }
                                  }}
                                />
                              ) : (
                                <Tooltip text="Modifier la position" position="top">
                                  <button
                                    className="task-pos-badge"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setPosDraft(String(task.position + 1));
                                      setEditingPosTaskId(task.id);
                                    }}
                                    aria-label={`Position ${task.position + 1}`}
                                  >
                                    #{task.position + 1}
                                  </button>
                                </Tooltip>
                              )
                            ) : (
                              <span className="task-pos-badge task-pos-badge--readonly">
                                {task.position + 1}
                              </span>
                            )}

                            {!isReadOnly && (
                              <div className="task-actions">
                                <Tooltip text="Supprimer" position="top">
                                  <button className="icon-btn danger" onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}>✕</button>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="task-title">{task.title}</p>

                        {task.details && <p className="task-details">{task.details}</p>}

                        {(task.dueDate || task.assignedId || task.validated) && (
                          <div className="task-footer">
                            {task.validated
                              ? <span className="task-date validated">✅ Terminée</span>
                              : task.dueDate
                                ? <span className={`task-date ${isOverdue(task.dueDate) ? "overdue" : ""}`}>
                                    {isOverdue(task.dueDate) ? `⚠️ ${overdueLabel(task.dueDate)}` : `⏰ ${formatDate(task.dueDate)}`}
                                  </span>
                                : <span />
                            }
                            {task.assignedId && (() => {
                              const assignee = resolveUser(task.assignedId);
                              const label = assignee ? `${assignee.firstName} ${assignee.lastName}` : `#${task.assignedId}`;
                              return (
                                <Tooltip text={label} position="top">
                                  <UserAvatar
                                    userId={task.assignedId}
                                    firstName={assignee?.firstName ?? ""}
                                    lastName={assignee?.lastName ?? ""}
                                    hasAvatar={!!assignee?.avatarURL}
                                    size={24}
                                    style={{ border: "2px solid var(--surface)", flexShrink: 0 }}
                                  />
                                </Tooltip>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                  {dropTarget?.colId === col.id && dropTarget?.beforeTaskId === null && (
                    <div
                      className="task-drop-placeholder"
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget({ colId: col.id, beforeTaskId: null }); }}
                      onDrop={e => { e.preventDefault(); e.stopPropagation(); didDrop.current = true; setDropTarget(null); setDragMirror(null); if (dragTaskRef.current) handleDrop(col.id, dragTaskRef.current); }}
                    />
                  )}
                </div>

                {!isReadOnly && (
                  <button
                    className="add-task-btn"
                    onClick={() => openCreateTask(col.id)}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (dragTaskRef.current) setDropTarget({ colId: col.id, beforeTaskId: null }); }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragTaskRef.current) { didDrop.current = true; setDropTarget(null); setDragMirror(null); handleDrop(col.id, dragTaskRef.current); } }}
                  >
                    + Ajouter une tâche
                  </button>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <button className="kanban-col-new" onClick={() => { setColName(""); setColError(""); setColModal(true); }}>
                + Nouvelle colonne
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modale détail de tâche */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          columnName={columns.find(c => c.id === detailTask.boardColumnId)?.name ?? ""}
          members={members}
          onClose={() => setDetailTask(null)}
          onEdit={saved => {
            setColumns(cols => cols.map(col => ({ ...col, tasks: col.tasks.map(t => t.id === saved.id ? saved : t) })));
            setDetailTask(saved);
          }}
          onDelete={taskId => { setDetailTask(null); handleDeleteTask(taskId); }}
          currentRole={currentRole}
        />
      )}

      {/* Modale création de tâche */}
      {taskModal && (
        <div className="modal-overlay" onClick={() => setTaskModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nouvelle tâche</h2>
            <form onSubmit={handleSaveTask} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {taskError && <div className="alert alert-error">⚠ {taskError}</div>}

              <div className="form-group">
                <label className="form-label">Titre</label>
                <input className="form-input" type="text" placeholder="Nom de la tâche…"
                  value={taskForm.title} maxLength={50} autoFocus
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Détails</label>
                <textarea className="form-textarea" placeholder="Description optionnelle…"
                  value={taskForm.details}
                  onChange={e => setTaskForm(f => ({ ...f, details: e.target.value }))} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priorité</label>
                  <select className="form-select" value={taskForm.priority}
                    onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date limite</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="form-input"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      className="form-input"
                      type="time"
                      value={taskForm.dueTime}
                      onChange={e => setTaskForm(f => ({ ...f, dueTime: e.target.value }))}
                      disabled={!taskForm.dueDate}
                      title="Heure optionnelle"
                      style={{ width: 90, opacity: taskForm.dueDate ? 1 : 0.4 }}
                    />
                  </div>
                  {taskForm.dueDate && !taskForm.dueTime && (
                    <span style={{ fontSize: 11, color: "#7a7288", marginTop: 3, display: "block" }}>
                      Heure non renseignée — échéance fixée à 23 h 59
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setTaskModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Sauvegarde…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale création de colonne */}
      {colModal && (
        <div className="modal-overlay" onClick={() => setColModal(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nouvelle colonne</h2>
            <form onSubmit={handleCreateColumn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {colError && <div className="alert alert-error">⚠ {colError}</div>}
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex : En révision…"
                  value={colName}
                  maxLength={50}
                  autoFocus
                  onChange={e => setColName(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setColModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={colSaving}>
                  {colSaving ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Mirror de drag – suit le curseur, remplace le ghost natif */}
      {dragMirror && (
        <div ref={mirrorRef} style={{ position: "fixed", left: -9999, top: -9999, width: dragMirror.width, pointerEvents: "none", zIndex: 9999, transform: "rotate(2deg)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)", opacity: 0.95, borderRadius: "var(--radius-lg)" }}>
          {dragMirror.kind === "task" ? (
            <div className="task-card" style={{ margin: 0 }}>
              <div className="task-header">
                <span className={`badge ${priorityClass(dragMirror.task.priority)}`}>{priorityLabel(dragMirror.task.priority)}</span>
                {dragMirror.task.assignedId && (() => {
                  const assignee = resolveUser(dragMirror.task.assignedId);
                  return (
                    <UserAvatar
                      userId={dragMirror.task.assignedId}
                      firstName={assignee?.firstName ?? ""}
                      lastName={assignee?.lastName ?? ""}
                      hasAvatar={!!assignee?.avatarURL}
                      size={24}
                      style={{ border: "2px solid var(--surface)", flexShrink: 0 }}
                    />
                  );
                })()}
              </div>
              <p className="task-title">{dragMirror.task.title}</p>
              {dragMirror.task.details && <p className="task-details">{dragMirror.task.details}</p>}
              {(dragMirror.task.dueDate || dragMirror.task.validated) && (
                <div className="task-footer">
                  {dragMirror.task.validated
                    ? <span className="task-date validated">✅ Terminée</span>
                    : <span className={`task-date ${isOverdue(dragMirror.task.dueDate!) ? "overdue" : ""}`}>
                        {isOverdue(dragMirror.task.dueDate!) ? `⚠️ ${overdueLabel(dragMirror.task.dueDate!)}` : `⏰ ${formatDate(dragMirror.task.dueDate)}`}
                      </span>
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="kanban-col" style={{ width: dragMirror.width, maxHeight: 400, overflow: "hidden" }}>
              <div className="col-header">
                <span className="col-name">{dragMirror.col.name}</span>
                <span className="col-count">{dragMirror.col.tasks.length}</span>
              </div>
              <div className="col-tasks" style={{ gap: 6 }}>
                {dragMirror.col.tasks.slice(0, 4).map(t => (
                  <div key={t.id} className="task-card" style={{ margin: 0 }}>
                    <p className="task-title" style={{ fontSize: 12 }}>{t.title}</p>
                  </div>
                ))}
                {dragMirror.col.tasks.length > 4 && <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", padding: "4px 0" }}>+{dragMirror.col.tasks.length - 4} tâches</p>}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Modale de confirmation générique */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal confirm-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h2 className="modal-title confirm-modal-title">{confirmModal.message}</h2>
            <p className="confirm-modal-hint">Cette action est irréversible.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Annuler</button>
              <button
                className="btn btn-danger"
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}