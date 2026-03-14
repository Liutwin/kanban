import { LoginRequest } from "./interfaces.ts";
  
  export function isLoginRequest(obj: unknown): obj is LoginRequest {
    return (
      typeof obj === "object" && obj !== null &&
      "email" in obj && typeof (obj as LoginRequest).email === "string" &&
      "password"  in obj && typeof (obj as LoginRequest).password  === "string"
    );
  }