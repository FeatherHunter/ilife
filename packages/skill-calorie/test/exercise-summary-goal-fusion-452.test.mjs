/** #452 · 场景 04 运动「汇总族 10 条窗口词 ＋ 对照目标族 2 条词」融合版式判据。
 *
 * 骨架照抄 `exercise-receipt-fusion-423.test.mjs`（`mkDir`／`runCli`／`assertDocPage` 逐字学，不另发明）；
 * 参数取冻结表 `src/triggers/scene-04-exercise.ts` 的 `main_prompt.cli`（`<日期>` 填真实日期，其余逐字）。
 * 「N 条词各跑一次」＝「N 组冻结参数各跑一次」：唤醒词接线归 #266，本票只认参数。
 *
 * 本票判据（机器读，逐条对上票面）：
 *   ① 12 条词逐条真跑：exit 0、产物存在、`assertDocPage` 过、信封交付路径＝本次 `--html`；
 *   ② 汇总页结构：KPI 四格／折线容器／类型分布块／逐日明细表／四锚点／`ilife-page-printable`
 *      ／三格式／来源脚注／口径行；
 *   ③ 目标页结构：环卡（`min(pct,100)`）＋判决胶囊两态＋差距文案＋口径行；整周窗口（7 天）才印周口径那句——CLI 冻结锚点
 *      是周一，「看本周运动」实到 1 天，这一档另由装配层用例钉住；
 *   ④ 目标缺席：走专门空态、页内不出现环形进度容器（变异①的靶子）；
 *   ⑤ 截断一致：超上限窗口（365 天）的截断明示与页眉条数／可见行数口径一致（变异②的靶子）；
 *   ⑥ 三类工程话**全文**断言：摘掉复制载荷后命令键 0 处、票号 0 处、工序词「移植」0 处
 *      （票号与工序词连复制载荷里也不许有；命令键只许落在复制载荷里，那是可照抄重跑的命令原文）；
 *   ⑦ 口径单源：周口径那句（「每日目标 × 7」）在 `packages/skill-calorie/src` 只命中一个文件；
 *   ⑧ 页头写人话：`<title>` 与眉标里无命令键、无票号、无「移植」。
 *
 * 变异自证（读数见 `docs/skills/skill-calorie/t452-汇总与目标族融合.md`）：
 *   - ① 无目标也画环 → 本测试必红；写回原字节必绿；
 *   - ② 去掉截断明示 → 本测试必红；写回原字节必绿。
 * 两行都**先 `pnpm build` 再跑**（判据读 `dist/`，不编译则读数无效）。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-summary-goal-fusion-452.test.mjs`
 * （12 条产物同时落 `.scratch/t452/out/`，供人双击抽查）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addRecord } from '../dist/exercise/exerciseStore.js';
import { buildExerciseDoc, buildExerciseGoalDoc } from '../dist/render/sportDocs.js';
import { assertDocPage } from './doc-page-assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

/** 样例产物落点（票面：落 `.scratch/t452/`，不进版本库，回执给可双击绝对路径）。 */
const SAMPLES = join(REPO, '.scratch', 't452', 'out');

/** 判据与实现共认的常量（变异时改实现不改本判据，故两边各写一次；等值由本测试自己核对）。 */
const EXERCISE_CMD = 'calorie.view.exercise';
const GOAL_CMD = 'calorie.view.exercise-goal';
const WEEK_DAILY_GOAL = 300;
const DAILY_CAP = 100;
/** 判据读的窗口锚点（`CALORIE_TODAY` 把「今天」钉住，相对窗口全部由此派生；冻结参数逐字，只填日期）。 */
const TODAY = '2026-09-14';
/** 365 天窗的起点（2026-09-14 − 364 天）与冻结表 `<日期>` 占位。 */
const W365_START = '2025-09-15';
/** 本周一起点（`2026-09-14` 是周一）。 */
const WEEK_START = '2026-09-14';

mkdirSync(SAMPLES, { recursive: true });

