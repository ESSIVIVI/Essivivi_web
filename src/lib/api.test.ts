import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setSessionExpiredHandler } from "./api";
import { ApiError, toApiError } from "./errors";
import { tokenStore } from "./tokens";

const json = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  tokenStore.clear();
  setSessionExpiredHandler(null);
});

afterEach(() => vi.unstubAllGlobals());

describe("toApiError", () => {
  it("lit le message `detail` de DRF", () => {
    const error = toApiError(401, { detail: "Identifiants invalides." });
    expect(error.message).toBe("Identifiants invalides.");
    expect(error.status).toBe(401);
  });

  it("garde les erreurs par champ et utilise la première comme message", () => {
    const error = toApiError(400, { email: ["Un compte avec cet email existe déjà."], phone: ["Invalide."] });
    expect(error.field("email")).toBe("Un compte avec cet email existe déjà.");
    expect(error.field("phone")).toBe("Invalide.");
    expect(error.message).toBe("Un compte avec cet email existe déjà.");
  });

  it("gère non_field_errors, les listes et les corps vides", () => {
    expect(toApiError(400, { non_field_errors: ["Identifiants invalides."] }).message).toBe("Identifiants invalides.");
    expect(toApiError(400, ["Code invalide."]).message).toBe("Code invalide.");
    expect(toApiError(500, undefined).message).toMatch(/serveur/);
    expect(toApiError(403, undefined).message).toMatch(/permission/);
  });
});

describe("request", () => {
  it("envoie le jeton, le JSON et les paramètres de requête", async () => {
    tokenStore.setAccess("abc");
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    const result = await api.get("/drinks", { type: "biere", vide: "", nul: null });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/drinks?type=biere");
    expect(String(url)).not.toContain("vide");
    expect(init.headers.Authorization).toBe("Bearer abc");
  });

  it("n'envoie pas d'Authorization sur une route publique", async () => {
    tokenStore.setAccess("abc");
    fetchMock.mockResolvedValueOnce(json({ two_factor_required: true, email: "a@b.c" }));
    await api.post("/auth/login", { email: "a@b.c", password: "x" }, { auth: false });
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBeUndefined();
  });

  it("renvoie undefined pour un 204", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.post("/auth/logout", { refresh: "r" })).resolves.toBeUndefined();
  });

  it("lève une ApiError avec le statut", async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: "Permission refusée." }, 403));
    await expect(api.get("/stock")).rejects.toMatchObject({ status: 403, message: "Permission refusée." });
  });

  it("signale un serveur injoignable avec le statut 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const error: unknown = await api.get("/drinks").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});

describe("rafraîchissement automatique", () => {
  it("rafraîchit sur 401 puis rejoue la requête avec le nouveau jeton", async () => {
    tokenStore.setAccess("vieux");
    tokenStore.setRefresh("refresh-1");
    fetchMock
      .mockResolvedValueOnce(json({ detail: "expiré" }, 401))
      .mockResolvedValueOnce(json({ access: "neuf" }))
      .mockResolvedValueOnce(json([{ id: 1 }]));

    await expect(api.get("/drinks")).resolves.toEqual([{ id: 1 }]);
    expect(String(fetchMock.mock.calls[1]![0])).toContain("/auth/refresh");
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ refresh: "refresh-1" });
    expect(fetchMock.mock.calls[2]![1].headers.Authorization).toBe("Bearer neuf");
    expect(tokenStore.getAccess()).toBe("neuf");
  });

  it("ne lance qu'un seul refresh pour plusieurs requêtes simultanées en 401", async () => {
    tokenStore.setAccess("vieux");
    tokenStore.setRefresh("refresh-1");
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).includes("/auth/refresh")) return json({ access: "neuf" });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer neuf" ? json({ ok: true }) : json({ detail: "expiré" }, 401);
    });

    await Promise.all([api.get("/drinks"), api.get("/stock"), api.get("/stock/movements")]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("efface la session et prévient l'application si le refresh échoue", async () => {
    tokenStore.setAccess("vieux");
    tokenStore.setRefresh("mort");
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    fetchMock
      .mockResolvedValueOnce(json({ detail: "expiré" }, 401))
      .mockResolvedValueOnce(json({ detail: "Token invalide" }, 401));

    await expect(api.get("/drinks")).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
  });

  it("ne tente pas de refresh sans jeton refresh", async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: "Non authentifié" }, 401));
    await expect(api.get("/me")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
