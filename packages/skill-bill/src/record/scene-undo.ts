/** 场景件：撤销（`op=undo`）。**本票：两格都换成这一件自己的装配体**（改前两格都指通用页）。
 *
 * 服务哪条唤醒词：撤销（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { op: 'undo' }`）。
 * 现在出哪张页：采集页＝本件 `collectOf`（列候选记录供挑一条，讲清「撤销后仍可恢复」），
 *  回执页＝本件 `receiptOf`（撤销那一次的回执，带「撤销标记」的改前改后对照）。
 * 施工图那一行（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「撤销」）要的块，逐块落位：
 *  类型徽章（撤销）／候选单选（列出可撤销记录，`../shared/recordPicker.ts`）／
 *  打标说明（不物理删）／复制指令块／动作区／空态／错误回执。
 *
 * **本票修掉的破口**：`WAKE_TABLE` 原来给这一条写了 `needs:['id']`，路由层就抛「缺槽位 id」，
 *  到不了采集页那一支——用户说「撤销」得到的是一个错误。去掉 `needs` 之后，只说「撤销」也出这一页，
 *  由候选记录列表让用户挑一条（不手敲编号），挑完仍走同一条写命令。
 *  老侧没有这一张页（`scenes/write.yaml:228-238` 只有两行文字回执），本页是新设计的。
 */
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
import { nextStepOf, typeBadge } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 一条唤醒词一件：本件服务的那条。 */
const WAKE = '撤销';
/** 本件的命令名（撤销是 `bill.record.update` 的 `op=undo` 那一支）。 */
const KEY = 'bill.record.update';

/** 撤销这件事那句说明（采集页与回执页各出一处，同一句话只写在这里一份）。
 *  本轮整改：`软删打标`／`deleted_at`／`NULL`／`物理删` 都是工程话，换成用户说法
 *  （照 `docs/skills/skill-bill/t407-文字审查.md` 第 27、28 条的判法）。 */
const SOFT_DELETE_NOTE = '撤销只是给这一笔打个标记：数据不删，记录还在库里；'
  + '撤销过的那一笔不再算进查询和统计，想找回来随时点「恢复」。';

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

/** 「照这句跟助手说一遍」那块话：挑哪一条、撤销是什么口径、接下来跟助手说哪句。 */
function promptOf(input: { readonly id: number | null; readonly deleted: boolean; readonly params: Record<string, unknown> }): string {
  if (input.id === null) {
    return '这一页先不写库：撤销原先缺「记录编号」就没页可看（原先直接报错），现在改成先列表让用户挑。\n'
      + '请从上面的候选记录里指定一条（说编号即可），再跟助手说一遍「撤销」。';
  }
  if (input.deleted) {
    return '记录编号 ' + input.id + ' 那一条已经撤销过，再撤一次无事可做。\n'
      + '要它回到库里就说「恢复」：' + commandLine(KEY, { op: 'restore', id: input.id }) + '。';
  }
  return '这一条就是这次要撤销的目标；撤销只打标记、不删记录，撤完还能恢复。照这条说：\n'
    + commandLine(KEY, input.params);
}

/** 采集页整页：类型徽章 → 摘要行 → 打标说明 → 写库未发生 → 缺项阻断条 → 候选列表（或选定那一条的只读回显）
 *  → 照这句跟助手说一遍 → 复制区。缺 `id` 时**不给可跑的写库指令**（阻断条里那条带占位符、只给看不给复制）。 */
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
      hint: '从下面列出的（没撤销过的）记录里挑一条：撤销只是打个标记，随后还能恢复。',
    }));
  } else if (row !== null && deleted) {
    middle.push(snapshotTable(row, '这一条记录（已打标撤销 · 只读回显）'));
    middle.push(emptyNote({
      title: '这一条已经撤销过',
      text: '记录编号 ' + id + ' 在 ' + String(row.deleted_at) + ' 已经撤销过了，这一支不再重复撤销。',
      next: '要它回到库里就说「恢复」；要撤别的记录就换一个编号。',
    }));
  } else if (row === null) {
    middle.push(emptyNote({
      title: '这个编号没有可撤销的记录',
      text: '记录编号 ' + id + ' 在库里读不到'
        + (probe.ok ? '（未撤销的那些里没有它）。' : '：' + probe.reason + '。'),
      next: '请核一下编号（或先说清是哪一笔），再说一遍；候选记录列表在缺编号那一形态里出。',
    }));
  } else {
    middle.push(snapshotTable(row, '这一条就是要撤销的记录（只读回显 · 记录编号 ' + row.id + '）'));
    middle.push(renderCaliberLine('撤销之后这一行只是被打了标：它还在库里，随时可以用「恢复」把它捞回来。'));
  }
  const content = [
    typeBadge({
      kind: '',
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord: WAKE }),
    }),
    summaryRow(factsOf(row, params)),
    renderCaliberLine(SOFT_DELETE_NOTE),
    renderCaliberLine('写库：还没发生——这一页先不写库，只采集。挑好记录后跟助手说一遍才会写。'),
    blockedBar({ items: blocked, command: blockedCommand(params, blocked) }),
    middle.join(''),
    promptCopyArea(promptOf({ id, deleted, params }), '挑好记录后照这句跟助手说一遍'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(KEY, params),
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
    title: WAKE + ' · ' + (id === null ? '挑一条记录' : '确认撤销'),
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: KEY,
    content,
  });
}

/** 撤销回执的退出口：这一条已经撤销过，再撤一次无事可做——所以出口给的是「恢复」那条指令。
 *
 *  第 3 轮返工（上级裁定第 1 条）：改前本块另带一枚「复制数据」（`ilife-exit-restore-copy`）
 *  ＋公共层按缺省自动补的一枚置灰「复制日志」，与下面复制区那组「复制数据／复制日志」上下重复
 *  （DOM 实测：本页 4 枚复制按钮＝两组，其余 31 页各 2 枚＝单组）。
 *  改后退出口只留那枚「恢复这一笔」按钮与一句去向说明，不带复制按钮、不带 `data-t`；
 *  恢复指令走下面复制区那颗「复制数据」（复制载荷里仍带可重跑命令，`data-t` 形状不动）。 */
const RESTORE_EXIT_NOTE = '撤销没删数据，所以出口是「恢复」：点下面那颗「复制数据」，里面带着一句恢复的话。';

function restoreExit(): string {
  return renderCopyBlock({
    title: '想反悔（把这一笔找回来）',
    buttons: [{ label: '↩︎ 恢复这一笔', kind: 'red', actionId: 'ilife-exit-restore' }],
  }) + renderCaliberLine(RESTORE_EXIT_NOTE);
}

/** 回执页整页：类型徽章 → 一张大网格 → 说明 → 「撤销标记」的改前改后对照（diff 表）→ 写入明细表
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
    : diffOf({ fields: ['撤销标记'], before: { 撤销标记: null }, after: { 撤销标记: stamped } });
  const content = [
    typeBadge({
      kind: '',
      status: 'warn',
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
    renderCaliberLine(SOFT_DELETE_NOTE),
    rows.length === 0
      ? renderDataTable({
        columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
        rows: [
          { k: fieldLabelOf('deleted_at'), v: '已打上（本页再读时已看不到这一条）' },
          { k: '撤销后能不能找回来', v: '能：点「恢复」把它找回来' },
        ],
        caption: '撤销结果',
      })
      : diffTable({ rows, caption: '改前改后对照（撤销只动「撤销标记」这一项）' }),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: '写进去的项与值',
    }),
    reconcileDisclosure(receipt),
    receipt.recordId === null ? '' : restoreExit(),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(KEY, params),
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
