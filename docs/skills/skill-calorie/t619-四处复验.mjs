#!/usr/bin/env node
/** #619 · 场景02验收缺陷**四处复验**探针（随 `docs/skills/skill-calorie/t619-复验.md` 入仓的可复跑件）。
 *
 * 为什么要有这一件：本票是负责人验收缺陷的复验票，判据是**当刻墙里的产物原文**，不是源码读法。
 * 本件对四处逐条读「改前」与「改后」两份真产物，打 `FIX-VERIFY 1/4 … 4/4 PASS/FAIL`。
 *
 * 四处（票面原文）与判据：
 *   ① 看营养分析     —— H1 内不含 `20\d\d-\d\d-\d\d`，且正文首件窗口条（`dui-window`）里有日期区间；
 *   ② 看每日六因素   —— 同上（单日窗退化成一枚日期块）；
 *   ③ 拍营养表记一餐 —— 两页（记一餐／补记一餐）**可见文本**里 `&lt;span`／裸 `<span`／`precheck-tag`
 *                        一律为 0（`renderDataTable` 单元格里的 HTML 字面量），且那一列仍是「识别得到」读者话；
 *   ④ 看本周饮食     —— 条目列表族窗口页可见文本里**无裸 `up`／`down`／`flat`**（按词界判），
 *                        且 KPI 区「趋势」卡的值是中文判语（上升／下降／持平）；顺带扫同族全部 8 张窗口页。
 *
 * 跑法（在仓库根跑）：
 *   node docs/skills/skill-calorie/t619-四处复验.mjs [--before <改前墙目录>] [--shots <截图目录>]
 * 缺省：`--before .scratch/t619/before`、`--shots .scratch/t619/shots`。
 * 只读工作区：不写任何文件，不跑 CLI（产物由 `scene02-验收墙/restage.mjs` 重出）。
 * 退出码：4/4 绿 0；任一条红 1。机器读数行 `FIX-VERIFY n/4 …`＋末行 `RESULT: n/4 PASS/FAIL`。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const WALL = join(ROOT, 'docs', 'skills', 'skill-calorie', 'scene02-验收墙');
const argOf = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? resolve(process.argv[i + 1]) : join(ROOT, dflt);
};
const BEFORE = argOf('--before', join('.scratch', 't619', 'before'));
const SHOTS = argOf('--shots', join('.scratch', 't619', 'shots'));

const { visibleText, stripCopyPayload } = await import(
  pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'test', 'visible-text-probe.mjs')).href);

const read = (dir, file) => readFileSync(join(dir, file), 'utf8');
const flat = (s) => String(s).replace(/\s+/g, ' ').trim();
/** 可见文本（剔除 head/style/script/注释与全部标签、属性；实体解码）。 */
const textOf = (html) => visibleText(stripCopyPayload(html));
const nodeOf = (html, re) => {
  const m = re.exec(html);
  return m === null ? null : flat(textOf(m[0]));
};
const h1Of = (html) => nodeOf(html, /<h1[^>]*>[\s\S]*?<\/h1>/);
const windowStripOf = (html) => nodeOf(html, /<div class="dui-window">[\s\S]*?<\/div>/);
/** KPI 卡「趋势」那一格的值槽（`renderKpiCard` 的骨架；找不到返 null）。 */
const kpiTrendOf = (html) => {
  const m = /<div class="ilife-block-kpi-card-label">趋势<\/div>\s*<div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">([\s\S]*?)<\/span>/.exec(html);
  return m === null ? null : flat(textOf(m[1]));
};
/** 「这一格怎么来的」那一列的逐格可读值（`data-label` 是公共层数据表手机端的键名）。 */
const tagCellsOf = (html) => [...html.matchAll(/<td[^>]*data-label="这一格怎么来的"[^>]*>([\s\S]*?)<\/td>/g)]
  .map((m) => flat(textOf(m[1])));
const DATE = /20\d\d-\d\d-\d\d/;
const BARE_TREND = /\b(?:up|down|flat)\b/gi;

/** 四处各自的「当刻产物」与「改前产物」两份文件。 */
const ITEMS = [
  { n: 1, name: '看营养分析', files: ['看营养分析.html'] },
  { n: 2, name: '看每日六因素', files: ['看每日六因素.html'] },
  { n: 3, name: '拍营养表记一餐', files: ['拍营养表记一餐.html', '拍营养表补记一餐.html'] },
  { n: 4, name: '看本周饮食', files: ['看本周饮食.html', '看上周饮食.html'] },
];

/** 三档截图路径（1440／834／390）；改前只拍 1440 档作对照。 */
const shotPaths = (i) => {
  const base = 'F' + i.n + '-' + i.name;
  return {
    before: [join(SHOTS, 'before-' + base + '-1440.png')],
    after: [1440, 834, 390].map((w) => join(SHOTS, base + '-' + w + '.png')),
  };
};
const shotState = (paths) => paths.filter(existsSync).length + '/' + paths.length;

/** 条目列表族窗口页（#618 改的是这一族共用的一张卡）。 */
const WINDOW_PAGES = ['看昨日饮食.html', '看本周饮食.html', '看上周饮食.html', '看本月饮食.html',
  '看上月饮食.html', '看最近 7 天饮食.html', '看最近 30 天饮食.html', '看某段时间饮食.html'];

let green = 0;
const problems = [];

