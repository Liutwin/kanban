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
  | "member_updated";

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
