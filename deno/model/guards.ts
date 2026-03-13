import { LoginRequest } from "./interfaces.ts";
  
  export function isLoginRequest(obj: unknown): obj is LoginRequest {
    return (
      typeof obj === "object" && obj !== null &&
      "pseudo" in obj && typeof (obj as LoginRequest).pseudo === "string" &&
      "password"  in obj && typeof (obj as LoginRequest).password  === "string"
    );
  }