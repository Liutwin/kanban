import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import "../styles/layout.css";

import type { UserDTO } from "../model/interfaces.ts";
import type { Member }  from "../model/interfaces.ts";
import { ROUTES_AUTH, ROUTES_API } from "../config/api";
import SidebarIcon from '../assets/kanban-icon-sidebar.svg';
import Tooltip from "./Tooltip";
import MembersPanel from './MembersPanel';
import { getAvatarStyle } from '../utils/avatarColor';

/**
 * Props du composant Layout.
 */
interface LayoutProps {
  /** Contenu principal de la page, affiché dans la zone centrale. */
  children: ReactNode;
  /** Titre affiché dans la barre supérieure. Si omis, aucun titre n'est affiché. */
  title?: string;
  /**
   * Identifiant du tableau courant.
   * Quand fourni, le panneau membres et la recherche dans le tableau sont activés.
   */
  boardId?: number;
  /**
   * Rôle de l'utilisateur connecté dans le tableau courant.
   * Détermine l'affichage des outils d'administration des membres.
   */
  boardRole?: "admin" | "editeur" | "lecteur";
}

/**
 * Composant de mise en page principal de l'application.
 *
 * Il affiche :
 * - une barre latérale (sidebar) avec la navigation et les infos de l'utilisateur connecté ;
 * - une zone principale avec un en-tête (titre, recherche, membres) et le contenu de la page.
 *
 * Quand `boardId` est fourni, la top-bar affiche :
 * - un champ de recherche par mot-clé (filtre les tâches via `window.dispatchEvent`) ;
 * - les avatars des membres du tableau et un bouton ouvrant le panneau de gestion.
 *
 * @param props - {@link LayoutProps}
 */
interface AvatarInfo { userId: number; firstName: string; lastName: string; email: string; role: "admin" | "editeur" | "lecteur"; }

