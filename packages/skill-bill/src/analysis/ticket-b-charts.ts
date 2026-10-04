/** 分析域·B 组票据纸之 charts 族（1066 合流：看趋势／看分类趋势／看分布／看异常 4 页）。
 *
 * 本件是 charts 族 4 页的落点行与明细段唯一住所（H2／纸壳／解析小件住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a14／a15／a18／a21；`category` 从结果 label 搬，不复刻场景缺省）。
 *
 * 谁在用（一个调用点，指名）：`./template-charts.ts`——本族 4 页全在 B。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, kpiValue, parseCount, toTicketB } from './ticket-b.js';
import { chartFor } from './chartOf.js';
import { MISSING, NO_WINDOW, docTitleOf, money } from './pageParts.js';
import { chartCardHtml, factCardHtml, listCardHtml } from './cards.js';
import type { ChartsPage, DocInput } from './scene.js';

/** B charts 4 页的落点行（PAGES 表 a14／a15／a18／a21）。 */
export function ledgerRowsOfChartsB(
  sceneId: string,
  input: DocInput<ChartsPage>,
): readonly { k: string; v: string }[] {
  const r = input.result;
  const p = r.page;
  if (sceneId === 'trend') {
    const peakMonth = kpiValue(p.kpis, '峰值月');
    const peak = kpiValue(p.kpis, '峰值支出');
    const avg = kpiValue(p.kpis, '月均支出');
    return [
      { k: '支出', v: money(r.kpi.expense) + ' 元' },
      { k: '收入', v: money(r.kpi.income) + ' 元' },
      { k: '月均支出', v: avg + ' 元' },
      { k: '最高', v: peakMonth === MISSING ? MISSING : peakMonth + '（' + peak + ' 元）' },
    ];
  }
  if (sceneId === 'cat_trend') {
    const category = r.label.split(' · ')[0] ?? '';
    const peakMonth = kpiValue(p.kpis, '峰值月');
    const peak = kpiValue(p.kpis, '峰值支出');
    const avg = kpiValue(p.kpis, '月均');
    return [
      { k: category + '总额', v: money(r.kpi.expense) + ' 元 · ' + String(r.kpi.count) + ' 笔' },
      { k: '最高', v: peakMonth === MISSING ? MISSING : peakMonth + '（' + peak + ' 元）' },
      { k: '月均', v: avg + ' 元' },
    ];
  }
  if (sceneId === 'distribution') {
    const facts = p.factCards[0];
    if (facts === undefined || facts.rows.length === 0) return [{ k: '说明', v: '这段时间还没有记录' }];
    let best = facts.rows[0];
    let bestN = -1;
    for (const row of facts.rows) {
      const n = parseCount(row.v);
      if (n > bestN) {
        bestN = n;
        best = row;
      }
    }
    return [{ k: '最多', v: best.k + ' · ' + best.v }];
  }
  if (sceneId === 'anomaly') {
    const lists = p.listCards[0];
    const rows = lists === undefined ? [] : lists.rows;
    let widest: { readonly left: string; readonly main: string; readonly right: string } | null = null;
    let widestAbs = -1;
    for (const row of rows) {
      const m = /-?[\d.]+/.exec(row.right);
      const pct = m === null ? NaN : Number(m[0]);
      if (!Number.isFinite(pct)) continue;
      if (Math.abs(pct) > widestAbs) {
        widestAbs = Math.abs(pct);
        widest = row;
      }
    }
    if (widest === null) return [{ k: '说明', v: p.empty.text }];
    return [{ k: '最大变化', v: widest.left + '（' + widest.main + '，' + widest.right + '）' }];
  }
  return [];
}

/** B charts 4 页的票据纸正文（明细沿用既有 charts／listCards／factCards，图卡刻度与虚线不动）。 */
export function ticketChartsBDoc(input: DocInput<ChartsPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  const peak = kpiValue(p.kpis, '峰值支出');
  const summaryValue = sceneId === 'distribution'
    ? String(r.count)
    : sceneId === 'trend' || sceneId === 'cat_trend'
      ? peak
      : '见明细';
  const summaryUnit = summaryValue === '见明细' ? '' : sceneId === 'distribution' ? '笔' : '元';
  const summaryNote = sceneId === 'distribution'
    ? '总笔数 · 明细与复制区与基线一致'
    : sceneId === 'trend' || sceneId === 'cat_trend'
      ? '峰值支出 · 明细与复制区与基线一致'
      : '结论 · 明细与复制区与基线一致';
  const parts: string[] = [];
  // #1135：DETAIL 段内整段连续的行序（判地 `.idx` 口径）；图卡不占号（判地图上没有序号）。
  let n = 0;
  for (const c of p.charts) {
    parts.push('<p>' + escapeHtml(c.title) + '</p>' + chartCardHtml(c));
  }
  for (const c of p.listCards) {
    const html = listCardHtml(c, n);
    if (html !== '') { parts.push('<p>' + escapeHtml(c.title) + '</p>' + html); n += c.rows.length; }
  }
  for (const c of p.factCards) {
    const html = factCardHtml(c, n);
    if (html !== '') { parts.push('<p>' + escapeHtml(c.title) + '</p>' + html); n += c.rows.length; }
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
  });
}
