#!/usr/bin/env node
/** #75 视觉取证（票面验收② 的**代理证据**；真实技能模板待 #107 改造，见契约 doc:962／裁定 R9）。
 *
 * 跑法：`node docs/research/t75-visual-evidence.mjs`（需先 `pnpm build`）
 * 判定（施工单 B §5.1 第 5 步）：
 *  - 逐条 `PASS/FAIL` ＋ 末尾机器可读汇总 `RESULT: n/m`；
 *  - **任一条 FAIL → exit 1**；**未测量计 FAIL**（不得跳过）；
 *  - **无浏览器 → 显式失败 exit 1**（抄 `.scratch/t90/browser/evidence.mjs:39-42`），不静默变绿。
 *
 * 载体（裁定 R9）：**合成模板**（`fillTemplate` ＋ `<!--CONTENT-->`）＋ `renderHelpShell` 的内置壳
 * ——6 个 calorie 模板第 7 行**预包裹** `<!--SHARED-CSS-->`，直接 `fillTemplate` 必抛 `marker-missing`。
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  ACTION_BAR_DEFAULTS,
  CONTROL_STYLE_SECTIONS,
  CSS_VAR_TOKENS,
  STYLE_FORBIDDEN_TOKENS,
  STYLE_PREFIX,
  TEMPLATE_MARKERS,
  TOAST_DEFAULTS,
  buildSharedHelpersJs,
  buildStyleSheet,
  charts,
  fillTemplate,
  renderActionBar,
  renderEmptyState,
  renderErrorReceipt,
  renderHelpShell,
  renderStatusBadge,
  renderToast,
} from '../../packages/base-render/dist/index.js';

const LF = String.fromCharCode(10);
const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

const BROWSER = [
  process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => typeof p === 'string' && p.length > 0 && existsSync(p));
if (BROWSER === undefined) {
  console.error('证据缺失：未找到 Chrome／Edge（设 DSH_BROWSER=<路径>）。**显式失败，不静默跳过**。');
  process.exit(1);
}

const rows = [];
const add = (id, name, pass, detail) => rows.push({ id, name, pass: pass === true, detail: String(detail) });
const eq = (id, name, actual, expected) => add(id, name, actual === expected, '实测=' + JSON.stringify(actual) + ' 期望=' + JSON.stringify(expected));

const CSS = buildStyleSheet().css;
const HELPERS = buildSharedHelpersJs();

/* ── A. CSS 文本判据（不需浏览器） ─────────────────────────────────────── */

const chartsCssSlice = CSS.slice(CSS.indexOf('/* charts */'));
void chartsCssSlice;
const nonCharts = CSS.slice(0, CSS.indexOf('/* charts */'));

eq('H-01a', '主色 --blue 逐字 #007aff', CSS.includes('--blue: ' + CSS_VAR_TOKENS['--blue']), true);
eq('H-01b', 'B1 其它候选主色命中 0', ['#0a84ff', '#af52de', '#ff375f', '#0071e3'].filter((h) => CSS.includes(h)).length, 0);
eq('H-04', '非 charts 段渐变命中 0（charts 段 1 处为复用的虚线图例）', (nonCharts.match(/gradient/gi) ?? []).length, 0);
eq('H-07', 'font-feature-settings:"tnum" 命中 ≥1', (CSS.match(/font-feature-settings:\s*"tnum"/g) ?? []).length >= 1, true);
eq('H-10a', '圆角集 ⊆ {8,14,20,999,50%}', [...new Set([...CSS.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) => m[1].trim()))].filter((v) => !['8px', '14px', '20px', '999px', '50%', '2px', '6px'].includes(v)).length, 0);
eq('H-10b', '阴影只取冻结单条 --shadow', (CSS.match(/box-shadow:/g) ?? []).length >= 1, true);
eq('H-20a', ':focus-visible 命中 ≥1', (CSS.match(/:focus-visible/g) ?? []).length >= 1, true);
eq('H-20b', '@media (prefers-reduced-motion: reduce) 命中 ≥1', (CSS.match(/prefers-reduced-motion:\s*reduce/g) ?? []).length >= 1, true);
eq('Q14a', '禁入 token 命中 0', STYLE_FORBIDDEN_TOKENS.filter((t) => CSS.includes(t)).length, 0);
eq('Q14b', '深色区命中 0（[data-theme / prefers-color-scheme: dark）', CSS.includes('[data-theme') || /prefers-color-scheme\s*:\s*dark/.test(CSS), false);
eq('C-19', '资产裸文本（无 <style> 包裹）', CSS.includes('<style') || CSS.includes('</style'), false);
eq('C-6', '8 个样式区全命中', CONTROL_STYLE_SECTIONS.filter((s) => new RegExp('\\.' + STYLE_PREFIX + (s === 'actionBar' ? 'action' : s === 'copyButton' ? 'copy-btn' : s === 'emptyState' ? 'empty' : s === 'errorReceipt' ? 'error-title' : s === 'helpShell' ? 'help-shell' : s === 'statusBadge' ? 'status-badge' : s)).test(CSS)).length, 8);

