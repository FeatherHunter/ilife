/** #1001 · 文本录入控件字号下限 16px · **静态契约锁**（架构收口版）。
 *
 *  架构一句话：全仓曾有 22 处手写 `font-size`（12.5／13／13.5／14／15px），全是 `class + element` 形态
 *  `(0,1,1)` —— 同一个概念 22 个定义地。收口成「**一处定义 ＋ 每页族一条发射**」：
 *   · 定义＝`page-ui` 的 `textEntryFloorCss()`（值取 `PAGE_LIMITS.textEntryMinPx`，排除集取
 *     `NON_ENTRY_INPUT_TYPES`）；
 *   · 发射＝`pageUiCss()`（`.ilife-page-ui`）／`helpShellSection`（`.ilife-help-shell`）／
 *     `renderDocShell()`（`.ilife-page`，与是否启用 `pageUi` 无关）；
 *   · 那 22 处声明**删掉**（不是改值）——赛道上没有对手，地板自然生效。
 *
 *  为什么地板整条塞进 `:where()`：特异度只由页根贡献 `(0,1,0)` ⇒ 合法的**上调**随手就赢它，
 *  任何**下调**由产物面计算值门禁（`text-entry-computed-1001.test.mjs`）抓——**CSS 表达不了「≥」，
 *  不等式交给门禁，不交给级联**。
 *
 *  本件锁三样：① 三条发射点都在、值都来自常量；② 排除集与 `NON_ENTRY_INPUT_TYPES` 同源；
 *  ③ 三条历史选择器**不再自带** `font-size`（防回潮）。外加一条**外部契约冻结**与**判式自证**。
 *
 *  运行：`node --test packages/base-render/test/text-entry-min-font-1001.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { buildStyleSheet, pageUiCss, STYLE_PREFIX } from '../dist/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { NON_ENTRY_INPUT_TYPES, PAGE_LIMITS } from '../dist/pageUi.js';

const MIN_PX = PAGE_LIMITS.textEntryMinPx;

/** 从任意 CSS 文本里取某页根的地板规则体（取不到即抛，不静默）。 */
function floorBodyOf(css, root) {
  const m = new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:where\\([\\s\\S]*?\\)\\s*\\{\\s*([^}]*)\\}').exec(css);
  assert.ok(m, '找不到页根 ' + root + ' 的字号地板规则');
  return m[1];
}

/** 规则体里的 font-size 值（声明恰一条）。 */
function fontSizeOf(body) {
  const hits = [...body.matchAll(/font-size\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  assert.equal(hits.length, 1, '规则体里的 font-size 声明条数应为 1，实得 ' + hits.length + '：' + body);
  return hits[0];
}

/** 某选择器的基座规则体（产物 CSS；取不到返回 null）。 */
function ruleBodyOf(css, selector) {
  const m = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{').exec(css);
  if (!m) return null;
  return css.slice(m.index + m[0].length, css.indexOf('}', m.index));
}

const PAGE_UI_CSS = pageUiCss({ prefix: STYLE_PREFIX });
const SHEET_CSS = buildStyleSheet().css;
const DOC_HTML = renderDocShell({ docTitle: '锁', bodyHtml: '<p>x</p>' });

/* ── ⓪ 外部契约冻结：判据数不是自说自话 ───────────────────── */

test('#1001 外部契约冻结：textEntryMinPx 恰为 16（WebKit 聚焦缩放阈值）', () => {
  /* 生产者（地板规则）与校验者（本文件、#984 的锁、门禁）都读同一个常量 ⇒ 改常量会一起变绿。
     故这里把**外部事实**写成第二份字面量：动这个数，必须先拿出新的外部读数。 */
  assert.equal(MIN_PX, 16, '外部契约：WebKit 对 font-size<16px 的表单控件聚焦自动缩放；改这个数须先有新的外部读数');
});

/* ── ① 三条发射点：地板在、值来自常量 ─────────────────────── */

test('#1001 页族地板：.ilife-page-ui（pageUiCss）值 = textEntryMinPx', () => {
  assert.equal(fontSizeOf(floorBodyOf(PAGE_UI_CSS, '.' + STYLE_PREFIX + 'page-ui')), MIN_PX + 'px');
});

test('#1001 页族地板：.ilife-help-shell（共享样式表）值 = textEntryMinPx', () => {
  assert.equal(fontSizeOf(floorBodyOf(SHEET_CSS, '.' + STYLE_PREFIX + 'help-shell')), MIN_PX + 'px');
});

test('#1001 页族地板：.ilife-page（文档壳，与 pageUi 开关无关）值 = textEntryMinPx', () => {
  assert.equal(fontSizeOf(floorBodyOf(DOC_HTML, '.' + STYLE_PREFIX + 'page')), MIN_PX + 'px');
});

/* ── ② 排除集与常量同源 ───────────────────────────────────── */

test('#1001 地板选择器的排除集逐项来自 NON_ENTRY_INPUT_TYPES', () => {
  /* 取 `:where(...)` 里的整段选择器列表：**非贪婪到「右括号＋{」**才算收尾
     （列表里有 N 个 `:not([type=x])` 的内层右括号，取第一个右括号会截断成只剩第一项）。 */
  const m = new RegExp('\\.' + STYLE_PREFIX + 'page-ui\\s*:where\\(([\\s\\S]*?)\\)\\s*\\{').exec(PAGE_UI_CSS);
  assert.ok(m, '找不到地板选择器');
  const selector = m[1];
  for (const type of NON_ENTRY_INPUT_TYPES) {
    assert.ok(selector.includes(':not([type=' + type + '])'), '地板选择器缺排除项：' + type);
  }
  assert.ok(/\bselect\b/.test(selector) && /\btextarea\b/.test(selector), '地板须同时覆盖 select／textarea');
});

/* ── ③ 三条历史选择器不再自带字号（防回潮） ────────────────── */

for (const [label, css, selector] of [
  ['通用参数表单输入框', PAGE_UI_CSS + SHEET_CSS + DOC_HTML, '.' + STYLE_PREFIX + 'block-param-form-input'],
  ['HELP 速查台搜索框', SHEET_CSS, '.' + STYLE_PREFIX + 'help-shell-tab-search-input'],
  ['HELP 速查台字段输入框', SHEET_CSS, '.' + STYLE_PREFIX + 'help-shell-field-input'],
]) {
  test('#1001 ' + label + '：不再自带 font-size（字号归页族地板）', () => {
    const body = ruleBodyOf(css, selector);
    assert.ok(body !== null, '找不到规则：' + selector);
    assert.ok(!/font-size/.test(body), selector + ' 又写回了 font-size —— 同一个概念只许一处定义地：' + body);
  });
}

/* ── ④ 判式自证：判式本身有鉴别力 ─────────────────────────── */

test('#1001 判式自证：把地板字号改回 13px，判式必须读出 13px', () => {
  const mutated = PAGE_UI_CSS.replace('font-size: ' + MIN_PX + 'px', 'font-size: 13px');
  assert.notEqual(mutated, PAGE_UI_CSS, '变异没落上：产物里找不到要改的那一段');
  assert.equal(fontSizeOf(floorBodyOf(mutated, '.' + STYLE_PREFIX + 'page-ui')), '13px');
});
