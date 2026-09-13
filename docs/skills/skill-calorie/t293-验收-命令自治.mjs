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
// 判据分三桶（#295 红队审查 5af4dd1 指出：只数生成器输出面会报假绿——同一个
// build-help.mjs 里还有第二处手写的「一条命令的事实」（exampleFor 的逐键 case），
// 另有若干钉死计数的断言也不在派生面上）：
//   ① DERIVED            不用手改（生成物＋分派＋已对账的断言＋路由声明面）
//   ② DISCIPLINED-SHARED 必须手改、但已被认下登记（**登记位＝`docs/skills/skill-calorie/t293-纪律豁免.json`**：
//                         登记项字段齐全、且指得回当刻代码才算生效，缺字段即 P1=FAIL）——「域内钉死计数」
//                         （照片域 HELP 条目数一类：合法但非派生）走这条通道，不落 ③
//                         （**#313 B 段起路由已不在这一桶**：声明住能力目录／`legacy/routes/scene-NN.ts`，
//                          汇总位 `src/triggers/routes.generated.ts` 是生成物——归类判据见 routeSurfaces()）
//   ③ UNACCOUNTED        必须手改、既没派生也没纪律覆盖 ⇒ 有它就 P1=FAIL
// ─────────────────────────────────────────────────────────────────────────────

