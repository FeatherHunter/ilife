/** flow-ribbon · **三个骨架各自的形状**（同目录第二份样式来源；由 `style.ts` 的 `flowRibbonCss()` 汇总）。
 *
 *  为什么有这一件：本件一次落三个形态，样式段一度到 400 行（本包告警线 350，`packages/base-render/AGENTS.md`）。
 *  「桑基画布」「交叉矩阵」「两条构成轨」各自是一段边界干净的形状，独立成件；
 *  **取值一个字节都不许改**——搬的只是「住哪个文件」。
 *
 *  纪律同 `style.ts`：只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下且**每条里作用域恰一次**
 *  （拼后代选择器时只用不带 scope 的裸槽类 `c()`）／零 `:root`／零 `!important`／零颜色字面量
 *  （色阶与深浅都走 `color-mix()` 从 `accent` 与 `surface` 算，**任何一处都不拿 `ink` 系当面**）。
 */
import { skinVar } from '../skin/contract.js';
import { FLOW_RIBBON_NARROW_PX, FLOW_RIBBON_NODE_COL_PX, flowRibbonSlot, type FlowRibbonSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 来源那一列的色阶（第 1 股最深 → 第 6 股最浅）：**从 `accent` 往卡面掺出来的淡洗**，不是色值。 */
const SOURCE_WASH = [46, 36, 29, 23, 18, 14];

/** 桑基画布高（px）：`--flow-ribbon-plot-h` 没给时用它兜底（正常情况下那个变量由 `forms.ts` 算出来）。 */
const PLOT_FALLBACK_PX = 240;

/** 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 桑基与矩阵两段的样式（由 `flowRibbonCss()` 插在卡头与共用名单之间）。恒返回非空 CSS 文本。
 *
 *  边界：这两段住本文件，**两条构成轨那一段住 `style-rails.ts`**（同一条前缀、同一份纪律，
 *  由 `style.ts` 一次调用把三段按原顺序汇总——顺序即层叠顺序）。 */
export function flowRibbonFormsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = (slot: FlowRibbonSlot): string => root + ' .' + flowRibbonSlot(slot, p);
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const c = (slot: FlowRibbonSlot): string => '.' + flowRibbonSlot(slot, p);
  /** 一条色阶档位：带子、图例色块、名单色块三处**共用同一档**（序与色对得上才读得出对应）。 */
  const mark = (i: number): string => [c('lane') + '.is-s' + String(i + 1), c('legend-mark') + '.is-s' + String(i + 1),
    c('swatch') + '.is-s' + String(i + 1)].map((one) => root + ' ' + one).join(', ');
  /** 两列节点的宽度：**按轨道的同一把尺子**——列宽固定，带子只占中间那一段。 */
  const colW = 'max(' + String(FLOW_RIBBON_NODE_COL_PX) + 'px, 28%)';

  return [
    [`/* ── 桑基带：两列节点 ＋ 中间一条条带子 ────────────────────────────
   节点的高、带子两端的上下沿**全是算出来的百分比**（model.ts 的一把尺子），
   故这里只写位置与外观；带子的多边形由四个行内自定义属性给。 */`,
    s('plot') + ' {',
    '  position: relative;',
    '  height: var(' + '--flow-ribbon-plot-h, ' + String(PLOT_FALLBACK_PX) + 'px);',
    '  min-width: 0;',
    '}',
    /* 一条带子：上下沿在左右两端各给一对（`l1`／`l2` 在左、`r1`／`r2` 在右），
       `clip-path` 把整块方盒裁成那条带子。**两端的高相等**＝这笔金额 × 同一把尺子。 */
    s('lane') + ' {',
    '  position: absolute;',
    '  top: 0;',
    '  bottom: 0;',
    '  left: ' + colW + ';',
    '  right: ' + colW + ';',
    '  clip-path: polygon(0% var(--flow-ribbon-l1), 100% var(--flow-ribbon-r1), 100% var(--flow-ribbon-r2), 0% var(--flow-ribbon-l2));',
    '}',
    ...SOURCE_WASH.map((weight, i) => mark(i) + ' {'
      + LF + '  background: ' + wash(weight) + ';'
      + LF + '}'),
    /* 用途那一列的空心档：形上与来源色阶分得开（不是靠色相）。 */
    root + ' ' + c('swatch') + '.is-tgt, ' + root + ' ' + c('legend-mark') + '.is-tgt {',
    '  background: ' + skinVar('surface') + ';',
    '  border: 1px solid ' + skinVar('accent') + ';',
    '}',
    /* 一个节点：不透明的框压在带子两头收口；框里放名字与金额（**放不下就不放字，读数搬到下面名单里**）。
       顶边与高都取行内算出来的百分比——**与带子两端同一把尺子**。 */
    s('node') + ' {',
    '  position: absolute;',
    '  top: var(' + '--flow-ribbon-t, 0%);',
    '  height: var(' + '--flow-ribbon-h, 0%);',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-content: center;',
    '  align-items: baseline;',
    '  gap: 0 6px;',
    '  padding: 2px 6px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.3;',
    '}',
    s('node') + '.is-src {',
    '  left: 0;',
    '  width: ' + colW + ';',
    '  justify-content: flex-end;',
    '  text-align: right;',
    '}',
    s('node') + '.is-use {',
    '  right: 0;',
    '  width: ' + colW + ';',
    '}',
    s('nd-name') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '}',
    s('nd-amount') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-style: normal;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}'].join(LF),

    [`/* ── 交叉矩阵：行＝来源、列＝用途 ────────────────────────────────
   格宽按占比画的那一条在矩阵里是「条长」：--flow-ribbon-w 是这一格 ÷ **全表最大格**
   （不是本行最大——否则每行最深的那一格看起来一样重要）。 */`,
    s('matrix') + ' {',
    '  width: 100%;',
    '  min-width: 0;',
    '  border-collapse: collapse;',
    '}',
    /* 行头那一列**按内容定宽**（`width: 1%` ＋ 自动表布局：先缩到内容宽，余下的均分给各列）
       ——12 位金额的行合计写在这个格子里，定宽会让它溢出。 */
    s('mat-rowhd') + ' {',
    '  width: 1%;',
    '  min-width: 0;',
    '  padding: 4px 6px 4px 0;',
    '  text-align: left;',
    '  vertical-align: middle;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '}',
    s('mat-rowhd') + ' ' + c('cell-num') + ' {',
    '  display: block;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    /* 一格：底色深浅与条长**都是同一把尺子**（都按全表最大格）——色只走强调色系的淡洗。 */
    s('mat-cell') + ', ' + s('mat-total') + ' {',
    '  position: relative;',
    '  padding: 5px 2px 8px;',
    '  text-align: center;',
    '  vertical-align: middle;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  background: color-mix(in srgb, ' + skinVar('accent') + ' var(' + '--flow-ribbon-mix, 0%), '
      + skinVar('surface') + ');',
    '}',
    s('mat-head') + ' ' + c('mat-cell') + ' {',
    '  padding-bottom: 4px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  background: none;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 左上角那格（那一列的宽由它兜底）：一行写清行与列是什么——它是**列宽的底线**，
       折成三行会让整张表的第一列看起来像坏了（实测过）。 */
    s('mat-head') + ' ' + c('mat-rowhd') + ' {',
    '  white-space: nowrap;',
    '}',
    s('mat-foot') + ' ' + c('mat-rowhd') + ', ' + s('mat-foot') + ' ' + c('mat-total') + ' {',
    '  border-top: 2px solid ' + skinVar('line') + ';',
    '  border-bottom: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '}',
    s('mat-foot') + ' ' + c('mat-total') + ' {',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    /* 条：**无文字的图形 ⇒ `accent` 实底**（宽＝算出来的百分比）。 */
    s('cell-bar') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  bottom: 0;',
    '  height: 3px;',
    '  width: var(' + '--flow-ribbon-w, 0%);',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('cell-num') + ' {',
    '  display: block;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('cell-pct') + ' {',
    '  display: block;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-style: normal;',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    /* 窄容器：矩阵改成**一行一格**（列名顶在数字前）——四列并排时一格只有 60 出头，
       金额只能截断才塞得下，而金额永远不许截断。骨架没换（还是行＝来源、列＝用途），
       换的是「一行放几列」这一处排版；**格宽照旧按占比画**（一格满宽，条长就是占比的尺子）。 */
    '@container (max-width: ' + String(FLOW_RIBBON_NARROW_PX) + 'px) {',
    '  ' + s('matrix') + ' {',
    '    display: block;',
    '  }',
    '  ' + s('mat-head') + ' {',
    '    display: none;',
    '  }',
    '  ' + s('mat-body') + ', ' + s('mat-foot') + ' {',
    '    display: block;',
    '  }',
    '  ' + s('mat-row') + ' {',
    '    display: block;',
    '    min-width: 0;',
    '    padding: 6px 0;',
    '    border-bottom: 1px solid ' + skinVar('line') + ';',
    '  }',
    '  ' + s('mat-foot') + ' ' + c('mat-row') + ' {',
    '    border-bottom: 0;',
    '  }',
    '  ' + s('mat-rowhd') + ' {',
    '    display: flex;',
    '    align-items: baseline;',
    '    gap: 8px;',
    '    width: auto;',
    '    min-width: 0;',
    '    padding: 0 0 2px;',
    '    border-bottom: 0;',
    '    overflow-wrap: anywhere;',
    '  }',
    '  ' + s('mat-foot') + ' ' + c('mat-rowhd') + ' {',
    '    border-top: 0;',
    '  }',
    /* 一格独占一行：**条照旧按占比画**（一格满宽 ⇒ 每一格与同行别格同一个满格参照）。 */
    '  ' + s('mat-cell') + ', ' + s('mat-total') + ' {',
    '    display: block;',
    '    min-width: 0;',
    '    padding: 1px 0 7px;',
    '    border-bottom: 0;',
    '    text-align: left;',
    '  }',
    '  ' + s('mat-cell') + '::before, ' + s('mat-total') + '::before {',
    '    content: attr(data-use);',
    '    margin-right: 6px;',
    '    color: ' + skinVar('ink-3') + ';',
    '    font-size: ' + skinVar('fs-xs') + ';',
    '    font-weight: 600;',
    '  }',
    '  ' + s('cell-num') + ' {',
    '    display: inline;',
    '  }',
    '  ' + s('cell-pct') + ' {',
    '    display: inline;',
    '    margin-left: 6px;',
    '  }',
    '}'].join(LF),
  ].join(LF);
}
