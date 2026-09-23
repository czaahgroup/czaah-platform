'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { useListings } from '../_components/useListings';
import { useWishlist, replaceWishlist } from '../_components/usePortalPrefs';
import { useBuyer, portalSupabase, displayName } from '../_components/buyerSession';
import { Button, ButtonLink, EmptyState, Skeleton } from '../_components/ui';
import { PASSWORD_MIN, cleanSearchPath } from '@/lib/buyerAccount';
import { track } from '../_components/analytics';

// /account (brief §13): sign in, create an account, reset a password, and —
// signed in — saved properties, saved searches and account settings.
// Email links arrive as ?confirm=<token hash> or ?reset=<token hash>.

type View = 'signin' | 'register' | 'forgot' | 'sent' | 'reset';

export default function AccountPage() {
  return (
    <Suspense fallback={<main><div className="pp-container pp-account"><Skeleton height={320} /></div></main>}>
      <Account />
    </Suspense>
  );
}

function Account() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready } = useBuyer();
  const [view, setView] = useState<View>('signin');
  const [notice, setNotice] = useState('');
  const [linkError, setLinkError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const handled = useRef(false);
  // Only a portal search page — never an arbitrary URL.
  const next = cleanSearchPath(params.get('next'));

  // Email links: confirm a new account, or sign in to set a new password.
  useEffect(() => {
    if (handled.current) return;
    const confirm = params.get('confirm');
    const reset = params.get('reset');
    if (!confirm && !reset) return;
    handled.current = true;
    setVerifying(true);
    // Take the token out of the address bar before anything else.
    router.replace('/property-portal/account');
    portalSupabase().auth.verifyOtp({ token_hash: (confirm || reset)!, type: confirm ? 'signup' : 'recovery' })
      .then(({ error }) => {
        if (error) {
          setLinkError('That link has already been used or has expired. Sign in, or ask for a new link below.');
        } else if (reset) {
          setView('reset');
        } else {
          track('account_created');
          setNotice('Your email is confirmed — welcome to CZAAH Properties.');
        }
      })
      .finally(() => setVerifying(false));
  }, [params, router]);

  // Came here to save a search: go back once signed in.
  useEffect(() => {
    if (user && next && view !== 'reset' && !verifying) router.replace(next);
  }, [user, next, view, verifying, router]);

  if (!ready || verifying) {
    return <main><div className="pp-container pp-account"><Skeleton height={320} /></div></main>;
  }

  return (
    <main>
      <div className="pp-container pp-account">
        <div className="pp-crumbs"><Link href="/property-portal">Home</Link> / Account</div>
        {user && view === 'reset' ? (
          <NewPassword onDone={() => { setView('signin'); setNotice('Your new password is saved.'); }} />
        ) : user ? (
          <Dashboard notice={notice} />
        ) : (
          <SignedOut view={view} setView={setView} linkError={linkError} next={next} />
        )}
      </div>
    </main>
  );
}

