// Works out where everything goes on the map.
//
// The Yamanote line is drawn first, as a tidy eight-sided loop. Real
// geography is then bent to fit it: anything inside the real loop lands
// inside the drawn one, anything outside lands outside, and far-away places
// are pulled in. Tokyo Metro lines are routed across that using only
// horizontal, vertical and 45-degree runs. Seibu lines and the long-distance
// spurs are placed by hand at the end.
//
// The numbers under "Tuning" control the overall look.
import network from '../data/metro/network.json';
import { YAMANOTE, SEIBU_SHINJUKU, SEIBU_HAIJIMA, SEIBU_SHINJUKU_KM, SEIBU_HAIJIMA_KM, CHUO_RAPID, OME, YOKOSUKA, YOKOHAMA_LINE, EXCURSIONS, TOKAIDO_SHINKANSEN } from '../data/metro/other-lines';
import otherStations from '../data/metro/other-stations.json';
import landData from '../data/metro/land.json';
import { stops } from '../data/stops';

export type Pt = [number, number];

export interface MetroNode {
  id: number;
  en: string;
  ja: string;
  x: number;
  y: number;
  lines: number[]; // indexes into `lines`
  codes: { code: string; line: number }[]; // station numbers, e.g. G09
  interchange: boolean;
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
}

export interface MetroLine {
  id: string;
  name: string;
  ja: string;
  code: string;
  color: string;
  kind: 'metro' | 'jr' | 'rail' | 'seibu' | 'excursion';
  loop: boolean;
  // Lines with no open timetable run on typical journey times instead:
  // a train every `headway` minutes, taking `hops[i]` minutes (including the
  // stop) to get from station i to station i + 1.
  sim?: { headway: number; hops: number[] };
  nodes: number[]; // node id for each station, in line order
  segs: Pt[][]; // the drawn route from station i to station i + 1
  path: string; // the whole line as an SVG path
}

// ------------------------------------------------------------------ Tuning
const LOOP = { halfWidth: 12, halfHeight: 15, corner: 5.5 }; // the Yamanote loop, in grid cells
const INSIDE = 0.9; // below 1 spreads the middle of the loop out
const OUTSIDE = 0.95; // how strongly far-away places are pulled in
const CELL = 30; // pixels per grid cell
const MARGIN = 5; // empty cells around the network
const DETOUR = 3.2; // how far (in cells) a station may sit from a straight run before the line bends to meet it
const LINE_WIDTH = 7;
const CORNER = 12;
const SEIBU_SPACING = 1.7; // cells between stations on the hand-placed Seibu lines

// --------------------------------------------------------------- The loop
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const len = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const polyLength = (poly: Pt[]) => poly.slice(1).reduce((sum, p, i) => sum + len(p, poly[i]), 0);

function pointAt(poly: Pt[], distance: number): Pt {
  let left = distance;
  for (let i = 0; i < poly.length - 1; i++) {
    const l = len(poly[i], poly[i + 1]);
    if (left <= l || i === poly.length - 2) {
      const t = l ? Math.min(1, left / l) : 0;
      return [poly[i][0] + (poly[i + 1][0] - poly[i][0]) * t, poly[i][1] + (poly[i + 1][1] - poly[i][1]) * t];
    }
    left -= l;
  }
  return poly[poly.length - 1];
}

// The piece of a polyline between two distances along it.
function slice(poly: Pt[], from: number, to: number): Pt[] {
  const out: Pt[] = [pointAt(poly, from)];
  let walked = 0;
  for (let i = 1; i < poly.length - 1; i++) {
    walked += len(poly[i - 1], poly[i]);
    if (walked > from + 1e-6 && walked < to - 1e-6) out.push(poly[i]);
  }
  out.push(pointAt(poly, to));
  return out;
}

// Eight sides, walked anticlockwise from the middle of the right-hand side.
const { halfWidth: A, halfHeight: B, corner: C } = LOOP;
const loopPoly: Pt[] = [
  [A, 0],
  [A, -(B - C)],
  [A - C, -B],
  [-(A - C), -B],
  [-A, -(B - C)],
  [-A, B - C],
  [-(A - C), B],
  [A - C, B],
  [A, B - C],
  [A, 0],
];
const loopLength = polyLength(loopPoly);

// --------------------------------------------------------------- Geography
// Real positions, in kilometres from the middle of the Yamanote loop.
const centre = {
  lat: YAMANOTE.reduce((s, p) => s + p.lat, 0) / YAMANOTE.length,
  lon: YAMANOTE.reduce((s, p) => s + p.lon, 0) / YAMANOTE.length,
};
const km = (lat: number, lon: number): Pt => [
  (lon - centre.lon) * 111.32 * Math.cos((centre.lat * Math.PI) / 180),
  -(lat - centre.lat) * 110.95,
];
// Bearing that grows in the direction the loop is numbered.
const TAU = Math.PI * 2;
const bearing = (p: Pt) => (((-Math.atan2(p[1], p[0])) % TAU) + TAU) % TAU;

const realLoop = YAMANOTE.map((s) => {
  const p = km(s.lat, s.lon);
  return { bearing: bearing(p), radius: Math.hypot(p[0], p[1]) };
});

// Slide the stations round the drawn loop until they best match where they really are.
let shift = 0;
{
  let bestError = Infinity;
  for (let s = -2; s <= 2; s += 0.05) {
    let error = 0;
    realLoop.forEach((real, i) => {
      const p = pointAt(loopPoly, ((((i + s) / YAMANOTE.length) % 1) + 1) % 1 * loopLength);
      const diff = Math.abs(bearing(p) - real.bearing);
      error += Math.min(diff, TAU - diff) ** 2;
    });
    if (error < bestError) {
      bestError = error;
      shift = s;
    }
  }
}
const loopDistance = (i: number) => ((((i + shift) / YAMANOTE.length) % 1) + 1) % 1 * loopLength;
const drawnLoop = YAMANOTE.map((_, i) => {
  const p = pointAt(loopPoly, loopDistance(i));
  return { pos: p, bearing: bearing(p), radius: Math.hypot(p[0], p[1]) };
});

