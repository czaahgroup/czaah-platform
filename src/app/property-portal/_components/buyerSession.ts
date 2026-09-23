'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { onWishlistChange, readWishlist, replaceWishlist } from './usePortalPrefs';

// The signed-in CZAAH Properties visitor, and keeping their saved properties
// in step with their account (Phase 8). Signed out, everything stays in the
// browser exactly as before.

let client: ReturnType<typeof createClient> | null = null;
export function portalSupabase() {
  if (!client) client = createClient();
  return client;
}

let current: User | null = null;
let known = false;
const listeners = new Set<(u: User | null) => void>();
let started = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Saved developments ("dev:<id>") stay in the browser — the account table
// holds listings only.
const listingIds = (ids: string[]) => ids.filter((id) => UUID.test(id));

function publish(u: User | null) {
  current = u;
  known = true;
  listeners.forEach((fn) => fn(u));
}

/** Merge browser saves into the account, then mirror the account back. */
async function mergeWishlist(userId: string) {
  const sb = portalSupabase();
  const { data, error } = await sb.from('saved_properties').select('listing_id').eq('user_id', userId);
  if (error) return;
  const remote = new Set((data || []).map((r) => r.listing_id as string));
  const local = readWishlist();
  const toAdd = listingIds(local).filter((id) => !remote.has(id));
  if (toAdd.length) {
    // A listing deleted since it was saved fails its foreign key; saving the
    // rest one by one keeps a single stale id from blocking the merge.
    const { error: bulk } = await sb.from('saved_properties').upsert(toAdd.map((listing_id) => ({ user_id: userId, listing_id })), { onConflict: 'user_id,listing_id', ignoreDuplicates: true });
    if (bulk) for (const listing_id of toAdd) await sb.from('saved_properties').upsert({ user_id: userId, listing_id }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true });
  }
  const merged = [...local, ...[...remote].filter((id) => !local.includes(id))];
  if (merged.length !== local.length) replaceWishlist(merged);
}

/** Start once per page: watch the session and sync saves. Safe to call repeatedly. */
export function startBuyerSession() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const sb = portalSupabase();
  sb.auth.getUser().then(({ data }) => {
    publish(data.user ?? null);
    if (data.user) mergeWishlist(data.user.id);
  }).catch(() => publish(null));
  sb.auth.onAuthStateChange((event, session) => {
    const u = session?.user ?? null;
    if (event === 'SIGNED_IN' && u && u.id !== current?.id) mergeWishlist(u.id);
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') publish(u);
  });
  onWishlistChange((change) => {
    const u = current;
    if (!u) return;
    if (change.type === 'clear') {
      sb.from('saved_properties').delete().eq('user_id', u.id).then(() => {});
    } else if (UUID.test(change.id)) {
      if (change.added) sb.from('saved_properties').upsert({ user_id: u.id, listing_id: change.id }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true }).then(() => {});
      else sb.from('saved_properties').delete().eq('user_id', u.id).eq('listing_id', change.id).then(() => {});
    }
  });
}

/** The signed-in visitor; `ready` is false until the session has been checked. */
export function useBuyer() {
  const [user, setUser] = useState<User | null>(current);
  const [ready, setReady] = useState(known);
  useEffect(() => {
    startBuyerSession();
    const fn = (u: User | null) => { setUser(u); setReady(true); };
    listeners.add(fn);
    if (known) fn(current);
    return () => { listeners.delete(fn); };
  }, []);
  return { user, ready };
}

export function displayName(u: User | null) {
  const n = u?.user_metadata?.full_name;
  return typeof n === 'string' && n.trim() ? n.trim() : u?.email || '';
}
