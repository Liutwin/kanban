import { Router }       from "@oak/oak";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";
import { hashPassword } from "../lib/jwt.ts";

// URL du serveur Tomcat
const TOMCAT_URL = "http://localhost:8081";

const router = new Router({ prefix: "/api/v1" });

// Fonction helper : transmet la requête à Tomcat
async function proxyToTomcat(
  ctx: AuthContext,
  path: string,
  overrideBody?: string  // Optionnel, utilisé pour le hashage du mot de passe
) {
  const url    = `${TOMCAT_URL}${path}`;
  const method = ctx.request.method;

  let bodyInit: BodyInit | undefined;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    bodyInit = overrideBody ?? await ctx.request.body.text(); // Priorité à l'override
    console.log("bodyInit envoyé à Spring:", bodyInit);
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (ctx.state.user) {
    headers.set("X-User-Id",     String(ctx.state.user.id));
    headers.set("X-User-Mail",   ctx.state.user.email);
    headers.set("X-User-Pseudo", ctx.state.user.pseudo);
  }

  const response = await fetch(url, { method, headers, body: bodyInit });
  ctx.response.status = response.status;
  ctx.response.body   = await response.text();
  ctx.response.headers.set("Content-Type", "application/json");
}

// Route publique : création de compte (pas de token requis)
router.post("/users", async (ctx) => {
  const body = await ctx.request.body.json();
  
  body.password = await hashPassword(body.password);
  
  const serialized = JSON.stringify(body);
  
  await proxyToTomcat(ctx, "/api/v1/users", serialized);
});

// Toutes les autres routes /api/* sont protégées
router.all("/(.*)", authMiddleware, async (ctx: AuthContext) => {
  const path = ctx.request.url.pathname;
  await proxyToTomcat(ctx, path);
});

export default router;
