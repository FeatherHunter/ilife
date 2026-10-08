/** 写入域回执人话门（**唯一定义地**）：薄信封 + 票面事实 -> 人话三份（纯文本/JSON/CSV）。
 *
 * 为什么单立一门：base 冻结面（receipt 投影仍薄信封两格，CSV 仍旧表头）不动，bill 内的人话口径从此只住这一件。
 * 薄信封（ok/message）仍走 base 作日志场景标识；复制三份一律走本门，不再经 buildDataText。
 *
 * 谁在用（一处，指名）：`src/write/receiptPaper.ts`——回执纸复制区（dataText + JSON/CSV 加厚载荷）。
 * 后票（1181 采集/1182 查询列表/1183 详情/1184 分析/1185 账户目标/1186 设置帮助）各走各的门，
 * 要复用时经本件公开接口取方向词与压行口径，不另抄一份。
 *
 * 口径出处：原型三份 `.scratch/bill-copy-demo/new-{text,json,csv}.csv`（咖啡一笔 7248）与
 * 纸面一致（receiptPaper 行一致）；规则：标签空格值/方向词代符号/未给统一/备注压行200字/CSV RFC4180/JSON数仍数。
 */
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { MISSING, csvCell, oneLine, truncate } from '../shared/copyText.js';
import { wakeWordOf } from './userWording.js';

/** 回执复制事实：票面同等 8 格（**不多于八个**）。kind/word 不进本型（kind 走参，word 由 kind 经 HELP 算回）。 */
export interface ReceiptCopyFacts {
  readonly recordId: number | null;
  readonly category: string;
  readonly amount: number | null;
  readonly time: string;
  readonly account: string;
  readonly ledger: string;
  readonly note: string;
  readonly currency: string;
}

/** 结论动作（**只一处定义**，13 种共用同一动作，方向另走 copyDirectionOf）。 */
const ACTION = '已记好';



/** 页身份尾段与金额单位（只一处定义）。 */
const PAGE_TAIL = '回执';
const UNIT = '元';

/** 备注压行上限（字数按 Array.from 计，CJK 一字一数）。 */
const NOTE_LIMIT = 200;

/** 13 种固定词（11 行） + 2 派生（batch/plain 空串按金额符号派生，见 copyDirectionOf）。
 *  取值照 receiptPaper 文案表 titleWord（纸面标题同词，复制恒等于已显示行）；batch/plain 无固定词故派生。 */
const FIXED_WORDS: Readonly<Record<string, string>> = {
  expense: '支出',
  income: '收入',
  photo: '账单',
  refund: '退款',
  reimburse: '报销',
  'reimburse-done': '到账',
  lend: '借出',
  borrow: '借入',
  collect: '收回',
  repay: '偿还',
  installment: '分期',
};

/** 方向词（**唯一定义地**）：固定词直取；batch/plain/空串/未知按金额符号派生（负支出/正收入，空按支出兜底，add 路恒有金额）。 */
export function copyDirectionOf(kind: string, amount: number | null): string {
  const k = typeof kind === 'string' ? kind.trim() : '';
  const hit = FIXED_WORDS[k];
  if (hit !== undefined) return hit;
  if (amount !== null && Number.isFinite(amount)) {
    if (amount < 0) return '支出';
    if (amount > 0) return '收入';
  }
  return '支出';
}



/** 文本值（空走未给，否则单行化；纸面 pick 同口径，复制恒等于已显示行）。 */
function pickText(v: string): string {
  const t = typeof v === 'string' ? v : '';
  return t.trim() === '' ? MISSING : oneLine(t);
}

/** 备注值（空走未给，否则单行化后截 200 字；门特有行式保留，截断复用共用件）。 */
function noteText(v: string): string {
  const t = typeof v === 'string' ? v : '';
  if (t.trim() === '') return MISSING;
  return truncate(t, NOTE_LIMIT, false);
}

/** JSON 备注（空走 null，否则同 noteText 的截后值；数仍数，空不造未给字符串）。 */
function noteJson(v: string): string | null {
  const t = typeof v === 'string' ? v : '';
  if (t.trim() === '') return null;
  return truncate(t, NOTE_LIMIT, false);
}

