import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import type { Tableau, Colonne, Tache, Priorite, APIResponse } from "../model/interfaces";
import "../styles/dashboard.css";

interface ColonneAvecTaches extends Colonne {
  taches: Tache[];
}

export default function Dashboard() {
  const { id }      = useParams<{ id: string }>();
  const tabId       = Number(id);
  const { authFetch } = useAuth();
  const navigate    = useNavigate();

  const [boardName, setBoardName]     = useState("");
  const [columns, setColumns]         = useState<ColonneAvecTaches[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  // Task modal
  const [taskModal, setTaskModal]   = useState<{ colId: number } | null>(null);
  const [editTask, setEditTask]     = useState<Tache | null>(null);
  const [taskForm, setTaskForm]     = useState({
    titre: "", details: "", dateLimite: "", priorite: "MOYENNE" as Priorite,
  });
  const [saving, setSaving]         = useState(false);
  const [taskError, setTaskError]   = useState("");

  // Drag
  const [dragTask, setDragTask]   = useState<Tache | null>(null);
  const [dragOver, setDragOver]   = useState<number | null>(null);

  /* ── Fetch board ─────────────────────────────────────────── */

  const fetchBoard = async () => {
    setLoading(true);
    setError("");
    try {
      // Tableau name
      const resTab = await authFetch(ROUTES_API.board(tabId));
      const jsonTab: APIResponse<Tableau> = await resTab.json();
      if (!jsonTab.success) throw new Error(jsonTab.error.message);
      setBoardName(jsonTab.data.nom);

      // Columns
      const resCols = await authFetch(ROUTES_API.colonnes(tabId));
      const jsonCols: APIResponse<Colonne[]> = await resCols.json();
      if (!jsonCols.success) throw new Error(jsonCols.error.message);

      // Tasks per column
      const cols: ColonneAvecTaches[] = await Promise.all(
        jsonCols.data.map(async col => {
          const resTsk = await authFetch(ROUTES_API.taches(col.id));
          const jsonTsk: APIResponse<Tache[]> = await resTsk.json();
          return { ...col, taches: jsonTsk.success ? jsonTsk.data : [] };
        })
      );
      // Sort by col.numero
      cols.sort((a, b) => a.numero - b.numero);
      setColumns(cols);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoard(); }, [tabId]);

  /* ── Task CRUD ──────────────────────────────────────────── */

  const openCreateTask = (colId: number) => {
    setEditTask(null);
    setTaskForm({ titre: "", details: "", dateLimite: "", priorite: "MOYENNE" });
    setTaskError("");
    setTaskModal({ colId });
  };

  const openEditTask = (task: Tache) => {
    setEditTask(task);
    setTaskForm({
      titre:      task.titre,
      details:    task.details ?? "",
      dateLimite: task.dateLimite ? task.dateLimite.slice(0, 16) : "",
      priorite:   task.priority,
    });
    setTaskError("");
    setTaskModal({ colId: task.colonneId });
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError("");
    if (!taskForm.titre.trim()) { setTaskError("Le titre est requis."); return; }
    setSaving(true);
    try {
      const body = {
        titre:      taskForm.titre.trim(),
        details:    taskForm.details || null,
        dateLimite: taskForm.dateLimite || null,
        priority:   taskForm.priorite,
        colonneId:  taskModal!.colId,
      };
      const res  = editTask
        ? await authFetch(ROUTES_API.tache(editTask.id), { method: "PUT",  body: JSON.stringify(body) })
        : await authFetch(ROUTES_API.taches(taskModal!.colId), { method: "POST", body: JSON.stringify(body) });
      const json: APIResponse<Tache> = await res.json();
      if (!json.success) throw new Error(json.error.message);
      setTaskModal(null);
      fetchBoard();
    } catch (e: unknown) {
      setTaskError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    await authFetch(ROUTES_API.tache(taskId), { method: "DELETE" });
    fetchBoard();
  };

  /* ── Drag & Drop ────────────────────────────────────────── */

  const handleDrop = async (targetColId: number) => {
    if (!dragTask || dragTask.colonneId === targetColId) {
      setDragTask(null); setDragOver(null); return;
    }
    await authFetch(ROUTES_API.tacheDeplacer(dragTask.id), {
      method: "PATCH",
      body:   JSON.stringify({ colonneId: targetColId }),
    });
    setDragTask(null);
    setDragOver(null);
    fetchBoard();
  };

  /* ── Helpers ────────────────────────────────────────────── */

  const priorityClass = (p: Priorite) =>
    p === "HAUTE" ? "badge-haute" : p === "MOYENNE" ? "badge-moyenne" : "badge-basse";

  const priorityLabel = (p: Priorite) =>
    p === "HAUTE" ? "↑ Haute" : p === "MOYENNE" ? "→ Moy." : "↓ Basse";

  const formatDate = (dt: string | null) => {
    if (!dt) return null;
    return new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  const isOverdue = (dt: string | null) => dt ? new Date(dt) < new Date() : false;

  return (
    <Layout title={boardName || "Tableau"}>
      <div className="dashboard-page">
        <button className="back-btn" onClick={() => navigate("/")}>
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
                  <span className="col-name">{col.nom}</span>
                  <span className="col-count">{col.taches.length}</span>
                </div>

                <div className="col-tasks">
                  {col.taches.map(task => (
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

                      <p className="task-title">{task.titre}</p>

                      {task.details && (
                        <p className="task-details">{task.details}</p>
                      )}

                      <div className="task-footer">
                        {task.dateLimite && (
                          <span className={`task-date ${isOverdue(task.dateLimite) ? "overdue" : ""}`}>
                            ⏰ {formatDate(task.dateLimite)}
                          </span>
                        )}
                        {task.assigneeId && (
                          <span className="task-assignee">#{task.assigneeId}</span>
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

      {/* Task modal */}
      {taskModal && (
        <div className="modal-overlay" onClick={() => setTaskModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editTask ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
            <form onSubmit={handleSaveTask} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {taskError && <div className="alert alert-error">⚠ {taskError}</div>}

              <div className="form-group">
                <label className="form-label">Titre</label>
                <input className="form-input" type="text" placeholder="Nom de la tâche…"
                  value={taskForm.titre} maxLength={50} autoFocus
                  onChange={e => setTaskForm(f => ({ ...f, titre: e.target.value }))} />
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
                  <select className="form-select" value={taskForm.priorite}
                    onChange={e => setTaskForm(f => ({ ...f, priorite: e.target.value as Priorite }))}>
                    <option value="BASSE">Basse</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="HAUTE">Haute</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date limite</label>
                  <input className="form-input" type="datetime-local"
                    value={taskForm.dateLimite}
                    onChange={e => setTaskForm(f => ({ ...f, dateLimite: e.target.value }))} />
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
