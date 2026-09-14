/** #445 · 告警线门：**扫描面 ＋ 台账逐件对账**（漏报必红／陈化必红／还原必绿）。
 *
 * 期望值来源（只认需求原文与手算，不拿新实现输出当期望）：
 *   ① 票面「验收命令」第 2 条：造一个真超线件（360 行）不入台账 → `exit ≠ 0` 且输出点名该件与行数；
 *      删掉 → 回 PASS。
 *   ② 票面第 3 条：台账某行行数与实际不符 → 必红并指出「台账 ≠ 实况」；还原 → 必绿。
 *   ③ 票面第 4 条（负向对照）：扫描面缩回硬清单 → 第 2 条的那个超线件**拿不到红条**（说明这道门
 *      确实靠扫描面撑着）。
 *   ④ `packages/skill-calorie/AGENTS.md`「台账」一节：`件／挂号值／当场实测／结论` 四列，
 *      冻结挂号值 `src/render/wizardPort.ts｜457`、`scripts/gen-cli.mjs｜729`。
 *
 * 夹具＝`mkdtempSync` 出来的独占小包根（自带 `src/`＋`scripts/`＋`AGENTS.md`），全部走
 * `--root`／`--agents` 两个夹具入口；**真实门禁读一份**（无参运行，读本包真台账）。夹具用完即删，
 * 删除前过 §2.1-3 路径守卫；不碰真库、不碰任何源码件。
 *
 * 改坏必红实证（每条断言都附）：
 *   · 漏报：夹具多一件 360 行的 `src/surprise.ts` → T2 当场断言那一条 RED（把门弄瞎才会失败）；
 *   · 陈化：夹具台账把 `src/over.ts` 的当场实测写成 999 → T3 当场断言 `台账陈化` 那条 RED；
 *   · 缩面：同一棵探针树上「缩面 stub 绿（exit 0）／扩面真门红（exit 1）」→ T4 两条一起断言；
 *   · 真台账陈化往返（真 `AGENTS.md` 改坏→红→逐字节还原→绿）：持锁另做，读数见
 *     `docs/skills/skill-calorie/t445-告警线门证据.md` 的 F1／F2。
 *
 * 运行：`node --test packages/skill-calorie/test/t445-告警线门.test.mjs`
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const GATE = path.join(PKG, 'scripts', 'check-warning-line.mjs');
const OVER_LINE = '已超线，需要根据规则进行重构。';
/** 冻结挂号值（来源＝`docs/skills/skill-calorie/t169-设计定稿.md` 票 2 票面，与门脚本 REQUIRED 同源）。 */
const FROZEN = [
  ['src/render/wizardPort.ts', 457],
  ['scripts/gen-cli.mjs', 729],
];

/** 造「`n` 个 LF」的占位正文。 */
const body = (n) => Array.from({ length: n }, (_, i) => `// t445 夹具第 ${i + 1} 行`).join('\n') + '\n';
const lfOf = (abs) => readFileSync(abs, 'utf8').split('\n').length - 1;

function makeFixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 't445-gate-'));
  mkdirSync(path.join(dir, 'src', 'render'), { recursive: true });
  mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  // 两个冻结挂号件：行数与冻结值一起写死，⑦（挂号台账两行齐全）才不是夹具自己造的假绿。
  for (const [rel, lf] of FROZEN) writeFileSync(path.join(dir, rel), body(lf), 'utf8');
  writeFileSync(path.join(dir, 'src', 'over.ts'), body(360), 'utf8');
  writeFileSync(path.join(dir, 'src', 'small.ts'), body(10), 'utf8');
  return { dir, agents: path.join(dir, 'AGENTS.md') };
}

/** 写夹具台账；`实测[rel]` 给值时按它写（故意写错用），缺省＝读盘上真行数。 */
function writeLedger(fx, 实测 = {}) {
  const cell = (rel) => (实测[rel] === undefined ? lfOf(path.join(fx.dir, rel)) : 实测[rel]);
  const rows = [
    ...FROZEN.map(([rel, frozen]) => `| \`${rel}\` | ${frozen} | ${cell(rel)} | ${OVER_LINE}夹具行（挂号值＝冻结值） |`),
    `| \`src/over.ts\` | — | ${cell('src/over.ts')} | ${OVER_LINE}夹具故意撑到 350 以上，用来验漏报门 |`,
  ];
  writeFileSync(fx.agents, [
    '# t445 夹具包内规矩',
    '',
    '**告警线＝350 行。数法：LF 口径，只数 `\\n`。**',
    '',
    `超线即报一句「${OVER_LINE}」。`,
    '',
    '<!-- warning-line-ledger:begin -->',
    '| 件 | 挂号值 | 当场实测 | 结论 |',
    '|---|---|---|---|',
    ...rows,
    '<!-- warning-line-ledger:end -->',
    '',
  ].join('\n'), 'utf8');
}

function runGate(args, cwd = PKG) {
  const r = spawnSync(process.execPath, [GATE, ...args], { cwd, encoding: 'utf8' });
  return { exit: r.status, text: `${r.stdout || ''}${r.stderr || ''}` };
}

