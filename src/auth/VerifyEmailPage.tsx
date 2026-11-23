import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { Alert, Button, Field } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthContext";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(await authApi.verifyEmail(email.trim(), code.trim()));
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout title="Vérifiez votre e-mail" subtitle="Saisissez le code à 6 chiffres reçu par e-mail (valable 15 minutes).">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Adresse e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <Field label="Code de vérification" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required hint="3 essais maximum." />
        <Button type="submit" loading={pending} className="w-full">
          Vérifier
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthLayout>
  );
}
