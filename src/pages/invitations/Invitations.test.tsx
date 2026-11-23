import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InvitationPage from "@/auth/InvitationPage";
import { AuthProvider } from "@/auth/AuthContext";
import { tokenStore } from "@/lib/tokens";
import InvitationsPage from "./InvitationsPage";

const json = (body: unknown, status = 200) => new Response(body === undefined ? null : JSON.stringify(body), { status });

const invitation = (id: number, email: string, status: string, role = "agent") => ({
  id, email, first_name: "Kofi", last_name: "M", role, status,
  expires_at: "2026-11-30T10:00:00Z", created_by: "Admin", created_at: "2026-11-20T10:00:00Z", activated_at: null,
});

const ME = {
  id: 1, email: "admin@essivivi.test", phone: null, first_name: "Admin", last_name: "A", full_name: "Admin A",
  role: { code: "admin", name: "Administrateur" }, is_active: true, email_verified: true,
  two_factor_enabled: true, created_at: "2026-11-01T00:00:00Z", last_login: null,
};

let calls: Array<{ method: string; path: string; query: string; body?: Record<string, unknown> }>;
let routes: Record<string, (body?: Record<string, unknown>) => Response>;

beforeEach(() => {
  localStorage.clear();
  tokenStore.clear();
  calls = [];
  routes = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const parsed = new URL(String(url));
      const path = parsed.pathname.replace(/^\/api\/v1/, "");
      const method = init.method ?? "GET";
      const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
      calls.push({ method, path, query: parsed.search, body });
      if (path === "/auth/refresh") return json({ access: "A" });
      if (path === "/me") return json(ME);
      const handler = routes[`${method} ${path}`];
      return handler ? handler(body) : json({ detail: "introuvable" }, 404);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("page Invitations (admin)", () => {
  function renderAdmin() {
    tokenStore.setRefresh("R");
    return render(
      <QueryClientProvider client={client()}>
        <MemoryRouter>
          <AuthProvider>
            <InvitationsPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    routes["GET /invitations"] = () => json([invitation(1, "a@x.test", "en_attente"), invitation(2, "b@x.test", "activee", "gestionnaire"), invitation(3, "c@x.test", "expiree")]);
  });

  it("propose renvoyer/annuler selon le statut", async () => {
    renderAdmin();
    expect(await screen.findByText("a@x.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renvoyer à a@x.test" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler l'invitation de a@x.test" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renvoyer à c@x.test" })).toBeInTheDocument(); // expirée : renvoi possible
    expect(screen.queryByRole("button", { name: "Annuler l'invitation de c@x.test" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /b@x.test/ })).not.toBeInTheDocument(); // activée : aucune action
  });

  it("envoie le filtre de statut au serveur", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText("a@x.test");
    await user.selectOptions(screen.getByLabelText("Statut"), "expiree");
    await vi.waitFor(() => expect(calls.some((c) => c.path === "/invitations" && c.query.includes("status=expiree"))).toBe(true));
  });

  it("crée une invitation et affiche l'erreur du serveur si l'e-mail existe déjà", async () => {
    let attempts = 0;
    routes["POST /invitations"] = () => {
      attempts += 1;
      return attempts === 1 ? json({ email: ["Un compte avec cet email existe déjà."] }, 400) : json(invitation(9, "n@x.test", "en_attente"), 201);
    };
    const user = userEvent.setup();
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Inviter quelqu'un" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Prénom"), "Nina");
    await user.type(within(dialog).getByLabelText("Nom"), "Z");
    await user.type(within(dialog).getByLabelText("Adresse e-mail"), "n@x.test");
    await user.selectOptions(within(dialog).getByLabelText("Rôle"), "gestionnaire");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer l'invitation" }));
    expect(await within(dialog).findByText("Un compte avec cet email existe déjà.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Envoyer l'invitation" }));
    expect(await screen.findByText("Invitation envoyée.")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST" && c.path === "/invitations").at(-1)?.body).toEqual({
      email: "n@x.test", first_name: "Nina", last_name: "Z", role: "gestionnaire",
    });
  });

  it("annule après confirmation", async () => {
    routes["POST /invitations/1/cancel"] = () => json(undefined, 204);
    const user = userEvent.setup();
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Annuler l'invitation de a@x.test" }));
    const dialog = await screen.findByRole("dialog");
    expect(calls.some((c) => c.path.endsWith("/cancel"))).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Annuler l'invitation" }));
    await vi.waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/invitations/1/cancel")).toBe(true));
  });
});

describe("activation d'une invitation (lien public)", () => {
  function renderLink(token = "tok123") {
    return render(
      <QueryClientProvider client={client()}>
        <MemoryRouter initialEntries={[`/invitation/${token}`]}>
          <AuthProvider>
            <Routes>
              <Route path="/invitation/:token" element={<InvitationPage />} />
              <Route path="/profil" element={<p>Page profil</p>} />
              <Route path="/login" element={<p>Page connexion</p>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  const PREVIEW = { email: "kofi@x.test", first_name: "Kofi", last_name: "M", role: "agent", expires_at: "2026-11-30T10:00:00Z" };

  it("affiche l'erreur d'un lien expiré", async () => {
    routes["GET /invitations/vieux"] = () => json({ detail: "Ce lien a expiré." }, 400);
    renderLink("vieux");
    expect(await screen.findByText("Ce lien a expiré.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Invitation indisponible" })).toBeInTheDocument();
  });

  it("parcours complet : code envoyé puis compte créé et connexion", async () => {
    routes["GET /invitations/tok123"] = () => json(PREVIEW);
    routes["POST /invitations/tok123/send-code"] = () => json({ detail: "Code envoyé par email.", email: PREVIEW.email });
    routes["POST /invitations/tok123/activate"] = (body) =>
      body?.code === "654321"
        ? json({ access: "A", refresh: "R", user: { id: 5, email: PREVIEW.email, first_name: "Kofi", last_name: "M", role: "agent", two_factor_enabled: false } }, 201)
        : json({ detail: "Code incorrect. 2 tentative(s) restante(s)." }, 400);

    const user = userEvent.setup();
    renderLink();
    expect(await screen.findByRole("heading", { name: "Bienvenue Kofi" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    await user.type(await screen.findByLabelText("Code reçu par e-mail"), "111111");
    await user.type(screen.getByLabelText("Mot de passe"), "Motdepasse2026");
    await user.type(screen.getByLabelText("Confirmer le mot de passe"), "Motdepasse2026");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText(/2 tentative\(s\) restante\(s\)/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Code reçu par e-mail"));
    await user.type(screen.getByLabelText("Code reçu par e-mail"), "654321");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText("Page profil")).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith("/activate") && c.body?.code === "654321")?.body).toEqual({
      code: "654321", password: "Motdepasse2026", confirm_password: "Motdepasse2026",
    });
    expect(tokenStore.getRefresh()).toBe("R");
  });
});
