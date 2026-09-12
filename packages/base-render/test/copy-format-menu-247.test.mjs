/** #247 复制数据的三格式三选一菜单——产出面 ＋ 运行时行为（node:test，无浏览器）。
 *
 *  被验对象：`renderActionBar` 的三格式分支（`CopyButtonInput.formats`）、`renderCopyBlock` 的
 *  `dataFormats`、`style.ts` copyButton 区的菜单规则、`buildSharedHelpersJs()` 产出的菜单委派。
 *
 *  为什么分两层（同 #121 的口径）：只看字符串，「把三项的 data-t 都写成第一项」这种缺陷照样绿；
 *  故 ① 静态面逐值钉产出标记与 CSS，② 行为面把**真实产出文本**塞进本文件自带的最小 DOM 桩里跑——
 *  点开合器 → 菜单开；点某一项 → 复制的是**那一项**的文本 ＋ 提示报**所选格式**。
 *
 *  来源（2026-09-12 用户裁定「恢复老仓原样」）：老仓 `.fmt-menu` 三选一，见
 *  `D:\2Study\StudyNotes\SKILLS\卡路里\templates\crud_receipt.html` 的可点版本 `2262fee1~1`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION_BAR_DEFAULTS,
  ACTION_ID_ATTR,
  COPY_ACTION_IDS,
  COPY_FORMATS,
  COPY_TEXT_DEFAULTS,
  DEFAULT_DATA_ATTR,
  STYLE_PREFIX,
  buildSharedHelpersJs,
  buildStyleSheet,
  renderActionBar,
} from '../dist/index.js';
import { renderCopyBlock } from '../dist/blocks.js';

const LF = String.fromCharCode(10);
const HELPERS = buildSharedHelpersJs();
const CSS = buildStyleSheet().css;

const MENU_OPEN_ATTR = 'data-fmt-open';
const MENU_FMT_ATTR = 'data-fmt';
const MENU_OPEN_CLASS = 'copy-menu-open';
const HINTS = ['粘贴给 AI / 自己看', '结构化存档', '表格导入'];
const TEXTS = { text: '【纯文本】\n第一行', json: '{ "kind": "json" }', csv: 'section,row\nstatus,ok' };

/** 三格式形态的 actionBar（被测对象的主要入口）。 */
function menuBar() {
  return renderActionBar({
    copyData: {
      actionId: COPY_ACTION_IDS.actionBar.copyData,
      formats: { ...TEXTS, hints: HINTS },
    },
    copyLog: { actionId: COPY_ACTION_IDS.actionBar.copyLog, text: 'LOG' },
  });
}

/** 取某属性的**全部**取值（顺序即文档序）。 */
function attrsOf(html, name) {
  return [...html.matchAll(new RegExp(name + '="([^"]*)"', 'g'))].map((m) => m[1]);
}

/* ── CSS 规则块（同 `style.test.mjs` 口径：选择器级） ───────────────────── */

function ruleBlocks(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const decls = m[2].split(';').map((d) => d.trim()).filter(Boolean);
    const head = m[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const raw of head.split(',')) {
      const selector = raw.split(LF).map((s) => s.trim()).filter(Boolean).pop() ?? '';
      if (selector !== '' && !selector.startsWith('@')) out.push({ selector, decls });
    }
  }
  return out;
}
const blocksOf = (selector) => ruleBlocks(CSS).filter((b) => b.selector === selector);
const declValue = (block, prop) => {
  const hit = block.decls.find((d) => d.startsWith(prop + ':'));
  return hit === undefined ? null : hit.slice(prop.length + 1).trim();
};

/* ── 最小 DOM 桩（只实现 helpers 菜单／复制路径用到的 API；classList 故意抛错当纯度陷阱） ── */

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

  get firstChild() { return this.children.length > 0 ? this.children[0] : null; }

  get classList() { throw new Error('#247 纯度违约：helpers 不得使用 classList'); }

  select() { this.selected = true; }
  addEventListener() { /* 委派一律挂 document 上 */ }

  querySelector(selector) {
    return descendants(this).find((n) => matches(n, selector)) ?? null;
  }

  querySelectorAll(selector) {
    return descendants(this).filter((n) => matches(n, selector));
  }

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

