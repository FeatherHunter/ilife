/** flow-ribbon · **两个骨架的模型类型与算数**（桑基带／交叉矩阵；两条构成轨住 `forms-rails.ts`）。
 *
 *  **这一件只有一把尺子**（头号口径的全文见 `model.ts` 的件头）：
 *  一个总额 `total`（＝所有流量之和，两侧都是它的两种数法）＋ 一个跨度
 *  `spanPct ＝ 100 − 缝 × (较多那一列的节点数 − 1)`（两列**共用**）⇒ `每 1% ＝ total ÷ spanPct 元`；
 *  桑基的节点高与带子两端高、矩阵的条长、两条构成轨的格宽**全从它算**，任何一处都不许自己归一。
 *
 *  为什么把这三种几何独立成一件：两件事挤在 `model.ts` 里会过本包的行数告警线（350 行／LF 口径）。
 *  本文件只依赖 `attrs.ts`（常量与入参类型）与 `fields.ts`（格式化小件与读数小件），**没有环**
 *  （构成轨那一段另住 `forms-rails.ts`，`import type` 回指本文件的基座类型，运行时无环）。
 */
import {
  FLOW_RIBBON_GAP_PCT,
  FLOW_RIBBON_LABEL_MIN_PX,
  FLOW_RIBBON_MISSING,
  FLOW_RIBBON_NODE_INNER_PX,
  FLOW_RIBBON_PLOT_MAX_PX,
  FLOW_RIBBON_PLOT_MIN_PX,
  type FlowRibbonForm,
  type FlowRibbonLink,
} from './attrs.js';
import {
  clampPct, estimatePx, fmtAmount, round1, round2, shareOf, type FlowRibbonReadout,
} from './fields.js';
/* 构成轨那一段住 `forms-rails.ts`（`style-rails.ts` 同款拆法）：本文件原样转出，`model.ts` 不用改。 */
import type { FlowRibbonRailsModel } from './forms-rails.js';
export { railsModel, type FlowRibbonRailsModel, type FlowRibbonSeg } from './forms-rails.js';

/** 图例的一项（形 ＋ 字）。 */
export interface FlowRibbonLegendItem {
  readonly mark: string;
  readonly text: string;
}

/** 三形态共用的那一半模型。 */
export interface FlowRibbonBase {
  readonly form: FlowRibbonForm;
  readonly title: string;
  readonly stamp?: string;
  readonly unit: string;
  readonly note: string;
  readonly extraClass?: string;
  /** 总额（所有流量之和）。 */
  readonly total: number;
  /** 总额屏上写法（含单位）。 */
  readonly totalText: string;
  /** 无障碍名（逐项读得出名字与金额）。 */
  readonly ariaLabel: string;
  readonly legend: readonly FlowRibbonLegendItem[];
}

/** 桑基的一个节点：名字 ＋ 金额 ＋ **在画布上的顶边与高**（同一把尺子算出来的百分比）。 */
export interface FlowRibbonSankeyNode extends FlowRibbonReadout {
  readonly mark: string;
  readonly topPct: number;
  readonly heightPct: number;
  /** 这个读数**放得进节点框**（高够 ＋ 名字与金额各占一行都放得下）——放不进就搬到下面的名单里。 */
  readonly inside: boolean;
}

/** 一条带子：左端（来源侧）与右端（用途侧）各自的上下沿；**两端的高相等**（＝金额 × 同一把尺子）。 */
export interface FlowRibbonLane {
  readonly from: string;
  readonly to: string;
  readonly amountText: string;
  readonly shareText: string;
  readonly mark: string;
  readonly l1: number;
  readonly l2: number;
  readonly r1: number;
  readonly r2: number;
  readonly title: string;
}

