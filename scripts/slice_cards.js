import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputImagePath = path.join(process.cwd(), 'public', 'neapolitan_cards_sheet.jpg');
const outputBaseDir = path.join(process.cwd(), 'public', 'cards');

const SUITS = ['denari', 'coppe', 'bastoni', 'spade'];
const RANK_NAMES = [
  'asso', '2', '3', '4', '5', '6', '7', 'fante', 'cavallo', 're'
];

async function sliceCards() {
  if (!fs.existsSync(inputImagePath)) {
    console.error('Spritesheet not found at:', inputImagePath);
    return;
  }

  const metadata = await sharp(inputImagePath).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  console.log(`Input spritesheet dimensions: ${width}x${height}`);

  // Create directories
  for (const suit of SUITS) {
    const suitDir = path.join(outputBaseDir, suit);
    if (!fs.existsSync(suitDir)) {
      fs.mkdirSync(suitDir, { recursive: true });
    }
  }

  const cols = 10;
  const rows = 4;
  const cardWidth = Math.floor(width / cols);
  const cardHeight = Math.floor(height / rows);

  console.log(`Estimated card slice: ${cardWidth}x${cardHeight}`);

  for (let r = 0; r < rows; r++) {
    const suit = SUITS[r];
    for (let c = 0; c < cols; c++) {
      const rankName = RANK_NAMES[c];
      const fileName = `${rankName}_${suit}.png`;
      const outPath = path.join(outputBaseDir, suit, fileName);

      // Crop with slight inset to remove borders/spacers if any
      const left = Math.round(c * (width / cols));
      const top = Math.round(r * (height / rows));
      const w = Math.min(cardWidth, width - left);
      const h = Math.min(cardHeight, height - top);

      await sharp(inputImagePath)
        .extract({ left, top, width: w, height: h })
        .png({ quality: 100 })
        .toFile(outPath);

      // Also create root-level alias like `public/cards/2_bastoni.png` for direct access
      const flatOutPath = path.join(outputBaseDir, fileName);
      fs.copyFileSync(outPath, flatOutPath);
    }
  }

  console.log('Successfully sliced all 40 cards into public/cards/');
}

sliceCards().catch(console.error);
