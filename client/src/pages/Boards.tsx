import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import type { Tableau, Role, APIResponse } from "../model/interfaces";
import "../styles/boards.css";

interface TableauAvecRole extends Tableau {
  role: Role;
}

export default function Boards() {
  const { authFetch, user } = useAuth();
  const navigate            = useNavigate();

  const [boards, setBoards]           = useState<TableauAvecRole[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [newName, setNewName]         = useState("");
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchBoards = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res  = await authFetch(ROUTES_API.tableauxUser(user.id));
      const json: APIResponse<TableauAvecRole[]> = await res.json();
      if (!json.success) throw new Error(json.error.message);
      setBoards(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoards(); }, [user?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!newName.trim()) { setCreateError("Le nom est requis."); return; }
    setCreating(true);
    try {
      const res  = await authFetch(ROUTES_API.tableaux, {
        method: "POST",
        body:   JSON.stringify({ nom: newName.trim() }),
      });
      const json: APIResponse<Tableau> = await res.json();
      if (!json.success) throw new Error(json.error.message);
      setShowModal(false);
      setNewName("");
      fetchBoards();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setCreating(false);
    }
  };

  const roleLabel = (role: Role) =>
    role === "ADMIN" ? "Admin" : role === "EDITEUR" ? "Éditeur" : "Lecteur";

  const roleClass = (role: Role) =>
    role === "ADMIN" ? "role-admin" : role === "EDITEUR" ? "role-editeur" : "role-lecteur";

  return (
    <Layout title="Mes tableaux">
      <div className="boards-page">
        {/* Toolbar */}
        <div className="boards-toolbar">
          <p className="boards-count">
            {boards.length} tableau{boards.length !== 1 ? "x" : ""}
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
                onClick={() => navigate(`/tables/${board.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && navigate(`/tables/${board.id}`)}
              >
                <div className="board-card-header">
                  <span className="board-icon">▦</span>
                  <span className={`role-badge ${roleClass(board.role)}`}>
                    {roleLabel(board.role)}
                  </span>
                </div>
                <h2 className="board-name">{board.nom}</h2>
                <div className="board-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
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
