// Downloads where the stations of the Sapporo map are, from OpenStreetMap.
//
//   npm run sapporo:fetch
//
// Needs no token. The data is © OpenStreetMap contributors, under the Open
// Database Licence; the map credits it in "About this map".
//
// Writes:
//   src/data/sapporo/network.json   every line, its stations in order, and where they are
//
// The lines and the order of their stations are listed below; only the
// positions are looked up. To add a station, add it to its line here and run
// the command again.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOSTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const BOX = '42.70,140.65,43.30,141.80';

async function ask(query) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    const res = await fetch(host, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'personal-map-build/1.0' },
      body: 'data=' + encodeURIComponent(query),
    });
    if (res.ok) return res.json();
    console.warn(`  ${host} answered ${res.status}; trying again`);
    await new Promise((done) => setTimeout(done, 10000));
  }
  throw new Error('OpenStreetMap did not answer.');
}

const SUBWAY = /札幌市|Sapporo City|地下鉄/i;
const JR = /JR|旅客鉄道/i;

// Each station is [Japanese name, English name, station number].
// The subway writes Sapporo in hiragana (さっぽろ) and JR in kanji (札幌): the
// map joins them by their English name. JR's Kotoni and Shiroishi are
// different stations from the subway's, so they are named apart.
const LINES = [
  { id: 'Namboku', name: 'Namboku Line', ja: '南北線', code: 'N', color: '#0a9a4a', kind: 'metro', operator: SUBWAY, stations: [
    ['麻生', 'Asabu'], ['北34条', 'Kita-sanjuyo-jo'], ['北24条', 'Kita-nijuyo-jo'], ['北18条', 'Kita-juhachi-jo'], ['北12条', 'Kita-juni-jo'],
    ['さっぽろ', 'Sapporo'], ['大通', 'Odori'], ['すすきの', 'Susukino'], ['中島公園', 'Nakajima-koen'], ['幌平橋', 'Horohira-bashi'],
    ['中の島', 'Nakanoshima'], ['平岸', 'Hiragishi'], ['南平岸', 'Minami-Hiragishi'], ['澄川', 'Sumikawa'], ['自衛隊前', 'Jieitai-mae'], ['真駒内', 'Makomanai'],
  ].map(([ja, en], i) => [ja, en, `N${String(i + 1).padStart(2, '0')}`]) },
  { id: 'Tozai', name: 'Tozai Line', ja: '東西線', code: 'T', color: '#f08a00', kind: 'metro', operator: SUBWAY, stations: [
    ['宮の沢', 'Miyanosawa'], ['発寒南', 'Hassamu-minami'], ['琴似', 'Kotoni'], ['二十四軒', 'Nijuyon-ken'], ['西28丁目', 'Nishi-nijuhatchome'],
    ['円山公園', 'Maruyama-koen'], ['西18丁目', 'Nishi-juhatchome'], ['西11丁目', 'Nishi-juitchome'], ['大通', 'Odori'], ['バスセンター前', 'Bus Center-mae'],
    ['菊水', 'Kikusui'], ['東札幌', 'Higashi-Sapporo'], ['白石', 'Shiroishi'], ['南郷7丁目', 'Nango-nana-chome'], ['南郷13丁目', 'Nango-jusan-chome'],
    ['南郷18丁目', 'Nango-juhatchome'], ['大谷地', 'Oyachi'], ['ひばりが丘', 'Hibarigaoka'], ['新さっぽろ', 'Shin-Sapporo'],
  ].map(([ja, en], i) => [ja, en, `T${String(i + 1).padStart(2, '0')}`]) },
  { id: 'Toho', name: 'Toho Line', ja: '東豊線', code: 'H', color: '#1c9ad6', kind: 'metro', operator: SUBWAY, stations: [
    ['栄町', 'Sakaemachi'], ['新道東', 'Shindo-higashi'], ['元町', 'Motomachi'], ['環状通東', 'Kanjo-dori-higashi'], ['東区役所前', 'Higashi-kuyakusho-mae'],
    ['北13条東', 'Kita-jusan-jo-higashi'], ['さっぽろ', 'Sapporo'], ['大通', 'Odori'], ['豊水すすきの', 'Hosui-Susukino'], ['学園前', 'Gakuen-mae'],
    ['豊平公園', 'Toyohira-koen'], ['美園', 'Misono'], ['月寒中央', 'Tsukisamu-chuo'], ['福住', 'Fukuzumi'],
  ].map(([ja, en], i) => [ja, en, `H${String(i + 1).padStart(2, '0')}`]) },
  // JR west along the coast to Otaru, and on to Yoichi (where station numbers stop).
  { id: 'JROtaru', name: 'JR Hakodate Line', ja: '函館本線', code: 'S', color: '#c8372d', kind: 'rail', operator: JR, stations: [
    ['余市', 'Yoichi', ''], ['蘭島', 'Ranshima', ''], ['塩谷', 'Shioya', ''], ['小樽', 'Otaru', 'S15'], ['南小樽', 'Minami-Otaru', 'S14'],
    ['小樽築港', 'Otaru-Chikko', 'S13'], ['朝里', 'Asari', 'S12'], ['銭函', 'Zenibako', 'S11'], ['ほしみ', 'Hoshimi', 'S10'], ['星置', 'Hoshioki', 'S09'],
    ['稲穂', 'Inaho', 'S08'], ['手稲', 'Teine', 'S07'], ['稲積公園', 'Inazumi-koen', 'S06'], ['発寒', 'Hassamu', 'S05'], ['発寒中央', 'Hassamu-chuo', 'S04'],
    ['琴似', 'Kotoni (JR)', 'S03'], ['桑園', 'Soen', 'S02'], ['札幌', 'Sapporo', '01'],
  ] },
  // JR south-east to the airport.
  { id: 'JRAirport', name: 'JR Chitose Line', ja: '千歳線', code: 'H', color: '#1f5fa8', kind: 'rail', operator: JR, stations: [
    ['札幌', 'Sapporo', '01'], ['苗穂', 'Naebo', 'H02'], ['白石', 'Shiroishi (JR)', 'H03'], ['平和', 'Heiwa', 'H04'], ['新札幌', 'Shin-Sapporo', 'H05'],
    ['上野幌', 'Kami-Nopporo', 'H06'], ['北広島', 'Kita-Hiroshima', 'H07'], ['島松', 'Shimamatsu', 'H08'], ['恵み野', 'Megumino', 'H09'],
    ['恵庭', 'Eniwa', 'H10'], ['サッポロビール庭園', 'Sapporo Beer Teien', 'H11'], ['長都', 'Osatsu', 'H12'], ['千歳', 'Chitose', 'H13'],
    ['南千歳', 'Minami-Chitose', 'H14'], ['新千歳空港', 'New Chitose Airport', 'AP15'],
  ] },
];

