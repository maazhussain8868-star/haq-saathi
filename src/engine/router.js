import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyText } from './routerCore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedKb = null;

export function loadKb() {
  if (cachedKb) return cachedKb;
  const kbPath = path.resolve(__dirname, '../../data/kb.json');
  const raw = fs.readFileSync(kbPath, 'utf8');
  cachedKb = JSON.parse(raw);
  return cachedKb;
}

export function routeGrievance(text) {
  const kb = loadKb();
  return classifyText(text, kb);
}
