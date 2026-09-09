/**
 * t79：v1.30 能力行（契约 §2 的 26 行）× 实现实况 独立取证（可 import 的 collector）。
 *
 * 与 §3 冻结面探针的分工：本脚本从**旧侧能力**出发（`docs/research/t92-old-v130-signatures.md` 的 26 项），
 * 在 `packages/**` 里数旧符号命中、在包出口面里查新落点符号、在测试里查引用，按**显式规则**给结论
 * （不抄契约 §2 的「新判定」列，只把事实摆出来再判定；两列口径不同，见报告 §1）。
 *
 * 判定规则：
 *   无   = intent=drop（显式不移植，或旧能力在新架构无对应实现）。
 *   有   = 全部新落点符号在出口面，且至少一处测试引用；intent=keep。
 *   部分 = intent=partial（新落点存在但只覆盖旧能力子集／带偏离），或新落点齐备但零测试引用。
 *
 * CLI：node docs/research/t79-v130-probe.mjs [--json]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => p.slice(root.length + 1).replace(/\\/g, '/');

export async function collect() {
  const pkgFiles = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.scratch') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|mjs|js|html|md)$/.test(e.name)) pkgFiles.push(p);
    }
  };
  walk(join(root, 'packages'));
  const pkgText = new Map(pkgFiles.map((f) => [f, readFileSync(f, 'utf8')]));

  /** 去注释后的代码文本（域无关判据只认代码面，不认「显式记账」这类元语言注释）。 */
  const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const hits = (re, scope = 'all') => {
    const out = [];
    for (const [f, t] of pkgText) {
      const r = rel(f);
      if (scope === 'base-src' && !/^packages\/base-(render|link-core|combos)\/src\//.test(r)) continue;
      if (scope === 'base-src-code' && !/^packages\/base-(render|link-core|combos)\/src\/.*\.ts$/.test(r)) continue;
      if (scope === 'code' && !/\.(ts|mjs|js|html)$/.test(r)) continue;
      const hay = scope === 'base-src-code' ? stripComments(t) : t;
      const c = (hay.match(re) ?? []).length;
      if (c > 0) out.push({ file: r, count: c });
    }
    out.sort((a, b) => b.count - a.count);
    return { total: out.reduce((a, x) => a + x.count, 0), files: out };
  };

  const runtimeNames = new Set(Object.keys(await import(pathToFileURL(join(root, 'packages/base-render/dist/index.js')).href)));
  const coreNames = new Set(Object.keys(await import(pathToFileURL(join(root, 'packages/base-link-core/dist/index.js')).href)));
  const tsMod = await import('typescript');
  const ts = tsMod.default ?? tsMod;
  const typeNamesOf = (p) => {
    const program = ts.createProgram([p], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true });
    const sf = program.getSourceFile(p);
    const sym = sf && program.getTypeChecker().getSymbolAtLocation(sf);
    return new Set((sym ? program.getTypeChecker().getExportsOfModule(sym) : []).map((s) => s.getName()));
  };
  const renderTypes = typeNamesOf(join(root, 'packages/base-render/dist/index.d.ts'));
  const coreTypes = typeNamesOf(join(root, 'packages/base-link-core/dist/index.d.ts'));
  const hasName = (n) => runtimeNames.has(n) || coreNames.has(n) || renderTypes.has(n) || coreTypes.has(n);

  const testFiles = [];
  const walkT = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walkT(p);
      else if (/\.(test\.mjs|ts)$/.test(e.name)) testFiles.push(p);
    }
  };
  walkT(join(root, 'packages/base-render/test'));
  walkT(join(root, 'packages/base-render/test-d'));
  walkT(join(root, 'test'));
  const testText = testFiles.map((f) => [rel(f), readFileSync(f, 'utf8')]);
  const testCount = (n) => testText.reduce((a, [, t]) => a + ((t.match(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) ?? []).length), 0);

  const ROWS = [
    { id: '§3', cap: '占位符标准与填充机制', old: /\binject\s*\(|injector\.py/g, newNames: ['fillTemplate', 'TEMPLATE_MARKERS', 'INJECTION_ORDER'], intent: 'keep' },
    { id: '§3', cap: 'NO-SHARED 豁免 + CHARTS-HELPERS', old: /NO-SHARED|CHARTS-HELPERS/g, newNames: ['MARKER_RULES', 'TEMPLATE_MARKERS'], intent: 'keep' },
    { id: '§4', cap: 'payload 信封 + 结构校验', old: /--strict-payload|status.*ok.*message.*data/g, newNames: ['createEnvelope', 'parseEnvelope', 'assertShapeData', 'Envelope'], intent: 'keep' },
    { id: '§5', cap: 'P0 守卫组 esc/arr/val/yes/validate', old: /\besc\s*\(|\barr\s*\(|\bval\s*\(|\byes\s*\(|\bvalidate\s*\(/g, newNames: ['escapeHtml'], intent: 'partial' },
    { id: '§5.1', cap: 'toast 通用提示控件', old: /\btoast\s*\(/g, newNames: ['renderToast', 'createToastController'], intent: 'partial' },
    { id: '§6.1', cap: 'snapshot 结构化接口', old: /buildDataText|buildLogText/g, newNames: ['buildDataText', 'buildLogText'], intent: 'partial' },
    { id: '§6.2', cap: '复制按钮三件套 actionBar', old: /\bactionBar\s*\(/g, newNames: ['renderActionBar'], intent: 'keep' },
    { id: '§6.2 §6.8', cap: 'copyText（含反馈钩子）', old: /\bcopyText\s*\(/g, newNames: ['copyText'], intent: 'keep' },
    { id: '§6.3', cap: 'formPrompt', old: /\bformPrompt\s*\(/g, newNames: [], intent: 'drop' },
    { id: '§6.3 §6.7', cap: 'selectList（含行内 widget）', old: /\bselectList\s*\(/g, newNames: [], intent: 'drop' },
    { id: '§6.3', cap: 'confirm', old: /\bconfirm\s*\(\s*\{/g, newNames: [], intent: 'drop' },
    { id: '§6.3', cap: 'foldBox', old: /\bfoldBox\s*\(/g, newNames: [], intent: 'drop' },
    { id: '§6.3', cap: 'statusBadge／emptyState／errorReceipt', old: /\bstatusBadge\s*\(|\bemptyState\s*\(|\berrorReceipt\s*\(/g, newNames: ['renderStatusBadge', 'renderEmptyState', 'renderErrorReceipt'], intent: 'keep' },
    { id: '§6.3 §6.9', cap: 'smartSelect', old: /\bsmartSelect\s*\(/g, newNames: [], intent: 'drop' },
    { id: '§6.4', cap: 'token A 组 + 控件样式', old: /token\s*A|base\.css/g, newNames: ['CSS_VAR_TOKENS', 'buildStyleSheet'], intent: 'keep' },
    { id: '§6.5', cap: '图表组件 charts.* 8 接口', old: /charts\.(bar|line|donut|progress|combo|sparkline|gauge|scatter)\b/g, newNames: ['charts', 'ChartsApi'], intent: 'keep' },
    { id: '§6.6', cap: '复合形态 combo／sparkline／gauge', old: /\bcombo\b|\bsparkline\b|\bgauge\b/g, newNames: ['CHART_KINDS'], intent: 'keep' },
    { id: '§7', cap: '注入器接口 injector.py', old: /injector\.py|--strict-payload|--help-template/g, newNames: ['fillTemplate', 'INJECTION_ORDER'], intent: 'partial' },
    { id: '§6.5', cap: 'HELP 模板 + scene-data 契约', old: /help_template\.html|scene_data\.schema\.json|validate_help_data/g, newNames: ['renderHelpShell', 'SCENE_DATA_SCHEMA', 'HelpShellInput'], intent: 'keep' },
    { id: '§6.2 §9', cap: 'HELP 速查台一键复制指令', old: /__hmPayload|prompt.*复制/g, newNames: ['HELP_COPY_TARGETS'], intent: 'partial' },
    { id: '§8', cap: '版本与变更机制', old: /CHANGELOG|签名变更/g, newNames: ['BASE_PAINT_CONTRACT_VERSION'], intent: 'partial' },
    { id: '§9', cap: '08 规范', old: /08-HTML交互规范/g, newNames: [], intent: 'drop' },
    { id: '§2', cap: '领域无关声明', old: /卡路里|记账|睡眠/g, newNames: [], intent: 'keep-domain-free', scope: 'base-src-code' },
    { id: '§2', cap: '技能侧专属块 metaHeader／remindersBlock', old: /\bmetaHeader\b|\bremindersBlock\b/g, newNames: [], intent: 'drop' },
    { id: '§0', cap: '控件层测试资产', old: /test_components\.py/g, newNames: ['SPEC_FROZEN_SURFACE'], intent: 'keep' },
    { id: '§6.5', cap: '图表白名单例外', old: /weight_volatility_v2|白名单例外/g, newNames: ['CHART_KINDS'], intent: 'drop', scope: 'code' },
  ];

  const out = [];
  for (const r of ROWS) {
    const old = hits(r.old, r.scope);
    const newNames = r.newNames.map((n) => ({ name: n, surface: hasName(n), tests: testCount(n) }));
    const allSurface = newNames.length > 0 && newNames.every((x) => x.surface);
    const anyTests = newNames.some((x) => x.tests > 0);
    let verdict;
    if (r.intent === 'drop') verdict = '无';
    else if (r.intent === 'keep-domain-free') verdict = '有';
    else if (!allSurface) verdict = '无';
    else if (r.intent === 'partial') verdict = '部分';
    else verdict = anyTests ? '有' : '部分';
    out.push({ id: r.id, cap: r.cap, intent: r.intent, scope: r.scope ?? 'all', oldHits: old.total, oldFiles: old.files.slice(0, 3), newNames, verdict });
  }
  return out;
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  const out = await collect();
  const tally = out.reduce((a, x) => ((a[x.verdict] = (a[x.verdict] ?? 0) + 1), a), {});
  console.log('v1.30 能力行 =', out.length, '结论 =', JSON.stringify(tally));
  for (const x of out) {
    console.log(`${x.verdict}\t${x.id}\t${x.cap}\t旧符号命中=${x.oldHits}\t新落点=${x.newNames.map((n) => `${n.name}:${n.surface ? '面' : '缺'}/${n.tests}测`).join(',') || '（无）'}`);
  }
}
