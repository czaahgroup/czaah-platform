'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useBuyer, portalSupabase } from './buyerSession';
import { savedSearchName, cleanSearchPath } from '@/lib/buyerAccount';
import { track } from './analytics';

// "Save this search" (brief §12). Signed out, it points to the account page
// and comes back here afterwards.
export function SaveSearchButton() {
  const pathname = usePathname() || '';
  const params = useSearchParams();
  const { user, ready } = useBuyer();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Page number and display currency don't change what the search finds.
  const q = new URLSearchParams(params?.toString() || '');
  q.delete('page');
  q.delete('ccy');
  const search = q.toString();
  const path = cleanSearchPath(`${pathname}${search ? `?${search}` : ''}`);
  if (!path || !ready) return null;

  if (!user) {
    return (
      <Link href={`/property-portal/account?next=${encodeURIComponent(path)}`} className="pp-save-search">
        Save this search
      </Link>
    );
  }

  async function save() {
    setState('saving');
    const { error } = await portalSupabase().from('saved_searches').insert({ user_id: user!.id, name: savedSearchName(pathname, search), path });
    if (error) { setState('error'); return; }
    track('save_search', { path });
    setState('saved');
  }

  if (state === 'saved') {
    return <Link href="/property-portal/account#searches" className="pp-save-search is-done" role="status">Saved ✓ View saved searches</Link>;
  }
  return (
    <button type="button" className="pp-save-search" onClick={save} disabled={state === 'saving'}>
      {state === 'saving' ? 'Saving…' : state === 'error' ? 'Could not save — try again' : 'Save this search'}
    </button>
  );
}
