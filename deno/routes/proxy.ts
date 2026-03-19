import { Router }       from "@oak/oak";
import { Context } from "node:vm";

import { authMiddleware, type AuthContext } from "../middleware/auth.ts";
import { hashPassword } from "../lib/jwt.ts";
import { db } from "../config/db.ts";
import { broadcast } from "../services/board-ws.ts";
import type { BoardAction } from "../model/websockets.ts";

/** URL de base du serveur Tomcat (backend Spring Boot). */
const TOMCAT_URL = Deno.env.get("SPRING_URL") ?? "http://spring:8080";

const router = new Router({ prefix: "/api/v1" });

/**
 * Transmet une requête HTTP au serveur Tomcat et recopie la réponse dans le contexte Oak.
 *
 * - Pour les requêtes multipart (upload de fichiers), le body brut et le Content-Type
 *   original (avec la boundary) sont transmis tels quels à Spring.
 * - Pour les méthodes `POST`, `PUT` et `PATCH` JSON standard, le corps est transmis
 *   tel quel, sauf si `overrideBody` est fourni (ex : hashage de mot de passe).
 * - L'identifiant de l'utilisateur authentifié est injecté dans l'en-tête `X-User-Id`
 *   afin que Spring puisse l'utiliser sans redécoder le JWT.
 * - Les réponses `204 No Content` (ex. : DELETE réussi) sont transmises sans body.
 *
 * @param ctx          - Contexte Oak enrichi par {@link authMiddleware} avec `ctx.state.user`.
 * @param path         - Chemin complet de la ressource côté Tomcat (ex. : `/api/v1/boards/5`).
 * @param overrideBody - Corps JSON sérialisé à envoyer à la place du body original.
 */
async function proxyToTomcat(
  ctx: Context,
  path: string,
  overrideBody?: string
) {
  const url    = `${TOMCAT_URL}${path}`;
  const method = ctx.request.method;

  // Détecte si la requête entrante est un upload multipart
  const incomingContentType = ctx.request.headers.get("Content-Type") ?? "";
  const isMultipart = incomingContentType.includes("multipart/form-data");

  let bodyInit: BodyInit | undefined;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    if (overrideBody !== undefined) {
      // Corps JSON fourni explicitement (ex : hashage de mot de passe)
      bodyInit = overrideBody.length > 0 ? overrideBody : undefined;
    } else if (isMultipart) {
      // Upload multipart : transmet le stream brut sans le lire comme texte
      // pour ne pas corrompre les données binaires
      bodyInit = ctx.request.body.stream ?? undefined;
    } else {
      // Requête JSON standard
      const text = await ctx.request.body.text();
      console.log("bodyInit envoyé à Spring:", text);
      bodyInit = text.length > 0 ? text : undefined;
    }
  }

  const headers = new Headers();

  if (isMultipart) {
    // Recopie le Content-Type original avec sa boundary — indispensable pour Spring
    headers.set("Content-Type", incomingContentType);
  } else {
    headers.set("Content-Type", "application/json");
  }

  if (ctx.state.user) {
    headers.set("X-User-Id", String(ctx.state.user.id));
  }

  console.log(`[proxy] → ${method} ${url}`);
  const response = await fetch(url, { method, headers, body: bodyInit });
  console.log(`[proxy] ← ${response.status} ${url}`);

  ctx.response.status = response.status;

  // Les réponses 204 No Content (ex. : DELETE) n'ont pas de body —
  // tenter d'en assigner un provoquerait une erreur Oak.
  if (response.status !== 204) {
    const responseContentType = response.headers.get("Content-Type") ?? "application/json";
    ctx.response.headers.set("Content-Type", responseContentType);

    // Transmet le body comme ArrayBuffer pour préserver les données binaires
    // (images, PDF, zip…). response.text() corromprait les bytes non-UTF-8.
    const buffer = await response.arrayBuffer();
    if (responseContentType.includes("application/json")) {
      // Log uniquement pour le JSON (lisible)
      console.log(`[proxy] body:`, new TextDecoder().decode(buffer));
    }
    ctx.response.body = buffer;
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
 * Route protégée : changement de mot de passe d'un utilisateur.
 *
 * Intercepte la requête avant la route générique afin de :
 * 1. Récupérer le hash stocké en base pour extraire le sel de l'ancien mdp.
 * 2. Rehasher `oldPassword` avec ce sel — Spring compare directement les hashs.
 * 3. Hasher `newPassword` avec un nouveau sel aléatoire.
 * 4. Proxifier le corps modifié vers Spring.
 *
 * `PATCH /api/v1/users/:id/password`
 */
router.patch("/users/:id/password", authMiddleware, async (ctx: AuthContext) => {
  const body = await ctx.request.body.json() as { oldPassword: string; newPassword: string };

  const userId = ctx.params.id;

  // Récupérer le hash stocké en base pour extraire le sel
  const [rows] = await db.query(
    "SELECT usr_mdp FROM utilisateur_usr WHERE usr_id = ?",
    [userId],
  );
  const row = (rows as Record<string, unknown>[])[0];
  const storedHash = (row?.usr_mdp as string) ?? "";
  const [hash, salt] = storedHash.split(".");

  if (!hash || !salt) {
    ctx.response.status = 500;
    ctx.response.body   = JSON.stringify({ message: "Format de mot de passe en base invalide." });
    return;
  }

  // Rehasher l'ancien mdp avec le même sel pour que Spring puisse comparer
  const { scrypt } = await import("node:crypto");
  const computeHash = (pwd: string, s: string): Promise<string> =>
    new Promise((res, rej) =>
      scrypt(pwd, s, 64, (err, dk) => err ? rej(err) : res(dk.toString("hex")))
    );

  const oldHashed = `${await computeHash(body.oldPassword, salt)}.${salt}`;

  // Hasher le nouveau mdp avec un nouveau sel aléatoire
  const newHashed = await hashPassword(body.newPassword);

  const path = ctx.request.url.pathname;
  await proxyToTomcat(ctx, path, JSON.stringify({ oldPassword: oldHashed, newPassword: newHashed }));
});

/**
 * Route générique protégée : toutes les autres requêtes vers `/api/v1/*`.
 *
 * Le middleware {@link authMiddleware} vérifie et décode le JWT avant de laisser
 * passer la requête. En cas de token absent ou invalide, une réponse `401` est
 * retournée directement sans atteindre Tomcat.
 */
router.all("/(.*)", authMiddleware, async (ctx: AuthContext) => {
  const path = ctx.request.url.pathname + ctx.request.url.search;
  await proxyToTomcat(ctx, path);

  // Broadcast WebSocket après toute mutation réussie
  const method = ctx.request.method;
  const status = ctx.response.status as number;

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && status < 300) {
    const boardId = extractBoardId(ctx, path);
    const action  = detectAction(path, method);

    console.log(`[DEBUG] method=${method} path=${path} status=${status} boardId=${boardId} action=${action}`);

    if (boardId && action) {
      broadcast(boardId, {
        type: "board_update",
        boardId,
        action,
        originUserId: ctx.state.user?.id,
      });
    }
  }
});

