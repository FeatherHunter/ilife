/** key-value-list · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *     颜色／圆角／字面／字号一个都不写死在选择器里；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：两列切换走 `@container` ＋ `minmax(0,…)`；`@media` 只判设备能力。
 *
 *  几何契约（判据钉住）：值列右对齐（`justify-self:end` ＋ `text-align:right`）、`tabular-nums`；
 *  长值 `overflow-wrap:anywhere`（**永不 `…` 截断**）；行高下限 ＝ `KEY_VALUE_MIN_ROW_PX`。
 */
import { skinVar } from '../skin/contract.js';
import {
  KEY_VALUE_CLASS,
  KEY_VALUE_MIN_ROW_PX,
  keyValueSlot,
  type KeyValueSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 窄容器阈值（px）：两列收成一列（字段名一行、值一行，都靠左）。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
const NARROW_PX = 400;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function keyValueListCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-key-value-list';
  /** 槽位的**裸类名**（不带 scope）：**只用在组合器的右边**（`+`／`>`／后代那一段），
   *  左边（选择器开头）一律走 `s()`——开头那次 scope 不能省，省了整条就裸着（与别件串味）。 */
  const slot = (name: KeyValueSlot): string => '.' + keyValueSlot(name, p);
  /** 带 scope 的完整选择器：**每条规则的左端**都用它。 */
  const s = (name: KeyValueSlot): string => root + ' ' + slot(name);

  return [
    m('base-render.components-key-value-list-style.c001'),
    m('base-render.components-key-value-list-style.c002'),
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度收列。 */
    '  container-type: inline-size;',
    '  display: block;',
    '  min-width: 0;',
    '}',
    m('base-render.components-key-value-list-style.c003'),
    s('heading') + ' {',
    '  margin: 0 0 4px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .06em;',
    '  overflow-wrap: anywhere;',
    '}',
    s('list') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '}',
    m('base-render.components-key-value-list-style.c004'),
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 36%) minmax(0, 1fr);',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '  min-height: ' + String(KEY_VALUE_MIN_ROW_PX) + 'px;',
    '  padding: 6px 0;',
    '}',
    m('base-render.components-key-value-list-style.c005'),
    m('base-render.components-key-value-list-style.c006'),
    s('row') + ' + ' + slot('row') + ' {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('term') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  line-height: 1.5;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-key-value-list-style.c007'),
    s('value') + ' {',
    '  justify-self: end;',
    '  margin: 0;',
    '  min-width: 0;',
    '  max-width: 100%;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.4;',
    '  text-align: right;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-key-value-list-style.c008'),
    s('value-num') + ' {',
    '  font-family: ' + skinVar('font-num') + ';',
    '}',
    m('base-render.components-key-value-list-style.c009'),
    s('note') + ' {',
    '  grid-column: 2;',
    '  justify-self: end;',
    '  margin: 0;',
    '  min-width: 0;',
    '  max-width: 100%;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  line-height: 1.5;',
    '  text-align: right;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-key-value-list-style.c010'),
    m('base-render.components-key-value-list-style.c011'),
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-key-value-list-style.c012', { p0: String(String(NARROW_PX)) }),
    m('base-render.components-key-value-list-style.c013'),
    m('base-render.components-key-value-list-style.c014'),
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('row') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '  ' + s('value') + ' {',
    '    justify-self: start;',
    '    text-align: left;',
    '  }',
    '  ' + s('note') + ' {',
    '    grid-column: 1;',
    '    justify-self: start;',
    '    text-align: left;',
    '  }',
    '}',
  ].join(LF);
}
