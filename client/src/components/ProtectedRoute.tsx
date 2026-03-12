import { Navigate } from "react-router-dom";
import { useAuth }  from "../hooks/useAuth";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLogged } = useAuth();
  return isLogged ? <>{children}</> : <Navigate to="/login" replace />;
}