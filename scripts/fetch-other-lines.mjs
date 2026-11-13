// Downloads train timetables for the lines ODPT does not cover (Yamanote,
// Chuo, Ome, Seibu-Shinjuku, Seibu Haijima) from the Mini Tokyo 3D project and saves
// them in the same compact form as the Tokyo Metro ones.
//
//   npm run lines:fetch
//
// Source: https://github.com/nagix/mini-tokyo-3d (MIT licence, copyright
// Akihiko Kusanagi). The licence notice is saved alongside the data, as the
// licence requires. No token is needed.
//
// Writes:
//   public/metro/trains-other-weekday.json
//   public/metro/trains-other-holiday.json
//   public/metro/NOTICE-mini-tokyo-3d.txt
//   src/data/metro/other-stations.json   where those stations really are

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YAMANOTE, SEIBU_SHINJUKU, SEIBU_HAIJIMA, CHUO_RAPID, OME } from '../src/data/metro/other-lines.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/nagix/mini-tokyo-3d/master';

// The `id` of each line must match the one in src/lib/metro-layout.ts, and
// `stations` must be in the same order as that line is drawn.
const LINES = [
  { id: 'Yamanote', file: 'jreast-yamanote.json', stations: YAMANOTE.map((s) => s.en) },
  { id: 'SeibuShinjuku', file: 'seibu-shinjuku.json', stations: SEIBU_SHINJUKU.map((s) => s[0]) },
  { id: 'SeibuHaijima', file: 'seibu-haijima.json', stations: ['Kodaira', ...SEIBU_HAIJIMA.map((s) => s[0])] },
  { id: 'ChuoRapid', file: 'jreast-chuorapid.json', stations: CHUO_RAPID.map((s) => s[0]) },
  { id: 'Ome', file: 'jreast-ome.json', stations: OME.map((s) => s[0]) },
];

const squash = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (camel) => camel.replace(/([a-z])([A-Z])/g, '$1 $2');
const lastPart = (id) => id.split('.').pop();
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

