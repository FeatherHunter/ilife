/** #693 · HELP 提示栈回归锁：运行时创建的提示栈必须带 CSS 那条 fixed 定位规则用的类名。
 *
 * 为什么是这一层（票面根因）：
 *  提示栈的定位样式（`position:fixed` ＋ `bottom:calc(24px + env(safe-area-inset-bottom,0))`
 *  ＋ `z-index:9999`）按**类名** `.hm-toast-stack` 下发，而运行时创建栈元素时只写了 `id`——
 *  选择器与元素对不上，定位从未生效，提示落在文档流末尾：长页视口内看不见，滚到底被固定
 *  底栏（`.tab-bar`）盖住，只露一点黑边。本文件把「栈元素必须匹配定位选择器」钉成机读断言，
 *  并把提示栈契约（容量／超时／同一栈）一并锁住。
 *
 * 取的是**产出物本身**（`HELP_SHELL_SUFFIX`，即各技能 HELP 落盘文件里那段运行时），不是复制品：
 *  模板源 → `gen:help-shell` → `src/helpShell.ts` → `dist`，这条链的另一端由
 *  `help-shell-136.test.mjs` 的哈希锁守；本文件守「链尾这段 JS 真给出的 DOM 与 CSS 对得上」。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/base-render`，
 *  再 `node --test packages/base-render/test/help-toast-stack-693.test.mjs`。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { HELP_SHELL_SUFFIX } from '../dist/helpShell.js';

/* ── ① 从产出物里取出两样真相同源：toast 运行时 IIFE、它自带的那张 CSS 串 ── */

/** toast 运行时 IIFE：`var stack = null;` 之前的那个 `(function(){` 起，到 `__hmToastFlush` 之后收尾。 */
function extractToastRuntime(suffix) {
  const anchor = suffix.indexOf('var stack = null;');
  assert.ok(anchor > 0, '产出物里找不到 toast 运行时（`var stack = null;`）——模板改过？');
  const start = suffix.lastIndexOf('(function(){', anchor);
  assert.ok(start > 0, '找不到 toast 运行时的 IIFE 起点');
  const flushAt = suffix.indexOf('window.__hmToastFlush', anchor);
  assert.ok(flushAt > 0, '找不到运行时收尾锚点 `window.__hmToastFlush`');
  const end = suffix.indexOf('})();', flushAt);
  assert.ok(end > 0, '找不到 toast 运行时的 IIFE 终点');
  return suffix.slice(start, end + '})();'.length);
}

/** 运行时自带并注入 `#hm-toast-style` 的那张 CSS 串（`var CSS = '…';`）。 */
function extractInjectedCss(runtime) {
  const at = runtime.indexOf('var CSS = ');
  assert.ok(at > 0, '运行时里找不到注入样式 `var CSS = `');
  const from = runtime.indexOf("'", at);
  const to = runtime.indexOf("';", from);
  assert.ok(from > 0 && to > from, '注入样式串没接上');
  return runtime.slice(from + 1, to);
}

/** 运行时自带的转义函数 `esc`（与 toast 同属产出物那段脚本，函数声明在 IIFE 之外，须一并取出）。 */
function extractEsc(suffix) {
  const line = suffix.split(/\r?\n/).find((l) => l.startsWith('function esc(s){'));
  assert.ok(line, '产出物里找不到 `function esc(s){`——模板改过？');
  return line;
}

const RUNTIME = extractToastRuntime(HELP_SHELL_SUFFIX);
const ESC = extractEsc(HELP_SHELL_SUFFIX);
const INJECTED_CSS = extractInjectedCss(RUNTIME);
/** 沙箱脚本＝产出物自己的两段（转义函数 ＋ toast 运行时），不另写一份替身。 */
const SCRIPT = ESC + '\n' + RUNTIME;

/** 拆规则（`选择器{声明}`；本串无 `@media` 内层块与相对单位换算的坑）。 */
function cssRules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim().replace(/\s+/g, ' '),
    body: m[2],
  }));
}

/** 定位规则＝带 `position:fixed` 的那条；选择器必须是单个类（`.x`），栈元素才靠类名对上。 */
function fixedRule(css) {
  const hits = cssRules(css).filter((r) => /(?:^|;)\s*position\s*:\s*fixed/.test(r.body));
  assert.equal(hits.length, 1, '注入样式里带 position:fixed 的规则应恰一条（提示栈），实测 ' + hits.length);
  const selector = hits[0].selector;
  assert.match(selector, /^\.[\w-]+$/, '定位规则的选择器须是单个类名，实测 ' + selector);
  return hits[0];
}

const STACK_RULE = fixedRule(INJECTED_CSS);
const STACK_CLASS = STACK_RULE.selector.slice(1);

/* ── ② 最小 DOM 桩（只实现这段运行时真正用到的面；不引 jsdom，仓内也没有） ── */

