/** Erreur renvoyée par l'API. `fields` contient les erreurs par champ (format DRF). */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }

  /** Première erreur d'un champ, utile pour l'afficher sous un input. */
  field(name: string): string | undefined {
    return this.fields[name]?.[0];
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "Les données envoyées sont invalides.",
  401: "Session expirée, veuillez vous reconnecter.",
  403: "Vous n'avez pas la permission d'effectuer cette action.",
  404: "Élément introuvable.",
  409: "Cette opération est impossible dans l'état actuel.",
  423: "Accès temporairement verrouillé.",
  429: "Trop de tentatives, réessayez dans un instant.",
};

function asMessages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(asMessages);
  return [];
}

/** Transforme le corps d'erreur DRF ({detail}, {champ: [msg]}, [msg]) en ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  const fallback =
    DEFAULT_MESSAGES[status] ?? (status >= 500 ? "Erreur du serveur, réessayez plus tard." : "Erreur inattendue.");

  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    const detail = asMessages(record.detail)[0];
    const fields: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === "detail") continue;
      const messages = asMessages(value);
      if (messages.length) fields[key] = messages;
    }
    const nonField = fields.non_field_errors?.[0];
    const firstField = Object.values(fields)[0]?.[0];
    return new ApiError(status, detail ?? nonField ?? firstField ?? fallback, fields);
  }
  if (Array.isArray(body)) {
    return new ApiError(status, asMessages(body)[0] ?? fallback);
  }
  return new ApiError(status, fallback);
}
