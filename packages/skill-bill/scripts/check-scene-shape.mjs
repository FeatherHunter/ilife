#!/usr/bin/env node
/** t689 · 写入域形状门（**判据乙的机器形态**，规格＝`packages/skill-bill/docs/t685-接口与判据.md` §2.2）。
 *
 * 守的是什么：**场景件只声明差异值，不许出现块序**。场景件（`src/<域>/scene-*.ts`）里
 *   ① 不许 import 公共层的块位渲染函数；② 不许出现整段 HTML 字面量；③ 不许调本域的装配件
 *   （块序与拼装的唯一住所是该域的模板件 `src/<域>/template-*.ts`）。
 *
 * 判读形态（任一命中即红，逐条点名到「文件:行号」）：
 *   乙-1 `import ... from 'base-paint/blocks'` 里出现块位渲染函数名；
 *   乙-2 正文里出现整段 HTML 字面量（`'<section'`、`'<div class="ilife-'` 这类）；
 *   乙-3 正文里出现块位渲染函数调用或本域装配件调用（`pageShell(`／`copyArea(`／`fieldCardOf(` 这类）。
 *
 * 用法：
 *   node packages/skill-bill/scripts/check-scene-shape.mjs               # 真实门禁（无参）
 *   node packages/skill-bill/scripts/check-scene-shape.mjs --root <包根> # 夹具／变异入口（只读）
 * 末两行固定：`SCAN-ROOT: <根>` 与 `RESULT: n/m`（n＝合格件数、m＝扫描到的场景件数）；exit 0 绿、1 红。
 * **本脚本不提供关掉扫描面的开关**（缩面＝放宽）。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
}
const SCAN_ROOT = resolve(flag('--root', PKG_ROOT));

/** 块位渲染函数（公共层 `base-paint/blocks` 的 12 个区块 ＋ 常被误引进场景件的几个形状件）。 */
const BLOCK_RENDERERS = [
  'renderKpiGrid', 'renderKpiCard', 'renderDataTable', 'renderChips', 'renderListRows',
  'renderParamForm', 'renderDetailSection', 'renderCopyBlock', 'renderFeedbackBlock',
  'renderEmptyBlock', 'renderDisclosure', 'renderPreBlock', 'renderChartBlock',
  'renderPageShell', 'renderTocBlock', 'renderCaliberLine', 'renderConclusionBar',
  'renderDistributionRows', 'renderMiniBar', 'renderChangeRows',
];

/** 本域装配件（块序、拼装、整页装配的那几个人）：场景件一律不许直接调。 */
const ASSEMBLERS = [
  'pageShell', 'copyArea', 'copyLog', 'promptCopyArea', 'undoExit', 'fieldCardOf',
  'collectBlockedFold', 'collectProgress', 'collectMissingTags', 'collectSectionTitle',
  'typeBadge', 'emptyNote', 'duplicateNote', 'prefillNote', 'summaryCards',
  'receiptStatusCard', 'reconcileDisclosure', 'blockedBar',
];

/** 整段 HTML 字面量的形态（页面本地不许拼 HTML）。 */
const HTML_LITERAL = /['"`]\s*<(section|div|p|section|table|span|!doctype)\b/i;

function sceneFiles(root) {
  const src = join(root, 'src');
  if (!existsSync(src)) return [];
  const out = [];
  for (const dir of readdirSync(src, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(src, dir.name))) {
      if (/^scene-.*\.ts$/.test(f)) out.push(join(src, dir.name, f));
    }
  }
  return out.sort();
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .map((l) => l.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

/** 逐件判三条；返回命中清单（每条＝{file,line,rule,hit}）。 */
function judge(file) {
  const raw = readFileSync(file, 'utf8');
  const text = stripComments(raw);
  const lines = text.split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    const at = i + 1;
    const imp = line.match(/^\s*import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'base-paint\/blocks'/);
    if (imp) {
      for (const n of imp[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0])) {
        if (BLOCK_RENDERERS.includes(n)) hits.push({ file, line: at, rule: '乙-1', hit: 'import ' + n });
      }
    }
    for (const n of BLOCK_RENDERERS) {
      if (new RegExp('\\b' + n + '\\s*\\(').test(line)) hits.push({ file, line: at, rule: '乙-2', hit: n + '(...)' });
    }
    for (const n of ASSEMBLERS) {
      if (new RegExp('\\b' + n + '\\s*\\(').test(line)) hits.push({ file, line: at, rule: '乙-3', hit: n + '(...)' });
    }
    if (HTML_LITERAL.test(line)) hits.push({ file, line: at, rule: '乙-2', hit: '整段 HTML 字面量' });
  });
  return hits;
}

const files = sceneFiles(SCAN_ROOT);
console.log('SCAN-ROOT: ' + SCAN_ROOT);
if (files.length === 0) {
  console.log('RED 扫描面为空：' + join(SCAN_ROOT, 'src', '*', 'scene-*.ts') + ' 一件场景件都没扫到');
  console.log('RESULT: 0/1');
  console.log('修法：确认包根（--root）与域目录名；场景件命名须是 `src/<域>/scene-<名>.ts`。');
  process.exit(1);
}
const all = [];
for (const f of files) all.push(...judge(f));
const bad = new Set(all.map((h) => h.file));
for (const h of all) {
  console.log('RED ' + h.file.replace(SCAN_ROOT + '\\', '').replace(SCAN_ROOT + '/', '')
    + ':' + h.line + ' [' + h.rule + '] ' + h.hit);
}
console.log('RESULT: ' + (files.length - bad.size) + '/' + files.length);
if (bad.size > 0) {
  console.log('修法：把块位序列与拼装搬进该域的模板件（`src/<域>/template-*.ts` 的 `bind<族>Pages(spec)`），'
    + '场景件只留差异值（值／文案／纯文本函数）；规格见 `packages/skill-bill/docs/t685-接口与判据.md` §2.2。');
  process.exit(1);
}
console.log('PASS: 场景件只声明差异值，块序与块位拼装都在模板件里');
process.exit(0);
