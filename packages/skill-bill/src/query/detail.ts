/** 查询域详情页装配件（w17 v2.1 百分百：`docs/skills/skill-bill/proto/query/w17-*-v2.1.html`——
 *  该原型文件的名字里仍是旧唤醒词（历史件按「地址随实况、历史不改」不动），取版本号最高者）：
 *  店头三行（品牌／编号备注确认标题／单记录副题）→ 主数字（单笔药丸／金额／结论／时刻，
 *  印章只在已撤销时出）→ 落点 6 行（编号带#／账户／账本／币种／创建时间／状态纯文本；
 *  已撤销才加删除时间行）→ 单条 100% 占比条 → 明细 2 行（收付行加粗＋备注行）→
 *  对账卡（编号、写入、异常）→ 复制区 → 纸外脚注。口径无：1045 全删，原型即无此行。
 *
 * 谁在用（一个调用点，指名）：`src/query/read.ts` 的 `viewRecordDetail`（查某编号的账）——
 *   today／range／search 三支仍走 `./list.js` 的 `queryListDoc`，本件不动它们。
 *
 * 一数一处：金额住头里（分类只进占比条，账本只进落点行）；编号的#形只住落点行内、
 *   对账行内写裸号（两处与原型逐字）；已撤销态住印章、状态行与对账异常三处
 *   （各说各的角度：印章是态、状态行是值、对账是写入证据）。
 *  载荷 `item` 键不动（见 `src/query/read.ts` 的 `viewRecordDetail`）。
 *
 * 复制三份（1183：纸面不动、复制展开）——落点仍 6／7 行（t415 锁着），复制经本件人话门
 *   （10 列＋备注，已撤销加删除时间；field,value 纵表与回执同制不同字段）；薄 envelope
 *   仍作日志场景标识，三份全覆写（旧 thin 零产出）。方向词走共用位，不另写第二份。
 */
import { renderDistributionRows, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { checkListHtml } from '../shared/checkLine.js';
import { queryStyleTag } from './pageParts.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { directionWord } from '../shared/direction.js';
import { EMPTY_CELL, csvCell, oneLine } from '../shared/copyText.js';
import type { BillRow } from '../fetch/index.js';
import { m } from '../entries/index.js';

/** 详情页的入参：这一页是谁（命令名／唤醒词）＋ 查到哪一条 ＋ 复制日志的取数（来源与时刻只进复制日志，不上屏）。 */
export interface QueryDetailInput {
  /** 对外命令名（`bill.record.detail`），页标记与复制日志的调用链都读它。 */
  readonly key: string;
  /** 本次参数（复制日志那行命令原文照它拼，可照抄重跑）。 */
  readonly params: Record<string, unknown>;
  /** 复制数据那份纯文本的标题（本页恒为 `查某编号的账`；纸头标题见下 `paperTitle`）。 */
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



/** 文本或占位（空串／全空格即占位，前后空格不进页）。 */
function textOrDash(v: string): string {
  return v.trim() === '' ? EMPTY_CELL : v;
}

/** 店头品牌行与纸外脚注（原型第一行与末行同字，静态）：饼干记账 · 账单详情。
 *  #1209：模块级常量改函数——模块加载期取词会把语言固化，渲染期才取。 */
function detailBrand(): string {
  return m('skill-bill.query-detail.c001', { p0: String(DOC_TITLE) });
}

/** 店头副题行（原型第三行，静态）：账单详情 · 单记录。 */
function detailSub(): string {
  return m('skill-bill.query-detail.c002');
}

/** 店头标题（原型第二行）：#编号 备注 · 单笔方向确认（方向词走共用位 `../shared/direction.js`）。 */
function paperTitle(row: BillRow): string {
  return m('skill-bill.query-detail.c003', {
    p0: String(row.id),
    p1: String(escapeHtml(row.note.trim())),
    p2: String(directionWord(row.amount)),
  });
}

/** 落点行（原型 6 行：编号带#／账户／账本／币种／创建时间／状态纯文本；
 *  已撤销才加删除时间行（原值），正常态不印这一行。 */
function fieldRows(row: BillRow, deleted: boolean): readonly { readonly label: string; readonly value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: m('skill-bill.query-detail.c004'), value: '#' + row.id },
    { label: m('skill-bill.query-detail.c005'), value: textOrDash(row.account) },
    { label: m('skill-bill.query-detail.c006'), value: textOrDash(row.ledger) },
    { label: m('skill-bill.query-detail.c007'), value: textOrDash(row.currency) },
    { label: m('skill-bill.query-detail.c008'), value: textOrDash(row.created_at) },
  ];
  if (deleted) rows.push({ label: m('skill-bill.query-detail.c009'), value: String(row.deleted_at) });
  rows.push({ label: m('skill-bill.query-detail.c050'), value: deleted ? m('skill-bill.query-detail.c010') : m('skill-bill.query-detail.c011') });
  return rows;
}

