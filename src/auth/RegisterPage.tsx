import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import type { EstablishmentType, RegisterPayload } from "@/api/types";
import { Alert, Button, Field, Select } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { AuthLayout } from "./AuthLayout";

const ESTABLISHMENTS: Array<{ value: EstablishmentType; label: string }> = [
  { value: "bar", label: "Bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cafeteria", label: "Cafétéria" },
  { value: "boutique", label: "Boutique" },
  { value: "autre", label: "Autre" },
];

const EMPTY: RegisterPayload = {
  email: "",
  phone: "",
  password: "",
  confirm_password: "",
  first_name: "",
  last_name: "",
  business_name: "",
  establishment_type: "bar",
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterPayload>(EMPTY);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [pending, setPending] = useState(false);

  const set =
    <K extends keyof RegisterPayload>(key: K) =>
    (value: RegisterPayload[K]) =>
      setForm((current) => ({ ...current, [key]: value }));

  const fieldError = (name: string) => (error instanceof ApiError ? error.field(name) : undefined);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirm_password) {
      setError(new ApiError(400, "Les mots de passe ne correspondent pas.", { confirm_password: ["Les mots de passe ne correspondent pas."] }));
      return;
    }
    setPending(true);
    try {
      const result = await authApi.register({ ...form, email: form.email.trim(), phone: form.phone.trim() });
      navigate(`/verify-email?email=${encodeURIComponent(result.email)}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  // Message général seulement si l'erreur n'est pas déjà affichée sous un champ.
  const general =
    typeof error === "string" ? error : error && Object.keys(error.fields).length === 0 ? error.message : null;

  return (
    <AuthLayout title="Créer un compte client" subtitle="Un code de vérification sera envoyé à votre adresse e-mail.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {general && <Alert>{general}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} error={fieldError("first_name")} autoComplete="given-name" required />
          <Field label="Nom" value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} error={fieldError("last_name")} autoComplete="family-name" required />
        </div>
        <Field label="Adresse e-mail" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} error={fieldError("email")} autoComplete="email" required />
        <Field label="Téléphone" type="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} error={fieldError("phone")} autoComplete="tel" placeholder="+228 90 00 00 00" required />
        <Field label="Nom de l'établissement" value={form.business_name} onChange={(e) => set("business_name")(e.target.value)} error={fieldError("business_name")} required />
        <Select label="Type d'établissement" value={form.establishment_type} onChange={(e) => set("establishment_type")(e.target.value as EstablishmentType)} error={fieldError("establishment_type")}>
          {ESTABLISHMENTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Field label="Mot de passe" type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} error={fieldError("password")} hint="8 caractères minimum." autoComplete="new-password" required minLength={8} />
        <Field label="Confirmer le mot de passe" type="password" value={form.confirm_password} onChange={(e) => set("confirm_password")(e.target.value)} error={fieldError("confirm_password")} autoComplete="new-password" required />
        <Button type="submit" loading={pending} className="w-full">
          Créer mon compte
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Déjà inscrit ?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
