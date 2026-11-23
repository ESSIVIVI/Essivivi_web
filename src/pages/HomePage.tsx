import { Link } from "react-router-dom";
import { Card } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { navFor } from "@/layout/nav";

const DESCRIPTIONS: Record<string, string> = {
  "/boissons": "Catalogue des boissons et des prix.",
  "/stock": "Quantités en stock, réapprovisionnement et historique.",
  "/invitations": "Inviter des gestionnaires et des agents.",
  "/profil": "Vos informations, mot de passe et double authentification.",
};

export default function HomePage() {
  const { me, role } = useAuth();
  const shortcuts = navFor(role).filter((item) => item.to !== "/");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Bonjour {me?.first_name}</h1>
        <p className="mt-1 text-sm text-slate-600">Que souhaitez-vous faire ?</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {shortcuts.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
              <Card className="h-full transition-shadow hover:shadow-md">
                <h2 className="font-medium text-brand-800">{item.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{DESCRIPTIONS[item.to]}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
