/** compare-columns · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下，且只读本件自己的类名；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：本件设 `container-type: inline-size`，窄档调整走 `@container`；本件**一条 `@media` 都没有**
 *     （媒体查询只许判设备能力，不许判宽度——这些页面会被嵌进侧栏／面板／卡片）。
 *
 *  几何契约（判据钉住）：
 *   · 宽档（≥ `COMPARE_COLUMNS_NARROW_PX`）＝三列「左窗 ｜ 项名 ｜ 右窗」，两侧的条**共用一条刻度**（按最大值折算）；
 *   · 窄档（< 阈值）＝**每项三行**（项名一行、左窗一行、右窗一行），两侧改由每行自己的窗口名领读——
 *     两列的读数在窄档绝不许被挤成「三条竖线」（项名一列、两侧各一列，字数一长就竖排）。
 *   · 项名那一列是**定宽带**（`COMPARE_COLUMNS_LABEL_BAND_EM` em）：两窗的条长因此可比，
 *     项名长了在这条带里换行，不许 `…` 截断。
 */
import { skinVar } from '../skin/contract.js';
import {
  compareColumnsSideClass,
  compareColumnsSlot,
  compareColumnsToneClass,
  type CompareColumnsSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 窄容器阈值（px）：两列并排改走「每项三行」。判的是**本件自己的宽度**（`@container`），不是视口宽度。 */
export const COMPARE_COLUMNS_NARROW_PX = 560;

/** 中缝项名列的定宽带（em）：两窗的条长因它可比，项名长了在这条带里换行。 */
export const COMPARE_COLUMNS_LABEL_BAND_EM = 6;

/** 条的最小宽度（px）：容器的宽度全被两侧的读数吃掉时，条仍留得下一条可见的长度。 */
export const COMPARE_COLUMNS_BAR_MIN_PX = 8;

/** 条的厚度（px）。 */
export const COMPARE_COLUMNS_BAR_THICKNESS_PX = 8;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function compareColumnsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-compare-columns';
  const s = (slot: CompareColumnsSlot): string => root + ' .' + compareColumnsSlot(slot, p);
  /** **组合符右侧一律用它**：带 scope 前缀的选择器只能出现在**最左**——`.scope .a > .scope .b` 里
   *  第二个 `.scope` 改成要求「`.a` 的直接子元素里那个 `.scope`」，于是整条规则**永不命中**（实测踩过：
   *  条的左右锚点、第一名的字号都因此没生效）。右侧只写本件自己的类名，作用域由最左那一段承担。 */
  const inner = (slot: CompareColumnsSlot): string => '.' + compareColumnsSlot(slot, p);
  const side = box + '-side';
  const label = box + '-label';
  const bar = box + '-bar';
  const barBare = inner('bar');
  const fillBare = inner('fill');
  const rowBare = inner('row');
  const value = box + '-value';
  const band = 'minmax(0, ' + String(COMPARE_COLUMNS_LABEL_BAND_EM) + 'em)';
  const track = 'minmax(' + String(COMPARE_COLUMNS_BAR_MIN_PX) + 'px, 1fr)';

  return [
    '/* compare-columns（双列对照 · 形态 A「背靠背条形」）：左窗 ｜ 项名 ｜ 右窗 ＋ 差额单独一行。',
    '   层次不靠阴影与大圆角：靠中缝那一列、发丝线、条长差 ⇒ 换皮只换取值。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度改档。 */
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 2px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    '/* 表头行：左右两个窗口名贴着中缝；中缝那一列与逐项行同一宽度（列头与项名对得上）。 */',
    s('head') + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 1fr) ' + band + ' minmax(0, 1fr);',
    '  gap: 0 8px;',
    '  padding-bottom: 6px;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .02em;',
    '  overflow-wrap: anywhere;',
    '}',
    s('head-left') + ' {',
    '  grid-column: 1;',
    '  text-align: right;',
    '}',
    s('head-right') + ' {',
    '  grid-column: 3;',
    '  text-align: left;',
    '}',
    s('list') + ' {',
    '  display: grid;',
    '  min-width: 0;',
    '}',
    '/* 一项一行：三列与表头行同一模板 ⇒ 上下对得齐。 */',
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 1fr) ' + band + ' minmax(0, 1fr);',
    '  gap: 0 8px;',
    '  align-items: center;',
    '  min-width: 0;',
    '  padding: 8px 0;',
    '}',
    s('row') + ' + ' + rowBare + ' {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    '/* 两侧：左窗是「值 → 条」（条从外侧伸向中线），右窗是「条 → 值」（条从中线伸出）——',
    '   两侧的条都从**外缘**起步、向中缝生长，于是两条的末端在同一根轴上可直接比。 */',
    s('side') + ' {',
    '  display: grid;',
    '  align-items: center;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    side + '.' + compareColumnsSideClass('left') + ' {',
    '  grid-template-columns: auto ' + track + ';',
    '}',
    side + '.' + compareColumnsSideClass('right') + ' {',
    '  grid-template-columns: ' + track + ' auto;',
    '}',
    '/* 窗口名：宽档由表头行给（这里收起），窄档才在每一侧的领读位现身——同一句话不念两遍。',
    '   **不写 `nowrap`**：窗口名一长（「最近三十天窗口」）就要能折行，不许把行顶宽。 */',
    s('side-name') + ' {',
    '  display: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .02em;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 读数：数字走 `font-num` ＋ 等宽数字（换页／换值不跳位）。**不写 `nowrap`**：',
    '   长读数宁可换行，也不许顶破容器（零横向溢出是硬判据）。 */',
    s('value') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  line-height: 1.35;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('unit') + ' {',
    '  margin-left: 3px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    '/* 条：外框只负责长度，厚度与圆角取皮肤（报刊档圆角为 0，条成直角——这不算塌）。 */',
    s('bar') + ' {',
    '  display: block;',
    '  min-width: 0;',
    '  height: ' + String(COMPARE_COLUMNS_BAR_THICKNESS_PX) + 'px;',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  overflow: hidden;',
    '}',
    s('fill') + ' {',
    '  display: block;',
    '  height: 100%;',
    '  background: ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '}',
    '/* 左窗的条贴着自己的读数起步（向外侧对齐），右窗的条贴着外缘（向中缝生长）。',
    '   注意层级：填充住在外框**里面**（`.side > .bar > .fill`）——写成 `.side > .fill` 一条都不命中。 */',
    side + '.' + compareColumnsSideClass('left') + ' > ' + barBare + ' > ' + fillBare + ' {',
    '  margin-right: auto;',
    '}',
    side + '.' + compareColumnsSideClass('right') + ' > ' + barBare + ' > ' + fillBare + ' {',
    '  margin-left: auto;',
    '}',
    '/* 中缝那一列：两窗都有的项名。定宽带里换行，长名不许 `…`。 */',
    label + ' {',
    '  grid-column: 2;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  line-height: 1.45;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 差额单独一行：**本形态的结论位**，不是脚注——所以给它发丝线上沿与更大的字号。 */',
    s('diff') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  min-width: 0;',
    '  margin-top: 2px;',
    '  padding: 10px 0 2px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('diff-label') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '}',
    s('diff-value') + ' {',
    '  display: inline-flex;',
    '  align-items: baseline;',
    '  gap: 2px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 方向字形：非文本的强调位，取 `accent-text`（强调色的文本档，小字号也过对比地板）。 */',
    s('diff-value') + ' > i {',
    '  font-style: normal;',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    '/* 语气色阶只在 `sense` 点名时上——涨是好是坏由调用方定，本件不猜（缺省只有字形与正负号）。 */',
    s('diff-value') + '.' + compareColumnsToneClass('good') + ' {',
    '  color: ' + skinVar('ok') + ';',
    '}',
    s('diff-value') + '.' + compareColumnsToneClass('bad') + ' {',
    '  color: ' + skinVar('danger') + ';',
    '}',
    '/* 口径行：这两个窗口到底是什么、差额怎么算的（要读的正文，走 `ink-2` 不走更浅的一档）。 */',
    s('caliber') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 8px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.7;',
    '  overflow-wrap: anywhere;',
    '}',
    s('caliber') + ' > b {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .06em;',
    '}',
    s('caliber') + ' > span {',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方若把项名或读数包成链接，焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(COMPARE_COLUMNS_NARROW_PX) + 'px）：三列并排会把项名与两侧读数挤成三条竖线',
    '   ⇒ 每项改排**三行**：项名一行、左窗一行、右窗一行；两窗由每行自己的窗口名领读，表头行收起。 */',
    '@container (max-width: ' + String(COMPARE_COLUMNS_NARROW_PX) + 'px) {',
    '  ' + s('head') + ' {',
    '    display: none;',
    '  }',
    '  ' + s('row') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '    gap: 2px;',
    '    padding: 10px 0;',
    '  }',
    '  ' + label + ' {',
    '    grid-column: 1;',
    '    grid-row: 1;',
    '  }',
    /* 两处都写全（左右两个侧状态各一次）：窄档要覆盖宽档的单侧模板，选择器强度必须对得上。 */
    '  ' + side + '.' + compareColumnsSideClass('left') + ',',
    '  ' + side + '.' + compareColumnsSideClass('right') + ' {',
    '    grid-template-columns: auto ' + track + ' auto;',
    '  }',
    '  ' + side + '.' + compareColumnsSideClass('left') + ' {',
    '    grid-row: 2;',
    '  }',
    '  ' + side + '.' + compareColumnsSideClass('right') + ' {',
    '    grid-row: 3;',
    '  }',
    '  ' + s('side-name') + ' {',
    '    display: block;',
    '    grid-column: 1;',
    '  }',
    '  ' + bar + ' {',
    '    grid-column: 2;',
    '  }',
    '  ' + value + ' {',
    '    grid-column: 3;',
    '    text-align: right;',
    '  }',
    '  ' + side + '.' + compareColumnsSideClass('left') + ' > ' + barBare + ' > ' + fillBare + ',',
    '  ' + side + '.' + compareColumnsSideClass('right') + ' > ' + barBare + ' > ' + fillBare + ' {',
    '    margin-left: 0;',
    '    margin-right: auto;',
    '  }',
    '}',
  ].join(LF);
}
