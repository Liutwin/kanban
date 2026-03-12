import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isLogged } = useAuth();
  return isLogged ? <Navigate to="/boards" replace /> : <>{children}</>;
}