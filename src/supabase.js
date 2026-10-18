import { offlineFetch } from './lib/local-data.js';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authStorageKey = 'sb-' + new URL(supabaseUrl || 'https://ejemplo.supabase.co').hostname.split('.')[0] + '-auth-token';
const onlineClient = createClient(
  supabaseUrl || "https://ejemplo.supabase.co",
  supabaseAnonKey || "clave-temporal",
  { auth: { storageKey: authStorageKey }, global: { fetch: offlineFetch(supabaseUrl || "https://ejemplo.supabase.co") } }
);
// Offline reads must not wait for the auth SDK to refresh an expired JWT.
// This client never sends a network request while offline (offlineFetch enforces it).
const localClient = createClient(supabaseUrl || 'https://ejemplo.supabase.co',supabaseAnonKey || 'clave-temporal',{
  accessToken: async () => null,
  global: { fetch: offlineFetch(supabaseUrl || 'https://ejemplo.supabase.co') },
});
export const supabase = new Proxy(onlineClient, {
  get(target, property) {
    if(property === 'from' && !navigator.onLine)return localClient.from.bind(localClient);
    const value=Reflect.get(target,property);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
