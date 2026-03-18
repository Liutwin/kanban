import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_API } from "../config/api";
import { getAvatarStyle } from "../utils/avatarColor";
import { extractErrorMessage } from "../utils/apiHelpers";
import UserAvatar, { prefetchAvatars } from "../components/UserAvatar";
import { toSlug } from "../utils/slug";
import type { User, Member, Board } from "../model/interfaces";
import "../styles/admin.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types locaux
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Statistiques globales de l'application, agrégées depuis l'API.
 */
interface AdminStats {
  /** Nombre total de comptes utilisateurs enregistrés. */
  totalUsers: number;
  /** Nombre total de tableaux Kanban créés. */
  totalBoards: number;
  /** Nombre total de tâches toutes colonnes confondues. */
  totalTasks: number;
  /** Nombre de comptes ayant le droit administrateur. */
  adminCount: number;
}

/**
 * Données d'un utilisateur affichées dans la liste d'administration.
 * Étend {@link User} avec les champs supplémentaires exposés par l'API Spring.
 */
interface AdminUser extends User {
  /** URL de l'avatar personnalisé (optionnel). */
  avatarURL?: string;
}

/**
 * Invitation en attente enrichie pour l'affichage dans le tableau admin.
 * Agrège les données de {@link Member} avec le nom du tableau et
 * les informations de l'utilisateur invité.
 */
interface PendingInvitationAdmin extends Member {
  /** Nom du tableau concerné. */
  boardName: string;
  /** Données de l'utilisateur invité, chargées séparément. */
  user?: AdminUser;
}

/** Délai de debounce (ms) pour le champ de recherche. */
const SEARCH_DEBOUNCE_MS = 250;

const ROLE_LABELS: Record<Member["role"], string> = {
  admin:   "Admin",
  editeur: "Éditeur",
  lecteur: "Lecteur",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : Carte de statistique
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accent: string;
  loading?: boolean;
}

