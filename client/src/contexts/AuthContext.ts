import { createContext } from "react";
import type { AuthResponse, User } from "../model/interfaces";

/**
 * Valeur exposée par le contexte d'authentification.
 */
export interface AuthContextValue {
  /** Réponse d'authentification courante (token JWT + infos utilisateur),
   *  ou `null` si l'utilisateur n'est pas connecté. */
  authResponse:    AuthResponse | null;

  /** Met à jour la réponse d'authentification et synchronise le localStorage.
   *  Passer `null` pour effacer la session (déconnexion). */
  setAuthResponse: (r: AuthResponse | null) => void;

  /** Met à jour uniquement les données utilisateur dans le contexte et le
   *  localStorage, sans toucher au token JWT. */
  updateUser: (u: User) => void;
}

/**
 * Contexte React partagé entre tous les composants de l'application.
 *
 * Ne pas consommer directement — utiliser le hook `useAuth` à la place,
 * qui vérifie que le contexte est bien fourni par un `AuthProvider`.
 */
export const AuthContext = createContext<AuthContextValue>({
  authResponse:    null,
  setAuthResponse: () => {},
  updateUser:      () => {},
});