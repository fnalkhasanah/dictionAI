// Generates PWA icons as PNGs using only Node's built-in zlib (no native deps).
// Design: violet gradient rounded square + white magnifier (dictionary/search motif).
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "frontend", "public", "icons");
fs.mkdirSync(OUT, { recursive: true });

// ---- PNG encoding ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function writePng(size, pixelFn, file) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // scanline filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  console.log("✓", path.relative(process.cwd(), file), `(${size}x${size})`);
}

// ---- Geometry helpers ------------------------------------------------------
function roundedRectAlpha(x, y, size, r) {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r ? 255 : 0;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const ox = px - (ax + t * dx);
  const oy = py - (ay + t * dy);
  return Math.sqrt(ox * ox + oy * oy);
}

// ---- Icon: violet gradient square + white magnifier -------------------------
function makeIcon({ fullBleed, size }) {
  const s = size;
  return (x, y) => {
    // vertical gradient background #7C6CF0 -> #5A4BD1
    const t = y / (s - 1);
    const bg = [
      Math.round(0x7c + (0x5a - 0x7c) * t),
      Math.round(0x6c + (0x4b - 0x6c) * t),
      Math.round(0xf0 + (0xd1 - 0xf0) * t),
    ];

    const alpha = fullBleed ? 255 : roundedRectAlpha(x, y, s, s * 0.22);

    // magnifier: ring centered at (0.43, 0.43), handle toward (0.80, 0.80)
    const cx = 0.43 * s;
    const cy = 0.43 * s;
    const ringR = 0.24 * s;
    const ringW = 0.1 * s;
    const d = Math.hypot(x - cx, y - cy);
    const inRing = Math.abs(d - ringR) <= ringW / 2;

    const hw = 0.075 * s; // handle half-width
    const inHandle = distToSegment(x, y, 0.58 * s, 0.58 * s, 0.8 * s, 0.8 * s) <= hw;

    const white = inRing || inHandle;
    return [white ? 255 : bg[0], white ? 255 : bg[1], white ? 255 : bg[2], alpha];
  };
}

writePng(512, makeIcon({ fullBleed: false, size: 512 }), path.join(OUT, "icon-512.png"));
writePng(512, makeIcon({ fullBleed: true, size: 512 }), path.join(OUT, "icon-512-maskable.png"));
writePng(192, makeIcon({ fullBleed: false, size: 192 }), path.join(OUT, "icon-192.png"));
writePng(180, makeIcon({ fullBleed: false, size: 180 }), path.join(OUT, "icon-180.png"));
console.log("done");