import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { login as loginRequest } from "../api/auth";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  activeBranchId: string | null;
  setActiveBranchId: (branchId: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      const parsed = JSON.parse(storedUser) as AuthUser;
      setUser(parsed);
      setActiveBranchIdState(parsed.role === "ADMIN" ? null : parsed.branchId);
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { token, user: loggedUser } = await loginRequest(email, password);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(loggedUser));
    setUser(loggedUser);
    setActiveBranchIdState(loggedUser.role === "ADMIN" ? null : loggedUser.branchId);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setActiveBranchIdState(null);
  }

  function setActiveBranchId(branchId: string | null) {
    if (user?.role !== "ADMIN") return;
    setActiveBranchIdState(branchId);
  }

  const value = useMemo(
    () => ({ user, loading, activeBranchId, setActiveBranchId, login, logout }),
    [user, loading, activeBranchId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
