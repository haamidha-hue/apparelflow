"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import type { OrderRow } from "./types";

export default function OrderList({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function submitOrder(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}/submit`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not submit order");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="Cutting orders">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">All orders ({orders.length})</h2>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
        >
          Refresh list
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-100 p-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {orders.length === 0 ? (
        <p className="rounded-lg border border-gray-300 bg-white p-6 text-gray-900">
          No cutting orders yet. Click <strong>+ New Cutting Order</strong> to create one.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const canSubmit = o.status === "CUTTING_IN_PROGRESS" || o.status === "REJECTED";
            return (
              <li key={o.id} className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{o.orderNo}</p>
                    <p className="text-sm text-gray-700">
                      {o.recipeName} ({o.recipeCode})
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-gray-700">Batch qty</dt>
                    <dd className="font-medium text-gray-900">{o.targetQty}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-700">Fabric roll</dt>
                    <dd className="font-medium text-gray-900">{o.fabricRollId}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-700">Fabric used</dt>
                    <dd className="font-medium text-gray-900">{o.actualFabricYds} yds</dd>
                  </div>
                  <div>
                    <dt className="text-gray-700">Created</dt>
                    <dd className="font-medium text-gray-900">{o.createdAtLabel}</dd>
                  </div>
                </dl>

                {o.status === "REJECTED" && (
                  <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-900">
                    <strong>Rejected by verifier:</strong> {o.rejectionNote ?? "No reason recorded"}
                  </p>
                )}

                {canSubmit && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => submitOrder(o.id)}
                      disabled={busyId === o.id}
                      className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                      {busyId === o.id
                        ? "Submitting..."
                        : o.status === "REJECTED"
                        ? "Resubmit after re-cut"
                        : "Submit for verification"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}