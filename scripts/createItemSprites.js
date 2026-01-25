// Create simple item sprites (placeholders)
import { writeFile } from 'fs/promises';

// Same simple PNG generator from before
const createColoredPNG = (r, g, b) => {
  const data = [];
  data.push(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
  data.push(0x00, 0x00, 0x00, 0x0D);
  data.push(0x49, 0x48, 0x44, 0x52);
  data.push(0x00, 0x00, 0x00, 0x01);
  data.push(0x00, 0x00, 0x00, 0x01);
  data.push(0x08, 0x02, 0x00, 0x00, 0x00);
  data.push(0x90, 0x77, 0x53, 0xDE);
  data.push(0x00, 0x00, 0x00, 0x0C);
  data.push(0x49, 0x44, 0x41, 0x54);
  data.push(0x08, 0xD7, 0x63);
  data.push(r, g, b);
  data.push(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  data.push(0x00, 0x00, 0x00, 0x00);
  data.push(0x49, 0x45, 0x4E, 0x44);
  data.push(0xAE, 0x42, 0x60, 0x82);
  return Buffer.from(data);
};

// Item sprites with thematic colors
const items = [
  // House items
  { path: 'items/whiteboard.png', r: 255, g: 255, b: 255, desc: 'Whiteboard' },
  { path: 'items/interview-notes.png', r: 255, g: 255, b: 200, desc: 'Interview Notes' },

  // Garage items
  { path: 'items/keyboard.png', r: 50, g: 50, b: 50, desc: 'Mechanical Keyboard' },
  { path: 'items/energy-drink.png', r: 0, g: 200, b: 255, desc: 'Energy Drink' },
  { path: 'items/github-stickers.png', r: 36, g: 41, b: 46, desc: 'GitHub Stickers' },
  { path: 'items/mvp-usb.png', r: 150, g: 150, b: 150, desc: 'MVP Demo USB' },
  { path: 'items/tech-debt-note.png', r: 255, g: 200, b: 50, desc: 'Tech Debt Note' },

  // Accelerator items
  { path: 'items/pitch-deck.png', r: 255, g: 100, b: 50, desc: 'Pitch Deck' },
  { path: 'items/term-sheet.png', r: 200, g: 200, b: 200, desc: 'Term Sheet' },
  { path: 'items/business-card.png', r: 255, g: 255, b: 255, desc: 'Business Card' },
  { path: 'items/yc-letter.png', r: 255, g: 102, b: 0, desc: 'YC Acceptance Letter' },
  { path: 'items/cap-table.png', r: 100, g: 200, b: 100, desc: 'Cap Table' },

  // Loft items
  { path: 'items/handbook.png', r: 70, g: 130, b: 180, desc: 'Employee Handbook' },
  { path: 'items/team-photo.png', r: 200, g: 150, b: 100, desc: 'Team Photo' },
  { path: 'items/stock-options.png', r: 180, g: 200, b: 100, desc: 'Stock Option Docs' },
  { path: 'items/ping-pong-paddle.png', r: 255, g: 50, b: 50, desc: 'Ping Pong Paddle' },

  // Conference items
  { path: 'items/growth-playbook.png', r: 100, g: 200, b: 255, desc: 'Growth Playbook' },
  { path: 'items/analytics-dashboard.png', r: 50, g: 150, b: 255, desc: 'Analytics Dashboard' },
  { path: 'items/product-hunt-trophy.png', r: 255, g: 100, b: 50, desc: 'Product Hunt Trophy' },
  { path: 'items/ad-budget.png', r: 100, g: 200, b: 100, desc: 'Ad Budget' }
];

async function main() {
  const basePath = '/Users/sd/Desktop/LoSV/public/assets/textures';

  for (const item of items) {
    const png = createColoredPNG(item.r, item.g, item.b);
    await writeFile(`${basePath}/${item.path}`, png);
    console.log(`✓ ${item.path} - ${item.desc}`);
  }

  console.log(`\n✓ Created ${items.length} item sprites!`);
  console.log('NOTE: These are colored placeholders. Replace with proper pixel art.');
}

main().catch(console.error);
