/** cash-waterline · **样式段汇总入口**（本件唯一的样式出口）。
 *
 *  边界：卡头、三形态共用的图例与点名那块与脚注、焦点环，以及窄容器的两处覆盖住这一份；
 *  三个形态各自的形状（形态 A 柱与底线／形态 B 每行一条轨道／形态 C 进出水三栏）住同目录 `style-forms.ts`，
 *  由这一次调用**原样**汇总——拆分只为行数（拆件先例 `scatter-fit/style-forms.ts`、`date-range/style-calendar.ts`），
 *  **取值一个字节都没改**：`cashWaterlineCss()` 仍是本件唯一的样式入口，产物逐字节不变。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下、**每条里作用域恰一次**（拼后代／兄弟选择器时只用不带 scope 的裸槽类）；
 *     不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  强制的三处口径（判据钉住）：
 *   · **选中／强调走强调色系**：今天那一格＝一根 `accent` 竖游标（无文字的点／格／条只许 `accent` 实底或 `accent` 描边）；
 *     轴上的「今天」走 `accent-text`（文本档，对底 ≥4.5:1）。**没有一处拿正文墨色当"面"**。
 *   · **状态靠形 ＋ 字 ＋ 色**：跌破底线＝柱色 `danger`（色）＋ 点名那块逐日写日期与金额（字）＋ 点名行的左侧 2px 侧标（形）；
 *     今天＝贯穿画布的竖游标（形）＋ 轴上的「今天」（字）＋ 强调色系（色）。
 *   · **几何只用本件自己的自定义属性**（`--cash-waterline-h`／`-w`／`-thr`／`-used-thr`，名字住 `attrs.ts`）——
 *     那是 `photo-compare` 的 `--photo-compare-split` 同一条先例，不占 `--ilife-*` 皮肤命名空间。
 */
import { skinVar } from '../skin/contract.js';
import { cashWaterlineSlot, type CashWaterlineSlot } from './attrs.js';
import { cashWaterlineFormsCss } from './style-forms.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/* 画布高度的取值随形态 A 住 `style-forms.ts`；本件对外的尺常量名不变，这里原样转出（照 `scatter-fit` 的先例）。 */
export { CASH_WATERLINE_PLOT_HEIGHT_PX } from './style-forms.js';

/** 窄容器一档的画布高度（px）：再高就把版面顶长了。**出口给判据**（两档高度都得断到，
 *  否则把这条规则删掉判据还是绿的——2026-09-25 审查席点名的判据缺口）。 */
export const CASH_WATERLINE_NARROW_PLOT_HEIGHT_PX = 150;

/** 窄容器阈值（px）：画布矮一档、进出水三栏由并排改成一列。**这是本件自己的宽度**（`@container` 判的）。 */
const NARROW_PX = 620;

/** 本组件的样式段（＝这一份 ＋ `style-forms.ts` 那一份，**一次调用拿全部**）。恒返回非空 CSS 文本。 */
export function cashWaterlineCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-cash-waterline';
  const s = (slot: CashWaterlineSlot): string => root + ' .' + cashWaterlineSlot(slot, p);

  return [
    '/* cash-waterline（现金水位）：三个形态——逐日水位柱／每周子弹图／进出水三栏。',
    '   水位沿的是**时间**：读的是「存量还在不在底线之上」，跌破的那几天逐日点名。',
    '   底色只读皮肤 token（换皮只换取值）；宽度只由容器判。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`：本件有「`width:100%` ＋ 1px 边框」那几根条，
       在默认 content-box 下会比容器宽出两像素 ⇒ 390 档实测横溢。故在**自己的子树里**钉成 border-box。 */
    '  box-sizing: border-box;',
    '  display: grid;',
    '  gap: 10px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    box + ' * {',
    '  box-sizing: border-box;',
    '}',
    /* 卡头 */
    s('hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 3px 10px;',
    '  min-width: 0;',
    '}',
    s('title') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.35;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 卡头右端那一组：本件算出来的第三格 ＋ 调用方给的那句。整组靠右，窄档自己折行。 */
    s('hd-tail') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 3px 10px;',
    '  flex: 0 1 auto;',
    '  margin-left: auto;',
    '  min-width: 0;',
    '}',
    s('head-extra') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 印（如「预算 6 000 元」）：**上界在换行上**，不写 `nowrap`、不许把它撑出根——
       长印（原型页上就是「09-01 – 09-24」这种，现实里还会有很长的区间说明）在窄容器里
       必须折得下来；一根不折的 `nowrap` 会把根撑到 900px 宽（2026-09-25 审查席在 320 档实测到）。 */
    s('stamp') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 三个形态各自的形状（`style-forms.ts`）：插在卡头之后、共用图例之前——
       插在这一行的位置上，顺序即层叠顺序，**产物逐字节不变**。 */
    cashWaterlineFormsCss({ prefix: p }),
    /* ── 两形态共用的图例、点名那块与脚注 ────────────────────────── */
    s('legend') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 4px 16px;',
    '  min-width: 0;',
    '  margin: 0;',
    '  padding: 0;',
    '  list-style: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('legend-item') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  min-width: 0;',
    '}',
    s('swatch') + ' {',
    '  display: block;',
    '  flex: none;',
    '  width: 10px;',
    '  height: 10px;',
    '  border-radius: 2px;',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('swatch') + '.is-low {',
    '  background: ' + skinVar('danger') + ';',
    '}',
    s('swatch') + '.is-today {',
    '  background: none;',
    '  border: 2px solid ' + skinVar('accent') + ';',
    '}',
    /* 告急日点名：跌破底线的日子**逐日写出来**（日期 ＋ 那天花了多少 ＋ 余量）。 */
    s('lowlist') + ' {',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  padding-top: 8px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('low-title') + ' {',
    '  margin: 0;',
    '  color: ' + skinVar('danger') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '}',
    s('low-rows') + ' {',
    '  display: grid;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  margin: 0;',
    '  padding: 0;',
    '  list-style: none;',
    '}',
    s('low-row') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  min-width: 0;',
    '  padding-left: 8px;',
    '  border-left: 2px solid ' + skinVar('danger') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '}',
    s('low-day') + ' {',
    '  color: ' + skinVar('danger') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    s('low-spend') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('low-pct') + ' {',
    '  margin-left: auto;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  padding-top: 10px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把点名那块或图例包成入口时，焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(NARROW_PX) + 'px）：画布矮一档、进出水三栏改一列',
    '   ——三栏并排会被压成三根窄柱，读数（钱数）就没地方站了。 */',
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('plot') + ' {',
    '    height: ' + String(CASH_WATERLINE_NARROW_PLOT_HEIGHT_PX) + 'px;',
    '  }',
    '  ' + s('three') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
  ].join(LF);
}