// Bend a real position onto the map.
function project(lat: number, lon: number): Pt {
  const p = km(lat, lon);
  const b = bearing(p);
  const r = Math.hypot(p[0], p[1]);
  // Find the two loop stations this bearing falls between.
  const n = YAMANOTE.length;
  let i = 0;
  let t = 0;
  for (let k = 0; k < n; k++) {
    const from = realLoop[k].bearing;
    const span = (((realLoop[(k + 1) % n].bearing - from) % TAU) + TAU) % TAU;
    const offset = (((b - from) % TAU) + TAU) % TAU;
    if (offset <= span) {
      i = k;
      t = span ? offset / span : 0;
      break;
    }
  }
  const j = (i + 1) % n;
  const realRadius = realLoop[i].radius + (realLoop[j].radius - realLoop[i].radius) * t;
  const span = (((drawnLoop[j].bearing - drawnLoop[i].bearing) % TAU) + TAU) % TAU;
  const drawnBearing = drawnLoop[i].bearing + span * t;
  const drawnRadius = drawnLoop[i].radius + (drawnLoop[j].radius - drawnLoop[i].radius) * t;
  const ratio = r / (realRadius || 1);
  const scaled = ratio <= 1 ? Math.pow(ratio, INSIDE) : 1 + OUTSIDE * Math.log(1 + (ratio - 1) * 1.3);
  return [Math.cos(-drawnBearing) * drawnRadius * scaled, Math.sin(-drawnBearing) * drawnRadius * scaled];
}

// ------------------------------------------------------------------- Nodes
interface RawNode {
  id: number;
  en: string;
  ja: string;
  u: number; // ideal position, in grid cells
  v: number;
  seen: number;
  lines: number[];
  codes: { code: string; line: number }[];
  pos?: Pt; // final position, in grid cells
}

const raw: RawNode[] = [];
const byName = new Map<string, RawNode>();
const clean = (name: string) => name.replace(/[〈<].*?[〉>]/g, '').trim(); // "Oshiage<SKYTREE>" becomes "Oshiage"

function node(en: string, ja: string, line: number, code: string, ideal?: Pt) {
  const name = clean(en);
  let n = byName.get(name.toLowerCase());
  if (!n) {
    n = { id: raw.length, en: name, ja: clean(ja), u: 0, v: 0, seen: 0, lines: [], codes: [] };
    raw.push(n);
    byName.set(name.toLowerCase(), n);
  }
  if (ideal) {
    // Average the position over every platform that shares the name.
    n.u = (n.u * n.seen + ideal[0]) / (n.seen + 1);
    n.v = (n.v * n.seen + ideal[1]) / (n.seen + 1);
    n.seen++;
  }
  if (code) n.codes.push({ code, line });
  if (!n.lines.includes(line)) n.lines.push(line);
  return n;
}

// Tokyo Metro lines keep the indexes 0 to 9, which the timetable files rely on.
const lineNodes: number[][] = network.lines.map((line, li) =>
  line.stations.map((s) => node(s.en, s.ja, li, s.code, project(s.lat ?? centre.lat, s.lon ?? centre.lon)).id),
);
const METRO = network.lines.length;
const YAMANOTE_LINE = METRO;
const SHINJUKU_LINE = METRO + 1;
const HAIJIMA_LINE = METRO + 2;
const CHUO_LINE = METRO + 3;
const OME_LINE = METRO + 4;
const YOKOSUKA_LINE = METRO + 5;
const YOKOHAMA_LINE_NO = METRO + 6;
const EXCURSION_LINE = METRO + 7;

// ------------------------------------------------------------------ Anchors
// Interchanges and line ends are pinned to the grid first. Everything
// between two anchors is then spaced evenly along the run that joins them.
const anchors = new Set<number>();
const taken: Pt[] = [];

// The Yamanote stations go exactly on the loop, before anything else.
const loopNodes = YAMANOTE.map((s, i) => {
  const n = node(s.en, s.ja, YAMANOTE_LINE, `JY${String(i + 1).padStart(2, '0')}`);
  n.pos = drawnLoop[i].pos;
  n.u = n.pos[0];
  n.v = n.pos[1];
  anchors.add(n.id);
  taken.push(n.pos);
  return n.id;
});

raw.forEach((n) => n.lines.filter((l) => l < METRO).length > 1 && anchors.add(n.id));
lineNodes.forEach((ids) => {
  anchors.add(ids[0]);
  anchors.add(ids[ids.length - 1]);
});

function snap(n: RawNode) {
  if (n.pos) return;
  let best: Pt = [Math.round(n.u), Math.round(n.v)];
  let bestCost = Infinity;
  const cu = Math.round(n.u);
  const cv = Math.round(n.v);
  for (let du = -5; du <= 5; du++) {
    for (let dv = -5; dv <= 5; dv++) {
      const p: Pt = [cu + du, cv + dv];
      if (taken.some((t) => Math.max(Math.abs(t[0] - p[0]), Math.abs(t[1] - p[1])) < 2)) continue;
      const cost = Math.hypot(p[0] - n.u, p[1] - n.v);
      if (cost < bestCost) {
        bestCost = cost;
        best = p;
      }
    }
  }
  taken.push(best);
  n.pos = best;
}

[...anchors]
  .map((id) => raw[id])
  .sort((a, b) => b.lines.length - a.lines.length || a.id - b.id)
  .forEach(snap);

// ------------------------------------------------------------------- Routes
// The two ways to join two points with one diagonal and one straight leg.
function elbows(a: Pt, b: Pt): Pt[][] {
  const [dx, dy] = sub(b, a);
  const d = Math.min(Math.abs(dx), Math.abs(dy));
  if (d < 1e-6 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 1e-6) return [[a, b]];
  const diag: Pt = [Math.sign(dx) * d, Math.sign(dy) * d];
  return [
    [a, [a[0] + diag[0], a[1] + diag[1]], b],
    [a, [b[0] - diag[0], b[1] - diag[1]], b],
  ];
}

