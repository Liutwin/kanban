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

  // ── Boards ────────────────────────────────────────────────────────────────
  boards:             `${BASE}/boards`,
  board:              (id: number) => `${BASE}/boards/${id}`,
  boardsByUser:       (id: number) => `${BASE}/boards/user/${id}`,

  // ── Board members ─────────────────────────────────────────────────────────
  boardMembers:       (id: number)                    => `${BASE}/boards/${id}/members`,
  boardMember:        (boardId: number, userId: number) => `${BASE}/boards/${boardId}/members/${userId}`,

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