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
  // A picture, kept in public/places/. If it is someone else's photograph it
  // must be freely licensed, and `credit` and `source` say whose it is.
  photo?: {
    src: string;
    alt: string;
    credit?: string; // e.g. 'Syced, CC0' (leave out for your own photos)
    source?: string; // the page the photograph came from
  };
}

export const places: Place[] = [
  {
    name: 'Sekai no Yamachan',
    ja: '世界の山ちゃん',
    kind: 'Eat',
    stations: ['Tachikawa', 'Seibu-Shinjuku'],
    note: 'An izakaya chain, and one of my favorite places to eat.',
    photo: {
      src: '/places/sekai-no-yamachan.jpg',
      alt: 'The sign over a Sekai no Yamachan',
      credit: 'Kanda-Jimbocho branch, by 運転太郎, CC BY 3.0',
      source: 'https://commons.wikimedia.org/wiki/File:%E4%B8%96%E7%95%8C%E3%81%AE%E5%B1%B1%E3%81%A1%E3%82%83%E3%82%93_%E7%A5%9E%E7%94%B0%E7%A5%9E%E4%BF%9D%E7%94%BA%E5%BA%97_-_panoramio.jpg',
    },
  },
  {
    name: 'Coucagno',
    ja: 'クーカーニョ',
    kind: 'Eat',
    stations: ['Shibuya'],
    note: 'A French restaurant on the 40th floor of the Cerulean Tower.',
    link: 'https://www.tokyuhotels.co.jp/en/cerulean-h/restaurant/coucagno/index.html',
    photo: {
      src: '/places/coucagno.jpg',
      alt: 'The lit sign of the Cerulean Tower Tokyu Hotel',
      credit: 'Syced, CC0',
      source: 'https://commons.wikimedia.org/wiki/File:Cerulean_Tower_Tokyu_Hotel.jpg',
    },
  },
  {
    name: 'Woodberry Coffee',
    kind: 'Drink',
    stations: ['Ogikubo', 'Shibuya'],
    note: 'A chain of cafes.',
    link: 'https://www.woodberrycoffee.com/',
  },
  {
    name: 'Ginza Lion',
    ja: '銀座ライオン',
    kind: 'Drink',
    stations: ['Shinjuku', 'Akihabara'],
    note: 'A beer hall.',
    link: 'https://www.ginzalion.jp/',
    photo: {
      src: '/places/ginza-lion.jpg',
      alt: 'The front of a Ginza Lion',
      credit: 'Shibuya Mark City branch, by 経済特区, CC BY-SA 4.0',
      source: 'https://commons.wikimedia.org/wiki/File:%E9%8A%80%E5%BA%A7%E3%83%A9%E3%82%A4%E3%82%AA%E3%83%B3(%E6%B8%8B%E8%B0%B7%E3%83%9E%E3%83%BC%E3%82%AF%E3%82%B7%E3%83%86%E3%82%A3)_02.jpg',
    },
  },
];
