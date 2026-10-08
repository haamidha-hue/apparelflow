import type { OrderStatus } from "@prisma/client";

const STYLES: Record<OrderStatus, { label: string; className: string }> = {
  CUTTING_IN_PROGRESS: { label: "In progress", className: "bg-blue-100 text-blue-900" },
  PENDING_VERIFICATION: { label: "Pending verification", className: "bg-amber-100 text-amber-900" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-900" },
  VERIFIED: { label: "Verified", className: "bg-green-100 text-green-900" },
  SEWING_STARTED: { label: "Sewing started", className: "bg-purple-100 text-purple-900" },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}