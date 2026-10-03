/** 写入域模板之二 · **改记录确认**（`t685-按域页型表.md` §2.1 第 5 张）。
 *
 * **本件是块位序列的唯一住所**：两张页的块序、每块的出现条件、每块吃到的数据都写在这里；场景件
 *  （`scene-update`／`scene-undo`／`scene-restore`）只给差异值——唤醒词、几句文案、中段按形态出哪一岔、
 *  回执页的结果表与退出口取哪一种。改一次版式只动本件一处，三张页同时跟着改。
 * 盖住的场景（老侧一张 `update_confirm.html` 扛三条词，本仓按「一命令一页」拆开、装配体共用一份）：
 *  改记录 `update` · 撤销 `undo` · 恢复 `restore`——三条都是 `bill.record.update` 的一支，靠 `op` 分。
 *
 * **块位序列**（#993 起小票化；● 恒出、○ 有内容才出）：
 *   采集页：类型徽章 ● → 第 1 段标题 ○（缺项才出）→ 缺项标签 ● → 摘要行 ● → 口径行 ○（改记录不出）→
 *     第 2 段标题 ● → 缺项阻断条（折叠）● → 中段 ●（缺编号＝候选单选；选定＝只读回显 ＋ 一岔：
 *     diff 表／说明块／一行口径／不出）→ 复制 prompt 区 ● → 复制区 ● → 来源脚注 ●（#688 §五 第 26 行）
 *   回执页（一纸）：店头（品牌行＋改动结论标题）● → 主数字头 ●（金额唯一＋印章）→ 改后落点账目 ● →
 *     结果表 ○（撤销＝撤销标记对照、恢复＝标记现值；改记录不出）→ 核对段 ●（编号＋异常）→
 *     退出口真按钮 ○ → 复制区 ● → ✂ 裁切线 → 纸外页脚 ●（`饼干记账 · <词>回执`）。
 *  **#1075 复跑补两块**（负责人 2026-10-04 裁）：核对段与纸外页脚 2026-10-02 按用户要求撤（`f44e4064`）、2026-10-03 `4cd7a1f6` 起查询域已放回 ⇒ 本件是最后没跟上处，补齐为 `./receiptPaper.js` 那 13 页同形。
 * 谁在用（三个调用点，指名）：`src/write/scene-{update,undo,restore}.ts`——各件的 `Scene.collect`／`Scene.receipt`
 *  都是 `bindUpdatePages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderDisclosure, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { escapeHtml, type SerializableEnvelope } from 'base-paint';
import { blockedBar, blockedItems, blockedMessage } from './blockedSlots.js';
import type { BlockedItem } from './blockedSlots.js';
import { collectMissingTags, collectSectionTitle } from './collectFrame.js';
import { copyArea, copyLog, promptCopyArea } from '../shared/copyArea.js';
import { diffTable } from './diffTable.js';
import { emptyNote } from './emptyNote.js';
import { DOC_SKILL, DOC_VERSION, docTitleOf, sceneKeyOf } from '../shared/pageIdentity.js';
import { EYEBROW, writePageShell as pageShell } from './pageParts.js';
import { sayCollectOut } from './saySheet.js';
import { diffRowsFor, pickerBlock, readRowById, snapshotTable } from './recordPicker.js';
import { money2, summaryRow } from './summaryRow.js';
import type { SummaryFacts } from './summaryRow.js';
import { typeBadge } from './typeBadge.js';
import { fieldLabelOf } from './userWording.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { pageBody, pageNav } from '../shared/pageSections.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketPrimaryButton, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { directionWord } from '../shared/direction.js';
import { exitCopyOf, landedRows, receiptStamp, receiptTitle } from './receiptSheet.js';   // UNDO_CALIBER 按判地不再上屏（该导出仍在 receiptSheet.ts，未删：本票写集只有本件）
import { collectSourceNote } from './sourceNote.js';
import type { BillReceipt } from '../shared/writeParts.js';
import type { BillRow } from '../fetch/db.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 采集页文案函数读到的那一份事实（形态判定只在本件做一次）。 */
interface UpdatePage {
  /** 页上认到的记录编号（没给＝null）＋ 被认到的那一行编号（读不到＝null）与撤销标记原文（读不到＝空串）。 */
  readonly id: number | null;
  readonly rowId: number | null;
  readonly deletedAt: string;
  /** 那一行是不是已带撤销标记（软删口径取 `../shared/recordPicker.js`，本件不重判一次）。 */
  readonly deleted: boolean;
  /** 读那一条那一路上的库报错收尾（读通了＝空串；空态正文后面缀的它）。 */
  readonly readFailure: string;
  /** 本次缺的槽位与本次参数（徽章状态那几句、照抄写库指令那几处文案读它们）。 */
  readonly blocked: readonly BlockedItem[];
  readonly params: Record<string, unknown>;
}

