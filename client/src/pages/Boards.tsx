import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../utils/apiHelpers";
import { toSlug } from "../utils/slug";
import type { Board } from "../model/interfaces";
import "../styles/boards.css";

type Role = "admin" | "editeur" | "lecteur";

/** Tableau enrichi du rôle de l'utilisateur connecté, tel que retourné par `GET /api/v1/boards/user/{id}`. */
interface BoardWithRole extends Board {
  role: Role;
}

/**
 * Page principale listant les tableaux Kanban de l'utilisateur connecté.
 *
 * Au montage, récupère les tableaux via `GET /api/v1/boards/user/{id}`.
 * Permet de créer un nouveau tableau via une modale (`POST /api/v1/boards`),
 * puis navigue vers `/boards/{id}` au clic sur une carte.
 *
 * @returns La page des tableaux, wrappée dans le composant {@link Layout}.
 */
export default function Boards() {
  const { authFetch, user } = useAuth();
  const navigate            = useNavigate();

  const [boards, setBoards]               = useState<BoardWithRole[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  // Modale création
  const [showModal, setShowModal]         = useState(false);
  const [newName, setNewName]             = useState("");
  const [creating, setCreating]           = useState(false);
  const [createError, setCreateError]     = useState("");

  // Modale confirmation suppression — null = fermée, sinon = id du tableau ciblé
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [deleting, setDeleting]           = useState(false);

  /**
   * Récupère la liste des tableaux de l'utilisateur connecté depuis l'API
   * et met à jour l'état local. Ne fait rien si `user.id` n'est pas disponible.
   */
  const fetchBoards = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(ROUTES_API.boardsByUser(user.id));
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const data: BoardWithRole[] = await res.json();
      setBoards(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetchBoards();
  }, [user?.id]);

  /** Ferme la modale de création et réinitialise son état interne. */
  const closeCreateModal = () => {
    setShowModal(false);
    setNewName("");
    setCreateError("");
  };

  /**
   * Soumet le formulaire de création de tableau.
   *
   * Envoie un `POST /api/v1/boards` avec le nom saisi, puis redirige
   * directement vers le nouveau tableau en cas de succès (évite le
   * re-fetch et le flash de chargement sur la page de liste).
   *
   * @param e - Événement de soumission du formulaire.
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!newName.trim()) { setCreateError("Le nom est requis."); return; }
    setCreating(true);
    try {
      const res = await authFetch(ROUTES_API.boards, {
        method: "POST",
        body:   JSON.stringify({ name: newName.trim(), creatorId: user!.id }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const created: Board = await res.json();
      navigate(`/boards/${created.id}-${toSlug(created.name)}`, { state: { role: "admin" } });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Erreur.");
      setCreating(false);
    }
  };

  /**
   * Ouvre la modale de confirmation de suppression.
   * stopPropagation empêche la navigation vers le tableau.
   */
  const askDelete = (e: React.MouseEvent, boardId: number) => {
    e.stopPropagation();
    setPendingDelete(boardId);
  };

  /**
   * Confirme et exécute la suppression avec mise à jour optimiste.
   *
   * Retire le tableau de la liste immédiatement, ferme la modale, puis
   * envoie `DELETE /api/v1/boards/{id}`. En cas d'erreur API, restaure
   * le tableau à sa position d'origine.
   */
  const confirmDelete = async () => {
    if (pendingDelete === null) return;
    const boardId  = pendingDelete;
    const previous = boards;

    setBoards(b => b.filter(board => board.id !== boardId));
    setPendingDelete(null);
    setError("");
    setDeleting(true);

    try {
      const res = await authFetch(ROUTES_API.board(boardId), { method: "DELETE" });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
    } catch (e: unknown) {
      setBoards(previous);
      setError(e instanceof Error ? e.message : "Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  };

  /** Retourne le libellé français du rôle. */
  const roleLabel = (role: Role) =>
    role === "admin" ? "Admin" : role === "editeur" ? "Éditeur" : "Lecteur";

  /** Retourne la classe CSS associée au rôle pour le badge coloré. */
  const roleClass = (role: Role) =>
    role === "admin" ? "role-admin" : role === "editeur" ? "role-editeur" : "role-lecteur";

  const pendingBoardName = boards.find(b => b.id === pendingDelete)?.name ?? "";

  return (
    <Layout title="Mes tableaux">
      <div className="boards-page">
        <div className="boards-toolbar">
          <h2 className="boards-title">Mes tableaux</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nouveau tableau
          </button>
        </div>

        {loading && (
          <div className="loader">
            <span className="spinner" />
            Chargement…
          </div>
        )}

        {error && <div className="alert alert-error">⚠ {error}</div>}

        {!loading && !error && boards.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">▦</span>
            <p>Aucun tableau pour l'instant</p>
            <button className="btn btn-ghost" onClick={() => setShowModal(true)}>
              Créer votre premier tableau
            </button>
          </div>
        )}

        {!loading && boards.length > 0 && (
          <div className="boards-grid">
            {boards.map(board => (
              <div
                key={board.id}
                className="board-card"
                onClick={() => navigate(`/boards/${board.id}-${toSlug(board.name)}`, { state: { role: board.role } })}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && navigate(`/boards/${board.id}-${toSlug(board.name)}`, { state: { role: board.role } })}
              >
                <div className="board-card-header">
                  <span className="board-icon">▦</span>
                  <span className={`role-badge ${roleClass(board.role)}`}>
                    {roleLabel(board.role)}
                  </span>
                  {board.role === "admin" && (
                    <button
                      className="board-delete-btn"
                      onClick={e => askDelete(e, board.id)}
                      title="Supprimer le tableau"
                      aria-label="Supprimer le tableau"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <h2 className="board-name">{board.name}</h2>
                <div className="board-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modale : nouveau tableau ─────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Nouveau tableau</h2>
              <ModalCloseButton onClick={closeCreateModal} />
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {createError && <div className="alert alert-error">⚠ {createError}</div>}

              <div className="form-group">
                <label className="form-label">Nom du tableau</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mon projet…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
                <span style={{ alignSelf: "flex-end", fontSize: 11, color: "var(--text-3)", fontFamily: "'DM Mono', monospace" }}>
                  {newName.length}/50
                </span>
              </div>

              <div className="modal-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={closeCreateModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale : confirmation suppression ────────────────── */}
      {pendingDelete !== null && (
        <div className="modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Supprimer le tableau</h2>
              <ModalCloseButton onClick={() => setPendingDelete(null)} />
            </div>

            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 6px" }}>
              Le tableau <strong style={{ color: "var(--text)", fontWeight: 700 }}>«&nbsp;{pendingBoardName}&nbsp;»</strong> et
              toutes ses colonnes et tâches seront définitivement supprimés.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 24px", fontFamily: "'DM Mono', monospace" }}>
              Cette action est irréversible.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

/** Bouton ✕ standard des en-têtes de modale. */
function ModalCloseButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:     hovered ? "rgba(242,139,130,0.12)" : "none",
        border:         `1px solid ${hovered ? "rgba(242,139,130,0.25)" : "transparent"}`,
        color:          hovered ? "#f28b82" : "var(--text-3)",
        cursor:         "pointer",
        width:          28,
        height:         28,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        borderRadius:   8,
        fontSize:       14,
        transition:     "all 0.15s",
        flexShrink:     0,
      }}
      aria-label="Fermer"
    >
      ✕
    </button>
  );
}