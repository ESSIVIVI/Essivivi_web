import { Link } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-4xl font-semibold text-brand-700">403</p>
      <p className="text-slate-600">Vous n'avez pas accès à cette page.</p>
      <Link to="/" className="font-medium text-brand-700 hover:underline">
        Retour à l'accueil
      </Link>
    </div>
  );
}
