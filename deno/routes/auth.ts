// routes/auth.ts
import { Router } from "@oak/oak";
import { db }     from "../config/db.ts";
import { createJWT, verifyPassword } from "../lib/jwt.ts";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";

import {
  APIErrorCode, APIException,
  type LoginRequest,
  type AuthResponse, type User,
} from "../model/interfaces.ts";
import { isLoginRequest } from "../model/guards.ts";

const router = new Router({ prefix: "/api/v1/auth" });

// Authentification
router.post("/login", async (ctx) => {
  const body = await ctx.request.body.json() as LoginRequest;

  // Type guard
  if (!isLoginRequest(body)) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Corps de requête invalide");
  }

  // Vérification des champs
  if (!body.email || !body.password) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "Pseudo et mot de passe requis");
  }

  // Obtention des informations de l'utilisateur
  const [rows] = await db.query(
    "SELECT usr_id, usr_mail, usr_mdp, usr_prenom, usr_nom, usr_admin FROM utilisateur_usr WHERE usr_mail = ?",
    [body.email],
  );

  const userRow = (rows as Record<string, unknown>[])[0];

  // Vérification des identifiants
  if (!userRow || !(await verifyPassword(body.password, userRow.usr_mdp as string))) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Identifiants incorrects.");
  }

  const user: User = {
    id:     userRow.usr_id as number,
    email: userRow.usr_mail as string,
    firstName: userRow.usr_prenom as string,
    lastName: userRow.usr_nom as string,
    isAdmin:   userRow.usr_admin === 1
  };

  const token = await createJWT({
    id: user.id
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