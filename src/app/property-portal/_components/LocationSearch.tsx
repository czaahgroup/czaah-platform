'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  developmentSuggestions,
  locationHref,
  locationSuggestions,
  rankSuggestions,
  type DevelopmentLite,
  type Section,
  type Suggestion,
} from './locationNav';
import { portalLocations } from './portalRuntime';
import { findCountry } from './locationNav';

export type SearchSection = Section | 'new-projects';

/**
 * Where a picked suggestion (or free text) leads. Filters already chosen
 * (type, beds, price …) ride along as query parameters.
 */
export function suggestionHref(section: SearchSection, s: Suggestion | null, text: string, extra?: URLSearchParams) {
  const params = new URLSearchParams(extra?.toString() || '');
  if (s?.href) return s.href;

  if (section === 'new-projects') {
    // Off-plan has no location paths yet; the city/area name narrows it.
    const term = s ? (s.term || s.label) : text.trim();
    if (term) params.set('search', term);
    const qs = params.toString();
    return `/property-portal/off-plan${qs ? `?${qs}` : ''}`;
  }

  if (s && (s.kind === 'country' || s.kind === 'city' || s.kind === 'area')) {
    const tree = portalLocations();
    const country = findCountry(tree, s.countrySlug);
    const city = country?.cities.find((c) => c.slug === s.citySlug) || null;
    if (s.term) params.set('search', s.term);
    else params.delete('search');
    const qs = params.toString();
    return `${locationHref(section, country, city)}${qs ? `?${qs}` : ''}`;
  }

  const term = s ? (s.term || s.label) : text.trim();
  if (term) params.set('search', term);
  else params.delete('search');
  const qs = params.toString();
  return `/property-portal/${section}${qs ? `?${qs}` : ''}`;
}

let devCache: DevelopmentLite[] | null = null;

/**
 * Location search with suggestions: countries, cities and areas from Admin →
 * Locations, plus developments and developers. Accessible combobox — arrow
 * keys move, Enter picks, Esc closes; free text still searches.
 */
export function LocationSearch({
  value,
  onChange,
  onPick,
  onSubmitText,
  placeholder = 'City, area, development or developer',
  label = 'Location',
  className,
  autoFocus,
}: {
  value: string;
  onChange: (text: string) => void;
  /** A suggestion was chosen. */
  onPick: (s: Suggestion) => void;
  /** Enter pressed with no suggestion highlighted. */
  onSubmitText?: (text: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [devs, setDevs] = useState<DevelopmentLite[]>(devCache || []);
  const wrap = useRef<HTMLDivElement>(null);

  // Developments are only fetched once the box is used.
  function loadDevelopments() {
    if (devCache) return;
    devCache = [];
    fetch('/api/public/developments')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        devCache = (j.data || []).map((d: DevelopmentLite) => ({
          name: d.name, slug: d.slug, city: d.city, country: d.country, developer_name: d.developer_name,
        }));
        setDevs(devCache!);
      })
      .catch(() => { devCache = null; });
  }

  const all = useMemo(() => [...locationSuggestions(), ...developmentSuggestions(devs)], [devs]);
  const results = useMemo(() => rankSuggestions(all, value), [all, value]);

  useEffect(() => setActive(-1), [value]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(s: Suggestion) {
    onChange(s.label);
    setOpen(false);
    onPick(s);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && results[active]) {
        e.preventDefault();
        pick(results[active]);
      } else if (onSubmitText) {
        e.preventDefault();
        // An exact name ("london") still counts as choosing it.
        const exact = results.find((r) => r.label.toLowerCase() === value.trim().toLowerCase());
        setOpen(false);
        if (exact) onPick(exact);
        else onSubmitText(value);
      }
    }
  }

  const showList = open && results.length > 0;
  const kindLabel: Record<Suggestion['kind'], string> = {
    country: 'Country', city: 'City', area: 'Area', development: 'Development', developer: 'Developer',
  };

  return (
    <div className={['pp-locsearch', className].filter(Boolean).join(' ')} ref={wrap}>
      <label htmlFor={`${id}-input`} className="pp-sr-only">{label}</label>
      <input
        id={`${id}-input`}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onFocus={() => { loadDevelopments(); setOpen(true); }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id={listId} role="listbox" className="pp-locsearch-list" aria-label={`${label} suggestions`}>
          {results.map((s, i) => (
            <li
              key={`${s.kind}:${s.label}:${s.detail}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              // mousedown, not click, so the input's blur can't close the list first.
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="pp-locsearch-label">{s.label}</span>
              <span className="pp-locsearch-detail">{kindLabel[s.kind]} · {s.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <span className="pp-sr-only" aria-live="polite">
        {open && value.trim() ? `${results.length} suggestion${results.length === 1 ? '' : 's'}` : ''}
      </span>
    </div>
  );
}
