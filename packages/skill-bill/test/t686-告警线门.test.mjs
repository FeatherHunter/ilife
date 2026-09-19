/** #686 · 告警线门（饼干这一侧）：**扫描面 ＋ 台账逐件对账**（漏报必红／陈化必红／还原必绿）。
 *
 * 形状照抄兄弟件 `packages/skill-calorie/test/t445-告警线门.test.mjs`（298 行），数字与件名本包现场测。
 * 期望值来源（只认需求原文与手算，不拿新实现输出当期望）：
 *   ① 票面「验收」：造一个真超线件（360 行）不入台账 → `exit ≠ 0` 且输出点名该件与行数；删掉 → 回 PASS。
 *   ② 台账某行行数与实际不符 → 必红并指出「台账陈化」；还原 → 必绿。
 *   ③ **负向对照**：扫描面缩回硬清单 → 那个超线件**拿不到红条**（说明这道门确实靠扫描面撑着）。
 *   ④ `packages/skill-bill/AGENTS.md`「台账」一节：`件／挂号值／当场实测／结论` 四列，
 *      冻结挂号值 `src/cli/cmd_read.ts｜558`（来源＝该包 `AGENTS.md` 里 t406 那张表的逐字读数）。
 *
 * 夹具＝`mkdtempSync` 出来的独占小包根（自带 `src/`＋`scripts/`＋`AGENTS.md`），全部走
 * `--root`／`--agents` 两个夹具入口；**真实门禁读两份**（无参运行读本包真台账：T5 绿、T9 同步器零改动）。
 *
 * **T5／T9 的红＝全仓当刻状态**：这两例直接跑真包真台账，而本仓多席共用一个工作区 ⇒ **他席在飞的
 * 超线件**（或任何扫描面内的件被改过行数／新增／删除）都会让本票靶向测试转红。**那是这道门的设计行为，
 * 不是本票缺陷**；夹具九例（T1–T4、T6–T8、T10）不受影响。修法就一条仓内命令：
 * `node packages/skill-bill/scripts/check-warning-line.mjs --sync`。
 * 「`--sync --dry` 的读数照**当刻状态**报」：**计划非空即非 0 退出**、末行明说「未落盘」（T8 钉住这条），
 * 台账已一致时才是 `exit 0`＋`SYNC-DRY ok`（T9 钉住另一条）——免得把「计划落盘后」的 n/n 误读成已绿。
 * 夹具用完即删，删除前过路径守卫；不碰真库、不碰任何源码件。
 *
 * 改坏必红实证（每条断言都附）：
 *   · 漏报：夹具多一件 360 行的 `src/surprise.ts` → T2 当场断言那一条 RED（把门弄瞎才会失败）；
 *   · 陈化：夹具台账把 `src/over.ts` 的当场实测写成 999 → T3 当场断言 `台账陈化` 那条 RED；
 *   · 缩面：同一棵探针树上「缩面 stub 绿（exit 0）／扩面真门红（exit 1）」→ T4 两条一起断言；
 *   · 生成物判据：T6 生成器声明过的 360 行生成物不挂号也不报漏报；T7 把输出声明改成判据认不出的
 *     写法 → `RED 生成物判据自证` ＋ 生成物掉回扫描面被点名（判据不许静默失效）；
 *   · 无缩面开关：T10 传 `--no-scan`／`--skip-generated` 一类未知开关，读数与无参一字不差；
 *   · 同步器：T8 `--sync --dry` 报计划但**不改文件**、`--sync` 落盘后门回绿且台账块外一字不动、
 *     冻结挂号值不被改写；T9 真包 `--sync --dry` 零改动且不动文件；
 *   · 真台账陈化往返（真 `AGENTS.md` 改坏→红→一次 `--sync` 还原→绿）：持锁另做，读数见
 *     `docs/skills/skill-bill/t686-告警线门-证据.md` 的 SYNC 窗口。
 *
 * 运行：`node --test packages/skill-bill/test/t686-告警线门.test.mjs`
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
const LEDGER_BEGIN = '<!-- warning-line-ledger:begin -->';
const LEDGER_END = '<!-- warning-line-ledger:end -->';
/** 冻结挂号值（来源＝`packages/skill-bill/AGENTS.md` 里 t406 那张表逐字，与门脚本 `REQUIRED` 同源）。 */
const FROZEN = [
  ['src/cli/cmd_read.ts', 558],
];
/** 生成物夹具件（由夹具生成器 `scripts/gen-x.mjs` 声明产出）。 */
const GENERATED = 'src/triggers/big.generated.ts';

