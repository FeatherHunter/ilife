#!/usr/bin/env node
/**
 * 票 #679 面板渲染台：把 dist/client.js 里的**真组件**渲成静态 HTML，量两宽下的版式。
 *
 * 为什么要它：本仓没有 react-dom／jsdom（包内 devDeps 只有 react），所以这里做两件事——
 *   ① 用 stub loader 物化真产物（跟 test/client-bundle-48.test.mjs 同一套 classic 执行），
 *      调 apply(ctx) 把注册进 settings.section 的组件**捕获**出来，不手抄 JSX；
 *   ② 用一份够用的 hooks 替身把组件跑一遍，把元素树序列化成 HTML，塞进"设置弹窗内容区"
 *      （一个定宽容器）里——版式只取决于 DOM ＋ 内联样式，所以静态 HTML 的版式与真机一致。
 *
 * 边界（必须写进证据，不许含糊）：本台替代不了**真机**——它不过 DSH 的槽位渲染、不点链接、
 * 不跑 React 的事件系统。它量的是版式：标题会不会被挤出容器、两个入口折行后落在哪、
 * 底部卡在不在最后、容器有没有横向溢出。
 *
 * 用法：node docs/plugins/plugin-manager/t679-面板渲染台.mjs [--out <目录>] [--widths 360,720]
 * 产物：<目录>/panel-<宽>.html（每宽一页，页内自带读数块）＋ <目录>/panel-body.html（序列化出来的面板本身）。
 * 读数取法（无头 Chrome 跑页内量尺）：
 *   chrome --headless=new --disable-gpu --dump-dom "file:///<绝对路径>/panel-360.html"
 *   输出里找 `T679-READINGS ` 那一行；出错会打 `T679-ERROR `。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const CLIENT = join(REPO, 'packages', 'plugin-manager', 'dist', 'client.js');

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const OUT = resolve(argOf('--out', join(REPO, '.scratch', 't679')));
const WIDTHS = argOf('--widths', '360,720').split(',').map((n) => Number(n.trim()));

/* ── ① 物化真产物，捕获组件（classic 执行 ＋ stub loader，同 client-bundle-48 回路） ── */
const code = readFileSync(CLIENT, 'utf8');
const registrations = [];
const sandbox = { window: { __ModuleLoader__: { load: (reg) => registrations.push(reg) } } };
vm.createContext(sandbox);
new vm.Script(code, { filename: CLIENT }).runInContext(sandbox, { timeout: 5000 });
if (registrations.length !== 1) throw new Error('产物注册次数异常：' + registrations.length);

/* ── hooks 替身（只够跑这个组件：createElement／useId／useRef／useState／useEffect） ── */
let idSeq = 0;
const React = {
  createElement(type, props, ...children) {
    const p = { ...(props ?? {}) };
    if (children.length === 1) p.children = children[0];
    else if (children.length > 1) p.children = children;
    return { type, props: p };
  },
  Fragment: Symbol('Fragment'),
  useId: () => 'r' + (idSeq += 1),
  useRef: (init) => ({ current: init === undefined ? null : init }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
};
const requireShim = (spec) => {
  if (spec === 'react') return React;
  throw new Error('渲染台不提供这个外部模块：' + spec);
};
const externals = [];
const factoryExports = registrations[0].factory((spec) => {
  externals.push(String(spec));
  return requireShim(spec);
});

let Section = null;
const ctxStub = {
  slots: {
    inject: (_key, cb) => cb(),
    register: (_options, component) => {
      Section = component;
      return () => {};
    },
    entries: () => [],
    getVersion: () => 0,
    subscribe: () => () => {},
  },
  effect: (cb) => cb(),
};
factoryExports.apply(ctxStub);
if (typeof Section !== 'function') throw new Error('apply 没有把 section 组件注册进来');

/* ── ② 元素树 → HTML（React 的 DOM 语义子集：style 对象、属性改名、void 标签） ── */
const VOID_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'use', 'br', 'hr', 'img', 'input']);
const UNITLESS = new Set(['fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'opacity', 'zIndex', 'order', 'gridColumn', 'gridRow', 'fontWeightAdjust']);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
function styleToCss(style) {
  return Object.entries(style)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => kebab(k) + ':' + (typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : String(v)))
    .join(';');
}
function attrName(k, inSvg) {
  if (k === 'className') return 'class';
  if (k === 'htmlFor') return 'for';
  if (k === 'tabIndex') return 'tabindex';
  if (k.startsWith('aria-') || k.startsWith('data-') || k === 'role') return k;
  if (inSvg) {
    // SVG 是外来内容，属性名大小写敏感：React 把 camelCase 映射成连字符形，
    // viewBox／preserveAspectRatio 两个例外保持原样。
    if (k === 'viewBox' || k === 'preserveAspectRatio') return k;
    return k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  }
  return k.toLowerCase();
}
function render(node, inSvg = false) {
  if (node === null || node === undefined || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (Array.isArray(node)) return node.map((child) => render(child, inSvg)).join('');
  const { type, props } = node;
  if (typeof type === 'function') return render(type({ ...props }), inSvg);
  if (type === React.Fragment) return render(props.children, inSvg);
  if (typeof type !== 'string') return ''; // 不认识的东西不静默吞：见下面的自检
  const svg = inSvg || type === 'svg';
  const attrs = [];
  if (props.style && typeof props.style === 'object') attrs.push(`style="${esc(styleToCss(props.style))}"`);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'children' || k === 'style' || k === 'key' || k === 'ref') continue;
    if (v === null || v === undefined || v === false || typeof v === 'function') continue;
    if (v === true) { attrs.push(attrName(k, svg)); continue; }
    attrs.push(`${attrName(k, svg)}="${esc(v)}"`);
  }
  const open = '<' + type + (attrs.length ? ' ' + attrs.join(' ') : '');
  // 自闭合只给真·空元素与 SVG 图形元素；`<div/>` 在 HTML 里不是自闭合，写错会吃兄弟节点。
  if (VOID_TAGS.has(type)) return open + ' />';
  return open + '>' + render(props.children, svg) + '</' + type + '>';
}