/** 逐条打印本测试读到的读数（证据件与门禁日志对账用）。 */
const READS = [];
function note(tag, text) {
  READS.push(tag + '=' + text);
  console.log('T452 ' + tag + ' ' + text);
}
process.on('exit', () => {
  console.log('T452-READS ' + READS.length + ' 条 ｜ ' + READS.join(' ｜ '));
});

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't452-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

function withDb(dir) {
  return openDb(join(dir, DB_FILENAME));
}

/** 真 CLI 跑一条命令并落盘（产物直接落样例目录，回执里的路径即用户双击的那一份）。 */
function runCli(dir, key, params, outName) {
  const out = join(SAMPLES, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  const stdout = String(r.stdout || '').trim();
  const file = existsSync(out) ? readFileSync(out, 'utf8') : null;
  note('RUN ' + (outName ?? key), 'exit=' + r.status + ' bytes=' + (file === null ? 0 : statSync(out).size));
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file,
  };
}

/* ───────────────────────────── 造数（一条 CLI 不改，直接写库） ───────────────────────────── */

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}

const SEED_TYPES = [
  ['慢跑', 320, 30], ['卧推', 150, 40], ['户外跑', 300, 30], ['步行', 80, 20],
];

/** 落 400 天里每 3 天一条运动（0／3／6…），外加当天第二组与前一天一条：
 *  365 天窗会超上限（截断明示那一条要有实物），7 天窗有数，'今日'/'本周' 有当日行。 */
function seedWide(dir) {
  const db = withDb(dir);
  let n = 0;
  for (let off = 0; off <= 399; off += 3) {
    const [type, kcal, minutes] = SEED_TYPES[(off / 3) % SEED_TYPES.length];
    addRecord(db, { date: shiftISO(TODAY, -off), exerciseType: type, caloriesBurned: kcal, minutes });
    n++;
  }
  addRecord(db, { date: TODAY, exerciseType: '慢跑', caloriesBurned: 120, minutes: 20 });
  addRecord(db, { date: shiftISO(TODAY, -1), exerciseType: '瑜伽', caloriesBurned: 90, minutes: 25 });
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, exercise_goal) VALUES (1, ?)').run(WEEK_DAILY_GOAL);
  db.close();
  note('SEED', 'rows=' + (n + 2) + ' span=' + shiftISO(TODAY, -399) + '..' + TODAY + ' dailyGoal=' + WEEK_DAILY_GOAL);
  return n + 2;
}

/* ───────────────────────────── 页面读法小工具 ───────────────────────────── */

function cardOf(html, id) {
  const hit = new RegExp('<section id="' + id + '">([\\s\\S]*?)</section>').exec(html);
  return hit === null ? '' : hit[1];
}

/** 类名**落在标记上**（不是落在那条常驻样式规则里）——判「有没有这张卡」只认标记。 */
function hasClass(html, name) {
  return [...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(name));
}

