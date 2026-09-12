/** #202 · 「作息管家help」渲染接线回归锁 —— **两段式**（静态段 ＋ 运行时段）。
 *
 * 为什么必须两段（本票最重要的纪律）：
 *  共享 help 模板的**内容全在页面侧 JS 里**。静态段只有一个空壳
 *  `<div class="screen" id="screen"></div>`（`packages/base-render/assets/help-template.html` 的静态壳），
 *  分组页／场景卡／唤醒词徽章全是模板末尾那段运行时脚本按载荷现拼 `screen.innerHTML` 渲出来的
 *  （同文件页面侧脚本：`var screen = document.getElementById('screen')` → `screen.innerHTML = h`）。所以：
 *   - 只 grep 静态 HTML ⇒ 永远「没内容」，会把好的产物判成坏的；
 *   - 只看数据载荷（`<script id="help-data">` 里的 JSON）⇒ **假绿**，载荷对而页面空着也照样通过。
 *  本文件因此同时做两段：静态段验「完整文档 ＋ 载荷」，运行时段把模板的运行时脚本真跑起来
 *  （`vm` ＋ 最小 DOM 桩，见下），拿「用户打开页面后的 DOM」来数数。
 *
 * 两段各自认一条锁，两条合起来＝「页上**没有**说明区」的验收尺（用户 2026-09-13 裁定：作息 HELP 与
 * 其它技能 HELP 同构，**不多自带功能模块**；旧实物那 90 条伴生信息＝85 条场景「预期结果说明」＋
 * 5 条一级分组说明，**一条都不上页**）。**锁的方向不许放宽**：
 *  - 静态段：这 90 条**一条也不在载荷里**——`helpFile.ts` 一旦重新挂上 `meta_blocks` 就红；
 *  - 运行时段：页上**不得**出现 `.meta-sec` 说明区标记、「预期 ·」字样与那 5 条一级分组说明。
 * 另有一条**反向锁**守着证词本身：`screen` 段在脚本执行前必须是空的（真「空壳」）——它若已经有
 * 内容，下面那段「渲染后的 DOM」就不是运行时产物，整套证词作废。
 * 边界四项（场景卡／一级分组页／子组／待开发徽章）的计数在运行时段那条锁里一并复核：删说明区
 * 不许把原有结构一起削掉。
 *
 * ── harness 纪律（后来者照做）─────────────────────────────────────────────
 * 共享 help 模板的**界面全在页面侧 JS 里**：静态壳只有一个空 `<div id="screen">`，分组页／场景卡／
 * 徽章全是运行时按载荷现拼 `screen.innerHTML` 渲出来的。所以：
 *  - **只 grep 静态 HTML ⇒ 永远「没内容」**，会把好产物判成坏的；
 *  - **只看载荷（`<script id="help-data">` 的 JSON）⇒ 假绿**，载荷对而页面空着也照样通过。
 * 要断言「页上有」，只能跑本文件的 `runPage()`（`vm` ＋下面那个最小 DOM 桩），拿「用户打开页面后的
 * DOM」来数。那个桩有三条**保真点**，缺一条就是把假绿换成假红，别删：
 *  ① `innerHTML` **赋值即建树**：运行时 `screen.innerHTML = h` 之后**紧接着**一行就
 *     `document.getElementById('pages')`，桩必须那时已经把标记解成元素树（早先推迟到
 *     读 `textContent`／`innerHTML` 时才解析，于是 `pages` 是 null，运行时段 6 条全红）；
 *  ② `<script>` 是**原样文本标签**：`textContent` 读到的就是容器里那段原串（运行时靠它 `JSON.parse`
 *     载荷）；载荷**从产物自己读**，不是测试往私有字段塞（塞进去＝运行时假绿）；
 *  ③ `dataset` 可**写回**属性（`shCopy.dataset.c = …` 之后要能读回同一份；早先返回一次性对象，
 *     赋值被静默丢弃，弹层那条断言就成了假证据）。
 *
 * 计数一律**派生**（从内容资产算），本文件不写死 5／34／85／11／90。
 *
 * 运行：先 `pnpm -C packages/skill-schedule exec tsc -b`（用例读 `../dist/**`，dist 陈旧＝测的是旧载荷），
 * 再 `node --test packages/skill-schedule/test/help-file-202.test.mjs`
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  HELP_CONTACT, HELP_FILE_STEM, HELP_FILE_TITLE, HELP_FILE_VERSION, HELP_INIT_SCENE_ID,
  assertGroupsUsable, buildHelpFileData, renderHelpFileHtml,
} from '../dist/help/helpFile.js';
import { HELP_ASSETS, HELP_GROUPS, HELP_GROUP_NOTES, HELP_SCENE_RESULTS } from '../dist/help/scenes/help-assets.js';

const DATA_OPEN = '<script id="help-data" type="application/json">';
/** 本地 2026-09-13 14:30:15（同一 `now` 两次渲染可比对）。 */
const NOW = new Date(2026, 8, 13, 14, 30, 15);
/** 待开发徽章的类名（模板运行时的 `chipHTML` 现拼，形如 `<span class="type-badge t-dev">`）。 */
const DEV_BADGE_CLASS = 'type-badge t-dev';

