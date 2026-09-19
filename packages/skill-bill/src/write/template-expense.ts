/** 写入域模板之一 · **支出表单**（`t685-按域页型表.md` §2.1 第 1 张）。
 *
 * **本件是块位序列的唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-{expense,income,photo,reimburse,plain}.ts`）只给差异值——唤醒词、型名、几句文案、
 *  哪个可选块出不出。改一次版式只动本件一处，五张页同时跟着改。值加工与取值口径住 `./pageParts.ts`。
 *
 * 盖住的场景（老侧一张 `expense_form.html` 扛四个词，本仓按「一命令一页」拆开、装配件共用一份）：
 *   记支出 `expense` · 记收入 `income` · 拍账单 `photo` · 记报销 `reimburse` · 记一笔 `plain`（无 preset 的通用词与兜底词）。
 *
 * **块位序列**（照 #688 §五 5.2 的 ① 采集／④ 回执 两类；● 恒出、○ 有内容才出）：
 *
 *   采集页：类型徽章 ●（`renderChips`）→ 进度 ○ → 缺项标签 ● → 第 1 段标题 ○ → 口径行 ×n ○ →
 *     主表 ○（拍账单的三要素表）→ 读数行 ○（记报销的垫付事实；**全空不出**，照 #688 裁定 6）→
 *     打标提示 ○（记报销）→ 重复检测条 ○ → 预填标注 ○ → 缺项阻断条（折叠）● →
 *     空态 ×n ○ → 第 2 段标题 ○ → 字段卡 ● → 复制指令块 ● → 第 3 段标题 ○ → 复制区 ●
 *   回执页：类型徽章 ● → 打标回执条 ○（记报销）→ 读数行 ● → 口径行 ○ → 重复检测条 ○ →
 *     明细表 ● → 对账折叠区 ● → 退出口 ○ → 复制区 ●
 *
 * 谁在用（五个调用点，指名）：`src/write/scene-{expense,income,photo,reimburse,plain}.ts`——各件
 *  `Scene.collect`／`Scene.receipt` 都是 `bindExpensePages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderDataTable, renderFeedbackBlock, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn } from 'base-paint/blocks';
import { blockedItems, blockedMessage } from './blockedSlots.js';
import { collectMissingTags, collectProgress, collectSectionTitle } from './collectFrame.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from './duplicateNote.js';
import { emptyNote } from './emptyNote.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { blockedPromptOf, fieldCardOf, valuesOf } from './photoEscape.js';
import { prefillNote, prefillOf } from './prefillNote.js';
import { receiptStatusCard, reconcileDisclosure } from './receiptParts.js';
import { summaryCards } from './summaryRow.js';
import { typeBadge } from './typeBadge.js';
import { fieldLabelOf } from './userWording.js';
import { commandLine } from '../shared/writeParts.js';
import { collectBlockedFold } from './collectBody.js';
import type { BlockedLine, CardsStyle, FieldSlot, NoticeIcon } from './pageParts.js';
import {
  defaultSlots, envelopeOf, formFields, hasAnyFact, probeOfReceipt, shorter, tailCardsOf,
} from './pageParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface ExpenseSpec {
  /** 唤醒词（页标题、进度、复制 prompt 区那句「跟助手说一遍『…』」）。 */
  readonly word: string;
  /** 认的 `kind`（空串＝通用词，方向按金额符号判）。 */
  readonly kind: string;
  /** 缺项时那条写库指令的占位写法（缺省按中文名占位）。 */
  readonly replaces: Readonly<Record<string, string>>;

  /** 采集页：进度那一行出不出（记报销不出）。 */
  readonly progress: boolean;
  /** 采集页：第 1 段标题只在有缺项时出（记报销是；其余一上页就出）。 */
  readonly section1WhenBlockedOnly: boolean;
  /** 采集页：第 1 段标题。 */
  readonly section1: string;
  /** 采集页：第 1 段之后的口径行（按序；空数组＝不出）。 */
  readonly calibers: (input: CollectInput) => readonly string[];
  /** 采集页：主表（拍账单的三要素表）；不给＝不出。 */
  readonly table?: (input: CollectInput) => {
    readonly columns: readonly DataTableColumn[];
    readonly rows: readonly Record<string, string>[];
    readonly caption: string;
  };
  /** 采集页：读数行（记报销的垫付事实）出不出；**全空自动不出**（照 #688 裁定 6）。 */
  readonly factsGrid: boolean;
  /** 采集页：打标提示那一块（记报销）；不给＝不出。 */
  readonly markNote?: { readonly msg: string; readonly detail: string; readonly icon: NoticeIcon };
  /** 采集页：缺项阻断条那句「补齐之后会怎样」。 */
  readonly foldNote: string;
  /** 采集页：预填标注用哪种形状——`caliber` 一行口径（多数场景）／`note` 一块标注（记报销）。 */
  readonly prefill: 'caliber' | 'note';
  /** 采集页：账户空态的写法；不给＝本场景不出这一块。 */
  readonly emptyAccount?: { readonly text: string; readonly next: string };
  /** 采集页：第 2 段标题（空串＝不出）。 */
  readonly section2: string;
  /** 采集页：字段卡的操作说明。 */
  readonly description: string;
  /** 采集页：字段卡的格子；不给＝用处理体给的 `input.slots`。 */
  readonly slots?: readonly FieldSlot[];
  /** 采集页：预填来源串收不收短（多数场景收短；记报销那一页原样给）。 */
  readonly marksShape: 'short' | 'full';
  /** 采集页：复制 prompt 区那段话。 */
  readonly prompt: (input: CollectInput, blocked: readonly BlockedLine[]) => string;
  /** 采集页：复制 prompt 区的小标题。 */
  readonly promptTitle: string;
  /** 采集页：第 3 段标题（空串＝不出）。 */
  readonly section3: string;
  /** 采集页：副标题。 */
  readonly subtitle: (input: CollectInput, blocked: readonly BlockedLine[]) => string;
  /** 采集页：日志第 4 段「这一页干了什么」。 */
  readonly logDetail: (input: CollectInput) => string;
  /** 采集页：`<title>` 尾缀。 */
  readonly docTitle: string;

  /** 回执页：类型徽章那句状态。 */
  readonly receiptState: string;
  /** 回执页：徽章那句下一步（带记录编号的场景与不带的分两句，故做成取值函数）。 */
  readonly receiptNext: (input: ReceiptInput) => string;
  /** 回执页：打标回执条（记报销）；不给＝不出。 */
  readonly receiptNotice?: { readonly msg: string; readonly detail: string; readonly icon: NoticeIcon };
  /** 回执页：读数行之后的口径行（空串＝不出）。 */
  readonly receiptCaliber: string;
  /** 回执页：摘要那几格落值后还缀不缀「不填就记到…」（记报销不缀）。 */
  readonly dropDefaultHints: boolean;
  /** 回执页：后两格的说法（本族三种见 `CardsStyle`）。 */
  readonly cards: CardsStyle;
  /** 回执页：明细表的小标题。 */
  readonly receiptCaption: string;
}

