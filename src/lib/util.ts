import type { Entity } from '../data/schema';
import { COUNTRY_LABEL } from '../data/schema';
import type { Snapshot } from './repository';
import { entityCountry } from './graph';

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9а-яіїєґ]+/gi, '-').replace(/^-|-$/g, '').slice(0, 48) || 'item';
}

export function yearsText(e: Entity, snap: Snapshot): string {
  const y = e.years;
  if (!y?.from) {
    const rel = e.attrs?.release ? snap.entities.get(e.attrs.release) : undefined;
    return rel?.years?.from ? String(rel.years.from) : '';
  }
  const approx = y.approx ? '≈' : '';
  if (e.type === 'release' || e.type === 'event') return `${approx}${y.from}${y.to ? `–${y.to}` : ''}`;
  return `${approx}${y.from}–${y.to ?? ''}`.replace(/–$/, '–');
}

export function placeText(e: Entity, snap: Snapshot): string {
  const city = e.city ? snap.entities.get(e.city)?.name : undefined;
  const c = entityCountry(e, snap.entities);
  return [city, c ? COUNTRY_LABEL[c] : undefined].filter(Boolean).join(', ');
}

export function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function fmtTime(sec?: number) {
  if (sec === undefined) return '';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function matchScore(e: Entity, q: string): number {
  const query = q.trim().toLowerCase();
  if (!query) return 0;
  const names = [e.name, ...(e.aliases ?? [])].map((n) => n.toLowerCase());
  let best = 0;
  for (const n of names) {
    if (n === query) best = Math.max(best, 100);
    else if (n.startsWith(query)) best = Math.max(best, 80);
    else if (n.split(/[\s/–-]+/).some((w) => w.startsWith(query))) best = Math.max(best, 60);
    else if (n.includes(query)) best = Math.max(best, 40);
  }
  return best;
}
