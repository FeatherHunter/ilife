#!/usr/bin/env node
/**
 * tooling/check-install-state.mjs —— 装机不变量自检（2026-09-23 立）。
 *
 * 为什么要这条：更新链路的病不是「按钮坏了」，而是**装出来的那一套没人看**。
 * 现场实测（`docs/agents/更新链路-配套不变式-方案.md` 第三节）：使用范围自己声明了一条
 * `"base-link-core": "0.3.7"`（#861 现场修复留下的直依赖），于是顶层常驻 0.3.7、六个技能
 * 各带一份嵌套 0.3.13——技能跑得动，但机器上同时有两套公共层，而面板只说「已是最新」。
 *
 * 判据四条（全是**磁盘事实**，不读任何「本该如此」的声明来替代事实）：
 *   ① **套装版本一致**：七个插件包的磁盘版本两两相等（套装号 = 用户装的那一套的号）；
 *      六个技能包与两个落地公共层的磁盘版本也要等于这个套装号。
 *   ② **使用范围的直依赖干净**：`<使用范围>/package.json` 的 `dependencies` 里除七个插件包外，
 *      不许出现 `base-*`／`skill-*`（它们只该是传递依赖；出现直依赖＝有第二个真相源在钉版本）。
 *   ③ **零分裂副本**：任何包（七插件＋六技能）目录下的 `node_modules` 里不许再出现
 *      `base-*`／`skill-*`（有＝同一台机器上两套，谁被谁用取决于 hoisting）。
 *   ④ **逐层 pin 相等**：插件清单里精确 pin 的技能版本 == 技能磁盘版本；
 *      技能清单里精确 pin 的公共层版本 == 公共层磁盘版本；且这两条 pin 都必须是精确 `x.y.z`。
 *
 * 用法：node tooling/check-install-state.mjs [--profile <名>] [--profile-dir <目录>]
 *      缺省：`<DSH_HOME 或 家目录/.dsh>/profiles/web`
 * 读数：`INSTALL <包名> 磁盘=<v> 期望=<v>`；末行 `INSTALL-STATE: PASS|FAIL`
 * 退出码：0＝全过；1＝有红；2＝用法／读盘失败（判据缺席一律 red，不给肯定结论）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';

/** 用户装的那一套：七个插件（= 面板的七个更新目标，顺序无关）。 */
const PLUGINS = ['dsh-life-pack', 'dsh-memo-ilife', 'dsh-calorie', 'dsh-schedule-ilife', 'dsh-home-ilife', 'dsh-chef', 'dsh-bill-ilife'];
/** 插件的传递依赖：六个技能。 */
const SKILLS = ['skill-memo-ilife', 'skill-calorie', 'skill-schedule', 'skill-home', 'skill-chef', 'skill-bill'];
/** 技能再往下的公共层（`base-combos` 当刻没有任何包依赖它，不在装机面内）。 */
const BASES = ['base-paint', 'base-link-core'];
const OWN = [...PLUGINS, ...SKILLS, ...BASES];

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const at = argv.indexOf(flag);
  return at === -1 ? null : argv[at + 1] ?? null;
};
const profileName = argOf('--profile') ?? 'web';
const homeDir = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== '' ? process.env.DSH_HOME : join(homedir(), '.dsh');
const profileDir = argOf('--profile-dir') ?? join(homeDir, 'profiles', profileName);

const findings = [];
const fail = (msg) => findings.push(msg);

