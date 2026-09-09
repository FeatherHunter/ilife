/**
 * #79 审查席 1（红队）· 独立复核探针（**不 import 交付席的 t79-*.mjs**）。
 *
 * 目的：用与交付席不同的实现独立重算三件事，凡与对照表不符即记缺陷。
 *   ① 穷举性：`docs/base-paint-contract.md` 全部 `FROZEN-SURFACE-TABLE` 标记区行
 *      ↔ `docs/research/t79-base-contract.md` 表 B 行，一一对应／漏条／多条／重复。
 *   ② 判据可伪造性：逐条重算「声明点／出口面／测试引用」，并把测试引用分成
 *      「真使用（import 或标识符出现在非注释代码行）」与「仅注释/字符串」。
 *   ③ v1.30 26 项：契约 §2 表行 ↔ 报告表 A 行一一对应。
 *
 * 出口面双实现互证：runtime 用动态 import 实测；type 用
 *   (a) TS 编译器 API getExportsOfModule，(b) 本探针自写的 `export *` 文本递归解析器。
 * 两者一致才判「出口面成立」。
 *
 * CLI：node docs/research/t79-review-red-probe.mjs [--json] [--recheck N]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => relative(root, p).replace(/\\/g, '/');
const CONTRACT = join(root, 'docs/base-paint-contract.md');
const REPORT = join(root, 'docs/research/t79-base-contract.md');

/* ---------- 通用：markdown 表行解析（正确排除表头与分隔行） ---------- */
const splitCells = (line) => {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '\\' && body[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (ch === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
};
const isSeparator = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '');

/* ---------- ① 契约标记区 ---------- */
function contractMarkedRows() {
  const text = readFileSync(CONTRACT, 'utf8');
  const re = /<!-- FROZEN-SURFACE-TABLE-START -->([\s\S]*?)<!-- FROZEN-SURFACE-TABLE-END -->/g;
  const rows = [];
  const regions = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const startLine = text.slice(0, m.index).split('\n').length;
    const body = m[1].split('\n');
    const regionRows = [];
    body.forEach((line, i) => {
      if (!line.trim().startsWith('|')) return;
      const cells = splitCells(line);
      if (cells[0] === '名字' || isSeparator(cells)) return;
      const row = {
        name: cells[0].replace(/^`|`$/g, ''),
        kind: cells[1], ticket: cells[2], status: cells[3], section: cells[4],
        signature: cells[5] ?? '',
        docLine: startLine + i,
      };
      regionRows.push(row);
      rows.push(row);
    });
    regions.push({ startLine, count: regionRows.length, first: regionRows[0]?.name, last: regionRows.at(-1)?.name });
  }
  return { rows, regions };
}

/* ---------- 契约 §2（v1.30 26 项） ---------- */
function contractSection2Rows() {
  const lines = readFileSync(CONTRACT, 'utf8').split('\n');
  const start = lines.findIndex((l) => /^\| 节号 \| 能力名 \|/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) break;
    const cells = splitCells(line);
    if (isSeparator(cells)) continue;
    out.push({ section: cells[0], ability: cells[1], oldSig: cells[2], newVerdict: cells[3], docLine: i + 1 });
  }
  return out;
}

/* ---------- 报告表 A / 表 B ---------- */
function reportTable(headerRe) {
  const lines = readFileSync(REPORT, 'utf8').split('\n');
  const start = lines.findIndex((l) => headerRe.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) break;
    const cells = splitCells(line);
    if (isSeparator(cells)) continue;
    out.push({ cells, docLine: i + 1 });
  }
  return out;
}

/* ---------- ② 源码声明点（独立规则，比交付席更严：只认真定义，再导出另记） ---------- */
function srcFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) srcFiles(p, acc);
    else if (e.name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

function buildDeclIndex() {
  const files = srcFiles(join(root, 'packages/base-render/src'));
  const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8').split('\n')]));
  const defIndex = new Map();   // name -> {file,line,text,form}
  const reIndex = new Map();    // name -> {file,line,text,form:'re-export'}
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const f of files) {
    const lines = text.get(f);
    lines.forEach((line, i) => {
      let m;
      if ((m = /^export\s+(?:declare\s+)?(?:const|let|var|function|class|enum)\s+([A-Za-z_$][\w$]*)/.exec(line))) {
        if (!defIndex.has(m[1])) defIndex.set(m[1], { file: rel(f), line: i + 1, text: line.trim(), form: 'definition' });
      }
      if ((m = /^export\s+(?:type\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/.exec(line))) {
        if (!defIndex.has(m[1])) defIndex.set(m[1], { file: rel(f), line: i + 1, text: line.trim(), form: 'definition' });
      }
      // 具名再导出：export { a, b } / export type { a }（可能带 from）
      const reExport = /^export\s+(?:type\s+)?\{([^}]*)\}/.exec(line);
      if (reExport) {
        for (const piece of reExport[1].split(',')) {
          const nm = piece.trim().split(/\s+as\s+/).pop().trim();
          if (!nm) continue;
          if (!reIndex.has(nm)) reIndex.set(nm, { file: rel(f), line: i + 1, text: line.trim(), form: 're-export' });
        }
      }
    });
  }
  return { defIndex, reIndex, fileCount: files.length };
}

