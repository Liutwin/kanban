import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import type { Board } from "../model/interfaces";
import "../styles/boards.css";

type Role = "ADMIN" | "EDITEUR" | "LECTEUR";

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

  const [boards, setBoards]           = useState<BoardWithRole[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [newName, setNewName]         = useState("");
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

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
      if (!res.ok) throw new Error(`Erreur serveur (${res.status}).`);
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

  /**
   * Soumet le formulaire de création de tableau.
   *
   * Envoie un `POST /api/v1/boards` avec le nom saisi, puis ferme la modale
   * et rafraîchit la liste en cas de succès.
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
        body:   JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message ?? `Erreur serveur (${res.status}).`);
      }
      setShowModal(false);
      setNewName("");
      fetchBoards();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setCreating(false);
    }
  };

  /** Retourne le libellé français du rôle. */
  const roleLabel = (role: Role) =>
    role === "ADMIN" ? "Admin" : role === "EDITEUR" ? "Éditeur" : "Lecteur";

  /** Retourne la classe CSS associée au rôle pour le badge coloré. */
  const roleClass = (role: Role) =>
    role === "ADMIN" ? "role-admin" : role === "EDITEUR" ? "role-editeur" : "role-lecteur";

  return (
    <Layout title="Mes tableaux">
      <div className="boards-page">
        <div className="boards-toolbar">
          <p className="boards-count">
            {boards.length} board{boards.length !== 1 ? "x" : ""}
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nouveau tableau
          </button>
        </div>

        {loading && (
          <div className="loader">
            <span className="spinner" style={{ borderTopColor: "#a3e635" }} />
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
                onClick={() => navigate(`/boards/${board.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && navigate(`/boards/${board.id}`)}
              >
                <div className="board-card-header">
                  <span className="board-icon">▦</span>
                  <span className={`role-badge ${roleClass(board.role)}`}>
                    {roleLabel(board.role)}
                  </span>
                </div>
                <h2 className="board-name">{board.name}</h2>
                <div className="board-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nouveau tableau</h2>
            <form onSubmit={handleCreate}>
              {createError && (
                <div className="alert alert-error" style={{ marginBottom: 14 }}>
                  ⚠ {createError}
                </div>
              )}
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
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
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
    </Layout>
  );
}