/** 中段只读回显之后那一岔：`none`＝不出／`diff`＝改前改后对照表／`caliber`＝一行口径／`note`＝一块说明。 */
type MiddleExtra =
  | { readonly kind: 'none' }
  | { readonly kind: 'diff'; readonly caption: string }
  | { readonly kind: 'caliber'; readonly text: (page: UpdatePage) => string }
  | { readonly kind: 'note'; readonly title: string; readonly text: (page: UpdatePage) => string; readonly next: string };

/** 采集页中段（第 2 段标题下面那一格）的四种形态：缺编号先挑一条，选定之后按库内那一行分三岔。 */
interface MiddleSpec {
  /** 缺编号时那块候选单选认哪些记录（`update`／`undo`／`restore` 三种过筛条件）＋ 换一句话说这一格。 */
  readonly pick: { readonly mode: 'update' | 'undo' | 'restore'; readonly hint?: string };
  /** 那一条已带撤销标记：只读回显的标题 ＋ 回显之后那一岔。 */
  readonly markedCaption: (page: UpdatePage) => string;
  readonly marked: MiddleExtra;
  /** 那一条读不到：空态标题 ＋ 正文头半句（库报错那句收尾由本件缀上，三条词共用一个写法）。 */
  readonly noRowTitle: string;
  readonly noRowText: (page: UpdatePage) => string;
  /** 那一条读到了、也没带标记：只读回显的标题 ＋ 回显之后那一岔。 */
  readonly plainCaption: (page: UpdatePage) => string;
  readonly plain: MiddleExtra;
}

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface UpdateSpec {
  /** 唤醒词（页标题与几句文案里都写它；带 `op` 的两件词面不同）。 */
  readonly wake: string;
  /** 命令全名（三条词同一条 `bill.record.update`；复制指令与信封都引它一份）。 */
  readonly key: string;
  /** 采集页：类型徽章那枚状态（改记录报「三形态之一…」，撤销／恢复报缺没缺项）。 */
  readonly collectState: (page: UpdatePage) => string;
  /** 采集页：选定编号之后页标题里那句「确认什么」。 */
  readonly confirmTitle: string;
  /** 采集页：摘要行之后那一行口径（空串＝本场景不出这一行）。 */
  readonly caliber: string;
  /** 采集页：中段（候选那一格与三种选定形态各自的文案与块岔）。 */
  readonly middle: MiddleSpec;
  /** 采集页：复制 prompt 区那段话（按页上认到的编号与那一行的值算）。 */
  readonly prompt: (page: UpdatePage) => string;
  /** 回执页：结果表取哪一种（`none`＝改记录不出／`undo`＝撤销标记对照／`restore`＝标记现值）。 */
  readonly receiptResult: 'none' | 'undo' | 'restore';
  /** 回执页：退出口那枚给哪件事（`undo`＝「撤销这一笔」；`restore`＝「恢复这一笔」）。 */
  readonly receiptExit: 'undo' | 'restore';
  /** 回执页：店头品牌行（1059+1065 落地页才给＝`饼干记账 · <场景>`；不给＝通用域品牌行，老页指纹不动）。 */
  readonly receiptBrand?: string;
}

/** 场景件拿到手的两张页（`Scene` 的 `collect`／`receipt` 两格）。 */
export function bindUpdatePages(spec: UpdateSpec): Pick<Scene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 撤销／恢复两件共用的徽章状态（缺项就报「已阻断」，不缺报「待核对」；改记录那一件另有三种形态的说法）。 */
export function blockedStateOf(page: UpdatePage): string {
  return page.blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库';
}

/** 撤销／恢复两件共用的「这个编号读不到」那句（编号照实写；库报错那句收尾由本件缀在话后）。 */
export function missingRowText(page: UpdatePage): string {
  return '记录编号 ' + page.id + ' 在库里读不到。';
}

