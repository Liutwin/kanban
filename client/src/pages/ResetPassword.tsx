import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES_AUTH } from "../config/api";
import AuthIcon from "../assets/kanban-icon-auth.svg";
import "../styles/auth.css";

/**
 * Page de confirmation de réinitialisation de mot de passe (étape 2).
 *
 * Accessible via le lien reçu par e-mail : /reset-password?token=xxx
 *
 * Au montage, envoie le token à Deno qui :
 *   1. Vérifie son existence et son expiration en base
 *   2. Génère + hache un mot de passe temporaire
 *   3. Met à jour la BDD via Spring et envoie le mot de passe par mail
 *   4. Invalide le token (usage unique)
 *
 * Affiche un écran de succès ou un message d'erreur explicite
 * (token invalide, déjà utilisé, ou expiré).
 */
export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const [status, setStatus]     = useState<"pending" | "success" | "error">("pending");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    document.title = "Kanban — Réinitialisation du mot de passe";

    const token = searchParams.get("token");

    if (!token) {
      setErrorMsg("Lien invalide. Aucun token présent dans l'URL.");
      setStatus("error");
      return;
    }

    // Appel automatique au montage — pas besoin d'action utilisateur
    (async () => {
      try {
        let res: Response;
        try {
          res = await fetch(ROUTES_AUTH.resetPasswordConfirm, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ token }),
          });
        } catch {
          throw new Error("Serveur indisponible.");
        }

        if (!res.ok) {
          const contentType = res.headers.get("Content-Type") ?? "";
          if (!contentType.includes("application/json")) throw new Error("Serveur indisponible.");
          const json = await res.json();
          throw new Error(json?.error?.message ?? "Erreur du serveur.");
        }

        setStatus("success");
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erreur du serveur.");
        setStatus("error");
      }
    })();
  }, [searchParams]);

  // ── Chargement ───────────────────────────────────────────────────────────
  if (status === "pending") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <img src={AuthIcon} alt="Kanban" width="32" height="32" />
            <h1 className="auth-title">KANBAN</h1>
            <p className="auth-sub">Réinitialisation du mot de passe</p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
            <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3,
              borderColor: "rgba(176,166,255,0.2)", borderTopColor: "#b0a6ff" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Succès ───────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <img src={AuthIcon} alt="Kanban" width="32" height="32" />
            <h1 className="auth-title">KANBAN</h1>
            <p className="auth-sub">Réinitialisation du mot de passe</p>
          </div>

          <div className="alert alert-success" style={{ marginBottom: "24px" }}>
            <span>✓</span>
            Votre mot de passe a été réinitialisé. Un mot de passe temporaire
            vous a été envoyé par e-mail. Pensez à le changer après connexion.
          </div>

          <p className="auth-link">
            <Link to="/login">Se connecter →</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Erreur ───────────────────────────────────────────────────────────────
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img src={AuthIcon} alt="Kanban" width="32" height="32" />
          <h1 className="auth-title">KANBAN</h1>
          <p className="auth-sub">Réinitialisation du mot de passe</p>
        </div>

        <div className="alert alert-error" style={{ marginBottom: "24px" }}>
          <span>⚠</span> {errorMsg}
        </div>

        <p className="auth-link">
          <Link to="/forgot-password">Faire une nouvelle demande</Link>
          {" · "}
          <Link to="/login">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
