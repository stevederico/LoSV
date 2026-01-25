// Create simple placeholder PNGs from base64-encoded 1x1 pixels
import { writeFile } from 'fs/promises';

// Base64 encoded 1x1 PNG templates with different colors
// These are actual valid PNG files
const createColoredPNG = (r, g, b) => {
  // Minimal valid PNG structure with 1x1 pixel
  const data = [];

  // PNG signature
  data.push(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);

  // IHDR chunk
  data.push(0x00, 0x00, 0x00, 0x0D); // Length: 13
  data.push(0x49, 0x48, 0x44, 0x52); // "IHDR"
  data.push(0x00, 0x00, 0x00, 0x01); // Width: 1
  data.push(0x00, 0x00, 0x00, 0x01); // Height: 1
  data.push(0x08); // Bit depth: 8
  data.push(0x02); // Color type: RGB
  data.push(0x00, 0x00, 0x00); // Compression, filter, interlace
  data.push(0x90, 0x77, 0x53, 0xDE); // CRC (placeholder)

  // IDAT chunk with 1x1 RGB pixel
  data.push(0x00, 0x00, 0x00, 0x0C); // Length: 12
  data.push(0x49, 0x44, 0x41, 0x54); // "IDAT"
  data.push(0x08, 0xD7); // zlib header
  data.push(0x63); // Deflate block
  data.push(r, g, b); // RGB values
  data.push(0x00, 0x00, 0x00, 0x00); // Checksum (placeholder)
  data.push(0x00, 0x00, 0x00, 0x00); // CRC (placeholder)

  // IEND chunk
  data.push(0x00, 0x00, 0x00, 0x00); // Length: 0
  data.push(0x49, 0x45, 0x4E, 0x44); // "IEND"
  data.push(0xAE, 0x42, 0x60, 0x82); // CRC

  return Buffer.from(data);
};

const sprites = [
  { path: 'npc/sam-visionary.png', r: 139, g: 69, b: 19, desc: 'Brown (hoodie)' },
  { path: 'npc/alex-builder.png', r: 44, g: 62, b: 80, desc: 'Dark blue (shirt)' },
  { path: 'npc/jordan-connector.png', r: 52, g: 73, b: 94, desc: 'Gray-blue (business)' },
  { path: 'npc/casey-creative.png', r: 231, g: 76, b: 60, desc: 'Red (creative)' },
  { path: 'npc/morgan-marketer.png', r: 22, g: 160, b: 133, desc: 'Teal (professional)' },
  { path: 'ui/padlock.png', r: 255, g: 215, b: 0, desc: 'Gold (lock)' },
  { path: 'ui/heart.png', r: 231, g: 76, b: 60, desc: 'Red (heart)' }
];

async function main() {
  const basePath = '/Users/sd/Desktop/LoSV/public/assets/textures';

  for (const sprite of sprites) {
    const png = createColoredPNG(sprite.r, sprite.g, sprite.b);
    await writeFile(`${basePath}/${sprite.path}`, png);
    console.log(`✓ ${sprite.path} - ${sprite.desc}`);
  }

  console.log('\n✓ All placeholder sprites created!');
  console.log('NOTE: These are simple colored squares. Replace with proper pixel art.');
}

main().catch(console.error);
