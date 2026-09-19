/** 场景件：批量录入（`kind=batch`）。**本票：两格都换成这一件自己的装配体**（改前两格都指通用页）。
 *
 * 服务哪条唤醒词：批量录入（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'batch' }`）。
 * 现在出哪张页：采集页＝本件 `collectOf`（逐行可编辑表 ＋ 缺项逐行标红 ＋ 合计行 ＋ 单笔化明示），
 *  回执页＝本件 `receiptOf`（落库后那一张，写明本批现阶段单笔化）。
 * 施工图那一行（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「批量录入」）要的块，逐块落位：
 *  类型徽章（批量·现单笔化）／逐行可编辑表（`../shared/rowEditorTable.ts`，缺项逐行标红）／合计行（同一件出）／
 *  缺项阻断条（`../shared/blockedSlots.ts`，走 `./collectBody.ts` 的折叠摆法）／账本缺省提示（浅色静态）／
 *  复制指令块／动作区（`../shared/copyArea.ts`）。
 *
 * 本批现阶段的裁定（施工图第二节括注 ＋ 第五节第 2 条）：**单笔化**——这一页一次只落一笔，页面上明示；
 *  多笔同屏那张表还没接。表里那一屏：`params.rows` 给了就照它铺多行（每行一屏一格，逐行可编辑），
 *  没给＝本次参数就是唯一那一行。缺项判定只此一处（`rowEditorMissing`），红标与「给不给复制」都引它。
 *
 * 本轮整改（只动本件的可见正文与块序，不动行为判定与信封字段）：
 *   ① **首屏同形「未给」卡清零**：删结论摘要行那一网格（五张同形「未给」卡）；
 *   ② **常驻黑清零**：账本缺省那条深色毛玻璃提示改浅色静态（`renderFeedbackBlock` 的 `staticNotice` 分支），
 *     不再带关闭按钮，页内动作只剩复制区那一组；
 *   ③ 单笔化那段长句（原带「多行待接／一屏多行一次落库」的残尾）并成一句；那一行合计口径句删（合计行自带）；
 *   ④ **口令原文块折叠**：缺项阻断条整条走 `./collectBody.ts` 的 `collectBlockedFold` 收进折叠区；
 *   ⑤ 形状取 `../shared/collectFrame.ts` 里面向用户的那三种（进度／缺项标签／分段标题）；架头与按钮层级
 *     两句的固定文案是页面自指话，本席未上屏，作残项报给该件所属窗口。页标题只留唤醒词。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderFeedbackBlock, renderKpiGrid } from 'base-paint/blocks';
import { DEFAULTS } from '../policy/category.js';
import { blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { collectMissingTags, collectProgress, collectSectionTitle } from '../shared/collectFrame.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { rowEditorTable } from '../shared/rowEditorTable.js';
import type { RowEditorField } from '../shared/rowEditorTable.js';
import { summaryCards } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import { collectBlockedFold } from './collectBody.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';
import type { RecordSlot } from './slots.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';

/** 一条唤醒词一件：本件服务的那条。 */
const WAKE: string = wakeWordOfKind('batch');

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

/** 表列：槽位表那七格（必需性照槽位表，本件不另判一次）。 */
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

/** 采集页复制 prompt 区那段话：一句说清单笔化与缺什么，不回抄命令原文（口令只有阻断条那一处）。 */
function promptOf(input: {
  readonly rows: readonly Cells[];
  readonly blocked: readonly BlockedItem[];
}): string {
  const head = '本批一次只落一笔，这一屏 ' + input.rows.length + ' 行。';
  const tail = input.blocked.length > 0
    ? '还差 ' + input.blocked.length + ' 项：' + input.blocked.map((i) => i.label).join('、')
      + '。补齐后跟助手说一遍「' + WAKE + '」。'
    : '这一批照实说一遍「' + WAKE + '」即落库。';
  return head + tail;
}

/** 采集页整页：三段按序拼（缺什么 → 逐行核对 → 请助手记）。 */
function collectOf(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const kind = textOf(params['kind']);
  const blocked = blockedItems({ params, missing, kind });
  const message = blockedMessage(missing, blocked);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok: false, message },
  };
  const names = slots.map((s) => s.name);
  const rows = rowsOf(params, names);
  const content = [
    typeBadge({
      kind,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: '',
    }),
    collectProgress({ wakeWord: WAKE, missing: blocked.length }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    collectSectionTitle({ no: 1, title: '先看缺什么' }),
    renderCaliberLine('本批一次只落一笔。'),
    collectBlockedFold({
      items: blocked,
      command: blockedCommand(key, params, blocked),
      note: '补齐后照上面那条口令跟助手说一遍。',
    }),
    collectSectionTitle({ no: 2, title: '核对这一屏' }),
    rowEditorTable({
      name: 'batch',
      fields: fieldsOf(slots),
      rows,
      totalOf: 'amount',
      totalLabel: '这一屏合计',
    }),
    renderFeedbackBlock({
      toast: {
        msg: '账本与币种留空按缺省落库',
        detail: '账本「' + DEFAULTS.ledger + '」／币种「' + DEFAULTS.currency + '」；要记进别的账本就先给这一格。',
        icon: 'info',
      },
      staticNotice: true,
    }),
    promptCopyArea(promptOf({ rows, blocked }), '这一段就是补齐后要发给助手的话'),
    collectSectionTitle({ no: 3, title: '补齐了再请助手记' }),
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
    title: WAKE,
    subtitle: '缺 ' + blocked.length + ' 项，详见下表。',
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key,
    content,
  });
}

/** 回执页那张网格：落值那几格不再缀缺省说法（值已经落库，那句「不填就记到…」在回执页没有动作可做）。 */
function receiptCardsOf(facts: SummaryFacts): ReturnType<typeof summaryCards> {
  return summaryCards(facts).map((c) => (
    c.value === '未给' || c.detail === undefined || !c.detail.startsWith('不填就记')
      ? c
      : { label: c.label, value: c.value }
  ));
}

/** 回执页整页：类型徽章（写库成功）→ 一张大网格（摘要行五格 ＋ 状态／这次记了几笔／写进去的项）
 *  → 单笔化那一句 → 写入明细表 → 对账折叠区 → 退出口 → 复制区三件。块序与通用回执页一致。 */
function receiptOf(input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    typeBadge({
      kind: textOf(params['kind']),
      status: 'ok',
      state: '写库成功',
      next: nextStepOf({ page: 'receipt', exit: true }),
    }),
    renderKpiGrid([
      ...receiptCardsOf(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '这次记了几笔', value: receipt.affectedRows + ' 笔' },
      {
        label: '写进去的项',
        value: receipt.writtenFields.length + ' 项',
        detail: '共 ' + receipt.writtenFields.length + ' 项，详见下表。',
      },
    ]),
    renderCaliberLine('本批一次只落一笔，回执里的编号就是它。'),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: '这一笔记成什么',
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
    title: WAKE + ' · 回执',
    subtitle: receipt.summary,
    slot: 'receipt',
    page: 'receipt',
    shape: envelope.shape,
    key,
    content,
  });
}

export const SCENE: Scene = {
  id: 'batch',
  key: 'bill.record.add',
  kind: 'batch',
  op: '',
  family: '批量与修正族',
  collect: collectOf,
  receipt: receiptOf,
};
