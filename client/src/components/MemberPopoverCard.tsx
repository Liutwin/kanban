import { getAvatarStyle } from "../utils/avatarColor";
import UserAvatar           from "./UserAvatar";

/**
 * Popover de profil affiché lors du clic sur un avatar de membre.
 *
 * Ce composant est purement visuel : il ne navigue pas lui-même.
 * Le parent construit le slug et appelle navigate() via `onViewProfile`.
 * Cela évite tout problème de navigation depuis un composant en cours de démontage.
 */
interface MemberPopoverCardProps {
  userId:    number;
  firstName: string;
  lastName:  string;
  email?:    string;
  /** Libellé du rôle déjà formaté (ex. « Éditeur », « Invitation en attente »). */
  roleLabel: string;
  hasAvatar: boolean;
  /** Style de positionnement absolu appliqué au conteneur. */
  positionStyle: React.CSSProperties;
  /** Ferme la popover (sans naviguer). */
  onClose: () => void;
  /** Navigue vers la page d'activités de l'utilisateur. */
  onViewProfile: () => void;
}

export default function MemberPopoverCard({
  userId, firstName, lastName, email, roleLabel,
  hasAvatar, positionStyle, onClose, onViewProfile,
}: MemberPopoverCardProps) {
  const c = getAvatarStyle(userId);

  return (
    <div style={{
      position: "absolute",
      width: 210,
      background: "var(--surface3)",
      border: "1px solid var(--border2)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--elev-4)",
      zIndex: 300,
      overflow: "hidden",
      ...positionStyle,
    }}>
      {/* Avatar + nom + rôle */}
      <div style={{
        padding: "18px 16px 12px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        borderBottom: "1px solid var(--border)",
      }}>
        <UserAvatar
          userId={userId}
          firstName={firstName}
          lastName={lastName}
          hasAvatar={hasAvatar}
          size={52}
          style={{ border: `2px solid ${c.color}55` }}
        />
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            {firstName} {lastName}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-3)" }}>
            {roleLabel}
          </p>
        </div>
      </div>

      {/* Email */}
      {email && (
        <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--border)" }}>
          <p style={{
            margin: 0, fontSize: 11, color: "var(--text-3)",
            fontFamily: "'DM Mono',monospace", wordBreak: "break-all",
          }}>{email}</p>
        </div>
      )}

      {/* Bouton "Voir les activités" */}
      <button
        onClick={() => { onClose(); onViewProfile(); }}
        style={{
          width: "100%", padding: "9px 14px",
          background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left", fontSize: 12, color: "var(--accent)",
          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(176,166,255,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="5" y1="6"  x2="11" y2="6"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="5" y1="9"  x2="9"  y2="9"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="5" y1="12" x2="7"  y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        Voir les activités
      </button>
    </div>
  );
}