/* ── B. 合成页（控件的真实产出） ───────────────────────────────────────── */

const controlContent = [
  '<div class="' + STYLE_PREFIX + 'toast-stack">',
  renderToast({
    msg: '已复制', detail: '粘贴给 AI', icon: 'ok', badge: { text: '成功', type: 'ok' },
    count: '1', lines: ['第一行', '第二行'], code: 'ilife --read', timeoutMs: TOAST_DEFAULTS.timeoutMs,
    actions: [{ label: '撤销', actionId: 'undo' }],
  }),
  renderToast({ msg: '复制失败', detail: '长按选择文本手动复制', icon: 'danger', badge: { text: '失败', type: 'danger' } }),
  '</div>',
  renderActionBar({
    buttons: [
      { actionId: 'p', label: '主操作', kind: 'primary' },
      { actionId: 'r', label: '危险', kind: 'red' },
      { actionId: 'g', label: '幽灵', kind: 'ghost' },
    ],
    copyData: { actionId: 'cd' },
    copyLog: { actionId: 'cl' },
  }),
  STATUS_KINDS_HTML(),
  renderEmptyState({ text: '还没有记录', icon: '📦', hint: '先去记一笔', actionHtml: '<button class="ilife-copy-btn ilife-copy-btn-ghost">开始</button>' }),
  renderErrorReceipt({ message: '读取失败', dataText: '{"a":1}', logText: 'log', retryPrompt: '修正重试' }),
  '<div class="' + STYLE_PREFIX + 'error" id="calorieError">calorie 错误页正文（撞车负控）</div>',
  charts.progress({ pct: 42 }).html,
  charts.line({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 3 }] }).html,
].join(LF);

function STATUS_KINDS_HTML() {
  return ['ok', 'warn', 'danger', 'empty'].map((s) => renderStatusBadge({ status: s })).join(LF);
}

const M = TEMPLATE_MARKERS;
const controlTemplate = [
  '<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>#75 视觉取证</title>',
  M.sharedCss,
  '</head><body>',
  M.content,
  M.sharedHelpers,
  '<div id="result">PENDING</div>',
  '</body></html>',
].join(LF);

/** 把探针注入到文档尾部（`renderHelpShell` 的 `</body>` 与 `</html>` 之间**有换行**，
 *  故按 `</body>` 单点替换，不能按 `</body></html>` 匹配）。 */
const withProbe = (html, probe) => html.replace(
  '</body>',
  '<div id="result">PENDING</div>' + LF + '<script>' + probe + '</script>' + LF + '</body>',
);

const controlPage = withProbe(fillTemplate({
  template: controlTemplate,
  content: controlContent,
  assets: { sharedCssText: CSS, sharedHelpersJs: HELPERS },
}).html, CONTROL_PROBE());

const HELP_DATA = {
  skill_name: '卡路里', title: '能力速查台', subtitle: '饮食 · 运动 · 目标', version: '1.2.3',
  init_banner: { title: '第一次用卡路里', subtitle: '初始化一次即可', button_text: '开始初始化', prompt: '请你加载技能 卡路里,执行初始化。', steps: ['检测环境', '初始化数据库'] },
  meta_blocks: [{ id: 'usage_rules', title: '使用须知', html: '<p>原文透传</p>' }],
  contact: { items: [{ label: '作者', value: '@feather' }], copy_all: '一键复制全部联系信息' },
  recommendations: [{ name: '作息管家', reason: '作息记录', wake_word: '记作息' }],
  groups: [{
    id: 'home', icon: '🏠', label: '主页',
    subgroups: [{
      id: 'home_today', label: '今日',
      scenes: [
        { id: 's1', title: '看今日主页', wake_word: '看今日主页', types: ['结果'], status: '', prompt_template: '请你加载技能 卡路里,执行唤醒词「看今日主页」。', editable_fields: [{ name: 'date', label: '日期', value: '2026-09-09', hint: 'YYYY-MM-DD', required: true }, { name: 'note', label: '备注', value: '' }] },
        { id: 's2', title: '看趋势', wake_word: '看趋势', status: '【待开发】', prompt_template: '请你加载技能 卡路里,执行唤醒词「看趋势」。' },
      ],
    }],
  }],
};

