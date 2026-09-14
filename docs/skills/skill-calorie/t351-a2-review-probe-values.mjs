/** 独立审查兵探针 H：**值级**真值对账（打「只判结构不判值」的盲区）。
 *  真值由本席手写（照夹具 seedPlanDb 的 sets／note 推），不取被审脚本任何常量。
 *  另判：两条删减的记号（reps×／W<n> ）确实不在任何产物正文里。
 *  用法：node .scratch/t351-a2/review/probe-values.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const V4 = '.scratch/t351-fix/final-v4';
const html184 = readFileSync(join(V4, 'order184-result.html'), 'utf8');
const tables184 = [...html184.matchAll(/<div class="ilife-block ilife-block-data-table">([\s\S]*?)<\/table>/g)].map((m) => m[1]);
const all = tables184.join('\n');

// 本席手写真值：动作名 → [组数×次数, 重量, 期望副行, 期望所属日级标题里的节奏]
const TRUTH = [
  ['悍马机卧推', '3组×10／8次', '35／40kg', '胸整体 · 主要', '20-30 RPM(2-2.5秒/次)'],
  ['哑铃飞鸟', '—', '—', '孤立', null],
  ['深蹲', '1组×5次', '60kg', '股四头 · 主要', '18-25 RPM(2.5-3秒/次)'],
  ['硬拉', '1组×5次', '60kg', '背阔 · 主要', null],
  ['宽距高位下拉', '5组×5次', '42.5kg', '背 主 · 孤立', '15-20 RPM(3-4秒/次)'],
];
let bad = 0;
for (const [name, sets, weight, sub, tempo] of TRUTH) {
  const row = new RegExp('<strong>' + name + '</strong>(<p class="ilife-block-caliber">([^<]*)</p>)?</td>'
    + '<td[^>]*>([^<]*)</td><td[^>]*>([^<]*)</td><td[^>]*>([^<]*)</td>').exec(all);
  if (row === null) { bad += 1; console.log('FAIL 行未找到 ' + name); continue; }
  const got = [row[2] ?? '', row[3], row[4], row[5]];
  // 抓取序：副行、部位、组数×次数、重量 —— 与真值比 (副行, 组数×次数, 重量)
  const ok = got[0] === sub && got[2] === sets && got[3] === weight;
  if (!ok) bad += 1;
  console.log((ok ? 'PASS ' : 'FAIL') + ' 值 ' + name + ' 实测=' + JSON.stringify({ 副行: got[0], 部位: got[1], 组数次数: got[2], 重量: got[3] })
    + ' 真值=' + JSON.stringify({ 副行: sub, 组数次数: sets, 重量: weight }));
  if (tempo !== null) {
    const ok2 = html184.includes('· 节奏 ' + tempo);
    if (!ok2) bad += 1;
    console.log((ok2 ? 'PASS ' : 'FAIL') + ' 节奏 ' + name + ' 期望标题含「 · 节奏 ' + tempo + '」');
  }
}
// 删减记号不许在任何产物正文里
let dropped = 0;
for (const f of readdirSync(V4).filter((x) => x.endsWith('.html'))) {
  const b = readFileSync(join(V4, f), 'utf8').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const hits = ['reps×', 'W1 ', 'W2 ', 'W3 ', 'W4 '].filter((t) => b.includes(t));
  if (hits.length > 0) { dropped += 1; console.log('FAIL 删减记号入正文 ' + f + ' ＝ ' + hits.join('／')); }
}
console.log('删减记号入正文的份数=' + dropped + '/37');
bad += dropped;
// 副行只有类型那一项时必须是「孤立／主要」两字（空备注／短横线备注的分支）
const bareSub = [...all.matchAll(/<p class="ilife-block-caliber">(孤立|主要)<\/p>/g)].length;
console.log('副行只留类型（无细化词）的格数=' + bareSub + '（夹具里「哑铃飞鸟 note=—」与「第2周腿 深蹲 note=空」两处应命中）');
if (bareSub < 2) { bad += 1; console.log('FAIL 空／短横线备注分支未覆盖到两处'); }
console.log(bad === 0 ? 'PROBE_VALUES: GREEN' : 'PROBE_VALUES: RED(' + bad + ')');
console.log('RESULT: ' + (bad === 0 ? '1/1' : '0/1'));
