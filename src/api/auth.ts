import { api } from "@/lib/api";
import type {
  AuthSuccess,
  LoginResponse,
  Me,
  RegisterPayload,
  TotpConfirmResult,
  TotpSetup,
} from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }, { auth: false }),

  verifyTotp: (email: string, totp_code: string) =>
    api.post<AuthSuccess>("/auth/2fa/verify", { email, totp_code }, { auth: false }),

  useBackupCode: (email: string, backup_code: string) =>
    api.post<AuthSuccess>("/auth/2fa/backup", { email, backup_code }, { auth: false }),

  logout: (refresh: string) => api.post<void>("/auth/logout", { refresh }),

  register: (payload: RegisterPayload) =>
    api.post<{ detail: string; email: string }>("/auth/register", payload, { auth: false }),

  verifyEmail: (email: string, code: string) =>
    api.post<AuthSuccess>("/auth/email/verify", { email, code }, { auth: false }),

  me: () => api.get<Me>("/me"),

  updateMe: (data: Partial<Pick<Me, "first_name" | "last_name" | "phone">>) => api.patch<Me>("/me", data),

  changePassword: (current_password: string, new_password: string, confirm_password: string) =>
    api.post<{ detail: string }>("/auth/password/change", { current_password, new_password, confirm_password }),

  setupTotp: () => api.post<TotpSetup>("/auth/2fa/setup"),

  confirmTotp: (code: string) => api.post<TotpConfirmResult>("/auth/2fa/confirm", { code }),

  disableTotp: (code: string) => api.post<{ detail: string }>("/auth/2fa/disable", { code }),
};
