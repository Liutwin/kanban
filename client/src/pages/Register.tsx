import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES_API } from "../config/api";
import AuthIcon from '../assets/kanban-icon-auth.svg';
import "../styles/auth.css";

/**
 * Page d'inscription de l'application.
 *
 * Affiche un formulaire de création de compte demandant le prénom, le nom,
 * l'adresse e-mail et le mot de passe (avec confirmation).
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
  const [firstName, setFirstName] = useState("");
  /** Nom de famille saisi par l'utilisateur (max 50 caractères). */
  const [lastName, setLastName]   = useState("");
  /** Adresse e-mail saisie par l'utilisateur. */
  const [email, setEmail]         = useState("");
  /** Mot de passe saisi par l'utilisateur. */
  const [password, setPassword]   = useState("");
  /** Confirmation du mot de passe, doit être identique à {@link password}. */
  const [password2, setPassword2] = useState("");
  /** Message d'erreur à afficher dans le formulaire, vide si aucune erreur. */
  const [error, setError]         = useState("");
  /** Indique si une requête de création de compte est en cours (désactive le bouton submit). */
  const [loading, setLoading]     = useState(false);

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
      if (!firstName.trim())
        return "Le prénom est requis.";
      if (!lastName.trim())
        return "Le nom est requis.";
      if (!email || !password || !password2)
        return "Tous les champs sont requis.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return "Adresse e-mail invalide.";
      if (password !== password2)
        return "Les mots de passe ne correspondent pas.";
      if (password.length < 8)
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
        // Les noms des champs doivent correspondre exactement au DTO Spring (UserCreateDTO)
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
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
      navigate("/login", { state: { message: "Compte créé avec succès, connectez-vous." } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">

      <div className="auth-card">
        <div className="auth-header">
            <img src={AuthIcon} alt="Kanban" width="32" height="32" />
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
              <label className="form-label">
                Prénom <span className="required" aria-hidden>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Alice"
                value={firstName}
                onChange={e => setFirstName(e.target.value.replace(/^\p{L}/u, c => c.toUpperCase()))}
                maxLength={50}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Nom <span className="required" aria-hidden>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Martin"
                value={lastName}
                onChange={e => setLastName(e.target.value.replace(/^\p{L}/u, c => c.toUpperCase()))}
                maxLength={50}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Adresse e-mail <span className="required" aria-hidden>*</span>
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="alice@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Mot de passe <span className="required" aria-hidden>*</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Confirmer le mot de passe <span className="required" aria-hidden>*</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              autoComplete="new-password"
              required
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