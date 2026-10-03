/** #1001 第 2 期 · 共享层文本录入控件字号下限 16px · 契约锁。
 *
 *  **为什么要有这一条**：字号是一条声明，而这条声明有两个落点——**源码**（TS 里的字符串数组）
 *  与**编译产物**（`dist/` 里真正被页面吃进去的 CSS）。只锁源码，漏「改了源码忘了重编译」；
 *  只锁产物，漏「产物被手改／源码被改回去」。故两处同锁（同第 1 期 `help-search-font-1001`）。
 *
 *  **为什么是 16px**：外部行为，不是本仓口味——WebKit 对 `font-size < 16px` 的表单控件
 *  （input／select／textarea）在聚焦时自动放大页面，页面版式随之错位。票面 #1001「单票承载」
 *  是本类的唯一承载处（第 3 期把这个数收进 `PAGE_LIMITS.textEntryMinPx`，本条届时改读常量）。
 *
 *  **范围锁**：本期只许动 `font-size` 一个声明，三条规则体里其余声明（盒模型／触控高度／
 *  内边距／圆角／描边／底色／字栈）逐字冻结——防「顺手改」把触控 44／圆角语言带跑。
 *  比对前把空白归一（产物是缩进过的多行 CSS；缩进不是行为）。
 *
 *  **变异自证**：把产物里那条 `font-size: 16px` 改回 `13px`，判式必须真的读出 13px 并判红；
 *  否则说明这条判式没咬住东西（绿而无鉴别力）。
 *
 *  运行：`node --test packages/base-render/test/text-entry-min-font-1001.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { blocksCss } from '../dist/blocks.js';
import { buildStyleSheet, STYLE_PREFIX } from '../dist/index.js';
import { PAGE_LIMITS } from '../dist/pageUi.js';

const SRC_BLOCKS = readFileSync(new URL('../src/blocks.ts', import.meta.url), 'utf8');
const SRC_HELP_SHELL = readFileSync(new URL('../src/components/style/help-shell.ts', import.meta.url), 'utf8');

/** 判据数值的**唯一住处**（第 3 期收口）：`PAGE_LIMITS.textEntryMinPx`。
 *  它的**外部出处**由下一条冻结断言钉住（16px ＝ WebKit 聚焦缩放阈值），不由本文件自说自话。 */
const TEXT_ENTRY_MIN_PX = PAGE_LIMITS.textEntryMinPx;

/** 三条「共享层文本录入控件」：源码选择器片段 ＋ 产物选择器 ＋ 产物 CSS 取处 ＋ 期望的规则体。 */
const CASES = [
  {
    label: '通用参数表单输入框',
    srcText: SRC_BLOCKS,
    srcAnchor: "'block-param-form-input {'",
    css: () => blocksCss({ prefix: STYLE_PREFIX }),
    selector: '.' + STYLE_PREFIX + 'block-param-form-input',
    rest: 'box-sizing: border-box; width: 100%; min-height: 44px; padding: 0 12px;'
      + ' border: 1px solid var(--line); border-radius: 8px; background: var(--card);'
      + ' color: var(--fg); font-family: inherit;',
  },
  {
    label: 'HELP 速查台搜索框',
    srcText: SRC_HELP_SHELL,
    srcAnchor: "'help-shell-tab-search-input {'",
    css: () => buildStyleSheet().css,
    selector: '.' + STYLE_PREFIX + 'help-shell-tab-search-input',
    rest: 'flex: 1 1 200px; min-width: 0; min-height: 36px; padding: 0 14px;'
      + ' border: 1px solid var(--line); border-radius: 999px; background: var(--card);'
      + ' color: var(--fg); font-family: inherit;',
  },
  {
    label: 'HELP 速查台参数字段输入框',
    srcText: SRC_HELP_SHELL,
    srcAnchor: "'help-shell-field-input {'",
    css: () => buildStyleSheet().css,
    selector: '.' + STYLE_PREFIX + 'help-shell-field-input',
    rest: 'flex: 1 1 120px; min-width: 0; min-height: 32px; padding: 0 10px;'
      + ' border: 1px solid var(--line); border-radius: 8px; background: var(--card);'
      + ' color: var(--fg); font-family: inherit;',
  },
];

