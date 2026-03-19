import { useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthResponse, User } from "../model/interfaces";
import { API_CONFIG } from "../config/api";

/**
 * Hook d'authentification centralisant l'accès au contexte {@link AuthContext}.
 *
 * Expose l'utilisateur courant, le token JWT, les actions de session
 * et une fonction `authFetch` pour effectuer des requêtes HTTP authentifiées.
 *
 * @returns Un objet contenant :
 * - `user`        – L'utilisateur connecté, ou `null` si non authentifié.
 * - `token`       – Le token JWT courant, ou `null` si non authentifié.
 * - `isLogged`    – `true` si une session active est présente.
 * - `login`       – Enregistre la réponse d'authentification dans le contexte.
 * - `logout`      – Efface la session courante.
 * - `updateUser`  – Met à jour les données utilisateur sans toucher au token.
 * - `authFetch`   – Wrapper autour de `fetch` qui injecte le JWT et gère le Content-Type.
 */
export function useAuth() {
  const { authResponse, setAuthResponse, updateUser } = useContext(AuthContext);

  // Ref pour éviter de capturer authResponse dans la closure de authFetch
  // (même pattern qu'Admin.tsx pour éviter les boucles infinies)
  const authResponseRef = useRef(authResponse);
  authResponseRef.current = authResponse;

  const login  = (r: AuthResponse) => setAuthResponse(r);
  const logout = () => setAuthResponse(null);

  /**
   * Wrapper authentifié autour de `fetch`.
   *
   * Injecte automatiquement le header `Authorization: Bearer <token>` sur chaque requête.
   * Gère deux cas de Content-Type :
   * - **JSON** (par défaut) : pose `Content-Type: application/json`.
   * - **Multipart** (si `init.body` est un `FormData`) : n'injecte pas de Content-Type
   *   afin de laisser le navigateur générer lui-même le header avec la `boundary` correcte.
   *
   * Comportements automatiques sur les codes d'erreur :
   * - **401** → déconnexion immédiate (token expiré ou invalide).
   * - **403** → si l'utilisateur courant se croyait admin, rafraîchit son profil
   *   en base pour refléter une éventuelle révocation de rôle sans reconnexion.
   */
  const authFetch = async (
    input: RequestInfo,
    init: RequestInit = {},
  ): Promise<Response> => {
    const isFormData = init.body instanceof FormData;
    const current    = authResponseRef.current;

    const res = await fetch(input, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
        ...(current?.token
          ? { Authorization: `Bearer ${current.token}` }
          : {}),
      },
    });

    if (res.status === 401) {
      logout();
      return res;
    }

    // Sur un 403 : si le contexte indique encore isAdmin = true, le rôle a
    // probablement été révoqué par un autre admin depuis la dernière connexion.
    // On relit le profil en base pour mettre à jour le contexte immédiatement,
    // ce qui masque le lien "Administration" sans attendre une reconnexion.
    if (res.status === 403 && current?.user?.isAdmin) {
      try {
        const userId     = current.user.id;
        const profileRes = await fetch(
          `${API_CONFIG.API_PREFIX}/users/${userId}`,
          { headers: { Authorization: `Bearer ${current.token}` } },
        );
        if (profileRes.ok) {
          const json = await profileRes.json();
          const raw  = json?.data ?? json;
          // Normalise "admin" → "isAdmin" (Jackson strip du préfixe "is")
          const freshUser: User = {
            ...raw,
            isAdmin: raw.isAdmin ?? raw.admin ?? false,
          };
          updateUser(freshUser);
        }
      } catch {
        // Silencieux : le rafraîchissement du profil est best-effort
      }
    }

    return res;
  };

  return {
    user:       authResponse?.user ?? null,
    token:      authResponse?.token ?? null,
    isLogged:   authResponse !== null,
    login,
    logout,
    updateUser,
    authFetch,
  };
}