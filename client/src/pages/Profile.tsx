import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import { getAvatarStyle } from "../utils/avatarColor";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../utils/apiHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// Types locaux
// ─────────────────────────────────────────────────────────────────────────────

/** Données du formulaire "informations personnelles". */
interface InfoForm {
  firstName: string;
  lastName:  string;
  email:     string;
}

/** Données du formulaire "changement de mot de passe". */
interface PwdForm {
  oldPassword: string;
  newPassword: string;
  confirm:     string;
}

/** Statut d'une section : idle | saving | saved | error. */
type SectionStatus = "idle" | "saving" | "saved" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Renvoie les initiales (2 lettres) d'un utilisateur. */
const initials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

/** Styles de base communs aux inputs. */
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface3)",
  border: "1px solid var(--border2)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 13,
  padding: "10px 14px",
  outline: "none",
  transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indicateur de statut (sauvegarde / succès / erreur) affiché sous un formulaire.
 *
 * @param status  - Statut courant de la section.
 * @param message - Message d'erreur à afficher si `status === "error"`.
 */
function StatusBadge({ status, message }: { status: SectionStatus; message?: string }) {
  if (status === "idle") return null;
  const cfg = {
    saving: { bg: "rgba(176,166,255,0.1)",  border: "rgba(176,166,255,0.25)", color: "#b0a6ff", icon: "⏳", label: "Sauvegarde…" },
    saved:  { bg: "rgba(129,201,149,0.1)",  border: "rgba(129,201,149,0.25)", color: "#81c995", icon: "✓",  label: "Enregistré"  },
    error:  { bg: "rgba(242,139,130,0.1)",  border: "rgba(242,139,130,0.25)", color: "#f28b82", icon: "⚠",  label: message ?? "Erreur" },
  }[status];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 14px", borderRadius: "var(--radius)", background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 12, fontWeight: 500 }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </div>
  );
}

/**
 * Titre de section avec séparateur.
 *
 * @param icon  - Emoji ou icône à afficher devant le titre.
 * @param title - Texte du titre.
 */
function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "0.01em" }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: "var(--border2)", marginLeft: 4 }} />
    </div>
  );
}

/**
 * Champ de formulaire avec label.
 *
 * @param label    - Texte du label affiché au-dessus.
 * @param children - Élément `<input>` ou `<textarea>` à rendre.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Page de profil de l'utilisateur connecté.
 *
 * Permet de :
 * - Consulter et modifier ses informations personnelles (nom, prénom, e-mail, URL d'avatar).
 * - Changer son mot de passe (ancien mot de passe requis pour confirmation).
 *
 * Les modifications sont envoyées via :
 * - `PUT  /api/v1/users/{id}` pour les informations personnelles.
 * - `PATCH /api/v1/users/{id}/password` pour le mot de passe.
 *
 * Après une mise à jour des informations, le contexte d'authentification
 * (localStorage) est mis à jour pour refléter immédiatement les nouveaux
 * nom, prénom et avatar dans l'interface.
 */
