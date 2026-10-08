"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { computeExpectedQty, computeWastagePct } from "@/lib/domain";
import { inputClass } from "@/lib/ui";
import type { RecipeOption } from "./types";

type Values = {
  recipeId: string;
  targetQty: string;
  fabricRollId: string;
  actualFabricYds: string;
};
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = { recipeId: "", targetQty: "", fabricRollId: "", actualFabricYds: "" };

// Mirrors the server rules (lib/validation.ts) for instant feedback.
// The server re-checks everything, so this is a convenience, not security.
function validate(v: Values): Errors {
  const e: Errors = {};

  if (!v.recipeId) e.recipeId = "Select a recipe";

  const qty = v.targetQty.trim();
  if (qty === "") e.targetQty = "Batch quantity is required";
  else if (!/^\d+$/.test(qty)) e.targetQty = "Enter a whole number (no decimals, negatives or letters)";
  else if (Number(qty) < 1) e.targetQty = "Batch quantity must be at least 1";
  else if (Number(qty) > 100000) e.targetQty = "Batch quantity is too large (max 100000)";

  const roll = v.fabricRollId.trim();
  if (roll === "") e.fabricRollId = "Fabric roll ID is required";
  else if (roll.length > 50) e.fabricRollId = "Fabric roll ID is too long (max 50)";

  const yds = v.actualFabricYds.trim();
  if (yds === "") e.actualFabricYds = "Fabric used is required";
  else if (!/^\d+(\.\d{1,2})?$/.test(yds)) e.actualFabricYds = "Enter a positive number, up to 2 decimals (e.g. 92.5)";
  else if (Number(yds) <= 0) e.actualFabricYds = "Fabric used must be greater than 0";

  return e;
}

// Defined OUTSIDE the main component on purpose. A component defined inside
// another one is re-created on every keystroke and the input loses focus.
function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CreateOrderModal({ recipes }: { recipes: RecipeOption[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const errors = validate(values);
  const recipe = recipes.find((r) => r.id === values.recipeId);
  const qty = errors.targetQty ? null : Number(values.targetQty);
  const yds = errors.actualFabricYds ? null : Number(values.actualFabricYds);
  const wastagePreview =
    recipe && qty !== null && yds !== null
      ? computeWastagePct(recipe.stdFabricYards, qty, yds)
      : null;

  // Show an error only after the field was touched or a submit was attempted.
  function errorFor(f: Field): string | undefined {
    const client = touched[f] || submitted ? errors[f] : undefined;
    return client ?? serverErrors[f]?.[0];
  }

  function aria(f: Field) {
    const hasError = !!errorFor(f);
    return {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? `${f}-error` : undefined,
    };
  }

  function setField(f: Field, v: string) {
    setValues((prev) => ({ ...prev, [f]: v }));
    setServerErrors({});
    setFormError("");
  }

  function touch(f: Field) {
    setTouched((t) => ({ ...t, [f]: true }));
  }

  function openModal() {
    setValues(EMPTY);
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
    setFormError("");
    dialogRef.current?.showModal();
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    setFormError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: values.recipeId,
          targetQty: Number(values.targetQty),
          fabricRollId: values.fabricRollId.trim(),
          actualFabricYds: Number(values.actualFabricYds),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setServerErrors(data.details ?? {});
        setFormError(data.error ?? "Could not create order");
        return;
      }

      dialogRef.current?.close();
      router.refresh(); // re-load the order list from the database
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
      >
        + New Cutting Order
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="create-order-title"
        className="m-auto w-full max-w-lg rounded-lg bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-6">
          <h2 id="create-order-title" className="text-lg font-bold text-gray-900">
            New Cutting Order
          </h2>

          <FormField id="recipeId" label="Recipe" error={errorFor("recipeId")}>
            <select
              id="recipeId"
              value={values.recipeId}
              onChange={(e) => setField("recipeId", e.target.value)}
              onBlur={() => touch("recipeId")}
              className={inputClass(!!errorFor("recipeId"))}
              {...aria("recipeId")}
            >
              <option value="">Select a recipe...</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.recipeCode})
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="targetQty" label="Target batch quantity (garments)" error={errorFor("targetQty")}>
            <input
              id="targetQty"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 50"
              value={values.targetQty}
              onChange={(e) => setField("targetQty", e.target.value)}
              onBlur={() => touch("targetQty")}
              className={inputClass(!!errorFor("targetQty"))}
              {...aria("targetQty")}
            />
          </FormField>

          <FormField id="fabricRollId" label="Fabric roll ID" error={errorFor("fabricRollId")}>
            <input
              id="fabricRollId"
              type="text"
              autoComplete="off"
              placeholder="e.g. FAB-ROLL-882"
              value={values.fabricRollId}
              onChange={(e) => setField("fabricRollId", e.target.value)}
              onBlur={() => touch("fabricRollId")}
              className={inputClass(!!errorFor("fabricRollId"))}
              {...aria("fabricRollId")}
            />
          </FormField>

          <FormField id="actualFabricYds" label="Actual fabric used (yards)" error={errorFor("actualFabricYds")}>
            <input
              id="actualFabricYds"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 92.5"
              value={values.actualFabricYds}
              onChange={(e) => setField("actualFabricYds", e.target.value)}
              onBlur={() => touch("actualFabricYds")}
              className={inputClass(!!errorFor("actualFabricYds"))}
              {...aria("actualFabricYds")}
            />
          </FormField>

          {/* Live multiplier preview */}
          {recipe && (
            <div className="rounded-md border border-gray-300 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Expected component counts</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-900">
                {recipe.components.map((c) => (
                  <li key={c.id} className="flex justify-between gap-4">
                    <span>
                      {c.componentName} ({c.piecesPerGarment} per garment)
                    </span>
                    <span className="font-semibold">
                      {qty === null ? "-" : computeExpectedQty(c.piecesPerGarment, qty)}
                    </span>
                  </li>
                ))}
              </ul>
              {qty !== null && (
                <p className="mt-2 border-t border-gray-300 pt-2 text-sm text-gray-900">
                  Expected fabric: <strong>{(recipe.stdFabricYards * qty).toFixed(2)} yds</strong> (
                  {recipe.stdFabricYards} yds per piece)
                </p>
              )}
              {wastagePreview !== null && (
                <p
                  className={`text-sm font-medium ${
                    wastagePreview > recipe.wastageCap ? "text-red-800" : "text-gray-900"
                  }`}
                >
                  Estimated wastage: {wastagePreview}% (cap {recipe.wastageCap}%)
                  {wastagePreview > recipe.wastageCap ? " - over cap" : ""}
                </p>
              )}
            </div>
          )}

          {formError && (
            <p role="alert" className="rounded-md bg-red-100 p-2 text-sm text-red-800">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md border border-gray-400 bg-white px-4 py-2 font-medium text-gray-900 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {busy ? "Creating..." : "Create order"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}