async function download(file) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${file} failed with HTTP ${res.status}`);
  return res.text();
}

// Every station name we know, so destinations read the way the map spells them.
const known = new Map(LINES.flatMap((line) => line.stations.map((name) => [squash(name), name])));
const destinationName = (id) => (id ? (known.get(squash(lastPart(id))) ?? words(lastPart(id))) : '');

const out = { Weekday: { dests: [], trains: [] }, SaturdayHoliday: { dests: [], trains: [] } };
const skipped = new Set();

for (const [lineIndex, line] of LINES.entries()) {
  const rows = JSON.parse(await download(`data/train-timetables/${line.file}`));
  const stopIndex = new Map(line.stations.map((name, i) => [squash(name), i]));
  let kept = 0;

  for (const row of rows) {
    const calendar = lastPart(row.id);
    const bucket = out[calendar];
    if (!bucket) {
      skipped.add(`calendar ${calendar}`);
      continue;
    }
    const stops = [];
    let previous = -1;
    for (const stop of row.tt ?? []) {
      const index = stopIndex.get(squash(lastPart(stop.s)));
      const clock = stop.d ?? stop.a;
      if (index === undefined) {
        skipped.add(`station ${stop.s}`);
        continue;
      }
      if (!clock) continue;
      // Times run on a service day: anything before 03:00, or that goes
      // backwards past midnight, belongs to the small hours of the next day.
      let minutes = toMinutes(clock);
      if (minutes < 180) minutes += 1440;
      while (minutes < previous) minutes += 1440;
      previous = minutes;
      stops.push([index, minutes]);
    }
    if (stops.length < 2) continue;

    // Trains that simply keep circling have no destination: name the direction instead.
    const name = destinationName(row.ds?.[0]) || (row.d ? words(row.d).toLowerCase() : '');
    let dest = bucket.dests.indexOf(name);
    if (dest < 0) dest = bucket.dests.push(name) - 1;
    // [line, destination, first stop, first time, then (stop, minutes since previous)...]
    const record = [lineIndex, dest, stops[0][0], stops[0][1]];
    for (let i = 1; i < stops.length; i++) record.push(stops[i][0], stops[i][1] - stops[i - 1][1]);
    bucket.trains.push(record);
    kept++;
  }
  console.log(`  ${line.id}: ${kept} trains`);
}

if (skipped.size) console.warn(`  Left out: ${[...skipped].slice(0, 12).join(', ')}${skipped.size > 12 ? ', ...' : ''}`);

fs.mkdirSync(path.join(root, 'public/metro'), { recursive: true });
for (const [calendar, file] of [
  ['Weekday', 'trains-other-weekday.json'],
  ['SaturdayHoliday', 'trains-other-holiday.json'],
]) {
  const data = out[calendar];
  data.trains.sort((a, b) => a[3] - b[3]);
  const target = path.join(root, 'public/metro', file);
  fs.writeFileSync(
    target,
    JSON.stringify({ source: 'Mini Tokyo 3D (github.com/nagix/mini-tokyo-3d), MIT licence', fetched: new Date().toISOString(), lines: LINES.map((l) => l.id), ...data }),
  );
  console.log(`  ${calendar}: ${data.trains.length} trains, ${(fs.statSync(target).size / 1024).toFixed(0)} KB`);
}

// Where each of these stations really is, for the physical map.
{
  const railways = ['JR-East.Yamanote', 'JR-East.ChuoRapid', 'JR-East.Ome', 'Seibu.Shinjuku', 'Seibu.Haijima', 'Keio.Takao'];
  const everything = JSON.parse(await download('data/stations.json'));
  const all = everything.filter((s) => railways.includes(s.railway) && s.coord);
  const stations = {};
  for (const name of [...new Set([...LINES.flatMap((l) => l.stations), 'Takaosanguchi'])]) {
    const found = all.find((s) => squash(lastPart(s.id)) === squash(name));
    if (found) stations[name] = [found.coord[1], found.coord[0]]; // latitude, longitude
    else console.warn(`  No coordinates found for ${name}`);
  }
  // The way to Mt. Takao: the Keio Line from Shinjuku to Kitano, then the
  // Keio Takao Line to Takaosanguchi, station by station.
  const order = JSON.parse(await download('data/railways.json'));
  const stationsOf = (id) => order.find((r) => r.id === id).stations;
  const main = stationsOf('Keio.Keio');
  const branch = stationsOf('Keio.Takao');
  const way = [
    ...main.slice(0, main.indexOf('Keio.Keio.Kitano') + 1),
    ...branch.slice(branch.indexOf('Keio.Takao.Kitano') + 1),
  ];
  const keio = way
    .map((id) => everything.find((s) => s.id === id))
    .filter((s) => s?.coord)
    .map((s) => ({ en: s.title.en, ja: s.title.ja, lat: s.coord[1], lon: s.coord[0] }));

  fs.writeFileSync(
    path.join(root, 'src/data/metro/other-stations.json'),
    JSON.stringify({ source: 'Mini Tokyo 3D (github.com/nagix/mini-tokyo-3d), MIT licence', stations, keio }, null, 1) + '\n',
  );
  console.log(`  ${Object.keys(stations).length} station positions, ${keio.length} stations on the way to Takaosanguchi`);
}

const licence = await download('LICENSE');
fs.writeFileSync(
  path.join(root, 'public/metro/NOTICE-mini-tokyo-3d.txt'),
  `The files trains-other-weekday.json and trains-other-holiday.json in this folder, and\nsrc/data/metro/other-stations.json in the site's source, are\nderived from data in Mini Tokyo 3D (https://github.com/nagix/mini-tokyo-3d),\nwhich is distributed under the following licence.\n\n${licence}`,
);
console.log('Done.');