function SignedOut({ view, setView, linkError, next }: { view: View; setView: (v: View) => void; linkError: string; next: string | null }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', company_site: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (view === 'signin') {
        const { error } = await portalSupabase().auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw new Error(error.message === 'Email not confirmed' ? 'Please confirm your email first — check your inbox for the link we sent.' : 'That email and password don’t match an account.');
        track('account_sign_in');
      } else {
        const res = await fetch(view === 'register' ? '/api/property-account/register' : '/api/property-account/forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(view === 'register' ? form : { email: form.email }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
        setView('sent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (view === 'sent') {
    return (
      <div className="pp-account-card pp-sell-sent" role="status">
        <div className="pp-sell-sent-mark">✓</div>
        <h1 className="pp-account-title">Check your email</h1>
        <p>We&apos;ve sent a link to <strong>{form.email}</strong>. Open it on this device to continue. It can take a minute to arrive — check spam too.</p>
        <button type="button" className="pp-link-btn" onClick={() => setView('signin')}>Back to sign in</button>
      </div>
    );
  }

  const titles: Record<string, string> = { signin: 'Sign in', register: 'Create your account', forgot: 'Reset your password' };
  return (
    <div className="pp-account-grid">
      <div className="pp-account-card">
        <h1 className="pp-account-title">{titles[view]}</h1>
        {linkError && <p className="pp-sell-err" role="alert">{linkError}</p>}
        {next && view !== 'forgot' && <p className="pp-account-hint">Sign in or create a free account to save this search.</p>}
        <form className="pp-sell-form" onSubmit={submit}>
          {view === 'register' && (
            <>
              <div aria-hidden="true" className="pp-hp">
                <label>Company website<input tabIndex={-1} autoComplete="off" value={form.company_site} onChange={(e) => set('company_site', e.target.value)} /></label>
              </div>
              <label><span>Full name</span><input required maxLength={200} autoComplete="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></label>
            </>
          )}
          <label><span>Email</span><input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
          {view !== 'forgot' && (
            <label>
              <span>Password</span>
              <input required type="password" minLength={view === 'register' ? PASSWORD_MIN : undefined} maxLength={200} autoComplete={view === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => set('password', e.target.value)} />
            </label>
          )}
          {view === 'register' && <p className="pp-account-hint">At least {PASSWORD_MIN} characters. We&apos;ll email you a link to confirm your address.</p>}
          {error && <p className="pp-sell-err" role="alert">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Please wait…' : view === 'signin' ? 'Sign in' : view === 'register' ? 'Create account' : 'Email me a reset link'}
          </Button>
        </form>
        <div className="pp-account-switch">
          {view === 'signin' ? (
            <>
              <button type="button" className="pp-link-btn" onClick={() => { setError(''); setView('forgot'); }}>Forgot your password?</button>
              <span>New here? <button type="button" className="pp-link-btn" onClick={() => { setError(''); setView('register'); }}>Create an account</button></span>
            </>
          ) : (
            <span>Already have an account? <button type="button" className="pp-link-btn" onClick={() => { setError(''); setView('signin'); }}>Sign in</button></span>
          )}
        </div>
      </div>
      <div className="pp-account-why">
        <div className="pp-eyebrow">Your CZAAH Properties account</div>
        <ul>
          <li><strong>Saved properties on every device</strong><span>Anything you&apos;ve saved in this browser moves into your account when you sign in.</span></li>
          <li><strong>Saved searches</strong><span>Save a search with its filters and reopen it in one tap.</span></li>
          <li><strong>Free, and no documents needed</strong><span>An account is only for saving. Enquiries and viewings never need one.</span></li>
        </ul>
      </div>
    </div>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await portalSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else onDone();
  }
  return (
    <div className="pp-account-card" style={{ maxWidth: 460 }}>
      <h1 className="pp-account-title">Choose a new password</h1>
      <form className="pp-sell-form" onSubmit={submit}>
        <label><span>New password</span><input required type="password" minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <p className="pp-account-hint">At least {PASSWORD_MIN} characters.</p>
        {error && <p className="pp-sell-err" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</Button>
      </form>
    </div>
  );
}

interface SavedSearch { id: string; name: string; path: string; created_at: string }
interface Activity {
  id: string; reference: string; kind: string; listing_id: string | null; listing_title: string | null; created_at: string; open: boolean
  viewing: { status: string; preferred_date: string | null; preferred_slot: string | null; scheduled_at: string | null; mode: string } | null
}
const KIND: Record<string, string> = { property_enquiry: 'Enquiry', viewing_request: 'Viewing request', investment_enquiry: 'Investment enquiry' };
const VIEWING: Record<string, string> = { requested: 'Waiting for CZAAH to confirm a time', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Missed' };
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Dashboard({ notice }: { notice: string }) {
  const { user } = useBuyer();
  const { all, loading, error, reload } = useListings();
  const { ids, ready } = useWishlist();
  const [searches, setSearches] = useState<SavedSearch[] | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [searchError, setSearchError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    portalSupabase().from('saved_searches').select('id, name, path, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setSearchError('We couldn’t load your saved searches just now.');
        setSearches((data as SavedSearch[]) || []);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/property-account/activity').then((r) => r.json().then((j) => (r.ok ? j.data : [])))
      .then((d) => setActivity(d || []))
      .catch(() => setActivity([]));
  }, [user]);

  async function removeSearch(id: string) {
    const { error } = await portalSupabase().from('saved_searches').delete().eq('id', id);
    if (!error) setSearches((s) => (s || []).filter((x) => x.id !== id));
  }

  async function signOut() {
    setBusy(true);
    await portalSupabase().auth.signOut();
    // Shared computers: the next person shouldn't see this account's saves.
    replaceWishlist([]);
    setBusy(false);
  }

  async function deleteAccount() {
    setBusy(true);
    setDeleteError('');
    const res = await fetch('/api/property-account', { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDeleteError(json.error || 'We could not delete your account just now.');
      setBusy(false);
      return;
    }
    await portalSupabase().auth.signOut().catch(() => {});
    replaceWishlist([]);
    window.location.assign('/property-portal');
  }

  const saved = all.filter((p) => ids.includes(p.id));

  return (
    <>
      <div className="pp-listpage-head">
        <h1>Hello, <span className="pp-gold">{displayName(user).split(' ')[0]}</span></h1>
        <div className="pp-listpage-meta"><span>{user?.email}</span></div>
      </div>
      {notice && <p className="pp-account-notice" role="status">{notice}</p>}

      <section className="pp-section" style={{ paddingTop: 10 }}>
        <div className="pp-section-head">
          <div><h2 className="pp-h2">Saved properties</h2></div>
          <Link href="/property-portal/saved" className="pp-link-arrow">All saved →</Link>
        </div>
        {!ready || loading ? (
          <div className="pp-grid">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="pp-skeleton" />)}</div>
        ) : error ? (
          <EmptyState title="We couldn't load your saved properties" action={<button type="button" className="pp-retry" onClick={reload}>Try again</button>} />
        ) : saved.length === 0 ? (
          <EmptyState title="Nothing saved yet" action={<ButtonLink href="/property-portal/buy">Browse properties</ButtonLink>}>
            Tap the heart on any property to save it here.
          </EmptyState>
        ) : (
          <div className="pp-grid">{saved.slice(0, 6).map((p) => <PropertyCard key={p.id} prop={p} />)}</div>
        )}
      </section>

      <section className="pp-section" id="searches" style={{ paddingTop: 0, scrollMarginTop: 110 }}>
        <div className="pp-section-head"><div><h2 className="pp-h2">Saved searches</h2></div></div>
        {searchError && <p className="pp-sell-err">{searchError}</p>}
        {searches === null ? (
          <Skeleton height={80} />
        ) : searches.length === 0 ? (
          <EmptyState title="No saved searches" action={<ButtonLink href="/property-portal/buy" variant="ghost">Start a search</ButtonLink>}>
            Use &ldquo;Save this search&rdquo; on any results page to keep its filters.
          </EmptyState>
        ) : (
          <ul className="pp-saved-searches">
            {searches.map((s) => (
              <li key={s.id}>
                <Link href={s.path}>{s.name}</Link>
                <span>Saved {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <button type="button" className="pp-link-btn" onClick={() => removeSearch(s.id)} aria-label={`Delete saved search ${s.name}`}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activity && activity.length > 0 && (
        <section className="pp-section" style={{ paddingTop: 0 }}>
          <div className="pp-section-head"><div><h2 className="pp-h2">Your enquiries &amp; viewings</h2></div></div>
          <ul className="pp-saved-searches">
            {activity.map((a) => (
              <li key={a.id}>
                {a.listing_id ? <Link href={`/property-portal/${a.listing_id}`}>{a.listing_title || 'Property'}</Link> : <strong style={{ flex: '1 1 260px' }}>{KIND[a.kind] || 'Enquiry'}</strong>}
                <span>
                  {KIND[a.kind] || 'Enquiry'} · {a.reference} · {shortDate(a.created_at)}
                  {a.viewing && <> · {a.viewing.status === 'confirmed' && a.viewing.scheduled_at
                    ? <>Viewing confirmed for {new Date(a.viewing.scheduled_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{a.viewing.mode === 'video' ? ' (video call)' : ''}</>
                    : VIEWING[a.viewing.status] || ''}</>}
                  {!a.open && ' · Closed'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pp-section pp-account-settings" style={{ paddingTop: 0 }}>
        <div className="pp-section-head"><div><h2 className="pp-h2">Account</h2></div></div>
        <div className="pp-account-actions">
          <Button variant="ghost" onClick={signOut} disabled={busy}>Sign out</Button>
          {!confirmDelete ? (
            <button type="button" className="pp-link-btn pp-danger" onClick={() => setConfirmDelete(true)}>Delete my account</button>
          ) : (
            <div className="pp-account-confirm" role="alert">
              <p>Delete your account and everything saved in it? This can&apos;t be undone.</p>
              <Button onClick={deleteAccount} disabled={busy}>{busy ? 'Deleting…' : 'Yes, delete it'}</Button>
              <button type="button" className="pp-link-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          )}
        </div>
        {deleteError && <p className="pp-sell-err" role="alert">{deleteError}</p>}
      </section>
    </>
  );
}
