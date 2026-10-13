/** 写入域·记账命令 params 校验（#689 结构搬迁第三批：从 `src/policy/record.ts` 的写校验半来）。
 *  op 分流：add（单笔/批量逐笔）/ update / undo（软删）/ restore；拍账单图片识别以外置为准。
 *  日期与时间窗口那半另住 `src/shared/dateRange.ts`（查询／分析／目标三处也在用）；`id` 槽位守卫与
 *  `op` 取值集住 `src/shared/params.ts`（写域与查询域两边都在取，本件照本域门面转出这两件）。
 *
 *  #1280 第 3 步：本件多一件**落库前的去重收口**——`canonicalizeExistingNames`（用户在分类／账本格
 *  敲的新值，按 `../shared/nameKey.js` 的比较键与库里已有值比对；等价即落库里已有那个拼写）。
 *  读库那一步也在本件（`existingNamesOf`：一条只读 `SELECT`，走命令侧**已经打开的那条连接**——
 *  不另开第二个连接，就不必自己再解析库路径、也不绕开命令侧既有的开门口径）；调用点在 `./write.js`
 *  写库之前那一步。读不出（库不在／表不在／语句报错）一律 **fail-open**：不改用户给的值，照原样落库。
 *
 *  谁在用（指名）：`src/write/write.ts`——两条写命令的处理体（`parseRecordOp`／`needId`／
 *    `validateAddInput`／`validateUpdateInput`／`canonicalizeExistingNames`）与回执事实里的 `RecordOp`。 */
import { BillPolicyError } from '../fetch/errors.js';
import type { BillDb } from '../fetch/index.js';
import { validateAmount, validateCategory, validateRecord } from '../shared/category.js';
import type { BillRecordInput } from '../shared/category.js';
import { validateTime } from '../shared/dateRange.js';
import { nameKey } from '../shared/nameKey.js';
import { needId } from '../shared/params.js';
import type { RecordOp } from '../shared/params.js';

/** `id` 槽位与 `op` 取值集（口径住 `../shared/params.js`），本件照写域的门面转出。 */
export { needId };
export type { RecordOp };

export function parseRecordOp(params: Record<string, unknown>): RecordOp {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'update' || op === 'undo' || op === 'restore') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/undo/restore）：' + JSON.stringify(op));
}

// add：7 字段强校验（批量由调用方逐笔调本函数，不在此展开数组）。
export function validateAddInput(params: Record<string, unknown>): ReturnType<typeof validateRecord> {
  return validateRecord(params);
}

// update：id 必填 + 至少改一个字段（amount/category/time 分项校验）。
export function validateUpdateInput(params: Record<string, unknown>): { id: number; patch: Record<string, unknown> } {
  const id = needId(params);
  const patch: Record<string, unknown> = {};
  if (params.category !== undefined) patch.category = validateCategory(params.category);
  if (params.amount !== undefined) patch.amount = validateAmount(params.amount);
  if (params.time !== undefined) patch.time = validateTime(params.time);
  for (const k of ['account', 'ledger', 'currency', 'note']) {
    if (params[k] !== undefined) {
      if (typeof params[k] !== 'string') throw new BillPolicyError('POLICY_BAD_INPUT', k + ' 须为字符串');
      patch[k] = params[k];
    }
  }
  if (!Object.keys(patch).length) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'update 至少改一个字段（category/amount/time/account/ledger/currency/note）');
  }
  return { id, patch };
}

/** 库内该列**已有值**的原样拼写（同值只留一份；顺序＝用得多的在前、同次数按最早那一行）。
 *
 *  读法与候选清单的来源同一条路（`src/help/candidateLists.js` 的 `readCandidateLists`）：同一条
 *  `bills` 表、同样跳过软删的行（撤掉的记录不该把拼写钉死；候选页里也看不到它们），老库没有
 *  `deleted_at` 列时退回不带过滤的读。**排序与 `rankByFrequency` 同序**（次数降序、同次数按首现），
 *  于是「用户在第一页候选里看到的那一个」就是被选中的拼写；本件不 import 那一件（help 能力不反向
 *  拖进写路径），只写同口径的一行 SQL。
 *
 *  读不出即返空表——**fail-open**：读不到已有值＝不改用户给的值（见 `canonicalizeExistingNames`）。 */
function existingNamesOf(db: BillDb, column: 'category' | 'ledger'): readonly string[] {
  const read = (where: string): string[] => {
    const rows = db.db.prepare(
      `SELECT ${column} AS v, COUNT(*) AS n, MIN(id) AS first_id FROM bills ${where} GROUP BY ${column} ORDER BY n DESC, first_id ASC`,
    ).all() as { v?: unknown }[];
    return rows.map((row) => String(row.v ?? '')).filter((value) => value.trim() !== '');
  };
  try {
    return read('WHERE deleted_at IS NULL');
  } catch {
    try { return read(''); } catch { return []; }
  }
}

/** 用户给的值 → **库里已有那个拼写**（`nameKey` 相等即同一个值）；库里没有同值才原样返回。
 *  多个已有拼写等价时取用得最多的那个（`existingNamesOf` 的顺序），与候选清单同一取舍。 */
function existingSpellingOf(db: BillDb, column: 'category' | 'ledger', value: string): string {
  if (value === '') return value;
  const key = nameKey(value);
  for (const known of existingNamesOf(db, column)) {
    if (nameKey(known) === key) return known;
  }
  return value;
}

/** 记一笔**落库前的去重收口**（#1280 第 3 步；调用点在 `./write.js` 的 `addBill` 之前那一行）：
 *  分类与账本两列，用户给的值与库里已有值按 `nameKey` 相等（只差大小写／首尾与内部空白／全角半角）
 *  时，落库换成**已有那个拼写**（不让 `Food`／`food`、`餐饮／夜宵`／`餐饮/夜宵` 在库里长成两行）；
 *  不等价原样落库，库里也没有的新值照样落库（值级放开那半的语义不动）。
 *
 *  只折这两列：账户不走这里（它有独立登记表与创建场景）、币种／备注等也不折。
 *  没有别的语义：不并近义词、不改层级、不截断（那是分类校验 `validateCategory` 的活，已在上一步做完）。
 *  读库失败原样返回（fail-open 在 `existingNamesOf` 里，本函数不抛）。 */
export function canonicalizeExistingNames(db: BillDb, input: BillRecordInput): BillRecordInput {
  try {
    return {
      ...input,
      category: existingSpellingOf(db, 'category', input.category),
      ledger: existingSpellingOf(db, 'ledger', input.ledger),
    };
  } catch {
    return input;
  }
}
