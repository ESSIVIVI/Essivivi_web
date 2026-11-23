import { api } from "@/lib/api";
import type { StockItem, StockMovement } from "./types";

export const stockApi = {
  list: (lowStock?: boolean, signal?: AbortSignal) =>
    api.get<StockItem[]>("/stock", { low_stock: lowStock ? "true" : undefined }, signal),

  /** Ajoute `quantity` (> 0) au stock. */
  restock: (drink_id: number, quantity: number) => api.post<StockItem>("/stock/restock", { drink_id, quantity }),

  /** Fixe la quantité ABSOLUE ; le serveur calcule l'écart et l'enregistre comme « ajustement ». */
  adjust: (drink_id: number, quantity: number, note?: string) =>
    api.post<StockItem>("/stock/adjust", { drink_id, quantity, note: note || undefined }),

  movements: (filters: { drink_id?: number; reason?: string } = {}, signal?: AbortSignal) =>
    api.get<StockMovement[]>("/stock/movements", filters, signal),
};

export const MOVEMENT_REASONS: Array<{ value: string; label: string }> = [
  { value: "reappro", label: "Réapprovisionnement" },
  { value: "vente_directe", label: "Vente directe" },
  { value: "commande", label: "Commande" },
  { value: "remise_expiration", label: "Remise en stock (commande expirée)" },
  { value: "ajustement", label: "Ajustement" },
];

export const reasonLabel = (value: string) => MOVEMENT_REASONS.find((r) => r.value === value)?.label ?? value;
