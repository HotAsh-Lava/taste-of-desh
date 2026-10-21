// ============================================================
// Supabase client — routed through our own domain for China
// ============================================================
// Customers in mainland China frequently can't reach *.supabase.co directly
// (the browser fails with "Load failed"): products don't load and login,
// sign-up and password reset break. groupbuy.trade on Cloudflare IS reachable,
// so the app now talks to https://cdn.groupbuy.trade, and the Cloudflare Worker
// there (cdn-worker.js) forwards every request to Supabase. Security doesn't
// change: the same public key, and the database's RLS rules still decide what
// anyone can see or do.
//
// Keys/URL still come from your existing VITE_ build variables — nothing to
// re-enter. The anon key is looked up under the usual names; if your project
// uses a different name it's found automatically by its shape.
import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const strings = Object.values(env).filter(v => typeof v === 'string');

// Direct Supabase URL (used to build canonical storage URLs and as a fallback).
const DIRECT_URL = String(
  env.VITE_SUPABASE_URL ||
  strings.find(v => /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(v)) ||
  'https://lictzpexgfepsvwpevmk.supabase.co'
).replace(/\/+$/, '');

function looksLikeAnonJwt(v) {
  if (!/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(v)) return false;
  try {
    const payload = JSON.parse(atob(v.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch { return false; }
}
const ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  strings.find(looksLikeAnonJwt) ||
  strings.find(v => /^sb_publishable_/.test(v));

if (!ANON_KEY) {
  // Fail loudly in the console rather than with a blank page and no clue.
  console.error('Supabase anon key not found in VITE_ environment variables.');
}

export const SUPABASE_DIRECT_URL = DIRECT_URL;
export const SUPABASE_REF = (() => {
  try { return new URL(DIRECT_URL).hostname.split('.')[0]; } catch { return 'lictzpexgfepsvwpevmk'; }
})();

// Our Cloudflare front door. VITE_SUPABASE_PROXY_URL can override it if you ever move it.
export const API_URL = String(env.VITE_SUPABASE_PROXY_URL || 'https://cdn.groupbuy.trade').replace(/\/+$/, '');

// ---------- A sturdier fetch ----------
// • Reads (GET/HEAD) time out after 20 s instead of hanging forever on a bad
//   mobile connection, and are retried once; if our domain can't be reached
//   at all, one last try goes straight to Supabase (helps shoppers outside China).
// • Writes (placing an order, saving an invoice…) are NEVER retried
//   automatically, so nothing can be submitted twice.
const sleep = ms => new Promise(r => setTimeout(r, ms));
function withTimeout(init, ms) {
  if (init && init.signal) return { init, done: () => {} };   // caller manages cancellation
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  return { init: { ...(init || {}), signal: ctl.signal }, done: () => clearTimeout(id) };
}
async function sturdyFetch(input, init) {
  const url = typeof input === 'string' ? input : input.url;
  const method = String((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';
  if (!isRead) return fetch(input, init);

  const attempt = async (u) => {
    const t = withTimeout(init, 20000);
    try { return await fetch(u, t.init); } finally { t.done(); }
  };
  try {
    return await attempt(url);
  } catch (e1) {
    if (init && init.signal && init.signal.aborted) throw e1;   // cancelled on purpose
    await sleep(800);
    try {
      return await attempt(url);
    } catch (e2) {
      if (url.startsWith(API_URL + '/')) {
        try { return await attempt(DIRECT_URL + url.slice(API_URL.length)); } catch { /* fall through */ }
      }
      throw e2;
    }
  }
}

export const supabase = createClient(API_URL, ANON_KEY, {
  auth: {
    // Keep the same storage key the app used when it talked to supabase.co
    // directly, so nobody gets logged out by this change.
    storageKey: `sb-${SUPABASE_REF}-auth-token`,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: { fetch: sturdyFetch },
});