export interface FlowRibbonSankeyModel extends FlowRibbonBase {
  readonly form: 'sankey';
  /** 画布高度（px）：由最小的一股算出来，保证它的框放得下两行读数（有上限，超了就搬名单）。 */
  readonly plotPx: number;
  /** 两列共用的跨度（占画布高的百分比）。 */
  readonly spanPct: number;
  /** **这把尺子的换算**（`1% 高 ≈ 123 元`）——口径行照它写，读者能横着比。 */
  readonly perPctText: string;
  readonly sources: readonly FlowRibbonSankeyNode[];
  readonly uses: readonly FlowRibbonSankeyNode[];
  readonly lanes: readonly FlowRibbonLane[];
  /** 装不进节点框的那些读数（**每一条读数在整张图上恰好印一次**：不在框里，就在这张名单里）。 */
  readonly readouts: readonly (FlowRibbonReadout & { readonly mark: string; readonly side: string })[];
}

/** 矩阵的一格。 */
export interface FlowRibbonMatrixCell {
  readonly use: string;
  /** 空格（这一股确实没往这里流）：金额写 `—`、不出百分数。 */
  readonly empty: boolean;
  readonly amountText: string;
  readonly shareText: string;
  /** 条宽（占**全表最大格**的百分比）：0 或 8%–100%。 */
  readonly barPct: number;
  /** 底色往强调色掺的权重（百分比，从 token 算）。 */
  readonly mixPct: number;
  readonly title: string;
}

export interface FlowRibbonMatrixRow {
  readonly name: string;
  readonly amountText: string;
  readonly cells: readonly FlowRibbonMatrixCell[];
}

export interface FlowRibbonMatrixModel extends FlowRibbonBase {
  readonly form: 'matrix';
  readonly useNames: readonly string[];
  readonly rows: readonly FlowRibbonMatrixRow[];
  /** 合计行（逐列合计）。 */
  readonly foot: readonly FlowRibbonMatrixCell[];
  /** 全表最大的那一格（条长与深浅都按它算，**不是按本行最大**）。 */
  readonly maxText: string;
}

/** 构成轨的类型与算数住 `forms-rails.ts`（上头已转出，这里不重写第二遍）。 */

export type FlowRibbonModel = FlowRibbonSankeyModel | FlowRibbonMatrixModel | FlowRibbonRailsModel;

/* ── 三个骨架 ───────────────────────────────────────────────────── */

/** 来源那一列的色阶档名（第 1 股最深，第 6 股最浅）；用途那一列是**空心那一档**（形上分得开）。 */
const sourceMark = (i: number): string => 'is-s' + String(i + 1);
const USE_MARK = 'is-tgt';

