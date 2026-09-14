/** 独立审查兵探针 F：§2.4「零表判绿的后门」两面证伪。
 *
 *  做法：拿被审脚本 v4 的源码文本做**定点插桩**（被审本体一字不动），生成的每一份产物落盘前先按
 *  `PROBE24` 指令动它，然后由**被审脚本自己的** `inspect()`／`tableVerdict()` 判——不是我自己重写判据。
 *    strip:<file>   抽掉该页**整张**动作明细表（`<div class="…data-table">…</table></div>`）
 *    inject:<file>  给该页塞一张最小的四列表（验 `none` 声明不是免检通道）
 *  用法：PROBE24=strip:order184-result.html node .scratch/t351-a2/review/probe-24.mjs <outDir>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SRC = 'docs/skills/skill-calorie/t351-a2-run-176-207-v4.mjs';
const OUT = process.argv[2] ?? '.scratch/t351-a2/review/out-p24';
const probe = process.env.PROBE24 ?? 'strip:order184-result.html';
const patch = readFileSync(SRC, 'utf8');

const HOOK = `/** 独立审查兵插桩：产物落盘前按 PROBE24 动它，再交给被审脚本自己的判据。 */
const PROBE24 = process.env.PROBE24 ?? '';
const TABLE_RE = /<div class="ilife-block ilife-block-data-table">[\\s\\S]*?<\\/table><\\/div>/;
function probeMutate(file, html) {
  if (PROBE24 === '') return html;
  const [mode, target] = PROBE24.split(':');
  if (file !== target) return html;
  if (mode === 'strip') {
    const m = TABLE_RE.exec(html);
    if (m === null) { console.log('PROBE24_NOTE ' + file + ' 页内本无表，strip 是空操作'); return html; }
    console.log('PROBE24_NOTE ' + file + ' 抽掉一张表（' + m[0].length + ' 字节）');
    return html.replace(m[0], '<!--STRIPPED-->');
  }
  if (mode === 'stripall') {
    const all = html.match(new RegExp(TABLE_RE.source, 'g')) ?? [];
    console.log('PROBE24_NOTE ' + file + ' 抽掉**全部** ' + all.length + ' 张表');
    return html.replace(new RegExp(TABLE_RE.source, 'g'), '<!--STRIPPED-->');
  }
  if (mode === 'inject') {
    const t = '<div class="ilife-block ilife-block-data-table"><table class="ilife-block-data-table-table">'
      + '<thead><tr><th scope="col" class="ilife-block-data-table-cell-left">动作</th>'
      + '<th scope="col" class="ilife-block-data-table-cell-left">部位</th>'
      + '<th scope="col" class="ilife-block-data-table-cell-right">组数×次数</th>'
      + '<th scope="col" class="ilife-block-data-table-cell-right">重量</th></tr></thead>'
      + '<tbody><tr><td class="ilife-block-data-table-cell-left"><strong>塞进来的</strong>'
      + '<p class="ilife-block-caliber">伪造 · 主要</p></td>'
      + '<td class="ilife-block-data-table-cell-left">胸</td>'
      + '<td class="ilife-block-data-table-cell-right">3组×10次</td>'
      + '<td class="ilife-block-data-table-cell-right">35kg</td></tr></tbody></table></div>';
    console.log('PROBE24_NOTE ' + file + ' 塞进一张伪造四列表');
    return html.replace('</body>', t + '</body>');
  }
  return html;
}

`;
const anchor = 'function runOne(rec, dir, card) {';
if (!patch.includes(anchor)) throw new Error('PROBE24: 插桩锚点没找到');
let patched = patch.replace(anchor, HOOK + anchor);
const target = '  s.inspect = inspect(file, readFileSync(path, \'utf8\'));';
if (!patched.includes(target)) throw new Error('PROBE24: 插桩目标行没找到');
patched = patched.replace(target,
  '  const raw0 = readFileSync(path, \'utf8\');\n'
  + '  const raw1 = probeMutate(file, raw0);\n'
  + '  if (raw1 !== raw0) writeFileSync(path, raw1, \'utf8\');\n'
  + '  s.inspect = inspect(file, raw1);');

const F = '.scratch/t351-a2/review/probe-24-patched.mjs';
writeFileSync(F, patched, 'utf8');
const r = spawnSync(process.execPath, [F, '--out', OUT], { encoding: 'utf8', env: { ...process.env, PROBE24: probe } });
const out = String(r.stdout || '') + String(r.stderr || '');
for (const line of out.split('\n')) {
  if (/PROBE24|机检④|RESULT:|^FAIL/.test(line)) console.log(line.slice(0, 400));
}
console.log('PROBE24_EXIT=' + r.status + ' PROBE24_MODE=' + probe);
