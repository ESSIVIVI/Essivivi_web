import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROLE_LABELS, invitationsApi } from "@/api/invitations";
import { Alert, Button, Field, PageSpinner } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthContext";

/** Lien reçu par e-mail : /invitation/:token. Étapes : vérifier le lien → recevoir un code → créer le mot de passe. */
export default function InvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const preview = useQuery({ queryKey: ["invitation", token], queryFn: () => invitationsApi.preview(token), retry: false });
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const sendCode = useMutation({ mutationFn: () => invitationsApi.sendCode(token), onSuccess: () => setCodeSent(true) });
  const activate = useMutation({
    mutationFn: () => invitationsApi.activate(token, code.trim(), password, confirm),
    onSuccess: async (result) => {
      await signIn(result);
      navigate("/profil", { replace: true }); // invite à activer le 2FA dès la première connexion
    },
  });

  if (preview.isPending) return <PageSpinner />;

  if (preview.isError) {
    const message = preview.error instanceof ApiError ? preview.error.message : "Impossible de vérifier ce lien.";
    return (
      <AuthLayout title="Invitation indisponible">
        <Alert>{message}</Alert>
        <p className="mt-4 text-center text-sm text-slate-600">
          Demandez à un administrateur de vous renvoyer une invitation. <Link to="/login" className="font-medium text-brand-700 hover:underline">Connexion</Link>
        </p>
      </AuthLayout>
    );
  }

  const invitation = preview.data;
  const error = [sendCode.error, activate.error].find((e): e is ApiError => e instanceof ApiError);

  function onActivate(event: FormEvent) {
    event.preventDefault();
    const different = password !== confirm;
    setMismatch(different);
    if (!different) activate.mutate();
  }

  return (
    <AuthLayout title={`Bienvenue ${invitation.first_name}`} subtitle={`Vous êtes invité(e) comme ${ROLE_LABELS[invitation.role] ?? invitation.role}.`}>
      {!codeSent ? (
        <div className="space-y-4">
          {error && <Alert>{error.message}</Alert>}
          <p className="text-sm text-slate-700">
            Nous allons envoyer un code de vérification à <strong>{invitation.email}</strong>.
          </p>
          <Button className="w-full" loading={sendCode.isPending} onClick={() => sendCode.mutate()}>
            Recevoir mon code
          </Button>
        </div>
      ) : (
        <form onSubmit={onActivate} className="space-y-4" noValidate>
          {error && <Alert>{error.message}</Alert>}
          <Alert tone="info">Code envoyé à {invitation.email}. Vous avez 3 essais.</Alert>
          <Field label="Code reçu par e-mail" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required />
          <Field label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={activate.error instanceof ApiError ? activate.error.field("password") : undefined} hint="8 caractères minimum." autoComplete="new-password" required minLength={8} />
          <Field label="Confirmer le mot de passe" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? "Les mots de passe ne correspondent pas." : undefined} autoComplete="new-password" required />
          <Button type="submit" className="w-full" loading={activate.isPending}>
            Créer mon compte
          </Button>
          <button type="button" className="w-full text-center text-sm text-brand-700 hover:underline" onClick={() => sendCode.mutate()}>
            Renvoyer le code
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
