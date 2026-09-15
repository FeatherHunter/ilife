/** T351-v11 · 拿**仓里那条权威探针**（`test/visible-text-probe.mjs`，四类机器话）扫我们这 37 份产物
 *  ＋ 自造用例——它的判据比本图自建的那条 ASCII 检查更精确（只打真机器话，不误伤单位）。
 *  口径照 `t401c-页面机器话探针.test.mjs`：剥掉复制载荷后再找，四类各返回首个命中。
 *  入仓理由：六条口径里的第 ④ 条（文字零冗余和不合理）原先只有本图自建的一条 ASCII 检查；
 *  仓里本来就有这条更准的（只打真机器话、不误伤单位），验收入口应当跑仓里那条。
 *  用法：node docs/skills/skill-calorie/t351-v11-machine-words-probe.mjs <产物目录…>
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { machineWords, visibleLines } from '../../packages/skill-calorie/test/visible-text-probe.mjs';

/** 本域**说得清来路**的大写词（探针本意是打源码标识符，不是打单位）：节奏单位 RPM、
 *  体测缩写 BMI／TDEE、提示词里的 HTML／AI。清单放这里，加一个要能说出它是什么。 */
const ALLOWED_UPPER = new Set(['RPM', 'BMI', 'TDEE', 'HTML', 'AI']);

let bad = 0;
let seen = 0;
for (const dir of process.argv.slice(2)) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  for (const f of files) {
    seen += 1;
    const html = readFileSync(join(dir, f), 'utf8');
    const hits = machineWords(html).filter((w) => w.hit !== null && !ALLOWED_UPPER.has(w.hit));
    if (hits.length === 0) continue;
    bad += 1;
    console.log('✖ ' + f);
    for (const h of hits) console.log('     ' + h.kind + '＝「' + h.hit + '」');
  }
}
console.log('----');
console.log('扫 ' + seen + ' 份：命中 ' + bad + ' 份' + (bad === 0 ? '（全绿）' : ''));
// 顺带看一眼长行（≥50 字符），主页那条判据要求 ≤2 条；我们这族页面上限未见成文，先只报数不判红。
for (const dir of process.argv.slice(2)) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  const withLong = files.map((f) => ({ f, n: visibleLines(readFileSync(join(dir, f), 'utf8')).filter((t) => t.length >= 50).length }))
    .filter((x) => x.n > 0);
  if (withLong.length > 0) console.log('长行（≥50）' + dir + '：' + withLong.map((x) => x.f + '(' + x.n + ')').join('、'));
}
