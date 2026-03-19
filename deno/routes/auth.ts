// routes/auth.ts
import { Router }     from "@oak/oak";
import { randomUUID } from "node:crypto";
import { randomBytes } from "node:crypto";
import { db }          from "../config/db.ts";
import { createJWT, verifyPassword, hashPassword } from "../lib/jwt.ts";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";

import {
  APIErrorCode, APIException,
  type LoginRequest,
  type AuthResponse, type User,
} from "../model/interfaces.ts";
import { isLoginRequest } from "../model/guards.ts";

const router   = new Router({ prefix: "/api/v1/auth" });
const SPRING   = Deno.env.get("SPRING_URL")   ?? "http://spring:8080";
const BASE_URL = Deno.env.get("APP_BASE_URL") ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────────────
// Authentification
// ─────────────────────────────────────────────────────────────────────────────

router.post("/login", async (ctx) => {
  const body = await ctx.request.body.json() as LoginRequest;

  if (!isLoginRequest(body)) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Corps de requête invalide");
  }

  if (!body.email || !body.password) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Pseudo et mot de passe requis");
  }

  const [rows] = await db.query(
    "SELECT usr_id, usr_mail, usr_mdp, usr_prenom, usr_nom, usr_admin FROM utilisateur_usr WHERE usr_mail = ?",
    [body.email],
  );

  const userRow = (rows as Record<string, unknown>[])[0];

  if (!userRow || !(await verifyPassword(body.password, userRow.usr_mdp as string))) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Identifiants incorrects.");
  }

  const user: User = {
    id:        userRow.usr_id as number,
    email:     userRow.usr_mail as string,
    firstName: userRow.usr_prenom as string,
    lastName:  userRow.usr_nom as string,
    isAdmin:   userRow.usr_admin === 1,
  };

  const token = await createJWT({ id: user.id });

  const response: AuthResponse = { token, user };
  ctx.response.status = 200;
  ctx.response.body   = { success: true, data: response };
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation du token JWT
// ─────────────────────────────────────────────────────────────────────────────

router.get("/validate", authMiddleware, (ctx: AuthContext) => {
  ctx.response.status = 200;
  ctx.response.body   = { success: true, data: ctx.state.user };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mot de passe oublié — étape 1 : demande de réinitialisation
//
// Génère un token UUID, l'insère dans reset_token_rtk (expiry +15 min),
// puis demande à Spring d'envoyer le mail avec le lien de confirmation.
// La réponse est volontairement neutre (200 même si l'email est inconnu)
// pour éviter l'énumération d'adresses.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/reset-password", async (ctx) => {
  const body = await ctx.request.body.json() as { email?: string };

  if (!body.email) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Email requis");
  }

  // Vérification en base (accès direct MariaDB, comme /login)
  const [rows] = await db.query(
    "SELECT usr_id, usr_prenom FROM utilisateur_usr WHERE usr_mail = ?",
    [body.email],
  );
  const userRow = (rows as Record<string, unknown>[])[0];

  // Réponse neutre si l'email est inconnu
  if (!userRow) {
    ctx.response.status = 200;
    ctx.response.body   = { success: true };
    return;
  }

  // Supprimer tout token de reset existant pour cet utilisateur
  // (évite les tokens orphelins en cas de demandes multiples)
  await db.query(
    "DELETE FROM reset_token_rtk WHERE usr_id = ?",
    [userRow.usr_id],
  );

  // Générer un token UUID — l'expiration est calculée côté MariaDB avec NOW()
  // pour éviter tout décalage de timezone entre Deno (UTC) et le serveur SQL.
  const token = randomUUID();

  await db.query(
    "INSERT INTO reset_token_rtk (rtk_token, rtk_expiry, usr_id) VALUES (?, NOW() + INTERVAL 15 MINUTE, ?)",
    [token, userRow.usr_id],
  );

  // Demander à Spring d'envoyer le mail avec le lien
  const resetLink = `${BASE_URL}/reset-password?token=${token}`;

  const springRes = await fetch(`${SPRING}/api/v1/users/send-reset-email`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      email:     body.email,
      firstName: userRow.usr_prenom,
      resetLink: resetLink,
    }),
  });

  if (!springRes.ok) {
    const springBody = await springRes.text().catch(() => "(impossible de lire le corps)");
    console.error(`[reset] Spring /send-reset-email → ${springRes.status}: ${springBody}`);
    // Annuler le token si Spring ne peut pas envoyer le mail
    await db.query("DELETE FROM reset_token_rtk WHERE rtk_token = ?", [token]);
    throw new APIException(APIErrorCode.SERVER_ERROR, 500, "Erreur lors de l'envoi du mail");
  }

  ctx.response.status = 200;
  ctx.response.body   = { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mot de passe oublié — étape 2 : confirmation via le token du lien e-mail
//
// Vérifie le token (existence + expiration), génère un mot de passe temporaire,
// le hache, met à jour la BDD via Spring et invalide le token.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/reset-password/confirm", async (ctx) => {
  const body = await ctx.request.body.json() as { token?: string };

  if (!body.token) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Token requis");
  }

  // Vérifier que le token existe et n'est pas expiré.
  // La comparaison se fait côté MariaDB avec NOW() pour éviter
  // tout décalage de timezone entre Deno (UTC) et le serveur SQL.
  const [rows] = await db.query(
    `SELECT r.rtk_id, r.usr_id,
            u.usr_mail, u.usr_prenom,
            (r.rtk_expiry < NOW()) AS is_expired
     FROM reset_token_rtk r
     JOIN utilisateur_usr u ON u.usr_id = r.usr_id
     WHERE r.rtk_token = ?`,
    [body.token],
  );
  const row = (rows as Record<string, unknown>[])[0];

  if (!row) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Token invalide ou déjà utilisé");
  }

  if (row.is_expired) {
    // Nettoyer le token expiré
    await db.query("DELETE FROM reset_token_rtk WHERE rtk_id = ?", [row.rtk_id]);
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Ce lien a expiré. Veuillez faire une nouvelle demande.");
  }

  // Invalider le token EN PREMIER — consommé, ne peut plus être réutilisé.
  // Ce DELETE doit précéder tout appel externe pour éviter qu'un double-clic
  // ou une double requête concurrente ne passe la validation une seconde fois
  // et ne déclenche deux envois de mail distincts (race condition).
  await db.query("DELETE FROM reset_token_rtk WHERE rtk_id = ?", [row.rtk_id]);

  // Générer et hacher le mot de passe temporaire
  const tempPassword   = randomBytes(6).toString("hex");
  const hashedPassword = await hashPassword(tempPassword);

  // Mettre à jour le mot de passe via Spring (qui envoie aussi le mail de confirmation)
  const springRes = await fetch(`${SPRING}/api/v1/users/reset-password`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      email:          row.usr_mail,
      hashedPassword: hashedPassword,
      tempPassword:   tempPassword,
    }),
  });

  if (!springRes.ok) {
    throw new APIException(APIErrorCode.SERVER_ERROR, 500, "Erreur lors de la réinitialisation");
  }

  ctx.response.status = 200;
  ctx.response.body   = { success: true };
});

export default router;