// Favourite places, filed under the stations they are near.
// They appear in a station's panel on the map and on the Places page.
// Add one by copying a { ... } block. A place with several branches can list
// several stations. Station names must match the names on the map.

export interface Place {
  name: string;
  ja?: string; // the name in Japanese, if you want it shown
  kind: 'Eat' | 'Drink' | 'See' | 'Shop' | 'Walk';
  stations: string[];
  note?: string; // a line or two on why
  link?: string; // its website or map page
}

export const places: Place[] = [
  {
    name: 'Sekai no Yamachan',
    ja: '世界の山ちゃん',
    kind: 'Eat',
    stations: ['Tachikawa', 'Seibu-Shinjuku'],
    note: 'An izakaya chain, and one of my favorite places to eat.',
  },
];
