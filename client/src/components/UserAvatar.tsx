import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getAvatarStyle } from "../utils/avatarColor";
import { ROUTES_API } from "../config/api";

// ─── Cache module-level ───────────────────────────────────────────────────────
// Partagé entre toutes les instances : un seul fetch par userId, peu importe
// combien de <UserAvatar userId={x}> sont montés simultanément.
//
// • "fetching" → requête en cours, les autres instances attendent la même Promise
// • "done"     → blob URL prêt, réutilisé directement
// • "none"     → pas d'avatar (404 ou hasAvatar=false), on ne retente pas

type CacheEntry =
  | { status: "fetching"; promise: Promise<string | null> }
  | { status: "done";     url: string }
  | { status: "none" };

const avatarCache = new Map<number, CacheEntry>();

export function fetchAvatarOnce(
  userId: number,
  fetcher: (url: string) => Promise<Response>,
): Promise<string | null> {
  const cached = avatarCache.get(userId);
  if (cached?.status === "fetching") return cached.promise;
  if (cached?.status === "done")     return Promise.resolve(cached.url);
  if (cached?.status === "none")     return Promise.resolve(null);

  const promise = fetcher(ROUTES_API.userAvatar(userId))
    .then(res => (res.ok ? res.blob() : null))
    .then(blob => {
      if (!blob || blob.size === 0) {
        avatarCache.set(userId, { status: "none" });
        return null;
      }
      const url = URL.createObjectURL(blob);
      avatarCache.set(userId, { status: "done", url });
      return url;
    })
    .catch(() => {
      avatarCache.set(userId, { status: "none" });
      return null;
    });

  avatarCache.set(userId, { status: "fetching", promise });
  return promise;
}

/**
 * Précharge les avatars d'une liste d'utilisateurs en parallèle.
 * À appeler dès que la liste des membres est connue (ex: chargement du tableau).
 * Les résultats sont mis en cache — les <UserAvatar> suivants n'émettent aucune requête.
 */
export function prefetchAvatars(
  users: Array<{ id: number; avatarURL?: string }>,
  fetcher: (url: string) => Promise<Response>,
): void {
  for (const u of users) {
    if (u.avatarURL) fetchAvatarOnce(u.id, fetcher);
  }
}

/**
 * Invalide l'entrée de cache d'un utilisateur.
 * À appeler après un upload d'avatar pour forcer le rechargement.
 */
export function invalidateAvatar(userId: number): void {
  avatarCache.delete(userId);
}

interface UserAvatarProps {
  /** Identifiant de l'utilisateur (pour la couleur déterministe et le fetch). */
  userId: number;
  /** Prénom — sert aux initiales de fallback. */
  firstName: string;
  /** Nom — sert aux initiales de fallback. */
  lastName: string;
  /**
   * Indique que l'utilisateur possède un avatar sur le serveur.
   * Si false/undefined, le fetch n'est pas tenté (évite les 404 inutiles).
   * Correspond à `avatarURL` non-null côté API.
   */
  hasAvatar?: boolean;
  /** Taille du cercle en pixels. Défaut : 28. */
  size?: number;
  /** Taille de la fonte des initiales. Défaut : calculée d'après size. */
  fontSize?: number;
  /** Styles supplémentaires appliqués au conteneur. */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Avatar circulaire authentifié.
 *
 * - Si `hasAvatar` est vrai, effectue un `GET /users/{id}/avatar` avec le JWT
 *   et affiche le blob comme `<img>`.
 * - Sinon (ou en cas d'erreur), affiche les initiales sur fond coloré déterministe.
 *
 * Le blob URL est révoqué à la destruction du composant pour éviter les fuites mémoire.
 */
export default function UserAvatar({
  userId,
  firstName,
  lastName,
  hasAvatar,
  size = 28,
  fontSize,
  style,
  className,
}: UserAvatarProps) {
  const { authFetch }   = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    // Initialisation synchrone depuis le cache si déjà résolu
    const cached = avatarCache.get(userId);
    return cached?.status === "done" ? cached.url : null;
  });

  useEffect(() => {
    if (!hasAvatar || !userId) return;
    // Si déjà en cache, pas besoin d'attendre
    const cached = avatarCache.get(userId);
    if (cached?.status === "done") { setBlobUrl(cached.url); return; }
    if (cached?.status === "none") return;

    let cancelled = false;
    fetchAvatarOnce(userId, authFetch).then(url => {
      if (!cancelled && url) setBlobUrl(url);
    });
    return () => { cancelled = true; };
  // authFetch est stable (ref interne dans useAuth)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hasAvatar]);

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const c        = getAvatarStyle(userId);
  const fs       = fontSize ?? Math.round(size * 0.38);

  const baseStyle: React.CSSProperties = {
    width:          size,
    height:         size,
    borderRadius:   "50%",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
    overflow:       "hidden",
    background:     blobUrl ? "transparent" : c.background,
    color:          c.color,
    fontSize:       fs,
    fontWeight:     700,
    fontFamily:     "'DM Mono', monospace",
    ...style,
  };

  return (
    <div style={baseStyle} className={className}>
      {blobUrl
        ? <img
            src={blobUrl}
            alt={initials}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        : <span style={{ fontSize: fs, fontWeight: 700, lineHeight: 1 }}>{initials}</span>
      }
    </div>
  );
}