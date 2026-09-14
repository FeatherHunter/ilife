/** #423 · 场景 04 运动写后回执（融合族样板）：13 条写词逐条完整文档（以唤醒词为起点）。
 *
 * 骨架照抄 `exercise-receipt-264.test.mjs`（`mkDir`／`runCli`／`assertDocPage` 逐字学，不另发明）；
 * 参数取冻结表 `src/triggers/scene-04-exercise.ts` 的 `main_prompt.cli`（`<日期>` 填真实日期，
 * 其余逐字；复制昨日运动按冻结原文不带日期，目标即今天，故先在昨日落一条再复制）。
 *
 * 本票判据（机器读，逐条对上票面八条）：
 *   ① 四态头走 #422 共用件（`ilife-block-op-head-<档>` ＋ 三张表只在共用件里定义一处）；
 *   ② 字段变更卡共用一张（同一行类 `ilife-block-change-row`；零行＝整卡不出现）；
 *   ③ 四张卡各自判空（状态卡／变更卡／当日累计／明细卡，空的整卡不出现）；
 *   ④ 无 `undo_cli` 不出撤销入口（有给才出，两个方向都真跑）；
 *   ⑤ 来源脚注（老回执页缺的那一行，走 #422 `sourceLine`）；
 *   ⑥ 明细列按运动口径（日期／类型／时长／消耗／备注），**检索不到「克」**；
 *   ⑦ 页内导航锚点 ＋ `ilife-page-printable` ＋ 口径行（#420 三件接线）；
 *   ⑧ 三格式复制菜单走既有 `src/shared/copyArea.ts`（`data-fmt` 三项顺序固定 ＋ 复制日志）。
 * 另：页头写人话——`<title>` 与眉标里不许出现命令键（`calorie.view.*`）／票号／工序词「移植」。
 *
 * 变异自证两行（机器读数见 `docs/skills/skill-calorie/t423-回执族融合.md`）：
 *   - 去掉「零行整卡不出现」→ 本测试必红；写回原字节必绿；
 *   - 把明细列改回饮食口径（露「克」）→ 本测试必红；写回原字节必绿。
 * 两行都**先 `pnpm build` 再跑**（判据读 `dist/`，不编译则读数无效）。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-receipt-fusion-423.test.mjs`
 * （13 条产物同时落 `.scratch/t423/out/`，供人双击抽查）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildExerciseReceiptDoc } from '../dist/exercise/receipt.js';
import { OPERATION_ICONS, OPERATION_LABELS, OPERATION_TONES } from '../dist/shared/operationHead.js';
import { assertDocPage } from './doc-page-assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
/** 样例产物落点（票面：落 `.scratch/t423/`，不进版本库，回执给可双击绝对路径）。 */
const SAMPLES = join(REPO, '.scratch', 't423', 'out');
const D1 = '2026-09-05';
const D2 = '2026-09-06';
const D3 = '2026-09-07';
/** 库里没有这天（「空明细」判据用）。 */
const D_EMPTY = '2026-09-09';

mkdirSync(SAMPLES, { recursive: true });

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't423-exercise-'));
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
  console.log('T423-RUN ' + (outName ?? key) + ' exit=' + r.status + ' bytes=' + (file === null ? 0 : statSync(out).size));
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

/** 类名**落在标记上**（不是落在那条常驻样式规则里）——判「有没有这张卡」只认标记。
 *  区块根类带两段（`class="ilife-block ilife-block-<名>"`）、页面级件只一段，故按空格逐段精确比。 */
function hasClass(html, name) {
  return [...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(name));
}

