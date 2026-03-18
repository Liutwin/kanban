// deno/services/board-ws.ts
import type { BoardUpdateMessage } from "../model/websockets.ts";

/**
 * Map : boardId (number) → ensemble des WebSockets ouverts pour ce tableau.
 * Calqué sur le pattern `subscriptions` du TP 4 (services/vote-service.ts).
 */
const subscriptions = new Map<number, Set<WebSocket>>();

/** Abonne un client au canal d'un tableau. */
export function subscribe(ws: WebSocket, boardId: number): void {
  if (!subscriptions.has(boardId)) {
    subscriptions.set(boardId, new Set());
  }
  subscriptions.get(boardId)!.add(ws);
  console.log(`[WS] +subscribe board=${boardId} (total=${subscriptions.get(boardId)!.size})`);
}

/** Désabonne un client du canal d'un tableau. */
export function unsubscribe(ws: WebSocket, boardId: number): void {
  const sockets = subscriptions.get(boardId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) subscriptions.delete(boardId);
  console.log(`[WS] -unsubscribe board=${boardId} (total=${sockets?.size ?? 0})`);
}

/**
 * Diffuse un message à tous les clients abonnés à un tableau.
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