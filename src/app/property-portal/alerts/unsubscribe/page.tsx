'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, ButtonLink } from '../../_components/ui';

// The "Stop alerts" link in a saved-search email. A button, not an automatic
// action on load, so a mail scanner opening the link can't switch alerts off.
export default function UnsubscribePage() {
  return (
    <Suspense fallback={<main className="pp-container pp-account" />}>
      <Unsubscribe />
    </Suspense>
  );
}

function Unsubscribe() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function stop() {
    setState('busy');
    const res = await fetch('/api/property-account/alerts/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setMessage(json.name ? `You won't get any more emails for “${json.name}”.` : "You won't get any more emails for this search.");
      setState('done');
    } else {
      setMessage(json.error || 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  return (
    <main>
      <div className="pp-container pp-account">
        <div className="pp-account-card pp-sell-sent" style={{ maxWidth: 520, margin: '40px auto' }} role={state === 'done' ? 'status' : undefined}>
          <h1 className="pp-account-title">{state === 'done' ? 'Alerts stopped' : 'Stop email alerts?'}</h1>
          {state === 'done' ? (
            <p>{message} The search is still saved in your account.</p>
          ) : (
            <p>Stop the new-property emails for this saved search. The search itself stays saved.</p>
          )}
          {state === 'error' && <p className="pp-sell-err" role="alert">{message}</p>}
          {state !== 'done' ? (
            <Button onClick={stop} disabled={state === 'busy' || !token}>{state === 'busy' ? 'Stopping…' : 'Stop alerts'}</Button>
          ) : (
            <ButtonLink href="/property-portal/account#searches" variant="ghost">Manage saved searches</ButtonLink>
          )}
        </div>
      </div>
    </main>
  );
}