/** 转义（与 base-paint 的冻结五字符表同口径；断言逐字命令时用得到）。 */
function escHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 页头文本（`<title>` 与眉标；人话判据读这两处）。 */
function headTexts(html) {
  return {
    title: (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '',
    eyebrow: (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '',
  };
}

/** 13 条写词共用的融合版式断言（八条判据 ＋ #264 已关票的原字）。
 *  `opts.changeRows: false` 供「零行＝整卡不出现」那一条用（那里变更卡按判据必须缺席）。 */
function assertFusion(r, what, opts = {}) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');

  // 页头写人话：<title> 与眉标不许出现命令键／票号／工序词「移植」。
  const head = headTexts(r.file);
  assert.equal(head.eyebrow, '运动 · 写后回执', what + ' 眉标不是 #264 的人话原文：' + head.eyebrow);
  for (const [where, text] of [['<title>', head.title], ['眉标', head.eyebrow]]) {
    assert.ok(!/calorie\.[a-z]/.test(text), what + ' 的' + where + '里有命令键：' + text);
    assert.ok(!/\bt\d{3}\b/i.test(text), what + ' 的' + where + '里有票号：' + text);
    assert.ok(!text.includes('移植'), what + ' 的' + where + '里有工序词「移植」：' + text);
  }
  assert.ok(!r.file.includes('calorie.view.'), what + ' 产物里出现命令键 calorie.view.*');
  assert.ok(!r.file.includes('移植'), what + ' 产物里出现工序词「移植」');

  // ① 四态头（#422 共用件，档名落类名）。
  assert.ok(/class="ilife-block-op-head ilife-block-op-head-(ok|warn|danger)"/.test(r.file),
    what + ' 缺四态头（ilife-block-op-head-<档>）');
  // ② 字段变更卡共用一张：行类只有一种（零行场景按判据必须整卡不出现，由 opts 关掉这一条）。
  if (opts.changeRows !== false) {
    assert.ok(hasClass(r.file, 'ilife-block-change-row'), what + ' 缺字段变更行（ilife-block-change-row）');
  }
  // ③ 页内导航锚点：每个 href 都有对应的页内 id。
  assert.ok(r.file.includes('<nav class="ilife-block-toc" aria-label="页内导航">'), what + ' 缺页内导航');
  const ids = new Set([...r.file.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...r.file.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 3, what + ' 页内导航只有 ' + hrefs.length + ' 个锚点');
  for (const href of hrefs) assert.ok(ids.has(href), what + ' 锚点 ' + href + ' 没有对应的页内 id');
  // ④ 可打印：类落版面根 ＋ 具名页绑定都在（#420 的 D5 端到端取证）。
  assert.ok(/<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">/.test(r.file),
    what + ' 的 ilife-page-printable 没有落在版面根上');
  assert.ok(r.file.includes('page: printable'), what + ' 版面根没有绑定具名页 @page printable');
  assert.ok(r.file.includes('@page printable'), what + ' 样式段缺具名页 @page printable');
  // ⑤ 三格式复制菜单 ＋ 复制日志（#264 原字，顺序固定）。
  assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  assert.ok(r.file.includes('ilife-copy-log'), what + ' 缺复制日志按钮');
  // ⑥ 来源脚注 ＋ 口径行（都走 #420 的口径说明行）。
  assert.ok(r.file.includes('数据来源 · '), what + ' 缺来源脚注');
  assert.ok((r.file.match(/class="ilife-block-caliber"/g) ?? []).length >= 2,
    what + ' 口径行／来源脚注不足两条（ilife-block-caliber）');
  // ⑦ 运动口径：不许露饮食口径的「克」。
  assert.ok(!r.file.includes('克'), what + ' 明细里露出饮食口径的「克」');
  // ⑧ 无 undo_cli：不出撤销入口（有给才出的那半在下面的直接调用用例里）。
  assert.ok(!r.file.includes('撤销'), what + ' 没有撤销指令却出了撤销入口');
  // #264 已关票的原字：对账信息折叠区 ＋ 整页体量。
  assert.ok(r.file.includes('对账信息'), what + ' 缺页尾对账折叠区');
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

/* ───────────────────────────── 13 条写词（冻结表逐字参数） ───────────────────────────── */

test('#423 记运动（13 条之 1，先验形状第一条）', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30 }, '01-add');
  assertFusion(r, '记运动');
  assert.ok(r.file.includes('ilife-block-op-head-ok'), '新增态色档不是 ok');
  assert.ok(r.file.includes('本次明细'), '缺新增内容卡（本次明细）');
  assert.ok(r.file.includes('慢跑'), '明细缺运动类型值');
  assert.ok(r.file.includes('当日累计'), '缺当日累计卡');
});

test('#423 记运动（含备注）', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, note: '夜跑' }, '02-add-note');
  assertFusion(r, '记运动（含备注）');
  assert.ok(r.file.includes('夜跑'), '新增内容缺备注值');
});

test('#423 记力量训练', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '卧推', calories: 150, category: '力量', loadKg: 60, reps: 10 }, '03-strength');
  assertFusion(r, '记力量训练');
  assert.ok(r.file.includes('卧推'), '新增内容缺动作名');
  assert.ok(r.file.includes('60'), '新增内容缺重量值');
});

test('#423 记有氧运动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5 }, '04-cardio');
  assertFusion(r, '记有氧运动');
  assert.ok(r.file.includes('户外跑'), '新增内容缺运动类型值');
  assert.ok(r.file.includes('5'), '新增内容缺距离值');
});

