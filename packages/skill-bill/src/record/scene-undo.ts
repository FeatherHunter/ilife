/** 场景件：撤销（`op=undo`）。**本票：两格都换成这一件自己的装配体**（改前两格都指通用页）。
 *
 * 服务哪条唤醒词：撤销（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { op: 'undo' }`）。
 * 现在出哪张页：采集页＝本件 `collectOf`（列候选记录供挑一条，讲清「撤销后仍可恢复」），
 *  回执页＝本件 `receiptOf`（软删打标那一次的回执，带 `deleted_at` 的原值／新值对照）。
 * 施工图那一行（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「撤销」）要的块，逐块落位：
 *  类型徽章（软删打标 G7）／候选单选（列出可撤销记录，`../shared/recordPicker.ts`）／
 *  打标说明（不物理删）／复制指令块／动作区／空态／错误回执。
 *
 * **本票修掉的破口**：`WAKE_TABLE` 原来给这一条写了 `needs:['id']`，路由层就抛「缺槽位 id」，
 *  到不了采集页那一支——用户说「撤销」得到的是一个错误。去掉 `needs` 之后，只说「撤销」也出这一页，
 *  由候选记录列表让用户挑一条（不手敲编号），挑完仍走同一条写命令。
 *  老侧没有这一张页（`scenes/write.yaml:228-238` 只有两行文字回执），本页是新设计的。
 */
import { renderStatusBadge } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderCopyBlock, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea } from '../shared/copyArea.js';
import { diffOf, diffTable } from '../shared/diffTable.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { pickerBlock, readRowById, snapshotTable } from '../shared/recordPicker.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards, summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 一条唤醒词一件：本件服务的那条。 */
const WAKE = '撤销';
/** 本件的命令名（撤销是 `bill.record.update` 的 `op=undo` 那一支）。 */
const KEY = 'bill.record.update';

/** 软删打标那句说明（采集页与回执页各出一处，同一句话只写在这里一份）。 */
const SOFT_DELETE_NOTE = '撤销＝软删打标：`deleted_at = now`，行留在库里，不物理删；'
  + '撤销后仍可恢复（恢复＝把 `deleted_at` 置 NULL），查询与统计先把打了标的那一行排除。';

