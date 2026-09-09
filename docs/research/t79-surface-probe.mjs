/**
 * t79：冻结签名面（130 条）× 实现实况 逐条取证（可 import 的 collector）。
 *
 * 取证口径（每条四问，全部机读、可复跑）：
 *   ① 文档：`docs/base-paint-contract.md` 全部 `FROZEN-SURFACE-TABLE` 标记区的表行（名字／种类／票／状态／章节／逐字签名）。
 *   ② 实现：`packages/base-render/src/**` 的声明点（`export const|type|interface|function|class NAME`）→ `file:行号`。
 *   ③ 出口面：运行时符号在 `packages/base-render/dist/index.js` 的导出里（动态 import 实测）；
 *      类型符号用 TS 编译器 API 解析 `dist/index.d.ts` 的**模块导出**（含 `export * from` 再导出）。
 *   ④ 测试：`packages/base-render/test/**` 与 `test-d/**` 里出现该名字的文件与次数。
 *
 * 判定（结论列）：有 = 声明点＋出口面＋≥1 处测试引用；部分 = 缺其一（零测试引用／出口面缺失）；无 = 声明点或出口面缺失。
 *
 * CLI：node docs/research/t79-surface-probe.mjs [--json]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => p.slice(root.length + 1).replace(/\\/g, '/');

export async function collect() {
  // ---------- ① 文档表行 ----------
  const docText = readFileSync(join(root, 'docs/base-paint-contract.md'), 'utf8');
  const rows = [];
  const re = /<!-- FROZEN-SURFACE-TABLE-START -->([\s\S]*?)<!-- FROZEN-SURFACE-TABLE-END -->/g;
  let m;
  while ((m = re.exec(docText)) !== null) {
    const line0 = docText.slice(0, m.index).split('\n').length + 1;
    m[1].split('\n').forEach((l, i) => {
      if (!l.startsWith('|')) return;
      const cells = l.slice(1, -1).split('|').map((c) => c.trim());
      if (cells[0] === '名字' || /^-+$/.test(cells[0])) return;
      rows.push({
        name: cells[0].replace(/^`|`$/g, ''),
        kind: cells[1], ticket: cells[2], status: cells[3], section: cells[4],
        signature: cells[5].replace(/\\\|/g, '|'),
        docLine: line0 + i,
      });
    });
  }

  // ---------- ② 源码声明点 ----------
  const srcFiles = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) srcFiles.push(p);
    }
  };
  walk(join(root, 'packages/base-render/src'));
  const srcText = new Map(srcFiles.map((f) => [f, readFileSync(f, 'utf8').split('\n')]));

  /** 声明点：优先真定义，退回再导出清单。 */
  const declSite = (name) => {
    const defPats = [
      new RegExp(`^export\\s+(?:declare\\s+)?(?:const|type|interface|function|class|enum)\\s+${name}\\b`),
      new RegExp(`^\\s*${name}:\\s`),
    ];
    const rePats = [new RegExp(`^export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`), new RegExp(`^\\s*${name},?\\s*$`)];
    const scan = (pats) => {
      for (const f of srcFiles) {
        const lines = srcText.get(f);
        for (let i = 0; i < lines.length; i += 1) {
          if (pats.some((p) => p.test(lines[i]))) return { file: rel(f), line: i + 1, text: lines[i].trim() };
        }
      }
      return null;
    };
    return scan(defPats) ?? scan(rePats);
  };

  // ---------- ③ 出口面 ----------
  const distIndex = join(root, 'packages/base-render/dist/index.js');
  const dtsIndex = join(root, 'packages/base-render/dist/index.d.ts');
  const runtimeExports = existsSync(distIndex) ? await import(pathToFileURL(distIndex).href) : {};
  const runtimeNames = new Set(Object.keys(runtimeExports));

  const tsMod = await import('typescript');
  const ts = tsMod.default ?? tsMod;
  const program = ts.createProgram([dtsIndex], {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const dtsSf = program.getSourceFile(dtsIndex);
  const moduleSym = dtsSf ? checker.getSymbolAtLocation(dtsSf) : undefined;
  const typeNames = new Set((moduleSym ? checker.getExportsOfModule(moduleSym) : []).map((s) => s.getName()));

  // ---------- ④ 测试引用 ----------
  const testFiles = [];
  const walkTests = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walkTests(p);
      else if (/\.(test\.mjs|ts)$/.test(e.name)) testFiles.push(p);
    }
  };
  walkTests(join(root, 'packages/base-render/test'));
  walkTests(join(root, 'packages/base-render/test-d'));
  const testText = new Map(testFiles.map((f) => [f, readFileSync(f, 'utf8')]));

  const testRefs = (name) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reN = new RegExp(`\\b${esc}\\b`, 'g');
    const hits = [];
    let count = 0;
    for (const f of testFiles) {
      const c = (testText.get(f).match(reN) ?? []).length;
      if (c > 0) { hits.push({ file: rel(f), count: c }); count += c; }
    }
    hits.sort((a, b) => b.count - a.count);
    return { count, hits };
  };

  // ---------- 判定 ----------
  const out = [];
  for (const r of rows) {
    const decl = declSite(r.name);
    const runtime = r.kind === 'runtime' ? runtimeNames.has(r.name) : null;
    const type = r.kind === 'type' ? typeNames.has(r.name) : null;
    const surfaceOk = r.kind === 'runtime' ? runtime === true : type === true;
    const refs = testRefs(r.name);
    let verdict;
    if (!decl || !surfaceOk) verdict = '无';
    else if (refs.count === 0) verdict = '部分';
    else verdict = '有';
    out.push({ ...r, decl, runtime, type, surfaceOk, testRefs: refs, verdict });
  }
  return { rows: out, runtimeNames, typeNames, testFileCount: testFiles.length };
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  const { rows: out } = await collect();
  const tally = out.reduce((a, x) => ((a[x.verdict] = (a[x.verdict] ?? 0) + 1), a), {});
  console.log('rows =', out.length, 'verdicts =', JSON.stringify(tally));
  const byTicket = {};
  for (const x of out) { byTicket[x.ticket] ??= { 有: 0, 部分: 0, 无: 0 }; byTicket[x.ticket][x.verdict] += 1; }
  console.log('by ticket =', JSON.stringify(byTicket));
  console.log('decl 缺失 =', JSON.stringify(out.filter((x) => !x.decl).map((x) => x.name)));
  console.log('出口面缺失 =', JSON.stringify(out.filter((x) => !x.surfaceOk).map((x) => x.name)));
  console.log('零测试引用 =', JSON.stringify(out.filter((x) => x.testRefs.count === 0).map((x) => x.name)));
}
