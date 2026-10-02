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
import { MISSING, NO_WINDOW, SOURCE_READ } from './pageParts.js';
import type { BarsPage, DocInput } from './scene.js';

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
  switch (id) {
    case 'trend': return '趋势共记 ' + String(count) + ' 笔';
    case 'cat_trend': return extra + '趋势共记 ' + String(count) + ' 笔';
    case 'top': return '大额共记 ' + String(count) + ' 笔';
    case 'top_freq': return '高频共记 ' + String(count) + ' 类';
    case 'distribution': return '分布共记 ' + String(count) + ' 笔';
    case 'activity': return '活跃共记 ' + String(count) + ' 笔';
    case 'insight': return '洞察共记 ' + String(count) + ' 笔';
    case 'anomaly': return '异常共记 ' + String(count) + ' 项';
    case 'debt': return '借贷共记 ' + String(count) + ' 笔';
    case 'reimburse': return '报销共记 ' + String(count) + ' 笔';
    case 'installment': return '分期共记 ' + String(count) + ' 笔';
    case 'refund': return '退款共记 ' + String(count) + ' 笔';
    default: return '共记 ' + String(count) + ' 笔';
  }
}

/** 基线文件名（落点 LEDGER 末行，原型逐字；a14-a25 在 1021）。 */
function baselineOfB(id: string): string {
  switch (id) {
    case 'trend': return 'a14-看趋势-proto.html';
    case 'cat_trend': return 'a15-看分类趋势-proto.html';
    case 'top': return 'a16-看大额-proto.html';
    case 'top_freq': return 'a17-看高频-proto.html';
    case 'distribution': return 'a18-看分布-proto.html';
    case 'activity': return 'a19-看活跃-proto.html';
    case 'insight': return 'a20-看洞察-proto.html';
    case 'anomaly': return 'a21-看异常-proto.html';
    case 'debt': return 'a22-看借贷-proto.html';
    case 'reimburse': return 'a23-看报销-proto.html';
    case 'installment': return 'a24-看分期-proto.html';
    case 'refund': return 'a25-看退款-proto.html';
    default: return '';
  }
}

/** B 落点账目（整行式：调用方拼好行，数字只搬家；来源／基线收口加，与 `./ticket.ts` 的 compare 支同形）。 */
export function ledgerB(rows: readonly { k: string; v: string }[], id: string): string {
  const full = [
    ...rows.map((r) => ({ label: r.k, value: r.v })),
    { label: '来源', value: '记账库' },
    { label: '基线', value: baselineOfB(id) },
  ];
  return renderLedgerRows({ rows: full, layout: 'ticket' });
}

/** 页内读数卡按标签取值（上屏文本原文搬家；找不到或无值＝缺值占位，不猜）。 */
export function kpiValue(kpis: readonly { readonly label: string; readonly value?: string }[], label: string): string {
  for (const k of kpis) if (k.label === label) return k.value ?? MISSING;
  return MISSING;
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
  readonly caliber: string;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly envelope: DocInput<BarsPage>['envelope'];
  readonly actionAt: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly count: number;
  readonly conclusion: string;
}): string {
  const summary = renderSummaryHead({
    eyebrow: '分析域 · 趋势',
    value: input.summaryValue,
    unit: input.summaryUnit,
    note: input.summaryNote,
    layout: 'ticket',
    size: 'l',
  });
  return ticketDoc({
    docTitle: input.docTitle,
    wakeWord: input.wakeWord,
    h2: input.h2,
    windowLabel: input.windowLabel,
    summaryHtml: summary,
    summaryNote: input.summaryNote,
    ledgerHtml: ledgerB(input.ledgerRows, input.sceneId),
    detailHtml: input.detailHtml,
    caliber: input.caliber,
    caliberTag: '图只是示意排布，不用它读数；数字看上面和下面。',
    key: input.key,
    params: input.params,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: '取到 ' + String(input.count) + ' 条记录',
    actionAt: input.actionAt,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    count: input.count,
    conclusion: input.conclusion,
  });
}
