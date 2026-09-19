#!/usr/bin/env node
/** #702 · 结构门：同一个符号不许从两个 `dist` 路径被取。
 *
 * **规矩**（本门要守的那一条）：`docs/agents/structure.md` 铁律二「概念唯一」——同一个东西只有一个定义地，
 * 别处引用它。搬迁期允许「正本件 ＋ 薄转出件」并存的**临时形状**（#518 W1 的拆法、`AGENTS.md` 台账多行都按它做），
 * 但这个形状必须**在源码里自证**：薄转出件上写着 `export { X } from './正本件.js'`。
 * 所以例外不是手写清单，而是**从源码派生**的——薄转出件被删，例外当场消失（不许陈化）。
 *
 * **口径**（三条，逐条可判真假）：
 *   ① **包门豁免**：`../dist/index.js`（= 包对外的门 `src/index.ts`）与任何路径配对时不参与判定——
 *      包门转出包内件是它的本分（`structure.md`「包也有门」）。
 *   ② **派生例外**：`src/**\/*.ts` 里任何 `export { … } from './同目录件.js'` 都算「薄转出声明」；
 *      一个符号出现在两条测试路径上，只要**至少一条**路径的源件声明了该符号的薄转出，就放行。
 *   ③ **其余即红**：两条路径都不是薄转出 → 同一符号有两个定义地/两个入口 → 红，逐条点名符号与两条路径。
 *
 * **范围**：只扫 `test/**\/*.mjs`（本票的管辖面）。`src/` 侧的同形问题由「包对外的公开接口缩到一页」（#703）
 * 与搬迁各批接管，本门不越界判它们。
 *
 * 跑法：`node packages/skill-calorie/scripts/check-one-path.mjs`（无参＝真门禁）
 *   退出码：0 全绿；1 有红条目。
 * 自证：`node packages/skill-calorie/scripts/check-one-path.mjs --selftest`
 *   （临时目录里造假树，验「双路径必红／包门+薄转出必绿／薄转出删掉必红」三条，不碰真树）。
 * 报告：`--json` 打机读摘要一行。
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src');
const TEST = join(PKG, 'test');

/** 递归列文件（限定后缀）。 */
function walk(dir, ext) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (ext.test(e)) out.push(p);
  }
  return out;
}

/** `dist/a/b.js` ← `src/a/b.ts`：把 dist 相对路径折成源件绝对路径。 */
function srcFileOfDistRel(pkgRoot, distRel) {
  return join(pkgRoot, 'src', distRel.replace(/\.js$/, '.ts'));
}

/** 扫 `src/**\/*.ts`：每个「薄转出声明」→ `Map<符号, Set<源件绝对路径>>`。
 *  只认 `export { … } from './x.js'`／`export { … } from '../x/y.js'`（仓内相对件，即「转出」）；
 *  `export * from …` 无法点名符号，故不计（真需要时应改成具名转出）。 */
