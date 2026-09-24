/** sheet-frame · **样式段**（本组件的唯一样式来源，同时是**本族的样式汇总入口** `sheetCss()`）。
 *
 *  两条纪律（与 `editable-value`／`page-bars` 同一份层规，见 `src/components/README.md`）：
 *   1. 只读冻结 token（`CSS_VAR_TOKENS`），**不新增 token 名**、不写 `:root`／`!important`；
 *      暖纸那一档 token 集里没有 ⇒ 用**局部字面色**并在行内注明（同族先例：`page-bars/style.ts`
 *      的 `#a15a06`／`rgba(255,159,10,.22)`）。
 *   2. 全部规则 scope 在 `.<prefix>page-ui` 之下 ⇒ **不开 `pageUi` 的页零命中**（加法式的机械保证）。
 *
 *  几何契约（钉在测试里）：
 *   · 撕口是**画在纸边上**的两枚半圆（圆心落在纸边线上），不占版面宽度 ⇒ 开关它不改任何列的 x；
 *   · 裁切线与纸面同宽（左右各探出一个内距），底下不占高度。
 */
import { PAPER_SANS_STACK } from '../shared/typography.js';
import { entryRowsCss } from '../entry-rows/style.js';
import { ledgerRowsCss } from '../ledger-rows/style.js';
import { punchStripCss } from '../punch-strip/style.js';
import { scaleBarCss } from '../scale-bar/style.js';
import { summaryHeadCss } from '../summary-head/style.js';

/** 换行（仓库口径：不写字面换行转义，与本层其余件同）。 */
const LF = String.fromCharCode(10);

/** 小票纸的纸面与纸边（原型实测色）。token 集只有中性档，暖档按纪律写在行内、不新立 token 名。 */
const PAPER_FILL = '#fffdf7';
const PAPER_EDGE = '#e7e1d3';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function sheetFrameCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-sheet';
  return [
    '/* sheet-frame（纸面页框）：一整页的纸张层。素纸＝中性卡片纸，小票纸＝暖白＋纸边＋撕口＋裁切线。 */',
    s + ' {',
    '  position: relative;',
    '  box-sizing: border-box;',
    /* 纸的**正文**字面＝原型 `--sans` 的原序（字符串住 `../shared/typography.ts`，族内一份事实）。
       注意：纸上那些**数字**不走这一串——原型给数字另写了 `--mono`（Consolas，0 带斜杠），
       本族按数字位各自挂 `PAPER_MONO_STACK`；两条栈的分工见 `../shared/typography.ts` 件头。 */
    '  font-family: ' + PAPER_SANS_STACK + ';',
    '  background: var(--card);',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + 14 + 'px;',
    '  box-shadow: var(--shadow);',
    '  padding: 18px 20px 16px;',
    '}',
    '/* 小票纸：暖白纸面 ＋ 纸边 ＋ 更方的角（单据不是卡片）。 */',
    s + '.is-receipt {',
    '  background: ' + PAPER_FILL + ';',
    '  border-color: ' + PAPER_EDGE + ';',
    '  border-radius: ' + 6 + 'px;',
    '}',
    s + '-body {',
    '  min-width: 0;',
    '}',
    '/* 撕口：圆心落在纸边线上的两枚半圆，用桌面色（--bg）挖出来 ⇒ 换页面底色它自己跟着走。 */',
    s + '-notch {',
    '  position: absolute;',
    '  top: 34px;',
    '  width: 16px;',
    '  height: 16px;',
    '  border-radius: 50%;',
    '  background: var(--bg);',
    '  box-shadow: inset 0 0 0 1px ' + PAPER_EDGE + ';',
    '}',
    s + '-notch.is-left { left: -9px; }',
    s + '-notch.is-right { right: -9px; }',
    '/* 裁切线：纸面宽度上的一条虚线，两端各一枚小孔（提示"沿这里撕"）。 */',
    s + '-cut {',
    '  position: relative;',
    '  margin: 14px -20px 0;',
    '  border-top: 1px dashed ' + PAPER_EDGE + ';',
    '}',
    s + '-cut::before,',
    s + '-cut::after {',
    '  content: "";',
    '  position: absolute;',
    '  top: -5px;',
    '  width: 9px;',
    '  height: 9px;',
    '  border-radius: 50%;',
    '  background: var(--bg);',
    '}',
    s + '-cut::before { left: 8px; }',
    s + '-cut::after { right: 8px; }',
  ].join(LF);
}

/** **本族样式的汇总入口**（纸面 ＋ 主数字头 ＋ 刻度条 ＋ 账目行 ＋ 明细行 ＋ 打孔格带）。
 *
 *  为什么汇总在"纸"这一件：这一族的五个内容件都只在纸上成立（同一份纸边、同一套内距与行距），
 *  调用方一行 `sheetCss()` 就能把它们一起挂上，不必记住五个函数名——
 *  与 `pageShapeCss()` 汇总导航族／横条族是同一条口径。
 *  恒返回非空 CSS 文本。 */
export function sheetCss(input?: { readonly prefix?: string }): string {
  return [
    sheetFrameCss(input),
    summaryHeadCss(input),
    scaleBarCss(input),
    ledgerRowsCss(input),
    entryRowsCss(input),
    punchStripCss(input),
  ].join(LF);
}
