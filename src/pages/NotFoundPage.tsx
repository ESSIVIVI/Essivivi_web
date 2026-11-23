import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl font-semibold text-brand-700">404</p>
      <p className="text-slate-600">Cette page n'existe pas.</p>
      <Link to="/" className="font-medium text-brand-700 hover:underline">
        Retour à l'accueil
      </Link>
    </main>
  );
}
