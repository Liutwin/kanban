// model/types.ts – shared data types for the Kanban app

export interface Utilisateur {
  id:     number;
  email:   string;
  pseudo: string;
}

export interface Tableau {
  tab_id:    number;
  tab_nom:   string;
  ptp_role?: string;
  col_count?: number;
  tsk_count?: number;
}

export interface Colonne {
  col_id:     number;
  col_numero: number;
  col_nom:    string;
  tab_id:     number;
  taches?:    Tache[];
}

export interface Tache {
  tsk_id:        number;
  tsk_titre:     string;
  tsk_details?:  string;
  tsk_datelimite?: string;
  tsk_priorite:  "basse" | "moyenne" | "haute";
  col_id:        number;
  usr_createur:  number;
  usr_assignee?: number;
}

export interface Log {
  log_id:           number;
  log_type:         "creation" | "deplacement" | "modification";
  log_date:         string;
  log_description?: string;
  usr_auteur?:      number;
  usr_auteur_pseudo?: string;
  tsk_id?:          number;
  tab_id?:          number;
  tab_nom?:         string;
}

/**
 * Données complètes d'un utilisateur, telles que retournées par `GET /users/{id}`.
 */
export interface UserDTO {
  id: number;
  email: string;
  pseudo: string;
  lastName: string;
  firstName: string;
  avatarURL?: string;
}