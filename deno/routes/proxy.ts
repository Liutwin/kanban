import { Router }       from "@oak/oak";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";

// URL du serveur Tomcat
const TOMCAT_URL = "http://localhost:8081";

const router = new Router();

// Fonction helper : transmet la requête à Tomcat
async function proxyToTomcat(ctx: AuthContext, path: string) {
  const url    = `${TOMCAT_URL}${path}`;
  const method = ctx.request.method;

  // On récupère le body pour les méthodes POST/PUT/PATCH
  let bodyInit: BodyInit | undefined;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    bodyInit = await ctx.request.body.text();
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  
  // On transmet l'identité de l'utilisateur à Tomcat via un header custom
  if (ctx.state.user) {
    headers.set("X-User-Id",     String(ctx.state.user.usr_id));
    headers.set("X-User-Mail",   ctx.state.user.usr_mail);
    headers.set("X-User-Pseudo", ctx.state.user.usr_pseudo);
  }

  const response = await fetch(url, { method, headers, body: bodyInit });

  ctx.response.status = response.status;
  ctx.response.body   = await response.text();
  ctx.response.headers.set("Content-Type", "application/json");
}

// ── Toutes les routes /api/* sont protégées et proxifiées ────────────────
router.all("/api/(.*)", authMiddleware, async (ctx: AuthContext) => {
  const path = ctx.request.url.pathname; // ex: /api/tableaux
  await proxyToTomcat(ctx, path);
});

export default router;
