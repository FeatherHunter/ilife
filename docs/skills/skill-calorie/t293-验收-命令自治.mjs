#!/usr/bin/env node
/**
 * #293 交付验收探针 · 命令自治（P1–P5）——**独立**运行，不依赖任何测试框架。
 *
 *   node docs/skills/skill-calorie/t293-验收-命令自治.mjs
 *   node docs/skills/skill-calorie/t293-验收-命令自治.mjs --json   （只打一行 JSON）
 *
 * 纪律：
 *   · 判据全部来自可观测事实（仓内文件 ＋ 命令输出），不引用任何一方的自述。
 *   · **不写仓内任何文件**：实验一律在**仓外临时根**做（复制最小子树 ＋ build 产物），用完即清；
 *     删除前做路径守卫（必须在自己的临时根下，且路径不含 node_modules／packages／docs／test／
 *     tooling／.git 任何一段）。唯一例外：把机器可读报告落到 `.scratch/t293-accept/`。
 *   · 缺文件／缺脚本不抛栈：该条报 PENDING 并写明缺什么。
 *
 * 退出码：有 FAIL → 1；否则 0（PENDING 不算红，但会在摘要行里点名）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const JSON_ONLY = process.argv.includes('--json');

const P = {
  GEN: 'packages/skill-calorie/scripts/gen-cli.mjs',
  KEYS: 'packages/skill-calorie/src/cli/keys.ts',
  REG: 'packages/skill-calorie/src/cli/registry.ts',
  LEGACY: 'packages/skill-calorie/src/cli/legacyCommands.ts',
  WEIGHT_DECL: 'packages/skill-calorie/src/weight/commands.ts',
  READ: 'packages/skill-calorie/src/cli/cmd_read.ts',
  WRITE: 'packages/skill-calorie/src/cli/write.ts',
  YAML: 'packages/base-combos/combos.yaml',
  BUILD_HELP: 'packages/skill-calorie/scripts/build-help.mjs',
  RATCHET: 'packages/skill-calorie/test/cmd-registry-294.test.mjs',
  ROUTING: 'packages/skill-calorie/src/triggers/routing.ts',
  CI: '.github/workflows/ci.yml',
  PKG: 'package.json',
};
const BASE_COMMIT = '1396d67'; // 棘轮基线（#294 交付点）

const R = {}; // id -> { status, lines: [], data }
function set(id, status, ...lines) {
  R[id] = { status, lines, data: R[id]?.data ?? null };
}
function data(id, obj) {
  if (!R[id]) R[id] = { status: 'PENDING', lines: [], data: null };
  R[id].data = obj;
}
const abs = (p) => join(REPO, p);
const has = (p) => existsSync(abs(p));
function read(p) {
  try {
    return readFileSync(abs(p), 'utf8');
  } catch {
    return null;
  }
}
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: false, maxBuffer: 1 << 28 });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), err: r.error ? String(r.error.message) : null };
}
const git = (...args) => run('git', ['-C', REPO, '-c', 'core.quotepath=false', ...args], REPO);
const sha = (p) => {
  const t = read(p);
  return t === null ? null : createHash('sha256').update(t, 'utf8').digest('hex').slice(0, 12);
};

/** 体重 9 键的权威声明（读编译产物；dist 缺失即返回 null，由调用方报 PENDING）。 */
async function weightDecls() {
  const dist = abs('packages/skill-calorie/dist/weight/commands.js');
  if (!existsSync(dist)) return { ok: false, why: '缺 packages/skill-calorie/dist/weight/commands.js（先 `pnpm build`）' };
  try {
    const mod = await import(pathToFileURL(dist).href);
    const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
    if (arrays.length !== 1) return { ok: false, why: 'dist/weight/commands.js 的数组导出不是恰好 1 个' };
    const list = arrays[0][1];
    return { ok: true, list, reads: list.filter((c) => c.kind === 'read'), writes: list.filter((c) => c.kind === 'write') };
  } catch (e) {
    return { ok: false, why: '引 dist/weight/commands.js 失败：' + String(e && e.message) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 仓外临时根（协议 §2.1）
// ─────────────────────────────────────────────────────────────────────────────
const TMP_BASE = join(tmpdir(), 't293-accept');
const TMP_ROOT = join(TMP_BASE, 'sandbox-' + process.pid + '-' + Date.now());
function guardTmp(target) {
  const t = resolve(target).toLowerCase();
  const b = resolve(TMP_BASE).toLowerCase();
  if (!t.startsWith(b + sep) && t !== b) throw new Error('路径守卫：不在自己的临时基底内：' + target);
  if (t.startsWith(resolve(REPO).toLowerCase())) throw new Error('路径守卫：临时根落在仓内：' + target);
  for (const bad of ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git']) {
    if (t.split(sep).includes(bad)) throw new Error('路径守卫：路径含禁区段 ' + bad + '：' + target);
  }
}
function cleanupTmp() {
  try {
    if (!existsSync(TMP_ROOT)) return '临时根已清理（不存在）';
    guardTmp(TMP_ROOT);
    rmSync(TMP_ROOT, { recursive: true, force: true });
    return existsSync(TMP_ROOT) ? '临时根清理失败：' + TMP_ROOT : '临时根已清理：' + TMP_ROOT;
  } catch (e) {
    return '临时根清理跳过（守卫拦下）：' + String(e && e.message);
  }
}

/** 把最小子树复制到仓外临时根，供生成器真跑。返回 null 或 {why}。 */
function buildSandbox() {
  guardTmp(TMP_ROOT);
  rmSync(TMP_ROOT, { recursive: true, force: true });
  mkdirSync(TMP_ROOT, { recursive: true });
  writeFileSync(join(TMP_ROOT, 'package.json'), JSON.stringify({ name: 't293-accept-sandbox', private: true, type: 'module' }, null, 2));
  const need = [
    ['packages/skill-calorie/src', 'packages/skill-calorie/src'],
    ['packages/skill-calorie/scripts', 'packages/skill-calorie/scripts'],
    ['packages/skill-calorie/dist', 'packages/skill-calorie/dist'],
    ['packages/skill-calorie/package.json', 'packages/skill-calorie/package.json'],
    ['packages/base-combos/combos.yaml', 'packages/base-combos/combos.yaml'],
  ];
  for (const [from, to] of need) {
    if (!has(from)) return { why: '缺仓内文件：' + from + '（生成器跑不起来）' };
    cpSync(abs(from), join(TMP_ROOT, to), { recursive: true });
  }
  // dist 是"编译产物 + 包间依赖"，接回仓内 node_modules（junction；只读仓）。
  const links = [[join(TMP_ROOT, 'node_modules'), abs('node_modules')], [join(TMP_ROOT, 'packages', 'skill-calorie', 'node_modules'), abs('packages/skill-calorie/node_modules')]];
  for (const [link, target] of links) {
    if (!existsSync(target)) continue;
    run('cmd', ['/c', 'mklink', '/J', link, target], TMP_ROOT);
  }
  return null;
}
const gen = (mode) => run(process.execPath, [P.GEN, ...(mode === 'check' ? ['--check'] : [])], TMP_ROOT);
const sandboxSha = (rel) => {
  const p = join(TMP_ROOT, rel);
  return existsSync(p) ? createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// P1 · 自治：加一条命令，除能力目录里的声明与生成物外，还要手改哪些文件
// ─────────────────────────────────────────────────────────────────────────────
async function p1(w) {
  const genSrc = read(P.GEN);
  if (!genSrc) return set('P1', 'PENDING', '缺生成器 ' + P.GEN + '，无法判定自治面。');
  // ① 静态：生成器读哪几个输入、写哪几个输出（从源码里数，不靠自述）。
  const targetPaths = [...genSrc.matchAll(/\{\s*path:\s*([\s\S]+?),\s*text:/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());
  const inputs = [];
  if (/scanCapabilityNames/.test(genSrc)) inputs.push('src/*/commands.ts（扫描能力目录声明）');
  if (/DIST_DIR,\s*name,\s*'commands\.js'|join\(DIST_DIR, name, "commands\.js"\)/.test(genSrc) || /commands\.js/.test(genSrc)) inputs.push('dist/<能力>/commands.js（编译后的声明模块）');
  if (/legacyCommands\.js/.test(genSrc)) inputs.push(P.LEGACY + '（未搬迁清单，编译后 dist/cli/legacyCommands.js）');
  if (/COMBO_YAML/.test(genSrc)) inputs.push(P.YAML + '（只重写标记块）');
  if (/BUILD_HELP/.test(genSrc)) inputs.push(P.BUILD_HELP + '（只重写 REPR 标记块）');
  const lines = [];
  lines.push('生成器输出面（' + targetPaths.length + ' 处）：' + targetPaths.join(' ; '));
  lines.push('生成器输入面：' + inputs.join(' ; '));
  // ② 静态：生成物必须自证是派生（横幅／标记块），否则"生成物"这句话本身不成立。
  const derived = [];
  for (const [p, needle] of [
    [P.KEYS, '本文件由 `scripts/gen-cli.mjs` 生成'],
    [P.REG, '本文件由 `scripts/gen-cli.mjs` 生成'],
    [P.YAML, 'GEN-CLI-START calorie 段'],
    [P.BUILD_HELP, 'GEN-CLI-START REPR 表'],
  ]) {
    const t = read(p);
    derived.push(`${p}=${t === null ? '缺文件' : t.includes(needle) ? '有派生标记' : '无派生标记'}`);
  }
  lines.push('四件生成物的派生标记：' + derived.join(' ; '));
  // ③ 静态：能力目录里除"声明"外还要手写的第二件（生成的 registry 从 ../<能力>/index.js 取数组）。
  const regSrc = read(P.REG) || '';
  const importFromIndex = /from '\.\.\/[a-z0-9-]+\/index\.js'/.test(regSrc);
  lines.push('生成的 registry 从 ../<能力>/index.js 取声明数组（故能力目录还需 index.ts 再导出）：' + importFromIndex);
  // ④ 静态：迁移一条老键必须同步从 legacyCommands.ts 删行（重复键在生成期就抛）。
  const dupThrow = /命令键重复登记/.test(genSrc);
  lines.push('生成期对"同键两处声明"抛错（故迁移老键必须手删 legacyCommands.ts 那行）：' + dupThrow);
  // ⑤ 静态：分派层不再需要分支（registry 先行）。
  const readSrc = read(P.READ) || '';
  const writeSrc = read(P.WRITE) || '';
  const regFirst = /const spec = REGISTRY\[key\]/.test(readSrc) && /const spec = REGISTRY\[key\]/.test(writeSrc);
  lines.push('两个分派文件 registry 先行（命中即走能力目录，不必再手加 case）：' + regFirst);

  // ⑥ 动态：仓外临时根真跑——加一条假命令，看生成器能不能扫到、要不要碰分派文件。
  const sb = buildSandbox();
  if (sb) {
    lines.push('动态实验未跑：' + sb.why);
    const staticOk = targetPaths.length === 4 && inputs.length === 5 && derived.every((d) => d.includes('有派生标记')) && importFromIndex && dupThrow && regFirst;
    set('P1', staticOk ? 'PASS' : 'FAIL', ...lines, '（仅静态判定：动态实验缺条件）');
    data('P1', { dynamic: false, targetPaths, inputs });
    return;
  }
  const base = gen('check');
  if (base.status !== 0) {
    lines.push('动态实验未跑：临时根里 `gen:check` 基线不为 0（exit ' + base.status + '），沙箱本身不干净。');
    set('P1', 'PENDING', ...lines, '（静态判定见上；沙箱基线脏，动态部分未判）');
    data('P1', { dynamic: false, targetPaths, inputs });
    return;
  }
  // 假能力：目录里只写声明（＋ index 再导出），dist 侧用"编译产物等价物"顶替（生成器读编译模块）。
  const dirs = ['packages/skill-calorie/src/fakecap', 'packages/skill-calorie/dist/fakecap'];
  for (const d of dirs) mkdirSync(join(TMP_ROOT, d), { recursive: true });
  writeFileSync(join(TMP_ROOT, dirs[0], 'commands.ts'), "export const FAKE_COMMANDS = [\n  { kind: 'write', key: 'calorie.fake.demo', shape: 'receipt', title: '假写键', wakeWord: '记假数据' },\n  { kind: 'read', key: 'calorie.fake.view', shape: 'stat', title: '假读键', wakeWord: '看假数据' },\n] as const;\n");
  writeFileSync(join(TMP_ROOT, dirs[0], 'index.ts'), "export { FAKE_COMMANDS } from './commands.js';\n");
  writeFileSync(join(TMP_ROOT, dirs[1], 'commands.js'), "export const FAKE_COMMANDS = [\n  { kind: 'write', key: 'calorie.fake.demo', shape: 'receipt', title: '假写键', wakeWord: '记假数据' },\n  { kind: 'read', key: 'calorie.fake.view', shape: 'stat', title: '假读键', wakeWord: '看假数据' },\n];\n");
  const before = { read: sandboxSha(P.READ), write: sandboxSha(P.WRITE), legacy: sandboxSha(P.LEGACY) };
  const g = gen('write');
  const got = {
    scanned: g.out.includes('fakecap'),
    registryImports: (readFileSync(join(TMP_ROOT, P.REG), 'utf8')).includes('../fakecap/index.js'),
    keysHasWrite: (readFileSync(join(TMP_ROOT, P.KEYS), 'utf8')).includes("'calorie.fake.demo'"),
    keysHasRead: (readFileSync(join(TMP_ROOT, P.KEYS), 'utf8')).includes("'calorie.fake.view'"),
    yamlHas: (readFileSync(join(TMP_ROOT, P.YAML), 'utf8')).includes('key: calorie.fake.demo'),
    reprHas: (readFileSync(join(TMP_ROOT, P.BUILD_HELP), 'utf8')).includes("'记假数据'"),
  };
  const untouched = { read: sandboxSha(P.READ) === before.read, write: sandboxSha(P.WRITE) === before.write, legacy: sandboxSha(P.LEGACY) === before.legacy };
  lines.push('动态：加假能力后 `gen` exit=' + g.status + '；生成器扫到=' + got.scanned + '（输出含 fakecap=' + got.scanned + '）');
  lines.push('  假事实自动流进：registry=' + got.registryImports + ' keys(写)=' + got.keysHasWrite + ' keys(读)=' + got.keysHasRead + ' combos 镜像=' + got.yamlHas + ' REPR=' + got.reprHas);
  lines.push('  分派两文件 + legacyCommands 逐字节未动=' + JSON.stringify(untouched));
  let dynOk = g.status === 0 && Object.values(got).every(Boolean) && Object.values(untouched).every(Boolean);
  // 迁移冲突：假能力声明一条已搬迁清单里的老键 → 生成期必须抛（这就是"必须手删那行"的机器证据）。
  mkdirSync(join(TMP_ROOT, 'packages/skill-calorie/src/fakecap2'), { recursive: true });
  mkdirSync(join(TMP_ROOT, 'packages/skill-calorie/dist/fakecap2'), { recursive: true });
  writeFileSync(join(TMP_ROOT, 'packages/skill-calorie/src/fakecap2/commands.ts'), "export const DUP = [{ kind: 'write', key: 'calorie.diet.add', shape: 'receipt', title: '撞键', wakeWord: '记一餐' }];\n");
  const legacyFirst = (read(`${P.LEGACY}`) || '').match(/key:\s*'([^']+)'/);
  const dupKey = legacyFirst ? legacyFirst[1] : 'calorie.diet.add';
  writeFileSync(join(TMP_ROOT, 'packages/skill-calorie/dist/fakecap2/commands.js'), "export const DUP = [{ kind: 'write', key: '" + dupKey + "', shape: 'receipt', title: '撞键', wakeWord: '撞词' }];\n");
  const g2 = gen('write');
  const dupCaught = g2.status !== 0 && g2.out.includes('命令键重复登记');
  lines.push('  迁移撞键（假能力声明一条仍在 legacyCommands.ts 的键 ' + dupKey + '）→ gen exit=' + g2.status + '，报「命令键重复登记」=' + dupCaught);
  dynOk = dynOk && dupCaught;
  lines.push('已清理临时根：' + cleanupTmp());
  const ok = targetPaths.length === 4 && inputs.length === 5 && derived.every((d) => d.includes('有派生标记')) && importFromIndex && dupThrow && regFirst && dynOk;
  set('P1', ok ? 'PASS' : 'FAIL', ...lines);
  data('P1', { dynamic: true, targetPaths, inputs, got, untouched, dupCaught });
}

// ─────────────────────────────────────────────────────────────────────────────
// P2 · 单一权威源：一条命令的事实还有几处手写副本
// ─────────────────────────────────────────────────────────────────────────────
const CLASS = [
  [/^packages\/skill-calorie\/src\/weight\/commands\.ts$/, 'AUTHORITY（权威声明）'],
  [/^packages\/skill-calorie\/src\/cli\/legacyCommands\.ts$/, 'AUTHORITY②（未搬迁清单，键恰住一处）'],
  [/^packages\/skill-calorie\/src\/cli\/(keys|registry)\.ts$/, 'DERIVED（gen-cli 生成物）'],
  [/^packages\/base-combos\/combos\.yaml$/, 'DERIVED（gen-cli 镜像段）'],
  [/^packages\/skill-calorie\/scripts\/build-help\.mjs$/, 'DERIVED（gen-cli 写 REPR 块）'],
  [/^packages\/base-combos\/src\/present\.ts$/, 'DERIVED（gen-present 从 combos.yaml 生成）'],
  [/^packages\/skill-calorie\/SKILL\.md$/, 'DERIVED（构建期注入区）'],
  [/^packages\/skill-calorie\/src\/triggers\/scene-/, 'FROZEN-PARITY（冻结唤醒词表，sha parity 锁）'],
  [/^packages\/skill-calorie\/src\/triggers\/(wake-assets|index|help-lookup)\.ts$/, 'FROZEN-PARITY／查找层'],
  [/^packages\/skill-calorie\/src\/triggers\/routing\.ts$/, 'ROUTE（唤醒词路由表，手写）'],
  [/^packages\/skill-calorie\/src\/cli\/(cmd_read|write)\.ts$/, 'SWITCH（老键分派 switch，手写）'],
  [/(^|\/)test\//, 'TEST（断言）'],
  [/\.test\.mjs$/, 'TEST（断言）'],
  [/^docs\//, 'DOC（文档）'],
  [/^packages\/skill-calorie\/src\/weight\//, 'CAPABILITY（能力目录实现）'],
  [/^packages\/skill-calorie\/src\//, 'CAPABILITY／共用源码'],
  [/^packages\/base-combos\//, 'CAPABILITY／共用源码'],
];
const classify = (f) => (CLASS.find(([re]) => re.test(f)) || [null, 'UNCLASSIFIED（手写副本！）'])[1];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function p2(w) {
  const wd = await weightDecls();
  if (!wd.ok) return set('P2', 'PENDING', '拿不到体重 9 键的声明：' + wd.why);
  const keys = wd.list.map((c) => ({ key: c.key, wake: c.wakeWord, title: c.title }));
  const lines = ['对体重 9 键（#294 已搬迁的那批）逐键追"一件事实"落点：'];
  const summary = [];
  let unexplained = 0;
  let pairUnexplained = 0;
  let frozenPair = 0;
  let authorityHits = 0;
  for (const k of keys) {
    // 右边界限定：`calorie.view.weight` 不许命中 `calorie.view.weight-history`（同族键前缀歧义）。
    const reKey = escapeRe(k.key) + '([^a-z0-9.-]|$)';
    const g = git('grep', '-n', '-E', '-e', reKey);
    if (g.status !== 0 && !g.out.trim()) {
      lines.push(`  ${k.key}：仓内零命中（异常）`);
      unexplained += 1;
      continue;
    }
    const hits = g.out.split('\n').filter(Boolean).map((l) => {
      const i = l.indexOf(':', l.indexOf(':') + 1);
      const f = l.slice(0, l.indexOf(':'));
      const body = l.slice(i + 1);
      return { file: f.replace(/\\/g, '/'), body };
    });
    const classes = new Map();
    for (const h of hits) classes.set(classify(h.file), (classes.get(classify(h.file)) || 0) + 1);
    // "一件事实"＝同一行同时写着 键 ＋ 它的代表唤醒词（或标题）＝事实对。
    const pairs = hits.filter((h) => (k.wake && h.body.includes(k.wake)) || (k.title && h.body.includes(k.title)));
    const pairClasses = new Map();
    for (const h of pairs) {
      const c = classify(h.file);
      pairClasses.set(c, (pairClasses.get(c) || 0) + 1);
      if (c.startsWith('UNCLASSIFIED')) pairUnexplained += 1;
      if (c.startsWith('FROZEN')) frozenPair += 1;
    }
    const auth = hits.filter((h) => h.file === P.WEIGHT_DECL).length;
    if (auth === 1) authorityHits += 1;
    const unexp = [...classes.keys()].filter((c) => c.startsWith('UNCLASSIFIED'));
    unexplained += unexp.length;
    lines.push(
      `  ${k.key}：命中 ${hits.length} 处 ${JSON.stringify(Object.fromEntries(classes))}` +
        `｜事实对（键＋代表唤醒词／标题）${pairs.length} 处 ${JSON.stringify(Object.fromEntries(pairClasses))}` +
        `｜权威声明 ${auth} 处`,
    );
    summary.push({ key: k.key, hits: hits.length, classes: Object.fromEntries(classes), pairs: pairClasses.size ? Object.fromEntries(pairClasses) : {}, authority: auth });
  }
  // 已搬迁的键不许仍留在未搬迁清单里（"搬走一条＝从这里删一行"的机器证据）。
  const legacyTxt = read(P.LEGACY) || '';
  const stillLegacy = keys.filter((k) => new RegExp(escapeRe(k.key) + '([^a-z0-9.-]|$)').test(legacyTxt)).map((k) => k.key);
  lines.push('体重 9 键仍留在 legacyCommands.ts 里的：' + (stillLegacy.length ? stillLegacy.join('、') : '0 处（随搬迁已删净）'));
  lines.push('结论口径：权威声明恰 1 处 ＝ 单一源；事实对只许落在 FROZEN-PARITY／ROUTE／TEST／DOC／DERIVED（冻结副本有 parity 断言守，见 P5）；出现 UNCLASSIFIED 即"还有手写副本没清"。');
  const ok = authorityHits === keys.length && unexplained === 0 && pairUnexplained === 0 && stillLegacy.length === 0;
  set('P2', ok ? 'PASS' : 'FAIL', ...lines, `权威声明齐=${authorityHits}/${keys.length}；未归类的可疑副本=${unexplained}；未归类的事实对=${pairUnexplained}；仍留在未搬迁清单=${stillLegacy.length}；冻结事实对=${frozenPair}（由 P5 的 parity 断言守）`);
  data('P2', { keys: summary });
}

// ─────────────────────────────────────────────────────────────────────────────
// P3 · 两道机器门
// ─────────────────────────────────────────────────────────────────────────────
function p3Gate() {
  const pkg = read(P.PKG);
  let script = null;
  try {
    script = JSON.parse(pkg).scripts?.['gen:check'] ?? null;
  } catch { /* 由下面统一报 */ }
  const lines = [];
  if (!script) return set('P3', 'PENDING', '根 package.json 没有 gen:check 脚本：这门不存在。');
  lines.push('gen:check 存在：脚本 = ' + script + '；生成器文件存在=' + has(P.GEN));
  const ci = read(P.CI);
  if (ci === null) return set('P3', 'PENDING', '缺 ' + P.CI + '，无法判"门是否在 CI 路径上"。', ...lines);
  const ciLines = ci.split('\n');
  const at = ciLines.findIndex((l) => /pnpm gen:check/.test(l));
  const buildAt = ciLines.findIndex((l) => /pnpm build/.test(l));
  lines.push(`CI：${P.CI}:${at + 1} 调用 \`pnpm gen:check\`；同 job 内 ` + (buildAt >= 0 ? `${P.CI}:${buildAt + 1} 先 \`pnpm build\`（生成器读 dist，缺则必挂）` : '**未见 pnpm build**（生成器读 dist，门可能跑不起来）'));
  return { lines, ok: at >= 0 && buildAt >= 0 && buildAt < at, at: at + 1 };
}

function p3Ratchet() {
  const d = git('diff', '--stat', BASE_COMMIT, '--', P.RATCHET);
  if (d.status !== 0) return { ok: false, why: 'git diff 失败（基线 ' + BASE_COMMIT + ' 不在？）：' + d.out.trim().slice(0, 200) };
  const diff = git('diff', BASE_COMMIT, '--', P.RATCHET).out;
  const head = read(P.RATCHET);
  const base = git('show', BASE_COMMIT + ':' + P.RATCHET).out;
  if (head === null) return { ok: false, why: '棘轮文件不在工作树：' + P.RATCHET };
  const count = (t, re) => (t.match(re) || []).length;
  const headA = count(head, /assert\./g);
  const baseA = count(base, /assert\./g);
  const headT = count(head, /^test\(/gm);
  const baseT = count(base, /^test\(/gm);
  const statText = d.out.trim() || '无差异';
  const lines = [
    `棘轮 ${P.RATCHET} vs ${BASE_COMMIT}：diff 逐字比较 ${diff.trim() === '' ? '为空（未被放宽）' : '非空（见下）'}；--stat=${statText}`,
    `  assert 次数 ${baseA} → ${headA}；test 块 ${baseT} → ${headT}`,
  ];
  const loosened = diff.trim() !== '' && (headA < baseA || headT < baseT);
  return { ok: !loosened, lines, diffBytes: diff.length, loosened, headA, headT, baseA, baseT };
}

function p3DynamicSandbox(env) {
  // 门是否真是一道门：仓外临时根里手改一处生成物 → 非 0；还原 → 0。
  const sb = buildSandbox();
  if (sb) return { ok: false, pending: true, lines: ['动态未跑：' + sb.why] };
  const lines = [];
  const b = gen('check');
  lines.push('沙箱基线 `gen:check` exit=' + b.status + (b.status === 0 ? '（绿）' : '（沙箱不干净，动态部分不判）'));
  if (b.status !== 0) {
    lines.push('已清理临时根：' + cleanupTmp());
    return { ok: false, pending: true, lines };
  }
  const keysPath = join(TMP_ROOT, P.KEYS);
  const orig = readFileSync(keysPath, 'utf8');
  writeFileSync(keysPath, orig + "\n// t293 探针：手改一处生成物\n");
  const bad = gen('check');
  const namesBad = /GEN-CHECK FAIL/.test(bad.out) && /keys\.ts/.test(bad.out);
  lines.push('手改生成物（keys.ts 加一行注释）→ exit=' + bad.status + '，报 GEN-CHECK FAIL=' + namesBad + '（非 0 才是门）');
  writeFileSync(keysPath, orig);
  const back = gen('check');
  lines.push('还原 → exit=' + back.status + (back.status === 0 ? '（回到绿）' : '（未回到绿）'));
  const ok = bad.status !== 0 && namesBad && back.status === 0;
  lines.push('已清理临时根：' + cleanupTmp());
  return { ok, pending: false, lines };
}

async function p3() {
  const gate = p3Gate();
  if (gate.status === 'PENDING') return;
  const ratchet = p3Ratchet();
  const lines = [...gate.lines];
  if (ratchet.why) lines.push('棘轮比较失败：' + ratchet.why);
  else lines.push(...ratchet.lines);
  let dyn;
  try {
    dyn = p3DynamicSandbox(gate);
    lines.push(...dyn.lines);
  } catch (e) {
    dyn = { ok: false, pending: true, lines: ['动态抛错（按 PENDING 记）：' + String(e && e.message)] };
    lines.push(...dyn.lines, '已清理临时根：' + cleanupTmp());
  }
  const ok = gate.ok && ratchet.ok && dyn.ok;
  const status = ok ? 'PASS' : dyn.pending ? 'PENDING' : 'FAIL';
  set('P3', status, ...lines, `门存在=${gate.ok}；棘轮未被放宽=${ratchet.ok === true}；门对"手改生成物"真报红=${dyn.ok}`);
  data('P3', { ciLine: gate.at, ratchetDiffBytes: ratchet.diffBytes, gateDynamic: dyn.ok });
}

// ─────────────────────────────────────────────────────────────────────────────
// P4 · 薄分派
// ─────────────────────────────────────────────────────────────────────────────
function caseStats(rel) {
  const t = read(rel);
  if (t === null) return null;
  const lines = t.split('\n');
  const all = [...t.matchAll(/case '([^']*)'/g)].map((m) => m[1]);
  const cal = all.filter((k) => k.startsWith('calorie.'));
  return { physical: lines.length - 1, caseAll: all.length, caseCalorie: cal.length, caseCalorieUnique: new Set(cal).size };
}

async function p4() {
  const wd = await weightDecls();
  const r = caseStats(P.READ);
  const w = caseStats(P.WRITE);
  if (!r || !w) return set('P4', 'PENDING', '缺分派文件：' + (!r ? P.READ : '') + ' ' + (!w ? P.WRITE : ''));
  const lines = [
    `${P.READ}：case ' 共 ${r.caseAll} 处，calorie. 前缀 ${r.caseCalorie} 处（唯一 ${r.caseCalorieUnique}），物理行 ${r.physical}`,
    `${P.WRITE}：case ' 共 ${w.caseAll} 处，calorie. 前缀 ${w.caseCalorie} 处（唯一 ${w.caseCalorieUnique}），物理行 ${w.physical}`,
  ];
  const readSrc = read(P.READ) || '';
  const writeSrc = read(P.WRITE) || '';
  const regFirst = /const spec = REGISTRY\[key\]/.test(readSrc) && /const spec = REGISTRY\[key\]/.test(writeSrc);
  lines.push('两文件都 registry 先行（cmd_read.ts / write.ts 里各有 `const spec = REGISTRY[key]`）：' + regFirst);
  if (!wd.ok) {
    lines.push('体重键清单拿不到（' + wd.why + '），"体重键在分派层无分支"这条未判。');
    set('P4', 'PENDING', ...lines);
    data('P4', { read: r, write: w, weightBranches: null });
    return;
  }
  const branches = [];
  for (const c of wd.list) {
    const n = ((readSrc + writeSrc).match(new RegExp("case '" + c.key.replace(/\./g, '\\.') + "'", 'g')) || []).length;
    if (n) branches.push(c.key + '×' + n);
  }
  lines.push(`体重 ${wd.reads.length} 读 ＋ ${wd.writes.length} 写 ＝ ${wd.list.length} 键，在分派两个文件里的 case 分支数合计 = ${branches.length}` + (branches.length ? '（' + branches.join('、') + '）' : '（一条也没有）'));
  const ok = branches.length === 0 && regFirst && wd.reads.length === 5 && wd.writes.length === 4;
  set('P4', ok ? 'PASS' : 'FAIL', ...lines);
  data('P4', { read: r, write: w, weightBranches: branches, reads: wd.reads.length, writes: wd.writes.length });
}

// ─────────────────────────────────────────────────────────────────────────────
// P5 · parity：既有断言里，谁在守"体重产物逐条不变"
// ─────────────────────────────────────────────────────────────────────────────
const PARITY = [
  ['packages/skill-calorie/test/sport-homogeneity-109.test.mjs', /view\.weight-history/, '运动/身体域 9 键同质：唤醒词命中 ＋ HTML 同质 ＋ 无假数据（含 view.weight／weight-history／weight-compare／weight-review／volatility）'],
  ['packages/skill-calorie/test/cmd-registry-294.test.mjs', /WEIGHT_COMMANDS\.length,\s*9/, '注册表恰为体重 9 条 ＋ 每条声明形状/标题/写键表与 registry 对账'],
  ['packages/skill-calorie/test/cmd-write-40-persist.test.mjs', /weight\.log/, '写链落库列逐列（weight.log 的 bmi 等）'],
  ['packages/skill-calorie/test/cmd-write-40.test.mjs', /weight\.log/, '写链 parity 抽查（体重写键）'],
  ['packages/skill-calorie/test/render-t41.test.mjs', /weight-history/, '渲染锚点（ilife:calorie:weight-history）'],
  ['test/calorie-routing-81.test.mjs', /weight|436/, '唤醒词路由 parity（冻结词表逐条恰一次，键必在键表内）'],
  ['packages/skill-calorie/test/wake-assets-133.test.mjs', /weight|scene-/, '唤醒词素材与冻结场景表 parity'],
];

async function p5() {
  const lines = ['既有断言（本探针只点名，不重算）：'];
  let found = 0;
  const detail = [];
  for (const [f, re, why] of PARITY) {
    const t = read(f);
    if (t === null) {
      lines.push(`  ✗ 缺 ${f}（${why}）`);
      detail.push({ file: f, ok: false, hits: 0 });
      continue;
    }
    const ls = t.split('\n');
    const hit = ls.map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean);
    if (hit.length) found += 1;
    lines.push(`  ${hit.length ? '✓' : '✗'} ${f}（${why}）命中行 ${hit.slice(0, 6).join(',') || '—'}`);
    detail.push({ file: f, ok: hit.length > 0, hits: hit.length, lines: hit.slice(0, 6) });
  }
  lines.push('判据：守"体重产物逐条不变"的第一条（sport-homogeneity-109）必须在，且合计命中 ≥ 5 处；本探针不自己重算一份 parity。');
  const primary = detail[0].ok;
  const ok = primary && found >= 5;
  set('P5', ok ? 'PASS' : 'FAIL', ...lines, `守 parity 的既有断言命中 ${found}/${PARITY.length}（主守 sport-homogeneity-109 存在=${primary}）`);
  data('P5', { guards: detail });
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await p1();
  } catch (e) {
    set('P1', 'PENDING', 'P1 抛错（按 PENDING 记）：' + String(e && e.message));
  }
  try {
    await p2();
  } catch (e) {
    set('P2', 'PENDING', 'P2 抛错（按 PENDING 记）：' + String(e && e.message));
  }
  try {
    await p3();
  } catch (e) {
    set('P3', 'PENDING', 'P3 抛错（按 PENDING 记）：' + String(e && e.message));
  }
  try {
    await p4();
  } catch (e) {
    set('P4', 'PENDING', 'P4 抛错（按 PENDING 记）：' + String(e && e.message));
  }
  try {
    await p5();
  } catch (e) {
    set('P5', 'PENDING', 'P5 抛错（按 PENDING 记）：' + String(e && e.message));
  }
  try {
    cleanupTmp(); // 兜底：任何提前返回都不留临时根
  } catch { /* 守卫会拦，忽略 */ }

  const ids = ['P1', 'P2', 'P3', 'P4', 'P5'];
  for (const id of ids) if (!R[id]) set(id, 'PENDING', '未执行。');
  const pass = ids.filter((i) => R[i].status === 'PASS').length;
  const pending = ids.filter((i) => R[i].status === 'PENDING');
  const report = { repo: REPO, when: new Date().toISOString(), results: {}, summary: {} };
  for (const id of ids) report.results[id] = { status: R[id].status, lines: R[id].lines, data: R[id].data };

  if (!JSON_ONLY) {
    console.log('=== #293 验收探针 · 命令自治（P1–P5） ===');
    console.log('仓：' + REPO);
    for (const id of ids) {
      console.log('');
      console.log(`${id}: ${R[id].status}`);
      for (const l of R[id].lines) console.log('  ' + l);
    }
    console.log('');
  }
  const summaryLine = `RESULT: ${ids.map((i) => i + '=' + R[i].status).join(' ')} ${pass}/5` + (pending.length ? `（PENDING：${pending.join('、')}）` : '');
  report.summary = { line: summaryLine, pass, pending };
  if (!JSON_ONLY) console.log(summaryLine);
  else console.log(JSON.stringify(report));

  try {
    const outDir = join(REPO, '.scratch', 't293-accept');
    if (existsSync(outDir)) writeFileSync(join(outDir, 'probe-report.json'), JSON.stringify(report, null, 2), 'utf8');
  } catch { /* 报告落盘失败不影响判定 */ }

  process.exitCode = ids.some((i) => R[i].status === 'FAIL') ? 1 : 0;
}

await main();