/** 造「`n` 个 LF」的占位正文。 */
const body = (n) => Array.from({ length: n }, (_, i) => `// t686 夹具第 ${i + 1} 行`).join('\n') + '\n';
const lfOf = (abs) => readFileSync(abs, 'utf8').split('\n').length - 1;

/** 生成器夹具：输出声明写法＝判据认的那种（`const OUT = join(SRC_DIR, …)`）。 */
const genSource = (decl) => [
  "import { writeFileSync } from 'node:fs';",
  "const SRC_DIR = 'src';",
  decl,
  "writeFileSync(OUT, '/** 本文件由 `scripts/gen-x.mjs` 生成，勿手改。 */');",
].join('\n');

function makeFixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 't686-gate-'));
  mkdirSync(path.join(dir, 'src', 'cli'), { recursive: true });
  mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  // 冻结挂号件：行数与冻结值一起写死，⑦（挂号台账行齐全）才不是夹具自己造的假绿。
  for (const [rel, lf] of FROZEN) writeFileSync(path.join(dir, rel), body(lf), 'utf8');
  writeFileSync(path.join(dir, 'src', 'over.ts'), body(360), 'utf8');
  writeFileSync(path.join(dir, 'src', 'small.ts'), body(10), 'utf8');
  // 名字对得上生成器判据（`gen-*.mjs`）⇒ 必须有一条判据认得的输出声明，否则「有生成器却一条输出
  // 声明都抽不到」会红——那是真包该红的情形，不是夹具该背的（T7 专门把它改坏）。
  writeFileSync(path.join(dir, 'scripts', 'gen-x.mjs'), genSource(`const OUT = join(SRC_DIR, 'triggers', 'big.generated.ts');`), 'utf8');
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
    '# t686 夹具包内规矩',
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

/** 造夹具里的生成物：件头带「勿手改」印记 ＋ 360 行。 */
function writeGenerated(fx) {
  const abs = path.join(fx.dir, GENERATED);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, '/** 本文件由 `scripts/gen-x.mjs` 生成，勿手改。 */\n' + body(359), 'utf8');
}

function runGate(args, cwd = PKG) {
  const r = spawnSync(process.execPath, [GATE, ...args], { cwd, encoding: 'utf8' });
  return { exit: r.status, text: `${r.stdout || ''}${r.stderr || ''}` };
}

function cleanup(dir) {
  const root = path.resolve(os.tmpdir());
  const abs = path.resolve(dir);
  assert.ok(abs.startsWith(root + path.sep), `路径守卫拒绝删除临时根之外的路径：${abs}`);
  assert.match(path.basename(abs), /^t686-gate-/, `路径守卫拒绝删除非本票前缀的目录：${abs}`);
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
    // 改坏：造一个真超线件、不入台账
    writeFileSync(path.join(fx.dir, 'src', 'surprise.ts'), body(360), 'utf8');
    const g = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.notEqual(g.exit, 0, `漏报必须红，实际 exit=0\n${g.text}`);
    assert.match(g.text, /RED 漏报（台账没有）：src\/surprise\.ts LF=360/);
    // 还原必绿：删掉探针件
    rmSync(path.join(fx.dir, 'src', 'surprise.ts'));
    const g2 = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.equal(g2.exit, 0, `删掉探针件后该回绿，实际 exit=${g2.exit}\n${g2.text}`);
    assert.match(g2.text, /PASS: 告警线台账齐全且与实况一致/);
  } finally {
    cleanup(fx.dir);
  }
});