/** 现行权威总量（键／写／读／体重）：既要报账，也当"钉死计数"断言的搜索锚。 */
async function authorityTotals() {
  const wd = await weightDecls();
  const legacySrc = readLegacy();
  if (legacySrc === null) return { ok: false, why: '未搬迁清单读不到（缺 ' + P.LEGACY_DIR + '/scene-NN.ts 之一）', legacy: [] };
  const legacy = [...legacySrc.matchAll(/kind:\s*'(read|write)',\s*key:\s*'([^']+)'/g)].map((m) => ({ kind: m[1], key: m[2] }));
  if (!wd.ok) return { ok: false, why: wd.why, legacy };
  const all = [...legacy, ...wd.list.map((c) => ({ kind: c.kind, key: c.key }))];
  const writes = all.filter((c) => c.kind === 'write').length;
  return { ok: true, total: all.length, writes, reads: all.length - writes, weight: wd.list.length, legacy, wd };
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
/** "被比的是一个量（计数）"：`.length`／`.total`／`.count` 一类。域内**计数**才可能登记进 ②；
 *  非量（退出码 `r.status`、差值 `.delta`、布尔、餐别名）根本不属"钉死计数"这一面 ⇒ 不认、不报。 */
const COUNT_OPERAND = /\.length\b|\.size\b|\.count\b|\bcount\b|\btotal\b|\blen\b|\blength\b|\bsum\b|\bn\b/;

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

/** 取**被比操作数对**：只认两种形态，宁缺勿滥——
 *   · `assert.<equals|equal|strictEqual|notStrictEqual|notEqual|deepEqual|notDeepEqual>(A, B[, 消息…])` ⇒ [A, B]
 *   · `assert.ok(A === B)`／`assert(A === B)`（含 == !== !=）                                                 ⇒ [A, B]
 *  其余（`assert.match(k, /re/)`、`assert.ok(x > 10, 消息)`、`assert.ok(k.includes('10'))`）不认。 */
function comparedOperands(code) {
  let m = code.match(/\bassert\s*\.\s*(?:equals|equal|strictEqual|notStrictEqual|notEqual|deepEqual|notDeepEqual)\s*\(([\s\S]*)\)\s*;?\s*$/);
  if (m) {
    const args = splitTopLevelArgs(m[1]);
    return args.length >= 2 ? [args[0], args[1]] : null;
  }
  m = code.match(/\bassert\s*(?:\.\s*ok)?\s*\(([\s\S]*)\)\s*;?\s*$/);
  if (m) {
    const args = splitTopLevelArgs(m[1]);
    const expr = args[0] ?? '';
    const op = /(===|!==|==|!=)/.exec(expr);
    if (!op) return null;
    const i = op.index;
    return [expr.slice(0, i).trim(), expr.slice(i + op[0].length).trim()];
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

/** 单行判据（**纯函数**，探针与对抗复核席共用同一份；无 IO、无副作用）：
 *  锚只在三种条件下才算"钉死权威总量的断言"——
 *   ① 落在**被比操作数位**（消息串／注释里的数字自然出局：剔噪后它们不在表达式骨架上）；
 *   ② 主体讲权威总量（另一侧操作数带 keys／声明／registry／未搬迁…；或消息串点名这些出处）；
 *   ③ 其余**域内计数**（另一侧是个量，如 `buildPhotoHelp().length`）⇒ 归 'domain'：登记进 ②，否则按未认下记。
 *  非计数（退出码／差值／布尔／餐别名）返 null ⇒ 不报。 */
export function pinnedCountOfLine(text, value) {
  const { code, strings } = lexAssertionLine(text);
  const other = anchorAsOperand(code, value);
  if (other === null) return null;                    // 不是被比操作数（消息文本／注释里的数字在此出局）
  if (/\[\s*\d/.test(text)) return null;              // 数组字面量（[3, 9, 8…]）
  if (/DECLARED_[A-Z_]+/.test(code)) return null;     // 已与声明对账 → 算派生（#295 的 467cf64）
  if (AUTHORITY_SUBJECT.test(other) || strings.some((s) => AUTHORITY_SOURCE.test(s))) {
    return { subject: 'authority', other: other.trim(), text: text.trim().slice(0, 150) };
  }
  if (COUNT_OPERAND.test(other)) return { subject: 'domain', other: other.trim(), text: text.trim().slice(0, 150) };
  return null;                                        // 非计数：不属"钉死计数"这一面
}

/** 三路归类（**纯函数**，同一个对照物）：① 主体＝权威总量 ⇒ 'unaccounted'（加删一条命令必手改，且没派生）；
 *  ② 域内计数 ＋ 登记在册 ⇒ 'disciplined'（附机器守）；③ 域内计数 ＋ 未登记 ⇒ 'unaccounted'（不许静默放行）。 */
export function classifyPinnedHit(h, exemptions) {
  const where = h.file + ':' + h.line;
  const what = `钉死${h.what}断言（字面量 ${h.value}）：加删一条命令就必须手改本行——${h.text}`;
  if (h.subject === 'authority') return { bucket: 'unaccounted', where, what };
  const reg = exemptions.get(`${h.file}:${h.line}#${h.value}`);
  if (reg) return { bucket: 'disciplined', where, what: `域内钉死计数（合法但非派生，已认下）：${reg.reason}`, enforcer: reg.enforcer };
  return { bucket: 'unaccounted', where, what: `${what}｜对照物是域内计数（另一侧＝${h.other}）但**未登记**：${DISCIPLINE_EXEMPT} 里没有这条 file:line:锚` };
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
    const line = Number(e.line);
    const anchor = Number(e.anchor);
    if (!Number.isInteger(line) || line <= 0) { errors.push(`${at} 的 line 不是正整数：${e.line}`); return; }
    if (!Number.isInteger(anchor)) { errors.push(`${at} 的 anchor 不是整数：${e.anchor}`); return; }
    const src = read(String(e.file));
    if (src === null) { errors.push(`${at} 指的文件读不到：${e.file}`); return; }
    const lineText = src.split('\n')[line - 1];
    if (lineText === undefined) { errors.push(`${at} 指的 ${e.file}:${line} 不存在`); return; }
    if (anchorAsOperand(lexAssertionLine(lineText).code, anchor) === null) {
      errors.push(`${at} 指不回当刻代码：${e.file}:${line} 已不再把 ${anchor} 当被比操作数（登记项作废，请重登或删）`);
      return;
    }
    entries.set(`${e.file}:${line}#${anchor}`, {
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

/** 三桶：加一条命令必须手改的面，逐处分桶。 */
export async function changeSurfaces() {
  const t = await authorityTotals();
  const out = {
    derived: [],
    disciplined: [],
    unaccounted: [],
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
      else out.unaccounted.push({ where: c.where, what: c.what });
    }
  } else {
    out.unaccounted.push({ where: P.LEGACY_DIR + '（或 dist/weight/commands.js）', what: '探针失能：拿不到权威总数（' + t.why + '）⇒ 钉死计数扫描跳过。**按 FAIL 记**：读不到权威源不等于"没有手写面"，不许当假绿放行。' });
  }
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

  // ⑦ 手写面三桶（红队 5af4dd1 补的那几处：exampleFor ＋ 钉死计数；routing.ts 归纪律桶）。
  const buckets = await changeSurfaces();
  const unacct = buckets.unaccounted.length;
  lines.push('── 手写面三桶（"加一条命令"必须手改的面，逐处）──');
  lines.push(`  ① DERIVED（不用手改，${buckets.derived.length} 类）：`);
  for (const d of buckets.derived) lines.push('     · ' + d);
  lines.push(`  ② DISCIPLINED-SHARED（必须手改、已认下登记，${buckets.disciplined.length} 处命中／登记件 ${buckets.exempts} 条）：`);
  for (const d of buckets.disciplined) lines.push(`     · ${d.where}｜${d.what}｜机器守：${d.enforcer}`);
  if (!buckets.disciplined.length) {
    const tot = buckets.totals ? `${buckets.totals.total}/${buckets.totals.writes}/${buckets.totals.reads}/${buckets.totals.weight}` : '（失能）';
    lines.push(`     （当刻 0 处命中：登记位＝${DISCIPLINE_EXEMPT}（字段齐全 ＋ 指得回当刻代码才生效，缺字段即 P1=FAIL）；当刻锚 ${tot} 未与任何"域内钉死计数"相撞 ⇒ 无可登记者）`);
  }
  lines.push(`  ③ UNACCOUNTED（必须手改、既没派生也没纪律覆盖，${unacct} 处）：`);
  for (const d of buckets.unaccounted) lines.push(`     · ${d.where}｜${d.what}${d.coverage ? '｜' + d.coverage : ''}`);
  lines.push(unacct ? '  ⇒ UNACCOUNTED 非空 ⇒ P1=FAIL（返修席的目标：把它们移进 ① 派生 或 ② 纪律）' : '  ⇒ UNACCOUNTED 为空 ⇒ 手写面已全部落在 ①/② 内');
  if (buckets.incomplete.length) {
    lines.push(`  ⚠ 树自相矛盾（${buckets.incomplete.length} 条）：`);
    for (const d of buckets.incomplete) lines.push('     · ' + d);
  }
  // 状态口径：UNACCOUNTED 非空 ⇒ FAIL；否则树上自相矛盾（返修在途）⇒ PENDING；否则按静态/动态判定。
  const staticBase = targetsOk && inputs.length >= 5 && derived.every((d) => d.includes('有派生标记')) && importFromIndex && dupThrow && regFirst;
  const verdict = (dynOk) => {
    if (unacct) return 'FAIL';
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
  set('P1', verdict(dynOk), ...lines, `动态（派生桶）证据齐=${dynOk}；UNACCOUNTED=${unacct} 处；树自相矛盾=${buckets.incomplete.length} 处` + (unacct ? ' ⇒ P1=FAIL：这些面既没派生也没纪律覆盖' : buckets.incomplete.length ? ' ⇒ P1=PENDING：返修在途，生成物未重生成' : ok ? '' : ' ⇒ P1=FAIL：静态/动态判据未过'));
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