/** 一个值的字符串形态（数字写十进制串，其余形态按空串用）。 */
function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 记录编号：`params.id` 是正整数才算给了（其余形态一律当没给，不猜）。 */
function idOf(params: Record<string, unknown>): number | null {
  const raw = params['id'];
  const n = typeof raw === 'number' ? raw : textOf(raw) === '' ? NaN : Number(textOf(raw));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 摘要行的事实：有原记录就取库内那一行（页面说的是那一条的现状），没有就取本次参数。 */
function factsOf(row: BillRow | null, params: Record<string, unknown>): SummaryFacts {
  if (row !== null) {
    return { amount: row.amount, category: row.category, account: row.account, ledger: row.ledger, time: row.time };
  }
  const raw = params['amount'];
  const n = typeof raw === 'number' ? raw : textOf(raw) === '' ? NaN : Number(textOf(raw));
  return {
    amount: Number.isFinite(n) ? n : null, category: textOf(params['category']), account: textOf(params['account']),
    ledger: textOf(params['ledger']), time: textOf(params['time']),
  };
}

/** 缺项时那条写库指令原文：缺的值留成尖括号占位符，**只给看不给复制**。 */
function blockedCommand(key: string, params: Record<string, unknown>, blocked: readonly BlockedItem[]): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  return commandLine(key, filled);
}

/** 缺项阻断条整条收进折叠区（判定与文案一字不动，仍是共用件 `blockedBar` 的产出，只换摆法）。 */
function blockedFold(items: readonly BlockedItem[], command: string): string {
  if (items.length === 0) return '';
  return renderDisclosure({ title: '还缺什么，以及补齐后照抄的那条', contentHtml: blockedBar({ items, command }) });
}

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key), data: { ok, message } };
}

/** 允许改的字段名单：取自槽位表（`id`／`op` 两格不是被改的字段），本件不另抄一份。 */
function changeFieldsOf(input: CollectInput): readonly string[] {
  return input.slots.filter((s) => s.name !== 'id' && s.name !== 'op').map((s) => s.name);
}

/** 采集页上认到的那一份事实：文案函数读的那一格 ＋ 那一行本身（摘要行与 diff 表要整行，只读一次库）。 */
function pageOf(input: CollectInput): { readonly page: UpdatePage; readonly row: BillRow | null } {
  const id = idOf(input.params);
  const probe = id === null ? null : readRowById(id);
  const row = probe === null ? null : probe.row;
  return {
    row,
    page: {
      id, rowId: row === null ? null : row.id, deletedAt: row === null ? '' : String(row.deleted_at),
      deleted: probe !== null && probe.deleted,
      readFailure: probe !== null && !probe.ok ? probe.reason + '。' : '',
      blocked: blockedItems({ params: input.params, missing: input.missing, kind: '' }),
      params: input.params,
    },
  };
}

/** 中段：缺编号先挑一条；选定之后按库内那一行分三岔，每岔＝只读回显 ＋ 只读回显之后那一岔块。 */
function middleBlock(spec: MiddleSpec, page: UpdatePage, row: BillRow | null, input: CollectInput): string {
  if (page.id === null) {
    return pickerBlock({ mode: spec.pick.mode, ...(spec.pick.hint === undefined ? {} : { hint: spec.pick.hint }) });
  }
  if (row === null) {
    return emptyNote({
      title: spec.noRowTitle, text: spec.noRowText(page) + page.readFailure,
      next: '核一下编号，或先说清是哪一笔。',
    });
  }
  if (page.deleted) return snapshotTable(row, spec.markedCaption(page)) + extraBlock(spec.marked, page, row, input);
  return snapshotTable(row, spec.plainCaption(page)) + extraBlock(spec.plain, page, row, input);
}

/** 只读回显之后那一岔：`none` 不出／`caliber` 一行口径／`note` 一块说明／`diff` 改前改后对照表。 */
function extraBlock(extra: MiddleExtra, page: UpdatePage, row: BillRow, input: CollectInput): string {
  if (extra.kind === 'none') return '';
  if (extra.kind === 'caliber') return renderCaliberLine(extra.text(page));
  if (extra.kind === 'note') return emptyNote({ title: extra.title, text: extra.text(page), next: extra.next });
  return diffTable({ rows: diffRowsFor({ row, params: input.params, fields: changeFieldsOf(input) }), caption: extra.caption });
}

