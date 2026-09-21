#!/usr/bin/env node
/** #782 样板：三张成品页（**按人裁过的页型配方**出整页，种子库真跑落盘）。
 *
 *  票面验收命令之一：`node tooling/run-locked.mjs --ticket 782 -- node docs/skills/skill-schedule/t782-样板.mjs`
 *  绿＝exit 0 且读数如实：三张页各自「是整页（doctype／viewport／页面级配方根类／图表助手）」、
 *  「必现块一块不少」、「零外部引用」；产物落 `.scratch/t782/成品/`，落盘走本包**唯一落盘点**
 *  `deliverHtml`（#843 的交付面）。
 *
 *  数据：隔离种子库 `.scratch/t844/home/.ilife/data/schedule_data.db`（锚点 2026-09-21）——
 *  走本包自己的 db 层（`fetch/db.js`）读，不另写 SQL 口径。
 *  锚点：单日＝2026-09-21；周视图＝种子库里最后一个「七天都有记录」的整周（2026-09-14 ~ 09-20）。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = resolve(HERE, '..', '..', '..');
const DIST = join(ROOT, 'packages', 'skill-schedule', 'dist');
const DB = join(ROOT, '.scratch', 't844', 'home', '.ilife', 'data', 'schedule_data.db');
const OUT = join(ROOT, '.scratch', 't782', '成品');
const DAY = '2026-09-21';
const WEEK_END = '2026-09-20';

function die(code, message) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + message);
  process.exit(code);
}
if (!existsSync(join(DIST, 'query', 'queryDocs.js'))) die(2, '缺 dist（先 tsc -b packages/skill-schedule --force）：' + DIST);
if (!existsSync(DB)) die(2, '缺种子库：' + DB);

const imp = (p) => import(pathToFileURL(p).href);
const { openScheduleDb, closeScheduleDb, listRecordsByDate, listRecordsRange, listPlanEvents } = await imp(join(DIST, 'fetch', 'db.js'));
const { renderTodaySummaryPage, renderWeekViewPage } = await imp(join(DIST, 'query', 'queryDocs.js'));
const { renderPlanDayPage } = await imp(join(DIST, 'plan', 'planDocs.js'));
const { deliverHtml } = await imp(join(DIST, 'delivery', 'output.js'));

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查（本脚本首轮就这么漏过一次）。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

/** 整页判据（逐条都得成立，缺一条即该页红）。 */
const PAGE_RULES = [
  ['整页·doctype', (h) => h.startsWith('<!doctype html>')],
  ['整页·收尾', (h) => h.trimEnd().endsWith('</html>')],
  ['整页·viewport', (h) => h.includes('<meta name="viewport"')],
  ['整页·页面级配方根类', (h) => h.includes('ilife-page-ui')],
  ['整页·图表助手', (h) => h.includes('ilife-charts')],
  ['零外部引用', (h) => !/https?:\/\//.test(h) && !h.includes('<link') && !h.includes('@import')],
];

/** 三张页各要有的必现块（老侧 f01／f10／f08 的信息层级，落点见证据件第六节冻结配方）。 */
const PAGES = [
  {
    file: '今天总结.html',
    need: ['ilife-block-conclusion', 'ilife-block-chart-block', 'ilife-block-fact-strip', 'ilife-block-timeline',
      'ilife-block-disclosure', 'ilife-block-dist-row', 'ilife-block-copy-block'],
    text: ['今天总结', '24 小时时间轴', '分类进度（一级分类分布）', '夜间睡眠'],
  },
  {
    file: '查日程.html',
    need: ['ilife-block-kpi-card-grid', 'ilife-block-conclusion', 'ilife-block-chart-block', 'ilife-block-list-rows',
      'ilife-block-disclosure', 'ilife-block-param-form', 'ilife-block-copy-block'],
    text: ['查日程', '24 小时覆盖', '空档'],
  },
  {
    file: '周视图.html',
    need: ['ilife-block-kpi-card-grid', 'heat-cells', 'heat-cell', 'heat-legend', 'ilife-block-dist-row',
      'ilife-block-list-rows', 'ilife-block-copy-block'],
    text: ['周视图', '7×24 全分类热力图'],
  },
];

const mondayOf = (iso) => {
  const t = new Date(iso + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t;
};
const isoOf = (t) => t.toISOString().slice(0, 10);

const monday = mondayOf(WEEK_END);
const days = Array.from({ length: 7 }, (_, i) => {
  const t = new Date(monday.getTime());
  t.setUTCDate(t.getUTCDate() + i);
  return isoOf(t);
});

const handle = openScheduleDb(DB);
let pages;
try {
  const dayRecords = listRecordsByDate(handle, DAY);
  const dayEvents = listPlanEvents(handle, DAY);
  const weekRecords = listRecordsRange(handle, days[0], days[6]);
  pages = [
    { ...PAGES[0], html: renderTodaySummaryPage(dayRecords, DAY), note: DAY + ' · ' + dayRecords.length + ' 块记录' },
    { ...PAGES[1], html: renderPlanDayPage(dayEvents, DAY), note: DAY + ' · ' + dayEvents.length + ' 件事件' },
    { ...PAGES[2], html: renderWeekViewPage(weekRecords, days), note: days[0] + ' ~ ' + days[6] + ' · ' + weekRecords.length + ' 块记录' },
  ];
} finally {
  closeScheduleDb(handle);
}

mkdirSync(OUT, { recursive: true });
let failed = 0;
const rows = [];
for (const page of pages) {
  const red = [];
  const body = markupOf(page.html);
  for (const [name, rule] of PAGE_RULES) if (!rule(page.html)) red.push(name);
  for (const cls of page.need) if (!body.includes(cls)) red.push('缺件:' + cls);
  for (const text of page.text) if (!body.includes(text)) red.push('缺文案:' + text);
  const bytes = Buffer.byteLength(page.html, 'utf8');
  const sha = createHash('sha256').update(page.html).digest('hex').slice(0, 16);
  const delivery = deliverHtml({ explicit: join(OUT, page.file), html: page.html });
  rows.push({ file: page.file, bytes, sha, note: page.note, path: delivery.path, red });
  if (red.length > 0) failed += 1;
  console.log((red.length === 0 ? 'PAGE-OK  ' : 'PAGE-RED ') + page.file.padEnd(12)
    + ' bytes=' + String(bytes).padStart(7) + ' sha256=' + sha + ' 数据=' + page.note
    + (red.length === 0 ? '' : ' 红条=' + red.join('｜')));
  console.log('         → ' + delivery.path + '（' + delivery.bytes + ' B，交付面回执）');
}
console.log('RESULT: ' + (failed === 0 ? 'OK' : 'FAIL') + ' pages=' + pages.length + ' red=' + failed + ' 产物目录=' + OUT);
process.exit(failed === 0 ? 0 : 1);
