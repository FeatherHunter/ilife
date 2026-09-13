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
 *   · 例外（#313 B-3 证据 §⑥1）：**沙箱基线 `gen:check` 非 0 不记 PENDING 而显式判红**——临时根是仓内
 *     现树的副本，基线红即仓内事实（生成物与生成器不一致／声明改了没 build），不是"未判"。
 *
 * 第四版（探针精度 v4，2026-09-14，独立改动席 t293v4）——消两处静默出口 ＋ ④ 分组 ＋ 形状守卫：
 *   · **消静默**：`pinnedCountOfLine()` 原先把「数组下标／数组字面量」（`/\[\s*\d/`）与「与声明对账的派生量」
 *     （`DECLARED_`）两处写成 `return null`——连 ④ 都不进，行就没了。现改为**一律产出可报账的行落进 ④**：
 *     除"锚不在被比操作数位"（消息串／注释里的数字）这一条，不再有任何"无处落账"的行。
 *   · **④ 分组**：④ 的行按「另一侧的形状」分组输出（退出码／差值 · **访问器调用** · 域内量 · 域内 metrics ·
 *     **裸标识符** · 其它，顺序见 `UNDET_GROUPS`＝判定顺序＝输出顺序），每组给计数（空组也发，计数 0 是
 *     "这一形状被查过"的证据）；**裸标识符组单列**——整条另一侧就是一个标识符，它最可能藏"权威总量的别名"。
 *   · **形状守卫**：④ 只保证看得见，不保证看得住——凡登记样名落进 ④，本判据记 `PENDING`，不静默放行。
 *     登记样名＝`registry`／`KEYS`／`DECLARED_`／`TOTAL`（大写）／`总数`／`命令总数`／`权威`／`未搬迁` 一类，
 *     或「裸标识符比较裸数字」的形状（见 `shapeGuard()`）。**按形状与命名判，不按行数判**：④ 有 80 行也照样绿，
 *     只要没有一行是登记样名——行数阈值会把"看得见"换成"永远黄灯"，是比黑洞更坏的失败方向。
 *
 * 第五版（顺序修正，2026-09-14，独立小改动席 t293v41）——`forced` 只作附注，不再降档（复核 S2-1）：
 *   · **先判 subject**：主体＝权威总量 ⇒ 一律 ③（或已登记 ②）判红；`forced`（数组下标／`DECLARED_` 形状）
 *     **只进 `what` 当注**。第四版把 `forced` 放在最前，命中即返 ④ ⇒ 一条真·权威写死
 *     （`assert.equal(KEYS.length, 101, '分组 [3] 的键数');`）被降进 ④，只靠形状守卫兜。
 *   · **④ 加"靠近权威"半边**：主体判不出、但行里带权威语汇（`键`／`KEYS`／`声明`／`registry`／`命令`…）
 *     ⇒ 形状守卫记 `PENDING`（**判不出不是判过**）。第四版的中性名同形状行
 *     （`assert.equal(specs.length, 101, '分组 [3] 的键数');`）④ ＋ 守卫未命中 ⇒ **P1 静默 PASS**，本版堵掉。
 *   · 仍留的残余面（**已知边界，不粉饰**）：中性名 ＋ 无权威语汇消息 ＋ 无样名的权威写死
 *     （`assert.equal(specs.length, 101);`）仍落 ④ 且守卫不命中——那是**没判**不是判过，见证据 §9。
 *
 * 退出码：有 FAIL → 1；否则 0（PENDING 不算红，但会在摘要行里点名）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
  LEGACY_DIR: 'packages/skill-calorie/src/cli/legacy',
  WEIGHT_DECL: 'packages/skill-calorie/src/weight/commands.ts',
  SPEC: 'packages/skill-calorie/src/shared/commandSpec.ts',
  READ: 'packages/skill-calorie/src/cli/cmd_read.ts',
  WRITE: 'packages/skill-calorie/src/cli/write.ts',
  YAML: 'packages/base-combos/combos.yaml',
  BUILD_HELP: 'packages/skill-calorie/scripts/build-help.mjs',
  RATCHET: 'packages/skill-calorie/test/cmd-registry-294.test.mjs',
  ROUTING: 'packages/skill-calorie/src/triggers/routing.ts',
  ROUTES_GEN: 'packages/skill-calorie/src/triggers/routes.generated.ts',
  ROUTE_DECL_DIR: 'packages/skill-calorie/src/cli/legacy/routes',
  GEN_ROUTES: 'packages/skill-calorie/scripts/gen-routes.mjs',
  CI: '.github/workflows/ci.yml',
  PKG: 'package.json',
};
const BASE_COMMIT = '1396d67'; // 棘轮基线（#294 交付点）

/**
 * 未搬迁清单的**场景分区**（`#313` A 段起）：旧单一清单 `src/cli/legacyCommands.ts` 已按完成判据删除，
 * 现值＝ `src/cli/legacy/scene-01.ts`…`scene-10.ts`（一条命令的键恰住一处，按场景分片）。
 * 名单只此一处；少一片 `readLegacy()` 即返回 null，调用方按「探针失能」报红——**不许静默当空清单**。
 */
const LEGACY_FILES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map((n) => P.LEGACY_DIR + '/scene-' + n + '.ts');

/**
 * 路由三面（`#313` B 段起）：记录面＝生成物 `src/triggers/routes.generated.ts`；
 * 声明权威源＝`src/cli/legacy/routes/scene-NN.ts`（未搬迁清单，一场景一件；另有汇总件 `index.ts`）
 * ＋ 各能力 `src/<能力>/routes.ts`（已搬迁键）；类型唯一处＝`src/triggers/routeSpec.ts`。
 * 声明源名单只此一处，缺件即判红（见 `routeSurfaces()`；不许静默少一条）。
 */
const ROUTE_DECL_SCENES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map((n) => P.ROUTE_DECL_DIR + '/scene-' + n + '.ts');
const ROUTE_DECL_AGG = P.ROUTE_DECL_DIR + '/index.ts';
const CAP_SRC_DIR = 'packages/skill-calorie/src';
/** 生成 banner：生成物自证「我是派生件」的那句话（`gen-routes.mjs` 出声时写在头一行）。 */
const ROUTE_BANNER = /本文件由\s*`scripts\/gen-routes\.mjs`\s*生成/;

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
/** 读未搬迁清单（场景分片逐片读并拼接）。任一片读不到 ⇒ null：调用方按「探针失能」判红，不许当空清单。 */
function readLegacy() {
  const parts = LEGACY_FILES.map((p) => read(p));
  return parts.some((t) => t === null) ? null : parts.join('\n');
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
/** 未搬迁清单（十个场景分区）在沙箱里的指纹：逐片取 sha 后拼接（缺片记 MISSING，不静默跳过）。 */
const sandboxShaLegacy = () => LEGACY_FILES.map((p) => sandboxSha(p) ?? 'MISSING').join('|');

// ─────────────────────────────────────────────────────────────────────────────
// P1 · 自治：加一条命令，除能力目录里的声明与生成物外，还要手改哪些文件
//
// 判据分**四档**（① ② ③ 是判红面，④ 是"只报账"面）——#295 红队审查 5af4dd1 指出：只数生成器输出面会报假绿
// （同一个 build-help.mjs 里还有第二处手写的「一条命令的事实」（exampleFor 的逐键 case），
//  另有若干钉死计数的断言也不在派生面上）：
//   ① DERIVED            不用手改（生成物＋分派＋已对账的断言＋路由声明面）
//   ② DISCIPLINED-SHARED 必须手改、但已被认下登记（**登记位＝`docs/skills/skill-calorie/t293-纪律豁免.json`**：
//                         登记项字段齐全、且指得回当刻代码才算生效，缺字段即 P1=FAIL）。**登记件唯一能压的就是
//                         ③ 这一类（主体＝权威总量）的命中** ⇒ 复核登记件时**必须逐条核 reason 真伪**：
//                         机器守得住"字段齐全 ＋ 指得回当刻代码"，守不住"理由成立"
//                         （**#313 B 段起路由已不在这一桶**：声明住能力目录／`legacy/routes/scene-NN.ts`，
//                          汇总位 `src/triggers/routes.generated.ts` 是生成物——归类判据见 routeSurfaces()）
//   ③ UNACCOUNTED        主体＝权威总量、既没派生也没登记 ⇒ 有它就 P1=FAIL
//                        （准入见 pinnedCountOfLine：锚必须在**被比操作数位**）
//   ④ ? UNDETERMINED-SUBJECT  **只报账、不判红**（复核 S1-1 必改）：锚确在被比操作数位，但主体判不出
//                        （域内自己的计数 `xs.length, 10`／退出码 `r.status, 4`／不透明变量 `n, 28`）
//                        ⇒ 逐条列出让人看见；**静默比噪声更坏**——"不报"不等于"没问题"
// ─────────────────────────────────────────────────────────────────────────────

/** 能力目录里带 `commands.ts` 的目录名（升序）——**与生成器 `scanCapabilityNames()` 同一条判据**：
 *  `src/` 下的目录、不以 `_`／`.` 开头、且含 `commands.ts`。按目录枚举，不写死名单（新能力自动进面）。 */
function capabilityDeclDirs() {
  const base = abs(CAP_SRC_DIR);
  if (!existsSync(base)) return null;
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name)
    .filter((n) => has(CAP_SRC_DIR + '/' + n + '/commands.ts'))
    .sort();
}

/** 从一份声明源正文里取「kind ＋ key」对（生成器读的是编译产物，本探针读同一份**源**：
 *  声明源＝事实的家，编译产物只是它的搬运；判据只要 kind／key 两个字段，故源码文本足够且免掉一次 build）。 */
function declPairsOf(src) {
  return [...src.matchAll(/kind:\s*'(read|write)'\s*,\s*key:\s*'([^']+)'/g)].map((m) => ({ kind: m[1], key: m[2] }));
}

/** 现行权威总量（键／写／读／体重）：**与生成器同源**——不是"残留未搬迁清单＋体重"那种推不出全量的
 *  残量，而是遍历生成器自己那两个声明源：`src/<能力>/commands.ts`（能力名升序）＋ `src/cli/legacy/scene-NN.ts`
 *  （文件名升序，跳过 `index.ts`／`types.ts`），按 `key` 合流（同键两处声明即报红，同 `gen-cli.mjs` 的 `merge()`）。
 *
 *  **为什么必须同源**（复核 318 追加裁决）：旧实现只拿「残留未搬迁清单 ＋ 体重声明」当锚集，锚值退化到
 *  `10/4/6/9`，而真实权威是 `101/35/66/9`。后果两条、都不轻：① 真被写死的权威总量（例如 `101`）**连扫都
 *  扫不到**——它等于给这条验收线挖了一个"看不见"的洞；② 剩下的小数字（4／6／9／10）遍地撞，④ 里塞满
 *  退出码之类的噪声，噪声又诱出「④ ≥ N 就记 PENDING」这种把验收线永久黄灯的错药。锚集同源之后两条一起消。
 *  生成器的同源性由 `pnpm gen:check` 守（能力声明与 `keys.ts` 不一致即红），故本函数与生成物同源。 */
