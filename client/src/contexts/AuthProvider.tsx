import { useState, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthResponse } from "../model/interfaces";

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
   *
   * @param r - La réponse d'authentification à stocker, ou `null` pour
   *            effacer la session.
   */
  const handleSet = (r: AuthResponse | null) => {
    setAuthResponse(r);
    if (r) localStorage.setItem("auth", JSON.stringify(r));
    else   localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ authResponse, setAuthResponse: handleSet }}>
      {children}
    </AuthContext.Provider>
  );
}