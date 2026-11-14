// Downloads the stations of the Kansai map (Osaka and Kyoto) from
// OpenStreetMap and saves them in line order with their positions.
//
//   npm run kansai:fetch
//
// Needs no token. The data is © OpenStreetMap contributors, under the Open
// Database Licence; the map credits it in "About this map".
//
// Writes:
//   src/data/kansai/network.json   every line, its stations in order, and where they are
//
// Station order comes from OpenStreetMap's route relations, except for the
// Keihan Main Line, which has no relation there: its order is listed below
// and only the positions are looked up.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOSTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const BOX = '34.50,135.30,35.10,135.90';

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

// Each line: the OpenStreetMap route it is read from, and how its station
// numbers run. `reverse` flips the order so numbers count upwards.
const LINES = [
  { id: 'Midosuji', name: 'Midosuji Line', ja: '御堂筋線', code: 'M', color: '#e5171f', kind: 'metro', relation: 2411153, first: 11 },
  { id: 'Tanimachi', name: 'Tanimachi Line', ja: '谷町線', code: 'T', color: '#522886', kind: 'metro', relation: 444907, first: 11 },
  { id: 'Yotsubashi', name: 'Yotsubashi Line', ja: '四つ橋線', code: 'Y', color: '#0078ba', kind: 'metro', relation: 444899, first: 11, reverse: true },
  { id: 'Chuo', name: 'Chuo Line', ja: '中央線', code: 'C', color: '#019a66', kind: 'metro', relation: 444881, first: 9 },
  { id: 'Sennichimae', name: 'Sennichimae Line', ja: '千日前線', code: 'S', color: '#e44d93', kind: 'metro', relation: 444891, first: 11 },
  { id: 'Sakaisuji', name: 'Sakaisuji Line', ja: '堺筋線', code: 'K', color: '#814721', kind: 'metro', relation: 444905, first: 11 },
  { id: 'Nagahori', name: 'Nagahori Tsurumi-ryokuchi Line', ja: '長堀鶴見緑地線', code: 'N', color: '#a9cc51', kind: 'metro', relation: 444878, first: 11 },
  { id: 'Imazatosuji', name: 'Imazatosuji Line', ja: '今里筋線', code: 'I', color: '#ee7b1a', kind: 'metro', relation: 8028827, first: 11 },
  { id: 'Karasuma', name: 'Karasuma Line', ja: '烏丸線', code: 'K', color: '#3fa535', kind: 'metro', relation: 536800, first: 1 },
  { id: 'Tozai', name: 'Tozai Line', ja: '東西線', code: 'T', color: '#e8472b', kind: 'metro', relation: 536803, first: 1 },
  // The loop is stored once round, starting from Tennoji (O01).
  { id: 'OsakaLoop', name: 'Osaka Loop Line', ja: '大阪環状線', code: 'O', color: '#d81f3f', kind: 'jr', loop: true, relation: 10073682, first: 1, reverse: true, dropLast: true, rotate: 1 },
  { id: 'JRKyoto', name: 'JR Kyoto Line', ja: 'JR京都線', code: 'A', color: '#0072bc', kind: 'rail', relation: 11808754, first: 31 },
  // Hankyu numbers its Kyoto line from HK61, after two stations shared with its other lines.
  { id: 'HankyuKyoto', name: 'Hankyu Kyoto Line', ja: '阪急京都線', code: 'HK', color: '#8b2346', kind: 'seibu', relation: 10255877, codes: (i) => (i === 0 ? 1 : i === 1 ? 3 : 59 + i) },
  { id: 'Keihan', name: 'Keihan Main Line', ja: '京阪本線', code: 'KH', color: '#1a6f4a', kind: 'seibu', first: 1, operator: /京阪/, stations: [
    ['淀屋橋', 'Yodoyabashi'], ['北浜', 'Kitahama'], ['天満橋', 'Temmabashi'], ['京橋', 'Kyobashi'], ['野江', 'Noe'], ['関目', 'Sekime'],
    ['森小路', 'Morishoji'], ['千林', 'Sembayashi'], ['滝井', 'Takii'], ['土居', 'Doi'], ['守口市', 'Moriguchishi'], ['西三荘', 'Nishisanso'],
    ['門真市', 'Kadomashi'], ['古川橋', 'Furukawabashi'], ['大和田', 'Owada'], ['萱島', 'Kayashima'], ['寝屋川市', 'Neyagawashi'],
    ['香里園', 'Korien'], ['光善寺', 'Kozenji'], ['枚方公園', 'Hirakata-koen'], ['枚方市', 'Hirakatashi'], ['御殿山', 'Gotenyama'],
    ['牧野', 'Makino'], ['樟葉', 'Kuzuha'], ['橋本', 'Hashimoto'], ['石清水八幡宮', 'Iwashimizu-hachimangu'], ['淀', 'Yodo'],
    ['中書島', 'Chushojima'], ['伏見桃山', 'Fushimi-momoyama'], ['丹波橋', 'Tambabashi'], ['墨染', 'Sumizome'], ['藤森', 'Fujinomori'],
    ['龍谷大前深草', 'Ryukokudai-mae-fukakusa'], ['伏見稲荷', 'Fushimi-inari'], ['鳥羽街道', 'Toba-kaido'], ['東福寺', 'Tofukuji'],
    ['七条', 'Shichijo'], ['清水五条', 'Kiyomizu-gojo'], ['祇園四条', 'Gion-shijo'], ['三条', 'Sanjo'],
    // The Oto Line carries the same trains on to Demachiyanagi.
    ['神宮丸太町', 'Jingu-marutamachi'], ['出町柳', 'Demachiyanagi'],
  ] },
];

