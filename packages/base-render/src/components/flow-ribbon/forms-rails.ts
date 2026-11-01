/** flow-ribbon · **两条构成轨的模型类型与算数**（同目录第二份几何来源；由 `forms.ts` 原样转出）。
 *
 *  为什么独立成件：`forms.ts` 到 355 行（本包告警线 350，`packages/base-render/AGENTS.md`），
 *  「桑基带」「交叉矩阵」「两条构成轨」各自是一段边界干净的几何——构成轨这一段搬过来
 *  （`style-rails.ts` 同款拆法）。**取值一个字节都不许改**——搬的只是「住哪个文件」，
 *  唯一例外是下面那条「同一笔钱只许一个数」（G3 修法，修处有注）。
 *
 *  本文件只依赖 `attrs.ts`（常量）与 `fields.ts`（格式化小件与读数小件），外加 `forms.ts` 的
 *  共用基座类型（`import type`，运行时无环）；`forms.ts` 把本件原样转出，`model.ts` 不用改。
 */
import { FLOW_RIBBON_SEG_MIN_PCT } from './attrs.js';
import { fmtAmount, fmtPct, type FlowRibbonReadout } from './fields.js';
import type { FlowRibbonBase } from './forms.js';
import { m } from '../../entries/index.js';

/** 构成轨里的一格。 */
export interface FlowRibbonSeg {
  readonly name: string;
  readonly amountText: string;
  readonly shareText: string;
  /** 格宽（占总额的百分比）：**同一总额、两条轨各自拉满 100%**，故上下两轨可以横着比。 */
  readonly widthPct: number;
  /** 这一段**放得下百分数**（格宽 ≥ `FLOW_RIBBON_SEG_MIN_PCT`）；放不下就不出字，读数在下面名单里。 */
  readonly numbered: boolean;
}

export interface FlowRibbonRailsModel extends FlowRibbonBase {
  readonly form: 'rails';
  readonly sourceSegs: readonly FlowRibbonSeg[];
  readonly useSegs: readonly FlowRibbonSeg[];
  readonly sourceRows: readonly FlowRibbonReadout[];
  readonly useRows: readonly FlowRibbonReadout[];
  readonly hubEqText: string;
  readonly hubNetText: string;
  readonly sourceHead: string;
  readonly useHead: string;
}

/** 一条构成轨：格宽＝这一格占总额的比例，**同一总额**故两条轨可以横着比。 */
function segsOf(rows: readonly FlowRibbonReadout[], total: number): readonly FlowRibbonSeg[] {
  /* 取整到千分位再分配余数（最大余数法）：几格加起来**恰好** 100.0%——
     各格各自四舍五入会差出 0.1%，那 0.1% 正是「轨没拉满」的缺口（判据按读数反推格宽时会读到）。 */
  const exact = rows.map((r) => r.amount / total * 1000);
  const perMille = exact.map((v) => Math.floor(v));
  let rest = 1000 - perMille.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, frac: v - perMille[i] })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < order.length && rest > 0; k += 1) { perMille[order[k].i] += 1; rest -= 1; }
  return rows.map((r, i) => {
    const widthPct = perMille[i] / 10;
    return {
      name: r.name,
      amountText: r.amountText,
      shareText: fmtPct(widthPct),
      widthPct,
      numbered: widthPct >= FLOW_RIBBON_SEG_MIN_PCT,
    };
  });
}

/** 形态 `rails`：两条构成轨 ＋ 中间汇合读数（进 ＝ 出）。 */
export function railsModel(base: FlowRibbonBase, sources: readonly FlowRibbonReadout[],
  uses: readonly FlowRibbonReadout[]): FlowRibbonRailsModel {
  const sourceSegs = segsOf(sources, base.total);
  const useSegs = segsOf(uses, base.total);
  /* **同一笔钱只许一个数**：名单行与无障碍名取格宽那一份（最大余数法），不另算一位小数——
     另算会在边界上差出 0.1%（如结余 38.5%／38.4%），同一页出现两个数。 */
  const rowsOf = (rows: readonly FlowRibbonReadout[], segs: readonly FlowRibbonSeg[]): readonly FlowRibbonReadout[] =>
    rows.map((r, i) => ({ ...r, sharePct: segs[i].widthPct, shareText: segs[i].shareText }));
  const sourceRows = rowsOf(sources, sourceSegs);
  const useRows = rowsOf(uses, useSegs);
  return {
    ...base,
    form: 'rails',
    sourceSegs,
    useSegs,
    sourceRows,
    useRows,
    /* 「进 ＝ 出」是结构事实（两边都是同一批流量的两种数法），所以这句是真算出来的，不是抄进来的。 */
    hubEqText: m('base-render.components-flow-ribbon-forms-rails.c001', {
      p0: String(fmtAmount(base.total)),
      p1: String(fmtAmount(base.total)),
      p2: String(base.unit),
    }),
    hubNetText: m('base-render.components-flow-ribbon-forms-rails.c002', { p0: String(base.unit) }),
    sourceHead: m('base-render.components-flow-ribbon-forms-rails.c003', { p0: String(String(sources.length)) }),
    useHead: m('base-render.components-flow-ribbon-forms-rails.c004', { p0: String(String(uses.length)) }),
    legend: [],
    ariaLabel: m('base-render.components-flow-ribbon-forms-rails.c005', {
      p0: String(sourceRows.map((s) => s.name + ' ' + s.shareText).join('、')),
      p1: String(useRows.map((u) => u.name + ' ' + u.shareText).join('、')),
      p2: String(fmtAmount(base.total)),
      p3: String(base.unit),
    }),
  };
}