test('#423 记日常活动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '步行', calories: 80, minutes: 20, category: '日常', steps: 3000 }, '05-daily');
  assertFusion(r, '记日常活动');
  assert.ok(r.file.includes('步行'), '新增内容缺活动类型值');
  assert.ok(r.file.includes('3000'), '新增内容缺步数值');
});

test('#423 补记运动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D1 }, '06-backfill');
  assertFusion(r, '补记运动');
  assert.ok(r.file.includes(D1), '新增内容缺补记日期');
});

test('#423 批量补记运动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { items: [{ type: '慢跑', calories: 320, minutes: 30, date: D1 }] }, '07-batch');
  assertFusion(r, '批量补记运动');
  for (const word of ['批量计数', '写入', '跳过', '失败']) {
    assert.ok(r.file.includes(word), '计数卡缺「' + word + '」');
  }
  assert.ok(r.file.includes('逐条明细'), '缺逐条明细卡');
  assert.ok(r.file.includes('慢跑'), '逐条明细缺类型值');
});

test('#423 复制昨日运动', () => {
  const dir = mkDir();
  const today = todayISO();
  const yesterday = shiftISO(today, -1);
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: yesterday }, '08-seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.add', { copyFrom: 'yesterday' }, '08-copy');
  assertFusion(r, '复制昨日运动');
  for (const word of ['复制', '跳过', '目标日期', '逐条明细']) {
    assert.ok(r.file.includes(word), '复制回执缺「' + word + '」');
  }
});

test('#423 改运动记录', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, '09-seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.update', { id: 1, minutes: 40 }, '09-update');
  assertFusion(r, '改运动记录');
  assert.ok(r.file.includes('ilife-block-op-head-warn'), '修改态色档不是 warn');
  assert.ok(r.file.includes('改前 → 改后'), '缺改前改后对照卡');
  assert.ok(r.file.includes('30') && r.file.includes('40'), '对照卡缺 30→40 的真内容');
  assert.ok(r.file.includes('命中条数'), '缺命中计数');
  // 改类的改前改后必须在**同一张变更卡**里（共用一张：行类与卡外壳都只有一种）。
  const changeCard = cardOf(r.file, 'sec-change');
  assert.ok(changeCard.includes('ilife-block-change-row'), '变更卡外壳里没有变更行');
  assert.ok(changeCard.includes('ilife-block-change-row-old') && changeCard.includes('ilife-block-change-row-new'),
    '变更卡缺改前／改后两栏');
});

test('#423 改某日运动', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, '10-seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.update', { note: '补记', date: D2 }, '10-update-day');
  assertFusion(r, '改某日运动');
  assert.ok(r.file.includes('命中条数'), '缺命中计数');
  assert.ok(r.file.includes('改前 → 改后'), '缺改前改后对照卡');
  assert.ok(r.file.includes('补记'), '对照卡缺新值');
});

test('#423 删运动记录', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, '11-seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.remove', { id: 1 }, '11-remove');
  assertFusion(r, '删运动记录');
  assert.ok(r.file.includes('ilife-block-op-head-danger'), '删除态色档不是 danger');
  assert.ok(r.file.includes('删除条数'), '缺删除计数');
  assert.ok(r.file.includes('删除前快照'), '缺删除前快照卡');
  assert.ok(r.file.includes('慢跑'), '快照缺被删类型');
  // 软删除措辞单源（`shared/writeParts.ts`）：页内只引用，不写第二份。
  assert.ok(r.file.includes('软删除：行保留，已从查询与统计中排除；暂无恢复入口'), '删除措辞不是单源原文');
  assert.ok(!r.file.includes('可恢复'), '不得出现「可恢复」承诺');
});

test('#423 删某日运动', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, '12-seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.remove', { date: D2 }, '12-remove-day');
  assertFusion(r, '删某日运动');
  assert.ok(r.file.includes('删除条数'), '缺删除计数');
  assert.ok(r.file.includes(D2), '快照缺日期');
  // 当日累计判空：这天的唯一一条刚被删掉，写后现值 0 行 ⇒ 整卡不出现（不留 0 行的空表）。
  assert.ok(!r.file.includes('当日累计'), '该日已被删空，当日累计卡不该出现');
});

