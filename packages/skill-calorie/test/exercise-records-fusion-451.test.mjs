/** #451 · 场景 04 运动记录级明细（页面族第 2 票）：5 条读词逐条完整文档（以冻结参数为起点）。
 *
 * 骨架照抄 `exercise-receipt-fusion-423.test.mjs`（`mkDir`／`runCli`／`assertDocPage` 逐字学，不另发明）；
 * 参数取冻结表 `src/triggers/scene-04-exercise.ts` 的 `main_prompt.cli`（窗口／备注／分类逐字）。
 * 本票只做记录级明细族 5 条读词：看今日运动／看昨日运动／看运动记录（有备注）／（按力量筛选）／（按有氧筛选）。
 *
 * 本票判据（机器读，逐条对上票面）：
 *   ① 八列明细表（日期／类型／分类／时长／消耗／距离／心率／备注，逐列与逐序）；
 *   ② 截断明示（上限写进表标题 ＋ 页眉条数与可见行数口径一致；老技能静默截断 50 条是反面样板）；
 *   ③ 三条筛选口径句（有备注／力量／有氧，各页各命中一次）；
 *   ④ 页头写人话（`<title>` 与眉标里无命令键／票号／工序词）；
 *   ⑤ 融合构件接线：来源脚注／页内导航（href 全有落点）／可打印／三格式复制（`data-fmt` 三项顺序固定）；
 *   ⑥ 空态带下一句话（说哪句话记下第一条）；空态只能装配层构造（真出口按缺失阻断退出 4）。
 * 另：三类工程话**全文**命中 0（`calorie.view.`／票号 `t\d{3}`／工序词「移植」），本页也不写第二份类别色表。
 *
 * 为什么没有四态头与变更卡载具（器件归类，不是漏做）：`shared/operationHead.ts` 的三张表是**写操作**
 * 四态（新增／修改／删除），#422 的待接线清单把它划给回执族（`docs/skills/skill-calorie/t422-融合共用件.md`
 * §七 表第 1 行）；本族是只读页，没有写操作，硬套会印出与事实不符的态标签。本族接的共用件是
 * `shared/sourceLine.ts`（同表第 3 行点名读页族）与 `shared/emptyGuide.ts`。
 *
 * 变异自证两行（读数见 `docs/skills/skill-calorie/t451-明细族融合.md`）：
 *   - 去掉表标题里的行数上限 → 本测试必红；写回原字节必绿；
 *   - 从八列表头删一列（距离）→ 本测试必红；写回原字节必绿。
 * 两行都**先 `pnpm build` 再跑**（判据读 `dist/`，不编译则读数无效）。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-records-fusion-451.test.mjs`
 * （5 条产物同时落 `.scratch/t451/out/`，供人双击抽查）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildRecordsDoc } from '../dist/exercise/records.js';
import { assertDocPage } from './doc-page-assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const KEY = 'calorie.view.exercise-records';
/** 样例产物落点（票面：落 `.scratch/t451/`，不进版本库，回执给可双击绝对路径）。 */
const SAMPLES = join(REPO, '.scratch', 't451', 'out');
/** 眉标原字（页头人话；判据读这一处）。
 *  #523：`运动 · 记录级明细` → `运动记录明细`（`·` 是分隔符债，探针节点级必须为 0；
 *  类别「运动」与页族「记录级明细」两个字都还在，只是不拿符号串）。
 *  #523 返修：眉标原来与 H1 逐字同名，现退回族名 `运动记录`（H1 留页名「运动记录明细」）。 */
const EYEBROW = '运动记录';
/** 八列表头（逐字、逐序；票面第 1 条）。 */
const COLUMNS = ['日期', '类型', '分类', '时长', '消耗', '距离', '心率', '备注'];
/** 每页行数上限（实现件里的同值；表标题必须写明它）。 */
const ROW_LIMIT = 50;
/** 三条筛选口径句（票面第 3 条；各页各命中一次）。 */
const FILTER_LINE = {
  hasNote: '筛选口径：只看带备注的记录（备注栏有字的才算）',
  strength: '筛选口径：只看分类为力量的记录（力量训练）',
  cardio: '筛选口径：只看分类为有氧的记录（有氧运动）',
};

