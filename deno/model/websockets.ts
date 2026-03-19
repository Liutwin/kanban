/** Types d'actions qui déclenchent un broadcast */
export type BoardAction =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_moved"
  | "column_created"
  | "column_updated"
  | "column_deleted"
  | "column_moved"
  | "member_updated"
  | "comment_updated"
  | "file_updated";

/**
 * Message diffusé par le serveur à tous les clients connectés à un tableau.
 * Le client reçoit ce message et recharge les données impactées.
 */
export interface BoardUpdateMessage {
  type: "board_update";
  boardId: number;
  action: BoardAction;
  /** Identifiant de l'utilisateur à l'origine de la modification */
  originUserId?: number;
}

/**
 * Message diffusé à tous les clients d'un tableau lors de chaque
 * connexion ou déconnexion WebSocket.
 * Permet au client d'afficher en temps réel quels membres sont présents.
 */
export interface PresenceUpdateMessage {
  type: "presence_update";
  boardId: number;
  /** IDs des utilisateurs actuellement connectés à ce tableau */
  onlineUserIds: number[];
}