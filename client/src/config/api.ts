export const API_CONFIG = {
  API_PREFIX:  "/api/v1",
  AUTH_PREFIX: "/api/v1/auth",
} as const;

const BASE = API_CONFIG.API_PREFIX;
const AUTH = API_CONFIG.AUTH_PREFIX;

export const ROUTES_AUTH = {
  login:    `${AUTH}/login`,
  validate: `${AUTH}/validate`,
  logout:   `${AUTH}/logout`,
} as const;

export const ROUTES_API = {
  // ── Utilisateurs ──────────────────────────────────────────────────────────
  users:        `${BASE}/users`,
  user:         (id: number) => `${BASE}/users/${id}`,

  // ── Tableaux ──────────────────────────────────────────────────────────────
  tableaux:     `${BASE}/tableaux`,
  tableau:      (id: number) => `${BASE}/tableaux/${id}`,
  tableauxUser: (id: number) => `${BASE}/tableaux/user/${id}`,

  // ── Colonnes ──────────────────────────────────────────────────────────────
  colonnes:        (tabId: number)                   => `${BASE}/tableaux/${tabId}/colonnes`,
  colonne:         (tabId: number, colId: number)    => `${BASE}/tableaux/${tabId}/colonnes/${colId}`,
  colonneDeplacer: (tabId: number, colId: number)    => `${BASE}/tableaux/${tabId}/colonnes/${colId}/deplacer`,

  // ── Tâches ────────────────────────────────────────────────────────────────
  taches:            (colId: number)            => `${BASE}/taches/colonnes/${colId}`,
  tachesPriorite:    (colId: number, p: string) => `${BASE}/taches/colonnes/${colId}/priorite/${p}`,
  tachesAssignee:    (assigneeId: number)       => `${BASE}/taches/assignee/${assigneeId}`,
  tache:             (id: number)               => `/${BASE}/taches/${id}`,
  tacheDeplacer:     (id: number)               => `${BASE}/taches/${id}/deplacer`,
  tacheAssigner:     (id: number)               => `${BASE}/taches/${id}/assigner`,

  // ── Participations ────────────────────────────────────────────────────────
  participations:        `${BASE}/participations`,
  participationsUser:    (userId: number)           => `${BASE}participations/user/${userId}`,
  participationsTableau: (tabId: number)            => `${BASE}/participations/tableau/${tabId}`,
  participation:         (uid: number, tid: number) => `${BASE}/participations/user/${uid}/tableau/${tid}`,
} as const;
