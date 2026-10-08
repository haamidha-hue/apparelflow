import { Suspense } from "react";
import AppShell from "@/components/AppShell";

export default function SewingPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-900">Loading...</p>}>
      <AppShell allowed={["sewing_supervisor"]} title="Sewing Queue">
        <div className="rounded-lg bg-white p-6 text-gray-900 shadow">
          Sewing floor. Verified batches appear here in Step 7.
        </div>
      </AppShell>
    </Suspense>
  );
}