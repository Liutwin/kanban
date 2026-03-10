export const ROUTES_AUTH = {
  login:    "/auth/login",
  register: "/auth/register",
  validate: "/auth/validate",
} as const;

export const ROUTES_API = {
  users:        "/api/users",
  user:         (id: number) => `/api/users/${id}`,

  tableaux:     "/api/tableaux",
  tableau:      (id: number) => `/api/tableaux/${id}`,
  tableauxUser: (id: number) => `/api/tableaux/user/${id}`,

  colonnes:        (tabId: number) => `/api/tableaux/${tabId}/colonnes`,
  colonne:         (tabId: number, colId: number) => `/api/tableaux/${tabId}/colonnes/${colId}`,
  colonneDeplacer: (tabId: number, colId: number) => `/api/tableaux/${tabId}/colonnes/${colId}/deplacer`,

  taches:    (colId: number) => `/api/colonnes/${colId}/taches`,
  tache:     (id: number)    => `/api/taches/${id}`,

  participationsUser:    (userId: number)            => `/api/participations/user/${userId}`,
  participationsTableau: (tabId: number)             => `/api/participations/tableau/${tabId}`,
  participation:         (uid: number, tid: number)  => `/api/participations/user/${uid}/tableau/${tid}`,
} as const;
