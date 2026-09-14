#!/usr/bin/env node
/** 票 #475 独立对抗审查席探针（**与实施席不同人、不同过程，独立重写**）。
 *
 * 一号探针：把 #465 审查席当场证明「改坏不红」的三条版式针，在**隔离镜像**上独立复现「改坏必红」，
 * 并额外检验「补硬后的针在正常实现下全绿」（防恒红）——两端读数都给。
 *
 * 隔离镜像：`.scratch/t475-review/mirror/packages/skill-calorie/`
 *   - `dist/`   ＝ 真 `dist/` 逐字节副本（**变异只落在这里，真件零写入**）
 *   - `test/`   ＝ 真判据件副本（跑的是镜子里的判据件、读的是镜子里的 dist）
 *   - `node_modules` ＝ 指向真包的 junction（只借解析路径）
 *   - `package.json` ＝ 真件副本（`"type":"module"`，缺了 .js 判据件会被当 CJS）
 *
 * 还原纪律：每条变异**先另存原字节**，收尾只写回那串原字节（不 `git checkout`、不整目录还原），
 * 写回后 sha256 逐条自证＝变异前。
 *
 * 交付位：`docs/skills/skill-calorie/t475-review-probe.mjs`；草稿位 `.scratch/t475-review/probe.mjs`（两处同字节）。
 * 跑法（必须持锁，否则读到他席半写的 dist）：
 *   node tooling/run-locked.mjs --ticket 475 -- node docs/skills/skill-calorie/t475-review-probe.mjs
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── 定位仓根（从本件向上找到含 packages/skill-calorie/package.json 的那一级） ── */
function findRoot(from) {
  let d = from;
  for (;;) {
    if (fs.existsSync(path.join(d, 'packages', 'skill-calorie', 'package.json'))) return d;
    const up = path.dirname(d);
    if (up === d) throw new Error('找不到仓根');
    d = up;
  }
}
const ROOT = findRoot(path.dirname(fileURLToPath(import.meta.url)));
const REVIEW_DIR = path.join(ROOT, '.scratch', 't475-review');
const MIRROR_PKG = path.join(REVIEW_DIR, 'mirror', 'packages', 'skill-calorie');
const REAL_PKG = path.join(ROOT, 'packages', 'skill-calorie');
const OUT_FILE = path.join(REVIEW_DIR, 'probe-report.txt');

const lines = [];
function say(s) {
  lines.push(s);
  process.stdout.write(s + '\n');
}
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const short = (h) => h.slice(0, 16);

/* ── 0. 起镜子 ── */
function buildMirror() {
  fs.rmSync(path.join(REVIEW_DIR, 'mirror'), { recursive: true, force: true });
  fs.mkdirSync(MIRROR_PKG, { recursive: true });
  fs.cpSync(path.join(REAL_PKG, 'dist'), path.join(MIRROR_PKG, 'dist'), { recursive: true });
  fs.cpSync(path.join(REAL_PKG, 'test'), path.join(MIRROR_PKG, 'test'), { recursive: true });
  fs.copyFileSync(path.join(REAL_PKG, 'package.json'), path.join(MIRROR_PKG, 'package.json'));
  fs.symlinkSync(path.join(REAL_PKG, 'node_modules'), path.join(MIRROR_PKG, 'node_modules'), 'junction');
}

/** 镜像 dist 与真 dist 逐字节对账：返回 {files, same, diff, onlyMirror, onlyReal}。 */
function parity() {
  const walk = (dir, base = '') => {
    const out = new Map();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base === '' ? e.name : base + '/' + e.name;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) for (const [k, v] of walk(abs, rel)) out.set(k, v);
      else out.set(rel, sha(fs.readFileSync(abs)));
    }
    return out;
  };
  const a = walk(path.join(MIRROR_PKG, 'dist'));
  const b = walk(path.join(REAL_PKG, 'dist'));
  let same = 0;
  const diffs = [];
  for (const [k, v] of a) {
    if (!b.has(k)) diffs.push('缺于真件: ' + k);
    else if (b.get(k) === v) same += 1;
    else diffs.push('不同值: ' + k);
  }
  for (const k of b.keys()) if (!a.has(k)) diffs.push('镜像多出: ' + k);
  return { files: a.size, realFiles: b.size, same, diffs };
}

