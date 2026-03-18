export const API_CONFIG = {
  API_PREFIX:  "/api/v1",
  AUTH_PREFIX: "/api/v1/auth",
} as const;

const BASE = API_CONFIG.API_PREFIX;
const AUTH = API_CONFIG.AUTH_PREFIX;

// Routes pour l'authentification (serveur Deno)
export const ROUTES_AUTH = {
  login:    `${AUTH}/login`,
  validate: `${AUTH}/validate`,
  logout:   `${AUTH}/logout`,
} as const;

// Routes pour le restant de l'API (côté Spring, en passant par le proxy Deno)
export const ROUTES_API = {
  // ── Users ─────────────────────────────────────────────────────────────────
  users:              `${BASE}/users`,
  user:               (id: number) => `${BASE}/users/${id}`,
  userPassword:       (id: number) => `${BASE}/users/${id}/password`,
  userAvatar:         (id: number) => `${BASE}/users/${id}/avatar`,
  userProfile:        (id: number) => `${BASE}/users/profiles/${id}`,
  userProfiles:       `${BASE}/users/profiles`,
  userLogs:           (id: number, type?: string, from?: string, to?: string) => {
    const p = new URLSearchParams();
    if (type) p.append("type", type.toUpperCase());
    if (from) p.append("from", `${from}T00:00:00`);
    if (to)   p.append("to",   `${to}T23:59:59`);
    const qs = p.toString();
    return `${BASE}/users/${id}/logs${qs ? "?" + qs : ""}`;
  },

  // ── Boards ────────────────────────────────────────────────────────────────
  boards:             `${BASE}/boards`,
  board:              (id: number) => `${BASE}/boards/${id}`,
  boardsByUser:       (id: number) => `${BASE}/boards/user/${id}`,
  boardExport: (id: number) => `${BASE}/boards/${id}/export`,

  // ── Board members ─────────────────────────────────────────────────────────
  boardMembers:       (id: number)                    => `${BASE}/boards/${id}/members`,
  boardMember:        (boardId: number, userId: number) => `${BASE}/boards/${boardId}/members/${userId}`,
  /** Invitations en attente d'un tableau (admin du tableau). */
  boardPendingInvitations: (boardId: number) => `${BASE}/boards/${boardId}/members/pending`,

  // ── Invitations ───────────────────────────────────────────────────────────
  /** Retourne les invitations en attente de l'utilisateur connecté. */
  myPendingInvitations:  `${BASE}/boards/invitations/me`,
  /** Accepter sa propre invitation à un tableau. */
  acceptInvitation:   (boardId: number) => `${BASE}/boards/${boardId}/members/me/accept`,
  /** Refuser sa propre invitation à un tableau. */
  declineInvitation:  (boardId: number) => `${BASE}/boards/${boardId}/members/me/decline`,
  /** Valider manuellement l'invitation d'un membre (admin). */
  validateInvitation: (boardId: number, userId: number) => `${BASE}/boards/${boardId}/members/${userId}/validate`,

  // ── Columns ───────────────────────────────────────────────────────────────
  columns:            (boardId: number)              => `${BASE}/boards/${boardId}/columns`,
  column:             (boardId: number, id: number)  => `${BASE}/boards/${boardId}/columns/${id}`,
  columnMove:         (boardId: number, id: number)  => `${BASE}/boards/${boardId}/columns/${id}/move`,

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasksByColumn:      (colId: number)                => `${BASE}/tasks/column/${colId}`,
  tasksByColumnAndPriority: (colId: number, p: string) => `${BASE}/tasks/column/${colId}/priority/${p}`,
  tasksByAssigned:    (userId: number)               => `${BASE}/tasks/assigned/${userId}`,
  tasks:              `${BASE}/tasks`,
  task:               (id: number)                   => `${BASE}/tasks/${id}`,
  taskMove:           (id: number)                   => `${BASE}/tasks/${id}/move`,
  taskAssign:         (id: number)                   => `${BASE}/tasks/${id}/assign`,

  // ── Logs boards
  boardLogs: (id: number, type?: string, from?: string, to?: string) => {
    const p = new URLSearchParams();
    if (type) p.append("type", type.toUpperCase());
    if (from) p.append("from", `${from}T00:00:00`);
    if (to)   p.append("to",   `${to}T23:59:59`);
    const qs = p.toString();
    return `${BASE}/boards/${id}/logs${qs ? "?" + qs : ""}`;
  },

  // ── Comments ──────────────────────────────────────────────────────────────
  comments:           `${BASE}/comments`,
  commentsByTask:     (taskId: number) => `${BASE}/comments/task/${taskId}`,
  comment:            (id: number)     => `${BASE}/comments/${id}`,

  // ── Files ─────────────────────────────────────────────────────────────────
  files:              `${BASE}/files`,
  filesByTask:        (taskId: number) => `${BASE}/files/task/${taskId}`,
  filesByComment:     (comId: number)  => `${BASE}/files/comment/${comId}`,
  file:               (id: number)     => `${BASE}/files/${id}`,
} as const;