async function authorityTotals() {
  const wd = await weightDecls();
  const legacySrc = readLegacy();
  if (legacySrc === null) return { ok: false, why: '未搬迁清单读不到（缺 ' + P.LEGACY_DIR + '/scene-NN.ts 之一）', legacy: [] };
  const capDirs = capabilityDeclDirs();
  if (capDirs === null) return { ok: false, why: '能力目录读不到：' + CAP_SRC_DIR, legacy: [] };
  if (capDirs.length === 0) return { ok: false, why: CAP_SRC_DIR + ' 下一个带 commands.ts 的能力目录都没有（生成器同样会扫空）', legacy: [] };
  // 场景分区逐片（文件名升序，与生成器 scanLegacySceneNames() 同序）；缺失片已在 readLegacy() 出局。
  const legacy = [];
  const seen = new Map();
  const dup = [];
  for (const [from, src] of [
    ...LEGACY_FILES.map((p) => [p, read(p)]),
    ...capDirs.map((n) => [CAP_SRC_DIR + '/' + n + '/commands.ts', read(CAP_SRC_DIR + '/' + n + '/commands.ts')]),
  ]) {
    if (src === null) return { ok: false, why: '声明源读不到：' + from, legacy };
    for (const d of declPairsOf(src)) {
      if (seen.has(d.key)) { dup.push(`${d.key}（${seen.get(d.key)} 与 ${from}）`); continue; }
      seen.set(d.key, from);
      legacy.push({ ...d, from });
    }
  }
  if (dup.length) {
    return { ok: false, why: `同键两处声明（生成器 merge() 在这一步就抛）：${dup.slice(0, 8).join('；')}${dup.length > 8 ? `…共 ${dup.length} 条` : ''}`, legacy };
  }
  if (!wd.ok) return { ok: false, why: wd.why, legacy };
  if (legacy.length === 0) return { ok: false, why: '两份声明源一条声明都没读到（生成器同样会出声为空）', legacy };
  const writes = legacy.filter((c) => c.kind === 'write').length;
  // 体重声明也是**同源**读的（能力目录里的 weight/commands.ts 就在上面那批里）；wd 仍从编译产物读，
  // 供 ② 桶的 exampleFor 对账用（`t.wd.list`），两条口径在 `gen:check` 下必须一致。
  const weight = legacy.filter((c) => c.from === CAP_SRC_DIR + '/weight/commands.ts').length;
  if (weight !== wd.list.length) {
    return { ok: false, why: `体重口径不一致：声明源 ${weight} 条 vs 编译产物 ${wd.list.length} 条（生成物与生成器不一致 ⇒ 先 pnpm build／pnpm gen:check）`, legacy };
  }
  // **同源的机器自证**：拿生成物的键表反查上面这份锚集。声明源与生成物不一致 ⇒ 锚集不可信 ⇒ 判失能，
  // **不许拿一份算错的锚去扫**（那正是"锚集与权威脱节"这个缺陷的复发位）。生成物里写键表单独一块、
  // 读键表在另一块（写键表用展开并入），故两块分别数：写 35 ＋ 读 66 ＝ 101。
  const keysSrc = read(P.KEYS);
  if (keysSrc === null) return { ok: false, why: '生成物读不到：' + P.KEYS + '（锚集拿不到同源对照物）', legacy };
  const wAt = keysSrc.indexOf('CALORIE_WRITE_COMBOS = {');
  const cAt = keysSrc.indexOf('CALORIE_COMBOS = {');
  if (wAt < 0 || cAt < wAt) {
    return { ok: false, why: P.KEYS + ' 的键表块变了形状（找不到 CALORIE_WRITE_COMBOS／CALORIE_COMBOS 块）⇒ 锚集拿不到同源对照', legacy };
  }
  const genWrites = (keysSrc.slice(wAt, cAt).match(/^\s*'[^']+':/gm) || []).length;
  const genReads = (keysSrc.slice(cAt).match(/^\s*'[^']+':/gm) || []).length;
  if (genWrites !== writes || genWrites + genReads !== legacy.length) {
    return {
      ok: false,
      why: `锚集与生成物不一致：声明源 ${legacy.length} 条（写 ${writes}）vs 生成物 ${P.KEYS} ${genWrites + genReads} 条（写 ${genWrites}）`
        + ' ⇒ 锚集不可信（先 pnpm build／pnpm gen:check；**别拿错锚去扫**）',
      legacy,
    };
  }
  return { ok: true, total: legacy.length, writes, reads: legacy.length - writes, weight, legacy, wd, capDirs, genKeys: { writes: genWrites, reads: genReads } };
}

/** ② 桶的登记位：纪律豁免登记件（本探针只读它，不写）。 */
const DISCIPLINE_EXEMPT = 'docs/skills/skill-calorie/t293-纪律豁免.json';
/** 登记件必填字段（缺一条即报错：登记不生效、按未认下记 ⇒ P1=FAIL）。 */
const EXEMPT_FIELDS = ['file', 'line', 'anchor', 'reason', 'enforcer', 'owner', 'date'];
/** 权威总量"主体词"：断言主体讲的是**现行权威总量**（键／声明／registry／未搬迁清单…）才算"钉死权威总量"。
 *  域内自己的计数（照片域 HELP 条目数、HELP 中心分组数…）不在此列。 */
const AUTHORITY_SUBJECT = /KEYS|KEY\b|键|声明|declared|coveredKeys|registry|注册表|未搬迁|legacy|COMMAND|命令|receipt|SCENARIO|WRITE|READ|权威|WEIGHT|体重/i;
/** 消息文本必须点名"权威出处"才算主体——只说"10 键"不够：照片域的 10 键也带"键"字，而"键／KEYS"是
 *  **锚自己的量纲词**、不是出处（#318 实测：全仓声明源里含 photo 的键只有 8 条，`calorie.body-photo.*` 0 条）。 */
const AUTHORITY_SOURCE = /registry|注册表|\bkeys?\b|KEYS|声明|declared|coveredKeys|未搬迁|legacy|command|命令|权威/i;
/** "被比的是一个量（计数）"的形状说明——`.length`／`.total`／`.size` 一类。**注意（第二轮收紧）**：
 *  这类"**域内计数**"现在**一律不报**（见 pinnedCountOfLine 的准入门槛）。这里只剩形状说明，
 *  不再参与判定；留着是为了让后来者一眼看见"哪些形状是故意不认的"。 */
const DOMAIN_COUNT_SHAPES = /\.length\b|\.size\b|\.count\b|\btotal\b/;   // 说明用：域内计数的典型形状（不参与判定）

/** 断言行"剔噪"：逐字符扫（不用正则硬啃）——**转义引号**（`\'`／`\\`）与字符串里的 `//` 都不许误判。
 *  返 { code, strings }：code ＝ 只剩表达式骨架（字符串换成 `""`、行尾注释整段摘掉），
 *  strings ＝ 各字符串字面量内容（消息串留作"主体语义"的证据，不当操作数看）。 */
function lexAssertionLine(text) {
  let code = '';
  const strings = [];
  let quote = null;
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') { buf += text[i + 1] ?? ''; i++; continue; }   // \' \" \\ ：不结束字符串
      if (c === quote) { strings.push(buf); buf = ''; quote = null; code += '""'; continue; }
      buf += c;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && text[i + 1] === '/') break;                     // 行尾注释：起处截断
    code += c;
  }
  if (quote) strings.push(buf);                                      // 未闭合也当字符串（宁可漏判，不可把串里的数字当操作数）
  return { code, strings };
}

/** 拆顶层逗号（字符串已在 code 里换成 ""，故括号／方括号／花括号计深度即可）。 */
function splitTopLevelArgs(s) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** 取一行里**每个** assert 调用的「方法名 ＋ 顶层实参」（按括号配平切，不要求调用收在行尾——
 *  一行里 `{ assert.equal(xs.length, 10); }`／`if (c) assert.ok(n === 10, '…')` 这种形状同样算）。
 *  字符串已在 code 里换成 `""` ⇒ 括号配平不会被串里的括号带偏；未闭合（跨行断言）返 null，宁缺勿滥。 */
function assertCalls(code) {
  const out = [];
  const re = /\bassert\s*(?:\.\s*([A-Za-z]+))?\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let close = -1;
    for (let i = open; i < code.length; i++) {
      const c = code[i];
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) { close = i; break; } }
    }
    if (close < 0) return out;                       // 未闭合：整行放弃
    out.push({ method: m[1] ?? null, args: splitTopLevelArgs(code.slice(open + 1, close)) });
    re.lastIndex = close + 1;                        // 继续找下一个调用（一行可能有多个）
  }
  return out;
}

/** 取**被比操作数对**：只认两种形态，宁缺勿滥——
 *   · `assert.<equals|equal|strictEqual|notStrictEqual|notEqual|deepEqual|notDeepEqual>(A, B[, 消息…])` ⇒ [A, B]
 *   · `assert.<equals|equal|strictEqual|notStrictEqual|notEqual|deepEqual|notDeepEqual|deepStrictEqual|notDeepStrictEqual>(A, B[, 消息…])` ⇒ [A, B]
 *   · `assert.ok(A === B)`／`assert(A === B)`（含 == !== !=）                                                 ⇒ [A, B]
 *  其余（`assert.match(k, /re/)`、`assert.ok(x > 10, 消息)`、`assert.ok(k.includes('10'))`）不认。
 *  一行有多个 assert 时，取**第一个能给出操作数对**的那个（够用：本探针只问"这一行有没有把锚当被比操作数"）。
 *  已知边界（复核 S2-2，见证据 §9）：**跨行的 assert 调用**（`assert.equal(\n  n,\n  28,\n)`）逐行看不出——
 *  `assertCalls()` 遇未闭合括号即放弃该行，锚那一行又没有 assert 面 ⇒ 两边都不报，属未覆盖面（不是"判过"。 */