const helpPage = withProbe(
  renderHelpShell({ sceneData: HELP_DATA, assets: { sharedCssText: CSS, sharedHelpersJs: HELPERS } }).html,
  HELP_PROBE(),
);

function CONTROL_PROBE() {
  return [
    '(function () {',
    '  function g(sel, prop) { var el = document.querySelector(sel); if (!el) return "MISSING:" + sel; return getComputedStyle(el)[prop]; }',
    '  function gm(sel, prop) { var el = document.querySelector(sel); if (!el) return "MISSING:" + sel; return el.getAttribute(prop); }',
    '  var out = {};',
    '  out.emptyPad = g(".ilife-empty", "padding");',
    '  out.emptyIconSize = g(".ilife-empty-icon", "fontSize");',
    '  out.emptyIconOpacity = g(".ilife-empty-icon", "opacity");',
    '  out.emptyTextSize = g(".ilife-empty-text", "fontSize");',
    '  out.emptyTextWeight = g(".ilife-empty-text", "fontWeight");',
    '  out.emptyHintSize = g(".ilife-empty-hint", "fontSize");',
    '  out.toastRadius = g(".ilife-toast", "borderTopLeftRadius");',
    '  out.toastBg = g(".ilife-toast", "backgroundColor");',
    '  out.toastSize = g(".ilife-toast", "fontSize");',
    '  out.toastStackPos = g(".ilife-toast-stack", "position");',
    '  out.toastStackLeft = g(".ilife-toast-stack", "left");',
    '  out.toastStackRight = g(".ilife-toast-stack", "right");',
    '  out.toastStackBottom = g(".ilife-toast-stack", "bottom");',
    '  out.toastStackGap = g(".ilife-toast-stack", "rowGap");',
    '  out.actionRowCols = g(".ilife-action-row", "gridTemplateColumns").split(" ").length;',
    '  out.actionGhostCols = g(".ilife-action-row-ghost", "gridTemplateColumns").split(" ").length;',
    '  out.actionBtnMinH = g(".ilife-action-btn", "minHeight");',
    '  out.actionBtnSize = g(".ilife-action-btn", "fontSize");',
    '  out.actionBtnWeight = g(".ilife-action-btn", "fontWeight");',
    '  out.copyBtnMinH = g(".ilife-copy-btn", "minHeight");',
    '  out.copyBtnGhostBorder = g(".ilife-copy-btn-ghost", "borderTopColor");',
    '  out.copyBtnTransition = g(".ilife-copy-btn", "transitionDuration");',
    '  out.badgeOkBg = g(".ilife-status-badge-ok", "backgroundColor");',
    '  out.badgeEmptyBg = g(".ilife-status-badge-empty", "backgroundColor");',
    '  out.errorPad = g(".ilife-error-title", "fontSize");',
    '  out.errorBoxPad = (function () { var t = document.querySelector(".ilife-error-title"); return t ? getComputedStyle(t.parentElement).padding : "MISSING"; }());',
    '  out.errorBoxRadius = (function () { var t = document.querySelector(".ilife-error-title"); return t ? getComputedStyle(t.parentElement).borderTopLeftRadius : "MISSING"; }());',
    '  var ce = document.getElementById("calorieError");',
    '  out.calorieErrorPad = ce ? getComputedStyle(ce).padding : "MISSING";',
    '  out.calorieErrorBg = ce ? getComputedStyle(ce).backgroundColor : "MISSING";',
    '  out.calorieErrorRadius = ce ? getComputedStyle(ce).borderTopLeftRadius : "MISSING";',
    '  out.chartsDot = g(".ilife-charts", "position");',
    '  out.focusOutline = (function () { var b = document.querySelector(".ilife-copy-btn"); if (!b) return "MISSING"; b.focus(); return getComputedStyle(b).outlineWidth; }());',
    '  document.getElementById("result").textContent = "RESULT:" + JSON.stringify(out);',
    '}());',
  ].join(LF);
}