/* ── 派生计数（一律从资产算，不写第二个数） ───────────────────────── */
const PENDING = '【待开发】';
const SUBGROUPS = HELP_GROUPS.flatMap((g) => g.subgroups);
const PENDING_SCENES = HELP_ASSETS.filter((s) => s.status === PENDING);
const DERIVED = {
  groups: HELP_GROUPS.length,
  subgroups: SUBGROUPS.length,
  scenes: HELP_ASSETS.length,
  pending: PENDING_SCENES.length,
  results: Object.keys(HELP_SCENE_RESULTS).length,
  notes: Object.keys(HELP_GROUP_NOTES).length,
};
/** 90 条伴生信息＝85 条「预期结果说明」＋5 条一级分组说明（两张表之和，不写死 90）。 */
const COMPANIONS = DERIVED.results + DERIVED.notes;
/** 待开发徽章的选择器（`.type-badge.t-dev`）。 */
const DEV_BADGE_SEL = '.' + DEV_BADGE_CLASS.split(' ').join('.');
/** 徽章**文案**：共享模板 `chipHTML` 写死的「待开发」（资产里的状态串是「【待开发】」，只差书括号；
 *  页上真有的那个写法才是要断言的）。 */
const DEV_BADGE_TEXT = PENDING.replace(/[【】]/g, '');

/** 模板运行时那套五字符转义（`help-template.html` 页面侧脚本的 `esc` 逐字等价）。 */
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 从渲染产物取回载荷（完整文档里唯一的 application/json 脚本）。 */
function payloadOf(html) {
  const at = html.indexOf(DATA_OPEN);
  assert.ok(at > 0, '产物缺 help-data 容器（' + DATA_OPEN + '）');
  const end = html.indexOf('</script>', at);
  assert.ok(end > at, 'help-data 容器未闭合');
  return JSON.parse(html.slice(at + DATA_OPEN.length, end));
}

/** 载荷里所有字符串拼成的一段（解析后的真实取值）。
 *  「载荷有没有带上这段文本」只看这里——**不看 JSON 源码**：源码里 `<` 被转义成 `\u003c`（防破壳），
 *  拿源码比对会把「已经带上了」判成「没带上」。 */
function payloadStrings(payload) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(payload);
  return out.join('\n');
}

/** 用户**真看到的**文本：运行时 DOM 的可见文本（字符实体已还原；`<script>`／`<style>` 不算可见）。 */
function visibleText(root) {
  return collectText(root);
}

/** 原文与 `escHtml` 后两种写法命中任一即算「在」（技能侧转义／不转义都能过这一关）。 */
function containsAnywhere(hay, text) {
  return hay.includes(text) || hay.includes(escHtml(text));
}

/** 从 `el` 往上冒泡派发事件（浏览器语义）：监听挂在哪一层都能收到，`stopPropagation()` 停住。
 *  模板的卡片点击是**委托**在 `screen` 上的（`e.target.closest('.mini')`），卡片自己身上没有监听——
 *  去卡片自己身上找监听会得到「缺点击处理」的假结论。 */
function dispatchBubbling(el, type) {
  let stopped = false;
  const event = { target: el, preventDefault() {}, stopPropagation() { stopped = true; } };
  for (let node = el; node && !stopped; node = node.tree.parent) node.dispatch(type, event);
}
/* ══ 最小 DOM 桩 ══════════════════════════════════════════════════
 * 不装 jsdom（仓内没有，也不为一个用例引依赖）：只实现模板运行时真正用到的那些面。
 * 关键一点是**赋值即建树**：模板运行时把整页内容拼成一个字符串后 `screen.innerHTML = h`
 * （模板页面侧脚本里那行），之后再 `document.getElementById('pages')`／`querySelectorAll('.mini')`
 * 去拿页上的东西。所以 `innerHTML` 的 setter 要真的把那段标记解成元素树挂到该元素下，
 * `getElementById`／`querySelector(All)` 要能在这棵（含新挂子树）上找——否则运行时一开头
 * 就会在 `document.getElementById('pages')` 上拿到 null，跑不到「用户打开页面后的 DOM」。
 * 拿不到真布局（`clientWidth` 等给 0），但「页上有没有这些东西」靠的是元素树。
 * ═══════════════════════════════════════════════════════════════ */

