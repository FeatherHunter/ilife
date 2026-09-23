#!/usr/bin/env node
/**
 * tooling/check-install-state.mjs —— 装机不变量自检（2026-09-23 立）。
 *
 * 为什么要这条：更新链路的病不是「按钮坏了」，而是**装出来的那一套没人看**。
 * 现场实测（`docs/agents/更新链路-配套不变式-方案.md` 第三节）：使用范围自己声明了一条
 * `"base-link-core": "0.3.7"`（#861 现场修复留下的直依赖），于是顶层常驻 0.3.7、六个技能
 * 各带一份嵌套 0.3.13——技能跑得动，但机器上同时有两套公共层，而面板只说「已是最新」。
 *
 * **判「对错」的准绳是「解析结果」（节点实际会加载哪一份），不是「有没有副本」**：
 *   ① 每个技能对每个公共层、每个插件对总管与技能，**解析到的版本必须等于上行清单里声明的那一版**
 *      （本包自备副本优先，没有就用顶层那份）；读不到、或是另一版 ⇒ 真错。
 *   ② 使用范围的**直接依赖**里不许出现 `base-*`／`skill-*`（出现＝有第二个真相源在钉版本，
 *      更新动作不会动它——现场那条 `base-link-core: 0.3.7` 就是这个）。
 *   ③ 七个插件包的磁盘版本必须两两相等（套装号唯一）。
 *
 * 三态（**分开报**，因为「用户只更新了一家」是合法中间态，不是故障）：
 *   · `PASS`    exit 0：三层同套装号、每条链解析结果 == 声明、直依赖干净、零分裂副本。
 *   · `PARTIAL` exit 2：**未配套**——七家里有几家还停在上一个套装号，或有包自备副本，
 *                或某条链靠**范围声明**放行到另一版（过渡期特有）。此时没有一条链「跑在自己声明之外」，
 *                故不是故障；面板/装机读到它应当说「已配套 N/7 家，可一键更新收敛」。
 *   · `BROKEN`  exit 1：真错——读不到包／读不到版本／解析到的版本**不落在自己声明的范围内**
 *                （#861 现场那种「顶层被旧直依赖钉住」就是这一条）／使用范围直依赖里出现 `base-*`·`skill-*`。
 *
 * 判「解析到的版本符不符合声明」按声明形态分两种：
 *   · 声明是**精确版**（我们 0.3.14 起的形态）⇒ 必须逐字相等，否则 BROKEN；
 *   · 声明是**范围**（`^x.y.z`，0.3.13 及以前发出去的就是这样）⇒ 落在区间内即算「按声明装」，
 *     但要记一条中间态（那是我们从没一起验证过的组合，随下一次齐发自动消失）；落在区间外则 BROKEN。
 * 认不出的声明形态只记 NOTE——那是**发布侧**的事（仓内 `check-base-floor.mjs` 守着），不在这里判红。
 *
 * 用法：node tooling/check-install-state.mjs [--profile <名>] [--profile-dir <目录>]
 *      缺省：`<DSH_HOME 或 家目录/.dsh>/profiles/web`
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** 用户装的那一套：七个插件（= 面板的七个更新目标）。 */
const PLUGINS = ['dsh-life-pack', 'dsh-memo-ilife', 'dsh-calorie', 'dsh-schedule-ilife', 'dsh-home-ilife', 'dsh-chef', 'dsh-bill-ilife'];
/** 插件的传递依赖：六个技能。 */
const SKILLS = ['skill-memo-ilife', 'skill-calorie', 'skill-schedule', 'skill-home', 'skill-chef', 'skill-bill'];
/** 技能再往下的公共层（`base-combos` 当刻没有任何包依赖它，不在装机面内）。 */
const BASES = ['base-paint', 'base-link-core'];
const OWN = [...PLUGINS, ...SKILLS, ...BASES];
const EXACT = /^\d+\.\d+\.\d+$/;

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const at = argv.indexOf(flag);
  return at === -1 ? null : argv[at + 1] ?? null;
};
const profileName = argOf('--profile') ?? 'web';
const homeDir = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== '' ? process.env.DSH_HOME : join(homedir(), '.dsh');
const profileDir = argOf('--profile-dir') ?? join(homeDir, 'profiles', profileName);

