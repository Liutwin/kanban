import { createContext } from "react";
import type { AuthResponse } from "../model/types";

export interface AuthContextValue {
  authResponse:    AuthResponse | null;
  setAuthResponse: (r: AuthResponse | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  authResponse:    null,
  setAuthResponse: () => {},
});
