'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { groupForMap, listingPoint, pinPrice, precisionNote, type MapGroup } from '@/lib/listingMap';
import { LiveProperty, convertPrice, formatPrice, isRental, sizedImage, fallbackToOriginal } from './types';
import { portalLocations } from './portalRuntime';
import { useCurrencyPref } from './usePortalPrefs';
import { track } from './analytics';

// OpenStreetMap's own tiles: no key and no account, attribution required.
// Their usage policy suits a site of this size; a busier site should move to
// a paid tile provider by changing these two lines.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Leaflet touches `window` on import, so it is only ever loaded in an effect. */
const loadLeaflet = () => import('leaflet').then((m) => m.default);

export type ResultsView = 'list' | 'map';

/** List / Map switch for a results page. */
export function ViewToggle({ view, onChange }: { view: ResultsView; onChange: (view: ResultsView) => void }) {
  return (
    <div className="pp-viewtoggle" role="group" aria-label="Show results as">
      {(['list', 'map'] as const).map((v) => (
        <button
          key={v}
          type="button"
          className={view === v ? 'active' : ''}
          aria-pressed={view === v}
          onClick={() => {
            if (view === v) return;
            track('results_view', { view: v });
            onChange(v);
          }}
        >
          {v === 'list' ? 'List' : 'Map'}
        </button>
      ))}
    </div>
  );
}

function pinText(group: MapGroup<LiveProperty>, currency?: string): string {
  if (group.listings.length > 1) return `${group.listings.length} properties`;
  const p = group.listings[0];
  if (!p.price) return 'POA';
  const converted = currency && currency !== p.currency ? convertPrice(p.price, p.currency, currency) : null;
  const text = converted != null ? pinPrice(converted, currency) : pinPrice(p.price, p.currency);
  return isRental(p) ? `${text}/${p.rent_period === 'year' ? 'yr' : 'mo'}` : text;
}

/**
 * Search results on a map, with the same results listed beside it. Selecting
 * a pin narrows the list to that pin; the list is also how the results are
 * reached without a pointer or without sight of the map.
 */
