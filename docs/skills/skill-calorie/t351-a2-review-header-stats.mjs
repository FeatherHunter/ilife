/** 基准 vs 交付：逐表表头列数统计（v3 六列＝动作/部位/类型/组数×次数/重量/备注） */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SIX = ['动作', '部位', '类型', '组数×次数', '重量', '备注'];
const FOUR = ['动作', '部位', '组数×次数', '重量'];
const dirs = [
  ['final-v3(基准)', '.scratch/t351-fix/final-v3'],
  ['final-v4(交付)', '.scratch/t351-fix/final-v4'],
  ['realdata(交付)', '.scratch/t351-fix/final-v4/realdata'],
];
for (const [label, dir] of dirs) {
  let six = 0; let four = 0; let other = 0;
  const pgS = []; const pgF = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    const t = readFileSync(join(dir, f), 'utf8');
    for (const m of t.matchAll(/<div class="ilife-block ilife-block-data-table">([\s\S]*?)<\/table>/g)) {
      const h = [...m[1].matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((x) => x[1].trim());
      if (h.join('|') === SIX.join('|')) { six += 1; if (!pgS.includes(f)) pgS.push(f); } else if (h.join('|') === FOUR.join('|')) { four += 1; if (!pgF.includes(f)) pgF.push(f); } else other += 1;
    }
  }
  console.log(label + ': 六列表=' + six + ' 四列表=' + four + ' 其它表=' + other);
  console.log('   六列页(' + pgS.length + '): ' + JSON.stringify(pgS.sort()));
  console.log('   四列页(' + pgF.length + '): ' + JSON.stringify(pgF.sort()));
}
