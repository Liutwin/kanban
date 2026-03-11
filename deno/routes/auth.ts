// routes/auth.ts
import { Router }       from "@oak/oak";
import { db }           from "../config/db.ts";
import { createJWT, hashPassword, verifyPassword } from "../lib/jwt.ts";
import { authMiddleware, type AuthContext }         from "../middleware/auth.ts";
import {
  APIErrorCode, APIException,
  type LoginRequest, type RegisterRequest,
  type AuthResponse, type Utilisateur,
} from "../model/interfaces.ts";

const router = new Router({ prefix: "/auth" });

// ── POST /auth/register ──────────────────────────────────────────────────
router.post("/register", async (ctx) => {
  const body = await ctx.request.body.json() as RegisterRequest;

  if (!body.usr_mail || !body.usr_pseudo || !body.usr_mdp) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Champs manquants");
  }

  // Vérifier que le mail n'est pas déjà pris
  const [rows] = await db.query(
    "SELECT usr_id FROM utilisateur_usr WHERE usr_mail = ?",
    [body.usr_mail],
  );
  if ((rows as unknown[]).length > 0) {
    throw new APIException(APIErrorCode.CONFLICT, 409, "Email déjà utilisé");
  }

  const hashedMdp = hashPassword(body.usr_mdp);

  const [result] = await db.query(
    "INSERT INTO utilisateur_usr (usr_mail, usr_pseudo, usr_mdp) VALUES (?, ?, ?)",
    [body.usr_mail, body.usr_pseudo, hashedMdp],
  ) as [{ insertId: number }, unknown];

  const user: Utilisateur = {
    usr_id:     result.insertId,
    usr_mail:   body.usr_mail,
    usr_pseudo: body.usr_pseudo,
  };

  const token = await createJWT({
    usr_id:     user.usr_id,
    usr_mail:   user.usr_mail,
    usr_pseudo: user.usr_pseudo,
  });

  const response: AuthResponse = { token, user };
  ctx.response.status = 201;console.log("✅ Connexion MariaDB établie");
  ctx.response.body   = { success: true, data: response };
});

// ── POST /auth/login ─────────────────────────────────────────────────────
router.post("/login", async (ctx) => {
  const body = await ctx.request.body.json() as LoginRequest;

  if (!body.usr_mail || !body.usr_mdp) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Email et mot de passe requis");
  }

  const [rows] = await db.query(
    "SELECT usr_id, usr_mail, usr_pseudo, usr_mdp FROM utilisateur_usr WHERE usr_mail = ?",
    [body.usr_mail],
  );

  const userRow = (rows as Record<string, unknown>[])[0];

  if (!userRow || !verifyPassword(body.usr_mdp, userRow.usr_mdp as string)) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Identifiants incorrects");
  }

  const user: Utilisateur = {
    usr_id:     userRow.usr_id as number,
    usr_mail:   userRow.usr_mail as string,
    usr_pseudo: userRow.usr_pseudo as string,
  };

  const token = await createJWT({
    usr_id:     user.usr_id,
    usr_mail:   user.usr_mail,
    usr_pseudo: user.usr_pseudo,
  });

  const response: AuthResponse = { token, user };
  ctx.response.status = 200;
  ctx.response.body   = { success: true, data: response };
});

// ── GET /auth/validate ───────────────────────────────────────────────────
router.get("/validate", authMiddleware, (ctx: AuthContext) => {
  ctx.response.status = 200;
  ctx.response.body   = { success: true, data: ctx.state.user };
});

export default router;
