import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import CuttingWorkspace from "@/components/cutting/CuttingWorkspace";

export default function CuttingPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-900">Loading...</p>}>
      <AppShell allowed={["cutting_supervisor"]} title="Cutting Orders">
        <Suspense fallback={<p className="text-gray-900">Loading orders...</p>}>
          <CuttingWorkspace />
        </Suspense>
      </AppShell>
    </Suspense>
  );
}