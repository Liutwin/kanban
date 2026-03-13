import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import type { Board, Column, Task, Priority } from "../model/interfaces";
import "../styles/dashboard.css";

interface ColumnWithTasks extends Column {
  tasks: Task[];
}

/**
 * Page d'affichage d'un tableau Kanban.
 *
 * Charge le tableau, ses colonnes et les tâches de chaque colonne au montage.
 * Permet de créer, modifier, supprimer des tâches, et de les déplacer entre
 * colonnes par drag & drop.
 *
 * Route : `<Route path="/boards/:id" element={<Dashboard />} />`
 */
export default function Dashboard() {
  const { id }        = useParams<{ id: string }>();
  const boardId       = Number(id);
  const { authFetch } = useAuth();
  const navigate      = useNavigate();

  const [boardName, setBoardName] = useState("");
  const [columns, setColumns]     = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // Modale tâche
  const [taskModal, setTaskModal] = useState<{ colId: number } | null>(null);
  const [editTask, setEditTask]   = useState<Task | null>(null);
  const [taskForm, setTaskForm]   = useState({
    title: "", details: "", dueDate: "", priority: "moyenne" as Priority,
  });
  const [saving, setSaving]       = useState(false);
  const [taskError, setTaskError] = useState("");

  // Drag & drop
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  /* ── Chargement ──────────────────────────────────────────── */

  /**
   * Charge le nom du tableau, ses colonnes et les tâches de chaque colonne.
   * Les colonnes sont triées par `numero` avant d'être stockées.
   */
  const fetchBoard = async () => {
    setLoading(true);
    setError("");
    try {
      const resBoard = await authFetch(ROUTES_API.board(boardId));
      if (!resBoard.ok) throw new Error(`Erreur serveur (${resBoard.status}).`);
      const board: Board = await resBoard.json();
      setBoardName(board.name);

      const resCols = await authFetch(ROUTES_API.columns(boardId));
      if (!resCols.ok) throw new Error(`Erreur serveur (${resCols.status}).`);
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

  /* ── CRUD tâches ─────────────────────────────────────────── */

  /** Ouvre la modale en mode création pour la colonne donnée. */
  const openCreateTask = (colId: number) => {
    setEditTask(null);
    setTaskForm({ title: "", details: "", dueDate: "", priority: "moyenne" });
    setTaskError("");
    setTaskModal({ colId });
  };

  /** Ouvre la modale en mode édition pour la tâche donnée. */
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

  /**
   * Crée ou modifie une tâche selon que `editTask` est défini ou non.
   * @param e - Événement de soumission du formulaire.
   */
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
      };
      const res = editTask
        ? await authFetch(ROUTES_API.task(editTask.id),               { method: "PUT",  body: JSON.stringify(body) })
        : await authFetch(ROUTES_API.tasksByColumn(taskModal!.colId), { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message ?? `Erreur serveur (${res.status}).`);
      }
      setTaskModal(null);
      fetchBoard();
    } catch (e: unknown) {
      setTaskError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Supprime une tâche après confirmation.
   * @param taskId - Identifiant de la tâche à supprimer.
   */
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    await authFetch(ROUTES_API.task(taskId), { method: "DELETE" });
    fetchBoard();
  };

  /* ── Drag & drop ─────────────────────────────────────────── */

  /**
   * Déplace la tâche en cours de drag vers la colonne cible
   * via `PATCH /api/v1/tasks/{id}/move`.
   *
   * @param targetColId - Identifiant de la colonne de destination.
   */
  const handleDrop = async (targetColId: number) => {
    if (!dragTask || dragTask.boardColumnId === targetColId) {
      setDragTask(null); setDragOver(null); return;
    }
    await authFetch(ROUTES_API.taskMove(dragTask.id), {
      method: "PATCH",
      body:   JSON.stringify({ boardColumnId: targetColId }),
    });
    setDragTask(null);
    setDragOver(null);
    fetchBoard();
  };

  /* ── Helpers ─────────────────────────────────────────────── */

  const priorityClass = (p: Priority) =>
    p === "haute" ? "badge-haute" : p === "moyenne" ? "badge-moyenne" : "badge-basse";

  const priorityLabel = (p: Priority) =>
    p === "haute" ? "↑ Haute" : p === "moyenne" ? "→ Moy." : "↓ Basse";

  const formatDate = (dt: string | null | undefined) =>
    dt ? new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : null;

  const isOverdue = (dt: string | null | undefined) =>
    dt ? new Date(dt) < new Date() : false;

  /* ── Rendu ───────────────────────────────────────────────── */

  return (
    <Layout title={boardName || "Tableau"}>
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
                className={`kanban-col ${dragOver === col.id ? "drag-over" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}
              >
                <div className="col-header">
                  <span className="col-name">{col.name}</span>
                  <span className="col-count">{col.tasks.length}</span>
                </div>

                <div className="col-tasks">
                  {col.tasks.map(task => (
                    <div
                      key={task.id}
                      className="task-card"
                      draggable
                      onDragStart={() => setDragTask(task)}
                      onDragEnd={() => { setDragTask(null); setDragOver(null); }}
                    >
                      <div className="task-header">
                        <span className={`badge ${priorityClass(task.priority)}`}>
                          {priorityLabel(task.priority)}
                        </span>
                        <div className="task-actions">
                          <button className="icon-btn" onClick={() => openEditTask(task)} title="Modifier">✎</button>
                          <button className="icon-btn danger" onClick={() => handleDeleteTask(task.id)} title="Supprimer">✕</button>
                        </div>
                      </div>

                      <p className="task-title">{task.title}</p>

                      {task.details && <p className="task-details">{task.details}</p>}

                      <div className="task-footer">
                        {task.dueDate && (
                          <span className={`task-date ${isOverdue(task.dueDate) ? "overdue" : ""}`}>
                            ⏰ {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.assignedId && (
                          <span className="task-assignee">#{task.assignedId}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="add-task-btn" onClick={() => openCreateTask(col.id)}>
                  + Ajouter une tâche
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </Layout>
  );
}