/** 分析域·B 组票据纸共件（1066 合流：a14-a25 12 页切票据纸 v2.1 的共用底）。
 *
 * 本件只放 B 组共用的东西：12 个场景 id、H2、基线、落点收口、文本解析小件、票据纸收口。
 * 各族的落点行与明细段住各自的族文件（`./ticket-b-bars.ts`／`ticket-b-charts.ts`／
 * `./ticket-b-tables.ts`／`./ticket-b-insight.ts`，沿 `template-*.ts` 一族一件）——
 * 单件超 350 行即触发告警线台账，拆族是为避线，不另起第二套纸（装配仍走 `./ticket.ts` 的 `ticketDoc`）。
 *
 * 谁在用（四个调用点，指名）：上文四族文件。模板件不直调本件（模板调各族文件）。
 */
import { renderLedgerRows, renderSummaryHead } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import { ticketDoc } from './ticket.js';
import type { AnalysisCopy } from './copyTextAnalysis.js';
import { baselineFileOf, MISSING, NO_WINDOW, SOURCE_READ } from './pageParts.js';
import type { BarsPage, DocInput } from './scene.js';
import { m } from '../entries/index.js';

/** B 组 12 个场景 id（唯一定义地；按 `params.kind` 认，不写唤醒词字面，沿 1057 第二刀）。 */
export const B_TICKET_IDS = [
  'trend',
  'cat_trend',
  'top',
  'top_freq',
  'distribution',
  'activity',
  'insight',
  'anomaly',
  'debt',
  'reimburse',
  'installment',
  'refund',
] as const;

/** 是否走 B 组票据纸（按场景 id 分支）。 */
export function isBTicket(id: string): boolean {
  return (B_TICKET_IDS as readonly string[]).includes(id);
}

/** H2 一句聚合（原型 v2.1 PAGES 表 a14-a25；动态计数，`extra` 只给 cat_trend 传分类名）。 */
export function h2ForB(id: string, count: number, extra = ''): string {
  // 写成 if 链而不是 switch：迁移器只认 copy／concat 位置，switch 的分支标签会被判跳过（#1208）。
  if (id === 'trend') return m('skill-bill.analysis-ticket-b.c001', { p0: String(String(count)) });
  if (id === 'cat_trend') return m('skill-bill.analysis-ticket-b.c002', { p0: String(extra), p1: String(String(count)) });
  if (id === 'top') return m('skill-bill.analysis-ticket-b.c003', { p0: String(String(count)) });
  if (id === 'top_freq') return m('skill-bill.analysis-ticket-b.c004', { p0: String(String(count)) });
  if (id === 'distribution') return m('skill-bill.analysis-ticket-b.c005', { p0: String(String(count)) });
  if (id === 'activity') return m('skill-bill.analysis-ticket-b.c006', { p0: String(String(count)) });
  if (id === 'insight') return m('skill-bill.analysis-ticket-b.c007', { p0: String(String(count)) });
  if (id === 'anomaly') return m('skill-bill.analysis-ticket-b.c008', { p0: String(String(count)) });
  if (id === 'debt') return m('skill-bill.analysis-ticket-b.c009', { p0: String(String(count)) });
  if (id === 'reimburse') return m('skill-bill.analysis-ticket-b.c010', { p0: String(String(count)) });
  if (id === 'installment') return m('skill-bill.analysis-ticket-b.c011', { p0: String(String(count)) });
  if (id === 'refund') return m('skill-bill.analysis-ticket-b.c012', { p0: String(String(count)) });
  return m('skill-bill.analysis-ticket-b.c013', { p0: String(String(count)) });
}

/** B 落点账目（整行式：调用方拼好行，数字只搬家；来源／基线收口加，与 `./ticket.ts` 的 compare 支同形）。 */
export function ledgerB(rows: readonly { k: string; v: string }[], id: string): string {
  const full = [
    ...rows.map((r) => ({ label: r.k, value: r.v })),
    { label: m('skill-bill.analysis-ticket-b.c014'), value: m('skill-bill.analysis-ticket-b.c015') },
    { label: m('skill-bill.analysis-ticket-b.c016'), value: baselineFileOf(id) },
  ];
  return renderLedgerRows({ rows: full, layout: 'ticket' });
}

