// model/interfaces.ts – types partagés de l'application Kanban

// ─────────────────────────────────────────────────────────────────────────────
// Authentification (Deno)
// ─────────────────────────────────────────────────────────────────────────────

/** Utilisateur authentifié, retourné dans le payload JWT et dans `POST /api/v1/auth/login`. */
export interface User {
  id:         number;
  email:      string;
  firstName:  string;
  lastName:   string;
  avatarURL?: string;
  isAdmin:   boolean;
}

/** Token JWT + infos utilisateur, retournés dans le champ `data` de `POST /api/v1/auth/login`. */
export interface AuthResponse {
  token: string;
  user:  User;
}

/** Corps de requête de `POST /api/v1/auth/login`. */
export interface LoginRequest {
  email:    string;
  password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enveloppe générique des réponses Spring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enveloppe générique retournée par le backend Spring.
 * @template T - Type de la donnée contenue dans `data`.
 */
export interface APIResponse<T> {
  success: boolean;
  data:    T;
  error?:  { message: string; code?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Modèles métier
// ─────────────────────────────────────────────────────────────────────────────

/** Tableau Kanban — `GET /api/v1/boards/{id}`, `GET /api/v1/boards/user/{id}`. */
export interface Board {
  id:        number;
  name:      string;
  creatorId: number;
}

/** Membre d'un tableau — `GET /api/v1/boards/{id}/members`. */
export interface Member {
  userId:  number;
  boardId: number;
  role:    "admin" | "editeur" | "lecteur";
}

/** Colonne d'un tableau — `GET /api/v1/boards/{boardId}/columns`. */
export interface Column {
  id:      number;
  numero:  number;
  name:    string;
  boardId: number;
}

/** Tâche Kanban — `GET /api/v1/tasks/{id}`, `GET /api/v1/tasks/column/{colId}`. */
export interface Task {
  id:            number;
  title:         string;
  details?:      string;
  dueDate?:      string;
  priority:      Priority;
  boardColumnId: number;
  creatorId:     number;
  assignedId?:   number;
  position:      number;
  validated?:    boolean;
}

export type Priority = "basse" | "moyenne" | "haute";

/** Commentaire — `GET /api/v1/comments/task/{tskId}`. Stocké dans MongoDB. */
export interface Comment {
  id:      number;
  content: string;
  date:    string;
  tskId:   number;
  usrId:   number;
}

/** Pièce jointe — `GET /api/v1/files/task/{tskId}`. Stockée dans MongoDB. */
export interface File {
  id:     number;
  name:   string;
  type:   string;
  way:    string;
  comId?: number;
  tskId:  number;
  usrId:  number;
}

/** Entrée du journal des actions, générée par les triggers MariaDB. */
export interface Log {
  id:           number;
  type:         "creation" | "deplacement" | "modification";
  date:         string;
  description?: string;
  authorId?:    number;
  taskId?:      number;
  boardId?:     number;
  boardName?:   string;
}

/** Corps de requête de `POST /api/v1/users`. */
export interface UserCreate {
  email:      string;
  password:   string;
  lastName:   string;
  firstName:  string;
  avatarURL?: string;
}

/** Corps de requête de `PATCH /api/v1/users/{id}/password`. */
export interface UserPassword {
  oldPassword: string;
  newPassword: string;
}