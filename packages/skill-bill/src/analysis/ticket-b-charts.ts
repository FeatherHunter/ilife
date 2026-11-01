/** 分析域·B 组票据纸之 charts 族（1066 合流：看趋势／看分类趋势／看分布／看异常 4 页）。
 *
 * 本件是 charts 族 4 页的落点行与明细段唯一住所（H2／纸壳／解析小件住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a14／a15／a18／a21；`category` 从结果 label 搬，不复刻场景缺省）。
 *
 * 谁在用（一个调用点，指名）：`./template-charts.ts`——本族 4 页全在 B。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, kpiAt, parseCount, toTicketB } from './ticket-b.js';
import { chartFor } from './chartOf.js';
import { MISSING, NO_WINDOW, docTitleOf, money } from './pageParts.js';
import { factCardHtml, listCardHtml } from './cards.js';
import type { ChartsPage, DocInput } from './scene.js';
import { m } from '../entries/index.js';

/** B charts 4 页的落点行（PAGES 表 a14／a15／a18／a21）。 */
export function ledgerRowsOfChartsB(
  sceneId: string,
  input: DocInput<ChartsPage>,
): readonly { k: string; v: string }[] {
  const r = input.result;
  const p = r.page;
  if (sceneId === 'trend') {
    // 判据位按位置取。发射方正序：scene-trend.ts:147-152 kpis 固定 4 格
    // （0 峰值月／1 峰值支出／2 月均支出／3 窗口月数）。
    const peakMonth = kpiAt(p.kpis, 0);
    const peak = kpiAt(p.kpis, 1);
    const avg = kpiAt(p.kpis, 2);
    return [
      { k: m('skill-bill.analysis-ticket-b-charts.c001'), v: m('skill-bill.analysis-ticket-b-charts.c002', { p0: String(money(r.kpi.expense)) }) },
      { k: m('skill-bill.analysis-ticket-b-charts.c003'), v: m('skill-bill.analysis-ticket-b-charts.c004', { p0: String(money(r.kpi.income)) }) },
      { k: m('skill-bill.analysis-ticket-b-charts.c005'), v: m('skill-bill.analysis-ticket-b-charts.c006', { p0: String(avg) }) },
      { k: m('skill-bill.analysis-ticket-b-charts.c007'), v: peakMonth === MISSING ? MISSING : m('skill-bill.analysis-ticket-b-charts.c008', { p0: String(peakMonth), p1: String(peak) }) },
    ];
  }
  if (sceneId === 'cat_trend') {
    const category = r.label.split(' · ')[0] ?? '';
    // 判据位按位置取。发射方正序：scene-cat-trend.ts:141-144 kpis 固定 4 格
    // （0 分类／1 峰值月／2 峰值支出／3 月均）。
    const peakMonth = kpiAt(p.kpis, 1);
    const peak = kpiAt(p.kpis, 2);
    const avg = kpiAt(p.kpis, 3);
    return [
      { k: m('skill-bill.analysis-ticket-b-charts.c009', { p0: String(category) }), v: m('skill-bill.analysis-ticket-b-charts.c010', {
        p0: String(money(r.kpi.expense)),
        p1: String(String(r.kpi.count)),
      }) },
      { k: m('skill-bill.analysis-ticket-b-charts.c011'), v: peakMonth === MISSING ? MISSING : m('skill-bill.analysis-ticket-b-charts.c012', { p0: String(peakMonth), p1: String(peak) }) },
      { k: m('skill-bill.analysis-ticket-b-charts.c013'), v: m('skill-bill.analysis-ticket-b-charts.c014', { p0: String(avg) }) },
    ];
  }
  if (sceneId === 'distribution') {
    const facts = p.factCards[0];
    if (facts === undefined || facts.rows.length === 0) return [{ k: m('skill-bill.analysis-ticket-b-charts.c015'), v: m('skill-bill.analysis-ticket-b-charts.c016') }];
    let best = facts.rows[0];
    let bestN = -1;
    for (const row of facts.rows) {
      const n = parseCount(row.v);
      if (n > bestN) {
        bestN = n;
        best = row;
      }
    }
    return [{ k: m('skill-bill.analysis-ticket-b-charts.c017'), v: best.k + ' · ' + best.v }];
  }
  if (sceneId === 'anomaly') {
    const lists = p.listCards[0];
    const rows = lists === undefined ? [] : lists.rows;
    let widest: { readonly left: string; readonly main: string; readonly right: string } | null = null;
    let widestAbs = -1;
    for (const row of rows) {
      // 局部名不叫 m：会遮住注入的取词函数 m()（手册 §4.5m）。
      const num = /-?[\d.]+/.exec(row.right);
      const pct = num === null ? NaN : Number(num[0]);
      if (!Number.isFinite(pct)) continue;
      if (Math.abs(pct) > widestAbs) {
        widestAbs = Math.abs(pct);
        widest = row;
      }
    }
    if (widest === null) return [{ k: m('skill-bill.analysis-ticket-b-charts.c018'), v: p.empty.text }];
    return [{ k: m('skill-bill.analysis-ticket-b-charts.c019'), v: widest.left + '（' + widest.main + '，' + widest.right + '）' }];
  }
  return [];
}

