import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { RoleCode } from "@/api/types";
import { PageSpinner } from "@/components/ui";
import { useAuth } from "./AuthContext";

/** Routes réservées aux utilisateurs connectés ; `roles` restreint en plus à certains rôles. */
export function RequireAuth({ roles, children }: { roles?: RoleCode[]; children?: ReactNode }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageSpinner />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/forbidden" replace />;
  return children ?? <Outlet />;
}
