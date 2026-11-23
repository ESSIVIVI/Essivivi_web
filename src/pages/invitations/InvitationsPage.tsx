import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ROLE_LABELS, STATUS_LABELS, invitationsApi } from "@/api/invitations";
import type { Invitation, InvitationStatus } from "@/api/types";
import { Modal } from "@/components/Modal";
import { Alert, Button, Select, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { InviteForm } from "./InviteForm";

const STATUS_STYLES: Record<InvitationStatus, string> = {
  en_attente: "bg-sky-50 text-sky-700",
  activee: "bg-emerald-50 text-emerald-700",
  expiree: "bg-slate-100 text-slate-600",
  annulee: "bg-slate-100 text-slate-600",
  bloquee: "bg-red-50 text-red-700",
};

export default function InvitationsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<InvitationStatus | "">("");
  const [inviting, setInviting] = useState(false);
  const [toCancel, setToCancel] = useState<Invitation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const invitations = useQuery({
    queryKey: ["invitations", status],
    queryFn: ({ signal }) => invitationsApi.list(status || undefined, signal),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["invitations"] });

  const resend = useMutation({
    mutationFn: (invitation: Invitation) => invitationsApi.resend(invitation.id),
    onSuccess: async (_data, invitation) => {
      setNotice(`Invitation renvoyée à ${invitation.email}.`);
      await refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: (invitation: Invitation) => invitationsApi.cancel(invitation.id),
    onSuccess: async () => {
      setToCancel(null);
      await refresh();
    },
  });

  const actionError = [resend.error, invitations.error].find((e): e is ApiError => e instanceof ApiError);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <Button onClick={() => setInviting(true)}>Inviter quelqu'un</Button>
      </header>

      <div className="max-w-xs">
        <Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value as InvitationStatus | "")}>
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS) as InvitationStatus[]).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {actionError && <Alert>{actionError.message}</Alert>}

      {invitations.isPending && (
        <div className="flex justify-center py-8 text-brand-700" role="status" aria-label="Chargement des invitations">
          <Spinner className="size-6" />
        </div>
      )}
      {invitations.isSuccess && invitations.data.length === 0 && <p className="py-6 text-center text-sm text-slate-600">Aucune invitation.</p>}

      {invitations.isSuccess && invitations.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Liste des invitations</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-2">Invité</th>
                <th scope="col" className="px-4 py-2">Rôle</th>
                <th scope="col" className="px-4 py-2">Statut</th>
                <th scope="col" className="hidden px-4 py-2 md:table-cell">Expire le</th>
                <th scope="col" className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.data.map((invitation) => {
                const pending = invitation.status === "en_attente";
                const canResend = pending || invitation.status === "expiree" || invitation.status === "bloquee";
                return (
                  <tr key={invitation.id}>
                    <th scope="row" className="px-4 py-2 font-normal">
                      <span className="block font-medium">{invitation.first_name} {invitation.last_name}</span>
                      <span className="block text-xs text-slate-500">{invitation.email}</span>
                    </th>
                    <td className="px-4 py-2">{ROLE_LABELS[invitation.role] ?? invitation.role}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[invitation.status]}`}>{STATUS_LABELS[invitation.status]}</span>
                    </td>
                    <td className="hidden px-4 py-2 text-slate-600 md:table-cell">{formatDateTime(invitation.expires_at)}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        {canResend && (
                          <Button variant="secondary" className="min-h-9 px-3 py-1" aria-label={`Renvoyer à ${invitation.email}`} loading={resend.isPending && resend.variables?.id === invitation.id} onClick={() => { setNotice(null); resend.mutate(invitation); }}>
                            Renvoyer
                          </Button>
                        )}
                        {pending && (
                          <Button variant="ghost" className="min-h-9 px-3 py-1 text-red-700" aria-label={`Annuler l'invitation de ${invitation.email}`} onClick={() => setToCancel(invitation)}>
                            Annuler
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={inviting} title="Inviter quelqu'un" onClose={() => setInviting(false)}>
        <InviteForm
          onCancel={() => setInviting(false)}
          onDone={async () => {
            setInviting(false);
            setNotice("Invitation envoyée.");
            await refresh();
          }}
        />
      </Modal>

      <Modal open={toCancel !== null} title="Annuler l'invitation ?" onClose={() => setToCancel(null)}>
        <p className="text-sm text-slate-600">Le lien envoyé à {toCancel?.email} ne fonctionnera plus.</p>
        {cancel.error instanceof ApiError && <Alert>{cancel.error.message}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToCancel(null)}>
            Retour
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={() => toCancel && cancel.mutate(toCancel)}>
            Annuler l'invitation
          </Button>
        </div>
      </Modal>
    </div>
  );
}
