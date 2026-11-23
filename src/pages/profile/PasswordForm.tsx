import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { authApi } from "@/api/auth";
import { Alert, Button, Card, Field } from "@/components/ui";
import { ApiError } from "@/lib/errors";

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next, confirm),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
    },
  });
  const error = change.error instanceof ApiError ? change.error : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const different = next !== confirm;
    setMismatch(different);
    if (!different) change.mutate();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <h2 className="font-semibold">Mot de passe</h2>
        {error && Object.keys(error.fields).length === 0 && <Alert>{error.message}</Alert>}
        {change.isSuccess && <Alert tone="success">Mot de passe modifié.</Alert>}
        <Field label="Mot de passe actuel" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} error={error?.field("current_password")} autoComplete="current-password" required />
        <Field label="Nouveau mot de passe" type="password" value={next} onChange={(e) => setNext(e.target.value)} error={error?.field("new_password")} hint="8 caractères minimum." autoComplete="new-password" required minLength={8} />
        <Field
          label="Confirmer le nouveau mot de passe"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Les mots de passe ne correspondent pas." : error?.field("confirm_password")}
          autoComplete="new-password"
          required
        />
        <Button type="submit" loading={change.isPending}>
          Changer le mot de passe
        </Button>
      </form>
    </Card>
  );
}
