/**
 * genGrainPng — generates assets/grain/grain96.png: a 96×96 tileable
 * alpha-noise texture for the routine atmosphere's film grain on NATIVE
 * (react-native-svg stubs FeTurbulence on iOS/Android, so the SVG grain is
 * web-only). Pixels are white with uniform-random alpha; the app recolors via
 * Image style.tintColor and scales by the period's grain opacity.
 *
 * Run once: node scripts/genGrainPng.cjs   (deterministic via seeded PRNG)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 96;

// Tiny deterministic PRNG (mulberry32) so the asset is reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(7);

// Raw RGBA scanlines, each prefixed with filter byte 0 (None).
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  const row = y * (1 + SIZE * 4);
  raw[row] = 0;
  for (let x = 0; x < SIZE; x++) {
    const o = row + 1 + x * 4;
    raw[o] = 255; // R (white — recolored by tintColor)
    raw[o + 1] = 255; // G
    raw[o + 2] = 255; // B
    // Alpha: uniform noise, biased slightly low so the mean matches the SVG
    // fractal-noise feel (sparse bright specks over a quiet field).
    const a = rand();
    raw[o + 3] = Math.round(Math.pow(a, 1.6) * 255);
  }
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); // width
ihdr.writeUInt32BE(SIZE, 4); // height
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'grain', 'grain96.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
