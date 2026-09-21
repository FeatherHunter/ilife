#!/usr/bin/env node
/**
 * tooling/check-base-floor.mjs —— 「消费方声明的 base 下界」门（票 #861）。
 *
 * 病（#861 实测）：六技能的配置表把一批键删掉、改由「已退休键清单」交给公共层，
 * 而 `package.json` 里那行仍写 `"base-link-core": "^0.3.0"`——装机时 pnpm 沿用锁里那份 0.3.6
 * （它满足 `^0.3.0`，却不懂退休清单），于是六个配置面板全部读不出配置。
 * 根子是：**声明允许的最低版本，并不是我们构建与验证它时用的那一版**。这道门钉死这件事。
 *
 * 判据（一条）：**消费方在 `dependencies`／`peerDependencies` 里声明的 base-* 下界，
 * 必须逐字等于仓内那个 base 包的版本**（`^0.3.7` 对仓内 0.3.7）。
 *   · 下界更低 ⇒ 红（#861 的原形：声明放行一个我们没验证过的旧公共层）；
 *   · 下界更高 ⇒ 红（要求一个还没发出去的版本，装机必然找不到）；
 *   · 范围写法认不出、或 base 包名在 `packages/` 里找不到 ⇒ 红（不给「看不出来就放行」留口子）；
 *   · 一条边都没扫到 ⇒ 红（缩面＝放宽，扫描面为空不许当绿）。
 *
 * 只管 `dependencies` 与 `peerDependencies`——会随包发布、由安装方去满足的那两份。
 * `devDependencies` 只在开发与测试时用，本仓一律链工作区（`linkWorkspacePackages: true`），
 * 判它没有意义，故不在判据内。
 *
 * 用法：node tooling/check-base-floor.mjs [--root <目录>]      # `--root` 给自证与变异用
 * 读数：BASE name=<包名> version=<版本> dir=<目录>
 *      EDGE <消费方> → <base 包> 声明=<范围> 下界=<v> 期望=<v>
 *      RESULT: n/n　　末行 PASS 或 FAIL（逐条 FAIL 行在上）
 * 退出码：0＝全过；1＝有红；2＝用法／扫描失败。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** 会随包发布、由安装方满足的两份依赖表；`devDependencies` 不在内（见文件头）。 */
const SHIPPED_SECTIONS = ['dependencies', 'peerDependencies'];

/** 把 `x.y.z` 读成可比较的数组；不是三段数字即 null。 */
function parseVersion(text) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(text).trim());
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** 版本比较：a < b 回 -1，相等 0，a > b 回 1（入参已过 `parseVersion`）。 */
function compareVersion(a, b) {
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; }
  return 0;
}

/** 一段范围里**允许的最低版本**（`^`／`~`／`>=`／精确／`x - y` 都认；`||` 取各支里最小的那个）。
 *  认不出回 null——调用方把它当红，不许静默放行。 */
export function minAdmitted(range) {
  const text = String(range).trim();
  if (text === '') return null;
  if (text.includes('||')) {
    const floors = text.split('||').map((part) => minAdmitted(part));
    if (floors.some((f) => f === null)) return null;
    return floors.sort(compareVersion)[0];
  }
  const single = /^(?:\^|~|>=|>|=)?\s*(\d+\.\d+\.\d+)(?:\s+-\s+\d+\.\d+\.\d+)?$/.exec(text);
  if (single !== null) return parseVersion(single[1]);
  const twoPart = /^(\d+)\.(\d+)$/.exec(text);
  if (twoPart !== null) return [Number(twoPart[1]), Number(twoPart[2]), 0];
  return null;
}

/** 读 `packages/<包>/package.json`：包名 → {dir, version, sections}。目录名与包名不保证同名
 *  （`packages/base-render` 发出去叫 `base-paint`），故一律按 `package.json` 的 `name` 认。 */
export function readLocalPackages(root) {
  const byName = new Map();
  const dir = join(root, 'packages');
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(dir, entry.name, 'package.json');
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    const manifest = JSON.parse(text);
    if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') continue;
    byName.set(manifest.name, {
      name: manifest.name, version: manifest.version, dir: entry.name,
      sections: Object.fromEntries(SHIPPED_SECTIONS.map((s) => [s, manifest[s] ?? {}])),
    });
  }
  return byName;
}

