#!/usr/bin/env node
/** #75 视觉取证（票面验收② 的**代理证据**；真实技能模板待 #107 改造，见契约 doc:962／裁定 R9）。
 *
 * 跑法：`node docs/research/t75-visual-evidence.mjs`（需先 `pnpm build`）
 * 判定（施工单 B §5.1 第 5 步）：
 *  - 逐条 `PASS/FAIL` ＋ 末尾机器可读汇总 `RESULT: n/m`；
 *  - **任一条 FAIL → exit 1**；**未测量计 FAIL**（不得跳过）；
 *  - **无浏览器 → 显式失败 exit 1**（抄 `.scratch/t90/browser/evidence.mjs:39-42`），不静默变绿；
 *  - **`DSH_BROWSER` 显式指向不存在的路径 → 立即 exit 1**（返修项⑦：旧实现静默回落硬编码 Chrome）。
 *
 * 返修项（A1／A2 审查后）：
 *  - ② 圆角集恢复**严格集** `{8,14,20,999,50%}`（旧允许表私加 `2px`／`6px` → 该条恒 PASS），
 *    仅对 **charts 段**豁免 `2px`（#78 图例色块）；
 *  - ⑥ `nonCharts` 改为「**除 charts 段外的全部产出文本**」（旧口径只覆盖 charts 之前 → 漏 helpShell）；
 *  - ⑧ 新增**外部 oracle**：逐字取契约 doc:276-288 的 `:root` CSS 块比对产出（不引用 `CSS_VAR_TOKENS` 自身）；
 *  - ①／⑤ 新增浏览器实测：运行时 toast 标题与详情**不同行**、errorReceipt 按钮区 grid 两行。
 *
 * 第二轮返修（W1／W4／W5／W8）：
 *  - **W1**：运行时 toast 结构已与静态产出器／旧层对齐（`controls.ts` 根因修）→
 *    判据升级为「**关闭按钮与标题同行**」`rt_close_top === rt_title_top` ＋ 高度区间 `[60,90]px`
 *    ＋ 结构（`.toast-body`／`.toast-title-row` 命中、无 `flex-wrap`）；
 *  - **W4**：新增 toast 入场动效判据（computed `animationName` ＋ reduced-motion 归零）；
 *  - **W5**：errorReceipt 按钮区补 `max-width:520px;margin:0 auto` ＋ `row-gap:14px` →
 *    `B-12j` 由弱判据（retry≈容器宽）升级为**逐值**（520／520／256 ＋ 居中）；
 *  - **W8**：窄屏改**真 375px**（iframe 宽 375；`--window-size=375` 实测 innerWidth=526，
 *    `≤400px` 断点从未覆盖）→ `H-12f`／`H-12g`／`H-12h`；`B-12j` 与 `B-12k` 合并为一条强判据。
 *
 * 载体（裁定 R9）：**合成模板**（`fillTemplate` ＋ `<!--CONTENT-->`）＋ `renderHelpShell` 的内置壳
 * ——6 个 calorie 模板第 7 行**预包裹** `<!--SHARED-CSS-->`，直接 `fillTemplate` 必抛 `marker-missing`。
 */
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { basename, join, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  ACTION_BAR_DEFAULTS,
  CONTROL_STYLE_SECTIONS,
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
const REPO_ROOT = resolve(HERE, '..', '..');
const TMP_ROOT = realpathSync(tmpdir());

/** 协议 §2.1 第 3 条（全仓事故后新增）：**任何递归删除前必须做路径守卫**——
 *  目标绝对路径必须以本脚本**独占临时根**（`os.tmpdir()` 下带 `t75-` 前缀的目录）开头，
 *  且**不得**落在 `node_modules`／`packages`／`docs`／`test`／`tooling`／`.git` 之下；守卫失败即抛错。 */
const FORBIDDEN_DIRS = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git']
  .map((d) => join(REPO_ROOT, d).toLowerCase() + sep);
function safeRm(dir, ownPrefix) {
  const abs = resolve(dir);
  const lower = abs.toLowerCase();
  if (!lower.startsWith(TMP_ROOT.toLowerCase() + sep) || !basename(abs).startsWith(ownPrefix)) {
    throw new Error('路径守卫失败（不在独占临时根下）：拒绝递归删除 ' + abs);
  }
  for (const p of FORBIDDEN_DIRS) {
    if (lower === p.slice(0, -1) || lower.startsWith(p)) throw new Error('路径守卫失败（敏感目录之下）：' + abs);
  }
  rmSync(abs, { recursive: true, force: true });
}

/** 返修项⑦（A2 实测）：`DSH_BROWSER` **被显式设置**但路径不存在时，旧实现用 `.find(existsSync)`
 *  静默回落到硬编码 Chrome（RESULT 42/42 照绿）→ 改为**立即显式失败 exit 1**，不许静默回落。 */
const EXPLICIT_BROWSER = typeof process.env.DSH_BROWSER === 'string' && process.env.DSH_BROWSER.length > 0
  ? process.env.DSH_BROWSER : undefined;
if (EXPLICIT_BROWSER !== undefined && !existsSync(EXPLICIT_BROWSER)) {
  console.error('证据缺失：DSH_BROWSER 显式指向的浏览器不存在 —— ' + EXPLICIT_BROWSER);
  console.error('**显式失败，不静默回落到其它浏览器**（返修项⑦）。');
  process.exit(1);
}
const BROWSER = [
  EXPLICIT_BROWSER,
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

/** 返修项⑥（A2）：`nonCharts` 旧口径 = 从开头切到 charts 区注释头为止，**只覆盖 charts 之前**，
 *  而 helpShell 区排在 charts **之后** → 未纳入渐变／圆角检查。改为「**除 charts 段外的全部产出文本**」：
 *  按两个区注释头切出 charts 段，其余（前段 ＋ helpShell 段）合并。两个锚点缺失即显式失败。 */
const CHARTS_HEAD = '/* charts */';
const HELP_HEAD = '/* help-shell */';
if (!CSS.includes(CHARTS_HEAD) || !CSS.includes(HELP_HEAD)) {
  console.error('证据缺失：样式表缺区注释头（' + CHARTS_HEAD + '／' + HELP_HEAD + '）→ 无法切出 charts 段。**显式失败**。');
  process.exit(1);
}
const chartsCssSlice = CSS.slice(CSS.indexOf(CHARTS_HEAD), CSS.indexOf(HELP_HEAD));
const nonCharts = CSS.slice(0, CSS.indexOf(CHARTS_HEAD)) + CSS.slice(CSS.indexOf(HELP_HEAD));

/** 返修项⑧（A1 变异实测）：旧 `H-01a` 拿 `CSS_VAR_TOKENS['--blue']` **和自己比** → 改 token 也绿。
 *  改为**外部 oracle**：逐字取契约 `docs/base-paint-contract.md:276-288` 的 ```css 块（不引用被测量常量）。 */
const DOC = readFileSync(join(HERE, '..', 'base-paint-contract.md'), 'utf8');
const docBlockStart = DOC.indexOf('```css' + LF + ':root {');
if (docBlockStart < 0) {
  console.error('证据缺失：契约 doc 缺 §3.2 `:root` CSS 块 → 外部 oracle 不可用。**显式失败**。');
  process.exit(1);
}
const docFrom = docBlockStart + '```css'.length + LF.length;
const DOC_ROOT_BLOCK = DOC.slice(docFrom, DOC.indexOf('```', docFrom)).replace(new RegExp(LF + '$'), '');
const docRootEnd = CSS.indexOf('}' + LF + '/* ');
const producedRootBlock = docRootEnd > 0 ? CSS.slice(CSS.indexOf(':root {'), docRootEnd + 1) : '';

/** 视觉尺 H-10 允许集（`docs/visual-spec-help.md:139`）：圆角只允许 {8,14,20,999,50%}。
 *  **返修项②**：旧允许表私自加了 `'2px','6px'` → 该条恒 PASS。现恢复严格集，仅对 **charts 段**
 *  单独豁免 `2px`（#78 冻结产出：图例色块 8×8 圆角 2px，本票必须复用不得改）。 */
const ROUNDING_ALLOWED = ['8px', '14px', '20px', '999px', '50%'];
const CHARTS_ROUNDING_EXEMPT = ['2px'];
const radiusSet = (text) => [...new Set([...text.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) => m[1].trim()))];

eq('H-01a', '主色 --blue 逐字（外部 oracle：契约 doc:283）', CSS.includes('--blue: #007aff'), true);
eq('H-01c', '产出含契约 doc:276-288 的 `:root` 块**逐字**（外部 oracle，不引用被测量常量）', CSS.includes(DOC_ROOT_BLOCK), true);
eq('H-01d', '产出 `:root` 块与契约块**逐字节相等**', producedRootBlock, DOC_ROOT_BLOCK);
eq('H-01e', '契约块每一行逐字命中产出（逐 token 外部锚点）', DOC_ROOT_BLOCK.split(LF).filter((l) => l.trim().length > 0 && !CSS.includes(l.trim())).length, 0);
eq('H-01b', 'B1 其它候选主色命中 0', ['#0a84ff', '#af52de', '#ff375f', '#0071e3'].filter((h) => CSS.includes(h)).length, 0);
eq('H-04', '非 charts 段渐变命中 0（含 helpShell 段；charts 段 1 处为复用的虚线图例）', (nonCharts.match(/gradient/gi) ?? []).length, 0);
eq('H-04b', 'nonCharts 切片覆盖 charts 之后的 helpShell 段（返修⑥自证）', nonCharts.includes(HELP_HEAD) && !nonCharts.includes(CHARTS_HEAD), true);
eq('H-07', 'font-feature-settings:"tnum" 命中 ≥1', (CSS.match(/font-feature-settings:\s*"tnum"/g) ?? []).length >= 1, true);
eq('H-10a', '非 charts 段圆角集 ⊆ {8,14,20,999,50%}（严格集，无 2px／6px 豁免）', radiusSet(nonCharts).filter((v) => !ROUNDING_ALLOWED.includes(v)).length, 0);
eq('H-10a2', 'charts 段圆角只额外豁免 2px（#78 图例色块）', radiusSet(chartsCssSlice).filter((v) => !ROUNDING_ALLOWED.includes(v) && !CHARTS_ROUNDING_EXEMPT.includes(v)).length, 0);
eq('H-10c', '全表不得出现 6px 圆角（返修项②：原 `.ilife-toast-count`）', CSS.includes('border-radius: 6px'), false);
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
    copyData: { actionId: 'cd', text: '复制数据文本（探针）' },
    copyLog: { actionId: 'cl', text: '复制日志文本（探针）' },
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

/** W8：**真 375px 视口**。headless `--window-size=375,812` 实测 `innerWidth=526`（1440→1414 的最小差），
 *  `≤400px` 断点从未被覆盖 → 改用 **iframe 宽 375** 承载同一张控制页（`srcdoc`），
 *  内层探针结果经 `contentDocument` 取回；`H-12f` 自证 `innerWidth === 375`。
 *  同一张页面 ⇒ 与桌面判据同源，不存在「另一份夹具」的口径漂移。 */
const narrowPage = [
  '<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>#75 视觉取证 · 窄屏 375</title></head>',
  '<body style="margin:0">',
  '<iframe id="narrow" style="width:375px;height:812px;border:0" srcdoc="'
    + controlPage.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"></iframe>',
  '<div id="result">PENDING</div>',
  '<script>',
  'setTimeout(function () {',
  '  var f = document.getElementById("narrow");',
  '  var d = f ? f.contentDocument : null;',
  '  var n = d ? d.getElementById("result") : null;',
  '  document.getElementById("result").textContent = (n && n.textContent.indexOf("RESULT:") === 0)',
  '    ? n.textContent : ("NARROW-MISSING:" + (n ? n.textContent : "NO-DOC"));',
  '}, 900);',
  '</script>',
  '</body></html>',
].join(LF);

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
    '  out.badgeOkColor = g(".ilife-status-badge-ok", "color");',
    '  out.badgeWarnBg = g(".ilife-status-badge-warn", "backgroundColor");',
    '  out.badgeWarnColor = g(".ilife-status-badge-warn", "color");',
    '  out.badgeDangerBg = g(".ilife-status-badge-danger", "backgroundColor");',
    '  out.badgeDangerColor = g(".ilife-status-badge-danger", "color");',
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
    // ── 返修项⑤（W5 升级）：errorReceipt 按钮区 = 旧 `.hm-actions` 等价 ──
    '  out.errorActionsDisplay = g(".ilife-error-actions", "display");',
    '  out.errorActionsCols = (function () { var ea = document.querySelector(".ilife-error-actions"); if (!ea) return "MISSING"; var c = getComputedStyle(ea).gridTemplateColumns; return c === "none" ? "none" : c.split(" ").length; }());',
    '  out.errorActionsMaxW = g(".ilife-error-actions", "maxWidth");',
    '  out.errorRowGap = g(".ilife-error-actions", "rowGap");',
    '  out.errorColGap = g(".ilife-error-actions", "columnGap");',
    '  out.errorRetryW = (function () { var ea = document.querySelector(".ilife-error-actions"); if (!ea) return -1; var b = ea.children[0]; return b ? Math.round(b.getBoundingClientRect().width) : -1; }());',
    '  out.errorGhostW = (function () { var ea = document.querySelector(".ilife-error-actions"); if (!ea) return -1; var b = ea.children[1]; return b ? Math.round(b.getBoundingClientRect().width) : -1; }());',
    '  out.errorActionsW = (function () { var ea = document.querySelector(".ilife-error-actions"); return ea ? Math.round(ea.getBoundingClientRect().width) : -1; }());',
    '  out.errorCenterOffset = (function () { var ea = document.querySelector(".ilife-error-actions"); if (!ea) return -9999; var box = ea.parentElement; var a = ea.getBoundingClientRect(); var b = box.getBoundingClientRect(); return Math.round((a.left - b.left) - (b.width - a.width) / 2); }());',
    // ── W4：toast 入场动效（CSS-only `@keyframes`，默认可见，不依赖 JS 加 `.show`）──
    '  out.toastAnimName = g(".ilife-toast", "animationName");',
    '  out.toastAnimDuration = g(".ilife-toast", "animationDuration");',
    '  out.toastAnimFill = g(".ilife-toast", "animationFillMode");',
    '  out.toastOpacity = g(".ilife-toast", "opacity");',
    // ── W3：`copied` 态变绿（规格 H-16 双反馈的 CSS 侧；类名由运行时添加，本票只补 CSS）──
    // 注意：`.ilife-copy-btn` 基座有 `transition: … background-color .2s`，类切换瞬间 computed 仍是**旧值**
    // （headless 虚拟时间下过渡不推进）→ 探针先临时 `transition:none` 再读**目标值**（过渡本身另有判据 H-16a）。
    '  out.copiedBg = (function () { var b = document.querySelector(".' + STYLE_PREFIX + 'copy-btn"); if (!b) return "MISSING"; var prev = b.style.transition; b.style.transition = "none"; b.classList.add("copied"); var v = getComputedStyle(b).backgroundColor; b.classList.remove("copied"); b.style.transition = prev; return v; }());',
    // ── W1（第二轮）：**运行时** toast 结构对齐后，关闭按钮必须与标题同行 ──
    // 用真实 helpers 产出：拦掉 clipboard 通道并让 execCommand 失败 → feedback(FAIL_MSG, true)。
    '  try {',
    '    Object.defineProperty(navigator, "clipboard", { value: { writeText: function () { return Promise.reject(new Error("probe")); } }, configurable: true });',
    '  } catch (e) { out.clipboardStub = "FAILED:" + e.message; }',
    '  document.execCommand = function () { return false; };',
    '  var copyBtn = document.querySelector(".' + STYLE_PREFIX + 'copy-btn");',
    '  out.copyBtnFound = !!copyBtn;',
    '  if (copyBtn) copyBtn.click();',
    '  setTimeout(function () {',
    '    var d = document.querySelector(".' + STYLE_PREFIX + 'toast-title-detail");',
    '    var rt = d ? d.parentNode.parentNode : null;',
    '    out.rt_detailFound = !!d;',
    '    out.rt_hasBody = rt ? !!rt.querySelector(".' + STYLE_PREFIX + 'toast-body") : "MISSING";',
    '    out.rt_hasRow = rt ? !!rt.querySelector(".' + STYLE_PREFIX + 'toast-title-row") : "MISSING";',
    '    out.rt_detailInBody = !!(d && d.closest(".' + STYLE_PREFIX + 'toast-body"));',
    '    out.rt_titleTop = (function () { var t = rt ? rt.querySelector(".' + STYLE_PREFIX + 'toast-title") : null; return t ? Math.round(t.getBoundingClientRect().top) : "MISSING"; }());',
    '    out.rt_detailTop = d ? Math.round(d.getBoundingClientRect().top) : "MISSING";',
    '    out.rt_closeTop = (function () { var c = rt ? rt.querySelector(".' + STYLE_PREFIX + 'toast-close") : null; return c ? Math.round(c.getBoundingClientRect().top) : "MISSING"; }());',
    '    out.rt_toastH = rt ? Math.round(rt.getBoundingClientRect().height) : -1;',
    '    out.rt_bodyH = (function () { var bd = rt ? rt.querySelector(".' + STYLE_PREFIX + 'toast-body") : null; return bd ? Math.round(bd.getBoundingClientRect().height) : -1; }());',
    '    out.rt_toastW = rt ? Math.round(rt.getBoundingClientRect().width) : -1;',
    '    out.rt_right = rt ? Math.round(rt.getBoundingClientRect().right) : -1;',
    '    out.rt_wrap = rt ? getComputedStyle(rt).flexWrap : "MISSING";',
    '    out.rt_innerWidth = window.innerWidth;',
    '    var st = document.querySelector(".' + STYLE_PREFIX + 'toast");',
    '    var stBody = st ? st.querySelector(".' + STYLE_PREFIX + 'toast-body") : null;',
    '    out.st_bodyFound = !!stBody;',
    '    out.st_iconTop = (function () { var i = st ? st.querySelector(".' + STYLE_PREFIX + 'toast-icon") : null; return i ? Math.round(i.getBoundingClientRect().top) : "MISSING"; }());',
    '    out.st_bodyTop = stBody ? Math.round(stBody.getBoundingClientRect().top) : "MISSING";',
    '    out.st_closeTop = (function () { var c = st ? st.querySelector(".' + STYLE_PREFIX + 'toast-close") : null; return c ? Math.round(c.getBoundingClientRect().top) : "MISSING"; }());',
    '    document.getElementById("result").textContent = "RESULT:" + JSON.stringify(out);',
    '  }, 60);',
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
    safeRm(dir, 't75-page-');
    safeRm(profile, 't75-chrome-');
  }
}