const tidyName = (name) => (name ?? '').normalize('NFKC').replace(/駅.*$/, '').trim();
const far = (a, b) => Math.hypot((a.lat - b.lat) * 110.6, (a.lon - b.lon) * 81.5); // kilometres, near enough

console.log('Asking OpenStreetMap for station positions…');
const answer = await ask(`[out:json][timeout:180];nwr["railway"~"^(station|halt)$"](${BOX});out center tags;`);
const everyStation = answer.elements
  .map((e) => ({ name: tidyName(e.tags?.name), who: `${e.tags?.operator ?? ''} ${e.tags?.network ?? ''}`, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon }))
  .filter((e) => e.name && e.lat != null);

const lines = LINES.map((line) => {
  // Stations are found in an order that starts from one with a single match,
  // so that a name used twice can be settled by which is nearer its neighbour.
  const stations = line.stations.map(([ja, en, code]) => ({ ja, en, code }));
  const found = stations.map((s) => {
    const named = everyStation.filter((e) => e.name === tidyName(s.ja));
    const own = named.filter((e) => line.operator.test(e.who));
    return own.length ? own : named;
  });
  const settle = (i, neighbour) => {
    let pick = found[i];
    if (!pick.length) throw new Error(`${line.name}: no position found for ${stations[i].ja} (${stations[i].en}).`);
    const spread = Math.max(...pick.map((a) => far(a, pick[0])));
    if (spread > 0.3) {
      if (!neighbour) return false;
      const nearest = pick.reduce((best, e) => (far(e, neighbour) < far(best, neighbour) ? e : best));
      pick = pick.filter((e) => far(e, nearest) < 0.3);
    }
    stations[i].lat = Math.round((pick.reduce((s, e) => s + e.lat, 0) / pick.length) * 1e5) / 1e5;
    stations[i].lon = Math.round((pick.reduce((s, e) => s + e.lon, 0) / pick.length) * 1e5) / 1e5;
    return true;
  };
  const sure = stations.findIndex((_, i) => settle(i));
  if (sure < 0) throw new Error(`${line.name}: no station could be placed for certain.`);
  for (let i = sure + 1; i < stations.length; i++) settle(i, stations[i - 1]);
  for (let i = sure - 1; i >= 0; i--) settle(i, stations[i + 1]);
  stations.slice(1).forEach((s, i) => {
    const gap = far(s, stations[i]);
    if (gap > 12) console.warn(`  Check: ${stations[i].en} to ${s.en} is ${gap.toFixed(1)} km.`);
  });
  console.log(`  ${line.name}: ${stations.length} stations, ${stations[0].en} to ${stations[stations.length - 1].en}`);
  return { id: line.id, name: line.name, ja: line.ja, code: line.code, color: line.color, kind: line.kind, loop: false, stations };
});

const out = path.join(root, 'src', 'data', 'sapporo');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, 'network.json'),
  JSON.stringify({ source: 'OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright', fetched: new Date().toISOString(), lines }, null, 1) + '\n',
);
console.log(`Saved ${lines.reduce((sum, l) => sum + l.stations.length, 0)} station entries on ${lines.length} lines.`);