/** 落点那一段（原型行组；行类与票据纸同一套 `is-ticket`）。 */
function ledgerBlock(row: BillRow, deleted: boolean): string {
  return '<div class="ilife-block-ledger-rows is-ticket">'
    + renderLedgerRows({ rows: fieldRows(row, deleted), layout: 'ticket' }) + '</div>';
}

/** 主数字块下面那两行（原型 `.summary-note`＋时刻行）：结论逐字＋记账时刻。 */
function summaryLines(row: BillRow): string {
  return '<p class="ilife-ticket-summary-note">' + detailConclusion() + '</p>'
    + '<p class="ilife-ticket-summary-time">' + escapeHtml(row.time) + '</p>';
}

/** 详情结论逐字（1056 v2.1 manifest w17，一字不动）；#1209：常量改函数，渲染期取词。 */
function detailConclusion(): string {
  return m('skill-bill.query-detail.c012');
}

/** 详情占比条注记逐字（1056 v2.1 w17 scale-note，一字不动）。 */
function detailScaleNote(): string {
  return m('skill-bill.query-detail.c013');
}

/** 详情单条 100% 占比条（与列表页同一组件 `renderDistributionRows`，载荷不动）。 */
function detailScale(row: BillRow): string {
  return renderDistributionRows({
    rows: [{ label: row.category, value: m('skill-bill.query-detail.c014', { p0: String(row.amount.toFixed(2)) }), pct: 100 }],
  }) + '<p class="ilife-ticket-scale-note">' + detailScaleNote() + '</p>';
}

/** 明细卡（原型 2 行）：收付行（收付词＋金额，走加粗档）＋备注行（备注·原文·#编号）。 */
function entryCard(row: BillRow): string {
  const payWord = row.amount < 0 ? m('skill-bill.query-detail.c015') : m('skill-bill.query-detail.c016');
  const note = row.note.trim() === '' ? EMPTY_CELL : row.note.trim();
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">'
    + '<li class="is-pay"><span class="ilife-ticket-entry-text">'
    + escapeHtml(payWord + ' ' + row.amount.toFixed(2)) + '</span></li>'
    + '<li><span class="ilife-ticket-entry-text">'
    + escapeHtml(m('skill-bill.query-detail.c017', { p0: String(note), p1: String(row.id) })) + '</span></li>'
    + '</ol></div>';
}

/** 对账卡（两列三行：编号、写入、异常；未撤销时「异常」那一行的值走绿字）。 */
function checkCard(row: BillRow, deleted: boolean): string {
  return '<div class="ilife-ticket-check' + (deleted ? ' is-danger' : '') + '">'
    + '<span class="ilife-ticket-check-dot" aria-hidden="true"></span>'
    + checkListHtml([
      { label: m('skill-bill.query-detail.c018'), value: String(row.id) },
      { label: m('skill-bill.query-detail.c019'), value: textOrDash(row.created_at) },
      { label: m('skill-bill.query-detail.c020'), value: deleted ? m('skill-bill.query-detail.c021') : m('skill-bill.query-detail.c022'), ok: !deleted },
    ]) + '</div>';
}

/** 详情人话门（1183，纸面不动、复制展开）：10 列＋备注（已撤销加删除时间）的人话三份。
 *
 * 为什么住本件：写域只许动本件（禁碰 `copyTextReceipt`／`copyArea` 本体），10 列事实全是本页
 *   已显示行（复制恒等于已显示行）；机制复用共用件 `../shared/copyText.js`（单行化／统一占位／RFC4180／数仍数），
 *   字段不同（回执 8 格，详情 10 列＋备注＋删除时间）。占位沿纸面 `—`（落点行永不缺席），
 *   备注不截行（纸面印全文，截了就不是已显示行）。薄 envelope 不动：仍作复制日志的场景
 *   标识（shape detail／key 场景名），三份全覆写后旧 thin 零产出。
 */

/** 复制 JSON 的场景键（`sceneKeyOf('bill.record.detail')` 的值，照回执 `record.add` 硬字面量的先例）。 */
const DETAIL_COPY_KEY = 'record.detail';



/** 纸面同值的单行文本（空走纸面占位，见 `EMPTY_CELL`，否则单行化；与落点行同值）。 */
function dashOne(v: string): string {
  return oneLine(textOrDash(v));
}

/** 备注单行（明细卡同值：空走占位；纸面印全文，复制不截行）。 */
function noteOne(row: BillRow): string {
  const t = row.note.trim();
  return t === '' ? EMPTY_CELL : oneLine(t);
}

/** 详情复制字段（任务序：编号／时间／分类／金额／方向／账户／账本／币种／创建时间／
 *  ［删除时间］／状态＋备注——值与纸面同表达式，纯文本行与纸面行一一对应）。 */
