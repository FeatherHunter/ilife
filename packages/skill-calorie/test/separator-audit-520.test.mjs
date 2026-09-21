/** #516 · 分隔符与内部标识符门（`scripts/audit-separators.mjs`）的靶向测试。
 *
 * 期望值来源（只认票面与用户裁定原文，**不拿新实现的输出当期望**）：
 *   ① 票面「验收命令」第 1 条：判据自身必须有识别力——对**当刻 31 页产物**跑一遍必须判红，
 *      对一份**合格样板**跑同一组判据必须判绿。
 *   ② 票面「必须落进基准的六件事」第 5 条：判据＝分隔符探针的**节点级**读数全零；
 *      形状化清单（徽章列／卡片格／键值行／进度条／小表／结论条）归基准件，不进本门。
 *   ③ 用户原话（逐字）：「当一个内容需要通过 `；` 和 `·` 分割时，代表需要进行 UI 上的设计，
 *      该问题是用这些符号简化了 UI 展示的设计」。
 *   ④ 本票新增判据（R4 `｜`／R5 `、`／R6 `~`／R7 内部标识符）的可达性依据：票 #467 已验收的
 *      样板页 `.scratch/t467/看今日目标进度*.html` 在这四条上本来就读 0（读数见
 *      `docs/skills/skill-calorie/t516-证据.md`）——**尺子抬到没人够得着不算判据**，故这四条必须
 *      在**一份真·合格页**上验过绿，本测试用仓内 31 页产物验红、用内联最小合格样板验绿。
 *
 * 夹具：`mkdtempSync` 出来的独占临时目录（用完即删，删除前过 §2.1-3 路径守卫）；
 * 变异一律**写坏 → 断言红 → 逐文件还原 → 断言绿**，且每个变异锚点在原文里**必须唯一命中**
 * （命中 0 或多次当场抛错，免得变异打在没被读到的地方还自认通过）。
 *
 * 运行：`node --test packages/skill-calorie/test/separator-audit-520.test.mjs`
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const ROOT = path.resolve(PKG, '..', '..');
const GATE = path.join(PKG, 'scripts', 'audit-separators.mjs');
/** 票面点名的 31 页产物目录（未受版本控制；不存在即跳过「真基线」两例，不静默变绿）。 */
const PRODUCTS = path.join(ROOT, '.scratch', 't387', 'html');
/** 票 #467 已验收的合格页（未受版本控制；存在时用于交叉验证判据可达）。 */
const T467 = path.join(ROOT, '.scratch', 't467');

