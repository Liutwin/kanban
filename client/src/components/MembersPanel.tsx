import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_API } from "../config/api";
import type { Member, User } from "../model/interfaces";

// ─────────────────────────────────────────────────────────────
// Types & constantes
// ─────────────────────────────────────────────────────────────

interface MemberWithUser extends Member {
  user?: User;
}

interface MembersPanelProps {
  boardId:       number;
  currentUserId: number;
  currentRole:   Member["role"];
  onClose:       () => void;
}

const ROLE_LABELS: Record<Member["role"], string> = {
  admin:   "Admin",
  editeur: "Éditeur",
  lecteur: "Lecteur",
};

const AVATAR_COLORS = [
  { bg: "rgba(176,166,255,0.18)", color: "#b0a6ff" },
  { bg: "rgba(100,210,200,0.15)", color: "#64d2c8" },
  { bg: "rgba(253,214,99,0.15)",  color: "#fdd663" },
  { bg: "rgba(129,201,149,0.15)", color: "#81c995" },
  { bg: "rgba(242,139,130,0.15)", color: "#f28b82" },
];

export function getAvatarColor(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function getInitials(u?: User | { firstName?: string; lastName?: string }): string {
  if (!u) return "?";
  return ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Dépaquète { data: T } (Spring APIResponse) ou retourne T directement.
 */
function unwrap<T>(json: unknown): T {
  if (json && typeof json === "object" && !Array.isArray(json) && "data" in (json as object))
    return (json as { data: T }).data;
  return json as T;
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export default function MembersPanel({ boardId, currentUserId, currentRole, onClose }: MembersPanelProps) {
  const { authFetch } = useAuth();
  const navigate      = useNavigate();

  const [members,       setMembers]       = useState<MemberWithUser[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [inviteError,   setInviteError]   = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviting,      setInviting]      = useState(false);

  // Autocomplétion
  const [allUsers,      setAllUsers]      = useState<User[]>([]);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser,  setSelectedUser]  = useState<User | null>(null);
  const [inviteRole,    setInviteRole]    = useState<Member["role"]>("editeur");

  // Popover avatar — rendue hors du container scrollable
  const [popover, setPopover] = useState<{ member: MemberWithUser; top: number } | null>(null);

  // Confirmation inline de suppression
  const [pendingRemove, setPendingRemove] = useState<MemberWithUser | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const isAdmin  = currentRole === "admin";

  // ── Click en dehors : utilise composedPath() pour gérer les éléments
  //    retirés du DOM (ex: item d'autocomplétion) avant que l'event ne se propage ─
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const path = e.composedPath();
      if (panelRef.current && !path.includes(panelRef.current)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // ── Chargement membres ─────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(ROUTES_API.boardMembers(boardId));
      if (!res.ok) throw new Error();
      const raw        = await res.json();
      // Spring retourne un tableau direct ici (sans enveloppe { data })
      let memberList: Member[] = Array.isArray(raw) ? raw : (raw?.data ?? raw);

      // Fallback : si l'utilisateur courant n'est pas dans la liste
      // (ex : créateur sans entrée dans participation_ptp), on l'ajoute en admin.
      if (!memberList.some(m => m.userId === currentUserId)) {
        memberList = [{ userId: currentUserId, boardId, role: "admin" }, ...memberList];
      }

      const withUsers = await Promise.all(
        memberList.map(async m => {
          try {
            const r    = await authFetch(ROUTES_API.user(m.userId));
            const json = await r.json();
            const user = r.ok ? unwrap<User>(json) : undefined;
            return { ...m, user } as MemberWithUser;
          } catch {
            return { ...m, user: undefined } as MemberWithUser;
          }
        })
      );

      // Soi-même en premier, puis admins, puis alphabétique
      withUsers.sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (b.role === "admin" && a.role !== "admin") return 1;
        return `${a.user?.firstName ?? ""} ${a.user?.lastName ?? ""}`.localeCompare(
          `${b.user?.firstName ?? ""} ${b.user?.lastName ?? ""}`, "fr"
        );
      });

      setMembers(withUsers);
    } finally {
      setLoading(false);
    }
  }, [boardId, currentUserId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Tous les utilisateurs pour l'autocomplétion ────────────
  useEffect(() => {
    if (!isAdmin) return;
    authFetch(ROUTES_API.users)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setAllUsers(unwrap<User[]>(json)); })
      .catch(() => {});
  }, [isAdmin]);

  // ── Confirmer la suppression ──────────────────────────────
  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const userId = pendingRemove.userId;
    setPendingRemove(null);
    const res = await authFetch(ROUTES_API.boardMember(boardId, userId), { method: "DELETE" });
    if (res.ok) setMembers(m => m.filter(x => x.userId !== userId));
    else setInviteError("Erreur lors du retrait du membre.");
  };

  // ── Recherche / autocomplétion ─────────────────────────────
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setSelectedUser(null);
    setInviteError("");
    if (!value.trim()) { setSearchResults([]); return; }
    const q         = value.toLowerCase();
    const memberIds = new Set(members.map(m => m.userId));
    setSearchResults(
      allUsers
        .filter(u => !memberIds.has(u.id) && (
          `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        ))
        .slice(0, 6)
    );
  };

  // onMouseDown (pas onClick) : déclenché avant le blur de l'input,
  // évite la fermeture prématurée de la liste.
  const handleSelectUser = (e: React.MouseEvent, u: User) => {
    e.preventDefault(); // empêche le blur de l'input de propager
    setSelectedUser(u);
    setSearchQuery(`${u.firstName ?? ""} ${u.lastName ?? ""}`);
    setSearchResults([]);
    setInviteError("");
  };

  // ── Changer le rôle ────────────────────────────────────────
  const handleRoleChange = async (userId: number, newRole: Member["role"] | "retirer") => {
    if (newRole === "retirer") {
      const member = members.find(m => m.userId === userId);
      if (member) setPendingRemove(member);
      return;
    }
    // Mise à jour optimiste : on applique immédiatement dans l'UI,
    // et on annule (rollback) si l'API échoue.
    const previousMembers = members;
    setMembers(m => m.map(x => x.userId === userId ? { ...x, role: newRole } : x));
    const res = await authFetch(
      `${ROUTES_API.boardMember(boardId, userId)}?role=${newRole.toUpperCase()}`,
      { method: "PUT" }
    );
    if (!res.ok) {
      setMembers(previousMembers);
      const text = await res.text().catch(() => "");
      setInviteError(`Erreur changement de rôle (${res.status})${text ? " : " + text.slice(0, 80) : ""}`);
    }
  };

  // ── Ajouter un membre ──────────────────────────────────────
  const handleInvite = async () => {
    if (!selectedUser) { setInviteError("Sélectionnez un utilisateur dans la liste."); return; }
    if (members.some(m => m.userId === selectedUser.id)) {
      setInviteError("Cet utilisateur est déjà membre."); return;
    }
    setInviting(true);
    setInviteError("");
    try {
      const res = await authFetch(ROUTES_API.boardMembers(boardId), {
        method: "POST",
        body:   JSON.stringify({ userId: selectedUser.id, boardId, role: inviteRole }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Erreur ${res.status}${text ? " : " + text.slice(0, 200) : ""}`);
      }
      // On recharge la liste complète plutôt que de parser le body
      // (évite les problèmes de désérialisation du retour Spring)
      const savedFirstName = selectedUser.firstName;
      const savedLastName  = selectedUser.lastName;
      setSearchQuery("");
      setSelectedUser(null);
      await fetchMembers();
      setInviteSuccess(`${savedFirstName} ${savedLastName} ajouté·e en tant que ${ROLE_LABELS[inviteRole]}.`);
      setTimeout(() => setInviteSuccess(""), 4000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setInviting(false);
    }
  };

  // ── Popover avatar ─────────────────────────────────────────
  // Positionné relativement au panneau (pas au row) pour échapper au
  // container scrollable qui clippe les enfants absolus.
  const handleAvatarClick = (e: React.MouseEvent<HTMLButtonElement>, m: MemberWithUser) => {
    if (popover?.member.userId === m.userId) { setPopover(null); return; }
    const btnRect   = e.currentTarget.getBoundingClientRect();
    const panelRect = panelRef.current!.getBoundingClientRect();
    setPopover({ member: m, top: btnRect.top - panelRect.top });
  };

  // ─────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0,
        width: 320, background: "var(--surface2)",
        border: "1px solid var(--border2)", borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elev-4)", zIndex: 200, overflow: "visible",
        animation: "slideDown 0.18s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideLeft { from { opacity:0; transform:translateX(6px); } to { opacity:1; transform:translateX(0); } }
        @keyframes spin      { to { transform:rotate(360deg); } }
        .mp-row { display:flex; align-items:center; gap:10px; padding:9px 16px; transition:background 0.15s; }
        .mp-row:hover { background:rgba(255,255,255,0.03); }
        .mp-avatar-btn {
          width:32px; height:32px; border-radius:50%;
          font-size:11px; font-weight:600; font-family:'DM Mono',monospace;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; cursor:pointer; border:none;
          transition:transform 0.15s, box-shadow 0.15s;
        }
        .mp-avatar-btn:hover { transform:scale(1.1); box-shadow:0 2px 8px rgba(0,0,0,0.35); }
        .mp-role-select {
          background:var(--surface3); border:1px solid var(--border2);
          border-radius:8px; color:var(--text-2);
          font-size:11px; font-family:'DM Mono',monospace;
          padding:3px 7px; cursor:pointer; outline:none;
          transition:border-color 0.15s;
        }
        .mp-role-select:hover,.mp-role-select:focus { border-color:var(--accent); }
        .ac-item { display:flex; align-items:center; gap:8px; padding:7px 12px; cursor:pointer; transition:background 0.12s; }
        .ac-item:hover { background:rgba(255,255,255,0.06); }
      `}</style>

      {/* Header */}
      <div style={{ padding: "13px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          Membres{" "}
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>{members.length}</span>
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 2px", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
        >×</button>
      </div>

      {/* Popover profil — rendue ICI, hors du scroll, positionnée via top calculé */}
      {popover && (() => {
        const { member: m, top } = popover;
        const c    = getAvatarColor(m.userId);
        const u    = m.user;
        const name = u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : `#${m.userId}`;
        return (
          <div style={{
            position: "absolute", right: "calc(100% + 8px)", top,
            width: 210, background: "var(--surface3)",
            border: "1px solid var(--border2)", borderRadius: "var(--radius-lg)",
            boxShadow: "var(--elev-4)", zIndex: 300, overflow: "hidden",
            animation: "slideLeft 0.15s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {/* Avatar grand + nom */}
            <div style={{ padding: "18px 16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: c.bg, color: c.color, fontSize: 17, fontWeight: 600, fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${c.color}55` }}>
                {getInitials(u)}
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-3)" }}>{ROLE_LABELS[m.role]}</p>
              </div>
            </div>
            {/* Email */}
            {u?.email && (
              <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: "'DM Mono',monospace", wordBreak: "break-all" }}>{u.email}</p>
              </div>
            )}
            {/* Voir le profil */}
            <button
              onClick={() => { setPopover(null); navigate("/profile"); }}
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

      {/* Liste membres */}
      <div style={{ maxHeight: 300, overflowY: "auto", padding: "4px 0" }}>
        {loading ? (
          <div style={{ padding: 20, display: "flex", justifyContent: "center" }}>
            <span style={{ width: 18, height: 18, border: "2px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : members.map(m => {
          const isSelf = m.userId === currentUserId;
          const c      = getAvatarColor(m.userId);
          const name   = m.user ? `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() : `#${m.userId}`;
          return (
            <div key={m.userId} className="mp-row">
              <button
                className="mp-avatar-btn"
                style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}44` }}
                onClick={e => handleAvatarClick(e, m)}
                title="Voir le profil"
              >
                {getInitials(m.user)}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--text)", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {name}
                  {isSelf && <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>vous</span>}
                </p>
                {m.user?.email && (
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.user.email}</p>
                )}
              </div>

              {isAdmin && !isSelf ? (
                <select className="mp-role-select" value={m.role}
                  onChange={e => handleRoleChange(m.userId, e.target.value as Member["role"] | "retirer")}>
                  <option value="admin">Admin</option>
                  <option value="editeur">Éditeur</option>
                  <option value="lecteur">Lecteur</option>
                  <option value="retirer" style={{ color: "#f28b82" }}>— Retirer</option>
                </select>
              ) : (
                <span style={{ fontSize: 11, flexShrink: 0, fontFamily: "'DM Mono',monospace",
                  color: m.role === "admin" ? "var(--accent)" : m.role === "editeur" ? "var(--accent-2)" : "var(--text-3)" }}>
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Feedback succès */}
      {inviteSuccess && (
        <div style={{ margin: "0 12px 8px", padding: "7px 12px", background: "rgba(129,201,149,0.1)", border: "1px solid rgba(129,201,149,0.25)", borderRadius: 8, fontSize: 12, color: "var(--success)" }}>
          ✓ {inviteSuccess}
        </div>
      )}

      {/* Confirmation de suppression */}
      {pendingRemove && (
        <div style={{ margin: "0 12px 10px", padding: "12px 14px", background: "rgba(242,139,130,0.08)", border: "1px solid rgba(242,139,130,0.25)", borderRadius: 10 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
            Retirer <strong>{pendingRemove.user?.firstName} {pendingRemove.user?.lastName}</strong> du tableau ?
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              onClick={() => setPendingRemove(null)}
              style={{ background: "var(--surface3)", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text-2)", fontSize: 12, padding: "5px 14px", cursor: "pointer" }}
            >
              Annuler
            </button>
            <button
              onClick={confirmRemove}
              style={{ background: "rgba(242,139,130,0.15)", border: "1px solid rgba(242,139,130,0.35)", borderRadius: 7, color: "var(--danger)", fontSize: 12, fontWeight: 600, padding: "5px 14px", cursor: "pointer" }}
            >
              Retirer
            </button>
          </div>
        </div>
      )}

      {/* Ajouter un membre */}
      {isAdmin && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px 12px" }}>
          <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono',monospace" }}>
            Ajouter un membre
          </p>

          <div style={{ position: "relative", marginBottom: 7 }}>
            <input
              className="form-input"
              type="text"
              placeholder="Nom, prénom ou e-mail…"
              value={searchQuery}
              autoComplete="off"
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => e.key === "Escape" && setSearchResults([])}
              style={{ fontSize: 12, padding: "7px 10px" }}
            />
            {searchResults.length > 0 && (
              <ul style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, margin: 0, padding: 0, listStyle: "none", background: "var(--surface3)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", boxShadow: "var(--elev-3)", zIndex: 60, overflow: "hidden" }}>
                {searchResults.map(u => {
                  const c = getAvatarColor(u.id);
                  return (
                    <li key={u.id} className="ac-item"
                      onMouseDown={e => handleSelectUser(e, u)}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: c.bg, color: c.color, fontSize: 9, fontWeight: 600, fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.firstName} {u.lastName}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {searchQuery && !selectedUser && searchResults.length === 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>Aucun utilisateur trouvé</p>
            )}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <select className="mp-role-select" value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Member["role"])}
              style={{ flex: 1, padding: "7px 8px", fontSize: 12 }}>
              <option value="editeur">Éditeur</option>
              <option value="lecteur">Lecteur</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="btn btn-tonal"
              style={{ fontSize: 12, padding: "6px 14px", borderRadius: "var(--radius)", opacity: (!selectedUser || inviting) ? 0.45 : 1 }}
              onClick={handleInvite}
              disabled={!selectedUser || inviting}
            >
              {inviting ? "En cours…" : "Ajouter"}
            </button>
          </div>
          {inviteError && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--danger)", lineHeight: 1.4 }}>⚠ {inviteError}</p>
          )}
        </div>
      )}
    </div>
  );
}