/** 扫描全部消费方 → base-* 的边，逐条判下界。返回 {bases, edges, findings}，只报事实不打印。 */
export function audit(root) {
  const locals = readLocalPackages(root);
  const bases = [...locals.values()].filter((p) => p.name.startsWith('base-')).sort((a, b) => a.name.localeCompare(b.name));
  const edges = [];
  const findings = [];
  for (const consumer of [...locals.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const section of SHIPPED_SECTIONS) {
      for (const [dep, range] of Object.entries(consumer.sections[section])) {
        if (!dep.startsWith('base-')) continue;
        const base = locals.get(dep);
        if (base === undefined) {
          findings.push({ kind: 'unknown-base', consumer: consumer.name, dep, range });
          edges.push({ consumer: consumer.name, dep, range, floor: null, expected: null });
          continue;
        }
        const floor = minAdmitted(range);
        edges.push({ consumer: consumer.name, dep, range, floor, expected: base.version });
        if (floor === null) { findings.push({ kind: 'unreadable-range', consumer: consumer.name, dep, range }); continue; }
        if (compareVersion(floor, parseVersion(base.version)) !== 0) {
          findings.push({ kind: 'floor-mismatch', consumer: consumer.name, dep, range, floor, expected: base.version });
        }
      }
    }
  }
  if (edges.length === 0) findings.push({ kind: 'empty-scan', consumer: '(全部包)', dep: '(无)', range: '(无)' });
  return { bases, edges, findings };
}

/** 一行人话：这条红是什么。 */
function describe(f) {
  if (f.kind === 'floor-mismatch') {
    return `FAIL ${f.consumer} → ${f.dep}：声明「${f.range}」的允许最低版是 ${f.floor.join('.')}，`
      + `而仓内 ${f.dep} 是 ${f.expected}——下界必须逐字等于仓内那一版（低＝放行没验证过的旧公共层，高＝要求还没发的版本）`;
  }
  if (f.kind === 'unreadable-range') {
    return `FAIL ${f.consumer} → ${f.dep}：认不出的范围写法「${f.range}」（只认 ^／~／>=／精确／「x - y」与由它们组成的 ||）`;
  }
  if (f.kind === 'unknown-base') {
    return `FAIL ${f.consumer} → ${f.dep}：packages/ 里没有这个 base 包（包名与目录名对不上时按 package.json 的 name 认）`;
  }
  return 'FAIL 扫描面为空：一条「消费方 → base-*」的边都没扫到——缩面＝放宽，不许当绿';
}

function main(argv) {
  const at = argv.indexOf('--root');
  const root = at === -1 ? REPO_ROOT : argv[at + 1];
  if (root === undefined || !existsSync(root) || !statSync(root).isDirectory()) {
    console.error('用法：node tooling/check-base-floor.mjs [--root <仓库根>]');
    process.exit(2);
  }
  let report;
  try {
    report = audit(root);
  } catch (err) {
    console.error(`FAIL 扫描失败（这个根里读得出 packages/<包>/package.json 吗）：${err.message}`);
    process.exit(2);
  }
  const { bases, edges, findings } = report;
  for (const b of bases) console.log(`BASE name=${b.name} version=${b.version} dir=packages/${b.dir}`);
  for (const e of edges) {
    console.log(`EDGE ${e.consumer} → ${e.dep} 声明=${e.range} 下界=${e.floor === null ? '认不出' : e.floor.join('.')} 期望=${e.expected ?? '认不出'}`
      + (e.floor !== null && e.expected !== null && e.floor.join('.') === e.expected ? ' OK' : ' RED'));
  }
  for (const f of findings) console.error(describe(f));
  console.log(`RESULT: ${edges.length - findings.length}/${edges.length}`);
  if (findings.length > 0) { console.log('base-floor: FAIL'); process.exit(1); }
  console.log('base-floor: PASS');
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
