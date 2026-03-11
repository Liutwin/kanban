export const ROUTES_AUTH = {
  login:    "/auth/login",
  validate: "/auth/validate",
} as const;

export const ROUTES_API = {
  // ── Utilisateurs ──────────────────────────────────────────────────────────
  users:        "/api/users",
  user:         (id: number) => `/api/users/${id}`,

  // ── Tableaux ──────────────────────────────────────────────────────────────
  tableaux:     "/api/tableaux",
  tableau:      (id: number) => `/api/tableaux/${id}`,
  tableauxUser: (id: number) => `/api/tableaux/user/${id}`,

  // ── Colonnes ──────────────────────────────────────────────────────────────
  colonnes:        (tabId: number)                   => `/api/tableaux/${tabId}/colonnes`,
  colonne:         (tabId: number, colId: number)    => `/api/tableaux/${tabId}/colonnes/${colId}`,
  colonneDeplacer: (tabId: number, colId: number)    => `/api/tableaux/${tabId}/colonnes/${colId}/deplacer`,

  // ── Tâches ────────────────────────────────────────────────────────────────
  taches:            (colId: number)            => `/api/taches/colonnes/${colId}`,
  tachesPriorite:    (colId: number, p: string) => `/api/taches/colonnes/${colId}/priorite/${p}`,
  tachesAssignee:    (assigneeId: number)       => `/api/taches/assignee/${assigneeId}`,
  tache:             (id: number)               => `/api/taches/${id}`,
  tacheDeplacer:     (id: number)               => `/api/taches/${id}/deplacer`,
  tacheAssigner:     (id: number)               => `/api/taches/${id}/assigner`,

  // ── Participations ────────────────────────────────────────────────────────
  participations:        "/api/participations",
  participationsUser:    (userId: number)           => `/api/participations/user/${userId}`,
  participationsTableau: (tabId: number)            => `/api/participations/tableau/${tabId}`,
  participation:         (uid: number, tid: number) => `/api/participations/user/${uid}/tableau/${tid}`,
} as const;
