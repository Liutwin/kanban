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
  // ── Utilisateurs ──────────────────────────────────────────────────────────
  users:        `${BASE}/users`,
  user:         (id: number) => `${BASE}/users/${id}`,

  // ── Tableaux ──────────────────────────────────────────────────────────────
  tableaux:     `${BASE}/boards`,
  tableau:      (id: number) => `${BASE}/boards/${id}`,
  tableauxUser: (id: number) => `${BASE}/boards/user/${id}`,

  // ── Colonnes ──────────────────────────────────────────────────────────────
  colonnes:        (id: number)                   => `${BASE}/boards/${id}/columns`,
  colonne:         (tabId: number, id: number)    => `${BASE}/boards/${tabId}/columns/${id}`,
  colonneDeplacer: (tabId: number, id: number)    => `${BASE}/boards/${tabId}/columns/${id}/move`,

  // ── Tâches ────────────────────────────────────────────────────────────────
  taches:            (id: number)                => `${BASE}/tasks/columns/${id}`,
  tachesPriorite:    (colId: number, id: string) => `${BASE}/tasks/columns/${colId}/priority/${id}`,
  tachesAssignee:    (id: number)                => `${BASE}/tasks/assigned/${id}`,
  tache:             (id: number)                => `/${BASE}/tasks/${id}`,
  tacheDeplacer:     (id: number)                => `${BASE}/tasks/${id}/move`,
  tacheAssigner:     (id: number)                => `${BASE}/tasks/${id}/assign`,

  // ── Participations ────────────────────────────────────────────────────────
  participations:        `${BASE}/participations`,
  participationsUser:    (userId: number)           => `${BASE}/participations/user/${userId}`,
  participationsTableau: (tabId: number)            => `${BASE}/participations/tableau/${tabId}`,
  participation:         (uid: number, tid: number) => `${BASE}/participations/user/${uid}/tableau/${tid}`,
} as const;
