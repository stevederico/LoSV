/**
 * Generates a minimal 32x32 favicon PNG using raw binary data.
 * Green square with gold center — represents the game.
 * Run: node scripts/generateFavicon.js
 */
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

const W = 16, H = 16;
const green = [45, 90, 39];
const gold = [228, 192, 37];

// Build raw pixel data (filter byte + RGB per pixel per row)
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    for (let x = 0; x < W; x++) {
        const isCenter = x >= 5 && x <= 10 && y >= 3 && y <= 12;
        const isTip = x >= 7 && x <= 8 && y >= 1 && y <= 2;
        const isGuard = x >= 4 && x <= 11 && y >= 11 && y <= 12;
        const isHandle = x >= 7 && x <= 8 && y >= 13 && y <= 14;
        const color = (isCenter || isTip || isHandle) ? gold : isGuard ? [139, 69, 19] : green;
        const off = y * (1 + W * 3) + 1 + x * 3;
        raw[off] = color[0];
        raw[off + 1] = color[1];
        raw[off + 2] = color[2];
    }
}

const compressed = deflateSync(raw);

// PNG file structure
function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let v = n;
        for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
        table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: RGB
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);

writeFileSync('public/favicon.png', png);
console.log(`Favicon generated: ${png.length} bytes`);
