/** sheet-frame · **样式段**（本组件的唯一样式来源，同时是**本族的样式汇总入口** `sheetCss()`）。
 *
 *  两条纪律（与本层其余件同一份，见 `src/components/README.md`）：
 *   1. **颜色一律经 `skinVar()` 读皮肤**：纸面／纸边／桌面色都是**材料色**，写死就不跟皮肤
 *      （换到 `ink` 下仍是小票纸的奶白）。此处不许再出现 `#rrggbb`／`rgba()` 字面量。
 *      `variant`（素纸／小票纸）是**结构**差异（撕口／裁切线／更方的角），**不是**靠写死颜色区分：
 *      两档各自取一档 token（素纸 `surface`／`line`，小票纸 `surface-2`／`edge`），值由皮肤给。
 *      字面同理：纸面的正文字面显式取 `font`、本族的数字位取 `font-num`。
 *   2. 全部规则 scope 在 `.<prefix>page-ui` 之下 ⇒ **不开 `pageUi` 的页零命中**（加法式的机械保证）。
 *
 *  几何契约（钉在测试里）：
 *   · 撕口是**画在纸边上**的两枚半圆（圆心落在纸边线上），不占版面宽度 ⇒ 开关它不改任何列的 x；
 *   · 裁切线与纸面同宽（左右各探出一个内距），底下不占高度。
 */
import { skinVar } from '../skin/contract.js';
import { entryRowsCss } from '../entry-rows/style.js';
import { ledgerRowsCss } from '../ledger-rows/style.js';
import { punchStripCss } from '../punch-strip/style.js';
import { scaleBarCss } from '../scale-bar/style.js';
import { summaryHeadCss } from '../summary-head/style.js';

/** 换行（仓库口径：不写字面换行转义，与本层其余件同）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function sheetFrameCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-sheet';
  /* 材料色四枚 ＋ 桌面色一枚（全部经皮肤读法；本件源码里不出现手写的 `var(--ilife-…)`）。 */
  const surface = skinVar('surface');
  const surface2 = skinVar('surface-2');
  const line = skinVar('line');
  const edge = skinVar('edge');
  const ground = skinVar('ground');
  return [
    '/* sheet-frame（纸面页框）：一整页的纸张层。素纸＝中性卡片纸，小票纸＝暖白＋纸边＋撕口＋裁切线。 */',
    s + ' {',
    '  position: relative;',
    '  box-sizing: border-box;',
    /* 纸的**正文**字面：经 `skinVar('font')` 读皮肤的正文栈（挂皮肤＝纸面正文也跟着换）。
       注意：纸上那些**数字**不走这一串——它们各自取 `skinVar('font-num')`（本族的数字位读法）。 */
    '  font-family: ' + skinVar('font') + ';',
    '  background: ' + surface + ';',
    '  border: 1px solid ' + line + ';',
    '  border-radius: ' + 14 + 'px;',
    '  box-shadow: ' + skinVar('shadow') + ';',
    '  padding: 18px 20px 16px;',
    '}',
    '/* 小票纸：暖一档的纸面 ＋ 纸边 ＋ 更方的角（单据不是卡片）。色全走 token ⇒ 换皮时它自己跟着换。 */',
    s + '.is-receipt {',
    '  background: ' + surface2 + ';',
    '  border-color: ' + edge + ';',
    '  border-radius: ' + 6 + 'px;',
    '}',
    s + '-body {',
    '  min-width: 0;',
    '}',
    '/* 撕口：圆心落在纸边线上的两枚半圆，用**桌面色**（`ground`）挖出来 ⇒ 换页面底色它自己跟着走。 */',
    s + '-notch {',
    '  position: absolute;',
    '  top: 34px;',
    '  width: 16px;',
    '  height: 16px;',
    '  border-radius: 50%;',
    '  background: ' + ground + ';',
    '  box-shadow: inset 0 0 0 1px ' + edge + ';',
    '}',
    s + '-notch.is-left { left: -9px; }',
    s + '-notch.is-right { right: -9px; }',
    '/* 裁切线：纸面宽度上的一条虚线，两端各一枚小孔（提示"沿这里撕"）。 */',
    s + '-cut {',
    '  position: relative;',
    '  margin: 14px -20px 0;',
    '  border-top: 1px dashed ' + edge + ';',
    '}',
    s + '-cut::before,',
    s + '-cut::after {',
    '  content: "";',
    '  position: absolute;',
    '  top: -5px;',
    '  width: 9px;',
    '  height: 9px;',
    '  border-radius: 50%;',
    '  background: ' + ground + ';',
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
