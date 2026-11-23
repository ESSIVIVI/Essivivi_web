import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { stockApi } from "@/api/stock";
import type { StockItem } from "@/api/types";
import { Alert, Button, Field } from "@/components/ui";
import { ApiError } from "@/lib/errors";

export type StockAction = { kind: "restock" | "adjust"; item: StockItem };

/** Réapprovisionnement (+ quantité) ou ajustement (nouvelle quantité absolue après inventaire). */
export function StockActionForm({ action, onDone, onCancel }: { action: StockAction; onDone: () => void; onCancel: () => void }) {
  const isRestock = action.kind === "restock";
  const [quantity, setQuantity] = useState(isRestock ? "" : String(action.item.quantity));
  const [note, setNote] = useState("");

  const save = useMutation({
    mutationFn: () => {
      const value = Number(quantity);
      return isRestock
        ? stockApi.restock(action.item.drink_id, value)
        : stockApi.adjust(action.item.drink_id, value, note.trim());
    },
    onSuccess: onDone,
  });

  const error = save.error instanceof ApiError ? save.error : null;
  const parsed = Number(quantity);
  const invalid = quantity === "" || !Number.isInteger(parsed) || (isRestock ? parsed < 1 : parsed < 0);
  const preview = !isRestock && !invalid ? parsed - action.item.quantity : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!invalid) save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-slate-600">
        {action.item.drink_name} — stock actuel : <strong>{action.item.quantity}</strong>
      </p>
      {error && <Alert>{error.message}</Alert>}
      <Field
        label={isRestock ? "Quantité à ajouter" : "Nouvelle quantité en stock"}
        type="number"
        inputMode="numeric"
        min={isRestock ? 1 : 0}
        step={1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={error?.field("quantity")}
        hint={preview !== null && preview !== 0 ? `Écart enregistré : ${preview > 0 ? "+" : ""}${preview}` : undefined}
        autoFocus
        required
      />
      {!isRestock && <Field label="Motif (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Inventaire, casse, erreur de saisie…" />}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={save.isPending} disabled={invalid}>
          {isRestock ? "Réapprovisionner" : "Ajuster le stock"}
        </Button>
      </div>
    </form>
  );
}
