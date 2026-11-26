/**
 * Local filing cabinet: keeps records in a JSON file and PDFs in a folder
 * (".data/" inside the project). Great for trying the app on your laptop.
 *
 * On Vercel the disk is wiped regularly, so there we fall back to /tmp and
 * the app shows a warning until Supabase is connected.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { InvoiceRecord } from "@/lib/types";
import type { InvoiceStore } from "./types";

const ROOT = process.env.VERCEL ? "/tmp/ledgerlight" : path.join(process.cwd(), ".data");
const DB_FILE = path.join(ROOT, "invoices.json");
const FILES = path.join(ROOT, "files");

// Serialise writes so two saves can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<InvoiceRecord[]> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8")) as InvoiceRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(records: InvoiceRecord[]) {
  await fs.mkdir(ROOT, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(records, null, 2));
  await fs.rename(tmp, DB_FILE);
}

const safeId = (id: string) => {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid id");
  return id;
};

export class LocalStore implements InvoiceStore {
  readonly kind = "local" as const;
  readonly durable = !process.env.VERCEL;

  async saveFile(id: string, pdf: Buffer) {
    await fs.mkdir(FILES, { recursive: true });
    const name = `${safeId(id)}.pdf`;
    await fs.writeFile(path.join(FILES, name), pdf);
    return name;
  }

  async readFile(name: string) {
    return fs.readFile(path.join(FILES, path.basename(name)));
  }

  create(record: InvoiceRecord) {
    return exclusive(async () => {
      const all = await readAll();
      all.push(record);
      await writeAll(all);
    });
  }

  async get(id: string) {
    return (await readAll()).find((r) => r.id === id) ?? null;
  }

  async list() {
    return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  update(record: InvoiceRecord) {
    return exclusive(async () => {
      const all = await readAll();
      const i = all.findIndex((r) => r.id === record.id);
      if (i === -1) throw new Error("Not found");
      all[i] = record;
      await writeAll(all);
    });
  }

  remove(id: string) {
    return exclusive(async () => {
      const all = await readAll();
      const rec = all.find((r) => r.id === id);
      await writeAll(all.filter((r) => r.id !== id));
      if (rec) await fs.rm(path.join(FILES, path.basename(rec.filePath)), { force: true });
    });
  }
}
