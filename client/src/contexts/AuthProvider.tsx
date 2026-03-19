import { useState, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthResponse, User } from "../model/interfaces";

/**
 * Fournisseur du contexte d'authentification.
 *
 * Persiste la réponse d'authentification (token JWT + infos utilisateur)
 * dans le localStorage afin qu'elle soit partagée entre les onglets et
 * survive à un rechargement de la page.
 *
 * À placer au plus haut niveau de l'arbre de composants (ex. main.tsx).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * Initialisation depuis le localStorage : si une session existante est
   * trouvée, elle est restaurée directement sans nouvel appel à l'API.
   */
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(() => {
    try {
      const stored = localStorage.getItem("auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  /**
   * Met à jour l'état React et synchronise le localStorage.
   * - Si `r` est non nul, sérialise et stocke la réponse.
   * - Si `r` est nul (déconnexion), supprime l'entrée du localStorage.
   */
  const handleSet = (r: AuthResponse | null) => {
    setAuthResponse(r);
    if (r) localStorage.setItem("auth", JSON.stringify(r));
    else   localStorage.removeItem("auth");
  };

  /**
   * Met à jour uniquement les données utilisateur dans le contexte et le
   * localStorage, sans toucher au token JWT.
   * Utilisé après une modification de profil ou un changement de rôle admin.
   */
  const handleUpdateUser = (u: User) => {
    setAuthResponse(prev => {
      if (!prev) return prev;
      const next = { ...prev, user: u };
      localStorage.setItem("auth", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ authResponse, setAuthResponse: handleSet, updateUser: handleUpdateUser }}>
      {children}
    </AuthContext.Provider>
  );
}