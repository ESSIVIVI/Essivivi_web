import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/api/auth";
import type { AuthSuccess, Me, RoleCode } from "@/api/types";
import { refreshAccessToken, setSessionExpiredHandler } from "@/lib/api";
import { tokenStore } from "@/lib/tokens";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  me: Me | null;
  role: RoleCode | null;
  /** Enregistre les jetons reçus du backend puis charge le profil. */
  signIn: (result: AuthSuccess) => Promise<void>;
  signOut: () => Promise<void>;
  /** Recharge /me (après activation du 2FA, modification du profil…). */
  reloadMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<Me | null>(null);

  const reset = useCallback(() => {
    tokenStore.clear();
    setMe(null);
    setStatus("anonymous");
  }, []);

  // Au démarrage : reprendre la session si un jeton refresh est conservé.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.getRefresh() || !(await refreshAccessToken())) {
        if (!cancelled) reset();
        return;
      }
      try {
        const profile = await authApi.me();
        if (!cancelled) {
          setMe(profile);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) reset();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  // Refresh impossible pendant l'utilisation : retour à l'écran de connexion.
  useEffect(() => {
    setSessionExpiredHandler(reset);
    return () => setSessionExpiredHandler(null);
  }, [reset]);

  const signIn = useCallback(
    async (result: AuthSuccess) => {
      tokenStore.setAccess(result.access);
      tokenStore.setRefresh(result.refresh);
      try {
        setMe(await authApi.me());
        setStatus("authenticated");
      } catch (error) {
        reset();
        throw error;
      }
    },
    [reset],
  );

  const signOut = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      /* même si le serveur est injoignable, on termine la session localement */
    } finally {
      reset();
    }
  }, [reset]);

  const reloadMe = useCallback(async () => {
    setMe(await authApi.me());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, me, role: me?.role.code ?? null, signIn, signOut, reloadMe }),
    [status, me, signIn, signOut, reloadMe],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  return context;
}
