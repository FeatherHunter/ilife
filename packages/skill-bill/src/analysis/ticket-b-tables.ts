/** 分析域·B 组票据纸之 tables 族（1066 合流：看借贷／看报销／看分期 3 页）。
 *
 * 本件是 tables 族 3 页的落点行与明细段唯一住所（H2／纸壳住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a22／a23／a24；空页走说明行，文案取自场景结论原文）。
 *
 * 谁在用（一个调用点，指名）：`./template-tables.ts`——本族 3 页全在 B。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, kpiValue, toTicketB } from './ticket-b.js';
import { chartFor } from './chartOf.js';
import { NO_WINDOW, docTitleOf } from './pageParts.js';
import { factCardHtml, tableCardHtml } from './cards.js';
import type { DocInput, TablesPage } from './scene.js';

/** B tables 3 页的落点行（PAGES 表 a22／a23／a24；空页走说明行）。 */
export function ledgerRowsOfTablesB(
  sceneId: string,
  input: DocInput<TablesPage>,
): readonly { k: string; v: string }[] {
  const r = input.result;
  const p = r.page;
  const noDot = (s: string): string => s.endsWith('。') ? s.slice(0, -1) : s;
  if (sceneId === 'debt') {
    if (r.count === 0) return [{ k: '说明', v: noDot(r.conclusion) }];
    const tables = p.tables[0];
    return [
      { k: '借出未还', v: kpiValue(p.kpis, '借出未还') + ' 元' },
      { k: '借入未还', v: kpiValue(p.kpis, '借入未还') + ' 元' },
      { k: '未还对象', v: String(tables === undefined ? 0 : tables.rows.length) + ' 个' },
    ];
  }
  if (sceneId === 'reimburse') {
    if (r.count === 0) return [{ k: '说明', v: noDot(r.conclusion) }];
    const pendingTotal = kpiValue(p.kpis, '待报销总额');
    const pendingN = kpiValue(p.kpis, '待报销笔数');
    const receivedTotal = kpiValue(p.kpis, '已到账总额');
    const receivedN = kpiValue(p.kpis, '已到账笔数');
    const first = p.tables[0]?.rows[0] as unknown as
      | { readonly time: string; readonly amount: string; readonly status: string }
      | undefined;
    const out = [
      { k: '待报销', v: pendingTotal + ' 元（' + pendingN + ' 笔）' },
      { k: '已到账', v: receivedTotal + ' 元（' + receivedN + ' 笔）' },
    ];
    if (first !== undefined) {
      out.push({
        k: '最近一笔',
        v: first.time.split(' ')[0] + ' · ' + first.amount + ' 元（' + first.status + '）',
      });
    }
    return out;
  }
  if (sceneId === 'installment') {
    if (r.count === 0) return [{ k: '说明', v: noDot(r.conclusion) }];
    return [
      { k: '进行中', v: kpiValue(p.kpis, '进行中项数') + ' 项' },
      { k: '剩余期数', v: kpiValue(p.kpis, '剩余期数合计') + ' 期' },
      { k: '剩余金额', v: kpiValue(p.kpis, '剩余金额合计') + ' 元' },
    ];
  }
  return [];
}

/** B tables 3 页的票据纸正文（明细沿用既有 tables／factCards，小表空态句保留）。 */
export function ticketTablesBDoc(input: DocInput<TablesPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  const firstKpi = sceneId === 'debt'
    ? '借出未还'
    : sceneId === 'reimburse'
      ? '待报销总额'
      : '剩余金额合计';
  const summaryNote = sceneId === 'debt'
    ? '借出未还 · 明细与复制区与基线一致'
    : sceneId === 'reimburse'
      ? '待报销总额 · 明细与复制区与基线一致'
      : '剩余金额合计 · 明细与复制区与基线一致';
  const parts: string[] = [];
  for (const t of p.tables) {
    parts.push('<p>' + escapeHtml(t.title) + '</p>' + tableCardHtml(t));
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
    summaryValue: kpiValue(p.kpis, firstKpi),
    summaryUnit: '元',
    summaryNote,
    ledgerRows: ledgerRowsOfTablesB(sceneId, input),
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
