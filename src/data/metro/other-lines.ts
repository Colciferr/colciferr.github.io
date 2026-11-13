// Lines that are on the map but are not Tokyo Metro.
//
// The open-data service has no usable data for JR or Seibu lines, so these
// are written out by hand. The Yamanote coordinates are approximate and are
// only used to shape the map around the loop.

export interface LoopStation {
  en: string;
  ja: string;
  lat: number;
  lon: number;
}

// In station-number order, JY01 to JY30 (anticlockwise on a map).
export const YAMANOTE: LoopStation[] = [
  { en: 'Tokyo', ja: '東京', lat: 35.6812, lon: 139.7671 },
  { en: 'Kanda', ja: '神田', lat: 35.6918, lon: 139.7709 },
  { en: 'Akihabara', ja: '秋葉原', lat: 35.6984, lon: 139.7731 },
  { en: 'Okachimachi', ja: '御徒町', lat: 35.7075, lon: 139.7748 },
  { en: 'Ueno', ja: '上野', lat: 35.7138, lon: 139.7773 },
  { en: 'Uguisudani', ja: '鶯谷', lat: 35.7215, lon: 139.778 },
  { en: 'Nippori', ja: '日暮里', lat: 35.7281, lon: 139.7707 },
  { en: 'Nishi-Nippori', ja: '西日暮里', lat: 35.732, lon: 139.7668 },
  { en: 'Tabata', ja: '田端', lat: 35.7381, lon: 139.7608 },
  { en: 'Komagome', ja: '駒込', lat: 35.7365, lon: 139.747 },
  { en: 'Sugamo', ja: '巣鴨', lat: 35.7334, lon: 139.7393 },
  { en: 'Otsuka', ja: '大塚', lat: 35.7318, lon: 139.7281 },
  { en: 'Ikebukuro', ja: '池袋', lat: 35.7295, lon: 139.7109 },
  { en: 'Mejiro', ja: '目白', lat: 35.7212, lon: 139.7065 },
  { en: 'Takadanobaba', ja: '高田馬場', lat: 35.7126, lon: 139.7038 },
  { en: 'Shin-Okubo', ja: '新大久保', lat: 35.7012, lon: 139.7001 },
  { en: 'Shinjuku', ja: '新宿', lat: 35.6896, lon: 139.7006 },
  { en: 'Yoyogi', ja: '代々木', lat: 35.683, lon: 139.702 },
  { en: 'Harajuku', ja: '原宿', lat: 35.6702, lon: 139.7027 },
  { en: 'Shibuya', ja: '渋谷', lat: 35.658, lon: 139.7016 },
  { en: 'Ebisu', ja: '恵比寿', lat: 35.6467, lon: 139.7101 },
  { en: 'Meguro', ja: '目黒', lat: 35.634, lon: 139.7158 },
  { en: 'Gotanda', ja: '五反田', lat: 35.6262, lon: 139.7236 },
  { en: 'Osaki', ja: '大崎', lat: 35.6197, lon: 139.7286 },
  { en: 'Shinagawa', ja: '品川', lat: 35.6285, lon: 139.7388 },
  { en: 'Takanawa Gateway', ja: '高輪ゲートウェイ', lat: 35.6355, lon: 139.7407 },
  { en: 'Tamachi', ja: '田町', lat: 35.6457, lon: 139.7476 },
  { en: 'Hamamatsucho', ja: '浜松町', lat: 35.6553, lon: 139.7571 },
  { en: 'Shimbashi', ja: '新橋', lat: 35.6664, lon: 139.7583 },
  { en: 'Yurakucho', ja: '有楽町', lat: 35.675, lon: 139.763 },
];

// Seibu-Shinjuku Line, SS01 to SS29.
export const SEIBU_SHINJUKU: [string, string][] = [
  ['Seibu-Shinjuku', '西武新宿'],
  ['Takadanobaba', '高田馬場'],
  ['Shimo-Ochiai', '下落合'],
  ['Nakai', '中井'],
  ['Araiyakushi-mae', '新井薬師前'],
  ['Numabukuro', '沼袋'],
  ['Nogata', '野方'],
  ['Toritsu-Kasei', '都立家政'],
  ['Saginomiya', '鷺ノ宮'],
  ['Shimo-Igusa', '下井草'],
  ['Iogi', '井荻'],
  ['Kami-Igusa', '上井草'],
  ['Kami-Shakujii', '上石神井'],
  ['Musashi-Seki', '武蔵関'],
  ['Higashi-Fushimi', '東伏見'],
  ['Seibu-Yagisawa', '西武柳沢'],
  ['Tanashi', '田無'],
  ['Hana-Koganei', '花小金井'],
  ['Kodaira', '小平'],
  ['Kumegawa', '久米川'],
  ['Higashi-Murayama', '東村山'],
  ['Tokorozawa', '所沢'],
  ['Koku-koen', '航空公園'],
  ['Shin-Tokorozawa', '新所沢'],
  ['Iriso', '入曽'],
  ['Sayamashi', '狭山市'],
  ['Shin-Sayama', '新狭山'],
  ['Minami-Otsuka', '南大塚'],
  ['Hon-Kawagoe', '本川越'],
];

// Distance of each Seibu-Shinjuku Line station from Seibu-Shinjuku, in km
// (approximate). Used only to judge how long a train takes between stations.
export const SEIBU_SHINJUKU_KM = [
  0, 2.0, 3.2, 3.9, 5.2, 6.1, 7.1, 8.0, 8.5, 9.8, 10.7, 11.7, 12.8, 14.1, 15.3, 16.3, 17.6, 19.9, 22.6, 24.6, 26.0, 28.9,
  30.5, 31.7, 35.6, 38.6, 41.3, 43.9, 47.5,
];

