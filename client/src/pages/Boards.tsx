import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../utils/apiHelpers";
import { toSlug } from "../utils/slug";
import type { Board, Member } from "../model/interfaces";
import "../styles/boards.css";
import Tooltip from "../components/Tooltip";

type Role = "admin" | "editeur" | "lecteur";

/** Tableau enrichi du rôle de l'utilisateur connecté, tel que retourné par `GET /api/v1/boards/user/{id}`. */
interface BoardWithRole extends Board {
  role: Role;
}

/**
 * Invitation en attente enrichie du nom du tableau,
 * telle que retournée par `GET /api/v1/boards/invitations/me`.
 */
interface PendingInvitation extends Member {
  boardName: string;
}

/**
 * Page principale listant les tableaux Kanban de l'utilisateur connecté.
 *
 * Au montage, récupère en parallèle :
 * - les tableaux via `GET /api/v1/boards/user/{id}` ;
 * - les invitations en attente via `GET /api/v1/boards/invitations/me`.
 *
 * La création d'un tableau se fait via une carte placeholder dans la grille
 * (même pattern que la création de colonne dans le Dashboard), qui ouvre
 * une modale au clic.
 *
 * La section "Invitations en attente" s'affiche entre le titre principal et
 * la grille de tableaux lorsque l'utilisateur a des invitations non acceptées.
 *
 * @returns La page des tableaux, wrappée dans le composant {@link Layout}.
 */
