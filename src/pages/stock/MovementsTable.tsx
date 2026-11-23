import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MOVEMENT_REASONS, reasonLabel, stockApi } from "@/api/stock";
import { Alert, Select, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

export function MovementsTable() {
  const [reason, setReason] = useState("");
  const movements = useQuery({
    queryKey: ["stock", "movements", reason],
    queryFn: ({ signal }) => stockApi.movements({ reason: reason || undefined }, signal),
  });

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select label="Motif" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Tous les motifs</option>
          {MOVEMENT_REASONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {movements.isPending && (
        <div className="flex justify-center py-8 text-brand-700" role="status" aria-label="Chargement de l'historique">
          <Spinner className="size-6" />
        </div>
      )}
      {movements.isError && <Alert>{movements.error instanceof ApiError ? movements.error.message : "Impossible de charger l'historique."}</Alert>}
      {movements.isSuccess && movements.data.length === 0 && <p className="py-6 text-center text-sm text-slate-600">Aucun mouvement.</p>}

      {movements.isSuccess && movements.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Historique des mouvements de stock</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-2">Date</th>
                <th scope="col" className="px-4 py-2">Boisson</th>
                <th scope="col" className="px-4 py-2 text-right">Variation</th>
                <th scope="col" className="px-4 py-2">Motif</th>
                <th scope="col" className="px-4 py-2">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.data.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-slate-600">{formatDateTime(movement.created_at)}</td>
                  <td className="px-4 py-2">{movement.drink_name}</td>
                  <td className={`px-4 py-2 text-right font-medium tabular-nums ${movement.delta > 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </td>
                  <td className="px-4 py-2">{reasonLabel(movement.reason)}</td>
                  <td className="px-4 py-2 text-slate-600">{movement.created_by_name ?? "Système"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
