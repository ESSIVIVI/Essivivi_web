import { ApiError, toApiError } from "./errors";
import { tokenStore } from "./tokens";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** false pour les routes publiques (login, inscription…) : pas d'en-tête Authorization, pas de refresh. */
  auth?: boolean;
  signal?: AbortSignal;
}

let onSessionExpired: (() => void) | null = null;

/** Appelé quand le refresh échoue : l'application ramène l'utilisateur à l'écran de connexion. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined; // réponse non JSON (page d'erreur d'un proxy, par exemple)
  }
}

async function send(path: string, options: RequestOptions, withAuth: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const access = tokenStore.getAccess();
  if (withAuth && access) headers.Authorization = `Bearer ${access}`;
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Impossible de joindre le serveur. Vérifiez votre connexion.");
  }
}

// Un seul rafraîchissement à la fois : plusieurs requêtes en 401 simultanées attendent la même promesse.
let refreshing: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= (async () => {
    const refresh = tokenStore.getRefresh();
    if (!refresh) return false;
    try {
      const response = await send("/auth/refresh", { method: "POST", body: { refresh }, auth: false }, false);
      if (!response.ok) return false;
      const data = (await parseBody(response)) as { access?: string; refresh?: string } | undefined;
      if (!data?.access) return false;
      tokenStore.setAccess(data.access);
      if (data.refresh) tokenStore.setRefresh(data.refresh); // l'API peut faire tourner le refresh
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const withAuth = options.auth !== false;
  let response = await send(path, options, withAuth);

  if (response.status === 401 && withAuth && tokenStore.getRefresh()) {
    if (await refreshAccessToken()) {
      response = await send(path, options, withAuth);
    } else {
      tokenStore.clear();
      onSessionExpired?.();
    }
  }

  const body = await parseBody(response);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, { ...options, method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ?? {} }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
