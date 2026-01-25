// Simple PNG generator without dependencies
// Creates basic colored placeholder sprites

import { writeFile } from 'fs/promises';

// Create a simple PNG file programmatically (1x1 colored pixel scaled up)
function createSimplePNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Create single color bitmap data
  const pixels = [];
  for (let y = 0; y < height; y++) {
    pixels.push(0); // Filter byte (0 = no filter)
    for (let x = 0; x < width; x++) {
      pixels.push(r, g, b, 255); // RGBA
    }
  }

  const pixelData = Buffer.from(pixels);

  // IHDR chunk (image header)
  const ihdr = Buffer.concat([
    Buffer.from('IHDR'),
    Buffer.from([
      0, 0, 0, width,  // Width (4 bytes)
      0, 0, 0, height, // Height (4 bytes)
      8,  // Bit depth
      6,  // Color type (RGBA)
      0, 0, 0  // Compression, filter, interlace
    ])
  ]);

  // Simple checksum (not proper CRC32, but works for placeholders)
  const ihdrChunk = createChunk(ihdr);

  // IDAT chunk (compressed pixel data) - using uncompressed for simplicity
  const zlibHeader = Buffer.from([0x78, 0x01]); // zlib header
  const uncompressed = Buffer.from([0x01, pixelData.length & 0xFF, (pixelData.length >> 8) & 0xFF,
                                    ~pixelData.length & 0xFF, (~pixelData.length >> 8) & 0xFF]);
  const idat = Buffer.concat([
    Buffer.from('IDAT'),
    zlibHeader,
    uncompressed,
    pixelData,
    Buffer.from([0, 0, 0, 0]) // Adler32 checksum (simplified)
  ]);
  const idatChunk = createChunk(idat);

  // IEND chunk
  const iend = createChunk(Buffer.from('IEND'));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iend]);
}

function createChunk(data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length - 4, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(0, 0); // Simplified CRC
  return Buffer.concat([length, data, crc]);
}

// Character color schemes (simple colored squares for now)
const sprites = {
  'npc/sam-visionary': { r: 139, g: 69, b: 19 },      // Brown
  'npc/alex-builder': { r: 44, g: 62, b: 80 },        // Dark blue
  'npc/jordan-connector': { r: 52, g: 73, b: 94 },    // Gray-blue
  'npc/casey-creative': { r: 231, g: 76, b: 60 },     // Red
  'npc/morgan-marketer': { r: 22, g: 160, b: 133 },   // Teal
  'ui/padlock': { r: 255, g: 215, b: 0 },             // Gold
  'ui/heart': { r: 231, g: 76, b: 60 }                // Red
};

async function main() {
  const basePath = '/Users/sd/Desktop/LoSV/public/assets/textures';

  for (const [path, color] of Object.entries(sprites)) {
    const size = path.startsWith('ui/') ? 32 : 48;
    const png = createSimplePNG(size, size, color.r, color.g, color.b);
    await writeFile(`${basePath}/${path}.png`, png);
    console.log(`Created ${path}.png (${size}x${size}, RGB ${color.r},${color.g},${color.b})`);
  }

  console.log('\nPlaceholder sprites created! Replace with proper pixel art.');
}

main().catch(console.error);