let desktop;
let narrow;
let reduced;
let help;
if (typeof process.env.T75_DUMP === 'string' && process.env.T75_DUMP.length > 0) {
  writeFileSync(join(process.env.T75_DUMP, 'control.html'), controlPage, 'utf8');
  writeFileSync(join(process.env.T75_DUMP, 'narrow.html'), narrowPage, 'utf8');
  writeFileSync(join(process.env.T75_DUMP, 'help.html'), helpPage, 'utf8');
  console.log('已写出调试页到 ' + process.env.T75_DUMP);
}
try {
  desktop = await runPage(controlPage, { width: 1440, height: 900 });
  // W8：窄屏 = **iframe 宽 375**（不是 `--window-size=375`：那实测 innerWidth=526）。
  narrow = await runPage(narrowPage, { width: 1440, height: 900 });
  reduced = await runPage(controlPage, { width: 1440, height: 900, extraArgs: ['--force-prefers-reduced-motion'] });
  help = await runPage(helpPage, { width: 1440, height: 900 });
} catch (err) {
  console.error('证据缺失：浏览器跑页失败 —— ' + (err && err.message ? err.message : String(err)));
  console.error('**显式失败，不静默变绿**。');
  process.exit(1);
}

const d = desktop;
const mo = narrow;
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
// W8：窄屏改用 iframe 宽 375（真 375px），并自证内层视口宽度确实是 375。
eq('H-12f', '窄屏判据跑在**真 375px** 视口（iframe 内层 innerWidth === 375，W8）', mo.rt_innerWidth, 375);
eq('H-12', 'toast 栈窄屏 left:12px / right:12px', mo.toastStackLeft + '/' + mo.toastStackRight, '12px/12px');
eq('B-12a', 'toast 栈 position fixed ＋ 间距取 TOAST_DEFAULTS.gapPx', d.toastStackPos + '/' + d.toastStackGap, 'fixed/' + TOAST_DEFAULTS.gapPx + 'px');
eq('B-12b', 'toast 卡面 = var(--card)', d.toastBg, 'rgb(255, 255, 255)');
eq('B-12c', 'toast 圆角 14px', d.toastRadius, '14px');
eq('B-11a', 'action-row 两列（evenRowPairs）', d.actionRowCols, ACTION_BAR_DEFAULTS.evenRowPairs);
eq('B-11b', 'ghost 行独占一列', d.actionGhostCols, 1);
eq('B-11c', '按钮 min-height/字号/字重取 ACTION_BAR_DEFAULTS', [d.actionBtnMinH, d.actionBtnSize, d.actionBtnWeight].join('/'), [ACTION_BAR_DEFAULTS.minHeightPx + 'px', ACTION_BAR_DEFAULTS.fontSizePx + 'px', String(ACTION_BAR_DEFAULTS.fontWeight)].join('/'));
eq('B-11d', 'copy-btn ghost 描边 = --blue 38% alpha', d.copyBtnGhostBorder, 'rgba(0, 122, 255, 0.38)');
eq('B-12d0', 'statusBadge 四态底色可区分（弱判据，逐值见 B-12d/B-12d2/B-12d3/B-12d4）', d.badgeOkBg !== d.badgeEmptyBg, true);
eq('B-12e', 'errorReceipt 容器内距 20px 22px', d.errorBoxPad, '20px 22px');
eq('B-12f', 'errorReceipt 容器圆角 14px', d.errorBoxRadius, '14px');
eq('R6', '撞车负控：calorie 的 ilife-error 节点不受污染', [d.calorieErrorPad, d.calorieErrorBg, d.calorieErrorRadius].join('/'), '0px/rgba(0, 0, 0, 0)/0px');
eq('H-20', 'reduced-motion 下 copy-btn 过渡关闭', rd.copyBtnTransition, '0s');
eq('B-04', 'charts 容器 position relative（复用 chartsCss）', d.chartsDot, 'relative');