export default function Profile() {
  const { user, authFetch, login, token } = useAuth();

  // ── Formulaire infos ──────────────────────────────────────
  const [infoForm, setInfoForm] = useState<InfoForm>({
    firstName: user?.firstName ?? "",
    lastName:  user?.lastName  ?? "",
    email:     user?.email     ?? "",
  });
  const [infoStatus,  setInfoStatus]  = useState<SectionStatus>("idle");
  const [infoError,   setInfoError]   = useState("");

  // ── Formulaire mot de passe ───────────────────────────────
  const [pwdForm, setPwdForm] = useState<PwdForm>({
    oldPassword: "",
    newPassword: "",
    confirm:     "",
  });
  const [pwdStatus,  setPwdStatus]  = useState<SectionStatus>("idle");
  const [pwdError,   setPwdError]   = useState("");
  const [showPwd,    setShowPwd]    = useState({ old: false, new: false, confirm: false });

  // ── Chargement initial ────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const infoSavedTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pwdSavedTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    authFetch(ROUTES_API.user(user.id))
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const p = json?.data ?? json;
        if (!p) return;
        setInfoForm(f => ({
          ...f,
          email: p.email ?? f.email,
        }));
      })
      .catch(() => {});
  }, [user?.id]);

  // Nettoyage des timers au démontage
  useEffect(() => () => {
    if (infoSavedTimer.current)  clearTimeout(infoSavedTimer.current);
    if (pwdSavedTimer.current)   clearTimeout(pwdSavedTimer.current);
  }, []);

  // ── Sauvegarde infos ──────────────────────────────────────

  /**
   * Soumet le formulaire des informations personnelles vers `PUT /api/v1/users/{id}`.
   * Met à jour le contexte d'authentification si la requête réussit.
   *
   * @param e - Événement de soumission du formulaire.
   */
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!infoForm.firstName.trim() || !infoForm.lastName.trim()) {
      setInfoError("Le prénom et le nom sont requis.");
      setInfoStatus("error");
      return;
    }
    if (!infoForm.email.trim()) {
      setInfoError("L'e-mail est requis.");
      setInfoStatus("error");
      return;
    }
    setInfoStatus("saving");
    setInfoError("");
    try {
      const body = {
        firstName: infoForm.firstName.trim(),
        lastName:  infoForm.lastName.trim(),
        email:     infoForm.email.trim(),
      };
      const res = await authFetch(ROUTES_API.user(user.id), {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      const json = await res.json();
      const updated = json?.data ?? json;

      // Mettre à jour le contexte auth pour refléter les changements immédiatement
      if (token) {
        login({
          token,
          user: {
            ...user,
            firstName: updated.firstName ?? infoForm.firstName,
            lastName:  updated.lastName  ?? infoForm.lastName,
            email:     updated.email     ?? infoForm.email,
          },
        });
      }

      setInfoStatus("saved");
      infoSavedTimer.current = setTimeout(() => setInfoStatus("idle"), 3000);
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
      setInfoStatus("error");
    }
  };

  // ── Sauvegarde mot de passe ───────────────────────────────

  /**
   * Soumet le formulaire de changement de mot de passe vers `PATCH /api/v1/users/{id}/password`.
   * Réinitialise les champs après succès.
   *
   * @param e - Événement de soumission du formulaire.
   */
  const handleSavePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!pwdForm.oldPassword) {
      setPwdError("L'ancien mot de passe est requis.");
      setPwdStatus("error");
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdError("Le nouveau mot de passe doit faire au moins 8 caractères.");
      setPwdStatus("error");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdError("Les mots de passe ne correspondent pas.");
      setPwdStatus("error");
      return;
    }
    setPwdStatus("saving");
    setPwdError("");
    try {
      const res = await authFetch(ROUTES_API.userPassword(user.id), {
        method: "PATCH",
        body: JSON.stringify({
          oldPassword: pwdForm.oldPassword,
          newPassword: pwdForm.newPassword,
        }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setPwdStatus("saved");
      setPwdForm({ oldPassword: "", newPassword: "", confirm: "" });
      pwdSavedTimer.current = setTimeout(() => setPwdStatus("idle"), 3000);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Erreur lors du changement de mot de passe.");
      setPwdStatus("error");
    }
  };

  // ── Rendu ─────────────────────────────────────────────────

  /** Indicateur visuel de force du mot de passe (0–3). */
  const pwdStrength = (() => {
    const p = pwdForm.newPassword;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8)                        score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p))  score++;
    if (/[0-9]/.test(p))                      score++;
    if (/[^A-Za-z0-9]/.test(p))               score++;
    return Math.min(score, 3) as 0 | 1 | 2 | 3;
  })();

  const pwdStrengthLabel = ["", "Faible", "Moyen", "Fort"][pwdStrength];
  const pwdStrengthColor = ["", "#f28b82", "#fdd663", "#81c995"][pwdStrength];

  const avatarSrc = null; // Pas d'upload d'avatar pour l'instant
  const userInitials = infoForm.firstName || infoForm.lastName
    ? initials(infoForm.firstName || "?", infoForm.lastName || "?")
    : user ? initials(user.firstName, user.lastName) : "?";

  return (
    <Layout title="Mon profil">
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── En-tête profil ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, boxShadow: "var(--elev-1)" }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: user?.id ? getAvatarStyle(user.id).background : "linear-gradient(135deg, var(--accent-dark), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 3px ${user?.id ? getAvatarStyle(user.id).from + '44' : 'rgba(176,166,255,0.25)'}, var(--elev-2)` }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <span style={{ fontSize: 24, fontWeight: 700, color: "#1c1b1f" }}>{userInitials}</span>
              }
            </div>
            {/* Badge admin */}
            {user?.isAdmin && (
              <span style={{ position: "absolute", bottom: -2, right: -2, background: "var(--accent)", color: "#1c1b1f", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase", border: "2px solid var(--surface)" }}>
                Admin
              </span>
            )}
          </div>
          {/* Infos */}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em", marginBottom: 4 }}>
              {infoForm.firstName || user?.firstName} {infoForm.lastName || user?.lastName}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {infoForm.email || user?.email}
            </p>
          </div>
        </div>

        {/* ── Informations personnelles ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px 32px", boxShadow: "var(--elev-1)" }}>
          <SectionTitle icon="✏️" title="Informations personnelles" />

          {loading
            ? <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "var(--text-3)", fontSize: 13 }}>
                <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--text-3)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Chargement…
              </div>
            : <form onSubmit={handleSaveInfo} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Prénom">
                    <input
                      style={inputStyle}
                      value={infoForm.firstName}
                      maxLength={50}
                      onChange={e => setInfoForm(f => ({ ...f, firstName: e.target.value }))}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176,166,255,0.1)"; e.currentTarget.style.background = "var(--surface4)"; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "var(--surface3)"; }}
                      placeholder="Jean"
                    />
                  </Field>
                  <Field label="Nom">
                    <input
                      style={inputStyle}
                      value={infoForm.lastName}
                      maxLength={50}
                      onChange={e => setInfoForm(f => ({ ...f, lastName: e.target.value }))}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176,166,255,0.1)"; e.currentTarget.style.background = "var(--surface4)"; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "var(--surface3)"; }}
                      placeholder="Dupont"
                    />
                  </Field>
                </div>

                <Field label="Adresse e-mail">
                  <input
                    type="email"
                    style={inputStyle}
                    value={infoForm.email}
                    maxLength={50}
                    onChange={e => setInfoForm(f => ({ ...f, email: e.target.value }))}
                    onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176,166,255,0.1)"; e.currentTarget.style.background = "var(--surface4)"; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "var(--surface3)"; }}
                    placeholder="jean.dupont@exemple.com"
                  />
                </Field>

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button
                    type="submit"
                    disabled={infoStatus === "saving"}
                    style={{ padding: "10px 24px", borderRadius: "var(--radius-full)", background: "var(--accent)", border: "none", color: "#1c1b1f", fontSize: 13, fontWeight: 700, cursor: infoStatus === "saving" ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s", opacity: infoStatus === "saving" ? 0.6 : 1 }}
                    onMouseEnter={e => { if (infoStatus !== "saving") e.currentTarget.style.background = "#c4bcff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; }}
                  >
                    {infoStatus === "saving" ? "Sauvegarde…" : "Enregistrer"}
                  </button>
                </div>

                <StatusBadge status={infoStatus} message={infoError} />
              </form>
          }
        </div>

        {/* ── Changement de mot de passe ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px 32px", boxShadow: "var(--elev-1)" }}>
          <SectionTitle icon="🔒" title="Mot de passe" />

          <form onSubmit={handleSavePwd} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {(["old", "new", "confirm"] as const).map(key => {
              const labels  = { old: "Mot de passe actuel", new: "Nouveau mot de passe", confirm: "Confirmer le nouveau mot de passe" };
              const keys    = { old: "oldPassword", new: "newPassword", confirm: "confirm" } as const;
              const visible = showPwd[key];
              return (
                <Field key={key} label={labels[key]}>
                  <div style={{ position: "relative" }}>
                    <input
                      type={visible ? "text" : "password"}
                      style={{ ...inputStyle, paddingRight: 42 }}
                      value={pwdForm[keys[key]]}
                      onChange={e => setPwdForm(f => ({ ...f, [keys[key]]: e.target.value }))}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176,166,255,0.1)"; e.currentTarget.style.background = "var(--surface4)"; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "var(--surface3)"; }}
                      placeholder={key === "old" ? "••••••••" : key === "new" ? "8 caractères minimum" : "Répéter le mot de passe"}
                      autoComplete={key === "old" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(s => ({ ...s, [key]: !s[key] }))}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 14, padding: 4, lineHeight: 1 }}
                      aria-label={visible ? "Masquer" : "Afficher"}
                    >
                      {visible ? "🙈" : "👁"}
                    </button>
                  </div>
                  {/* Barre de force uniquement sur le nouveau mot de passe */}
                  {key === "new" && pwdForm.newPassword && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 99, background: "var(--surface3)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(pwdStrength / 3) * 100}%`, background: pwdStrengthColor, borderRadius: 99, transition: "width 0.3s ease, background 0.3s ease" }} />
                      </div>
                      <span style={{ fontSize: 11, color: pwdStrengthColor, fontWeight: 600, minWidth: 36 }}>{pwdStrengthLabel}</span>
                    </div>
                  )}
                  {/* Indicateur de correspondance sur la confirmation */}
                  {key === "confirm" && pwdForm.confirm && (
                    <span style={{ fontSize: 11, marginTop: 2, color: pwdForm.newPassword === pwdForm.confirm ? "#81c995" : "#f28b82" }}>
                      {pwdForm.newPassword === pwdForm.confirm ? "✓ Correspond" : "✗ Ne correspond pas"}
                    </span>
                  )}
                </Field>
              );
            })}

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
              <button
                type="submit"
                disabled={pwdStatus === "saving"}
                style={{ padding: "10px 24px", borderRadius: "var(--radius-full)", background: "var(--accent)", border: "none", color: "#1c1b1f", fontSize: 13, fontWeight: 700, cursor: pwdStatus === "saving" ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s", opacity: pwdStatus === "saving" ? 0.6 : 1 }}
                onMouseEnter={e => { if (pwdStatus !== "saving") e.currentTarget.style.background = "#c4bcff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; }}
              >
                {pwdStatus === "saving" ? "Sauvegarde…" : "Changer le mot de passe"}
              </button>
            </div>

            <StatusBadge status={pwdStatus} message={pwdError} />
          </form>
        </div>

      </div>
    </Layout>
  );
}