/** 页内读数卡按位置取值（上屏文本原文搬家；越界或无值＝缺值占位，不猜）。
 *
 * 判据位按位置取，不按显示标签挑读数（标签随语言变，位置不变）。
 * 各场景的发射方正序写在**调用点**那一行上方（见 `./ticket-b-*.ts`）。 */
export function kpiAt(kpis: readonly { readonly value?: string }[], index: number): string {
  return kpis[index]?.value ?? MISSING;
}

/** “55.00 元”→55（落点行只搬家：从既有卡文本解析，不重查库；沿 1061 `parseAmount`）。 */
export function parseAmount(v: string): number {
  const n = Number(v.split(' ')[0]?.replace(/,/g, '') ?? '');
  return Number.isFinite(n) ? n : 0;
}

/** “8 笔 · …”→8（排行文本首段计数；解析不出＝0）。 */
export function parseCount(text: string): number {
  const n = Number(text.split(' ')[0]);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

/** 排行组里计数最大的一行（并列取先出的那一行；没有行＝null；全零时取首行）。 */
export function peakBarRow(groups: readonly { readonly rows: readonly { readonly label: string; readonly text: string }[] }[]): { readonly label: string; readonly text: string } | null {
  let best: { readonly label: string; readonly text: string } | null = null;
  let bestN = -1;
  for (const g of groups) {
    for (const r of g.rows) {
      const n = parseCount(r.text);
      if (n > bestN) {
        bestN = n;
        best = r;
      }
    }
  }
  return best;
}

/** 明细段装配（各族旧模板同序，读数卡与芯片不重复进明细：主数字与落点已承载）。 */
export function detailOf(parts: readonly string[], emptyText: string): string {
  if (parts.length !== 0) return parts.join('');
  return '<p>' + escapeHtml(emptyText) + '</p>';
}

/** B 组票据纸收口（调 `./ticket.ts` 的同一只纸；caliberTag 全组统一，沿原型 v2.1 B 组落点那句）。 */
export function toTicketB(input: {
  readonly docTitle: string;
  readonly wakeWord: string;
  readonly h2: string;
  readonly windowLabel: string;
  readonly summaryValue: string;
  readonly summaryUnit: string;
  readonly summaryNote: string;
  readonly ledgerRows: readonly { k: string; v: string }[];
  readonly sceneId: string;
  readonly detailHtml: string;
  readonly chartHtml: string;
  readonly caliber: string;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly envelope: DocInput<BarsPage>['envelope'];
  readonly actionAt: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly count: number;
  readonly conclusion: string;
  readonly copy?: AnalysisCopy;
}): string {
  const summary = renderSummaryHead({
    eyebrow: m('skill-bill.analysis-ticket-b.c017'),
    value: input.summaryValue,
    unit: input.summaryUnit,
    stamp: { text: m('skill-bill.analysis-ticket-b.c018'), tone: 'ok' as const },
    layout: 'ticket',
    size: 'l',
  });
  return ticketDoc({
    docTitle: input.docTitle,
    wakeWord: input.wakeWord,
    sceneId: input.sceneId,
    h2: input.h2,
    windowLabel: input.windowLabel,
    summaryHtml: summary,
    summaryNote: input.summaryNote,
    ledgerHtml: ledgerB(input.ledgerRows, input.sceneId),
    detailHtml: input.detailHtml,
    chartHtml: input.chartHtml,
    caliber: input.caliber,
    key: input.key,
    params: input.params,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: m('skill-bill.analysis-ticket-b.c019', { p0: String(String(input.count)) }),
    actionAt: input.actionAt,
    ...(input.copy === undefined ? {} : { copy: input.copy }),
  });
}
