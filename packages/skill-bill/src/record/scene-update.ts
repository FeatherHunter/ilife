/** 场景件：改记录（`bill.record.update` 的缺省那一支，`op` 空＝改字段）。**本票：两格都换成这一件自己的装配体**。
 *
 * 服务哪条唤醒词：改记录（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里不带 `op` preset 的那一条）。
 * 现在出哪张页：采集页＝本件 `collectOf`（**三形态**：缺 `id` 列候选／带 `id` 出确认面／`id` 那一条已打标撤销），
 *  回执页＝本件 `receiptOf`（落库后那一张）。三形态由 `id` 给没给 ＋ 那一条读不读得到判出来，判定只在本件。
 * 施工图那一行（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「改记录」）要的块，逐块落位：
 *  类型徽章（改记录）／原记录只读回显（`../shared/recordPicker.ts` 的 `snapshotTable`）／
 *  diff 表（`../shared/diffTable.ts`，字段／原值／新值）／候选单选（缺 `id` 时，`../shared/recordPicker.ts`）／
 *  复制指令块／动作区／错误回执（缺项阻断条里那一件，`../shared/blockedSlots.ts`）。
 *
 * 缺 `id` 不再由路由层报错（那是本票修的破口）：路由只说「改记录」时落这一页，由**候选记录列表**让用户挑一条，
 *  挑完仍走同一条写命令。**没给 `id` 就不出可跑的写库指令**（阻断条里那条指令带尖括号占位符、只给看不给复制）。
 */
import { renderStatusBadge } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { diffTable } from '../shared/diffTable.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { diffRowsFor, pickModeOf, pickerBlock, readRowById, snapshotTable } from '../shared/recordPicker.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards, summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { commandLine } from '../shared/writeParts.js';
import type { BillRow } from '../fetch/db.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';
import type { RecordSlot } from './slots.js';

/** 一条唤醒词一件：本件服务的那条。 */
const WAKE = '改记录';
/** 本件的命令名（两条页与复制指令都引它一份）。 */
const KEY = 'bill.record.update';

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

/** 允许改的字段名单：取自槽位表（`id`／`op` 两格不是被改的字段），本件不另抄一份。 */
function changeFieldsOf(slots: readonly RecordSlot[]): string[] {
  return slots.filter((s) => s.name !== 'id' && s.name !== 'op').map((s) => s.name);
}

/** 摘要行的事实：有原记录就取库内那一行（页面说的是那一条的现状），没有就取本次参数。 */
function factsOf(row: BillRow | null, params: Record<string, unknown>): SummaryFacts {
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

/** 复制 prompt 区那段话：这一页是哪一形态、接下来怎么办、补齐后重跑哪条命令。 */
function promptOf(input: {
  readonly id: number | null;
  readonly row: BillRow | null;
  readonly deleted: boolean;
  readonly blocked: readonly BlockedItem[];
  readonly params: Record<string, unknown>;
}): string {
  if (input.id === null) {
    return '这一页只采集、不写库：改记录原先缺「记录编号」就没页可看（路由层直接报错），现在改成先列表让用户挑。\n'
      + '请从上面的候选记录里指定一条（说编号即可），并说清要改哪个字段、改成什么，再重跑同一条命令 ' + KEY + '。';
  }
  if (input.deleted) {
    return '记录编号 ' + input.id + ' 那一条已经打过软删标记（撤销过），改记录这一支不动它。\n'
      + '要它回到库里就走「恢复」：' + commandLine(KEY, { op: 'restore', id: input.id }) + '。';
  }
  if (input.row === null) {
    return '记录编号 ' + input.id + ' 在库里读不到（可能是别的库、也可能已被别的操作改过）。\n'
      + '请先核一下编号，或先说清是哪一笔，再重跑同一条命令 ' + KEY + '。';
  }
  return '原记录与改动对照都在下面：核一眼「字段／原值／新值」，没问题就照抄这条命令重跑落库——\n'
    + commandLine(KEY, input.params);
}

/** 采集页整页：三形态共用同一串头的块，中段按形态换（候选表／原记录＋diff 表／空态）。 */
function collectOf(input: CollectInput): string {
  const { params, slots, missing } = input;
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
  // 软删口径取自 `../shared/recordPicker.ts` 的 `isDeleted`（读一条时一次算好，本件不重判一次）。
  const deleted = probe.deleted;
  const form = id === null ? '缺记录编号 · 先挑一条' : deleted ? '那一条已打标撤销' : row === null ? '那一条读不到' : '带记录编号 · 待确认';
  const middle: string[] = [];
  if (id === null) {
    middle.push(pickerBlock({ mode: pickModeOf(params['op']) }));
  } else if (deleted && row !== null) {
    middle.push(snapshotTable(row, '这一条记录（已打标撤销 · 只读回显）'));
    middle.push(emptyNote({
      title: '这一条已经撤销过',
      text: '记录编号 ' + id + ' 在 ' + String(row.deleted_at) + ' 打过软删标记，改记录这一支不管已打标撤销的行。',
      next: '要它回到库里就走「恢复」（把 `deleted_at` 置 NULL），恢复之后再改；要改别的记录就换一个编号。',
    }));
  } else if (row === null) {
    middle.push(emptyNote({
      title: '这个编号没有记录',
      text: '记录编号 ' + id + ' 在库里一条都没读到'
        + (probe.ok ? '（未撤销的那些里没有它）。' : '：' + probe.reason + '。'),
      next: '请核一下编号（或先说清是哪一笔），再重跑同一条命令；候选记录列表在缺编号那一形态里出。',
    }));
  } else {
    middle.push(snapshotTable(row, '原记录（只读回显 · 记录编号 ' + row.id + '）'));
    middle.push(diffTable({
      rows: diffRowsFor({ row, params, fields: changeFieldsOf(slots) }),
      caption: 'diff 表：字段／原值／新值（本次打算改的字段）',
    }));
  }
  const content = [
    renderStatusBadge({
      status: 'danger',
      text: WAKE + ' · 三形态之一：' + form + ' · ' + KEY + ' · '
        + (blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待确认 · 未写库'),
    }),
    summaryRow(factsOf(row, params)),
    renderCaliberLine('写库：未发生——这一页只采集、不碰库；核对无误后重跑同一条命令才会写。'),
    blockedBar({ items: blocked, command: blockedCommand(params, blocked) }),
    middle.join(''),
    promptCopyArea(promptOf({ id, row, deleted, blocked, params }), '复制 prompt（挑好记录后重跑）'),
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
    title: WAKE + ' · ' + (id === null ? '挑一条记录' : '确认改动'),
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: KEY,
    content,
  });
}

/** 回执页整页：类型徽章（写库成功）→ 一张大网格 → 写入明细表 → 对账折叠区 → 退出口 → 复制区三件。
 *  diff 表落在**落库前**那一面（回执这一面拿不到原值，`ReceiptInput` 只给写后的真值），页上照实说清。 */
function receiptOf(input: ReceiptInput): string {
  const { params, receipt } = input;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(KEY),
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderStatusBadge({ status: 'ok', text: WAKE + ' · 落库回执 · ' + KEY + ' · 写库成功' }),
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
    renderCaliberLine('原值与新值的对照（diff 表）落在落库前那一面：带记录编号的确认页上有字段／原值／新值三列；'
      + '这一页只报写后的真值。'),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: input.detail,
      caption: '本次写入的字段与值',
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
  id: 'update',
  wakeWord: WAKE,
  key: KEY,
  kind: '',
  op: '',
  family: '批量与修正族',
  collect: collectOf,
  receipt: receiptOf,
};