const ATTR_RE = /([\w-]+)(?:\s*=\s*"([^"]*)")?/g;

function parseMarkup(src) {
  const roots = [];
  const stack = [];
  const push = (node) => {
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
  };
  const re = /<([a-zA-Z][\w-]*)((?:\s+[\w-]+(?:\s*=\s*"[^"]*")?)*)\s*\/?>|<\/([a-zA-Z][\w-]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[1]) {
      const attrs = {};
      for (const a of m[2].matchAll(ATTR_RE)) attrs[a[1]] = a[2] ?? '';
      const node = createNode(m[1].toLowerCase(), attrs);
      push(node);
      stack.push(node);
    } else if (m[3]) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === m[3].toLowerCase()) { stack.length = i; break; }
      }
    } else if (m[4]) {
      const node = createNode('#text');
      node.text = m[4];
      push(node);
    }
  }
  return roots;
}

function createNode(tag, attrs = {}) {
  const node = {
    tag,
    attrs: { ...attrs },
    children: [],
    parent: null,
    text: '',
    isConnected: true,
    get className() { return this.attrs.class ?? ''; },
    set className(v) { this.attrs.class = String(v); },
    get id() { return this.attrs.id ?? ''; },
    set id(v) { this.attrs.id = String(v); },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
    hasAttribute(name) { return name in this.attrs; },
    appendChild(child) { child.parent = this; this.children.push(child); return child; },
    removeChild(child) {
      const at = this.children.indexOf(child);
      if (at >= 0) this.children.splice(at, 1);
      return child;
    },
    remove() { this.isConnected = false; if (this.parent) this.parent.removeChild(this); },
    set innerHTML(v) { this.children = parseMarkup(String(v)); for (const c of this.children) c.parent = this; },
    get innerHTML() { return ''; },
    set textContent(v) { this.text = String(v); this.children = []; },
    get textContent() { return this.text + this.children.map((c) => c.textContent).join(''); },
    addEventListener() {},
    querySelectorAll(sel) { return descendants(this).filter((n) => matches(n, sel)); },
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; },
  };
  node.classList = {
    contains: (c) => (node.attrs.class ?? '').split(/\s+/).includes(c),
    add: (c) => { const set = new Set((node.attrs.class ?? '').split(/\s+/).filter(Boolean)); set.add(c); node.attrs.class = [...set].join(' '); },
    remove: (c) => { node.attrs.class = (node.attrs.class ?? '').split(/\s+/).filter((x) => x && x !== c).join(' '); },
  };
  return node;
}

function descendants(root) {
  const out = [];
  const walk = (n) => { for (const c of n.children) { out.push(c); walk(c); } };
  walk(root);
  return out;
}

