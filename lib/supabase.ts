import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Настроен ли Supabase для чтения (anon). */
export function hasSupabase(): boolean {
  return Boolean(url && anonKey);
}

/** Настроен ли service-role ключ (нужен для записи из админки). */
export function hasServiceRole(): boolean {
  return Boolean(url && serviceKey);
}

/** Анонимный клиент (только чтение, RLS). null если не настроен. */
export function getAnonClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/**
 * Service-role клиент (обходит RLS, запись). ТОЛЬКО на сервере.
 * Бросает если ключ не задан — вызывать после проверки hasServiceRole().
 */
export function getServiceClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL не заданы");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