/** 读一份 manifest（读不到回 null，不抛）。 */
function manifestOf(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** 版本读数：`{version, dir}`；读不到即 null。 */
function versionAt(dir) {
  const m = manifestOf(dir);
  return m === null ? null : { version: typeof m.version === 'string' ? m.version : null, dir, manifest: m };
}

/** 本仓包名的判定（含 `.bak-*` 这类手备份目录要在扫描时排除）。 */
const isOwnPackageDir = (name) => /^(base-|skill-|dsh-)/.test(name) && !name.includes('.');

console.log(`INSTALL-DIR profileDir=${profileDir}`);
if (!existsSync(profileDir) || !statSync(profileDir).isDirectory()) {
  console.error(`FAIL 读不到使用范围目录：${profileDir}`);
  console.log('INSTALL-STATE: FAIL');
  process.exit(2);
}

// ── ① 套装版本一致 ────────────────────────────────────────────────────────────
const disk = new Map();
for (const name of OWN) {
  const v = versionAt(join(profileDir, 'node_modules', name));
  if (v === null || v.version === null) { fail(`① ${name} 装得不完整或读不到版本（${join(profileDir, 'node_modules', name)}）`); continue; }
  disk.set(name, v);
}
const pluginVersions = [...new Set(PLUGINS.map((n) => disk.get(n)?.version).filter(Boolean))];
const suiteVersion = pluginVersions.length === 1 ? pluginVersions[0] : null;
if (pluginVersions.length === 0) fail('① 七个插件包一个都没读到版本');
else if (pluginVersions.length > 1) fail(`① 七个插件包版本不一致：${pluginVersions.join(' / ')}（同一台机器上两套爱生活）`);
for (const name of [...SKILLS, ...BASES]) {
  const v = disk.get(name)?.version;
  if (suiteVersion !== null && v !== undefined && v !== suiteVersion) fail(`① ${name} 磁盘 ${v} ≠ 套装版本 ${suiteVersion}`);
}

// ── ② 使用范围的直依赖干净 ────────────────────────────────────────────────────
const rootManifest = manifestOf(profileDir);
if (rootManifest === null) fail('② 读不到使用范围的 package.json');
else {
  for (const name of Object.keys(rootManifest.dependencies ?? {})) {
    if (name.startsWith('base-') || name.startsWith('skill-')) {
      fail(`② 使用范围把 ${name} 声明成了直接依赖（它只该是传递依赖）——这一条会让顶层的版本由它钉死，更新动作不会动它`);
    }
  }
}

// ── ③ 零分裂副本 ──────────────────────────────────────────────────────────────
for (const owner of [...PLUGINS, ...SKILLS]) {
  const nested = join(profileDir, 'node_modules', owner, 'node_modules');
  if (!existsSync(nested)) continue;
  let entries = [];
  try { entries = readdirSync(nested); } catch { continue; }
  for (const dep of entries.filter(isOwnPackageDir)) {
    const v = versionAt(join(nested, dep))?.version ?? '?';
    fail(`③ ${owner}/node_modules/${dep} = ${v}（分裂：同一台机器上两套，谁被谁用取决于 hoisting）`);
  }
}

// ── ④ 逐层 pin 相等（磁盘那份 == 上行清单里 pin 的版本）───────────────────────
// 判「相等」按**版本号**比（声明可能带 `^`／`~` 前缀，那是发布侧的事，见下面的 NOTE）。
// 判据缺席（读不到清单）→ 不猜、不给肯定结论：那是 ① 已经报过的红。
const EXACT = /^\d+\.\d+\.\d+$/;
const versionOfDecl = (decl) => (/^[\^~>=<\s]*(\d+\.\d+\.\d+)/.exec(String(decl)) ?? [])[1] ?? null;
const rangeForms = [];
function checkEdge(owner, dep, declared, onDisk) {
  if (declared === undefined) { fail(`④ ${owner} 没声明 ${dep}`); return; }
  if (!EXACT.test(String(declared).trim())) rangeForms.push(`${owner} → ${dep}「${declared}」`);
  const want = versionOfDecl(declared);
  if (want === null) { fail(`④ ${owner} 对 ${dep} 的声明「${declared}」里读不出版本号`); return; }
  if (onDisk !== undefined && want !== onDisk) fail(`④ ${owner} 声明 ${dep} ${declared}，磁盘是 ${onDisk}`);
}
for (const plug of PLUGINS) {
  const pkg = disk.get(plug)?.manifest;
  if (!pkg) continue;
  const deps = pkg.dependencies ?? {};
  if (plug !== 'dsh-life-pack') checkEdge(plug, 'dsh-life-pack', deps['dsh-life-pack'], suiteVersion);
  const skill = Object.keys(deps).find((k) => k.startsWith('skill-'));
  // 总管自己不带技能包（它只 pin 更新包），不是缺陷。
  if (!skill) {
    if (plug !== 'dsh-life-pack') fail(`④ ${plug} 没声明它的技能包`);
    continue;
  }
  checkEdge(plug, skill, deps[skill], disk.get(skill)?.version);
  const skillPkg = disk.get(skill)?.manifest;
  for (const base of BASES) checkEdge(skill, base, skillPkg?.dependencies?.[base], disk.get(base)?.version);
}

// ── 读数与结论 ────────────────────────────────────────────────────────────────
for (const name of OWN) {
  const v = disk.get(name);
  const label = PLUGINS.includes(name) ? '插件' : SKILLS.includes(name) ? '技能' : '公共层';
  console.log(`INSTALL ${label} ${name.padEnd(20)} 磁盘=${String(v?.version ?? '（读不到）').padEnd(9)} 套装=${suiteVersion ?? '?'}`);
}
for (const f of findings) console.error('RED ' + f);
// 范围写法只报 NOTE：那是**发布侧**的事（仓内门 `check-base-floor.mjs`／`check-publish.mjs` 守着），
// 机身上装的那一版是上一次发布的产物，收紧只在下一齐发版本之后才可能生效。按 NOTE 报，不参与退出码，
// 免得每次跑都红、把真红淹掉。
if (rangeForms.length > 0) {
  console.log(`NOTE 声明形态：本机这一版还有 ${rangeForms.length} 条范围写法（下一齐发版本起应为精确版）——例：${rangeForms[0]}`);
}
const passed = findings.length === 0;
console.log(passed ? 'INSTALL-STATE: PASS' : `INSTALL-STATE: FAIL（${findings.length} 条）`);
process.exit(passed ? 0 : 1);
