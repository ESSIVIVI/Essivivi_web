import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "@/lib/tokens";
import { AuthProvider } from "@/auth/AuthContext";
import ProfilePage from "./ProfilePage";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async () => "data:image/png;base64,AAAA") } }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let twoFactor: boolean;
let calls: Array<{ method: string; path: string; body?: Record<string, unknown> }>;
let overrides: Record<string, (body?: Record<string, unknown>) => Response>;

const me = () => ({
  id: 1, email: "u@essivivi.test", phone: "+22890000000", first_name: "Ama", last_name: "K", full_name: "Ama K",
  role: { code: "gestionnaire", name: "Gestionnaire" }, is_active: true, email_verified: true,
  two_factor_enabled: twoFactor, created_at: "2026-11-01T00:00:00Z", last_login: null,
});

beforeEach(() => {
  localStorage.clear();
  tokenStore.clear();
  twoFactor = false;
  calls = [];
  overrides = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = new URL(String(url)).pathname.replace(/^\/api\/v1/, "");
      const method = init.method ?? "GET";
      const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
      calls.push({ method, path, body });
      if (path === "/auth/refresh") return json({ access: "A" });
      if (path === "/me" && method === "GET") return json(me());
      const handler = overrides[`${method} ${path}`];
      return handler ? handler(body) : json({ detail: "introuvable" }, 404);
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
          <ProfilePage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("page Profil", () => {
  it("préremplit puis enregistre les informations", async () => {
    overrides["PATCH /me"] = () => json(me());
    const user = userEvent.setup();
    renderPage();
    const first = await screen.findByLabelText("Prénom");
    expect(first).toHaveValue("Ama");
    await user.clear(first);
    await user.type(first, "Akossiwa");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Informations enregistrées.")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "PATCH")?.body).toMatchObject({ first_name: "Akossiwa", last_name: "K" });
  });

  it("refuse un mot de passe de confirmation différent sans appeler le serveur", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByLabelText("Mot de passe actuel"), "ancien123");
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "nouveau123");
    await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), "autre123");
    await user.click(screen.getByRole("button", { name: "Changer le mot de passe" }));
    expect(await screen.findByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/auth/password/change")).toBe(false);
  });

  it("affiche l'erreur du serveur sous le champ du mot de passe actuel", async () => {
    overrides["POST /auth/password/change"] = () => json({ current_password: ["Mot de passe actuel incorrect."] }, 400);
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByLabelText("Mot de passe actuel"), "faux");
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "nouveau123");
    await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), "nouveau123");
    await user.click(screen.getByRole("button", { name: "Changer le mot de passe" }));
    expect(await screen.findByText("Mot de passe actuel incorrect.")).toBeInTheDocument();
  });

  it("active le 2FA : QR code, confirmation, puis codes de secours affichés une seule fois", async () => {
    overrides["POST /auth/2fa/setup"] = () => json({ secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/ESSIVIVI:u?secret=JBSWY3DPEHPK3PXP" });
    overrides["POST /auth/2fa/confirm"] = (body) => {
      if (body?.code !== "123456") return json({ detail: "Code invalide." }, 400);
      twoFactor = true; // /me renverra désormais two_factor_enabled = true
      return json({ detail: "2FA activé.", backup_codes: ["aaaa1111bb", "cccc2222dd"] });
    };
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Activer la double authentification" }));
    expect(await screen.findByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    expect(await screen.findByAltText(/QR code/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Code à 6 chiffres"), "000000");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(await screen.findByText("Code invalide.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Code à 6 chiffres"));
    await user.type(screen.getByLabelText("Code à 6 chiffres"), "123456");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(await screen.findByText("aaaa1111bb")).toBeInTheDocument();
    expect(screen.getByText("cccc2222dd")).toBeInTheDocument();
    expect(screen.getByText("Activée")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "J'ai conservé mes codes" }));
    expect(screen.queryByText("aaaa1111bb")).not.toBeInTheDocument();
  });

  it("désactive le 2FA seulement après saisie d'un code", async () => {
    twoFactor = true;
    overrides["POST /auth/2fa/disable"] = () => {
      twoFactor = false;
      return json({ detail: "2FA désactivé." });
    };
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Désactiver la double authentification" }));
    await user.type(screen.getByLabelText("Code à 6 chiffres"), "123456");
    await user.click(screen.getByRole("button", { name: "Désactiver" }));
    expect(await screen.findByText("Désactivée")).toBeInTheDocument();
    expect(calls.find((c) => c.path === "/auth/2fa/disable")?.body).toEqual({ code: "123456" });
  });
});