const broken = [];
const partial = [];
const notes = [];
const fail = (msg) => broken.push(msg);

function manifestOf(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}
/** 声明里那个版本号（去掉 `^`／`~`／`>=` 前缀）；读不出回 null。 */
const versionOfDecl = (decl) => (/^[\^~>=<\s]*(\d+\.\d+\.\d+)/.exec(String(decl ?? '')) ?? [])[1] ?? null;

/** 我们发出去的声明只有两种形态：精确 `x.y.z` 与 `^x.y.z`。这里只判这两种。
 *  返回 'exact'（精确）／'caret'（`^`，按 0.x 语义：同 minor 且 patch 不低于）／'unknown'（认不出）。 */
function formOf(decl) {
  const t = String(decl ?? '').trim();
  if (EXACT.test(t)) return 'exact';
  if (/^\^\d+\.\d+\.\d+$/.test(t)) return 'caret';
  return 'unknown';
}
/** 版本是否落在这条声明允许的范围内（只支持精确与 `^`；`unknown` 一律回 false，调用方不据此判红）。 */
function admits(decl, version) {
  const want = versionOfDecl(decl);
  const got = versionOfDecl(version);
  if (want === null || got === null) return false;
  const w = want.split('.').map(Number);
  const g = got.split('.').map(Number);
  if (formOf(decl) === 'exact') return want === got;
  if (formOf(decl) === 'caret') {
    const cmp = (a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] !== b[1] ? a[1] - b[1] : a[2] - b[2]);
    return w[0] === g[0] && w[1] === g[1] && cmp(g, w) >= 0;
  }
  return false;
}

console.log(`INSTALL-DIR profileDir=${profileDir}`);
if (!existsSync(profileDir) || !statSync(profileDir).isDirectory()) {
  console.error(`FAIL 读不到使用范围目录：${profileDir}`);
  console.log('INSTALL-STATE: BROKEN（1 条）');
  process.exit(1);
}

const modulesDir = join(profileDir, 'node_modules');
const at = (dir, name) => join(dir, name);
const manifestAt = (dir, name) => manifestOf(at(dir, name));

// ── 件齐不齐（缺件＝判据缺席，一律真错）────────────────────────────────────
const top = new Map();
for (const name of OWN) {
  const m = manifestAt(modulesDir, name);
  if (m === null || typeof m.version !== 'string') { fail(`读不到 ${name} 的版本（${at(modulesDir, name)}）`); continue; }
  top.set(name, m);
}

/** 解析一份依赖：本包自备副本优先，否则顶层那份。返回 {version, from}；都没有回 null。 */
function resolveDep(ownerDir, dep) {
  const nested = manifestAt(join(ownerDir, 'node_modules'), dep);
  if (nested !== null && typeof nested.version === 'string') return { version: nested.version, from: '自备' };
  const t = top.get(dep);
  if (t !== undefined) return { version: t.version, from: '顶层' };
  return null;
}

// ── ① 每条链：解析结果必须落在上行声明的范围内 ─────────────────────────────
function checkEdge(ownerRel, ownerDir, dep, declared) {
  if (declared === undefined) { fail(`${ownerRel} 没声明 ${dep}`); return; }
  const form = formOf(declared);
  if (form === 'unknown') { notes.push(`${ownerRel} → ${dep}「${declared}」`); return; }
  const got = resolveDep(ownerDir, dep);
  if (got === null) { fail(`${ownerRel} 的 ${dep} 解析不到（顶层与本包都没有）`); return; }
  if (!admits(declared, got.version)) {
    fail(`${ownerRel} 声明 ${dep} ${declared}，但实际解析到的是 ${got.version}（${got.from}）——跑到自己声明之外去了，这就是 #861 那种「装到的不是要的那一版」`);
    return;
  }
  if (form === 'exact') {
    // 精确声明下「落在范围内」＝逐字相等，无事。
    if (got.from === '自备') { /* 自备副本且相等：正常，②段另记 */ }
  } else {
    // 范围声明：这次靠 caret 放行了另一版——过渡期特有（0.3.13 发出去的声明还是 caret）。
    if (versionOfDecl(declared) !== got.version) {
      partial.push(`${ownerRel} → ${dep}「${declared}」放行到 ${got.version}（未验证组合；该家更新到新套装即消失）`);
    }
  }
}

