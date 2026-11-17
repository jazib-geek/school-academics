import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(dir, 'pricing-poster-v2.html');
const outPath = path.join(dir, 'softelligent-pricing-poster-enriched.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1550 } });
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
await page.locator('#poster').screenshot({ path: outPath, type: 'png' });
await browser.close();
console.log('Wrote', outPath);
