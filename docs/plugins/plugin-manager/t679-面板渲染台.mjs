#!/usr/bin/env node
/**
 * 票 #679 面板渲染台：把 `dist/client.js` 里的**真组件**渲出来，量两宽版式，并**逐个页签切换**验结构。
 *
 * 为什么要它：本仓没有 react-dom／jsdom（包内 devDeps 只有 react），所以这里做三件事——
 *   ① 用 stub loader 物化真产物（跟 `test/client-bundle-48.test.mjs` 同一套 classic 执行）；
 *   ② 调 `apply(ctx)` 把注册进 `settings.section` 的组件**捕获**出来，不手抄 JSX；
 *   ③ 页内用一份够用的 hooks 替身把组件跑起来，逐个点六个页签（真的调它的 `onClick`），
 *      每次切换后重新渲成 DOM、量盒子——所以「六页签切换它都在」是**量出来的**，不是看代码推的。
 *
 * 边界（必须写进证据，不许含糊）：本台替代不了**真机**——它不过 DSH 的槽位渲染、不点链接、
 * 不跑 React 自己的调和与事件系统。它量的是版式与结构：标题会不会被挤出容器、两件折行后落在哪、
 * 卡片在不在最后、六个页签下卡片是否都在、悬停说明在不在、容器有没有横向溢出。
 *
 * 用法：
 *   node docs/plugins/plugin-manager/t679-面板渲染台.mjs                  # 出三页（140／360／720），供截图
 *   node docs/plugins/plugin-manager/t679-面板渲染台.mjs --widths 360,720  # 只出这两宽
 *   node docs/plugins/plugin-manager/t679-面板渲染台.mjs --check           # 自检门：跑 Chrome 量两宽，全绿 exit 0
 * 产物：<目录>/panel-<宽>.html（每宽一页，页内自带读数与判据）＋ <目录>/panel-body.html。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const CLIENT = join(REPO, 'packages', 'plugin-manager', 'dist', 'client.js');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const CHECK = argv.includes('--check');
const OUT = resolve(argOf('--out', join(REPO, '.scratch', 't679')));
/** 产物路径可换（自检的反例用：拿一份改坏的副本跑，必须变红）。 */
const BUNDLE_PATH = resolve(argOf('--bundle', CLIENT));
/** 验收两宽＝设置弹窗内容宽；140 只是机制页（远窄于任何真实弹窗），不进自检。 */
const ACCEPT_WIDTHS = argOf('--widths', CHECK ? '360,720' : '140,360,720')
  .split(',')
  .map((n) => Number(n.trim()));

const bundle = readFileSync(BUNDLE_PATH, 'utf8');

