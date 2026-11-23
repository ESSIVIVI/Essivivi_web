import { Button, Card } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";

/** Page d'accueil provisoire : remplacée par le tableau de bord à l'étape suivante. */
export default function HomePage() {
  const { me, signOut } = useAuth();
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <Card className="space-y-3">
        <h1 className="text-xl font-semibold">Bonjour {me?.first_name}</h1>
        <p className="text-sm text-slate-600">
          Connecté en tant que {me?.role.name} ({me?.email}).
        </p>
        <Button variant="secondary" onClick={() => void signOut()}>
          Se déconnecter
        </Button>
      </Card>
    </main>
  );
}
