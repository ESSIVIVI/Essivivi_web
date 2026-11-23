import { useMutation } from "@tanstack/react-query";
import QRCode from "qrcode";
import { type FormEvent, useEffect, useState } from "react";
import { authApi } from "@/api/auth";
import type { TotpSetup } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { Alert, Button, Card, Field } from "@/components/ui";
import { ApiError } from "@/lib/errors";

function QrImage({ uri }: { uri: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(uri, { margin: 1, width: 192 })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [uri]);
  return src ? <img src={src} alt="QR code à scanner avec votre application d'authentification" width={192} height={192} className="rounded-lg ring-1 ring-slate-200" /> : null;
}

export function TwoFactorSection() {
  const { me, reloadMe } = useAuth();
  const enabled = me?.two_factor_enabled ?? false;

  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);

  const start = useMutation({ mutationFn: authApi.setupTotp, onSuccess: setSetup });
  const confirm = useMutation({
    mutationFn: () => authApi.confirmTotp(code.trim()),
    onSuccess: async (result) => {
      setBackupCodes(result.backup_codes);
      setSetup(null);
      setCode("");
      await reloadMe();
    },
  });
  const disable = useMutation({
    mutationFn: () => authApi.disableTotp(code.trim()),
    onSuccess: async () => {
      setDisabling(false);
      setCode("");
      await reloadMe();
    },
  });

  const error = [start.error, confirm.error, disable.error].find((e): e is ApiError => e instanceof ApiError);

  function onConfirm(event: FormEvent) {
    event.preventDefault();
    (disabling ? disable : confirm).mutate();
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Double authentification (2FA)</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {enabled ? "Activée" : "Désactivée"}
        </span>
      </div>

      {error && <Alert>{error.message}</Alert>}

      {backupCodes && (
        <div className="space-y-3">
          <Alert tone="success">La double authentification est activée.</Alert>
          <p className="text-sm text-slate-700">
            Conservez ces codes de secours dans un endroit sûr : chacun ne fonctionne qu'une fois et <strong>ils ne seront plus affichés</strong>.
          </p>
          <ul aria-label="Codes de secours" className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-sm">
            {backupCodes.map((backup) => (
              <li key={backup}>{backup}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(backupCodes.join("\n"))}>
              Copier
            </Button>
            <Button onClick={() => setBackupCodes(null)}>J'ai conservé mes codes</Button>
          </div>
        </div>
      )}

      {!backupCodes && !enabled && !setup && (
        <>
          <p className="text-sm text-slate-600">Protégez votre compte avec un code temporaire généré par une application (Google Authenticator, Authy…).</p>
          <Button onClick={() => start.mutate()} loading={start.isPending}>
            Activer la double authentification
          </Button>
        </>
      )}

      {setup && (
        <form onSubmit={onConfirm} className="space-y-4" noValidate>
          <p className="text-sm text-slate-700">1. Scannez ce QR code avec votre application, ou saisissez la clé manuellement.</p>
          <QrImage uri={setup.uri} />
          <p className="text-sm">
            Clé : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono break-all">{setup.secret}</code>
          </p>
          <p className="text-sm text-slate-700">2. Saisissez le code à 6 chiffres affiché pour confirmer.</p>
          <Field label="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
          <div className="flex gap-2">
            <Button type="submit" loading={confirm.isPending}>
              Confirmer
            </Button>
            <Button variant="secondary" onClick={() => { setSetup(null); setCode(""); confirm.reset(); }}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {!backupCodes && enabled && !disabling && (
        <Button variant="secondary" onClick={() => { setDisabling(true); setCode(""); }}>
          Désactiver la double authentification
        </Button>
      )}

      {enabled && disabling && (
        <form onSubmit={onConfirm} className="space-y-4" noValidate>
          <Field label="Code à 6 chiffres" hint="Saisissez un code valide pour confirmer la désactivation." value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={disable.isPending}>
              Désactiver
            </Button>
            <Button variant="secondary" onClick={() => { setDisabling(false); setCode(""); disable.reset(); }}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
