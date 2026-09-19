/** 写入域模板之一 · **批量确认**（`t685-按域页型表.md` §2.1 的「批量确认」那一行）。
 *
 * **本件是块位序列的唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-batch`）只给差异值——唤醒词、型名、几段标题、两张表的名字。改一次版式只动本件一处。
 *
 * 盖住的场景（**单场景族**，一个 `batch`）：老侧 `templates/写入/batch_confirm.html` 只有一张采集页
 *  （块位锚点 `:47-68`：页壳与标题 `:47-51`、〔账本缺省提示〕`.hint` `:55`、〔缺项条〕`.missing-banner` `:56`、
 *  小表 `:57-60`（行 `:114-125`）、〔合计行〕`.total` `:61`、复制区 `:65-68`）；本仓按「一命令一页」
 *  拆成采集／回执两张，两张都住本件。
 *
 * **块位序列**（照 #688 §五 5.2 的 ① 采集／④ 回执 两类；● 恒出、○ 有内容才出）：
 *
 *   采集页：类型徽章 ● → 进度 ● → 缺项标签 ● → 第 1 段标题 ● → 口径行 ● → 缺项阻断条（折叠）● →
 *     第 2 段标题 ● → 逐行可编辑表 ●（合计行由该表自带）→ 账本与币种缺省提示（浅色静态）● →
 *     复制 prompt 块 ● → 第 3 段标题 ● → 复制区 ●
 *   回执页：类型徽章 ● → 读数行（摘要五格 ＋ 写入状态 ＋ 这一次记了几笔 ＋ 写进去的项）● → 口径行 ● →
 *     写入明细表 ● → 对账折叠区 ● → 退出口 ○ → 复制区 ●
 *
 * 本批现阶段的裁定（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「批量录入」）：
 *  **单笔化**——这一页一次只落一笔，页面上明示；多笔同屏那张表还没接。表里那一屏：`params.rows`
 *  给了就照它铺多行（每行一屏一格，逐行可编辑），没给＝本次参数就是唯一那一行。缺项判定只此一处
 *  （`../shared/rowEditorTable.ts` 的 `rowEditorMissing`），红标与「给不给复制」都引它。账本缺省那条
 *  走浅色静态提示（`renderFeedbackBlock` 的 `staticNotice` 分支），页内动作只剩复制区那一组。
 *
 * 本件自己拼的句子（不入 `BatchSpec`）：带数字、带本次取值的那几句——副标题、复制 prompt 那段话、
 *  回执读数行的后两格、写入日志那句；spec 只收**一句一句的固定文案**。
 *
 * 谁在用（一个调用点，指名）：`src/write/scene-batch.ts`——它的 `Scene.collect`／`Scene.receipt`
 *  都是 `bindBatchPages(spec)` 的产物，本件不自己出页。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderFeedbackBlock, renderKpiGrid } from 'base-paint/blocks';
import { DEFAULTS } from '../policy/category.js';
import { blockedItems, blockedMessage } from './blockedSlots.js';
import type { BlockedItem } from './blockedSlots.js';
import { collectMissingTags, collectProgress, collectSectionTitle } from './collectFrame.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from './receiptParts.js';
import { rowEditorTable } from './rowEditorTable.js';
import type { RowEditorField } from './rowEditorTable.js';
import { summaryCards } from './summaryRow.js';
import type { SummaryFacts } from './summaryRow.js';
import { typeBadge } from './typeBadge.js';
import { fieldLabelOf } from './userWording.js';
import { commandLine } from '../shared/writeParts.js';
import { collectBlockedFold } from './collectBody.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';
import type { RecordSlot } from './slots.js';

/** 场景给模板的**差异声明**：值、文案与「哪一块长什么样」，**不含任何块位拼装**。 */
export interface BatchSpec {
  /** 唤醒词（页标题、进度行、复制 prompt 里那句「跟助手说一遍『…』」）。 */
  readonly word: string;
  /** 认的 `kind`（类型徽章上的型名，也是缺项方向判定的入参）。 */
  readonly kind: string;
  /** 采集页：第 1 段标题（先看缺什么）。 */
  readonly section1: string;
  /** 采集页：首屏那句口径行（这一页一次只落一笔）。 */
  readonly caliber: string;
  /** 采集页：缺项阻断条那句「补齐之后照哪句说」。 */
  readonly foldNote: string;
  /** 采集页：第 2 段标题（逐行核对那一屏）。 */
  readonly section2: string;
  /** 采集页：逐行可编辑表的名字（每行控件的名字前缀，页内唯一）。 */
  readonly tableName: string;
  /** 采集页：合计那一行前面那句（合计行由逐行表自带）。 */
  readonly totalLabel: string;
  /** 采集页：复制 prompt 区的小标题。 */
  readonly promptTitle: string;
  /** 采集页：第 3 段标题（补齐了再请助手记）。 */
  readonly section3: string;
  /** 回执页：类型徽章那句状态。 */
  readonly receiptState: string;
  /** 回执页：徽章那句下一步（本族回执恒带退出口）。 */
  readonly receiptNext: string;
  /** 回执页：读数行之后那句口径（这一批一次只落一笔）。 */
  readonly receiptCaliber: string;
  /** 回执页：读数行里「这一次记了几笔」那一格的标签（本族这一格不带详情句）。 */
  readonly receiptRowsLabel: string;
  /** 回执页：写入明细表的小标题。 */
  readonly receiptCaption: string;
}

