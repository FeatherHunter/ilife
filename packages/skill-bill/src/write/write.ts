/** 记账写入域两条命令的处理体（**从 `src/cli/cmd_read.ts` 归位到这里**）：
 *  `bill.record.add`（记一笔）与 `bill.record.update`（改记录，op＝改字段／撤销／恢复）。
 *
 * 谁在用（两个调用点，指名）：`src/write/commands.ts` 的两条声明各引一支——
 *   `writeRecordAdd` 引给 `bill.record.add`，`writeRecordUpdate` 引给 `bill.record.update`；
 *   出口分派 `src/cli/cmd_read.ts` 只查注册表再调 `runRecordWrite`，不再认这两个命令名。
 *
 * 两支的分岔口径（本票的新规矩）：
 *   **有阻断项不再报参数错退出**，改出过程型采集页（`./collect.ts`），退出码 0、`ok:false`、不写库；
 *   阻断项＝必需的槽位没给（`./collect.ts` 的 `missingSlots`）**或**金额符号与这一型的方向不符
 *   （`../shared/blockedSlots.ts` 的 `blockedItems`：记支出要负数、记收入要正数）。两件都由 `blockedItems`
 *   合成一张表，**非空即不进写库那一步**——这就是「真阻断」的根，页上那条阻断条只是它的影子。
 *   **方向判定只服务录入路径**：`writeRecordAdd`（`bill.record.add`）那一支传 `kind` 才判方向；
 *   `writeRecordUpdate`（改字段／撤销／恢复三支）不传方向，那三支只按「缺的必需槽位」阻断。
 *   阻断项清空照旧写库，出结果型回执整页（`./receipt.ts`）。
 *   必需槽位是哪些住 `./collect.ts` 的 `RECORD_SLOTS`（唯一定义地）；真值校验仍走 `src/policy`
 *   （`validateAddInput`／`validateUpdateInput`／`needId`／`parseRecordOp`），取数写库仍走 `src/fetch`
 *   （`addBill`／`updateBill`／`undoBill`／`restoreBill`），本文件只做编排与回执事实装配。
 * 写入字段口径：记一笔写整列全集（含缺省值列）；改字段＝本次实际变更的列；撤销／恢复写的是 `deleted_at`。
 */
import { addBill, updateBill, undoBill, restoreBill, getById, listRecent, DB_FILENAME } from '../fetch/index.js';
import type { BillDb, BillRow } from '../fetch/index.js';
import { needId, parseRecordOp, validateAddInput, validateUpdateInput } from '../policy/index.js';
import type { RecordOp } from '../policy/record.js';
import { buildRecordReceipt } from '../render/views.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { blockedItems, blockedMessage } from './blockedSlots.js';
import type { BlockedItem } from './blockedSlots.js';
import type { SummaryFacts } from './summaryRow.js';
import { fieldLabelOf, statusNoteOf, wakeWordOf } from './userWording.js';
import { totalChanges } from '../shared/writeParts.js';
import type { BillReceipt } from '../shared/writeParts.js';
import { actionStamp } from '../shared/copyArea.js';
import { RECORD_SLOTS, missingSlots, recordCollectDoc } from './collect.js';
import type { RecordSlot } from './collect.js';
import { recordReceiptDoc } from './receipt.js';

/** 记一笔写进库的列全集（**由槽位表派生，同一件事实一处定义**）：`add` 那一行的七个参数名就是它写进库的七个列
 *  （缺省值列也算写入：时间／账户／账本／币种都带缺省）。名单只有 `./collect.ts` 的 `RECORD_SLOTS` 一处。 */
const ADD_FIELDS: readonly string[] = RECORD_SLOTS['bill.record.add'].map((s) => s.name);

/** 近期记录的回看天数（预填标注／重复检测／三枚选择器的候选都取这一段）。 */
const RECENT_WINDOW_DAYS = 90;

/** 本次数据来源（复制日志第 3 段）；库文件名逐字取本包常量，共用件不取。**两页各一句**：
 *  回执页那句说的是写库回执，采集页不写库，不许沿用回执页那句（改前两页共用一句，采集页照抄了「写库回执」）。
 *  本轮整改删掉两处内部话（照 `docs/skills/skill-bill/t407-文字审查.md` 第 57、58 条）：库内表名 `bills` 与
 *  `prompt` 那个英文词都不上屏；`本地时钟` 只留在复制日志的时间戳里（那里是过程证据，正文不印）。 */