/** 形态 `sankey`：两列节点 ＋ 一条条带子，**两列同一把尺子**。 */
export function sankeyModel(base: FlowRibbonBase, sources: readonly FlowRibbonReadout[],
  uses: readonly FlowRibbonReadout[], links: readonly FlowRibbonLink[]): FlowRibbonSankeyModel {
  const nMax = Math.max(sources.length, uses.length);
  const spanPct = round2(100 - FLOW_RIBBON_GAP_PCT * (nMax - 1));
  /* **画布高度**：让最小的一股也放得下两行读数。夹在上下限之间——顶到上限还放不下（那一股太小）时，
     读数会搬到下面那张名单里（`inside === false`），所以**任何一股的读数都不会被压、更不会被截断**。 */
  const minShare = Math.min(...sources.concat(uses).map((n) => n.amount)) / base.total;
  const plotPx = Math.min(FLOW_RIBBON_PLOT_MAX_PX,
    Math.max(FLOW_RIBBON_PLOT_MIN_PX, Math.ceil(FLOW_RIBBON_LABEL_MIN_PX / (minShare * spanPct / 100))));

  /** 一列节点的顶边与高：顶边由**已四舍五入过的高度**逐项累加——这样印在行内样式上的读数自己就是自洽的；
   *  最后一项**吸收整列的取整误差**（右列因此正好落到 100%）。 */
  function column(rows: readonly FlowRibbonReadout[], markOf: (i: number) => string): readonly FlowRibbonSankeyNode[] {
    const heights = rows.map((r) => round2(r.amount / base.total * spanPct));
    if (heights.length > 0) {
      const sum = heights.reduce((acc, h) => acc + h, 0);
      const want = round2(rows.reduce((acc, r) => acc + r.amount, 0) / base.total * spanPct);
      heights[heights.length - 1] = round2(heights[heights.length - 1] + (want - sum));
    }
    let top = 0;
    return rows.map((row, i) => {
      const heightPct = heights[i];
      const node: FlowRibbonSankeyNode = {
        ...row,
        mark: markOf(i),
        topPct: clampPct(top),
        heightPct,
        inside: heightPct / 100 * plotPx >= FLOW_RIBBON_LABEL_MIN_PX
          && estimatePx(row.name) <= FLOW_RIBBON_NODE_INNER_PX
          && estimatePx(row.amountText) <= FLOW_RIBBON_NODE_INNER_PX,
      };
      top = round2(top + heightPct + FLOW_RIBBON_GAP_PCT);
      return node;
    });
  }

  const srcNodes = column(sources, sourceMark);
  const useNodes = column(uses, () => USE_MARK);
  /* 带子：左端落在来源节点里（按用途名单的顺序往下排），右端落在用途节点里（按来源名单的顺序往下排）；
     **两端的高相等**＝这笔金额 × 同一把尺子。两端各自按**它自己那个节点的框**收口
     （子带的上下沿是累加两位小数出来的，最后一小段可能比"剩下的那点空"多出 0.01%）。 */
  const leftOff = new Map<string, number>();
  const rightOff = new Map<string, number>();
  const lanes: FlowRibbonLane[] = [];
  for (let si = 0; si < srcNodes.length; si += 1) {
    for (let ui = 0; ui < useNodes.length; ui += 1) {
      const link = links.find((l) => l.from === srcNodes[si].name && l.to === useNodes[ui].name);
      if (link === undefined) continue;
      const h = round2(link.amount / base.total * spanPct);
      const src = srcNodes[si];
      const use = useNodes[ui];
      const l1 = clampPct(src.topPct + (leftOff.get(src.name) ?? 0));
      const r1 = clampPct(use.topPct + (rightOff.get(use.name) ?? 0));
      leftOff.set(src.name, round2((leftOff.get(src.name) ?? 0) + h));
      rightOff.set(use.name, round2((rightOff.get(use.name) ?? 0) + h));
      lanes.push({
        from: src.name,
        to: use.name,
        amountText: fmtAmount(link.amount),
        shareText: shareOf(link.amount, base.total),
        mark: src.mark,
        l1,
        l2: clampPct(Math.min(l1 + h, src.topPct + src.heightPct)),
        r1,
        r2: clampPct(Math.min(r1 + h, use.topPct + use.heightPct)),
        title: src.name + ' → ' + use.name + '：' + fmtAmount(link.amount) + ' ' + base.unit
          + '（占总额 ' + shareOf(link.amount, base.total) + '）',
      });
    }
  }

  const perPctText = '1% 高 ≈ ' + fmtAmount(Math.round(base.total / spanPct)) + ' ' + base.unit;
  const missing = srcNodes.concat(useNodes).filter((n) => !n.inside);
  const readouts = missing.map((n, i) => ({
    name: n.name,
    amount: n.amount,
    amountText: n.amountText,
    sharePct: n.sharePct,
    shareText: n.shareText,
    mark: n.mark,
    /* 名单行按它自己在哪一列排序：先左边那一列的，再右边那一列的（与图上的次序一致）。 */
    side: srcNodes.includes(n) ? 'source' : 'use',
    order: i,
  })).sort((a, b) => (a.side === b.side ? a.order - b.order : (a.side === 'source' ? -1 : 1)));

  return {
    ...base,
    form: 'sankey',
    plotPx,
    spanPct,
    perPctText,
    sources: srcNodes,
    uses: useNodes,
    lanes,
    readouts,
    legend: srcNodes.map((n) => ({ mark: n.mark, text: n.name })),
    ariaLabel: '桑基图：左边 ' + String(srcNodes.length) + ' 股来源（'
      + srcNodes.map((n) => n.name + ' ' + n.amountText).join('、') + '），右边 '
      + String(useNodes.length) + ' 类用途（' + useNodes.map((n) => n.name + ' ' + n.amountText).join('、')
      + '），共 ' + fmtAmount(base.total) + ' ' + base.unit + '；两侧同一把尺子（' + perPctText + '）——'
      + '左边一股与右边一格可以横着比',
  };
}

