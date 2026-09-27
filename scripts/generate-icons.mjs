// App icons (192 & 512 px) banata hai — koi image library nahi chahiye.
// Chalao: npm run icons
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const BG = [47, 109, 246, 255]; // accent blue
const FG = [255, 255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 4x4 supersampling — edges smooth rehte hain, koi library nahi chahiye. */
function sample(x, y, size, pixel) {
  const N = 4;
  let r = 0,
    g = 0,
    b = 0,
    a = 0;
  for (let sy = 0; sy < N; sy++) {
    for (let sx = 0; sx < N; sx++) {
      const p = pixel(x + (sx + 0.5) / N, y + (sy + 0.5) / N, size);
      r += p[0] * p[3];
      g += p[1] * p[3];
      b += p[2] * p[3];
      a += p[3];
    }
  }
  if (a === 0) return [0, 0, 0, 0];
  return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / (N * N))];
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = sample(x, y, size, pixel);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Rounded square background + ek simple wallet shape. */
function icon(x, y, size) {
  const r = size * 0.22;
  const inCorner =
    (x < r && y < r && (x - r) ** 2 + (y - r) ** 2 > r * r) ||
    (x > size - r && y < r && (x - (size - r)) ** 2 + (y - r) ** 2 > r * r) ||
    (x < r && y > size - r && (x - r) ** 2 + (y - (size - r)) ** 2 > r * r) ||
    (x > size - r && y > size - r && (x - (size - r)) ** 2 + (y - (size - r)) ** 2 > r * r);
  if (inCorner) return [0, 0, 0, 0];

  const wx = size * 0.24;
  const wy = size * 0.33;
  const ww = size * 0.52;
  const wh = size * 0.34;
  const inWallet = x >= wx && x <= wx + ww && y >= wy && y <= wy + wh;

  // wallet ke andar ka "coin" slot — accent color wapas
  const cx = wx + ww * 0.78;
  const cy = wy + wh * 0.5;
  const inCoin = (x - cx) ** 2 + (y - cy) ** 2 <= (size * 0.05) ** 2;

  if (inWallet && !inCoin) return FG;
  return BG;
}

const outDir = path.resolve(process.cwd(), "public");
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png(size, icon));
  console.log("wrote", file);
}
