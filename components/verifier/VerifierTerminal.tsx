"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VerifyCard from "./VerifyCard";
import type { VerifyOrder } from "./types";

export default function VerifierTerminal({ orders }: { orders: VerifyOrder[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  return (
    <section aria-label="Verification queue" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Waiting at QC station ({orders.length})
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

      {orders.length === 0 ? (
        <p className="rounded-lg border border-gray-300 bg-white p-6 text-gray-900">
          No batches are waiting for verification.
        </p>
      ) : (
        orders.map((o) => <VerifyCard key={o.id} order={o} onDecision={setNotice} />)
      )}
    </section>
  );
}