export default function Layout({ children, title, boardId, boardRole }: LayoutProps) {
  const { user, logout, authFetch } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  /* ── Profil de l'utilisateur connecté ───────────────────── */
  const [userDTO, setUserDTO] = useState<UserDTO | null>(null);

  useEffect(() => {
    document.title = title ? `Kanban — ${title}` : "Kanban";
  }, [title]);

  useEffect(() => {
    if (!user?.id) return;
    authFetch(`/api/v1/users/${user.id}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(json => setUserDTO((json?.data ?? json) as UserDTO))
      .catch(() => setUserDTO(null));
  }, [user?.id]);

  const fullName =
    `${user?.firstName ?? ""}${user?.firstName ? " " : ""}${user?.lastName ?? ""}`.trim() || "Utilisateur";

  const avatarInitial =
    `${user?.firstName?.charAt(0) ?? ""}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?";

  /* ── Recherche ───────────────────────────────────────────── */
  const [searchValue, setSearchValue] = useState("");

  /** Émet un événement global que Dashboard.tsx peut intercepter pour filtrer. */
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    window.dispatchEvent(new CustomEvent("kanban:search", { detail: { query: value } }));
  }, []);

  // Réinitialise la recherche à chaque changement de page
  useEffect(() => {
    setSearchValue("");
    window.dispatchEvent(new CustomEvent("kanban:search", { detail: { query: "" } }));
  }, [location.pathname]);

  /* ── Membres du tableau ──────────────────────────────────── */
  // Les avatars de la topbar sont chargés ici (léger : juste userId + profil basique).
  // La logique complète (rôles, ajout, popover) vit dans MembersPanel.
  const [avatarMembers, setAvatarMembers] = useState<AvatarInfo[]>([]);
  const [panelOpen,     setPanelOpen]     = useState(false);
  const [topbarPopover, setTopbarPopover] = useState<AvatarInfo | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const fetchAvatarMembers = useCallback(async () => {
    if (!boardId) return;
    try {
      const res  = await authFetch(ROUTES_API.boardMembers(boardId));
      if (!res.ok) return;
      const json = await res.json();
      // Spring retourne un tableau direct ici (sans enveloppe { data })
      let raw: Member[] = Array.isArray(json) ? json : (json?.data ?? []);

      // Fallback : si l'utilisateur courant est absent (créateur sans participation_ptp),
      // on l'injecte en admin pour qu'il apparaisse dans la topbar.
      if (user?.id && !raw.some(m => m.userId === user.id)) {
        raw = [{ userId: user.id, boardId, role: "admin" }, ...raw];
      }

      const enriched = await Promise.all(
        raw.map(async m => {
          try {
            const r2    = await authFetch(ROUTES_API.user(m.userId));
            const json2 = await r2.json();
            const p     = json2?.data ?? json2;
            return {
              userId:    m.userId,
              firstName: p.firstName ?? "",
              lastName:  p.lastName  ?? "",
              email:     p.email     ?? "",
              role:      m.role,
            };
          } catch {
            return { userId: m.userId, firstName: "?", lastName: "", email: "", role: m.role };
          }
        })
      );
      // Soi-même en premier
      enriched.sort((a, b) => {
        if (a.userId === user?.id) return -1;
        if (b.userId === user?.id) return 1;
        return 0;
      });
      setAvatarMembers(enriched);
    } catch { /* silencieux */ }
  }, [boardId, user?.id]);

  useEffect(() => { if (boardId) fetchAvatarMembers(); }, [boardId, fetchAvatarMembers]);

  // Ferme la popover topbar au clic en dehors
  useEffect(() => {
    if (!topbarPopover) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node))
        setTopbarPopover(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [topbarPopover]);

  /* ── Logout ──────────────────────────────────────────────── */
  /* ── Logout ──────────────────────────────────────────────── */
  const handleLogout = async () => {
    try { await authFetch(ROUTES_AUTH.logout, { method: "POST" }); }
    finally { logout(); navigate("/login"); }
  };

  /* ── Helpers d'affichage ─────────────────────────────────── */
  const memberInitials = (a: { firstName: string; lastName: string }) =>
    `${a.firstName.charAt(0)}${a.lastName.charAt(0)}`.toUpperCase() || "?";

  /* ─────────────────────────────────────────────────────────── */

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
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">▦</span>
            <span>Tableaux</span>
          </NavLink>
          <NavLink to="/my-tasks" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">✓</span>
            <span>Mes tâches</span>
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">≡</span>
            <span>Journal</span>
          </NavLink>
          <span className="nav-section-label" style={{ marginTop: "12px" }}>Compte</span>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">◎</span>
            <span>Mon profil</span>
          </NavLink>
          {user?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">⚙</span>
              <span>Administration</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar" title={fullName}
            style={user?.id ? { background: getAvatarStyle(user.id).background } : undefined}>
            {avatarInitial}
          </div>
            <div className="user-details">
              <span className="user-name">{fullName}</span>
            </div>
          </div>
          <Tooltip text="Se déconnecter" position="right">
            <button className="logout-btn" onClick={handleLogout} aria-label="Se déconnecter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className={`main-content${boardId ? " main-content--board" : ""}`}>
        <header className="top-bar">
          {/* Titre */}
          <h1 className="page-title">{title ?? ""}</h1>

          {/* Zone droite — visible seulement sur un tableau */}
          {boardId ? (
            <div className="top-bar-right top-bar-board">

              {/* Champ de recherche */}
              <div className="search-wrapper">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Rechercher une tâche…"
                  value={searchValue}
                  onChange={e => handleSearch(e.target.value)}
                  aria-label="Rechercher une tâche"
                />
                {searchValue && (
                  <button className="search-clear" onClick={() => handleSearch("")} aria-label="Effacer la recherche">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Avatars empilés + bouton membres */}
              <div className="members-trigger" ref={triggerRef} style={{ position: "relative" }}>
                <div className="avatars-stack">
                  {avatarMembers.map((m, i) => {
                    const c = getAvatarStyle(m.userId);
                    const total = avatarMembers.length;
                    return (
                      <div key={m.userId} style={{
                        marginRight: i < total - 1 ? -6 : 0,
                        zIndex: total - i,
                        position: "relative",
                        flexShrink: 0,
                      }}>
                        <Tooltip text={`${m.firstName} ${m.lastName} · ${m.role === "admin" ? "Admin" : m.role === "editeur" ? "Éditeur" : "Lecteur"}`} position="bottom">
                          <button
                            className="stacked-avatar stacked-avatar--btn"
                            style={{
                              background: c.background,
                              color: c.color,
                              // Halo au survol = couleur de départ du dégradé à 50% opacité
                              ["--avatar-glow" as string]: `${c.from}80`,
                            }}
                            onClick={() => setTopbarPopover(topbarPopover?.userId === m.userId ? null : m)}
                          >
                            {memberInitials(m)}
                            {/* Badge rôle — haut droite, légèrement à cheval sur le bord */}
                            {m.role === "admin" && (
                              <span style={{
                                position: "absolute", top: -2, right: -2,
                                width: 12, height: 12, borderRadius: "50%",
                                background: "#fdd663", border: "2px solid var(--surface)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 7, lineHeight: 1,
                              }}>★</span>
                            )}
                            {m.role === "editeur" && (
                              <span style={{
                                position: "absolute", top: -1, right: -1,
                                width: 9, height: 9, borderRadius: "50%",
                                background: "#b0c8ff", border: "2px solid var(--surface)",
                              }} />
                            )}
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>

                {/* Popover topbar avatar */}
                {topbarPopover && (() => {
                  const m = topbarPopover;
                  const c = getAvatarStyle(m.userId);
                  const ROLE_LABELS: Record<string, string> = { admin: "Admin", editeur: "Éditeur", lecteur: "Lecteur" };
                  return (
                    <div style={{
                      position: "absolute", top: "calc(100% + 8px)", left: 0,
                      width: 210, background: "var(--surface2)",
                      border: "1px solid var(--border2)", borderRadius: "var(--radius-lg)",
                      boxShadow: "var(--elev-4)", zIndex: 300, overflow: "hidden",
                    }}>
                      <div style={{ padding: "18px 16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: c.background, color: c.color, fontSize: 17, fontWeight: 600, fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${c.to}55` }}>
                          {memberInitials(m)}
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.firstName} {m.lastName}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-3)" }}>{ROLE_LABELS[m.role] ?? m.role}</p>
                        </div>
                      </div>
                      {m.email && (
                        <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--border)" }}>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: "'DM Mono',monospace", wordBreak: "break-all" }}>{m.email}</p>
                        </div>
                      )}
                      <button
                        onClick={() => { setTopbarPopover(null); navigate("/profile"); }}
                        style={{ width: "100%", padding: "9px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontSize: 12, color: "var(--accent)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(176,166,255,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Voir le profil
                      </button>
                    </div>
                  );
                })()}

                <button
                  className={`members-btn ${panelOpen ? "members-btn--active" : ""}`}
                  onClick={() => { setPanelOpen(v => !v); setTopbarPopover(null); }}
                  aria-expanded={panelOpen}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="10.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M1 13c0-2 2-3.5 4.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M15 13c0-2-2-3.5-4.5-3.5S6 11 6 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Membres
                </button>

                {panelOpen && boardId && user?.id && (
                  <MembersPanel
                    boardId={boardId}
                    currentUserId={user.id}
                    currentRole={boardRole ?? "lecteur"}
                    onClose={() => { setPanelOpen(false); fetchAvatarMembers(); }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="top-bar-right" />
          )}
        </header>

        <div className={`page-body${boardId ? " page-body--kanban" : ""}`}>{children}</div>
      </main>
    </div>
  );
}