/** 后代（不含自身），文档序。 */
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
  }

  createElement(tag) { return new StubNode(tag); }
  createTextNode(text) { const n = new StubNode('#text'); n.textContent = text; return n; }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  dispatch(type, event) { for (const fn of this.listeners.get(type) ?? []) fn(event); }
  execCommand() { return this.execCommandResult; }
  querySelector(selector) { return descendants(this.body).find((n) => matches(n, selector)) ?? null; }
  querySelectorAll(selector) { return descendants(this.body).filter((n) => matches(n, selector)); }
}

/** 造菜单按钮（开合器 ＋ 一个菜单容器 ＋ 三项）：与 `renderActionBar` 的三格式产出同形。 */
function makeMenu() {
  const wrap = new StubNode('div');
  wrap.className = STYLE_PREFIX + 'copy-menu-wrap';
  const opener = new StubNode('button');
  opener.className = STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost';
  opener.setAttribute(MENU_OPEN_ATTR, '1');
  opener.setAttribute('aria-expanded', 'false');
  const menu = new StubNode('div');
  menu.className = STYLE_PREFIX + 'copy-menu';
  const items = {};
  for (const key of COPY_FORMATS) {
    const item = new StubNode('button');
    item.className = STYLE_PREFIX + 'copy-menu-item';
    item.setAttribute(MENU_FMT_ATTR, key);
    item.setAttribute(DEFAULT_DATA_ATTR, TEXTS[key]);
    const label = new StubNode('span');
    label.className = STYLE_PREFIX + 'copy-menu-label';
    label.textContent = key;
    const hint = new StubNode('span');
    hint.className = STYLE_PREFIX + 'copy-menu-hint';
    hint.textContent = HINTS[COPY_FORMATS.indexOf(key)];
    item.appendChild(label);
    item.appendChild(hint);
    menu.appendChild(item);
    items[key] = item;
  }
  wrap.appendChild(opener);
  wrap.appendChild(menu);
  return { wrap, opener, menu, items };
}

/** 起一页最小现场：真实 helpers 产出 ＋ 真菜单 DOM。 */
function runMenu({ clipboard } = {}) {
  const doc = new StubDocument();
  const nav = {};
  if (clipboard !== undefined) nav.clipboard = clipboard;
  // eslint-disable-next-line no-new-func
  new Function('document', 'window', 'navigator', HELPERS)(doc, { matchMedia: undefined }, nav);
  const { wrap, opener, menu, items } = makeMenu();
  doc.body.appendChild(wrap);
  return { doc, wrap, opener, menu, items };
}

const click = (doc, node) => doc.dispatch('click', { target: node });
const isOpen = (menu) => (' ' + menu.className + ' ').includes(' ' + MENU_OPEN_CLASS + ' ');
const toasts = (doc) => {
  const host = descendants(doc.body).find((n) => matches(n, '.' + STYLE_PREFIX + 'toast-stack'));
  return host === undefined ? [] : host.children;
};
const titleOf = (box) => {
  const t = descendants(box).find((n) => matches(n, '.' + STYLE_PREFIX + 'toast-title'));
  return t === undefined ? null : t.textContent;
};

/* ══════════════════════════════════════════════════════════════
 * ① 静态面：产出标记 ＋ CSS
 * ══════════════════════════════════════════════════════════════ */