for (const plug of PLUGINS) {
  const pkg = top.get(plug);
  if (pkg === undefined) continue;
  const ownerDir = at(modulesDir, plug);
  const deps = pkg.dependencies ?? {};
  if (plug !== 'dsh-life-pack') checkEdge(plug, ownerDir, 'dsh-life-pack', deps['dsh-life-pack']);
  const skill = Object.keys(deps).find((k) => k.startsWith('skill-'));
  if (!skill) {
    if (plug !== 'dsh-life-pack') fail(`${plug} 没声明它的技能包`);
    continue;
  }
  checkEdge(plug, ownerDir, skill, deps[skill]);
  const skillDir = at(modulesDir, skill);
  const skillPkg = top.get(skill);
  if (skillPkg === undefined) continue;
  for (const base of BASES) checkEdge(skill, skillDir, base, (skillPkg.dependencies ?? {})[base]);
}

// ── ② 使用范围的直依赖干净 ────────────────────────────────────────────────
const rootManifest = manifestOf(profileDir);
if (rootManifest === null) fail('读不到使用范围的 package.json');
else {
  for (const name of Object.keys(rootManifest.dependencies ?? {})) {
    if (name.startsWith('base-') || name.startsWith('skill-')) {
      fail(`使用范围把 ${name} 声明成了直接依赖（它只该是传递依赖）——这一条会让顶层的版本由它钉死，更新动作不会动它`);
    }
  }
}

// ── ③ 分裂副本（判「有没有」只用来分 PASS／PARTIAL，判「对不对」看 ①）──────
for (const owner of [...PLUGINS, ...SKILLS]) {
  const nested = at(at(modulesDir, owner), 'node_modules');
  if (!existsSync(nested)) continue;
  let entries = [];
  try { entries = readdirSync(nested); } catch { continue; }
  for (const dep of entries.filter((n) => /^(base-|skill-|dsh-)/.test(n) && !n.includes('.'))) {
    const v = manifestAt(nested, dep)?.version ?? '?';
    partial.push(`${owner}/node_modules/${dep} = ${v}`);
  }
}

// ── ④ 套装号唯一（七插件同号）────────────────────────────────────────────
const pluginVersions = [...new Set(PLUGINS.map((n) => top.get(n)?.version).filter(Boolean))];
const suiteVersion = pluginVersions.length === 1 ? pluginVersions[0] : null;
if (pluginVersions.length === 0) fail('七个插件包一个都没读到版本');
else if (pluginVersions.length > 1) partial.push(`插件版本不止一个：${pluginVersions.join(' / ')}（有几家还停在上一个套装号）`);
for (const name of [...SKILLS, ...BASES]) {
  const v = top.get(name)?.version;
  if (suiteVersion !== null && v !== undefined && v !== suiteVersion) partial.push(`${name} 磁盘 ${v} ≠ 套装号 ${suiteVersion}`);
}

// ── 读数与结论 ───────────────────────────────────────────────────────────
for (const name of OWN) {
  const label = PLUGINS.includes(name) ? '插件' : SKILLS.includes(name) ? '技能' : '公共层';
  console.log(`INSTALL ${label} ${name.padEnd(20)} 顶层=${String(top.get(name)?.version ?? '（读不到）').padEnd(9)} 套装=${suiteVersion ?? '未配套'}`);
}
for (const f of broken) console.error('RED ' + f);
if (notes.length > 0) {
  console.log(`NOTE 声明形态：本机这一版还有 ${notes.length} 条范围写法（下一齐发版本起应为精确版）——例：${notes[0]}`);
}
const state = broken.length > 0 ? 'BROKEN' : partial.length > 0 ? 'PARTIAL' : 'PASS';
if (state === 'PARTIAL') {
  console.log(`未配套 ${partial.length} 条（合法中间态：每条链仍解析到自己声明的那一版，不是故障）——例：${partial[0]}`);
}
console.log(state === 'BROKEN' ? `INSTALL-STATE: BROKEN（${broken.length} 条红）` : `INSTALL-STATE: ${state}`);
process.exit(state === 'BROKEN' ? 1 : state === 'PARTIAL' ? 2 : 0);
