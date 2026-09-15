/** 场景件：恢复（`op=restore`）。**本票：两格都换成这一件自己的装配体**（改前两格都指通用页）。
 *
 * 服务哪条唤醒词：恢复（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { op: 'restore' }`）。
 * 现在出哪张页：采集页＝本件 `collectOf`（**只列已经撤销过的那些**，挑一条把标记清掉），
 *  回执页＝本件 `receiptOf`（恢复那一次的回执，写明「已撤销」标记已清掉）。
 * 施工图那一行（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「恢复」）要的块，逐块落位：
 *  类型徽章（恢复）／候选单选（列出已经撤销过的记录，`../shared/recordPicker.ts`）／
 *  置空说明／复制指令块／动作区／空态／错误回执。
 *
 * **本票修掉的破口**：`WAKE_TABLE` 原来给这一条写了 `needs:['id']`，路由层就抛「缺槽位 id」，
 *  到不了采集页那一支。去掉 `needs` 之后，只说「恢复」也出这一页，由候选列表让用户挑一条。
 *  候选口径只此一处（`recordPicker` 的 `mode='restore'`）：**只列带「已撤销」标记的那些**，
 *  没撤销过的记录不进这一格。老侧没有这一张页（`scenes/write.yaml:242-251` 只有两行文字回执）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
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
const WAKE = '恢复';
/** 本件的命令名（恢复是 `bill.record.update` 的 `op=restore` 那一支）。 */
const KEY = 'bill.record.update';

/** 「把标记清掉」那句说明（采集页与回执页各出一处，同一句话只写在这里一份）。
 *  本轮整改：`deleted_at`／`NULL` 是工程话，换成用户说法（照 `docs/skills/skill-bill/t407-文字审查.md` 第 29 条）。 */
const RESTORE_NOTE = '恢复就是把「已撤销」这个标记清掉。'
  + '这一笔回到查询和统计里。';
const RESTORE_SCOPE = '这一格只列已经撤销过的记录，没撤销过的不进来。';

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

/** 「照这句跟助手说一遍」那块话：挑哪一条、恢复是什么口径、接下来跟助手说哪句。 */
function promptOf(input: { readonly id: number | null; readonly deleted: boolean; readonly params: Record<string, unknown> }): string {
  if (input.id === null) {
    return '这一页先不写库：恢复原先缺「记录编号」就没页可看（原先直接报错），现在改成先列表让用户挑。\n'
      + '请从上面的候选记录里指定一条（说编号即可，候选只列已经撤销过的那些），再跟助手说一遍「恢复」。';
  }
  if (!input.deleted) {
    return '记录编号 ' + input.id + ' 那一条没撤销过，没有标记可清：恢复无事可做。\n'
      + '要撤它就说「撤销」：' + commandLine(KEY, { op: 'undo', id: input.id }) + '。';
  }
  return '这一条就是这次要恢复的目标；恢复只把「已撤销」那个标记清掉，别的项一概不动。照这条说：\n'
    + commandLine(KEY, input.params);
}

/** 采集页整页：类型徽章 → 摘要行 → 置空说明 → 写库未发生 → 缺项阻断条 → 候选列表（或选定那一条的只读回显）
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
  const probe = id === null
    ? { ok: true, reason: '', row: null, deleted: false }
    : readRowById(id);
  const row = probe.row;
  // 撤销标记口径取自 `../shared/recordPicker.ts` 的 `isDeleted`（读一条时一次算好，本件不重判一次）。
  const deleted = probe.deleted;
  const middle: string[] = [];
  if (id === null) {
    middle.push(pickerBlock({
      mode: 'restore',
      hint: '只列已经撤销过的那些记录：挑一条，把它那个「已撤销」标记清掉。',
    }));
  } else if (row !== null && deleted) {
    middle.push(snapshotTable(row, '这一条就是要恢复的记录（只读回显，记录编号 ' + row.id + '）'));
    middle.push(renderCaliberLine('它现在带着「已撤销」标记（' + String(row.deleted_at)
      + '）；恢复之后标记清掉，这一笔回到查询和统计里。'));
  } else if (row === null) {
    middle.push(emptyNote({
      title: '这个编号没有可恢复的记录',
      text: '记录编号 ' + id + ' 在库里读不到'
        + (probe.ok ? '（连已经撤销过的那些里也没有它）。' : '：' + probe.reason + '。'),
      next: '请核一下编号（或先说清是哪一笔），再跟助手说一遍；候选记录列表在缺编号那一形态里出。',
    }));
  } else {
    middle.push(snapshotTable(row, '这一条记录（没撤销过，只读回显）'));
    middle.push(emptyNote({
      title: '这一条没撤销过',
      text: '记录编号 ' + id + ' 没有「已撤销」标记，没有可清的东西。',
      next: '恢复只对已经撤销过的记录有意义；要撤它就说「撤销」，要改它就说「改记录」。',
    }));
  }
  const content = [
    typeBadge({
      kind: '',
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord: WAKE }),
    }),
    summaryRow(factsOf(row, params)),
    renderCaliberLine(RESTORE_NOTE) + renderCaliberLine(RESTORE_SCOPE),
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
    title: WAKE + ' · ' + (id === null ? '挑一条记录' : '确认恢复'),
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: KEY,
    content,
  });
}

/** 回执页整页：类型徽章 → 一张大网格 → 恢复说明 → 恢复结果（读回来的标记现值）→ 写入明细表
 *  → 对账折叠区 → 退出口（撤销，把这一笔再打回标）→ 复制区三件。
 *  这里不出改前改后对照表：标记清掉之后库里已经看不到原值，拿「有值→没有」顶一张表
 *  等于编一个原值，本页改出置空结果表照实说。 */
function receiptOf(input: ReceiptInput): string {
  const { params, receipt } = input;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(KEY),
    data: { ok: true, message: receipt.summary },
  };
  const after = receipt.recordId === null ? null : readRowById(receipt.recordId);
  const now = after !== null && after.ok && after.row !== null ? after.row.deleted_at : undefined;
  const content = [
    typeBadge({
      kind: '',
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
    renderCaliberLine(RESTORE_NOTE) + renderCaliberLine(RESTORE_SCOPE),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: [
        { k: fieldLabelOf('id'), v: receipt.recordId === null ? '还没有' : String(receipt.recordId) },
        {
          k: fieldLabelOf('deleted_at') + '现在是什么样',
          v: now === undefined
            ? '这一页读不回这一条（写库回执以回执为准）'
            : now === null || String(now).trim() === '' ? '已清掉（这一笔又是正常的了）' : '还带着：' + String(now),
        },
        { k: '清掉之后', v: '这一笔回到查询和统计里；想再撤走就说「撤销」' },
      ],
      caption: '恢复结果',
    }),
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
  id: 'restore',
  wakeWord: WAKE,
  key: KEY,
  kind: '',
  op: 'restore',
  family: '批量与修正族',
  collect: collectOf,
  receipt: receiptOf,
};