/** 形态 `matrix`：行＝来源、列＝用途；条长与深浅按**全表最大格**算（不是按本行最大）。 */
export function matrixModel(base: FlowRibbonBase, sources: readonly FlowRibbonReadout[],
  uses: readonly FlowRibbonReadout[], links: readonly FlowRibbonLink[]): FlowRibbonMatrixModel {
  const maxCell = Math.max(...links.map((l) => l.amount));
  const cellOf = (from: string, use: string): FlowRibbonMatrixCell => {
    const link = links.find((l) => l.from === from && l.to === use);
    if (link === undefined) {
      return {
        use,
        empty: true,
        amountText: FLOW_RIBBON_MISSING,
        shareText: '',
        barPct: 0,
        mixPct: 0,
        title: from + ' → ' + use + '：这一股确实没往这里流（写 ' + FLOW_RIBBON_MISSING + '，不写 0）',
      };
    }
    const barPct = round2(link.amount / maxCell * 100);
    return {
      use,
      empty: false,
      amountText: fmtAmount(link.amount),
      shareText: shareOf(link.amount, base.total),
      barPct,
      /* 底色深浅：**从强调色 token 算**（6% 起、最大格 26%），不许写死色值；
         条长与深浅是同一把尺子的两种读法（都按全表最大格）。 */
      mixPct: round1(6 + barPct * 0.2),
      title: from + ' → ' + use + '：' + fmtAmount(link.amount) + ' ' + base.unit
        + '（占总额 ' + shareOf(link.amount, base.total) + '）',
    };
  };
  const rows: FlowRibbonMatrixRow[] = sources.map((s) => ({
    name: s.name,
    amountText: s.amountText,
    cells: uses.map((u) => cellOf(s.name, u.name)),
  }));
  const foot: FlowRibbonMatrixCell[] = uses.map((u) => ({
    use: u.name,
    empty: false,
    amountText: u.amountText,
    shareText: u.shareText,
    /* 合计行不出条（它是各列的和，与「某一格 ÷ 全表最大格」不是同一把尺子）——
       故这里不算几何，零值明示"无条"（渲染侧本就不写 `style`，死数据不许留）。 */
    barPct: 0,
    mixPct: 0,
    title: u.name + ' 合计：' + u.amountText + ' ' + base.unit + '（占总额 ' + u.shareText + '）',
  }));
  return {
    ...base,
    form: 'matrix',
    useNames: uses.map((u) => u.name),
    rows,
    foot,
    maxText: fmtAmount(maxCell),
    legend: [],
    ariaLabel: '交叉矩阵：行是 ' + String(sources.length) + ' 个来源（'
      + sources.map((s) => s.name + ' ' + s.amountText).join('、') + '），列是 ' + String(uses.length) + ' 类用途（'
      + uses.map((u) => u.name + ' ' + u.amountText).join('、') + '）；格里的数字是金额与它占总额的比例，'
      + '条长＝这一格 ÷ 全表最大格 ' + fmtAmount(maxCell) + ' ' + base.unit + '；共 '
      + fmtAmount(base.total) + ' ' + base.unit + '，行合计＝列合计',
  };
}

/* ── 形态 `rails` 住 `forms-rails.ts`（上头已转出） ─────────────────────── */
