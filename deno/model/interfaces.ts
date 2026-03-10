// model/interfaces.ts

// =============================================
// Réponses génériques de l'API
// =============================================

export enum APIErrorCode {
  BAD_REQUEST   = "BAD_REQUEST",
  UNAUTHORIZED  = "UNAUTHORIZED",
  FORBIDDEN     = "FORBIDDEN",
  NOT_FOUND     = "NOT_FOUND",
  CONFLICT      = "CONFLICT",
  SERVER_ERROR  = "SERVER_ERROR",
}

export interface APIError {
  code: APIErrorCode;
  message: string;
}

export interface APISuccess<T> {
  success: true;
  data: T;
}

export interface APIFailure {
  success: false;
  error: APIError;
}

export type APIResponse<T> = APISuccess<T> | APIFailure;

export class APIException extends Error {
  readonly code: APIErrorCode;
  readonly status: number;

  constructor(code: APIErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// =============================================
// Utilisateur
// =============================================

// Ce que l'API expose au client
export interface Utilisateur {
  usr_id: number;
  usr_mail: string;
  usr_pseudo: string;
}

// Ce qui est stocké en base (avec le mot de passe hashé)
export interface UtilisateurRow {
  usr_id: number;
  usr_mail: string;
  usr_pseudo: string;
  usr_mdp: string;
  [key: string]: unknown;
}

// =============================================
// Auth
// =============================================

export interface LoginRequest {
  usr_mail: string;
  usr_mdp: string;   // mot de passe en clair, sera hashé
}

export interface RegisterRequest {
  usr_mail: string;
  usr_pseudo: string;
  usr_mdp: string;
}

export interface AuthResponse {
  token: string;
  user: Utilisateur;
}

// Contenu du JWT (payload)
export interface AuthPayload {
  usr_id: number;
  usr_mail: string;
  usr_pseudo: string;
  exp: number;
}

export function isAuthPayload(obj: unknown): obj is AuthPayload {
  return (
    typeof obj === "object" && obj !== null &&
    "usr_id"    in obj && typeof (obj as AuthPayload).usr_id    === "number" &&
    "usr_mail"  in obj && typeof (obj as AuthPayload).usr_mail  === "string" &&
    "usr_pseudo"in obj && typeof (obj as AuthPayload).usr_pseudo=== "string" &&
    "exp"       in obj && typeof (obj as AuthPayload).exp       === "number"
  );
}