/* ── 1. 跑判据件（读的是镜像 dist） ── */
const NEEDLE_PATTERNS = [
  '页题不是逐字页名', '页题节点不是本页题面', '窗口未写在自己的落点',
  '块名不是逐字', '来源句不是登记写法', '读不到页题节点（ilife-block-page-shell-title）',
  '读不到区段', '产物任意一面出现命令键', '产物任意一面出现工序词「移植」', '产物任意一面出现票号样式',
  '可见面出现', '缺：',
];
/** 失败那一条的**红断言原字**（node --test 规格报告里的 AssertionError 行）。 */
function firstAssertionError(text) {
  const m = /AssertionError[^\n]*/.exec(text);
  return m === null ? null : m[0].replace(/\s+/g, ' ').trim().slice(0, 220);
}
function runTest(relTestPath) {
  const r = spawnSync(process.execPath, ['--test', relTestPath], { cwd: ROOT, encoding: 'utf8' });
  const text = String(r.stdout || '') + String(r.stderr || '');
  const num = (k) => {
    const m = new RegExp('(?:^|\\n).{0,2}' + k + ' (\\d+)').exec(text);
    return m === null ? -1 : Number(m[1]);
  };
  return {
    exit: r.status,
    pass: num('pass'), fail: num('fail'), tests: num('tests'),
    needles: NEEDLE_PATTERNS.filter((p) => text.includes(p)),
    err: firstAssertionError(text),
    raw: text,
  };
}

/* ── 2. 变异定义（改坏 → 红；写回 → 绿） ── */
const T111 = 'packages/skill-calorie/test/exercise-port-111.test.mjs';
const T265 = 'packages/skill-calorie/test/exercise-routes-265.test.mjs';
const MP111 = '.scratch/t475-review/mirror/packages/skill-calorie/test/exercise-port-111.test.mjs';
const MP265 = '.scratch/t475-review/mirror/packages/skill-calorie/test/exercise-routes-265.test.mjs';

const MUTATIONS = [
  {
    id: 'P1', // 票面一号探针 ①：分布页窗口从**窗口卡**摘掉，明细表 caption 留着
    what: '① 分布页窗口从窗口卡摘掉（caption 留着）',
    file: 'dist/render/sportPortDocs.js',
    old: "windowCard(v.start, v.end, '分类＝库内实填优先",
    neu: "windowCard('', '', '分类＝库内实填优先",
    runs: [{ test: MP111, expect: '窗口未写在自己的落点', file: T111 }],
    oldNeedleMustStayGreen: '缺：',
  },
  {
    id: 'P2', // 票面一号探针 ②：复盘页块名改回旧字样「高频 TOP5」
    what: '② 复盘页块名改回旧字样「高频 TOP5」',
    file: 'dist/render/sportPortDocs.js',
    old: "            label: '高频运动',",
    neu: "            label: '高频 TOP5',",
    runs: [{ test: MP111, expect: '块名不是逐字', file: T111 }],
    oldNeedleMustStayGreen: '缺：', // 页内副题仍写「高频运动」→ 旧 includes 条不红（代跑属实）
  },
  {
    id: 'P3', // 票面一号探针 ③：力量页来源句换写法（换成读者看得懂的来源名）
    what: '③ 力量页来源句换写法（exercise_log（…） → 运动记录）',
    file: 'dist/render/sportPortDocs.js',
    old: "const STRENGTH_SOURCE = 'exercise_log（本窗未删除的力量行）';",
    neu: "const STRENGTH_SOURCE = '运动记录';",
    runs: [{ test: MP111, expect: '来源句不是登记写法', file: T111 }],
    oldNeedleMustStayGreen: null,
  },
  {
    id: 'P4', // 自设：题面连写窗口（#465 D1 原始指控）
    what: '④ 分布页题面改回「页名＋窗口连写」',
    file: 'dist/render/sportPortDocs.js',
    old: "        title: '运动类型分布',",
    neu: "        title: '运动类型分布 ' + v.start + ' ~ ' + v.end,",
    runs: [
      { test: MP111, expect: '页题不是逐字页名', file: T111 },
      { test: MP265, expect: '页题节点不是本页题面', file: T265 },
    ],
    oldNeedleMustStayGreen: '缺：',
  },
  {
    id: 'P5', // 自设：形制换了要**当面红**，不静默放过（针不许恒绿）
    what: '⑤ 来源卡整个换 id（读不到区段）→ 必须「读不到区段」当场红，不许静默放过',
    file: 'dist/render/sportPortDocs.js',
    old: "return { id: 'sec-source', label: '数据来源'",
    neu: "return { id: 'sec-source-x', label: '数据来源'",
    runs: [
      { test: MP111, expect: '读不到区段', file: T111 },
    ],
    oldNeedleMustStayGreen: null,
  },
  // 自设（D4 面）：只落**机器面**（属性里）的污染 → 可见面那三条仍绿、整份产物这三条必须红。
  {
    id: 'P6a',
    what: '⑥a 只往属性里塞「calorie.exercise.」（可见面看不见）→ 整份产物针必须红，可见面针仍绿',
    file: 'dist/shared/docPage.js',
    old: "'<div class=\"wrap ilife-page\">",
    neu: "'<div data-probe=\"calorie.exercise.\" class=\"wrap ilife-page\">",
    runs: [{ test: MP111, expect: '产物任意一面出现命令键', file: T111 }],
    oldNeedleMustStayGreen: '可见面出现',
  },
  {
    id: 'P6b',
    what: '⑥b 只往属性里塞工序词「移植」→ 整份产物针必须红，可见面针仍绿',
    file: 'dist/shared/docPage.js',
    old: "'<div class=\"wrap ilife-page\">",
    neu: "'<div data-probe=\"移植\" class=\"wrap ilife-page\">",
    runs: [{ test: MP111, expect: '产物任意一面出现工序词「移植」', file: T111 }],
    oldNeedleMustStayGreen: '可见面出现',
  },
  {
    id: 'P6c',
    what: '⑥c 只往属性里塞票号样式 t475 → 整份产物针必须红，可见面针仍绿',
    file: 'dist/shared/docPage.js',
    old: "'<div class=\"wrap ilife-page\">",
    neu: "'<div data-probe=\"t475\" class=\"wrap ilife-page\">",
    runs: [{ test: MP111, expect: '产物任意一面出现票号样式', file: T111 }],
    oldNeedleMustStayGreen: '可见面出现',
  },
];

