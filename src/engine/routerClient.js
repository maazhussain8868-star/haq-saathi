import kbData from '../../data/kb.json' with { type: 'json' };
import { classifyText } from './routerCore.js';

export function getKbList() {
  return kbData;
}

export function routeGrievanceClient(text) {
  return classifyText(text, kbData);
}
