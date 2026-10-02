/** 查询域详情页装配件（#993 v7 小票化，也是本域页型表里「详情页」那一份的地址）：
 *  店头身份 → 主数字（金额／分类／时间）→ 结论逐字 → 账目全字段（编号／账户／账本／币种／创建时间／删除时间／状态，
 *  只印一遍）→ 备注明细（分行，实付行加粗）→ 单条 100% 占比条 → 复制区（纸外页脚已按用户要求撤掉）。
 *
 * 谁在用（一个调用点，指名）：`src/query/read.ts` 的 `viewRecordDetail`（查账单详情）——
 *   today／range／search 三支仍走 `./list.js` 的 `queryListDoc`，本件不动它们。
 *
 * 一数一处（#993）：金额分类时间住头里，编号只住账目行内；已撤销态的状态事实住印章与状态行。
 *  1056 查询 v2.1 落地：结论 `已入账，可复制三格式存档` 逐字（manifest w17）＋ 单条 100% 占比条
 *  （`renderDistributionRows`，与列表页同一组件）＋ scale-note `单笔支出，占本笔 100%。`；
 *  载荷 `item` 键不动。
 *
 * 备注分行 v1（#993 v7）：按空白拆行、原文顺序不动；含“实付”行标 pay 加粗。
 *  承认启发式：无分隔符的长备注退化成一行，不断错、不编造分段。
 */
