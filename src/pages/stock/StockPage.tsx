import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { stockApi } from "@/api/stock";
import { Modal } from "@/components/Modal";
import { Alert, Button, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { drinkTypeLabel, formatDateTime } from "@/lib/format";
import { MovementsTable } from "./MovementsTable";
import { type StockAction, StockActionForm } from "./StockActionForm";

type Tab = "levels" | "history";

export default function StockPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("levels");
  const [lowOnly, setLowOnly] = useState(false);
  const [action, setAction] = useState<StockAction | null>(null);

  const stock = useQuery({ queryKey: ["stock", "levels", lowOnly], queryFn: ({ signal }) => stockApi.list(lowOnly, signal) });

  const tabClass = (active: boolean) =>
    `min-h-11 border-b-2 px-4 text-sm font-medium ${active ? "border-brand-700 text-brand-800" : "border-transparent text-slate-600 hover:text-slate-900"}`;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Stock</h1>

      <div role="tablist" aria-label="Sections du stock" className="flex border-b border-slate-200">
        <button type="button" role="tab" aria-selected={tab === "levels"} className={tabClass(tab === "levels")} onClick={() => setTab("levels")}>
          Niveaux
        </button>
        <button type="button" role="tab" aria-selected={tab === "history"} className={tabClass(tab === "history")} onClick={() => setTab("history")}>
          Historique
        </button>
      </div>

      {tab === "history" ? (
        <MovementsTable />
      ) : (
        <section aria-label="Niveaux de stock" className="space-y-4">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="size-5 accent-brand-700" />
            Afficher seulement les stocks bas (moins de 10)
          </label>

          {stock.isPending && (
            <div className="flex justify-center py-8 text-brand-700" role="status" aria-label="Chargement du stock">
              <Spinner className="size-6" />
            </div>
          )}
          {stock.isError && <Alert>{stock.error instanceof ApiError ? stock.error.message : "Impossible de charger le stock."}</Alert>}
          {stock.isSuccess && stock.data.length === 0 && <p className="py-6 text-center text-sm text-slate-600">Aucune boisson à afficher.</p>}

          {stock.isSuccess && stock.data.length > 0 && (
            <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Quantités en stock par boisson</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2">Boisson</th>
                    <th scope="col" className="px-4 py-2">Type</th>
                    <th scope="col" className="px-4 py-2 text-right">Quantité</th>
                    <th scope="col" className="hidden px-4 py-2 md:table-cell">Mis à jour</th>
                    <th scope="col" className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stock.data.map((item) => (
                    <tr key={item.drink_id}>
                      <th scope="row" className="px-4 py-2 font-medium">{item.drink_name}</th>
                      <td className="px-4 py-2 text-slate-600">{drinkTypeLabel(item.drink_type)}</td>
                      <td className={`px-4 py-2 text-right font-semibold tabular-nums ${item.quantity === 0 ? "text-red-700" : item.quantity < 10 ? "text-amber-700" : ""}`}>
                        {item.quantity}
                      </td>
                      <td className="hidden px-4 py-2 text-slate-600 md:table-cell">{formatDateTime(item.updated_at)}</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" className="min-h-9 px-3 py-1" aria-label={`Réapprovisionner ${item.drink_name}`} onClick={() => setAction({ kind: "restock", item })}>
                            Réapprovisionner
                          </Button>
                          <Button variant="ghost" className="min-h-9 px-3 py-1" aria-label={`Ajuster ${item.drink_name}`} onClick={() => setAction({ kind: "adjust", item })}>
                            Ajuster
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal open={action !== null} title={action?.kind === "restock" ? "Réapprovisionner" : "Ajuster le stock"} onClose={() => setAction(null)}>
        {action && (
          <StockActionForm
            action={action}
            onCancel={() => setAction(null)}
            onDone={async () => {
              setAction(null);
              await Promise.all([queryClient.invalidateQueries({ queryKey: ["stock"] }), queryClient.invalidateQueries({ queryKey: ["drinks"] })]);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
