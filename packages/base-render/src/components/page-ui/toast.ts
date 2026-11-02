/** #870 · 页面级配方的**第三段**（目录化批次②从 `src/pageUiToast.ts` 原样搬来，正文一字未改）：helpers 运行时**注入**的那些控件（今天的全部内容 = toast 栈的关闭键）。
 *
 *  为什么另立一件（不是「顺手拆」）：
 *   · 那一段要 30 行上下（规则 ＋ 逐条记账注释），而 `pageUi.ts` 加它就 366 LF，**越过本包
 *     AGENTS.md 钉的 350 LF 告警线**（口径：LF、只数换行符、范围本包 src 下的 .ts）。
 *     按本包规矩「超线即触发必报五步的第四步」——这一件就是那一步给的拆法；
 *   · 拆的口子也正好是**层与层的接缝**：`pageUi.ts` 管「版面与页内控件怎么摆」，本件管
 *     「运行时注入的浮动件怎么摆」——后者挂在 `document.body` 下、**不在版面根之内**，
 *     连启用方式都多一道。
 *
 *  纯度：本件**不 import 任何东西**（连 `pageUi.ts` 也不 import，避免 `pageUi ↔ pageUiToast` 成环），
 *  取值由调用方按参数给。产出恒为非空 CSS 片段（调用方拼进样式资产）。 */

/** toast 关闭键的命中区规则（#870）。`root` 是配方根选择器（如 `.ilife-page-ui`），
 *  `touchMinPx` 是最小命中边长（＝ `PAGE_LIMITS.touchMinPx`，44）。 */
import { m } from '../../entries/index.js';
export function toastUiCss(root: string, touchMinPx: number): readonly string[] {
  return [
    m('base-render.components-page-ui-toast.c001'),
    m('base-render.components-page-ui-toast.c002'),
    m('base-render.components-page-ui-toast.c003'),
    m('base-render.components-page-ui-toast.c004'),
    m('base-render.components-page-ui-toast.c005'),
    m('base-render.components-page-ui-toast.c006'),
    m('base-render.components-page-ui-toast.c007'),
    m('base-render.components-page-ui-toast.c008'),
    m('base-render.components-page-ui-toast.c009'),
    m('base-render.components-page-ui-toast.c010'),
    m('base-render.components-page-ui-toast.c011'),
    m('base-render.components-page-ui-toast.c012'),
    m('base-render.components-page-ui-toast.c013'),
    m('base-render.components-page-ui-toast.c014'),
    m('base-render.components-page-ui-toast.c015'),
    m('base-render.components-page-ui-toast.c016'),
    m('base-render.components-page-ui-toast.c017'),
    root + ' .ilife-toast-close {',
    '  position: relative;',
    '  min-width: ' + touchMinPx + 'px;',
    '}',
    root + ' .ilife-toast-close::after {',
    '  content: "";',
    '  position: absolute;',
    '  inset: 50% auto auto 50%;',
    '  transform: translate(-50%, -50%);',
    '  width: ' + touchMinPx + 'px;',
    '  height: ' + touchMinPx + 'px;',
    '}',
  ];
}