/** 场景件拿到手的两张页（`Scene` 的 `collect`／`receipt` 两格）。 */
export function bindBatchPages(spec: BatchSpec): Pick<Scene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 一个值的字符串形态（数字写十进制串，其余形态按空串用）。 */
function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 一行表格里的格子：列名 → 值。 */
type Cells = Record<string, string>;

/** 本页那张表的行：`params.rows` 给了就照它铺（多笔同屏），没给＝单笔化那一行（本次参数就是它）。 */
function rowsOf(params: Record<string, unknown>, names: readonly string[]): readonly Cells[] {
  const raw = params['rows'];
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item) => {
      const src = (item ?? {}) as Record<string, unknown>;
      const cells: Cells = {};
      for (const n of names) cells[n] = textOf(src[n]);
      return cells;
    });
  }
  const one: Cells = {};
  for (const n of names) one[n] = textOf(params[n]);
  return [one];
}

/** 表列：槽位表那几格（必需性照槽位表，本件不另判一次）。 */
function fieldsOf(slots: readonly RecordSlot[]): RowEditorField[] {
  return slots.map((s) => ({
    name: s.name,
    label: s.label,
    hint: s.hint,
    ...(s.required ? { required: true } : {}),
  }));
}

/** 缺项时那条写库指令原文：缺的值留成尖括号占位符，**只给看不给复制**（照通用页同一口径）。 */
function blockedCommand(key: string, params: Record<string, unknown>, blocked: readonly BlockedItem[]): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  return commandLine(key, filled);
}

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok, message },
  };
}

/** 采集页复制 prompt 区那段话：一句说清单笔化与这一屏几行，再说还缺什么（口令原文只在阻断条那一处）。 */
function promptOf(word: string, lines: number, blocked: readonly BlockedItem[]): string {
  const head = '本批一次只落一笔，这一屏 ' + lines + ' 行。';
  const tail = blocked.length > 0
    ? '还差 ' + blocked.length + ' 项：' + blocked.map((i) => i.label).join('、')
      + '。补齐后跟助手说一遍「' + word + '」。'
    : '这一批照实说一遍「' + word + '」即落库。';
  return head + tail;
}

/** 账本与币种留空按缺省落库那条：浅色静态提示，缺省值取 `../policy/category.js`，页内不另写一份。 */
function defaultNotice(): string {
  return renderFeedbackBlock({
    toast: {
      msg: '账本与币种留空按缺省落库',
      detail: '账本「' + DEFAULTS.ledger + '」／币种「' + DEFAULTS.currency + '」；要记进别的账本就先给这一格。',
      icon: 'info',
    },
    staticNotice: true,
  });
}

/** 过程型采集页：缺项时出这一页（只采集、不写库）。块序见件头。 */
function collectPage(spec: BatchSpec, input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const blocked = blockedItems({ params, missing, kind: spec.kind });
  const envelope = envelopeOf(key, false, blockedMessage(missing, blocked));
  const names = slots.map((s) => s.name);
  const rows = rowsOf(params, names);
  const content = [
    typeBadge({
      kind: spec.kind,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: '',
    }),
    collectProgress({ wakeWord: spec.word, missing: blocked.length }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    collectSectionTitle({ no: 1, title: spec.section1 }),
    renderCaliberLine(spec.caliber),
    collectBlockedFold({
      items: blocked,
      command: blockedCommand(key, params, blocked),
      note: spec.foldNote,
    }),
    collectSectionTitle({ no: 2, title: spec.section2 }),
    rowEditorTable({
      name: spec.tableName,
      fields: fieldsOf(slots),
      rows,
      totalOf: 'amount',
      totalLabel: spec.totalLabel,
    }),
    defaultNotice(),
    promptCopyArea(promptOf(spec.word, rows.length, blocked), spec.promptTitle),
    collectSectionTitle({ no: 3, title: spec.section3 }),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params),
          source: input.source,
          detail: '没写库（采集页）',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·采集页',
    title: spec.word,
    subtitle: '缺 ' + blocked.length + ' 项，详见下表。',
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key,
    content,
  });
}

/** 回执页读数行里落值那几格：不再缀缺省说法（值已经落库，那句「不填就记到…」在回执页没有动作可做）。 */
function receiptCardsOf(facts: SummaryFacts): ReturnType<typeof summaryCards> {
  return summaryCards(facts).map((c) => (
    c.value === '未给' || c.detail === undefined || !c.detail.startsWith('不填就记')
      ? c
      : { label: c.label, value: c.value }
  ));
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。块序见件头。 */
function receiptPage(spec: BatchSpec, input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const envelope = envelopeOf(key, true, receipt.summary);
  const content = [
    typeBadge({
      kind: spec.kind,
      status: 'ok',
      state: spec.receiptState,
      next: spec.receiptNext,
    }),
    renderKpiGrid([
      ...receiptCardsOf(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: spec.receiptRowsLabel, value: receipt.affectedRows + ' 笔' },
      {
        label: '写进去的项',
        value: receipt.writtenFields.length + ' 项',
        detail: '共 ' + receipt.writtenFields.length + ' 项，详见下表。',
      },
    ]),
    renderCaliberLine(spec.receiptCaliber),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: spec.receiptCaption,
    }),
    reconcileDisclosure(receipt),
    receipt.recordId === null ? '' : undoExit(receipt.recordId),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params),
          source: receipt.source,
          detail: '改了 ' + receipt.affectedRows + ' 笔，写进去 '
            + (receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
          actionAt: receipt.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执',
    title: spec.word + ' · 回执',
    subtitle: receipt.summary,
    slot: 'receipt',
    page: 'receipt',
    shape: envelope.shape,
    key,
    content,
  });
}