export function ListingsMap({ listings, displayCurrency }: { listings: LiveProperty[]; displayCurrency?: string }) {
  const tree = portalLocations();
  const { currency } = useCurrencyPref();
  const shownCurrency = displayCurrency || currency || undefined;
  const { groups, unplaced } = useMemo(() => groupForMap(listings, tree), [listings, tree]);
  // Keys of the selected pin's groups (a merged pin selects several).
  const [selected, setSelected] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const fitted = useRef<unknown>(null);
  // The zoom handler outlives a render, so it reads the latest draw from here.
  const redraw = useRef<() => void>(() => {});

  // A selection that the current filters no longer contain is dropped.
  const activeGroups = groups.filter((g) => selected.includes(g.key));
  const activeKey = activeGroups.map((g) => g.key).join('|');
  const active = activeGroups.length
    ? {
        label: activeGroups.length === 1 ? activeGroups[0].label : [...new Set(activeGroups.map((g) => g.label))].join(' · '),
        listings: activeGroups.flatMap((g) => g.listings),
        note: activeGroups.length === 1
          ? precisionNote(activeGroups[0])
          : activeGroups.some((g) => g.precision !== 'exact')
            ? 'Approximate locations: the map shows areas, not exact positions.'
            : '',
      }
    : null;

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !el.current) return;
        if (!map.current) {
          map.current = L.map(el.current, { scrollWheelZoom: false, worldCopyJump: true, minZoom: 2 });
          L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map.current);
          map.current.attributionControl.setPrefix(false);
          layer.current = L.layerGroup().addTo(map.current);
          map.current.setView([25, 45], 3);
          map.current.on('zoomend', () => redraw.current());
        }
        const m = map.current;

        redraw.current = () => {
          layer.current!.clearLayers();
          // Pins closer than a label's width at this zoom are merged into one.
          const clusters: { x: number; y: number; members: MapGroup<LiveProperty>[] }[] = [];
          for (const g of groups) {
            const p = m.project([g.lat, g.lng], m.getZoom());
            const near = clusters.find((c) => Math.abs(c.x - p.x) < 96 && Math.abs(c.y - p.y) < 34);
            if (near) near.members.push(g);
            else clusters.push({ x: p.x, y: p.y, members: [g] });
          }
          for (const c of clusters) {
            const merged = c.members.length > 1;
            const count = c.members.reduce((n, g) => n + g.listings.length, 0);
            const isActive = c.members.every((g) => selected.includes(g.key));
            const pin = document.createElement('span');
            pin.className = [
              'pp-map-pin',
              merged ? 'pp-map-pin--cluster' : c.members[0].precision === 'exact' ? '' : 'pp-map-pin--approx',
              isActive ? 'is-active' : '',
            ].filter(Boolean).join(' ');
            pin.textContent = merged ? `${count} properties` : pinText(c.members[0], shownCurrency);
            const title = merged
              ? `${count} properties: ${[...new Set(c.members.map((g) => g.label))].join(', ')}`
              : `${c.members[0].label}: ${count === 1 ? c.members[0].listings[0].title : `${count} properties`}`;
            const lat = c.members.reduce((s, g) => s + g.lat, 0) / c.members.length;
            const lng = c.members.reduce((s, g) => s + g.lng, 0) / c.members.length;
            L.marker([lat, lng], {
              // No fixed size: the label sizes itself and CSS anchors it to the point.
              icon: L.divIcon({ className: 'pp-map-pin-anchor', html: pin, iconSize: undefined }),
              title,
              alt: title,
              zIndexOffset: isActive ? 1000 : 0,
            })
              .on('click', () => {
                track('map_pin_click', { listings: count, merged });
                setSelected(c.members.map((g) => g.key));
                // A merged pin opens up into its members, as far as the map can zoom.
                if (merged && m.getZoom() < 17) {
                  m.fitBounds(L.latLngBounds(c.members.map((g) => [g.lat, g.lng] as [number, number])), { padding: [80, 80], maxZoom: 17 });
                }
              })
              .addTo(layer.current!);
          }
        };

        // Reframe only when the results change, not when a pin is selected.
        if (fitted.current !== groups) {
          fitted.current = groups;
          if (groups.length) {
            m.fitBounds(L.latLngBounds(groups.map((g) => [g.lat, g.lng] as [number, number])), { padding: [56, 56], maxZoom: 13, animate: false });
          }
        }
        redraw.current();
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
    // activeKey stands in for `selected`: a new array each click, same pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, activeKey, shownCurrency]);

  useEffect(() => () => {
    map.current?.remove();
    map.current = null;
    layer.current = null;
  }, []);

  const rows = active ? active.listings : [...groups.flatMap((g) => g.listings), ...unplaced];
  const hasApprox = groups.some((g) => g.precision !== 'exact');

  return (
    <div className="pp-mapview">
      <div className="pp-mapview-map">
        {failed ? (
          <p className="pp-map-failed">The map could not be loaded. The properties are listed below.</p>
        ) : (
          <div ref={el} className="pp-map" role="region" aria-label="Map of the properties in these results" />
        )}
        {hasApprox && (
          <p className="pp-map-note">
            <span className="pp-map-pin pp-map-pin--approx pp-map-pin--key" aria-hidden="true">Area</span>
            A dashed marker shows the property&apos;s area or city, not its exact position.
          </p>
        )}
      </div>

      <div className="pp-mapview-list">
        <div className="pp-mapview-list-head">
          {active ? (
            <>
              <h2>{active.label}</h2>
              <button type="button" className="pp-link-arrow" onClick={() => setSelected([])}>Show all {listings.length}</button>
            </>
          ) : (
            <h2>{listings.length} {listings.length === 1 ? 'property' : 'properties'}</h2>
          )}
        </div>
        {active?.note && <p className="pp-mapview-precision">{active.note}</p>}
        <ul>
          {rows.map((p) => {
            const img = sizedImage(p.images?.[0], 240);
            const point = listingPoint(p, tree);
            return (
              <li key={p.id}>
                <Link href={`/property-portal/${p.id}`} className="pp-maprow">
                  {img ? (
                    <img src={img} alt="" loading="lazy" decoding="async" onError={fallbackToOriginal} />
                  ) : (
                    <span className="pp-maprow-noimg" aria-hidden="true">&#8962;</span>
                  )}
                  <span className="pp-maprow-body">
                    <b>{formatPrice(p, shownCurrency)}</b>
                    <span className="pp-maprow-title">{p.title}</span>
                    <span className="pp-maprow-place">
                      {[p.location, p.city, p.country].filter(Boolean).join(', ')}
                      {!point && ' · not on the map'}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {!active && unplaced.length > 0 && (
          <p className="pp-mapview-precision">
            {unplaced.length} {unplaced.length === 1 ? 'property has' : 'properties have'} no map location on record and {unplaced.length === 1 ? 'is' : 'are'} listed here only.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The map on a listing page. An exact position gets a marker; an area or city
 * fallback gets a shaded circle, so nobody reads it as the address.
 */
export function ListingLocationMap({ prop }: { prop: LiveProperty }) {
  const tree = portalLocations();
  const point = useMemo(() => listingPoint(prop, tree), [prop, tree]);
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!point) return;
    let cancelled = false;
    let instance: LeafletMap | null = null;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !el.current) return;
        // One finger scrolls the page on a phone; the zoom buttons still work.
        instance = L.map(el.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile });
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(instance);
        instance.attributionControl.setPrefix(false);
        const at: [number, number] = [point.lat, point.lng];
        if (point.precision === 'exact') {
          const dot = document.createElement('span');
          dot.className = 'pp-map-dot';
          L.marker(at, { icon: L.divIcon({ className: 'pp-map-pin-anchor', html: dot, iconSize: undefined }), title: prop.title, alt: prop.title, keyboard: false }).addTo(instance);
          instance.setView(at, 15);
        } else {
          // A circle can only be measured on a map that already has a view.
          instance.setView(at, point.precision === 'area' ? 13 : 10);
          const circle = L.circle(at, {
            radius: point.precision === 'area' ? 1200 : 6000,
            color: '#7d6429', weight: 1.5, dashArray: '6 6', fillColor: '#c9a84c', fillOpacity: 0.18, interactive: false,
          }).addTo(instance);
          instance.fitBounds(circle.getBounds(), { padding: [24, 24] });
        }
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      instance?.remove();
    };
  }, [point, prop.title]);

  if (!point || failed) return null;
  return (
    <div className="pp-locmap">
      <div ref={el} className="pp-map pp-map--detail" role="region" aria-label={`Map: ${point.label}`} />
      <p className="pp-map-note">
        {precisionNote(point)}{' '}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </a>
      </p>
    </div>
  );
}