// The same for the Haijima Line, measured from Kodaira (Kodaira itself first).
export const SEIBU_HAIJIMA_KM = [0, 1.1, 2.7, 5.7, 7.2, 9.6, 11.6, 14.3];

// Seibu Haijima Line, which leaves the Shinjuku Line at Kodaira (SS30 to SS36).
export const SEIBU_HAIJIMA: [string, string][] = [
  ['Hagiyama', '萩山'],
  ['Ogawa', '小川'],
  ['Higashi-Yamatoshi', '東大和市'],
  ['Tamagawa-Josui', '玉川上水'],
  ['Musashi-Sunagawa', '武蔵砂川'],
  ['Seibu-Tachikawa', '西武立川'],
  ['Haijima', '拝島'],
];

// JR Chuo Line (Rapid), JC01 to JC24, from Tokyo out to Takao.
export const CHUO_RAPID: [string, string][] = [
  ['Tokyo', '東京'],
  ['Kanda', '神田'],
  ['Ochanomizu', '御茶ノ水'],
  ['Yotsuya', '四ツ谷'],
  ['Shinjuku', '新宿'],
  ['Nakano', '中野'],
  ['Koenji', '高円寺'],
  ['Asagaya', '阿佐ケ谷'],
  ['Ogikubo', '荻窪'],
  ['Nishi-Ogikubo', '西荻窪'],
  ['Kichijoji', '吉祥寺'],
  ['Mitaka', '三鷹'],
  ['Musashi-Sakai', '武蔵境'],
  ['Higashi-Koganei', '東小金井'],
  ['Musashi-Koganei', '武蔵小金井'],
  ['Kokubunji', '国分寺'],
  ['Nishi-Kokubunji', '西国分寺'],
  ['Kunitachi', '国立'],
  ['Tachikawa', '立川'],
  ['Hino', '日野'],
  ['Toyoda', '豊田'],
  ['Hachioji', '八王子'],
  ['Nishi-Hachioji', '西八王子'],
  ['Takao', '高尾'],
];

// JR Ome Line, from Tachikawa up into the hills at Oku-Tama
// (Tachikawa is JC19, then JC51 to JC74).
export const OME: [string, string][] = [
  ['Tachikawa', '立川'],
  ['Nishi-Tachikawa', '西立川'],
  ['Higashi-Nakagami', '東中神'],
  ['Nakagami', '中神'],
  ['Akishima', '昭島'],
  ['Haijima', '拝島'],
  ['Ushihama', '牛浜'],
  ['Fussa', '福生'],
  ['Hamura', '羽村'],
  ['Ozaku', '小作'],
  ['Kabe', '河辺'],
  ['Higashi-Ome', '東青梅'],
  ['Ome', '青梅'],
  ['Miyanohira', '宮ノ平'],
  ['Hinatawada', '日向和田'],
  ['Ishigamimae', '石神前'],
  ['Futamatao', '二俣尾'],
  ['Ikusabata', '軍畑'],
  ['Sawai', '沢井'],
  ['Mitake', '御嶽'],
  ['Kawai', '川井'],
  ['Kori', '古里'],
  ['Hatonosu', '鳩ノ巣'],
  ['Shiromaru', '白丸'],
  ['Oku-Tama', '奥多摩'],
];

// Tokaido Shinkansen from Tokyo to Kyoto, with approximate coordinates.
// Only drawn on the physical map.
export const TOKAIDO_SHINKANSEN: LoopStation[] = [
  { en: 'Tokyo', ja: '東京', lat: 35.6812, lon: 139.7671 },
  { en: 'Shinagawa', ja: '品川', lat: 35.6285, lon: 139.7388 },
  { en: 'Shin-Yokohama', ja: '新横浜', lat: 35.5075, lon: 139.6176 },
  { en: 'Odawara', ja: '小田原', lat: 35.2562, lon: 139.1554 },
  { en: 'Atami', ja: '熱海', lat: 35.1038, lon: 139.0778 },
  { en: 'Mishima', ja: '三島', lat: 35.1263, lon: 138.9111 },
  { en: 'Shin-Fuji', ja: '新富士', lat: 35.1421, lon: 138.6633 },
  { en: 'Shizuoka', ja: '静岡', lat: 34.9716, lon: 138.389 },
  { en: 'Kakegawa', ja: '掛川', lat: 34.7693, lon: 138.0146 },
  { en: 'Hamamatsu', ja: '浜松', lat: 34.7038, lon: 137.7349 },
  { en: 'Toyohashi', ja: '豊橋', lat: 34.7629, lon: 137.382 },
  { en: 'Mikawa-Anjo', ja: '三河安城', lat: 34.969, lon: 137.0607 },
  { en: 'Nagoya', ja: '名古屋', lat: 35.1709, lon: 136.8815 },
  { en: 'Gifu-Hashima', ja: '岐阜羽島', lat: 35.3158, lon: 136.6856 },
  { en: 'Maibara', ja: '米原', lat: 35.3144, lon: 136.2898 },
  { en: 'Kyoto', ja: '京都', lat: 34.9858, lon: 135.7588 },
];

// Places reached by a long ride off the edge of the map. Each is drawn as a
// short dashed spur from the station you would leave from.
export const EXCURSIONS = [
  { from: 'Shinagawa', en: 'Kyoto', ja: '京都', by: 'Shinkansen' },
  { from: 'Takao', en: 'Takaosanguchi', ja: '高尾山口', by: 'Keio Takao Line' },
];
