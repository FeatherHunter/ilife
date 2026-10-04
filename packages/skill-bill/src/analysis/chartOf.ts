/** 分析域·CHART 段那张**真图**的取值小件（#1128）。
 *
 * 为什么另立一件：本件只回答一个问题——「这一页的数据该画成哪张图、值从哪来」；
 *  票据纸块序仍住 `./ticket.ts`，公共层图表件负责画。两条口径：
 *   ① **一处实现**：25 页的 CHART 段共用本件一个 `chartFor`，不逐页打补丁；
 *   ② **判地变更记在票面**：#1076 负责人判 5 格 no（a14／a15／a16／a17／a21 要真图），
 *      判地本段只有占位文字 ⇒ 有数据就出真图，撑不起图的页退回占位说明。
 *
 * 图型选择（逐页理由写进 `docs/skills/skill-bill/1128-分析域图表证据.md`）：
 *   - 页自带图卡（`page.charts`，趋势／分类趋势／分布／异常／洞察等）⇒ 原样用该图卡（折线／柱状照场景声明）；
 *   - 没有图卡 ⇒ 按该页数据现造**柱状图**：条卡组（值＝行文本首个金额，取不到退占比）→ 小表卡（值＝行里首个金额）。
 */
import { renderChartBlock } from 'base-paint/blocks';
import { money } from './pageParts.js';
import { chartCardHtml } from './cards.js';
import type { BarGroup, ChartCard, FactCard, TableCard } from './scene.js';

/** 一行文本里的首个金额（条卡组／小表卡的行文本形如「1,880.00 元 · 1 笔 · 33.3%」）；取不到给 null。 */
function moneyOfText(text: string): number | null {
  const m = /^([0-9][0-9,]*(?:\.[0-9]+)?) 元/.exec(text.trim());
  if (m === null) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** CHART 段那张**真图**（#1128，一处实现）：该页自带图卡就用图卡；没有就按该页数据现造一张柱状图——
 *  条卡组（值＝行文本首个金额，取不到退占比）→ 小表卡（值＝行里首个金额）。图型选择理由逐页写进证据件。
 *  返回空串＝该页数据撑不起图（CHART 段退回判地那句占位说明）。 */
export function chartFor(
  sceneId: string,
  page: {
    readonly charts?: readonly ChartCard[];
    readonly barGroups?: readonly BarGroup[];
    readonly tables?: readonly TableCard[];
    readonly factCards?: readonly FactCard[];
    readonly kpis?: readonly { readonly label: string; readonly value?: string; readonly unit?: string }[];
    readonly sides?: readonly { readonly title: string; readonly kpis: readonly { readonly label: string; readonly value?: string }[] }[];
  },
): string {
  const charts = page.charts ?? [];
  if (charts.length > 0) return chartCardHtml(charts[0]);
  const moneyOf = (v: string): number | null => moneyOfText(v);
  const rowsOf = (): readonly { label: string; value: number }[] => {
    const group = (page.barGroups ?? [])[0];
    if (group !== undefined && group.rows.length > 0) {
      return group.rows.map((r) => ({ label: r.label, value: moneyOf(r.text) ?? r.pct }));
    }
    const table = (page.tables ?? [])[0];
    if (table !== undefined && table.rows.length > 0) {
      return table.rows.slice(0, 8).map((row) => {
        const cells = Object.values(row).map((v) => String(v));
        const moneyValue = cells.map(moneyOf).find((n) => n !== null);
        return { label: cells[0] ?? '', value: moneyValue ?? 0 };
      });
    }
    const facts = (page.factCards ?? []).flatMap((c) => c.rows);
    const numeric = facts.map((r) => ({ label: r.k, value: moneyOf(r.v) })).filter((r): r is { label: string; value: number } => r.value !== null);
    if (numeric.length >= 2) return numeric.slice(0, 8);
    /* 对比页（a10／a12）：两段期间的读数卡并成一张柱状图（标签带期间前缀，读数卡两段重名）。 */
    const sides = page.sides ?? [];
    if (sides.length >= 2) {
      const items = sides.flatMap((side) => side.kpis.map((k) => ({
        label: side.title + ' ' + k.label,
        value: Number(String(k.value ?? '').replace(/[,元\s]/g, '')),
      }))).filter((k) => Number.isFinite(k.value));
      if (items.length >= 2) return items.slice(0, 8);
    }
    /* 最后一条退路（#1128）：读数卡（支出／收入／净额…）——a03 看总览这类页既没有条卡组也没有小表卡，
       只有读数卡；退到这里保证 25 页每页都有真图可看。 */
    const kpis = (page.kpis ?? []).map((k) => ({
      label: k.label,
      value: Number(String(k.value ?? '').replace(/[,元\s]/g, '')),
    })).filter((k) => Number.isFinite(k.value));
    if (kpis.length >= 2) return kpis.slice(0, 8);
    return [];
  };
  const rows = rowsOf();
  if (rows.length === 0) return '';
  return renderChartBlock({
    kind: 'bar',
    title: '',
    input: {
      items: rows,
      options: { singleColor: true, yTicks: 4, format: money, labels: 'all', showValues: false },
    },
  });
}
