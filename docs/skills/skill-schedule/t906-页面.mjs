/** #906 · 判据：61 件产物里复制区小标题归 0，且复制区三件仍在、页内锚点全可达。
 *  用法：`node docs/skills/skill-schedule/t906-页面.mjs <产物目录>`
 *  绿：打印 `TITLE-ZERO pages=61 h2=0 复制区三件齐=61/61 目录项=50 死锚点=0 -> 可发` 且 exit 0。
 *  红：任一页仍有复制区小标题／复制区散架／锚点指空 ⇒ 逐页点名，exit 1。 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIR = resolve(process.argv[2] ?? '.scratch/t792/产物');
if (!existsSync(DIR)) { console.error('ERR2 产物目录不存在：' + DIR); process.exit(2); }

const COPY_OPEN = '<section class="ilife-block ilife-block-copy-block">';
const old = { 复制与留档: 0, 复制初始化结果: 0, '复制初始化 prompt': 0, '复制给 AI': 0 };
let pages = 0; let h2 = 0; let intact = 0; let toc = 0; let dead = 0;
const reds = [];

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.html')).sort()) {
  const s = readFileSync(join(DIR, f), 'utf8');
  pages += 1;
  const h = (s.match(/<h2 class="ilife-block-copy-block-title">/g) ?? []).length;
  h2 += h;
  if (h > 0) reds.push(f + '：复制区小标题还在（' + h + ' 处）');
  // 复制区还在，且三件齐：三格式菜单 ＋ 复制日志按钮
  const at = s.lastIndexOf(COPY_OPEN);
  if (at < 0) { reds.push(f + '：复制区块整块不见了'); continue; }
  const seg = s.slice(at, s.indexOf('</section>', at) + 10);
  const menuOk = (seg.match(/data-fmt="/g) ?? []).length === 3 && seg.includes('data-fmt-open="1"');
  const logOk = /data-action-id="[^"]*-copy-log"/.test(seg);
  if (menuOk && logOk) intact += 1;
  else reds.push(f + '：复制区散架（三格式菜单=' + menuOk + ' 复制日志=' + logOk + '）');
  // 旧字面：**独立成题／独立成项**的那几处不许再印（正文里顺口写到「…复制给 AI 接着走」这种句子不算，
  // 那是提示语不是区标题 —— 第一版判据把它误伤成 12 处假红，这里按「独立成题」判）。
  // 「旧字面」这一栏只留**原来那行复制区小标题**这一种形态（`class="…copy-block-title"` 里独立成题）。
  // 别把正文里顺口写到的句子算进来：复盘页那句「…也可以把下面这一句复制给 AI 接着走」是提示语、
  // 对比页那句「把下面任意一句复制给 AI，它就着…往下聊」是说明句 —— 都不是区标题。
  // （第一版判据按「字面出现次数 − 目录项」算，把这两类人话误伤成 12 处假红；判据只该判要删的东西。）
  for (const t of Object.keys(old)) {
    const heading = (s.match(new RegExp('class="[^"]*copy-block-title">' + t + '<', 'g')) ?? []).length;
    old[t] += heading;
  }
  // 锚点可达：每个 href="#x" 都要有 id="x"
  for (const m of s.matchAll(/<a href="#([^"]+)"/g)) {
    if (!s.includes('id="' + m[1] + '"')) { dead += 1; reds.push(f + '：锚点指空 #' + m[1]); }
  }
  toc += (s.match(/<a href="#sec-\d+"/g) ?? []).length;
}
const leftover = Object.entries(old).filter(([, n]) => n > 0);
const clean = h2 === 0 && intact === pages && dead === 0 && leftover.length === 0;
console.log('TITLE-ZERO pages=' + pages + ' h2=' + h2 + ' 复制区三件齐=' + intact + '/' + pages
  + ' 目录项=' + toc + ' 死锚点=' + dead + ' 正文残留旧字面=' + leftover.reduce((a, [, n]) => a + n, 0)
  + ' -> ' + (clean ? '可发' : '逐页点名'));
for (const l of leftover) console.log('  RED 正文里还印着「' + l[0] + '」：' + l[1] + ' 处');
for (const r of reds.slice(0, 10)) console.log('  RED ' + r);
process.exit(clean ? 0 : 1);
