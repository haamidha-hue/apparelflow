import { Suspense } from "react";
import AppShell from "@/components/AppShell";

export default function VerifierPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-900">Loading...</p>}>
      <AppShell allowed={["cutting_verifier"]} title="Verification Terminal">
        <div className="rounded-lg bg-white p-6 text-gray-900 shadow">
          Verifier workspace. Counting and traffic lights come in Step 6.
        </div>
      </AppShell>
    </Suspense>
  );
}