mkdirSync(SAMPLES, { recursive: true });

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't451-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘（产物直接落样例目录，回执里的路径即用户双击的那一份）。 */
function runCli(dir, key, params, outName) {
  const out = join(SAMPLES, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  const stdout = String(r.stdout || '').trim();
  const file = existsSync(out) ? readFileSync(out, 'utf8') : null;
  // 机读留痕：每条真跑的 exit 与产物字节数（证据件与门禁日志的可对账读数；字节数取 stat，不取字符数）。
  console.log('T451-RUN ' + (outName ?? key) + ' exit=' + r.status + ' bytes=' + (file === null ? 0 : statSync(out).size));
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file,
  };
}

/** 页内某一张卡的区块 HTML（卡片外壳是裸 `<section id="...">`，内层区块不再有 `<section>`）。 */
function cardOf(html, id) {
  const hit = new RegExp('<section id="' + id + '">([\\s\\S]*?)</section>').exec(html);
  return hit === null ? '' : hit[1];
}

/** 类名**落在标记上**（不是落在那条常驻样式规则里）——判「有没有这张卡」只认标记。 */
function hasClass(html, name) {
  return [...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(name));
}

/** 页头文本（`<title>` 与眉标；人话判据读这两处）。 */
function headTexts(html) {
  return {
    title: (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '',
    eyebrow: (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '',
  };
}

/** 某段子串在产物里出现几次（口径句「只出现一次」的判据）。 */
function countOf(html, text) {
  return html.split(text).length - 1;
}

/** 版面正文（去掉样式段与脚本段）：判「本页自己有没有写第二份色表」只看这里
 *  —— 公共层样式段里本来就有这些字面量，拿整份产物判会把公共层算在本页账上。 */
function bodyOf(html) {
  return html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '');
}

/** 明细卡里可见的数据行数（`<tbody>` 的 `<tr>` 逐条数；表头在 `<thead>`，不进这个数）。 */
function visibleRows(html) {
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(cardOf(html, 'sec-table'));
  return body === null ? 0 : (body[1].match(/<tr>/g) ?? []).length;
}

/** 5 条读词共用的融合版式断言（票面 ①–⑥ ＋ 三类工程话全文零命中）。 */
function assertFusion(r, what, opts = {}) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');

  // ④ 页头写人话：<title> 与眉标不许出现命令键／票号／工序词「移植」。
  const head = headTexts(r.file);
  assert.equal(head.eyebrow, EYEBROW, what + ' 眉标不是人话原字：' + head.eyebrow);
  assert.ok(head.title.includes('运动记录'), what + ' <title> 没有运动记录题面：' + head.title);
  for (const [where, text] of [['<title>', head.title], ['眉标', head.eyebrow]]) {
    assert.ok(!/calorie\.[a-z]/.test(text), what + ' 的' + where + '里有命令键：' + text);
    assert.ok(!/\bt\d{3}\b/i.test(text), what + ' 的' + where + '里有票号：' + text);
    assert.ok(!text.includes('移植'), what + ' 的' + where + '里有工序词「移植」：' + text);
  }
  // 三类工程话**全文**零命中（#423 审查 D1 的同一口径）。
  assert.ok(!r.file.includes('calorie.view.'), what + ' 产物里出现命令键 calorie.view.*');
  assert.ok(!/\bt\d{3}\b/i.test(r.file), what + ' 产物里出现票号样式的字');
  assert.ok(!r.file.includes('移植'), what + ' 产物里出现工序词「移植」');

  // ① 八列表头齐、逐序（表在 `sec-table` 卡里）。
  const table = cardOf(r.file, 'sec-table');
  assert.notEqual(table, '', what + ' 缺记录明细卡（sec-table）');
  const heads = [...table.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
  assert.deepEqual(heads, COLUMNS, what + ' 八列表头不是逐字逐序：' + JSON.stringify(heads));
  // ② 截断明示：行数上限进表标题；页眉条数与可见行数口径一致。
  const caption = (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(table) ?? [])[1] ?? '';
  assert.ok(caption.includes('运动记录明细'), what + ' 缺记录级列表标题（#342 原字）：' + caption);
  assert.ok(caption.includes('每页最多 ' + ROW_LIMIT + ' 条'), what + ' 表标题没写明行数上限：' + caption);
  const subtitle = (/<p class="ilife-block-page-shell-subtitle">([^<]*)<\/p>/.exec(r.file) ?? [])[1] ?? '';
  // #523：总数那份事实只留在表标题一处（页眉副标题原来把它复读一遍，是重复事实债），
  // 故这条读数改读表标题——判据覆盖面不变，只是取数位置跟着事实的落点走。
  assert.ok(caption.includes('共 ' + (opts.sessions ?? '') + ' 条'), what + ' 表标题没写总数：' + caption);
  // #523 返修：「本页显示 N 条」只留表标题一处（副标题原来把它复读一遍，是重复事实债），
  // 故副标题只判内容句、不判数；表标题仍逐字对可见行数。
  assert.ok(subtitle.includes('逐条列出本窗的运动记录'), what + ' 页眉副标题不是内容句：' + subtitle);
  assert.ok(!subtitle.includes('本页显示'), what + ' 页眉副标题复读了表标题的本页显示数：' + subtitle);
  assert.ok(caption.includes('本页显示 ' + visibleRows(r.file) + ' 条'),
    what + ' 表标题「本页显示 N 条」与可见行数 ' + visibleRows(r.file) + ' 不一致：' + caption);
  // ⑤ 融合构件接线：页内导航锚点（每个 href 都有对应的页内 id）。
  assert.ok(r.file.includes('<nav class="ilife-block-toc" aria-label="页内导航">'), what + ' 缺页内导航');
  const ids = new Set([...r.file.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...r.file.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 3, what + ' 页内导航只有 ' + hrefs.length + ' 个锚点');
  for (const href of hrefs) assert.ok(ids.has(href), what + ' 锚点 ' + href + ' 没有对应的页内 id');
  // ⑤ 可打印：类落版面根 ＋ 具名页绑定都在（#448 的 `printable` 透传位，端到端取证）。
  assert.ok(/<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">/.test(r.file),
    what + ' 的 ilife-page-printable 没有落在版面根上');
  assert.ok(r.file.includes('page: printable'), what + ' 版面根没有绑定具名页 @page printable');
  assert.ok(r.file.includes('@page printable'), what + ' 样式段缺具名页 @page printable');
  // ⑤ 三格式复制菜单（顺序固定）＋ 复制数据按钮（#342 原字）。
  assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  assert.ok(r.file.includes('复制数据'), what + ' 缺复制数据按钮');
  // ⑤ 来源脚注 ＋ 口径行。
  // #523：来源脚注换成键值行（`数据来源`／`记录数`），不再印 `数据来源 · …` 那种 `·` 串
  // （共用层口径统一归 #470）；判据仍钉「页上有来源这条事实」＋「条数报出来」。覆盖率未减。
  // #523 R4 口径变更（有意改，改动写进提交信息与证据件）：口径行**三行收一行**（视觉复评 R3
  // 「连排灰小字」打回项），故页上口径行的**条数**由 2 降为 1（带筛选的页另有「筛选口径」一行＝2）。
  // 判据**换形不换牙**：条数下限改 1，同时逐字钉住收进去的三条事实——口径行的存在与内容都比
  // 原来那两条 `<p>` 更实：少了任何一条口径分句即红。来源脚注那条仍单列（下面第一行）。
  assert.ok(r.file.includes('数据来源'), what + ' 缺来源脚注');
  assert.ok((r.file.match(/class="ilife-block-caliber"/g) ?? []).length >= 1,
    what + ' 页上没有口径行（ilife-block-caliber）');
  for (const fact of ['口径：条数＝本窗内未删除的运动记录', '消耗＝记录行上报值合计，不按天摊']) {
    assert.ok(r.file.includes(fact), what + ' 口径行缺了这条事实：' + fact);
  }
  // 类别色：本页自己不写色表（色值单源判据归 #453 分布／趋势族；本页连字面量都不落版面正文）。
  for (const hex of ['#5856d6', '#0071e3', '#34c759', '#ff9500']) {
    assert.ok(!bodyOf(r.file).includes(hex), what + ' 版面正文里写进了类别色字面量 ' + hex);
  }
  // 饮食口径的「克」不许露（老明细卡写死克数是反面样板）。
  assert.ok(!r.file.includes('克'), what + ' 明细里露出饮食口径的「克」');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
}

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}
function todayISO() {
  const pin = process.env['CALORIE_TODAY'];
  if (pin !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(pin)) return pin;
  return new Date().toISOString().slice(0, 10);
}

/** 种子：7 天窗内 3 条（力量有备注／有氧无备注／日常有备注），覆盖分类与备注两维。 */
function seedThree(dir) {
  const today = todayISO();
  const d1 = shiftISO(today, -2);
  const d2 = shiftISO(today, -1);
  const seeds = [
    { type: '卧推', calories: 150, minutes: 30, category: '力量', loadKg: 60, reps: 10, note: '夜练', date: d1 },
    { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5, date: d2 },
    { type: '步行', calories: 80, minutes: 20, category: '日常', steps: 3000, note: '通勤', date: today },
  ];
  for (let i = 0; i < seeds.length; i += 1) {
    const s = runCli(dir, 'calorie.exercise.add', seeds[i], 'seed-' + i);
    assert.equal(s.status, 0, 'seed ' + i + ' stderr=' + s.stderr.slice(-200));
  }
  return { today, d1, d2 };
}

/* ───────────────────── 5 条读词（冻结表逐字参数，逐条真跑） ───────────────────── */

test('#451 看今日运动（5 条之 1，先验形状第一条）', () => {
  const dir = mkDir();
  const { today } = seedThree(dir);
  const r = runCli(dir, KEY, { window: '今日' }, '01-today');
  assertFusion(r, '看今日运动', { sessions: 1 });
  assert.ok(r.file.includes(today), '今日页缺今日日期 ' + today);
  assert.ok(r.file.includes('步行'), '今日页缺今日那条的类型值');
  assert.ok(!r.file.includes('卧推'), '今日页串进了前天的行');
  // 无筛选：不出筛选口径句（那三句只属于三个筛选词）。
  assert.ok(!r.file.includes('筛选口径'), '无筛选的页面印出了筛选口径句');
  // 数字口径行（本行数字怎么来的）。
  assert.ok(r.file.includes('口径：') && r.file.includes('消耗＝卡'), '缺数字口径行');
});

test('#451 看昨日运动', () => {
  const dir = mkDir();
  const { today } = seedThree(dir);
  const yesterday = shiftISO(today, -1);
  const r = runCli(dir, KEY, { window: '昨日' }, '02-yesterday');
  assertFusion(r, '看昨日运动', { sessions: 1 });
  assert.ok(r.file.includes(yesterday), '昨日页缺昨日日期 ' + yesterday);
  assert.ok(r.file.includes('户外跑'), '昨日页缺昨日那条的类型值');
  assert.ok(!r.file.includes('步行'), '昨日页串进了今天的行');
  assert.ok(!r.file.includes('筛选口径'), '无筛选的页面印出了筛选口径句');
});

test('#451 看运动记录（有备注）', () => {
  const dir = mkDir();
  seedThree(dir);
  const r = runCli(dir, KEY, { window: '7d', hasNote: true }, '03-hasnote');
  assertFusion(r, '看运动记录（有备注）', { sessions: 2 });
  assert.ok(r.file.includes('夜练') && r.file.includes('通勤'), '备注筛选页缺带备注的行');
  assert.ok(!r.file.includes('户外跑'), '备注筛选页不应含无备注的行');
  assert.equal(countOf(r.file, FILTER_LINE.hasNote), 1, '有备注口径句不是恰好一次：' + FILTER_LINE.hasNote);
  assert.equal(countOf(r.file, FILTER_LINE.strength), 0, '有备注页混进了力量筛选口径句');
  assert.equal(countOf(r.file, FILTER_LINE.cardio), 0, '有备注页混进了有氧筛选口径句');
});

test('#451 看运动记录（按力量筛选）', () => {
  const dir = mkDir();
  seedThree(dir);
  const r = runCli(dir, KEY, { window: '7d', category: '力量' }, '04-strength');
  assertFusion(r, '看运动记录（按力量筛选）', { sessions: 1 });
  assert.ok(r.file.includes('卧推') && r.file.includes('力量'), '力量子集缺力量行');
  assert.ok(!r.file.includes('户外跑'), '力量子集不应含有氧行');
  assert.equal(countOf(r.file, FILTER_LINE.strength), 1, '力量口径句不是恰好一次：' + FILTER_LINE.strength);
  assert.equal(countOf(r.file, FILTER_LINE.hasNote), 0, '力量页混进了备注筛选口径句');
  assert.equal(countOf(r.file, FILTER_LINE.cardio), 0, '力量页混进了有氧筛选口径句');
});

test('#451 看运动记录（按有氧筛选）', () => {
  const dir = mkDir();
  seedThree(dir);
  const r = runCli(dir, KEY, { window: '7d', category: '有氧' }, '05-cardio');
  assertFusion(r, '看运动记录（按有氧筛选）', { sessions: 1 });
  assert.ok(r.file.includes('户外跑') && r.file.includes('有氧'), '有氧子集缺有氧行');
  assert.ok(!r.file.includes('卧推'), '有氧子集不应含力量行');
  assert.equal(countOf(r.file, FILTER_LINE.cardio), 1, '有氧口径句不是恰好一次：' + FILTER_LINE.cardio);
  assert.equal(countOf(r.file, FILTER_LINE.hasNote), 0, '有氧页混进了备注筛选口径句');
  assert.equal(countOf(r.file, FILTER_LINE.strength), 0, '有氧页混进了力量筛选口径句');
});

/* ───────────────────────────── 截断明示（票面第 2 条） ───────────────────────────── */

test('#451 超上限（52 条）：表标题写明上限，页眉条数与可见行数口径一致', () => {
  const dir = mkDir();
  const today = todayISO();
  const items = [];
  for (let i = 0; i < 52; i += 1) {
    items.push({ type: '慢跑', calories: 100, minutes: 10, category: '有氧', date: shiftISO(today, -(i % 7)) });
  }
  const seed = runCli(dir, 'calorie.exercise.add', { items }, '06-seed-52');
  assert.equal(seed.status, 0, '批量种子 stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, KEY, { window: '7d' }, '06-truncated');
  assertFusion(r, '超上限 52 条', { sessions: 52 });
  assert.equal(visibleRows(r.file), ROW_LIMIT, '超上限时可见行数不是上限值 ' + ROW_LIMIT);
  const caption = (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(r.file) ?? [])[1] ?? '';
  assert.ok(caption.includes('共 52 条'), '表标题没写总数：' + caption);
  assert.ok(caption.includes('本页显示 ' + ROW_LIMIT + ' 条'), '表标题没写本页显示数：' + caption);
  // 截断这件事本身也要有一句口径（免得读者以为只剩这些）。
  assert.equal(countOf(r.file, '本页只列前 ' + ROW_LIMIT + ' 条'), 1, '缺截断口径句');
  // 指标卡的「记录数」是本窗总数，不是可见行数。
  const kpi = /记录数<\/div>[\s\S]{0,160}?ilife-block-kpi-card-value">(\d+)</.exec(r.file);
  assert.equal(kpi === null ? null : kpi[1], '52', '指标卡的记录数不是本窗总数 52');
});

test('#451 未超上限：表标题照旧写明上限，可见行数＝总数', () => {
  const dir = mkDir();
  const { today } = seedThree(dir);
  const r = runCli(dir, KEY, { window: '7d' }, '07-not-truncated');
  assertFusion(r, '未超上限', { sessions: 3 });
  assert.equal(visibleRows(r.file), 3, '未超上限的可见行数不是 3');
  assert.ok(r.file.includes(today), '窗口内日期没印出来');
  assert.equal(countOf(r.file, '本页只列前 ' + ROW_LIMIT + ' 条'), 0, '未超上限却印了截断口径句');
});

/* ─────────────────── 空态带下一句话（真出口按缺失阻断，装配层构造） ─────────────────── */

test('#451 空态：无记录时给「说哪句话记下第一条」（装配层构造）', () => {
  // 一条写词都不改：无记录时真出口按缺失阻断退出 4（实测），故空态只能装配层构造。
  const dir = mkDir();
  const blocked = runCli(dir, KEY, { window: '今日' }, '08-empty-blocked');
  assert.equal(blocked.status, 4, '空日子查记录今天应缺失阻断退出 4（实测读数）');
  const empty = {
    start: '2026-09-13', end: '2026-09-13', rows: [], sessions: 0,
    totalBurned: 0, totalMinutes: null, activeDays: 0, category: null, hasNote: null,
  };
  const html = buildRecordsDoc(empty);
  assertDocPage(html, '空态');
  assert.ok(hasClass(html, 'ilife-empty'), '空态没有走公共层空态构件（ilife-empty）');
  assert.ok(html.includes('说「记运动」就能记下第一条'), '空态缺「说哪句话记下第一条」');
  assert.equal(cardOf(html, 'sec-table'), '', '没有行却留下了明细卡外壳');
  assert.equal(visibleRows(html), 0, '空态却有可见行');
  assert.ok(!html.includes('筛选口径'), '空态印出了筛选口径句');
  assert.ok(html.includes('数据来源') && html.includes('共 0 条'), '空态缺来源脚注（0 条也要报）');
  // 三类工程话在空态页里同样零命中。
  assert.ok(!html.includes('calorie.view.') && !html.includes('移植'), '空态页出现工程话');
  // 按筛选词的下一句话（力量／有氧各自指名那条唤醒词）。
  const strength = buildRecordsDoc({ ...empty, category: '力量' });
  assert.ok(strength.includes('说「记力量训练」就能记下第一条'), '力量空态没指名「记力量训练」');
  const cardio = buildRecordsDoc({ ...empty, category: '有氧' });
  assert.ok(cardio.includes('说「记有氧运动」就能记下第一条'), '有氧空态没指名「记有氧运动」');
});
