/** #454 独立对抗审查席 · 自设探针（与判据件不同人、不同断言：本席自写全部断言，**不 import 判据件**）。
 *
 * 只读被审交付的编译产物（`dist/`）与冻结表原文；自种子、自复算、自解析。
 * 覆盖票面四条主张：
 *   ① 6 条词与冻结表**逐条**对账（枚举全表命中项，不手挑子集）＋逐条真跑真 CLI；
 *   ② 五窗同版：五个复盘窗口的锚点 id 序列／区块类名集合／导航项**逐条**相同，差异只在文本与数据；
 *   ③ 趋势页双刻度（消耗实线＋时长虚线）与**断点不断 0**（缺日不画点、不当 0）；
 *   ④ 长窗截断口径：页眉报的天数＝表里可见行数＝上限 100。
 * 另查：锚点全落点／`ilife-page-printable` 落版面根／来源脚注／三格式顺序／空态带下一句话／三类工程话命中 0。
 *
 * 用法（`--dist` 指一份编译产物目录；隔离镜像里给镜像的 `dist`）：
 *   node docs/skills/skill-calorie/t454-review-probe.mjs
 *   node docs/skills/skill-calorie/t454-review-probe.mjs --dist .scratch/t454-review/mirror/packages/skill-calorie/dist \
 *        --out .scratch/t454-review/probe-out
 * 退出码：0＝全绿；1＝有断言红（逐条打印）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 本件的落点是 `docs/skills/skill-calorie/`，仓根在三级之上。 */
const REPO = resolve(HERE, '..', '..', '..');
const PKG = join(REPO, 'packages', 'skill-calorie');

function argvOf(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 || i + 1 >= process.argv.length ? dflt : process.argv[i + 1];
}
const DIST = resolve(REPO, argvOf('dist', join(PKG, 'dist')));
const OUT = resolve(REPO, argvOf('out', join(REPO, '.scratch', 't454-review', 'probe-out')));
const CLI = join(DIST, 'cli', 'cmd_read.js');
const TODAY = argvOf('today', '2026-06-17');

mkdirSync(OUT, { recursive: true });

/* ── 本席自定的种子（与他席判据件不同：日期、动作、断点日都另选） ── */
const SEED = [
  { type: '跳绳', calories: 200, minutes: 20, category: '有氧', date: '2026-06-17' },
  { type: '深蹲', calories: 180, minutes: 25, category: '力量', date: '2026-06-17' },
  { type: '骑行', calories: 400, minutes: 60, category: '有氧', date: '2026-06-14' },
  { type: '瑜伽', calories: 120, minutes: 40, category: '日常', date: '2026-06-02' },
  { type: '滑雪', calories: 500, minutes: 90, category: '有氧', date: '2026-02-20' },
];
/** 窗内故意空着的一天（自查「缺日不算 0」）：30 天窗 05-19..06-17 里挑 06-05。 */
const GAP = '2026-06-05';
const ACTIVE_30D = 3;
const LONG = { start: '2026-02-18', end: '2026-06-17' };
const EMPTY = { start: '2026-04-06', end: '2026-04-08' };
const CAP = 100;

/* ── 读数收集（红不早停：逐条打完再结算） ── */
const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail === undefined ? '' : String(detail) });
  } catch (e) {
    results.push({ name, ok: false, detail: String(e && e.message ? e.message : e).split('\n')[0] });
  }
}
const nd = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const dow = new Date(TODAY + 'T00:00:00Z').getUTCDay();
const WINDOW_START = {
  本周: nd(TODAY, -((dow + 6) % 7)),
  本月: TODAY.slice(0, 8) + '01',
  '90d': nd(TODAY, -89),
  今年: TODAY.slice(0, 4) + '-01-01',
  custom: LONG.start,
};
const WINDOW_END = { 本周: TODAY, 本月: TODAY, '90d': TODAY, 今年: TODAY, custom: LONG.end };