import { renderConclusionBar, renderDistributionRows, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { categoryLabelOf } from '../shared/category.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { QUERY_EYEBROW, queryStyleTag } from './pageParts.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { directionWord } from '../shared/direction.js';
import type { BillRow } from '../fetch/index.js';

/** 详情页的入参：这一页是谁（命令名／唤醒词）＋ 查到哪一条 ＋ 复制日志的取数（来源与时刻只进复制日志，不上屏）。 */
export interface QueryDetailInput {
  /** 对外命令名（`bill.record.detail`），页标记与复制日志的调用链都读它。 */
  readonly key: string;
  /** 本次参数（复制日志那行命令原文照它拼，可照抄重跑）。 */
  readonly params: Record<string, unknown>;
  /** 页标题＝用户说的那条唤醒词（本页恒为 `查账单详情`；纸头标题 freeze 为「账单详情」见 v7）。 */
  readonly wakeWord: string;
  /** 查到的那一条（含软删列，调用方已按 `includeDeleted` 取到）。 */
  readonly row: BillRow;
  /** 复制载荷：**本次查询的 envelope 本身**（`detailEnvelope`，复制区直接序列化它）。 */
  readonly envelope: SerializableEnvelope;
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 空值占位（字段行永不缺席，无值即此符，空行不算交代）。 */
const EMPTY_CELL = '—';

/** 文本或占位（空串／全空格即占位，前后空格不进页）。 */
function textOrDash(v: string): string {
  return v.trim() === '' ? EMPTY_CELL : v;
}

/** 账目全字段（库行 10 列里除去头里已有的金额／分类／时间，剩下 7 行只印一遍）。
 *  金额两位小数与载荷同字；币种缺省也是读数（默认人民币）；删除时间无值即占位。
 *  状态那一行**不在这里**：它的值位是一枚胶囊（原型 `.status`），而账目行的值位只收纯文本
 *  ⇒ 由 `statusRow` 用同一套行类补在账目之后（见下）。 */
function fieldRows(row: BillRow, deleted: boolean): readonly { readonly label: string; readonly value: string }[] {
  return [
    { label: '编号', value: String(row.id) },
    { label: '账户', value: textOrDash(row.account) },
    { label: '账本', value: textOrDash(row.ledger) },
    { label: '币种', value: textOrDash(row.currency) },
    { label: '创建时间', value: textOrDash(row.created_at) },
    { label: '删除时间', value: deleted ? String(row.deleted_at) : EMPTY_CELL },
  ];
}

/** 状态那一行（原型最后一行）：标签 ＋ 点线 ＋ 一枚胶囊；行类与账目行同一套（几何一致）。 */
function statusRow(deleted: boolean): string {
  return '<div class="ilife-block-ledger-row is-status"><span class="ilife-block-ledger-row-label">状态</span>'
    + '<span class="ilife-block-ledger-row-leader" aria-hidden="true"></span>'
    + '<span class="ilife-block-ledger-row-value"><span class="ilife-ticket-status'
    + (deleted ? ' is-danger' : '') + '">' + (deleted ? '已撤销' : '有效') + '</span></span></div>';
}

/** 账目那一段（6 行 ＋ 状态行）：外一层账目容器是为了让状态行与那 6 行同用一套行类与行距。 */
function ledgerBlock(row: BillRow, deleted: boolean): string {
  return '<div class="ilife-block-ledger-rows is-ticket">'
    + renderLedgerRows({ rows: fieldRows(row, deleted), layout: 'ticket' })
    + statusRow(deleted) + '</div>';
}

/** 主数字块下面那两行小字（v7 原型）：分类落点一句 ＋ 时刻一行。
 *  分类走纸面显示写法（`../shared/category.js` 的 `categoryLabelOf`，与回执的「分类」行同一份）。 */
function summaryNote(row: BillRow): string {
  return '<p class="ilife-ticket-summary-note"><b>' + escapeHtml(textOrDash(categoryLabelOf(row.category))) + '</b>已落到'
    + escapeHtml(textOrDash(row.ledger)) + '账本</p>'
    + '<p class="ilife-ticket-summary-time">' + escapeHtml(row.time) + '</p>';
}

/** 备注分行（见件头 v1 规则）：空备注交代一个占位行；含“实付”那一行走高亮档。 */
function remarkCard(note: string): string {
  const raw = note.split(/\s+/).map((s) => s.trim()).filter((s) => s !== '');
  const lines = raw.length === 0 ? [EMPTY_CELL] : raw;
  const items = lines.map((line) =>
    '<li' + (line.includes('实付') ? ' class="is-pay"' : '') + '><span class="ilife-ticket-entry-text">'
      + escapeHtml(line) + '</span></li>',
  ).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 详情结论逐字（1056 v2.1 manifest w17）：单笔已入账态，不随金额方向改。 */
const DETAIL_CONCLUSION = '已入账，可复制三格式存档';
/** 详情占比条注记逐字（1056 v2.1 w17 scale-note）：单笔 100%。 */
const DETAIL_SCALE_NOTE = '单笔支出，占本笔 100%。';

/** 详情单条 100% 占比条（与列表页同一组件 `renderDistributionRows`，载荷不动）。 */
function detailScale(row: BillRow): string {
  return renderDistributionRows({
    rows: [{ label: row.category, value: row.amount.toFixed(2) + ' 元', pct: 100 }],
  }) + '<p class="ilife-ticket-scale-note">' + DETAIL_SCALE_NOTE + '</p>';
}

/** 查询详情页（一纸 #993 v7 ＋ 1056 v2.1 结论与占比）。 */
export function queryDetailDoc(input: QueryDetailInput): string {
  const deleted = input.row.deleted_at !== null && input.row.deleted_at !== '';
  const paper = queryStyleTag() + sheetHead(QUERY_EYEBROW + ' · ' + input.wakeWord, '账单详情')
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '账单详情 · ' + directionWord(input.row.amount),
      value: input.row.amount.toFixed(2),
      unit: '元',
      stamp: deleted ? { text: '已撤销', tone: 'danger' } : { text: '有效', tone: 'ok' },
      layout: 'ticket',
    }), summaryNote(input.row))
    + renderConclusionBar(DETAIL_CONCLUSION)
    + ticketRule()
    + ticketSection({ title: '账本信息', tag: 'LEDGER', content: ledgerBlock(input.row, deleted) })
    + ticketRule()
    + ticketSection({ title: '分类占比', tag: 'SCALE', content: detailScale(input.row) })
    + ticketRule()
    + ticketSection({ title: '备注明细', tag: 'REMARK', content: remarkCard(input.row.note) })
    + ticketRule()
    + ticketActions(copyArea({
      data: { envelope: input.envelope, title: input.wakeWord },
      log: {
        envelope: input.envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.source,
          detail: '详情 1 笔 · 记录编号 ' + input.row.id + (deleted ? ' · 已撤销' : ' · 正常'),
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'detail', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper }),
  });
  return assembleSheetPage({
    docTitle: DOC_TITLE + '·查询',
    bodyHtml: content,
    paper: 'detail',
  });
}
