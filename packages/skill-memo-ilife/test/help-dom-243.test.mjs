/** #243 · 备忘录 HELP 渲染后 DOM 回归锁（#228 载荷锁的下一层）。
 *
 * 为什么需要这一层（票面论点）：
 *  `help-file-228.test.mjs` 的 15 条是载荷级断言（数 JSON 键与计数）。
 *  把模板侧读的键名换掉（例如 `st.title` 换成别的）⇒ 页面步骤文案全空，
 *  而 15 条仍全绿——它们看的是载荷，不是页面。其中「步骤文案命中整页 HTML」
 *  是恒真断言（载荷 JSON 本身嵌在整页 HTML 里，在 HTML 里搜到＝在载荷段里搜到，
 *  不能证明已渲染；#243 已将其改名，语义不动，渲染证明只认本文件）。
 *
 * 本文件走仓内现成路①：`packages/skill-schedule/test/help-file-202.test.mjs:126`
 *  的手写 DOM 桩（轻，无浏览器依赖；与 #230 真 spawn 取向一致）。
 *  不装 jsdom（仓内没有，也不为一个用例引依赖）：只实现模板运行时真正用到的面。
 *  保真三点（删任一条即假绿换假红，别删）：
 *   ① `innerHTML` 赋值即建树；② `<script>` 原样文本标签（载荷从产物自己读）；
 *   ③ `dataset` 写回属性。
 *
 * 覆盖票面四条（数 DOM 节点，不是数载荷）：
 *   ① 8 域／13 二级组／30 场景卡 DOM 数；② 初始化 6 步骤卡 title/desc 逐条在 DOM；
 *   ③ 可见正文 7 类词全 0；④ 带 editable_fields 的卡出现对应数量 input。
 *
 * 跑法（只构建本包，禁仓根 `tsc -b`，见 #241）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json
 *   node --test packages/skill-memo-ilife/test/help-dom-243.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  buildMemoHelpFileData, renderMemoHelpHtml,
} from '../dist/help/helpFile.js';
import { MEMO_HELP_GROUPS } from '../dist/help/sceneData.js';

const NOW = new Date(2026, 8, 12, 13, 30);
const DATA = buildMemoHelpFileData(NOW, {});
const HTML = renderMemoHelpHtml(DATA);
const DATA_OPEN = '<script id="help-data" type="application/json">';
/* 变异自证开关（仅 #243 证据用，不进判据）：`T243_MUTATE=1` 时把运行时读键
 * `st.title`／`st.desc` 换成不存在的键，模拟“模板键名换掉”。载荷段不变，
 * 故 #228 载荷锁仍绿，唯本文件 DOM 锁红——正是票面论点。正常跑不设此变量。 */
const HTML_FOR_TEST = process.env.T243_MUTATE === '1'
  ? HTML.replaceAll('st.title', 'st.__bad_title__').replaceAll('st.desc', 'st.__bad_desc__')
  : HTML;

/* ── 派生计数（一律从资产算，不写第二个数；绝对值 8/13/30 另起断言锁死） ── */
const SUBGROUPS = MEMO_HELP_GROUPS.flatMap((g) => g.subgroups);
const SCENES = MEMO_HELP_GROUPS.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const DERIVED = {
  groups: MEMO_HELP_GROUPS.length,
  subgroups: SUBGROUPS.length,
  scenes: SCENES.length,
};

/** 模板运行时那套转义（`help-template.html` 页面侧 `esc` 逐字等价）。 */
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 用户真看到的文本：运行时 DOM 的可见文本（实体已还原；`<script>`／`<style>` 不算可见）。 */
function visibleText(root) {
  return collectText(root);
}

/** 从 `el` 往上冒泡派发事件（浏览器语义）：卡片点击委托在 `screen` 上。 */
function dispatchBubbling(el, type) {
  let stopped = false;
  const event = { target: el, preventDefault() {}, stopPropagation() { stopped = true; } };
  for (let node = el; node && !stopped; node = node.tree.parent) node.dispatch(type, event);
}

/* ══ 最小 DOM 桩（与 skill-schedule#202 同形，备忘录 HELP 同一共享模板） ══ */

const SIMPLE_SEL = /^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)((?:\[[^\]]*\])*)((?::not\([^)]*\))*)$/;

