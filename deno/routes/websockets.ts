import { Router } from "@oak/oak";
import { subscribe, unsubscribe } from "../services/board-ws.ts";
import { APIErrorCode, APIException } from "../model/interfaces.ts";
import { verifyJWT } from "../lib/jwt.ts";

const router = new Router({ prefix: "/ws" });

/**
 * Canal temps réel d'un tableau Kanban via WebSocket.
 *
 * Le token JWT est transmis via le header `Sec-WebSocket-Protocol` car :
 * - le navigateur ne supporte pas l'en-tête `Authorization` sur un WebSocket ;
 * - Oak ne transmet pas les query params dans `ctx.request.url` lors d'un
 *   upgrade WebSocket.
 * Le sous-protocole est ignoré fonctionnellement — il sert uniquement
 * de vecteur d'authentification lors du handshake.
 * La vérification cryptographique reste identique à {@link authMiddleware}.
 *
 * `GET /ws/boards/:boardId` (+ header `Sec-WebSocket-Protocol: <jwt>`)
 */
router.get("/boards/:boardId", async (ctx) => {
  const boardId = parseInt(ctx.params.boardId ?? "", 10);

  if (isNaN(boardId)) {
    throw new APIException(APIErrorCode.NOT_FOUND, 404, "Board not found");
  }

  // Le token est lu depuis Sec-WebSocket-Protocol, seul header
  // que le navigateur autorise lors d'un handshake WebSocket.
  const token   = ctx.request.headers.get("sec-websocket-protocol");
  const payload = token ? await verifyJWT(token) : null;

  if (!payload) {
    throw new APIException(APIErrorCode.UNAUTHORIZED, 401, "Invalid or missing token");
  }

  if (!ctx.isUpgradable) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "WebSocket required");
  }

  // ── Upgrade HTTP → WebSocket ──────────────────────────────────────────────
  // À partir d'ici, la réponse HTTP est engagée : toute erreur doit être
  // gérée directement sur l'objet `ws`, pas via des exceptions Oak.
  const ws: WebSocket = ctx.upgrade(token ? { protocol: token } : undefined);

  ws.onopen  = () => { subscribe(ws, boardId); };
  ws.onclose = () => { unsubscribe(ws, boardId); };
  ws.onerror = () => { unsubscribe(ws, boardId); };

  // Les messages entrants ne sont pas attendus dans ce canal (lecture seule
  // côté client). Un éventuel ping de keepalive est silencieusement ignoré.
  ws.onmessage = () => {};
});

export default router;