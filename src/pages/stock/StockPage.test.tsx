import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "@/lib/tokens";
import { AuthProvider } from "@/auth/AuthContext";
import StockPage from "./StockPage";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const item = (id: number, name: string, quantity: number) => ({
  drink_id: id,
  drink_name: name,
  drink_type: "soda",
  price: "500.00",
  is_available: true,
  quantity,
  updated_at: "2026-11-20T10:00:00Z",
});

const ME = {
  id: 1, email: "g@essivivi.test", phone: null, first_name: "Ama", last_name: "K", full_name: "Ama K",
  role: { code: "gestionnaire", name: "Gestionnaire" }, is_active: true, email_verified: true,
  two_factor_enabled: false, created_at: "2026-11-01T00:00:00Z", last_login: null,
};

let calls: Array<{ method: string; path: string; query: string; body?: Record<string, unknown> }>;
let respond: (path: string, method: string, body?: Record<string, unknown>) => Response;

beforeEach(() => {
  localStorage.clear();
  tokenStore.clear();
  calls = [];
  respond = (path, method) => {
    if (path === "/stock" && method === "GET") return json([item(1, "Coca-Cola", 4), item(2, "Eau", 80)]);
    if (path === "/stock/movements")
      return json([
        { id: 1, drink: 1, drink_name: "Coca-Cola", delta: 24, reason: "reappro", sale: null, created_by: 1, created_by_name: "Ama K", created_at: "2026-11-20T10:00:00Z" },
        { id: 2, drink: 1, drink_name: "Coca-Cola", delta: -2, reason: "commande", sale: 7, created_by: null, created_by_name: null, created_at: "2026-11-20T11:00:00Z" },
      ]);
    return json({ detail: "introuvable" }, 404);
  };
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
      return respond(path, method, body);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  tokenStore.setRefresh("R");
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AuthProvider>
          <StockPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("page Stock", () => {
  it("liste les quantités et signale les stocks bas", async () => {
    renderPage();
    const row = (await screen.findByRole("row", { name: /Coca-Cola/ })) as HTMLElement;
    expect(within(row).getByText("4")).toHaveClass("text-amber-700");
    expect(within(screen.getByRole("row", { name: /Eau/ })).getByText("80")).not.toHaveClass("text-amber-700");
  });

  it("demande seulement les stocks bas au serveur quand on coche la case", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Coca-Cola");
    await user.click(screen.getByLabelText(/stocks bas/));
    await vi.waitFor(() => expect(calls.some((c) => c.path === "/stock" && c.query.includes("low_stock=true"))).toBe(true));
  });

  it("réapprovisionne avec une quantité positive puis recharge", async () => {
    respond = (path, method) => {
      if (path === "/stock/restock" && method === "POST") return json(item(1, "Coca-Cola", 28));
      return json([item(1, "Coca-Cola", 4)]);
    };
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Réapprovisionner Coca-Cola" }));
    const dialog = await screen.findByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "Réapprovisionner" });
    expect(submit).toBeDisabled(); // quantité vide

    await user.type(within(dialog).getByLabelText("Quantité à ajouter"), "24");
    await user.click(submit);
    await vi.waitFor(() => expect(calls.find((c) => c.path === "/stock/restock")?.body).toEqual({ drink_id: 1, quantity: 24 }));
  });

  it("ajuste avec une quantité absolue et affiche l'écart avant d'envoyer", async () => {
    respond = (path, method) => (path === "/stock/adjust" && method === "POST" ? json(item(1, "Coca-Cola", 10)) : json([item(1, "Coca-Cola", 4)]));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Ajuster Coca-Cola" }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Nouvelle quantité en stock");
    expect(input).toHaveValue(4);

    await user.clear(input);
    await user.type(input, "10");
    expect(within(dialog).getByText("Écart enregistré : +6")).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Motif (facultatif)"), "Inventaire");
    await user.click(within(dialog).getByRole("button", { name: "Ajuster le stock" }));
    await vi.waitFor(() =>
      expect(calls.find((c) => c.path === "/stock/adjust")?.body).toEqual({ drink_id: 1, quantity: 10, note: "Inventaire" }),
    );
  });

  it("affiche l'erreur du serveur dans la fenêtre sans la fermer", async () => {
    respond = (path, method) =>
      path === "/stock/restock" && method === "POST" ? json({ quantity: ["Assurez-vous que cette valeur est supérieure ou égale à 1."] }, 400) : json([item(1, "Coca-Cola", 4)]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Réapprovisionner Coca-Cola" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Quantité à ajouter"), "5");
    await user.click(within(dialog).getByRole("button", { name: "Réapprovisionner" }));
    expect((await within(dialog).findAllByRole("alert"))[0]).toHaveTextContent(/supérieure ou égale à 1/);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("affiche l'historique avec les variations signées et « Système » sans auteur", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("tab", { name: "Historique" }));
    expect(await screen.findByText("+24")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
    expect(screen.getByText("Système")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Réapprovisionnement")).toBeInTheDocument();
  });
});
