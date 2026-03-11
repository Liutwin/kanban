import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_AUTH } from "../config/api";
import { extractErrorMessage } from "../utils/apiHelpers";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [mail, setMail]       = useState("");
  const [mdp, setMdp]         = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!mail || !mdp) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    try {
      const res = await fetch(ROUTES_AUTH.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usr_mail: mail, usr_mdp: mdp }),
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res, "Identifiants incorrects.");
        throw new Error(msg);
      }
      const json = await res.json();
      login(json.data);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-deco" aria-hidden>
        <span className="deco-hex">⬡</span>
        <span className="deco-hex small">⬡</span>
        <span className="deco-hex tiny">⬡</span>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">⬡</span>
          <h1 className="auth-title">KANBAN</h1>
          <p className="auth-sub">Connectez-vous à votre espace</p>
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
              value={mail}
              onChange={e => setMail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Connexion…</> : "Se connecter →"}
          </button>
        </form>

        <p className="auth-link">
          Pas encore de compte ?{" "}
          <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
