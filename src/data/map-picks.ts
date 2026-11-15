// Which photographs a station shows on the map. The Pictures page always
// shows every photograph; the map shows only a few per station.
//
// List the file names (without .JPG) under the station's name, in the order
// they should appear. A station that is not listed here shows an even spread
// of up to MAP_LIMIT of its photographs.

export const MAP_LIMIT = 8;

export const mapPicks: Record<string, string[]> = {
  Shibuya: ['IMG_0728', 'IMG_0730', 'IMG_0734', 'IMG_0733', 'IMG_0739', 'IMG_0745', 'IMG_0749', 'IMG_0751'],
  'Seibu-Tachikawa': ['IMG_0719', 'IMG_0391', 'IMG_0511', 'IMG_0516', 'IMG_0537', 'IMG_0546', 'IMG_0555', 'IMG_0567'],
};

// The photographs to show on the map, out of all of a station's photographs.
export function pickForMap<T extends { src: string }>(station: string, all: T[]): T[] {
  const names = mapPicks[station];
  if (names) {
    const chosen = names.flatMap((name) => {
      const end = `-${name.toLowerCase().replace(/[\s_]+/g, '-')}.jpg`;
      const found = all.find((p) => p.src.endsWith(end));
      if (!found) console.warn(`[map] map-picks.ts lists "${name}" at ${station}, but there is no such photograph.`);
      return found ? [found] : [];
    });
    if (chosen.length) return chosen;
  }
  if (all.length <= MAP_LIMIT) return all;
  return Array.from({ length: MAP_LIMIT }, (_, i) => all[Math.round((i * (all.length - 1)) / (MAP_LIMIT - 1))]);
}
