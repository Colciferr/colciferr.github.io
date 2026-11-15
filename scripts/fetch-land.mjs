// Downloads the outline of Japan around the area the physical map covers,
// from Natural Earth (public domain), and saves just that piece.
//
//   npm run land:fetch
//
// The outline is stored as real coordinates. The angular, metro-map look is
// applied later, in src/lib/metro-layout.ts, so it can be tuned without
// downloading anything again.
//
// Writes:
//   src/data/metro/land.json   coastline and large lakes, as rings of [lat, lon]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

// Generously larger than the map, so the coast runs cleanly off every edge.
const BOX = { west: 134.3, east: 146.0, south: 33.6, north: 45.7 };

async function download(file) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${file} failed with HTTP ${res.status}`);
  return res.json();
}

// Cut a ring down to the part inside the box (points are [lon, lat]).
function clip(ring) {
  const edges = [
    [(p) => p[0] >= BOX.west, (a, b) => [BOX.west, a[1] + ((b[1] - a[1]) * (BOX.west - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= BOX.east, (a, b) => [BOX.east, a[1] + ((b[1] - a[1]) * (BOX.east - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= BOX.south, (a, b) => [a[0] + ((b[0] - a[0]) * (BOX.south - a[1])) / (b[1] - a[1]), BOX.south]],
    [(p) => p[1] <= BOX.north, (a, b) => [a[0] + ((b[0] - a[0]) * (BOX.north - a[1])) / (b[1] - a[1]), BOX.north]],
  ];
  let points = ring;
  for (const [inside, cross] of edges) {
    const next = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (inside(a)) next.push(a);
      if (inside(a) !== inside(b)) next.push(cross(a, b));
    }
    points = next;
    if (!points.length) break;
  }
  return points;
}

const touches = (ring) => ring.some((p) => p[0] > BOX.west && p[0] < BOX.east && p[1] > BOX.south && p[1] < BOX.north);
const tidy = (ring) => ring.map((p) => [Math.round(p[1] * 1e4) / 1e4, Math.round(p[0] * 1e4) / 1e4]); // to [lat, lon]

function rings(collection) {
  const out = [];
  for (const feature of collection.features) {
    const g = feature.geometry;
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const polygon of polygons) {
      const outer = polygon[0]; // holes in the land are ignored; lakes are fetched separately
      if (!touches(outer)) continue;
      const cut = clip(outer);
      if (cut.length >= 4) out.push(tidy(cut));
    }
  }
  return out;
}

console.log('Fetching the coastline...');
const land = rings(await download('ne_10m_land.geojson'));
console.log('Fetching lakes...');
const lakes = rings(await download('ne_10m_lakes.geojson'));

const out = path.join(root, 'src/data/metro/land.json');
fs.writeFileSync(out, JSON.stringify({ source: 'Natural Earth (naturalearthdata.com), public domain', land, lakes }) + '\n');
console.log(`  ${land.length} pieces of land (${land.reduce((n, r) => n + r.length, 0)} points), ${lakes.length} lakes, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
console.log('Done.');
