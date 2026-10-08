import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import VerifierWorkspace from "@/components/verifier/VerifierWorkspace";

export default function VerifierPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-900">Loading...</p>}>
      <AppShell allowed={["cutting_verifier"]} title="Verification Terminal">
        <Suspense fallback={<p className="text-gray-900">Loading queue...</p>}>
          <VerifierWorkspace />
        </Suspense>
      </AppShell>
    </Suspense>
  );
}