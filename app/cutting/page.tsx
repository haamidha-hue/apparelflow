import { Suspense } from "react";
import AppShell from "@/components/AppShell";

export default function CuttingPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-900">Loading...</p>}>
      <AppShell allowed={["cutting_supervisor"]} title="Cutting Orders">
        <div className="rounded-lg bg-white p-6 text-gray-900 shadow">
          Supervisor workspace. The order creation form comes in Step 5.
        </div>
      </AppShell>
    </Suspense>
  );
}