/** 一份**内联最小合格页**：无分号并列、无顿点、无波浪号、无竖线、无内部标识符。 */
const GOOD = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>卡路里 目标进度</title>
<style>.x{font-size:14px}</style>
</head>
<body>
<section class="ilife-block-page-shell">
<p class="ilife-block-page-shell-eyebrow">目标进度</p>
<h1 class="ilife-block-page-shell-title">今日目标进度</h1>
<div class="ilife-block-kpi-card"><span class="ilife-block-kpi-card-label">本周累计缺口</span>
<span class="ilife-block-kpi-card-value">7582 卡</span></div>
</section>
</body>
</html>
`;

function run(args, opts = {}) {
  return spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8', ...opts });
}
const summaryOf = (r) => (r.stdout.match(/^RESULT: .*$/m) || [''])[0];
const verdictOf = (r) => (r.stdout.match(/^(PASS|FAIL)$/m) || [''])[0];

function tmpDir() {
  return mkdtempSync(path.join(os.tmpdir(), 't516-sep-'));
}
/** §2.1-3 路径守卫：只删自己刚建的临时根。 */
function cleanup(dir) {
  const abs = path.resolve(dir);
  assert.ok(abs.startsWith(path.resolve(os.tmpdir())), '删除前先过路径守卫：不在临时根之下 ' + abs);
  rmSync(abs, { recursive: true, force: true });
}

/** 变异：锚点必须**唯一命中**（0 次＝打在没被读到的地方；多次＝改哪处不确定），否则抛错。 */
function mutate(src, anchor, replacement) {
  const at = src.split(anchor).length - 1;
  assert.equal(at, 1, '变异锚点必须唯一命中，实况命中 ' + at + ' 次：' + anchor);
  return src.replace(anchor, replacement);
}

test('T1 · 合格样板判绿：RESULT 3/3、PASS、exit 0', () => {
  const dir = tmpDir();
  try {
    for (const n of ['a.html', 'b.html', 'c.html']) writeFileSync(path.join(dir, n), GOOD, 'utf8');
    const r = run(['--dir', dir]);
    assert.equal(summaryOf(r), 'RESULT: 3/3', r.stdout);
    assert.equal(verdictOf(r), 'PASS');
    assert.equal(r.status, 0);
  } finally { cleanup(dir); }
});

test('T2 · 单文件入口与 --json 落盘：读数与摘要一致', () => {
  const dir = tmpDir();
  try {
    const f = path.join(dir, 'good.html');
    const j = path.join(dir, 'out.json');
    writeFileSync(f, GOOD, 'utf8');
    const r = run([f, '--json', j]);
    assert.equal(r.status, 0, r.stdout);
    const rec = JSON.parse(readFileSync(j, 'utf8'));
    assert.equal(rec.files, 1);
    assert.equal(rec.green, 1);
    assert.equal(rec.nodeHitsTotal, 0);
    assert.deepEqual(rec.totals, { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0 });
  } finally { cleanup(dir); }
});

test('T3 · 用法错 exit 2（没有输入件 / --dir 指向文件）', () => {
  const noArgs = run([]);
  assert.equal(noArgs.status, 2);
  assert.match(noArgs.stdout, /ABORT exit=2/);
  const dir = tmpDir();
  try {
    const f = path.join(dir, 'good.html');
    writeFileSync(f, GOOD, 'utf8');
    const notDir = run(['--dir', f]);
    assert.equal(notDir.status, 2);
    assert.match(notDir.stdout, /不是目录/);
  } finally { cleanup(dir); }
});

/** 逐条判据的变异电池：每个锚点在合格样板里唯一命中；改坏一处 ⇒ 必红**且点名该规则**；还原 ⇒ 必绿。 */
const MUTANTS = [
  ['R1 顿点并列符', '<h1 class="ilife-block-page-shell-title">今日目标进度</h1>', '<p class="ilife-block-page-shell-eyebrow">目标进度 · 今日</p>', 'R1'],
  ['R2 分号并列', '<span class="ilife-block-kpi-card-value">7582 卡</span>', '<span class="ilife-block-kpi-card-value">7582 卡；共 7 天</span>', 'R2'],
  ['R3 ≥3 段并列', '<span class="ilife-block-kpi-card-value">7582 卡</span>', '<span class="ilife-block-kpi-card-value">7 天 / 5 工作日 / 2 周末</span>', 'R3'],
  ['R4 竖线', '<span class="ilife-block-kpi-card-label">本周累计缺口</span>', '<span class="ilife-block-kpi-card-label">本周累计缺口｜共 7 天</span>', 'R4'],
  ['R5 顿号', '<span class="ilife-block-kpi-card-label">本周累计缺口</span>', '<span class="ilife-block-kpi-card-label">工作日、周末</span>', 'R5'],
  ['R6 波浪号顶替文字', '<span class="ilife-block-kpi-card-value">7582 卡</span>', '<span class="ilife-block-kpi-card-value">2026-09-09 ~ 2026-09-15</span>', 'R6'],
  ['R7 命令键＋命令原文', '<h1 class="ilife-block-page-shell-title">今日目标进度</h1>', '<h1 class="ilife-block-page-shell-title">calorie-cmd-read calorie.view.goal-progress</h1>', 'R7'],
  ['R7 驼峰参数名', '<span class="ilife-block-kpi-card-label">本周累计缺口</span>', '<span class="ilife-block-kpi-card-label">horizonDays 7</span>', 'R7'],
  ['R7 库表名＋蛇形名', '<span class="ilife-block-kpi-card-label">本周累计缺口</span>', '<span class="ilife-block-kpi-card-label">calorie_data.db</span>', 'R7'],
  ['R7 票号', '<span class="ilife-block-kpi-card-label">本周累计缺口</span>', '<span class="ilife-block-kpi-card-label">#516 / t516</span>', 'R7'],
  ['R7 常量名', '<span class="ilife-block-kpi-card-label">本周累计缺口</span>', '<span class="ilife-block-kpi-card-label">MAX_SEG 40</span>', 'R7'],
];

test('T4 · 变异电池：十一个锚点各自改坏必红（点名规则）＋逐文件还原必绿', () => {
  for (const [name, anchor, replacement, rule] of MUTANTS) {
    const dir = tmpDir();
    const f = path.join(dir, 'good.html');
    try {
      writeFileSync(f, GOOD, 'utf8');
      const before = run([f]);
      assert.equal(summaryOf(before), 'RESULT: 1/1', name + ' 变异前本应读绿：' + before.stdout);

      const broke = mutate(GOOD, anchor, replacement);
      writeFileSync(f, broke, 'utf8');
      const red = run([f, '--json', path.join(dir, 'red.json')]);
      assert.equal(red.status, 1, name + ' 改坏后应 exit 1：' + red.stdout);
      assert.equal(summaryOf(red), 'RESULT: 0/1', name);
      assert.equal(verdictOf(red), 'FAIL', name);
      const rec = JSON.parse(readFileSync(path.join(dir, 'red.json'), 'utf8'));
      assert.ok(rec.totals[rule] > 0, name + ' 应在 ' + rule + ' 上命中，实况 ' + JSON.stringify(rec.totals));

      writeFileSync(f, GOOD, 'utf8');
      const back = run([f]);
      assert.equal(summaryOf(back), 'RESULT: 1/1', name + ' 还原后本应读绿：' + back.stdout);
      assert.equal(back.status, 0, name);
    } finally { cleanup(dir); }
  }
});

test('T5 · 真基线（31 页产物）识别力：有违规必红，已清零则绿', { skip: !existsSync(PRODUCTS) }, () => {
  // 编排者2026-09-16裁决（#572）：原“改前必红RESULT 0/31”前提过期（产物已清零）。
  // 识别力历史证明见版本史（曾红现绿）；当刻识别力由T4变异电池承担。
  const r = run(['--dir', PRODUCTS, '--quiet']);
  const m = /RESULT: (\d+)\/(\d+)/.exec(summaryOf(r));
  assert.ok(m, '读不到 RESULT 摘要：' + r.stdout);
  if (m[1] === m[2]) return; // 基线已清零：绿即对
  assert.equal(verdictOf(r), 'FAIL'); // 有违规：必须红
  assert.equal(r.status, 1);
});

test('T6 · 交叉验证：票 #467 已验收的合格页在三份上都读绿', { skip: !existsSync(T467) }, () => {
  const files = ['看今日目标进度.html', '看今日目标进度-近30天.html', '看今日目标进度-空窗.html']
    .map((n) => path.join(T467, n)).filter(existsSync);
  assert.ok(files.length > 0, '没找到 #467 的合格页');
  const r = run([...files, '--quiet']);
  assert.equal(summaryOf(r), 'RESULT: ' + files.length + '/' + files.length, r.stdout);
  assert.equal(r.status, 0, r.stdout);
});

test('T7 · 节点级与行级分开报：行级是粗口径，门只看节点级', () => {
  const dir = tmpDir();
  try {
    // 一行里放两个节点、其中只有一个含债 ⇒ 行级命中 1、节点级命中 1，且节点级能点名归属元素。
    const oneLine = '<!doctype html><head><title>卡路里 目标进度</title></head>'
      + '<body><p class="ilife-block-page-shell-eyebrow">目标进度</p><p class="ilife-block-kpi-card-label">目标进度 · 今日</p></body>\n';
    const f = path.join(dir, 'one.html');
    writeFileSync(f, oneLine, 'utf8');
    const j = path.join(dir, 'one.json');
    run([f, '--json', j]);
    const rec = JSON.parse(readFileSync(j, 'utf8'));
    assert.equal(rec.rows[0].line.hits.length, 1);
    assert.equal(rec.rows[0].node.hits.length, 1);
    assert.equal(rec.rows[0].node.hits[0].owner, 'ilife-block-kpi-card-label');
    assert.equal(rec.rows[0].node.hits[0].zone, 'body');
  } finally { cleanup(dir); }
});
