// One source of truth for form input styling (high contrast, clear focus ring).
export function inputClass(hasError = false) {
  const base =
    "block w-full rounded-md border bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2";
  const state = hasError
    ? "border-red-700 focus:border-red-700 focus:ring-red-700"
    : "border-gray-400 focus:border-blue-700 focus:ring-blue-700";
  return `${base} ${state}`;
}