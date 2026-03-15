import type { Task, Priority } from "../model/interfaces";

interface Props {
  task: Task;
  columnName: string;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

const priorityClass = (p: Priority) =>
  p === "haute" ? "badge-haute" : p === "moyenne" ? "badge-moyenne" : "badge-basse";

const priorityLabel = (p: Priority) =>
  p === "haute" ? "↑ Haute" : p === "moyenne" ? "→ Moy." : "↓ Basse";

const formatDate = (dt: string | null | undefined) =>
  dt
    ? new Date(dt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

const isOverdue = (dt: string | null | undefined) =>
  dt ? new Date(dt) < new Date() : false;

/**
 * Modale de détail d'une tâche, inspirée de Trello.
 * Affiche toutes les informations de la tâche et prépare une section commentaires.
 *
 * @param task        - Tâche à afficher.
 * @param columnName  - Nom de la colonne parente (affiché en sous-titre).
 * @param onClose     - Ferme la modale.
 * @param onEdit      - Ouvre la modale d'édition pour cette tâche.
 * @param onDelete    - Supprime la tâche.
 */
export default function TaskDetailModal({ task, columnName, onClose, onEdit, onDelete }: Props) {
  const overdue = isOverdue(task.dueDate);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal task-detail-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* ── En-tête ── */}
        <div className="task-detail-header">
          <div className="task-detail-meta">
            <span className={`badge ${priorityClass(task.priority)}`}>
              {priorityLabel(task.priority)}
            </span>
            <span className="task-detail-column">dans <strong>{columnName}</strong></span>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fermer">✕</button>
        </div>

        {/* ── Titre ── */}
        <h2 className="task-detail-title">{task.title}</h2>

        {/* ── Corps ── */}
        <div className="task-detail-body">

          {/* Colonne principale */}
          <div className="task-detail-main">

            {/* Description */}
            <section className="task-detail-section">
              <h3 className="task-detail-section-title">📋 Description</h3>
              {task.details
                ? <p className="task-detail-description">{task.details}</p>
                : <p className="task-detail-empty">Aucune description.</p>
              }
            </section>

            {/* Commentaires — section préparée pour plus tard */}
            <section className="task-detail-section">
              <h3 className="task-detail-section-title">💬 Commentaires</h3>
              <p className="task-detail-empty">Les commentaires arrivent bientôt…</p>
            </section>
          </div>

          {/* Colonne latérale */}
          <aside className="task-detail-sidebar">

            {task.dueDate && (
              <div className="task-detail-info-block">
                <span className="task-detail-info-label">⏰ Date limite</span>
                <span className={`task-detail-info-value ${overdue ? "overdue" : ""}`}>
                  {formatDate(task.dueDate)}
                  {overdue && <em> (en retard)</em>}
                </span>
              </div>
            )}

            {task.assignedId && (
              <div className="task-detail-info-block">
                <span className="task-detail-info-label">👤 Assigné à</span>
                <span className="task-detail-info-value">#{task.assignedId}</span>
              </div>
            )}

            <div className="task-detail-info-block">
              <span className="task-detail-info-label"># Identifiant</span>
              <span className="task-detail-info-value task-detail-id">#{task.id}</span>
            </div>

            {/* Actions */}
            <div className="task-detail-actions">
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={() => { onClose(); onEdit(task); }}
              >
                ✎ Modifier
              </button>
              <button
                className="btn btn-ghost danger"
                style={{ width: "100%" }}
                onClick={() => onDelete(task.id)}
              >
                ✕ Supprimer
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
