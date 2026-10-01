/** 查询域详情页装配件（#993 v7 小票化，也是本域页型表里「详情页」那一份的地址）：
 *  店头身份 → 主数字（金额／分类／时间）→ 账目全字段（编号／账户／账本／币种／创建时间／删除时间／状态，
 *  只印一遍）→ 备注明细（分行，实付行加粗）→ 复制区 → 来源脚注＋编号。
 *
 * 谁在用（一个调用点，指名）：`src/query/read.ts` 的 `viewRecordDetail`（查账单详情）——
 *   today／range／search 三支仍走 `./list.js` 的 `queryListDoc`，本件不动它们。
 *
 * 一数一处（#993）：金额分类时间住头里，编号住页脚；已撤销态的状态事实住印章与状态行，
 *  结论条与口径行不再另起（v7 原型冻结）。
 *
 * 备注分行 v1（#993 v7）：按空白拆行、原文顺序不动；含“实付”行标 pay 加粗。
 *  承认启发式：无分隔符的长备注退化成一行，不断错、不编造分段。
 */
import { renderCaliberLine, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { QUERY_EYEBROW } from './pageParts.js';
import { sourceLine } from '../shared/sourceLine.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { assembleSheetPage, sheetHead } from '../shared/docPage.js';
import type { BillRow } from '../fetch/index.js';

/** 详情页的入参：这一页是谁（命令名／唤醒词）＋ 查到哪一条 ＋ 复制日志与来源脚注的取数。 */
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
  /** 来源脚注上屏的人话来源（**不许带脚本路径与库文件名**，裁定 1）。 */
  readonly sourceText: string;
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
 *  金额两位小数与载荷同字；币种缺省也是读数（默认人民币）；删除时间无值即占位。 */
function fieldRows(row: BillRow, deleted: boolean): readonly { readonly label: string; readonly value: string }[] {
  return [
    { label: '编号', value: String(row.id) },
    { label: '账户', value: textOrDash(row.account) },
    { label: '账本', value: textOrDash(row.ledger) },
    { label: '币种', value: textOrDash(row.currency) },
    { label: '创建时间', value: textOrDash(row.created_at) },
    { label: '删除时间', value: deleted ? String(row.deleted_at) : EMPTY_CELL },
    { label: '状态', value: deleted ? '已撤销' : '有效' },
  ];
}

/** 备注分行（见件头 v1 规则）：空备注交代一个占位行。 */
function remarkList(note: string): string {
  const raw = note.split(/\s+/).map((s) => s.trim()).filter((s) => s !== '');
  const lines = raw.length === 0 ? [EMPTY_CELL] : raw;
  const items = lines.map((line) =>
    '<li' + (line.includes('实付') ? ' class="pay"' : '') + '>' + escapeHtml(line) + '</li>',
  ).join('');
  return '<h2 class="ilife-remark-title">备注明细</h2><ol class="ilife-remark-list">' + items + '</ol>';
}

/** 查询详情页（一纸 #993 v7）。 */
export function queryDetailDoc(input: QueryDetailInput): string {
  const deleted = input.row.deleted_at !== null && input.row.deleted_at !== '';
  const paper = sheetHead(QUERY_EYEBROW + ' · ' + input.wakeWord, '账单详情')
    + renderSummaryHead({
      eyebrow: input.row.category,
      value: input.row.amount.toFixed(2),
      unit: '元',
      note: '时间 ' + input.row.time,
      ...(deleted ? { stamp: { text: '已撤销', tone: 'danger' as const } } : {}),
    })
    + renderLedgerRows({ heading: '账本信息', rows: fieldRows(input.row, deleted) })
    + remarkList(input.row.note)
    + copyArea({
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
    })
    + sourceLine({ source: input.sourceText, start: input.row.time, end: input.row.time, count: 1 })
    + renderCaliberLine('记录编号 ' + input.row.id);
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'detail', key: input.key,
    content: renderSheetFrame({ variant: 'receipt', notch: true, cutLine: true, content: paper }),
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}
