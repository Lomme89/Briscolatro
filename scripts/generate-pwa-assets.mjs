import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SVG_PATH = path.join(PUBLIC_DIR, 'icon.svg');

const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 64 },
];

async function generateAssets() {
  try {
    const svgBuffer = await fs.readFile(SVG_PATH);
    
    for (const icon of icons) {
      const outputPath = path.join(PUBLIC_DIR, icon.name);
      
      await sharp(svgBuffer)
        .resize(icon.size, icon.size)
        .png({ compressionLevel: 9 })
        .toFile(outputPath);
        
      console.log(`Generated ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    // Clean up corrupted or old files
    const toRemove = ['favicon.ico', 'screenshot-mobile.png'];
    for (const file of toRemove) {
      try {
        await fs.unlink(path.join(PUBLIC_DIR, file));
        console.log(`Removed ${file}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.warn(`Could not remove ${file}:`, err.message);
        }
      }
    }

    console.log('Successfully generated valid binary PNG assets for PWA.');
  } catch (err) {
    console.error('Error generating assets:', err);
    process.exit(1);
  }
}

generateAssets();