function distToPolyline(p: Pt, poly: Pt[]) {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const ab = sub(b, a);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1)));
    best = Math.min(best, Math.hypot(p[0] - (a[0] + ab[0] * t), p[1] - (a[1] + ab[1] * t)));
  }
  return best;
}

// One route per pair of neighbouring anchors, shared by every line that uses it.
const routes = new Map<string, { from: number; poly: Pt[]; users: number[] }>();
const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function chooseRoute(a: RawNode, b: RawNode, between: RawNode[], heading?: Pt) {
  const options = elbows(a.pos!, b.pos!);
  let best = options[0];
  let bestCost = Infinity;
  for (const option of options) {
    let cost = between.reduce((sum, n) => sum + distToPolyline([n.u, n.v], option) ** 2, 0);
    // Prefer to carry straight on from the way the line arrived.
    if (heading) {
      const first = sub(option[1], option[0]);
      const l = Math.hypot(first[0], first[1]) || 1;
      cost += 1.5 * (1 - (first[0] * heading[0] + first[1] * heading[1]) / l);
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = option;
    }
  }
  return best;
}

for (let pass = 0; pass < 12; pass++) {
  let added = false;

  // Two lines joining the same pair of anchors by way of different stations
  // must not be drawn as one run, so give each a bend of its own.
  const seen = new Map<string, number[]>();
  for (const ids of lineNodes) {
    let last = 0;
    for (let i = 1; i < ids.length; i++) {
      if (!anchors.has(ids[i])) continue;
      const k = key(ids[last], ids[i]);
      const between = ids.slice(last + 1, i);
      const sorted = [...between].sort((x, y) => x - y);
      const other = seen.get(k);
      if (other && other.join() !== sorted.join()) {
        for (const list of [between, other]) {
          const mid = list[Math.floor(list.length / 2)];
          if (mid !== undefined && !anchors.has(mid)) {
            anchors.add(mid);
            snap(raw[mid]);
            added = true;
          }
        }
      } else if (!other) {
        seen.set(k, sorted);
      }
      last = i;
    }
  }

  // Add an anchor wherever a station strays too far from its straight run.
  for (const ids of lineNodes) {
    let last = 0;
    for (let i = 1; i < ids.length; i++) {
      if (!anchors.has(ids[i])) continue;
      const between = ids.slice(last + 1, i).map((id) => raw[id]);
      if (between.length) {
        const route = chooseRoute(raw[ids[last]], raw[ids[i]], between);
        const total = polyLength(route);
        let worst: RawNode | null = null;
        let worstBy = DETOUR;
        between.forEach((n, k) => {
          const ideal = pointAt(route, (total * (k + 1)) / (between.length + 1));
          const off = Math.hypot(ideal[0] - n.u, ideal[1] - n.v);
          if (off > worstBy) {
            worstBy = off;
            worst = n;
          }
        });
        // Also bend the line if the stations would be squeezed together.
        if (!worst && total / (between.length + 1) < 0.9) worst = between[Math.floor(between.length / 2)];
        if (worst && !anchors.has((worst as RawNode).id)) {
          anchors.add((worst as RawNode).id);
          snap(worst as RawNode);
          added = true;
        }
      }
      last = i;
    }
  }
  if (!added) break;
}

// Lay out every run, place the in-between stations, and record who uses it.
interface Run {
  key: string;
  forward: boolean;
  fractions: number[]; // how far along the run each station sits, anchor to anchor
}
const lineRuns: Run[][] = lineNodes.map(() => []);

lineNodes.forEach((ids, li) => {
  let last = 0;
  let heading: Pt | undefined;
  for (let i = 1; i < ids.length; i++) {
    if (!anchors.has(ids[i])) continue;
    const a = raw[ids[last]];
    const b = raw[ids[i]];
    const between = ids.slice(last + 1, i).map((id) => raw[id]);
    const k = key(a.id, b.id);
    let route = routes.get(k);
    if (!route) {
      route = { from: a.id, poly: chooseRoute(a, b, between, heading), users: [] };
      routes.set(k, route);
    }
    if (!route.users.includes(li)) route.users.push(li);
    const forward = route.from === a.id;
    const total = polyLength(route.poly);
    {
      // Remember which way this run leaves, for the next one to follow.
      const travelled = forward ? route.poly : [...route.poly].reverse();
      const end = sub(travelled[travelled.length - 1], travelled[travelled.length - 2]);
      const l = Math.hypot(end[0], end[1]) || 1;
      heading = [end[0] / l, end[1] / l];
    }
    const fractions = [0];
    between.forEach((n, j) => {
      const f = (j + 1) / (between.length + 1);
      fractions.push(f);
      if (!n.pos) n.pos = pointAt(route!.poly, total * (forward ? f : 1 - f));
    });
    fractions.push(1);
    lineRuns[li].push({ key: k, forward, fractions });
    last = i;
  }
});

// ------------------------------------------------------ Hand-placed lines
// Each is a list of stations with the corners (if any) on the way to it.
interface Placed {
  node: number;
  via?: Pt[];
}
const at = (name: string) => byName.get(name.toLowerCase())!;
const place = (en: string, ja: string, line: number, code: string, pos: Pt) => {
  const n = node(en, ja, line, code);
  if (!n.pos) n.pos = pos;
  return n.id;
};

const taka = at('Takadanobaba').pos!;
const shinjuku = at('Shinjuku').pos!;

