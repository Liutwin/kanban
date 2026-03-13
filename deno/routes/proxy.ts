import { Router }       from "@oak/oak";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";
import { hashPassword } from "../lib/jwt.ts";

/** URL de base du serveur Tomcat (backend Spring Boot). */
const TOMCAT_URL = "http://localhost:8081";

const router = new Router({ prefix: "/api/v1" });

/**
 * Transmet une requête HTTP au serveur Tomcat et recopie la réponse dans le contexte Oak.
 *
 * - Pour les méthodes `POST`, `PUT` et `PATCH`, le corps de la requête est transmis tel quel,
 *   sauf si `overrideBody` est fourni (cas du hashage de mot de passe à la création de compte).
 * - L'identifiant de l'utilisateur authentifié est injecté dans l'en-tête `X-User-Id`
 *   afin que Spring puisse l'utiliser sans redécoder le JWT.
 * - Les réponses `204 No Content` (ex. : DELETE réussi) sont transmises sans body,
 *   conformément à la spécification HTTP.
 *
 * @param ctx          - Contexte Oak enrichi par {@link authMiddleware} avec `ctx.state.user`.
 * @param path         - Chemin complet de la ressource côté Tomcat (ex. : `/api/v1/boards/5`).
 * @param overrideBody - Corps JSON sérialisé à envoyer à la place du body original de la requête.
 */
async function proxyToTomcat(
  ctx: AuthContext,
  path: string,
  overrideBody?: string
) {
  const url    = `${TOMCAT_URL}${path}`;
  const method = ctx.request.method;

  let bodyInit: BodyInit | undefined;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    bodyInit = overrideBody ?? await ctx.request.body.text();
    console.log("bodyInit envoyé à Spring:", bodyInit);
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (ctx.state.user) {
    headers.set("X-User-Id", String(ctx.state.user.id));
  }

  console.log(`[proxy] → ${method} ${url}`);
  const response = await fetch(url, { method, headers, body: bodyInit });
  console.log(`[proxy] ← ${response.status} ${url}`);
  const responseBody = await response.text();
  console.log(`[proxy] body:`, responseBody);

  ctx.response.status = response.status;

  // Les réponses 204 No Content (ex. : DELETE) n'ont pas de body —
  // tenter d'en assigner un provoquerait une erreur Oak.
  if (response.status !== 204) {
    ctx.response.body = responseBody;
    ctx.response.headers.set("Content-Type", "application/json");
  }
}

/**
 * Route publique : création d'un compte utilisateur.
 *
 * Ne nécessite pas de JWT. Le mot de passe est hashé côté Deno avant
 * d'être transmis à Spring, afin de ne jamais stocker de mot de passe en clair.
 *
 * `POST /api/v1/users`
 */
router.post("/users", async (ctx) => {
  const body = await ctx.request.body.json();
  body.password = await hashPassword(body.password);
  await proxyToTomcat(ctx, "/api/v1/users", JSON.stringify(body));
});

/**
 * Route générique protégée : toutes les autres requêtes vers `/api/v1/*`.
 *
 * Le middleware {@link authMiddleware} vérifie et décode le JWT avant de laisser
 * passer la requête. En cas de token absent ou invalide, une réponse `401` est
 * retournée directement sans atteindre Tomcat.
 */
router.all("/(.*)", authMiddleware, async (ctx: AuthContext) => {
  const path = ctx.request.url.pathname;
  await proxyToTomcat(ctx, path);
});

export default router;