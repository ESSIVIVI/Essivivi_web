import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { isTwoFactorRequired } from "@/api/types";
import { Alert, Button, Field, PageSpinner } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthContext";

type Step = "credentials" | "totp" | "backup";

export default function LoginPage() {
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === "loading") return <PageSpinner />;
  if (status === "authenticated") return <Navigate to={from} replace />;

  async function run(action: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  const onCredentials = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await authApi.login(email.trim(), password);
      if (isTwoFactorRequired(result)) {
        setStep("totp");
        return;
      }
      await signIn(result);
      navigate(from, { replace: true });
    });
  };

  const onSecondFactor = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const value = code.trim();
      const result = step === "backup" ? await authApi.useBackupCode(email.trim(), value) : await authApi.verifyTotp(email.trim(), value);
      await signIn(result);
      navigate(from, { replace: true });
    });
  };

  if (step !== "credentials") {
    const isBackup = step === "backup";
    return (
      <AuthLayout
        title="Vérification en deux étapes"
        subtitle={isBackup ? "Saisissez l'un de vos codes de secours." : "Saisissez le code à 6 chiffres de votre application d'authentification."}
      >
        <form onSubmit={onSecondFactor} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field
            label={isBackup ? "Code de secours" : "Code à 6 chiffres"}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={isBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={isBackup ? 12 : 6}
          />
          <Button type="submit" loading={pending} className="w-full">
            Valider
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-brand-700 underline-offset-2 hover:underline"
              onClick={() => {
                setCode("");
                setError(null);
                setStep(isBackup ? "totp" : "backup");
              }}
            >
              {isBackup ? "Utiliser mon application" : "Utiliser un code de secours"}
            </button>
            <button
              type="button"
              className="text-slate-600 underline-offset-2 hover:underline"
              onClick={() => {
                setCode("");
                setError(null);
                setStep("credentials");
              }}
            >
              Retour
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Connexion" subtitle="Accédez à votre espace ESSIVIVI.">
      <form onSubmit={onCredentials} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
        <Field
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button type="submit" loading={pending} className="w-full">
          Se connecter
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          Créer un compte client
        </Link>
      </p>
    </AuthLayout>
  );
}