/* ── 解析小工具（本席自写） ── */
const secOf = (html, id) => (new RegExp('<section id="' + id + '">([\\s\\S]*?)</section>').exec(html) ?? [])[1] ?? '';
const secIds = (html) => [...html.matchAll(/<section id="([^"]+)">/g)].map((m) => m[1]);
const hrefsOf = (html) => [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const classesOf = (html) => [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
const blockClassesOf = (html) => [...new Set(classesOf(html).filter((c) => c.startsWith('ilife-block')))].sort();
const hasClass = (html, c) => [...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(c));
const rowsOf = (sec) => {
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(sec);
  return body === null ? [] : [...body[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
};
const cellsOf = (row) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
  .map((m) => m[1].replace(/<[^>]+>/g, '').trim());
const text = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const dotsOf = (html) => [...html.matchAll(/class="ilife-charts-dot[^"]*" data-s="0"/g)].length;
/** 某条序列画出来的数据点下标（`data-i`）——用来逐点反查「这个点落在哪天」。 */
const dotIdx = (sec, s) => [...sec.matchAll(new RegExp('class="ilife-charts-dot[^"]*" data-s="' + s + '" data-i="(\\d+)"', 'g'))]
  .map((m) => Number(m[1]));
/** 三类工程话（命令键／票号／工序词）全文命中数。 */
const jargonHits = (html) => ({
  key: (html.match(/calorie\.view\./g) ?? []).length,
  ticket: (html.match(/\bt454\b/gi) ?? []).length + (html.match(/#454/g) ?? []).length,
  port: (html.match(/移植/g) ?? []).length,
});

/* ── 冻结表逐条枚举（全表命中项，不手挑） ── */
const SCENE = readFileSync(join(PKG, 'src', 'triggers', 'scene-04-exercise.ts'), 'utf8');
const HIT_KEYS = ['calorie.view.exercise-trend', 'calorie.view.exercise-recap'];
const tableEntries = SCENE.split('\n').map((line) => {
  const w = /"wake_word": "([^"]*)"/.exec(line);
  const c = /"cli": "((?:[^"\\]|\\.)*)"/.exec(line);
  if (w === null || c === null) return null;
  const cli = c[1].replace(/\\"/g, '"');
  const key = HIT_KEYS.find((k) => cli.includes(k));
  return key === undefined ? null : { word: w[1], key, cli };
}).filter((x) => x !== null);
const EXPECTED_WORDS = ['看运动趋势', '运动复盘（本周）', '运动复盘（本月）', '运动复盘（最近 90 天）', '运动复盘（今年）', '运动复盘（自定义时间）'];

function paramsOf(cli, fill = {}) {
  const m = /^calorie-cmd-read (\S+) --params '(.*)'$/.exec(cli);
  assert.ok(m !== null, 'cli 形状不对：' + cli);
  let raw = m[2];
  for (const [k, v] of Object.entries(fill)) raw = raw.split(k).join(v);
  return { key: m[1], params: JSON.parse(raw) };
}

/* ── 真 CLI 跑一词 ── */
const DB_DIR = mkdtempSync(join(tmpdir(), 't454probe-'));
function run(key, params, name) {
  const out = join(OUT, name + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB_DIR, CALORIE_TODAY: TODAY },
  });
  const file = existsSync(out) ? readFileSync(out, 'utf8') : null;
  return { status: r.status, stderr: String(r.stderr || '').trim(), file, out, bytes: file === null ? 0 : statSync(out).size };
}
for (const row of SEED) {
  const r = run('calorie.exercise.add', row, 'seed-' + row.date + '-' + row.type);
  assert.equal(r.status, 0, '种子没写进去：' + row.type + ' ' + r.stderr.slice(-160));
}

/* ───────────────────────── ① 6 条词逐条对账 ───────────────────────── */

await check('冻结表命中趋势／复盘两键的条目恰 6 条且逐字对上票面 6 条词', () => {
  assert.equal(tableEntries.length, 6, '命中 ' + tableEntries.length + ' 条：' + tableEntries.map((x) => x.word).join('／'));
  assert.deepEqual(tableEntries.map((x) => x.word), EXPECTED_WORDS, '词表对不上：' + tableEntries.map((x) => x.word).join('／'));
  return tableEntries.map((x) => x.word + '→' + x.key).join(' | ');
});

const RUNS = [];
for (const entry of tableEntries) {
  const isTrend = entry.key.endsWith('exercise-trend');
  const fill = entry.word.includes('自定义') ? { '<开始日期>': LONG.start, '<结束日期>': LONG.end } : {};
  const { key, params } = paramsOf(entry.cli, fill);
  const name = (isTrend ? 'trend-' : 'recap-') + entry.word.replace(/[（）]/g, '');
  const r = run(key, params, name);
  RUNS.push({ word: entry.word, isTrend, key, params, ...r });
}

await check('6 条词逐条真跑：exit 0 ＋ 产物落盘（逐条打印字节）', () => {
  for (const r of RUNS) {
    assert.equal(r.status, 0, r.word + ' exit=' + r.status + ' stderr=' + r.stderr.slice(-160));
    assert.ok(r.file !== null, r.word + ' 产物没落盘');
  }
  return RUNS.map((r) => r.word + '=' + r.bytes + 'B').join(' | ');
});

for (const r of RUNS) {
  await check('【' + r.word + '】版面契约：doctype／charset／样式段／脚本段／可打印／三格式／来源脚注／口径行／工程话 0', () => {
    const h = r.file;
    assert.ok(/^<!DOCTYPE html>/i.test(h), '缺 doctype');
    assert.ok(h.includes('charset="utf-8"') || h.includes('charset=utf-8'), '缺 charset');
    assert.ok(h.includes('<style'), '缺样式段');
    assert.ok(h.includes('<script'), '缺脚本段');
    assert.ok(/<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">/.test(h), 'ilife-page-printable 没落版面根');
    assert.ok(h.includes('page: printable') && h.includes('@page printable'), '缺具名页 printable');
    assert.deepEqual([...h.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'], '三格式不是 text,json,csv');
    assert.ok(h.includes('数据来源 · '), '缺来源脚注');
    assert.ok((h.match(/class="ilife-block-caliber"/g) ?? []).length >= 2, '口径行不足两条');
    const j = jargonHits(h);
    assert.deepEqual(j, { key: 0, ticket: 0, port: 0 }, '工程话命中：' + JSON.stringify(j));
    const ids = idsOf(h);
    const hrefs = hrefsOf(h);
    assert.ok(hrefs.length >= 4, '页内导航只有 ' + hrefs.length + ' 个锚点');
    for (const x of hrefs) assert.ok(ids.has(x), '锚点 ' + x + ' 没有落点');
    const eyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(h) ?? [])[1] ?? '';
    assert.equal(eyebrow, r.isTrend ? '运动 · 趋势' : '运动 · 复盘', '眉标不是人话原字：' + eyebrow);
    return '锚点 ' + hrefs.length + ' 个全落点／口径行 ' + (h.match(/class="ilife-block-caliber"/g) ?? []).length + ' 条';
  });
}

/* ───────────────────── ③ 趋势页：双刻度 ＋ 断点不断 0 ───────────────────── */

const trend30 = RUNS.find((r) => r.word === '看运动趋势');
const trendLong = run('calorie.view.exercise-trend', { window: 'custom', ...LONG }, 'trend-长窗');

await check('趋势页：消耗实线＋时长虚线两套刻度（各一条序列）', () => {
  const line = secOf(trend30.file, 'sec-line');
  assert.ok(line.includes('data-chart-kind="line"'), '缺折线容器');
  const paths = [...line.matchAll(/<path class="ilife-charts-line[^"]*"[^>]*>/g)].map((m) => m[0]);
  assert.equal(paths.length, 2, '序列条数不是 2：' + paths.length);
  assert.equal(paths.filter((p) => p.includes('stroke-dasharray="6 5"')).length, 1, '虚线那条没有虚线属性');
  assert.equal(paths.filter((p) => !p.includes('stroke-dasharray')).length, 1, '实线那条混进了虚线属性');
  assert.ok(line.includes('data-s="1"'), '缺副刻度序列的点');
  assert.ok(secOf(trend30.file, 'sec-weekly').includes('data-chart-kind="bar"'), '缺每周频次柱图');
  return '2 条序列（实线 1＋虚线 1）＋柱图 1';
});

await check('趋势页断点口径：缺日不画点、不当 0（点数＝有记录的天数 ≠ 窗内天数）', () => {
  const line = secOf(trend30.file, 'sec-line');
  const daily = secOf(trend30.file, 'sec-daily');
  const rows = rowsOf(daily);
  assert.equal(rows.length, 30, '逐日表 30 天窗里不是 30 行：' + rows.length);
  const gapRow = rows.find((x) => x.includes(GAP));
  assert.ok(gapRow !== undefined, '逐日表里找不到缺日 ' + GAP);
  assert.deepEqual(cellsOf(gapRow).slice(1), ['—', '—', '—'], '缺日那行不是三格全「—」：' + JSON.stringify(cellsOf(gapRow)));
  const withData = rows.filter((x) => cellsOf(x).slice(1).some((c) => c !== '—')).length;
  const dots = dotsOf(line);
  assert.equal(dots, ACTIVE_30D, '主序列点数 ' + dots + ' ≠ 有记录的天数 ' + ACTIVE_30D);
  assert.equal(withData, ACTIVE_30D, '表里有数据的行数 ' + withData + ' ≠ 折线点数 ' + dots);
  assert.notEqual(dots, 30, '缺日被当成 0 画满了一点数＝窗内天数');
  // 逐点反查：每个画出来的点，其下标换算成的那个日期，必须在种子里有记录（缺日画点即红）。
  const start30 = nd(TODAY, -29);
  const seeded = new Set(SEED.map((s) => s.date));
  for (const i of dotIdx(line, 0)) {
    const d = nd(start30, i);
    assert.ok(seeded.has(d), '主序列在第 ' + i + ' 点（' + d + '）画了点，但那天没有记录（＝把缺日当 0）');
  }
  return '缺日 ' + GAP + ' 三格全「—」；点数 ' + dots + '＝有记录的天数（窗内 30 天）；逐点下标反查全部落在有记录的日期上';
});

await check('趋势页逐日表：窗口每一天一行（首行＝窗首、末行＝窗尾、逐日连续）', () => {
  const dates = rowsOf(secOf(trend30.file, 'sec-daily')).map((r) => cellsOf(r)[0]);
  assert.equal(dates.length, 30, '行数不是 30：' + dates.length);
  assert.equal(dates[0], nd(TODAY, -29), '首行不是窗首：' + dates[0]);
  assert.equal(dates[dates.length - 1], TODAY, '末行不是窗尾：' + dates[dates.length - 1]);
  for (let i = 1; i < dates.length; i++) assert.equal(dates[i], nd(dates[i - 1], 1), '日期不连续：' + dates[i - 1] + '→' + dates[i]);
  return dates[0] + '..' + dates[dates.length - 1] + '（连续 ' + dates.length + ' 行）';
});

/* ───────────────────── ④ 长窗截断口径 ───────────────────── */

await check('长窗（120 天）截断口径：页眉条数＝可见行数＝上限 ' + CAP, () => {
  const daily = secOf(trendLong.file, 'sec-daily');
  const rows = rowsOf(daily);
  const cap = /<caption class="ilife-block-data-table-caption">([\s\S]*?)<\/caption>/.exec(daily);
  assert.ok(cap !== null, '逐日表找不到 caption');
  const c = text(cap[1]);
  assert.ok(c.includes('共 120 天'), '页眉没报窗口总天数：' + c);
  assert.ok(c.includes('列出 ' + CAP + ' 天'), '页眉没报列出天数：' + c);
  assert.ok(c.includes('截断') && c.includes('前 ' + CAP + ' 天'), '截断没有明示：' + c);
  assert.equal(rows.length, CAP, '可见行数 ' + rows.length + ' ≠ 上限 ' + CAP);
  assert.equal((daily.match(/<tr>/g) ?? []).length, CAP + 1, '总行数不是「表头 1＋' + CAP + ' 行」');
  return c + '；可见 ' + rows.length + ' 行';
});

await check('长窗（120 天）断点口径：画出的点逐点反查都在有记录的日期上（缺日没被当 0）', () => {
  const line = secOf(trendLong.file, 'sec-line');
  const idx = dotIdx(line, 0);
  const seeded = new Set(SEED.map((s) => s.date));
  assert.ok(idx.length > 0, '长窗主序列一个点都没画');
  for (const i of idx) {
    const d = nd(LONG.start, i);
    assert.ok(seeded.has(d), '长窗主序列在第 ' + i + ' 点（' + d + '）画了点，但那天没有记录（＝把缺日当 0）');
  }
  assert.ok(idx.length < 120, '长窗画满了 120 个点（＝缺日被当成 0）');
  // 点密度：引擎对超 30 点的序列隔 k 个画一个（`base-render` DOT_STRIDE_MAX=30），此处如实报读数，不当事实现状之外的断言。
  return '点数 ' + idx.length + '/120（下标 ' + idx.join(',') + '），逐点反查全落在有记录的日期上';
});

await check('30 天窗不截断那侧也真跑：印「未截断」而不是照抄长窗那句', () => {
  const cap = /<caption class="ilife-block-data-table-caption">([\s\S]*?)<\/caption>/.exec(secOf(trend30.file, 'sec-daily'));
  assert.ok(cap !== null, '30 天窗逐日表没有 caption');
  const c = text(cap[1]);
  assert.ok(c.includes('未截断'), '30 天窗没印「未截断」：' + c);
  assert.ok(!c.includes('已截断'), '30 天窗误印「已截断」：' + c);
  return c;
});

/* ───────────────────── ② 五窗同版（逐条比） ───────────────────── */

const RECAP_WINDOWS = [
  ['本周', { window: '本周' }],
  ['本月', { window: '本月' }],
  ['90d', { window: '90d' }],
  ['今年', { window: '今年' }],
  ['custom', { window: 'custom', start: LONG.start, end: LONG.end }],
];
const recapRuns = RECAP_WINDOWS.map(([label, params]) => ({
  label, ...run('calorie.view.exercise-recap', params, 'sameview-' + label),
}));

await check('五窗同版：锚点 id 序列逐条相同', () => {
  const base = secIds(recapRuns[0].file);
  assert.ok(base.length >= 7, '锚点太少：' + base.join(','));
  for (const r of recapRuns.slice(1)) {
    const got = secIds(r.file);
    assert.equal(got.length, base.length, r.label + ' 锚点数 ' + got.length + ' ≠ ' + base.length);
    for (let i = 0; i < base.length; i++) assert.equal(got[i], base[i], r.label + ' 第 ' + (i + 1) + ' 个锚点 ' + got[i] + ' ≠ ' + base[i]);
  }
  return base.join(',');
});

await check('五窗同版：区块类名集合逐条相同（差异只在文本与数据）', () => {
  const base = blockClassesOf(recapRuns[0].file);
  for (const r of recapRuns.slice(1)) {
    const got = blockClassesOf(r.file);
    assert.equal(got.length, base.length, r.label + ' 区块类名数 ' + got.length + ' ≠ ' + base.length);
    for (let i = 0; i < base.length; i++) assert.equal(got[i], base[i], r.label + ' 第 ' + (i + 1) + ' 个区块类名 ' + got[i] + ' ≠ ' + base[i]);
  }
  return base.length + ' 个区块类名五窗同值';
});

await check('五窗同版：五份 h1 各含本窗自己的起止日（同一版式、不同窗口）', () => {
  const titles = recapRuns.map((r) => (/<h1 class="ilife-block-page-shell-title">([^<]*)<\/h1>/.exec(r.file) ?? [])[1] ?? '');
  assert.equal(new Set(titles).size, 5, '五份 h1 没有各不相同：' + titles.join(' / '));
  for (const r of recapRuns) {
    const wantStart = WINDOW_START[r.label];
    const title = titles[recapRuns.indexOf(r)];
    assert.ok(title.includes(wantStart), r.label + ' 的 h1 没含本窗起始日 ' + wantStart + '：' + title);
    assert.ok(title.includes(WINDOW_END[r.label]), r.label + ' 的 h1 没含本窗结束日 ' + WINDOW_END[r.label] + '：' + title);
    assert.ok(!/calorie\.|\bt\d{3}\b/i.test(title), r.label + ' 的 h1 有工程话：' + title);
  }
  return titles.join(' / ');
});

await check('五窗同版：页面级构件的**条数**也同版（导航项／三格式／可打印只有一套）', () => {
  const shape = recapRuns.map((r) => [
    [...r.file.matchAll(/<a href="#/g)].length,
    [...r.file.matchAll(/data-fmt="([^"]+)"/g)].length,
    [...r.file.matchAll(/class="ilife-block-page-shell[^"]*"/g)].length,
    secIds(r.file).length,
  ].join('/'));
  assert.equal(new Set(shape).size, 1, '五窗的构件条数不同版：' + shape.join(' | '));
  return '导航项/三格式/版面根/锚点数 = ' + shape[0];
});

/* ── 复盘页四件（结论条／分布条／徽章／趋势块）逐窗断言 ── */
for (const r of recapRuns) {
  await check('【运动复盘·' + r.label + '】结论条＋分布条＋高频徽章＋每日消耗趋势', () => {
    assert.equal(r.status, 0, 'exit=' + r.status + ' stderr=' + r.stderr.slice(-160));
    assert.ok(hasClass(secOf(r.file, 'sec-conclusion'), 'ilife-block-feedback-block-note'), '缺一句话结论条');
    assert.ok(text(secOf(r.file, 'sec-conclusion')).includes('共运动'), '结论条里不是本窗那句话');
    assert.ok(hasClass(r.file, 'ilife-block-kpi-card'), '缺核心数字卡');
    assert.ok(hasClass(secOf(r.file, 'sec-category'), 'ilife-block-dist-row'), '缺类型分布条');
    assert.ok(hasClass(secOf(r.file, 'sec-badges'), 'ilife-block-chip'), '缺高频运动徽章');
    assert.ok(secOf(r.file, 'sec-daily').includes('data-chart-kind="line"'), '缺每日消耗趋势块');
    return '四件齐＋核心数字卡';
  });
}

/* ── 色值口径：复盘分布条的颜色＝categoryColor() 的 hex（逐类复算） ── */
await check('复盘分布条颜色逐类＝categoryColor() 的 hex（件内不写第二份色表）', async () => {
  const { categoryColor } = await import(pathToFileURL(join(DIST, 'exercise', 'categoryColors.js')).href);
  const seen = [];
  for (const r of recapRuns) {
    const cat = secOf(r.file, 'sec-category');
    for (const [name, key] of [['有氧', 'cardio'], ['力量', 'strength'], ['日常', 'daily']]) {
      if (!cat.includes('>' + name + '</span>')) continue;
      const hex = categoryColor(key);
      assert.ok(cat.includes('background:' + hex), r.label + ' 的「' + name + '」条色不是 ' + hex);
      seen.push(name + '=' + hex);
    }
  }
  return [...new Set(seen)].join('／') + '（五窗共 ' + seen.length + ' 处命中）';
});

/* ───────────────────── 空态带下一句话 ───────────────────── */

await check('空窗真出口：按缺失阻断退出 4、不落产物（如实记录，不粉饰）', () => {
  const r = run('calorie.view.exercise-trend', { window: 'custom', ...EMPTY }, 'empty-trend');
  assert.equal(r.status, 4, '空窗 exit=' + r.status + '（期望 4）');
  assert.equal(r.file, null, '空窗却落了产物');
  return 'exit 4；stderr 尾：' + r.stderr.slice(-90);
});

await check('空态（装配层）：两页都印下一句话，且五张卡整卡不出现（不留空壳）', async () => {
  const { buildTrendDoc, buildRecapDoc } = await import(pathToFileURL(join(DIST, 'render', 'sportPortDocs.js')).href);
  const days = [];
  for (let d = EMPTY.start; d <= EMPTY.end; d = nd(d, 1)) days.push(d);
  const trend = buildTrendDoc({
    start: EMPTY.start, end: EMPTY.end,
    days: days.map((date) => ({ date, minutes: null, burned: null, sessions: 0 })),
    weekly: [], activeDays: 0, totalMinutes: null, totalBurned: 0, peak: null,
  });
  const recap = buildRecapDoc({
    start: EMPTY.start, end: EMPTY.end, sessions: 0, totalMinutes: null, totalBurned: 0,
    activeDays: 0, days: days.length, byCategory: [], top5: [],
    daily: days.map((date) => ({ date, burned: null })),
    summary: '本窗 ' + days.length + ' 天中共运动 0 天、0 次、累计消耗 0 卡。',
  });
  writeFileSync(join(OUT, 'empty-trend-assembled.html'), trend, 'utf8');
  writeFileSync(join(OUT, 'empty-recap-assembled.html'), recap, 'utf8');
  for (const [what, html, shells] of [
    ['趋势', trend, ['sec-line', 'sec-weekly', 'sec-daily']],
    ['复盘', recap, ['sec-category', 'sec-badges', 'sec-daily']],
  ]) {
    assert.ok(hasClass(html, 'ilife-block-empty-block'), what + '空态缺空壳块');
    assert.ok(html.includes('本窗还没有运动记录'), what + '空态没印「本窗还没有运动记录」');
    assert.ok(html.includes('记运动'), what + '空态缺下一句话（「记运动」）');
    for (const id of shells) assert.equal(secOf(html, id), '', what + '空态却出了 ' + id + ' 卡外壳');
    assert.ok(html.includes('数据来源 · '), what + '空态缺来源脚注');
    const j = jargonHits(html);
    assert.deepEqual(j, { key: 0, ticket: 0, port: 0 }, what + '空态有工程话：' + JSON.stringify(j));
  }
  return '趋势／复盘空态各印下一句话＋零卡壳';
});

/* ───────────────────── 结算 ───────────────────── */

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log((r.ok ? 'PROBE-OK   ' : 'PROBE-RED  ') + r.name + (r.detail === '' ? '' : ' → ' + r.detail));
console.log('PROBE-RESULT ' + (results.length - failed.length) + '/' + results.length + ' 绿；dist=' + DIST + '；产物落 ' + OUT);
if (failed.length > 0) process.exitCode = 1;
