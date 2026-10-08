"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TrafficLight from "@/components/TrafficLight";
import type { SewingOrder } from "./types";

export default function SewingQueue({
  queue,
  started,
}: {
  queue: SewingOrder[];
  started: SewingOrder[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function start(order: SewingOrder) {
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/sewing/${order.id}/start`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not start sewing");
        return;
      }
      setNotice(`${order.orderNo}: sewing assembly started.`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section aria-label="Sewing queue" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Verified batches ready for sewing ({queue.length})
          </h2>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
          >
            Refresh queue
          </button>
        </div>

        <div aria-live="polite">
          {notice && (
            <p className="rounded-md border border-blue-700 bg-blue-50 p-3 text-sm font-medium text-blue-900">
              {notice}
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-red-100 p-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {queue.length === 0 ? (
          <p className="rounded-lg border border-gray-300 bg-white p-6 text-gray-900">
            No verified batches yet. Batches appear here after the Cutting Verifier approves them.
          </p>
        ) : (
          queue.map((o) => (
            <article key={o.id} className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-mono text-base font-semibold text-gray-900">{o.orderNo}</h3>
                  <p className="text-sm text-gray-700">
                    {o.recipeName} ({o.recipeCode}) - {o.targetQty} garments
                  </p>
                </div>
                <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">
                  Verified
                </span>
              </header>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-gray-700">Verified by</dt>
                  <dd className="font-medium text-gray-900">{o.verifiedBy}</dd>
                </div>
                <div>
                  <dt className="text-gray-700">Verified at</dt>
                  <dd className="font-medium text-gray-900">{o.verifiedAtLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-700">Fabric roll</dt>
                  <dd className="font-medium text-gray-900">{o.fabricRollId}</dd>
                </div>
                <div>
                  <dt className="text-gray-700">Fabric wastage (cap {o.wastageCap}%)</dt>
                  <dd
                    className={`font-medium ${o.wastagePct > o.wastageCap ? "text-red-800" : "text-gray-900"}`}
                  >
                    {o.wastagePct}% ({o.actualFabricYds} of {o.expectedFabricYds} yds)
                  </dd>
                </div>
              </dl>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <caption className="sr-only">Verified piece counts for {o.orderNo}</caption>
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-700">
                      <th scope="col" className="py-2 pr-3 font-semibold">Component</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">Expected</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">Counted</th>
                      <th scope="col" className="py-2 font-semibold">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((i) => (
                      <tr key={i.id} className="border-b border-gray-200">
                        <td className="py-2 pr-3 text-gray-900">{i.componentName}</td>
                        <td className="py-2 pr-3 text-gray-900">{i.expectedQty}</td>
                        <td className="py-2 pr-3 font-semibold text-gray-900">{i.actualQty}</td>
                        <td className="py-2">
                          <TrafficLight status={i.status} diff={i.actualQty - i.expectedQty} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => start(o)}
                disabled={busyId === o.id}
                className="mt-4 rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {busyId === o.id ? "Starting..." : "Start Sewing Assembly"}
              </button>
            </article>
          ))
        )}
      </section>

      <section aria-label="Sewing in progress" className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Sewing in progress ({started.length})</h2>
        {started.length === 0 ? (
          <p className="text-sm text-gray-900">No batches have started sewing yet.</p>
        ) : (
          <ul className="space-y-2">
            {started.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white p-3 text-sm"
              >
                <span className="font-mono font-semibold text-gray-900">{o.orderNo}</span>
                <span className="text-gray-700">
                  {o.recipeName} - {o.targetQty} garments - verified by {o.verifiedBy}
                </span>
                <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-900">
                  Sewing started
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}