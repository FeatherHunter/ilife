/**
 * #79 审查席 2（蓝队）自设探针 —— 只读取证 ＋ 变异自证（逐字节还原）。
 *
 * 用法：
 *   node docs/research/t79-review-blue-probe.mjs help             # 自建 tmp DB 生成 calorie.help.center file 态产物并算 sha256（跑两次验确定性）
 *   node docs/research/t79-review-blue-probe.mjs mut-a            # 变异 A：base-combos version 0.2.0→0.1.0（断言须红）→ 还原 → 绿
 *   node docs/research/t79-review-blue-probe.mjs mut-b            # 变异 B：skill-bill 的 base-link-core 范围 ^0.2.0→^0.1.0（探四门＋锁文件门是否覆盖）
 *   node docs/research/t79-review-blue-probe.mjs residue          # MUT-\d 残留扫描（工作树 diff ＋ 全仓文件）
 *   node docs/research/t79-review-blue-probe.mjs fp               # base-* 指纹只报告性核验（读快照里是否含指纹）
 *
 * 纪律：本探针**不改产品代码**；变异期临时改写必逐字节还原（sha256 自证），跑完扫残留。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const rel = (p) => relative(root, p).replace(/\\/g, '/');
const mode = process.argv[2];

const EXPECT_HELP_SHA = 'f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2';

// ---------------------------------------------------------------- help 产物
function runHelp(label) {
  const db = join(root, '.scratch', 't79-review-blue', 'db-' + label + '-' + Date.now());
  mkdirSync(db, { recursive: true });
  const r = spawnSync(process.execPath, [join(root, 'packages/skill-calorie/dist/cli/cmd_read.js'), 'calorie.help.center'], {
    cwd: root,
    env: { ...process.env, SKILLS_DB_PATH: db },
    encoding: 'utf8',
  });
  const out = (r.stdout || '').replace(/^\uFEFF/, '');
  let json = null;
  try { json = JSON.parse(out); } catch { /* 保底：截断打印 */ }
  const path = json?.delivery?.path ?? json?.data?.output;
  const bytes = path && existsSync(path) ? readFileSync(path) : null;
  return {
    label, db: rel(db), exit: r.status,
    mode: json?.delivery?.mode, template: json?.delivery?.template,
    declaredBytes: json?.delivery?.bytes,
    artifact: path ? rel(path) : null,
    artifactBytes: bytes ? bytes.length : null,
    sha256: bytes ? sha256(bytes) : null,
    rawHead: out.slice(0, 160),
  };
}

function doHelp() {
  const a = runHelp('a');
  const b = runHelp('b');
  console.log('run A =', JSON.stringify(a, null, 1));
  console.log('run B =', JSON.stringify(b, null, 1));
  console.log('DETERMINISTIC =', a.sha256 === b.sha256);
  console.log('MATCHES-CLAIM(f380ef68…) =', a.sha256 === EXPECT_HELP_SHA, '|', b.sha256 === EXPECT_HELP_SHA);
  console.log('MODE-FILE =', a.mode === 'file' && b.mode === 'file');
}

// ---------------------------------------------------------------- 变异
/** 逐字节备份 → 写入 → 还原 → sha256 自证。 */
function withMutation(file, mutate, fn) {
  const abs = join(root, file);
  const before = readFileSync(abs);
  const beforeSha = sha256(before);
  const after = mutate(before.toString('utf8'));
  writeFileSync(abs, after, 'utf8');
  const mutSha = sha256(readFileSync(abs));
  console.log(`MUT-APPLIED file=${file} before=${beforeSha} mutated=${mutSha}`);
  let result;
  try { result = fn(); } finally {
    writeFileSync(abs, before);
    const restoredSha = sha256(readFileSync(abs));
    console.log(`MUT-RESTORED file=${file} restored=${restoredSha} byte-identical=${restoredSha === beforeSha}`);
  }
  return result;
}