/* ── 页内脚本：stub loader → hooks 替身 → 元素树渲成 DOM → 逐个页签切换 → 量尺与判据 ── */
const PAGE_SCRIPT = `
/* ① hooks 替身：顺序 hook store ＋ 依赖比对（只够跑这个组件，不假装是 React） */
let hookStore = []; let hookCursor = 0; let pendingUpdates = 0;
const React = {
  createElement(type, props, ...children) {
    const p = { ...(props ?? {}) };
    if (children.length === 1) p.children = children[0];
    else if (children.length > 1) p.children = children;
    return { type, props: p };
  },
  Fragment: Symbol('Fragment'),
  useId: () => 'r1',
  useRef(init) { const i = hookCursor++; if (!(i in hookStore)) hookStore[i] = { current: init === undefined ? null : init }; return hookStore[i]; },
  useState(init) {
    const i = hookCursor++;
    if (!(i in hookStore)) hookStore[i] = typeof init === 'function' ? init() : init;
    const current = hookStore[i];
    return [current, (next) => { const value = typeof next === 'function' ? next(hookStore[i]) : next; if (value !== hookStore[i]) { hookStore[i] = value; pendingUpdates += 1; } }];
  },
  useEffect(fn, deps) {
    const i = hookCursor++;
    const before = hookStore[i];
    const changed = !before || !deps || before.deps.length !== deps.length || deps.some((d, k) => d !== before.deps[k]);
    hookStore[i] = { deps: deps || null };
    if (changed && !before) { try { fn(); } catch (e) {} }
  },
  useCallback: (fn) => fn,
};

/* ② 物化真产物 → 捕获 settings.section 的组件（loader stub 在本页最前面那段 script 里已挂好） */
const registrations = window.__T679_REGS__ || [];
const reg = registrations[0];
const factoryExports = reg.factory((spec) => { if (spec === 'react') return React; throw new Error('渲染台不提供外部模块：' + spec); });
let Section = null;
factoryExports.apply({
  slots: {
    inject: (_k, cb) => cb(),
    register: (_o, component) => { Section = component; return () => {}; },
    entries: () => [], getVersion: () => 0, subscribe: () => () => {},
  },
  effect: (cb) => cb(),
});
const props = { useTabs: (selector) => selector([]), renderSlot: () => null, getCall: () => null };

/* ③ 渲染一遍（含状态落定），拿到元素树 */
function pass() { hookCursor = 0; return Section(props); }
let guard = 0;
while (pendingUpdates > 0 && guard++ < 20) { pendingUpdates = 0; pass(); }

/* ④ 元素树 → HTML（React 的 DOM 语义子集：style 对象、属性改名、空标签自闭合） */
const VOID_TAGS = new Set(['path','rect','circle','ellipse','line','polyline','polygon','use','br','hr','img','input']);
const UNITLESS = new Set(['fontWeight','lineHeight','flex','flexGrow','flexShrink','flexBasis','opacity','zIndex','order']);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const styleToCss = (style) => Object.entries(style)
  .filter(([, v]) => v !== null && v !== undefined && v !== '')
  .map(([k, v]) => kebab(k) + ':' + (typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : String(v))).join(';');
function attrName(k, inSvg) {
  if (k === 'className') return 'class';
  if (k === 'tabIndex') return 'tabindex';
  if (k.startsWith('aria-') || k.startsWith('data-') || k === 'role') return k;
  if (inSvg) { if (k === 'viewBox' || k === 'preserveAspectRatio') return k; return k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()); }
  return k.toLowerCase();
}
function render(node, inSvg) {
  if (node === null || node === undefined || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (Array.isArray(node)) return node.map((c) => render(c, inSvg)).join('');
  const { type, props: p } = node;
  if (typeof type === 'function') return render(type({ ...p }), inSvg);
  if (type === React.Fragment) return render(p.children, inSvg);
  if (typeof type !== 'string') return '';
  const svg = inSvg || type === 'svg';
  const attrs = [];
  if (p.style && typeof p.style === 'object') attrs.push('style="' + esc(styleToCss(p.style)) + '"');
  for (const [k, v] of Object.entries(p)) {
    if (k === 'children' || k === 'style' || k === 'key' || k === 'ref') continue;
    if (v === null || v === undefined || v === false || typeof v === 'function') continue;
    if (v === true) { attrs.push(attrName(k, svg)); continue; }
    attrs.push(attrName(k, svg) + '="' + esc(v) + '"');
  }
  const open = '<' + type + (attrs.length ? ' ' + attrs.join(' ') : '');
  if (VOID_TAGS.has(type)) return open + ' />';
  return open + '>' + render(p.children, svg) + '</' + type + '>';
}

/* ⑤ 量尺 */
const panel = document.getElementById('panel');
const box = (el) => { const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }; };
function measure(tag) {
  const pr = panel.getBoundingClientRect();
  const inside = (b) => b.width > 0 && b.height > 0 && b.left >= pr.left - 0.5 && b.right <= pr.right + 0.5;
  const root = panel.firstElementChild;
  const head = root.firstElementChild;
  const headGroup = head.lastElementChild;
  const title = Array.from(root.querySelectorAll('div')).find((d) => d.textContent.trim() === '爱生活' && d.children.length === 0);
  const card = root.lastElementChild;
  const rows = card ? Array.from(card.querySelectorAll('a[href]')) : [];
  const links = Array.from(head.querySelectorAll('a[href]'));
  return {
    tag,
    container: { width: pr.width, clientWidth: panel.clientWidth, scrollWidth: panel.scrollWidth, overflowX: panel.scrollWidth - panel.clientWidth },
    title: { text: title ? title.textContent : null, box: title ? box(title) : null, inside: title ? inside(box(title)) : false },
    headItems: Array.from(headGroup.children).map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 24), inside: inside(box(el)), box: box(el) })),
    links: links.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), tip: a.getAttribute('title'), ariaLabel: a.getAttribute('aria-label'), inside: inside(box(a)), box: box(a) })),
    card: {
      heading: card && card.firstElementChild ? card.firstElementChild.textContent : null,
      isLast: !!card && card === root.lastElementChild,
      inside: card ? inside(box(card)) : false,
      box: card ? box(card) : null,
      rowCount: rows.length,
      rowsOK: rows.length === 4 && rows.every((a) => !!a.firstElementChild && !!a.children[1] && !!a.querySelector('svg')),
      rows: rows.map((a) => ({ href: a.getAttribute('href'), pkg: a.firstElementChild ? a.firstElementChild.textContent : null, desc: a.children[1] ? a.children[1].textContent : null })),
    },
    tabBar: root.querySelectorAll('[role="tab"]').length,
    linkCount: root.querySelectorAll('a[href]').length,
    sameLineAsTitle: links.length > 0 && title ? Math.abs(links[0].getBoundingClientRect().top - title.getBoundingClientRect().top) < 12 : null,
  };
}

/* ⑥ 六个页签逐个切换：找到页签按钮（穿过函数组件层），真调它的 onClick，再落定状态、重渲、重量 */
const tabButtons = [];
(function collect(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(collect); return; }
  const { type, props: p } = node;
  // 注册进来的可能是包一层的函数组件——穿过去，别停在函数边界上（停在边界上就一个页签也找不到）。
  if (typeof type === 'function') { collect(type({ ...p })); return; }
  if (type === React.Fragment) { collect(p && p.children); return; }
  if (type === 'button' && p && p.role === 'tab') tabButtons.push(node);
  if (p) collect(p.children);
})(pass());

const renderNow = () => { panel.innerHTML = render(pass()); };
const states = [];
renderNow();
states.push(measure('初始'));
for (let i = 0; i < tabButtons.length; i += 1) {
  try { tabButtons[i].props.onClick(); } catch (err) { states.push({ tag: 'tab' + i, clickError: String(err && err.message) }); continue; }
  let g = 0; while (pendingUpdates > 0 && g++ < 20) { pendingUpdates = 0; pass(); }
  renderNow();
  states.push(measure('tab' + i));
}

/* ⑦ 判据（每宽一页自己判；--check 由外层跑 Chrome 收 VERDICT） */
const checks = {
  titleInside: states.every((s) => s.title && s.title.inside),
  headItemsInside: states.every((s) => (s.headItems || []).every((h) => h.inside)),
  linksInside: states.every((s) => (s.links || []).every((l) => l.inside)),
  linksHaveHoverText: states.every((s) => (s.links || []).length === 2 && s.links.every((l) => (l.tip || '').length > 0 && (l.ariaLabel || '').length > 0 && l.target === '_blank')),
  cardLastAndWhole: states.every((s) => s.card && s.card.isLast && s.card.inside && s.card.heading === '作者其他插件' && s.card.rowCount === 4 && s.card.rowsOK),
  cardSurvivesAllTabs: states.length === 7 && states.every((s) => s.card && s.card.rowCount === 4 && s.card.heading === '作者其他插件'),
  tabBarSix: states.every((s) => s.tabBar === 6),
};
const verdictOf = (s) => ({ tag: s.tag, titleInside: s.title && s.title.inside, cardInside: s.card && s.card.inside, rowCount: s.card ? s.card.rowCount : -1, overflowX: s.container ? s.container.overflowX : null });
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
const out = {
  container: { clientWidth: panel.clientWidth, overflowX: states[0].container.overflowX },
  checks, states: states.map(verdictOf), tabsClicked: tabButtons.length,
  detail: { first: states[0], last: states[states.length - 1] },
};
document.getElementById('probe').textContent = 'T679-READINGS ' + JSON.stringify(out)
  + ' T679-VERDICT ' + (failed.length === 0 ? 'PASS' : 'FAIL:' + failed.join(','));
`;