/** 一个值的字符串形态（数字写十进制串，其余形态按空串用）。 */
function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 记录编号：正整数才算给了（其余形态一律当没给，不猜）。 */
function idOf(params: Record<string, unknown>): number | null {
  const raw = params['id'];
  const n = typeof raw === 'number' ? raw : textOf(raw) === '' ? NaN : Number(textOf(raw));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 摘要行的事实：有那一条就取库内那一行（页面说的是它），没有就取本次参数。 */
function factsOf(row: { amount: number; category: string; account: string; ledger: string; time: string } | null,
  params: Record<string, unknown>): SummaryFacts {
  if (row !== null) {
    return { amount: row.amount, category: row.category, account: row.account, ledger: row.ledger, time: row.time };
  }
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

/** 缺项时那条写库指令原文：缺的值留成尖括号占位符，**只给看不给复制**。 */
function blockedCommand(params: Record<string, unknown>, blocked: readonly BlockedItem[]): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  return commandLine(KEY, filled);
}

/** 复制 prompt 区那段话：挑哪一条、撤销是什么口径、接下来重跑哪条命令。 */
function promptOf(input: { readonly id: number | null; readonly deleted: boolean; readonly params: Record<string, unknown> }): string {
  if (input.id === null) {
    return '这一页只采集、不写库：撤销原先缺「记录编号」就没页可看（路由层直接报错），现在改成先列表让用户挑。\n'
      + '请从上面的候选记录里指定一条（说编号即可），再重跑同一条命令 ' + KEY + '（`op` 取 `undo`）。';
  }
  if (input.deleted) {
    return '记录编号 ' + input.id + ' 那一条已经打过软删标记，再撤一次是无事可做。\n'
      + '要它回到库里就走「恢复」：' + commandLine(KEY, { op: 'restore', id: input.id }) + '。';
  }
  return '这一条就是这次要撤销的目标；撤销只打标、不删行，撤完还能恢复。照抄这条命令重跑：\n'
    + commandLine(KEY, input.params);
}

/** 采集页整页：类型徽章 → 摘要行 → 打标说明 → 写库未发生 → 缺项阻断条 → 候选列表（或选定那一条的只读回显）
 *  → 复制 prompt 区 → 复制区。缺 `id` 时**不给可跑的写库指令**（阻断条里那条带占位符、只给看不给复制）。 */
function collectOf(input: CollectInput): string {
  const { params, missing } = input;
  const blocked = blockedItems({ params, missing, kind: '' });
  const message = blockedMessage(missing, blocked);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(KEY),
    data: { ok: false, message },
  };
  const id = idOf(params);
  const probe = id === null ? { ok: true, reason: '', row: null } : readRowById(id);
  const row = probe.row;
  const deleted = row !== null && row.deleted_at !== null && String(row.deleted_at).trim() !== '';
  const middle: string[] = [];
  if (id === null) {
    middle.push(pickerBlock({
      mode: 'undo',
      hint: '从下面列出的（未撤销的）记录里挑一条：撤销只打软删标记，随后还能恢复。',
    }));
  } else if (row !== null && deleted) {
    middle.push(snapshotTable(row, '这一条记录（已打标撤销 · 只读回显）'));
    middle.push(emptyNote({
      title: '这一条已经撤销过',
      text: '记录编号 ' + id + ' 在 ' + String(row.deleted_at) + ' 打过软删标记，撤销这一支不再重复打标。',
      next: '要它回到库里就走「恢复」（把 `deleted_at` 置 NULL）；要撤别的记录就换一个编号。',
    }));
  } else if (row === null) {
    middle.push(emptyNote({
      title: '这个编号没有可撤销的记录',
      text: '记录编号 ' + id + ' 在库里读不到'
        + (probe.ok ? '（未撤销的那些里没有它）。' : '：' + probe.reason + '。'),
      next: '请核一下编号（或先说清是哪一笔），再重跑同一条命令；候选记录列表在缺编号那一形态里出。',
    }));
  } else {
    middle.push(snapshotTable(row, '这一条就是要撤销的记录（只读回显 · 记录编号 ' + row.id + '）'));
    middle.push(renderCaliberLine('撤销之后这一行只是被打了标：它还在库里，随时可以用「恢复」把它捞回来。'));
  }
  const content = [
    renderStatusBadge({
      status: 'danger',
      text: WAKE + ' · 软删打标（`deleted_at = now`，不物理删） · ' + KEY + ' · '
        + (blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待确认 · 未写库'),
    }),
    summaryRow(factsOf(row, params)),
    renderCaliberLine(SOFT_DELETE_NOTE),
    renderCaliberLine('写库：未发生——这一页只采集、不碰库；挑好记录后重跑同一条命令才会写。'),
    blockedBar({ items: blocked, command: blockedCommand(params, blocked) }),
    middle.join(''),
    promptCopyArea(promptOf({ id, deleted, params }), '复制 prompt（挑好记录后重跑）'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(KEY, params),
          source: input.source,
          detail: '未写库（采集页）',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·补齐槽位',
    title: WAKE + ' · ' + (id === null ? '挑一条记录' : '确认撤销'),
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: KEY,
    content,
  });
}

/** 退出口那枚可复制按钮的动作号（与改记录那一件的退出口分开写，同页不许两处撞号）。 */
const RESTORE_COPY_ACTION = 'ilife-exit-restore-copy';

/** 撤销回执的退出口：这一条已经撤销过，再撤一次无事可做——所以出口给的是「恢复」那条指令。 */
function restoreExit(recordId: number): string {
  return renderCopyBlock({
    title: '退出口（把这一笔捞回来）',
    buttons: [{ label: '↩︎ 恢复这一笔（危险色出口）', kind: 'red', actionId: 'ilife-exit-restore' }],
    dataText: commandLine(KEY, { op: 'restore', id: recordId }),
    dataActionId: RESTORE_COPY_ACTION,
  }) + renderCaliberLine('撤销只打标、不删行，所以出口是「恢复」：这条指令把 `deleted_at` 置回 NULL。');
}

/** 回执页整页：类型徽章 → 一张大网格 → 打标说明 → `deleted_at` 原值／新值对照（diff 表）→ 写入明细表
 *  → 对账折叠区 → 退出口 → 复制区三件。 */
function receiptOf(input: ReceiptInput): string {
  const { params, receipt } = input;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(KEY),
    data: { ok: true, message: receipt.summary },
  };
  const after = receipt.recordId === null
    ? { ok: true, reason: '', row: null }
    : readRowById(receipt.recordId);
  const stamped = after.ok && after.row !== null && after.row.deleted_at !== null
    ? String(after.row.deleted_at) : '';
  const rows = stamped === ''
    ? []
    : diffOf({ fields: ['deleted_at'], before: { deleted_at: null }, after: { deleted_at: stamped } });
  const content = [
    renderStatusBadge({ status: 'warn', text: WAKE + ' · 软删打标（`deleted_at = now`，行还在） · ' + KEY + ' · 写库成功' }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    renderCaliberLine(SOFT_DELETE_NOTE),
    rows.length === 0
      ? renderDataTable({
        columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
        rows: [
          { k: 'deleted_at', v: '打标已写入（本页读回时已看不到这一行）' },
          { k: '撤销后能否恢复', v: '能：恢复＝把 deleted_at 置 NULL' },
        ],
        caption: '打标结果',
      })
      : diffTable({ rows, caption: 'diff 表：字段／原值／新值（撤销只动 `deleted_at` 这一列）' }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: input.detail,
      caption: '本次写入的字段与值',
    }),
    reconcileDisclosure(receipt),
    receipt.recordId === null ? '' : restoreExit(receipt.recordId),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(KEY, params),
          source: receipt.source,
          detail: '影响 ' + receipt.affectedRows + ' 行 · 字段 ' + (receipt.writtenFields.join('/') || '未设置'),
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
    key: KEY,
    content,
  });
}

export const SCENE: Scene = {
  id: 'undo',
  wakeWord: WAKE,
  key: KEY,
  kind: '',
  op: 'undo',
  family: '批量与修正族',
  collect: collectOf,
  receipt: receiptOf,
};
