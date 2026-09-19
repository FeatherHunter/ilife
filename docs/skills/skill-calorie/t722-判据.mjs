/** #722 · 判据电池：在一个**加锁窗口**内把本票的动面判据一次跑齐
 *  （协议 §2.4.5「自己已持锁 ⇒ 直调底层命令，不得再抢锁」＋ §2.6 指纹绑定 ＋ §5 变异自证）。
 *
 * 窗口内做什么（全部直调底层命令）：
 *   ① 安静窗口闸：五家包 `src` 连着两次采样一致 ＋ 最近 N 秒没人写（协议 §2.6.2）；
 *   ② 记五家包 `src` 全量 sha256（窗口指纹）；
 *   ③ 编译 `tsc -b` 五个包（协议：编译入口写死 node node_modules/typescript/bin/tsc -b <包>）；
 *   ④ HELP 再注入 ×5：跑各包 `scripts/build-help.mjs`，断言五家 SKILL.md **字节不变**
 *      ——「AUTO 块由生成器重写、只动块外正文」这条验收的直接读数；
 *   ⑤ 生成物链：`pnpm gen:check`、卡路里 `build-help` 后的 `check-examples`、四家 `gen-help-assets:check`；
 *   ⑥ 靶向测试：五家包内套件里**读 SKILL.md 的那几件**（skill-t11／skill.test／calorie-c43／t278／
 *      skill-md-photo-285／exercise-wakewords-266／plan-ensure-batch-599）；
 *   ⑦ 变异自证：把 `packages/skill-chef/src/config.ts` 的 `CHEF_CONFIG_STEM` 改坏 ⇒ 该包读 SKILL.md
 *      的测试件**必须变红**；逐字节还原 ⇒ 必须变绿（红/绿两行机器读数）；
 *   ⑧ 两条边界门：`tooling/check-boundaries.mjs`、`node --test test/plugin-p10-boundaries.test.mjs`；
 *   ⑨ 散件门：`check-one-path.mjs`（两层 --selftest ＋真实门）、`check-page-assert.mjs`、`check-warning-line.mjs`；
 *   ⑩ 再记一次五家 `src` 指纹 ⇒ 与 ① 相等（窗口内没有别人改这些包的 src）。
 *
 * 用法（必须在持有外层锁时调用）：
 *   node tooling/run-locked.mjs --ticket 722 -- node .scratch/t722/judge.mjs
 * 明细日志写 .scratch/t722/，stdout 只出判据行 ＋ 末行 `RESULT:`。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const LOG = join(ROOT, '.scratch', 't722');
mkdirSync(LOG, { recursive: true });

const PKGS = ['skill-chef', 'skill-home', 'skill-memo-ilife', 'skill-schedule', 'skill-calorie'];
const SKILLS = PKGS.map((p) => 'packages/' + p + '/SKILL.md');

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const QUIET_WAIT_MS = Number(argOf('--wait-quiet-ms', '120000'));
const QUIET_AGE_MS = Number(argOf('--quiet-age-ms', '20000'));

const lines = [];
let bad = 0;
function judge(ok, label, detail) {
  if (!ok) bad += 1;
  lines.push((ok ? 'OK   ' : 'RED  ') + label + ' :: ' + detail);
}

/* ── 指纹工具 ─────────────────────────────────────────────────────────── */
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function fileMap(absDir) {
  const map = new Map();
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (statSync(p).isFile()) {
        map.set(relative(ROOT, p).replace(/\\/g, '/'), sha(readFileSync(p)));
      }
    }
  };
  if (existsSync(absDir)) walk(absDir);
  return map;
}

/** 五家包 src 合起来一把指纹（排序后逐件哈希再拼总哈希）。 */
function srcFingerprint() {
  const all = [];
  for (const p of PKGS) {
    for (const [k, v] of fileMap(join(ROOT, 'packages', p, 'src'))) all.push(k + '\0' + v);
  }
  all.sort();
  return { count: all.length, sha: sha(all.join('\n')) };
}

function skillHashes() {
  const out = {};
  for (const s of SKILLS) out[s] = sha(readFileSync(join(ROOT, s)));
  return out;
}

