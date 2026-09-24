/** stat-inline · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *     颜色／字面／字号一个都不写死在选择器里；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：折行靠内在尺寸 ＋ `flex-wrap`；本件一条 `@media` 都没有（它没有设备能力差异）。
 *
 *  几何契约（判据钉住）：每一项恒 `white-space:nowrap`（**值与其标签不许分家**）；
 *  整行可折行（`flex-wrap:wrap`）但**不横向溢出**（`scrollWidth ≤ clientWidth`）；
 *  数字一律 `tabular-nums`（换值／换页不跳位）。
 */
import { skinVar } from '../skin/contract.js';
import { STAT_INLINE_CLASS, statInlineSlot, type StatInlineSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function statInlineCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-stat-inline';
  const s = (slot: StatInlineSlot): string => root + ' .' + statInlineSlot(slot, p);

  return [
    '/* stat-inline（行内读数 · 形态 A「分隔点行内串」）：一句话里嵌几个数。',
    '   整行可折行，但**每一项恒不换行** —— 值与其标签不许分家（分家就会把数配错标签）。 */',
    box + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  min-width: 0;',
    '  padding: 2px 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.7;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 一项：标签 ＋ 值 ＋ 字尾挤在同一个不折行的单元里（`nowrap` 是本形态的保命符）。 */',
    s('item') + ' {',
    '  display: inline-flex;',
    '  align-items: baseline;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  white-space: nowrap;',
    '}',
    '/* 值：主角。主色 ＋ 等宽 ＋ `tabular-nums`（多行／多页之间数字右缘成列）。 */',
    s('value') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1;',
    '  letter-spacing: -.01em;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '/* 标签与字尾：与小结行同档的小字（比正文小一号、比脚注深一档 —— 这一行是要读的）。 */',
    s('label') + ' {',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    '/* 分隔点：项与项之间那一枚（`aria-hidden`，读屏不读它）。 */',
    s('sep') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '}',
  ].join(LF);
}