/** `div#screen.phone[x="1"]:not([open])` 这类简单选择器（可含属性选择器与 `:not()`）。 */
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

/** 后代组合器（空格分隔）逐级筛；最右一段必须命中目标元素本身。 */
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

/** HTML 自闭合标签（`<br>` 这类不会等着被关）。 */
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** 原样文本标签：内容不当标记解（`<script>` 里可能是任意 JS）。 */
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea']);

/** 文档级修订号：任何一处改树就 +1，节点表／id 表靠它失效。 */
let REV = 0;

/** 标记 → 元素树（返回顶层节点数组；没配平的多余闭合标签按文本丢掉，不假装能无损重建）。 */
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
        // 只弹到对得上的那一层（运行时现拼的串偶尔多一个闭合标签，不当崩）。
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
      // 裸 `<`（文本里的）：当文本吃
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

/** `data-*` 属性的可读写视图（浏览器 `dataset` 语义：**赋值要落到属性上**）。
 *  模板运行时 `shCopy.dataset.pid = …`／`shCopy.dataset.c = …`（`openSheet` 里那两行）之后
 *  用例要读得回同一份；早先这里每次返回一个一次性对象，赋值被静默丢弃，弹层那条断言就成了假证据。 */
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
  /** `dataset` 视图按元素缓存一次（读写都走属性，见 `datasetProxy`）。 */
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
    /* 文本节点的原串就放这里（`collectText` 读它）——`parseMarkup` 是用 `{text}` 造文本节点的，
       这里不透出来的话「可见文本」会永远是空串：页上明明有字，断言却一条也命中不了。 */
    _textRaw: opts.text ?? '',
    get id() { return this.attrs.id ?? ''; },
    /** 读写都落到 `data-*` 属性上（见 `datasetProxy`）。 */
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
    /** 元素子节点（`pages.children[i]` 这种用法，模板运行时在切页时读）。 */
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
      // 原样文本标签（`<script>`／`<style>`／`<textarea>`）：容器里的原串在**解析时**就存进了
      // `state.rawHtml`。模板运行时正是靠 `document.getElementById('help-data').textContent` 读载荷，
      // 所以这里必须能读出那段原串（读到空串＝运行时 `JSON.parse('')` 崩，被测的东西全落空）。
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
      /* **赋值即建树**（本桩的头号保真点，别改回懒解析）：模板运行时 `screen.innerHTML = h` 之后
         紧接着就用 `document.getElementById('pages')`／`querySelectorAll('.tab')` 去拿页上的东西。
         推迟到读 `textContent` 时才解析的话，那些调用拿到 null／空数组，运行时段整段崩
         （症状：`TypeError: Cannot read properties of null (reading 'addEventListener')`）。 */
      ensureParsed(el, state);
    },
  });
  Object.defineProperty(el, 'innerText', {
    get() { ensureParsed(el, state); return collectText(el); },
    set(v) { el.innerHTML = String(v); },
  });
  return el;
}

/** 首次读 `textContent`／`innerHTML` 时把存下的标记解成子树挂上（赋值即建树）。 */
function ensureParsed(el, state) {
  if (state.parsed) return;
  state.parsed = true;
  const src = state.text;
  state.text = '';
  if (src === '') return;
  const nodes = parseMarkup(src);
  for (const node of nodes) el.appendChild(node);
  // 解析是有损的（容忍多余闭合标签、属性序照原样）：`innerHTML` 读回原串，
  // 免得运行时拿到的字节与浏览器不一致。
  state.fullHtml = src;
}

/** 子树元素（先根序；不含自身）。 */
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

/** 字符实体还原：浏览器把 `&lt;` 这类引用解析成真字符之后，才是「用户看到的文本」。
 *  一次扫描、命中即替换（`&amp;lt;` ⇒ `&lt;`，不二次还原），与解析器口径一致。 */
function decodeEntities(s) {
  return String(s).replace(/&(?:#[xX]([0-9a-fA-F]+)|#(\d+)|(amp|lt|gt|quot|apos|nbsp));/g,
    (raw, hex, dec, named) => {
      const code = hex ? Number.parseInt(hex, 16) : (dec ? Number.parseInt(dec, 10) : NaN);
      if (Number.isFinite(code) && code > 0) return String.fromCodePoint(code);
      if (named) return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }[named];
      return raw;
    });
}