function collectReexports(pkgRoot) {
  const map = new Map();
  for (const file of walk(join(pkgRoot, 'src'), /\.ts$/)) {
    const src = readFileSync(file, 'utf8');
    const re = /export\s*(?:type\s*)?\{([^{}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g;
    for (const m of src.matchAll(re)) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
        if (!map.has(name)) map.set(name, new Set());
        map.get(name).add(file);
      }
    }
  }
  return map;
}

/** 扫测试件：符号 → Map<dist 相对路径, Set<file:line>>。跳过包门 `../dist/index.js`。 */
function collectTestImports(pkgRoot) {
  const map = new Map();
  const add = (name, distRel, site) => {
    if (!map.has(name)) map.set(name, new Map());
    const p = map.get(name);
    if (!p.has(distRel)) p.set(distRel, new Set());
    p.get(distRel).add(site);
  };
  for (const file of walk(join(pkgRoot, 'test'), /\.mjs$/)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (!/^\s*(import|export)\b/.test(lines[i])) continue;
      let buf = '';
      let j = i;
      while (j < lines.length && j < i + 40) {
        buf += lines[j] + '\n';
        if (/from\s*['"][^'"]+['"]|import\s*\(\s*['"][^'"]+['"]\s*\)/.test(buf)) break;
        j += 1;
      }
      const specM = buf.match(/from\s*['"]([^'"]+)['"]/) || buf.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (!specM) continue;
      const spec = specM[1];
      // 包门豁免（口径①）
      if (/(^|\/)dist\/index\.js$/.test(spec) && !/\/dist\/[a-z0-9_-]+\/index\.js$/.test(spec)) continue;
      const dm = spec.match(/\/dist\/(?<rel>[^'"]+)$/);
      if (!dm) continue;
      const distRel = dm.groups.rel.replace(/\\/g, '/');
      const site = `${relative('D:/ilife', file).replace(/\\/g, '/')}:${i + 1}`;
      const named = buf.match(/\{([\s\S]*)\}/);
      if (named) {
        for (const raw of named[1].split(',')) {
          const n = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
          if (/^[A-Za-z_$][\w$]*$/.test(n)) add(n, distRel, site);
        }
      } else {
        const def = buf.match(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from/);
        if (def) add(def[1] + '（默认导出）', distRel, site);
        const star = buf.match(/^\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)/);
        if (star) add(star[1] + '（命名空间）', distRel, site);
      }
    }
  }
  return map;
}

/* ══════════════════════════════════════════════════════════════════════════
 * #717 批⑤ · 定义地闭集账（第二段判定，「同一符号只允许一个定义地」）
 *
 * 判据与上面同构：**例外从源码派生**，不认手写清单。
 *   ① 每个符号写一行：允许出现那些字面／标识符的文件清单；
 *   ② 文件里出现 `export { X } … from './件.js'` 这种**薄转出声明**即豁免——那是搬迁期的合法形状
 *      （正本已搬走、老地址留转出），台账只需列出正本件；
 *   ③ 其余命中即红，逐行点名「哪个文件、哪一行、命中了什么」。
 * ══════════════════════════════════════════════════════════════════════════ */

/** 闭集账：`符号 → { 只许出现在这些文件, 命中正则 }`。
 *  加一行 = 把一处口径纳入机器门；命中为零也照样算通过（该符号可能已被更彻底的写法吸收）。 */
export const DEFINITION_SITES = [
  { name: '夜宵跨零点（22, 30）', allow: ['src/shared/meal.ts'], re: /\[\s*22\s*,\s*30\s*\]/g, hint: '夜宵窗只写一处：shared/meal.ts 的 MEAL_WINDOW' },
  { name: '营养素推荐区间（10-20／45-65／20-35）', allow: ['src/shared/nutritionRange.ts'], re: /min:\s*(?:10|45|20)\s*,\s*max:\s*(?:20|65|35)/g, hint: '区间只写一处：shared/nutritionRange.ts 的 NUTRITION_RANGE' },
  { name: '孤儿区间（15-30／40-60，已作废）', allow: [], re: /\b15\s*,\s*30\b|\b40\s*,\s*60\b/g, hint: '这套数已作废（#701 内容三裁），任何地方都不该再出现' },
  { name: '千卡↔体重常数（算式里的 7700）', allow: ['src/shared/kcalPerKg.ts'], re: /[/\*]\s*7700\b/g, hint: '常数只写一处：shared/kcalPerKg.ts 的 KCAL_PER_KG，别处引用它' },
  { name: '本地时钟副本（自己读系统 Date 造日／时刻）', allow: ['src/shared/time.ts'], re: /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)|new Date\(\)\.toTimeString\(\)\.slice\(0, 8\)/g, hint: '时钟只写一处：shared/time.ts 的 todayISO／timeOfDayISO，别处引用它' },
];

/** 去注释与空白（注释里提到旧数不算定义地；本门只看代码）。 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/** 扫真源码：每个符号 → `{ file, line, hit }[]`（薄转出件豁免）。 */
export function scanDefinitionSites(pkgRoot) {
  const out = [];
  for (const row of DEFINITION_SITES) {
    for (const abs of walk(join(pkgRoot, 'src'), /\.ts$/)) {
      const rel = relative(pkgRoot, abs).replace(/\\/g, '/');
      if (row.allow.includes(rel)) continue;
      const src = stripComments(readFileSync(abs, 'utf8'));
      if (new RegExp("export\\s*\\{[^}]*\\}\\s*from\\s*'").test(src)) continue; // 薄转出件：豁免
      const re = new RegExp(row.re.source, row.re.flags.includes('g') ? row.re.flags : row.re.flags + 'g');
      let m;
      while ((m = re.exec(src)) !== null) {
        const line = src.slice(0, m.index).split('\n').length;
        out.push({ name: row.name, file: rel, line, hit: m[0], hint: row.hint });
      }
    }
  }
  out.sort((a, b) => (a.name + a.file + a.line).localeCompare(b.name + b.file + b.line));
  return out;
}

/** 判定：返回红条目（定义地跑到了台账没列的文件里）。 */
export function judgeDefinitionSites(pkgRoot) {
  return scanDefinitionSites(pkgRoot);
}

/** 判定：返回红条目。 */
export function judge(pkgRoot) {
  const reexports = collectReexports(pkgRoot);
  const imports = collectTestImports(pkgRoot);
  const red = [];
  for (const [sym, paths] of imports) {
    if (paths.size < 2) continue;
    const declared = reexports.get(sym);
    const ok = declared && [...paths.keys()].some((p) => declared.has(srcFileOfDistRel(pkgRoot, p)));
    if (!ok) {
      red.push({
        symbol: sym,
        paths: [...paths.entries()].map(([p, sites]) => ({ path: p, sites: [...sites] })),
        reason: declared ? '两条路径都不是薄转出件（声明在别处）' : '没有任何一条路径声明薄转出',
      });
    }
  }
  red.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return red;
}

/** 造一棵假包树跑判定（自证用；只碰临时目录）。 */
function fakeTree(root, { withReexport, fromPaths }) {
  mkdirSync(join(root, 'src', 'render'), { recursive: true });
  mkdirSync(join(root, 'test'), { recursive: true });
  writeFileSync(join(root, 'src', 'render', 'canon.ts'), 'export function buildDeficitDoc() { return 1; }\n');
  writeFileSync(join(root, 'src', 'render', 'thin.ts'),
    withReexport ? "export { buildDeficitDoc } from './canon.js';\n" : 'export function other() { return 2; }\n');
  for (const [n, p] of fromPaths.entries()) {
    writeFileSync(join(root, 'test', `t${n}.test.mjs`),
      `import { buildDeficitDoc } from '${p}';\nconsole.log(buildDeficitDoc);\n`);
  }
}

function selftest() {
  const results = [];
  const mk = () => mkdtempSync(join(tmpdir(), 't702-onepath-'));
  // ① 双路径 + 薄转出声明 ⇒ 必须绿
  let dir = mk();
  fakeTree(dir, { withReexport: true, fromPaths: new Map([[1, '../../dist/render/canon.js'], [2, '../../dist/render/thin.js']]) });
  results.push(['①薄转出声明在 ⇒ 绿', judge(dir).length === 0, judge(dir).length]);
  rmSync(dir, { recursive: true, force: true });
  // ② 双路径 + 没声明 ⇒ 必须红（真红一次）
  dir = mk();
  fakeTree(dir, { withReexport: false, fromPaths: new Map([[1, '../../dist/render/canon.js'], [2, '../../dist/render/thin.js']]) });
  const red2 = judge(dir);
  results.push(['②没有薄转出声明 ⇒ 红', red2.length === 1 && red2[0].symbol === 'buildDeficitDoc', red2.length]);
  rmSync(dir, { recursive: true, force: true });
  // ③ 包门 + 内部件 ⇒ 必须绿（口径①）
  dir = mk();
  fakeTree(dir, { withReexport: false, fromPaths: new Map([[1, '../../dist/index.js'], [2, '../../dist/render/canon.js']]) });
  results.push(['③包门配对 ⇒ 绿（豁免）', judge(dir).length === 0, judge(dir).length]);
  rmSync(dir, { recursive: true, force: true });
  /* ── #717 批⑤ · 定义地闭集账的两条自证（同一套「例外从源码派生」的规矩） ── */
  const mkDefTree = (body) => {
    const d = mkdtempSync(join(tmpdir(), 't717-defsite-'));
    mkdirSync(join(d, 'src', 'shared'), { recursive: true });
    writeFileSync(join(d, 'src', 'shared', 'nutritionRange.ts'), "export const NUTRITION_RANGE = { protein: { min: 10, max: 20 } };\n");
    writeFileSync(join(d, 'src', 'rogue.ts'), body);
    return d;
  };
  // ④ 别处再抄一份区间 ⇒ 必红
  let d4 = mkDefTree("export const R = { protein: { min: 10, max: 20 } };\n");
  const red4 = judgeDefinitionSites(d4);
  results.push(['④定义地跑到台账外 ⇒ 红', red4.length === 1 && red4[0].file === 'src/rogue.ts', red4.length]);
  rmSync(d4, { recursive: true, force: true });
  // ⑤ 同一处置成薄转出（正本仍只一处）⇒ 绿（合法例外不被误判）
  const d5 = mkDefTree("export { NUTRITION_RANGE } from './shared/nutritionRange.js';\n");
  results.push(['⑤薄转出（搬迁期合法形状）⇒ 绿', judgeDefinitionSites(d5).length === 0, judgeDefinitionSites(d5).length]);
  rmSync(d5, { recursive: true, force: true });
  const bad = results.filter((r) => !r[1]);
  for (const [name, ok, n] of results) console.log(`${ok ? 'PASS' : 'RED '} ${name}（红条目 ${n}）`);
  console.log(`RESULT: ${results.length - bad.length}/${results.length}`);
  console.log(bad.length ? 'SELFTEST: FAIL' : 'SELFTEST: PASS');
  return bad.length ? 1 : 0;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-one-path.mjs')) {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  /* `--root <包根>`：夹具用（照同目录 `check-warning-line.mjs` 的 `--root`／`--agents` 先例）——
     夹具只碰临时目录；真实门禁一律无参运行，脚本会打印 ROOT: 供认口。 */
  const rootIx = process.argv.indexOf('--root');
  const ROOT = rootIx > 0 && process.argv[rootIx + 1] ? process.argv[rootIx + 1] : PKG;
  console.log('ROOT: ' + ROOT);
  const red = judge(ROOT);
  const redDef = judgeDefinitionSites(ROOT);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ red: red.length, items: red.map((r) => r.symbol), defRed: redDef.length, defItems: redDef.map((r) => r.name + '@' + r.file + ':' + r.line) }));
  }
  if (red.length) {
    console.error(`RED 同一符号两个路径：${red.length} 个（规矩与口径见本件头）`);
    for (const r of red) {
      console.error(`RED   ${r.symbol} —— ${r.reason}`);
      for (const p of r.paths) console.error(`        dist/${p.path}　←　${p.sites.join('、')}`);
    }
    console.error('修法：把断言换到其中一条路径上（优先生产真正走的那条）；确属搬迁期薄转出时，'
      + '在正本件旁写出 `export { … } from \'./正本件.js\'`，本门按源码派生例外、不认手写清单。');
  }
  if (redDef.length) {
    console.error(`RED 定义地跑到台账外：${redDef.length} 处（#717 批⑤；台账见本件 DEFINITION_SITES）`);
    for (const r of redDef) console.error(`RED   ${r.name} —— ${r.file}:${r.line} 命中 ${JSON.stringify(r.hit)}｜${r.hint}`);
    console.error('修法：把数值删掉、改读正本件；确属搬迁期转出时在该件写 `export { … } from \'./正本件.js\'`（本门按源码派生豁免）。');
  }
  if (red.length || redDef.length) process.exit(1);
  console.log('PASS: 测试面每个符号只有一条 dist 路径（包门与薄转出声明按源码派生豁免）');
  console.log('PASS: 定义地闭集账 ' + DEFINITION_SITES.length + ' 项全在台账内（#717 批⑤）');
}