function headTexts(html) {
  return {
    title: (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '',
    h1: (/<h1 class="ilife-block-page-shell-title">([^<]*)<\/h1>/.exec(html) ?? [])[1] ?? '',
    eyebrow: (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '',
  };
}

function anchors(html) {
  return [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
}

function formatsOf(html) {
  return [...html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]);
}

function tableRows(html) {
  return (html.match(/<tr>/g) ?? []).length;
}

function calibersOf(html) {
  return [...html.matchAll(/<p class="ilife-block-caliber">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
}

/** 来源脚注那一块：#523 起是**键值行**（`sportUi.factStrip()`），不再是
 *  `数据来源 · <来源> · 起 → 止 · 共 N 条` 那种 `·` 串（共用层口径统一归 #470）。
 *  仍读「本窗记录数」这一个数——判据覆盖面不变，只是取数位置跟着事实的落点走。 */
function sourceFootnote(html) {
  const hit = /<span class="sui-fact-k">记录数<\/span><span class="sui-fact-v">共 (\d+) 条<\/span>/.exec(html);
  assert.ok(hit !== null, '产物里读不到来源脚注的记录数（键值行）');
  assert.ok(html.includes('数据来源'), '产物里读不到来源脚注');
  return { text: hit[0], count: Number(hit[1]) };
}

/** 复制载荷那几段（**有意**承载可照抄命令原文的地方）：复制菜单按钮的 `data-t` 载荷。
 *  判「命令键只许落在复制载荷」＝把这几段整段摘掉，再看**剩下的全文**。这比「只判版面壳那一截」严得多：
 *  版面壳的 `</section>` 是嵌套的，非贪婪匹配只取得到页头那一千多字符，不足为凭。 */
function stripCopyPayload(html) {
  return html.replace(/data-t="[^"]*"/g, 'data-t="［复制载荷］"');
}

/** 工程话三条的**全文**断言（命令键／票号／工序词「移植」各 0）＋ 可见文本零 snake_case ＋ 页头人话。
 *  命令键**有意**落在复制载荷里（复制日志末段是可照抄重跑的命令原文，三格式数据里也带 envelope 的 key），
 *  故全文断言的写法是：**摘掉复制载荷后整份产物零命令键**；票号与工序词连复制载荷里也不许有。 */
function assertNoEngineerWords(html, what) {
  const body = stripCopyPayload(html);
  assert.ok(body.length < html.length, what + ' 产物里读不到复制载荷（形制不对，全文断言无从谈起）');
  assert.ok(!body.includes('calorie.view.'), what + ' 的复制载荷之外出现命令键 calorie.view.*');
  for (const [where, text] of [['全文（除复制载荷）', body], ['复制载荷', html]]) {
    assert.ok(!text.includes('calorie.exercise.'), what + ' 的' + where + '里出现命令键 calorie.exercise.*');
    assert.ok(!/\bt\d{3}\b/.test(text), what + ' 的' + where + '里出现票号样式');
    assert.ok(!text.includes('移植'), what + ' 的' + where + '里出现工序词「移植」');
  }
  // 族票共同要求：**可见文本零 snake_case**（库表名那种写法只许留在复制载荷里）。
  const snake = /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/.exec(body);
  assert.equal(snake, null, what + ' 的可见面出现 snake_case：' + (snake === null ? '' : snake[0]));
  const head = headTexts(html);
  // #523：品牌名里的 `·` 去掉（`·` 是分隔符债，`<title>` 也是可见文本；照 #401 样板先例）。
  assert.equal(head.title, '卡路里 运动', what + ' 的 head 标题不是人话原名：' + head.title);
  for (const [where, text] of [['head 标题', head.title], ['H1', head.h1], ['眉标', head.eyebrow]]) {
    assert.ok(!/calorie\.[a-z]/.test(text), what + ' 的' + where + '里有命令键：' + text);
    assert.ok(!/\bt\d{3}\b/i.test(text), what + ' 的' + where + '里有票号：' + text);
    assert.ok(!text.includes('移植'), what + ' 的' + where + '里有工序词「移植」：' + text);
  }
  assert.ok(!head.eyebrow.includes('.view.'), what + ' 眉标仍是命令键：' + head.eyebrow);
}

/** 融合版式共件（两页都该有的那一组）：完整文档／版面根／可打印／三格式／锚点／人话页头。
 *  `minAnchors`＝页内导航的锚点数下限（汇总页四块起，目标页两块起，逐页传）。 */
function assertFusionShell(r, what, opts = {}) {
  const minAnchors = opts.minAnchors ?? 4;
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');
  assert.ok(/<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">/.test(r.file),
    what + ' 的 ilife-page-printable 没有落在版面根上');
  assert.ok(r.file.includes('page: printable'), what + ' 版面根没有绑定具名页 @page printable');
  assert.ok(r.file.includes('@page printable'), what + ' 样式段缺具名页 @page printable');
  assert.deepEqual(formatsOf(r.file), ['text', 'json', 'csv'], what + ' 的复制数据不是三格式菜单');
  assert.ok(r.file.includes('ilife-copy-log'), what + ' 缺复制日志按钮');
  assert.ok(r.file.includes('<nav class="ilife-block-toc" aria-label="页内导航">'), what + ' 缺页内导航');
  const ids = new Set([...r.file.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = anchors(r.file);
  assert.ok(hrefs.length >= minAnchors, what + ' 页内导航只有 ' + hrefs.length + ' 个锚点（下限 ' + minAnchors + '）');
  for (const href of hrefs) assert.ok(ids.has(href), what + ' 锚点 ' + href + ' 没有对应的页内 id');
  assertNoEngineerWords(r.file, what);
}

/* ───────────────────────────── 一、汇总族 10 条词 ───────────────────────────── */

/** 冻结表 10 条汇总词的 `main_prompt.cli` 参数逐字（`<日期>` 只填日期）。 */
const SUMMARY_CASES = [
  { word: '看本周运动', params: { window: '本周' }, out: '01-week' },
  { word: '看上周运动', params: { window: '上周' }, out: '02-last-week' },
  { word: '看本月运动', params: { window: '本月' }, out: '03-month' },
  { word: '看上月运动', params: { window: '上月' }, out: '04-last-month' },
  { word: '看最近 7 天运动', params: { window: '7d' }, out: '05-7d' },
  { word: '看最近 30 天运动', params: { window: '30d' }, out: '06-30d' },
  { word: '看最近 60 天运动', params: { window: '60d' }, out: '07-60d' },
  { word: '看最近 180 天运动', params: { window: '180d' }, out: '08-180d' },
  { word: '看最近 365 天运动', params: { window: '365d' }, out: '09-365d' },
  { word: '看某段时间运动', params: { window: 'custom', start: W365_START, end: TODAY }, out: '10-range' },
];

/** 汇总页结构逐处断言（票面「汇总页」那一行逐件；票号／命令键由 assertFusionShell 兜）。 */
function assertSummary(r, c) {
  const what = c.word;
  assertFusionShell(r, what);
  const head = headTexts(r.file);
  assert.ok(head.h1.startsWith('运动汇总 '), what + ' 的 H1 不是人话页名：' + head.h1);
  // #523：眉标 `运动 · 汇总` → `运动汇总`（类别与页族两个字都在，只是不拿 `·` 串）。
  assert.equal(head.eyebrow, '运动汇总', what + ' 眉标不是人话原文：' + head.eyebrow);
  // ① KPI 四格（结构上是四张卡）。
  const kpi = cardOf(r.file, 'sec-kpi');
  assert.ok(kpi.includes('ilife-block-kpi-card'), what + ' 缺 KPI 四格容器');
  assert.equal((kpi.match(/class="ilife-block ilife-block-kpi-card"/g) ?? []).length, 4, what + ' 的 KPI 不是四格');
  // ② 折线容器（每日消耗）＋ ③ 类型消耗分布 ＋ ④ 明细表（逐日／按类型／按分类）。
  assert.ok(/<section class="ilife-block ilife-block-chart-block">/.test(r.file), what + ' 缺折线容器（chartBlock）');
  assert.ok(r.file.includes('每日消耗'), what + ' 折线块标题不是「每日消耗」');
  assert.ok(r.file.includes('类型消耗分布'), what + ' 缺类型消耗分布块');
  assert.ok(r.file.includes('ilife-chart'), what + ' 缺图表画布（ilife-chart）');
  const daily = cardOf(r.file, 'sec-series');
  const type = cardOf(r.file, 'sec-type');
  assert.ok(daily.includes('按日消耗'), what + ' 缺逐日明细表（按日消耗）');
  assert.ok(type.includes('按类型明细'), what + ' 缺按类型明细表');
  assert.ok(type.includes('ilife-block-data-table'), what + ' 按类型明细不是表格件');
  assert.ok(r.file.includes('按分类汇总'), what + ' 缺按分类汇总折叠区');
  // ⑤ 来源脚注 ＋ ⑥ 口径行（来源条数是唯一的「共 N 条」来源处）。
  const src = sourceFootnote(r.file);
  assert.ok(calibersOf(r.file).length >= 2, what + ' 口径行／来源脚注不足两条（ilife-block-caliber）');
  // ⑦ 每日消耗折线按全窗口画（窗内天数＝折线点数）。
  assert.ok(r.file.includes('按 ' + r.days + ' 天画'), what + ' 折线点数口径不是窗内天数');
  // ⑧ 体量（看着像整页，不是片段）。
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
  return { rows: tableRows(daily), days: r.days, count: src.count };
}

/** 窗内天数（供折线点数与截断口径断言；只对 10 条冻结参数算，不当取数口径）。 */
function daysBetween(params) {
  const days = (start, end) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (params.window === '本周') return days(WEEK_START, TODAY);
  if (params.window === '上周') return days('2026-09-07', '2026-09-13');
  if (params.window === '本月') return days('2026-09-01', TODAY);
  if (params.window === '上月') return days('2026-08-01', '2026-08-31');
  if (params.window === 'custom') return days(params.start, params.end);
  const m = /^(\d+)d$/.exec(String(params.window));
  if (m !== null) return Number(m[1]);
  assert.fail('窗口判据不认识：' + JSON.stringify(params));
}

test('#452 汇总族 10 条词（冻结参数各跑一次；长窗按截断口径读）', () => {
  const dir = mkDir();
  seedWide(dir);
  for (const c of SUMMARY_CASES) {
    const r = runCli(dir, EXERCISE_CMD, c.params, c.out);
    r.days = daysBetween(c.params);
    const read = assertSummary(r, c);
    const daily = cardOf(r.file, 'sec-series');
    if (read.days <= DAILY_CAP) {
      // 短窗不截断：可见行数＝窗内天数（页眉条数与可见行数对得上），且不出截断明示。
      assert.equal(read.rows, read.days + 1, c.word + ' 逐日表行数（含表头）不是窗内天数');
      assert.ok(!r.file.includes('截断'), c.word + ' 短窗不该出现截断明示');
    } else {
      // 长窗截断：页眉条数＝窗内天数，可见行数＝上限，两数在同一个句子里明示。
      assert.ok(daily.includes('共 ' + read.days + ' 天'), c.word + ' 页眉条数口径不是窗内天数：' + read.days);
      assert.equal(read.rows, DAILY_CAP + 1, c.word + ' 可见行数不是上限 ' + DAILY_CAP + '（实测 ' + read.rows + '）');
      assert.ok(r.file.includes('截断'), c.word + ' 长窗口没有截断明示');
      assert.ok(r.file.includes('显示最近 ' + DAILY_CAP + ' 天'), c.word + ' 截断明示没写可见行数上限');
      assert.ok(r.file.includes('其余 ' + (read.days - DAILY_CAP) + ' 天'), c.word + ' 截断明示没写被截掉的天数');
      assert.ok(r.file.includes('本窗共 ' + read.days + ' 天'), c.word + ' 截断明示没写页眉条数口径');
    }
    note('SUMMARY ' + c.out, 'days=' + read.days + ' rows=' + read.rows + ' count=' + read.count + ' trunc=' + (read.days > DAILY_CAP));
  }
});

/* ───────────────── 二、长窗口截断一致（页眉条数／可见行数／截断明示） ───────────────── */

test('#452 截断明示：365 天窗的页眉条数、可见行数、截断明示三者口径一致', () => {
  const dir = mkDir();
  seedWide(dir);
  const c = SUMMARY_CASES[8];
  const r = runCli(dir, EXERCISE_CMD, c.params, '11-365d-trunc');
  r.days = daysBetween(c.params);
  const read = assertSummary(r, c);
  const daily = cardOf(r.file, 'sec-series');
  note('TRUNC', '窗内天数=' + read.days + ' 可见行数=' + read.rows + ' 上限=' + DAILY_CAP);
  assert.ok(daily.includes('共 ' + read.days + ' 天'), '页眉条数口径不是窗内天数：' + read.days);
  assert.equal(read.rows, DAILY_CAP + 1, '逐日表可见行数不是上限 ' + DAILY_CAP + '（实测 ' + read.rows + '）');
  assert.ok(r.file.includes('截断'), '长窗口没有截断明示');
  assert.ok(r.file.includes('显示最近 ' + DAILY_CAP + ' 天'), '截断明示没写可见行数上限');
  assert.ok(r.file.includes('其余 ' + (read.days - DAILY_CAP) + ' 天'), '截断明示没写被截掉的天数');
  assert.ok(r.file.includes('本窗共 ' + read.days + ' 天'), '截断明示没写页眉条数口径（本窗共 N 天）');
  // 同一个 365 天窗的「某段时间」那条词也走同一条截断口径（两条词同一页同一上限）。
  const range = runCli(dir, EXERCISE_CMD, SUMMARY_CASES[9].params, '12-365d-range');
  assert.ok(range.file.includes('显示最近 ' + DAILY_CAP + ' 天'), '「看某段时间运动」的长窗口没有同一条截断明示');
  assert.equal(tableRows(cardOf(range.file, 'sec-series')), DAILY_CAP + 1, '「看某段时间运动」的可见行数口径不一致');
});

/* ───────────────────────────── 三、对照目标族 2 条词 ───────────────────────────── */

/** 冻结表 2 条对照目标词的 `main_prompt.cli` 参数逐字；`days`＝窗内天数（口径行断句用）。 */
const GOAL_CASES = [
  { word: '看今日运动（vs 目标）', params: { window: '今日' }, days: 1, out: '13-today-goal' },
  { word: '看本周运动（vs 目标）', params: { window: '本周' }, days: 1, out: '14-week-goal' },
];

/** 目标页结构逐处断言（票面「目标页」那一行逐件）。 */
function assertGoalPage(r, what) {
  assertFusionShell(r, what, { minAnchors: 2 });
  const head = headTexts(r.file);
  assert.ok(head.h1.startsWith('运动目标 '), what + ' 的 H1 不是人话页名：' + head.h1);
  // #523：眉标 `运动 · 对照目标` → `运动对照目标`（同上，不拿 `·` 串）。
  assert.equal(head.eyebrow, '运动对照目标', what + ' 眉标不是人话原文：' + head.eyebrow);
  // 环卡 ＋ 判决胶囊 ＋ 差距文案。
  assert.ok(hasClass(r.file, 'ilife-block-ring-wrap'), what + ' 缺环形进度容器（ilife-block-ring-wrap）');
  assert.ok(hasClass(r.file, 'ilife-block-ring-pct'), what + ' 环心缺百分比读数');
  assert.ok(hasClass(r.file, 'ilife-block-verdict'), what + ' 缺判决胶囊（ilife-block-verdict）');
  assert.ok(/class="[^"]*ilife-block-verdict (ok|no)"/.test(r.file), what + ' 判决胶囊没有档（ok/no）');
  // #523 返修：环下「目标／实际／差距」键值行已撤（这三个数只在数值四格各一处；
  // 「差距／差额」两名一数收成「差额」一名），差距文案改读差额卡（标签＋值＋判语）。
  assert.ok(r.file.includes('差额') && /(超出目标|还差这么多)/.test(r.file), what + ' 缺差距文案（差额卡）');
  assert.ok(hasClass(r.file, 'ilife-block-kpi-card'), what + ' 缺目标页的数值格');
  // 口径行（周口径那句只在一处算一处写；口径行走 renderCaliberLine）。
  assert.ok(calibersOf(r.file).length >= 2, what + ' 口径行／来源脚注不足两条（ilife-block-caliber）');
  assert.ok(r.file.includes('每日目标 ' + WEEK_DAILY_GOAL + ' 卡'), what + ' 口径行缺每日目标读数');
  if (r.days === 7) {
    assert.ok(r.file.includes('周目标口径＝每日目标 × 7'), what + ' 整周窗口口径行缺周口径那句原文');
    assert.ok(r.file.includes('每日目标 ' + WEEK_DAILY_GOAL + ' 卡 × 7 = ' + (WEEK_DAILY_GOAL * 7) + ' 卡'),
      what + ' 整周窗口口径行缺「每日目标 × 7 = 周目标」那一步算式');
  } else {
    assert.ok(!r.file.includes('周目标口径'), what + ' 非整周窗口不该印周口径那句（免得日口径页也成周口径）');
  }
  // 判决胶囊两态：本判据数据下「今日」（2 条共 440 卡 ≥ 300）达成，「本周」同窗也达成。
  assert.ok(/class="[^"]*ilife-block-verdict (ok|no)"/.test(r.file), what + ' 判决胶囊没有档（ok/no）');
  assert.ok(r.file.includes('共 ' + r.count + ' 条'), what + ' 来源脚注条数口径不是本次窗口的记录数');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
}

test('#452 目标族 2 条词（冻结参数各跑一次）', () => {
  const dir = mkDir();
  seedWide(dir);
  for (const c of GOAL_CASES) {
    const r = runCli(dir, GOAL_CMD, c.params, c.out);
    r.count = sourceFootnote(r.file).count;
    assertGoalPage(r, c.word);
    note('GOAL ' + c.out, 'count=' + r.count);
  }
});

/** 整周（7 天）那一档的口径行：CLI 冻结锚点 `2026-09-14` 是周一，故「看本周运动」的窗口只有 1 天，
 *  周口径那句在 CLI 面上跑不到——这一档改由装配层直接构造，钉住「整周才印、日窗口不印」。 */
test('#452 周口径那句：整周窗口（7 天）才印，日窗口不印', () => {
  const week = buildExerciseGoalDoc(goalInput({
    days: 7, goalTotal: WEEK_DAILY_GOAL * 7, actual: 2400, pct: 114, gap: 300, achieved: true,
  }));
  assertDocPage(week, '整周目标页');
  assert.ok(week.includes('周目标口径＝每日目标 × 7'), '整周窗口没印周口径那句原文');
  assert.ok(week.includes('每日目标 ' + WEEK_DAILY_GOAL + ' 卡 × 7 = ' + (WEEK_DAILY_GOAL * 7) + ' 卡'),
    '整周窗口没印「每日目标 × 7 = 周目标」那一步算式');
  assert.ok(week.includes('每日目标 ' + WEEK_DAILY_GOAL + ' 卡'), '整周窗口口径行缺每日目标读数');
  const day = buildExerciseGoalDoc(goalInput({ days: 1 }));
  assert.ok(!day.includes('周目标口径'), '日窗口不该印周口径那句（免得日口径页也成周口径）');
  note('WEEK-CALIBER', '整周=有那一步算式 日窗=无周口径那句');
});

/* ───────────────── 四、变异的两个靶子（从装配层直接调用，读得到的分支） ───────────────── */

function goalInput(over = {}) {
  return {
    key: GOAL_CMD,
    cmd: "calorie-cmd-read calorie.view.exercise-goal --params '{\"window\":\"今日\"}'",
    start: TODAY, end: TODAY, days: 1,
    dailyGoal: WEEK_DAILY_GOAL, goalTotal: WEEK_DAILY_GOAL, actual: 120,
    pct: 40, gap: -180, achieved: false,
    ...over,
  };
}

test('#452 目标缺席：走专门空态、页内不出现环形进度容器', () => {
  const empty = buildExerciseGoalDoc(goalInput({ goalTotal: null, pct: null, actual: 0, achieved: false }));
  assertDocPage(empty, '目标缺席空态');
  assert.ok(empty.includes('还没设每日运动消耗目标'), '空态缺原因句');
  assert.ok(empty.includes('先说一句「定营养目标」'), '空态缺「下一句能说的话」指引');
  assert.ok(!hasClass(empty, 'ilife-block-ring-wrap'), '没有目标却画了空环（变异①的靶子）');
  assert.ok(!empty.includes('conic-gradient'), '没有目标却出了环形进度');
  assert.ok(!hasClass(empty, 'ilife-block-verdict'), '没有目标却出了判决胶囊');
  assertNoEngineerWords(empty, '目标缺席空态');
  note('GOAL-EMPTY', '环形容器=' + hasClass(empty, 'ilife-block-ring-wrap') + ' conic=' + empty.includes('conic-gradient') + ' bytes=' + empty.length);
});

test('#452 环取 min(pct,100)：超额由文字承载', () => {
  const over = buildExerciseGoalDoc(goalInput({ actual: 1260, pct: 420, gap: 960, achieved: true }));
  assertDocPage(over, '超额页');
  const ring = /conic-gradient\(var\(--blue\) 0 (\d+)%/.exec(over);
  assert.ok(ring !== null, '环卡没写 conic-gradient 度数');
  assert.equal(Number(ring[1]), 100, '环不是 min(pct,100)：实测 ' + ring[1] + '%');
  assert.ok(over.includes('420%'), '超额实际百分比没由文字承载');
  assert.ok(over.includes('超出目标'), '达成态缺超额文案');
  assert.ok(!over.includes('还差'), '达成态不该出现「还差」');
});

test('#452 判决胶囊两态：达成 ok／未达成 no（同一个类的两个档）', () => {
  const done = buildExerciseGoalDoc(goalInput({ actual: 420, pct: 140, gap: 120, achieved: true }));
  const short = buildExerciseGoalDoc(goalInput({ actual: 120, pct: 40, gap: -180, achieved: false }));
  assert.ok(/class="[^"]*ilife-block-verdict ok"/.test(done), '达成页胶囊不是 ok 档');
  assert.ok(/class="[^"]*ilife-block-verdict no"/.test(short), '未达成页胶囊不是 no 档');
  assert.ok(done.includes('已达成目标'), '达成页缺判决文字');
  assert.ok(short.includes('还差 180 卡'), '未达成页缺差距句');
  note('VERDICT', 'done=ok short=no 两态都在');
});

/* ───────────────────────────── 五、口径单源（周口径那句） ───────────────────────────── */

test('#452 口径单源：周口径那句在包内 src 只命中一个文件', () => {
  const hits = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!path.endsWith('.ts')) continue;
      if (readFileSync(path, 'utf8').includes('每日目标 × 7')) hits.push(path);
    }
  };
  walk(join(PKG, 'src'));
  note('CALIBER-SRC', '命中文件=' + hits.length + ' → ' + hits.map((p) => p.replace(REPO + '\\', '')).join('、'));
  assert.equal(hits.length, 1, '周口径那句在包内 src 命中 ' + hits.length + ' 个文件：' + hits.join('、'));
  assert.equal(dirname(hits[0]), join(PKG, 'src', 'render'), '周口径那句不在本票主件所在目录：' + hits[0]);
});

/* ───────────────────────────── 六、汇总页空态（装配层构造） ───────────────────────────── */

test('#452 汇总页空态：带下一句话的指引，不留空卡', () => {
  const empty = buildExerciseDoc({
    start: TODAY, end: TODAY, activeDays: 0, totalBurnedSeries: 0, avgBurnedPerLoggedDay: null,
    series: [],
    review: {
      start: TODAY, end: TODAY, days: 0, sessions: 0, activeDays: 0, totalBurned: 0, totalMinutes: 0,
      avgBurnedPerSession: 0, avgBurnedPerDay: 0, byCategory: {}, byType: [],
      estimatedCheck: { reported: 0, estimated: 0, deviationPct: null },
    },
  }, "calorie-cmd-read calorie.view.exercise --params '{\"window\":\"custom\",\"start\":\"" + TODAY + "\",\"end\":\"" + TODAY + "\"}'");
  assertDocPage(empty, '汇总页空态');
  assert.ok(hasClass(empty, 'ilife-empty'), '空态不是公共层空态件（ilife-empty）');
  assert.ok(empty.includes('本段时间没有运动记录'), '空态缺原因句');
  assert.ok(empty.includes('先说一句「记运动」'), '空态缺下一句话指引');
  assert.ok(!empty.includes('按日消耗'), '没有记录却出了逐日表标题');
  assert.ok(!empty.includes('类型消耗分布'), '没有记录却出了类型分布块');
  assertNoEngineerWords(empty, '汇总页空态');
  note('SUMMARY-EMPTY', '空态件=有 逐日表=' + empty.includes('按日消耗') + ' bytes=' + empty.length);
});