test('#423 批量删运动', () => {
  const dir = mkDir();
  for (const d of [D1, D2, D3]) {
    const s = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: d }, '13-seed-' + d);
    assert.equal(s.status, 0, 'seed ' + d + ' stderr=' + s.stderr.slice(-200));
  }
  const r = runCli(dir, 'calorie.exercise.remove', { from: D1, to: D2 }, '13-remove-range');
  assertFusion(r, '批量删运动');
  assert.ok(r.file.includes('删除条数'), '缺删除计数');
  assert.ok(r.file.includes('2 条'), '范围删应命中 2 条');
  assert.ok(r.file.includes('逐条明细'), '缺删除快照明细');
  // 明细列按运动口径（日期／类型／时长／消耗／备注）。
  const detailCard = cardOf(r.file, 'sec-detail');
  for (const col of ['日期', '类型', '时长', '消耗', '备注']) {
    assert.ok(detailCard.includes('>' + col + '</th>'), '明细卡缺运动口径列「' + col + '」');
  }
  for (const col of ['食物', '克', '碳水', '蛋白']) {
    assert.ok(!detailCard.includes(col), '明细卡还在用饮食口径「' + col + '」');
  }
});

/* ───────────────────────────── 空的判据（零行＝整卡不出现） ───────────────────────────── */

test('#423 零变更：复制昨日运动（当天已有同一条，整批跳过）→ 变更卡整卡不出现', () => {
  const dir = mkDir();
  const today = todayISO();
  const yesterday = shiftISO(today, -1);
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: yesterday }, '14-seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const first = runCli(dir, 'calorie.exercise.add', { copyFrom: 'yesterday' }, '14-copy-1');
  assert.equal(first.status, 0, '首次复制 stderr=' + first.stderr.slice(-200));
  const second = runCli(dir, 'calorie.exercise.add', { copyFrom: 'yesterday' }, '14-copy-2');
  assertFusion(second, '零变更（重复复制）', { changeRows: false });
  assert.ok(second.file.includes('无改动'), '零变更没印「无改动」');
  assert.ok(!hasClass(second.file, 'ilife-block-change-row'), '零变更页不该出现变更行');
  assert.ok(!second.file.includes('逐条明细'), '零变更页没有逐条明细却出了明细卡标题');
  assert.equal(cardOf(second.file, 'sec-change'), '', '零变更页留下了空卡外壳');
});

test('#423 零变更：改运动记录（新旧同值）→ 变更卡整卡不出现', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, '15-seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.update', { id: 1, minutes: 30 }, '15-no-change');
  assertFusion(r, '零变更（同值改）', { changeRows: false });
  assert.ok(!r.file.includes('改前 → 改后'), '同值改不该出现变更卡标题（整卡不出现）');
  assert.ok(!hasClass(r.file, 'ilife-block-change-row'), '同值改不该出现变更行');
  assert.equal(cardOf(r.file, 'sec-change'), '', '同值改留下了空卡外壳');
});

test('#423 空明细：装配层构造（库里的空日子在真出口按缺失阻断，产不出产物）', () => {
  // 一条写词都不改：无记录时两条写命令按缺失阻断退出 4（实测），故「空明细产物」只能装配层构造。
  const dir = mkDir();
  const blocked = runCli(dir, 'calorie.exercise.remove', { date: D_EMPTY }, '16-empty-day-blocked');
  assert.equal(blocked.status, 4, '空日子删除今天应缺失阻断退出 4（实测读数）');
  const db = withDb(dir);
  const r = { file: buildExerciseReceiptDoc(db, 'calorie.exercise.remove', fakeReceipt({ op: 'delete', scene: '删某日运动', action: '删某日运动', summary: '已删除 0 条' }), 'calorie-cmd-read calorie.exercise.remove', { rows: [] }) };
  assertDocPage(r.file, '空明细');
  assert.ok(r.file.includes('ilife-block-op-head-danger'), '缺四态头');
  assert.ok(r.file.includes('删除条数'), '缺删除计数（0 条也要报）');
  assert.equal(cardOf(r.file, 'sec-change'), '', '没有快照却出了快照卡（整卡该不出现）');
  assert.equal(cardOf(r.file, 'sec-detail'), '', '没有明细却出了明细卡（整卡该不出现）');
  assert.ok(!r.file.includes('逐条明细'), '没有明细却出了明细卡标题');
  assert.ok(!r.file.includes('当日累计'), '没有行却出了当日累计卡');
  assert.ok(!hasClass(r.file, 'ilife-block-change-row'), '空明细页不该出现变更行');
  assert.ok(!r.file.includes('撤销'), '没有撤销指令却出了撤销入口');
  db.close();
});

/* ───────────────── 直接调用（读得到的分支：撤销两方向／状态卡判空／四态表单源） ───────────────── */

/** 直接调用用的空库（写命令真跑过的那张库不动，这里只看装配分支）。 */
function withDb(dir) {
  return openDb(join(dir, DB_FILENAME));
}

