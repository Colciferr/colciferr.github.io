// Works out where everything goes on the Kansai map (Osaka and Kyoto).
//
// It produces the same things as src/lib/metro-layout.ts does for Tokyo, by a
// simpler route. Real positions are stretched where stations are crowded and
// squeezed where they are sparse, so the middle of Osaka and Kyoto open up
// and the long run between the two cities closes in. Interchanges and line
// ends are then pinned to a grid, and every line is drawn between them using
// only horizontal, vertical and 45-degree runs, with the stations in between
// spaced evenly.
//
// The numbers under "Tuning" control the overall look. To move one station by
// hand, add it to PINNED.
import network from '../data/kansai/network.json';
import landData from '../data/metro/land.json';
import type { MetroLine, MetroNode, Pt } from './metro-layout';

// ------------------------------------------------------------------ Tuning
const DENSE = 4.2; // grid cells per kilometre where stations are crowded
const SPARSE = 0.4; // grid cells per kilometre where there are few
const CROWD = 22; // how many stations within WINDOW km (east-west or north-south) counts as crowded
const WINDOW = 1.6;
const CELL = 30; // pixels per grid cell
const MARGIN = 5; // empty cells around the network
const DETOUR = 2.6; // how far (in cells) a station may sit from a straight run before the line bends to meet it
const LINE_WIDTH = 7;
const CORNER = 12;
const CENTRE = { lat: 34.7, lon: 135.5 }; // where kilometres are measured from: Osaka

// Stations placed by hand, in grid cells relative to where they would
// otherwise land: { 'Station name': [cells right, cells down] }.
const PINNED: Record<string, Pt> = {};

// Roughly how often trains run, in minutes: at rush hour, in the daytime,
// and early or late. These are typical figures, not a timetable.
const HEADWAY: Record<string, [number, number, number]> = {
  Midosuji: [2.5, 4, 6],
  Tanimachi: [3.5, 6, 8],
  Yotsubashi: [3.5, 6, 8],
  Chuo: [4, 7, 8],
  Sennichimae: [4.5, 7, 8],
  Sakaisuji: [4, 6, 8],
  Nagahori: [4.5, 7, 8],
  Imazatosuji: [5.5, 8, 10],
  Karasuma: [4.5, 7.5, 10],
  Tozai: [5, 7.5, 10],
  OsakaLoop: [4, 5, 7],
  JRKyoto: [6, 7.5, 12],
  HankyuKyoto: [6, 10, 12],
  Keihan: [5, 10, 12],
};

// ---------------------------------------------------------------- Geometry
const len = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const polyLength = (poly: Pt[]) => poly.slice(1).reduce((sum, p, i) => sum + len(poly[i], p), 0);

function pointAt(poly: Pt[], distance: number): Pt {
  let left = distance;
  for (let i = 1; i < poly.length; i++) {
    const l = len(poly[i - 1], poly[i]);
    if (left <= l || i === poly.length - 1) {
      const f = l ? Math.min(1, left / l) : 0;
      return [poly[i - 1][0] + (poly[i][0] - poly[i - 1][0]) * f, poly[i - 1][1] + (poly[i][1] - poly[i - 1][1]) * f];
    }
    left -= l;
  }
  return poly[poly.length - 1];
}

// The piece of a polyline between two distances along it.
function slice(poly: Pt[], from: number, to: number): Pt[] {
  const out: Pt[] = [pointAt(poly, from)];
  let walked = 0;
  for (let i = 1; i < poly.length; i++) {
    walked += len(poly[i - 1], poly[i]);
    if (walked > from + 1e-6 && walked < to - 1e-6) out.push(poly[i]);
  }
  out.push(pointAt(poly, to));
  return out;
}

function distToPolyline(p: Pt, poly: Pt[]) {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2)) : 0;
    best = Math.min(best, len(p, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
  }
  return best;
}

// Real positions, in kilometres east and south of the middle of Osaka.
const km = (lat: number, lon: number): Pt => [(lon - CENTRE.lon) * 111.32 * Math.cos((CENTRE.lat * Math.PI) / 180), -(lat - CENTRE.lat) * 110.57];

