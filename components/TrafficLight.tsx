import type { ItemStatus } from "@/lib/domain";

const STYLES: Record<ItemStatus, { label: string; box: string; dot: string }> = {
  GREEN: { label: "Match", box: "border-green-700 bg-green-100 text-green-900", dot: "bg-green-600" },
  YELLOW: { label: "Excess", box: "border-yellow-700 bg-yellow-100 text-yellow-900", dot: "bg-yellow-500" },
  RED: { label: "Shortage", box: "border-red-700 bg-red-100 text-red-900", dot: "bg-red-600" },
};

export default function TrafficLight({
  status,
  diff,
}: {
  status: ItemStatus | null;
  diff: number | null;
}) {
  if (!status) {
    return (
      <span className="inline-block rounded-full border border-gray-500 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-900">
        Not counted
      </span>
    );
  }
  const s = STYLES[status];
  const detail = diff !== null && diff !== 0 ? ` (${diff > 0 ? "+" : ""}${diff})` : "";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.box}`}
    >
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      {s.label}
      {detail}
    </span>
  );
}