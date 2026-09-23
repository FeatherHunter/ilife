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
export function toastUiCss(root: string, touchMinPx: number): readonly string[] {
  return [
    '/* ⑫ toast 关闭键的命中区（全宽档；#870）。',
    '   来源：#870 接线后，页面按钮的复制提示由公共层 helpers 出，而这个键是那一档里',
    '   唯一一个视觉尺寸只有 26px 高的可点元素（实测 62×26，压 t849 §2「触摸档可点元素',
    '   命中区 ≥44×44px，零不足」这条硬线）。',
    '   做法照本仓 #642 的既有先例（HELP 外壳三个小关闭键）：**命中区用绝对定位的 ::after 覆盖层',
    '   撑到 44×44，视觉尺寸一个字不动** —— 与直接把 min-height 抬到 44px 相比，它不改那个键在',
    '   深色卡里的观感（卡高、字位都不动），只把可点面放大。',
    '   ① 键自身 `position: relative`（**必需**：覆盖层绝对定位的锚点就是它；写成 static 的话锚点',
    '      会落到视口，可点面跑到页角去）；`min-width` 只补横向。',
    '   ② 覆盖层 `inset: 50% auto auto 50%` ＋ `translate(-50%,-50%)`：中心对齐、向外撑，',
    '      不参与布局（绝对定位），故卡面尺寸逐值不变。',
    '   ③ **本条的适用条件**：`.ilife-toast-stack` 与它里面每次弹出的 `.ilife-toast` 由 helpers',
    '      运行时挂在 `document.body` 下（不在版面根之内）⇒ 想让本条命中，启用 pageUi 的整页装配',
    '      要在 `document.body` 上带一颗同样的标记（本配方的 opt-in 开关本来就是「页面声明自己是',
    '      pageUi 页」；带标记 ＝ 这一页接受本配方的全部行为）。',
    '   ④ 与 `pageUi.ts` ⑤ 那条的分工：⑤ 管页内控件（`.copy-btn` 那一族），本件管 helpers 运行时',
    '      **注入**的那一颗（它不在页内标记里，⑤ 的选择器扫不到）。 */',
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
