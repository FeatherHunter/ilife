/** quick-capture · **样式段**（本件唯一样式来源：卡与写的那一行 ＋ 汇总另三族 ＋ 三条共用交互态 ＋ 窄档）。
 *
 *  另三族住在同目录的 `style-cells.ts`（解析预览那一格族）、`style-choices.ts`（候选带与「记过的」）与
 *  `style-drawer.ts`（形态 `drawer` 的抽屉那一族）——
 *  那三份**仍是本件样式段的一部分**（判据侧经 `test/_style-sources.mjs` 的 `styleSources()` 扫全件）；
 *  拆的理由是这一份超了本包的行数告警线（350 行），按先例 `relation-picker/style.ts` 的汇总写法收口。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：本件自己声明容器，窄档走 `@container`；媒体查询只判设备能力
 *     （悬停是不是增强、要不要减动效），**一条视口宽度查询都没有**；
 *   · 每一格的读数与候选名**永不截断**：样式段里没有 `text-overflow`／`line-clamp`／`nowrap`（窄档只换行）；
 *   · 形与色的三条口径：**主按钮的底走 `accent-text`**（`accent-ink` on `accent` 在 `neutral` 只有 4.02，
 *     正文级按钮字过不了 4.5；`dialog`／`drawer-sheet` 的实底键同此口径）、
 *     **补出来的那一格走虚线边**（形自己说得出「这格不是认出来的」）、
 *     **候选带里现在那一枚的勾选槽位固定宽**（未选也留：一排候选的左右沿才齐平）——后两条住 `style-cells.ts`／
 *     `style-choices.ts`，汇总后同属这一段。
 */
import { skinVar } from '../skin/contract.js';
import {
  QUICK_CAPTURE_BOX_MIN_PX,
  QUICK_CAPTURE_CONTAINER,
  QUICK_CAPTURE_GAP_PX,
  QUICK_CAPTURE_HOVER_QUERY,
  QUICK_CAPTURE_NARROW_PX,
  QUICK_CAPTURE_TOUCH_PX,
  quickCaptureSlot,
  type QuickCaptureSlot,
} from './attrs.js';
import { quickCaptureCellsCss } from './style-cells.js';
import { quickCaptureChoicesCss } from './style-choices.js';
import { quickCaptureDrawerCss } from './style-drawer.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);
/** 一切可点槽位（悬停／按压／减动效三条规则共用同一份名单，免得三处各写一遍）。 */
const TOUCH_SLOTS = ['chip', 'pick', 'keep', 'more', 'save', 'recall'] as const;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function quickCaptureCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-quick-capture';
  /** **槽类名**（带点、不带 scope）：只许用在**同一条选择器的后半截**（如 `.a .b` 里的 `.b`）与
   *  逗号列表里**已经带过 scope 的整段**之后；逗号列表里每一段都必须自己带 scope（见 `s()`）。 */
  const sc = (slot: QuickCaptureSlot): string => '.' + quickCaptureSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用；逗号列表里每一段都用它）。 */
  const s = (slot: QuickCaptureSlot): string => root + ' ' + sc(slot);
  const touch = String(QUICK_CAPTURE_TOUCH_PX) + 'px';
  const gap = String(QUICK_CAPTURE_GAP_PX) + 'px';
  const hover = '@media ' + QUICK_CAPTURE_HOVER_QUERY;
  const pressed = TOUCH_SLOTS.map((slot) => s(slot) + ':active').join(', ');
  const hovered = TOUCH_SLOTS.map((slot) => s(slot) + ':hover').join(', ');
  const still = TOUCH_SLOTS.map((slot) => s(slot)).join(', ');

  return [
    m('base-render.components-quick-capture-style.c001'),
    m('base-render.components-quick-capture-style.c002'),
    m('base-render.components-quick-capture-style.c003'),
    s('host') + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折。 */
    '  container-type: inline-size;',
    '  container-name: ' + QUICK_CAPTURE_CONTAINER + ';',
    '  display: block;',
    '  min-width: 0;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius') + ';',
    '  background: ' + skinVar('surface') + ';',
    /* 卡加一层 `shadow`（`paper`／`broadsheet` 的取值本就是 `none`：那两套的纸面有自己的边与纸纹）。 */
    '  box-shadow: ' + skinVar('shadow') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    /* 两处背景带（解析预览与「记过的」）的方角要跟着卡的圆角走。 */
    '  overflow: hidden;',
    '}',
    m('base-render.components-quick-capture-style.c004'),
    s('line') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: ' + gap + ';',
    '  padding: 6px 8px 6px 14px;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  min-width: 0;',
    '}',
    m('base-render.components-quick-capture-style.c005'),
    s('lead') + ' {',
    '  flex: 0 0 auto;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '}',
    m('base-render.components-quick-capture-style.c006'),
    s('input') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  min-height: ' + touch + ';',
    '  padding: 0;',
    '  border: 0;',
    '  background: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    // 字号：见页族字号地板（#1001，`page-ui` 的 `textEntryFloorCss()`）。
    '}',
    m('base-render.components-quick-capture-style.c007'),
    s('more') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  flex: 0 0 auto;',
    '  min-height: ' + touch + ';',
    '  padding: 0 10px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '}',
    m('base-render.components-quick-capture-style.c008'),
    s('save') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  flex: 0 0 auto;',
    '  min-height: ' + touch + ';',
    '  min-width: ' + touch + ';',
    '  padding: 0 16px;',
    '  border: 1px solid ' + skinVar('accent-text') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent-text') + ';',
    '  color: ' + skinVar('accent-ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '}',
    quickCaptureCellsCss({ prefix: p }),
    quickCaptureChoicesCss({ prefix: p }),
    quickCaptureDrawerCss({ prefix: p }),
    m('base-render.components-quick-capture-style.c009'),
    pressed + ' {',
    '  transform: scale(.98);',
    '}',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-quick-capture-style.c010'),
    hover + ' {',
    '  ' + hovered + ' {',
    '    border-color: ' + skinVar('accent') + ';',
    '  }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  ' + still + ' {',
    '    transition: none;',
    '    transform: none;',
    '  }',
    '}',
    m('base-render.components-quick-capture-style.c011'),
    m('base-render.components-quick-capture-style.c012'),
    '@container ' + QUICK_CAPTURE_CONTAINER + ' (max-width: ' + String(QUICK_CAPTURE_NARROW_PX) + 'px) {',
    '  ' + s('line') + ' {',
    '    padding: 7px 10px;',
    '  }',
    '  ' + s('input') + ' {',
    '    flex: 1 1 ' + String(QUICK_CAPTURE_BOX_MIN_PX) + 'px;',
    /* 窄档也不许把输入框挤成一道缝：给它一个下限，放不下就让下面两颗按钮换行（那一行是 `flex-wrap`）。 */
    '    min-width: ' + String(QUICK_CAPTURE_BOX_MIN_PX) + 'px;',
    '  }',
    '  ' + s('more') + ' {',
    '    margin-left: auto;',
    '  }',
    '  ' + s('parse') + ', ' + s('recent') + ' {',
    '    padding: 10px;',
    '  }',
    '}',
  ].join(LF);
}
