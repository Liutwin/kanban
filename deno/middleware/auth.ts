// middleware/auth.ts
import { Context, Next, State } from "@oak/oak";

import { verifyJWT }                                    from "../lib/jwt.ts";
import { APIErrorCode, APIException, type AuthPayload } from "../model/interfaces.ts";

// On étend la définition du contexte d'une requête en typant la variable `state` contenant son état
export interface AuthContext extends Context {
  state: AuthState;
}

// On définit l'état d'une requête, qui peut contenir un payload JWT en cas de connexion réussie
export interface AuthState extends State {
  user?: AuthPayload;
}

export async function authMiddleware(ctx: AuthContext, next: Next) {
  // On récupère l'en-tête `Authorization` de la requête
  const authHeader = ctx.request.headers.get("Authorization");

  // On vérifie s'il est bien formé
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Missing or invalid token");
  }

  // On découpe l'en-tête pour récupérer le token, puis on le vérifie
  const token = authHeader.substring(7);
  const payload = await verifyJWT(token);

  // Erreur retournée en cas de token invalide
  if (!payload) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Invalid token");
  }

  // Mise à jour du contexte de la requête pour un utilisateur authentifié
  ctx.state.user = payload;

  // On passe au middleware suivant
  await next();
}