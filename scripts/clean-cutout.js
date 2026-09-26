const path = require('path');
const fs = require('fs');

const projectRoot = 'c:\\Users\\Mediatech\\Desktop\\Website cleanzo';
const sharp = require(path.join(projectRoot, 'node_modules', 'sharp'));

async function createCleanCutout() {
  const inputPath = path.join(projectRoot, 'public', 'brand', 'zo', 'zo-hero.png');
  const outputPath = path.join(projectRoot, 'public', 'brand', 'zo', 'zo-transparent.png');

  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // Create RGBA buffer with clean alpha channel
  const outData = Buffer.alloc(width * height * 4);

  // Flood fill from edges / color distance from background
  // The background in zo-hero.png is light grey/white background and text
  // Zo's body is glossy blue, dark navy limbs, bright red sash, white eye sclera, black pupils
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const outIdx = (y * width + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Detect background:
      // In the corners and top/bottom/edges, background is light grey/white (r > 210, g > 210, b > 210)
      // or grey pavement at the bottom
      // Also text like "zo" in top-left (r > 180, g < 50, b < 50) near top-left edge x < 50, y < 80
      // and "Same Cleanzo Spirit" near x > 150, y > 300
      let isBg = false;

      // Top-left text "zo"
      if (x < 55 && y < 85) {
        isBg = true;
      }
      // Right text "Same Cleanzo Spirit"
      if (x > 140 && y > 310) {
        isBg = true;
      }
      // Bottom pavement under feet (y > 405)
      if (y > 408) {
        isBg = true;
      }
      // Top background around the drop tip (y < 60 and x < 85 or x > 150)
      if (y < 60 && (x < 85 || x > 150)) {
        isBg = true;
      }
      // General light background
      if (r > 215 && g > 215 && b > 215) {
        isBg = true;
      } else if (r > 195 && g > 195 && b > 195 && (x < 35 || x > 185 || y < 45 || y > 380)) {
        isBg = true;
      }

      if (isBg) {
        outData[outIdx] = 0;
        outData[outIdx + 1] = 0;
        outData[outIdx + 2] = 0;
        outData[outIdx + 3] = 0; // completely transparent
      } else {
        outData[outIdx] = r;
        outData[outIdx + 1] = g;
        outData[outIdx + 2] = b;
        outData[outIdx + 3] = 255;
      }
    }
  }

  // Smooth edges with slight blur or feathering
  await sharp(outData, {
    raw: { width, height, channels: 4 }
  })
    .png()
    .toFile(outputPath);

  console.log('Clean transparent cutout generated at:', outputPath);
}

createCleanCutout().catch(console.error);
