import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../utils/apiHelpers";
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
  const boardId       = parseInt(id ?? "", 10); // parseInt s'arrête au premier tiret : "7-mon-projet" → 7
  const { authFetch, user } = useAuth();
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

  // Drag & drop tâches
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragTaskRef = useRef<Task | null>(null);

  // Drag & drop colonnes
  const [dragCol, setDragCol]         = useState<ColumnWithTasks | null>(null);
  const [dragColOver, setDragColOver] = useState<number | null>(null);
  const dragColRef = useRef<ColumnWithTasks | null>(null);

  // Colonnes
  const [colModal, setColModal]   = useState(false);
  const [colName, setColName]     = useState("");
  const [colError, setColError]   = useState("");
  const [colSaving, setColSaving] = useState(false);

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
      if (!resBoard.ok) throw new Error(await extractErrorMessage(resBoard));
      const board: Board = await resBoard.json();
      setBoardName(board.name);

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
   * Met à jour le state localement sans recharger le tableau entier.
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
        creatorId:     user!.id,
      };
      const res = editTask
        ? await authFetch(ROUTES_API.task(editTask.id), { method: "PUT",  body: JSON.stringify(body) })
        : await authFetch(ROUTES_API.tasks,             { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const savedTask: Task = await res.json();
      setColumns(cols => cols.map(c => {
        if (editTask) {
          // Modification : remplacer la tâche existante
          return { ...c, tasks: c.tasks.map(t => t.id === savedTask.id ? savedTask : t) };
        } else {
          // Création : ajouter la tâche à la bonne colonne
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

  /**
   * Supprime une tâche après confirmation.
   * Met à jour le state localement sans recharger le tableau entier.
   * @param taskId - Identifiant de la tâche à supprimer.
   */
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

  /** Crée une nouvelle colonne dans le tableau courant.
   *  Met à jour le state localement sans recharger le tableau entier.
   */
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

  /**
   * Supprime une colonne après confirmation.
   * Met à jour le state localement sans recharger le tableau entier.
   * @param colId - Identifiant de la colonne à supprimer.
   */
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

  /**
   * Déplace la tâche en cours de drag vers la colonne cible
   * via `PATCH /api/v1/tasks/{id}/move`.
   * Met à jour le state localement sans recharger le tableau entier.
   *
   * @param targetColId - Identifiant de la colonne de destination.
   */
  const handleDrop = (targetColId: number, task: Task) => {
    if (task.boardColumnId === targetColId) {
      setDragTask(null); setDragOver(null); return;
    }
    const movedTask = { ...task, boardColumnId: targetColId };
    setColumns(cols => cols.map(c => {
      if (c.id === task.boardColumnId) return { ...c, tasks: c.tasks.filter(t => t.id !== task.id) };
      if (c.id === targetColId)        return { ...c, tasks: [...c.tasks, movedTask] };
      return c;
    }));
    setDragTask(null);
    setDragOver(null);
    setTimeout(async () => {
      const res = await authFetch(`${ROUTES_API.taskMove(task.id)}?newId=${targetColId}`, {
        method: "PATCH",
        body:   "{}",
      });
      if (!res.ok) fetchBoard();
    }, 0);
  };

  /* ── Drag & drop colonnes ────────────────────────────────── */

  /**
   * Déplace la colonne en cours de drag vers la position de la colonne cible
   * via `PATCH /api/v1/boards/{boardId}/columns/{id}/move?newNum={num}`.
   * Met à jour le state localement sans recharger le tableau entier.
   *
   * @param targetCol - Colonne sur laquelle on lâche.
   */
  const handleColDrop = async (targetCol: ColumnWithTasks) => {
    const col = dragColRef.current;
    console.log("handleColDrop appelé, col:", col?.id, "→ target:", targetCol.id);
    if (!col || col.id === targetCol.id) {
      setDragCol(null); setDragColOver(null); return;
    }
    const newNum = targetCol.numero;
    setColumns(cols => {
      const oldIdx        = cols.findIndex(c => c.id === col.id);
      const targetOrigIdx = cols.findIndex(c => c.id === targetCol.id);
      const reordered     = cols.filter(c => c.id !== col.id);
      const targetIdx     = reordered.findIndex(c => c.id === targetCol.id);
      const insertAt      = oldIdx < targetOrigIdx ? targetIdx + 1 : targetIdx;
      reordered.splice(insertAt, 0, { ...col, numero: newNum });
      return reordered.map((c, i) => ({ ...c, numero: i + 1 }));
    });
    setDragCol(null);
    setDragColOver(null);
    const res = await authFetch(`${ROUTES_API.columnMove(boardId, col.id)}?newNum=${newNum}`, {
      method: "PATCH",
    });
    if (!res.ok) fetchBoard();
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
                className={`kanban-col ${dragOver === col.id ? "drag-over" : ""} ${dragColOver === col.id && !dragTask ? "drag-over" : ""}`}
                onDragOver={e => { e.preventDefault(); dragTaskRef.current ? setDragOver(col.id) : setDragColOver(col.id); }}
                onDragLeave={() => { setDragOver(null); setDragColOver(null); }}
                onDrop={e => { e.preventDefault(); console.log("DROP sur col", col.id, "dragTaskRef:", dragTaskRef.current?.id, "dragColRef:", dragColRef.current?.id); dragTaskRef.current ? handleDrop(col.id, dragTaskRef.current) : handleColDrop(col); }}
              >
                <div
                  className="col-header"
                  draggable
                  onDragStart={e => { e.stopPropagation(); dragTaskRef.current = null; setDragTask(null); dragColRef.current = col; setDragCol(col); console.log("DRAGSTART col", col.id); }}
                  onDragEnd={() => { dragColRef.current = null; setDragCol(null); setDragColOver(null); }}
                  style={{ cursor: "grab" }}
                >
                  <span className="col-name">{col.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="col-count">{col.tasks.length}</span>
                    <button
                      className="icon-btn danger"
                      title="Supprimer la colonne"
                      onClick={() => handleDeleteColumn(col.id)}
                    >✕</button>
                  </div>
                </div>

                <div className="col-tasks"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => e.preventDefault()}
                >
                  {col.tasks.map(task => (
                    <div
                      key={task.id}
                      className="task-card"
                      draggable
                      onDragStart={e => { e.stopPropagation(); dragTaskRef.current = task; setDragTask(task); }}
                      onDragEnd={() => { dragTaskRef.current = null; setDragTask(null); setDragOver(null); }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => e.preventDefault()}
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

            {/* Bouton nouvelle colonne */}
            <button className="kanban-col-new" onClick={() => { setColName(""); setColError(""); setColModal(true); }}>
              + Nouvelle colonne
            </button>
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
    </Layout>
  );
}