/** 场景件：批量录入（`kind=batch`）。**本票：两格都换成这一件自己的装配体**（改前两格都指通用页）。
 *
 * 服务哪条唤醒词：批量录入（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'batch' }`）。
 * 现在出哪张页：采集页＝本件 `collectOf`（逐行可编辑表 ＋ 缺项逐行标红 ＋ 合计行 ＋ 单笔化明示），
 *  回执页＝本件 `receiptOf`（落库后那一张，写明本批现阶段单笔化）。
 * 施工图那一行（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「批量录入」）要的块，逐块落位：
 *  类型徽章（批量·现单笔化）／逐行可编辑表（`../shared/rowEditorTable.ts`，缺项逐行标红）／合计行（同一件出）／
 *  缺项阻断条（`../shared/blockedSlots.ts`）／账本缺省提示（提示条）／复制指令块／动作区（`../shared/copyArea.ts`）。
 *
 * 本批现阶段的裁定（施工图第二节括注 ＋ 第五节第 2 条）：**单笔化**——这一页一次只落一笔，页面上明示；
 *  多笔同屏那张表还没接。表里那一屏：`params.rows` 给了就照它铺多行（每行一屏一格，逐行可编辑），
 *  没给＝本次参数就是唯一那一行。缺项判定只此一处（`rowEditorMissing`），红标与「给不给复制」都引它。
 */
import { renderToast } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { DEFAULTS } from '../policy/category.js';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { rowEditorTable } from '../shared/rowEditorTable.js';
import type { RowEditorField } from '../shared/rowEditorTable.js';
import { summaryCards, summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';
import type { RecordSlot } from './slots.js';

/** 一条唤醒词一件：本件服务的那条。 */
const WAKE = '批量录入';

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

/** 摘要行的事实：取自本次参数（缺的槽位写「未给」，不拿 0 顶替）。 */
function factsOf(params: Record<string, unknown>): SummaryFacts {
  const raw = params['amount'];
  const n = typeof raw === 'number' ? raw : textOf(raw) === '' ? NaN : Number(textOf(raw));
  return {
    amount: Number.isFinite(n) ? n : null,
    category: textOf(params['category']),
    account: textOf(params['account']),
    ledger: textOf(params['ledger']),
    time: textOf(params['time']),
  };
}

/** 缺项时那条写库指令原文：缺的值留成尖括号占位符，**只给看不给复制**（照通用页同一口径）。 */
function blockedCommand(key: string, params: Record<string, unknown>, blocked: readonly BlockedItem[]): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  return commandLine(key, filled);
}

/** 「照这句跟助手说一遍」那块话：说清单笔化与缺什么、这一页不写库、补齐后重跑哪条命令。 */
function promptOf(input: {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly rows: readonly Cells[];
  readonly blocked: readonly BlockedItem[];
}): string {
  const head = '本批现阶段单笔化：这一页一次只落一笔，表里一屏 ' + input.rows.length + ' 行，逐行可编辑。'
    + '每一行的金额与分类都要给（缺的格已在表下标红）。';
  const tail = input.blocked.length > 0
    ? '这一页还差 ' + input.blocked.length + ' 项：'
      + input.blocked.map((i) => i.label + '（' + i.name + '：' + i.why + '）').join('、')
      + '。补齐之后跟助手说一遍。'
    : '补齐后照下面这条命令重跑即落库：' + commandLine(input.key, input.params);
  return head + '\n' + tail;
}

/** 采集页整页：类型徽章 → 摘要行 → 单笔化说明 → 写库未发生 → 缺项阻断条 → 逐行可编辑表
 *  → 账本提示 → 照这句跟助手说一遍 → 复制区。缺项时不出可复制的写库指令（那条只在阻断条里给看）。 */
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
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord: WAKE }),
    }),
    summaryRow(factsOf(params)),
    renderCaliberLine('本批现阶段单笔化：一次只落一笔，表里一屏 ' + rows.length + ' 行、逐行可编辑。'
      + '多行待接：这一页会把一屏里的多行都铺出来给你改，但「一屏多行一次落库」这一段还没接，'
      + '眼下一次只落一笔——要落多笔，就按行一笔一笔再说一遍（说的时候只带那一行要的值）。'),
    renderCaliberLine('写库：还没发生——这一页先不写库，只采集。补齐之后跟助手说一遍才会写。'),
    blockedBar({ items: blocked, command: blockedCommand(key, params, blocked) }),
    rowEditorTable({
      name: 'batch',
      fields: fieldsOf(slots),
      rows,
      totalOf: 'amount',
      totalLabel: '这一屏合计',
    }),
    renderToast({
      msg: '账本缺省：不给就落「' + DEFAULTS.ledger + '」',
      detail: '这一格空着不算缺项；币种同理由缺省「' + DEFAULTS.currency + '」兜。要记进别的账本就先给这一格。',
      badge: { text: '账本缺省提示', type: 'warn' },
    }),
    promptCopyArea(promptOf({ key, params, rows, blocked }), '补齐后照这句跟助手说一遍'),
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
    docTitle: DOC_TITLE + '·补齐槽位',
    title: WAKE + ' · 补齐槽位',
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key,
    content,
  });
}

/** 回执页整页：类型徽章（写库成功）→ 一张大网格（摘要行五格 ＋ 状态／这次记了几笔／写进去的项）→ 单笔化说明
 *  → 写入明细表 → 对账折叠区 → 退出口 → 复制区三件。块序与通用回执页一致，多的是单笔化那一句。 */
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
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '这次记了几笔', value: receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '写进去的项',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项',
      },
    ]),
    renderCaliberLine('这一批一次只落下面这一笔（回执里的编号就是它）；下一笔再说一遍。'),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: '写进去的项与值',
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
  wakeWord: WAKE,
  key: 'bill.record.add',
  kind: 'batch',
  op: '',
  family: '批量与修正族',
  collect: collectOf,
  receipt: receiptOf,
};
