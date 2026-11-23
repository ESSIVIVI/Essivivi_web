import { api } from "@/lib/api";
import type { AuthSuccess, Invitation, InvitationStatus, RoleCode } from "./types";

export interface InvitationPreview {
  email: string;
  first_name: string;
  last_name: string;
  role: RoleCode;
  expires_at: string;
}

export const invitationsApi = {
  // --- Administration (permission users.invite) ---
  list: (status?: InvitationStatus, signal?: AbortSignal) => api.get<Invitation[]>("/invitations", { status }, signal),
  create: (data: { email: string; first_name: string; last_name: string; role: "gestionnaire" | "agent" }) =>
    api.post<Invitation>("/invitations", data),
  resend: (id: number) => api.post<Invitation>(`/invitations/${id}/resend`),
  cancel: (id: number) => api.post<void>(`/invitations/${id}/cancel`),

  // --- Routes publiques : le jeton du lien reçu par e-mail fait foi ---
  preview: (token: string) => api.get<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`),
  sendCode: (token: string) =>
    api.post<{ detail: string; email: string }>(`/invitations/${encodeURIComponent(token)}/send-code`, {}, { auth: false }),
  activate: (token: string, code: string, password: string, confirm_password: string) =>
    api.post<AuthSuccess>(
      `/invitations/${encodeURIComponent(token)}/activate`,
      { code, password, confirm_password },
      { auth: false },
    ),
};

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  en_attente: "En attente",
  activee: "Activée",
  expiree: "Expirée",
  annulee: "Annulée",
  bloquee: "Bloquée",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  gestionnaire: "Gestionnaire",
  agent: "Agent",
  client: "Client",
};