/**
 * Extrait le boardId depuis un chemin d'API Spring ou depuis l'en-tête `X-Board-Id`.
 *
 * Deux stratégies, dans l'ordre :
 * 1. Le boardId est dans l'URL (ex. : `/api/v1/boards/42/columns`) — cas des mutations
 *    sur les tableaux et les colonnes.
 * 2. Fallback sur l'en-tête `X-Board-Id` injecté par le client Dashboard — nécessaire
 *    pour les routes `/tasks/...` et `/comments/...` où le boardId n'apparaît pas dans l'URL.
 *
 * @param ctx  - Contexte Oak, utilisé pour lire l'en-tête `X-Board-Id`.
 * @param path - Chemin de la requête proxifiée vers Spring.
 * @returns Le boardId extrait, ou `null` si introuvable.
 */
function extractBoardId(ctx: AuthContext, path: string): number | null {
  const fromPath = path.match(/\/api\/v1\/boards\/(\d+)/);
  if (fromPath) return parseInt(fromPath[1], 10);

  // Fallback : boardId injecté par le client via X-Board-Id
  // (utilisé pour les routes /tasks/..., /comments/... où il n'est pas dans l'URL)
  const fromHeader = ctx.request.headers.get("X-Board-Id");
  return fromHeader ? parseInt(fromHeader, 10) : null;
}

/**
 * Déduit le type d'action à partir du chemin et de la méthode HTTP.
 *
 * @param path   - Chemin de la requête proxifiée.
 * @param method - Méthode HTTP de la requête.
 * @returns Le type d'action pour le broadcast WebSocket, ou `null` si non pertinent.
 */
function detectAction(path: string, method: string): BoardAction | null {
  const isTasks    = /\/tasks/.test(path);
  const isCols     = /\/columns/.test(path);
  const isMembers  = /\/members/.test(path);
  const isComments = /\/comments/.test(path);
  const isFiles    = /\/files/.test(path);
  const isMove     = /\/move/.test(path);

  if (isTasks) {
    if (isMove)              return "task_moved";
    if (method === "POST")   return "task_created";
    if (method === "DELETE") return "task_deleted";
    return "task_updated";
  }
  if (isCols) {
    if (isMove)              return "column_moved";
    if (method === "POST")   return "column_created";
    if (method === "DELETE") return "column_deleted";
    return "column_updated";
  }
  if (isMembers)  return "member_updated";
  if (isComments) return "comment_updated";
  if (isFiles)    return "file_updated";
  return null;
}

export default router;