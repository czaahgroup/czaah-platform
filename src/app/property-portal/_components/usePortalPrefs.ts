'use client';

import { useCallback, useEffect, useState } from 'react';

// Per-visitor portal preferences (saved properties + display currency).
// Saved properties live in the browser; for a signed-in buyer, buyerSession.ts
// also mirrors them into their account (onWishlistChange). Everything is
// wrapped in try/catch — localStorage throws in private mode and in embedded
// webviews, and a thrown preference read must never take the page down.

const WISHLIST_KEY = 'czaah-portal-saved';
const CURRENCY_KEY = 'czaah-portal-currency';

// localStorage only notifies OTHER tabs via 'storage'. This same-tab event
// keeps the header count, the cards and the saved page in sync with each other.
const SYNC_EVENT = 'czaah-portal-prefs';

function readList(): string[] {
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(ids: string[]) {
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    /* quota or blocked storage — the in-memory state still updates */
  }
  window.dispatchEvent(new Event(SYNC_EVENT));
}

type WishlistChange = { type: 'toggle'; id: string; added: boolean } | { type: 'clear' };
let changeListener: ((c: WishlistChange) => void) | null = null;

/** One listener (the account sync) hears every save, unsave and clear. */
export function onWishlistChange(fn: (c: WishlistChange) => void) {
  changeListener = fn;
}
export const readWishlist = readList;
/** Replace the saved list without notifying the listener (used by the account merge). */
export const replaceWishlist = writeList;

export function useWishlist() {
  // Always start empty so server and first client render agree; the real list
  // arrives in the effect below. Rendering saved state during SSR would
  // guarantee a hydration mismatch.
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(readList());
    sync();
    setReady(true);
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const next = readList();
    const at = next.indexOf(id);
    if (at >= 0) next.splice(at, 1);
    else next.push(id);
    writeList(next);
    setIds(next);
    changeListener?.({ type: 'toggle', id, added: at < 0 });
  }, []);

  const clear = useCallback(() => {
    writeList([]);
    setIds([]);
    changeListener?.({ type: 'clear' });
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle, clear, count: ids.length, ready };
}

export function useCurrencyPref() {
  const [currency, setCurrencyState] = useState('');

  useEffect(() => {
    const sync = () => {
      try {
        setCurrencyState(window.localStorage.getItem(CURRENCY_KEY) || '');
      } catch {
        setCurrencyState('');
      }
    };
    sync();
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setCurrency = useCallback((next: string) => {
    try {
      if (next) window.localStorage.setItem(CURRENCY_KEY, next);
      else window.localStorage.removeItem(CURRENCY_KEY);
    } catch {
      /* ignore — state below still reflects the choice for this page view */
    }
    setCurrencyState(next);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  return { currency, setCurrency };
}
