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
import { resolve } from 'base-entries';
import { escapeHtml } from 'base-paint';
import { renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { copyArea, copyLog, COPY_HINTS } from '../shared/copyArea.js';
import { DOC_TITLE, docTitleOf } from '../shared/pageIdentity.js';
import {
  assembleSheetPage, sheetHead, ticketActions, ticketPrimaryButton, ticketRule, ticketSection, ticketSummary,
} from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import type { BillReceipt } from '../shared/writeParts.js';
import { buildReceiptCopyCsv, buildReceiptCopyJson, buildReceiptCopyText } from './copyTextReceipt.js';
import type { ReceiptCopyFacts } from './copyTextReceipt.js';
import { duplicateNote, findDuplicates } from './duplicateNote.js';
import { envelopeOf, probeOfReceipt } from './pageParts.js';
import { exitCopyOf } from './receiptSheet.js';
import { money2 } from './summaryRow.js';
import { fieldLabelOf } from './userWording.js';
import type { ReceiptInput } from './scene.js';
import { SKILL_BILL_CATALOG, type SkillBillMessageId } from '../entries/index.js';

/** 本纸的入参：回执页入参 ＋ 这一件的唤醒词与认的 `kind`（13 页只在这两格上分岔）。 */
export interface ReceiptPaperInput extends ReceiptInput {
  /** 唤醒词（店头品牌行、纸外页脚、`<title>` 都用它）。 */
  readonly word: string;
  /** 这一件认的 `kind`（空串＝通用词「记一笔」，见 `./scene.js` 的落点表）。 */
  readonly kind: string;
}

/** 回执纸取词器（key 拼错编译期红：`SkillBillMessageId` 从 zh 表派生）。 */
type PaperText = (id: SkillBillMessageId, params?: { readonly [key: string]: string | number }) => string;

/** 一页回执纸的**文案**（版式之外的全部差异都收在这一格；13 行就是那 13 次实例化）。
 *
 *  #1204 第二件（多语言文本外置）：文案不住这里，住 `../entries/zh.ts`（中文基准）与
 *  `../entries/en.ts`；表里只放 key（`titleId` 空串＝该行无结论短词，走 `plainId` 整句）。 */
interface PaperWords {
  /** 结论标题里的短词（与金额拼成「记好了：支出 12.50」）——词条 key，空串＝无此词。 */
  readonly titleId: SkillBillMessageId | '';
  /** 主数字眉标的方向词——词条 key。 */
  readonly eyebrowId: SkillBillMessageId;
  /** 主数字下面那句说明（本次笔数由回执事实给，不写死）。 */
  readonly note: (receipt: BillReceipt, t: PaperText) => string;
  /** 不带结论短词的那两句（批量录入与记一笔）：给了它就整句用它，不拼金额。 */
  readonly plainId?: SkillBillMessageId;
  /** 「记到哪里」里额外那一行（借出／借入的标签行）；不给＝不出这一行。 */
  readonly extraRow?: { readonly labelId: SkillBillMessageId; readonly valueId: SkillBillMessageId };
  /** 这一族回执页出不出「疑似重复」条件块（改前两族的旧回执页有这一支；批量录入与记分期没有）。
   *  **条件块**：只有在近期记录里真撞上「同一天＋同金额＋同分类」时才上屏——判地 13 件样本都撞不上，
   *  故它不参与像素判据；真撞上时它是安全提示，不许静默丢掉（负责人 2026-10-04 裁决）。 */
  readonly duplicateNotice: boolean;
}

/** 九页同句：本笔写进哪几项（整句模板 `{count}`／`{fields}`，拼接串不留片段）。 */
function commonNote(receipt: BillReceipt, t: PaperText): string {
  return t('receipt-paper.note.common', { count: receipt.affectedRows, fields: t('receipt-paper.ledger-fields') });
}

/** 借贷两页同句：多一项「标签」。 */
function tagNote(receipt: BillReceipt, t: PaperText): string {
  return t('receipt-paper.note.tagged', { count: receipt.affectedRows, fields: t('receipt-paper.ledger-fields') });
}

/** 拍账单那一句。 */
function photoNote(receipt: BillReceipt, t: PaperText): string {
  return t('receipt-paper.note.photo', { count: receipt.affectedRows });
}

/** 批量录入那一句（单笔化：这一屏只落其中一笔）。 */
function batchNote(receipt: BillReceipt, t: PaperText): string {
  return t('receipt-paper.note.batch', { count: receipt.affectedRows });
}

/** 13 行文案表：键＝这一件认的 `kind`（空串记 `plain`，与 `./scene.js` 的落点表同键）。
 *  **表里只放文案**——块序与块位拼装在本件下面的 `receiptPaper` 一处。 */
const RECEIPT_PAPER: Readonly<Record<string, PaperWords>> = {
  expense: { titleId: 'receipt-paper.expense.title', eyebrowId: 'receipt-paper.expense.eyebrow', note: commonNote, duplicateNotice: true },
  income: { titleId: 'receipt-paper.income.title', eyebrowId: 'receipt-paper.income.eyebrow', note: commonNote, duplicateNotice: true },
  photo: { titleId: 'receipt-paper.photo.title', eyebrowId: 'receipt-paper.photo.eyebrow', note: photoNote, duplicateNotice: true },
  batch: { titleId: '', eyebrowId: 'receipt-paper.batch.eyebrow', note: batchNote, plainId: 'receipt-paper.batch.plain-title', duplicateNotice: false },
  refund: { titleId: 'receipt-paper.refund.title', eyebrowId: 'receipt-paper.refund.eyebrow', note: commonNote, duplicateNotice: true },
  reimburse: { titleId: 'receipt-paper.reimburse.title', eyebrowId: 'receipt-paper.reimburse.eyebrow', note: commonNote, duplicateNotice: true },
  'reimburse-done': { titleId: 'receipt-paper.reimburse-done.title', eyebrowId: 'receipt-paper.reimburse-done.eyebrow', note: commonNote, duplicateNotice: true },
  lend: {
    titleId: 'receipt-paper.lend.title', eyebrowId: 'receipt-paper.lend.eyebrow', note: tagNote, duplicateNotice: true,
    extraRow: { labelId: 'receipt-paper.extra.tag', valueId: 'receipt-paper.lend.tag-value' },
  },
  borrow: {
    titleId: 'receipt-paper.borrow.title', eyebrowId: 'receipt-paper.borrow.eyebrow', note: tagNote, duplicateNotice: true,
    extraRow: { labelId: 'receipt-paper.extra.tag', valueId: 'receipt-paper.borrow.tag-value' },
  },
  collect: { titleId: 'receipt-paper.collect.title', eyebrowId: 'receipt-paper.collect.eyebrow', note: commonNote, duplicateNotice: true },
  repay: { titleId: 'receipt-paper.repay.title', eyebrowId: 'receipt-paper.repay.eyebrow', note: commonNote, duplicateNotice: true },
  installment: { titleId: 'receipt-paper.installment.title', eyebrowId: 'receipt-paper.installment.eyebrow', note: commonNote, duplicateNotice: false },
  plain: { titleId: '', eyebrowId: 'receipt-paper.plain.eyebrow', note: commonNote, plainId: 'receipt-paper.plain.plain-title', duplicateNotice: true },
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

/** 结论标题（原型 `h2`）：带金额的那几句由短词与**绝对值**拼（原型印的是 `12.50` 这种无符号值）。
 *  整句化两条（有／无金额各一条），`titleId` 空串只与 `plainId` 同行、到不了拼接分支。 */
function titleOf(words: PaperWords, amount: number | null, t: PaperText): string {
  if (words.plainId !== undefined) return t(words.plainId);
  const word = words.titleId === '' ? '' : t(words.titleId);
  const abs = amount === null || !Number.isFinite(amount) ? '' : Math.abs(amount).toFixed(2);
  return abs === ''
    ? t('receipt-paper.title.done-no-amount', { word })
    : t('receipt-paper.title.done', { word, amount: abs });
}

/** 落点账目行的一个值（空值写「未给」，与摘要行同一口径；本件的「未给」住词条，跨件同词现状各写一份，见 #1204 票面）。 */
function pick(value: string, t: PaperText): string {
  return value.trim() === '' ? t('receipt-paper.missing') : value;
}

/** 明细行取值（库列中文名经 fieldLabelOf；缺行按空串，复制门内统一为未给/null）。 */
function detailValue(detail: ReceiptPaperInput['detail'], name: string): string {
  const hit = detail.find((d) => d.k === fieldLabelOf(name));
  return hit === undefined ? '' : hit.v;
}

/** 回执复制事实（票面同等 8 格，值与纸面 pick 同源，复制恒等于已显示行）。 */
function copyFactsOf(input: ReceiptPaperInput): ReceiptCopyFacts {
  return {
    recordId: input.receipt.recordId,
    category: input.facts.category,
    amount: input.facts.amount,
    time: input.facts.time,
    account: input.facts.account,
    ledger: input.facts.ledger,
    note: detailValue(input.detail, 'note'),
    currency: detailValue(input.detail, 'currency'),
  };
}

/** 核对那一行（原型 `.check-mini`）：编号 ＋ 异常（本族恒「无」）。整句化两条（有／无编号各一条）。 */
function checkHtml(recordId: number | null, t: PaperText): string {
  const text = recordId === null
    ? t('receipt-paper.check.without-id')
    : t('receipt-paper.check.with-id', { id: recordId });
  return '<div class="ilife-ticket-check"><span class="ilife-ticket-check-dot" aria-hidden="true"></span>'
    + '<span>' + escapeHtml(text) + '</span></div>';
}

/** 一页回执纸（**本域 13 页的唯一装配处**）。块序见件头。 */
export function receiptPaper(input: ReceiptPaperInput): string {
  const { key, params, receipt, facts } = input;
  const language = input.language ?? 'zh';
  const t: PaperText = (id, p) => resolve(SKILL_BILL_CATALOG, language, id, p);
  const words = wordsOf(input.kind);
  const envelope = envelopeOf(key, true, receipt.summary);
  const exit = exitCopyOf('undo', receipt.recordId);
  /** 「疑似重复」条件块：这一族出它、且真撞上时才非空（判地样本撞不上 ⇒ 不上屏）。 */
  const probe = probeOfReceipt(input);
  const duplicate = words.duplicateNotice ? duplicateNote(findDuplicates(input.recent, probe), probe, 'static') : '';
  const rows = [
    { label: fieldLabelOf('account'), value: pick(facts.account, t) },
    { label: fieldLabelOf('ledger'), value: pick(facts.ledger, t) },
    { label: fieldLabelOf('time'), value: pick(facts.time, t) },
    ...(words.extraRow === undefined ? [] : [{ label: t(words.extraRow.labelId), value: t(words.extraRow.valueId) }]),
  ];
  const paper = sheetHead(brandOf(input.word), escapeHtml(titleOf(words, facts.amount, t)), t('receipt-paper.sheet-note'))
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: t(words.eyebrowId) + ' · ' + pick(facts.category, t),
      value: money2(facts.amount),
      unit: t('receipt-paper.unit'),
      stamp: { text: t('receipt-paper.stamp'), tone: 'ok' },
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(words.note(receipt, t)) + '</p>')
    + ticketRule()
    + ticketSection({ title: t('receipt-paper.section.where'), tag: '', content: renderLedgerRows({ rows, layout: 'ticket' }) })
    + ticketRule()
    + ticketSection({ title: t('receipt-paper.section.check'), tag: '', content: checkHtml(receipt.recordId, t) })
    + (duplicate === '' ? '' : ticketRule() + duplicate)
    + ticketRule()
    + ticketActions((exit === null ? '' : ticketPrimaryButton(exit)) + copyArea({
      hints: COPY_HINTS.receipt,
      data: { envelope },
      dataText: buildReceiptCopyText(input.kind, copyFactsOf(input)),
      dataJson: buildReceiptCopyJson(input.kind, copyFactsOf(input)),
      dataCsv: buildReceiptCopyCsv(input.kind, copyFactsOf(input)),
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params), source: receipt.source,
          detail: receipt.writtenFields.length === 0
            ? t('receipt-paper.copy.detail-no-fields', { count: receipt.affectedRows })
            : t('receipt-paper.copy.detail-with-fields', { count: receipt.affectedRows, fields: receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') }),
          actionAt: receipt.actionAt, version: envelope.version,
        }),
      },
    }));
  const content = writeSection({
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: t('receipt-paper.cut-line'), content: paper })
      + '<p class="ilife-ticket-foot">' + escapeHtml(t('receipt-paper.foot', { brand: brandOf(input.word) })) + '</p>',
  });
  return assembleSheetPage({ docTitle: docTitleOf(t('receipt-paper.doc-title', { word: input.word })), bodyHtml: content, paper: 'receipt' });
}
