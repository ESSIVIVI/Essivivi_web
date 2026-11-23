import { api } from "@/lib/api";
import type { Drink, DrinkInput } from "./types";

export const drinksApi = {
  list: (type?: string, signal?: AbortSignal) => api.get<Drink[]>("/drinks", { type }, signal),
  create: (data: DrinkInput) => api.post<Drink>("/drinks", data),
  update: (id: number, data: Partial<Omit<DrinkInput, "initial_quantity">>) => api.patch<Drink>(`/drinks/${id}`, data),
  deactivate: (id: number) => api.post<Drink>(`/drinks/${id}/deactivate`),
};
