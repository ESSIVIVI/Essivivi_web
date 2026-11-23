import { describe, expect, it } from "vitest";
import { navFor } from "./nav";

const labels = (role: Parameters<typeof navFor>[0]) => navFor(role).map((item) => item.label);

describe("navigation par rôle", () => {
  it("l'admin voit tout, y compris les invitations", () => {
    expect(labels("admin")).toEqual(["Accueil", "Boissons", "Stock", "Invitations", "Mon profil"]);
  });

  it("le gestionnaire voit le stock mais pas les invitations", () => {
    expect(labels("gestionnaire")).toContain("Stock");
    expect(labels("gestionnaire")).not.toContain("Invitations");
  });

  it("l'agent et le client n'ont ni stock ni invitations", () => {
    for (const role of ["agent", "client"] as const) {
      expect(labels(role)).toEqual(["Accueil", "Boissons", "Mon profil"]);
    }
  });

  it("sans rôle, aucun menu", () => {
    expect(navFor(null)).toEqual([]);
  });
});