/** B charts 4 页的票据纸正文（明细沿用既有 charts／listCards／factCards，图卡刻度与虚线不动）。 */
export function ticketChartsBDoc(input: DocInput<ChartsPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  // 判据位按场景 id 判，不拿显示文本比字面量（手册 §4.3）；峰值支出也是按位置取
  // （trend 第 1 格，cat_trend 第 2 格，见上面两个分支的发射方正序）。
  const hasPeak = sceneId === 'trend' || sceneId === 'cat_trend';
  const peak = sceneId === 'cat_trend' ? kpiAt(p.kpis, 2) : kpiAt(p.kpis, 1);
  const summaryValue = sceneId === 'distribution'
    ? String(r.count)
    : hasPeak
      ? peak
      : m('skill-bill.analysis-ticket-b-charts.c020');
  const summaryUnit = !hasPeak && sceneId !== 'distribution' ? '' : sceneId === 'distribution' ? m('skill-bill.analysis-ticket-b-charts.c021') : m('skill-bill.analysis-ticket-b-charts.c022');
  const summaryNote = sceneId === 'distribution'
    ? m('skill-bill.analysis-ticket-b-charts.c023')
    : sceneId === 'trend' || sceneId === 'cat_trend'
      ? m('skill-bill.analysis-ticket-b-charts.c024')
      : m('skill-bill.analysis-ticket-b-charts.c025');
  const parts: string[] = [];
  // #1135（负责人 2026-10-05 改口径）：序号**每卡各自从 1 起**（a20「事实／习惯各自从1」、
  // a21「环比／暴涨各自从1」、a19「两套序号」），不再整段连续。图卡**不出 DETAIL**（#G：判地 DETAIL
  // 本来就没有图，图只住 CHART 段；a14／a15／a20／a21 原话点名 DETAIL 里图重复了）。
  for (const c of p.listCards) {
    const html = listCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  for (const c of p.factCards) {
    const html = factCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  const category = sceneId === 'cat_trend' ? (r.label.split(' · ')[0] ?? '') : '';
  /* a21 本页段落：H2 计数＝明细项数（环比行＋暴涨行，含空态占位行），不是记录笔数；
   * 原型 v2.1「异常共记 2 项」即 1 条环比＋1 条暴涨空态行；其余三页沿用 r.count。载荷键不动。 */
  const h2Count = sceneId === 'anomaly'
    ? (p.listCards[0]?.rows.length ?? 0) + (p.factCards[0]?.rows.length ?? 0)
    : r.count;
  return toTicketB({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2ForB(sceneId, h2Count, category),
    windowLabel: r.label,
    summaryValue,
    summaryUnit,
    summaryNote,
    ledgerRows: ledgerRowsOfChartsB(sceneId, input),
    sceneId,
    detailHtml: detailOf(parts, p.empty.text),
    chartHtml: chartFor(sceneId, p),
    caliber: r.caliber,
    key: input.key,
    params: input.params,
    envelope: input.envelope,
    actionAt: input.actionAt,
    windowStart: r.from === '' ? NO_WINDOW : r.from,
    windowEnd: r.to === '' ? NO_WINDOW : r.to,
    count: r.count,
    conclusion: r.conclusion,
    ...(r.copy === undefined ? {} : { copy: r.copy }),
  });
}