const SOURCE_RECEIPT = DB_FILENAME + '（写库回执）';
const SOURCE_COLLECT = DB_FILENAME + '（只读：这一页先不写库，只采集）';

/** 本地时钟时刻串（写入时间与复制日志时间戳）。**取时钟在这一步，不在共用位**——取值口径住
 *  `../shared/copyArea.js` 的 `actionStamp`（写域与查询域两种页共用同一份，本件只调它）。 */
function nowStamp(): string {
  return actionStamp();
}

/** 本页执行那天（`YYYY-MM-DD`）：缺省时间的取值与重复检测的比对面用它。 */
function todayOf(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 明细表的一行。 */
interface DetailRow {
  readonly k: string;
  readonly v: string;
}

/** 库内那一行写进明细表的项名（**库列名不上屏**：行名走 `../shared/userWording.js` 的 `fieldLabelOf`）。 */
function rowDetail(r: BillRow): DetailRow[] {
  return [
    { k: fieldLabelOf('id'), v: String(r.id) },
    { k: fieldLabelOf('category'), v: r.category },
    { k: fieldLabelOf('amount'), v: r.amount.toFixed(2) },
    { k: fieldLabelOf('time'), v: r.time },
    { k: fieldLabelOf('account'), v: r.account },
    { k: fieldLabelOf('ledger'), v: r.ledger },
    { k: fieldLabelOf('currency'), v: r.currency },
    { k: fieldLabelOf('note'), v: r.note },
  ];
}

/** 库内那一列在改前的值。字段名只认 `BillRow` 上真有的列——形状写得出（铁律三），
 *  不拿 `unknown` 中转成宽字典再按变长字符串取字段。`patch` 那一边由 `src/policy` 的
 *  `validateUpdateInput` 校验过字段与值，这里只读回来比对。 */
function preValue(pre: BillRow, column: string): string | number | null | undefined {
  return Object.prototype.hasOwnProperty.call(pre, column) ? pre[column as keyof BillRow] : undefined;
}

/** 摘要行的事实：回执页取**库内那一行**（不是拿 params 顶——回执报的是库里的真值）。 */
function rowFacts(r: BillRow): SummaryFacts {
  return { amount: r.amount, category: r.category, account: r.account, ledger: r.ledger, time: r.time };
}

/** 有阻断项时的那一支：出过程型采集页（不写库、`ok:false`）。
 *  取数只此一处：`listRecent` 取回的近期记录，预填标注／重复检测／三枚选择器的候选三处共用。 */
function collectOut(input: {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly slots: readonly RecordSlot[];
  readonly missing: readonly RecordSlot[];
  readonly blocked: readonly BlockedItem[];
  readonly db: BillDb;
}): WriteOut {
  const message = blockedMessage(input.missing, input.blocked);
  const today = todayOf();
  const anchor = typeof input.params['time'] === 'string' ? String(input.params['time']) : today;
  return {
    data: { ok: false, message },
    html: recordCollectDoc({
      key: input.key,
      params: input.params,
      slots: input.slots,
      missing: input.missing,
      source: SOURCE_COLLECT,
      actionAt: nowStamp(),
      today,
      recent: listRecent(input.db, anchor, RECENT_WINDOW_DAYS),
    }),
  };
}

/** 写库成功后的收口：回执事实 ＋ envelope 载荷 ＋ 回执整页。 */
function finish(input: {
  readonly db: BillDb;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly op: RecordOp;
  readonly row: BillRow;
  readonly summary: string;
  readonly fields: readonly string[];
  readonly before: number;
  readonly noChange: boolean;
  readonly writtenDetail: string;
  readonly detail: readonly DetailRow[];
}): WriteOut {
  const receipt: BillReceipt = {
    op: input.op,
    recordId: input.row.id,
    summary: input.summary,
    affectedRows: totalChanges(input.db.db) - input.before,
    writtenFields: input.fields,
    noChange: input.noChange,
    source: SOURCE_RECEIPT,
    actionAt: nowStamp(),
  };
  return {
    data: { ...buildRecordReceipt(input.summary), receipt },
    html: recordReceiptDoc({
      key: input.key, params: input.params, receipt,
      writtenDetail: input.writtenDetail, detail: input.detail,
      facts: rowFacts(input.row),
      recent: listRecent(input.db, input.row.time, RECENT_WINDOW_DAYS),
    }),
  };
}

/** `bill.record.add`（记一笔，**录入路径**）：有阻断项（缺分类或金额／金额符号与这一型不符）即出采集页，
 *  清空即写库出回执整页。方向判定只在这一支传 `kind`。 */
export function writeRecordAdd(params: Record<string, unknown>, db: BillDb): WriteOut {
  const key = 'bill.record.add';
  const slots = RECORD_SLOTS[key];
  const missing = missingSlots(params, slots);
  const kind = typeof params.kind === 'string' ? params.kind : '';
  const blocked = blockedItems({ params, missing, kind });
  if (blocked.length > 0) return collectOut({ key, params, slots, missing, blocked, db });
  const before = totalChanges(db.db);
  const input = validateAddInput(params);
  const r = addBill(db, input);
  // 回执摘要里的型名改唤醒词（本轮整改）：`（expense）` 这种内建型名不上屏，
  // 换成「记支出」这类用户自己说过的词；`id=` 换「记录编号」；`prompt` 那个英文词删。
  const extra = kind === 'photo'
    ? '（三要素以外部识别为准）'
    : kind === 'batch' ? '（只落了其中一笔）' : kind ? '（' + wakeWordOf(kind) + '）' : '';
  return finish({
    db, key, params, op: 'add', row: r, fields: ADD_FIELDS, before, noChange: false,
    summary: `已记录：${r.category} ${r.amount.toFixed(2)}${extra}（记录编号 ${r.id}，这一页可以复制）`,
    writtenDetail: '这一笔已记进账本',
    detail: rowDetail(r),
  });
}

/** `bill.record.update`（改记录）：有阻断项（缺 `id`）即出采集页；op 决定改字段／撤销／恢复三支。
 *  **这一支不判金额方向**：撤销／恢复本来就不带 `kind`＋`amount`，带上也不该被方向判定拦下、改出采集页。 */
export function writeRecordUpdate(params: Record<string, unknown>, db: BillDb): WriteOut {
  const key = 'bill.record.update';
  const slots = RECORD_SLOTS[key];
  const missing = missingSlots(params, slots);
  const blocked = blockedItems({ params, missing, kind: '' });
  if (blocked.length > 0) return collectOut({ key, params, slots, missing, blocked, db });
  const op = parseRecordOp(params);
  const before = totalChanges(db.db);
  if (op === 'undo') {
    const id = needId(params);
    const r = undoBill(db, id);
    return finish({
      db, key, params, op: 'undo', row: r, fields: ['deleted_at'], before, noChange: false,
      summary: `已撤销，记录还在，随时可恢复（记录编号 ${r.id}）`,
      writtenDetail: '已标记撤销（记录还在库里，只是不再算进查询与统计）',
      detail: [{ k: fieldLabelOf('op'), v: statusNoteOf('软删打标（deleted_at = now，不物理删）') }, { k: fieldLabelOf('id'), v: String(r.id) }],
    });
  }
  if (op === 'restore') {
    const id = needId(params);
    const r = restoreBill(db, id);
    return finish({
      db, key, params, op: 'restore', row: r, fields: ['deleted_at'], before, noChange: false,
      summary: `已恢复（记录编号 ${r.id}）`,
      writtenDetail: '已恢复（撤销标记清掉，这一笔回到查询与统计里）',
      detail: [{ k: fieldLabelOf('op'), v: statusNoteOf('置 NULL（deleted_at 清空）') }, { k: fieldLabelOf('id'), v: String(r.id) }],
    });
  }
  const { id, patch } = validateUpdateInput(params);
  const pre = getById(db, id);
  const r = updateBill(db, id, patch);
  const fields = Object.keys(patch);
  const noChange = fields.every((f) => preValue(pre, f) === patch[f]);
  return finish({
    db, key, params, op: 'update', row: r, fields, before, noChange,
    summary: `已修改：${r.id}（改了 ${fields.map((f) => fieldLabelOf(f)).join('、')}）`,
    writtenDetail: '这一条已改好',
    detail: [
      { k: fieldLabelOf('id'), v: String(r.id) },
      ...fields.map((f) => ({ k: fieldLabelOf(f), v: String(patch[f]) })),
    ],
  });
}