function parseSimple(sel) {
  const m = SIMPLE_SEL.exec(sel.trim());
  if (!m) return null;
  const idM = /#([\w-]+)/.exec(m[2]);
  const cls = (m[2].match(/\.[\w-]+/g) ?? []).map((s) => s.slice(1));
  const attrs = (m[3].match(/\[[^\]]*\]/g) ?? []).map((raw) => {
    const body = raw.slice(1, -1);
    const op = ['*=', '^=', '$=', '=', '!='].find((o) => body.includes(o));
    if (!op) return { name: body.trim(), op: null, value: null };
    const [name, ...rest] = body.split(op);
    return { name: name.trim(), op, value: rest.join(op).replace(/^["']|["']$/g, '') };
  });
  const nots = (m[4].match(/:not\([^)]*\)/g) ?? []).map((s) => s.slice(5, -1));
  return { tag: m[1] ?? null, id: idM ? idM[1] : null, cls, attrs, nots };
}

function attrMatches(el, spec) {
  const has = el.hasAttribute(spec.name);
  if (spec.op === null) return has;
  const actual = has ? el.getAttribute(spec.name) : '';
  if (spec.op === '=') return actual === spec.value;
  if (spec.op === '!=') return actual !== spec.value;
  if (spec.op === '*=') return actual.includes(spec.value);
  if (spec.op === '^=') return actual.startsWith(spec.value);
  if (spec.op === '$=') return actual.endsWith(spec.value);
  return false;
}

function matchesSimple(el, spec) {
  if (spec === null || (el.tag.startsWith('#') && el.tag !== '#document')) return false;
  if (spec.tag !== null && el.tag !== spec.tag.toLowerCase()) return false;
  if (spec.id !== null && el.attrs.id !== spec.id) return false;
  if (!spec.cls.every((c) => el.classList.contains(c))) return false;
  if (!spec.attrs.every((a) => attrMatches(el, a))) return false;
  if (!spec.nots.every((s) => !matchesSimple(el, parseSimple(s)))) return false;
  return true;
}

function matchesSelector(el, sel) {
  const parts = sel.trim().split(/\s+/).filter(Boolean);
  if (!matchesSimple(el, parseSimple(parts[parts.length - 1]))) return false;
  let node = el.tree.parent;
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    const spec = parseSimple(parts[i]);
    let hit = false;
    while (node) {
      if (matchesSimple(node, spec)) { hit = true; node = node.tree.parent; break; }
      node = node.tree.parent;
    }
    if (!hit) return false;
  }
  return true;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea']);
let REV = 0;

function parseMarkup(src) {
  const nodes = [];
  const stack = [];
  const text = String(src);
  let i = 0;
  const push = (node) => {
    const parent = stack[stack.length - 1];
    if (!parent) { nodes.push(node); return; }
    if (node.tag === '#text') node._textRaw = node._textRaw ?? '';
    node.tree.parent = parent;
    node._connected = true;
    const sibs = parent.tree.kid;
    const prev = sibs[sibs.length - 1];
    if (prev) { prev.tree.next = node; node.tree.prev = prev; }
    sibs.push(node);
  };
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const endC = text.indexOf('-->', i + 4);
      const stop = endC < 0 ? text.length : endC + 3;
      const c = createNode('#comment', {}, { text: text.slice(i, stop) });
      c._textRaw = text.slice(i, stop);
      push(c);
      i = stop;
      continue;
    }
    if (text[i] === '<') {
      const close = /^<\/([a-zA-Z][\w-]*)\s*>/.exec(text.slice(i));
      if (close) {
        const want = close[1].toLowerCase();
        for (let d = stack.length - 1; d >= 0; d -= 1) {
          if (stack[d].tag === want) { stack.length = d; break; }
        }
        i += close[0].length;
        continue;
      }
      const open = /^<([a-zA-Z][\w-]*)((?:\s[^<>]*?)?)\s*(\/?)>/.exec(text.slice(i));
      if (open) {
        const tag = open[1].toLowerCase();
        const attrs = parseAttrs(open[2]);
        const selfClosed = open[3] === '/' || VOID_TAGS.has(tag);
        if (RAW_TEXT_TAGS.has(tag)) {
          const at = text.toLowerCase().indexOf('</' + tag, i + open[0].length);
          const inner = text.slice(i + open[0].length, at < 0 ? text.length : at);
          const node = createNode(tag, attrs, { rawHtml: inner });
          push(node);
          if (at < 0) { i = text.length; continue; }
          const tail = text.slice(at + 2 + tag.length);
          const gt = tail.indexOf('>');
          i = at + 2 + tag.length + (gt < 0 ? tail.length : gt + 1);
          continue;
        }
        const node = createNode(tag, attrs);
        push(node);
        i += open[0].length;
        if (!selfClosed) stack.push(node);
        continue;
      }
      const next = text.indexOf('<', i + 1);
      const stop = next < 0 ? text.length : next;
      push(createNode('#text', {}, { text: text.slice(i, stop) }));
      i = stop;
      continue;
    }
    const next = text.indexOf('<', i);
    const stop = next < 0 ? text.length : next;
    push(createNode('#text', {}, { text: text.slice(i, stop) }));
    i = stop;
  }
  return nodes;
}