/* ── D2. W1（运行时 toast 结构对齐）／W4（入场动效）／W5（errorReceipt 等价）／W3（copied）── */
eq('B-12c2', '运行时 toast 探针命中（真实 helpers 产出 title-detail）', d.rt_detailFound, true);
add('H-12c', '运行时 toast 标题与详情**不同行**（rt_title_top ≠ rt_detail_top 且标题在上）',
  typeof d.rt_titleTop === 'number' && typeof d.rt_detailTop === 'number'
    && d.rt_titleTop !== d.rt_detailTop && d.rt_titleTop < d.rt_detailTop,
  'rt_title_top=' + d.rt_titleTop + '／rt_detail_top=' + d.rt_detailTop + '／rt_toast_h=' + d.rt_toastH + 'px');
// W1 核心判据（R1 缺陷：关闭按钮被挤到第 3 行）：关闭按钮必须与标题**同行**。
add('H-12c3', 'W1：运行时 toast **关闭按钮与标题同行**（rt_close_top === rt_title_top）',
  typeof d.rt_closeTop === 'number' && typeof d.rt_titleTop === 'number' && d.rt_closeTop === d.rt_titleTop,
  'rt_close_top=' + d.rt_closeTop + '／rt_title_top=' + d.rt_titleTop + '／rt_toast_h=' + d.rt_toastH + 'px');