// ------------------------------------------------------------------- Nodes
// One node per station. Lines meet where they share a station name; the two
// cities each have a Kujo, so the name alone is not enough.
interface RawNode {
  id: number;
  en: string;
  ja: string;
  where: Pt[]; // real positions (km), one per line that calls here
  real: Pt;
  ideal: Pt; // where it would sit on the grid if nothing got in the way
  pos?: Pt;
  lines: number[];
  codes: { code: string; line: number }[];
}
const raw: RawNode[] = [];
const byKey = new Map<string, RawNode>();
const lineNodes: number[][] = network.lines.map((line, li) =>
  line.stations.map((st) => {
    const key = `${st.ja}@${st.lat > 34.86 ? 'kyoto' : 'osaka'}`;
    let n = byKey.get(key);
    if (!n) {
      n = { id: raw.length, en: st.en, ja: st.ja, where: [], real: [0, 0], ideal: [0, 0], lines: [], codes: [] };
      raw.push(n);
      byKey.set(key, n);
    }
    n.where.push(km(st.lat, st.lon));
    if (!n.lines.includes(li)) n.lines.push(li);
    n.codes.push({ code: st.code, line: li });
    return n.id;
  }),
);
for (const n of raw) n.real = [n.where.reduce((s, p) => s + p[0], 0) / n.where.length, n.where.reduce((s, p) => s + p[1], 0) / n.where.length];

// ------------------------------------------------------------- Stretching
// Along each axis, a kilometre is worth more grid cells where many stations
// share that stretch and fewer where hardly any do.
function stretcher(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const STEP = 0.25;
  const marks: number[] = [0];
  for (let v = min; v < max; v += STEP) {
    const mid = v + STEP / 2;
    const near = values.filter((x) => Math.abs(x - mid) <= WINDOW).length;
    const scale = SPARSE + (DENSE - SPARSE) * Math.min(1, near / CROWD) ** 2;
    marks.push(marks[marks.length - 1] + scale * STEP);
  }
  return (v: number) => {
    const at = Math.max(0, Math.min(marks.length - 1.000001, (v - min) / STEP));
    const i = Math.floor(at);
    return marks[i] + (marks[i + 1] - marks[i]) * (at - i);
  };
}
const across = stretcher(raw.map((n) => n.real[0]));
const down = stretcher(raw.map((n) => n.real[1]));
for (const n of raw) {
  const nudge = PINNED[n.en] ?? [0, 0];
  n.ideal = [across(n.real[0]) + nudge[0], down(n.real[1]) + nudge[1]];
}

// ------------------------------------------------------------------ Anchors
// Interchanges and line ends are pinned to the grid first.
const taken = new Map<string, number>();
function snap(n: RawNode) {
  if (n.pos) return;
  const cx = Math.round(n.ideal[0]);
  const cy = Math.round(n.ideal[1]);
  let best: Pt | null = null;
  let bestD = Infinity;
  for (let r = 0; r <= 4 && !best; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const p: Pt = [cx + dx, cy + dy];
        if (taken.has(p.join(','))) continue;
        const d = len(p, n.ideal);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
    }
  }
  n.pos = best ?? [cx, cy];
  taken.set(n.pos.join(','), n.id);
}
const anchor = new Set<number>();
network.lines.forEach((line, li) => {
  const ids = lineNodes[li];
  if (!line.loop) {
    anchor.add(ids[0]);
    anchor.add(ids[ids.length - 1]);
  }
});
for (const n of raw) if (n.lines.length > 1) anchor.add(n.id);
// Busiest interchanges choose their grid square first.
[...anchor].sort((a, b) => raw[b].lines.length - raw[a].lines.length || a - b).forEach((id) => snap(raw[id]));