function parseAttrs(raw) {
  const attrs = {};
  for (const m of raw.matchAll(/([\w-]+)(?:\s*=\s*"([^"]*)")?/g)) attrs[m[1]] = m[2] ?? '';
  return attrs;
}

function datasetProxy(el) {
  const attrOf = (k) => 'data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const keyOf = (a) => a.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return new Proxy({}, {
    get: (_, k) => (typeof k === 'string' && el.hasAttribute(attrOf(k)) ? el.attrs[attrOf(k)] : undefined),
    set: (_, k, v) => {
      if (typeof k === 'string') { el.attrs[attrOf(k)] = String(v); REV += 1; }
      return true;
    },
    has: (_, k) => typeof k === 'string' && el.hasAttribute(attrOf(k)),
    deleteProperty: (_, k) => {
      if (typeof k === 'string') { delete el.attrs[attrOf(k)]; REV += 1; }
      return true;
    },
    ownKeys: () => Object.keys(el.attrs).filter((a) => a.startsWith('data-')).map(keyOf),
    getOwnPropertyDescriptor: (_, k) => (typeof k === 'string' && el.hasAttribute(attrOf(k))
      ? { value: el.attrs[attrOf(k)], enumerable: true, configurable: true, writable: true }
      : undefined),
  });
}

