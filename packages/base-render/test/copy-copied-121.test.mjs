/** #121 复制按钮 `copied` 态（H-16 JS 侧）——**无浏览器**也能跑的产出面 ＋ 行为面测试。
 *
 *  被验对象：`packages/base-render/src/controls.ts` 的 `buildSharedHelpersJs()` 复制反馈路径
 *  ＋ `packages/base-render/src/style.ts` 的 `copied` 态 CSS（`copyButton` 区既有 ＋ helpShell 区新增）。
 *
 *  为什么**不用**只查字符串出现：字符串断言在「变异掉 markCopied 调用但留下常量文本」时仍会绿。
 *  本文件因此分两层：
 *    ① 静态面（S1–S4）：产出文本 ＋ 产出 CSS 的**跨文件一致性**（450ms 数值同源、类名逐字、两处 CSS 命中面）；
 *    ② 行为面（B1–B6）：把**真实产出文本**塞进本文件自带的**最小 DOM 桩**里跑——
 *       成功／失败／兜底三条路径的类名与 toast 结果逐条判，变异 `markCopied` 必红。
 *  真实浏览器（CDP 真手势 ＋ computed 背景）证据见 `docs/research/t121-browser-evidence.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION_ID_ATTR,
  COPY_TEXT_DEFAULTS,
  DEFAULT_DATA_ATTR,
  HELP_COPY_ACTIONS,
  STYLE_PREFIX,
  buildSharedHelpersJs,
  buildStyleSheet,
} from '../dist/index.js';

const LF = String.fromCharCode(10);
const HELPERS = buildSharedHelpersJs();
const CSS = buildStyleSheet().css;
const COPIED = 'copied';

/* ── CSS 规则块解析（同 `style.test.mjs` 口径：选择器级，不做子串匹配） ───── */

function ruleBlocks(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const decls = m[2].split(';').map((d) => d.trim()).filter(Boolean);
    // 选择器文本里的注释与换行必须去掉（`/* copy-button */` 会粘在 `.ilife-copy-btn` 前面）
    const head = m[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const raw of head.split(',')) {
      const selector = raw.split(LF).map((s) => s.trim()).filter(Boolean).pop() ?? '';
      if (selector !== '' && !selector.startsWith('@')) out.push({ selector, decls });
    }
  }
  return out;
}
const blocksOf = (css, selector) => ruleBlocks(css).filter((b) => b.selector === selector);
const declValue = (block, prop) => {
  const hit = block.decls.find((d) => d.startsWith(prop + ':'));
  return hit === undefined ? null : hit.slice(prop.length + 1).trim();
};

/* ── 最小 DOM 桩（只实现 helpers 复制路径真正用到的 API；classList 故意抛错当纯度陷阱） ── */

class StubNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = new Map();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.style = {};
    this.hidden = false;
    this.value = '';
    this.type = '';
  }

  setAttribute(name, value) { this.attrs.set(String(name), String(value)); }
  getAttribute(name) { return this.attrs.has(String(name)) ? this.attrs.get(String(name)) : null; }
  hasAttribute(name) { return this.attrs.has(String(name)); }

  appendChild(child) {
    if (child.parentNode !== null) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parentNode = null;
    return child;
  }

  insertBefore(child, ref) {
    const i = this.children.indexOf(ref);
    if (i < 0) return this.appendChild(child);
    if (child.parentNode !== null) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.splice(i, 0, child);
    return child;
  }

  replaceChild(next, old) {
    const i = this.children.indexOf(old);
    if (i >= 0) this.children[i] = next;
    next.parentNode = this;
    old.parentNode = null;
    return old;
  }

  get firstChild() { return this.children.length > 0 ? this.children[0] : null; }

  /** 纯度陷阱：helpers 的约定是**不用** `classList`（类名走 `className` 字符串）。 */
  get classList() { throw new Error('#121 纯度违约：helpers 不得使用 classList'); }

  select() { this.selected = true; }
  addEventListener() { /* 委派一律挂 document 上 */ }
  querySelector() { return null; }
  querySelectorAll() { return []; }

  closest(selector) {
    let node = this;
    while (node !== null) {
      if (matches(node, selector)) return node;
      node = node.parentNode;
    }
    return null;
  }
}