const page = (W) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>票 #679 面板渲染台 · 内容宽 ${W}px</title>
<style>
  html,body{margin:0;padding:0;background:#f2f2f4;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
  .wrap{display:flex;gap:20px;align-items:flex-start;padding:16px}
  #panel{width:${W}px;flex:0 0 auto;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px;box-sizing:border-box;overflow:hidden}
  #probe{flex:1 1 auto;margin:0;font:11px/1.5 ui-monospace,Consolas,Menlo,monospace;white-space:pre-wrap;word-break:break-all;color:#3a3a3c;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:12px;max-width:${W < 500 ? 430 : 640}px}
</style></head><body>
<div class="wrap">
  <div id="panel"></div>
  <pre id="probe">T679-READINGS …</pre>
</div>
<script>window.__T679_REGS__ = []; window.__ModuleLoader__ = { load: (reg) => window.__T679_REGS__.push(reg) };</script>
<script>${bundle}</script>
<script>try {
${PAGE_SCRIPT}
} catch (err) { document.getElementById('probe').textContent = 'T679-ERROR ' + (err && err.message) + ' STACK ' + (err && err.stack); }</script>
</body></html>`;

mkdirSync(OUT, { recursive: true });
const pages = [];
for (const W of ACCEPT_WIDTHS) {
  const file = join(OUT, `panel-${W}.html`);
  writeFileSync(file, page(W), 'utf8');
  pages.push(file);
  console.log('PAGE ' + file + ' （容器内容宽 ' + W + 'px）');
}

if (!CHECK) {
  console.log('PAGES ' + pages.length + '（要看读数：chrome --headless=new --dump-dom "file:///<上面某页的绝对路径>"）');
  process.exit(0);
}

/* ── 自检门：跑无头 Chrome，收每页的 VERDICT ── */
if (!existsSync(CHROME)) {
  console.error('FAIL: 找不到 Chrome：' + CHROME);
  process.exit(1);
}
let bad = 0;
for (const file of pages) {
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=4000', '--dump-dom', 'file:///' + file.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  // 只认 <pre id="probe"> 里的那两行——页面里还嵌着本脚本的源码，直接全文匹配会匹到源码上。
  const pre = dom.match(/<pre id="probe">([\s\S]*?)<\/pre>/);
  const text = pre ? pre[1] : '';
  if (/^T679-ERROR/.test(text.trim())) { console.error('FAIL: ' + file + ' 页内脚本报错 → ' + text.trim().slice(0, 300)); bad += 1; continue; }
  const m = text.match(/T679-VERDICT ([^\s<]+)/);
  const r = text.match(/T679-READINGS (\{[\s\S]*\}) T679-VERDICT/);
  if (!m) { console.error('FAIL: ' + file + ' 没打判据（页内脚本没跑起来）'); bad += 1; continue; }
  const summary = r ? JSON.parse(r[1]) : null;
  const line = summary ? '  checks=' + JSON.stringify(summary.checks) + ' tabs=' + summary.tabsClicked + ' overflowX=' + summary.container.overflowX : '';
  if (m[1] === 'PASS') console.log('PASS ' + file.replace(/.*[\\/]/, '') + line);
  else { console.error('FAIL ' + file.replace(/.*[\\/]/, '') + ' ' + m[1] + line); bad += 1; }
}
console.log(bad === 0 ? '渲染台自检：' + pages.length + ' 宽全绿（exit 0）' : '渲染台自检：' + bad + ' 宽红（exit 1）');
process.exit(bad === 0 ? 0 : 1);
