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
  /** Identifiant du créateur du tableau (protège son compte dans MembersPanel). */
  boardCreatorId?: number;
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
interface AvatarInfo { userId: number; firstName: string; lastName: string; email: string; role: "admin" | "editeur" | "lecteur"; avatar?: string; }

export default function Layout({ children, title, boardId, boardRole, boardCreatorId }: LayoutProps) {
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
  const [searchValue,      setSearchValue]      = useState("");
  const [searchPriorities, setSearchPriorities] = useState<Set<"basse"|"moyenne"|"haute">>(new Set());
  const [searchAssignees,  setSearchAssignees]  = useState<Set<number>>(new Set());
  const [hideCompleted,    setHideCompleted]    = useState(false);
  const [assigneeDropOpen, setAssigneeDropOpen] = useState(false);
  const assigneeDropRef = useRef<HTMLDivElement>(null);

  /** Indique si au moins un filtre est actif. */
  const hasActiveFilter = searchValue.trim() !== "" || searchPriorities.size > 0 || searchAssignees.size > 0 || hideCompleted;

  /** Émet un événement global que Dashboard.tsx peut intercepter pour filtrer. */
  const dispatchSearch = useCallback(
    (query: string, priorities: Set<string>, assignees: Set<number>, hideDone: boolean) => {
      window.dispatchEvent(new CustomEvent("kanban:search", {
        detail: {
          query,
          priority:    [...priorities][0] ?? "",
          assigneeId:  [...assignees][0]  ?? "",
          priorities:  [...priorities],
          assigneeIds: [...assignees],
          hideCompleted: hideDone,
        },
      }));
    },
    []
  );

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    dispatchSearch(value, searchPriorities, searchAssignees, hideCompleted);
  }, [searchPriorities, searchAssignees, hideCompleted, dispatchSearch]);

  const togglePriority = useCallback((p: "basse"|"moyenne"|"haute") => {
    setSearchPriorities(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      dispatchSearch(searchValue, next, searchAssignees, hideCompleted);
      return next;
    });
  }, [searchValue, searchAssignees, hideCompleted, dispatchSearch]);

  const toggleAssignee = useCallback((id: number) => {
    setSearchAssignees(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      dispatchSearch(searchValue, searchPriorities, next, hideCompleted);
      return next;
    });
  }, [searchValue, searchPriorities, hideCompleted, dispatchSearch]);

  const toggleHideCompleted = useCallback(() => {
    setHideCompleted(prev => {
      dispatchSearch(searchValue, searchPriorities, searchAssignees, !prev);
      return !prev;
    });
  }, [searchValue, searchPriorities, searchAssignees, dispatchSearch]);

  const handleReset = useCallback(() => {
    setSearchValue("");
    setSearchPriorities(new Set());
    setSearchAssignees(new Set());
    setHideCompleted(false);
    dispatchSearch("", new Set(), new Set(), false);
  }, [dispatchSearch]);

  // Ferme le dropdown assigné si clic en dehors
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (assigneeDropRef.current && !assigneeDropRef.current.contains(e.target as Node)) {
        setAssigneeDropOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Réinitialise la recherche à chaque changement de page
  useEffect(() => {
    setSearchValue("");
    setSearchPriorities(new Set());
    setSearchAssignees(new Set());
    setHideCompleted(false);
    window.dispatchEvent(new CustomEvent("kanban:search", {
      detail: { query: "", priority: "", assigneeId: "", priorities: [], assigneeIds: [], hideCompleted: false },
    }));
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

              {/* Barre de recherche + filtres */}
              <div className="search-bar">

                {/* Champ texte */}
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
                    <button className="search-clear" onClick={() => handleSearch("")} aria-label="Effacer le texte">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filtre Priorité — boutons multi-sélection */}
                <div className={`search-filter-btn-group${searchPriorities.size > 0 ? " search-filter-btn-group--active" : ""}`}>
                  {(["basse", "moyenne", "haute"] as const).map(p => (
                    <button
                      key={p}
                      className={`search-filter-btn search-filter-btn--${p}${searchPriorities.has(p) ? " search-filter-btn--selected" : ""}`}
                      onClick={() => togglePriority(p)}
                      aria-pressed={searchPriorities.has(p)}
                      title={`Priorité ${p}`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Filtre "Masquer les validées" */}
                <button
                  className={`search-filter-btn search-filter-btn--done${hideCompleted ? " search-filter-btn--selected" : ""}`}
                  onClick={toggleHideCompleted}
                  aria-pressed={hideCompleted}
                  title={hideCompleted ? "Afficher les tâches validées" : "Masquer les tâches validées"}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{marginRight:4,flexShrink:0}}>
                    {hideCompleted
                      ? <><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/><polyline points="3,6 5.2,8.2 9,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>
                      : <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    }
                  </svg>
                  Masquer validées
                </button>

                {/* Filtre Assigné — dropdown checkboxes */}
                {avatarMembers.length > 0 && (
                  <div className="search-select-wrapper" ref={assigneeDropRef}>
                    <button
                      className={`search-select-trigger${searchAssignees.size > 0 ? " search-select-trigger--active" : ""}`}
                      onClick={() => setAssigneeDropOpen(o => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={assigneeDropOpen}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span>
                        {searchAssignees.size === 0
                          ? "Membres"
                          : searchAssignees.size === 1
                            ? avatarMembers.find(m => searchAssignees.has(m.userId))?.firstName ?? "1 membre"
                            : `${searchAssignees.size} membres`}
                      </span>
                      <svg className={`search-select-chevron${assigneeDropOpen ? " search-select-chevron--open" : ""}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {assigneeDropOpen && (
                      <ul className="search-select-dropdown" role="listbox" aria-multiselectable="true">
                        {avatarMembers.map(m => {
                          const checked = searchAssignees.has(m.userId);
                          const avatarStyle = getAvatarStyle(m.userId);
                          return (
                            <li
                              key={m.userId}
                              role="option"
                              aria-selected={checked}
                              className={`search-select-option${checked ? " search-select-option--checked" : ""}`}
                              onClick={() => toggleAssignee(m.userId)}
                            >
                              <span className="search-select-option-check">
                                {checked && (
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <polyline points="1.5,5 4,7.5 8.5,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </span>
                              {m.avatar
                                ? <img src={m.avatar} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                : <span style={{ width: 20, height: 20, borderRadius: "50%", background: avatarStyle.background, color: "#1c1b1f", fontSize: 8, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                                  </span>
                              }
                              <span className="search-select-option-name">{m.firstName} {m.lastName}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Bouton réinitialisation — toujours présent, invisible si inactif */}
                <button
                  className="search-reset-btn"
                  style={{ visibility: hasActiveFilter ? "visible" : "hidden" }}
                  onClick={handleReset}
                  tabIndex={hasActiveFilter ? 0 : -1}
                  title="Réinitialiser les filtres"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8a6 6 0 1 0 1.5-3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <polyline points="2 3.5 2 8 6.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Réinitialiser
                </button>

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
                    boardCreatorId={boardCreatorId}
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