/** 绝对值两位（文本结论用；空/非有限/零走未给，本仓不记零）。 */
function abs2(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount) || amount === 0) return MISSING;
  return Math.abs(amount).toFixed(2);
}

/** 符号两位（CSV 金额用，保留负号，正不加号；空走未给）。 */
function signed2(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount) || amount === 0) return MISSING;
  return amount.toFixed(2);
}

/** 页身份三段（空格分隔）：饼干记账 + 唤醒词 + 回执（word 由 kind 经 HELP 算回，与纸面 brand 同词不同分隔符）。 */
function pageLine(kind: string): string {
  return DOC_TITLE + ' ' + wakeWordOf(kind) + ' ' + PAGE_TAIL;
}

/** 结论行（动作与方向分离）：已记好 + 方向词 + 绝对值 + 元（金额空走未给，不带单位）。 */
function conclusionLine(kind: string, amount: number | null): string {
  const dir = copyDirectionOf(kind, amount);
  const abs = abs2(amount);
  return abs === MISSING ? ACTION + ' ' + dir + ' ' + MISSING : ACTION + ' ' + dir + ' ' + abs + ' ' + UNIT;
}

/** 纯文本 8 行（LF 连接，无尾换行，逐字节对 demo）：页身份/结论/分类/时间/账户/账本/备注/编号。 */
export function buildReceiptCopyText(kind: string, facts: ReceiptCopyFacts): string {
  const k = typeof kind === 'string' ? kind : '';
  return [
    pageLine(k),
    conclusionLine(k, facts.amount),
    '分类 ' + pickText(facts.category),
    '时间 ' + pickText(facts.time),
    '账户 ' + pickText(facts.account),
    '账本 ' + pickText(facts.ledger),
    '备注 ' + noteText(facts.note),
    '编号 ' + (facts.recordId === null ? MISSING : String(facts.recordId)),
  ].join('\n');
}

/** JSON 加厚（票面同等，数仍数，2 空格缩进，无尾换行，键序照 demo；note 空为 null）。 */
export function buildReceiptCopyJson(kind: string, facts: ReceiptCopyFacts): string {
  const k = typeof kind === 'string' ? kind : '';
  const conclusion = conclusionLine(k, facts.amount);
  const payload: Record<string, unknown> = {
    version: '1.0',
    skill: 'bill',
    shape: 'receipt',
    key: 'record.add',
    data: {
      ok: true,
      recordId: facts.recordId,
      category: typeof facts.category === 'string' ? facts.category : '',
      amount: facts.amount,
      time: typeof facts.time === 'string' ? facts.time : '',
      account: typeof facts.account === 'string' ? facts.account : '',
      ledger: typeof facts.ledger === 'string' ? facts.ledger : '',
      note: noteJson(facts.note),
      currency: typeof facts.currency === 'string' ? facts.currency : '',
      message_derived: conclusion,
    },
  };
  return JSON.stringify(payload, null, 2);
}

/** CSV 纵表（表头 field,value，LF，无尾换行，RFC4180 引号；金额保留符号，方向单列；格复用共用件）。 */

/** CSV 9 行（结论/分类/金额/方向/时间/账户/账本/备注/编号，值与文本同源，纸面一致）。 */
export function buildReceiptCopyCsv(kind: string, facts: ReceiptCopyFacts): string {
  const k = typeof kind === 'string' ? kind : '';
  const conclusion = conclusionLine(k, facts.amount);
  const direction = copyDirectionOf(k, facts.amount);
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['结论', conclusion],
    ['分类', pickText(facts.category)],
    ['金额', signed2(facts.amount)],
    ['方向', direction],
    ['时间', pickText(facts.time)],
    ['账户', pickText(facts.account)],
    ['账本', pickText(facts.ledger)],
    ['备注', noteText(facts.note)],
    ['编号', facts.recordId === null ? MISSING : String(facts.recordId)],
  ];
  const lines = ['field,value'];
  for (const [field, value] of rows) lines.push(csvCell(field) + ',' + csvCell(value));
  return lines.join('\n');
}