// Seibu-Shinjuku line: beside the loop from its terminus near Shinjuku up to
// Takadanobaba, then west.
const seibuShinjuku: Placed[] = [];
{
  const out = taka[0] - 1.6;
  seibuShinjuku.push({ node: place(...SEIBU_SHINJUKU[0], SHINJUKU_LINE, 'SS01', [out, shinjuku[1] - 1.4]) });
  seibuShinjuku.push({ node: place(...SEIBU_SHINJUKU[1], SHINJUKU_LINE, 'SS02', taka), via: [[out, taka[1] + 1.6]] });
  let p: Pt = [taka[0] - 2.2, taka[1] - 2.2];
  for (let i = 2; i < SEIBU_SHINJUKU.length; i++) {
    const code = `SS${String(i + 1).padStart(2, '0')}`;
    seibuShinjuku.push({ node: place(...SEIBU_SHINJUKU[i], SHINJUKU_LINE, code, p) });
    // West as far as Kodaira, then north-west toward Kawagoe.
    p = i < 18 ? [p[0] - SEIBU_SPACING, p[1]] : [p[0] - 1.25, p[1] - 1.25];
  }
}

// Seibu Haijima line: south-west from Kodaira.
const seibuHaijima: Placed[] = [{ node: at('Kodaira').id }];
{
  const kodaira = at('Kodaira');
  kodaira.codes.push({ code: 'SS19', line: HAIJIMA_LINE });
  kodaira.lines.push(HAIJIMA_LINE);
  let p: Pt = [kodaira.pos![0] - 1.25, kodaira.pos![1] + 1.25];
  SEIBU_HAIJIMA.forEach((s, i) => {
    seibuHaijima.push({ node: place(...s, HAIJIMA_LINE, `SS${30 + i}`, p) });
    p = [p[0] - 1.25, p[1] + 1.25];
  });
}

// A stretch of hand-placed line along a given route: the first station is
// already in place, the last sits at the end of the route, and any stations in
// between are spaced evenly along it.
function stretch(line: number, from: RawNode, stations: [string, string, string][], route: Pt[]): Placed[] {
  const total = polyLength(route);
  let done = 0;
  return stations.map(([en, ja, code], i) => {
    const reach = (total * (i + 1)) / stations.length;
    const n = raw[place(en, ja, line, code, pointAt(route, reach))];
    const via = slice(route, done, reach).slice(1, -1);
    done = reach;
    return { node: n.id, via };
  });
}
// Of the two ways to join two points, the one that sets off level, or the one that sets off at an angle.
const levelFirst = (a: Pt, b: Pt) => elbows(a, b).find((r) => Math.abs(r[1][1] - r[0][1]) < 1e-6) ?? elbows(a, b)[0];
const coded = (list: [string, string][], prefix: string, first: number) =>
  list.map(([en, ja], i) => [en, ja, `${prefix}${String(first + i).padStart(2, '0')}`] as [string, string, string]);

// JR Chuo Line: across the middle of the loop through stations that are
// already on the map, then west, bending south to reach Tachikawa below the
// Seibu Haijima line, and on to Takao.
const tachikawa: Pt = [at('Seibu-Tachikawa').pos![0] + 6, at('Seibu-Tachikawa').pos![1] + 5];
const chuo: Placed[] = [{ node: place(...CHUO_RAPID[0], CHUO_LINE, 'JC01', at('Tokyo').pos!) }];
{
  const stops = coded(CHUO_RAPID, 'JC', 1);
  let here = at('Tokyo');
  let heading: Pt | undefined;
  const leg = (from: number, to: number, end: Pt, route?: Pt[]) => {
    const chosen = route ?? chooseRoute(here, { pos: end, u: end[0], v: end[1] } as RawNode, [], heading);
    chuo.push(...stretch(CHUO_LINE, here, stops.slice(from, to + 1), chosen));
    const last = sub(chosen[chosen.length - 1], chosen[chosen.length - 2]);
    const l = Math.hypot(last[0], last[1]) || 1;
    heading = [last[0] / l, last[1] / l];
    here = at(stops[to][0]);
  };
  // One stop at a time between stations that already have a place...
  for (const i of [1, 2, 3, 4, 5]) leg(i, i, at(stops[i][0]).pos!);
  // ...then Koenji and Asagaya on the way to Ogikubo...
  leg(6, 8, at('Ogikubo').pos!);
  // ...nine more stations to Tachikawa, and five beyond to Takao.
  leg(9, 18, tachikawa, levelFirst(here.pos!, tachikawa));
  leg(19, 23, [tachikawa[0] - 6.25, tachikawa[1] + 6.25]);
}

// JR Ome Line: from Tachikawa round to Haijima, where it meets the Seibu
// line, then on north-west to Ome and west into the hills to Oku-Tama.
const ome: Placed[] = [{ node: place(...OME[0], OME_LINE, '', tachikawa) }];
{
  const stops = coded(OME, 'JC', 50);
  const haijimaAt = OME.findIndex((st) => st[0] === 'Haijima');
  const haijima = at('Haijima').pos!;
  ome.push(...stretch(OME_LINE, at('Tachikawa'), stops.slice(1, haijimaAt + 1), levelFirst(tachikawa, haijima)));
  const bend: Pt = [haijima[0] - 8.75, haijima[1] - 8.75];
  const beyond = stops.slice(haijimaAt + 1);
  const run = beyond.length * SEIBU_SPACING - Math.hypot(8.75, 8.75);
  ome.push(...stretch(OME_LINE, at('Haijima'), beyond, [haijima, bend, [bend[0] - Math.max(run, 0), bend[1]]]));
}

