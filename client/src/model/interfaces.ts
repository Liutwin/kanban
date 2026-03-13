// model/interfaces.ts – types partagés de l'application Kanban

// ─────────────────────────────────────────────────────────────────────────────
// Authentification (Deno)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Utilisateur authentifié, tel que retourné dans le payload JWT
 * et dans la réponse de `POST /api/v1/auth/login`.
 */
export interface User {
  /** Identifiant unique en base. */
  id:         number;
  /** Adresse e-mail. */
  email:      string;
  /** Pseudo affiché dans l'interface. */
  pseudo:     string;
  /** Prénom. */
  firstName:  string;
  /** Nom de famille. */
  lastName:   string;
  /** URL de l'avatar (optionnel). */
  avatarURL?: string;
}

/**
 * Réponse retournée par `POST /api/v1/auth/login` dans le champ `data`.
 * Contient le token JWT et les informations de l'utilisateur connecté.
 */
export interface AuthResponse {
  /** Token JWT à envoyer dans le header `Authorization: Bearer <token>`. */
  token: string;
  /** Informations de l'utilisateur authentifié. */
  user:  User;
}

/**
 * Requête envoyée à `POST /api/v1/auth/login`.
 */
export interface LoginRequest {
  /** Pseudo de l'utilisateur. */
  pseudo:   string;
  /** Mot de passe en clair (hashé côté Deno avant comparaison). */
  password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enveloppe générique des réponses Spring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enveloppe générique retournée par le backend Spring pour toutes les réponses.
 *
 * @template T - Type de la donnée contenue dans `data`.
 */
export interface APIResponse<T> {
  /** `true` si la requête a abouti, `false` sinon. */
  success: boolean;
  /** Données retournées en cas de succès. */
  data:    T;
  /** Détails de l'erreur en cas d'échec. */
  error?:  { message: string; code?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs Spring (noms de champs en camelCase, alignés sur l'API Swagger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tableau Kanban — `BoardDTO`.
 * Retourné par `GET /api/v1/boards/{id}` et `GET /api/v1/boards/user/{id}`.
 */
export interface Tableau {
  /** Identifiant du tableau. */
  id:         number;
  /** Nom du tableau (max 50 caractères). */
  name:       string;
  /** Identifiant de l'utilisateur créateur. */
  creatorId:  number;
}

/**
 * Membre d'un tableau — `BoardMemberDTO`.
 * Retourné par `GET /api/v1/boards/{id}/members`.
 */
export interface Membre {
  /** Identifiant de l'utilisateur. */
  userId:   number;
  /** Identifiant du tableau. */
  boardId:  number;
  /** Rôle dans le tableau. */
  role:     "admin" | "editeur" | "lecteur";
}

/**
 * Colonne d'un tableau — `BoardColumnDTO`.
 * Retournée par `GET /api/v1/boards/{boardId}/columns`.
 */
export interface Colonne {
  /** Identifiant de la colonne. */
  id:       number;
  /** Position d'affichage (1-based). */
  numero:   number;
  /** Nom affiché de la colonne (max 50 caractères). */
  name:     string;
  /** Identifiant du tableau parent. */
  boardId:  number;
}

/**
 * Tâche Kanban — `TaskDTO`.
 * Retournée par `GET /api/v1/tasks/{id}` et `GET /api/v1/tasks/column/{colId}`.
 */
export interface Tache {
  /** Identifiant de la tâche. */
  id:              number;
  /** Titre court (max 50 caractères). */
  title:           string;
  /** Description détaillée (optionnelle, max 256 caractères). */
  details?:        string;
  /** Date limite au format ISO 8601 (optionnelle). */
  dueDate?:        string;
  /** Niveau de priorité. */
  priority:        Priorite;
  /** Identifiant de la colonne parente. */
  boardColumnId:   number;
  /** Identifiant de l'utilisateur créateur. */
  creatorId:       number;
  /** Identifiant de l'utilisateur assigné (optionnel). */
  assignedId?:     number;
}

/** Niveau de priorité d'une tâche. */
export type Priorite = "basse" | "moyenne" | "haute";

/**
 * Commentaire — `CommentDTO`.
 * Retourné par `GET /api/v1/comments/task/{tskId}`.
 * Stocké dans MongoDB.
 */
export interface Commentaire {
  /** Identifiant du commentaire. */
  id:       number;
  /** Contenu textuel du commentaire. */
  content:  string;
  /** Date de création (ISO 8601). */
  date:     string;
  /** Identifiant de la tâche associée. */
  tskId:    number;
  /** Identifiant de l'auteur. */
  usrId:    number;
}

/**
 * Pièce jointe — `FileDTO`.
 * Retournée par `GET /api/v1/files/task/{tskId}`.
 * Stockée dans MongoDB.
 */
export interface Fichier {
  /** Identifiant du fichier. */
  id:      number;
  /** Nom du fichier. */
  name:    string;
  /** Type MIME. */
  type:    string;
  /** Chemin ou URL d'accès au fichier. */
  way:     string;
  /** Identifiant du commentaire associé (optionnel). */
  comId?:  number;
  /** Identifiant de la tâche associée. */
  tskId:   number;
  /** Identifiant de l'utilisateur ayant déposé le fichier. */
  usrId:   number;
}

/**
 * Entrée du journal des actions, retournée par `GET /api/v1/logs`.
 * Générée automatiquement par les triggers MariaDB.
 */
export interface Log {
  /** Identifiant de l'entrée. */
  log_id:             number;
  /** Type d'action journalisée. */
  log_type:           "creation" | "deplacement" | "modification";
  /** Date et heure de l'action (ISO 8601). */
  log_date:           string;
  /** Description textuelle générée par le trigger. */
  log_description?:   string;
  /** Identifiant de l'auteur de l'action. */
  usr_auteur?:        number;
  /** Pseudo de l'auteur (jointure optionnelle). */
  usr_auteur_pseudo?: string;
  /** Identifiant de la tâche concernée. */
  tsk_id?:            number;
  /** Identifiant du tableau concerné. */
  tab_id?:            number;
  /** Nom du tableau (jointure optionnelle). */
  tab_nom?:           string;
}

/**
 * DTO de création de compte — `UserCreateDTO`.
 * Envoyé à `POST /api/v1/users`.
 */
export interface UserCreateDTO {
  /** Adresse e-mail. */
  email:      string;
  /** Pseudo choisi (3–20 caractères). */
  pseudo:     string;
  /** Mot de passe en clair (hashé côté serveur). */
  password:   string;
  /** Nom de famille. */
  lastName:   string;
  /** Prénom. */
  firstName:  string;
  /** URL de l'avatar (optionnel). */
  avatarURL?: string;
}

/**
 * DTO de changement de mot de passe — `UserPasswordDTO`.
 * Envoyé à `PATCH /api/v1/users/{id}/password`.
 */
export interface UserPasswordDTO {
  /** Ancien mot de passe. */
  oldPassword: string;
  /** Nouveau mot de passe. */
  newPassword: string;
}