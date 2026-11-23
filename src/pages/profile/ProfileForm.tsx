import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { authApi } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import { Alert, Button, Card, Field } from "@/components/ui";
import { ApiError } from "@/lib/errors";

export function ProfileForm() {
  const { me, reloadMe } = useAuth();
  const [firstName, setFirstName] = useState(me?.first_name ?? "");
  const [lastName, setLastName] = useState(me?.last_name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");

  const save = useMutation({
    mutationFn: () => authApi.updateMe({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() }),
    onSuccess: reloadMe,
  });
  const error = save.error instanceof ApiError ? save.error : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <h2 className="font-semibold">Mes informations</h2>
        {error && Object.keys(error.fields).length === 0 && <Alert>{error.message}</Alert>}
        {save.isSuccess && <Alert tone="success">Informations enregistrées.</Alert>}
        <p className="text-sm text-slate-600">Adresse e-mail : {me?.email}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={error?.field("first_name")} required />
          <Field label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} error={error?.field("last_name")} required />
        </div>
        <Field label="Téléphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={error?.field("phone")} autoComplete="tel" />
        <Button type="submit" loading={save.isPending}>
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