// JR Yokosuka Line: from Tokyo round the inside of the loop to Shinagawa,
// then south to Yokohama, south-west to Ofuna, down to Kamakura and out
// along the peninsula to Kurihama.
const yokosuka: Placed[] = [{ node: place(...YOKOSUKA[0], YOKOSUKA_LINE, 'JO19', at('Tokyo').pos!) }];
{
  const stops = YOKOSUKA.map(([en, ja], i) => [en, ja, `JO${String(19 - i).padStart(2, '0')}`] as [string, string, string]);
  const push = (from: string, a: number, b: number, route: Pt[]) => yokosuka.push(...stretch(YOKOSUKA_LINE, at(from), stops.slice(a, b + 1), route));
  push('Tokyo', 1, 1, chooseRoute(at('Tokyo'), at('Shimbashi'), []));
  push('Shimbashi', 2, 2, chooseRoute(at('Shimbashi'), at('Shinagawa'), []));
  const s = at('Shinagawa').pos!;
  const yokohama: Pt = [s[0], s[1] + 4 * SEIBU_SPACING];
  const ofuna: Pt = [yokohama[0] - 5, yokohama[1] + 5];
  const kamakura: Pt = [ofuna[0], ofuna[1] + 2 * SEIBU_SPACING];
  push('Shinagawa', 3, 6, [s, yokohama]);
  push('Yokohama', 7, 10, [yokohama, ofuna]);
  push('Ofuna', 11, 12, [ofuna, kamakura]);
  push('Kamakura', 13, 18, [kamakura, [kamakura[0] + 7.5, kamakura[1] + 7.5]]);
}

// JR Yokohama Line: west from Yokohama through Shin-Yokohama, then north-west
// up to Hachioji on the Chuo Line.
const yokohamaLine: Placed[] = [{ node: place(...YOKOHAMA_LINE[0], YOKOHAMA_LINE_NO, '', at('Yokohama').pos!) }];
yokohamaLine.push(
  ...stretch(
    YOKOHAMA_LINE_NO,
    at('Yokohama'),
    YOKOHAMA_LINE.slice(1).map(([en, ja], i) => [en, ja, `JH${13 + i}`] as [string, string, string]),
    levelFirst(at('Yokohama').pos!, at('Hachioji').pos!),
  ),
);

// Long-distance spurs.
const spurShapes: Record<string, { via: Pt[]; to: Pt }> = {
  Kyoto: { via: [], to: [-3, 3] },
  Takaosanguchi: { via: [], to: [-2, 2] },
};
const excursions = EXCURSIONS.map((e, i) => {
  const from = at(e.from);
  const shape = spurShapes[e.en] ?? { via: [], to: [-4, 4] as Pt };
  const rel = (d: Pt): Pt => [from.pos![0] + d[0], from.pos![1] + d[1]];
  from.lines.push(EXCURSION_LINE + i);
  return {
    ...e,
    stations: [{ node: from.id }, { node: place(e.en, e.ja, EXCURSION_LINE + i, '', rel(shape.to)), via: shape.via.map(rel) }] as Placed[],
  };
});

// ------------------------------------------------------------ To the screen
const all = raw.map((n) => n.pos!);
const minU = Math.min(...all.map((p) => p[0])) - MARGIN;
const minV = Math.min(...all.map((p) => p[1])) - MARGIN;
const maxU = Math.max(...all.map((p) => p[0])) + MARGIN;
const maxV = Math.max(...all.map((p) => p[1])) + MARGIN;
const px = (p: Pt): Pt => [Math.round((p[0] - minU) * CELL * 10) / 10, Math.round((p[1] - minV) * CELL * 10) / 10];
const tidy = (p: Pt): Pt => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

export const width = Math.round((maxU - minU) * CELL);
export const height = Math.round((maxV - minV) * CELL);

// Lines that share a run are drawn side by side rather than on top of each other.
function offset(poly: Pt[], d: number): Pt[] {
  if (!d) return poly;
  const normals = poly.slice(1).map((p, i) => {
    const l = len(p, poly[i]) || 1;
    return [-(p[1] - poly[i][1]) / l, (p[0] - poly[i][0]) / l] as Pt;
  });
  return poly.map((p, i) => {
    const a = normals[Math.max(0, i - 1)];
    const b = normals[Math.min(normals.length - 1, i)];
    const scale = d / (1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * scale, p[1] + (a[1] + b[1]) * scale] as Pt;
  });
}

function rounded(points: Pt[], close = false, radius = close ? CORNER * 3 : CORNER) {
  const pts = close ? [...points, points[0], points[1]] : points;
  let d = '';
  const start = close ? ([(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2] as Pt) : pts[0];
  d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const a = pts[i - 1];
    const b = pts[i + 1];
    const la = len(a, p);
    const lb = len(b, p);
    const r = Math.min(radius, la / 2, lb / 2);
    if (r < 0.5) {
      d += ` L${p[0]} ${p[1]}`;
      continue;
    }
    const inPt = [p[0] + ((a[0] - p[0]) / la) * r, p[1] + ((a[1] - p[1]) / la) * r];
    const outPt = [p[0] + ((b[0] - p[0]) / lb) * r, p[1] + ((b[1] - p[1]) / lb) * r];
    d += ` L${inPt[0].toFixed(1)} ${inPt[1].toFixed(1)} Q${p[0]} ${p[1]} ${outPt[0].toFixed(1)} ${outPt[1].toFixed(1)}`;
  }
  if (close) return `${d} Z`;
  const end = pts[pts.length - 1];
  return `${d} L${end[0]} ${end[1]}`;
}

function joined(segs: Pt[][]) {
  const whole: Pt[] = [];
  for (const seg of segs) {
    for (const p of seg) {
      const prev = whole[whole.length - 1];
      if (!prev || len(prev, p) > 0.05) whole.push(p);
    }
  }
  return whole;
}

const metroLines: MetroLine[] = network.lines.map((line, li) => {
  const segs: Pt[][] = [];
  for (const run of lineRuns[li]) {
    const route = routes.get(run.key)!;
    const users = [...route.users].sort((a, b) => a - b);
    const side = (users.indexOf(li) - (users.length - 1) / 2) * LINE_WIDTH;
    let poly = offset(route.poly.map(px), side);
    if (!run.forward) poly = [...poly].reverse();
    const total = polyLength(poly);
    for (let j = 0; j < run.fractions.length - 1; j++) {
      segs.push(slice(poly, total * run.fractions[j], total * run.fractions[j + 1]).map(tidy));
    }
  }
  return {
    id: line.id,
    name: line.name,
    ja: line.ja,
    code: line.code,
    color: line.color,
    kind: 'metro',
    loop: false,
    nodes: lineNodes[li],
    segs,
    path: rounded(joined(segs)),
  };
});

