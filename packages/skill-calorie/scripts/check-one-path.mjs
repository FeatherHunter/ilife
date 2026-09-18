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
  const bad = results.filter((r) => !r[1]);
  for (const [name, ok, n] of results) console.log(`${ok ? 'PASS' : 'RED '} ${name}（红条目 ${n}）`);
  console.log(`RESULT: ${results.length - bad.length}/${results.length}`);
  console.log(bad.length ? 'SELFTEST: FAIL' : 'SELFTEST: PASS');
  return bad.length ? 1 : 0;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-one-path.mjs')) {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  const red = judge(PKG);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ red: red.length, items: red.map((r) => r.symbol) }));
  }
  if (red.length) {
    console.error(`RED 同一符号两个路径：${red.length} 个（规矩与口径见本件头）`);
    for (const r of red) {
      console.error(`RED   ${r.symbol} —— ${r.reason}`);
      for (const p of r.paths) console.error(`        dist/${p.path}　←　${p.sites.join('、')}`);
    }
    console.error('修法：把断言换到其中一条路径上（优先生产真正走的那条）；确属搬迁期薄转出时，'
      + '在正本件旁写出 `export { … } from \'./正本件.js\'`，本门按源码派生例外、不认手写清单。');
    process.exit(1);
  }
  console.log('PASS: 测试面每个符号只有一条 dist 路径（包门与薄转出声明按源码派生豁免）');
}
