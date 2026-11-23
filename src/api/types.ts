/** Types alignés sur les serializers du backend (`Essivivi_back`). */

export type RoleCode = "admin" | "gestionnaire" | "agent" | "client";

export interface Role {
  code: RoleCode;
  name: string;
}

/** Utilisateur renvoyé avec les jetons (login, 2FA, vérification e-mail). */
export interface SessionUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: RoleCode;
  two_factor_enabled: boolean;
}

/** Profil complet renvoyé par GET /me. */
export interface Me {
  id: number;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  email_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface AuthSuccess extends Tokens {
  user: SessionUser;
}

/** Quand le 2FA est actif, le login ne renvoie pas de jetons : il faut ensuite POST /auth/2fa/verify. */
export interface TwoFactorRequired {
  two_factor_required: true;
  email: string;
}

export type LoginResponse = AuthSuccess | TwoFactorRequired;

export function isTwoFactorRequired(response: LoginResponse): response is TwoFactorRequired {
  return "two_factor_required" in response && response.two_factor_required === true;
}

export type EstablishmentType = "bar" | "restaurant" | "cafeteria" | "boutique" | "autre";

export interface RegisterPayload {
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  business_name: string;
  establishment_type: EstablishmentType;
}

export interface TotpSetup {
  secret: string;
  uri: string;
}

export interface TotpConfirmResult {
  detail: string;
  backup_codes: string[];
}

export interface Drink {
  id: number;
  name: string;
  drink_type: string;
  description: string;
  price: string; // décimal sérialisé en chaîne
  is_available: boolean;
  stock_quantity: number;
  created_at: string;
}

export interface DrinkInput {
  name: string;
  drink_type: string;
  description?: string;
  price: string | number;
  is_available?: boolean;
  initial_quantity?: number;
}

export interface StockItem {
  drink_id: number;
  drink_name: string;
  drink_type: string;
  price: string;
  is_available: boolean;
  quantity: number;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  drink: number;
  drink_name: string;
  delta: number;
  reason: string;
  sale: number | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export type InvitationStatus = "en_attente" | "activee" | "expiree" | "annulee" | "bloquee";

export interface Invitation {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: RoleCode;
  status: InvitationStatus;
  expires_at: string;
  created_by: string;
  created_at: string;
  activated_at: string | null;
}