function detailCopyFields(row: BillRow, deleted: boolean): readonly (readonly [string, string])[] {
  const fields: (readonly [string, string])[] = [
    [m('skill-bill.query-detail.c023'), '#' + row.id],
    [m('skill-bill.query-detail.c024'), dashOne(row.time)],
    [m('skill-bill.query-detail.c025'), dashOne(row.category)],
    [m('skill-bill.query-detail.c026'), row.amount.toFixed(2)],
    [m('skill-bill.query-detail.c027'), directionWord(row.amount)],
    [m('skill-bill.query-detail.c028'), dashOne(row.account)],
    [m('skill-bill.query-detail.c029'), dashOne(row.ledger)],
    [m('skill-bill.query-detail.c030'), dashOne(row.currency)],
    [m('skill-bill.query-detail.c031'), dashOne(row.created_at)],
  ];
  if (deleted) fields.push([m('skill-bill.query-detail.c032'), oneLine(String(row.deleted_at))]);
  fields.push([m('skill-bill.query-detail.c050'), deleted ? m('skill-bill.query-detail.c033') : m('skill-bill.query-detail.c034')]);
  fields.push([m('skill-bill.query-detail.c035'), noteOne(row)]);
  return fields;
}

/** 纯文本（页身份行＋字段行，LF 连接，无尾换行）。 */
export function buildDetailCopyText(row: BillRow, wakeWord: string): string {
  const deleted = row.deleted_at !== null && row.deleted_at !== '';
  return [DOC_TITLE + ' ' + wakeWord,
    ...detailCopyFields(row, deleted).map(([k, v]) => k + ' ' + v)].join('\n');
}

/** JSON 加厚（票面同等，数仍数，2 空格缩进，无尾换行；备注空为 null，其余空串保留）。 */
export function buildDetailCopyJson(row: BillRow): string {
  const deleted = row.deleted_at !== null && row.deleted_at !== '';
  const t = row.note.trim();
  const payload: Record<string, unknown> = {
    version: '1.0',
    skill: 'bill',
    shape: 'detail',
    key: DETAIL_COPY_KEY,
    data: {
      id: row.id,
      time: row.time,
      category: row.category,
      amount: row.amount,
      direction: directionWord(row.amount),
      account: row.account,
      ledger: row.ledger,
      currency: row.currency,
      created_at: row.created_at,
      deleted_at: row.deleted_at,
      status: deleted ? m('skill-bill.query-detail.c036') : m('skill-bill.query-detail.c037'),
      note: t === '' ? null : oneLine(t),
    },
  };
  return JSON.stringify(payload, null, 2);
}



/** CSV 纵表（表头 field,value，LF，无尾换行；金额保留符号，方向单列）。 */
export function buildDetailCopyCsv(row: BillRow): string {
  const deleted = row.deleted_at !== null && row.deleted_at !== '';
  const lines = ['field,value'];
  for (const [field, value] of detailCopyFields(row, deleted)) lines.push(csvCell(field) + ',' + csvCell(value));
  return lines.join('\n');
}

/** 查询详情页（一纸 w17 v2.1：店头三行＋主数字四行＋落点＋占比＋明细＋对账＋复制区＋纸外脚注）。 */
export function queryDetailDoc(input: QueryDetailInput): string {
  const deleted = input.row.deleted_at !== null && input.row.deleted_at !== '';
  const stamp = deleted ? { text: m('skill-bill.query-detail.c038'), tone: 'danger' as const } : null;
  const deletedSuffix = deleted ? m('skill-bill.query-detail.c039') : m('skill-bill.query-detail.c040');
  const paper = queryStyleTag() + sheetHead(detailBrand(), paperTitle(input.row), detailSub())
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: m('skill-bill.query-detail.c041', { p0: String(directionWord(input.row.amount)) }),
      value: input.row.amount.toFixed(2),
      unit: m('skill-bill.query-detail.c042'),
      ...(stamp === null ? {} : { stamp }),
      layout: 'ticket',
    }), summaryLines(input.row))
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-detail.c043'), tag: 'LEDGER', content: ledgerBlock(input.row, deleted) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-detail.c044'), tag: 'SCALE', content: detailScale(input.row) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-detail.c045'), tag: 'DETAIL', content: entryCard(input.row) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-detail.c046'), tag: 'CHECK', content: checkCard(input.row, deleted) })
    + ticketRule()
    + ticketActions(copyArea({
      data: { envelope: input.envelope, title: input.wakeWord },
      dataText: buildDetailCopyText(input.row, input.wakeWord),
      dataJson: buildDetailCopyJson(input.row),
      dataCsv: buildDetailCopyCsv(input.row),
      log: {
        envelope: input.envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.source,
          detail: m('skill-bill.query-detail.c047', { p0: String(input.row.id), p1: String(deletedSuffix) }),
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'detail', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: m('skill-bill.query-detail.c048'), content: paper })
      + '<p class="ilife-ticket-foot">' + escapeHtml(detailBrand()) + '</p>',
  });
  return assembleSheetPage({
    docTitle: m('skill-bill.query-detail.c049', { p0: String(DOC_TITLE) }),
    bodyHtml: content,
    paper: 'detail',
  });
}
