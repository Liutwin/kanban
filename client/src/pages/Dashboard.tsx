import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../utils/apiHelpers";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import type { Board, Column, Task, Priority, User, Member } from "../model/interfaces";
import "../styles/dashboard.css";
import TaskDetailModal from "../components/TaskDetailModal";
import Tooltip from "../components/Tooltip";

interface ColumnWithTasks extends Column {
  tasks: Task[];
}

export default function Dashboard() {
  const { id }        = useParams<{ id: string }>();
  const boardId       = parseInt(id ?? "", 10);
  const { authFetch, user } = useAuth();
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
  const [editTask, setEditTask]   = useState<Task | null>(null);
  const [taskForm, setTaskForm]   = useState({
    title: "", details: "", dueDate: "", priority: "moyenne" as Priority,
  });
  const [saving, setSaving]       = useState(false);
  const [taskError, setTaskError] = useState("");

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

  /* ── Recherche ───────────────────────────────────────────── */
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchPriority, setSearchPriority] = useState<"" | "basse" | "moyenne" | "haute">("");
  const [searchAssignee, setSearchAssignee] = useState<number | "">("");

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ query: string; priority: string; assigneeId: number | "" }>).detail;
      setSearchQuery(d.query ?? "");
      setSearchPriority((d.priority as "" | "basse" | "moyenne" | "haute") ?? "");
      setSearchAssignee(d.assigneeId ?? "");
    };
    window.addEventListener("kanban:search", handler);
    return () => window.removeEventListener("kanban:search", handler);
  }, []);

  /** Filtre les tâches d'une colonne selon la recherche en cours. */
  const filterTasks = useCallback((tasks: Task[]) => {
    return tasks.filter(t => {
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(t.details ?? "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (searchPriority && t.priority !== searchPriority) return false;
      if (searchAssignee !== "" && searchAssignee !== -1 && t.assignedId !== searchAssignee) return false;
      return true;
    });
  }, [searchQuery, searchPriority, searchAssignee]);

  const columnsSnapshot   = useRef<ColumnWithTasks[]>([]);
  const didDrop           = useRef(false);
  const lastLiveTaskKey   = useRef<string>("");

  // Colonnes
  const [colModal, setColModal]   = useState(false);
  const [colName, setColName]     = useState("");
  const [colError, setColError]   = useState("");
  const [colSaving, setColSaving] = useState(false);

  /* ── Chargement ──────────────────────────────────────────── */

  const fetchBoard = async () => {
    setLoading(true);
    setError("");
    try {
      const resBoard = await authFetch(ROUTES_API.board(boardId));
      if (!resBoard.ok) throw new Error(await extractErrorMessage(resBoard));
      const board: Board = await resBoard.json();
      setBoardName(board.name);
      setBoardCreatorId(board.creatorId);

      const resCols = await authFetch(ROUTES_API.columns(boardId));
      if (!resCols.ok) throw new Error(await extractErrorMessage(resCols));
      const cols: Column[] = await resCols.json();

      const colsWithTasks: ColumnWithTasks[] = await Promise.all(
        cols.map(async col => {
          const resTasks = await authFetch(ROUTES_API.tasksByColumn(col.id));
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

      const resMembers = await authFetch(ROUTES_API.boardMembers(boardId));
      if (resMembers.ok) {
        const memberList: Member[] = await resMembers.json();
        const roles = new Map<number, Member["role"]>();
        memberList.forEach(m => { userIdsToFetch.add(m.userId); roles.set(m.userId, m.role); });
        setMemberRoles(roles);
      }

      const userResults = await Promise.allSettled(
        [...userIdsToFetch].map(uid =>
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
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

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
    setEditTask(null);
    setTaskForm({ title: "", details: "", dueDate: "", priority: "moyenne" });
    setTaskError("");
    setTaskModal({ colId });
  };

  const openEditTask = (task: Task) => {
    setEditTask(task);
    setTaskForm({
      title:    task.title,
      details:  task.details ?? "",
      dueDate:  task.dueDate ? task.dueDate.slice(0, 16) : "",
      priority: task.priority,
    });
    setTaskError("");
    setTaskModal({ colId: task.boardColumnId });
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
        dueDate:       taskForm.dueDate || null,
        priority:      taskForm.priority,
        boardColumnId: taskModal!.colId,
        creatorId:     user!.id,
      };
      const res = editTask
        ? await authFetch(ROUTES_API.task(editTask.id), { method: "PUT",  body: JSON.stringify(body) })
        : await authFetch(ROUTES_API.tasks,             { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const savedTask: Task = await res.json();
      setColumns(cols => cols.map(c => {
        if (editTask) {
          return { ...c, tasks: c.tasks.map(t => t.id === savedTask.id ? savedTask : t) };
        } else {
          return c.id === taskModal!.colId ? { ...c, tasks: [...c.tasks, savedTask] } : c;
        }
      }));
      setTaskModal(null);
    } catch (e: unknown) {
      setTaskError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    const res = await authFetch(ROUTES_API.task(taskId), { method: "DELETE" });
    if (res.ok) {
      setColumns(cols => cols.map(c => ({ ...c, tasks: c.tasks.filter(t => t.id !== taskId) })));
    } else {
      fetchBoard();
    }
  };

  /* ── Colonnes ────────────────────────────────────────────── */

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    setColError("");
    if (!colName.trim()) { setColError("Le nom est requis."); return; }
    setColSaving(true);
    try {
      const res = await authFetch(ROUTES_API.columns(boardId), {
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
    if (!confirm("Supprimer cette colonne et toutes ses tâches ?")) return;
    const res = await authFetch(ROUTES_API.column(boardId, colId), { method: "DELETE" });
    if (res.ok) {
      setColumns(cols => cols.filter(c => c.id !== colId));
    } else {
      fetchBoard();
    }
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
        const targetTask     = targetCol.tasks.find(t => t.id === targetTaskId);
        const isDraggingDown = targetTask != null && targetTask.position > task.position;
        targetIndex = isDraggingDown
          ? (filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx + 1)
          : (filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx);
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
        const targetTask     = targetCol.tasks.find(t => t.id === targetTaskId);
        const isDraggingDown = targetTask != null && targetTask.position > task.position;
        targetIndex = isDraggingDown
          ? (filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx + 1)
          : (filteredIdx < 0 ? tasksWithoutDragged.length : filteredIdx);
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

    authFetch(
      `${ROUTES_API.taskMove(task.id)}?newId=${targetColId}&position=${position}`,
      { method: "PATCH", body: "{}" }
    ).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });
  };

  /* ── Drag & drop colonnes ────────────────────────────────── */

  /**
   * Réorganise les colonnes en temps réel pendant le drag.
   * Calcule depuis l'état courant pour gérer les aller-retours.
   */
  const reorderColLive = (targetCol: ColumnWithTasks) => {
    const col = dragColRef.current;
    if (!col || col.id === targetCol.id) return;

    setColumns(current => {
      const currentIdx = current.findIndex(c => c.id === col.id);
      const targetIdx  = current.findIndex(c => c.id === targetCol.id);
      if (currentIdx === -1 || targetIdx === -1 || currentIdx === targetIdx) return current;
      const reordered = [...current];
      const [moved]   = reordered.splice(currentIdx, 1);
      reordered.splice(targetIdx, 0, moved);
      return reordered.map((c, i) => ({ ...c, numero: i + 1 }));
    });
  };

  /**
   * Finalise le drop d'une colonne : persiste le nouvel ordre via l'API.
   */
  const handleColDrop = (targetCol: ColumnWithTasks) => {
    const col = dragColRef.current;
    if (!col || col.id === targetCol.id) return;

    const current   = columns;
    const currentIdx = current.findIndex(c => c.id === col.id);
    const targetIdx  = current.findIndex(c => c.id === targetCol.id);
    if (currentIdx === -1 || targetIdx === -1) return;

    const newNum = current[targetIdx].numero;

    authFetch(ROUTES_API.columnMove(boardId, col.id), {
      method: "PATCH",
      body:   JSON.stringify({ newPosition: newNum }),
    }).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });

    dragColRef.current = null;
    setDragCol(null);
    setDragColOver(null);
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

  /* ── Rendu ───────────────────────────────────────────────── */

  return (
    <Layout title={boardName || "Tableau"} boardId={boardId} boardRole={currentRole}>
      <div className="dashboard-page">
        <button className="back-btn" onClick={() => navigate("/boards")}>
          ← Retour aux tableaux
        </button>

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
                  onDragEnd={() => { if (!didDrop.current) setColumns(columnsSnapshot.current); dragColRef.current = null; setDragCol(null); setDragColOver(null); setDragMirror(null); didDrop.current = false; }}
                  style={{ cursor: isReadOnly ? "default" : "grab" }}
                >
                  <span className="col-name">{col.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="col-count">{filterTasks(col.tasks).length}{(searchQuery || searchPriority || searchAssignee !== "") && filterTasks(col.tasks).length !== col.tasks.length ? `/${col.tasks.length}` : ""}</span>
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
                    // Déclenche le placeholder en bas (beforeTaskId=null) quand le curseur
                    // entre dans la zone de tâches (colonne vide ou bas de colonne).
                    if (dragTaskRef.current) setDropTarget({ colId: col.id, beforeTaskId: null });
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    if (dragTaskRef.current) { didDrop.current = true; setDropTarget(null); setDragMirror(null); handleDrop(col.id, dragTaskRef.current); }
                  }}
                >
                  {filterTasks(col.tasks).map(task => (
                    <React.Fragment key={task.id}>
                      {dropTarget?.colId === col.id && dropTarget?.beforeTaskId === task.id && dragTask?.id !== task.id && (
                        <div
                          className="task-drop-placeholder"
                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget({ colId: col.id, beforeTaskId: task.id }); }}
                          onDrop={e => { e.preventDefault(); e.stopPropagation(); didDrop.current = true; setDropTarget(null); setDragMirror(null); if (dragTaskRef.current) handleDrop(col.id, dragTaskRef.current, task.id); }}
                        />
                      )}
                      <div
                        className={`task-card ${dragTask?.id === task.id && dragTask?.boardColumnId === col.id ? "dragging" : ""} ${dropTarget?.beforeTaskId === task.id && dragTaskRef.current?.boardColumnId === col.id ? "drag-over-task" : ""}`}
                        draggable={!isReadOnly}
                        style={{ cursor: "pointer" }}
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
                        onDragEnd={() => { if (!didDrop.current) setColumns(columnsSnapshot.current); dragTaskRef.current = null; setDragTask(null); setDropTarget(null); setDragMirror(null); lastLiveTaskKey.current = ""; didDrop.current = false; }}
                        onDragOver={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!dragTaskRef.current || dragTaskRef.current.id === task.id) return;
                          const dragged = dragTaskRef.current;
                          const rect    = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const isTop   = e.clientY < rect.top + rect.height / 2;
                          const tasks   = col.tasks;
                          const idx     = tasks.findIndex(t => t.id === task.id);
                          const prev    = tasks[idx - 1];
                          if (isTop && prev && prev.id === dragged.id) return;
                          const next    = tasks[idx + 1];
                          if (!isTop && next && next.id === dragged.id) return;
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
                          {!isReadOnly && (
                            <div className="task-actions">
                              <Tooltip text="Modifier" position="top">
                                <button className="icon-btn" onClick={e => { e.stopPropagation(); openEditTask(task); }}>✎</button>
                              </Tooltip>
                              <Tooltip text="Supprimer" position="top">
                                <button className="icon-btn danger" onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}>✕</button>
                              </Tooltip>
                            </div>
                          )}
                        </div>

                        <p className="task-title">{task.title}</p>

                        {task.details && <p className="task-details">{task.details}</p>}

                        {(task.dueDate || task.assignedId) && (
                          <div className="task-footer">
                            {task.dueDate
                              ? <span className={`task-date ${isOverdue(task.dueDate) ? "overdue" : ""}`}>
                                  ⏰ {formatDate(task.dueDate)}
                                </span>
                              : <span />
                            }
                            {task.assignedId && (() => {
                              const assignee = resolveUser(task.assignedId);
                              const label = assignee ? `${assignee.firstName} ${assignee.lastName}` : `#${task.assignedId}`;
                              return (
                                <Tooltip text={label} position="top">
                                  {assignee?.avatar
                                    ? <img
                                        src={assignee.avatar}
                                        alt={label}
                                        style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--bg-2, #2a2a2a)", flexShrink: 0 }}
                                      />
                                    : <span
                                        style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent, #a3e635)", color: "#000", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid var(--bg-2, #2a2a2a)" }}
                                      >
                                        {assignee ? assigneeInitials(assignee) : "?"}
                                      </span>
                                  }
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

      {/* Modale création / édition de tâche */}
      {taskModal && (
        <div className="modal-overlay" onClick={() => setTaskModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editTask ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
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
                  <input className="form-input" type="datetime-local"
                    value={taskForm.dueDate}
                    onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setTaskModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Sauvegarde…" : editTask ? "Enregistrer" : "Créer"}
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
                  return assignee?.avatar
                    ? <img src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--bg-2, #2a2a2a)", flexShrink: 0 }} />
                    : <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent, #a3e635)", color: "#000", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid var(--bg-2, #2a2a2a)" }}>
                        {assignee ? assigneeInitials(assignee) : "?"}
                      </span>;
                })()}
              </div>
              <p className="task-title">{dragMirror.task.title}</p>
              {dragMirror.task.details && <p className="task-details">{dragMirror.task.details}</p>}
              {dragMirror.task.dueDate && (
                <div className="task-footer">
                  <span className={`task-date ${isOverdue(dragMirror.task.dueDate) ? "overdue" : ""}`}>⏰ {formatDate(dragMirror.task.dueDate)}</span>
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
    </Layout>
  );
}