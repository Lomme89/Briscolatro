#!/usr/bin/env node
import fs from 'node:fs';

const checks = [
  ['src/App.tsx', ["'opponent_thinking'", "chooseOpponentFollow", 'leadIsPlayer={leadIsPlayer}', 'scheduleFlowAction']],
  ['src/components/GameTable.tsx', ["from '../game/briscola'", 'leadIsPlayer: boolean', 'isReverseActive: boolean']],
  ['src/components/ScoreTallyOverlay.tsx', ['pointer-events-auto']],
  ['src/game/ai.ts', ['chooseOpponentLead', 'chooseOpponentFollow']],
  ['src/game/briscola.ts', ['Canonical two-player Briscola resolver']],
  ['src/game/unoEffects.ts', ['cycleTwoStockCards']],
];

let failed = false;
for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`✗ manca ${file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`✗ ${file}: manca ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('✓ turn-fix presente nei file attesi');