/** 过程型采集页：缺项或缺编号时出这一页（只采集、不写库）。 */
function collectPage(spec: UpdateSpec, input: CollectInput): string {
  const { page, row } = pageOf(input);
  const facts = factsOf(row, input.params);
  const envelope = envelopeOf(spec.key, false, blockedMessage(input.missing, page.blocked));
  const sayOut = sayCollectOut({
    sayKey: 'update:' + spec.receiptResult,
    key: spec.key,
    shape: envelope.shape,
    word: spec.wake,
    params: input.params,
    data: { envelope },
    log: { envelope, copyLog: copyLog({
      command: commandLine(spec.key, input.params), source: input.source, detail: '没写库（采集页）',
      actionAt: input.actionAt, version: DOC_VERSION,
    }) },
  });
  if (sayOut !== null) return sayOut;
  /** 副标题只报缺哪一项（不重复「已出采集页，补齐之后跟助手说一遍」那句）。 */
  const subtitle = page.blocked.length === 0 ? '' : '还差 ' + page.blocked.length + ' 项必需项';
  const content = [
    typeBadge({ kind: '', status: 'danger', state: spec.collectState(page), pageKind: page.id === null ? '挑一条记录' : '核对这一条', next: '' }),
    page.blocked.length === 0 ? '' : collectSectionTitle({ no: 1, title: '先看这一笔缺什么' }),
    collectMissingTags({ labels: page.blocked.map((i) => i.label) }),
    summaryRow(facts),
    spec.caliber === '' ? '' : renderCaliberLine(spec.caliber),
    collectSectionTitle({ no: 2, title: page.id === null ? '先挑一条记录' : '核对这一条' }),
    blockedFold(page.blocked, blockedCommand(spec.key, input.params, page.blocked)),
    middleBlock(spec.middle, page, row, input),
    promptCopyArea(spec.prompt(page), '挑好记录后照这句跟助手说一遍'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(spec.key, input.params), source: input.source, detail: '没写库（采集页）',
          actionAt: input.actionAt, version: DOC_VERSION,
        }),
      },
    }),
    collectSourceNote(facts.time),
  ].join('');
  return pageShell({
    docTitle: docTitleOf(spec.wake + ' 补齐槽位'),
    title: spec.wake,
    subtitle, slot: 'collect', page: 'collect', shape: envelope.shape, key: spec.key, content,
  });
}

/** 回执页的「结果表」按判地删掉（负责人 2026-10-04 裁，A 口径：判地没有的不出；x28／x30／x32 三张判地原型
 *  都没有结果表那一块）。判地那两页有的是摘要头里的一句状态（撤销标记已打上／已清除），见证据件的块位对照表。 */

/** 小票纸取值小件住 `./receiptSheet.js`（块序与店头仍在本件，值加工在那一件）。 */

/** 回执纸头标题、印章、落点账目、退出口真按钮见 `./receiptSheet.js`。 */

/** 店头副句（判地 `.shop-sub`）：三支各一句，**逐字取判地原型**（x28「已经改好，不用再操作。」／x30「已经撤销，不用再操作。」／x32「已经恢复，不用再操作。」）。 */
const SUB_OK: Readonly<Record<string, string>> = {
  none: '已经改好，不用再操作。',
  undo: '已经撤销，不用再操作。',
  restore: '已经恢复，不用再操作。',
};

/** 摘要头那一句状态（判地 `.summary-note`）：撤销／恢复两支各一句，**逐字取判地原型**（x30「撤销标记已打上，记录保留、随时可恢复」／x32「撤销标记已清除，记录回到正常状态」）；改记录支判地没有这一句。 */
const RESULT_NOTE: Readonly<Record<string, string>> = {
  undo: '撤销标记已打上，记录保留、随时可恢复',
  restore: '撤销标记已清除，记录回到正常状态',
};

