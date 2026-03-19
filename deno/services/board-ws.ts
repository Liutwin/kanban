// deno/services/board-ws.ts
import type { BoardUpdateMessage, PresenceUpdateMessage } from "../model/websockets.ts";

/**
 * Map : boardId (number) → ensemble des WebSockets ouverts pour ce tableau.
 * Calqué sur le pattern `subscriptions` du TP 4 (services/vote-service.ts).
 */
const subscriptions = new Map<number, Set<WebSocket>>();

/**
 * Map : WebSocket → userId de l'utilisateur connecté derrière cette socket.
 * Permet de construire la liste des utilisateurs présents (presence_update).
 */
const socketUsers = new Map<WebSocket, number>();

/** Abonne un client au canal d'un tableau et annonce sa présence. */
export function subscribe(ws: WebSocket, boardId: number, userId: number): void {
  if (!subscriptions.has(boardId)) {
    subscriptions.set(boardId, new Set());
  }
  subscriptions.get(boardId)!.add(ws);
  socketUsers.set(ws, userId);
  console.log(`[WS] +subscribe board=${boardId} user=${userId} (total=${subscriptions.get(boardId)!.size})`);
  broadcastPresence(boardId);
}

/** Désabonne un client du canal d'un tableau et met à jour la présence. */
export function unsubscribe(ws: WebSocket, boardId: number): void {
  const sockets = subscriptions.get(boardId);
  if (!sockets) return;
  sockets.delete(ws);
  socketUsers.delete(ws);
  if (sockets.size === 0) subscriptions.delete(boardId);
  console.log(`[WS] -unsubscribe board=${boardId} (total=${sockets?.size ?? 0})`);
  broadcastPresence(boardId);
}

/**
 * Diffuse un message de mise à jour à tous les clients abonnés à un tableau.
 * Calqué sur la fonction `broadcast` du TP 4.
 */
export function broadcast(boardId: number, message: BoardUpdateMessage): void {
  const sockets = subscriptions.get(boardId);
  if (!sockets || sockets.size === 0) return;

  const payload = JSON.stringify(message);
  console.log(`[WS] broadcast board=${boardId} action=${message.action} to ${sockets.size} client(s)`);

  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Diffuse la liste des utilisateurs actuellement connectés à un tableau.
 * Appelé automatiquement à chaque subscribe/unsubscribe.
 * Les doublons sont éliminés : un même utilisateur ouvert dans plusieurs
 * onglets n'apparaît qu'une seule fois.
 */
function broadcastPresence(boardId: number): void {
  const sockets = subscriptions.get(boardId);

  const onlineUserIds = sockets
    ? [
        ...new Set(
          [...sockets]
            .map((ws) => socketUsers.get(ws))
            .filter((id): id is number => id !== undefined)
        ),
      ]
    : [];

  const message: PresenceUpdateMessage = {
    type: "presence_update",
    boardId,
    onlineUserIds,
  };

  const payload = JSON.stringify(message);
  console.log(`[WS] presence board=${boardId} online=[${onlineUserIds.join(",")}]`);

  if (sockets) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}