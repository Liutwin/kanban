export interface Utilisateur {
  id:     number;
  email:  string;
  pseudo: string;
}

export interface Tableau {
  id:         number;
  nom:        string;
  createurId: number;
}

export interface Colonne {
  id:        number;
  numero:    number;
  nom:       string;
  tableauId: number;
}

export type Priorite = "BASSE" | "MOYENNE" | "HAUTE";

export interface Tache {
  id:         number;
  titre:      string;
  details:    string | null;
  dateLimite: string | null;
  priority:   Priorite;
  colonneId:  number;
  createurId: number;
  assigneeId: number | null;
}

export type Role = "ADMIN" | "EDITEUR" | "LECTEUR";

export interface Participation {
  userId:    number;
  tableauId: number;
  role:      Role;
}

export interface AuthResponse {
  token: string;
  user:  Utilisateur;
}

export interface LoginRequest {
  usr_mail: string;
  usr_mdp:  string;
}

export interface RegisterRequest {
  usr_mail:   string;
  usr_pseudo: string;
  usr_mdp:    string;
}

export interface APISuccess<T> {
  success: true;
  data:    T;
}

export interface APIFailure {
  success: false;
  error: { code: string; message: string };
}

export type APIResponse<T> = APISuccess<T> | APIFailure;