function createNode(tag, attrs = {}, opts = {}) {
  const tree = { parent: null, kid: [], prev: null, next: null };
  let datasetCache = null;
  const state = {
    text: opts.text ?? '',
    textRaw: null,
    rawHtml: opts.rawHtml ?? null,
    fullHtml: null,
    parsed: false,
  };
  const el = {
    tag, attrs, tree, style: {}, listeners: [], _connected: opts.connected === true,
    _textRaw: opts.text ?? '',
    get id() { return this.attrs.id ?? ''; },
    get dataset() { return (datasetCache ??= datasetProxy(el)); },
    get className() { return this.attrs.class ?? ''; },
    classList: {
      add(...cs) {
        const set = new Set((el.attrs.class ?? '').split(/\s+/).filter(Boolean));
        cs.forEach((c) => set.add(c));
        el.attrs.class = [...set].join(' ');
        REV += 1;
      },
      contains(c) { return (el.attrs.class ?? '').split(/\s+/).includes(c); },
      toggle(c, force) {
        const on = force === undefined ? !el.classList.contains(c) : force === true;
        const set = new Set((el.attrs.class ?? '').split(/\s+/).filter(Boolean));
        if (on) set.add(c); else set.delete(c);
        el.attrs.class = [...set].join(' ');
        REV += 1;
        return on;
      },
    },
    hasAttribute(n) { return Object.prototype.hasOwnProperty.call(el.attrs, n); },
    getAttribute(n) { return el.hasAttribute(n) ? el.attrs[n] : null; },
    setAttribute(n, v) { el.attrs[n] = String(v); REV += 1; },
    removeAttribute(n) { delete el.attrs[n]; REV += 1; },
    addEventListener(type, fn) { el.listeners.push({ type, fn }); },
    removeEventListener() {},
    dispatch(type, event = {}) {
      const hit = el.listeners.filter((l) => l.type === type);
      hit.forEach((l) => l.fn({ target: el, preventDefault() {}, stopPropagation() {}, ...event }));
      return hit.length;
    },
    querySelectorAll(sel) { return subtree(el).filter((n) => matchesSelector(n, sel)); },
    querySelector(sel) { return el.querySelectorAll(sel)[0] ?? null; },
    closest(sel) {
      let n = el;
      while (n) { if (matchesSelector(n, sel)) return n; n = n.tree.parent; }
      return null;
    },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
    get children() { return el.tree.kid.filter((k) => !k.tag.startsWith('#')); },
    get childNodes() { return el.tree.kid; },
    appendChild(child) {
      child.tree.parent = el;
      child._connected = true;
      const sibs = el.tree.kid;
      const prev = sibs[sibs.length - 1];
      if (prev) { prev.tree.next = child; child.tree.prev = prev; }
      sibs.push(child);
      REV += 1;
      return child;
    },
    removeChild(child) {
      const i = el.tree.kid.indexOf(child);
      if (i >= 0) el.tree.kid.splice(i, 1);
      REV += 1;
      return child;
    },
    remove() { if (el.tree.parent) el.tree.parent.removeChild(el); },
    focus() {},
    select() {},
    scrollTo() {},
    get clientWidth() { return 0; },
    get scrollWidth() { return 0; },
    get scrollHeight() { return 0; },
    get offsetWidth() { return 0; },
    get offsetLeft() { return 0; },
    get isConnected() { return el._connected; },
  };

  Object.defineProperty(el, 'textContent', {
    get() {
      if (state.text !== '') return state.text;
      if (RAW_TEXT_TAGS.has(el.tag)) return el._textRaw !== '' ? el._textRaw : (state.rawHtml ?? '');
      ensureParsed(el, state);
      return collectText(el);
    },
    set(v) { state.text = String(v); state.parsed = false; el.tree.kid = []; REV += 1; },
  });
  Object.defineProperty(el, 'innerHTML', {
    get() {
      if (state.rawHtml !== null) return state.rawHtml;
      ensureParsed(el, state);
      if (state.fullHtml !== null) return state.fullHtml;
      if (state.text !== '') return state.text;
      return el.tree.kid.map(serializeNode).join('');
    },
    set(v) {
      state.text = String(v);
      state.rawHtml = null;
      state.fullHtml = null;
      state.parsed = false;
      el.tree.kid = [];
      REV += 1;
      ensureParsed(el, state);
    },
  });
  Object.defineProperty(el, 'innerText', {
    get() { ensureParsed(el, state); return collectText(el); },
    set(v) { el.innerHTML = String(v); },
  });
  return el;
}

function ensureParsed(el, state) {
  if (state.parsed) return;
  state.parsed = true;
  const src = state.text;
  state.text = '';
  if (src === '') return;
  const nodes = parseMarkup(src);
  for (const node of nodes) el.appendChild(node);
  state.fullHtml = src;
}

function subtree(root) {
  const out = [];
  const walk = (n) => {
    for (const kid of n.tree.kid) {
      if (kid.tag !== '#text' && kid.tag !== '#comment') out.push(kid);
      walk(kid);
    }
  };
  walk(root);
  return out;
}