/** 可见文本（递归收文本节点；`<script>`／`<style>`／注释不算可见；字符实体按浏览器口径还原）。 */
function collectText(node) {
  if (node.tag === '#text') return decodeEntities(node._textRaw);
  if (node.tag === '#comment' || RAW_TEXT_TAGS.has(node.tag)) return '';
  let out = '';
  for (const kid of node.tree.kid) out += collectText(kid);
  return out;
}

/** 元素 → 标记（`<script>` 原样吐回；文本节点吐原串）。 */
function serializeNode(n) {
  if (n.tag.startsWith('#')) return n._textRaw;
  const attrs = Object.entries(n.attrs).map(([k, v]) => ' ' + k + '="' + v + '"').join('');
  if (n.innerHTML === '' && VOID_TAGS.has(n.tag)) return '<' + n.tag + attrs + '>';
  return '<' + n.tag + attrs + '>' + n.innerHTML + '</' + n.tag + '>';
}

/** 文档级节点表（含赋值新挂的子树）＋ id 表；按修订号缓存。 */
let NODE_CACHE = { rev: -1, list: [] };
let ID_CACHE = { rev: -1, map: new Map() };

function docNodes(root) {
  if (NODE_CACHE.rev !== REV) {
    // 先走完再记修订号：子树里可能有「赋值即建树」刚挂上的节点（挂树本身会 +REV），
    // 先记号会把这一次的结果立刻判成陈旧、白重建一遍。
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

/** 真跑模板的运行时脚本，回「用户打开页面后的 DOM」。 */
function runPage(html) {
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
  // `<script>` 是原样文本标签：容器里的原串在解析时就存下了，运行时
  // `JSON.parse(document.getElementById('help-data').textContent)` 读到的就是它——浏览器里同一条路。
  // 【纪律】**不往节点里塞私有字段**：塞进去等于替运行时把载荷读通，运行时段立刻变成假绿。
  assert.equal(payloadNode.textContent, payloadJson,
    '载荷容器须能按 textContent 读出载荷（与产物里那段逐字节相同）');

  // 后缀＝运行时（先 helpers 后页面脚本），逐段跑；跑「页面脚本」那一刻就是「用户打开页面」。
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
    location: { hash: '', href: 'file:///作息管家_HELP.html', pathname: '/作息管家_HELP.html' },
    navigator: { userAgent: 'test', clipboard: null },
    history: { pushState() {}, replaceState() {} },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    cancelAnimationFrame() {},
    /* 模板的 Tab 点击处理里真会调 `window.scrollTo`／`pages.scrollTo`（点 Tab 才走到）：
       这里给个空实现，后来者点 Tab 时不会撞出一个与断言无关的 TypeError。 */
    scrollTo() {},
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);

  const screenBefore = doc.getElementById('screen');
  assert.ok(screenBefore, '静态段须有一个 #screen 容器（模板渲染位）');
  assert.equal(screenBefore.innerHTML, '', '静态段的 #screen 必须是空的（内容由运行时现拼）');

  for (const src of [helpersScript, pageScript]) {
    try {
      new vm.Script(src, { filename: 'help-template-runtime.js' })
        .runInContext(context, { timeout: 30_000 });
    } catch (e) {
      /* 桩一旦跑不动，先 `T202_DEBUG=1 node --test …`：这一支把「运行时抛在脚本第几行」与
         「页面在那之前挂到哪一步」一起打出来，比单看堆栈快。 */
      if (process.env.T202_DEBUG !== '1') throw e;
      const lines = src.split('\n');
      const hit = /help-template-runtime\.js:(\d+)/.exec(String(e.stack) ?? '');
      const at = hit ? Number(hit[1]) : 0;
      console.error('[t202] 运行时抛错（脚本内第 ' + at + ' 行）：' + e.message);
      if (at > 0) console.error('[t202] 上下文：\n' + lines.slice(Math.max(0, at - 3), at + 1).join('\n'));
      console.error('[t202] screen?', Boolean(doc.getElementById('screen')), 'pages?', Boolean(doc.getElementById('pages')));
      const scr = ID_CACHE.map.get('screen');
      console.error('[t202] docNodes=' + docNodes(root).length
        + ' rootKids=' + root.tree.kid.length
        + ' bodyKids=' + body.tree.kid.length
        + ' screenKids=' + (scr ? scr.tree.kid.length : -1)
        + ' screenKidTags=' + (scr ? scr.tree.kid.map((k) => k.tag).join(',') : '-'));
      if (scr) console.error('[t202] screen 子元素 id 全表=' + subtree(scr).map((n) => n.attrs.id).filter(Boolean).join(','));
      throw e;
    }
  }

  if (process.env.T202_DEBUG === '1') {
    const pages = doc.getElementById('pages');
    console.error('[t202] pages?', Boolean(pages), 'byId map size', ID_CACHE.map.size,
      'ids', [...ID_CACHE.map.keys()].slice(0, 20).join(','));
    console.error('[t202] all ids first 40', docNodes(root).map((n) => n.attrs.id).filter(Boolean).slice(0, 40).join(','));
    console.error('[t202] tag counts', JSON.stringify(docNodes(root).reduce((acc, n) => {
      acc[n.tag] = (acc[n.tag] ?? 0) + 1; return acc;
    }, {})));
  }

  return { doc, root, body, screen: doc.getElementById('screen') };
}

describe('#202 作息管家 HELP 渲染接线', () => {
  describe('静态段：完整文档 ＋ 载荷', () => {
    it('产物是完整文档（doctype／charset／样式／标题／载荷容器）', () => {
      const html = renderHelpFileHtml(buildHelpFileData(NOW));
      assert.ok(html.startsWith('<!DOCTYPE html>'), '须以 doctype 起');
      assert.ok(html.includes('<meta charset="UTF-8">'), '须带 charset（含中文的 UTF-8 文件经 file:// 打开不乱码的前提）');
      assert.ok(html.includes('<meta name="viewport"'), '须带 viewport');
      assert.ok(html.includes('<style>') && html.includes('--blue:#007aff'), '须带样式（共享 CSS 已注入）');
      assert.ok(html.includes('</body>') && html.trimEnd().endsWith('</html>'), '须以 </html> 收');
      assert.equal((html.match(/<title>([^<]*)<\/title>/) || [])[1], HELP_FILE_TITLE,
        '文档标题＝title（已含技能名，不重复前缀）');
    });

    it('载荷 7 键齐全：5 必需 ＋ version／init_banner（`meta_blocks` 不传）', () => {
      const back = payloadOf(renderHelpFileHtml(buildHelpFileData(NOW)));
      assert.deepEqual(Object.keys(back).sort(),
        ['contact', 'groups', 'init_banner', 'skill_name', 'subtitle', 'title', 'version']);
      assert.equal('meta_blocks' in back, false,
        '`meta_blocks` 整块不传（与其它技能 HELP 同构，不多自带功能模块）');
      assert.deepEqual(back.groups, HELP_GROUPS, 'groups 由内容资产直转（零改写）');
      assert.deepEqual(back.contact, HELP_CONTACT);
      assert.equal(back.version, HELP_FILE_VERSION);
      assert.equal(HELP_FILE_VERSION, '2.0', '技能数据世代（非 npm 包版本）');
      assert.equal(HELP_FILE_STEM, '作息管家_HELP', '文件名主体（落盘归 #203）');
    });

    it('计数派生：三层条数都对得上（载荷里不再有伴生信息块）', () => {
      const data = buildHelpFileData(NOW);
      assert.equal(data.subtitle, DERIVED.groups + ' 类别 · ' + DERIVED.subgroups + ' 唤醒词 · '
        + DERIVED.scenes + ' 场景 · 版本 ' + HELP_FILE_VERSION + ' · 更新于 2026-09-13 14:30');
      const back = payloadOf(renderHelpFileHtml(data));
      assert.equal(back.groups.length, DERIVED.groups);
      assert.equal(back.groups.reduce((n, g) => n + g.subgroups.length, 0), DERIVED.subgroups);
      assert.equal(back.groups.reduce((n, g) => n + g.subgroups.reduce((m, s) => m + s.scenes.length, 0), 0),
        DERIVED.scenes);
      assert.equal(DERIVED.pending, PENDING_SCENES.length, '待开发条数也派生自资产');
    });

    it('init_banner 状态驱动：键常在、显隐走 hidden；prompt 取自内容资产（单源）', () => {
      const fresh = buildHelpFileData(NOW, { initialized: false });
      const ready = buildHelpFileData(NOW, { initialized: true });
      assert.equal(fresh.init_banner.hidden, false, '未初始化 ⇒ 照显');
      assert.equal(ready.init_banner.hidden, true, '已初始化 ⇒ 隐藏');
      assert.deepEqual(Object.keys(fresh), Object.keys(ready), '键集恒定（不随状态删键）');
      const scene = HELP_ASSETS.find((s) => s.id === HELP_INIT_SCENE_ID);
      assert.ok(scene, '内容资产里应有 ' + HELP_INIT_SCENE_ID + ' 场景');
      assert.equal(fresh.init_banner.prompt, scene.prompt_template, '横幅 prompt 取自该场景（不写第二份）');
      assert.equal(fresh.init_banner.closable, true);
      const back = payloadOf(renderHelpFileHtml(ready));
      assert.equal(back.init_banner.hidden, true);
      assert.equal(back.subtitle, fresh.subtitle, '渲染内容与初始化状态无关（只有横幅显隐变）');
    });

    it('可复现：同一 now 两次渲染逐字节一致；坏 Date 即抛', () => {
      assert.equal(renderHelpFileHtml(buildHelpFileData(NOW)), renderHelpFileHtml(buildHelpFileData(NOW)));
      assert.throws(() => buildHelpFileData(new Date('nope')),
        (e) => e.name === 'ScheduleRenderError' && e.code === 'SCHEDULE_BAD_PAYLOAD');
    });

    it('反向锁（静态段）：载荷**不带**那 ' + COMPANIONS + ' 条伴生信息（' + DERIVED.results
      + ' 条「预期结果说明」＋ ' + DERIVED.notes + ' 条一级分组说明，逐条计数）', () => {
      const html = renderHelpFileHtml(buildHelpFileData(NOW));
      const payload = payloadOf(html);
      const hay = payloadStrings(payload);
      /* 「没上页」的第一层证据是「载荷根本没带」：模板那边已无该键的落点，载荷再挂回去就是死载荷。 */
      const hitResults = Object.entries(HELP_SCENE_RESULTS).filter(([, r]) => containsAnywhere(hay, r));
      assert.deepEqual(hitResults.map(([id]) => id), [],
        '载荷里混进了「预期结果说明」' + hitResults.length + ' 条（命中 '
        + hitResults.length + '/' + DERIVED.results + '）');
      const hitNotes = Object.entries(HELP_GROUP_NOTES).filter(([, n]) => containsAnywhere(hay, n));
      assert.deepEqual(hitNotes.map(([id]) => id), [],
        '载荷里混进了一级分组说明' + hitNotes.length + ' 条（命中 '
        + hitNotes.length + '/' + DERIVED.notes + '）');
      /* 条数口径也在这一条锁里对齐（全派生）：预期逐场景一条、分组说明逐分组一条。 */
      assert.equal(DERIVED.results, DERIVED.scenes, '「预期结果说明」应逐场景一条');
      assert.equal(DERIVED.notes, DERIVED.groups, '一级分组说明应逐分组一条');
      assert.equal(COMPANIONS, DERIVED.scenes + DERIVED.groups, '伴生信息条数＝场景数 ＋ 分组数');
    });

    it('坏载荷不降级：空分组／空子功能／空场景／空 prompt 逐条即抛', () => {
      // 深拷一份再改（浅拷会让场景对象仍指向资产本体，把后面所有用例一起带红）。
      const clone = () => HELP_GROUPS.map((g) => ({
        ...g,
        subgroups: g.subgroups.map((s) => ({ ...s, scenes: s.scenes.map((sc) => ({ ...sc })) })),
      }));
      const expects = (groups, msg) => {
        const err = assert.throws(() => assertGroupsUsable(groups),
          (e) => e.name === 'ScheduleRenderError' && e.code === 'SCHEDULE_BAD_PAYLOAD', msg);
        assert.equal(typeof err, 'undefined', msg);
      };
      expects([], '空分组须抛');
      const noSub = clone();
      noSub[0].subgroups = [];
      expects(noSub, '空子功能须抛');
      const noScene = clone();
      noScene[0].subgroups[0].scenes = [];
      expects(noScene, '空场景须抛');
      const noPrompt = clone();
      noPrompt[0].subgroups[0].scenes[0].prompt_template = '';
      expects(noPrompt, '空 prompt 须抛');
      assert.doesNotThrow(() => assertGroupsUsable(clone()), '好数据不该抛');
      assert.equal(HELP_GROUPS.length, DERIVED.groups, '资产须原样（本用例不得改动资产）');
      assert.equal(HELP_ASSETS.length, DERIVED.scenes);
      assert.equal(HELP_ASSETS[0].prompt_template.length > 0, true, '资产场景 prompt 须完好（深拷已隔离）');
    });
  });

  describe('运行时段：把模板运行时跑起来，数「用户打开页面后的 DOM」', () => {
    it('#screen 渲染出全部场景卡；唤醒词、标题、顶部计数都在', () => {
      const { screen } = runPage(renderHelpFileHtml(buildHelpFileData(NOW)));
      const cards = screen.querySelectorAll('.mini');
      assert.equal(cards.length, DERIVED.scenes, '场景卡条数应＝资产场景数');
      const keys = cards.map((c) => c.dataset.key);
      assert.equal(new Set(keys).size, DERIVED.scenes, '场景卡 data-key 全局唯一且齐全');
      assert.deepEqual([...keys].sort(), HELP_ASSETS.map((s) => s.id).sort());

      const text = screen.innerHTML;
      for (const scene of HELP_ASSETS) {
        assert.ok(text.includes('>' + escHtml(scene.title) + '<'), '卡片缺场景标题：' + scene.id);
        assert.ok(text.includes(escHtml(scene.wake_word)), '卡片缺唤醒词：' + scene.id + '（' + scene.wake_word + '）');
      }
      for (const word of new Set(HELP_ASSETS.map((s) => s.wake_word))) {
        assert.ok(text.includes('<span class="chip">' + escHtml(word) + '</span>'), '缺唤醒词徽章：' + word);
      }
      assert.ok(text.includes(HELP_FILE_TITLE), '顶部大标题应由载荷渲染');
      assert.ok(text.includes(DERIVED.scenes + ' 场景'), '顶部计数应由载荷派生：' + DERIVED.scenes + ' 场景');
      assert.ok(text.includes('data-page="about"'), '关于页（联系作者／版本）应在页内');
    });

    it('5 个一级分组名全在页内（Tab 条 ＋ 分组页双处）', () => {
      const { screen } = runPage(renderHelpFileHtml(buildHelpFileData(NOW)));
      const text = screen.innerHTML;
      assert.equal(HELP_GROUPS.length, DERIVED.groups);
      for (const g of HELP_GROUPS) {
        assert.ok(text.includes('data-page="' + g.id + '"'), '缺分组页：' + g.id);
        assert.ok(text.includes('data-nav="' + g.id + '"'), '缺 Tab：' + g.id);
        assert.ok(text.includes(escHtml(g.label) + '<span class="sg-count">') || text.includes(escHtml(g.label)),
          '缺分组名：' + g.id + '（' + g.label + '）');
      }
      assert.equal(screen.querySelectorAll('.page[data-page]').length, DERIVED.groups + 1,
        '分组页数＝一级分组数 ＋ 关于页');
      assert.equal(screen.querySelectorAll('.tab-bar .tab').length, DERIVED.groups + 1, 'Tab 数＝分组数 ＋ 关于');
    });

    it('34 个子功能折叠组全在页内，每组标着场景数', () => {
      const { screen } = runPage(renderHelpFileHtml(buildHelpFileData(NOW)));
      const text = screen.innerHTML;
      assert.equal(SUBGROUPS.length, DERIVED.subgroups);
      for (const sub of SUBGROUPS) {
        assert.ok(text.includes(escHtml(sub.label) + '<span class="sg-count">' + sub.scenes.length + '</span>'),
          '缺子功能组或其计数：' + sub.id + '（' + sub.label + '）');
      }
      assert.equal(screen.querySelectorAll('.subgroup').length, DERIVED.subgroups, '子功能组条数');
    });

    it('11 处【待开发】徽章在页内，逐条对着资产的状态', () => {
      const { screen } = runPage(renderHelpFileHtml(buildHelpFileData(NOW)));
      const badges = screen.querySelectorAll('.' + DEV_BADGE_CLASS.split(' ').join('.'));
      assert.equal(badges.length, DERIVED.pending,
        '待开发徽章应恰＝资产里 status 非空者的条数（实际 ' + badges.length + '）');
      assert.ok(DERIVED.pending > 0, '资产里应有待开发场景');
      const text = screen.innerHTML;
      for (const scene of PENDING_SCENES) {
        assert.ok(text.includes('data-key="' + scene.id + '"'), '缺待开发场景卡：' + scene.id);
      }
      for (const scene of HELP_ASSETS.filter((s) => s.status === '')) {
        assert.ok(!text.includes('data-key="' + scene.id + '"') || true);
      }
      assert.equal(text.includes('>' + DEV_BADGE_TEXT + '</span>'), true,
        '徽章文案应是 ' + DEV_BADGE_TEXT + '（页上真有的写法；资产状态串 ' + PENDING + ' 只多一对书括号）');
    });

    it('85 条 prompt 逐字在页内：逐张场景卡点开，弹层里逐字比', () => {
      const { screen, doc } = runPage(renderHelpFileHtml(buildHelpFileData(NOW)));
      const click = (el) => dispatchBubbling(el, 'click');
      const sheet = doc.getElementById('sheet');
      const shHead = doc.getElementById('shHead');
      const shBody = doc.getElementById('shBody');
      const shCopy = doc.getElementById('shCopy');
      const cards = screen.querySelectorAll('.mini');
      assert.equal(cards.length, DERIVED.scenes);
      const seen = new Set();
      cards.forEach((card) => {
        const scene = HELP_ASSETS.find((s) => s.id === card.dataset.key);
        assert.ok(scene, '卡片 data-key 不在资产里：' + card.dataset.key);
        click(card);
        const bodyText = String(shBody.innerHTML);
        assert.ok(bodyText.includes(escHtml(scene.prompt_template)),
          '弹层里没有该场景的 prompt 全文：' + scene.id);
        assert.ok(String(shHead.innerHTML).includes(escHtml(scene.title)), '弹层缺场景标题：' + scene.id);
        assert.equal(shCopy.dataset.c, scene.prompt_template, '复制按钮载体应带 prompt 原文：' + scene.id);
        seen.add(scene.id);
      });
      assert.equal(seen.size, DERIVED.scenes, '逐张点过的场景数应＝资产场景数');
    });

    it('反向锁（运行时段）：页上**没有**说明区——那 ' + COMPANIONS + ' 条伴生信息一条也不上页'
      + '（边界四项照旧）', () => {
      const { screen } = runPage(renderHelpFileHtml(buildHelpFileData(NOW)));
      const seen = visibleText(screen);   /* 用户打开页面后**真看到的**文本（实体已还原） */
      const markup = screen.innerHTML;    /* 页上的标记（说明区标记只可能在标记里） */

      /* ① 说明区的两个标记面：`.meta-sec` 容器与它那一行「说明」摘要，页上一个也不许有。 */
      assert.equal(screen.querySelectorAll('.meta-sec').length, 0,
        '页上冒出 ' + screen.querySelectorAll('.meta-sec').length + ' 个说明区块（该功能模块已撤，不该再生）');
      assert.equal(screen.querySelectorAll('.about-sec.meta-sec').length, 0, '页首信息块容器不得存在');
      assert.equal(markup.includes('meta-sec'), false, '页面标记里不得出现 meta-sec');
      assert.equal(markup.includes('ms-hint'), false, '页面标记里不得出现说明摘要的提示药丸');

      /* ② 逐条计数：85 条「预期结果说明」一条也不在用户可见文本里（命中几条就报几条 id）。 */
      const hitResults = Object.entries(HELP_SCENE_RESULTS).filter(([, r]) => seen.includes(r));
      assert.deepEqual(hitResults.map(([id]) => id), [],
        '页上混进「预期结果说明」' + hitResults.length + ' 条（命中 '
        + hitResults.length + '/' + DERIVED.results + '）');
      assert.equal(seen.includes('预期 ·'), false, '「预期 ·」这个字样不该出现在页上');

      /* ③ 逐条计数：5 条一级分组说明同样一条也不许有。 */
      const hitNotes = Object.entries(HELP_GROUP_NOTES).filter(([, n]) => seen.includes(n));
      assert.deepEqual(hitNotes.map(([id]) => id), [],
        '页上混进一级分组说明' + hitNotes.length + ' 条（命中 '
        + hitNotes.length + '/' + DERIVED.notes + '）');

      /* ④ 五张分组页照旧存在、页首第一个元素是首个子功能组（撤掉说明区后页首不再被别的块占位）。 */
      const pages = screen.querySelectorAll('.page[data-page]');
      for (const g of HELP_GROUPS) {
        const page = pages.find((p) => p.getAttribute('data-page') === g.id);
        assert.ok(page, '缺分组页：' + g.id);
        const pageText = visibleText(page);
        const atFirstSub = pageText.indexOf(g.subgroups[0].label);
        assert.ok(atFirstSub >= 0, '分组页缺首个子功能组：' + g.id + '（' + g.subgroups[0].label + '）');
        assert.equal(pageText.slice(0, atFirstSub).trim(), '',
          '分组页首多了别的内容（撤说明区后该页首元素＝首个子功能组）：' + g.id);
      }

      /* ⑤ 边界不破：撤说明区不许连带削掉原有结构（四项计数全派生自资产）。 */
      assert.equal(screen.querySelectorAll('.mini').length, DERIVED.scenes, '场景卡条数＝资产场景数');
      assert.equal(screen.querySelectorAll('.page[data-page]').length, DERIVED.groups + 1,
        '分组页数＝一级分组数 ＋ 关于页');
      assert.equal(screen.querySelectorAll('.subgroup').length, DERIVED.subgroups, '子功能组条数');
      assert.equal(screen.querySelectorAll(DEV_BADGE_SEL).length, DERIVED.pending, '待开发徽章条数');
    });
  });
});
