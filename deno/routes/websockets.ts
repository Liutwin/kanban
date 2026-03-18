import { Router } from "@oak/oak";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";
import { subscribe, unsubscribe } from "../services/board-ws.ts";
import { APIErrorCode, APIException } from "../model/interfaces.ts";

const router = new Router({ prefix: "/ws" });

/**
 * Upgrade HTTP → WebSocket pour le canal temps réel d'un tableau.
 * Chaque tableau a son propre canal : /ws/boards/:boardId
 *
 * Le client s'abonne à l'ouverture et se désabonne à la fermeture.
 * Il ne peut qu'écouter (pas d'envoi attendu de sa part).
 */
router.get("/boards/:boardId", authMiddleware, (ctx: AuthContext) => {
  const boardId = parseInt(ctx.params.boardId ?? "", 10);

  if (isNaN(boardId)) {
    throw new APIException(APIErrorCode.NOT_FOUND, 404, "Board not found");
  }

  if (!ctx.isUpgradable) {
    throw new APIException(APIErrorCode.BAD_REQUEST, 400, "WebSocket required");
  }

  // Upgrade HTTP → WebSocket (même appel que dans le TP 4)
  const ws: WebSocket = ctx.upgrade();

  ws.onopen = () => {
    subscribe(ws, boardId);
  };

  // On n'attend pas de messages du client dans ce cas d'usage,
  // mais on les gère proprement si besoin
  ws.onmessage = (_e) => {
    // Ping de keepalive éventuel — ignoré
  };

  ws.onclose = () => {
    unsubscribe(ws, boardId);
  };

  ws.onerror = (e) => {
    console.error(`[WS] error board=${boardId}`, e);
    unsubscribe(ws, boardId);
  };
});

export default router;