// middleware/auth.ts
import { Context, Next, State } from "@oak/oak";
import { verifyJWT }            from "../lib/jwt.ts";
import { APIErrorCode, APIException, type AuthPayload } from "../model/interfaces.ts";

export interface AuthState extends State {
  user?: AuthPayload;
}

export interface AuthContext extends Context {
  state: AuthState;
}

export async function authMiddleware(ctx: AuthContext, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Token manquant ou malformé");
  }

  const token   = authHeader.substring(7);
  const payload = await verifyJWT(token);

  if (!payload) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Token invalide ou expiré");
  }

  ctx.state.user = payload;
  await next();
}