/** 只认 `tag`／`.cls`／`tag.cls`（本件用到的选择器就这几种）。 */
function matches(node, sel) {
  for (const part of sel.trim().split(/\s+/)) {
    const tag = /^[a-zA-Z][\w-]*/.exec(part)?.[0] ?? null;
    const cls = [...part.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    if (tag && node.tag !== tag.toLowerCase()) return false;
    if (!cls.every((c) => node.classList.contains(c))) return false;
  }
  return true;
}

/** 起一个装了 toast 运行时的假页面：返回 window／document 与定时器记录。 */
function mountRuntime() {
  const timers = [];
  let mobile = false;
  const document = {
    head: createNode('head'),
    body: createNode('body'),
    createElement: (tag) => createNode(tag),
  };
  const window = {
    matchMedia: (q) => ({ matches: mobile && /max-width:\s*820px/.test(q), media: q }),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    requestAnimationFrame: (fn) => { fn(0); return 1; },
  };
  const sandbox = { window, document, navigator: {}, requestAnimationFrame: window.requestAnimationFrame, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(SCRIPT, sandbox, { filename: 'help-toast-runtime.js' });
  return {
    window,
    document,
    timers,
    setMobile: (v) => { mobile = v; },
    /** 栈元素＝运行时第一个追加进 body 的子节点。 */
    stack: () => document.body.children[0] ?? null,
  };
}

const CARD = '已复制';
const DETAIL = '粘贴给 AI';

test('#693 ① 栈元素必须匹配定位选择器：CSS 按类名下发，运行时就得给同一个类名', () => {
  const page = mountRuntime();
  page.window.toast(CARD, DETAIL, { icon: 'copy' });
  const stack = page.stack();
  assert.ok(stack, '运行时没有把提示栈挂进 body');
  assert.ok(
    matches(stack, STACK_RULE.selector),
    '提示栈元素不匹配定位选择器 ' + STACK_RULE.selector
      + '（实测 class=`' + stack.className + '` id=`' + stack.id + '`）——定位不生效，提示会落在文档流末尾',
  );
  // 反向自证：匹配器不是恒真——只带 id 的同种元素必须不匹配类选择器（正是修前的形状）。
  const idOnly = createNode('div', { id: STACK_CLASS });
  assert.equal(matches(idOnly, STACK_RULE.selector), false, '匹配器恒真：只带 id 的元素不该匹配类选择器');
  // id 保留（兼容旧引用）：修前只有它，修后与类名并存。
  assert.equal(stack.id, STACK_CLASS, '栈的 id 不该被顺手删掉（旧引用还在用它定位现场）');
});

test('#693 ② 定位规则本体仍锁在视口底部（悬浮、居中、压过固定底栏）', () => {
  assert.match(STACK_RULE.body, /(?:^|;)\s*position\s*:\s*fixed/, '定位规则丢了 position:fixed');
  assert.match(STACK_RULE.body, /bottom\s*:\s*calc\(24px\s*\+\s*env\(safe-area-inset-bottom,0\)\)/, '底部锚点变了');
  assert.match(STACK_RULE.body, /left\s*:\s*50%/, '水平锚点变了');
  assert.match(STACK_RULE.body, /transform\s*:\s*translateX\(-50%\)/, '居中变换丢了');
  const z = /(?:^|;)\s*z-index\s*:\s*(\d+)/.exec(STACK_RULE.body);
  assert.ok(z, '定位规则缺 z-index');
  assert.ok(Number(z[1]) > 600, 'z-index ' + z[1] + ' 压不过固定底栏（.tab-bar z-index:600）——滚到底会被盖住');
});

test('#693 ③ 提示卡挂在栈下：多条提示共用一个栈（不各挂 body、不另起栈）', () => {
  const page = mountRuntime();
  for (const msg of [CARD, CARD]) page.window.toast(msg, DETAIL, { icon: 'copy' });
  const stack = page.stack();
  assert.equal(page.document.body.children.length, 1, 'body 下应只有栈这一个节点（提示卡不许直挂 body）');
  assert.equal(stack.children.length, 2, '两条提示都应落在同一个栈里，实测 ' + stack.children.length);
  assert.ok(
    stack.children.every((n) => n.className !== ''),
    '栈里的节点没有类名：' + stack.children.map((n) => `[${n.tag}]`).join(' / '),
  );
});

test('#693 ④ 栈契约不变：桌面 5 条／窄视口 3 条／单条 4500ms 自逝', () => {
  const page = mountRuntime();
  for (let i = 0; i < 6; i += 1) page.window.toast(CARD, DETAIL, { icon: 'copy' });
  assert.equal(page.stack().children.length, 5, '桌面容量应恰 5 条（第 6 条挤掉最旧）');
  assert.ok(page.timers.some((t) => t.ms === 4500), '单条寿命应仍是 4500ms，实测 ' + JSON.stringify(page.timers.map((t) => t.ms)));

  const narrow = mountRuntime();
  narrow.setMobile(true);
  for (let i = 0; i < 6; i += 1) narrow.window.toast(CARD, DETAIL, { icon: 'copy' });
  assert.equal(narrow.stack().children.length, 3, '窄视口（≤820px）容量应仍是 3 条');
});

test('#693 ⑤ 换模板名同改：「注入样式的类名」与「运行时给的类名」是同一条真相同源', () => {
  // 这条断的不是字面量本身，而是**两处不许各写各的**：栈类名只有一个来源（注入样式那条规则），
  // 运行时给栈元素的就是它——有人把 CSS 改名而不动运行时（或反过来），本断言必红。
  const page = mountRuntime();
  page.window.toast(CARD, DETAIL, { icon: 'copy' });
  const stack = page.stack();
  const ruleClass = STACK_RULE.selector.slice(1);
  assert.ok(stack.classList.contains(ruleClass), '运行时给的类名不是注入样式那条规则的类名');
  assert.equal(
    stack.className.split(/\s+/).filter((c) => c === ruleClass).length, 1,
    '同一个类名给了两次（多写一份真相）',
  );
});

test('#693 ⑥ 警告态（参数没填全那条提示）与成功态同一个栈', () => {
  // 页面里两类提示都走同一个 `window.toast`：成功态（复制成功）与警告态
  // （`toastMsg` 的「请先填写…」＋未完成徽章）。两者必须落在同一个悬浮栈里。
  const page = mountRuntime();
  page.window.toast('请先填写: 重量', '填写完整后再复制指令', { icon: 'warn', badge: { text: '未完成', type: 'warn' } });
  const stack = page.stack();
  assert.ok(matches(stack, STACK_RULE.selector), '警告态提示的栈没匹配定位选择器 ' + STACK_RULE.selector);
  assert.equal(stack.children.length, 1, '警告态提示没落进栈里');
  assert.match(stack.children[0].textContent, /未完成/, '警告徽章没渲染进提示卡：' + stack.children[0].textContent);
});