function cleanup(dir) {
  const root = path.resolve(os.tmpdir());
  const abs = path.resolve(dir);
  assert.ok(abs.startsWith(root + path.sep), `路径守卫拒绝删除临时根之外的路径：${abs}`);
  assert.match(path.basename(abs), /^t445-gate-/, `路径守卫拒绝删除非本票前缀的目录：${abs}`);
  rmSync(abs, { recursive: true, force: true });
}

test('T1 夹具自身是绿的：台账齐全且与实况一致', () => {
  const fx = makeFixture();
  try {
    writeLedger(fx);
    const g = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.equal(g.exit, 0, `夹具基线应绿，实际 exit=${g.exit}\n${g.text}`);
    assert.match(g.text, /PASS: 告警线台账齐全且与实况一致/);
  } finally {
    cleanup(fx.dir);
  }
});

test('T2 漏报必红：盘上多一个 360 行未挂号件 → exit≠0 且点名该件与行数', () => {
  const fx = makeFixture();
  try {
    writeLedger(fx);
    // 改坏：造一个真超线件、不入台账（票面验收 2）
    writeFileSync(path.join(fx.dir, 'src', 'surprise.ts'), body(360), 'utf8');
    const g = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.notEqual(g.exit, 0, `漏报必须红，实际 exit=0\n${g.text}`);
    assert.match(g.text, /RED 漏报（台账没有）：src\/surprise\.ts LF=360/);
    // 还原必绿：删掉探针件（票面验收 2 的第二行读数）
    rmSync(path.join(fx.dir, 'src', 'surprise.ts'));
    const g2 = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.equal(g2.exit, 0, `删掉探针件后该回绿，实际 exit=${g2.exit}\n${g2.text}`);
    assert.match(g2.text, /PASS: 告警线台账齐全且与实况一致/);
  } finally {
    cleanup(fx.dir);
  }
});

test('T3 陈化必红：台账行数 ≠ 实况 → exit≠0 且指出「台账 ≠ 实况」', () => {
  const fx = makeFixture();
  try {
    // 改坏：台账把 src/over.ts 的「当场实测」写成 999（盘上是 360）
    writeLedger(fx, { 'src/over.ts': 999 });
    const g = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.notEqual(g.exit, 0, `陈化必须红，实际 exit=0\n${g.text}`);
    assert.match(g.text, /RED 台账陈化：src\/over\.ts 台账=999 实况=360/);
    // 还原必绿
    writeLedger(fx);
    const g2 = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.equal(g2.exit, 0, `还原后该回绿，实际 exit=${g2.exit}\n${g2.text}`);
    assert.match(g2.text, /PASS: 告警线台账齐全且与实况一致/);
  } finally {
    cleanup(fx.dir);
  }
});

test('T4 负向对照：扫描面缩回硬清单 → 同一个探针件拿不到红条（缩面即失明）', () => {
  const fx = makeFixture();
  try {
    writeLedger(fx);
    writeFileSync(path.join(fx.dir, 'src', 'surprise.ts'), body(360), 'utf8');
    // 缩面口径＝#445 之前的门：只查 REQUIRED 两行「存在」，不看扫描面
    const stub = path.join(fx.dir, 'scripts', 'shrunk-face-control.mjs');
    writeFileSync(stub, [
      "import { readFileSync } from 'node:fs';",
      "const text = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8');",
      `for (const p of ${JSON.stringify(FROZEN.map(([p]) => p))}) {`,
      "  if (!text.includes(p)) { console.log('RED 台账缺行：' + p); process.exit(1); }",
      '}',
      "console.log('RESULT: 2/2');",
      "console.log('PASS: 硬清单存在性（缩面口径）');",
    ].join('\n'), 'utf8');
    const shrunk = spawnSync(process.execPath, [stub], { cwd: fx.dir, encoding: 'utf8' });
    const real = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.equal(shrunk.status, 0,
      `缩面口径应当对未挂号的 360 行件毫无反应（这正是要对照的失效），实际 exit=${shrunk.status}`);
    assert.notEqual(real.exit, 0, `扩面口径必须在同一棵树上红，实际 exit=0\n${real.text}`);
    assert.match(real.text, /RED 漏报（台账没有）：src\/surprise\.ts LF=360/);
  } finally {
    cleanup(fx.dir);
  }
});

test('T5 真包门禁：无参运行读真台账 → PASS（台账与当刻实况一致）', () => {
  const g = runGate([]);
  assert.equal(g.exit, 0, `真包告警线门应绿，实际 exit=${g.exit}\n${g.text}`);
  assert.match(g.text, /SCAN-ROOT: .*packages[\\/]skill-calorie/);
  assert.match(g.text, /LEDGER: .*packages[\\/]skill-calorie[\\/]AGENTS\.md/);
  assert.match(g.text, /PASS: 告警线台账齐全且与实况一致/);
  const m = g.text.match(/RESULT: (\d+)\/(\d+)/);
  assert.ok(m, `缺 RESULT 摘要行\n${g.text}`);
  assert.equal(m[1], m[2], `RESULT 不是 n/n：${m[0]}`);
});