// English names as the map spells them, where OpenStreetMap's differ or are missing.
const ENGLISH = {
  大阪港: 'Osakako', 九条: 'Kujo', 大阪城公園: 'Osakajokoen', 天神橋筋六丁目: 'Tenjimbashisuji 6-chome', 南森町: 'Minami-morimachi',
  長岡京: 'Nagaokakyo', 吹田: 'Suita', 京都: 'Kyoto', 四条: 'Shijo', 五条: 'Gojo', 京都河原町: 'Kyoto-kawaramachi',
  四天王寺前夕陽ヶ丘: 'Shitennoji-mae Yuhigaoka', 大阪梅田: 'Osaka-umeda', 動物園前: 'Dobutsuen-mae', 烏丸御池: 'Karasuma Oike',
  三条京阪: 'Sanjo Keihan', 京都市役所前: 'Kyoto Shiyakusho-mae', 茨木市: 'Ibaraki-shi', 高槻市: 'Takatsuki-shi', 摂津市: 'Settsu-shi',
  ドーム前千代崎: 'Dome-mae Chiyozaki', 新今宮: 'Shin-Imamiya', 今宮: 'Imamiya',
};
const plain = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '');
// A platform is sometimes tagged in place of its station: "長岡京駅2番のりば".
const station = (ja) => ja.replace(/駅.*$/, '');

console.log('Asking OpenStreetMap for the routes…');
const relationIds = LINES.filter((l) => l.relation).map((l) => l.relation);
const routes = await ask(`[out:json][timeout:180];relation(id:${relationIds.join(',')});out body;node(r);out body;`);
await new Promise((done) => setTimeout(done, 5000));
console.log('Asking OpenStreetMap for station positions…');
const everyStation = await ask(`[out:json][timeout:180];node["railway"~"^(station|halt|stop)$"](${BOX});out body;`);

const byId = new Map(routes.elements.filter((e) => e.type === 'node').map((e) => [e.id, e]));
const relations = new Map(routes.elements.filter((e) => e.type === 'relation').map((e) => [e.id, e]));

const lines = LINES.map((line) => {
  let stations;
  if (line.relation) {
    const relation = relations.get(line.relation);
    if (!relation) throw new Error(`${line.name}: route ${line.relation} is missing from the answer.`);
    stations = relation.members
      .filter((m) => m.type === 'node' && /stop/.test(m.role))
      .map((m) => byId.get(m.ref))
      .map((n) => {
        const ja = station(n.tags.name ?? '');
        return { ja, en: ENGLISH[ja] ?? plain((n.tags['name:en'] ?? '').split(';')[0]), lat: n.lat, lon: n.lon };
      });
    if (line.dropLast) stations.pop(); // a loop's route ends where it began
    if (line.reverse) stations.reverse();
    if (line.rotate) stations = [...stations.slice(-line.rotate), ...stations.slice(0, -line.rotate)];
  } else {
    stations = line.stations.map(([ja, en]) => {
      const found = everyStation.elements.filter((n) => station(n.tags.name ?? '') === ja);
      const own = found.filter((n) => line.operator.test(`${n.tags.operator ?? ''} ${n.tags.network ?? ''}`));
      const pick = own.length ? own : found;
      if (!pick.length) throw new Error(`${line.name}: no position found for ${ja} (${en}).`);
      return { ja, en, lat: pick.reduce((s, n) => s + n.lat, 0) / pick.length, lon: pick.reduce((s, n) => s + n.lon, 0) / pick.length };
    });
  }
  const number = line.codes ?? ((i) => line.first + i);
  const prefix = line.kind === 'jr' || line.kind === 'rail' ? `JR-${line.code}` : line.code;
  for (const [i, s] of stations.entries()) {
    if (!s.en || !s.ja) throw new Error(`${line.name}: station ${i} has no name (${JSON.stringify(s)}).`);
    s.code = `${prefix}${String(number(i)).padStart(2, '0')}`;
    s.lat = Math.round(s.lat * 1e5) / 1e5;
    s.lon = Math.round(s.lon * 1e5) / 1e5;
  }
  console.log(`  ${line.name}: ${stations.length} stations, ${stations[0].en} to ${stations[stations.length - 1].en}`);
  return { id: line.id, name: line.name, ja: line.ja, code: line.code, color: line.color, kind: line.kind, loop: Boolean(line.loop), stations };
});

const out = path.join(root, 'src', 'data', 'kansai');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, 'network.json'),
  JSON.stringify({ source: 'OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright', fetched: new Date().toISOString(), lines }, null, 1) + '\n',
);
console.log(`Saved ${lines.reduce((sum, l) => sum + l.stations.length, 0)} station entries on ${lines.length} lines.`);
