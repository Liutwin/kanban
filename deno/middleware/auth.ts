// middleware/auth.ts
import { Context, Next, State } from "@oak/oak";

import { verifyJWT }                                    from "../lib/jwt.ts";
import { APIErrorCode, APIException, type AuthPayload } from "../model/interfaces.ts";

// Étend ctx.state pour y porter les informations de l'utilisateur authentifié
export interface AuthState extends State {
  user?: AuthPayload;
}

// Étend Context pour typer ctx.state avec AuthState
export interface AuthContext extends Context {
  state: AuthState;
}

// Vérifie le JWT transmis dans l'en-tête Authorization.
// Injecte le payload dans ctx.state.user si le token est valide.
export async function authMiddleware(ctx: AuthContext, next: Next): Promise<void> {
  const authHeader = ctx.request.headers.get("Authorization");

  // L'en-tête doit suivre le schéma "Bearer <token>"
  if (!authHeader?.startsWith("Bearer ")) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Token manquant ou malformé");
  }

  const token   = authHeader.substring(7); // retire "Bearer "
  const payload = await verifyJWT(token);

  if (!payload) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Token invalide ou expiré");
  }

  ctx.state.user = payload;
  await next();
}