import { Suspense } from "react";
import { DocumentPage } from "@/components/DocumentPage";

export default function DocPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-slate-500">Loading document…</p>}>
      <DocumentPage />
    </Suspense>
  );
}
