import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthResponse } from "../model/interfaces";

export function useAuth() {
  const { authResponse, setAuthResponse } = useContext(AuthContext);

  const login  = (r: AuthResponse) => setAuthResponse(r);
  const logout = () => setAuthResponse(null);

  const authFetch = async (
    input: RequestInfo,
    init: RequestInit = {},
  ): Promise<Response> => {
    const res = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        ...(authResponse?.token
          ? { Authorization: `Bearer ${authResponse.token}` }
          : {}),
      },
    });
    if (res.status === 401) logout();
    return res;
  };

  return {
    user:     authResponse?.user ?? null,
    token:    authResponse?.token ?? null,
    isLogged: authResponse !== null,
    login,
    logout,
    authFetch,
  };
}