test('T3 陈化必红：台账行数 ≠ 实况 → exit≠0 且指出「台账陈化」', () => {
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
    // 缩面口径＝本门之前的做法：只查 `REQUIRED` 各行「存在」，不看扫描面
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
  // 他席在飞的改动会让这一条红：那是这道门的设计行为（台账不随实况更新即报警），
  // 修法＝`node packages/skill-bill/scripts/check-warning-line.mjs --sync`。
  const g = runGate([]);
  assert.equal(g.exit, 0, `真包告警线门应绿，实际 exit=${g.exit}\n${g.text}`);
  assert.match(g.text, /SCAN-ROOT: .*packages[\\/]skill-bill/);
  assert.match(g.text, /LEDGER: .*packages[\\/]skill-bill[\\/]AGENTS\.md/);
  assert.match(g.text, /PASS: 告警线台账齐全且与实况一致/);
  const m = g.text.match(/RESULT: (\d+)\/(\d+)/);
  assert.ok(m, `缺 RESULT 摘要行\n${g.text}`);
  assert.equal(m[1], m[2], `RESULT 不是 n/n：${m[0]}`);
});

test('T6 生成物剔除：生成器声明过的件不挂号也不算漏报（名单来自生成器自己的输出声明）', () => {
  const fx = makeFixture();
  try {
    writeLedger(fx);
    writeGenerated(fx);
    const g = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.match(g.text, /GENERATED-SKIP src\/triggers\/big\.generated\.ts LF=360/);
    assert.equal(g.exit, 0, `生成物剔掉后应绿，实际 exit=${g.exit}\n${g.text}`);
    assert.match(g.text, /PASS: 告警线台账齐全且与实况一致/);
  } finally {
    cleanup(fx.dir);
  }
});

test('T7 生成物判据自证必红：生成器改写法后抽不到目标 → 红，且生成物掉回扫描面被点名', () => {
  const fx = makeFixture();
  try {
    writeLedger(fx);
    writeGenerated(fx);
    // 改坏：输出声明写成判据认不出的形式（拼接而非纯字面量）→ 一条目标都抽不到
    writeFileSync(path.join(fx.dir, 'scripts', 'gen-x.mjs'),
      genSource(`const OUT = join(SRC_DIR, 'triggers', 'big.generated' + '.ts');`), 'utf8');
    const g = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.notEqual(g.exit, 0, `判据失效必须红，实际 exit=0\n${g.text}`);
    assert.match(g.text, /RED 生成物判据自证/);
    assert.match(g.text, /RED 漏报（台账没有）：src\/triggers\/big\.generated\.ts LF=360/);
    assert.match(g.text, /RED 生成物印记已认领：src\/triggers\/big\.generated\.ts/);
  } finally {
    cleanup(fx.dir);
  }
});

/** 台账块之外的部分（「块外一字不动」判据用）。 */
const outside = (s) => [s.slice(0, s.indexOf(LEDGER_BEGIN) + LEDGER_BEGIN.length), s.slice(s.indexOf(LEDGER_END))];

