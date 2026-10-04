/** 分析域·B 组票据纸之 insight 族（1066 合流：看洞察 1 页）。
 *
 * 本件是 insight 族 1 页的落点行与明细段唯一住所（H2／纸壳住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a20；花得最多与偏离月从明细卡搬家）。
 *
 * 谁在用（一个调用点，指名）：`./template-insight.ts`——本族 1 页在 B。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, toTicketB } from './ticket-b.js';
import { chartFor } from './chartOf.js';
import { NO_WINDOW, docTitleOf, money } from './pageParts.js';
import { barGroupHtml, chartCardHtml, factCardHtml, listCardHtml } from './cards.js';
import type { DocInput, InsightPage } from './scene.js';

/** B insight 1 页的落点行（PAGES 表 a20；花得最多与偏离月从明细卡搬家）。 */
export function ledgerRowsOfInsightB(
  input: DocInput<InsightPage>,
): readonly { k: string; v: string }[] {
  const r = input.result;
  const p = r.page;
  const out = [
    { k: '支出', v: money(r.kpi.expense) + ' 元' },
    { k: '收入', v: money(r.kpi.income) + ' 元' },
    { k: '净额', v: money(r.kpi.net) + ' 元' },
  ];
  const head = p.barGroups[0]?.rows[0];
  if (head !== undefined) {
    const segs = head.text.split(' · ');
    const pct = segs[2] ?? '';
    out.push({ k: '花得最多', v: head.label + ' ' + (segs[0] ?? '').replace(' 元', '') + ' 元（' + pct + '）' });
  }
  for (const c of p.factCards) {
    for (const row of c.rows) {
      if (row.k === '最大偏离月' && row.v !== '') {
        const month = row.v.split('（')[0] ?? '';
        const pct = row.v.split('（')[1]?.replace('）', '') ?? '';
        if (month !== '' && pct !== '') out.push({ k: month.slice(5) + '偏离', v: pct });
      }
    }
  }
  return out;
}

/** B insight 1 页的票据纸正文（明细沿用既有 factCards／barGroups／charts／listCards 原序）。 */
export function ticketInsightBDoc(input: DocInput<InsightPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  const parts: string[] = [];
  // #1135：DETAIL 段内整段连续的行序（判地 `.idx` 口径）；出卡顺序即计数顺序，图卡不占号。
  let n = 0;
  for (const c of p.factCards) {
    const html = factCardHtml(c, n);
    if (html !== '') { parts.push('<p>' + escapeHtml(c.title) + '</p>' + html); n += c.rows.length; }
  }
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g, n));
    n += g.rows.length;
  }
  for (const c of p.charts) {
    parts.push('<p>' + escapeHtml(c.title) + '</p>' + chartCardHtml(c));
  }
  for (const c of p.listCards) {
    const html = listCardHtml(c, n);
    if (html !== '') { parts.push('<p>' + escapeHtml(c.title) + '</p>' + html); n += c.rows.length; }
  }
  return toTicketB({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2ForB(sceneId, r.count),
    windowLabel: r.label,
    summaryValue: money(r.kpi.expense),
    summaryUnit: '元',
    summaryNote: '区间支出 · 明细与复制区与基线一致',
    ledgerRows: ledgerRowsOfInsightB(input),
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
