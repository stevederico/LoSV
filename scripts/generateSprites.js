// Simple sprite generator for NPC character placeholders
// This creates basic colored sprites as placeholders
// Replace with proper pixel art later

import { createCanvas } from 'canvas';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const SPRITE_SIZE = 48;

// NPC character color schemes
const characters = {
  'sam-visionary': { bg: '#8B4513', accent: '#D2691E', desc: 'Brown hoodie, coffee mug' },
  'alex-builder': { bg: '#2C3E50', accent: '#3498DB', desc: 'Dark shirt with code, keyboard' },
  'jordan-connector': { bg: '#34495E', accent: '#95A5A6', desc: 'Business casual, tablet' },
  'casey-creative': { bg: '#E74C3C', accent: '#F39C12', desc: 'Colorful outfit, sketchbook' },
  'morgan-marketer': { bg: '#16A085', accent: '#1ABC9C', desc: 'Professional blazer, chart' }
};

async function createCharacterSprite(name, colors) {
  const canvas = createCanvas(SPRITE_SIZE, SPRITE_SIZE);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

  // Simple character representation
  // Head (circle)
  ctx.fillStyle = '#FFD4A3'; // Skin tone
  ctx.beginPath();
  ctx.arc(SPRITE_SIZE / 2, SPRITE_SIZE / 3, 8, 0, Math.PI * 2);
  ctx.fill();

  // Body (rectangle with character color)
  ctx.fillStyle = colors.bg;
  ctx.fillRect(SPRITE_SIZE / 2 - 10, SPRITE_SIZE / 3 + 4, 20, 20);

  // Accent detail
  ctx.fillStyle = colors.accent;
  ctx.fillRect(SPRITE_SIZE / 2 - 6, SPRITE_SIZE / 3 + 8, 12, 4);

  // Legs
  ctx.fillStyle = '#34495E';
  ctx.fillRect(SPRITE_SIZE / 2 - 8, SPRITE_SIZE / 3 + 24, 6, 12);
  ctx.fillRect(SPRITE_SIZE / 2 + 2, SPRITE_SIZE / 3 + 24, 6, 12);

  return canvas.toBuffer('image/png');
}

async function createPadlockIcon() {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 64);

  // Lock body (golden)
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(20, 32, 24, 20);

  // Lock shackle
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(32, 28, 8, Math.PI, 0, true);
  ctx.stroke();

  // Keyhole
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(32, 40, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(30, 40, 4, 6);

  return canvas.toBuffer('image/png');
}

async function createHeartIcon() {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 32, 32);

  // Red heart shape
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.moveTo(16, 28);
  ctx.bezierCurveTo(16, 28, 8, 20, 8, 14);
  ctx.bezierCurveTo(8, 8, 12, 6, 16, 10);
  ctx.bezierCurveTo(20, 6, 24, 8, 24, 14);
  ctx.bezierCurveTo(24, 20, 16, 28, 16, 28);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

async function main() {
  const basePath = '/Users/sd/Desktop/LoSV/public/assets/textures';

  // Generate NPC sprites
  for (const [name, colors] of Object.entries(characters)) {
    const buffer = await createCharacterSprite(name, colors);
    await writeFile(join(basePath, 'npc', `${name}.png`), buffer);
    console.log(`Created ${name}.png - ${colors.desc}`);
  }

  // Generate UI icons
  const padlock = await createPadlockIcon();
  await writeFile(join(basePath, 'ui', 'padlock.png'), padlock);
  console.log('Created padlock.png');

  const heart = await createHeartIcon();
  await writeFile(join(basePath, 'ui', 'heart.png'), heart);
  console.log('Created heart.png');

  console.log('\nAll sprites generated! Replace with proper pixel art when ready.');
}

main().catch(console.error);