/* ── ①／② 标题去日期＋日期进正文首件 ── */
for (const i of ITEMS.slice(0, 2)) {
  const file = i.files[0];
  const now = read(WALL, file);
  const h1 = h1Of(now);
  const win = windowStripOf(now);
  const issues = [];
  if (h1 === null) issues.push('读不到 H1');
  else if (DATE.test(h1)) issues.push('H1 仍含日期：' + h1);
  if (win === null) issues.push('正文里找不到窗口条 dui-window');
  else if (!DATE.test(win)) issues.push('窗口条里没有日期：' + win);
  const ok = issues.length === 0;
  if (ok) green += 1; else problems.push('FIX-VERIFY ' + i.n + '/4 ' + i.name + '：' + issues.join('｜'));
  const beforeH1 = existsSync(join(BEFORE, file)) ? h1Of(read(BEFORE, file)) : null;
  console.log('FIX-VERIFY ' + i.n + '/4 ' + (ok ? 'PASS' : 'FAIL') + ' ' + i.name
    + '：H1「' + h1 + '」（无日期 ' + (h1 !== null && !DATE.test(h1)) + '）'
    + '｜正文首件窗口条「' + win + '」｜三档截图 ' + shotState(shotPaths(i).after));
  console.log('BEFORE ' + i.n + '/4 ' + i.name + '：改前 H1「' + beforeH1 + '」（含日期 '
    + (beforeH1 !== null && DATE.test(beforeH1)) + '）｜改前 1440 截图 ' + shotState(shotPaths(i).before));
}

/* ── ③ 预检确认页表格不再印 HTML 标签字面量 ── */
{
  const i = ITEMS[2];
  const issues = [];
  const readings = [];
  for (const file of i.files) {
    const now = read(WALL, file);
    const text = textOf(now);
    const escaped = (text.match(/&lt;|<span/g) ?? []).length;
    const cls = (text.match(/precheck-tag/g) ?? []).length;
    const cells = tagCellsOf(now);
    const badge = (now.match(/<span class="ilife-status-badge/g) ?? []).length;
    if (escaped > 0) issues.push(file + ' 可见文本里出现标签字面量 ' + escaped + ' 处');
    if (cls > 0) issues.push(file + ' 可见文本里出现 precheck-tag ' + cls + ' 处');
    if (cells.length === 0) issues.push(file + ' 读不到「这一格怎么来的」那一列');
    if (badge === 0) issues.push(file + ' 那一列没有徽章结构');
    readings.push(file + '：那列 ' + cells.length + ' 格＝「' + [...new Set(cells)].join('」「') + '」，可见 &lt;span／precheck-tag＝0，徽章 ' + badge + ' 枚');
  }
  const ok = issues.length === 0;
  if (ok) green += 1; else problems.push('FIX-VERIFY 3/4 ' + i.name + '：' + issues.join('｜'));
  const beforeFile = i.files[0];
  const beforeText = existsSync(join(BEFORE, beforeFile)) ? textOf(read(BEFORE, beforeFile)) : '';
  const beforeEsc = (beforeText.match(/&lt;|<span/g) ?? []).length;
  console.log('FIX-VERIFY 3/4 ' + (ok ? 'PASS' : 'FAIL') + ' ' + i.name + '：' + readings.join('｜')
    + '｜三档截图 ' + shotState(shotPaths(i).after));
  console.log('BEFORE 3/4 ' + i.name + '：改前可见文本里标签字面量 ' + beforeEsc + ' 处（原文片段「'
    + flat((/<span class="precheck-tag[^<]*<\/span>/.exec(beforeText.replace(/\s+/g, ' ')) ?? [''])[0]).slice(0, 60)
    + '」）｜改前 1440 截图 ' + shotState(shotPaths(i).before));
}

/* ── ④ 条目列表族趋势卡不印英文 ── */
{
  const i = ITEMS[3];
  const issues = [];
  const readings = [];
  for (const file of WINDOW_PAGES) {
    const now = read(WALL, file);
    const text = textOf(now);
    const bare = [...new Set((text.match(BARE_TREND) ?? []))];
    const card = kpiTrendOf(now);
    const zh = card !== null && /上升|下降|持平/.test(card);
    if (bare.length > 0) issues.push(file + ' 出现裸英文 ' + bare.join('、'));
    if (card === null) issues.push(file + ' 读不到「趋势」卡的值槽');
    else if (!zh) issues.push(file + '「趋势」卡不是中文判语：' + card);
    readings.push(file.replace('.html', '') + '=' + JSON.stringify(card));
  }
  const ok = issues.length === 0;
  if (ok) green += 1; else problems.push('FIX-VERIFY 4/4 ' + i.name + '：' + issues.join('｜'));
  const beforeFile = i.files[0];
  const beforeText = existsSync(join(BEFORE, beforeFile)) ? textOf(read(BEFORE, beforeFile)) : '';
  const beforeBare = [...new Set((beforeText.match(BARE_TREND) ?? []))];
  console.log('FIX-VERIFY 4/4 ' + (ok ? 'PASS' : 'FAIL') + ' ' + i.name + ' 同族 8 张窗口页：'
    + readings.join('｜') + '｜裸英文 0｜三档截图 ' + shotState(shotPaths(i).after)
    + '＋看上周饮食三档 ' + shotState(shotPaths({ n: 4, name: '看上周饮食' }).after));
  console.log('BEFORE 4/4 ' + i.name + '：改前「趋势」卡的值槽＝' + JSON.stringify(kpiTrendOf(read(BEFORE, beforeFile)))
    + '，可见文本里裸英文 ' + beforeBare.length + ' 处 ' + JSON.stringify(beforeBare)
    + '｜改前 1440 截图 ' + shotState(shotPaths(i).before));
}

for (const p of problems) console.log(p);
console.log('RESULT: ' + green + '/4 ' + (green === 4 ? 'PASS' : 'FAIL'));
process.exit(green === 4 ? 0 : 1);
