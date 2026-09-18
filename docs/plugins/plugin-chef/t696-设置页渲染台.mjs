#!/usr/bin/env node
/**
 * 票 #696 设置页渲染台：把四家插件 `dist/client.js` 里的**真设置页组件**渲出来，
 * 量「点得到、改得动、存得进」，并出整页 HTML 供截图与逐页打分。
 *
 * 为什么要它：本仓没有 react-dom／jsdom（包内 devDeps 只有 react），所以这里做四件事——
 *   ① 用 stub loader 物化真产物（跟 `test/client-bundle-48.test.mjs` 同套 classic 执行）；
 *   ② 调 `apply(ctx)` 把注册进 `ilife.config-tab` 的组件**捕获**出来，不手抄 JSX；
 *   ③ 页内用一份够用的 hooks 替身把组件跑起来，并**真调**输入框的 `onChange` 与
 *      「保存」「重置为默认」按钮的 `onClick`——所以「改得动、存得进」是**量出来的**，不是看代码推的；
 *   ④ 出两态页（默认收起／高级展开）× 两宽（360／720），供 vision 逐页打分。
 *
 * 假答复只答配置面的三个端点（`config.get`／`config.save`／`config.reset`）；取值用**技能侧
 * `*_CONFIG_DEFAULTS` 的真实默认值**（从 `packages/skill-&lt;件名&gt;/dist/config.js` 读），不是手写的。
 *
 * 边界（不许含糊）：本台替代不了**真机**——它不过 DSH 的槽位渲染、不跑 React 自己的调和与事件系统。
 * 它量的是：行数与分级、默认收起、容器无横向溢出、三个按钮在位、改一项后保存把值送进
 * `config.save` 载荷、点重置送出 `config.reset`。真机三连读数在 `docs/plugins/plugin-chef/t696-读数.mjs`。
 *
 * 用法：
 *   node docs/plugins/plugin-chef/t696-设置页渲染台.mjs                 # 出页（默认四家 × 两态 × 两宽）
 *   node docs/plugins/plugin-chef/t696-设置页渲染台.mjs --check          # 自检门：跑无头 Chrome 收 VERDICT，全绿 exit 0
 *   node docs/plugins/plugin-chef/t696-设置页渲染台.mjs --panels plugin-chef
 * 产物：<out>/<件名>-<default|expanded>-<宽>.html
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const CHECK = argv.includes('--check');
const OUT = resolve(argOf('--out', join(REPO, '.scratch', 't696')));
const WIDTHS = argOf('--widths', '360,720').split(',').map((n) => Number(n.trim()));
/** 产物路径可换（负向对照用：拿一份改坏的 client 产物跑，必须变红）。空串＝用各包自己的 dist。 */
const BUNDLE_OVERRIDE = argOf('--bundle', '');

/** 四家：件名 → 技能包 / 页签槽 / 配置主体名 / 页面禁语（干活入口的典型词）。 */
const PANELS = [
  { pkg: 'plugin-chef', skill: 'skill-chef', slot: 'ilife:chef', stem: 'chef', workWords: ['搜菜', '记录做菜', '买菜清单'] },
  { pkg: 'plugin-home-ilife', skill: 'skill-home', slot: 'ilife:home', stem: 'home', workWords: ['查物品', '录物品', '查快递'] },
  { pkg: 'plugin-memo-ilife', skill: 'skill-memo-ilife', slot: 'ilife:memo', stem: 'memo', workWords: ['记一条', '心愿排期', '飞书同步'] },
  { pkg: 'plugin-schedule-ilife', skill: 'skill-schedule', slot: 'ilife:schedule', stem: 'schedule', workWords: ['今天总结', '查日程', '复盘'] },
];
const only = argOf('--panels', '');
const SELECTED = only === '' ? PANELS : PANELS.filter((p) => only.split(',').map((s) => s.trim()).includes(p.pkg));

