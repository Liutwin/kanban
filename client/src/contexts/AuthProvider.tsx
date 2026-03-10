import { useState, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthResponse } from "../model/types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(() => {
    try {
      const stored = sessionStorage.getItem("auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleSet = (r: AuthResponse | null) => {
    setAuthResponse(r);
    if (r) sessionStorage.setItem("auth", JSON.stringify(r));
    else   sessionStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ authResponse, setAuthResponse: handleSet }}>
      {children}
    </AuthContext.Provider>
  );
}