function decodeEntities(s) {
  return String(s).replace(/&(?:#[xX]([0-9a-fA-F]+)|#(\d+)|(amp|lt|gt|quot|apos|nbsp));/g,
    (raw, hex, dec, named) => {
      const code = hex ? Number.parseInt(hex, 16) : (dec ? Number.parseInt(dec, 10) : NaN);
      if (Number.isFinite(code) && code > 0) return String.fromCodePoint(code);
      if (named) return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[named];
      return raw;
    });
}

function collectText(node) {
  if (node.tag === '#text') return decodeEntities(node._textRaw);
  if (node.tag === '#comment' || RAW_TEXT_TAGS.has(node.tag)) return '';
  let out = '';
  for (const kid of node.tree.kid) out += collectText(kid);
  return out;
}

function serializeNode(n) {
  if (n.tag.startsWith('#')) return n._textRaw;
  const attrs = Object.entries(n.attrs).map(([k, v]) => ' ' + k + '="' + v + '"').join('');
  if (n.innerHTML === '' && VOID_TAGS.has(n.tag)) return '<' + n.tag + attrs + '>';
  return '<' + n.tag + attrs + '>' + n.innerHTML + '</' + n.tag + '>';
}

let NODE_CACHE = { rev: -1, list: [] };
let ID_CACHE = { rev: -1, map: new Map() };

function docNodes(root) {
  if (NODE_CACHE.rev !== REV) {
    const list = subtree(root).concat(root);
    NODE_CACHE = { rev: REV, list };
    ID_CACHE = { rev: -1, map: new Map() };
  }
  return NODE_CACHE.list;
}

function byId(root, id) {
  if (ID_CACHE.rev !== REV) {
    const map = new Map();
    for (const n of docNodes(root)) if (n.attrs.id !== undefined) map.set(n.attrs.id, n);
    ID_CACHE = { rev: REV, map };
  }
  return ID_CACHE.map.get(id) ?? null;
}

/** 真跑模板的运行时脚本，回「用户打开页面后的 DOM」。入参缺省即本包产物（变异自证时传改过键名的 HTML）。 */
function runPage(html = HTML_FOR_TEST) {
  const at = html.indexOf(DATA_OPEN);
  assert.ok(at > 0, '产物缺 help-data 容器');
  const end = html.indexOf('</script>', at);
  const payloadJson = html.slice(at + DATA_OPEN.length, end);

  const root = createNode('#document', {}, { connected: true });
  for (const node of parseMarkup(html)) root.appendChild(node);

  const body = root.querySelector('body');
  assert.ok(body, '静态段须有 <body>');
  const payloadNode = byId(root, 'help-data');
  assert.ok(payloadNode, '静态段须有 help-data 载荷容器');
  assert.equal(payloadNode.attrs.type, 'application/json', '载荷容器类型须是 application/json');
  assert.equal(payloadNode.textContent, payloadJson,
    '载荷容器须能按 textContent 读出载荷（与产物里那段逐字节相同）');

  const runtimeHtml = html.slice(end + '</script>'.length);
  const runtimeScripts = [...runtimeHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);
  assert.ok(runtimeScripts.length >= 2, '后缀应含 helpers ＋ 页面脚本两段，实际 ' + runtimeScripts.length);
  const pageScript = runtimeScripts[runtimeScripts.length - 1];
  assert.ok(pageScript.includes("JSON.parse(document.getElementById('help-data')"),
    '最后一段运行时脚本应是读载荷渲染页面的那段（锚点不见了，运行时段就失去意义）');
  const helpersScript = runtimeScripts.slice(0, -1).join('\n');

  const doc = {
    readyState: 'complete',
    documentElement: root,
    head: root.querySelector('head') ?? root,
    body,
    getElementById: (id) => byId(root, id),
    querySelector: (sel) => docNodes(root).find((n) => matchesSelector(n, sel)) ?? null,
    querySelectorAll: (sel) => docNodes(root).filter((n) => matchesSelector(n, sel)),
    createElement: (tag) => createNode(tag, {}, { connected: true }),
    addEventListener() {},
    execCommand() { return true; },
  };

  const sandbox = {
    document: doc,
    location: { hash: '', href: 'file:///备忘录_HELP.html', pathname: '/备忘录_HELP.html' },
    navigator: { userAgent: 'test', clipboard: null },
    history: { pushState() {}, replaceState() {} },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    cancelAnimationFrame() {},
    scrollTo() {},
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  // toast 路径兜底（本用例不弹 toast，但缺了就是与断言无关的 TypeError）
  sandbox.window.matchMedia = () => ({ matches: false });
  const context = vm.createContext(sandbox);

  const screenBefore = doc.getElementById('screen');
  assert.ok(screenBefore, '静态段须有一个 #screen 容器（模板渲染位）');
  assert.equal(screenBefore.innerHTML, '', '静态段的 #screen 必须是空的（内容由运行时现拼）');

  for (const src of [helpersScript, pageScript]) {
    new vm.Script(src, { filename: 'help-template-runtime.js' })
      .runInContext(context, { timeout: 30_000 });
  }

  return { doc, root, body, screen: doc.getElementById('screen') };
}

/* ══ 票面四条 ══ */

test('#243 ① 8 域／13 二级组／30 场景卡真的渲染出来（数 DOM 节点，不是数载荷）', () => {
  assert.equal(DERIVED.groups, 8, '资产 8 域');
  assert.equal(DERIVED.subgroups, 13, '资产 13 二级组');
  assert.equal(DERIVED.scenes, 30, '资产 30 场景');
  const { screen } = runPage();
  // 场景卡：DOM 数＝资产数，且 data-key 全局唯一且与资产 id 集逐字对齐
  const cards = screen.querySelectorAll('.mini');
  assert.equal(cards.length, DERIVED.scenes, '场景卡 DOM 数应＝资产场景数（数节点，不是数载荷）');
  const keys = cards.map((c) => c.dataset.key);
  assert.equal(new Set(keys).size, DERIVED.scenes, '场景卡 data-key 全局唯一');
  assert.deepEqual([...keys].sort(), SCENES.map((s) => s.id).sort(), '场景卡 id 集与资产逐字对齐');
  // 二级组：DOM 数＝资产数
  assert.equal(screen.querySelectorAll('.subgroup').length, DERIVED.subgroups, '二级组 DOM 数');
  // 域：分组页（去关于页）＝8，总页＝9；Tab＝9；双处锚点齐全
  const pages = screen.querySelectorAll('.page[data-page]');
  assert.equal(pages.length, DERIVED.groups + 1, '分组页数＝域数 ＋ 关于页');
  assert.equal(pages.filter((p) => p.getAttribute('data-page') !== 'about').length, DERIVED.groups, '域分组页＝8');
  assert.equal(screen.querySelectorAll('.tab-bar .tab').length, DERIVED.groups + 1, 'Tab 数＝域数 ＋ 关于');
  const text = screen.innerHTML;
  for (const g of MEMO_HELP_GROUPS) {
    assert.ok(text.includes('data-page="' + g.id + '"'), '缺分组页：' + g.id);
    assert.ok(text.includes('data-nav="' + g.id + '"'), '缺 Tab：' + g.id);
  }
  // 文档标题由共享层拼成（DOM 里真有，不是载荷里有）
  assert.ok(visibleText(screen).includes('备忘录'), 'DOM 可见正文应有技能名');
  assert.ok(screen.innerHTML.includes('备忘录 · 使用手册') || visibleText(screen).includes('使用手册'), 'DOM 应有文档标题');
});

test('#243 ② 初始化横幅 6 步骤卡 title／desc 逐条在 DOM（裁决 20 取页面正确那一边的落地锁）', () => {
  const { screen } = runPage();
  const steps = DATA.init_banner.steps;
  assert.equal(steps.length, 6, '载荷 6 步骤（前置）');
  const cards = screen.querySelectorAll('.init-step');
  assert.equal(cards.length, 6, '步骤卡 DOM 数＝6（模板键名一换这里先红）');
  assert.equal(screen.querySelectorAll('.init-step .s-n').length, 6, '序号格 6 个');
  assert.equal(screen.querySelectorAll('.init-step .s-t').length, 6, '标题格 6 个');
  assert.equal(screen.querySelectorAll('.init-step .s-d').length, 6, '描述格 6 个（缺 desc 即红）');
  // 序号 1..6 逐格对齐
  assert.deepEqual(
    cards.map((c) => collectText(c.querySelector('.s-n')).trim()),
    ['1', '2', '3', '4', '5', '6'],
  );
  // title／desc 逐条在 DOM（读 DOM 文本，不是读载荷；模板 `st.title`／`st.desc` 一换即空即红）
  const misses = [];
  steps.forEach((st, i) => {
    const t = collectText(cards[i].querySelector('.s-t'));
    const d = collectText(cards[i].querySelector('.s-d'));
    if (t !== st.title) misses.push('步骤' + (i + 1) + ' title DOM=' + JSON.stringify(t) + ' 期望=' + JSON.stringify(st.title));
    if (d !== st.desc) misses.push('步骤' + (i + 1) + ' desc DOM=' + JSON.stringify(d) + ' 期望=' + JSON.stringify(st.desc));
    if (t.trim() === '') misses.push('步骤' + (i + 1) + ' 标题空格子（模板键名错位的典型症状）');
  });
  assert.deepEqual(misses, [], '步骤文案缺失：' + misses.join(' | '));
});

test('#243 ③ 可见正文 7 类词全 0（memo.／--html／memo-cmd-read／脚本路径／待开发／无唤醒词／HELP 自身唤醒词）', () => {
  const { screen } = runPage();
  const seen = visibleText(screen);
  // ① 命令前缀（data-key 里是 memo_ 下划线，不触发；触发即命令泄进正文）
  assert.equal((seen.match(/memo\./g) || []).length, 0, '可见正文不得出现 memo. 命令名');
  // ② CLI 开关
  assert.equal(seen.includes('--html'), false, '可见正文不得出现 --html');
  // ③ 唯一出口命令
  assert.equal(seen.includes('memo-cmd-read'), false, '可见正文不得出现 memo-cmd-read');
  // ④ 脚本路径（老实物实现细节：.py／.yaml／memo_render／scenarios.yaml 任一即红；
  //     步骤 desc 里的 SKILLS_DB_PATH / MEMO_MEDIA_DIR 是环境变量，不是脚本路径，不在此列）
  const scriptHits = ['.py', '.yaml', 'memo_render', 'scenarios.yaml'].filter((p) => seen.includes(p));
  assert.deepEqual(scriptHits, [], '可见正文不得出现脚本路径：' + scriptHits.join(','));
  // ⑤ 待开发（本包 status 全空串，无徽章；有即红）
  assert.equal(seen.includes('待开发'), false, '可见正文不得出现待开发（HELP 是完整体）');
  assert.equal(screen.querySelectorAll('.t-dev').length, 0, '待开发徽章 DOM 数＝0');
  // ⑥ 无唤醒词（缺失标记不上页；连同老口径 当前无 一并锁紧）
  assert.equal(seen.includes('无唤醒词'), false, '可见正文不得出现无唤醒词');
  assert.equal(seen.includes('当前无'), false, '可见正文不得出现当前无');
  // ⑦ HELP 自身唤醒词（入口「备忘录 HELP」不上页；注：关于页「HELP 模板 v4」是模板版本号，
  //     不是唤醒词，故本条只锁唤醒词形，不锁裸 HELP，避免把版本号误判成唤醒词）
  assert.equal(/备忘录\s*help/i.test(seen), false, '可见正文不得出现 HELP 自身唤醒词（备忘录 HELP）');
});

test('#243 ④ 带 editable_fields 的卡点开出现对应数量 input（以 memo_add_basic 4 个为锚）', () => {
  const { screen, doc } = runPage();
  const click = (el) => dispatchBubbling(el, 'click');
  const sheet = doc.getElementById('sheet');
  assert.ok(sheet, '须有 sheet 弹层容器');
  const cards = screen.querySelectorAll('.mini');
  assert.equal(cards.length, DERIVED.scenes);
  // 锚点卡：memo_add_basic 真出 4 个 input[data-p]（复审员 J 真浏览器结论的桩复刻）
  const anchor = SCENES.find((s) => s.id === 'memo_add_basic');
  assert.ok(anchor && anchor.editable_fields, '资产须有 memo_add_basic 且带 editable_fields');
  assert.equal(anchor.editable_fields.length, 4, '锚点卡载荷 4 字段（前置）');
  const anchorCard = cards.find((c) => c.dataset.key === 'memo_add_basic');
  assert.ok(anchorCard, 'DOM 须有 memo_add_basic 卡');
  click(anchorCard);
  assert.equal(sheet.querySelectorAll('input[data-p]').length, 4, '点开 memo_add_basic 真出 4 个 input[data-p]');
  // 全量：每张带 editable_fields 的卡，弹层 input 数＝字段数且 data-p 键集对齐；不带的卡无表单
  const withFields = SCENES.filter((s) => Array.isArray(s.editable_fields) && s.editable_fields.length > 0);
  assert.ok(withFields.length > 0, '须有带 editable_fields 的卡');
  for (const scene of withFields) {
    const card = cards.find((c) => c.dataset.key === scene.id);
    assert.ok(card, '缺卡：' + scene.id);
    click(card);
    const inputs = sheet.querySelectorAll('input[data-p]');
    assert.equal(inputs.length, scene.editable_fields.length,
      '卡 ' + scene.id + ' input 数应＝editable_fields 数（实际 ' + inputs.length + '，期望 ' + scene.editable_fields.length + '）');
    assert.deepEqual(
      inputs.map((n) => n.getAttribute('data-p')).sort(),
      scene.editable_fields.map((f) => f.name).sort(),
      '卡 ' + scene.id + ' input 键集不对齐',
    );
  }
});
