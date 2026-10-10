import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let kb = null;

export function getKb() {
  if (kb) return kb;
  if (typeof window !== 'undefined' && window.__HAQ_KB__) {
    kb = window.__HAQ_KB__;
    return kb;
  }
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const kbPath = path.resolve(__dirname, '../../data/kb.json');
    const content = fs.readFileSync(kbPath, 'utf8');
    kb = JSON.parse(content);
    return kb;
  } catch (e) {
    return [];
  }
}