function mutateOnce(m) {
  const abs = path.join(MIRROR_PKG, m.file);
  const original = fs.readFileSync(abs); // 另存原字节
  const before = sha(original);
  const text = original.toString('utf8');
  const hits = text.split(m.old).length - 1;
  if (hits !== 1) throw new Error(m.id + ' 锚点命中 ' + hits + ' 次（须唯一）：' + m.old);
  fs.writeFileSync(abs, Buffer.from(text.replace(m.old, m.neu), 'utf8'));

  const red = m.runs.map((r) => ({ r, res: runTest(r.test) }));

  fs.writeFileSync(abs, original); // 只写回另存的原字节
  const after = sha(fs.readFileSync(abs));
  const green = m.runs.map((r) => ({ r, res: runTest(r.test) }));
  return { before, after, red, green };
}

/* ── 3. 判据放宽检查：提交前的每条 assert 是否逐字仍在提交后 ── */
function blob(rev, p) {
  const r = spawnSync('git', ['show', rev + ':' + p], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error('git show 失败：' + rev + ':' + p + ' ' + r.stderr);
  return r.stdout;
}
function relaxationCheck(p) {
  const before = blob('f577314^', p);
  const after = blob('f577314', p);
  const beforeAsserts = before.split('\n').filter((l) => /assert\.(ok|equal|match|notEqual|deepEqual|throws|doesNotThrow)\(/.test(l));
  const afterText = after;
  const missing = beforeAsserts.filter((l) => !afterText.includes(l.trim()));
  const countBefore = (before.match(/assert\./g) || []).length;
  const countAfter = (after.match(/assert\./g) || []).length;
  const removed = blob('f577314^', p).split('\n');
  const added = after.split('\n');
  const del = removed.filter((l) => !added.includes(l) && l.trim() !== '');
  return { beforeAsserts: beforeAsserts.length, countBefore, countAfter, missing, del };
}

/* ── 4. 归属：提交只含声明三件 ＋ 实现件零改动 ── */
const IMPL = [
  'packages/skill-calorie/src/render/sportPortDocs.ts',
  'packages/skill-calorie/src/render/reviewDocs.ts',
  'packages/skill-calorie/src/render/sportDocs.ts',
  'packages/skill-calorie/src/exercise/receipt.ts',
  'packages/skill-calorie/src/exercise/records.ts',
];
function attribution() {
  const stat = spawnSync('git', ['show', '--name-only', '--format=', 'f577314'], { cwd: ROOT, encoding: 'utf8' }).stdout
    .split('\n').filter((s) => s.trim() !== '');
  const srcDiff = spawnSync('git', ['diff', '--name-only', 'f577314^', 'f577314', '--', 'packages/skill-calorie/src'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  return {
    files: stat,
    srcDiffEmpty: srcDiff === '',
    impl: IMPL.map((p) => {
      const a = sha(Buffer.from(blob('f577314^', p), 'utf8'));
      const b = sha(Buffer.from(blob('f577314', p), 'utf8'));
      const w = sha(fs.readFileSync(path.join(ROOT, p)));
      const dirty = spawnSync('git', ['status', '--porcelain', '--', p], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
      return { p: path.basename(p), parentEqCommit: a === b, commitEqWorktree: b === w, worktreeStatus: dirty === '' ? '干净' : dirty };
    }),
  };
}

/* ── 主流程 ── */
say('=== 票 #475 独立审查席探针 · ' + new Date().toISOString() + ' ===');
buildMirror();
const p0 = parity();
say('[0] 隔离镜像：真 dist 件数=' + p0.realFiles + ' 镜像件数=' + p0.files + ' 逐字节同值=' + p0.same + ' 不同值/缺/多=' + p0.diffs.length);
if (p0.diffs.length > 0) say('    差异：' + p0.diffs.slice(0, 5).join('; '));
say('[0] 镜像判据件 sha256 前 16：111=' + short(sha(fs.readFileSync(path.join(MIRROR_PKG, 'test', 'exercise-port-111.test.mjs'))))
  + ' 265=' + short(sha(fs.readFileSync(path.join(MIRROR_PKG, 'test', 'exercise-routes-265.test.mjs')))));

// §1 防恒红：正常实现（未变异）下必须全绿
const base111 = runTest(MP111);
const base265 = runTest(MP265);
say('[1] 正常实现（未变异镜像）：111 ' + base111.pass + '/' + base111.fail + '（tests=' + base111.tests + ' exit=' + base111.exit + '）　265 '
  + base265.pass + '/' + base265.fail + '（tests=' + base265.tests + ' exit=' + base265.exit + '）');
if (base111.fail !== 0 || base265.fail !== 0) {
  say('[1!] 基线不绿（镜子搭错或真件本就红）——111 尾部原文：');
  say(base111.raw.split('\n').slice(-40).join('\n'));
  say('[1!] 265 尾部原文：');
  say(base265.raw.split('\n').slice(-40).join('\n'));
}

// §2 逐条变异：改坏红 / 写回绿 + sha256 同值
for (const m of MUTATIONS) {
  const r = mutateOnce(m);
  say('[2] ' + m.id + ' ' + m.what);
  say('    改坏前 sha256 前 16=' + short(r.before) + ' → 写回后=' + short(r.after) + '　逐字节同源=' + (r.before === r.after));
  for (const x of r.red) {
    const ok = x.res.needles.includes(x.r.expect);
    say('    改坏红：' + x.r.file.split('/').pop() + ' ' + x.res.pass + '/' + x.res.fail + ' exit=' + x.res.exit
      + '　命中期望针「' + x.r.expect + '」=' + ok);
    say('      红断言原字：' + (x.res.err === null ? '(无)' : x.res.err));
    say('      本轮命中的针面=[' + x.res.needles.join(' | ') + ']');
  }
  if (m.oldNeedleMustStayGreen !== null) {
    const stayed = r.red.some((x) => x.res.needles.includes(m.oldNeedleMustStayGreen));
    say('    对照针（更宽的那条「' + m.oldNeedleMustStayGreen + '」）在这条变异下：'
      + (stayed ? '也红（它抓得住）' : '仍绿（它抓不住＝正是本票要补的缺口）'));
  }
  for (const x of r.green) {
    say('    写回绿：' + x.r.file.split('/').pop() + ' ' + x.res.pass + '/' + x.res.fail + ' exit=' + x.res.exit);
  }
}

// §3 判据放宽检查
for (const p of [T111, T265]) {
  const q = relaxationCheck(p);
  say('[3] 判据放宽检查 ' + p.split('/').pop() + '：提交前 assert 行 ' + q.beforeAsserts + ' 条（assert. 计 ' + q.countBefore
    + '）→ 提交后 ' + q.countAfter + '；提交前有、提交后逐字没了=' + q.missing.length + ' 条');
  if (q.missing.length > 0) say('    缺：' + q.missing.join(' ॥ '));
  if (q.del.length > 0) say('    提交内被删的整行（原文）=' + JSON.stringify(q.del));
}

// §4 归属
const at = attribution();
say('[4] 归属：f577314 触及文件 ' + at.files.length + ' 件 → ' + at.files.join(' , '));
say('    f577314^..f577314 对 packages/skill-calorie/src 的改动件数＝' + (at.srcDiffEmpty ? 0 : '非 0'));
for (const x of at.impl) {
  say('    ' + x.p + '：父提交↔本提交逐字节同源=' + x.parentEqCommit + '　本提交↔工作区逐字节同源=' + x.commitEqWorktree + '　工作区=' + x.worktreeStatus);
}

fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8');
say('=== 完：读数全文 ' + OUT_FILE + ' ===');
