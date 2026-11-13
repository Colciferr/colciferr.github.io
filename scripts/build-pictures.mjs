// Prepares photographs for the site.
//
//   npm run pictures
//
// Put the original files in folders named after the station they were taken
// near, with one folder inside for each place or outing:
//
//   pictures-src/
//     Yotsuya/
//       Akasaka Palace/
//         IMG_0001.JPG
//     Seibu-Tachikawa/
//       At home, the garden/
//         IMG_0002.JPG
//
// The station folder must match a station name on the map. The inner folder
// name is shown as the caption. `pictures-src` is not committed: the originals
// are large and can carry GPS coordinates.
//
// For every photo this writes a web-sized copy and a thumbnail into
// public/pictures/, with all embedded metadata (including location) removed,
// and lists them in src/data/pictures.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'pictures-src');
const output = path.join(root, 'public', 'pictures');

const FULL = 1800; // longest side of the large version, in pixels
const THUMB = 520; // longest side of the thumbnail

const slug = (text) =>
  text
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const isPhoto = (name) => /\.(jpe?g|png|webp|tiff?)$/i.test(name);
const folders = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

// The month a photo was taken, read from the camera's own record if present.
function takenIn(exif) {
  const match = exif?.toString('latin1').match(/(\d{4}):(\d{2}):\d{2} \d{2}:\d{2}:\d{2}/);
  if (!match) return undefined;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : undefined;
}

if (!fs.existsSync(source)) {
  console.error('There is no pictures-src folder yet. See the notes at the top of scripts/build-pictures.mjs.');
  process.exit(1);
}

const photos = [];
const wanted = new Set();

for (const station of folders(source).sort()) {
  const stationDir = path.join(source, station);
  // Photos may sit in a place folder, or directly in the station folder.
  const groups = [[station, stationDir], ...folders(stationDir).sort().map((place) => [place, path.join(stationDir, place)])];
  for (const [place, dir] of groups) {
    for (const file of fs.readdirSync(dir).filter(isPhoto).sort()) {
      const base = `${slug(place)}-${slug(path.parse(file).name)}`;
      const outDir = path.join(output, slug(station));
      const full = path.join(outDir, `${base}.jpg`);
      const thumb = path.join(outDir, `${base}-thumb.jpg`);
      fs.mkdirSync(outDir, { recursive: true });
      wanted.add(full).add(thumb);

      const input = path.join(dir, file);
      const image = sharp(input, { failOn: 'none' });
      const meta = await image.metadata();
      const fresh = fs.existsSync(full) && fs.existsSync(thumb) && fs.statSync(full).mtimeMs >= fs.statSync(input).mtimeMs;
      if (!fresh) {
        // rotate() applies the camera's orientation; sharp drops metadata by default.
        await image.clone().rotate().resize(FULL, FULL, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(full);
        await image.clone().rotate().resize(THUMB, THUMB, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toFile(thumb);
        console.log(`  ${station} / ${place} / ${file}`);
      }
      const size = await sharp(full).metadata();
      photos.push({
        station,
        place,
        src: `/pictures/${slug(station)}/${base}.jpg`,
        thumb: `/pictures/${slug(station)}/${base}-thumb.jpg`,
        w: size.width,
        h: size.height,
        date: takenIn(meta.exif),
      });
    }
  }
}

// Remove published copies of photos that are no longer in pictures-src.
for (const station of folders(output)) {
  for (const file of fs.readdirSync(path.join(output, station))) {
    const full = path.join(output, station, file);
    if (!wanted.has(full)) fs.rmSync(full);
  }
  if (!fs.readdirSync(path.join(output, station)).length) fs.rmdirSync(path.join(output, station));
}

fs.writeFileSync(path.join(root, 'src/data/pictures.json'), JSON.stringify({ photos }, null, 1) + '\n');
const stations = new Set(photos.map((p) => p.station)).size;
console.log(`${photos.length} photographs at ${stations} stations.`);
