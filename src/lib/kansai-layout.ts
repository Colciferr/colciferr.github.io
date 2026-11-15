// The Kansai map (Osaka and Kyoto): its stations and its own settings.
// The work of laying it out is done in src/lib/region-layout.ts.
//
// To move one station by hand, add it to `pinned`.
import network from '../data/kansai/network.json';
import { layoutRegion } from './region-layout';

const region = layoutRegion({
  network,
  centre: { lat: 34.7, lon: 135.5 }, // Osaka
  // The two cities each have a Kujo, so the name alone is not enough.
  key: (st) => `${st.ja}@${st.lat > 34.86 ? 'kyoto' : 'osaka'}`,
  pinned: {},
  // Minutes between trains: at rush hour, in the daytime, and early or late.
  headway: {
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
  },
});

export const { lines, nodes, geo, width, height, lineWidth, labelSize, labelLine2, fetched, start } = region;