function runNodeTest(file) {
  const r = spawnSync(process.execPath, ['--test', file], { cwd: root, encoding: 'utf8' });
  return { exit: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function summarize(out) {
  const keep = out.split('\n').filter((l) => /^(ℹ|✖|not ok|# fail|# pass)/.test(l.trim()) || /AssertionError|实得/.test(l));
  return keep.slice(0, 14).join(' | ');
}

function doMutA() {
  const testFile = 'packages/base-render/test/base-version-lockstep.test.mjs';
  const green0 = runNodeTest(testFile);
  console.log('STEP0 baseline test exit =', green0.exit, '|', summarize(green0.out));
  const red = withMutation('packages/base-combos/package.json',
    (s) => s.replace('"version": "0.2.0"', '"version": "0.1.0"'),
    () => runNodeTest(testFile));
  console.log('STEP1 mutated test exit =', red.exit, '（须 ≠ 0）');
  console.log('STEP1 summary =', summarize(red.out));
  const green1 = runNodeTest(testFile);
  console.log('STEP2 restored test exit =', green1.exit, '（须 = 0）', '|', summarize(green1.out));
  console.log('MUT-A verdict =', red.exit !== 0 && green1.exit === 0 && green0.exit === 0 ? 'RED-THEN-GREEN OK' : 'NOT-CONFIRMED');
}

function doMutB() {
  // 5 技能的 range 不在 lockstep 断言里；测「是否有别的门覆盖」。
  const testFile = 'packages/base-render/test/base-version-lockstep.test.mjs';
  const res = withMutation('packages/skill-bill/package.json',
    (s) => s.replace('"base-link-core": "^0.2.0"', '"base-link-core": "^0.1.0"'),
    () => {
      const t = runNodeTest(testFile);
      const b = spawnSync(process.execPath, ['tooling/check-boundaries.mjs'], { cwd: root, encoding: 'utf8' });
      const f = spawnSync(process.execPath, ['tooling/check-publish.mjs', '--pre', '--only', 'dsh-calorie,skill-calorie,dsh-life-pack,base-paint'], { cwd: root, encoding: 'utf8' });
      const l = spawnSync('pnpm', ['install', '--frozen-lockfile'], { cwd: root, encoding: 'utf8', shell: true });
      return {
        lockstep: t.exit, boundaries: b.status, publishPre: f.status,
        frozenLockfile: l.status,
        lockTail: ((l.stdout || '') + (l.stderr || '')).split('\n').filter(Boolean).slice(-4).join(' | '),
      };
    });
  console.log('MUT-B gates (skill-bill range ^0.2.0→^0.1.0) =', JSON.stringify(res, null, 1));
  console.log('MUT-B 判定：lockstep/boundaries/publishPre 任一为 0 → 该门不覆盖 5 技能 range');
}

function doResidue() {
  const g = spawnSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' });
  const changed = (g.stdout || '').split('\n').filter(Boolean);
  const diffText = spawnSync('git', ['diff'], { cwd: root, encoding: 'utf8' }).stdout || '';
  const inDiff = (diffText.match(/MUT-\d/g) || []).length;
  let inFiles = 0;
  const walk = (p) => {
    for (const f of readdirSync(p)) {
      if (f === 'node_modules' || f === '.git' || f === 'dist' || f === '.scratch') continue;
      const abs = join(p, f);
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (/\.(mjs|js|ts|json|md|yaml|yml|txt)$/.test(f)) {
        if (/MUT-\d/.test(readFileSync(abs, 'utf8'))) { inFiles++; console.log('  ! MUT- residue in', rel(abs)); }
      }
    }
  };
  walk(root);
  console.log('git-diff changed files =', changed.length, changed.join(', '));
  console.log('MUT-RESIDUE-IN-DIFF =', inDiff, '| MUT-RESIDUE-IN-FILES =', inFiles);
}

function doFp() {
  const snap = JSON.parse(readFileSync(join(root, 'tooling/skill-html.snapshot.json'), 'utf8'));
  const text = readFileSync(join(root, 'tooling/skill-html.snapshot.json'), 'utf8');
  console.log('snapshot keys =', Object.keys(snap).join(','));
  console.log('snapshot 文本含 "fingerprint" =', /fingerprint/.test(text));
  console.log('snapshot 文本含 "0686fc23" =', text.includes('0686fc23'));
  console.log('snapshot 文本含 "edd0c9cb" =', text.includes('edd0c9cb'));
  console.log('artifactCount =', snap.artifactCount, '| artifacts =', Object.keys(snap.artifacts || {}).length);
}

// ---------------------------------------------------------------- 指纹复现
/** 复现 `tooling/skill-html-snapshot.mjs` 的 baseFingerprint()，可把 base-render/package.json 换成旧版文本。 */
function fingerprint({ overridePackageJson } = {}) {
  const dirs = ['packages/base-render/src', 'packages/base-render/package.json', 'packages/base-link-core/src'];
  const files = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f));
    else files.push(p);
  };
  for (const d of dirs) { const abs = join(root, d); if (existsSync(abs)) walk(abs); }
  files.sort();
  const h = createHash('sha256');
  for (const f of files) {
    const key = rel(f);
    h.update(key); h.update('\0');
    const text = overridePackageJson && key === 'packages/base-render/package.json'
      ? overridePackageJson
      : readFileSync(f, 'utf8');
    h.update(text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return { sha256: h.digest('hex').slice(0, 32), files: files.length };
}

function doFp2() {
  const cur = fingerprint();
  const parentPkg = spawnSync('git', ['show', 'abcde5e~1:packages/base-render/package.json'], { cwd: root, encoding: 'utf8' }).stdout;
  const old = fingerprint({ overridePackageJson: parentPkg });
  console.log('fingerprint(now)          =', cur.sha256, 'files=' + cur.files);
  console.log('fingerprint(parent pkg)   =', old.sha256, 'files=' + old.files);
  console.log('CLAIM 0686fc23 (now)      =', cur.sha256 === '0686fc230318e7d4520170192aefe673');
  console.log('CLAIM edd0c9cb (parent)   =', old.sha256 === 'edd0c9cbec14c10a0fd4b8d3ed433a92');
  const d = spawnSync('git', ['diff', '--name-only', 'abcde5e~1', 'abcde5e', '--', 'packages/base-render/src', 'packages/base-link-core/src'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  console.log('src changed in ticket commit =', JSON.stringify(d), '(空 = 无源码改动)');
}

if (mode === 'help') doHelp();
else if (mode === 'fp2') doFp2();
else if (mode === 'mut-a') doMutA();
else if (mode === 'mut-b') doMutB();
else if (mode === 'residue') doResidue();
else if (mode === 'fp') doFp();
else { console.error('用法：help | mut-a | mut-b | residue | fp'); process.exit(2); }
