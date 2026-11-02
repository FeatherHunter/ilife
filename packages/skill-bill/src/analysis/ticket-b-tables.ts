/** 分析域·B 组票据纸之 tables 族（1066 合流：看借贷／看报销／看分期 3 页）。
 *
 * 本件是 tables 族 3 页的落点行与明细段唯一住所（H2／纸壳住 `./ticket-b.ts`）。
 * 落点口径（原型 v2.1 PAGES 表 a22／a23／a24；空页走说明行，文案取自场景结论原文）。
 *
 * 谁在用（一个调用点，指名）：`./template-tables.ts`——本族 3 页全在 B。
 */
import { escapeHtml } from 'base-paint';
import { detailOf, h2ForB, kpiAt, toTicketB } from './ticket-b.js';
import { chartFor } from './chartOf.js';
import { NO_WINDOW, docTitleOf } from './pageParts.js';
import { factCardHtml, tableCardHtml } from './cards.js';
import type { DocInput, TablesPage } from './scene.js';
import { m } from '../entries/index.js';

/** B tables 3 页的落点行（PAGES 表 a22／a23／a24；空页走说明行）。 */
export function ledgerRowsOfTablesB(
  sceneId: string,
  input: DocInput<TablesPage>,
): readonly { k: string; v: string }[] {
  const r = input.result;
  const p = r.page;
  const noDot = (s: string): string => s.endsWith('。') ? s.slice(0, -1) : s;
  if (sceneId === 'debt') {
    if (r.count === 0) return [{ k: m('skill-bill.analysis-ticket-b-tables.c001'), v: noDot(r.conclusion) }];
    const tables = p.tables[0];
    return [
      // 判据位按位置取。发射方正序：scene-debt.ts:114-119 kpis 固定 4 格
      // （0 借出未还／1 借入未还／2 已还借出笔数／3 已还借入笔数）。
      { k: m('skill-bill.analysis-ticket-b-tables.c002'), v: m('skill-bill.analysis-ticket-b-tables.c003', { p0: String(kpiAt(p.kpis, 0)) }) },
      { k: m('skill-bill.analysis-ticket-b-tables.c004'), v: m('skill-bill.analysis-ticket-b-tables.c005', { p0: String(kpiAt(p.kpis, 1)) }) },
      { k: m('skill-bill.analysis-ticket-b-tables.c006'), v: m('skill-bill.analysis-ticket-b-tables.c007', {
        p0: String(String(tables === undefined ? 0 : tables.rows.length)),
      }) },
    ];
  }
  if (sceneId === 'reimburse') {
    if (r.count === 0) return [{ k: m('skill-bill.analysis-ticket-b-tables.c008'), v: noDot(r.conclusion) }];
    // 判据位按位置取。发射方正序：scene-reimburse.ts:92-97 kpis 固定 4 格
    // （0 待报销总额／1 待报销笔数／2 已到账总额／3 已到账笔数）。
    const pendingTotal = kpiAt(p.kpis, 0);
    const pendingN = kpiAt(p.kpis, 1);
    const receivedTotal = kpiAt(p.kpis, 2);
    const receivedN = kpiAt(p.kpis, 3);
    const first = p.tables[0]?.rows[0] as unknown as
      | { readonly time: string; readonly amount: string; readonly status: string }
      | undefined;
    const out = [
      { k: m('skill-bill.analysis-ticket-b-tables.c009'), v: m('skill-bill.analysis-ticket-b-tables.c010', { p0: String(pendingTotal), p1: String(pendingN) }) },
      { k: m('skill-bill.analysis-ticket-b-tables.c011'), v: m('skill-bill.analysis-ticket-b-tables.c012', { p0: String(receivedTotal), p1: String(receivedN) }) },
    ];
    if (first !== undefined) {
      out.push({
        k: m('skill-bill.analysis-ticket-b-tables.c013'),
        v: m('skill-bill.analysis-ticket-b-tables.c014', {
          p0: String(first.time.split(' ')[0]),
          p1: String(first.amount),
          p2: String(first.status),
        }),
      });
    }
    return out;
  }
  if (sceneId === 'installment') {
    if (r.count === 0) return [{ k: m('skill-bill.analysis-ticket-b-tables.c015'), v: noDot(r.conclusion) }];
    return [
      // 判据位按位置取。发射方正序：scene-installment.ts:174-178 kpis 固定 3 格
      // （0 进行中项数／1 剩余期数合计／2 剩余金额合计）。
      { k: m('skill-bill.analysis-ticket-b-tables.c016'), v: m('skill-bill.analysis-ticket-b-tables.c017', { p0: String(kpiAt(p.kpis, 0)) }) },
      { k: m('skill-bill.analysis-ticket-b-tables.c018'), v: m('skill-bill.analysis-ticket-b-tables.c019', { p0: String(kpiAt(p.kpis, 1)) }) },
      { k: m('skill-bill.analysis-ticket-b-tables.c020'), v: m('skill-bill.analysis-ticket-b-tables.c021', { p0: String(kpiAt(p.kpis, 2)) }) },
    ];
  }
  return [];
}

/** B tables 3 页的票据纸正文（明细沿用既有 tables／factCards，小表空态句保留）。 */
export function ticketTablesBDoc(input: DocInput<TablesPage>, sceneId: string): string {
  const r = input.result;
  const p = r.page;
  // 主数字取哪一格：借贷与报销都是第 0 格（总额），分期是第 2 格（剩余金额合计）。
  // 发射方正序见上面 `ledgerRowsOfTablesB` 三个分支的注释。
  const firstKpiIndex = sceneId === 'installment' ? 2 : 0;
  const summaryNote = sceneId === 'debt'
    ? m('skill-bill.analysis-ticket-b-tables.c022')
    : sceneId === 'reimburse'
      ? m('skill-bill.analysis-ticket-b-tables.c023')
      : m('skill-bill.analysis-ticket-b-tables.c024');
  const parts: string[] = [];
  for (const t of p.tables) {
    parts.push('<p>' + escapeHtml(t.title) + '</p>' + tableCardHtml(t));
  }
  // #1135（负责人 2026-10-05 改口径）：序号**每卡各自从 1 起**（本页只有事实卡一种行）。
  for (const c of p.factCards) {
    const html = factCardHtml(c, 0);
    if (html !== '') { parts.push('<p>' + escapeHtml(c.title) + '</p>' + html); }
  }
  return toTicketB({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2ForB(sceneId, r.count),
    windowLabel: r.label,
    summaryValue: kpiAt(p.kpis, firstKpiIndex),
    summaryUnit: m('skill-bill.analysis-ticket-b-tables.c025'),
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
