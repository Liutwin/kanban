import { LoginRequest, RegisterRequest } from "./interfaces.ts";

export function isRegisterRequest(obj: unknown): obj is RegisterRequest {
    return (
      typeof obj === "object" && obj !== null &&
      "usr_mail"   in obj && typeof (obj as RegisterRequest).usr_mail   === "string" &&
      "usr_pseudo" in obj && typeof (obj as RegisterRequest).usr_pseudo === "string" &&
      "usr_mdp"    in obj && typeof (obj as RegisterRequest).usr_mdp    === "string"
    );
  }
  
  export function isLoginRequest(obj: unknown): obj is LoginRequest {
    return (
      typeof obj === "object" && obj !== null &&
      "usr_mail" in obj && typeof (obj as LoginRequest).usr_mail === "string" &&
      "usr_mdp"  in obj && typeof (obj as LoginRequest).usr_mdp  === "string"
    );
  }