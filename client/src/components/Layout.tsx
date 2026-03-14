import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import "../styles/layout.css";

import type { UserDTO } from "../model/interfaces.ts";
import SidebarIcon from '../assets/kanban-icon-sidebar.svg';

/**
 * Props du composant Layout.
 */
interface LayoutProps {
  /** Contenu principal de la page, affiché dans la zone centrale. */
  children: ReactNode;
  /** Titre affiché dans la barre supérieure. Si omis, aucun titre n'est affiché. */
  title?: string;
}

/**
 * Composant de mise en page principal de l'application.
 *
 * Il affiche :
 * - une barre latérale (sidebar) avec la navigation et les infos de l'utilisateur connecté ;
 * - une zone principale avec un en-tête et le contenu de la page courante.
 *
 * Les informations complètes de l'utilisateur (nom, prénom) sont récupérées depuis
 * l'API (`GET /users/{id}`) au montage du composant.
 *
 * @param props - {@link LayoutProps}
 * @returns Le squelette de la page.
 *
 * @example
 * ```tsx
 * <Layout title="Mes tableaux">
 *   <BoardList />
 * </Layout>
 * ```
 */
export default function Layout({ children, title }: LayoutProps) {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  /**
   * Données complètes de l'utilisateur connecté, chargées depuis l'API.
   * `null` tant que le chargement n'est pas terminé ou en cas d'erreur.
   */
  const [userDTO, setUserDTO] = useState<UserDTO | null>(null);

  /**
   * Met à jour le titre de l'onglet du navigateur à chaque changement de page.
   * Format : "Kanban — {titre}" ou simplement "Kanban" si aucun titre n'est fourni.
   */
  useEffect(() => {
    document.title = title ? `Kanban — ${title}` : "Kanban";
  }, [title]);

  /**
   * Récupère les informations complètes de l'utilisateur connecté depuis l'API
   * dès que son identifiant est disponible.
   */
  useEffect(() => {
    if (!user?.id) return;

    authFetch(`/api/v1/users/${user.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de charger le profil utilisateur");
        return res.json();
      })
      .then((json) => {
        console.log("[Layout] réponse brute /users/:id →", json);
        // Si Spring enveloppe dans { data: ... }, on extrait, sinon on prend json directement
        const dto = (json?.data ?? json) as UserDTO;
        console.log("[Layout] firstName:", dto.firstName, "lastName:", dto.lastName);
        setUserDTO(dto);
      })
      .catch((err) => {
        console.error("[Layout] erreur chargement profil →", err);
        setUserDTO(null);
      });
  }, [user?.id]);

  /**
   * Retourne le nom complet de l'utilisateur (prénom + nom).
   * Repli sur le pseudo, puis sur "Utilisateur" si les données ne sont pas encore chargées.
   */
  const fullName =
    userDTO?.firstName && userDTO?.lastName
      ? `${userDTO.firstName} ${userDTO.lastName}`
      : (user?.pseudo ?? "Utilisateur");

  /**
   * Lettre initiale affichée dans l'avatar.
   * Priorité : première lettre du prénom > première lettre du pseudo > "?".
   */
  const avatarInitial =
  userDTO?.firstName && userDTO?.lastName
    ? `${userDTO.firstName.charAt(0)}${userDTO.lastName.charAt(0)}`.toUpperCase()
    : (user?.pseudo?.charAt(0) ?? "?").toUpperCase();

  /**
   * Gère la déconnexion de l'utilisateur :
   * 1. Appelle l'endpoint de logout côté serveur Deno.
   * 2. Efface le contexte d'authentification local.
   * 3. Redirige vers la page de connexion.
   */
  const handleLogout = async () => {
    try {
      await authFetch(ROUTES_AUTH.logout, { method: "POST" });
    } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="layout">
      {/* Barre latérale */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">
            <img src={SidebarIcon} alt="" width="22" height="22" />
          </span>
          <span className="brand-name">KANBAN</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">▦</span>
            <span>Tableaux</span>
          </NavLink>
          <NavLink
            to="/my-tasks"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">✓</span>
            <span>Mes tâches</span>
          </NavLink>
          <NavLink
            to="/logs"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">≡</span>
            <span>Journal</span>
          </NavLink>
          <span className="nav-section-label" style={{ marginTop: "12px" }}>Compte</span>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">◎</span>
            <span>Mon profil</span>
          </NavLink>
          {user?.isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">⚙</span>
              <span>Administration</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          {/* Infos utilisateur */}
          <div className="user-info">
            <div className="user-avatar" title={fullName}>
              {avatarInitial}
            </div>
            <div className="user-details">
              {/* Nom et prénom récupérés via l'API, avec repli sur le pseudo */}
              <span className="user-pseudo">{fullName}</span>
            </div>
          </div>

          {/* Bouton déconnexion */}
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="main-content">
        <header className="top-bar">
          <h1 className="page-title">{title ?? ""}</h1>
          <div className="top-bar-right">
            {/* Indicateur de connexion avec nom complet */}
            <span className="status-dot" />
            <span className="status-text">
              {fullName} — connecté
            </span>
          </div>
        </header>
        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}