/* ── 页内脚本：stub loader → hooks 替身 → 元素树渲成 DOM → 真调 onChange／onClick → 量尺与判据 ── */
const PAGE_SCRIPT = `
/* ① hooks 替身：顺序 hook store ＋ 依赖比对（只够跑这些组件，不假装是 React） */
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

/* ② 假答复：只答配置面三个端点，抄下每次调用（「改得动、存得进」的读数从这里来） */
const CALLS = [];
const SURFACE = window.__T696_SURFACE__;
function fakeCall(channel, endpoint, body) {
  const method = body && body.method;
  CALLS.push({ endpoint, method, payload: body ? body.payload : null, channel });
  if (method === 'config.reset') return Promise.resolve({ ok: true, value: { path: SURFACE.path, backupPath: SURFACE.path + '.bak' } });
  return Promise.resolve({ ok: true, value: SURFACE });
}
window.__T696_CALLS__ = CALLS;

/* ③ 物化真产物 → 捕获页签组件 */
const registrations = window.__T696_REGS__ || [];
const reg = registrations[0];
const factoryExports = reg.factory((spec) => { if (spec === 'react') return React; throw new Error('渲染台不提供外部模块：' + spec); });
let Section = null;
factoryExports.apply({
  slots: {
    inject: (_k, cb) => cb(),
    register: (_o, component) => { Section = component; return () => {}; },
    entries: () => [], getVersion: () => 0, subscribe: () => () => {},
  },
  connection: { rpc: { call: fakeCall } },
  effect: (cb) => cb(),
});

const props = { getCall: () => fakeCall };

/* ④ 元素树 → HTML（React 的 DOM 语义子集：style 对象、属性改名、空标签自闭合） */
const VOID_TAGS = new Set(['input', 'br', 'hr', 'img']);
const UNITLESS = new Set(['fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'opacity', 'zIndex', 'order']);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const styleToCss = (style) => Object.entries(style)
  .filter(([, v]) => v !== null && v !== undefined && v !== '')
  .map(([k, v]) => kebab(k) + ':' + (typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : String(v))).join(';');
function render(node) {
  if (node === null || node === undefined || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (Array.isArray(node)) return node.map(render).join('');
  const { type, props: p } = node;
  if (typeof type === 'function') return render(type({ ...p }));
  if (type === React.Fragment) return render(p.children);
  if (typeof type !== 'string') return '';
  const attrs = [];
  if (p.style && typeof p.style === 'object') attrs.push('style="' + esc(styleToCss(p.style)) + '"');
  for (const [k, v] of Object.entries(p)) {
    if (k === 'children' || k === 'style' || k === 'key' || k === 'ref') continue;
    if (v === null || v === undefined || v === false || typeof v === 'function') continue;
    if (v === true) { attrs.push(k.toLowerCase()); continue; }
    attrs.push(k.toLowerCase() + '="' + esc(v) + '"');
  }
  const open = '<' + type + (attrs.length ? ' ' + attrs.join(' ') : '');
  if (VOID_TAGS.has(type)) return open + ' />';
  return open + '>' + render(p.children) + '</' + type + '>';
}

/* ⑤ 树遍历小工具（找按钮与输入框的 props，用来真调它们的回调） */
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, visit)); return; }
  const { type, props: p } = node;
  if (typeof type === 'function') { visit(node); walk(type({ ...p }), visit); return; }
  visit(node);
  if (p) walk(p.children, visit);
}
const textOf = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node.type === 'function') return textOf(node.type({ ...node.props }));
  return textOf(node.props ? node.props.children : '');
};

const panel = document.getElementById('panel');
const renderNow = (expand) => {
  hookCursor = 0;
  const tree = Section(props);
  panel.innerHTML = render(tree);
  if (expand) { const d = panel.querySelector('details'); if (d) d.setAttribute('open', ''); }
  return tree;
};
function settle() { let g = 0; while (pendingUpdates > 0 && g++ < 30) { pendingUpdates = 0; renderNow(window.__T696_EXPAND__); } }
function treeNow() { hookCursor = 0; return Section(props); }

/* ⑥ 启动：渲一遍（触发挂载期取数）→ 让 promise 落定 → 再量 */
renderNow(window.__T696_EXPAND__);
setTimeout(() => {
  settle();
  renderNow(window.__T696_EXPAND__);
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }; };
  const inputs = Array.from(panel.querySelectorAll('input'));
  const buttons = Array.from(panel.querySelectorAll('button'));
  const details = panel.querySelector('details');
  const container = { clientWidth: panel.clientWidth, scrollWidth: panel.scrollWidth, overflowX: panel.scrollWidth - panel.clientWidth };

  /* 改得动：真调第一个输入框的 onChange；存得进：真调「保存」按钮的 onClick */
  let tree = treeNow();
  const textInputs = []; const btnNodes = [];
  walk(tree, (node) => {
    const t = node.type;
    if (t === 'input' && node.props && node.props.type !== 'checkbox' && typeof node.props.onChange === 'function') textInputs.push(node);
    if (t === 'button' && node.props && typeof node.props.onClick === 'function') btnNodes.push({ node, text: textOf(node) });
  });
  const KEY = window.__T696_EDIT_KEY__;
  const PROBE = '渲染台探针值';
  const editable = textInputs.length ? textInputs[0] : null;
  if (editable) editable.props.onChange({ target: { value: PROBE } });
  settle();
  /* 改完必须**重新取一遍树**再点按钮：按钮的 onClick 是那次渲染的闭包，
     拿改前的闭包去点，存下去的还是改前的草稿（这条踩过）。 */
  const fresh = treeNow();
  const freshButtons = [];
  walk(fresh, (node) => { if (node.type === 'button' && node.props && typeof node.props.onClick === 'function') freshButtons.push({ node, text: textOf(node) }); });
  const saveBtn = freshButtons.find((b) => b.text.indexOf('保存') >= 0);
  const resetBtn = freshButtons.find((b) => b.text.indexOf('重置为默认') >= 0);
  if (saveBtn) saveBtn.node.props.onClick();
  let resetSeen = false;

  setTimeout(() => {
    settle();
    renderNow(window.__T696_EXPAND__);
    if (resetBtn) { resetBtn.node.props.onClick(); }
    setTimeout(() => {
      settle();
      renderNow(window.__T696_EXPAND__);
      const calls = window.__T696_CALLS__ || [];
      const saveCall = calls.filter((c) => c.method === 'config.save').pop() || null;
      const savedKeys = saveCall && saveCall.payload && saveCall.payload.values
        ? Object.keys(saveCall.payload.values)
        : [];
      const savedLeaf = (() => {
        if (!saveCall || !saveCall.payload || !saveCall.payload.values) return null;
        const parts = String(KEY || '').split('.');
        let cur = saveCall.payload.values;
        for (const part of parts) { if (cur == null || typeof cur !== 'object') return null; cur = cur[part]; }
        return cur === undefined ? null : cur;
      })();
      resetSeen = calls.some((c) => c.method === 'config.reset');
      const bodyText = panel.textContent || '';
      const pageButtons = Array.from(panel.querySelectorAll('button')).map((b) => b.textContent.trim());
      /** 「只配置，不干活」那句脚注会**提到**功能页的名字（如「搜菜与做菜在技能功能页」）——
          那是说明文字，不是入口。判据只扫脚注之前的那段正文与按钮标签。 */
      const disclaimerAt = bodyText.indexOf('只配置');
      const scanned = disclaimerAt >= 0 ? bodyText.slice(0, disclaimerAt) : bodyText;

      const checks = {
        rowsRendered: inputs.length === window.__T696_ITEM_COUNT__,
        commonAboveDetails: Array.from(panel.querySelectorAll('input')).filter((el) => !el.closest('details')).length === window.__T696_COMMON_COUNT__,
        advancedCollapsedByDefault: window.__T696_EXPAND__ ? true : (details !== null && details.querySelectorAll('input').length > 0 && !details.hasAttribute('open')),
        noOverflowX: container.overflowX <= 0,
        /* 三枚按钮**逐字相等**（子串匹配在这里是假绿：标签被改一个字也照样 substring 命中——
           2026-09-18 的负向对照实测过这一条）。 */
        threeButtons: ['保存', '重置为默认', '重新读取'].every((t) => pageButtons.includes(t)),
        showsConfigPath: bodyText.indexOf(window.__T696_SURFACE__.path) >= 0,
        showsDataDir: bodyText.indexOf(window.__T696_SURFACE__.dataDir) >= 0,
        editedAndSaved: savedLeaf === PROBE,
        resetDispatched: resetSeen,
        noWorkEntry: window.__T696_WORK_WORDS__.every((w) => scanned.indexOf(w) < 0) && pageButtons.every((b) => window.__T696_WORK_WORDS__.every((w) => b.indexOf(w) < 0)),
        titleSaysConfig: bodyText.indexOf('配置') >= 0,
      };
      const failed = Object.entries(checks).filter(([, ok]) => ok === false).map(([k]) => k);
      const out = {
        panel: window.__T696_PKG__, width: window.__T696_WIDTH__, expand: window.__T696_EXPAND__,
        container, inputs: inputs.length, buttons: pageButtons,
        editedKey: KEY, savedLeaf, savedKeys, calls: calls.map((c) => c.method),
        checks,
      };
      document.getElementById('probe').textContent = 'T696-READINGS ' + JSON.stringify(out)
        + ' T696-VERDICT ' + (failed.length === 0 ? 'PASS' : 'FAIL:' + failed.join(','));
    }, 30);
  }, 30);
}, 30);
`;

