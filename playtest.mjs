import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-Briscolatro/4d8849a0-b5b3-5eb7-8c5f-fcc941c9da4d/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR:', e.message); });
p.on('console', m => { const t = m.text(); if (t.includes('parity')) console.log('WARN:', t); });
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByText('GIOCA NUOVA PARTITA').click();
await p.waitForTimeout(500);
await p.locator('button:has-text("GIOCA QUESTO MAZZO")').first().click();
await p.waitForTimeout(1200);

const hand = () => p.locator('[class*="min-h-[148px]"] > div');
const oppHand = () => p.locator('.flex.gap-1 > div').first();

for (let t = 1; t <= 22; t++) {
  const n = await hand().count();
  if (n === 0) break;
  // check parity vs opponent card count via deck badge text is hard; just play
  await hand().first().click({ force: true });
  await p.waitForTimeout(150);
  const play = p.locator('button:has-text("GIOCA")').first();
  if (!(await play.isEnabled())) { await p.waitForTimeout(1500); }
  await play.click({ force: true });
  await p.waitForTimeout(3000);
  const cnt = await hand().count();
  console.log(`trick ${t}: hand=${cnt}`);
  if (await p.locator('text=CONTINUA').first().isVisible().catch(()=>false)) {
    console.log('-> round summary reached at trick', t);
    await p.screenshot({ path: `${OUT}/10-round-summary.png` });
    break;
  }
}
await p.screenshot({ path: `${OUT}/11-end.png` });
console.log('errors:', errors.length);
await b.close();