// ------------------------------------------------------------------- Routes
// The two ways to join two points with one diagonal and one straight leg.
function elbows(a: Pt, b: Pt): Pt[][] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.min(Math.abs(dx), Math.abs(dy));
  if (d === 0 || Math.abs(dx) === Math.abs(dy)) return [[a, b]];
  const diag: Pt = [Math.sign(dx) * d, Math.sign(dy) * d];
  return [
    [a, [a[0] + diag[0], a[1] + diag[1]], b], // diagonal first
    [a, [b[0] - diag[0], b[1] - diag[1]], b], // straight first
  ];
}

// The route between two neighbouring anchors: whichever elbow passes closest
// to the stations in between and keeps clear of other pinned stations.
function chooseRoute(a: RawNode, b: RawNode, between: RawNode[]): Pt[] {
  let best: Pt[] = [a.pos!, b.pos!];
  let bestCost = Infinity;
  for (const option of elbows(a.pos!, b.pos!)) {
    let cost = 0;
    for (const n of between) cost += distToPolyline(n.ideal, option);
    for (const id of anchor) {
      if (id === a.id || id === b.id) continue;
      const d = distToPolyline(raw[id].pos!, option);
      if (d < 0.6) cost += 50;
      else if (d < 1.1) cost += 4;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = option;
    }
  }
  return best;
}

// Where a run of plain stations strays too far from the straightest route,
// the one furthest out becomes a corner the line bends to meet.
function bend(ids: number[]) {
  const a = raw[ids[0]];
  const b = raw[ids[ids.length - 1]];
  const between = ids.slice(1, -1).map((id) => raw[id]);
  if (!between.length) return;
  const route = chooseRoute(a, b, between);
  let worst = -1;
  let worstD = DETOUR;
  between.forEach((n, i) => {
    const d = distToPolyline(n.ideal, route);
    if (d > worstD) {
      worstD = d;
      worst = i + 1;
    }
  });
  if (worst < 0) return;
  anchor.add(ids[worst]);
  snap(raw[ids[worst]]);
  bend(ids.slice(0, worst + 1));
  bend(ids.slice(worst));
}

// Split each line into runs between neighbouring anchors.
const runsOf = (li: number) => {
  const ids = network.lines[li].loop ? [...lineNodes[li], lineNodes[li][0]] : lineNodes[li];
  const marks = ids.map((id, i) => (anchor.has(id) ? i : -1)).filter((i) => i >= 0);
  return marks.slice(1).map((end, k) => ids.slice(marks[k], end + 1));
};
network.lines.forEach((_, li) => runsOf(li).forEach(bend));

// Lay out every run.
interface Run {
  ids: number[];
  poly: Pt[];
}
const lineRuns: Run[][] = network.lines.map((_, li) =>
  runsOf(li).map((ids) => ({
    ids,
    poly: chooseRoute(
      raw[ids[0]],
      raw[ids[ids.length - 1]],
      ids.slice(1, -1).map((id) => raw[id]),
    ),
  })),
);

// Which lines run along each one-cell step of the grid, so that lines
// sharing a stretch can be drawn side by side.
const stepsOf = (poly: Pt[]) => {
  const keys: string[] = [];
  for (let i = 1; i < poly.length; i++) {
    const [ax, ay] = poly[i - 1];
    const [bx, by] = poly[i];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k < n; k++) {
      const p = [ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n];
      const q = [ax + ((bx - ax) * (k + 1)) / n, ay + ((by - ay) * (k + 1)) / n];
      const [u, v] = p[1] < q[1] || (p[1] === q[1] && p[0] < q[0]) ? [p, q] : [q, p];
      keys.push(`${u.join(',')}|${v.join(',')}`);
    }
  }
  return keys;
};
const users = new Map<string, Set<number>>();
lineRuns.forEach((runs, li) =>
  runs.forEach((run) =>
    stepsOf(run.poly).forEach((key) => {
      if (!users.has(key)) users.set(key, new Set());
      users.get(key)!.add(li);
    }),
  ),
);
// Plain stations sit evenly along their run.
for (const runs of lineRuns) {
  for (const run of runs) {
    const total = polyLength(run.poly);
    run.ids.forEach((id, i) => {
      if (!raw[id].pos) raw[id].pos = pointAt(run.poly, (total * i) / (run.ids.length - 1));
    });
  }
}

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

