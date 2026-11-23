import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { invitationsApi } from "@/api/invitations";
import { Alert, Button, Field, Select } from "@/components/ui";
import { ApiError } from "@/lib/errors";

export function InviteForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"gestionnaire" | "agent">("agent");

  const invite = useMutation({
    mutationFn: () => invitationsApi.create({ email: email.trim(), first_name: firstName.trim(), last_name: lastName.trim(), role }),
    onSuccess: onDone,
  });
  const error = invite.error instanceof ApiError ? invite.error : null;
  const general = error && Object.keys(error.fields).length === 0 ? error.message : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    invite.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {general && <Alert>{general}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={error?.field("first_name")} autoFocus required />
        <Field label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} error={error?.field("last_name")} required />
      </div>
      <Field label="Adresse e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error?.field("email")} required />
      <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value as "gestionnaire" | "agent")} error={error?.field("role")}>
        <option value="agent">Agent</option>
        <option value="gestionnaire">Gestionnaire</option>
      </Select>
      <p className="text-sm text-slate-600">Un lien d'activation valable quelques jours sera envoyé à cette adresse.</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={invite.isPending}>
          Envoyer l'invitation
        </Button>
      </div>
    </form>
  );
}
