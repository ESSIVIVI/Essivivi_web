import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { drinksApi } from "@/api/catalog";
import type { Drink } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { Modal } from "@/components/Modal";
import { Alert, Button, Card, Field, Select, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { DRINK_TYPES, drinkTypeLabel, formatPrice } from "@/lib/format";
import { DrinkForm } from "./DrinkForm";

type Editing = Drink | "new" | null;

function StockBadge({ drink, showQuantity }: { drink: Drink; showQuantity: boolean }) {
  if (!drink.is_available) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Indisponible</span>;
  if (drink.stock_quantity <= 0) return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">Rupture</span>;
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
      {showQuantity ? `${drink.stock_quantity} en stock` : "En stock"}
    </span>
  );
}

export default function DrinksPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const canManage = role === "admin" || role === "gestionnaire";

  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [toDeactivate, setToDeactivate] = useState<Drink | null>(null);

  const drinks = useQuery({ queryKey: ["drinks", type], queryFn: ({ signal }) => drinksApi.list(type || undefined, signal) });

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (drinks.data ?? []).filter((drink) => !needle || drink.name.toLowerCase().includes(needle));
  }, [drinks.data, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["drinks"] });

  const deactivate = useMutation({
    mutationFn: (drink: Drink) => drinksApi.deactivate(drink.id),
    onSuccess: async () => {
      setToDeactivate(null);
      await refresh();
    },
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Boissons</h1>
        {canManage && <Button onClick={() => setEditing("new")}>Ajouter une boisson</Button>}
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rechercher" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom de la boisson" />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          {DRINK_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {drinks.isPending && (
        <div className="flex justify-center py-10 text-brand-700" role="status" aria-label="Chargement des boissons">
          <Spinner className="size-6" />
        </div>
      )}
      {drinks.isError && (
        <Alert>
          {drinks.error instanceof ApiError ? drinks.error.message : "Impossible de charger les boissons."}{" "}
          <button type="button" className="font-medium underline" onClick={() => void drinks.refetch()}>
            Réessayer
          </button>
        </Alert>
      )}
      {drinks.isSuccess && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-600">Aucune boisson ne correspond à votre recherche.</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((drink) => (
          <li key={drink.id}>
            <Card className="flex h-full flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{drink.name}</h2>
                <StockBadge drink={drink} showQuantity={canManage} />
              </div>
              <p className="text-xs text-slate-500">{drinkTypeLabel(drink.drink_type)}</p>
              {drink.description && <p className="text-sm text-slate-600">{drink.description}</p>}
              <p className="mt-auto pt-2 text-lg font-semibold text-brand-800">{formatPrice(drink.price)}</p>
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" className="flex-1" onClick={() => setEditing(drink)}>
                    Modifier
                  </Button>
                  {drink.is_available && (
                    <Button variant="ghost" className="text-red-700" onClick={() => setToDeactivate(drink)}>
                      Désactiver
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <Modal open={editing !== null} title={editing === "new" ? "Ajouter une boisson" : "Modifier la boisson"} onClose={() => setEditing(null)}>
        <DrinkForm
          drink={editing && editing !== "new" ? editing : undefined}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      </Modal>

      <Modal open={toDeactivate !== null} title="Désactiver la boisson ?" onClose={() => setToDeactivate(null)}>
        <p className="text-sm text-slate-600">
          « {toDeactivate?.name} » ne sera plus proposée aux clients. Elle reste dans l'historique des ventes et peut être
          réactivée en la modifiant.
        </p>
        {deactivate.error instanceof ApiError && <Alert>{deactivate.error.message}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDeactivate(null)}>
            Annuler
          </Button>
          <Button variant="danger" loading={deactivate.isPending} onClick={() => toDeactivate && deactivate.mutate(toDeactivate)}>
            Désactiver
          </Button>
        </div>
      </Modal>
    </div>
  );
}
