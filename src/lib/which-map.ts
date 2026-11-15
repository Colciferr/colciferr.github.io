// Which of the maps a station is on, for links from the Pictures and Places
// pages. A few names exist on more than one (Kyobashi, Hashimoto): those go
// to Tokyo. Kyoto and Sapporo are drawn on the Tokyo map only as the way to
// their own maps, so they go there.
import { nodes } from './metro-layout';
import kansai from '../data/kansai/network.json';
import sapporo from '../data/sapporo/network.json';

const names = (network: { lines: { stations: { en: string }[] }[] }) =>
  new Set(network.lines.flatMap((line) => line.stations.map((st) => st.en.toLowerCase())));

const onTokyo = new Set(nodes.map((n) => n.en.toLowerCase()));
const onKansai = names(kansai);
const onSapporo = names(sapporo);

export function mapLink(station: string) {
  const name = station.toLowerCase();
  let page = '/';
  if (name === 'kyoto') page = '/kansai';
  else if (name === 'sapporo') page = '/sapporo';
  else if (onTokyo.has(name)) page = '/';
  else if (onKansai.has(name)) page = '/kansai';
  else if (onSapporo.has(name)) page = '/sapporo';
  return `${page}#${encodeURIComponent(station)}`;
}
