import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "@/lib/tokens";
import { AuthProvider } from "./AuthContext";
import LoginPage from "./LoginPage";
import { RequireAuth } from "./RequireAuth";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const ME = {
  id: 1,
  email: "gestionnaire@essivivi.test",
  phone: null,
  first_name: "Ama",
  last_name: "K",
  full_name: "Ama K",
  role: { code: "gestionnaire", name: "Gestionnaire" },
  is_active: true,
  email_verified: true,
  two_factor_enabled: true,
  created_at: "2026-11-01T00:00:00Z",
  last_login: null,
};
const SUCCESS = { access: "A", refresh: "R", user: { id: 1, email: ME.email, first_name: "Ama", last_name: "K", role: "gestionnaire", two_factor_enabled: true } };

let fetchMock: ReturnType<typeof vi.fn>;

function renderApp(initial = "/") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>Espace protégé</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  tokenStore.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("connexion", () => {
  it("redirige un visiteur anonyme vers /login", async () => {
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
  });

  it("connecte sans 2FA puis affiche l'espace protégé", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith("/auth/login")) return json(SUCCESS);
      if (String(url).endsWith("/me")) return json({ ...ME, two_factor_enabled: false });
      return json({}, 404);
    });
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Adresse e-mail"), "gestionnaire@essivivi.test");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByText("Espace protégé")).toBeInTheDocument();
    expect(tokenStore.getAccess()).toBe("A");
    expect(tokenStore.getRefresh()).toBe("R");
  });

  it("passe par l'étape 2FA quand le serveur la demande", async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      const path = String(url);
      if (path.endsWith("/auth/login")) return json({ two_factor_required: true, email: ME.email });
      if (path.endsWith("/auth/2fa/verify")) {
        const body = JSON.parse(String(init.body)) as { totp_code: string };
        return body.totp_code === "123456" ? json(SUCCESS) : json({ detail: "Code 2FA invalide ou expiré." }, 401);
      }
      if (path.endsWith("/me")) return json(ME);
      return json({}, 404);
    });
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Adresse e-mail"), ME.email);
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("heading", { name: "Vérification en deux étapes" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Code à 6 chiffres"), "000000");
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Code 2FA invalide ou expiré.");

    await user.clear(screen.getByLabelText("Code à 6 chiffres"));
    await user.type(screen.getByLabelText("Code à 6 chiffres"), "123456");
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(await screen.findByText("Espace protégé")).toBeInTheDocument();
  });

  it("affiche l'erreur du serveur pour de mauvais identifiants", async () => {
    fetchMock.mockResolvedValue(json({ non_field_errors: ["Identifiants invalides."] }, 400));
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Adresse e-mail"), "x@y.z");
    await user.type(screen.getByLabelText("Mot de passe"), "mauvais");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Identifiants invalides.");
  });

  it("reprend la session au rechargement grâce au jeton refresh", async () => {
    tokenStore.setRefresh("R");
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith("/auth/refresh")) return json({ access: "A2" });
      if (String(url).endsWith("/me")) return json(ME);
      return json({}, 404);
    });
    renderApp("/");
    expect(await screen.findByText("Espace protégé")).toBeInTheDocument();
    await waitFor(() => expect(tokenStore.getAccess()).toBe("A2"));
  });
});
