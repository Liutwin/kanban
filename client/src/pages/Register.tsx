import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_API } from "../config/api";
import "../styles/auth.css";

export default function Register() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [prenom, setPrenom]   = useState("");
  const [nom, setNom]         = useState("");
  const [pseudo, setPseudo]   = useState("");
  const [mail, setMail]       = useState("");
  const [mdp, setMdp]         = useState("");
  const [mdp2, setMdp2]       = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!prenom || !nom || !pseudo || !mail || !mdp || !mdp2) {
      setError("Tous les champs sont requis.");
      return;
    }
    if (mdp !== mdp2) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (mdp.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(ROUTES_API.users, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom, nom, pseudo, email: mail, password: mdp }),
      });

      if (!res.ok) {
        // Tente de lire le message d'erreur retourné par Spring
        let msg = "Erreur lors de la création du compte.";
        try {
          const contentType = res.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            const body = await res.json();
            // Spring renvoie souvent { message: "..." } ou { error: "..." }
            msg = body?.message ?? body?.error ?? body?.detail ?? JSON.stringify(body);
          } else {
            const text = await res.text();
            if (text) msg = text;
          }
        } catch {
          // garde le message par défaut
        }
        throw new Error(msg);
      }

      const json = await res.json();
      login(json.data);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du compte.");
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
          <p className="auth-sub">Créer votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input
                type="text"
                className="form-input"
                placeholder="Alice"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                maxLength={50}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nom</label>
              <input
                type="text"
                className="form-input"
                placeholder="Martin"
                value={nom}
                onChange={e => setNom(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pseudo</label>
            <input
              type="text"
              className="form-input"
              placeholder="AliceM"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Adresse e-mail</label>
            <input
              type="email"
              className="form-input"
              placeholder="alice@example.com"
              value={mail}
              onChange={e => setMail(e.target.value)}
              autoComplete="email"
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
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={mdp2}
              onChange={e => setMdp2(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Création…</> : "Créer mon compte →"}
          </button>
        </form>

        <p className="auth-link">
          Déjà un compte ?{" "}
          <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}