test('T8 同步器：--dry 不改文件且报计划，--sync 回绿且只动台账块', () => {
  const fx = makeFixture();
  try {
    writeLedger(fx, { 'src/over.ts': 999 }); // 改坏：台账陈化
    const before = readFileSync(fx.agents, 'utf8');
    const dry = runGate(['--sync', '--dry', '--root', fx.dir, '--agents', fx.agents]);
    assert.notEqual(dry.exit, 0, `计划非空时 --dry 必须照当刻状态非 0 退出（免得误读成已绿），实际 exit=${dry.exit}\n${dry.text}`);
    assert.match(dry.text, /SYNC-PLAN mode=dry 行=\d+ 改=1 增=0 删=0/);
    assert.match(dry.text, /SYNC-CHANGE src\/over\.ts 台账=999 实况=360/);
    assert.match(dry.text, /SYNC-DRY 计划非空（未落盘）/);
    assert.match(dry.text, /RED 台账陈化：src\/over\.ts 台账=999 实况=360/, '--dry 也要把当刻红条打出来');
    assert.equal(readFileSync(fx.agents, 'utf8'), before, '--dry 不许改文件');
    // 漏报也能补：加一个未挂号的 360 行件，再演练一次仍不落盘
    writeFileSync(path.join(fx.dir, 'src', 'surprise.ts'), body(360), 'utf8');
    const dry2 = runGate(['--sync', '--dry', '--root', fx.dir, '--agents', fx.agents]);
    assert.notEqual(dry2.exit, 0, `计划非空（第二回）仍须非 0，实际 exit=${dry2.exit}\n${dry2.text}`);
    assert.match(dry2.text, /SYNC-CHANGE src\/over\.ts 台账=999 实况=360/);
    assert.match(dry2.text, /SYNC-ADD src\/surprise\.ts LF=360/);
    assert.equal(readFileSync(fx.agents, 'utf8'), before, '--dry 不许改文件（第二回）');
    // 真同步：落盘 → SYNC-VERIFY → 门回绿
    const w = runGate(['--sync', '--root', fx.dir, '--agents', fx.agents]);
    assert.equal(w.exit, 0, `--sync 后应绿，实际 exit=${w.exit}\n${w.text}`);
    assert.match(w.text, /SYNC-WRITE .*AGENTS\.md/);
    assert.match(w.text, /SYNC-VERIFY ok/);
    const after = readFileSync(fx.agents, 'utf8');
    assert.notEqual(after, before, '--sync 应当改到台账');
    assert.deepEqual(outside(after), outside(before), '台账块之外一个字都不许动');
    assert.match(after, /\| `src\/cli\/cmd_read\.ts` \| 558 \| /, '冻结挂号值不许被同步器改写');
    const g = runGate(['--root', fx.dir, '--agents', fx.agents]);
    assert.equal(g.exit, 0, `同步后门应绿，实际 exit=${g.exit}\n${g.text}`);
  } finally {
    cleanup(fx.dir);
  }
});

test('T9 真包台账与当刻实况一致：--sync --dry 零改动且不动文件', () => {
  const agentsAbs = path.join(PKG, 'AGENTS.md');
  const before = readFileSync(agentsAbs, 'utf8');
  const g = runGate(['--sync', '--dry']);
  assert.equal(g.exit, 0, `真包 --sync --dry 应绿，实际 exit=${g.exit}\n${g.text}`);
  assert.match(g.text, /SYNC-PLAN mode=dry 行=\d+ 改=0 增=0 删=0/);
  assert.match(g.text, /SYNC-DRY ok/);
  assert.equal(readFileSync(agentsAbs, 'utf8'), before, '真包 --dry 不许改文件');
});

test('T10 不许有关掉扫描面的开关：未知开关不改变读数（缩面＝放宽）', () => {
  const fx = makeFixture();
  try {
    writeLedger(fx);
    writeFileSync(path.join(fx.dir, 'src', 'surprise.ts'), body(360), 'utf8');
    const bare = runGate(['--root', fx.dir, '--agents', fx.agents]);
    const withFlags = runGate(['--root', fx.dir, '--agents', fx.agents, '--no-scan', '--skip-generated', '--ignore-over-line']);
    assert.notEqual(bare.exit, 0, `无参口径在同一棵树上必须红，实际 exit=0\n${bare.text}`);
    assert.equal(withFlags.exit, bare.exit,
      `未知开关不许改变退出码（有开关能关掉扫描面就是放宽），实际 ${withFlags.exit} ≠ ${bare.exit}\n${withFlags.text}`);
    assert.match(withFlags.text, /RED 漏报（台账没有）：src\/surprise\.ts LF=360/,
      '未知开关不许让超线件逃过扫描面');
    assert.equal(withFlags.text.replace(/\s+/g, ' '), bare.text.replace(/\s+/g, ' '),
      '未知开关下的输出必须与无参一字不差');
  } finally {
    cleanup(fx.dir);
  }
});