// Roughly how long a stopping train takes over a given distance: time to pull
// away, stop and wait, plus running time. Tuned so a Yamanote lap comes to
// about an hour and Seibu-Shinjuku to Hon-Kawagoe to about seventy minutes.
const hopMinutes = (distanceKm: number) => Math.round((0.9 + distanceKm * 0.95) * 100) / 100;
const gaps = (marks: number[]) => marks.slice(1).map((mark, i) => hopMinutes(mark - marks[i]));

// The Yamanote loop, cut into station-to-station pieces.
const loopPx = loopPoly.map(px);
const loopPxLength = polyLength(loopPx);
const yamanote: MetroLine = {
  id: 'Yamanote',
  name: 'Yamanote Line',
  ja: '山手線',
  code: 'JY',
  color: '#9acd32',
  kind: 'jr',
  loop: true,
  sim: {
    headway: 4,
    // Straight-line distance between neighbouring stations, plus a little for curves.
    hops: YAMANOTE.map((s, i) => {
      const next = YAMANOTE[(i + 1) % YAMANOTE.length];
      const a = km(s.lat, s.lon);
      const b = km(next.lat, next.lon);
      return hopMinutes(Math.hypot(a[0] - b[0], a[1] - b[1]) * 1.12);
    }),
  },
  nodes: loopNodes,
  segs: loopNodes.map((_, i) => {
    const from = (loopDistance(i) / loopLength) * loopPxLength;
    const to = (loopDistance(i + 1) / loopLength) * loopPxLength;
    const seg = to > from ? slice(loopPx, from, to) : [...slice(loopPx, from, loopPxLength), ...slice(loopPx, 0, to).slice(1)];
    return seg.map(tidy);
  }),
  path: rounded(loopPx.slice(0, -1), true),
};

function handPlaced(id: string, name: string, ja: string, code: string, color: string, kind: MetroLine['kind'], stations: Placed[], sim?: MetroLine['sim']): MetroLine {
  const segs = stations.slice(1).map((s, i) => [raw[stations[i].node].pos!, ...(s.via ?? []), raw[s.node].pos!].map(px).map(tidy));
  return { id, name, ja, code, color, kind, loop: false, sim, nodes: stations.map((s) => s.node), segs, path: rounded(joined(segs)) };
}

export const lines: MetroLine[] = [
  ...metroLines,
  yamanote,
  handPlaced('SeibuShinjuku', 'Seibu-Shinjuku Line', '西武新宿線', 'SS', '#0b9ad6', 'seibu', seibuShinjuku, { headway: 6, hops: gaps(SEIBU_SHINJUKU_KM) }),
  handPlaced('SeibuHaijima', 'Seibu Haijima Line', '西武拝島線', 'SS', '#0b9ad6', 'seibu', seibuHaijima, { headway: 10, hops: gaps(SEIBU_HAIJIMA_KM) }),
  handPlaced('ChuoRapid', 'Chuo Line', '中央線', 'JC', '#f15a22', 'rail', chuo),
  handPlaced('Ome', 'Ome Line', '青梅線', 'JC', '#f15a22', 'rail', ome),
  handPlaced('Yokosuka', 'Yokosuka Line', '横須賀線', 'JO', '#007ac1', 'rail', yokosuka),
  handPlaced('YokohamaLine', 'Yokohama Line', '横浜線', 'JH', '#5fa83a', 'rail', yokohamaLine),
  ...excursions.map((e) => handPlaced(`To${e.en}`, `${e.by} to ${e.en}`, e.ja, '', e.en === 'Kyoto' ? '#1153af' : '#8a93a6', 'excursion', e.stations)),
];

// ------------------------------------------------------------------- Labels
const LABEL_SIZE = 11.5;
const charWidth = LABEL_SIZE * 0.56;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const hit = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Points along every line, so labels can avoid sitting on top of them.
const ink: Pt[] = [];
for (const line of lines) {
  for (const seg of line.segs) {
    const total = polyLength(seg);
    for (let d = 0; d <= total; d += 5) ink.push(pointAt(seg, d));
  }
}

const placed: Box[] = [];
const positions = raw.map((n) => px(n.pos!));
// Stations that lead to a page carry a second line of text under their name.
const tall = new Set(Object.keys(stops).map((name) => byName.get(name.toLowerCase())?.id));
const LINE2 = 13;

