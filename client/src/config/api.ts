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
  users:          `${BASE}/users`,
  user:           (id: number) => `${BASE}/users/${id}`,
  userPassword:   (id: number) => `${BASE}/users/${id}/password`,       // AJOUT

  // ── Tableaux ──────────────────────────────────────────────────────────────
  tableaux:       `${BASE}/boards`,
  tableau:        (id: number) => `${BASE}/boards/${id}`,
  tableauxUser:   (id: number) => `${BASE}/boards/user/${id}`,

  // ── Membres d'un tableau (ex-participations, fusionnées dans /boards) ──────
  tableauMembres: (id: number)                    => `${BASE}/boards/${id}/members`,
  tableauMembre:  (tabId: number, userId: number) => `${BASE}/boards/${tabId}/members/${userId}`,

  // ── Colonnes ──────────────────────────────────────────────────────────────
  colonnes:        (boardId: number)                => `${BASE}/boards/${boardId}/columns`,
  colonne:         (boardId: number, id: number)    => `${BASE}/boards/${boardId}/columns/${id}`,
  colonneDeplacer: (boardId: number, id: number)    => `${BASE}/boards/${boardId}/columns/${id}/move`,

  // ── Tâches ────────────────────────────────────────────────────────────────
  taches:         (colId: number)                   => `${BASE}/tasks/column/${colId}`,        // /columns/ -> /column/
  tachesPriorite: (colId: number, p: string)        => `${BASE}/tasks/column/${colId}/priority/${p}`,
  tachesAssignee: (userId: number)                  => `${BASE}/tasks/assigned/${userId}`,
  tache:          (id: number)                      => `${BASE}/tasks/${id}`,                  // double / corrigé
  tacheDeplacer:  (id: number)                      => `${BASE}/tasks/${id}/move`,
  tacheAssigner:  (id: number)                      => `${BASE}/tasks/${id}/assign`,

  // ── Commentaires (AJOUT) ──────────────────────────────────────────────────
  commentaires:        `${BASE}/comments`,
  commentairesTache:   (tskId: number) => `${BASE}/comments/task/${tskId}`,
  commentaire:         (id: number)    => `${BASE}/comments/${id}`,

  // ── Fichiers / pièces jointes (AJOUT) ────────────────────────────────────
  fichiers:            `${BASE}/files`,
  fichiersTache:       (tskId: number) => `${BASE}/files/task/${tskId}`,
  fichiersCommentaire: (comId: number) => `${BASE}/files/comment/${comId}`,
  fichier:             (id: number)    => `${BASE}/files/${id}`,
} as const;