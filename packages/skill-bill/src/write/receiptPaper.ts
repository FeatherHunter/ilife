/** 写入域**回执纸**（#1117）：13 条录入词（x02…x26）的回执页**共用的一处实现**。
 *
 * 为什么另立一件：这 13 页原先各走文档壳（`pageShell`：读数／明细／对账／复制四段带页内导航），
 *  与判地原型（`docs/skills/skill-bill/proto/write-receipt/x{02..26}-*-v2.html`）那一族票据纸不是一个形。
 *  本件把它们收成**一处块位序列**：13 页之间的差异只剩「数据 ＋ 文案」（文案表见下面的 `RECEIPT_PAPER`），
 *  版式实现只有这一份。同族已落地的邻居是 `./template-update.ts` 的回执支（x28／x30／x32），
 *  纸与家具的用法逐条照它，**块序照判地原型**。
 *
 * **块位序列**（逐条对得上 13 张原型，● 恒出、○ 有内容才出）：
 *   店头（品牌行 ● ＋ 结论标题 ● ＋ 副题 ●）→ 虚线 ● → 主数字（眉标 ● ＋ 金额 ● ＋ 单位 ● ＋ 说明 ● ＋ 印章 ●）→
 *   虚线 ● → 「记到哪里」段（账目行 ●：账户／账本／时间，标签行 ○）→ 虚线 ● → 「核对」段（一行 ●）→
 *   虚线 ● → 操作区（退出口真按钮 ○ ＋ 复制区 ●）→ ✂ 裁切线 ● → 纸外页脚 ●
 *
 * 与 `./template-update.ts` 回执支的三处不同（都以判地原型为准，不是笔误）：
 *   ① 主数字下面有那句说明（`ticketSummary` 第二参），店头有副题（`sheetHead` 第三参）；
 *   ② 多一段「核对」（编号一行），原型里它就在「记到哪里」下面；
 *   ③ 段标题**不带右对齐英文标**（原型的 `.sec-heading` 只有中文），故 `tag` 传空串；
 *      复制区下面也**不挂口径句**（判据 2「复制区下方一律不挂句子」）。
 *
 * 本件零取数、零判据：纸上的值全部来自 `ReceiptInput`（摘要五格与回执事实）与入参里的唤醒词；
 *  载荷键、值、条数一字不动（本票只改版式）。
 *
 * 谁在用（四个调用点，指名）：`./template-{expense,flow,batch,installment}.ts` 的回执支——
 *  四张模板各把 `spec.word` 与 `spec.kind` 递进来，其余一字不差，13 页由此实例化。
 */
