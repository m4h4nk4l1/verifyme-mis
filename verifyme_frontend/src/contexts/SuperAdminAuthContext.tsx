"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { LoginResponse, User } from "@/types/api";

interface SuperAdminAuthContextType {
  user: User | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("superadmin_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response: LoginResponse = await apiClient.login(credentials);
      if (response.user.role !== "SUPER_ADMIN") {
        throw new Error("Not a super admin account");
      }
      localStorage.setItem("superadmin_access_token", response.access);
      localStorage.setItem("superadmin_refresh_token", response.refresh);
      localStorage.setItem("superadmin_user", JSON.stringify(response.user));
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("superadmin_access_token");
    localStorage.removeItem("superadmin_refresh_token");
    localStorage.removeItem("superadmin_user");
    setUser(null);
    router.push("/superadmin/login");
  };

  return (
    <SuperAdminAuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error("useSuperAdminAuth must be used within a SuperAdminAuthProvider");
  }
  return context;
} 