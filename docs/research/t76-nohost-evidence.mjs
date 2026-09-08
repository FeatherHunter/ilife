// #76 无宿主可执行证据：**自包含 `file://` 页面**（A2 主证据，FX-76-4）。
//
// 复跑：pnpm build && node docs/research/t76-nohost-evidence.mjs
//       pnpm build && node docs/research/t76-nohost-evidence.mjs --out docs/research/t76-nohost-evidence.md
//
// 与仓内 HTTP 夹具的区别（施工单 D4／返修单 FX-76-4）：本脚本产出的页面是
// **双击就能打开的独立 HTML**——只有：① `renderX` 在 Node 侧产出的静态标记（六个控件里的五个）；
// ② `buildSharedHelpersJs()` 产出文本作为**经典 `<script>`**（注入两次，证明幂等；它同时是
// base-paint 交给页面的**页面侧复制运行时**）；③ 一段**经典**探针脚本。
// **零 `import`／零 `type="module"`／零 HTTP 服务／零宿主注入**（静态核验见 §1）。
// 仓内 `packages/base-render/test/controls.test.mjs` 的 HTTP 夹具（可 `import` dist）保留为补充。
//
// 分工（为什么页面里不 import 模块）：ESM 在 `file://` 下被 CORS 挡死，而「双击打开的独立 HTML」
// 正是 A2 要证的形态；模块侧运行时 API（`copyText`／`bindCopyAction`／`createToastController`）
// 的同一份 dist 产物在本脚本 §3 用 Node 侧端口实跑（无需 DOM），页面侧等价路径则由 helpers JS
// 在浏览器里端到端跑通。
//
// 无浏览器时**显式失败并标「证据缺失」**（exit 1，绝不静默变绿；FX-76-3③／FX-76-5）。
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import {
  ACTION_ID_ATTR,
  COPY_ACTION_IDS,
  COPY_TEXT_DEFAULTS,
  DEFAULT_DATA_ATTR,
  STATUS_DEFAULT_TEXT,
  TOAST_DEFAULTS,
  bindCopyAction,
  buildSharedHelpersJs,
  copyText,
  createToastController,
  renderActionBar,
  renderEmptyState,
  renderErrorReceipt,
  renderStatusBadge,
  renderToast,
} from '../../packages/base-render/dist/index.js';

const LF = String.fromCharCode(10);
const execFileAsync = promisify(execFile);
const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const OUT_FILE = outIndex >= 0 ? argv[outIndex + 1] : null;

/* ── 断言收集 ─────────────────────────────────────────────────────────── */

const checks = [];
const check = (ok, name, detail) => { checks.push({ ok: ok === true, name, detail: detail ?? '' }); };
const eq = (actual, expected, name) =>
  check(actual === expected, name, '实测 ' + JSON.stringify(actual) + '，期望 ' + JSON.stringify(expected));

/* ── 浏览器探测（含 macOS；无则显式失败） ──────────────────────────────── */

const CANDIDATES = [
  process.env.DSH_BROWSER,
  ...(typeof process.env.DSH_BROWSER_CANDIDATES === 'string' && process.env.DSH_BROWSER_CANDIDATES !== ''
    ? process.env.DSH_BROWSER_CANDIDATES.split(',').map((s) => s.trim()).filter((s) => s !== '')
    : [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ]),
];
const browser = CANDIDATES.find((p) => typeof p === 'string' && p.length > 0 && existsSync(p));
if (browser === undefined) {
  console.error('证据缺失：未找到 Chrome／Chromium／Edge（候选：' + JSON.stringify(CANDIDATES.filter((c) => typeof c === 'string')) + '）。');
  console.error('本脚本**不跳过**：A2「无宿主可用」要求可执行证据（FX-76-3③／FX-76-5）。请安装浏览器或设 DSH_BROWSER=<路径>。');
  process.exit(1);
}

/* ── 页面组装（Node 侧产出 ＋ 经典脚本） ──────────────────────────────── */