/** 独立 d.ts 出口面解析：文本递归 `export *` ＋ 具名导出（不用 TS API）。 */
function textualTypeExports() {
  const dist = join(root, 'packages/base-render/dist');
  const names = new Set();
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    // 去掉注释块，避免注释里的 export 干扰
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const starRe = /export\s+(?:\*\s+from\s+|type\s+\*\s+from\s+)['"]([^'"]+)['"]/g;
    let m;
    while ((m = starRe.exec(code)) !== null) {
      walk(join(dirname(file), m[1].replace(/\.js$/, '.d.ts')));
    }
    const namedRe = /export\s+(?:type\s+)?\{([^}]*)\}/g;
    while ((m = namedRe.exec(code)) !== null) {
      for (const piece of m[1].split(',')) {
        const nm = piece.trim().split(/\s+as\s+/).pop().trim();
        if (nm) names.add(nm);
      }
    }
    const declRe = /export\s+(?:declare\s+)?(?:const|let|var|function|class|enum|interface|type)\s+([A-Za-z_$][\w$]*)/g;
    while ((m = declRe.exec(code)) !== null) names.add(m[1]);
  };
  walk(join(dist, 'index.d.ts'));
  return { names, visited: [...seen].map(rel) };
}

async function tsApiTypeExports() {
  const distIndex = join(root, 'packages/base-render/dist/index.d.ts');
  const tsMod = await import('typescript');
  const ts = tsMod.default ?? tsMod;
  const program = ts.createProgram([distIndex], {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(distIndex);
  const sym = sf ? checker.getSymbolAtLocation(sf) : undefined;
  const names = new Set((sym ? checker.getExportsOfModule(sym) : []).map((s) => s.getName()));
  return names;
}

/* ---------- ③ 测试引用（分类：真使用 vs 仅注释） ---------- */
function buildTestIndex() {
  const dirs = [join(root, 'packages/base-render/test'), join(root, 'packages/base-render/test-d')];
  const files = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(mjs|ts|js)$/.test(e.name)) files.push(p);
    }
  };
  dirs.forEach(walk);
  const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8').split('\n')]));
  return { files, text };
}

const isCommentLine = (line) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/');
};

