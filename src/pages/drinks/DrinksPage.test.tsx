import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "@/lib/tokens";
import { AuthProvider } from "@/auth/AuthContext";
import DrinksPage from "./DrinksPage";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const drink = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  drink_type: "soda",
  description: "",
  price: "500.00",
  is_available: true,
  stock_quantity: 24,
  created_at: "2026-11-01T00:00:00Z",
  ...extra,
});

const me = (role: string) => ({
  id: 1,
  email: "u@essivivi.test",
  phone: null,
  first_name: "Ama",
  last_name: "K",
  full_name: "Ama K",
  role: { code: role, name: role },
  is_active: true,
  email_verified: true,
  two_factor_enabled: false,
  created_at: "2026-11-01T00:00:00Z",
  last_login: null,
});

let drinks: ReturnType<typeof drink>[];
let calls: Array<{ method: string; path: string; body?: unknown }>;

function mockApi(role: string) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = new URL(String(url)).pathname.replace(/^\/api\/v1/, "");
      const method = init.method ?? "GET";
      calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : undefined });
      if (path === "/auth/refresh") return json({ access: "A" });
      if (path === "/me") return json(me(role));
      if (path === "/drinks" && method === "GET") return json(drinks);
      if (path === "/drinks" && method === "POST") return json(drink(99, "Nouvelle"), 201);
      if (path.endsWith("/deactivate")) return json({ ...drinks[0], is_available: false });
      return json({ detail: "introuvable" }, 404);
    }),
  );
}

function renderPage() {
  tokenStore.setRefresh("R");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>
          <DrinksPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  tokenStore.clear();
  drinks = [
    drink(1, "Coca-Cola 33cl"),
    drink(2, "Eau minérale 1,5L", { drink_type: "eau", price: "300.00", stock_quantity: 0 }),
    drink(3, "Ancienne bière", { drink_type: "biere", is_available: false }),
  ];
});
afterEach(() => vi.unstubAllGlobals());

describe("page Boissons", () => {
  it("affiche prix, état du stock et actions de gestion pour un gestionnaire", async () => {
    mockApi("gestionnaire");
    renderPage();
    expect(await screen.findByText("Coca-Cola 33cl")).toBeInTheDocument();
    expect(screen.getByText("24 en stock")).toBeInTheDocument();
    expect(screen.getByText("Rupture")).toBeInTheDocument();
    expect(screen.getByText("Indisponible")).toBeInTheDocument();
    expect(screen.getAllByText(/500\s*F\s*CFA/)).toHaveLength(2); // Coca-Cola et l'ancienne bière
    expect(screen.getByText(/300\s*F\s*CFA/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter une boisson" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Modifier" })).toHaveLength(3);
  });

  it("n'affiche aucune action de gestion ni quantité exacte à un client", async () => {
    mockApi("client");
    renderPage();
    expect(await screen.findByText("Coca-Cola 33cl")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter une boisson" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    expect(screen.queryByText("24 en stock")).not.toBeInTheDocument();
    expect(screen.getByText("En stock")).toBeInTheDocument();
  });

  it("filtre par nom côté client et par type côté serveur", async () => {
    mockApi("gestionnaire");
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Coca-Cola 33cl");

    await user.type(screen.getByLabelText("Rechercher"), "eau");
    expect(screen.queryByText("Coca-Cola 33cl")).not.toBeInTheDocument();
    expect(screen.getByText("Eau minérale 1,5L")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Type"), "biere");
    await vi.waitFor(() => expect(calls.some((c) => c.path === "/drinks" && c.method === "GET")).toBe(true));
  });

  it("crée une boisson avec la quantité initiale puis recharge la liste", async () => {
    mockApi("gestionnaire");
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Ajouter une boisson" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Nom"), "Fanta 33cl");
    await user.type(within(dialog).getByLabelText("Prix (F CFA)"), "450");
    await user.clear(within(dialog).getByLabelText("Quantité initiale en stock"));
    await user.type(within(dialog).getByLabelText("Quantité initiale en stock"), "48");
    await user.click(within(dialog).getByRole("button", { name: "Ajouter la boisson" }));

    await vi.waitFor(() => expect(calls.find((c) => c.method === "POST" && c.path === "/drinks")).toBeTruthy());
    const post = calls.find((c) => c.method === "POST" && c.path === "/drinks")!;
    expect(post.body).toMatchObject({ name: "Fanta 33cl", price: "450", initial_quantity: 48, is_available: true });
    const reloads = calls.filter((c) => c.method === "GET" && c.path === "/drinks");
    await vi.waitFor(() => expect(calls.filter((c) => c.method === "GET" && c.path === "/drinks").length).toBeGreaterThan(reloads.length - 1));
  });

  it("demande confirmation avant de désactiver une boisson", async () => {
    mockApi("admin");
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Coca-Cola 33cl");
    await user.click(screen.getAllByRole("button", { name: "Désactiver" })[0]!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/ne sera plus proposée/)).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith("/deactivate"))).toBe(false);

    await user.click(within(dialog).getByRole("button", { name: "Désactiver" }));
    await vi.waitFor(() => expect(calls.some((c) => c.path === "/drinks/1/deactivate" && c.method === "POST")).toBe(true));
  });
});
