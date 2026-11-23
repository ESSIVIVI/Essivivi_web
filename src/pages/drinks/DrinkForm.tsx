import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { drinksApi } from "@/api/catalog";
import type { Drink } from "@/api/types";
import { Alert, Button, Field, Select } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { DRINK_TYPES } from "@/lib/format";

/** Création (sans `drink`) ou modification d'une boisson. */
export function DrinkForm({ drink, onSaved, onCancel }: { drink?: Drink; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(drink?.name ?? "");
  const [drinkType, setDrinkType] = useState(drink?.drink_type ?? "soda");
  const [price, setPrice] = useState(drink ? String(Number(drink.price)) : "");
  const [description, setDescription] = useState(drink?.description ?? "");
  const [available, setAvailable] = useState(drink?.is_available ?? true);
  const [quantity, setQuantity] = useState("0");

  const save = useMutation({
    mutationFn: () => {
      const base = { name: name.trim(), drink_type: drinkType, price, description: description.trim(), is_available: available };
      return drink ? drinksApi.update(drink.id, base) : drinksApi.create({ ...base, initial_quantity: Number(quantity) || 0 });
    },
    onSuccess: onSaved,
  });

  const error = save.error instanceof ApiError ? save.error : null;
  const general = error && Object.keys(error.fields).length === 0 ? error.message : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {general && <Alert>{general}</Alert>}
      <Field label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={error?.field("name")} autoFocus required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Type" value={drinkType} onChange={(e) => setDrinkType(e.target.value)} error={error?.field("drink_type")}>
          {DRINK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        <Field label="Prix (F CFA)" type="number" inputMode="decimal" min={0} step="1" value={price} onChange={(e) => setPrice(e.target.value)} error={error?.field("price")} required />
      </div>
      <Field label="Description" value={description} onChange={(e) => setDescription(e.target.value)} error={error?.field("description")} />
      {!drink && (
        <Field label="Quantité initiale en stock" type="number" inputMode="numeric" min={0} step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} error={error?.field("initial_quantity")} />
      )}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="size-5 accent-brand-700" />
        Disponible à la vente
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={save.isPending}>
          {drink ? "Enregistrer" : "Ajouter la boisson"}
        </Button>
      </div>
    </form>
  );
}
