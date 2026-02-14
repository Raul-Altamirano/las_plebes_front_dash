import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAuth();

  if (!ready) return null;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
