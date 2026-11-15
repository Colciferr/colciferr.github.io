// The Sapporo map: its stations and its own settings. The three subway
// lines, JR west along the coast through Otaru to Yoichi, and JR south-east
// to New Chitose Airport.
// The work of laying it out is done in src/lib/region-layout.ts.
//
// To move one station by hand, add it to `pinned`.
import network from '../data/sapporo/network.json';
import { layoutRegion } from './region-layout';

const region = layoutRegion({
  network,
  centre: { lat: 43.06, lon: 141.35 }, // Odori
  // The subway writes Sapporo in hiragana and JR in kanji, so stations are
  // matched by their English name.
  key: (st) => st.en,
  start: ['Sapporo', 'Odori', 'Susukino'],
  pinned: {},
  // A smaller network than Kansai: fewer stations count as a crowd.
  tuning: { crowd: 12, dense: 3.4 },
  // Minutes between trains: at rush hour, in the daytime, and early or late.
  headway: {
    Namboku: [4, 7, 8],
    Tozai: [4, 7, 8],
    Toho: [4.5, 7.5, 8],
    JROtaru: [10, 15, 30],
    JRAirport: [10, 12, 20],
  },
});

export const { lines, nodes, geo, width, height, lineWidth, labelSize, labelLine2, fetched, start } = region;
