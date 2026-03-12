// routes/auth.ts
import { Router } from "@oak/oak";
import { db }     from "../config/db.ts";
import { createJWT, verifyPassword } from "../lib/jwt.ts";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";

import {
  APIErrorCode, APIException,
  type LoginRequest,
  type AuthResponse, type Utilisateur,
} from "../model/interfaces.ts";
import { isLoginRequest } from "../model/guards.ts";

const router = new Router({ prefix: "/auth" });

// Authentification
router.post("/login", async (ctx) => {
  const body = await ctx.request.body.json() as LoginRequest;

  // Type guard
  if (!isLoginRequest(body)) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Corps de requête invalide");
  }

  // Vérification des champs
  if (!body.usr_mail || !body.usr_mdp) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Email et mot de passe requis");
  }

  // Obtention des informations de l'utilisateur
  const [rows] = await db.query(
    "SELECT usr_id, usr_mail, usr_pseudo, usr_mdp FROM utilisateur_usr WHERE usr_mail = ?",
    [body.usr_mail],
  );

  const userRow = (rows as Record<string, unknown>[])[0];

  // Vérification des identifiants
  if (!userRow || !(await verifyPassword(body.usr_mdp, userRow.usr_mdp as string))) {
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

// Vérifie la validité du token JWT 
router.get("/validate", authMiddleware, (ctx: AuthContext) => {
  ctx.response.status = 200;
  ctx.response.body   = { success: true, data: ctx.state.user };
});

export default router;