function fakeReceipt(over = {}) {
  return {
    scene: '运动', action: '记运动', op: 'create', recordId: 7, summary: '已写入运动记录',
    items: [], tagDiff: null, distance: null, noChange: false,
    meta: { actionAt: '2026-09-14 10:00:00', entityType: 'exercise_log', wakeWord: '记运动', source: 'exercise_log (写库回执)' },
    m5Contract: '1', affectedRows: 1, affectedRowsSource: 'sqlite:total_changes',
    ids: [7], idSource: 'record', writtenFields: ['type'],
    m5Line: 'id=7 | 日期 2026-09-14 10:00:00 | 影响 1 行 | 字段 type',
    ...over,
  };
}

test('#423 无 undo_cli 不出撤销入口；给了才出（两个方向）', () => {
  const dir = mkDir();
  const db = withDb(dir);
  const key = 'calorie.exercise.add';
  const receipt = fakeReceipt();
  const rows = [{ id: 7, exercise_type: '慢跑', date: D1, duration_minutes: 30, calories_burned: 320, note: '夜跑' }];
  const bare = buildExerciseReceiptDoc(db, key, receipt, 'calorie-cmd-read ' + key, { rows });
  assert.ok(!bare.includes('撤销'), '没给撤销指令却出了撤销入口');
  const undoCli = 'calorie-cmd-read calorie.exercise.update --params \'{"id":7,"minutes":30}\'';
  const withUndo = buildExerciseReceiptDoc(db, key, receipt, 'calorie-cmd-read ' + key, { rows, undoCli });
  assert.ok(withUndo.includes('撤销'), '给了撤销指令却没出撤销入口');
  assert.ok(withUndo.includes(escHtml(undoCli)), '撤销入口缺可复制的撤销指令原文');
  db.close();
});

test('#423 状态卡判空：没有写入也没有改动 → KPI 区整块不出现', () => {
  const dir = mkDir();
  const db = withDb(dir);
  const key = 'calorie.exercise.add';
  const empty = buildExerciseReceiptDoc(
    db, key,
    fakeReceipt({ affectedRows: 0, writtenFields: [], noChange: false }),
    'calorie-cmd-read ' + key,
    { rows: [] },
  );
  assert.ok(!hasClass(empty, 'ilife-block-kpi-card'), '没内容却出了 KPI 卡');
  assert.ok(!empty.includes('>写入字段</div>'), '没内容却出了写入字段卡');
  // 有改动才出（零变更时印「无改动」）。
  const changed = buildExerciseReceiptDoc(
    db, key, fakeReceipt({ noChange: true }), 'calorie-cmd-read ' + key, { rows: [] },
  );
  assert.ok(hasClass(changed, 'ilife-block-kpi-card') && changed.includes('无改动'), '零变更没出状态卡');
  // 写入字段为空 ⇒ 只有这一格不出现，其余照常。
  assert.ok(!empty.includes('>写入字段</div>') && changed.includes('>影响行数</div>'), 'KPI 逐格判空不成立');
  db.close();
});

test('#423 四态头三表单源（#422 共用件逐值）', () => {
  assert.deepEqual(Object.keys(OPERATION_LABELS).sort(), ['add', 'create', 'delete', 'update']);
  assert.deepEqual(
    ['create', 'add', 'update', 'delete'].map((op) => OPERATION_LABELS[op]),
    ['新增', '新增', '修改', '删除'],
  );
  assert.deepEqual(
    ['create', 'add', 'update', 'delete'].map((op) => OPERATION_TONES[op]),
    ['ok', 'ok', 'warn', 'danger'],
  );
  assert.deepEqual(
    ['create', 'add', 'update', 'delete'].map((op) => OPERATION_ICONS[op]),
    ['✓', '✓', '✎', '✕'],
  );
});

test('#423 运动类别色：四组「键→色值」绑定全仓只一处定义（#422 单源防回归）', () => {
  const bindings = [/strength\s*:\s*'#5856d6'/, /cardio\s*:\s*'#0071e3'/, /flex\s*:\s*'#34c759'/, /daily\s*:\s*'#ff9500'/];
  const srcFiles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (path.endsWith('.ts')) srcFiles.push(path);
    }
  };
  walk(join(REPO, 'packages'));
  for (const binding of bindings) {
    const hits = srcFiles.filter((file) => binding.test(readFileSync(file, 'utf8')));
    assert.equal(hits.length, 1, '色值绑定 ' + binding + ' 命中 ' + hits.length + ' 个文件：' + hits.join('、'));
    assert.ok(hits[0].endsWith(join('exercise', 'categoryColors.ts')), '色值绑定不在单源件里：' + hits[0]);
  }
});
