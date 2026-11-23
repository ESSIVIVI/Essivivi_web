const PRICE = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lome" });

/** « 1500.00 » (décimal en chaîne renvoyé par l'API) → « 1 500 F CFA ». */
export function formatPrice(value: string | number): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(amount) ? PRICE.format(amount) : "—";
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

export const DRINK_TYPES: Array<{ value: string; label: string }> = [
  { value: "eau", label: "Eau" },
  { value: "jus", label: "Jus" },
  { value: "soda", label: "Soda" },
  { value: "biere", label: "Bière" },
  { value: "boisson_energisante", label: "Boisson énergisante" },
  { value: "autre", label: "Autre" },
];

export function drinkTypeLabel(value: string): string {
  return DRINK_TYPES.find((type) => type.value === value)?.label ?? value;
}