function comparedOperands(code) {
  const EQ = /^(equals|equal|strictEqual|notStrictEqual|notEqual|deepEqual|notDeepEqual|deepStrictEqual|notDeepStrictEqual)$/;
  for (const call of assertCalls(code)) {
    if (call.method !== null && call.method !== 'ok') {
      if (!EQ.test(call.method)) continue;
      if (call.args.length >= 2) return [call.args[0], call.args[1]];
      continue;
    }
    const expr = call.args[0] ?? '';
    const op = /(===|!==|==|!=)/.exec(expr);
    if (!op) continue;
    return [expr.slice(0, op.index).trim(), expr.slice(op.index + op[0].length).trim()];
  }
  return null;
}

/** 锚是否落在**被比操作数位**（操作数字面量恰等于锚）：是 ⇒ 返另一侧操作数文本，否则 null。 */
function anchorAsOperand(code, value) {
  const ops = comparedOperands(code);
  if (!ops) return null;
  const [a, b] = ops;
  const isAnchor = (s) => typeof s === 'string' && s.replace(/\s/g, '') === String(value);
  if (isAnchor(a)) return b;
  if (isAnchor(b)) return a;
  return null;
}

/** 单行判据（**纯函数**，探针与对抗复核席共用同一份；无 IO、无副作用）——
 *  **准入门槛（第二轮收紧）**：只有"**断言主体就是权威总量**"的钉死字面量才算命中：
 *   ① 锚落在**被比操作数位**（字面量恰等；消息串／注释里的数字在剔噪后自然出局）；
 *   ② 主体讲**权威总量**——另一侧操作数带 keys／键／声明／registry／未搬迁／命令…，或消息串**点名权威出处**；
 *   ③ ①② 都成立 ⇒ 命中（`subject:'authority'`）⇒ 再看登记位：在册记 ②，未登记记 ③。
 *  **域内计数一律不报**（`xs.length, 10`／`r.total, 4`／`s.size, 6` 一类，形状见 DOMAIN_COUNT_SHAPES）：
 *  它们不随别域命令迁移而变，值撞锚纯属巧合（#318 实测：未搬迁清单 19→1、锚变 10/4/6 后"小数字遍地撞"）；
 *  但**不许静默**（复核 S1-1：静默比噪声更坏——"不报"不等于"没问题"）⇒ 它们落 **④ ? UNDETERMINED-SUBJECT**：只报账、不判红。
 *  退出码（`r.status`）／差值／布尔／餐别名同理归 ④。
 *
 *  **第四版（消静默）**：原先另有两处 `return null`——`/\[\s*\d/`（数组下标／数组字面量）与 `DECLARED_[A-Z_]+`
 *  （与声明对账的派生量）——连 ④ 都不进，行就没了（复核 V3-4 实测三例：`KEYS.length, 28, '分组 [3] 的键数'`／
 *  `KEYS[0].length`／`DECLARED_KEYS.length`）。第四版改成**一律产出可报账的行**（`forced` 注明是哪个原静默出口，
 *  派生的 `subject` 一律 `'undetermined'`），**不再有"无处落账"的行**（"锚不在被比操作数位"这条保留：消息串／注释里的
 *  数字本就不该当操作数看）。落 ④ 的行若带登记样名 ⇒ 形状守卫 `shapeGuard()` 把 P1 记 `PENDING`。
 *  **第五版只改顺序、不改"消静默"**：这三例仍然可报账（不再消失），但 `forced` 降为附注、不再改桶（见下）。
 *
 *  **第五版（顺序修正，复核 S2-1）**：第四版把 `forced` 判定放在**最前**——命中即返
 *  `{subject:'undetermined'}`、连主体都不看。两处后果：
 *   · 一条**真·权威写死**只要形状带 `[数字]` 就被降进 ④（`KEYS.length, 101, '分组 [3] 的键数'`），只剩形状守卫兜；
 *   · **中性命名**的同形状行（`specs.length, 101, '分组 [3] 的键数'`）连守卫也不命中 ⇒ **P1 静默 PASS**（具体假绿样例）。
 *  根因：`[数字]`／`DECLARED_` 是**形状线索**，而"数组下标"这条原先吃的是**整行原文**——消息串里的 `[3]`
 *  也被当成数组下标。线索不能压主体。
 *  **本版顺序：先判 subject，`forced` 只作附注、不改任何一行的桶**：
 *   · 主体＝权威总量 ⇒ `authority`（在册记 ②、未登记记 ③ ⇒ P1 判红），`forced` 进 `what` 当注；
 *   · 主体判不出 ⇒ ④ 报账，`forced` 也在 `what` 里说明"这行形状命中原静默出口"；
 *   · ④ 里"**靠近权威**"的语汇线索（`键`／`KEYS`／`声明`／`registry`／`命令`…）由 `shapeGuard()` 记 `PENDING`
 *     ——贴着权威又判不出，只能记未判，不许静默放行。
 *  `forced` 的**形状口径**：`[数字]` 按**表达式骨架** `code` 判（消息串里的 `[3]` **不是**数组下标，单列成另一条附注）。 */
