import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'manifest.json');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const expectedIcons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 64 },
];

async function verifyAssets() {
  try {
    // 1. Verify Manifest
    const manifestStr = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(manifestStr);
    
    if (!manifest.name || !manifest.short_name) {
      throw new Error('Manifest is missing name or short_name');
    }
    if (!manifest.start_url || manifest.start_url !== './') {
      throw new Error('Manifest is missing correct start_url (should be ./)');
    }
    if (!manifest.scope || manifest.scope !== './') {
      throw new Error('Manifest is missing correct scope (should be ./)');
    }
    if (manifest.display !== 'standalone') {
      throw new Error('Manifest display should be standalone');
    }

    // 2. Verify expected PNG binaries
    for (const icon of expectedIcons) {
      const filePath = path.join(PUBLIC_DIR, icon.name);
      
      let buffer;
      try {
        buffer = await fs.readFile(filePath);
      } catch (err) {
        throw new Error(`Missing expected file: ${icon.name}`);
      }
      
      // Check PNG Signature
      if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error(`File ${icon.name} is NOT a valid binary PNG (corrupted signature).`);
      }
      
      // Check sharp read & dimensions
      const metadata = await sharp(buffer).metadata();
      if (metadata.width !== icon.size || metadata.height !== icon.size) {
        throw new Error(`File ${icon.name} has wrong dimensions: ${metadata.width}x${metadata.height} (expected ${icon.size}x${icon.size})`);
      }
      if (metadata.format !== 'png') {
        throw new Error(`File ${icon.name} format is ${metadata.format}, expected png`);
      }
      
      console.log(`Verified ${icon.name}: valid PNG, ${metadata.width}x${metadata.height}`);
    }

    console.log('✅ All PWA assets and manifest verified successfully.');
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

verifyAssets();
