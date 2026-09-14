/** 独立审查兵反事实比对 E：三个变体产物 vs `.scratch/t351-fix/final-v3`（只读基准）。
 *  判：v3→v4 的 9 份差异能否被「夹具两处改动」逐份解释（撤掉后应逐字节回到 v3）。
 *  只比**正文**（剥 style／script ＋ 抹时间戳），与派单口径一致。
 *  用法：node .scratch/t351-a2/review/cf-compare.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const V3 = '.scratch/t351-fix/final-v3';
const V4 = '.scratch/t351-fix/final-v4';
const body = (h) => h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\u0000S\u0000')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\u0000J\u0000')
  .replace(/20\d\d-\d\d-\d\d \d\d:\d\d:\d\d/g, '\u0000TS\u0000');

const v3 = new Map(readdirSync(V3).filter((f) => f.endsWith('.html')).map((f) => [f, body(readFileSync(join(V3, f), 'utf8'))]));
const v4 = new Map(readdirSync(V4).filter((f) => f.endsWith('.html')).map((f) => [f, body(readFileSync(join(V4, f), 'utf8'))]));

const changed = [...v4.keys()].filter((f) => v3.has(f) && v3.get(f) !== v4.get(f)).sort();
console.log('V3_V4_DIFF=' + changed.length + ' ' + JSON.stringify(changed));

/** 该份差异是否属「表形面」：四列表头数／副行条数／标题节奏记号任一变化即算表形。 */
function shapeSig(t) {
  const tables = [...t.matchAll(/<div class="ilife-block ilife-block-data-table">([\s\S]*?)<\/table>/g)]
    .map((m) => [...m[1].matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((x) => x[1]).join('|'));
  return JSON.stringify({
    tables,
    sub: (t.match(/<p class="ilife-block-caliber">/g) || []).length,
    tempo: (t.match(/节奏/g) || []).length,
    strong: (t.match(/<strong>/g) || []).length,
  });
}

for (const v of ['cfA', 'cfB', 'cfAB']) {
  const dir = join('.scratch/t351-a2/review', 'out-' + v);
  const files = readdirSync(dir).filter((f) => f.endsWith('.html'));
  const same = [];
  const stillDiff = [];
  for (const f of files) {
    const b = body(readFileSync(join(dir, f), 'utf8'));
    const ref = v3.get(f);
    if (ref === undefined) continue;
    if (b === ref) same.push(f); else stillDiff.push(f);
  }
  console.log('CF_COMPARE ' + v + ' 回到 v3 的份数=' + same.length + '/' + files.length);
  console.log('  ' + v + '_STILL_DIFF=' + JSON.stringify(stillDiff.sort()));
}

/* 表形面差异扫描：v3 → v4 那 9 份（非四列目标页）里有没有表形层面的改动 */
const NINE = changed.filter((f) => !/^order(176|177|179|180|181|182|183|184)-result\.html$/.test(f));
let shapeBad = 0;
for (const f of NINE) {
  const a = shapeSig(v3.get(f));
  const b = shapeSig(v4.get(f));
  const same = a === b;
  if (!same) shapeBad += 1;
  console.log('SHAPE ' + f + ' 表形面一致=' + same + (same ? '' : '\n  v3=' + a + '\n  v4=' + b));
}
console.log('SHAPE_BAD=' + shapeBad + '（9 份非目标页里有多少份动了表形面）');
console.log('RESULT: ' + (shapeBad === 0 ? '1/1 九份差异全在数据面' : '0/1 有表形面差异'));