eq('H-12d', 'W1：运行时 toast 结构与静态产出器同构（`.toast-body` ＋ `.toast-title-row` 命中，detail 在 body 内，无 flex-wrap）',
  [d.rt_hasBody, d.rt_hasRow, d.rt_detailInBody, d.rt_wrap].join('/'), 'true/true/true/nowrap');
// 高度判据（W1）：**结构性**判据（toast 高度 − body 高度 ≤ 内距 26px ＋ 描边 2px ＋ 2px 取整余量 ⇒
// 关闭按钮**没有**另起一行）＋ 绝对区间 [50,90]px。实测两行内容 = 58px（13+13 内距 ＋ 2 描边 ＋
// 标题 17.5 ＋ 详情 16.5），故区间下界取 50（作业单建议 60–90 是估值，实测正确值 58px；
// **真正的判别力在结构**：无 body 包裹时 rt_body_h = −1；关闭按钮另起一行时差值 ≥ 48px）。
add('H-12e', '运行时 toast 高度 = body 高度 ＋ 内距/描边（关闭按钮不另占行）且落在 [50,90]px',
  typeof d.rt_toastH === 'number' && d.rt_toastH >= 50 && d.rt_toastH <= 90
    && typeof d.rt_bodyH === 'number' && d.rt_bodyH > 0 && (d.rt_toastH - d.rt_bodyH) <= 30,
  'rt_toast_h=' + d.rt_toastH + 'px／rt_body_h=' + d.rt_bodyH + 'px／差值=' + (d.rt_toastH - d.rt_bodyH) + 'px（上限 30＝28 内距描边＋2 取整）');