const page = (meta, W, expand, surface, itemCount, commonCount, bundle) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>票 #696 ${meta.pkg} 设置页渲染台 · 内容宽 ${W}px · ${expand ? '高级展开' : '默认收起'}</title>
<style>
  html,body{margin:0;padding:0;background:#f2f2f4;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
  .wrap{display:flex;gap:20px;align-items:flex-start;padding:16px}
  #panel{width:${W}px;flex:0 0 auto;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px;box-sizing:border-box;overflow:hidden}
  #probe{flex:1 1 auto;margin:0;font:11px/1.5 ui-monospace,Consolas,Menlo,monospace;white-space:pre-wrap;word-break:break-all;color:#3a3a3c;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:12px;max-width:620px}
</style></head><body>
<div class="wrap">
  <div id="panel"></div>
  <pre id="probe">T696-READINGS …</pre>
</div>
<script>
window.__T696_REGS__ = [];
window.__ModuleLoader__ = { load: (reg) => window.__T696_REGS__.push(reg) };
window.__T696_SURFACE__ = ${JSON.stringify(surface)};
window.__T696_ITEM_COUNT__ = ${itemCount};
window.__T696_COMMON_COUNT__ = ${commonCount};
window.__T696_PKG__ = ${JSON.stringify(meta.pkg)};
window.__T696_WIDTH__ = ${W};
window.__T696_EXPAND__ = ${expand ? 'true' : 'false'};
window.__T696_EDIT_KEY__ = ${JSON.stringify(surface.editKey)};
window.__T696_WORK_WORDS__ = ${JSON.stringify(meta.workWords)};
</script>
<script>${bundle}</script>
<script>try {
${PAGE_SCRIPT}
} catch (err) { document.getElementById('probe').textContent = 'T696-ERROR ' + (err && err.message) + ' STACK ' + (err && err.stack); }</script>
</body></html>`;

/** 取技能侧那份真实默认值表（权威侧），拼一份假答复。 */
async function surfaceFor(meta) {
  const skillConfig = await import('file://' + join(REPO, 'packages', meta.skill, 'dist', 'config.js').replace(/\\/g, '/'));
  const defaultsKey = Object.keys(skillConfig).find((k) => k.endsWith('_CONFIG_DEFAULTS'));
  if (!defaultsKey) throw new Error('技能 ' + meta.skill + ' 的 dist/config.js 里没有 *_CONFIG_DEFAULTS');
  const settings = await import('file://' + join(REPO, 'packages', meta.pkg, 'dist', 'settings.js').replace(/\\/g, '/'));
  const firstCommon = settings.CONFIG_ITEMS[0];
  return {
    surface: {
      path: 'C:\\Users\\探针\\.ilife\\' + meta.stem + '.yaml',
      dataDir: 'C:\\Users\\探针\\.ilife\\data',
      created: false,
      values: skillConfig[defaultsKey],
      editKey: firstCommon.key,
    },
    itemCount: settings.CONFIG_ITEMS.length,
    commonCount: settings.COMMON_ITEM_COUNT,
  };
}

mkdirSync(OUT, { recursive: true });
const pages = [];
for (const meta of SELECTED) {
  const bundle = readFileSync(BUNDLE_OVERRIDE === '' ? join(REPO, 'packages', meta.pkg, 'dist', 'client.js') : resolve(BUNDLE_OVERRIDE), 'utf8');
  const info = await surfaceFor(meta);
  for (const W of WIDTHS) {
    for (const expand of [false, true]) {
      const file = join(OUT, `${meta.pkg}-${expand ? 'expanded' : 'default'}-${W}.html`);
      writeFileSync(file, page(meta, W, expand, info.surface, info.itemCount, info.commonCount, bundle), 'utf8');
      pages.push({ file, meta, W, expand });
    }
  }
  console.log(`PAGE ${meta.pkg} 行数=${info.itemCount} 常用=${info.commonCount} 宽=${WIDTHS.join('/')}`);
}

if (!CHECK) {
  console.log('PAGES ' + pages.length + '（要看读数：chrome --headless=new --dump-dom "file:///<上面某页的绝对路径>"）');
  process.exit(0);
}

if (!existsSync(CHROME)) {
  console.error('FAIL: 找不到 Chrome：' + CHROME);
  process.exit(1);
}
let bad = 0;
for (const p of pages) {
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=5000', '--dump-dom', 'file:///' + p.file.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const pre = dom.match(/<pre id="probe">([\s\S]*?)<\/pre>/);
  const text = pre ? pre[1] : '';
  if (/^\s*T696-ERROR/.test(text)) { console.error('FAIL: ' + p.file + ' 页内脚本报错 → ' + text.trim().slice(0, 300)); bad += 1; continue; }
  const m = text.match(/T696-VERDICT ([^\s<]+)/);
  const r = text.match(/T696-READINGS (\{[\s\S]*\}) T696-VERDICT/);
  if (!m) { console.error('FAIL: ' + p.file + ' 没打判据（页内脚本没跑起来）'); bad += 1; continue; }
  const summary = r ? JSON.parse(r[1]) : null;
  const line = summary ? ` 行=${summary.inputs} overflowX=${summary.container.overflowX} 调用=${JSON.stringify(summary.calls)} 改='${summary.editedKey}'→${JSON.stringify(summary.savedLeaf)}` : '';
  if (m[1] === 'PASS') console.log('PASS ' + p.file.replace(/.*[\\/]/, '') + line);
  else { console.error('FAIL ' + p.file.replace(/.*[\\/]/, '') + ' ' + m[1] + line); bad += 1; }
}
console.log(bad === 0 ? '设置页渲染台自检：' + pages.length + ' 页全绿（exit 0）' : '设置页渲染台自检：' + bad + ' 页红（exit 1）');
process.exit(bad === 0 ? 0 : 1);
