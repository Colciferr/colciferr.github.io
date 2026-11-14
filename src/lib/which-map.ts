// Which of the two maps a station is on, for links from the Pictures and
// Places pages. A few names exist on both (Kyobashi, Hashimoto): those go to
// Tokyo. Kyoto is drawn on the Tokyo map only as the way to the Kansai map,
// so it goes to Kansai.
import { nodes } from './metro-layout';
import kansai from '../data/kansai/network.json';

const onTokyo = new Set(nodes.map((n) => n.en.toLowerCase()));
const onKansai = new Set(kansai.lines.flatMap((line) => line.stations.map((st) => st.en.toLowerCase())));

export function mapLink(station: string) {
  const name = station.toLowerCase();
  const page = onKansai.has(name) && (name === 'kyoto' || !onTokyo.has(name)) ? '/kansai' : '/';
  return `${page}#${encodeURIComponent(station)}`;
}
