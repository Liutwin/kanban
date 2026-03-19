// client/src/hooks/useBoardSocket.ts
import { useEffect, useRef } from "react";
import type { BoardUpdateMessage } from "../model/websockets";

const WS_BASE = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

/**
 * Hook qui ouvre un WebSocket sur le canal d'un tableau
 * et appelle `onUpdate` à chaque message de type `board_update`,
 * et `onPresence` à chaque message de type `presence_update`.
 *
 * Calqué sur `useVoteSocket` du TP 4 :
 * - instanciation du WS au montage du composant (useEffect)
 * - fermeture garantie par la fonction de nettoyage retournée
 * - référence stable via useRef (pas de re-render à chaque message)
 *
 * Authentification : le token JWT est passé via `Sec-WebSocket-Protocol`,
 * seul header que le navigateur autorise lors d'un handshake WebSocket.
 *
 * Stabilité : `onUpdate` et `onPresence` sont stockés dans des refs mis à
 * jour à chaque render. Le `useEffect` qui gère la connexion ne dépend donc
 * que de `boardId` — toute évolution des callbacks ne provoque pas de
 * reconnexion.
 */
export function useBoardSocket(
  boardId: number | undefined,
  {
    onUpdate,
    currentUserId,
    onPresence,
  }: {
    onUpdate: (msg: BoardUpdateMessage) => void;
    /** Si fourni, les messages board_update émis par cet utilisateur sont
     *  ignorés (l'UI optimiste les a déjà appliqués). */
    currentUserId?: number;
    /** Appelé à chaque changement de présence avec la liste des userId
     *  actuellement connectés au tableau. */
    onPresence?: (onlineUserIds: number[]) => void;
  }
) {
  const socketRef = useRef<WebSocket | null>(null);

  // Refs vers les callbacks courants : toujours à jour sans être des
  // dépendances du useEffect de connexion. Évite de reconnecter le WS
  // à chaque render du composant parent.
  const onUpdateRef   = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const onPresenceRef = useRef(onPresence);
  useEffect(() => { onPresenceRef.current = onPresence; }, [onPresence]);

  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  useEffect(() => {
    if (!boardId) return;

    const stored = localStorage.getItem("auth");
    const token  = stored ? JSON.parse(stored).token : null;

    // Le token est transmis comme sous-protocole WebSocket —
    // seul mécanisme supporté par le navigateur pour authentifier un WS.
    const ws = new WebSocket(`${WS_BASE}/ws/boards/${boardId}`, token ? [token] : []);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS] connected to board ${boardId}`);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        console.log("[WS] message reçu:", msg);

        if (msg.type === "presence_update") {
          onPresenceRef.current?.(msg.onlineUserIds as number[]);
          return;
        }

        if (msg.type !== "board_update") return;

        // Ignorer les mises à jour que cet utilisateur a lui-même déclenchées
        // (l'UI optimiste les a déjà appliquées localement)
        if (
          currentUserIdRef.current &&
          msg.originUserId === currentUserIdRef.current
        )
          return;

        onUpdateRef.current(msg as BoardUpdateMessage);
      } catch {
        // message mal formé — on ignore
      }
    };

    ws.onclose = () => {
      console.log(`[WS] disconnected from board ${boardId}`);
    };

    ws.onerror = (e) => {
      console.error(`[WS] error board ${boardId}`, e);
    };

    // Fonction de nettoyage : ferme le WS au démontage du composant
    // (exactement comme dans le TP 4)
    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [boardId]); // ← seul boardId : aucune reconnexion si les callbacks changent
}