/** 主数字头（判地 `.summary-head`）：**改记录支**判地是「改后落点 · <改的字段>／<改动笔数> 笔」（x28「改后落点 · 备注／1／笔」）；**撤销／恢复两支**判地是「<方向> · <分类>／金额 元」（x30「收入 · 工资／+8000.00／元」）。 */
function summaryHeadOf(spec: UpdateSpec, input: ReceiptInput, receipt: BillReceipt) {
  const fields = receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项';
  if (spec.receiptResult === 'none') {
    return { eyebrow: '改后落点 · ' + fields, value: String(receipt.affectedRows), unit: '笔', stamp: receiptStamp(spec.receiptResult, receipt), layout: 'ticket' as const };
  }
  const category = input.facts.category.trim() === '' ? '未给' : input.facts.category;
  return { eyebrow: directionWord(input.facts.amount) + ' · ' + category, value: money2(input.facts.amount), unit: '元', stamp: receiptStamp(spec.receiptResult, receipt), layout: 'ticket' as const };
}

/** 摘要头下面那句小字：改记录支判地是「<改的字段>已更新为最新内容，其余字段未动」（x28 逐字）；撤销／恢复支看法 `RESULT_NOTE`。 */
function summaryNoteOf(spec: UpdateSpec, receipt: BillReceipt): string {
  if (spec.receiptResult !== 'none') return RESULT_NOTE[spec.receiptResult] ?? '';
  const fields = receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项';
  return fields + '已更新为最新内容，其余字段未动';
}

/** 落点账目行：**判地撤销／恢复两支不出「分类」行**（x30／x32 逐字只有账户／账本／时间），改记录支出（x28 分类在）；其余三行照 `./receiptSheet.js` 的 landedRows。 */
function landedRowsOf(spec: UpdateSpec, input: ReceiptInput) {
  const rows = landedRows(input.facts);
  return spec.receiptResult === 'none' ? rows : rows.filter((r) => r.label !== '分类');
}

/** 核对那一行（原型 `.check-mini`）：形状逐字照 `./receiptPaper.js` 的 `checkHtml`（本仓这一块各页型各持一份 markup，合并出口是后续票的事）。 */
function checkHtml(recordId: number | null): string {
  const text = '编号 ' + (recordId === null ? '还没有' : String(recordId)) + ' ／ 异常：无';
  return '<div class="ilife-ticket-check"><span class="ilife-ticket-check-dot" aria-hidden="true"></span><span>' + escapeHtml(text) + '</span></div>';
}

/** 结果型回执页（一纸 #993 v5）：店头＋主数字＋落点账目＋结果表＋核对段＋退出口真按钮＋复制区＋纸外页脚（页内导航／明细表／对账折叠／徽章行按一数一处撤掉，编号住核对段一行；两块见件头「#1075 复跑补两块」）。 */
function receiptPage(spec: UpdateSpec, input: ReceiptInput): string {
  const { receipt } = input;
  const envelope = envelopeOf(spec.key, true, receipt.summary);
  const exit = exitCopyOf(spec.receiptExit, receipt.recordId);
  const note = summaryNoteOf(spec, receipt);
  const paper = sheetHead(spec.receiptBrand ?? EYEBROW + ' · ' + spec.wake, receiptTitle(spec.receiptResult, receipt, input.detail, input.params), SUB_OK[spec.receiptResult] ?? '')
    + ticketRule()
    + ticketSummary(renderSummaryHead(summaryHeadOf(spec, input, receipt)), note === '' ? '' : '<p class="ilife-ticket-summary-note">' + escapeHtml(note) + '</p>')
    + ticketRule()
    + ticketSection({ title: '记到哪里', tag: '', content: renderLedgerRows({ rows: landedRowsOf(spec, input), layout: 'ticket' }) })
    + ticketRule()
    + ticketSection({ title: '核对', tag: '', content: checkHtml(receipt.recordId) })
    + ticketRule()
    + ticketActions((exit === null ? '' : ticketPrimaryButton(exit))
      + copyArea({
        data: { envelope },
        log: {
          envelope,
          copyLog: copyLog({
            command: commandLine(spec.key, input.params), source: receipt.source,
            detail: '改了 ' + receipt.affectedRows + ' 笔，写进去 '
              + (receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
            actionAt: receipt.actionAt, version: DOC_VERSION,
          }),
        },
      }));
  const content = writeSection({
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key: spec.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper }) + '<p class="ilife-ticket-foot">' + escapeHtml((spec.receiptBrand ?? EYEBROW + ' · ' + spec.wake) + '回执') + '</p>',
  });
  return assembleSheetPage({
    docTitle: docTitleOf(spec.wake + ' 回执'),
    bodyHtml: content,
    paper: 'receipt',
  });
}