function StatCard({ icon, value, label, accent, loading }: StatCardProps) {
  return (
    <div className="admin-stat-card" style={{ "--stat-accent": accent } as React.CSSProperties}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-body">
        {loading
          ? <div className="admin-skeleton admin-skeleton--value" />
          : <span className="admin-stat-value">{value}</span>
        }
        <span className="admin-stat-label">{label}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : Toggle admin inline
// ─────────────────────────────────────────────────────────────────────────────

interface AdminToggleProps {
  isAdmin: boolean;
  pending: boolean;
  disabled?: boolean;
  onChange: (newValue: boolean) => void;
  label: string;
}

function AdminToggle({ isAdmin, pending, disabled, onChange, label }: AdminToggleProps) {
  const isDisabled = pending || disabled;
  return (
    <button
      role="switch"
      aria-checked={isAdmin}
      aria-label={label}
      className={`admin-toggle ${isAdmin ? "admin-toggle--on" : ""} ${pending ? "admin-toggle--pending" : ""}`}
      onClick={() => !isDisabled && onChange(!isAdmin)}
      disabled={isDisabled}
      title={disabled ? "Vous ne pouvez pas retirer vos propres droits admin" : isAdmin ? "Retirer les droits admin" : "Accorder les droits admin"}
      style={disabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
    >
      <span className="admin-toggle-thumb" aria-hidden="true" />
      {pending && <span className="admin-toggle-spinner" aria-hidden="true" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : Ligne utilisateur
// ─────────────────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: AdminUser;
  isSelf: boolean;
  adminPending: boolean;
  onToggleAdmin: (user: AdminUser, newValue: boolean) => void;
  onViewProfile: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

/**
 * Ligne de tableau représentant un utilisateur dans la liste d'administration.
 *
 * Affiche : avatar dégradé déterministe, nom complet avec badge "Vous",
 * e-mail, toggle admin inline et bouton de suppression.
 *
 * Le toggle est entièrement contrôlé par `user.isAdmin` — aucun état local —
 * ce qui garantit qu'il reflète toujours fidèlement la valeur serveur,
 * y compris après une mise à jour optimiste et un éventuel rollback.
 */
function UserRow({ user, isSelf, adminPending, onToggleAdmin, onViewProfile, onDelete }: UserRowProps) {
  return (
    <tr className={`admin-user-row ${isSelf ? "admin-user-row--self" : ""}`}>

      {/* Avatar */}
      <td className="admin-user-td admin-user-td--avatar">
        <UserAvatar
          userId={user.id}
          firstName={user.firstName}
          lastName={user.lastName}
          hasAvatar={!!user.avatarURL}
          size={34}
          className="admin-user-avatar"
        />
      </td>

      {/* Nom */}
      <td className="admin-user-td">
        <div className="admin-user-name-block">
          <span className="admin-user-fullname">{user.firstName} {user.lastName}</span>
          {isSelf && <span className="admin-user-self-tag">Vous</span>}
        </div>
      </td>

      {/* E-mail */}
      <td className="admin-user-td admin-user-td--email">
        <span className="admin-user-email">{user.email}</span>
      </td>

      {/* Toggle admin */}
      <td className="admin-user-td admin-user-td--toggle">
        <div className="admin-toggle-cell">
          <AdminToggle
            isAdmin={user.isAdmin}
            pending={adminPending}
            onChange={v => onToggleAdmin(user, v)}
            label={`Droits admin — ${user.firstName} ${user.lastName}`}
            disabled={isSelf}
          />
          <span
            className={`admin-toggle-label ${user.isAdmin ? "admin-toggle-label--on" : ""}`}
            title={isSelf ? "Vous ne pouvez pas retirer vos propres droits admin" : undefined}
            style={isSelf ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
          >
            {user.isAdmin ? "Admin" : "Membre"}
          </span>
        </div>
      </td>

      {/* Voir le profil */}
      <td className="admin-user-td admin-user-td--actions">
        <button
          className="admin-action-btn admin-action-btn--profile"
          onClick={() => onViewProfile(user)}
          aria-label={`Voir le profil de ${user.firstName} ${user.lastName}`}
          title="Voir le journal d'activité"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Voir le profil
        </button>
      </td>

      {/* Suppression — désactivée pour soi-même */}
      <td className="admin-user-td admin-user-td--actions">
        {!isSelf && (
          <button
            className="admin-action-btn admin-action-btn--delete"
            onClick={() => onDelete(user)}
            aria-label={`Supprimer ${user.firstName} ${user.lastName}`}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <polyline points="3,4 13,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 4V3h6v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 4l1 9h6l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Supprimer
          </button>
        )}
      </td>

    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : Modal de confirmation de suppression
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  user: AdminUser;
  submitting: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modale de confirmation avant suppression définitive d'un utilisateur.
 * Affiche une preview du compte ciblé et rappelle les effets de bord.
 */
function DeleteConfirmModal({ user, submitting, error, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmer la suppression"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="admin-modal">
        <div className="admin-modal-header">
          <div className="admin-modal-warning-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L22 21H2L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <line x1="12" y1="10" x2="12" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="18.5" r="0.9" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <h3 className="admin-modal-title">Supprimer l'utilisateur</h3>
            <p className="admin-modal-subtitle">Cette action est irréversible.</p>
          </div>
        </div>

        <div className="admin-modal-user-preview">
          <UserAvatar
            userId={user.id}
            firstName={user.firstName}
            lastName={user.lastName}
            hasAvatar={!!user.avatarURL}
            size={42}
            className="admin-modal-user-avatar"
          />
          <div>
            <p className="admin-modal-user-name">{user.firstName} {user.lastName}</p>
            <p className="admin-modal-user-email">{user.email}</p>
          </div>
        </div>

        <p className="admin-modal-body">
          La suppression de ce compte entraîne la perte de toutes ses participations aux tableaux.
          Les tâches créées ou assignées à cet utilisateur seront conservées.
        </p>

        {error && <div className="admin-form-error" role="alert">{error}</div>}

        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={submitting}>
            Annuler
          </button>
          <button className="admin-btn admin-btn--danger" onClick={onConfirm} disabled={submitting}>
            {submitting && <span className="admin-btn-spinner" aria-hidden="true" />}
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal : Admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Page d'administration de l'application Kanban.
 *
 * Accessible uniquement aux utilisateurs dont `isAdmin === true`.
 * Périmètre intentionnellement limité pour des raisons RGPD :
 * l'administrateur ne peut **pas** modifier les données personnelles
 * (nom, prénom, e-mail, mot de passe) des autres utilisateurs — seul
 * chaque utilisateur peut le faire depuis sa propre page de profil.
 *
 * Les actions exposées sont :
 * - **Basculer le droit admin** via un toggle inline (optimiste + rollback).
 * - **Supprimer un compte** avec modale de confirmation.
 * - **Valider ou annuler les invitations en attente** sur tous les tableaux :
 *   agrège les invitations `notified = false` de chaque tableau accessible
 *   et permet à l'admin de les débloquer sans attendre l'action de l'invité.
 *
 * **Anti-boucle infinie** : `authFetch` est stocké dans un `useRef` pour
 * que `fetchUsers` et `fetchStats` aient des tableaux de dépendances vides
 * (`[]`) et ne soient jamais recréés entre deux renders.
 */
export default function Admin() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  /**
   * Référence stable vers `authFetch`.
   * Sans ce ref, `authFetch` (recréé à chaque render par `useAuth`) se
   * retrouverait dans les deps de `useCallback`, ce qui recrée les fonctions,
   * ce qui rejoue le `useEffect`, ce qui appelle `setState`, ce qui re-rend —
   * boucle infinie.
   */
  const authFetchRef = useRef(authFetch);
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  const [users,        setUsers]        = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError,   setUsersError]   = useState("");

  // ── Toggle admin en vol ───────────────────────────────────────────────────
  /**
   * IDs des utilisateurs dont le toggle admin est actuellement en transit réseau.
   * Permet de désactiver uniquement le toggle concerné sans geler le reste du tableau.
   */
  const [adminPendingIds, setAdminPendingIds] = useState<Set<number>>(new Set());

  // ── Statistiques ──────────────────────────────────────────────────────────
  const [stats,        setStats]        = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Recherche debounce ────────────────────────────────────────────────────
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Suppression ───────────────────────────────────────────────────────────
  const [deleteTarget,     setDeleteTarget]     = useState<AdminUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError,      setDeleteError]      = useState("");

  // ── Invitations en attente ────────────────────────────────────────────────
  /**
   * Toutes les invitations en attente agrégées sur l'ensemble des tableaux.
   * Chargées en récupérant d'abord tous les tableaux, puis pour chacun
   * les participations avec `notified = false`.
   */
  const [pendingInvitations,        setPendingInvitations]        = useState<PendingInvitationAdmin[]>([]);
  const [loadingInvitations,        setLoadingInvitations]        = useState(true);
  /** ID `${boardId}-${userId}` de l'invitation en cours de validation. */
  const [validatingInvitationKey,   setValidatingInvitationKey]   = useState<string | null>(null);
  /** ID `${boardId}-${userId}` de l'invitation en cours d'annulation. */
  const [cancellingInvitationKey,   setCancellingInvitationKey]   = useState<string | null>(null);
  const [invitationError,           setInvitationError]           = useState("");

  // ─────────────────────────────────────────────────────────────────────────
  // Chargement
  // ─────────────────────────────────────────────────────────────────────────

  /** Charge tous les comptes utilisateurs depuis `GET /api/v1/users`. */
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const res  = await authFetchRef.current(ROUTES_API.users);
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const json = await res.json();
      const userList: AdminUser[] = Array.isArray(json) ? json : (json?.data ?? []);
      setUsers(userList);
      prefetchAvatars(userList, authFetchRef.current);
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoadingUsers(false);
    }
  }, []); // [] stable — authFetch via ref

  /**
   * Charge les statistiques globales (boards, tasks, users, admins).
   * Utilise GET /users/profiles pour récupérer le total de tâches (somme
   * des tasksCreated), car il n'existe pas de endpoint GET /tasks global.
   */
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [profilesRes, boardsRes] = await Promise.allSettled([
        authFetchRef.current(ROUTES_API.userProfiles),
        authFetchRef.current(ROUTES_API.boards),
      ]);

      type ProfileItem = { admin: boolean; tasksCreated: number };
      const profiles: ProfileItem[] =
        profilesRes.status === "fulfilled" && profilesRes.value.ok
          ? await profilesRes.value.json().then((j: unknown) =>
              Array.isArray(j) ? j : ((j as { data?: unknown[] })?.data ?? [])
            )
          : [];

      const boards =
        boardsRes.status === "fulfilled" && boardsRes.value.ok
          ? await boardsRes.value.json().then((j: unknown) =>
              Array.isArray(j) ? j : ((j as { data?: unknown[] })?.data ?? [])
            )
          : [];

      setStats({
        totalUsers:  profiles.length,
        totalBoards: (boards as unknown[]).length,
        totalTasks:  profiles.reduce((sum, p) => sum + (p.tasksCreated ?? 0), 0),
        adminCount:  profiles.filter(p => p.admin).length,
      });
    } catch { /* silencieux : les stats sont optionnelles */ } finally {
      setLoadingStats(false);
    }
  }, []); // [] stable — authFetch via ref

  /**
   * Charge toutes les invitations en attente sur l'ensemble des tableaux.
   *
   * Stratégie : récupère d'abord la liste complète des tableaux via
   * `GET /boards`, puis pour chacun interroge `GET /boards/{id}/members/pending`.
   * Les requêtes par tableau sont parallélisées. Les données utilisateur
   * de chaque invité sont ensuite enrichies en un second passage parallèle.
   *
   * Les erreurs par tableau sont silencieuses pour ne pas bloquer
   * l'affichage des tableaux qui fonctionnent.
   */
  const fetchPendingInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    setInvitationError("");
    try {
      const boardsRes = await authFetchRef.current(ROUTES_API.boards);
      if (!boardsRes.ok) throw new Error(await extractErrorMessage(boardsRes));
      const boardsJson = await boardsRes.json();
      const boards: Board[] = Array.isArray(boardsJson) ? boardsJson : (boardsJson?.data ?? []);

      // Invitations en attente par tableau — en parallèle
      const perBoard = await Promise.allSettled(
        boards.map(async board => {
          const res = await authFetchRef.current(ROUTES_API.boardPendingInvitations(board.id));
          if (!res.ok) return [];
          const json = await res.json();
          const members: Member[] = Array.isArray(json) ? json : (json?.data ?? []);
          return members.map(m => ({ ...m, boardName: board.name }));
        })
      );

      const flat: PendingInvitationAdmin[] = perBoard
        .flatMap(r => r.status === "fulfilled" ? r.value : []);

      // Enrichissement avec les données utilisateur — en parallèle
      const enriched = await Promise.all(
        flat.map(async inv => {
          try {
            const r    = await authFetchRef.current(ROUTES_API.user(inv.userId));
            const json = await r.json();
            const u: AdminUser = r.ok
              ? (Array.isArray(json) ? json : (json?.data ?? json))
              : undefined;
            return { ...inv, user: u };
          } catch {
            return inv;
          }
        })
      );

      setPendingInvitations(enriched);
    } catch (e: unknown) {
      setInvitationError(e instanceof Error ? e.message : "Erreur lors du chargement des invitations.");
    } finally {
      setLoadingInvitations(false);
    }
  }, []); // [] stable — authFetch via ref

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchPendingInvitations();
  }, [fetchUsers, fetchStats, fetchPendingInvitations]);

  // ─────────────────────────────────────────────────────────────────────────
  // Debounce recherche
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  /** Utilisateurs filtrés selon la recherche (prénom, nom, e-mail — insensible à la casse). */
  // IDs des utilisateurs ayant une invitation en attente — exclus de la liste membres
  // pour éviter le doublon (l'utilisateur apparaît déjà comme ligne d'invitation).
  const pendingUserIds = new Set(pendingInvitations.map(i => i.userId));

  const filteredUsers = users.filter(u => {
    if (pendingUserIds.has(u.id)) return false;
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q)  ||
      u.email.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Actions — utilisateurs
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bascule le droit administrateur d'un utilisateur.
   *
   * Stratégie **optimiste** : la liste locale est mise à jour immédiatement
   * pour une réactivité maximale. En cas d'erreur réseau, la liste est
   * rechargée depuis le serveur (rollback implicite).
   */
  const handleToggleAdmin = useCallback(async (target: AdminUser, newValue: boolean) => {
    setUsers(prev => prev.map(u => u.id === target.id ? { ...u, isAdmin: newValue } : u));
    setAdminPendingIds(prev => new Set(prev).add(target.id));

    try {
      const res = await authFetchRef.current(ROUTES_API.user(target.id), {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:     target.email,
          firstName: target.firstName,
          lastName:  target.lastName,
          admin:     newValue,
        }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));

      setStats(prev => prev
        ? { ...prev, adminCount: prev.adminCount + (newValue ? 1 : -1) }
        : prev
      );
    } catch {
      await fetchUsers();
    } finally {
      setAdminPendingIds(prev => { const s = new Set(prev); s.delete(target.id); return s; });
    }
  }, [fetchUsers]);

  const handleViewProfile = useCallback((target: AdminUser) => {
    const slug = `${toSlug(target.firstName)}-${toSlug(target.lastName)}`;
    navigate(`/logs/users/${slug}`);
  }, [navigate]);

  /**
   * Supprime définitivement l'utilisateur ciblé via `DELETE /api/v1/users/{id}`.
   * Recharge la liste et met à jour les stats après succès.
   */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      const res = await authFetchRef.current(ROUTES_API.user(deleteTarget.id), { method: "DELETE" });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setDeleteTarget(null);
      await fetchUsers();
      setStats(prev => prev ? {
        ...prev,
        totalUsers: prev.totalUsers - 1,
        adminCount: deleteTarget.isAdmin ? prev.adminCount - 1 : prev.adminCount,
      } : prev);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Impossible de supprimer.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Actions — invitations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valide une invitation en attente via
   * `PATCH /boards/{boardId}/members/{userId}/validate`.
   * Retire l'invitation de la liste locale après succès.
   */
  const handleValidateInvitation = async (boardId: number, userId: number) => {
    const key = `${boardId}-${userId}`;
    setValidatingInvitationKey(key);
    setInvitationError("");
    try {
      const res = await authFetchRef.current(
        ROUTES_API.validateInvitation(boardId, userId),
        { method: "PATCH", body: "{}" }
      );
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setPendingInvitations(prev => prev.filter(i => !(i.boardId === boardId && i.userId === userId)));
    } catch (e: unknown) {
      setInvitationError(e instanceof Error ? e.message : "Erreur lors de la validation.");
    } finally {
      setValidatingInvitationKey(null);
    }
  };

  /**
   * Annule une invitation en attente via
   * `DELETE /boards/{boardId}/members/{userId}`.
   * Mise à jour optimiste : retire immédiatement de la liste, rollback si erreur.
   */
  const handleCancelInvitation = async (boardId: number, userId: number) => {
    const key = `${boardId}-${userId}`;
    setCancellingInvitationKey(key);
    setInvitationError("");
    const previous = pendingInvitations;
    setPendingInvitations(prev => prev.filter(i => !(i.boardId === boardId && i.userId === userId)));
    try {
      const res = await authFetchRef.current(
        ROUTES_API.boardMember(boardId, userId),
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await extractErrorMessage(res));
    } catch (e: unknown) {
      setPendingInvitations(previous);
      setInvitationError(e instanceof Error ? e.message : "Erreur lors de l'annulation.");
    } finally {
      setCancellingInvitationKey(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout title="Administration">
      <div className="admin-page">

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <div className="admin-page-header">
          <div className="admin-page-header-text">
            <h2 className="admin-page-title">Gestion des membres</h2>
            <p className="admin-page-subtitle">
              {loadingUsers
                ? "Chargement…"
                : `${users.length} compte${users.length > 1 ? "s" : ""} enregistré${users.length > 1 ? "s" : ""}`
              }
            </p>
          </div>
        </div>

        {/* ── Statistiques ────────────────────────────────────────────── */}
        <div className="admin-stats-grid">
          <StatCard
            icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1 17c0-3 2.7-5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M19 17c0-3-2.7-5-6-5s-6 2-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            value={stats?.totalUsers ?? 0} label="Utilisateurs" accent="#b0a6ff" loading={loadingStats}
          />
          <StatCard
            icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><rect x="2" y="3" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/><line x1="7" y1="3" x2="7" y2="17" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5"/><line x1="13" y1="3" x2="13" y2="17" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5"/></svg>}
            value={stats?.totalBoards ?? 0} label="Tableaux" accent="#64d2c8" loading={loadingStats}
          />
          <StatCard
            icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><polyline points="7,10 9,12 13,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            value={stats?.totalTasks ?? 0} label="Tâches" accent="#81c995" loading={loadingStats}
          />
          <StatCard
            icon={<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="8,6 10,8 13,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            value={stats?.adminCount ?? 0} label="Admins" accent="#fdd663" loading={loadingStats}
          />
        </div>

        {invitationError && (
          <div className="admin-form-error" role="alert">{invitationError}</div>
        )}

        {/* ── Barre de recherche ───────────────────────────────────────── */}
        <div className="admin-toolbar">
          <div className="admin-search-wrap">
            <svg className="admin-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="admin-search-input"
              type="search"
              placeholder="Rechercher par nom ou e-mail…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Rechercher un utilisateur"
            />
            {search && (
              <button className="admin-search-clear" onClick={() => setSearch("")} aria-label="Effacer">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
          <span className="admin-result-count">
            {debouncedSearch
              ? `${filteredUsers.length} résultat${filteredUsers.length > 1 ? "s" : ""}`
              : `${users.length} membre${users.length > 1 ? "s" : ""}`
            }
          </span>
        </div>

        {/* ── Tableau utilisateurs ─────────────────────────────────────── */}
        <div className="admin-table-wrap">
          {usersError ? (
            <div className="admin-state admin-state--error" role="alert">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="10" y1="6" x2="10" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="14" r="0.8" fill="currentColor"/>
              </svg>
              <p>{usersError}</p>
              <button className="admin-btn admin-btn--ghost" onClick={fetchUsers}>Réessayer</button>
            </div>
          ) : loadingUsers ? (
            <div className="admin-state admin-state--loading" aria-label="Chargement en cours">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="admin-skeleton-row">
                  <div className="admin-skeleton admin-skeleton--avatar" />
                  <div className="admin-skeleton admin-skeleton--name" />
                  <div className="admin-skeleton admin-skeleton--email" />
                  <div className="admin-skeleton admin-skeleton--toggle" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-state admin-state--empty">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <circle cx="18" cy="18" r="16" stroke="var(--text-3)" strokeWidth="1.5" strokeDasharray="3 3"/>
                <circle cx="14" cy="14" r="4" stroke="var(--text-3)" strokeWidth="1.5"/>
                <circle cx="22" cy="14" r="4" stroke="var(--text-3)" strokeWidth="1.5"/>
                <path d="M8 28c0-4 3.6-7 8-7" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M28 28c0-4-3.6-7-8-7s-8 3-8 7" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p>Aucun utilisateur trouvé pour « {debouncedSearch} »</p>
            </div>
          ) : (
            <table className="admin-table" aria-label="Liste des utilisateurs">
              <thead>
                <tr className="admin-table-head">
                  <th className="admin-th admin-th--avatar" scope="col" aria-label="Avatar" />
                  <th className="admin-th" scope="col">Nom</th>
                  <th className="admin-th admin-th--email" scope="col">E-mail</th>
                  <th className="admin-th admin-th--toggle" scope="col">Administrateur</th>
                  <th className="admin-th admin-th--actions" scope="col" aria-label="Profil" />
                  <th className="admin-th admin-th--actions" scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === user?.id}
                    adminPending={adminPendingIds.has(u.id)}
                    onToggleAdmin={handleToggleAdmin}
                    onViewProfile={handleViewProfile}
                    onDelete={target => { setDeleteError(""); setDeleteTarget(target); }}
                  />
                ))}
                {/* ── Lignes d'invitations en attente ──────────────── */}
                {!loadingInvitations && pendingInvitations.map(inv => {
                  const key          = `${inv.boardId}-${inv.userId}`;
                  const isValidating = validatingInvitationKey === key;
                  const isCancelling = cancellingInvitationKey === key;
                  const busy         = isValidating || isCancelling;
                  return (
                    <tr key={key} className="admin-user-row admin-user-row--pending">
                      <td className="admin-user-td admin-user-td--avatar">
                        {inv.user && (
                          <UserAvatar
                            userId={inv.userId}
                            firstName={inv.user.firstName}
                            lastName={inv.user.lastName}
                            hasAvatar={!!inv.user.avatarURL}
                            size={34}
                            className="admin-user-avatar"
                          />
                        )}
                      </td>
                      <td className="admin-user-td">
                        <div className="admin-user-name-block">
                          <span className="admin-user-fullname">
                            {inv.user ? `${inv.user.firstName} ${inv.user.lastName}` : `#${inv.userId}`}
                          </span>
                        </div>
                      </td>
                      <td className="admin-user-td admin-user-td--email">
                        <span className="admin-user-email">{inv.user?.email ?? "—"}</span>
                      </td>
                      <td className="admin-user-td admin-user-td--toggle">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span className="admin-badge-pending">En attente</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'DM Mono', monospace" }}>
                            {inv.boardName} · {ROLE_LABELS[inv.role]}
                          </span>
                        </div>
                      </td>
                      <td className="admin-user-td admin-user-td--actions">
                        <button
                          className="admin-inv-btn-validate"
                          onClick={() => handleValidateInvitation(inv.boardId, inv.userId)}
                          disabled={busy}
                          title="Valider l'invitation sans attendre l'invité"
                        >
                          {isValidating ? "…" : "✓ Valider"}
                        </button>
                      </td>
                      <td className="admin-user-td admin-user-td--actions">
                        <button
                          className="admin-action-btn admin-action-btn--delete"
                          onClick={() => handleCancelInvitation(inv.boardId, inv.userId)}
                          disabled={busy}
                          title="Annuler l'invitation"
                          aria-label="Annuler l'invitation"
                        >
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <polyline points="3,4 13,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M5 4V3h6v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M4 4l1 9h6l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          </svg>
                          Annuler
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* ── Modal suppression ─────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          submitting={deleteSubmitting}
          error={deleteError}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
        />
      )}
    </Layout>
  );
}