import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ROUTES_AUTH } from "../config/api";
import AuthIcon from "../assets/kanban-icon-auth.svg";
import "../styles/auth.css";

/**
 * Page de demande de réinitialisation de mot de passe (étape 1).
 *
 * L'utilisateur saisit son adresse e-mail. Si un compte y est associé,
 * Deno génère un token de reset (valable 15 min) et Spring envoie un
 * e-mail contenant le lien de confirmation.
 *
 * La réponse est volontairement neutre pour éviter l'énumération d'adresses.
 */
export default function ForgotPassword() {
  const [email, setEmail]         = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Kanban — Mot de passe oublié";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }

    setLoading(true);
    try {
      let res: Response;
      try {
        res = await fetch(ROUTES_AUTH.resetPassword, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: email.trim() }),
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

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur du serveur.");
    } finally {
      setLoading(false);
    }
  };

  // ── Écran de confirmation ────────────────────────────────────────────────
  if (submitted) {
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
            Si un compte est associé à cette adresse, un lien de confirmation
            vient d'être envoyé. Ce lien est valable 15 minutes.
            Pensez à vérifier vos spams.
          </div>

          <p className="auth-link">
            <Link to="/login">← Retour à la connexion</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Formulaire ───────────────────────────────────────────────────────────
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img src={AuthIcon} alt="Kanban" width="32" height="32" />
          <h1 className="auth-title">KANBAN</h1>
          <p className="auth-sub">Réinitialiser votre mot de passe</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Adresse e-mail</label>
            <input
              type="email"
              className="form-input"
              placeholder="alice@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" /> Envoi en cours…</>
              : "Recevoir un lien de réinitialisation →"}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/login">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
