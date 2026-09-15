/** #269 收口复核 · 前后两侧的**逐字节**比对（判据 ② 的读数器）。
 *  用法：node .scratch/t269r/samplediff.mjs
 *  读 .scratch/t269r/wn/sample-after.json 与 sample-before.json（同一份编译产物，before 侧＝那一跳被摘掉），
 *  逐条给读数：饮食 13 条应**全变**、非饮食抽样应**逐字节同一**（归一化后相等）。
 *  归一化只做三件事：临时目录串→<DIR>、时刻串→<TS>、桩标记→<MARK>；其余逐字节。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const A = JSON.parse(readFileSync(resolve('.scratch/t269r/wn/sample-after.json'), 'utf8'));
const B = JSON.parse(readFileSync(resolve('.scratch/t269r/wn/sample-before.json'), 'utf8'));
const sha16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

const keys = Object.keys(A);
let dietChanged = 0; let dietSame = 0; let otherSame = 0; let otherChanged = 0; let unusable = 0;
for (const k of keys) {
  const a = A[k]; const b = B[k];
  const side = a.side ?? b.side;
  const usable = a.norm !== null && b.norm !== null && a.exit === 0 && b.exit === 0;
  if (!usable) {
    unusable++;
    console.log(`DIFF key=${k} side=${side} usable=0 afterExit=${a.exit} beforeExit=${b.exit} afterBytes=${a.bytes} beforeBytes=${b.bytes}`);
    continue;
  }
  const same = a.norm === b.norm;
  if (side === 'diet13') { if (same) dietSame++; else dietChanged++; } else if (same) otherSame++; else otherChanged++;
  console.log(`DIFF key=${k} side=${side} same=${same ? 1 : 0} afterBytes=${a.bytes} beforeBytes=${b.bytes} afterTemplate=${a.template} beforeTemplate=${b.template} afterSha16=${sha16(a.norm)} beforeSha16=${sha16(b.norm)} afterStrictFails=${a.strictFails === null ? '-' : (a.strictFails.length === 0 ? 0 : a.strictFails.join('|'))}`);
}
console.log(`RESULT: DIFF dietChanged=${dietChanged} dietSame=${dietSame} othersSame=${otherSame} othersChanged=${otherChanged} unusable=${unusable} n=${keys.length}`);
console.log(`RESULT: VERDICT ${dietChanged === 13 && dietSame === 0 && otherChanged === 0 ? 'PASS' : 'FAIL'}`);
