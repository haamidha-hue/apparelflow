"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TrafficLight from "@/components/TrafficLight";
import { checkApproval, getItemStatus } from "@/lib/domain";
import { inputClass } from "@/lib/ui";
import type { VerifyOrder } from "./types";

const MAX_COUNT = 1000000;

// Whole numbers only. Empty = "not counted yet" (no error, but not approvable).
function parseCount(raw: string): { value: number | null; error?: string } {
  const t = raw.trim();
  if (t === "") return { value: null };
  if (!/^\d+$/.test(t)) {
    return { value: null, error: "Whole numbers only (no negatives, decimals or letters)" };
  }
  const n = Number(t);
  if (n > MAX_COUNT) return { value: null, error: "Number is too large" };
  return { value: n };
}

type Busy = "save" | "approve" | "reject" | null;

export default function VerifyCard({
  order,
  onDecision,
}: {
  order: VerifyOrder;
  onDecision: (message: string) => void;
}) {
  const router = useRouter();

  // Text the verifier has typed, keyed by componentId.
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((i) => [i.componentId, i.actualQty === null ? "" : String(i.actualQty)])
    )
  );
  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");

  // ---- Everything below is derived from the inputs on every render ----
  const rows = order.items.map((item) => {
    const raw = inputs[item.componentId] ?? "";
    const parsed = parseCount(raw);
    return {
      item,
      raw,
      parsed,
      status: parsed.value === null ? null : getItemStatus(item.expectedQty, parsed.value),
      diff: parsed.value === null ? null : parsed.value - item.expectedQty,
      // Differs from what the server has saved?
      dirty: raw.trim() !== (item.actualQty === null ? "" : String(item.actualQty)),
    };
  });

  const allCounted = rows.every((r) => r.parsed.value !== null);
  const hasInvalid = rows.some((r) => r.parsed.error);
  const dirty = rows.some((r) => r.dirty);
  const redNames = rows.filter((r) => r.status === "RED").map((r) => r.item.componentName);

  // Same rule the server uses (lib/domain.ts).
  const approval = checkApproval(
    rows.map((r) => ({ expectedQty: r.item.expectedQty, actualQty: r.parsed.value }))
  );

  const locked = busy !== null;
  const canSave = allCounted && !hasInvalid && dirty && !locked;
  const canApprove = approval.ok && !dirty && !locked;

  let hint: string;
  if (redNames.length > 0) {
    hint = `Approval blocked: shortage on ${redNames.join(", ")}. Reject the batch for re-cutting.`;
  } else if (!approval.ok) {
    hint = "Count every component to enable approval.";
  } else if (dirty) {
    hint = "Save your counts to enable approval.";
  } else {
    hint = "All components verified. Ready to approve.";
  }

  const noteError =
    note.trim().length < 5 ? "Enter a rejection reason (at least 5 characters)" : "";

  // ---- Server calls ----
  async function post(path: string, body?: unknown) {
    const res = await fetch(`/api/orders/${order.id}/${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function saveCounts() {
    setBusy("save");
    setError("");
    try {
      const { res, data } = await post("counts", {
        counts: rows.map((r) => ({
          componentId: r.item.componentId,
          actualQty: r.parsed.value as number,
        })),
      });
      if (!res.ok) {
        setError(data.error ?? "Could not save counts");
        return;
      }
      // Tidy what was typed (e.g. "050" becomes "50")
      setInputs(
        Object.fromEntries(rows.map((r) => [r.item.componentId, String(r.parsed.value)]))
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    setError("");
    try {
      const { res, data } = await post("approve");
      if (!res.ok) {
        setError(data.error ?? "Approval failed");
        return;
      }
      onDecision(`${order.orderNo} approved and released to the Sewing Queue.`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setNoteTouched(true);
    if (noteError) return;
    setBusy("reject");
    setError("");
    try {
      const { res, data } = await post("reject", { note: note.trim() });
      if (!res.ok) {
        setError(data.details?.note?.[0] ?? data.error ?? "Rejection failed");
        return;
      }
      onDecision(`${order.orderNo} rejected and returned to the Cutting Supervisor.`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const overCap = order.wastagePct > order.wastageCap;

  return (
    <article className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-mono text-base font-semibold text-gray-900">{order.orderNo}</h2>
          <p className="text-sm text-gray-700">
            {order.recipeName} ({order.recipeCode}) - {order.targetQty} garments
          </p>
        </div>
        <p className="text-sm text-gray-700">Submitted {order.createdAtLabel}</p>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-gray-700">Fabric roll</dt>
          <dd className="font-medium text-gray-900">{order.fabricRollId}</dd>
        </div>
        <div>
          <dt className="text-gray-700">Expected fabric</dt>
          <dd className="font-medium text-gray-900">{order.expectedFabricYds} yds</dd>
        </div>
        <div>
          <dt className="text-gray-700">Actual fabric</dt>
          <dd className="font-medium text-gray-900">{order.actualFabricYds} yds</dd>
        </div>
        <div>
          <dt className="text-gray-700">Wastage (cap {order.wastageCap}%)</dt>
          <dd className={`font-medium ${overCap ? "text-red-800" : "text-gray-900"}`}>
            {order.wastagePct}%{overCap ? " - over cap" : ""}
          </dd>
        </div>
      </dl>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Component counts for {order.orderNo}</caption>
          <thead>
            <tr className="border-b border-gray-300 text-gray-700">
              <th scope="col" className="py-2 pr-3 font-semibold">Component</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Expected</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Counted</th>
              <th scope="col" className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const inputId = `${order.id}-${r.item.componentId}`;
              return (
                <tr key={r.item.componentId} className="border-b border-gray-200 align-top">
                  <td className="py-2 pr-3 text-gray-900">
                    {r.item.componentName}{" "}
                    <span className="text-gray-700">({r.item.piecesPerGarment} per garment)</span>
                  </td>
                  <td className="py-2 pr-3 font-semibold text-gray-900">{r.item.expectedQty}</td>
                  <td className="py-2 pr-3">
                    <label htmlFor={inputId} className="sr-only">
                      Counted quantity for {r.item.componentName}
                    </label>
                    <div className="w-28">
                      <input
                        id={inputId}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Count"
                        value={r.raw}
                        disabled={locked}
                        onChange={(e) => {
                          setInputs((prev) => ({ ...prev, [r.item.componentId]: e.target.value }));
                          setError("");
                        }}
                        className={inputClass(!!r.parsed.error)}
                        aria-invalid={!!r.parsed.error}
                      />
                    </div>
                    {r.parsed.error && (
                      <p className="mt-1 max-w-[16rem] text-xs text-red-700">{r.parsed.error}</p>
                    )}
                  </td>
                  <td className="py-2">
                    <TrafficLight status={r.status} diff={r.diff} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveCounts}
          disabled={!canSave}
          className="rounded-md border border-blue-700 bg-white px-4 py-2 font-semibold text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "save" ? "Saving..." : "Save counts"}
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={!canApprove}
          className="rounded-md bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700"
        >
          {busy === "approve" ? "Approving..." : "Approve batch"}
        </button>
      </div>
      <p className={`mt-2 text-sm ${redNames.length > 0 ? "font-medium text-red-800" : "text-gray-900"}`}>
        {hint}
      </p>

      <div className="mt-5 border-t border-gray-300 pt-4">
        <label htmlFor={`${order.id}-note`} className="block text-sm font-medium text-gray-900">
          Rejection reason (required to reject)
        </label>
        <textarea
          id={`${order.id}-note`}
          rows={2}
          value={note}
          disabled={locked}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setNoteTouched(true)}
          placeholder="e.g. 2 cuffs have fabric defects, re-cut required"
          className={`mt-1 ${inputClass(noteTouched && !!noteError)}`}
          aria-invalid={noteTouched && !!noteError}
        />
        {noteTouched && noteError && <p className="mt-1 text-sm text-red-700">{noteError}</p>}
        <button
          type="button"
          onClick={reject}
          disabled={locked}
          className="mt-3 rounded-md bg-red-800 px-4 py-2 font-semibold text-white hover:bg-red-900 disabled:opacity-60"
        >
          {busy === "reject" ? "Rejecting..." : "Reject batch"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-100 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </article>
  );
}