/** 分析域·B 组票据纸之 bars 族（1066 合流：看大额／看高频／看活跃／看退款 4 页）。
 *
 * 本件是 bars 族 B 组 4 页的落点行与明细段唯一住所（H2／纸壳／解析小件住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a16／a17／a19／a25；空页走说明行；数字只搬家，不重查库）。
 *
 * 谁在用（一个调用点，指名）：`./template-bars.ts`——B 的 4 页分支。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, kpiAt, parseAmount, peakBarRow, toTicketB } from './ticket-b.js';
import { chartFor } from './chartOf.js';
import { NO_WINDOW, docTitleOf, money } from './pageParts.js';
import { barGroupHtml, factCardHtml, listCardHtml } from './cards.js';
import type { BarsPage, DocInput } from './scene.js';
import { m } from '../entries/index.js';

/** B bars 4 页的落点行（PAGES 表 a16／a17／a19／a25；空页走说明行）。 */
export function ledgerRowsOfBarsB(
  sceneId: string,
  input: DocInput<BarsPage>,
): readonly { k: string; v: string }[] {
  const p = input.result.page;
  const g0 = p.barGroups[0];
  const rows = g0 === undefined ? [] : g0.rows;
  if (sceneId === 'top') {
    if (rows.length === 0) return [{ k: m('skill-bill.analysis-ticket-b-bars.c001'), v: m('skill-bill.analysis-ticket-b-bars.c002') }];
    let sum = 0;
    for (const r of rows) sum += parseAmount(r.text);
    const head = rows[0];
    const segs = head.text.split(' · ');
    const cat = head.label.replace(/^\d+\.\s*/, '');
    return [
      { k: m('skill-bill.analysis-ticket-b-bars.c003', { p0: String(String(rows.length)) }), v: m('skill-bill.analysis-ticket-b-bars.c004', { p0: String(money(Math.round(sum * 100) / 100)) }) },
      // 金额段只搬家：条卡文本首段是「金额 元」，解析出数字再照原格式回写（不切显示串）。
      { k: m('skill-bill.analysis-ticket-b-bars.c005'), v: m('skill-bill.analysis-ticket-b-bars.c006', {
        p0: String(segs[1] ?? ''),
        p1: String(cat),
        p2: String(money(parseAmount(segs[0] ?? ''))),
      }) },
    ];
  }
  if (sceneId === 'top_freq') {
    if (rows.length === 0) return [{ k: m('skill-bill.analysis-ticket-b-bars.c007'), v: m('skill-bill.analysis-ticket-b-bars.c008') }];
    const head = rows[0];
    const second = rows[1];
    const cat = head.label.replace(/^\d+\.\s*/, '');
    const segs = head.text.split(' · ');
    const out = [{
      k: m('skill-bill.analysis-ticket-b-bars.c009'),
      v: m('skill-bill.analysis-ticket-b-bars.c010', {
        p0: String(cat),
        p1: String(segs[0] ?? ''),
        p2: String(money(parseAmount(segs[1] ?? ''))),
      }),
    }];
    if (second !== undefined) {
      const cat2 = second.label.replace(/^\d+\.\s*/, '');
      out.push({ k: m('skill-bill.analysis-ticket-b-bars.c011'), v: cat2 + ' ' + (second.text.split(' · ')[0] ?? '') });
    }
    return out;
  }
  if (sceneId === 'activity') {
    const day = peakBarRow([p.barGroups[0]].filter((g) => g !== undefined));
    const hours = p.barGroups[1];
    const hour = hours === undefined ? null : peakBarRow([hours]);
    const out: { k: string; v: string }[] = [];
    if (day !== null) out.push({ k: m('skill-bill.analysis-ticket-b-bars.c012'), v: day.label + ' ' + day.text });
    if (hour !== null) out.push({ k: m('skill-bill.analysis-ticket-b-bars.c013'), v: hour.label + ' ' + hour.text });
    return out.length === 0 ? [{ k: m('skill-bill.analysis-ticket-b-bars.c014'), v: m('skill-bill.analysis-ticket-b-bars.c015') }] : out;
  }
  if (sceneId === 'refund') {
    if (input.result.count === 0) return [{ k: m('skill-bill.analysis-ticket-b-bars.c016'), v: m('skill-bill.analysis-ticket-b-bars.c017') }];
    // 判据位按位置取。发射方正序：scene-refund.ts:70-73 kpis 固定 2 格（0 退款总额／1 退款次数）。
    const total = kpiAt(p.kpis, 0);
    const times = kpiAt(p.kpis, 1);
    const first = p.listCards[0]?.rows[0];
    const out = [{ k: m('skill-bill.analysis-ticket-b-bars.c018'), v: m('skill-bill.analysis-ticket-b-bars.c019', { p0: String(total), p1: String(times) }) }];
    if (first !== undefined) out.push({ k: m('skill-bill.analysis-ticket-b-bars.c020'), v: first.left });
    return out;
  }
  return [];
}

/** B bars 4 页的票据纸正文（明细沿用既有 barGroups／listCards／charts／factCards，条宽逐字节不动）。 */
export function ticketBarsBDoc(input: DocInput<BarsPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  const parts: string[] = [];
  // #1135（负责人 2026-10-05 改口径）：序号**每卡各自从 1 起**，不再整段连续；
  // 图卡**不出 DETAIL**（#G：图只住 CHART 段）。`from=0` 即「本卡从 1 起」。
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g, 0));
  }
  for (const c of p.listCards) {
    const html = listCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  for (const c of p.factCards) {
    const html = factCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  return toTicketB({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2ForB(sceneId, r.count),
    windowLabel: r.label,
    summaryValue: m('skill-bill.analysis-ticket-b-bars.c021'),
    summaryUnit: '',
    summaryNote: m('skill-bill.analysis-ticket-b-bars.c022'),
    ledgerRows: ledgerRowsOfBarsB(sceneId, input),
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
