import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

// Create 64x64 canvas
const canvas = createCanvas(64, 64);
const ctx = canvas.getContext('2d');

// Fill with dark brown base
ctx.fillStyle = '#4a2511';
ctx.fillRect(0, 0, 64, 64);

// Add black outline
ctx.strokeStyle = '#000000';
ctx.lineWidth = 2;
ctx.strokeRect(1, 1, 62, 62);

// Add lighter brown windows (3x2 grid)
ctx.fillStyle = '#8b4513';
const windowSize = 8;
const windowSpacing = 4;
const startX = 12;
const startY = 16;

for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
        const x = startX + col * (windowSize + windowSpacing);
        const y = startY + row * (windowSize + windowSpacing);
        ctx.fillRect(x, y, windowSize, windowSize);

        // Add black window frame
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, windowSize, windowSize);
    }
}

// Add door (lighter brown)
ctx.fillStyle = '#8b4513';
ctx.fillRect(24, 48, 16, 14);
ctx.strokeStyle = '#000000';
ctx.lineWidth = 1;
ctx.strokeRect(24, 48, 16, 14);

// Save to file
const outputPath = path.join(process.cwd(), 'public', 'assets', 'textures', 'board-room.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`Board room texture created at: ${outputPath}`);
