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

/**
 * Membre d'un tableau — `GET /api/v1/boards/{id}/members`.
 * Le champ `notified` reflète le statut de l'invitation :
 * `false` = invitation en attente, `true` = membre actif.
 */
export interface Member {
  userId:   number;
  boardId:  number;
  role:     "admin" | "editeur" | "lecteur";
  notified: boolean;
}

/**
 * Invitation en attente, telle que retournée par `GET /api/v1/boards/invitations/me`.
 * Étend {@link Member} avec le nom du tableau pour l'affichage sur la page Boards.
 */
export interface PendingInvitation extends Member {
  boardName: string;
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

/**
 * Profil enrichi d'un utilisateur — `GET /api/v1/users/profiles/{id}`.
 * Correspond à la vue `vue_profil_utilisateur` côté MariaDB.
 * Noms de champs conformes à UserViewDTO.java (sérialisation Jackson/Lombok).
 * Note : `isAdmin` est sérialisé en `admin` par Jackson (getter `isAdmin()` → strip "is").
 */
export interface UserProfileDTO {
  id:             number;
  firstName:      string;
  lastName:       string;
  email:          string;
  avatarURL?:     string;
  /** Sérialisé "admin" (pas "isAdmin") — Lombok boolean + Jackson sans @JsonProperty */
  admin:          boolean;
  boardsCreated:  number;
  participations: number;
  tasksCreated:   number;
  tasksAssigned:  number;
  actions:        number;
  lastActivity?:  string;
}
// ─────────────────────────────────────────────────────────────────────────────
// Types internes client (Dashboard / Kanban)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * {@link Column} étendue avec ses tâches déjà chargées depuis l'API.
 * C'est l'unité de travail principale du Dashboard.
 */
export interface ColumnWithTasks extends Column {
  tasks: Task[];
}

/**
 * Cible de drop pour les tâches.
 * `beforeTaskId === null` signifie « insérer en fin de colonne ».
 */
export interface DropTarget {
  colId: number;
  beforeTaskId: number | null;
}

/**
 * État du mirror de drag : ghost personnalisé qui suit le curseur
 * en remplacement du ghost natif du navigateur.
 *
 * - `kind: "task"` → on drague une carte tâche.
 * - `kind: "col"`  → on drague une colonne entière.
 * - `ox` / `oy`   → offset du clic par rapport au coin supérieur gauche
 *                    de l'élément (pour aligner le mirror sur le curseur).
 * - `width`        → largeur de l'élément source (pour que le mirror ait
 *                    la même taille que l'original).
 */
export type DragMirrorState =
  | { kind: "task"; task: Task;            ox: number; oy: number; width: number }
  | { kind: "col";  col:  ColumnWithTasks; ox: number; oy: number; width: number };

/** État du formulaire de création de tâche. */
export interface TaskFormState {
  title:    string;
  details:  string;
  dueDate:  string;
  dueTime:  string;
  priority: Priority;
}