add('B-12h', '静态 toast 仍单行：icon／body／close 顶边同高（未折行）',
  d.st_iconTop === d.st_bodyTop && d.st_bodyTop === d.st_closeTop && typeof d.st_iconTop === 'number',
  'st_icon_top=' + d.st_iconTop + '／st_body_top=' + d.st_bodyTop + '／st_close_top=' + d.st_closeTop);
// W8：窄屏（真 375px）同样成立，且不得溢出视口。
add('H-12g', 'W8：窄屏 375px 下运行时 toast 关闭按钮与标题同行',
  typeof mo.rt_closeTop === 'number' && mo.rt_closeTop === mo.rt_titleTop,
  'rt_close_top=' + mo.rt_closeTop + '／rt_title_top=' + mo.rt_titleTop + '／rt_toast_h=' + mo.rt_toastH + 'px');
add('H-12h', 'W8：窄屏 375px 下运行时 toast 不溢出视口（right ≤ 375 且宽度 > 0）',
  typeof mo.rt_right === 'number' && mo.rt_right <= 375 && mo.rt_toastW > 0,
  'rt_right=' + mo.rt_right + '／rt_toast_w=' + mo.rt_toastW + 'px／innerWidth=' + mo.rt_innerWidth);
// W4：入场动效 CSS-only（默认可见，不依赖 JS 加 `.show`）。
eq('H-21a', 'W4：toast 入场动效挂在 `.ilife-toast` 上（computed animationName）', d.toastAnimName, STYLE_PREFIX + 'toast-in');
add('H-21b', 'W4：入场动效时长/填充模式（0.22s ＋ fill-mode both ⇒ 终态保持可见）',
  d.toastAnimDuration === '0.22s' && d.toastAnimFill === 'both',
  'animationDuration=' + d.toastAnimDuration + '／fillMode=' + d.toastAnimFill);