const BAR_HTML = renderActionBar({
  buttons: [{ label: '打开场景', kind: 'primary', actionId: 'ilife-demo-open' }],
  copyData: { actionId: COPY_ACTION_IDS.actionBar.copyData, text: 'DATA-TEXT' },
  copyLog: { actionId: COPY_ACTION_IDS.actionBar.copyLog, text: 'LOG-TEXT' },
});
const BADGE_HTML = renderStatusBadge({ status: 'danger' });
const EMPTY_HTML = renderEmptyState({ icon: '📭', text: '暂无数据', hint: '先添加一条' });
const RECEIPT_HTML = renderErrorReceipt({ message: '渲染失败', dataText: 'R-DATA', logText: 'R-LOG' });
const TOAST_HTML = renderToast({ msg: '已复制', detail: '粘贴给 AI' });
const HELPERS_JS = buildSharedHelpersJs();
const CLICKS = TOAST_DEFAULTS.maxStack + 2;
const CLOSE_LABEL = (TOAST_HTML.match(/toast-close">([^<]*)</) ?? [])[1];

const probe = [
  'var out = {};',
  'var put = function (id, html) { document.getElementById(id).innerHTML = html; };',
  'put("bar", ' + JSON.stringify(BAR_HTML) + ');',
  'put("badge", ' + JSON.stringify(BADGE_HTML) + ');',
  'put("empty", ' + JSON.stringify(EMPTY_HTML) + ');',
  'put("receipt", ' + JSON.stringify(RECEIPT_HTML) + ');',
  'put("toastbox", ' + JSON.stringify(TOAST_HTML) + ');',
  // ① 静态控件在真实 DOM 里成立
  'out.actionIds = [].map.call(document.querySelectorAll("[' + ACTION_ID_ATTR + ']"), function (el) { return el.getAttribute("' + ACTION_ID_ATTR + '"); });',
  'out.dataT = document.querySelector("[' + ACTION_ID_ATTR + '=\\"' + COPY_ACTION_IDS.actionBar.copyData + '\\"]").getAttribute("' + DEFAULT_DATA_ATTR + '");',
  'out.badgeText = document.querySelector(".ilife-status-badge").textContent;',
  'out.emptyText = document.querySelector(".ilife-empty-text").textContent;',
  'out.emptyHint = document.querySelector(".ilife-empty-hint").textContent;',
  'out.receiptButtons = document.querySelectorAll(".ilife-error-actions > button").length;',
  // ② 静态 toast 的无障碍／容量属性
  'var st = document.querySelector("#toastbox > .ilife-toast");',
  'out.staticToastRole = st.getAttribute("role");',
  'out.staticToastAriaLive = st.getAttribute("aria-live");',
  'out.staticToastDataMax = st.getAttribute("data-max");',
  'out.staticToastCloseLabel = st.querySelector(".ilife-toast-close").textContent;',
  // ③ 零内联事件处理器（浏览器侧真读属性）
  'out.inlineAttrs = 0;',
  '[].forEach.call(document.querySelectorAll("*"), function (el) {',
  '  [].forEach.call(el.attributes, function (a) { if (/^on/i.test(a.name)) out.inlineAttrs += 1; });',
  '});',
  // ④ helpers JS：幂等 ＋ 点击出反馈 ＋ 关闭按钮移除
  'out.markerCount = document.querySelectorAll("[data-ilife-helpers=\\"1\\"]").length;',
  'var btn = document.querySelector("[' + ACTION_ID_ATTR + '=\\"' + COPY_ACTION_IDS.actionBar.copyData + '\\"]");',
  'out.clicks = 0;',
  'for (var i = 0; i < ' + CLICKS + '; i++) { btn.click(); out.clicks += 1; }',
  'await new Promise(function (r) { setTimeout(r, 200); });',
  'out.helpersStackCount = document.querySelectorAll(".ilife-toast-stack > .ilife-toast").length;',
  'var first = document.querySelector(".ilife-toast-stack > .ilife-toast");',
  'out.helpersFeedbackText = first ? first.querySelector(".ilife-toast-title").textContent : null;',
  'out.helpersDetailText = first && first.querySelector(".ilife-toast-title-detail") ? first.querySelector(".ilife-toast-title-detail").textContent : null;',
  'out.helpersCloseLabel = first && first.querySelector(".ilife-toast-close") ? first.querySelector(".ilife-toast-close").textContent : null;',
  'var closeBtn = first ? first.querySelector(".ilife-toast-close") : null;',
  'if (closeBtn) closeBtn.click();',
  'out.helpersAfterClose = document.querySelectorAll(".ilife-toast-stack > .ilife-toast").length;',
  // ⑤ 视口
  'out.matchesMobile = window.matchMedia("(max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px)").matches;',
  'out.innerWidth = window.innerWidth;',
  'document.getElementById("result").textContent = "RESULT:" + JSON.stringify(out);',
].join(LF);

const page = [
  '<!doctype html>',
  '<html lang="zh"><head><meta charset="utf-8"><title>#76 无宿主证据（自包含 file:// 页面）</title></head>',
  '<body>',
  '<div id="bar"></div><div id="badge"></div><div id="empty"></div><div id="receipt"></div><div id="toastbox"></div>',
  '<div id="result">PENDING</div>',
  // 页面侧环境桩（与控件实现无关）：headless 无用户手势 → 真实 clipboard 必 NotAllowedError。
  // 固定 reject 使 helpers 的复制路径确定性地走 execCommand 兜底（容量／反馈才是本页观测项）。
  '<script>',
  'Object.defineProperty(navigator, "clipboard", { value: { writeText: function () { return Promise.reject(new Error("probe-stub-denied")); } }, configurable: true });',
  '</script>',
  // helpers JS 第 1 次：**经典 script**（无 type）
  '<script>',
  HELPERS_JS,
  '</script>',
  // helpers JS 第 2 次：同页再注入一次 → 幂等判据只落 DOM
  '<script>',
  HELPERS_JS,
  '</script>',
  // 探针：**经典 script** ＋ 顶层 await（`--virtual-time-budget` 下由 Chrome 直接执行）
  '<script>',
  '(async function () { try {',
  probe,
  '} catch (err) { document.getElementById("result").textContent = "PROBE_ERROR:" + (err && err.stack ? err.stack : String(err)); } }());',
  '</script>',
  '</body></html>',
].join(LF);

/* ── §1 静态自包含核验（不需要浏览器） ───────────────────────────────── */

const markupOnly = page.replace(/<script>[\s\S]*?<\/script>/g, '');
const inlineAttrCount = (markupOnly.match(/\son[a-z]+\s*=/gi) ?? []).length;
const scriptCount = (page.match(/<script>/g) ?? []).length;
const moduleScriptCount = (page.match(/<script[^>]*type\s*=\s*"module"/gi) ?? []).length;
const importCount = (page.match(/\bimport\s*\(|\bimport\s+[\w{*]/g) ?? []).length;
const httpCount = (page.match(/https?:\/\//g) ?? []).length;
const hostGlobalCount = (markupOnly.match(/window\.__|globalThis\./g) ?? []).length;

check(scriptCount === 4, '页面只有 4 个经典 <script>（环境桩 1 ＋ helpers 2 ＋ 探针 1）', '实测 ' + scriptCount);
check(moduleScriptCount === 0, '零 type="module"（经典 script 作用域）', '实测 ' + moduleScriptCount);
check(importCount === 0, '零 import（不依赖任何模块加载器）', '实测 ' + importCount);
check(httpCount === 0, '零 http(s) 引用（可 file:// 直开）', '实测 ' + httpCount);
check(hostGlobalCount === 0, '页面标记零宿主全局注入（window.__／globalThis.）', '实测 ' + hostGlobalCount);
check(inlineAttrCount === 0, '产出标记零内联事件处理器（/\\son[a-z]+\\s*=/gi）', '实测 ' + inlineAttrCount);
check(page.indexOf('base-paint') < 0, '页面不含包名字样（不依赖包解析）', '');
check(HELPERS_JS.indexOf('document.') >= 0, '前置：helpers 产出文本确实含 DOM 读取（否则幂等／反馈断言无鉴别力）', '');

/* ── §2 真跑：file:// 直开，两档视口 ─────────────────────────────────── */

const dir = mkdtempSync(join(tmpdir(), 't76-nohost-'));
const file = join(dir, 'nohost.html');
writeFileSync(file, page, 'utf8');
const url = pathToFileURL(file).href;

const runHeadless = async (windowSize) => {
  const profile = mkdtempSync(join(tmpdir(), 't76-chrome-'));
  try {
    const { stdout } = await execFileAsync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-breakpad',
      '--disable-dev-shm-usage',
      '--user-data-dir=' + profile,
      '--virtual-time-budget=3000',
      '--window-size=' + windowSize,
      '--dump-dom',
      url,
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 32 * 1024 * 1024 });
    const m = stdout.match(/RESULT:(\{[\s\S]*?\})<\/div>/);
    if (m === null) {
      const err = stdout.match(/PROBE_ERROR:([\s\S]*?)<\/div>/);
      throw new Error('页面未产出 RESULT（探针未跑完）'
        + (err === null ? '' : '：' + err[1].slice(0, 600)));
    }
    return { json: m[1], out: JSON.parse(m[1]) };
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
};

const narrowSize = '390,844';
const wideSize = '1200,800';
let narrow;
let wide;
try {
  narrow = await runHeadless(narrowSize);
  wide = await runHeadless(wideSize);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

/* ── §2 回读断言（页面侧） ───────────────────────────────────────────── */

const out = wide.out;
eq(out.actionIds.join(','), [
  'ilife-demo-open',
  COPY_ACTION_IDS.actionBar.copyData,
  COPY_ACTION_IDS.actionBar.copyLog,
  COPY_ACTION_IDS.errorReceipt.copyData,
  COPY_ACTION_IDS.errorReceipt.copyLog,
].join(','), '页面内 ACTION_ID_ATTR 集合与产出逐字一致');
eq(out.dataT, 'DATA-TEXT', '渲染期写入的 data-t 可被页面读回');
eq(out.badgeText, STATUS_DEFAULT_TEXT.danger, 'statusBadge 文本取冻结默认值');
eq(out.emptyText, '暂无数据', 'emptyState 文本落到 DOM');
eq(out.emptyHint, '先添加一条', 'emptyState hint 落到 DOM');
eq(out.receiptButtons, 3, 'errorReceipt 渲染 3 个按钮');
eq(out.staticToastRole, TOAST_DEFAULTS.role, '静态 toast role 取 TOAST_DEFAULTS.role');
eq(out.staticToastAriaLive, TOAST_DEFAULTS.ariaLive, '静态 toast aria-live 取 TOAST_DEFAULTS.ariaLive');
eq(out.staticToastDataMax, String(TOAST_DEFAULTS.maxStack), '静态 toast data-max 取 TOAST_DEFAULTS.maxStack');
eq(out.staticToastCloseLabel, CLOSE_LABEL, '静态 toast 关闭按钮文案与产出逐字一致');
eq(out.inlineAttrs, 0, '真实 DOM 零内联事件处理器属性');
eq(out.markerCount, 1, 'helpers 注入两次只有一个挂载点标记（幂等只落 DOM）');
eq(out.clicks, CLICKS, '前置：点击次数多于宽容量（才能区分收窄）');
eq(out.helpersCloseLabel, CLOSE_LABEL, 'helpers 反馈块的关闭按钮文案与 renderToast 产出一致');
check(out.helpersFeedbackText === COPY_TEXT_DEFAULTS.okMessage || out.helpersFeedbackText === COPY_TEXT_DEFAULTS.failMessage,
  'helpers 反馈文案取冻结文案（ok／fail 二选一，取决于 execCommand 是否可用）',
  '实测 ' + JSON.stringify(out.helpersFeedbackText));
check(out.helpersFeedbackText !== COPY_TEXT_DEFAULTS.failMessage || out.helpersDetailText === COPY_TEXT_DEFAULTS.failDetail,
  '失败反馈必须带冻结的 failDetail', '实测 ' + JSON.stringify(out.helpersDetailText));
eq(out.helpersAfterClose, out.helpersStackCount - 1, '关闭按钮移除一条反馈');

/* ── §2 视口收窄 ─────────────────────────────────────────────────────── */

eq(out.matchesMobile, false, '宽视口：matchMedia(≤' + TOAST_DEFAULTS.mobileMaxPx + 'px) 不命中');
check(out.innerWidth > TOAST_DEFAULTS.mobileMaxPx, '宽视口宽度 > ' + TOAST_DEFAULTS.mobileMaxPx, '实测 ' + out.innerWidth);
eq(out.helpersStackCount, TOAST_DEFAULTS.maxStack, '宽视口：helpers 反馈栈 = maxStack');
eq(narrow.out.matchesMobile, true, '窄视口：matchMedia(≤' + TOAST_DEFAULTS.mobileMaxPx + 'px) 命中');
check(narrow.out.innerWidth <= TOAST_DEFAULTS.mobileMaxPx, '窄视口宽度 ≤ ' + TOAST_DEFAULTS.mobileMaxPx, '实测 ' + narrow.out.innerWidth);
eq(narrow.out.helpersStackCount, TOAST_DEFAULTS.mobileMaxStack, '窄视口：helpers 反馈栈收窄为 mobileMaxStack');
eq(narrow.out.markerCount, 1, '窄视口：helpers 幂等标记唯一');
check(narrow.out.helpersStackCount !== out.helpersStackCount, '宽窄两档容量不同（否则收窄断言恒真）',
  '窄 ' + narrow.out.helpersStackCount + ' / 宽 ' + out.helpersStackCount);

/* ── §3 模块侧运行时（同一 dist 产物，Node 侧纯端口实跑，无 DOM） ────── */

const runtime = {};
{
  const mounted = [];
  const host = { mount: (html) => { const entry = { html, removed: false }; mounted.push(entry); return { remove() { entry.removed = true; } }; } };
  const ports = { clipboard: null, fallback: () => true, toast: host };
  runtime.ok = await copyText('hello', ports);
  runtime.empty = await copyText('', ports);
  runtime.clipboardReject = await copyText('x', {
    clipboard: { writeText: () => Promise.reject(new Error('denied')) }, fallback: () => true, toast: host,
  });
  runtime.fallbackFalse = await copyText('x', { clipboard: null, fallback: () => false, toast: host });
  runtime.fallbackThrew = await copyText('x', { clipboard: null, fallback: () => { throw new Error('boom'); }, toast: host });
  runtime.badgeAlwaysOn = mounted.filter((m) => m.html.indexOf('toast-chip-danger') >= 0).length;

  const subs = [];
  const handlers = new Map();
  const fakeActionHost = {
    listActionIds: () => [COPY_ACTION_IDS.actionBar.copyData, 'ilife-demo-open'],
    readDataText: (id) => (id === COPY_ACTION_IDS.actionBar.copyData ? 'DATA-TEXT' : undefined),
    onActivate: (id, handler) => { subs.push(id); handlers.set(id, handler); return () => handlers.delete(id); },
  };
  const bindCalls = [];
  const bindPorts = { clipboard: null, fallback: (t) => { bindCalls.push(t); return true; }, toast: host };
  const handle = bindCopyAction(fakeActionHost, bindPorts);
  runtime.bindSubscriptions = subs.slice();
  handlers.get(COPY_ACTION_IDS.actionBar.copyData)();
  await new Promise((r) => { setTimeout(r, 10); });
  handlers.get('ilife-demo-open')();
  await new Promise((r) => { setTimeout(r, 10); });
  runtime.bindFallback = bindCalls.slice();
  handle.dispose();
  runtime.bindAfterDispose = handlers.size;

  const stack = [];
  const controller = createToastController({ mount: () => { const h = { removed: false }; stack.push(h); return { remove() { h.removed = true; } }; } });
  controller.show({ msg: 'A' });
  controller.show({ msg: 'B' });
  runtime.stackBefore = stack.length;
  controller.flush();
  runtime.stackAfter = stack.filter((h) => !h.removed).length;
}

eq(runtime.ok.ok + '/' + runtime.ok.channel, 'true/fallback', 'copyText 通道 2 成功');
eq(runtime.empty.ok + '/' + runtime.empty.channel + '/' + runtime.empty.reason, 'false/null/empty', "空串短路 reason='empty'");
eq(runtime.clipboardReject.ok + '/' + runtime.clipboardReject.channel, 'true/fallback', '通道 1 reject → 降级通道 2');
eq(runtime.fallbackFalse.ok + '/' + runtime.fallbackFalse.reason, 'false/fallback-failed', '通道 2 返回假值 → outcome');
eq(runtime.fallbackThrew.ok + '/' + runtime.fallbackThrew.reason, 'false/fallback-threw', "通道 2 抛错 → outcome（FX-76-1）");
eq(runtime.badgeAlwaysOn, 2, '两条失败（返回假值 ＋ 抛错）都挂了失败徽章');
eq(runtime.bindSubscriptions.join(','), COPY_ACTION_IDS.actionBar.copyData + ',ilife-demo-open', 'bindCopyAction 订阅 listActionIds() 全部 id');
eq(runtime.bindFallback.join(','), 'DATA-TEXT', 'bindCopyAction：只复制有 data-t 的按钮');
eq(runtime.bindAfterDispose, 0, 'dispose 解绑全部');
eq(runtime.stackBefore, 2, 'createToastController 两条已挂载');
eq(runtime.stackAfter, 0, 'flush 清栈');

/* ── §4 报告 ─────────────────────────────────────────────────────────── */

const lines = [];
const line = (s) => lines.push(s === undefined ? '' : s);
const failed = checks.filter((c) => !c.ok);

line('# #76 无宿主可执行证据（自包含 `file://` 页面）');
line();
line('> 本文由 `docs/research/t76-nohost-evidence.mjs` 生成（可复跑、无时间戳）。**A2 的主证据**（FX-76-4）；仓内 HTTP 夹具为补充。');
line('> `pnpm build && node docs/research/t76-nohost-evidence.mjs --out docs/research/t76-nohost-evidence.md`');
line('> 复跑后（同机同浏览器）`git diff` 应为空；换机器时**浏览器路径**与**`innerWidth`**两处会不同（环境属性，非结论）。');
line();
line('## 0. 结论');
line();
line('| 指标 | 值 |');
line('|---|---|');
line('| 断言总数 | ' + checks.length + ' |');
line('| 通过 | ' + (checks.length - failed.length) + ' |');
line('| 失败 | ' + failed.length + ' |');
line('| 浏览器 | `' + browser + '` |');
line('| 打开方式 | `file://` 直开，**零 HTTP 服务**（页面写在 OS 临时目录） |');
line('| 页面构成 | ' + scriptCount + ' 个经典 `<script>`（环境桩 1 ＋ helpers ×2 ＋ 探针 1）／零 `import`／零 `type="module"`／零宿主注入 |');
line();
line('## 1. 页面自包含性（静态核验，不需要浏览器）');
line();
line('| 核验项 | 实测 |');
line('|---|---|');
line('| `<script>` 个数（应为 4） | ' + scriptCount + ' |');
line('| `type="module"` 个数（应为 0） | ' + moduleScriptCount + ' |');
line('| `import` 出现次数（应为 0） | ' + importCount + ' |');
line('| `http(s)://` 出现次数（应为 0） | ' + httpCount + ' |');
line('| 宿主全局注入 `window.__`／`globalThis.`（应为 0） | ' + hostGlobalCount + ' |');
line('| 标记内联事件处理器 `/\\son[a-z]+\\s*=/gi`（应为 0） | ' + inlineAttrCount + ' |');
line();
line('## 2. `file://` 直开回读（headless，宽视口 `--window-size=' + wideSize + '`）');
line();
line('```json');
line(wide.json);
line('```');
line();
line('窄视口 `--window-size=' + narrowSize + '`：');
line();
line('```json');
line(narrow.json);
line('```');
line();
line('## 3. 视口收窄（同一页面、同一份产出，只改视口）');
line();
line('| 视口 | `--window-size` | `innerWidth` | `matchMedia(≤' + TOAST_DEFAULTS.mobileMaxPx + 'px)` | 反馈栈条数 |');
line('|---|---|---|---|---|');
line('| 窄（手机） | `' + narrowSize + '` | ' + narrow.out.innerWidth + ' | ' + narrow.out.matchesMobile + ' | **' + narrow.out.helpersStackCount + '** |');
line('| 宽（桌面） | `' + wideSize + '` | ' + out.innerWidth + ' | ' + out.matchesMobile + ' | **' + out.helpersStackCount + '** |');
line();
line('冻结常量：`TOAST_DEFAULTS.maxStack = ' + TOAST_DEFAULTS.maxStack + '`／`mobileMaxStack = ' + TOAST_DEFAULTS.mobileMaxStack + '`／`mobileMaxPx = ' + TOAST_DEFAULTS.mobileMaxPx + '`。');
line('**口径（FX-76-2 总架构师裁定）**：「≤' + TOAST_DEFAULTS.mobileMaxPx + 'px 收窄为 ' + TOAST_DEFAULTS.mobileMaxStack + '」是**页面运行时行为**，不是模块行为——');
line('`createToastController` 保持宿主无关（AC-7 不变），收窄由 helpers JS 产出文本读 `matchMedia` 承担。');
line();
line('## 4. 模块侧运行时（同一 dist 产物，Node 侧纯端口，无 DOM）');
line();
line('```json');
line(JSON.stringify(runtime));
line('```');
line();
line('## 5. 断言逐条');
line();
line('| # | 断言 | 结论 | 说明 |');
line('|---|---|---|---|');
checks.forEach((c, i) => {
  line('| ' + (i + 1) + ' | ' + c.name + ' | ' + (c.ok ? '**过**' : '**不过**') + ' | ' + c.detail + ' |');
});
line();
line('## 6. 与仓内 HTTP 夹具的关系');
line();
line("- 仓内 `packages/base-render/test/controls.test.mjs` 的夹具用临时 HTTP 源 ＋ `import * as bp from '/index.js'`；");
line('  本页**零 import／零服务**，是「双击打开的独立 HTML」——两者互补：前者进 `pnpm test` 门禁，后者作 A2 主证据。');
line('- 为什么页面里不 `import` 模块：ESM 在 `file://` 下被 CORS 挡死，而 A2 要证的正是「双击打开的独立 HTML」形态。');
line('  页面侧的复制运行时**就是** base-paint 交给页面的 `buildSharedHelpersJs()` 产出（经典 script），本页把它端到端跑通；');
line('  模块侧 API（`copyText`／`bindCopyAction`／`createToastController`）在 §4 用同一份 dist 产物实跑。');
line('- 本页的剪贴板为**页面侧固定 reject 桩**（headless 无用户手势，真实 `writeText` 必 `NotAllowedError`）→ 复制路径确定性走');
line('  `execCommand` 兜底；**真实剪贴板成功路径**与 `writeText` promise 偶发不 settle 属已知限制（见契约 §8.9 台账）。');

const report = lines.join(LF) + LF;
if (OUT_FILE !== null) {
  writeFileSync(OUT_FILE, report, 'utf8');
  console.log('已写出 ' + OUT_FILE + '（断言 ' + checks.length + '／失败 ' + failed.length + '）');
} else {
  console.log(report);
}
for (const c of failed) console.error('不过：' + c.name + ' — ' + c.detail);
process.exit(failed.length === 0 ? 0 : 1);