/** 产物 CSS 里某选择器的规则体（选择器与 `{` 之间的空白容错；取首条，同选择器多档是既有写法）。 */
function ruleBodyOf(css, selector) {
  const m = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{').exec(css);
  assert.ok(m, '产物 CSS 里找不到选择器：' + selector);
  const end = css.indexOf('}', m.index);
  assert.ok(end > m.index, '选择器后没有规则体收尾：' + selector);
  return css.slice(m.index + m[0].length, end);
}

/** 规则体里的 `font-size` 值（声明恰一条，缺／重复都抛）。 */
function fontSizeOf(body) {
  const hits = [...body.matchAll(/font-size\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  assert.equal(hits.length, 1, '规则体里的 font-size 声明条数应为 1，实得 ' + hits.length + '：' + body);
  return hits[0];
}

/** 规则体归一：去掉 font-size 声明、压平空白（缩进不是行为）。 */
function restOf(body) {
  return body.replace(/font-size\s*:\s*[^;}]+;?/, '').replace(/\s+/g, ' ').trim();
}

/** 源码里某选择器片段之后那一段（到下一个 `}` 收尾的 TS 数组项）里的 font-size 值。 */
function srcFontSizeOf(srcText, anchor) {
  const at = srcText.indexOf(anchor);
  assert.ok(at >= 0, '源码里找不到选择器片段：' + anchor);
  const end = srcText.indexOf('}', at);
  assert.ok(end > at, '选择器片段后没有规则收尾：' + anchor);
  return fontSizeOf(srcText.slice(at, end));
}

/* ── ⓪ 外部契约冻结：判据数不是自说自话 ───────────────────── */

test('#1001 外部契约冻结：textEntryMinPx 恰为 16（WebKit 聚焦缩放阈值）', () => {
  /* 生产者（CSS 声明）与校验者（本文件、#984 的锁）都读这一个常量 ⇒ 改常量时门禁会一起变绿。
     故这里把**外部事实**写成第二份字面量：动这个数，必须先拿出新的外部读数（真机／平台文档）。 */
  assert.equal(TEXT_ENTRY_MIN_PX, 16,
    '外部契约：WebKit 对 font-size<16px 的表单控件聚焦自动缩放；改这个数须先有新的外部读数');
});

/* ── ① 源码侧：声明值就是下限 ─────────────────────────────── */

for (const c of CASES) {
  test('#1001 ' + c.label + '（源码）字号 = ' + TEXT_ENTRY_MIN_PX + 'px', () => {
    assert.equal(parseFloat(srcFontSizeOf(c.srcText, c.srcAnchor)), TEXT_ENTRY_MIN_PX);
  });
}

/* ── ② 产物侧：编译出来的 CSS 就是下限（改了源码必须重编译） ── */

for (const c of CASES) {
  test('#1001 ' + c.label + '（产物）字号 = ' + TEXT_ENTRY_MIN_PX + 'px', () => {
    assert.equal(
      parseFloat(fontSizeOf(ruleBodyOf(c.css(), c.selector))),
      TEXT_ENTRY_MIN_PX,
      '产物里不是下限值——源码改了却没重编译？',
    );
  });
}

/* ── ③ 范围锁：除字号外逐字冻结 ───────────────────────────── */

for (const c of CASES) {
  test('#1001 ' + c.label + '：除 font-size 外一行不动', () => {
    assert.equal(restOf(ruleBodyOf(c.css(), c.selector)), c.rest, '本期只许动 font-size，其余声明不许被顺手改');
  });
}

/* ── ④ 变异自证：判式本身有鉴别力 ─────────────────────────── */

for (const c of CASES) {
  test('#1001 ' + c.label + '：变异自证（改回 13px 必须判红）', () => {
    const css = c.css();
    const body = ruleBodyOf(css, c.selector);
    const mutated = css.replace(
      c.selector + ' {' + body + '}',
      c.selector + ' {' + body.replace('font-size: ' + TEXT_ENTRY_MIN_PX + 'px', 'font-size: 13px') + '}',
    );
    assert.notEqual(mutated, css, '变异没落上：产物里找不到要改的那一段');
    assert.equal(parseFloat(fontSizeOf(ruleBodyOf(mutated, c.selector))), 13, '判式应读出被改小的 13px');
  });
}