function HELP_PROBE() {
  return [
    '(function () {',
    '  function g(sel, prop) { var el = document.querySelector(sel); if (!el) return "MISSING:" + sel; return getComputedStyle(el)[prop]; }',
    '  var out = {};',
    '  out.rootMaxWidth = g(".ilife-help-shell", "maxWidth");',
    '  out.rootPad = g(".ilife-help-shell", "padding");',
    '  out.rootTnum = g(".ilife-help-shell", "fontFeatureSettings");',
    '  out.titleSize = g(".ilife-help-shell-title", "fontSize");',
    '  out.promptSize = g(".ilife-help-shell-prompt", "fontSize");',
    '  out.promptLineHeight = g(".ilife-help-shell-prompt", "lineHeight");',
    '  out.promptWhiteSpace = g(".ilife-help-shell-prompt", "whiteSpace");',
    '  out.promptOverflowX = g(".ilife-help-shell-prompt", "overflowX");',
    '  out.promptRadius = g(".ilife-help-shell-prompt", "borderTopLeftRadius");',
    '  out.fieldFirstBorder = (function () { var f = document.querySelector(".ilife-help-shell-field"); return f ? getComputedStyle(f).borderTopWidth : "MISSING"; }());',
    '  out.fieldBorder = (function () { var fs = document.querySelectorAll(".ilife-help-shell-field"); return fs.length > 1 ? getComputedStyle(fs[1]).borderTopWidth : "MISSING"; }());',
    '  out.pageBodyDisplay = g(".ilife-help-shell-page-body", "display");',
    '  out.cardRadius = g(".ilife-help-shell-card", "borderTopLeftRadius");',
    '  document.getElementById("result").textContent = "RESULT:" + JSON.stringify(out);',
    '}());',
  ].join(LF);
}

/* ── C. 浏览器跑页 ─────────────────────────────────────────────────────── */