/** 场景件拿到手的两张页（`Scene` 的 `collect`／`receipt` 两格）。 */
export function bindExpensePages(spec: ExpenseSpec): Pick<Scene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 本族多数场景共用的复制 prompt 那段话（记支出／记收入／记一笔三件同句）：说清缺什么、先不写库、补齐后说哪句。 */
export function plainPrompt(word: string, blocked: readonly BlockedLine[]): string {
  return '这一笔还差 ' + blocked.length + ' 项：' + blocked.map((i) => i.label).join('、')
    + '。这一页先不写库。补齐后跟助手说一遍「' + word + '」。';
}

/** 本族多数场景共用的副标题：只报缺几项，明细在下表。 */
export function missingSubtitle(input: CollectInput, blocked: readonly BlockedLine[]): string {
  return (input.missing.length === 0 ? '这一笔还差 ' : '缺 ') + blocked.length + ' 项，详见下表。';
}

/** 缺项那一处的共用说法（记报销那一页用它）：逐项给中文名与「为什么缺」，并点名写库指令。 */
export function sharedPrompt(key: string, blocked: readonly BlockedLine[]): string {
  return '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.why + '）').join('、')
    + '。\n这一页先不写库；补齐之后跟助手说一遍，照这条说：' + key + '。';
}

/** 过程型采集页：缺项时出这一页（只采集、不写库）。 */
function collectPage(spec: ExpenseSpec, input: CollectInput): string {
  const { params } = input;
  const blocked: readonly BlockedLine[] = blockedItems({ params, missing: input.missing, kind: spec.kind });
  const message = blockedMessage(input.missing, blocked);
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const { pick, probe, facts } = valuesOf({ recent: input.recent, params, kind: spec.kind, today: input.today });
  const bp = blockedPromptOf({ key: input.key, params, blocked, replaces: spec.replaces });
  const envelope = envelopeOf(input.key, false, message);
  const table = spec.table?.(input) ?? null;
  const empties: string[] = [];
  if (spec.emptyAccount !== undefined && pick.account.length === 0) {
    empties.push(emptyNote({
      title: '没有可选的历史账户',
      text: spec.emptyAccount.text,
      next: spec.emptyAccount.next,
    }));
  }
  // 读数行「有内容才出」：用户真给了值才出（#688 裁定 6：采集页不画同形空卡）。
  const grid = spec.factsGrid && hasAnyFact(facts) ? renderKpiGrid(summaryCards(facts)) : '';
  const content = [
    typeBadge({
      kind: spec.kind,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: '',
    }),
    spec.progress ? collectProgress({ wakeWord: spec.word, missing: blocked.length }) : '',
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    spec.section1WhenBlockedOnly && blocked.length === 0
      ? ''
      : collectSectionTitle({ no: 1, title: spec.section1 }),
    ...spec.calibers(input).map((line) => renderCaliberLine(line)),
    table === null
      ? ''
      : renderDataTable({ columns: table.columns, rows: table.rows, caption: table.caption }),
    grid,
    spec.markNote === undefined
      ? ''
      : renderFeedbackBlock({
        toast: { msg: spec.markNote.msg, detail: spec.markNote.detail, icon: spec.markNote.icon },
        staticNotice: true,
      }),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    spec.prefill === 'caliber'
      ? (marks.length === 0 ? '' : renderCaliberLine('预填标注：下面几格已经替你填上，来源写在格子里。'))
      : prefillNote(marks),
    collectBlockedFold({ items: blocked, command: bp.command, note: spec.foldNote }),
    empties.join(''),
    spec.section2 === '' ? '' : collectSectionTitle({ no: 2, title: spec.section2 }),
    fieldCardOf({
      description: spec.description,
      slots: spec.slots ?? defaultSlots(input),
      params,
      marks: spec.marksShape === 'short' ? shorter(marks) : marks,
      pick,
    }),
    promptCopyArea(spec.prompt(input, blocked), spec.promptTitle),
    spec.section3 === '' ? '' : collectSectionTitle({ no: 3, title: spec.section3 }),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, params),
          source: input.source,
          detail: spec.logDetail(input),
          actionAt: input.actionAt,
          version: envelope.version,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + spec.docTitle,
    title: spec.word,
    subtitle: spec.subtitle(input, blocked),
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。 */
function receiptPage(spec: ExpenseSpec, input: ReceiptInput): string {
  const probe = probeOfReceipt(input);
  const envelope = envelopeOf(input.key, true, input.receipt.summary);
  const facts = spec.dropDefaultHints
    ? summaryCards(input.facts).map((c) => (
      c.value === '未给' || c.detail === undefined || !c.detail.startsWith('不填就记')
        ? c
        : { label: c.label, value: c.value }
    ))
    : summaryCards(input.facts);
  const content = [
    typeBadge({ kind: spec.kind, status: 'ok', state: spec.receiptState, next: spec.receiptNext(input) }),
    spec.receiptNotice === undefined
      ? ''
      : renderFeedbackBlock({
        toast: {
          msg: spec.receiptNotice.msg,
          detail: spec.receiptNotice.detail,
          icon: spec.receiptNotice.icon,
        },
        staticNotice: true,
      }),
    renderKpiGrid([
      ...facts,
      receiptStatusCard(input.receipt, input.writtenDetail),
      ...tailCardsOf(spec.cards, input),
    ]),
    spec.receiptCaliber === '' ? '' : renderCaliberLine(spec.receiptCaliber),
    duplicateNote(findDuplicates(input.recent, probe), probe, 'static'),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: spec.receiptCaption,
    }),
    reconcileDisclosure(input.receipt),
    input.receipt.recordId === null ? '' : undoExit(input.receipt.recordId),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.receipt.source,
          detail: '改了 ' + input.receipt.affectedRows + ' 笔，写进去 '
            + (input.receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
          actionAt: input.receipt.actionAt,
          version: envelope.version,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执',
    title: spec.word + ' · 回执',
    subtitle: input.receipt.summary,
    slot: 'receipt',
    page: 'receipt',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}