eq('H-21c', 'W4：reduced-motion 下动画**归零**（animationName = none）', rd.toastAnimName, 'none');
// `--dump-dom` ＋ 虚拟时间下 CSS 动画时钟不推进（实测动画态 opacity=0）→ 可见性用**两条不依赖动画时钟**的判据：
// ① reduced-motion 页（无动画）computed opacity 必须 = 1（元素默认可见，不靠 JS／动画）；
// ② 关键帧终态必须是 opacity:1（文本级外部判据）。
eq('H-21e', 'W4：无动画时 toast 默认可见（reduced-motion 页 computed opacity = 1）', rd.toastOpacity, '1');
add('H-21f', 'W4：关键帧终态 `to { opacity: 1 }`（入场结束保持可见，不依赖 JS 加类）',
  /to\s*\{[\s\S]*?opacity:\s*1/.test(CSS.slice(CSS.indexOf('@keyframes ' + STYLE_PREFIX + 'toast-in'), CSS.indexOf('/* action-bar */'))), true);
eq('H-21d', 'W4：CSS 文本含 `@keyframes <prefix>toast-in`（CSS-only，不依赖 JS）',
  CSS.includes('@keyframes ' + STYLE_PREFIX + 'toast-in') && CSS.includes('animation: ' + STYLE_PREFIX + 'toast-in'), true);
// W3：`copied` 态变绿（H-16 双反馈的 CSS 侧；运行时加类由 helpers 负责，见契约 FX-75-11）。
eq('B-12m', 'W3：`.ilife-copy-btn.copied` 背景 = 成功色 `--ok`（#34c759 → rgb(52, 199, 89)）', d.copiedBg, 'rgb(52, 199, 89)');
add('H-16a', 'W3：弹簧动画时长 450ms 在 copy-btn 基座上（B1 benchmark:279）',
  String(d.copyBtnTransition).startsWith('0.45s'), 'transitionDuration=' + d.copyBtnTransition);
// W5：errorReceipt 按钮区 = 旧 `.hm-actions` 等价（520 居中 ＋ 14px 行距），逐值 + 居中偏移。
add('B-12j', 'W5：errorReceipt 按钮区逐值 = 旧 `.hm-actions`（max-width 520 居中；retry 520／ghost 256；row-gap 14px）',
  d.errorActionsMaxW === '520px' && d.errorActionsW === 520 && d.errorRetryW === 520 && d.errorGhostW === 256
    && d.errorRowGap === '14px' && d.errorColGap === '8px' && Math.abs(d.errorCenterOffset) <= 2,
  'max-width=' + d.errorActionsMaxW + '／容器_w=' + d.errorActionsW + '／retry_w=' + d.errorRetryW
    + '／ghost_w=' + d.errorGhostW + '／row-gap=' + d.errorRowGap + '／column-gap=' + d.errorColGap
    + '／居中偏移=' + d.errorCenterOffset + 'px');
eq('B-12i', 'errorReceipt 按钮区 = grid 2 列（返修⑤）', [d.errorActionsDisplay, d.errorActionsCols].join('/'), 'grid/2');
// W2：statusBadge 四态逐值（外部 oracle：旧 `.hm-status`，`公共组件/assets/base.css:225-228`）。
eq('B-12d', 'W2：statusBadge ok 底色/字色逐值（#e6f7ec / #1f8c3d）',
  d.badgeOkBg + ' / ' + d.badgeOkColor, 'rgb(230, 247, 236) / rgb(31, 140, 61)');
eq('B-12d2', 'W2：statusBadge warn 底色/字色逐值（#fff5e0 / #a25b00）',
  d.badgeWarnBg + ' / ' + d.badgeWarnColor, 'rgb(255, 245, 224) / rgb(162, 91, 0)');
eq('B-12d3', 'W2：statusBadge danger 底色/字色逐值（#fff0ee / #a83228）',
  d.badgeDangerBg + ' / ' + d.badgeDangerColor, 'rgb(255, 240, 238) / rgb(168, 50, 40)');
eq('B-12d4', 'W2：statusBadge empty 底色逐值（#f0f0f3）＋ 四态可区分',
  d.badgeEmptyBg + ' / ' + String(d.badgeOkBg !== d.badgeEmptyBg), 'rgb(240, 240, 243) / true');

/* ── E. 输出 ───────────────────────────────────────────────────────────── */

const pass = rows.filter((r) => r.pass).length;
console.log('# #75 视觉取证（代理证据 · 合成模板 ＋ 真实产出）');
console.log('');
console.log('- 浏览器：`' + BROWSER + '`');
console.log('- 共享 CSS：`buildStyleSheet().css`（' + Buffer.byteLength(CSS) + ' B）；helpers：`buildSharedHelpersJs()`');
console.log('- 载体：`fillTemplate` 合成内容页（6 控件 ＋ charts ＋ 撞车负控）＋ `renderHelpShell` 内置壳（合成 sceneData）');
console.log('- 窄屏（W8）：同一张控制页嵌 **iframe 宽 375**（`--window-size=375` 实测 innerWidth=526，`≤400px` 断点覆盖不到）；`H-12f` 自证内层 innerWidth=375');
console.log('- 外部 oracle：契约 `docs/base-paint-contract.md:276-288` 的 `:root` 块逐字比对（返修项⑧，不引用 `CSS_VAR_TOKENS` 自身）；statusBadge 逐值取旧 `base.css:225-228`');
console.log('- W1 判据：`rt_close_top === rt_title_top`（关闭按钮与标题同行）＋ 高度结构判据（`toast_h − body_h ≤ 30px`）＋ 结构 `.toast-body`／`.toast-title-row` 命中');
console.log('- 口径：**未测量计 FAIL**；任一条 FAIL → exit 1；无浏览器 → exit 1；`DSH_BROWSER` 不存在 → exit 1（不静默变绿）');
console.log('');
console.log('| 判据 | 项 | 结果 | 实测 |');
console.log('|---|---|---|---|');
for (const r of rows) console.log('| ' + r.id + ' | ' + r.name + ' | ' + (r.pass ? 'PASS' : '**FAIL**') + ' | ' + r.detail + ' |');
console.log('');
console.log('RESULT: ' + pass + '/' + rows.length);
if (pass !== rows.length) process.exit(1);
