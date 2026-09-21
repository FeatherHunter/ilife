import fs from 'node:fs';
import path from 'node:path';
const resPath = path.resolve('docs/skills/skill-chef/t819-db-全局缺口决议.md');
if (!fs.existsSync(resPath)) { console.error('缺决议文件：' + resPath); process.exit(1); }
const text = fs.readFileSync(resPath, 'utf8');
if (text.charCodeAt(0) === 0xFEFF) { console.error('决议文件禁 BOM'); process.exit(1); }
const lines = text.split(/\r?\n/);
const idx1 = lines.findIndex((l) => /^##\s*G1/.test(l));
const idx2 = lines.findIndex((l) => /^##\s*G2/.test(l));
const need = ['落点票号', '正例', '反例'];
let fail = false;
if (idx1 < 0) { console.error('缺G1节'); fail = true; }
else {
  const sec = lines.slice(idx1, idx2 < 0 ? undefined : idx2).join('\n');
  for (const k of need) if (!sec.includes(k)) { console.error('G1节缺' + k); fail = true; }
}
if (idx2 < 0) { console.error('缺G2节'); fail = true; }
else {
  const sec = lines.slice(idx2).join('\n');
  for (const k of need) if (!sec.includes(k)) { console.error('G2节缺' + k); fail = true; }
}
if (fail) process.exit(1);
console.log('t819决议两节齐：G1/G2 各带落点票号与正反例读数');
