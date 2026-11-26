/**
 * Supabase filing cabinet: records go into the "invoices" table and the
 * original PDFs go into a private storage bucket. Run supabase/setup.sql
 * once in your Supabase project to create both.
 *
 * This runs only on the server, using your secret key, so the key never
 * reaches a browser.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceRecord } from "@/lib/types";
import type { InvoiceStore } from "./types";

const TABLE = "invoices";

interface Row {
  id: string;
  file_name: string;
  file_path: string;
  status: InvoiceRecord["status"];
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total: number | null;
  data: InvoiceRecord["data"];
  original_data: InvoiceRecord["originalData"];
  extraction: InvoiceRecord["extraction"];
  verified_targets: string[];
  approval_note: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

const toRow = (r: InvoiceRecord): Row => ({
  id: r.id,
  file_name: r.fileName,
  file_path: r.filePath,
  status: r.status,
  vendor_name: r.data.vendorName,
  invoice_number: r.data.invoiceNumber,
  invoice_date: r.data.invoiceDate,
  total: r.data.total,
  data: r.data,
  original_data: r.originalData,
  extraction: r.extraction,
  verified_targets: r.verifiedTargets,
  approval_note: r.approvalNote,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  approved_at: r.approvedAt,
});

const fromRow = (row: Row): InvoiceRecord => ({
  id: row.id,
  fileName: row.file_name,
  filePath: row.file_path,
  status: row.status,
  data: row.data,
  originalData: row.original_data,
  extraction: row.extraction,
  verifiedTargets: row.verified_targets ?? [],
  approvalNote: row.approval_note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  approvedAt: row.approved_at,
});

export function supabaseSettings() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "invoices";
  return url && key ? { url, key, bucket } : null;
}

function fail(action: string, error: { message: string } | null): never {
  const msg = error?.message ?? "unknown error";
  const hint = /relation .* does not exist|schema cache|Bucket not found/i.test(msg)
    ? " (Did you run supabase/setup.sql in the Supabase SQL Editor?)"
    : "";
  throw new Error(`Supabase could not ${action}: ${msg}${hint}`);
}

export class SupabaseStore implements InvoiceStore {
  readonly kind = "supabase" as const;
  readonly durable = true;
  private db: SupabaseClient;
  private bucket: string;

  constructor(settings: { url: string; key: string; bucket: string }) {
    this.db = createClient(settings.url, settings.key, { auth: { persistSession: false } });
    this.bucket = settings.bucket;
  }

  async saveFile(id: string, pdf: Buffer) {
    const filePath = `${id}.pdf`;
    const { error } = await this.db.storage.from(this.bucket).upload(filePath, pdf, { contentType: "application/pdf", upsert: true });
    if (error) fail("save the PDF", error);
    return filePath;
  }

  async readFile(filePath: string) {
    const { data, error } = await this.db.storage.from(this.bucket).download(filePath);
    if (error || !data) fail("load the PDF", error);
    return Buffer.from(await data.arrayBuffer());
  }

  async create(record: InvoiceRecord) {
    const { error } = await this.db.from(TABLE).insert(toRow(record));
    if (error) fail("save the invoice", error);
  }

  async get(id: string) {
    const { data, error } = await this.db.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) fail("load the invoice", error);
    return data ? fromRow(data as Row) : null;
  }

  async list() {
    const { data, error } = await this.db.from(TABLE).select("*").order("created_at", { ascending: false }).limit(500);
    if (error) fail("list invoices", error);
    return (data as Row[]).map(fromRow);
  }

  async update(record: InvoiceRecord) {
    const { error } = await this.db.from(TABLE).update(toRow(record)).eq("id", record.id);
    if (error) fail("update the invoice", error);
  }

  async remove(id: string) {
    const rec = await this.get(id);
    const { error } = await this.db.from(TABLE).delete().eq("id", id);
    if (error) fail("delete the invoice", error);
    if (rec) await this.db.storage.from(this.bucket).remove([rec.filePath]);
  }
}