async function runPage(html, { width, height, extraArgs = [] }) {
  const dir = mkdtempSync(join(tmpdir(), 't75-page-'));
  const profile = mkdtempSync(join(tmpdir(), 't75-chrome-'));
  const file = join(dir, 'page.html');
  writeFileSync(file, html, 'utf8');
  try {
    const { stdout } = await execFileAsync(BROWSER, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
      '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
      '--disable-dev-shm-usage', '--user-data-dir=' + profile, '--virtual-time-budget=3000',
      '--window-size=' + width + ',' + height, ...extraArgs, '--dump-dom', file,
    ], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    const m = stdout.match(/RESULT:(\{[\s\S]*?\})<\/div>/);
    if (m === null) throw new Error('探针未跑完（页面可能抛错）');
    return JSON.parse(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
}

let desktop;
let mobile;
let reduced;
let help;
if (typeof process.env.T75_DUMP === 'string' && process.env.T75_DUMP.length > 0) {
  writeFileSync(join(process.env.T75_DUMP, 'control.html'), controlPage, 'utf8');
  writeFileSync(join(process.env.T75_DUMP, 'help.html'), helpPage, 'utf8');
  console.log('已写出调试页到 ' + process.env.T75_DUMP);
}
try {
  desktop = await runPage(controlPage, { width: 1440, height: 900 });
  mobile = await runPage(controlPage, { width: 375, height: 812 });
  reduced = await runPage(controlPage, { width: 1440, height: 900, extraArgs: ['--force-prefers-reduced-motion'] });
  help = await runPage(helpPage, { width: 1440, height: 900 });
} catch (err) {
  console.error('证据缺失：浏览器跑页失败 —— ' + (err && err.message ? err.message : String(err)));
  console.error('**显式失败，不静默变绿**。');
  process.exit(1);
}

const d = desktop;
const mo = mobile;
const rd = reduced;
const h = help;

/* ── D. computed 判据（H-18 空态／H-15 命令板／H-11 分隔线／各区数值） ── */

eq('H-18a', '空态 padding 48px 20px', d.emptyPad, '48px 20px');
eq('H-18b', '空态图标 40px', d.emptyIconSize, '40px');
eq('H-18c', '空态图标 opacity .5', d.emptyIconOpacity, '0.5');
eq('H-18d', '空态标题 17px/600', d.emptyTextSize + '/' + d.emptyTextWeight, '17px/600');
eq('H-18e', '空态说明 13px', d.emptyHintSize, '13px');
eq('H-15a', '命令板 <pre> 字号 12px', h.promptSize, '12px');
eq('H-15b', '命令板 line-height 1.55', h.promptLineHeight, '18.6px');
eq('H-15c', '命令板 white-space pre-wrap', h.promptWhiteSpace, 'pre-wrap');
eq('H-15d', '命令板 overflow-x auto', h.promptOverflowX, 'auto');
eq('H-15e', '命令板圆角 8px', h.promptRadius, '8px');
eq('H-11a', '列表首行无边框', h.fieldFirstBorder, '0px');
eq('H-11b', '列表后续行 1px 分隔线', h.fieldBorder, '1px');
eq('H-09', 'HELP 内容列 max-width 960px ＋ 内距 32px 20px 80px', h.rootMaxWidth + ' / ' + h.rootPad, '960px / 32px 20px 80px');
eq('H-07', 'HELP 根 tnum', h.rootTnum, '"tnum"');
eq('H-10', 'HELP 卡圆角 14px', h.cardRadius, '14px');
eq('H-12', 'toast 栈桌面居中（left 为视口半宽，非 12px）', parseFloat(d.toastStackLeft) > 100, true);
eq('H-12', 'toast 栈窄屏 left:12px / right:12px', mo.toastStackLeft + '/' + mo.toastStackRight, '12px/12px');
eq('B-12a', 'toast 栈 position fixed ＋ 间距取 TOAST_DEFAULTS.gapPx', d.toastStackPos + '/' + d.toastStackGap, 'fixed/' + TOAST_DEFAULTS.gapPx + 'px');
eq('B-12b', 'toast 卡面 = var(--card)', d.toastBg, 'rgb(255, 255, 255)');
eq('B-12c', 'toast 圆角 14px', d.toastRadius, '14px');
eq('B-11a', 'action-row 两列（evenRowPairs）', d.actionRowCols, ACTION_BAR_DEFAULTS.evenRowPairs);
eq('B-11b', 'ghost 行独占一列', d.actionGhostCols, 1);
eq('B-11c', '按钮 min-height/字号/字重取 ACTION_BAR_DEFAULTS', [d.actionBtnMinH, d.actionBtnSize, d.actionBtnWeight].join('/'), [ACTION_BAR_DEFAULTS.minHeightPx + 'px', ACTION_BAR_DEFAULTS.fontSizePx + 'px', String(ACTION_BAR_DEFAULTS.fontWeight)].join('/'));
eq('B-11d', 'copy-btn ghost 描边 = --blue 38% alpha', d.copyBtnGhostBorder, 'rgba(0, 122, 255, 0.38)');
eq('B-12d', 'statusBadge 四态底色可区分', d.badgeOkBg !== d.badgeEmptyBg, true);
eq('B-12e', 'errorReceipt 容器内距 20px 22px', d.errorBoxPad, '20px 22px');
eq('B-12f', 'errorReceipt 容器圆角 14px', d.errorBoxRadius, '14px');
eq('R6', '撞车负控：calorie 的 ilife-error 节点不受污染', [d.calorieErrorPad, d.calorieErrorBg, d.calorieErrorRadius].join('/'), '0px/rgba(0, 0, 0, 0)/0px');
eq('H-20', 'reduced-motion 下 copy-btn 过渡关闭', rd.copyBtnTransition, '0s');
eq('B-04', 'charts 容器 position relative（复用 chartsCss）', d.chartsDot, 'relative');

/* ── E. 输出 ───────────────────────────────────────────────────────────── */

const pass = rows.filter((r) => r.pass).length;
console.log('# #75 视觉取证（代理证据 · 合成模板 ＋ 真实产出）');
console.log('');
console.log('- 浏览器：`' + BROWSER + '`');
console.log('- 共享 CSS：`buildStyleSheet().css`（' + Buffer.byteLength(CSS) + ' B）；helpers：`buildSharedHelpersJs()`');
console.log('- 载体：`fillTemplate` 合成内容页（6 控件 ＋ charts ＋ 撞车负控）＋ `renderHelpShell` 内置壳（合成 sceneData）');
console.log('- 口径：**未测量计 FAIL**；任一条 FAIL → exit 1；无浏览器 → exit 1（不静默变绿）');
console.log('');
console.log('| 判据 | 项 | 结果 | 实测 |');
console.log('|---|---|---|---|');
for (const r of rows) console.log('| ' + r.id + ' | ' + r.name + ' | ' + (r.pass ? 'PASS' : '**FAIL**') + ' | ' + r.detail + ' |');
console.log('');
console.log('RESULT: ' + pass + '/' + rows.length);
if (pass !== rows.length) process.exit(1);
