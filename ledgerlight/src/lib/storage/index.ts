/**
 * Picks the filing cabinet: Supabase if its keys are set, otherwise local files.
 */
import "server-only";
import { LocalStore } from "./local";
import { SupabaseStore, supabaseSettings } from "./supabase";
import type { InvoiceStore } from "./types";

let store: InvoiceStore | null = null;

export function getStore(): InvoiceStore {
  if (!store) {
    const settings = supabaseSettings();
    store = settings ? new SupabaseStore(settings) : new LocalStore();
  }
  return store;
}

export type { InvoiceStore };
