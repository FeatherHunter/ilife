/** 分析域·B 组票据纸之 insight 族（1066 合流：看洞察 1 页）。
 *
 * 本件是 insight 族 1 页的落点行与明细段唯一住所（H2／纸壳住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a20；花得最多与偏离月从明细卡搬家）。
 *
 * 谁在用（一个调用点，指名）：`./template-insight.ts`——本族 1 页在 B。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, parseAmount, toTicketB } from './ticket-b.js';
import { chartFor } from './chartOf.js';
import { NO_WINDOW, docTitleOf, money } from './pageParts.js';
import { barGroupHtml, factCardHtml, listCardHtml } from './cards.js';
import type { DocInput, InsightPage } from './scene.js';
import { m } from '../entries/index.js';

/** B insight 1 页的落点行（PAGES 表 a20；花得最多与偏离月从明细卡搬家）。 */
export function ledgerRowsOfInsightB(
  input: DocInput<InsightPage>,
): readonly { k: string; v: string }[] {
  const r = input.result;
  const p = r.page;
  const out = [
    { k: m('skill-bill.analysis-ticket-b-insight.c001'), v: m('skill-bill.analysis-ticket-b-insight.c002', { p0: String(money(r.kpi.expense)) }) },
    { k: m('skill-bill.analysis-ticket-b-insight.c003'), v: m('skill-bill.analysis-ticket-b-insight.c004', { p0: String(money(r.kpi.income)) }) },
    { k: m('skill-bill.analysis-ticket-b-insight.c005'), v: m('skill-bill.analysis-ticket-b-insight.c006', { p0: String(money(r.kpi.net)) }) },
  ];
  const head = p.barGroups[0]?.rows[0];
  if (head !== undefined) {
    const segs = head.text.split(' · ');
    const pct = segs[2] ?? '';
    // 金额段只搬家：条卡文本首段是「金额 元」，解析出数字再照原格式回写（不切显示串）。
    out.push({ k: m('skill-bill.analysis-ticket-b-insight.c007'), v: m('skill-bill.analysis-ticket-b-insight.c008', {
      p0: String(head.label),
      p1: String(money(parseAmount(segs[0] ?? ''))),
      p2: String(pct),
    }) });
  }
  // 判据位按位置取。发射方正序：scene-insight.ts:140-147 事实卡固定 3 行
  // （0 区间／1 趋势均值／2 最大偏离月，值形如「2026-03（+12.3%）」）。
  const worst = p.factCards[0]?.rows[2];
  if (worst !== undefined && worst.v !== '') {
    // 括号里是偏离度：全角／半角括号都认（英文列可能写成半角括号）。
    const mark = worst.v.match(/[（(]([^）)]*)[）)]\s*$/);
    const month = mark === null || mark.index === undefined ? worst.v.trim() : worst.v.slice(0, mark.index).trim();
    const pct = mark === null ? '' : (mark[1] ?? '');
    if (month !== '' && pct !== '') out.push({ k: m('skill-bill.analysis-ticket-b-insight.c009', { p0: String(month.slice(5)) }), v: pct });
  }
  return out;
}

/** B insight 1 页的票据纸正文（明细沿用既有 factCards／barGroups／charts／listCards 原序）。 */
export function ticketInsightBDoc(input: DocInput<InsightPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  const parts: string[] = [];
  // #1135（负责人 2026-10-05 改口径）：序号**每卡各自从 1 起**；图卡**不出 DETAIL**（#G）。
  for (const c of p.factCards) {
    const html = factCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g, 0));
  }
  for (const c of p.listCards) {
    const html = listCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  return toTicketB({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2ForB(sceneId, r.count),
    windowLabel: r.label,
    summaryValue: money(r.kpi.expense),
    summaryUnit: m('skill-bill.analysis-ticket-b-insight.c010'),
    summaryNote: m('skill-bill.analysis-ticket-b-insight.c011'),
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