function placeLabel(n: RawNode): MetroNode['label'] {
  const [x, y] = positions[n.id];
  const extra = tall.has(n.id) ? LINE2 : 0;
  const w = Math.max(n.en.length, extra ? 12 : 0) * charWidth + 4;
  const h = LABEL_SIZE + 3 + extra;
  const big = n.lines.length > 1 || extra > 0;
  const gap = big ? 13 : 10;
  const diag = gap * 0.75;
  type Option = { box: Box; anchor: 'start' | 'middle' | 'end'; tx: number; ty: number; bias: number };
  const first = LABEL_SIZE - 1; // baseline of the first line, from the top of the box
  const options: Option[] = [
    { box: { x: x + gap, y: y - h / 2, w, h }, anchor: 'start', tx: x + gap, ty: y - h / 2 + first, bias: 0 },
    { box: { x: x - gap - w, y: y - h / 2, w, h }, anchor: 'end', tx: x - gap, ty: y - h / 2 + first, bias: 0.2 },
    { box: { x: x - w / 2, y: y + gap, w, h }, anchor: 'middle', tx: x, ty: y + gap + first, bias: 0.4 },
    { box: { x: x - w / 2, y: y - gap - h, w, h }, anchor: 'middle', tx: x, ty: y - gap - h + first, bias: 0.4 },
    { box: { x: x + diag, y: y - diag - h, w, h }, anchor: 'start', tx: x + diag, ty: y - diag - h + first, bias: 0.6 },
    { box: { x: x + diag, y: y + diag, w, h }, anchor: 'start', tx: x + diag, ty: y + diag + first, bias: 0.6 },
    { box: { x: x - diag - w, y: y - diag - h, w, h }, anchor: 'end', tx: x - diag, ty: y - diag - h + first, bias: 0.8 },
    { box: { x: x - diag - w, y: y + diag, w, h }, anchor: 'end', tx: x - diag, ty: y + diag + first, bias: 0.8 },
  ];
  // A second ring of the same positions, a little further out.
  for (const o of [...options]) {
    const dx = o.box.x + o.box.w / 2 - x;
    const dy = o.box.y + o.box.h / 2 - y;
    const sx = o.anchor === 'middle' ? 0 : Math.sign(dx) * 10;
    const sy = Math.abs(dy) < 2 ? 0 : Math.sign(dy) * 10;
    options.push({ box: { ...o.box, x: o.box.x + sx, y: o.box.y + sy }, anchor: o.anchor, tx: o.tx + sx, ty: o.ty + sy, bias: o.bias + 1.5 });
  }
  let best = options[0];
  let bestCost = Infinity;
  for (const option of options) {
    const pad: Box = { x: option.box.x - 2, y: option.box.y - 1, w: option.box.w + 4, h: option.box.h + 2 };
    let cost = option.bias;
    for (const other of placed) if (hit(pad, other)) cost += 40;
    for (const p of ink) if (p[0] > pad.x && p[0] < pad.x + pad.w && p[1] > pad.y && p[1] < pad.y + pad.h) cost += 2;
    positions.forEach((p, id) => {
      if (id !== n.id && hit(pad, { x: p[0] - 7, y: p[1] - 7, w: 14, h: 14 })) cost += 20;
    });
    if (cost < bestCost) {
      bestCost = cost;
      best = option;
    }
  }
  placed.push(best.box);
  return { x: Math.round(best.tx * 10) / 10, y: Math.round(best.ty * 10) / 10, anchor: best.anchor };
}

const labels = new Map<number, MetroNode['label']>();
[...raw]
  .sort((a, b) => Number(tall.has(b.id)) - Number(tall.has(a.id)) || b.lines.length - a.lines.length || a.id - b.id)
  .forEach((n) => labels.set(n.id, placeLabel(n)));

export const nodes: MetroNode[] = raw.map((n) => ({
  id: n.id,
  en: n.en,
  ja: n.ja,
  x: positions[n.id][0],
  y: positions[n.id][1],
  lines: n.lines,
  codes: n.codes,
  interchange: n.lines.length > 1,
  label: labels.get(n.id)!,
}));

export const lineWidth = LINE_WIDTH;
export const labelSize = LABEL_SIZE;
export const labelLine2 = LINE2;
export const fetched = network.fetched;

// ---------------------------------------------------------- The physical map
// A second arrangement of the same stations and lines, this time where they
// really are. Lines run straight from station to station. Station markers and
// labels are kept the same size on screen whatever the zoom, so their label
// positions are worked out for one particular zoom (GEO_ZOOM).
const GEO_SCALE = 40; // pixels per kilometre at zoom 1
const GEO_ZOOM = 2.5; // the zoom the physical map opens at
const GEO_MARGIN = 25; // kilometres of surroundings shown around everything
const COAST_GRID = 2; // kilometres: the size of the steps the coastline is drawn in
const COAST_CORNER = 16; // how rounded the coastline's corners are, in pixels

const metroWhere = new Map<string, Pt[]>();
for (const line of network.lines) {
  for (const st of line.stations) {
    if (st.lat == null || st.lon == null) continue;
    const k = clean(st.en).toLowerCase();
    metroWhere.set(k, [...(metroWhere.get(k) ?? []), [st.lat, st.lon]]);
  }
}
const otherWhere = new Map<string, Pt>([
  ...YAMANOTE.map((st) => [st.en.toLowerCase(), [st.lat, st.lon]] as [string, Pt]),
  ...Object.entries(otherStations.stations as Record<string, number[]>).map(([name, c]) => [name.toLowerCase(), [c[0], c[1]]] as [string, Pt]),
  ...TOKAIDO_SHINKANSEN.map((st) => [st.en.toLowerCase(), [st.lat, st.lon]] as [string, Pt]),
]);
const realKm = raw.map((n) => {
  const metro = metroWhere.get(n.en.toLowerCase());
  const at: Pt | undefined = metro
    ? [metro.reduce((sum, c) => sum + c[0], 0) / metro.length, metro.reduce((sum, c) => sum + c[1], 0) / metro.length]
    : otherWhere.get(n.en.toLowerCase());
  if (!at) console.warn(`[map] No real-world position for ${n.en}; it is drawn at the centre of the physical map.`);
  return at ? km(at[0], at[1]) : ([0, 0] as Pt);
});
const bulletKm = TOKAIDO_SHINKANSEN.map((st) => km(st.lat, st.lon));
const everyKm = [...realKm, ...bulletKm];
const west = Math.min(...everyKm.map((p) => p[0])) - GEO_MARGIN;
const north = Math.min(...everyKm.map((p) => p[1])) - GEO_MARGIN;
const east = Math.max(...everyKm.map((p) => p[0])) + GEO_MARGIN;
const south = Math.max(...everyKm.map((p) => p[1])) + GEO_MARGIN;
const gpx = (p: Pt): Pt => [Math.round((p[0] - west) * GEO_SCALE * 10) / 10, Math.round((p[1] - north) * GEO_SCALE * 10) / 10];
const realPx = realKm.map(gpx);