function rounded(points: Pt[], close = false, radius = CORNER) {
  const pts = close ? [...points, points[0], points[1]] : points;
  const start = close ? ([(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2] as Pt) : pts[0];
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
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

// Roughly how long a stopping train takes over a given distance: time to pull
// away, stop and wait, plus running time (the same rule as the Tokyo map).
const hopMinutes = (distanceKm: number) => Math.round((0.9 + distanceKm * 0.95) * 100) / 100;

export const lines: MetroLine[] = network.lines.map((line, li) => {
  const segs: Pt[][] = [];
  for (const run of lineRuns[li]) {
    // Every line this run shares a stretch with, in a fixed order.
    const group = [...new Set(stepsOf(run.poly).flatMap((key) => [...users.get(key)!]))].sort((a, b) => a - b);
    const side = (group.indexOf(li) - (group.length - 1) / 2) * LINE_WIDTH;
    // Shift sideways as seen heading down the map, so two lines sharing a
    // stretch move apart whichever way each is being drawn.
    const first = run.poly[0];
    const end = run.poly[run.poly.length - 1];
    const flipped = first[1] > end[1] || (first[1] === end[1] && first[0] > end[0]);
    let poly = offset((flipped ? [...run.poly].reverse() : run.poly).map(px), side);
    if (flipped) poly = [...poly].reverse();
    const total = polyLength(poly);
    const hops = run.ids.length - 1;
    for (let j = 0; j < hops; j++) segs.push(slice(poly, (total * j) / hops, (total * (j + 1)) / hops).map(tidy));
  }
  const ids = lineNodes[li];
  const stops = line.loop ? [...ids, ids[0]] : ids;
  const [rush, day, quiet] = HEADWAY[line.id] ?? [6, 8, 10];
  const whole = joined(segs);
  return {
    id: line.id,
    name: line.name,
    ja: line.ja,
    code: line.code,
    color: line.color,
    kind: line.kind as MetroLine['kind'],
    loop: line.loop,
    sim: {
      headway: day,
      rush,
      quiet,
      // Straight-line distance between neighbouring stations, plus a little for curves.
      hops: stops.slice(1).map((id, i) => hopMinutes(len(raw[stops[i]].real, raw[id].real) * 1.12)),
    },
    nodes: ids,
    segs,
    path: line.loop ? rounded(whole.slice(0, -1), true) : rounded(whole),
  };
});

// ------------------------------------------------------------------- Labels
const LABEL_SIZE = 11.5;
const LINE2 = 13;
const charWidth = LABEL_SIZE * 0.56;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const hit = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Places every station's name where it overlaps the least: other names,
// other stations, and the lines themselves.
function labelsFor(positions: Pt[], drawn: Pt[][]) {
  const ink: Pt[] = [];
  for (const seg of drawn) {
    const total = polyLength(seg);
    for (let d = 0; d <= total; d += 5) ink.push(pointAt(seg, d));
  }
  const placed: Box[] = [];
  const place = (n: RawNode): MetroNode['label'] => {
    const [x, y] = positions[n.id];
    const w = n.en.length * charWidth + 4;
    const h = LABEL_SIZE + 3;
    const gap = n.lines.length > 1 ? 13 : 10;
    const diag = gap * 0.75;
    type Option = { box: Box; anchor: 'start' | 'middle' | 'end'; tx: number; ty: number; bias: number };
    const first = LABEL_SIZE - 1;
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
  };
  const labels = new Map<number, MetroNode['label']>();
  [...raw].sort((a, b) => b.lines.length - a.lines.length || a.id - b.id).forEach((n) => labels.set(n.id, place(n)));
  return labels;
}

const positions = raw.map((n) => px(n.pos!));
const labels = labelsFor(
  positions,
  lines.flatMap((l) => l.segs),
);

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
// The same stations and lines where they really are, with lines running
// straight from station to station.
const GEO_SCALE = 40; // pixels per kilometre at zoom 1
const GEO_ZOOM = 2.5; // the zoom the physical map opens at
const GEO_MARGIN = 25; // kilometres of surroundings shown around everything
const COAST_GRID = 2; // kilometres: the size of the steps the coastline is drawn in
const COAST_CORNER = 16;

const west = Math.min(...raw.map((n) => n.real[0])) - GEO_MARGIN;
const north = Math.min(...raw.map((n) => n.real[1])) - GEO_MARGIN;
const east = Math.max(...raw.map((n) => n.real[0])) + GEO_MARGIN;
const south = Math.max(...raw.map((n) => n.real[1])) + GEO_MARGIN;
const gpx = (p: Pt): Pt => [Math.round((p[0] - west) * GEO_SCALE * 10) / 10, Math.round((p[1] - north) * GEO_SCALE * 10) / 10];
const realPx = raw.map((n) => gpx(n.real));

const geoLines = lines.map((line) => {
  const pts = line.nodes.map((id) => realPx[id]);
  const segs = pts.slice(1).map((p, i) => [pts[i], p]);
  if (line.loop) segs.push([pts[pts.length - 1], pts[0]]);
  return { segs, path: line.loop ? rounded(pts, true) : rounded(pts) };
});
const geoLabels = labelsFor(
  realPx.map((p) => [p[0] * GEO_ZOOM, p[1] * GEO_ZOOM] as Pt),
  geoLines.flatMap((l) => l.segs.map((seg) => seg.map((p) => [p[0] * GEO_ZOOM, p[1] * GEO_ZOOM] as Pt))),
);

// Cut a ring of [x, y] kilometres down to the part inside a box.
function clip(ring: Pt[], box: { w: number; e: number; n: number; s: number }): Pt[] {
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= box.w, (a, b) => [box.w, a[1] + ((b[1] - a[1]) * (box.w - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= box.e, (a, b) => [box.e, a[1] + ((b[1] - a[1]) * (box.e - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= box.n, (a, b) => [a[0] + ((b[0] - a[0]) * (box.n - a[1])) / (b[1] - a[1]), box.n]],
    [(p) => p[1] <= box.s, (a, b) => [a[0] + ((b[0] - a[0]) * (box.s - a[1])) / (b[1] - a[1]), box.s]],
  ];
  let points = ring;
  for (const [inside, cross] of edges) {
    const next: Pt[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (inside(a)) next.push(a);
      if (inside(a) !== inside(b)) next.push(cross(a, b));
    }
    points = next;
  }
  return points;
}

// The coastline, redrawn the way the lines are: every point is moved onto a
// coarse grid, and each stretch between two points becomes one diagonal and
// one straight step, so the land only ever turns in 45-degree corners.
function angular(ring: Pt[]): Pt[] {
  const snapped: Pt[] = [];
  for (const p of ring) {
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
const frame = { w: west - 6, e: east + 6, n: north - 6, s: south + 6 };
const outline = (ring: number[][]) => {
  const points = angular(clip(ring.map(([lat, lon]) => km(lat, lon)), frame));
  return points.length >= 4 ? rounded(points.map(gpx), true, COAST_CORNER) : null;
};
const landPaths = (landData.land as number[][][]).map(outline).filter((d): d is string => d !== null);
const lakePaths = (landData.lakes as number[][][]).map(outline).filter((d): d is string => d !== null);

// The map opens on the middle of Osaka: the Osaka Loop Line.
const loopIds = lineNodes[network.lines.findIndex((l) => l.loop)];
const middle = (points: Pt[]) => ({
  x: Math.round(points.reduce((sum, p) => sum + p[0], 0) / points.length),
  y: Math.round(points.reduce((sum, p) => sum + p[1], 0) / points.length),
});
export const start = middle(loopIds.map((id) => positions[id]));

export const geo = {
  width: Math.round((east - west) * GEO_SCALE),
  height: Math.round((south - north) * GEO_SCALE),
  zoom: GEO_ZOOM,
  start: middle(loopIds.map((id) => realPx[id])),
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
  land: landPaths,
  water: lakePaths,
  stops: [] as { en: string; ja: string; x: number; y: number; color: string }[],
};