import { escapeHtml } from 'base-paint';
import { renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { copyArea, copyLog, COPY_HINTS } from '../shared/copyArea.js';
import { DOC_TITLE, docTitleOf } from '../shared/pageIdentity.js';
import {
  assembleSheetPage, sheetHead, ticketActions, ticketPrimaryButton, ticketRule, ticketSection, ticketSummary,
} from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import type { BillReceipt } from '../shared/writeParts.js';
import { duplicateNote, findDuplicates } from './duplicateNote.js';
import { envelopeOf, probeOfReceipt } from './pageParts.js';
import { exitCopyOf } from './receiptSheet.js';
import { money2 } from './summaryRow.js';
import { fieldLabelOf } from './userWording.js';
import type { ReceiptInput } from './scene.js';

/** 本纸的入参：回执页入参 ＋ 这一件的唤醒词与认的 `kind`（13 页只在这两格上分岔）。 */
export interface ReceiptPaperInput extends ReceiptInput {
  /** 唤醒词（店头品牌行、纸外页脚、`<title>` 都用它）。 */
  readonly word: string;
  /** 这一件认的 `kind`（空串＝通用词「记一笔」，见 `./scene.js` 的落点表）。 */
  readonly kind: string;
}

/** 一页回执纸的**文案**（版式之外的全部差异都收在这一格；13 行就是那 13 次实例化）。 */
interface PaperWords {
  /** 结论标题里的短词（与金额拼成「记好了：支出 12.50」）。 */
  readonly titleWord: string;
  /** 主数字眉标的方向词。 */
  readonly eyebrowWord: string;
  /** 主数字下面那句说明（本次笔数由回执事实给，不写死）。 */
  readonly note: (receipt: BillReceipt) => string;
  /** 不带结论短词的那两句（批量录入与记一笔）：给了它就整句用它，不拼金额。 */
  readonly plainTitle?: string;
  /** 「记到哪里」里额外那一行（借出／借入的标签行）；不给＝不出这一行。 */
  readonly extraRow?: { readonly label: string; readonly value: string };
  /** 这一族回执页出不出「疑似重复」条件块（改前两族的旧回执页有这一支；批量录入与记分期没有）。
   *  **条件块**：只有在近期记录里真撞上「同一天＋同金额＋同分类」时才上屏——判地 13 件样本都撞不上，
   *  故它不参与像素判据；真撞上时它是安全提示，不许静默丢掉（负责人 2026-10-04 裁决）。 */
  readonly duplicateNotice: boolean;
}

/** 「写进账本」那句里点名的字段（13 页里九页同句，故只写一份）。 */
const LEDGER_FIELDS = '分类、金额、时间、账户、账本';

/** 九页同句：本笔写进哪几项。 */
function commonNote(receipt: BillReceipt): string {
  return '改了 ' + receipt.affectedRows + ' 笔：' + LEDGER_FIELDS + '等项已写进账本';
}

/** 借贷两页同句：多一项「标签」。 */
function tagNote(receipt: BillReceipt): string {
  return '改了 ' + receipt.affectedRows + ' 笔：' + LEDGER_FIELDS + '、标签已写进账本';
}

/** 拍账单那一句。 */
function photoNote(receipt: BillReceipt): string {
  return '改了 ' + receipt.affectedRows + ' 笔：三要素以外部识别为准，已落账';
}

/** 批量录入那一句（单笔化：这一屏只落其中一笔）。 */
function batchNote(receipt: BillReceipt): string {
  return '改了 ' + receipt.affectedRows + ' 笔：这次只落了其中一笔';
}

/** 13 行文案表：键＝这一件认的 `kind`（空串记 `plain`，与 `./scene.js` 的落点表同键）。
 *  **表里只放文案**——块序与块位拼装在本件下面的 `receiptPaper` 一处。 */
const RECEIPT_PAPER: Readonly<Record<string, PaperWords>> = {
  expense: { titleWord: '支出', eyebrowWord: '支出', note: commonNote, duplicateNotice: true },
  income: { titleWord: '收入', eyebrowWord: '收入', note: commonNote, duplicateNotice: true },
  photo: { titleWord: '账单', eyebrowWord: '支出', note: photoNote, duplicateNotice: true },
  batch: { titleWord: '', eyebrowWord: '支出', note: batchNote, plainTitle: '这一批记好了', duplicateNotice: false },
  refund: { titleWord: '退款', eyebrowWord: '退款', note: commonNote, duplicateNotice: true },
  reimburse: { titleWord: '报销', eyebrowWord: '支出', note: commonNote, duplicateNotice: true },
  'reimburse-done': { titleWord: '到账', eyebrowWord: '收入', note: commonNote, duplicateNotice: true },
  lend: {
    titleWord: '借出', eyebrowWord: '支出', note: tagNote, duplicateNotice: true,
    extraRow: { label: '标签', value: '#借出 #未还' },
  },
  borrow: {
    titleWord: '借入', eyebrowWord: '收入', note: tagNote, duplicateNotice: true,
    extraRow: { label: '标签', value: '#借入 #未还' },
  },
  collect: { titleWord: '收回', eyebrowWord: '收入', note: commonNote, duplicateNotice: true },
  repay: { titleWord: '偿还', eyebrowWord: '支出', note: commonNote, duplicateNotice: true },
  installment: { titleWord: '分期', eyebrowWord: '支出', note: commonNote, duplicateNotice: false },
  plain: { titleWord: '', eyebrowWord: '支出', note: commonNote, plainTitle: '这一笔记好了', duplicateNotice: true },
};

/** 通用词那一行（`kind` 是空串，也接认不得的 `kind`——落点表把它们都交给「记一笔」那一件）。 */
const PLAIN_WORDS = RECEIPT_PAPER['plain'] as PaperWords;

/** 这一件用哪一行文案。 */
function wordsOf(kind: string): PaperWords {
  return RECEIPT_PAPER[kind] ?? PLAIN_WORDS;
}

/** 店头品牌行（原型 `.shop-brand`）：`饼干记账 · <唤醒词>`。 */
function brandOf(word: string): string {
  return DOC_TITLE + ' · ' + word;
}

/** 结论标题（原型 `h2`）：带金额的那几句由短词与**绝对值**拼（原型印的是 `12.50` 这种无符号值）。 */
function titleOf(words: PaperWords, amount: number | null): string {
  if (words.plainTitle !== undefined) return words.plainTitle;
  const abs = amount === null || !Number.isFinite(amount) ? '' : Math.abs(amount).toFixed(2);
  return '记好了：' + words.titleWord + (abs === '' ? '' : ' ' + abs);
}

/** 落点账目行的一个值（空值写「未给」，与摘要行同一口径）。 */
function pick(value: string): string {
  return value.trim() === '' ? '未给' : value;
}

/** 核对那一行（原型 `.check-mini`）：编号 ＋ 异常（本族恒「无」）。 */
function checkHtml(recordId: number | null): string {
  const text = '编号 ' + (recordId === null ? '还没有' : String(recordId)) + ' ／ 异常：无';
  return '<div class="ilife-ticket-check"><span class="ilife-ticket-check-dot" aria-hidden="true"></span>'
    + '<span>' + escapeHtml(text) + '</span></div>';
}

/** 一页回执纸（**本域 13 页的唯一装配处**）。块序见件头。 */
export function receiptPaper(input: ReceiptPaperInput): string {
  const { key, params, receipt, facts } = input;
  const words = wordsOf(input.kind);
  const envelope = envelopeOf(key, true, receipt.summary);
  const exit = exitCopyOf('undo', receipt.recordId);
  /** 「疑似重复」条件块：这一族出它、且真撞上时才非空（判地样本撞不上 ⇒ 不上屏）。 */
  const probe = probeOfReceipt(input);
  const duplicate = words.duplicateNotice ? duplicateNote(findDuplicates(input.recent, probe), probe, 'static') : '';
  const rows = [
    { label: '账户', value: pick(facts.account) },
    { label: '账本', value: pick(facts.ledger) },
    { label: '时间', value: pick(facts.time) },
    ...(words.extraRow === undefined ? [] : [words.extraRow]),
  ];
  const paper = sheetHead(brandOf(input.word), escapeHtml(titleOf(words, facts.amount)), '已经记好，不用再操作。')
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: words.eyebrowWord + ' · ' + pick(facts.category),
      value: money2(facts.amount),
      unit: '元',
      stamp: { text: '有效', tone: 'ok' },
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(words.note(receipt)) + '</p>')
    + ticketRule()
    + ticketSection({ title: '记到哪里', tag: '', content: renderLedgerRows({ rows, layout: 'ticket' }) })
    + ticketRule()
    + ticketSection({ title: '核对', tag: '', content: checkHtml(receipt.recordId) })
    + (duplicate === '' ? '' : ticketRule() + duplicate)
    + ticketRule()
    + ticketActions((exit === null ? '' : ticketPrimaryButton(exit)) + copyArea({
      hints: COPY_HINTS.receipt,
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params), source: receipt.source,
          detail: '改了 ' + receipt.affectedRows + ' 笔，写进去 '
            + (receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
          actionAt: receipt.actionAt, version: envelope.version,
        }),
      },
    }));
  const content = writeSection({
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper })
      + '<p class="ilife-ticket-foot">' + escapeHtml(brandOf(input.word) + '回执') + '</p>',
  });
  return assembleSheetPage({ docTitle: docTitleOf(input.word + ' 回执'), bodyHtml: content, paper: 'receipt' });
}
