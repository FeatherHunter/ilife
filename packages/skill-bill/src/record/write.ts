/** 记账写入域两条命令的处理体（**从 `src/cli/cmd_read.ts` 归位到这里**）：
 *  `bill.record.add`（记一笔）与 `bill.record.update`（改记录，op＝改字段／撤销／恢复）。
 *
 * 谁在用（两个调用点，指名）：`src/record/commands.ts` 的两条声明各引一支——
 *   `writeRecordAdd` 引给 `bill.record.add`，`writeRecordUpdate` 引给 `bill.record.update`；
 *   出口分派 `src/cli/cmd_read.ts` 只查注册表再调 `runRecordWrite`，不再认这两个命令名。
 *
 * 两支的分岔口径（本票的新规矩）：
 *   **必需槽位缺失不再报参数错退出**，改出过程型采集页（`./collect.ts`），退出码 0、`ok:false`、不写库；
 *   必需槽位齐全照旧写库，出结果型回执整页（`./receipt.ts`）。
 *   必需槽位是哪些住 `./collect.ts` 的 `RECORD_SLOTS`（唯一定义地）；真值校验仍走 `src/policy`
 *   （`validateAddInput`／`validateUpdateInput`／`needId`／`parseRecordOp`），取数写库仍走 `src/fetch`
 *   （`addBill`／`updateBill`／`undoBill`／`restoreBill`），本文件只做编排与回执事实装配。
 * 写入字段口径：create 键＝该键写入列全集（含缺省值列）；改字段＝本次实际变更的列；撤销／恢复写的是 `deleted_at`。
 */
import { addBill, updateBill, undoBill, restoreBill, getById, DB_FILENAME } from '../fetch/index.js';
import type { BillDb, BillRow } from '../fetch/index.js';
import { needId, parseRecordOp, validateAddInput, validateUpdateInput } from '../policy/index.js';
import type { RecordOp } from '../policy/record.js';
import { buildRecordReceipt } from '../render/views.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { totalChanges } from '../shared/writeParts.js';
import type { BillReceipt } from '../shared/writeParts.js';
import { RECORD_SLOTS, missingSlots, recordCollectDoc } from './collect.js';
import type { RecordSlot } from './collect.js';
import { recordReceiptDoc } from './receipt.js';

/** 记一笔的写入列全集（缺省值列也算写入：时间／账户／账本／币种都带缺省）。 */
const ADD_FIELDS: readonly string[] = ['category', 'amount', 'time', 'account', 'ledger', 'currency', 'note'];

/** 本次数据来源（复制日志第 3 段）；库文件名逐字取本包常量，共用件不取。 */
const SOURCE = DB_FILENAME + ' · bills（写库回执）';

/** 本地时钟时刻串（写入时间与复制日志时间戳）。**取时钟在写体，不在共用位**。 */
function nowStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ') + '（本地时钟）';
}

/** 明细表的一行。 */
interface DetailRow {
  readonly k: string;
  readonly v: string;
}

/** 库内那一行的八个字段（记一笔的回执明细）。 */
function rowDetail(r: BillRow): DetailRow[] {
  return [
    { k: 'id', v: String(r.id) },
    { k: 'category', v: r.category },
    { k: 'amount', v: r.amount.toFixed(2) },
    { k: 'time', v: r.time },
    { k: 'account', v: r.account },
    { k: 'ledger', v: r.ledger },
    { k: 'currency', v: r.currency },
    { k: 'note', v: r.note },
  ];
}

/** 必需槽位缺失时的那一支：出过程型采集页、不写库、`ok:false`。 */
function collectOut(
  key: string, params: Record<string, unknown>, slots: readonly RecordSlot[], missing: readonly RecordSlot[],
): WriteOut {
  const message = '缺必需槽位：' + missing.map((m) => m.name).join('、') + '（已出采集页，补齐后重跑同一条命令）';
  return {
    data: { ok: false, message },
    html: recordCollectDoc({ key, params, slots, missing, source: SOURCE, actionAt: nowStamp() }),
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
    source: SOURCE,
    actionAt: nowStamp(),
  };
  return {
    data: { ...buildRecordReceipt(input.summary), receipt },
    html: recordReceiptDoc({
      key: input.key, params: input.params, receipt,
      writtenDetail: input.writtenDetail, detail: input.detail,
    }),
  };
}

/** `bill.record.add`（记一笔）：缺分类或金额即出采集页，齐全即写库出回执整页。 */
export function writeRecordAdd(params: Record<string, unknown>, db: BillDb): WriteOut {
  const key = 'bill.record.add';
  const slots = RECORD_SLOTS[key];
  const missing = missingSlots(params, slots);
  if (missing.length > 0) return collectOut(key, params, slots, missing);
  const before = totalChanges(db.db);
  const input = validateAddInput(params);
  const r = addBill(db, input);
  const kind = typeof params.kind === 'string' ? params.kind : '';
  const extra = kind === 'photo'
    ? '（拍账单图片识别以外置为准）'
    : kind === 'batch' ? '（批量逐笔校验其一）' : kind ? `（${kind}）` : '';
  return finish({
    db, key, params, op: 'add', row: r, fields: ADD_FIELDS, before, noChange: false,
    summary: `已记录：${r.category} ${r.amount.toFixed(2)}${extra}（id=${r.id}，账单回执可复制 prompt）`,
    writtenDetail: '已写入账单库',
    detail: rowDetail(r),
  });
}

/** `bill.record.update`（改记录）：缺 `id` 即出采集页；op 决定改字段／撤销／恢复三支。 */
export function writeRecordUpdate(params: Record<string, unknown>, db: BillDb): WriteOut {
  const key = 'bill.record.update';
  const slots = RECORD_SLOTS[key];
  const missing = missingSlots(params, slots);
  if (missing.length > 0) return collectOut(key, params, slots, missing);
  const op = parseRecordOp(params);
  const before = totalChanges(db.db);
  if (op === 'undo') {
    const id = needId(params);
    const r = undoBill(db, id);
    return finish({
      db, key, params, op: 'undo', row: r, fields: ['deleted_at'], before, noChange: false,
      summary: `已撤销：${r.id}（软删，恢复走 restore）`,
      writtenDetail: '已标记撤销（软删：行保留，已从查询与统计中排除）',
      detail: [{ k: 'op', v: 'undo（软删）' }, { k: 'id', v: String(r.id) }],
    });
  }
  if (op === 'restore') {
    const id = needId(params);
    const r = restoreBill(db, id);
    return finish({
      db, key, params, op: 'restore', row: r, fields: ['deleted_at'], before, noChange: false,
      summary: `已恢复：${r.id}`,
      writtenDetail: '已撤回撤销（软删标记清掉，行回到查询与统计里）',
      detail: [{ k: 'op', v: 'restore' }, { k: 'id', v: String(r.id) }],
    });
  }
  const { id, patch } = validateUpdateInput(params);
  const pre = getById(db, id) as unknown as Record<string, unknown>;
  const r = updateBill(db, id, patch as Partial<BillRow>);
  const fields = Object.keys(patch);
  const patchRecord = patch as Record<string, unknown>;
  const noChange = fields.every((f) => pre[f] === patchRecord[f]);
  return finish({
    db, key, params, op: 'update', row: r, fields, before, noChange,
    summary: `已修改：${r.id}（${fields.join('/')}）`,
    writtenDetail: '已改账单库那一条',
    detail: [{ k: 'id', v: String(r.id) }, ...fields.map((f) => ({ k: f, v: String(patchRecord[f]) }))],
  });
}
