import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthResponse } from "../model/interfaces";

/**
 * Hook d'authentification centralisant l'accès au contexte {@link AuthContext}.
 *
 * Expose l'utilisateur courant, le token JWT, les actions de session
 * et une fonction `authFetch` pour effectuer des requêtes HTTP authentifiées.
 *
 * @returns Un objet contenant :
 * - `user`      – L'utilisateur connecté, ou `null` si non authentifié.
 * - `token`     – Le token JWT courant, ou `null` si non authentifié.
 * - `isLogged`  – `true` si une session active est présente.
 * - `login`     – Enregistre la réponse d'authentification dans le contexte.
 * - `logout`    – Efface la session courante.
 * - `authFetch` – Wrapper autour de `fetch` qui injecte le JWT et gère le Content-Type.
 */
export function useAuth() {
  const { authResponse, setAuthResponse } = useContext(AuthContext);

  /**
   * Ouvre une session en enregistrant la réponse d'authentification.
   *
   * @param r - La réponse retournée par `POST /api/v1/auth/login`.
   */
  const login  = (r: AuthResponse) => setAuthResponse(r);

  /**
   * Ferme la session en effaçant le contexte d'authentification.
   */
  const logout = () => setAuthResponse(null);

  /**
   * Wrapper authentifié autour de `fetch`.
   *
   * Injecte automatiquement le header `Authorization: Bearer <token>` sur chaque requête.
   * Gère deux cas de Content-Type :
   * - **JSON** (par défaut) : pose `Content-Type: application/json`.
   * - **Multipart** (si `init.body` est un `FormData`) : n'injecte pas de Content-Type
   *   afin de laisser le navigateur générer lui-même le header avec la `boundary` correcte,
   *   indispensable pour que le serveur puisse parser le formulaire multipart.
   *
   * Déclenche automatiquement {@link logout} si le serveur répond `401 Unauthorized`.
   *
   * @param input - URL ou objet `Request` de la ressource cible.
   * @param init  - Options `fetch` standard (method, body, headers…). Optionnel.
   * @returns La `Response` HTTP brute.
   */
  const authFetch = async (
    input: RequestInfo,
    init: RequestInit = {},
  ): Promise<Response> => {
    // Si le body est un FormData (upload multipart), ne pas poser Content-Type :
    // le navigateur le génère lui-même avec la boundary correcte.
    const isFormData = init.body instanceof FormData;

    const res = await fetch(input, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
        ...(authResponse?.token
          ? { Authorization: `Bearer ${authResponse.token}` }
          : {}),
      },
    });
    if (res.status === 401) logout();
    return res;
  };

  return {
    user:     authResponse?.user ?? null,
    token:    authResponse?.token ?? null,
    isLogged: authResponse !== null,
    login,
    logout,
    authFetch,
  };
}