function matches(node, selector) {
  if (selector.startsWith('.')) return (' ' + node.className + ' ').includes(' ' + selector.slice(1) + ' ');
  const attr = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(selector);
  if (attr !== null) {
    if (!node.hasAttribute(attr[1])) return false;
    return attr[2] === undefined || node.getAttribute(attr[1]) === attr[2];
  }
  return false;
}

function descendants(root) {
  const out = [];
  const walk = (n) => { for (const c of n.children) { out.push(c); walk(c); } };
  walk(root);
  return out;
}

class StubDocument {
  constructor() {
    this.documentElement = new StubNode('html');
    this.body = new StubNode('body');
    this.body.parentNode = this.documentElement;
    this.listeners = new Map();
    this.execCommandResult = true;
    this.execCommandCalls = [];
  }

  createElement(tag) { return new StubNode(tag); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  dispatch(type, event) { for (const fn of this.listeners.get(type) ?? []) fn(event); }
  execCommand(cmd) { this.execCommandCalls.push(cmd); return this.execCommandResult; }
  querySelector(selector) { return descendants(this.body).find((n) => matches(n, selector)) ?? null; }
  querySelectorAll() { return []; }
}

/** 起一页「无 HELP 壳」的最小现场（`initHelpShell()` 因此逐项早退，只留复制路径）。 */
function runHelpers({ clipboard, execCommandResult = true } = {}) {
  const doc = new StubDocument();
  doc.execCommandResult = execCommandResult;
  const win = { matchMedia: undefined };
  const nav = {};
  if (clipboard !== undefined) nav.clipboard = clipboard;
  // eslint-disable-next-line no-new-func
  new Function('document', 'window', 'navigator', HELPERS)(doc, win, nav);
  const btn = doc.createElement('button');
  btn.className = STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost';
  btn.setAttribute(ACTION_ID_ATTR, HELP_COPY_ACTIONS.prompt.actionId);
  btn.setAttribute(DEFAULT_DATA_ATTR, 'PAYLOAD');
  doc.body.appendChild(btn);
  return { doc, btn };
}

const hasCopied = (el) => (' ' + el.className + ' ').includes(' ' + COPIED + ' ');
const click = (doc, btn) => doc.dispatch('click', { target: btn });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const toasts = (doc) => {
  const host = descendants(doc.body).find((n) => matches(n, '.' + STYLE_PREFIX + 'toast-stack'));
  return host === undefined ? [] : host.children;
};
const titleOf = (box) => {
  const t = descendants(box).find((n) => matches(n, '.' + STYLE_PREFIX + 'toast-title'));
  return t === undefined ? null : t.textContent;
};

/* ══════════════════════════════════════════════════════════════
 * ① 静态面：产出文本 ＋ 产出 CSS 的跨文件一致性
 * ══════════════════════════════════════════════════════════════ */

describe('#121 产出面（静态）', () => {
  it('S1 类名逐字 `copied`（规格值，无 `ilife-` 前缀）＋ 常量唯一', () => {
    assert.equal((HELPERS.match(/var COPIED_CLASS = /g) ?? []).length, 1, '只允许一处 COPIED_CLASS 声明');
    assert.ok(HELPERS.includes('var COPIED_CLASS = "' + COPIED + '";'), '类名必须是规格逐字 `copied`');
    assert.ok(!HELPERS.includes('"' + STYLE_PREFIX + COPIED + '"'), '`copied` 不得加 ilife- 前缀');
    // 纯度口径不被本票破坏（T28／S4-1 同口径）
    assert.ok(!HELPERS.includes('classList'), 'helpers 不得用 classList');
    assert.ok(!/\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(HELPERS), '不得向 window／globalThis 赋值');
    assert.ok(!/(?:from|import\s*\(|require\s*\()\s*['"]node:/.test(HELPERS), '不得引 node:');
    assert.ok(!HELPERS.includes('<canvas'), '不得出现 <canvas>');
  });

  it('S2 450ms 同源：产出 JS 的 COPIED_MS 与产出 CSS 的弹簧时长逐值一致（改一侧即红）', () => {
    const m = /var COPIED_MS = (\d+);/.exec(HELPERS);
    assert.ok(m !== null, '产出必须注入 COPIED_MS');
    const copiedMs = Number(m[1]);
    assert.equal(copiedMs, 450, 'H-16 逐字 450ms（docs/visual-spec-help.md:195,197）');
    // CSS 侧：`.ilife-copy-btn` 基座与两个 helpShell 复制按钮基座都必须声明同一条 450ms 弹簧。
    const bases = [
      '.' + STYLE_PREFIX + 'copy-btn',
      '.' + STYLE_PREFIX + 'help-shell-btn',
      '.' + STYLE_PREFIX + 'help-shell-card-copy',
    ];
    for (const selector of bases) {
      const hits = blocksOf(CSS, selector);
      assert.ok(hits.length >= 1, selector + ' 必须有基座规则块');
      const spring = hits.map((b) => declValue(b, 'transition'))
        .find((v) => v !== null && v.includes('transform .45s cubic-bezier(.34, 1.56, .64, 1)'));
      assert.ok(spring !== undefined, selector + ' 基座必须带 450ms 弹簧过渡（实测 '
        + JSON.stringify(hits.map((b) => declValue(b, 'transition'))) + '）');
      assert.equal(copiedMs / 1000, 0.45, 'JS 侧 450ms 必须等于 CSS 侧 .45s（同源数值）');
    }
  });

  it('S3 `copied` 态 CSS 命中面齐全：通用复制按钮 ＋ helpShell 两个复制按钮（成功色 token `--ok`）', () => {
    const cases = [
      ['.' + STYLE_PREFIX + 'copy-btn.' + COPIED, '.' + STYLE_PREFIX + 'copy-btn'],
      ['.' + STYLE_PREFIX + 'help-shell-btn.' + COPIED, '.' + STYLE_PREFIX + 'help-shell-btn'],
      ['.' + STYLE_PREFIX + 'help-shell-card-copy.' + COPIED, '.' + STYLE_PREFIX + 'help-shell-card-copy'],
    ];
    for (const [selector] of cases) {
      const hit = blocksOf(CSS, selector);
      assert.equal(hit.length, 1, selector + ' 必须有且仅一条规则块');
      assert.equal(declValue(hit[0], 'background'), 'var(--ok)', selector + ' 背景必须取成功色 token `--ok`');
      assert.equal(declValue(hit[0], 'border-color'), 'var(--ok)', selector + ' 边框必须取成功色 token `--ok`');
      assert.ok(!selector.includes(STYLE_PREFIX + COPIED), '`copied` 类名不得加 ilife- 前缀');
    }
  });

  it('S4 `markCopied` 只在**成功**分支被调用（定义 1 处／调用 3 处；失败分支零调用）', () => {
    // 定义 1 处 ＋ 调用 3 处（clipboard promise 回调／clipboard 同步返回／execCommand 兜底为真）
    assert.equal((HELPERS.match(/markCopied\(/g) ?? []).length, 4,
      'markCopied 必须恰好 1 处定义 ＋ 3 处调用（三条成功出口）');
    assert.ok(/\.then\(function \(\) \{ markCopied\(btn\); feedback\(OK_MSG, false, fmt\); \}/.test(HELPERS),
      '通道 1（clipboard）resolve 回调必须先 markCopied 再出成功反馈');
    assert.ok(/if \(done\) markCopied\(btn\);/.test(HELPERS),
      '通道 2（execCommand 兜底）必须仅在 done 为真时 markCopied');
    assert.ok(!/feedback\(done \? OK_MSG : FAIL_MSG, !done\);\s*markCopied/.test(HELPERS),
      'markCopied 不得落在无条件路径上（失败也不得变绿）');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ② 行为面：真实产出文本 ＋ 最小 DOM 桩（无浏览器）
 * ══════════════════════════════════════════════════════════════ */

describe('#121 运行时行为（产出文本 ＋ DOM 桩，无浏览器）', () => {
  it('B1 通道 1 成功 → 按钮获得 `copied` 类，450ms 后回落', async () => {
    const calls = [];
    const { doc, btn } = runHelpers({ clipboard: { writeText: (t) => { calls.push(t); return Promise.resolve(); } } });
    assert.equal(hasCopied(btn), false, '点击前不得有 copied');
    click(doc, btn);
    await sleep(30);
    assert.deepEqual(calls, ['PAYLOAD'], '必须把 data-t 原文交给 clipboard.writeText');
    assert.equal(hasCopied(btn), true, '成功后必须加 copied');
    await sleep(300);
    assert.equal(hasCopied(btn), true, '300ms 时仍必须在 copied 态（450ms 未到）');
    await sleep(240);
    assert.equal(hasCopied(btn), false, '450ms 后必须回落（类名移除）');
    assert.equal(btn.className, STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost',
      '回落必须逐字恢复原 className（不得残留空白／重复类名）');
  });

  it('B2 通道 2（execCommand 兜底）成功 → 同样加 `copied`', async () => {
    const { doc, btn } = runHelpers({ execCommandResult: true });
    click(doc, btn);
    await sleep(30);
    assert.deepEqual(doc.execCommandCalls, ['copy'], '无 clipboard 时必须走 execCommand 兜底');
    assert.equal(hasCopied(btn), true, '兜底成功也必须加 copied（两条通道同反馈）');
    await sleep(520);
    assert.equal(hasCopied(btn), false, '同样必须回落');
  });

  it('B3 两通道皆失败 → **不得**出现 `copied`（不静默变绿）＋ danger toast 显式失败', async () => {
    const { doc, btn } = runHelpers({
      clipboard: { writeText: () => Promise.reject(new Error('denied')) },
      execCommandResult: false,
    });
    click(doc, btn);
    await sleep(60);
    assert.equal(hasCopied(btn), false, '失败路径必须零 copied（不得静默变绿）');
    const boxes = toasts(doc);
    assert.equal(boxes.length, 1, '失败必须出一枚 toast');
    assert.ok((' ' + boxes[0].className + ' ').includes('danger'), '失败 toast 必须是危险态（显式失败）');
    assert.equal(titleOf(boxes[0]), COPY_TEXT_DEFAULTS.failMessage, '失败文案必须取冻结常量');
    await sleep(520);
    assert.equal(hasCopied(btn), false, '失败路径事后也不得变绿');
  });

  it('B4 连点两次不抛错，且最终回到常态（时序语义：后一次点击不延长窗口，实现记账）', async () => {
    const { doc, btn } = runHelpers({ clipboard: { writeText: () => Promise.resolve() } });
    click(doc, btn);
    await sleep(150);
    click(doc, btn);
    await sleep(60);
    assert.equal(hasCopied(btn), true, '第二次点击时仍在 copied 态（addClass 幂等）');
    await sleep(420);
    assert.equal(hasCopied(btn), false, '首次点击的 450ms 计时到期即回落（不延长）');
    await sleep(200);
    assert.equal(hasCopied(btn), false, '之后不得再出现 copied');
  });

  it('B5 按钮被移出 DOM 后计时到期不抛错（removeClass 只操作节点自身）', async () => {
    const { doc, btn } = runHelpers({ clipboard: { writeText: () => Promise.resolve() } });
    click(doc, btn);
    await sleep(30);
    assert.equal(hasCopied(btn), true, '前置：必须在 copied 态');
    doc.body.removeChild(btn);
    await sleep(520);
    assert.equal(hasCopied(btn), false, '离页后仍须按时清除类名（不留残留状态）');
  });

  it('B6 非复制按钮（无 data-t）点击 → 不复制、不加类、不出 toast', async () => {
    const calls = [];
    const { doc } = runHelpers({ clipboard: { writeText: (t) => { calls.push(t); return Promise.resolve(); } } });
    const plain = doc.createElement('button');
    plain.setAttribute(ACTION_ID_ATTR, 'ilife-demo-open');
    doc.body.appendChild(plain);
    click(doc, plain);
    await sleep(60);
    assert.deepEqual(calls, [], '无 data-t 的按钮不得触发复制');
    assert.equal(hasCopied(plain), false, '不得给它加 copied');
    assert.equal(toasts(doc).length, 0, '不得出 toast');
  });
});
