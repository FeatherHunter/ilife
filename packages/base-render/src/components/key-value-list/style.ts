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
  const s = (slot: KeyValueSlot): string => root + ' .' + keyValueSlot(slot, p);
  const row = s('row');

  return [
    '/* key-value-list（档案行 · 形态 A「两列，值右对齐」）：一串「字段：值」的清单。',
    '   值与标签的层次靠字重与字号，**不画点线**（点线是账目行 ledger-rows 的语汇）。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度收列。 */
    '  container-type: inline-size;',
    '  display: block;',
    '  min-width: 0;',
    '}',
    '/* 小标题：与账目行／明细行的小标题同一套字距语汇（同一族里只有一种小标题写法）。 */',
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
    '/* 一行两列：字段名定宽比例（36%）、值占其余；两列的 `minmax(0,…)` 让长串**换行而不撑破**。 */',
    row + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 36%) minmax(0, 1fr);',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '  min-height: ' + String(KEY_VALUE_MIN_ROW_PX) + 'px;',
    '  padding: 6px 0;',
    '}',
    '/* 相邻行之间一条发丝线（**行的分隔**是线，字段与值之间**不是**：那一段由列距承担）。 */',
    row + ' + ' + row + ' {',
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
    '/* 值：主角。右对齐 ⇒ 同一张档案里所有行的值右缘成列（多行扫读才成列）。 */',
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
    '/* 数字档：等宽字面（多行值右对齐时这一档才真对齐：等宽下每个数的宽度一致）。 */',
    s('value-num') + ' {',
    '  font-family: ' + skinVar('font-num') + ';',
    '}',
    '/* 后缀说明：住在值位那一格的**下一行**（同一格不给第二列），右对齐、弱一档。 */',
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
    '/* 焦点地板：本件自身不带可点元素；调用方若把值位包成"改这一项"的入口，焦点必须看得见',
    '   ——不许只写 `outline:none` 而不给替代。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(NARROW_PX) + 'px）：两列收成一列 —— 字段名一行、值一行，都靠左端。',
    '   窄档再右对齐会与左端的标签拉出一大段空档（读者要在两行之间来回找），故窄档一律左端对齐。',
    '   判的是**本件自己的宽度**：本件会被嵌进侧栏／面板／卡片，视口宽 ≠ 组件宽。 */',
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + row + ' {',
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
