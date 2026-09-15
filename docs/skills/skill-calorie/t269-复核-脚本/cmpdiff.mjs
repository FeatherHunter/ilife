/** 比对 `.scratch/t269r/cmp-after.json` 与 `cmp-before.json`：逐条判「逐字节未变」。
 *  期望：13 条饮食 → 全变（片段→整页）；7 条非饮食 → 全不变。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const a = JSON.parse(readFileSync(resolve('.scratch/t269r/cmp-after.json'), 'utf8'));
const b = JSON.parse(readFileSync(resolve('.scratch/t269r/cmp-before.json'), 'utf8'));
let dietChanged = 0; let dietTotal = 0; let othersSame = 0; let othersTotal = 0; let nulls = 0;
for (const key of Object.keys(a)) {
  const x = a[key]; const y = b[key];
  const ok = x.exit === 0 && y.exit === 0 && x.sha !== null && y.sha !== null;
  const same = ok && x.sha === y.sha;
  if (!ok) nulls++;
  if (x.side === 'diet13') { dietTotal++; if (!same && ok) dietChanged++; } else { othersTotal++; if (same) othersSame++; }
  console.log(`DIFF key=${key} side=${x.side} usable=${ok ? 1 : 0} same=${same ? 1 : 0} bytesAfter=${x.bytes} bytesBefore=${y.bytes} templateAfter=${x.template} templateBefore=${y.template}`);
}
console.log(`RESULT: CMPDIFF dietChanged=${dietChanged}/${dietTotal} othersSame=${othersSame}/${othersTotal} unusable=${nulls}`);