export default function Boards() {
  const { authFetch, user } = useAuth();
  const navigate            = useNavigate();

  const [boards, setBoards]               = useState<BoardWithRole[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  // Invitations en attente
  const [invitations, setInvitations]         = useState<PendingInvitation[]>([]);
  const [invitationError, setInvitationError] = useState("");
  const [respondingId, setRespondingId]       = useState<number | null>(null);

  // Modale création
  const [showModal, setShowModal]         = useState(false);
  const [newName, setNewName]             = useState("");
  const [creating, setCreating]           = useState(false);
  const [createError, setCreateError]     = useState("");

  // Modale confirmation suppression — null = fermée, sinon = id du tableau ciblé
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // Modale confirmation quitter — null = fermée, sinon = id du tableau ciblé
  const [pendingLeave, setPendingLeave]   = useState<number | null>(null);
  const [leaving, setLeaving]             = useState(false);

  /**
   * Récupère la liste des tableaux de l'utilisateur connecté depuis l'API
   * et met à jour l'état local. Ne fait rien si `user.id` n'est pas disponible.
   */
  const fetchBoards = async (signal?: AbortSignal) => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(ROUTES_API.boardsByUser(user.id), { signal });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const data: BoardWithRole[] = await res.json();
      setBoards(data);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Récupère les invitations en attente de l'utilisateur connecté
   * via `GET /api/v1/boards/invitations/me`.
   * Les erreurs sont isolées pour ne pas bloquer l'affichage des tableaux.
   */
  const fetchInvitations = async (signal?: AbortSignal) => {
    setInvitationError("");
    try {
      const res = await authFetch(ROUTES_API.myPendingInvitations, { signal });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const data: PendingInvitation[] = await res.json();
      setInvitations(data);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setInvitationError(e instanceof Error ? e.message : "Erreur lors du chargement des invitations.");
    }
  };

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const controller = new AbortController();
    fetchBoards(controller.signal);
    fetchInvitations(controller.signal);
    return () => controller.abort();
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
   * directement vers le nouveau tableau en cas de succès.
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

  /** Ouvre la modale de confirmation de départ du tableau. */
  const askLeave = (e: React.MouseEvent, boardId: number) => {
    e.stopPropagation();
    setPendingLeave(boardId);
  };

  /** Confirme et exécute le départ du tableau avec mise à jour optimiste. */
  const confirmLeave = async () => {
    if (pendingLeave === null || !user?.id) return;
    const boardId  = pendingLeave;
    const previous = boards;

    setBoards(b => b.filter(board => board.id !== boardId));
    setPendingLeave(null);
    setError("");
    setLeaving(true);

    try {
      const res = await authFetch(ROUTES_API.boardMember(boardId, user.id), { method: "DELETE" });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
    } catch (e: unknown) {
      setBoards(previous);
      setError(e instanceof Error ? e.message : "Erreur lors du départ du tableau.");
    } finally {
      setLeaving(false);
    }
  };

  /**
   * Accepte une invitation via `PATCH /api/v1/boards/{boardId}/members/me/accept`.
   * Retire l'invitation de la liste et recharge les tableaux pour afficher le nouveau.
   */
  const handleAccept = async (boardId: number) => {
    setRespondingId(boardId);
    setInvitationError("");
    try {
      const res = await authFetch(ROUTES_API.acceptInvitation(boardId), { method: "PATCH", body: "{}" });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setInvitations(inv => inv.filter(i => i.boardId !== boardId));
      await fetchBoards();
    } catch (e: unknown) {
      setInvitationError(e instanceof Error ? e.message : "Erreur lors de l'acceptation.");
    } finally {
      setRespondingId(null);
    }
  };

  /**
   * Refuse une invitation via `DELETE /api/v1/boards/{boardId}/members/me/decline`.
   * Mise à jour optimiste : retire l'invitation immédiatement, rollback en cas d'erreur.
   */
  const handleDecline = async (boardId: number) => {
    setRespondingId(boardId);
    setInvitationError("");
    const previous = invitations;
    setInvitations(inv => inv.filter(i => i.boardId !== boardId));
    try {
      const res = await authFetch(ROUTES_API.declineInvitation(boardId), { method: "DELETE" });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
    } catch (e: unknown) {
      setInvitations(previous);
      setInvitationError(e instanceof Error ? e.message : "Erreur lors du refus.");
    } finally {
      setRespondingId(null);
    }
  };

  /** Retourne le libellé français du rôle. */
  const roleLabel = (role: Role) =>
    role === "admin" ? "Admin" : role === "editeur" ? "Éditeur" : "Lecteur";

  /** Retourne la classe CSS associée au rôle pour le badge coloré. */
  const roleClass = (role: Role) =>
    role === "admin" ? "role-admin" : role === "editeur" ? "role-editeur" : "role-lecteur";

  const pendingBoardName = boards.find(b => b.id === pendingDelete)?.name ?? "";
  const pendingLeaveName = boards.find(b => b.id === pendingLeave)?.name  ?? "";

  return (
    <Layout title="Mes tableaux">
      <div className="boards-page">

        {/* ── Invitations en attente ─────────────────────────── */}
        {(invitations.length > 0 || invitationError) && (
          <div className="boards-section">
            <div className="boards-toolbar">
              <h2 className="boards-title">
                Invitations en attente
                <span className="invitations-count">{invitations.length}</span>
              </h2>
            </div>
            {invitationError && <div className="alert alert-error">⚠ {invitationError}</div>}
            <div className="invitations-list">
              {invitations.map(inv => (
                <div key={inv.boardId} className="invitation-card">
                  <div className="invitation-info">
                    <span className="invitation-board-icon">▦</span>
                    <div>
                      <span className="invitation-board-name">{inv.boardName}</span>
                      <span className={`role-badge ${roleClass(inv.role as Role)}`} style={{ marginLeft: 8 }}>
                        {roleLabel(inv.role as Role)}
                      </span>
                    </div>
                  </div>
                  <div className="invitation-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAccept(inv.boardId)}
                      disabled={respondingId === inv.boardId}
                    >
                      {respondingId === inv.boardId ? "…" : "Accepter"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDecline(inv.boardId)}
                      disabled={respondingId === inv.boardId}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Mes tableaux ───────────────────────────────────── */}
        <div className="boards-section">
          <div className="boards-toolbar">
            <h2 className="boards-title">Mes tableaux</h2>
          </div>

          {loading && (
            <div className="loader">
              <span className="spinner" />
              Chargement…
            </div>
          )}

          {error && <div className="alert alert-error">⚠ {error}</div>}

          {!loading && (
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
                      <Tooltip text="Supprimer le tableau" position="top">
                        <button
                          className="board-delete-btn"
                          onClick={e => askDelete(e, board.id)}
                          aria-label="Supprimer le tableau"
                        >
                          ✕
                        </button>
                      </Tooltip>
                    )}
                    {board.creatorId !== user?.id && (
                      <Tooltip text="Quitter le tableau" position="top">
                        <button
                          className="board-leave-btn"
                          onClick={e => askLeave(e, board.id)}
                          aria-label="Quitter le tableau"
                        >
                          ⤴
                        </button>
                      </Tooltip>
                    )}
                  </div>
                  <h2 className="board-name">{board.name}</h2>
                  <div className="board-arrow">→</div>
                </div>
              ))}

              {/* Carte placeholder "Nouveau tableau" */}
              <button
                className="board-card-new"
                onClick={() => setShowModal(true)}
                aria-label="Créer un nouveau tableau"
              >
                <span className="board-card-new-icon">+</span>
                Nouveau tableau
              </button>
            </div>
          )}
        </div>
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

      {/* ── Modale : confirmation quitter tableau ─────────── */}
      {pendingLeave !== null && (
        <div className="modal-overlay" onClick={() => setPendingLeave(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Quitter le tableau</h2>
              <ModalCloseButton onClick={() => setPendingLeave(null)} />
            </div>

            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 6px" }}>
              Vous allez quitter le tableau <strong style={{ color: "var(--text)", fontWeight: 700 }}>«&nbsp;{pendingLeaveName}&nbsp;»</strong>.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 24px", fontFamily: "'DM Mono', monospace" }}>
              Vous n'y aurez plus accès à moins d'y être ré-invité.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPendingLeave(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmLeave} disabled={leaving}>
                {leaving ? "Départ…" : "Quitter"}
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