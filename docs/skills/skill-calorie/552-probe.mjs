/** #552 去文探针：标题无日期 / 副题消失 / 口径来源消失（三判据机器读）。
 * 用法：node docs/skills/skill-calorie/552-probe.mjs [--out <html>]
 * 读数打 T552 TITLE / SUBTITLE / CALIBER / SOURCE（证据件 §四逐行对）。
 */
import { writeFileSync } from 'node:fs';
import { buildExerciseDoc } from '../../../packages/skill-calorie/dist/render/sportDocs.js';

function view() {
  return {
    start: '2026-09-09', end: '2026-09-15', activeDays: 3, totalBurnedSeries: 1200, avgBurnedPerLoggedDay: 400,
    series: [
      { date: '2026-09-11', exerciseKcal: 500 },
      { date: '2026-09-12', exerciseKcal: null },
      { date: '2026-09-15', exerciseKcal: 700 },
    ],
    review: {
      start: '2026-09-09', end: '2026-09-15', days: 7, sessions: 2, activeDays: 2,
      totalBurned: 1200, totalMinutes: 40, avgBurnedPerSession: 600, avgBurnedPerDay: 171.4,
      byCategory: { 有氧: { sessions: 2, burned: 1200 } },
      byType: [{ type: '慢跑', sessions: 2, burned: 1200, minutes: 40 }],
      estimatedCheck: { reported: 1200, estimated: 1200, deviationPct: 0 },
    },
  };
}

const html = buildExerciseDoc(view());
const h1 = (/<h1 class="ilife-block-page-shell-title">([^<]*)<\/h1>/.exec(html) ?? [])[1] ?? '';
const hasDate = /\d{4}-\d{2}-\d{2}/.test(h1) ? 1 : 0;
const hasSub = /<p class="(ilife-block-page-shell-subtitle|sub)"/.test(html) ? 1 : 0;
const nCaliber = (html.match(/<p class="ilife-block-caliber">/g) ?? []).length;
const hasSource = html.includes('数据来源') ? 1 : 0;
const hasWindow = html.includes('sui-window') ? 1 : 0;
console.log('T552 TITLE h1=' + h1 + ' hasDate=' + hasDate);
console.log('T552 SUBTITLE hasSub=' + hasSub);
console.log('T552 CALIBER n=' + nCaliber);
console.log('T552 SOURCE hasSource=' + hasSource);
console.log('T552 WINDOW hasWindow=' + hasWindow);
const outIdx = process.argv.indexOf('--out');
if (outIdx !== -1 && process.argv[outIdx + 1]) {
  writeFileSync(process.argv[outIdx + 1], html, 'utf8');
  console.log('T552 OUT bytes=' + html.length);
}
let bad = 0;
if (h1 !== '运动汇总') { console.log('T552 FAIL h1!=运动汇总'); bad += 1; }
if (hasDate !== 0) { console.log('T552 FAIL 标题带日期'); bad += 1; }
if (hasSub !== 0) { console.log('T552 FAIL 副题仍在'); bad += 1; }
if (nCaliber !== 0) { console.log('T552 FAIL 口径仍在'); bad += 1; }
if (hasSource !== 0) { console.log('T552 FAIL 来源仍在'); bad += 1; }
if (hasWindow !== 1) { console.log('T552 FAIL 窗口条缺席'); bad += 1; }
process.exit(bad === 0 ? 0 : 1);