describe('#247 三格式菜单 · 产出面', () => {
  it('S1 三格式：菜单三项的 data-fmt 按 COPY_FORMATS 顺序，各自的 data-t 就是该格式的文本', () => {
    const html = menuBar();
    assert.deepEqual(attrsOf(html, MENU_FMT_ATTR), [...COPY_FORMATS], '菜单项的格式键必须按 COPY_FORMATS 顺序');
    const texts = [...html.matchAll(new RegExp(MENU_FMT_ATTR + '="([^"]+)"[^>]*\\s' + DEFAULT_DATA_ATTR + '="([^"]*)"', 'g'))]
      .map((m) => [m[1], m[2]]);
    assert.deepEqual(texts, COPY_FORMATS.map((k) => [k, TEXTS[k].replace(/&/g, '&amp;').replace(/"/g, '&quot;')]),
      '每一项的 data-t 必须是该格式自己的文本（三项写成同一份即红）');
    assert.equal(new Set(texts.map((t) => t[1])).size, 3, '三份文本不得重复');
  });

  it('S2 开合器：复制按钮同款外观 ＋ 开合标记 ＋ 不下拉就直接复制（不带 data-t、不带 data-action-id）', () => {
    const html = menuBar();
    const opener = /<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" ([^>]*)>([^<]*)<\/button>/.exec(html);
    assert.ok(opener !== null, '缺开合器按钮');
    assert.equal(opener[1].includes(MENU_OPEN_ATTR + '="1"'), true, '开合器缺开合标记');
    assert.equal(opener[1].includes('aria-haspopup="menu"'), true, '开合器缺 aria-haspopup');
    assert.equal(opener[1].includes('aria-expanded="false"'), true, '开合器缺 aria-expanded 初值');
    assert.equal(opener[1].includes(DEFAULT_DATA_ATTR), false, '开合器不得带 data-t（点了不该直接复制）');
    assert.equal(opener[1].includes(ACTION_ID_ATTR), false, '开合器不是复制目标，不得占 data-action-id');
    assert.equal(opener[2].endsWith('▾'), true, '开合器缺下拉标记：' + opener[2]);
  });

  it('S3 复制日志仍走冻结表：菜单形态不吞掉同一行的第二颗按钮', () => {
    const html = menuBar();
    assert.deepEqual(attrsOf(html, ACTION_ID_ATTR), [COPY_ACTION_IDS.actionBar.copyLog], '本章只有复制日志一颗 data-action-id');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="LOG"'), '复制日志的 data-t 丢了');
    assert.ok(html.includes(COPY_TEXT_DEFAULTS.okMessage === '已复制' ? '>复制日志</button>' : '>复制日志</button>'), '复制日志文案丢了');
  });

  it('S4 用途提示逐字进页面；不给 hints 就不出提示行（不写死中文进渲染层）', () => {
    const html = menuBar();
    for (const hint of HINTS) assert.ok(html.includes('>' + hint + '</span>'), '缺用途提示：' + hint);
    const bare = renderActionBar({ copyData: { actionId: 'cd', formats: { text: 'T', json: 'J', csv: 'C' } } });
    assert.equal(bare.includes('粘贴给 AI / 自己看'), false, '不给 hints 不得凭空补提示');
    assert.equal(attrsOf(bare, MENU_FMT_ATTR).length, 3, '不给 hints 仍要出三项');
  });

  it('S5 入参守卫：formats 与 text 同给、缺格式、hints 不是三串 → 抛 bad-input', () => {
    const cases = [
      { actionId: 'cd', text: 'T', formats: { text: 'T', json: 'J', csv: 'C' } },
      { actionId: 'cd', formats: { text: 'T', json: 'J' } },
      { actionId: 'cd', formats: { text: 'T', json: 'J', csv: 3 } },
      { actionId: 'cd', formats: { text: 'T', json: 'J', csv: 'C', hints: ['只给一条'] } },
    ];
    for (const copyData of cases) {
      assert.throws(() => renderActionBar({ copyData }), (e) => e.code === 'bad-input',
        '该给 bad-input：' + JSON.stringify(copyData));
    }
  });

  it('S6 无菜单时产出**逐字节不变**（其余 46 张页不许被这次改动碰到）', () => {
    // 单格式的复制区块：与 #247 之前的产出逐字相同（这两条是本票的「不破」判据）。
    assert.equal(
      renderCopyBlock({ title: '复制数据', dataText: 'D', logText: 'L' }),
      '<section class="ilife-block ilife-block-copy-block"><h2 class="ilife-block-copy-block-title">复制数据</h2>'
        + '<div class="ilife-action-bar"><div class="ilife-action-row ilife-action-row-ghost">'
        + '<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" data-action-id="ilife-copy-data" data-t="D">复制数据</button>'
        + '<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" data-action-id="ilife-copy-log" data-t="L">复制日志</button>'
        + '</div></div></section>',
      '单格式复制区块的产出变了（46 张页会跟着变）',
    );
    assert.equal(
      renderActionBar({ copyData: { actionId: 'cd', text: 'D' } }),
      '<div class="ilife-action-bar"><div class="ilife-action-row ilife-action-row-ghost">'
        + '<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" data-action-id="cd" data-t="D">复制数据</button>'
        + '</div></div>',
      '单格式 actionBar 的产出变了',
    );
  });

  it('S7 菜单 CSS 在 copyButton 区：老仓逐值（浮动方向／尺寸／投影／项内距）＋ 关着时收掉命中', () => {
    const menu = blocksOf('.' + STYLE_PREFIX + 'copy-menu')[0];
    assert.ok(menu !== undefined, '缺 .ilife-copy-menu 规则块（菜单样式必须住 copyButton 区）');
    assert.equal(declValue(menu, 'position'), 'absolute');
    assert.equal(declValue(menu, 'bottom'), 'calc(100% + 8px)', '老仓是 bottom:calc(100% + 8px)');
    assert.equal(declValue(menu, 'right'), '0');
    assert.equal(declValue(menu, 'min-width'), '200px');
    assert.equal(declValue(menu, 'max-width'), 'calc(100vw - 32px)', '老仓用它保证手机不越界');
    assert.equal(declValue(menu, 'padding'), '6px');
    assert.equal(declValue(menu, 'box-shadow'), '0 8px 24px rgba(0, 0, 0, .14)');
    assert.equal(declValue(menu, 'opacity'), '0', '关着时透明');
    assert.equal(declValue(menu, 'pointer-events'), 'none', '关着时不得被点到');
    assert.equal(declValue(menu, 'visibility'), 'hidden', '关着时不可见');

    const open = blocksOf('.' + MENU_OPEN_CLASS + '.' + STYLE_PREFIX + 'copy-menu')[0];
    assert.ok(open !== undefined, '缺开着的规则块（运行时加的类是 `copy-menu-open`）');
    assert.equal(declValue(open, 'opacity'), '1');
    assert.equal(declValue(open, 'pointer-events'), 'auto');

    const item = blocksOf('.' + STYLE_PREFIX + 'copy-menu-item')[0];
    assert.equal(declValue(item, 'padding'), '10px 12px');
    assert.equal(declValue(item, 'font-size'), '13px');
    const hover = blocksOf('.' + STYLE_PREFIX + 'copy-menu-item:hover')[0];
    assert.equal(declValue(hover, 'background'), 'var(--soft)');
    const hint = blocksOf('.' + STYLE_PREFIX + 'copy-menu-item > .' + STYLE_PREFIX + 'copy-menu-hint')[0];
    assert.equal(declValue(hint, 'color'), 'var(--fg3)');
    assert.equal(declValue(hint, 'font-size'), '11px');
    // 触控目标：窄屏菜单项抬到 44px（UI 四关之一）。
    assert.ok(CSS.includes('@media (max-width: 820px)'), '缺窄屏档');
    assert.ok(/\.ilife-copy-menu-item \{\s*min-height: 44px;/m.test(CSS) || CSS.includes('min-height: 44px'), '窄屏菜单项缺 44px');
  });

  it('S9 复制按钮那一行**平分整行**（用户 2026-09-12 返修）：两列等宽 ＋ 两颗按钮都铺满各自那一格', () => {
    // 反面（返修前的样子）：单列 → 复制数据缩成内容宽（实测 92.6px）、复制日志铺满 520px，一胖一瘦。
    const row = blocksOf('.' + STYLE_PREFIX + 'action-row-ghost')[0];
    assert.ok(row !== undefined, '缺 .ilife-action-row-ghost 规则块');
    assert.equal(declValue(row, 'grid-template-columns'), 'repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr))',
      'ghost 行必须是两列等宽（列数取冻结 evenRowPairs）——单列会让一颗铺满、一颗缩成内容宽');

    // 菜单包裹层**不写** justify-self：网格项默认 stretch，写 start 会让整颗按钮缩成内容宽。
    const wrap = blocksOf('.' + STYLE_PREFIX + 'copy-menu-wrap')[0];
    assert.ok(wrap !== undefined, '缺 .ilife-copy-menu-wrap 规则块');
    assert.equal(declValue(wrap, 'justify-self'), null, '包裹层不得写 justify-self（写 start 会把按钮收窄）');
    assert.equal(declValue(wrap, 'width'), '100%', '包裹层必须铺满自己那一格');
    const opener = blocksOf('.' + STYLE_PREFIX + 'copy-menu-wrap > .' + STYLE_PREFIX + 'copy-btn')[0];
    assert.ok(opener !== undefined, '缺「包裹层里的开合器」规则块');
    assert.equal(declValue(opener, 'width'), '100%', '开合器必须铺满自己那一格（否则又是那颗小按钮）');

    // 单格式页（其余 45 张）同一行两颗：两颗都是普通按钮，靠网格项 stretch 自动等宽——无需额外规则。
    const plain = renderActionBar({ copyData: { actionId: 'cd', text: 'D' }, copyLog: { actionId: 'cl', text: 'L' } });
    assert.equal((plain.match(/ilife-action-row-ghost/g) ?? []).length, 1, '两颗必须在同一行（一处 ghost 行）');
    assert.equal((plain.match(/<button/g) ?? []).length, 2);
  });

  it('S8 运行时产出：菜单选择器／类名与渲染端逐字同值（不产第二份真相）', () => {
    for (const literal of [
      'var MENU_OPEN_SEL = "[data-fmt-open=\\"1\\"]";',
      'var MENU_ITEM_SEL = "[data-fmt]";',
      'var MENU_WRAP_CLASS = "ilife-copy-menu-wrap";',
      'var MENU_CLASS = "ilife-copy-menu";',
      'var MENU_LABEL_CLASS = "ilife-copy-menu-label";',
      'var MENU_OPEN_CLASS = "copy-menu-open";',
    ]) assert.ok(HELPERS.includes(literal), '运行时缺常量：' + literal);
    assert.ok(!/window\.[A-Za-z_$][\w$]*\s*=/.test(HELPERS), '运行时禁向 window.<id> 赋值');
    assert.equal(HELPERS.includes('node:'), false, '运行时禁 node: 内建');
    assert.ok(!/\.classList/.test(HELPERS), '运行时不得用 classList（类名走 className 字符串）');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ② 行为面：真实产出文本 ＋ DOM 桩
 * ══════════════════════════════════════════════════════════════ */

describe('#247 三格式菜单 · 运行时行为', () => {
  it('B1 点开合器 → 菜单开；再点 → 收起；`aria-expanded` 同步', () => {
    const { doc, opener, menu } = runMenu();
    assert.equal(isOpen(menu), false, '初态必须关着');
    click(doc, opener);
    assert.equal(isOpen(menu), true, '点一下必须开');
    assert.equal(opener.getAttribute('aria-expanded'), 'true');
    click(doc, opener);
    assert.equal(isOpen(menu), false, '再点必须收');
    assert.equal(opener.getAttribute('aria-expanded'), 'false');
  });

  it('B2 点某一项：复制的是**那一项**的文本 ＋ 提示报**所选格式** ＋ 菜单自动收起', async () => {
    for (const key of COPY_FORMATS) {
      const writes = [];
      const { doc, opener, menu, items } = runMenu({
        clipboard: { writeText: (t) => { writes.push(t); return Promise.resolve(); } },
      });
      click(doc, opener);
      click(doc, items[key]);
      await new Promise((r) => { setTimeout(r, 0); });
      assert.deepEqual(writes, [TEXTS[key]], '选 ' + key + ' 时复制到的不是该格式的文本');
      const list = toasts(doc);
      assert.equal(list.length, 1, '一次复制只该出一条提示，实测 ' + list.length);
      assert.equal(titleOf(list[0]), '数据复制成功（' + key + '）', key + ' 的提示没报所选格式');
      assert.equal(isOpen(menu), false, '选完必须收起菜单');
    }
  });

  it('B3 点菜单**外面**（页面上别处）→ 菜单收起来（老仓「点别处收起」同效）', async () => {
    const writes = [];
    const { doc, opener, menu } = runMenu({
      clipboard: { writeText: (t) => { writes.push(t); return Promise.resolve(); } },
    });
    const outside = doc.createElement('div');
    doc.body.appendChild(outside);
    click(doc, opener);
    assert.equal(isOpen(menu), true, '前置：菜单必须已开');
    click(doc, outside);
    assert.equal(isOpen(menu), false, '点别处必须收起');
    assert.deepEqual(writes, [], '点别处不得触发复制');
  });

  it('B4 点同一行另一颗复制按钮（复制日志）→ 既复制日志又收起菜单', async () => {
    const writes = [];
    const { doc, opener, menu } = runMenu({
      clipboard: { writeText: (t) => { writes.push(t); return Promise.resolve(); } },
    });
    const logBtn = doc.createElement('button');
    logBtn.className = STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost';
    logBtn.setAttribute(ACTION_ID_ATTR, COPY_ACTION_IDS.actionBar.copyLog);
    logBtn.setAttribute(DEFAULT_DATA_ATTR, 'LOG');
    doc.body.appendChild(logBtn);
    click(doc, opener);
    click(doc, logBtn);
    await new Promise((r) => { setTimeout(r, 0); });
    assert.deepEqual(writes, ['LOG'], '复制日志那颗按钮必须照旧复制它自己那份文本');
    assert.equal(isOpen(menu), false, '点了同行的复制日志，菜单必须收起来');
  });

  it('B5 没有菜单的页面：复制按钮的行为一字不变（不因这次改动多出任何效果）', async () => {
    const writes = [];
    const { doc } = runMenu({ clipboard: { writeText: (t) => { writes.push(t); return Promise.resolve(); } } });
    const plain = doc.createElement('button');
    plain.className = STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost';
    plain.setAttribute(ACTION_ID_ATTR, COPY_ACTION_IDS.actionBar.copyData);
    plain.setAttribute(DEFAULT_DATA_ATTR, 'PLAIN');
    doc.body.appendChild(plain);
    click(doc, plain);
    await new Promise((r) => { setTimeout(r, 0); });
    assert.deepEqual(writes, ['PLAIN'], '普通复制按钮必须照旧');
    const list = toasts(doc);
    assert.equal(list.length, 1);
    assert.equal(titleOf(list[0]), COPY_TEXT_DEFAULTS.okMessage, '普通按钮的成功提示仍取冻结缺省，不得被格式提示串改');
  });

  it('B6 两通道皆失败：提示仍是**失败**那一句（既不报所选格式，也不套成功壳）', async () => {
    const { doc, opener, items } = runMenu({
      clipboard: { writeText: () => Promise.reject(new Error('nope')) },
    });
    const realExec = doc.execCommand.bind(doc);
    doc.execCommand = () => false; // 兜底通道也失败
    click(doc, opener);
    click(doc, items.json);
    await new Promise((r) => { setTimeout(r, 0); });
    const list = toasts(doc);
    assert.equal(list.length, 1, '一次失败只该出一条提示');
    assert.equal(titleOf(list[0]), COPY_TEXT_DEFAULTS.failMessage, '失败提示必须是冻结的失败那句');
    assert.equal(titleOf(list[0]).includes('数据复制成功'), false, '失败提示不得套成功词干（更不得报格式名）');
    assert.equal(titleOf(list[0]).includes('json'), false, '失败提示不得带上所选格式');
    doc.execCommand = realExec;
  });
});
