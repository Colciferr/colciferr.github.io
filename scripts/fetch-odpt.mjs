// Downloads the Tokyo Metro network and timetables from ODPT and saves them
// into the project, so the site itself never needs the token.
//
//   npm run metro:fetch
//
// Reads ODPT_TOKEN from the .env file in the project folder (git-ignored).
// Re-run it whenever you want fresher timetables, then commit the results.
//
// Writes:
//   src/data/metro/network.json        lines, stations, colours, coordinates
//   public/metro/trains-weekday.json   every weekday train and its stop times
//   public/metro/trains-holiday.json   the same for Saturdays and holidays

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readToken() {
  if (process.env.ODPT_TOKEN) return process.env.ODPT_TOKEN.trim();
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const match = text.match(/^\s*ODPT_TOKEN\s*=\s*(.+?)\s*$/m);
  return match ? match[1].replace(/^["']|["']$/g, '') : null;
}

const token = readToken();
if (!token) {
  console.error('No ODPT_TOKEN found. Put ODPT_TOKEN=... in a .env file in the project folder.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(type, params = {}) {
  const query = new URLSearchParams({ ...params, 'acl:consumerKey': token });
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://api.odpt.org/api/v4/${type}?${query}`);
    if (res.ok) return res.json();
    if (attempt >= 4) throw new Error(`${type} failed with HTTP ${res.status}`);
    await sleep(1500 * attempt);
  }
}

const OPERATOR = 'odpt.Operator:TokyoMetro';
const short = (id) => id.split(':')[1];
const words = (camel) => camel.replace(/([a-z])([A-Z])/g, '$1 $2');

// ---------------------------------------------------------------- network

console.log('Fetching lines and stations...');
const railways = await get('odpt:Railway', { 'odpt:operator': OPERATOR });
const stations = await get('odpt:Station', { 'odpt:operator': OPERATOR });
const stationById = new Map(stations.map((s) => [s['owl:sameAs'], s]));

// A stable, familiar order for the legend.
const ORDER = ['Ginza', 'Marunouchi', 'MarunouchiBranch', 'Hibiya', 'Tozai', 'Chiyoda', 'Yurakucho', 'Hanzomon', 'Namboku', 'Fukutoshin'];
railways.sort((a, b) => ORDER.indexOf(short(a['owl:sameAs']).split('.')[1]) - ORDER.indexOf(short(b['owl:sameAs']).split('.')[1]));

const lines = railways.map((r) => ({
  id: short(r['owl:sameAs']).split('.')[1],
  odpt: r['owl:sameAs'],
  name: r['odpt:railwayTitle']?.en ?? r['dc:title'],
  ja: r['odpt:railwayTitle']?.ja ?? r['dc:title'],
  code: r['odpt:lineCode'],
  color: r['odpt:color'],
  directions: [r['odpt:ascendingRailDirection'], r['odpt:descendingRailDirection']],
  stations: [...r['odpt:stationOrder']]
    .sort((a, b) => a['odpt:index'] - b['odpt:index'])
    .map((entry) => {
      const s = stationById.get(entry['odpt:station']);
      return {
        id: short(entry['odpt:station']),
        code: s?.['odpt:stationCode'] ?? '',
        en: entry['odpt:stationTitle']?.en ?? s?.['odpt:stationTitle']?.en ?? '',
        ja: entry['odpt:stationTitle']?.ja ?? s?.['dc:title'] ?? '',
        lat: s?.['geo:lat'] ?? null,
        lon: s?.['geo:long'] ?? null,
      };
    }),
}));

const network = {
  fetched: new Date().toISOString(),
  source: 'Public Transportation Open Data Center (ODPT), data provided by Tokyo Metro',
  lines: lines.map(({ odpt, directions, ...line }) => line),
};

fs.mkdirSync(path.join(root, 'src/data/metro'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/metro/network.json'), JSON.stringify(network, null, 1) + '\n');
console.log(`  ${lines.length} lines, ${lines.reduce((n, l) => n + l.stations.length, 0)} station entries`);

// ------------------------------------------------------------- timetables

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const enName = new Map(stations.map((s) => [short(s['owl:sameAs']), s['odpt:stationTitle']?.en ?? s['dc:title']]));
const destinationName = (id) => (id ? (enName.get(short(id)) ?? words(short(id).split('.').pop())) : '');

async function trainsFor(calendar) {
  const dests = [];
  const destIndex = new Map();
  const trains = [];

  for (const [lineIndex, line] of lines.entries()) {
    const stopIndex = new Map(line.stations.map((s, i) => [s.id, i]));
    for (const direction of line.directions) {
      const rows = await get('odpt:TrainTimetable', {
        'odpt:railway': line.odpt,
        'odpt:calendar': `odpt.Calendar:${calendar}`,
        'odpt:railDirection': direction,
      });
      if (rows.length >= 1000) console.warn(`  Warning: ${line.id} ${direction} ${calendar} hit the 1000-row limit; some trains are missing.`);

      for (const row of rows) {
        const stops = [];
        let previous = -1;
        for (const stop of row['odpt:trainTimetableObject'] ?? []) {
          const station = stop['odpt:departureStation'] ?? stop['odpt:arrivalStation'];
          const clock = stop['odpt:departureTime'] ?? stop['odpt:arrivalTime'];
          const index = station ? stopIndex.get(short(station)) : undefined;
          if (index === undefined || !clock) continue;
          // Times run on a service day: anything before 03:00, or that goes
          // backwards past midnight, belongs to the small hours of the next day.
          let minutes = toMinutes(clock);
          if (minutes < 180) minutes += 1440;
          while (minutes < previous) minutes += 1440;
          previous = minutes;
          stops.push([index, minutes]);
        }
        if (stops.length < 2) continue;

        const name = destinationName(row['odpt:destinationStation']?.[0]);
        if (!destIndex.has(name)) {
          destIndex.set(name, dests.length);
          dests.push(name);
        }
        // [line, destination, first stop, first time, then (stop, minutes since previous)...]
        const record = [lineIndex, destIndex.get(name), stops[0][0], stops[0][1]];
        for (let i = 1; i < stops.length; i++) record.push(stops[i][0], stops[i][1] - stops[i - 1][1]);
        trains.push(record);
      }
      await sleep(250);
    }
    console.log(`  ${calendar}: ${line.id}`);
  }

  trains.sort((a, b) => a[3] - b[3]);
  return { calendar, dests, trains };
}

fs.mkdirSync(path.join(root, 'public/metro'), { recursive: true });
for (const [calendar, file] of [
  ['Weekday', 'trains-weekday.json'],
  ['SaturdayHoliday', 'trains-holiday.json'],
]) {
  console.log(`Fetching ${calendar} timetables...`);
  const data = await trainsFor(calendar);
  const out = path.join(root, 'public/metro', file);
  fs.writeFileSync(out, JSON.stringify(data));
  console.log(`  ${data.trains.length} trains, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

console.log('Done.');
