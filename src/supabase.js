import { readLocal, offlineFetch } from './lib/local-data.js';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authStorageKey = 'sb-' + new URL(supabaseUrl || 'https://ejemplo.supabase.co').hostname.split('.')[0] + '-auth-token';
const onlineClient = createClient(
  supabaseUrl || "https://ejemplo.supabase.co",
  supabaseAnonKey || "clave-temporal",
  { auth: { storageKey: authStorageKey }, global: { fetch: offlineFetch(supabaseUrl || "https://ejemplo.supabase.co") } }
);
// Data queries have their own token callback so a blocked refresh cannot
// indefinitely hold a query before it reaches the local snapshot transport.
const dataClient = createClient(supabaseUrl || 'https://ejemplo.supabase.co',supabaseAnonKey || 'clave-temporal',{
  accessToken: async () => {
    if(!navigator.onLine)return null;
    const stored=readLocal(authStorageKey);
    if(stored?.expires_at > Date.now()/1000 + 30)return stored.access_token;
    let timer;
    try {
      const result=await Promise.race([
        onlineClient.auth.getSession(),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(null),2500)}),
      ]);
      return result?.data?.session?.access_token || readLocal(authStorageKey)?.access_token || null;
    } catch {return readLocal(authStorageKey)?.access_token || null}
    finally {clearTimeout(timer)}
  },
  global: { fetch: offlineFetch(supabaseUrl || 'https://ejemplo.supabase.co') },
});
export const supabase = new Proxy(onlineClient, {
  get(target, property) {
    if(property === 'from')return dataClient.from.bind(dataClient);
    const value=Reflect.get(target,property);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