/** 渲染态：useTabs 回空表＝六家全缺席（空 profile 的样子），renderSlot 不参与（没有已装单品）。 */
const tree = Section({ useTabs: (selector) => selector([]), renderSlot: () => null });
const body = render(tree);

/** 自检：序列化必须真的产出内容，且四个仓库都在，否则别拿它当证据。 */
const MUST_HAVE = ['作者其他插件', '爱生活', 'dsh-mattpocock-skills-deck', 'dsh-opencode-palette', 'dsh-prompt', 'dsh-im-companion', 'github.com/FeatherHunter/ilife'];
for (const needle of MUST_HAVE) {
  if (!body.includes(needle)) throw new Error('渲染自检不过：产出里没有 ' + needle);
}

/** 页内量尺：容器 ＝ 设置弹窗内容区（定宽），量标题／入口／卡片的盒子。 */
const PROBE = `
const out = { };
const panel = document.getElementById('panel');
const root = panel.firstElementChild;   // section 根（LifePackSection 的返回）
const pr = panel.getBoundingClientRect();
out.container = { left: pr.left, right: pr.right, width: pr.width, clientWidth: panel.clientWidth, scrollWidth: panel.scrollWidth, overflowX: panel.scrollWidth - panel.clientWidth };
const box = (el) => { const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }; };
const inside = (b) => b.width > 0 && b.height > 0 && b.left >= pr.left - 0.5 && b.right <= pr.right + 0.5;
const title = Array.from(root.querySelectorAll('div')).find((d) => d.textContent.trim() === '爱生活' && d.children.length === 0);
out.title = { text: title ? title.textContent : null, box: title ? box(title) : null, inside: title ? inside(box(title)) : false };
const head = root.firstElementChild;
const actions = Array.from(head.querySelectorAll('a[href]'));
out.actions = actions.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), title: a.getAttribute('title'), ariaLabel: a.getAttribute('aria-label'), inside: inside(box(a)), box: box(a) }));
out.actionsSameLineAsTitle = actions.length > 0 && title ? Math.abs(actions[0].getBoundingClientRect().top - title.getBoundingClientRect().top) < 12 : null;
out.actionsBelowTitle = actions.length > 0 && title ? actions[0].getBoundingClientRect().top >= title.getBoundingClientRect().bottom - 1 : null;
const card = root.lastElementChild;
const cardTitle = card ? card.firstElementChild : null;
out.card = {
  heading: cardTitle ? cardTitle.textContent : null,
  box: card ? box(card) : null,
  inside: card ? inside(box(card)) : false,
  rows: card ? Array.from(card.querySelectorAll('a[href]')).map((a) => ({ href: a.getAttribute('href'), pkg: a.firstElementChild ? a.firstElementChild.textContent : null, desc: a.children[1] ? a.children[1].textContent : null, icon: !!a.querySelector('svg') })) : [],
};
out.sectionChildCount = root ? root.children.length : -1;
out.cardIsLast = !!card && card === root.lastElementChild;
out.tabBar = root.querySelectorAll('[role="tab"]').length;
out.linkCount = root.querySelectorAll('a[href]').length;
out.allInside = out.title.inside && out.actions.every((a) => a.inside) && out.card.inside && out.container.overflowX <= 1;
document.getElementById('probe').textContent = 'T679-READINGS ' + JSON.stringify(out);
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'panel-body.html'), body, 'utf8');

const pages = [];
for (const W of WIDTHS) {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>票 #679 面板渲染台 · 内容宽 ${W}px</title>
<style>
  html,body{margin:0;padding:0;background:#f2f2f4;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
  .wrap{display:flex;gap:20px;align-items:flex-start;padding:16px}
  #panel{width:${W}px;flex:0 0 auto;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px;box-sizing:border-box;overflow:hidden}
  #probe{flex:1 1 auto;margin:0;font:11px/1.5 ui-monospace,Consolas,Menlo,monospace;white-space:pre-wrap;word-break:break-all;color:#3a3a3c;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:12px;max-width:${W < 500 ? 420 : 620}px}
</style></head><body>
<div class="wrap">
  <div id="panel">${body}</div>
  <pre id="probe">T679-READINGS …</pre>
</div>
<script>try {
${PROBE}
} catch (err) { const c = document.getElementById('panel').lastElementChild; document.getElementById('probe').textContent = 'T679-ERROR ' + (err && err.message) + ' CARD ' + (c ? c.outerHTML.slice(0, 400) : 'none') + ' KIDS ' + (c ? c.children.length : -1) + ' A0 ' + (c && c.querySelector('a[href]') ? c.querySelector('a[href]').children.length : -2); }</script>
</body></html>`;
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `panel-${W}.html`);
  writeFileSync(file, html, 'utf8');
  pages.push(file);
  console.log('PAGE ' + file + ' （容器内容宽 ' + W + 'px）');
}
console.log('EXTERNALS ' + JSON.stringify(externals));
console.log('PAGES ' + pages.length);