// The Keio line out to Mt. Takao, and the stops on it worth naming.
// The source spells long vowels with accents (Chōfu); the rest of the map does not.
const plain = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '');
const keioWay = (otherStations.keio as { en: string; ja: string; lat: number; lon: number }[]).map((st) => ({ ...st, en: plain(st.en) }));
const KEIO_NAMED = ['Meidaimae', 'Chofu', 'Fuchu', 'Seiseki-sakuragaoka', 'Takahatafudo', 'Kitano', 'Mejirodai'];

const geoLines = lines.map((line) => {
  const pts = line.nodes.map((id) => realPx[id]);
  if (line.id === 'ToKyoto') {
    // The spur to Kyoto becomes the whole Shinkansen route, stop by stop:
    // Tokyo, Shinagawa and Shin-Yokohama are stations on the map already.
    const stops = TOKAIDO_SHINKANSEN.slice(3, -1).map((st) => gpx(km(st.lat, st.lon)));
    const route = [pts[0], ...stops, pts[pts.length - 1]];
    return { segs: [route], path: rounded([realPx[at('Tokyo').id], realPx[at('Shinagawa').id], ...route]) };
  }
  if (line.id === 'ToTakaosanguchi') {
    // The spur to Mt. Takao becomes the Keio line all the way from Shinjuku.
    const way = keioWay.slice(1, -1).map((st) => gpx(km(st.lat, st.lon)));
    return { segs: [[pts[0], pts[pts.length - 1]]], path: rounded([realPx[at('Shinjuku').id], ...way, pts[pts.length - 1]]) };
  }
  const segs = pts.slice(1).map((p, i) => [pts[i], p]);
  if (line.loop) segs.push([pts[pts.length - 1], pts[0]]);
  return { segs, path: line.loop ? rounded(pts, true) : rounded(pts) };
});

// Arrange the labels as they will look at the opening zoom, reusing the
// label placer above by handing it this map's positions and lines.
ink.length = 0;
placed.length = 0;
for (const line of geoLines) {
  for (const seg of line.segs) {
    const scaled = seg.map((p) => [p[0] * GEO_ZOOM, p[1] * GEO_ZOOM] as Pt);
    const total = polyLength(scaled);
    for (let d = 0; d <= total; d += 5) ink.push(pointAt(scaled, d));
  }
}
realPx.forEach((p, i) => (positions[i] = [p[0] * GEO_ZOOM, p[1] * GEO_ZOOM]));
const geoLabels = new Map<number, MetroNode['label']>();
[...raw]
  .sort((a, b) => Number(tall.has(b.id)) - Number(tall.has(a.id)) || b.lines.length - a.lines.length || a.id - b.id)
  .forEach((n) => geoLabels.set(n.id, placeLabel(n)));

// The coastline, redrawn the way the lines are: every point is moved onto a
// coarse grid, and each stretch between two points becomes one diagonal and
// one straight step, so the land only ever turns in 45-degree corners.
function angular(ring: number[][]): Pt[] {
  const snapped: Pt[] = [];
  for (const [lat, lon] of ring) {
    const p = km(lat, lon);
    const q: Pt = [Math.round(p[0] / COAST_GRID) * COAST_GRID, Math.round(p[1] / COAST_GRID) * COAST_GRID];
    const last = snapped[snapped.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) snapped.push(q);
  }
  const stepped: Pt[] = [];
  snapped.forEach((a, i) => {
    const b = snapped[(i + 1) % snapped.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.min(Math.abs(dx), Math.abs(dy));
    stepped.push(a);
    if (d > 0 && Math.abs(dx) !== Math.abs(dy)) stepped.push([a[0] + Math.sign(dx) * d, a[1] + Math.sign(dy) * d]);
  });
  // Points in the middle of a straight run add nothing.
  return stepped.filter((p, i) => {
    const a = stepped[(i - 1 + stepped.length) % stepped.length];
    const b = stepped[(i + 1) % stepped.length];
    return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-9;
  });
}
const outline = (ring: number[][]) => {
  const points = angular(ring);
  return points.length >= 4 ? rounded(points.map(gpx), true, COAST_CORNER) : null;
};
const landPaths = (landData.land as number[][][]).map(outline).filter((d): d is string => d !== null);
const lakePaths = (landData.lakes as number[][][]).map(outline).filter((d): d is string => d !== null);

const loopReal = loopNodes.map((id) => realPx[id]);
export const geo = {
  width: Math.round((east - west) * GEO_SCALE),
  height: Math.round((south - north) * GEO_SCALE),
  zoom: GEO_ZOOM,
  start: {
    x: Math.round(loopReal.reduce((sum, p) => sum + p[0], 0) / loopReal.length),
    y: Math.round(loopReal.reduce((sum, p) => sum + p[1], 0) / loopReal.length),
  },
  // For each station: where it is, then where its label goes relative to it (in screen pixels).
  nodes: raw.map((n) => {
    const label = geoLabels.get(n.id)!;
    return [
      realPx[n.id][0],
      realPx[n.id][1],
      Math.round((label.x - realPx[n.id][0] * GEO_ZOOM) * 10) / 10,
      Math.round((label.y - realPx[n.id][1] * GEO_ZOOM) * 10) / 10,
      label.anchor,
    ] as [number, number, number, number, 'start' | 'middle' | 'end'];
  }),
  lines: geoLines,
  // The shape of the land and its large lakes, as SVG paths.
  land: landPaths,
  water: lakePaths,
  // Stops on the long-distance routes, shown only on this map: the Shinkansen
  // between Shinagawa and Kyoto, and the main stops of the Keio line.
  stops: [
    ...TOKAIDO_SHINKANSEN.slice(3, -1).map((st) => ({ ...st, color: '#1153af' })),
    ...keioWay.filter((st) => KEIO_NAMED.includes(st.en)).map((st) => ({ ...st, color: '#8a93a6' })),
  ].map((st) => {
    const p = gpx(km(st.lat, st.lon));
    return { en: st.en, ja: st.ja, x: p[0], y: p[1], color: st.color };
  }),
};
