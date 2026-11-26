/**
 * THE FILING CABINET plug socket.
 *
 * Two cabinets fit this socket today:
 *  - Supabase (permanent, online, for real use)
 *  - Local files on your computer (zero setup, for trying things out)
 */
import type { InvoiceRecord } from "@/lib/types";

export interface InvoiceStore {
  readonly kind: "supabase" | "local";
  /** False when data can disappear (e.g. local files on a Vercel server). */
  readonly durable: boolean;
  saveFile(id: string, pdf: Buffer): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  create(record: InvoiceRecord): Promise<void>;
  get(id: string): Promise<InvoiceRecord | null>;
  list(): Promise<InvoiceRecord[]>;
  update(record: InvoiceRecord): Promise<void>;
  remove(id: string): Promise<void>;
}
