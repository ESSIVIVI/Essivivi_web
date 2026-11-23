import type { RoleCode } from "@/api/types";

export interface NavItem {
  to: string;
  label: string;
  /** Rôles qui voient l'entrée. Le backend reste l'autorité : un 403 est de toute façon géré par les pages. */
  roles: RoleCode[];
}

/**
 * Le backend ne renvoie pas (encore) la liste des permissions de l'utilisateur dans /me : le menu se base donc
 * sur le rôle, d'après la matrice par défaut. Dès qu'une route `permissions` existe, remplacer `roles` par un code
 * de permission et filtrer avec la liste reçue.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Accueil", roles: ["admin", "gestionnaire", "agent", "client"] },
  { to: "/boissons", label: "Boissons", roles: ["admin", "gestionnaire", "agent", "client"] },
  { to: "/stock", label: "Stock", roles: ["admin", "gestionnaire"] },
  { to: "/invitations", label: "Invitations", roles: ["admin"] },
  { to: "/profil", label: "Mon profil", roles: ["admin", "gestionnaire", "agent", "client"] },
];

export function navFor(role: RoleCode | null): NavItem[] {
  return role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];
}