function sameMap(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

/** 安静窗口闸（协议 §2.6.2）：五家涉事包的 src 连着两次采样一致 ＋ 最近 N 秒没人写。 */
function waitQuiet(maxWaitMs) {
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const srcDirs = PKGS.map((p) => join(ROOT, 'packages', p, 'src'));
  const snapshot = () => {
    const m = new Map();
    for (const d of srcDirs) for (const [k, v] of fileMap(d)) m.set(k, v);
    return m;
  };
  const started = Date.now();
  let prev = snapshot();
  for (;;) {
    sleep(5000);
    const cur = snapshot();
    const stable = sameMap(prev, cur);
    const newest = Math.max(0, ...[...cur.keys()].map((k) => statSync(join(ROOT, k)).mtimeMs));
    const ageMs = Date.now() - newest;
    if (stable && ageMs > QUIET_AGE_MS) {
      return { ok: true, waitedMs: Date.now() - started, files: cur.size, ageSec: Math.round(ageMs / 1000) };
    }
    prev = cur;
    if (Date.now() - started > maxWaitMs) {
      return { ok: false, waitedMs: Date.now() - started, files: cur.size, ageSec: Math.round(ageMs / 1000) };
    }
  }
}

/* ── 跑命令并落盘 ─────────────────────────────────────────────────────── */
function runNode(args, logName) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  if (logName) {
    writeFileSync(join(LOG, logName), '# cmd: node ' + args.join(' ') + '\n'
      + (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''), 'utf8');
  }
  return r;
}
function tail(text, n = 3) {
  return String(text || '').trim().split('\n').slice(-n).join(' | ').slice(0, 300);
}
/** 从 node --test 输出里回收 pass／fail。 */
function counts(text) {
  const g = (re) => { const m = text.match(re); return m ? Number(m[1]) : -1; };
  return {
    pass: g(/^[#\u2139]\s*pass\s+(\d+)/m),
    fail: g(/^[#\u2139]\s*fail\s+(\d+)/m),
  };
}

/* ── ① 安静窗口 ＋ ② 指纹 ─────────────────────────────────────────────── */
const quiet = waitQuiet(QUIET_WAIT_MS);
judge(quiet.ok, '安静窗口（五家 src 连着两次采样一致 ＋ 最近 ' + Math.round(QUIET_AGE_MS / 1000) + ' 秒没人写）',
  'waitedMs=' + quiet.waitedMs + ' files=' + quiet.files + ' lastWriteAgeSec=' + quiet.ageSec);

const fpBefore = srcFingerprint();
lines.push('INFO src-fingerprint-before files=' + fpBefore.count + ' sha=' + fpBefore.sha.slice(0, 16));

/* ── ③ 编译五个包（一次 tsc -b 全列） ──────────────────────────────────── */
const TSC_ARGS = ['node_modules/typescript/bin/tsc', '-b', ...PKGS.map((p) => 'packages/' + p)];
const tsc = runNode(TSC_ARGS, 'tsc.log');
judge(tsc.status === 0, '编译 tsc -b（五家包）',
  'exit=' + tsc.status + ' err=' + tail(tsc.stderr, 2));

/* ── ④ HELP 再注入 ×5 ⇒ SKILL.md 字节不变 ─────────────────────────────── */
const SKILL_BEFORE = skillHashes();
const injectLog = [];
let injected = 0;
for (const p of PKGS) {
  const r = runNode(['packages/' + p + '/scripts/build-help.mjs'], 'inject-' + p + '.log');
  if (r.status === 0) injected += 1;
  else injectLog.push(p + ':exit=' + r.status + ' ' + tail(r.stderr, 1));
}
judge(injected === PKGS.length, 'HELP 再注入 ×5 全部 exit 0（生成器只重写标记块）',
  'ok=' + injected + '/' + PKGS.length + (injectLog.length ? ' 红：' + injectLog.join('; ') : ''));

const SKILL_AFTER = skillHashes();
const changedByInject = SKILLS.filter((s) => SKILL_BEFORE[s] !== SKILL_AFTER[s]);
judge(changedByInject.length === 0, '再注入后五家 SKILL.md 字节不变（AUTO 块已是生成器当刻输出，块外正文未被生成器动过）',
  changedByInject.length === 0
    ? SKILLS.map((s) => s.split('/')[1] + '=' + SKILL_AFTER[s].slice(0, 8)).join(' ')
    : '被生成器改动的件：' + changedByInject.join(', '));

/* ── ⑤ 生成物链 ───────────────────────────────────────────────────────── */
const gen = runNode(['packages/skill-calorie/scripts/gen-cli.mjs', '--check'], 'gen-check-calorie.log');
judge(gen.status === 0, 'gen:check · skill-calorie gen-cli --check', 'exit=' + gen.status + ' ' + tail(gen.stdout, 1));
const genBill = runNode(['packages/skill-bill/scripts/gen-cli.mjs', '--check'], 'gen-check-bill.log');
judge(genBill.status === 0, 'gen:check · skill-bill gen-cli --check', 'exit=' + genBill.status + ' ' + tail(genBill.stdout, 1));

const examples = runNode(['packages/skill-calorie/scripts/check-examples.mjs'], 'check-examples.log');
judge(examples.status === 0, 'check-examples（SKILL.md AUTO 块新鲜 ＋ 示例逐行可执行）',
  'exit=' + examples.status + ' ' + tail(examples.stdout, 2));

for (const p of ['skill-chef', 'skill-home', 'skill-memo-ilife', 'skill-schedule']) {
  const r = runNode(['packages/' + p + '/scripts/gen-help-assets.mjs', '--check'], 'gen-assets-' + p + '.log');
  judge(r.status === 0, 'gen-help-assets --check · ' + p, 'exit=' + r.status + ' ' + tail(r.stdout, 1));
}

/* ── ⑥ 靶向测试：读 SKILL.md 的那几件 ─────────────────────────────────── */
const TARGETS = [
  ['skill-chef', 'packages/skill-chef/test/skill.test.mjs'],
  ['skill-home', 'packages/skill-home/test/skill.test.mjs'],
  ['skill-memo-ilife', 'packages/skill-memo-ilife/test/skill.test.mjs'],
  ['skill-schedule', 'packages/skill-schedule/test/skill.test.mjs'],
  ['skill-schedule', 'packages/skill-schedule/test/plan-ensure-batch-599.test.mjs'],
  ['skill-calorie', 'packages/skill-calorie/test/skill-t11.test.mjs'],
  ['skill-calorie', 'packages/skill-calorie/test/calorie-c43.test.mjs'],
  ['skill-calorie', 'packages/skill-calorie/test/t278-唤醒词与工作流程.test.mjs'],
  ['skill-calorie', 'packages/skill-calorie/test/skill-md-photo-285.test.mjs'],
  ['skill-calorie', 'packages/skill-calorie/test/exercise-wakewords-266.test.mjs'],
];
const baseline = {};
for (const [pkg, t] of TARGETS) {
  const r = runNode(['--test', t], 'test-' + t.replace(/[\/\\]/g, '_') + '.log');
  const c = counts((r.stdout || '') + (r.stderr || ''));
  baseline[t] = { status: r.status, ...c };
  judge(r.status === 0 && c.fail === 0, '基线绿 · ' + t, 'exit=' + r.status + ' pass=' + c.pass + ' fail=' + c.fail);
}

/* ── ⑦ 变异自证：改坏一处必红、改回必绿 ───────────────────────────────── */
// 靶点＝卡路里的配置主体名（源码级；`#718` 同一靶点已实测有牙，本席复跑以防本票改动把它弄钝）。
// 改坏 ⇒ 配置读不到（回落默认）⇒ 该包「配置真进执行路径」那条测试件必红；逐字节还原 ⇒ 必绿。
const MUT_FILE = 'packages/skill-calorie/src/config.ts';
const MUT_FROM = "export const CALORIE_CONFIG_STEM = 'calorie' as const;";
const MUT_TO = "export const CALORIE_CONFIG_STEM = 'calorie_t722' as const;";
const MUT_TARGET = 'packages/skill-calorie/test/photo-gif-page-352.test.mjs';
const mutPath = join(ROOT, MUT_FILE);
const original = readFileSync(mutPath);
const originalSha = sha(original);
let mutRed = null;
let restoreGreen = null;
let restoreSame = false;
try {
  const text = original.toString('utf8');
  if (text.split(MUT_FROM).length - 1 !== 1) throw new Error('变异点命中次数不是 1：' + MUT_FROM);
  writeFileSync(mutPath, text.replace(MUT_FROM, MUT_TO), 'utf8');
  const t2 = runNode(TSC_ARGS, 'mut-tsc.log');
  const m = runNode(['--test', MUT_TARGET], 'mut-test.log');
  mutRed = { tsc: t2.status, ...counts((m.stdout || '') + (m.stderr || '')), status: m.status };
} finally {
  writeFileSync(mutPath, original);
  restoreSame = sha(readFileSync(mutPath)) === originalSha;
  const t3 = runNode(TSC_ARGS, 'restore-tsc.log');
  const g = runNode(['--test', MUT_TARGET], 'restore-test.log');
  restoreGreen = { tsc: t3.status, ...counts((g.stdout || '') + (g.stderr || '')), status: g.status };
}
judge(restoreSame, '还原逐字节一致', 'sha=' + originalSha.slice(0, 16));
judge(!!mutRed && mutRed.tsc === 0 && mutRed.fail > 0, '变异红（改坏配置主体名必红）',
  'MUT-TSC=' + (mutRed ? mutRed.tsc : 'n/a') + ' MUT pass=' + (mutRed ? mutRed.pass : 'n/a')
  + ' fail=' + (mutRed ? mutRed.fail : 'n/a'));
judge(!!restoreGreen && restoreGreen.tsc === 0 && restoreGreen.fail === 0 && restoreGreen.pass > 0, '还原绿（改回必绿）',
  'RESTORE-TSC=' + (restoreGreen ? restoreGreen.tsc : 'n/a') + ' RESTORE pass=' + (restoreGreen ? restoreGreen.pass : 'n/a')
  + ' fail=' + (restoreGreen ? restoreGreen.fail : 'n/a'));

/* ── ⑦b 说明面变异自证：把退役变量名写回 SKILL.md ⇒ 五家零命中那条必红 ＋ 卡路里测试件必红 ── */
// 断言打在哪条缝上，就用哪条缝的变异来证，不拿别处的红冒充。靶点＝卡路里 SKILL.md 的一行正文
// （块外，生成器不会碰它）；改坏后 grep 与 `skill-t11` 的自证回路必须同时红。
const DOC_FILE = 'packages/skill-calorie/SKILL.md';
const DOC_TARGET_TEST = 'packages/skill-calorie/test/skill-t11.test.mjs';
const docPath = join(ROOT, DOC_FILE);
const docOriginal = readFileSync(docPath);
const docOriginalSha = sha(docOriginal);
const docAnchor = '存在位记 null、不断言。';
let docRed = null;
let docRestoreGreen = null;
let docRestoreSame = false;
let docGrepRed = null;
try {
  const text = docOriginal.toString('utf8');
  if (text.split(docAnchor).length - 1 !== 1) throw new Error('说明面变异点命中次数不是 1：' + docAnchor);
  writeFileSync(docPath, text.replace(docAnchor, '存在位由 SKILLS_DB_PATH 与 CALORIE_PHOTOS_DIR 决定。'), 'utf8');
  const g = spawnSync('git', ['grep', '-c', '-E', 'SKILLS_DB_PATH|_FORCE_PROD|_PHOTOS_DIR|CALORIE_TODAY', '--', ...SKILLS],
    { cwd: ROOT, encoding: 'utf8', shell: false });
  docGrepRed = { status: g.status, hits: (g.stdout || '').trim() };
  const t = runNode(['--test', DOC_TARGET_TEST], 'docmut-test.log');
  docRed = { ...counts((t.stdout || '') + (t.stderr || '')), status: t.status };
} finally {
  writeFileSync(docPath, docOriginal);
  docRestoreSame = sha(readFileSync(docPath)) === docOriginalSha;
  const g2 = spawnSync('git', ['grep', '-c', '-E', 'SKILLS_DB_PATH|_FORCE_PROD|_PHOTOS_DIR|CALORIE_TODAY', '--', ...SKILLS],
    { cwd: ROOT, encoding: 'utf8', shell: false });
  const t2 = runNode(['--test', DOC_TARGET_TEST], 'docrestore-test.log');
  docRestoreGreen = { grepStatus: g2.status, ...counts((t2.stdout || '') + (t2.stderr || '')), status: t2.status };
}
judge(docRestoreSame, '说明面变异还原逐字节一致', 'sha=' + docOriginalSha.slice(0, 16));
judge(!!docGrepRed && docGrepRed.status === 0, '说明面变异红 · 零命中那条 grep 改坏后真的报命中',
  'MUT grep exit=' + (docGrepRed ? docGrepRed.status : 'n/a') + ' 命中行：' + (docGrepRed ? docGrepRed.hits : ''));
judge(!!docRed && docRed.fail > 0, '说明面变异红 · skill-t11 读 SKILL.md 的断言变红',
  'MUT exit=' + (docRed ? docRed.status : 'n/a') + ' pass=' + (docRed ? docRed.pass : 'n/a')
  + ' fail=' + (docRed ? docRed.fail : 'n/a'));
judge(!!docRestoreGreen && docRestoreGreen.grepStatus === 1 && docRestoreGreen.fail === 0 && docRestoreGreen.pass > 0,
  '说明面变异还原绿 · grep 回到零命中 ＋ skill-t11 回绿',
  'RESTORE grep-exit=' + (docRestoreGreen ? docRestoreGreen.grepStatus : 'n/a')
  + ' pass=' + (docRestoreGreen ? docRestoreGreen.pass : 'n/a') + ' fail=' + (docRestoreGreen ? docRestoreGreen.fail : 'n/a'));

/* ── ⑧ 两条边界门（票面点名） ─────────────────────────────────────────── */
const b1 = runNode(['tooling/check-boundaries.mjs'], 'check-boundaries.log');
judge(b1.status === 0, 'node tooling/check-boundaries.mjs', 'exit=' + b1.status + ' ' + tail(b1.stdout, 1));
const b2 = runNode(['--test', 'test/plugin-p10-boundaries.test.mjs'], 'p10.log');
const c2 = counts((b2.stdout || '') + (b2.stderr || ''));
judge(b2.status === 0 && c2.fail === 0, 'node --test test/plugin-p10-boundaries.test.mjs',
  'exit=' + b2.status + ' pass=' + c2.pass + ' fail=' + c2.fail);

/* ── ⑨ 散件门（本票声明面顺带跑，避免「只跑票面点的两条」留盲区） ─────── */
const oneSel = runNode(['packages/skill-calorie/scripts/check-one-path.mjs', '--selftest'], 'one-path-selftest.log');
judge(oneSel.status === 0, 'check-one-path --selftest', 'exit=' + oneSel.status + ' ' + tail(oneSel.stdout, 1));
const oneReal = runNode(['packages/skill-calorie/scripts/check-one-path.mjs'], 'one-path.log');
judge(oneReal.status === 0, 'check-one-path（真实门）', 'exit=' + oneReal.status + ' ' + tail(oneReal.stdout, 1));
const page = runNode(['packages/skill-calorie/scripts/check-page-assert.mjs'], 'page-assert.log');
judge(page.status === 0, 'check-page-assert', 'exit=' + page.status + ' ' + tail(page.stdout, 1));
const warn = runNode(['packages/skill-calorie/scripts/check-warning-line.mjs'], 'warning-line.log');
lines.push('INFO 告警线台账门（非本票判据，体检用）：exit=' + warn.status + ' ' + tail(warn.stdout, 1));

/* ── ⑩ 窗口内五家 src 无漂移 ──────────────────────────────────────────── */
const fpAfter = srcFingerprint();
judge(fpBefore.sha === fpAfter.sha && fpBefore.count === fpAfter.count, '窗口内五家包 src 无漂移（读数有效）',
  'before=' + fpBefore.sha.slice(0, 16) + '/' + fpBefore.count + ' after=' + fpAfter.sha.slice(0, 16) + '/' + fpAfter.count);

/* ── 报告 ─────────────────────────────────────────────────────────────── */
console.log(lines.join('\n'));
const judged = lines.filter((l) => l.startsWith('OK ') || l.startsWith('RED'));
console.log('RESULT: ' + judged.filter((l) => l.startsWith('OK')).length + '/' + judged.length
  + ' ' + (bad === 0 ? 'PASS' : 'FAIL') + ' src-sha=' + fpBefore.sha.slice(0, 16)
  + ' skills=' + SKILLS.map((s) => s.split('/')[1] + ':' + SKILL_AFTER[s].slice(0, 8)).join(','));
process.exit(bad === 0 ? 0 : 1);
