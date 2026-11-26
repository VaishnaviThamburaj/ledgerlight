/** /review/:id — loads one document and hands it to the review desk. */
import Link from "next/link";
import { Suspense } from "react";
import { ReviewDesk } from "@/components/review/ReviewDesk";
import { otherInvoices } from "@/lib/documents";
import { getStore } from "@/lib/storage";

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <ReviewLoader params={params} />
    </Suspense>
  );
}

async function ReviewLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getStore().get(id);
  if (!record) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-6 py-20 text-center">
        <p className="text-lg font-semibold text-slate-900">Document not found</p>
        <p className="mt-2 text-sm text-slate-600">It may have been deleted, or the link is wrong.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Back to inbox
        </Link>
      </main>
    );
  }
  const others = await otherInvoices(record.id);
  return <ReviewDesk key={`${record.id}-${record.status}`} record={record} others={others} />;
}

function Loading() {
  return (
    <div className="grid flex-1 gap-0 lg:h-[calc(100vh-57px)] lg:flex-none lg:grid-cols-2">
      <div className="animate-pulse bg-slate-200/70" />
      <div className="space-y-4 p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
    </div>
  );
}