function testRefs(name, idx) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${esc}\\b`, 'g');
  let raw = 0, real = 0;
  const filesRaw = new Set(), filesReal = new Set();
  const commentSamples = [];
  for (const f of idx.files) {
    const lines = idx.text.get(f);
    let fr = 0, fl = 0;
    lines.forEach((line, i) => {
      const hits = (line.match(re) ?? []).length;
      if (!hits) return;
      raw += hits; fr += hits;
      if (isCommentLine(line)) {
        if (commentSamples.length < 3) commentSamples.push(`${rel(f)}:${i + 1}`);
      } else {
        real += hits; fl += hits;
      }
    });
    if (fr) filesRaw.add(rel(f));
    if (fl) filesReal.add(rel(f));
  }
  // 是否出现在 import 语句里（最强证据）
  let imported = false;
  const importRe = new RegExp(`^\\s*import[\\s\\S]{0,400}?\\b${esc}\\b[\\s\\S]{0,400}?from\\s`, 'm');
  for (const f of idx.files) {
    if (importRe.test(idx.text.get(f).join('\n'))) { imported = true; break; }
  }
  return { raw, real, filesRaw: filesRaw.size, filesReal: filesReal.size, imported, commentSamples };
}

/* ---------- 主流程 ---------- */
export async function collect() {
  const contract = contractMarkedRows();
  const s2 = contractSection2Rows();
  const reportB = reportTable(/^\| # \| 名字 \| 种类 \| 票 \| 章节 \| 冻结签名/);
  const reportA = reportTable(/^\| # \| 节号 \| 能力（v1\.30） \|/);

  const { defIndex, reIndex, fileCount: srcCount } = buildDeclIndex();
  const runtimeExports = await import(pathToFileURL(join(root, 'packages/base-render/dist/index.js')).href);
  const runtimeNames = new Set(Object.keys(runtimeExports));
  const typeApi = await tsApiTypeExports();
  const typeText = textualTypeExports();
  const testIdx = buildTestIndex();

  const rows = reportB.map((r) => {
    const c = r.cells;
    return {
      no: Number(c[0]), name: c[1].replace(/^`|`$/g, ''), kind: c[2], ticket: c[3], section: c[4],
      reportSig: c[5] ?? '', v130: c[6] ?? '', reportDecl: c[7] ?? '', reportSurface: c[8] ?? '',
      reportRefs: c[9] ?? '', verdict: (c[10] ?? '').replace(/\*\*/g, ''), docLine: r.docLine,
    };
  });

  const detail = rows.map((r) => {
    const def = defIndex.get(r.name) ?? null;
    const re = reIndex.get(r.name) ?? null;
    const runtimeOk = r.kind === 'runtime' ? runtimeNames.has(r.name) : null;
    const typeApiOk = r.kind === 'type' ? typeApi.has(r.name) : null;
    const typeTextOk = r.kind === 'type' ? typeText.names.has(r.name) : null;
    const surfaceOk = r.kind === 'runtime' ? runtimeOk === true : (typeApiOk === true && typeTextOk === true);
    const refs = testRefs(r.name, testIdx);
    const redVerdict = !def ? '无(无声明点)' : !surfaceOk ? '无(无出口面)' : refs.real === 0 ? '部分(零真使用)' : '有';
    return {
      ...r, def, reExport: re, runtimeOk, typeApiOk, typeTextOk, surfaceOk, refs,
      redVerdict, agree: redVerdict.startsWith(r.verdict.replace(/[（(].*$/, '')),
    };
  });

  return { contract, s2, reportB, reportA, rows: detail, runtimeNames, typeApi, typeText, srcCount, testFileCount: testIdx.files.length };
}

/* ---------- 报告 ---------- */
const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  // --show NAME[,NAME...]：逐条打印该名字在测试面的真实出现行（用于人眼判「引用是不是真使用」）
  const showArg = process.argv.find((a) => a.startsWith('--show'));
  if (showArg) {
    const names = (showArg.includes('=') ? showArg.split('=')[1] : process.argv[process.argv.indexOf(showArg) + 1] ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const idx = buildTestIndex();
    for (const n of names) {
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${esc}\\b`);
      console.log(`===== ${n}`);
      let shown = 0, total = 0;
      for (const f of idx.files) {
        idx.text.get(f).forEach((line, i) => {
          if (!re.test(line)) return;
          total += 1;
          if (shown < 6) { console.log(`  ${rel(f)}:${i + 1}  ${isCommentLine(line) ? '[注释] ' : ''}${line.trim().slice(0, 160)}`); shown += 1; }
        });
      }
      console.log(`  (总 ${total} 行，展示前 ${shown} 行)`);
    }
    process.exit(0);
  }

  const { contract, s2, reportB, reportA, rows, runtimeNames, typeApi, typeText, srcCount, testFileCount } = await collect();
  const wantJson = process.argv.includes('--json');

  const cNames = contract.rows.map((r) => r.name);
  const rNames = rows.map((r) => r.name);
  const dupC = cNames.filter((n, i) => cNames.indexOf(n) !== i);
  const dupR = rNames.filter((n, i) => rNames.indexOf(n) !== i);
  const missing = cNames.filter((n) => !rNames.includes(n));
  const extra = rNames.filter((n) => !cNames.includes(n));

  const out = {
    contract: {
      regionCount: contract.regions.length,
      regions: contract.regions,
      rowCount: contract.rows.length,
      section3RowCount: contract.rows.filter((r) => r.docLine < 854).length,
      byTicket: contract.rows.reduce((a, r) => ((a[r.ticket] = (a[r.ticket] ?? 0) + 1), a), {}),
      byKind: contract.rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] ?? 0) + 1), a), {}),
      byStatus: contract.rows.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}),
      duplicates: dupC,
    },
    reportB: { rowCount: rows.length, duplicates: dupR, missingVsContract: missing, extraVsContract: extra },
    surfaceImpl: { srcFiles: srcCount, testFiles: testFileCount, runtimeExportCount: runtimeNames.size, tsApiTypeCount: typeApi.size, textTypeCount: typeText.names.size, typeImplDiff: [...new Set([...typeApi].filter((n) => !typeText.names.has(n)))], textOnly: [...new Set([...typeText.names].filter((n) => !typeApi.has(n)))] },
    perRowMismatch: {
      declMismatch: rows.filter((r) => r.def && r.reportDecl && !r.reportDecl.includes(`${r.def.file}:${r.def.line}`)).map((r) => ({ name: r.name, report: r.reportDecl, mine: `${r.def.file}:${r.def.line}` })),
      declMissing: rows.filter((r) => !r.def).map((r) => r.name),
      surfaceMissing: rows.filter((r) => !r.surfaceOk).map((r) => ({ name: r.name, kind: r.kind, runtime: r.runtimeOk, typeApi: r.typeApiOk, typeText: r.typeTextOk })),
      zeroRealUse: rows.filter((r) => r.refs.real === 0).map((r) => ({ name: r.name, kind: r.kind, raw: r.refs.raw, samples: r.refs.commentSamples, reportRefs: r.reportRefs })),
      notImported: rows.filter((r) => !r.refs.imported).map((r) => ({ name: r.name, kind: r.kind, raw: r.refs.raw, real: r.refs.real, reportRefs: r.reportRefs })),
      verdictDisagree: rows.filter((r) => r.redVerdict.replace(/\(.*/, '') !== r.verdict).map((r) => ({ name: r.name, report: r.verdict, red: r.redVerdict })),
      sigMismatch: rows.filter((r) => {
        const c = contract.rows.find((x) => x.name === r.name);
        if (!c) return false;
        const norm = (s) => s.replace(/\\\|/g, '|').replace(/\s+/g, ' ').trim();
        const rs = norm(r.reportSig).replace(/`/g, '').replace(/…$/, '');
        const cs = norm(c.signature).replace(/`/g, '');
        return !cs.startsWith(rs.replace(/\\$/, '').slice(0, Math.max(0, rs.length - 1)));
      }).map((r) => ({ name: r.name, report: r.reportSig.slice(0, 60), contract: (contract.rows.find((x) => x.name === r.name) ?? {}).signature?.slice(0, 60) })),
      kindTicketSectionMismatch: rows.filter((r) => {
        const c = contract.rows.find((x) => x.name === r.name);
        return c && (c.kind !== r.kind || c.ticket !== r.ticket || c.section !== r.section);
      }).map((r) => ({ name: r.name, contract: contract.rows.find((x) => x.name === r.name), report: { kind: r.kind, ticket: r.ticket, section: r.section } })),
    },
    tableA: {
      contractRows: s2.length, reportRows: reportA.length,
      contractAbilities: s2.map((x) => `${x.section} ${x.ability}`),
      reportAbilities: reportA.map((x) => `${x.cells[1]} ${x.cells[2]}`),
      reportVerdicts: reportA.reduce((a, x) => ((a[x.cells[5]] = (a[x.cells[5]] ?? 0) + 1), a), {}),
      contractVerdicts: s2.reduce((a, x) => ((a[x.newVerdict] = (a[x.newVerdict] ?? 0) + 1), a), {}),
      abilitySetDiff: {
        onlyContract: s2.map((x) => x.ability).filter((a) => !reportA.some((r) => r.cells[2].includes(a) || a.includes(r.cells[2]))),
        onlyReport: reportA.map((r) => r.cells[2]).filter((a) => !s2.some((x) => x.ability.includes(a) || a.includes(x.ability))),
      },
    },
  };
  if (wantJson) console.log(JSON.stringify({ summary: out, rows }, null, 1));
  else {
    console.log('== 穷举性 ==');
    console.log('契约标记区：region=%d rows=%d 票=%j 种类=%j', out.contract.regionCount, out.contract.rowCount, out.contract.byTicket, out.contract.byKind);
    console.log('契约行重复：%j', out.contract.duplicates);
    console.log('报告表 B：rows=%d 重复=%j 漏=%j 多=%j', out.reportB.rowCount, out.reportB.duplicates, out.reportB.missingVsContract, out.reportB.extraVsContract);
    console.log('== 判据复核 ==');
    console.log('声明点缺失：%j', out.perRowMismatch.declMissing);
    console.log('声明点与报告不一致：%j', out.perRowMismatch.declMismatch);
    console.log('出口面缺失：%j', out.perRowMismatch.surfaceMissing);
    console.log('零真使用（仅注释/字符串）：%j', out.perRowMismatch.zeroRealUse);
    console.log('未出现在 import 语句：%d 条', out.perRowMismatch.notImported.length);
    console.log('判定不一致：%j', out.perRowMismatch.verdictDisagree);
    console.log('种类/票/章节与契约不符：%j', out.perRowMismatch.kindTicketSectionMismatch);
    console.log('== 表 A ==');
    console.log('契约 §2 rows=%d，报告表 A rows=%d', out.tableA.contractRows, out.tableA.reportRows);
    console.log('契约判定=%j 报告判定=%j', out.tableA.contractVerdicts, out.tableA.reportVerdicts);
    console.log('能力集差异：%j', out.tableA.abilitySetDiff);
    console.log('== 出口面双实现 ==');
    console.log('TS API 独有 %j ／ 文本解析独有 %j', out.surfaceImpl.typeImplDiff, out.surfaceImpl.textOnly);
  }
}
