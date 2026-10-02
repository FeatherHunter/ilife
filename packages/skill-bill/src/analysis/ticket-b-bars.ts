/** 分析域·B 组票据纸之 bars 族（1066 合流：看大额／看高频／看活跃／看退款 4 页）。
 *
 * 本件是 bars 族 B 组 4 页的落点行与明细段唯一住所（H2／纸壳／解析小件住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a16／a17／a19／a25；空页走说明行；数字只搬家，不重查库）。
 *
 * 谁在用（一个调用点，指名）：`./template-bars.ts`——B 的 4 页分支。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, kpiValue, parseAmount, peakBarRow, toTicketB } from './ticket-b.js';
import { NO_WINDOW, docTitleOf, money } from './pageParts.js';
import { barGroupHtml, chartCardHtml, factCardHtml, listCardHtml } from './cards.js';
import type { BarsPage, DocInput } from './scene.js';

/** B bars 4 页的落点行（PAGES 表 a16／a17／a19／a25；空页走说明行）。 */
export function ledgerRowsOfBarsB(
  sceneId: string,
  input: DocInput<BarsPage>,
): readonly { k: string; v: string }[] {
  const p = input.result.page;
  const g0 = p.barGroups[0];
  const rows = g0 === undefined ? [] : g0.rows;
  if (sceneId === 'top') {
    if (rows.length === 0) return [{ k: '说明', v: '这段时间还没有支出记录' }];
    let sum = 0;
    for (const r of rows) sum += parseAmount(r.text);
    const head = rows[0];
    const segs = head.text.split(' · ');
    const cat = head.label.replace(/^\d+\.\s*/, '');
    return [
      { k: 'TOP' + String(rows.length) + ' 合计', v: money(Math.round(sum * 100) / 100) + ' 元' },
      { k: '最贵一笔', v: (segs[1] ?? '') + ' ' + cat + ' ' + (segs[0] ?? '').replace(' 元', '') + ' 元' },
    ];
  }
  if (sceneId === 'top_freq') {
    if (rows.length === 0) return [{ k: '说明', v: '这段时间还没有支出记录' }];
    const head = rows[0];
    const second = rows[1];
    const cat = head.label.replace(/^\d+\.\s*/, '');
    const segs = head.text.split(' · ');
    const out = [{
      k: '最多',
      v: cat + ' ' + (segs[0] ?? '') + '（' + (segs[1] ?? '').replace(' 元', '') + ' 元）',
    }];
    if (second !== undefined) {
      const cat2 = second.label.replace(/^\d+\.\s*/, '');
      out.push({ k: '其次', v: cat2 + ' ' + (second.text.split(' · ')[0] ?? '') });
    }
    return out;
  }
  if (sceneId === 'activity') {
    const day = peakBarRow([p.barGroups[0]].filter((g) => g !== undefined));
    const hours = p.barGroups[1];
    const hour = hours === undefined ? null : peakBarRow([hours]);
    const out: { k: string; v: string }[] = [];
    if (day !== null) out.push({ k: '最多周', v: day.label + ' ' + day.text });
    if (hour !== null) out.push({ k: '最多时段', v: hour.label + ' ' + hour.text });
    return out.length === 0 ? [{ k: '说明', v: '全库还没有记录，看不出活跃规律' }] : out;
  }
  if (sceneId === 'refund') {
    if (input.result.count === 0) return [{ k: '说明', v: '还没有一笔备注里带退款标签的记录' }];
    const total = kpiValue(p.kpis, '退款总额');
    const times = kpiValue(p.kpis, '退款次数');
    const first = p.listCards[0]?.rows[0];
    const out = [{ k: '退款总额', v: total + ' 元（' + times + '）' }];
    if (first !== undefined) out.push({ k: '最近一次', v: first.left });
    return out;
  }
  return [];
}

/** B bars 4 页的票据纸正文（明细沿用既有 barGroups／listCards／charts／factCards，条宽逐字节不动）。 */
export function ticketBarsBDoc(input: DocInput<BarsPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  const parts: string[] = [];
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g));
  }
  for (const c of p.listCards) {
    const html = listCardHtml(c);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  for (const c of p.charts) {
    parts.push('<p>' + escapeHtml(c.title) + '</p>' + chartCardHtml(c));
  }
  for (const c of p.factCards) {
    const html = factCardHtml(c);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  return toTicketB({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2ForB(sceneId, r.count),
    windowLabel: r.label,
    summaryValue: '见明细',
    summaryUnit: '',
    summaryNote: '结论 · 明细与复制区与基线一致',
    ledgerRows: ledgerRowsOfBarsB(sceneId, input),
    sceneId,
    detailHtml: detailOf(parts, p.empty.text),
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