export function pinnedCountOfLine(text, value) {
  const { code, strings } = lexAssertionLine(text);
  const other = anchorAsOperand(code, value);
  if (other === null) return null;                    // 不是被比操作数（消息文本／注释里的数字在此出局）
  // 形状附注（**只作附注，不改桶**，见上方第五版注释）：记"这行形状在第四版之前会不会被吞掉"。
  const forced = /\[\s*\d/.test(code)
    ? '数组下标／数组字面量形状（原 /\\[\\s*\\d/ 静默出口）'
    : strings.some((s) => /\[\s*\d/.test(s))
      ? '消息串里带 `[数字]`（原 /\\[\\s*\\d/ 出口会误吞的形状；按表达式骨架判，它**不是**数组下标）'
      : /DECLARED_[A-Z_]+/.test(code)
        ? '与声明对账的派生量（原 DECLARED_ 静默出口）'
        : null;
  // **先判 subject**（第五版顺序修正）：主体是权威总量 ⇒ 一律 authority，线索（forced）不参与降档。
  const authority = AUTHORITY_SUBJECT.test(other) || strings.some((s) => AUTHORITY_SOURCE.test(s));
  return {
    subject: authority ? 'authority' : 'undetermined',
    other: other.trim(),
    text: text.trim().slice(0, 150),
    forced: forced ?? null,
  };
}

/** 归类（**纯函数**）——三档归属：
 *   · 主体＝权威总量 ⇒ 登记在册记 ② 'disciplined'，没登记记 ③ 'unaccounted'（**③ 非空 ⇒ P1=FAIL**）；
 *   · 主体判不出 ⇒ ④ 'undetermined'（**只报账、不判红**；锚确在被比操作数位，但既不是权威总量、也算不出属于哪个域）。
 *  登记位只服务 ③ 这一类"必须手改但已被认下"的面：登记是**大声的**——② 逐条打印 reason ＋ 机器守，
 *  登记件进 git，字段齐全 ＋ 指得回当刻代码才算数（缺一即报错 ⇒ 进 ③ ⇒ P1=FAIL）。
 *  第四版起：`h.forced` 非空的行（原先两处静默出口）也归 ④，`what` 里写明它是从哪个静默出口捞出来的。
 *  **第五版起**：`forced` 不再改桶，只进 `what` 当**附注**——主体＝权威总量的行一律 ②／③（判红面），
 *  主体判不出的落 ④；④ 里"靠近权威"的语汇线索由形状守卫记 `PENDING`（见 `shapeGuard()`）。 */
export function classifyPinnedHit(h, exemptions) {
  const where = h.file + ':' + h.line;
  const note = h.forced ? `｜**原静默出口形状**（第五版起只作附注、不再据此降档）：${h.forced}` : '';
  if (h.subject !== 'authority') {
    return {
      bucket: 'undetermined',
      where,
      what: `主体判不出（另一侧＝${h.other}）：锚撞上了权威总量的**数值**，但这一行既不是权威总量、也算不出属于哪个域 ⇒ 只报账、不判红——${h.text}${note}`,
      other: h.other,
      text: h.text,
      forced: h.forced ?? null,
    };
  }
  const what = `钉死${h.what}断言（字面量 ${h.value}）：主体＝权威总量（另一侧＝${h.other}）⇒ 加删一条命令必须手改本行——${h.text}`;
  const reg = exemptions.get(`${h.file}:${h.line}#${h.value}`);
  if (reg) return { bucket: 'disciplined', where, what: `已认下登记（登记件在册）：${reg.reason}${note}`, enforcer: reg.enforcer };
  return { bucket: 'unaccounted', where, what: `${what}｜**未登记**：${DISCIPLINE_EXEMPT} 里没有这条 file:line:锚${note}` };
}

/** ④ 的分组名（**顺序＝判定顺序＝输出顺序**，与验收口径逐字同序：退出码／域内量／域内 metrics／访问器／
 *  **裸标识符**／其它）。「裸标识符」单列且排在「其它」之前：整条另一侧就是一个标识符
 *  （`n`／`total`／`count`／`cnt`／`REGISTRY_TOTAL`）——这是**最可能藏"权威总量别名"**的形状。
 *  **顺序是口径的一部分，不是排版**：判定按序短路，换序会静默改掉既有行的组别。当刻活树唯一两侧都成立的
 *  形状是「调用后取量」（`buildPhotoHelp().length`）：既像"访问器"又像"域内量"。本判据先判**调用形状**
 *  （`()` 后取成员／整条就是一个调用）⇒ 它留在**访问器**组——与第三版逐行一致（第三版 4 行归组不变，
 *  见证据表）。判序写进本常量，故"输出顺序"与"判定顺序"永远同一份事实，不会各行其是。 */
export const UNDET_GROUPS = ['退出码／差值', '访问器调用', '域内量', '域内 metrics', '裸标识符', '其它'];

/** 按「另一侧的形状」定组（**纯函数**，只吃另一侧操作数文本）。判定顺序即 `UNDET_GROUPS` 顺序，逐条可复算：
 *   · 退出码／差值：`.status`／`…exit`／`…delta`（含 `run(…).status` 这类调用链——**先于**"访问器"判）；
 *   · 访问器调用：调用后取成员（`buildPhotoHelp().length`）或整条就是一个调用（`countOf(html,'…')`）；
 *   · 域内量：`.length`／`.size`／`.total`／`.count`（`d.total`／`names.size`）；
 *   · 域内 metrics：`.metrics.` 路径（`out.data.metrics.meals`）；
 *   · 裸标识符：整条就是一个标识符（无点、无调用、无运算）；
 *   · 其它：其余（算术式、字面量、数组…）。 */
export function undetGroupOf(other) {
  const s = String(other ?? '').trim();
  if (/\.status\b|exit\b|delta/i.test(s)) return '退出码／差值';
  if (/\)\s*[.[]/.test(s) || /^[A-Za-z_$][\w$]*\s*\(/.test(s)) return '访问器调用';
  if (/\.(length|size|total|count)\b/.test(s) || /\btotal\b/.test(s)) return '域内量';
  if (/\.metrics\./.test(s)) return '域内 metrics';
  if (/^[A-Za-z_$][\w$]*$/.test(s)) return '裸标识符';
  return '其它';
}

/** ④ 分组（**纯函数**）：每组给计数，行随组。**空组也输出**——计数 0 是"这一形状被查过"的证据，
 *  不发出来就会被读成"没查"。 */
export function groupUndetermined(rows) {
  const by = new Map(UNDET_GROUPS.map((g) => [g, []]));
  for (const r of rows) {
    const g = undetGroupOf(r.other);
    by.get(g).push(r);
  }
  return UNDET_GROUPS.map((name) => ({ name, count: by.get(name).length, rows: by.get(name) }));
}

/** 登记样名（形状守卫的正例）——**分大小写两半**，理由可复算：
 *   · 不分大小写那一半：`registry`／`注册表`／`declared`／钥匙词 `keys?`／`SCENARIO_KEYS`／`未搬迁`；
 *   · 只认大写那一半：`TOTAL`／`总数`／`命令总数`／`权威`——`d.total`／`out.data.total` 是**域内量**（小写属性名），
 *     把它们当登记样名会让 ④ 里凡带 `.total` 的行永久黄灯（当刻活树就有 3 行），不是本守卫要抓的东西。
 *  **只吃「另一侧操作数」与「整行原文」，不吃文件名**：文件名带 `legacy`／`registry` 的是分区／注册表测试，
 *  不证明这一行是登记样名；把路径计进来同样会让 P1 永久黄灯（当刻活树就有 1 行落在 legacy-partition 件里）。 */
const REGISTRY_LIKE_CI = /registry|注册表|declared|\bkeys?\b|scenario_keys|未搬迁/i;
const REGISTRY_LIKE_CS = /\bTOTAL\b|总数|命令总数|权威/;

/** **靠近权威**的语汇线索（第五版新增，**只喂给守卫**，不参与 `authority` 判定）——两半分工，别混：
 *   · 主体判据要的是**出处**（`registry`／`注册表`／`声明`／`declared`／`命令`／`权威`…）才判红：
 *     量纲词 `键`／`KEYS` 单凭自己不够（照片域的"10 键"也带"键"，见 `AUTHORITY_SOURCE` 注释）；
 *   · 形状守卫吃的是**线索**：一条**判不出主体**的行只要贴着权威语汇（含量纲词），就只能记**未判**
 *     （`PENDING`）——**判不出不是判过**。第四版的具体假绿样例
 *     （`assert.equal(specs.length, 101, '分组 [3] 的键数');`：④ ＋ 守卫未命中 ⇒ P1=PASS）就在这条上被堵掉。
 *  纪律与上面两半**逐条相同**：**不吃文件路径**（`cmd-registry-294` 一类件名会让 P1 永久黄灯）；
 *  `TOTAL` 只认大写 ⇒ 本常量**不带** `TOTAL`、把大小写口径留给 `REGISTRY_LIKE_CS`（`d.total` 是域内量，不许误伤）。 */
const NEAR_AUTHORITY_CI = /KEYS|KEY\b|键|声明|declared|coveredKeys|registry|注册表|未搬迁|legacy|COMMAND|命令|receipt|SCENARIO|WRITE|READ|权威|WEIGHT|体重|总数/i;

/** 形状守卫（**纯函数**）：④ 里出现登记样名、**靠近权威的语汇线索**，或「裸标识符比较裸数字」的形状
 *  ⇒ `pending=true` 并逐条列出（每条写清是哪半边命中的）。
 *  **按形状与命名判，不按行数判**——当刻活树 ④ 有 81 行、没有一行是登记样名 ⇒ 仍然全绿；
 *  反过来，哪怕 ④ 只有 1 行、只要它是 `KEYS.length` 或裸标识符对裸数字，就记 `PENDING`（不判红、也不放行）。
 *  理由：黑洞的危险不在行数，而在"某个真权威锚躲在 ④ 里"。 */
export function shapeGuard(rows) {
  const flagged = [];
  for (const r of rows) {
    const other = String(r.other ?? '');
    const text = String(r.text ?? '');
    const ci = REGISTRY_LIKE_CI.test(other) || REGISTRY_LIKE_CI.test(text);
    const cs = REGISTRY_LIKE_CS.test(other) || REGISTRY_LIKE_CS.test(text);
    const near = NEAR_AUTHORITY_CI.test(other) || NEAR_AUTHORITY_CI.test(text);
    const bare = undetGroupOf(r.other) === '裸标识符';
    if (!ci && !cs && !near && !bare) continue;
    const nameWhy = ci || cs
      ? '登记样名（' + [ci ? 'keys／registry／declared 一类' : null, cs ? '权威总量词（大写 TOTAL／总数）' : null].filter(Boolean).join('，') + '）'
      : null;
    const nearWhy = near && !ci && !cs
      ? '靠近权威的语汇线索（主体判据没认——它要的是**出处**、不是量纲词；贴着权威又判不出 ⇒ 只记未判）'
      : null;
    flagged.push({
      where: r.where,
      why: [nameWhy, nearWhy, bare ? '「裸标识符比较裸数字」形态' : null].filter(Boolean).join(' ＋ '),
      other: r.other,
      text: r.text,
    });
  }
  return { pending: flagged.length > 0, rows: flagged };
}

/** P1 状态口径（**纯函数**）：形状守卫命中 ⇒ `'PENDING'`；未命中 ⇒ `null`（不参与 P1 状态判定）。
 *  **PENDING＝未判**：不是 FAIL（登记样名落进 ④ 本身还不是"漏了一条权威断言"的证据），
 *  更不是静默通过（`PENDING` 会进摘要行的 `（PENDING：…）`，也拿不到"5/5"里的那一分）。
 *  这就是「④ 只保证看得见，不保证看得住」在状态机里的落点——把守卫的 `pending` 接进 P1 的 `verdict()`，
 *  而不是只把守卫**打印**出来（打印不等于拦截：只打印＝看得见，接进状态＝看得住）。 */
export function undetVerdict(guard) {
  return guard && guard.pending ? 'PENDING' : null;
}

/** 钉死计数扫描：本函数只负责**找行**（`git grep` 出"含锚"的候选行），判据全在 pinnedCountOfLine。
 *  `grepFn` 可换（对抗复核席把仓根指向临时副本时换掉它，判据与归类仍是同一份代码）。 */
export function scanPinnedCounts(t, grepFn = git) {
  const anchors = [
    { v: t.total, what: '总键数' },
    { v: t.writes, what: '写键数' },
    { v: t.reads, what: '读键数' },
    { v: t.weight, what: '体重键数' },
  ];
  const hits = [];
  const seen = new Set();
  for (const a of anchors) {
    const g = grepFn('grep', '-n', '-E', '-e', '\\b' + a.v + '\\b', '--', 'packages/skill-calorie/test', 'test');
    if (g.status !== 0 && !g.out.trim()) continue;
    for (const raw of g.out.split('\n').filter(Boolean)) {
      const i1 = raw.indexOf(':');
      const i2 = raw.indexOf(':', i1 + 1);
      if (i1 < 0 || i2 < 0) continue;
      const file = raw.slice(0, i1).replace(/\\/g, '/');
      const line = Number(raw.slice(i1 + 1, i2));
      const text = raw.slice(i2 + 1).trim();
      const k = file + ':' + line;
      if (seen.has(k)) continue;
      seen.add(k);
      const hit = pinnedCountOfLine(text, a.v);
      if (hit) hits.push({ file, line, what: a.what, value: a.v, ...hit });
    }
  }
  return hits;
}

/** 探针自己用：扫描当刻仓根。 */
function pinnedCountSurfaces(t) {
  return scanPinnedCounts(t, git);
}

/** 读＋**机器校验** ② 桶的登记位（只读，不写）。三条机械判据：
 *   ① 登记件读得到、是合法 JSON、顶层是数组（或 `{ exemptions: [...] }`）；
 *   ② 每条字段齐全（缺一条即错误：登记不生效）；
 *   ③ 每条**指得回当刻代码**——该行确实把锚当被比操作数（删／改过那行 ⇒ 登记作废、报错，不许当挡箭牌）。
 *  errors 非空 ⇒ 调用方按"登记不生效"记红（缺字段即报错）：不许留一个永远为空却被承诺的桶。 */
export function loadExemptions(file = DISCIPLINE_EXEMPT) {
  const entries = new Map();
  const errors = [];
  const raw = read(file);
  if (raw === null) return { entries, errors: [`登记件读不到：${file}（② 桶没有登记位 ⇒ 纪律通道失效）`] };
  let json;
  try { json = JSON.parse(raw); } catch (e) { return { entries, errors: [`登记件不是合法 JSON：${e.message}`] }; }
  const list = Array.isArray(json) ? json : json.exemptions;
  if (!Array.isArray(list)) return { entries, errors: ['登记件顶层要 { "exemptions": [...] }（或直接是数组）'] };
  list.forEach((e, i) => {
    const at = `${file}[${i}]`;
    if (!e || typeof e !== 'object') { errors.push(`${at} 不是对象`); return; }
    const miss = EXEMPT_FIELDS.filter((f) => e[f] === undefined || e[f] === null || String(e[f]).trim() === '');
    if (miss.length) { errors.push(`${at} 缺字段：${miss.join('／')}（必填 ${EXEMPT_FIELDS.join('／')}）`); return; }
    // line／anchor 必须是**数字**（复核 S3-1：`"28"` 这种数字字符串以前被 Number() 收下 ⇒ 口径不一，一律拒收）
    if (typeof e.line !== 'number' || !Number.isInteger(e.line) || e.line <= 0) { errors.push(`${at} 的 line 必须是正整数（不许字符串）：${JSON.stringify(e.line)}`); return; }
    if (typeof e.anchor !== 'number' || !Number.isInteger(e.anchor)) { errors.push(`${at} 的 anchor 必须是整数（不许字符串）：${JSON.stringify(e.anchor)}`); return; }
    const line = e.line;
    const anchor = e.anchor;
    const key = `${e.file}:${line}#${anchor}`;
    if (entries.has(key) || list.filter((x) => x && x.file === e.file && x.line === line && x.anchor === anchor).length > 1) {
      errors.push(`${at} 重复登记：${key} 在登记件里出现多次（去重是静默的 ⇒ 口径不明；请合并成一条）`);   // 复核 S3-2
      return;
    }
    const src = read(String(e.file));
    if (src === null) { errors.push(`${at} 指的文件读不到：${e.file}`); return; }
    const lineText = src.split('\n')[line - 1];
    if (lineText === undefined) { errors.push(`${at} 指的 ${e.file}:${line} 不存在`); return; }
    if (anchorAsOperand(lexAssertionLine(lineText).code, anchor) === null) {
      errors.push(`${at} 指不回当刻代码：${e.file}:${line} 已不再把 ${anchor} 当被比操作数（登记项作废，请重登或删）`);
      return;
    }
    entries.set(key, {
      where: `${e.file}:${line}`,
      anchor,
      reason: String(e.reason),
      enforcer: String(e.enforcer),
      owner: String(e.owner),
      date: String(e.date),
    });
  });
  return { entries, errors };
}

/** exampleFor：判它是**派生**（读生成表）还是**手写**（逐键一条 case）。两种形态都见过：
 *   · 返修前：函数体里 101 条 `case '<key>':` ＋ `default: throw`（＝同一文件里第二处手写的事实表）；
 *   · 返修后（#295 A3）：函数体读 gen-cli.mjs 生成的 EXAMPLE 标记块（示例住声明的 `example` 字段）。
 *  形态不认识 ⇒ 按"未认下"记（宁可报红，不报假绿）。 */
function exampleForSurface() {
  const bh = read(P.BUILD_HELP);
  if (bh === null) return { ok: false, why: '缺 ' + P.BUILD_HELP };
  const idx = bh.indexOf('function exampleFor(');
  if (idx < 0) return { ok: false, why: P.BUILD_HELP + ' 里找不到示例函数 exampleFor（若又改形态，请更新本探针）' };
  const cut = bh.indexOf('\n}', idx);
  const bodyEnd = cut > idx ? cut : bh.length;
  const body = bh.slice(idx, bodyEnd);
  const cases = [...body.matchAll(/case '([^']+)':/g)].map((m) => m[1]);
  const startLine = bh.slice(0, idx).split('\n').length;
  const endLine = bh.slice(0, bodyEnd).split('\n').length;
  const rest = bh.slice(idx);
  const dflt = rest.match(/default:\s*throw|throw new Error\('exampleFor 缺 case/);
  const base = { ok: true, cases, startLine, endLine, defLine: dflt ? bh.slice(0, idx + rest.indexOf(dflt[0])).split('\n').length : null };
  if (cases.length) return { ...base, kind: 'handwritten' };
  const ms = bh.lastIndexOf('// -- GEN-CLI-START EXAMPLE', idx);
  const me = bh.lastIndexOf('// -- GEN-CLI-END EXAMPLE', idx);
  const table = ms >= 0 && me > ms ? bh.slice(ms, me) : null;
  if (!table) return { ...base, kind: 'unknown', why: '函数体既没有逐键 case，也不见 gen-cli 的 EXAMPLE 标记块' };
  const nm = /const\s+([A-Za-z_$][\w$]*)\s*=\s*\{/.exec(table);
  const readTable = nm && new RegExp('\\b' + nm[1] + '\\s*\\[').test(body) ? nm[1] : null;
  if (!readTable) return { ...base, kind: 'unknown', why: '有 EXAMPLE 标记块，但函数体没读那张表' };
  const spec = read(P.SPEC) || '';
  return {
    ...base,
    kind: 'derived',
    table: readTable,
    tableEntries: (table.match(/^\s*'[^']+':/gm) || []).length,
    specHasExample: /readonly example/.test(spec) || /\bexample\??:\s*string/.test(spec),
  };
}

/** `gen-cli.mjs` 的 `targets` 数组（`pnpm gen:check` 逐件比对的输出面）：从生成器源码里切出来，不靠自述。 */
function genTargetsBlock() {
  const src = read(P.GEN);
  if (src === null) return null;
  const i = src.indexOf('const targets = [');
  if (i < 0) return null;
  const j = src.indexOf('\n  ];', i);
  return j < 0 ? src.slice(i) : src.slice(i, j);
}

/** 能力目录里的路由声明面（`src/<能力>/routes.ts`）：按目录枚举，不写死名单（新能力自动进面）。 */
function capabilityRouteDecls() {
  const base = abs(CAP_SRC_DIR);
  if (!existsSync(base)) return null;
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => CAP_SRC_DIR + '/' + d.name + '/routes.ts')
    .filter((p) => has(p))
    .sort();
}

/** 路由三面（`#313` B 段起）：**记录面＝生成物**，不是手写表。
 *
 * 「`routing.ts`（路由）归派生侧」这句**不许硬写**：下面五条机械判据各有 FAIL 分支，任一条不成立就把
 * 路由整面移进 ③ UNACCOUNTED（⇒ P1=FAIL）——即「归类」本身是被判据钉住的（变异可打红，见
 * `docs/skills/skill-calorie/t313b4-变异自证.mjs`）：
 *   a) 生成物在，且带生成 banner（「本文件由 `scripts/gen-routes.mjs` 生成」）；
 *   b) 生成物**在 `gen-cli.mjs` 的 `targets` 数组里**（`pnpm gen:check` 逐件比对 targets ⇒ 这门真覆盖它）；
 *   c) `gen-routes.mjs` 出声靠 `routeDeclarationSources()`（声明源清单），不是内置表；
 *   d) 声明源齐：`legacy/routes/scene-01..10.ts` 十片全在 ＋ 至少一件能力 `routes.ts`；
 *   e) 记录面真落在这里：生成物有记录（exec > 0），且 `routing.ts` 自身已不带 `kind:'exec'` 记录。
 */
function routeSurfaces() {
  const r81 = read('test/calorie-routing-81.test.mjs');
  const enforcer = r81 ? r81.split('\n').findIndex((l) => /coveredKeys:\s*DECLARED_KEYS\.length/.test(l)) + 1 : null;
  const gen = read(P.ROUTES_GEN);
  const routing = read(P.ROUTING);
  const genCliSrc = read(P.GEN) || '';
  const genRoutesSrc = read(P.GEN_ROUTES);
  const block = genTargetsBlock();
  const missingScenes = ROUTE_DECL_SCENES.filter((p) => !has(p));
  const caps = capabilityRouteDecls();
  const fails = [];

  // a) 生成物 ＋ 生成 banner
  const banner = gen !== null && ROUTE_BANNER.test(gen);
  if (gen === null) fails.push({ where: P.ROUTES_GEN, what: '生成物不在 ⇒ 记录面没有落点，「归派生侧」无从成立（先看 gen-cli 的 targets 与 gen-routes 是否还在）' });
  else if (!banner) fails.push({ where: P.ROUTES_GEN, what: '生成物没有生成 banner（应含「本文件由 `scripts/gen-routes.mjs` 生成」）⇒ 它自证不了是派生件，归类不成立' });

  // b) 它在 gen-cli 的 targets 数组里 ⇒ `pnpm gen:check` 真覆盖它
  const inTargets = block !== null && block.includes('routes.generated.ts');
  if (!inTargets) fails.push({ where: P.GEN, what: '生成物不在 gen-cli 的 `targets` 数组里（或 targets 数组切不出来）⇒ `pnpm gen:check` 不比对它 ⇒ 这条派生没有门守' });
  if (!/from '\.\/gen-routes\.mjs'/.test(genCliSrc)) fails.push({ where: P.GEN, what: 'gen-cli 没引 `./gen-routes.mjs` ⇒ 生成物不是它出声的（或出声道换了，本探针要跟着改）' });

  // c) gen-routes 出声靠声明源清单
  if (genRoutesSrc === null) fails.push({ where: P.GEN_ROUTES, what: '缺生成器 gen-routes.mjs ⇒ 记录面是谁出声的未知' });
  else if (!/routeDeclarationSources\s*\(/.test(genRoutesSrc)) fails.push({ where: P.GEN_ROUTES, what: 'gen-routes 里不见 `routeDeclarationSources(` ⇒ 出声不靠声明源清单（改了声明也没人发现）' });

  // d) 声明源齐
  if (missingScenes.length) fails.push({ where: missingScenes.join('、'), what: '路由声明缺件：未搬迁清单的场景分片 scene-01..10 少 ' + missingScenes.length + ' 片' });
  if (caps === null || caps.length === 0) fails.push({ where: CAP_SRC_DIR + '/*/routes.ts', what: '一件能力路由声明都没有（`src/<能力>/routes.ts`）⇒ 已搬迁键的记录面没有权威源' });
  if (!has(ROUTE_DECL_AGG)) fails.push({ where: ROUTE_DECL_AGG, what: '缺路由声明汇总件（十片拼接）' });

  // e) 记录面真落在这里：生成物有记录，且 routing.ts 自身不再带记录
  const recs = gen === null ? null : {
    total: (gen.match(/^ {2}\{ wakeWord: /gm) || []).length,
    exec: (gen.match(/^ {2}\{ wakeWord: .*kind: 'exec'/gm) || []).length,
    // 逐列表条数（只作报账：与票面数字 WAKE_ROUTES／ALL_ROUTES 对得上；判据用上面两个总计数）
    byList: Object.fromEntries(
      [...gen.matchAll(/export const (\w+)[^=\n]*= \[\n([\s\S]*?)\n\];/g)]
        .map((m) => [m[1], (m[2].match(/^ {2}\{ wakeWord: /gm) || []).length]),
    ),
  };
  if (recs && (recs.total === 0 || recs.exec === 0)) {
    fails.push({ where: P.ROUTES_GEN, what: '生成物里记录 ' + recs.total + ' 条（exec ' + recs.exec + ' 条）⇒ 记录面没落在这里（空壳生成物）' });
  }
  const routingCode = routing === null ? null : routing.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n');
  const stillOwnRecords = routingCode !== null && /kind:\s*'exec'/.test(routingCode);
  if (stillOwnRecords) {
    fails.push({ where: P.ROUTING, what: "`routing.ts` 自身仍带 `kind:'exec'` 记录 ⇒ 两个记录面并存，「记录面＝生成物」不成立（本判据随 #313 B 段落地而改）" });
  }

  return {
    enforcer, recs, banner, inTargets, missingScenes, stillOwnRecords, fails,
    caps: caps ?? [],
    declFiles: [...ROUTE_DECL_SCENES, ROUTE_DECL_AGG, ...(caps ?? [])],
  };
}

/** 四桶（子类）＋一项报账：加一条命令必须手改的面逐处分桶；主体判不出的行只报账（不判红）。 */
export async function changeSurfaces() {
  const t = await authorityTotals();
  const out = {
    derived: [],
    disciplined: [],
    unaccounted: [],
    undetermined: [],
    undeterminedGroups: [],
    undeterminedGuard: { pending: false, rows: [] },
    incomplete: [],
    exempts: 0,
    totals: t.ok ? { total: t.total, writes: t.writes, reads: t.reads, weight: t.weight } : null,
  };
  out.derived.push('四件生成物：src/cli/keys.ts／src/cli/registry.ts／packages/base-combos/combos.yaml 镜像段／scripts/build-help.mjs 的 REPR 块（pnpm gen 重生成，pnpm gen:check 守）');
  out.derived.push('两个分派文件 src/cli/cmd_read.ts／write.ts（registry 先行，体重 9 键零分支）');
  out.derived.push('已改成与权威声明对账的计数断言（import test/declared.mjs 的那批，#295 的 467cf64）');
  const ef = exampleForSurface();
  if (!ef.ok || ef.kind === 'unknown') {
    out.unaccounted.push({ where: P.BUILD_HELP, what: 'exampleFor 形态不认识 ⇒ 按未认下记：' + (ef.why || '判定失败') });
  } else if (ef.kind === 'handwritten') {
    const missing = t.ok ? t.wd.list.map((c) => c.key).filter((k) => !ef.cases.includes(k)) : [];
    out.unaccounted.push({
      where: `${P.BUILD_HELP}:${ef.startLine}-${ef.endLine}` + (ef.defLine ? `（default 抛在 :${ef.defLine}）` : ''),
      what: `exampleFor：逐键一条 case（现 ${ef.cases.length} 条）＋ 缺键即抛——同一文件里第二处手写「一条命令的事实」（每键的示例参数／可执行样例）。新键必手添一条。`,
      coverage: t.ok ? `权威 ${t.total} 键 vs exampleFor ${ef.cases.length} 条 case` + (missing.length ? `，缺 ${missing.length} 条：${missing.slice(0, 8).join('、')}` : '（当下齐，但新键必手改）') : '权威键数未知',
    });
  } else {
    out.derived.push(
      `${P.BUILD_HELP}:${ef.startLine} 的 exampleFor 读生成表 ${ef.table}（gen-cli 的 EXAMPLE 标记块）——示例住声明的 example 字段（CommandSpec 带 example=${ef.specHasExample}）；新键不必手改本文件`,
    );
    if (t.ok && ef.tableEntries < t.total) {
      out.incomplete.push(`生成表 ${ef.table} 现有 ${ef.tableEntries} 条 < 权威 ${t.total} 键 ⇒ 返修在途／生成物未重生成（此刻 pnpm build 必挂）——本条判据在此状态不可判`);
    }
  }
  if (t.ok) {
    const ex = loadExemptions();
    out.exempts = ex.entries.size;
    for (const err of ex.errors) {
      out.unaccounted.push({ where: DISCIPLINE_EXEMPT, what: `纪律豁免登记件非法 ⇒ 登记不生效（按未认下记）：${err}` });
    }
    for (const h of pinnedCountSurfaces(t)) {
      const c = classifyPinnedHit(h, ex.entries);
      if (c.bucket === 'disciplined') out.disciplined.push({ where: c.where, what: c.what, enforcer: c.enforcer });
      else if (c.bucket === 'undetermined') out.undetermined.push({ where: c.where, what: c.what, other: c.other, text: c.text, forced: c.forced });   // ④ 只报账、不判红
      else out.unaccounted.push({ where: c.where, what: c.what });
    }
  } else {
    out.unaccounted.push({ where: P.LEGACY_DIR + '（或 dist/weight/commands.js）', what: '探针失能：拿不到权威总数（' + t.why + '）⇒ 钉死计数扫描跳过。**按 FAIL 记**：读不到权威源不等于"没有手写面"，不许当假绿放行。' });
  }
  // ④ 的分组与形状守卫（第四版起；第五版加"靠近权威"半边）：分组按「另一侧的形状」；守卫按
  // 「登记样名／靠近权威的语汇线索／裸标识符比较裸数字」的形状判，**不按行数判**。
  // 守卫命中 ⇒ 调用方把 P1 记 PENDING（④ 只保证看得见，不保证看得住）。
  out.undeterminedGroups = groupUndetermined(out.undetermined);
  out.undeterminedGuard = shapeGuard(out.undetermined);
  // 路由三面（#313 B 段起）：记录面是**生成物**，声明住能力目录／legacy 分区 ⇒ 归 ① 派生侧。
  // 但归类本身由机械判据钉住：判据任一不成立 ⇒ 整面落进 ③ UNACCOUNTED（P1=FAIL），不许硬写「它已生成」。
  const rs = routeSurfaces();
  if (rs.fails.length) {
    for (const f of rs.fails) {
      out.unaccounted.push({ where: f.where, what: '路由归类判据不成立 ⇒ 路由整面按未认下记：' + f.what });
    }
  } else {
    out.derived.push(
      `路由三面：① 记录面＝生成物 ${P.ROUTES_GEN}（${Object.entries(rs.recs.byList).map(([k, v]) => k + ' ' + v + ' 条').join(' ＋ ') || '逐列表条数未解析'} ＝ ${rs.recs.total} 条记录／exec ${rs.recs.exec} 条；` +
        `带生成 banner=${rs.banner}，在 gen-cli 的 targets 数组里=${rs.inTargets} ⇒ \`pnpm gen:check\` 逐件比对它）；` +
        `② 声明权威源＝${rs.declFiles.length} 件（${P.ROUTE_DECL_DIR}/scene-01..10.ts ＋ index.ts ＋ ${rs.caps.join('、')}），` +
        `由 ${P.GEN_ROUTES} 的 \`routeDeclarationSources()\` 出声，声明源另进 build 的内容印记（改声明不 build ⇒ GEN-STALE FAIL）；` +
        `③ ${P.ROUTING} 只再导出记录与类型（自身带 exec 记录=${rs.stillOwnRecords}）——加一条命令＝在能力目录补一条路由声明，` +
        `汇总位与路由层都不必手改；唤醒词覆盖仍由 test/calorie-routing-81.test.mjs:${rs.enforcer} 的 \`coveredKeys = DECLARED_KEYS.length\` 对账（新键不加声明 ⇒ 覆盖数 ≠ 声明数）`,
    );
  }
  return out;
}

async function p1(w) {
  const genSrc = read(P.GEN);
  if (!genSrc) return set('P1', 'PENDING', '缺生成器 ' + P.GEN + '，无法判定自治面。');
  // ① 静态：生成器读哪几个输入、写哪几个输出（从源码里数，不靠自述）。
  const targetPaths = [...genSrc.matchAll(/\{\s*path:\s*([\s\S]+?),\s*text:/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());
  const inputs = [];
  if (/scanCapabilityNames/.test(genSrc)) inputs.push('src/*/commands.ts（扫描能力目录声明）');
  if (/DIST_DIR,\s*name,\s*'commands\.js'|join\(DIST_DIR, name, "commands\.js"\)/.test(genSrc) || /commands\.js/.test(genSrc)) inputs.push('dist/<能力>/commands.js（编译后的声明模块）');
  if (/scanLegacySceneNames/.test(genSrc) || /'cli',\s*'legacy'/.test(genSrc)) inputs.push(P.LEGACY_DIR + '（未搬迁清单的场景分区 scene-NN.ts，编译后 dist/cli/legacy/scene-NN.js）');
  if (/COMBO_YAML/.test(genSrc)) inputs.push(P.YAML + '（只重写标记块）');
  if (/BUILD_HELP/.test(genSrc)) inputs.push(P.BUILD_HELP + '（只重写 REPR 标记块）');
  const lines = [];
  lines.push('生成器输出面（' + targetPaths.length + ' 处）：' + targetPaths.join(' ; '));
  // 输出面判据：不许变窄（四件必须仍在），也不假定永远只有四件（#295 返修 A3 就加了第五件 EXAMPLE 表）。
  const targetJoin = targetPaths.join(' ');
  const targetsOk = targetPaths.length >= 4 && /keys\.ts/.test(targetJoin) && /registry\.ts/.test(targetJoin) && /COMBO_YAML/.test(targetJoin) && /BUILD_HELP/.test(targetJoin);
  lines.push('输出面没变窄（keys／registry／combos 镜像／build-help 至少这四件仍在）：' + targetsOk);
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
  // ④ 静态：迁移一条老键必须同步从自己那一份场景分区删行（重复键在生成期就抛）。
  const dupThrow = /命令键重复登记/.test(genSrc);
  lines.push('生成期对"同键两处声明"抛错（故迁移老键必须手删自己场景分区 ' + P.LEGACY_DIR + '/scene-NN.ts 里那行）：' + dupThrow);
  // ⑤ 静态：分派层不再需要分支（registry 先行）。
  const readSrc = read(P.READ) || '';
  const writeSrc = read(P.WRITE) || '';
  const regFirst = /const spec = REGISTRY\[key\]/.test(readSrc) && /const spec = REGISTRY\[key\]/.test(writeSrc);
  lines.push('两个分派文件 registry 先行（命中即走能力目录，不必再手加 case）：' + regFirst);

  // ⑦ 手写面四档（红队 5af4dd1 补的那几处：exampleFor ＋ 钉死计数；routing.ts 归纪律桶；④ 是复核 S1-1 要的报账档）。
  const buckets = await changeSurfaces();
  const unacct = buckets.unaccounted.length;
  const undet = buckets.undetermined.length;
  lines.push('── 手写面四档（"加一条命令"必须手改的面，逐处；④ 只报账不判红）──');
  lines.push(`  ① DERIVED（不用手改，${buckets.derived.length} 类）：`);
  for (const d of buckets.derived) lines.push('     · ' + d);
  lines.push(`  ② DISCIPLINED-SHARED（主体＝权威总量、已认下登记，${buckets.disciplined.length} 处命中／登记件 ${buckets.exempts} 条）：`);
  for (const d of buckets.disciplined) lines.push(`     · ${d.where}｜${d.what}｜机器守：${d.enforcer}`);
  if (!buckets.disciplined.length) {
    const tot = buckets.totals ? `${buckets.totals.total}/${buckets.totals.writes}/${buckets.totals.reads}/${buckets.totals.weight}` : '（失能）';
    lines.push('     （当刻 0 处命中：准入＝**断言主体就是权威总量**；主体判不出的行不在这里——它们落 ④ 报账，见下）');
    lines.push(`       登记位＝${DISCIPLINE_EXEMPT}（字段齐全 ＋ 指得回当刻代码才生效，缺字段即 P1=FAIL）；当刻锚 ${tot} 下没有"主体＝权威总量"的钉死字面量）`);
  }
  lines.push(`  ③ UNACCOUNTED（主体＝权威总量、既没派生也没登记，${unacct} 处）：`);
  for (const d of buckets.unaccounted) lines.push(`     · ${d.where}｜${d.what}${d.coverage ? '｜' + d.coverage : ''}`);
  lines.push(unacct ? '  ⇒ UNACCOUNTED 非空 ⇒ P1=FAIL（返修席的目标：把它们移进 ① 派生 或 ② 纪律）' : '  ⇒ UNACCOUNTED 为空 ⇒ 手写面已全部落在 ①/② 内');
  if (buckets.exempts > buckets.disciplined.length) {
    const idle = buckets.exempts - buckets.disciplined.length;
    lines.push(`     （登记件 ${buckets.exempts} 条里有 ${idle} 条当刻**不命中**：历史条目／未与当刻锚相撞——不算"生效"，只是留档，逐条见登记件 status 字段）`);
  }
  lines.push(`  ④ ? UNDETERMINED-SUBJECT（主体判不出：锚确在被比操作数位，但既不是权威总量、也算不出属于哪个域，${undet} 处）——按「另一侧的形状」分组；**裸标识符单列**：
`);
  for (const g of buckets.undeterminedGroups) {
    const tag = g.name === '裸标识符' ? '（单列：最可能藏权威总量别名的形状）' : '';
    lines.push(`     [${g.name}] ${g.count} 处${tag}`);
    for (const d of g.rows) lines.push(`       · ${d.where}｜${d.what}`);
  }
  const guard = buckets.undeterminedGuard;
  lines.push(`  ⇒ 形状守卫${guard.pending ? '**命中**' : '未命中'}：登记样名（registry／KEYS／DECLARED_／大写 TOTAL／总数… 一类）、
     **靠近权威的语汇线索**（键／KEYS／声明／命令 一类：主体判据没认，但贴着权威判不出 ⇒ 只记未判），
     或出现「裸标识符比较裸数字」的形状 ⇒ **P1 记 PENDING**（不是 FAIL、更不是静默通过）；当刻命中 ${guard.rows.length} 行。`);
  for (const g of guard.rows) lines.push(`     ⚠ ${g.where}｜${g.why}｜另一侧＝${g.other}｜${g.text}`);
  lines.push('     ④ 只保证看得见，不保证看得住——凡登记样名／靠近权威的语汇落进 ④，本判据记 `PENDING`，不静默放行。（**按形状与命名判，不按行数判**：行数阈值会把"看得见"换成"永远黄灯"。）');
  lines.push(undet
    ? '     ⇒ ④ 非空**不判红**（这些行不随"加一条命令"而变：域内自己的计数／退出码／访问器／不透明变量），但**不许静默**——逐组列出来给人看一眼（复核 S1-1）'
    : '     ⇒ ④ 为空：当刻锚没撞上任何"主体判不出"的断言行');
  if (buckets.incomplete.length) {
    lines.push(`  ⚠ 树自相矛盾（${buckets.incomplete.length} 条）：`);
    for (const d of buckets.incomplete) lines.push('     · ' + d);
  }
  // 状态口径：UNACCOUNTED 非空 ⇒ FAIL；形状守卫命中 ⇒ PENDING（未判）；否则树上自相矛盾（返修在途）⇒ PENDING；
  // 否则按静态/动态判定。守卫**先于**静态判定：④ 里有登记样名时，静态面再多绿点也不足以放行（"看得见 ≠ 看得住"）。
  const guardVerdict = undetVerdict(buckets.undeterminedGuard);
  const staticBase = targetsOk && inputs.length >= 5 && derived.every((d) => d.includes('有派生标记')) && importFromIndex && dupThrow && regFirst;
  const verdict = (dynOk) => {
    if (unacct) return 'FAIL';
    if (guardVerdict) return guardVerdict;
    if (buckets.incomplete.length) return 'PENDING';
    const dyn = dynOk === undefined ? true : dynOk;
    return staticBase && dyn ? 'PASS' : 'FAIL';
  };

  // ⑧ 动态：仓外临时根真跑——加一条假命令，看生成器能不能扫到、要不要碰分派文件。
  const sb = buildSandbox();
  if (sb) {
    lines.push('动态实验未跑：' + sb.why);
    set('P1', verdict(true), ...lines, '（静态判定见上；动态实验缺条件；三桶判定不依赖动态）');
    data('P1', { dynamic: false, targetPaths, inputs, buckets });
    return;
  }
  const base = gen('check');
  if (base.status !== 0) {
    // #313 B-3 证据 §⑥1：这条原先**静默降级为 PENDING**（＝未判）。临时根是**仓内现树**的最小副本
    // （src＋dist＋scripts＋combos），它的基线红只可能来自仓内事实（生成物与生成器不一致；或声明改了
    // 没 build ⇒ 仓内 `pnpm gen:check` 同样红）⇒ 改成显式判红：探针自身失能也记红，不报"未判"。
    lines.push('动态实验未跑：临时根里 `gen:check` 基线不为 0（exit ' + base.status + '）⇒ 沙箱＝仓内现树的副本 ⇒ **判红**'
      + '（原先降级为 PENDING＝未判，见 docs/skills/skill-calorie/t313b3-文档与验收-证据.md §⑥1）。');
    lines.push('  先看仓内 `pnpm gen:check`：它报的 GEN-STALE／GEN-CHECK FAIL 就是这条红的由来（`pnpm build` 后重跑或改回声明）。');
    lines.push('  基线输出头两行：' + base.out.split('\n').filter(Boolean).slice(0, 2).join(' / ').slice(0, 300));
    set('P1', 'FAIL', ...lines, unacct ? '（三桶判定独立于动态实验：UNACCOUNTED 非空即 FAIL）' : '（静态判定见上；沙箱基线脏 ⇒ 显式判红，不再记"未判"）');
    data('P1', { dynamic: false, baselineDirty: true, targetPaths, inputs, buckets });
    return;
  }
  // 假能力：目录里只写声明（＋ index 再导出），dist 侧用"编译产物等价物"顶替（生成器读编译模块）。
  const dirs = ['packages/skill-calorie/src/fakecap', 'packages/skill-calorie/dist/fakecap'];
  for (const d of dirs) mkdirSync(join(TMP_ROOT, d), { recursive: true });
  const FAKE = [
    "{ kind: 'write', key: 'calorie.fake.demo', shape: 'receipt', title: '假写键', wakeWord: '记假数据', example: 'calorie-cmd-read calorie.fake.demo --params \\'{\"kg\":1}\\'' }",
    "{ kind: 'read', key: 'calorie.fake.view', shape: 'stat', title: '假读键', wakeWord: '看假数据', example: 'calorie-cmd-read calorie.fake.view' }",
  ];
  writeFileSync(join(TMP_ROOT, dirs[0], 'commands.ts'), 'export const FAKE_COMMANDS = [\n  ' + FAKE.join(',\n  ') + ',\n] as const;\n');
  writeFileSync(join(TMP_ROOT, dirs[0], 'index.ts'), "export { FAKE_COMMANDS } from './commands.js';\n");
  writeFileSync(join(TMP_ROOT, dirs[1], 'commands.js'), 'export const FAKE_COMMANDS = [\n  ' + FAKE.join(',\n  ') + ',\n];\n');
  const before = { read: sandboxSha(P.READ), write: sandboxSha(P.WRITE), legacy: sandboxShaLegacy() };
  const g = gen('write');
  const got = {
    scanned: g.out.includes('fakecap'),
    registryImports: (readFileSync(join(TMP_ROOT, P.REG), 'utf8')).includes('../fakecap/index.js'),
    keysHasWrite: (readFileSync(join(TMP_ROOT, P.KEYS), 'utf8')).includes("'calorie.fake.demo'"),
    keysHasRead: (readFileSync(join(TMP_ROOT, P.KEYS), 'utf8')).includes("'calorie.fake.view'"),
    yamlHas: (readFileSync(join(TMP_ROOT, P.YAML), 'utf8')).includes('key: calorie.fake.demo'),
    reprHas: (readFileSync(join(TMP_ROOT, P.BUILD_HELP), 'utf8')).includes("'记假数据'"),
    exampleHas: (readFileSync(join(TMP_ROOT, P.BUILD_HELP), 'utf8')).includes("'calorie.fake.demo': 'calorie-cmd-read calorie.fake.demo"),
  };
  const untouched = { read: sandboxSha(P.READ) === before.read, write: sandboxSha(P.WRITE) === before.write, legacy: sandboxShaLegacy() === before.legacy };
  lines.push('动态：加假能力后 `gen` exit=' + g.status + '；生成器扫到=' + got.scanned + '（输出含 fakecap=' + got.scanned + '）');
  lines.push('  假事实自动流进：registry=' + got.registryImports + ' keys(写)=' + got.keysHasWrite + ' keys(读)=' + got.keysHasRead + ' combos 镜像=' + got.yamlHas + ' REPR=' + got.reprHas + ' EXAMPLE 表=' + got.exampleHas);
  lines.push('  分派两文件 + 未搬迁清单十片（legacy/scene-NN.ts）逐字节未动=' + JSON.stringify(untouched));
  let dynOk = g.status === 0 && Object.values(got).every(Boolean) && Object.values(untouched).every(Boolean);
  // 迁移冲突：假能力声明一条**仍在**未搬迁清单里的老键 → 生成期必须抛（"必须手删那行"的机器证据）。
  // 注意：声明字段随契约走（#295 返修 A3 起 `example` 是必填），漏字段会让 gen 因别的原因红——那是假证据。
  // 清单读不到时**不许**退回一个字面量键（那会造出不撞键的假绿）：本探针直接判红。
  mkdirSync(join(TMP_ROOT, 'packages/skill-calorie/src/fakecap2'), { recursive: true });
  mkdirSync(join(TMP_ROOT, 'packages/skill-calorie/dist/fakecap2'), { recursive: true });
  const legacyKeys = (readLegacy() ?? '').matchAll(/kind:\s*'(read|write)',\s*key:\s*'([^']+)'/g);
  const legacyKeyList = [...legacyKeys].map((m) => m[2]);
  // #322 收口补：未搬迁清单**搬空后的终态**（#319 清空 scene-10 之后）不许让探针失能，也不许退回字面量键。
  // 这时改从沙箱里**已搬迁能力目录**的声明取一条真键：撞键守卫（`gen-cli.mjs` 的 `merge()`）对
  // 「老清单 ↔ 能力目录」与「能力目录 ↔ 能力目录」是同一条判断，撞哪一边都证明守卫还在。
  // 本步自己造的假能力（fakecap＊）排在后面：优先拿真实能力目录的键。
  const capKeyDirs = readdirSync(join(TMP_ROOT, 'packages/skill-calorie/src'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && existsSync(join(TMP_ROOT, 'packages/skill-calorie/src', e.name, 'commands.ts')))
    .map((e) => e.name);
  const keysOfCapDirs = (dirs) => dirs.flatMap((d) => [...readFileSync(
    join(TMP_ROOT, 'packages/skill-calorie/src', d, 'commands.ts'), 'utf8',
  ).matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]));
  const realCapKeys = keysOfCapDirs(capKeyDirs.filter((n) => !/^fakecap/.test(n)));
  const capKeyList = realCapKeys.length ? realCapKeys : keysOfCapDirs(capKeyDirs);
  const dupKey = legacyKeyList[0] ?? capKeyList[0];
  const dupFromCapability = legacyKeyList.length === 0;
  let dupCaught = false;
  if (!dupKey) {
    lines.push('  迁移撞键探针**失能**：未搬迁清单与各能力目录的声明里一个键都没读到 ⇒ 判红。'
      + '不去退回字面量键：那会变成"没撞上键"的假绿，见 docs/skills/skill-calorie/t313b3-*.md。');
    dynOk = false;
  } else {
    const dupDecl = `{ kind: 'write', key: '${dupKey}', shape: 'receipt', title: '撞键', wakeWord: '撞词', example: 'calorie-cmd-read ${dupKey}' }`;
    writeFileSync(join(TMP_ROOT, 'packages/skill-calorie/src/fakecap2/commands.ts'), `export const DUP = [${dupDecl}];\n`);
    writeFileSync(join(TMP_ROOT, 'packages/skill-calorie/dist/fakecap2/commands.js'), `export const DUP = [${dupDecl}];\n`);
    const g2 = gen('write');
    // 真撞键判据：生成期非 0 ＋ 报的是"同键重复登记"＋ 报错里点的正是这个键（少了第三条就可能撞在别的键上）。
    dupCaught = g2.status !== 0 && /命令键重复登记/.test(g2.out) && g2.out.includes(dupKey);
    const from = dupFromCapability
      ? `已在能力目录里的键（未搬迁清单已空 ⇒ 走能力目录候选 ${capKeyList.length} 条）`
      : `仍在未搬迁清单里的键（${legacyKeyList.length} 条候选）`;
    lines.push(`  迁移撞键（假能力声明一条${from}：${dupKey}）→ gen exit=${g2.status}，报「命令键重复登记」=${dupCaught}`);
    if (g2.status !== 0 && !dupCaught) lines.push('     （exit≠0 但撞的不是这个键：' + g2.out.split('\n').filter(Boolean).slice(0, 2).join(' / ').slice(0, 200) + '）');
    dynOk = dynOk && dupCaught;
  }
  lines.push('已清理临时根：' + cleanupTmp());
  const ok = staticBase && dynOk && unacct === 0 && buckets.incomplete.length === 0;
  set('P1', verdict(dynOk), ...lines, `动态（派生桶）证据齐=${dynOk}；UNACCOUNTED=${unacct} 处；④ 主体判不出=${undet} 处（只报账、不判红）；树自相矛盾=${buckets.incomplete.length} 处` + (unacct ? ' ⇒ P1=FAIL：这些面既没派生也没纪律覆盖' : buckets.incomplete.length ? ' ⇒ P1=PENDING：返修在途，生成物未重生成' : ok ? '' : ' ⇒ P1=FAIL：静态/动态判据未过'));
  data('P1', { dynamic: true, targetPaths, inputs, got, untouched, dupCaught, buckets, ok });
}

// ─────────────────────────────────────────────────────────────────────────────
// P2 · 单一权威源：一条命令的事实还有几处手写副本
// ─────────────────────────────────────────────────────────────────────────────
const CLASS = [
  [/^packages\/skill-calorie\/src\/weight\/commands\.ts$/, 'AUTHORITY（权威声明）'],
  [/^packages\/skill-calorie\/src\/cli\/legacy\/scene-\d\d\.ts$/, 'AUTHORITY②（未搬迁清单的场景分区，键恰住一处）'],
  [/^packages\/skill-calorie\/src\/cli\/legacy\/routes\/scene-\d\d\.ts$/, 'ROUTE/AUTHORITY②（路由声明，键恰住一处）'],
  [/^packages\/skill-calorie\/src\/cli\/legacy\/routes\/index\.ts$/, 'ROUTE/AUTHORITY②（路由声明汇总件，十片拼接）'],
  [/^packages\/skill-calorie\/src\/cli\/(keys|registry)\.ts$/, 'DERIVED（gen-cli 生成物）'],
  [/^packages\/base-combos\/combos\.yaml$/, 'DERIVED（gen-cli 镜像段）'],
  [/^packages\/skill-calorie\/scripts\/build-help\.mjs$/, 'DERIVED（gen-cli 写 REPR 块）'],
  [/^packages\/base-combos\/src\/present\.ts$/, 'DERIVED（gen-present 从 combos.yaml 生成）'],
  [/^packages\/skill-calorie\/SKILL\.md$/, 'DERIVED（构建期注入区）'],
  [/^packages\/skill-calorie\/src\/triggers\/scene-/, 'FROZEN-PARITY（冻结唤醒词表，sha parity 锁）'],
  [/^packages\/skill-calorie\/src\/triggers\/(wake-assets|index|help-lookup)\.ts$/, 'FROZEN-PARITY／查找层'],
  [/^packages\/skill-calorie\/src\/triggers\/routing\.ts$/, 'DERIVED（路由层：记录面是 routes.generated.ts，本件只再导出）'],
  [/^packages\/skill-calorie\/src\/triggers\/routes\.generated\.ts$/, 'DERIVED（路由记录面，gen-routes 生成）'],
  [/^packages\/skill-calorie\/src\/cli\/(cmd_read|write)\.ts$/, 'SWITCH（老键分派 switch，手写）'],
  [/(^|\/)test\//, 'TEST（断言）'],
  [/\.test\.mjs$/, 'TEST（断言）'],
  [/^docs\//, 'DOC（文档）'],
  [/^packages\/skill-calorie\/src\/[a-z0-9-]+\/routes\.ts$/, 'ROUTE/AUTHORITY②（能力路由声明，键恰住一处）'],
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
  const legacyTxt = readLegacy();
  if (legacyTxt === null) {
    lines.push('体重 9 键是否仍留在未搬迁清单里：**读不到清单**（' + P.LEGACY_DIR + '/scene-NN.ts 缺片）⇒ 本条判红，不去当成"0 处"放行');
  }
  const stillLegacy = legacyTxt === null ? keys.map((k) => k.key) : keys.filter((k) => new RegExp(escapeRe(k.key) + '([^a-z0-9.-]|$)').test(legacyTxt)).map((k) => k.key);
  if (legacyTxt !== null) lines.push('体重 9 键仍留在未搬迁清单（legacy/scene-NN.ts）里的：' + (stillLegacy.length ? stillLegacy.join('、') : '0 处（随搬迁已删净）'));
  lines.push('结论口径：权威声明恰 1 处 ＝ 单一源；事实对（键＋代表唤醒词／标题）只许落在 FROZEN-PARITY／ROUTE/AUTHORITY②／DERIVED／CAPABILITY／TEST／DOC（冻结副本有 parity 断言守，见 P5）；出现 UNCLASSIFIED 即"还有手写副本没清"。');
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
  lines.push('沙箱基线 `gen:check` exit=' + b.status + (b.status === 0 ? '（绿）' : '（沙箱＝仓内现树的副本 ⇒ 基线红是仓内事实，判红不判"未判"）'));
  if (b.status !== 0) {
    // #313 B-3 证据 §⑥1：原先 `pending: true` 静默降级为 PENDING；改成显式判红（P3=FAIL）。
    lines.push('  ⇒ 这条红的意思是仓内 `pnpm gen:check` 此刻也红（生成物与生成器不一致／声明改了没 build）：'
      + '先修仓内基线，门外这条动态判据才有意义——不许把它读成"门没坏"。');
    lines.push('  基线输出头两行：' + b.out.split('\n').filter(Boolean).slice(0, 2).join(' / ').slice(0, 300));
    lines.push('已清理临时根：' + cleanupTmp());
    return { ok: false, pending: false, selfRed: true, lines };
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
  ['packages/skill-calorie/test/cmd-registry-294.test.mjs', /weightKeys\.filter\(\(k\) => !registryKeys\.has\(k\)\)/, '注册表 ⊇ 体重声明的键集（#322 预热：搬迁无关口径，原 /WEIGHT_COMMANDS\\.length,\\s*9/ 已 0 命中）＋ 每条声明形状/标题/写键表与 registry 对账'],
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
  lines.push('判据：7 条**全部命中**，且守"体重产物逐条不变"的第一条（sport-homogeneity-109）必须在；本探针不自己重算一份 parity。'
    + '（#322 起收紧：原口径是「合计 ≥ 5 处」，复核席 #322r 实测「删掉其中一条（含新正则指向的那条）仍然 PASS」'
    + '⇒ 太松，不能当「四条新断言都在」的证明，故提到全命中。）');
  const primary = detail[0].ok;
  const ok = primary && found >= PARITY.length;
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

/** 只在**直接运行**时跑判据：被对照席 `import` 时只取上面那几个纯判据（pinnedCountOfLine／loadExemptions），
 *  不触发全量扫描。这是"入口才执行"的惯用法，**不是跳过开关**——`node <本文件>` 必跑（Windows 盘符大小写不敏感，
 *  故按大小写归一后比较；argv[1] 指向别的文件 ⇒ 一定是被 import，不跑）。 */
const INVOKED = process.argv[1] ? resolve(process.argv[1]) : '';
const SELF = fileURLToPath(import.meta.url);
if (INVOKED && INVOKED.toLowerCase() === SELF.toLowerCase()) await main();
