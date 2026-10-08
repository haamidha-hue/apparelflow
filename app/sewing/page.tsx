import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import SewingWorkspace from "@/components/sewing/SewingWorkspace";

export default function SewingPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-900">Loading...</p>}>
      <AppShell allowed={["sewing_supervisor"]} title="Sewing Queue">
        <Suspense fallback={<p className="text-gray-900">Loading queue...</p>}>
          <SewingWorkspace />
        </Suspense>
      </AppShell>
    </Suspense>
  );
}