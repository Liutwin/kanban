import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_API } from "../config/api";
import "../styles/auth.css";

/**
 * Page d'inscription de l'application.
 *
 * Affiche un formulaire de création de compte demandant le prénom, le nom,
 * le pseudo, l'adresse e-mail et le mot de passe (avec confirmation).
 * Les validations suivantes sont effectuées côté client avant l'envoi :
 * - tous les champs sont requis ;
 * - les deux mots de passe doivent correspondre ;
 * - le mot de passe doit comporter au moins 8 caractères.
 *
 * En cas de succès, le token JWT reçu est stocké via le contexte
 * d'authentification et l'utilisateur est redirigé vers l'accueil.
 *
 * @returns La page d'inscription.
 *
 * @example
 * ```tsx
 * // Déclaration dans le routeur
 * <Route path="/register" element={<Register />} />
 * ```
 */
export default function Register() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  /** Prénom saisi par l'utilisateur (max 50 caractères). */
  const [prenom, setPrenom]   = useState("");
  /** Nom de famille saisi par l'utilisateur (max 50 caractères). */
  const [nom, setNom]         = useState("");
  /** Pseudo choisi par l'utilisateur (max 20 caractères). */
  const [pseudo, setPseudo]   = useState("");
  /** Adresse e-mail saisie par l'utilisateur. */
  const [mail, setMail]       = useState("");
  /** Mot de passe saisi par l'utilisateur. */
  const [mdp, setMdp]         = useState("");
  /** Confirmation du mot de passe, doit être identique à {@link mdp}. */
  const [mdp2, setMdp2]       = useState("");
  /** Message d'erreur à afficher dans le formulaire, vide si aucune erreur. */
  const [error, setError]     = useState("");
  /** Indique si une requête de création de compte est en cours (désactive le bouton submit). */
  const [loading, setLoading] = useState(false);

  /** Met à jour le titre de l'onglet du navigateur pour la page d'inscription. */
  useEffect(() => {
    document.title = "Kanban — Inscription";
  }, []);

  /**
   * Soumet le formulaire d'inscription.
   *
   * Valide les champs côté client, puis envoie les données à l'API Spring
   * (`POST /users`). En cas de succès, stocke le token JWT et redirige vers
   * l'accueil. En cas d'échec, tente de lire le message d'erreur retourné
   * par le serveur (JSON ou texte brut) et l'affiche dans le formulaire.
   *
   * @param e - L'événement de soumission du formulaire.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validate = (): string | null => {
      if (!prenom || !nom || !pseudo || !mail || !mdp || !mdp2)
        return "Tous les champs sont requis.";
      if (pseudo.length < 3 || pseudo.length > 20)
        return "Le pseudo doit faire entre 3 et 20 caractères.";
      if (!/^[a-zA-Z0-9_-]+$/.test(pseudo))
        return "Le pseudo ne peut contenir que des lettres, chiffres, _ et -.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
        return "Adresse e-mail invalide.";
      if (mdp !== mdp2)
        return "Les mots de passe ne correspondent pas.";
      if (mdp.length < 8)
        return "Le mot de passe doit comporter au moins 8 caractères.";
      return null;
    };

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

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