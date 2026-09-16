/** 写入域两条写命令的槽位表与缺项探针（**唯一定义地**，本票从 `collect.ts` 原样搬来）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/write.ts`——两条写命令的处理体：拿 `missingSlots` 探「必需槽位在不在」，
 *      拿 `RECORD_SLOTS` 派生「记一笔写进库的列全集」；
 *   ② `src/record/collect.ts`（经它转出给三套测试）与 `src/record/collectBody.ts`——采集页按槽位表出表单。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，同一套采集页要同一张槽位表）。
 *
 * 「一条命令要哪些槽位、哪个必需」与「表单怎么摆」原本同住一件；本票按场景拆件时把前者单独搬到这里，
 *  理由：场景件只管自己那张页怎么摆，槽位表是两条命令共有的**事实**，搬进场景件就会各抄一份。
 *
 * 必需性照 `src/policy/category.ts` 的 `validateRecord`：分类与金额没有缺省值（必需），
 *  时间／账户／账本／币种／备注都有缺省值（可缺）。七槽里的「名目」没有库列：它落在三级分类的最后一段
 *  （如 `餐饮/外卖/午餐`）或备注里，提示里写明。
 *  `missingSlots` 只做「在不在」的探针；方向不符那一半住 `../shared/blockedSlots.ts` 的 `blockedItems`，
 *  **只服务录入路径**（`bill.record.add` 采集页传 `kind`；`bill.record.update` 那一支不判方向）。
 *  真值校验仍走 `src/policy` 的 `validateAddInput`／`validateUpdateInput`（阻断项清空后才走到那一步）。
 */
import { fieldLabelOf } from '../shared/userWording.js';

/** 一个槽位：参数名／中文名／怎么给／是否必需。
 *  中文名的**唯一定义地**是 `../shared/userWording.js` 的 `fieldLabelOf`（库列名与用户说法只在那里对照一次）：
 *  本表只写参数名与怎么给，中文名由它派生——两处各写一份中文名就会走散。 */
export interface RecordSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 一条槽位（中文名走映射件，不在这里另写一份对照）。 */
function slot(name: string, hint: string, required: boolean): RecordSlot {
  return { name, label: fieldLabelOf(name), hint, required };
}

/** 两条写命令的槽位表。提示句都是**用户说法**：`缺省＝…` 这类口径词不上屏（本轮整改）。 */
export const RECORD_SLOTS: Record<string, readonly RecordSlot[]> = {
  'bill.record.add': [
    slot('category', '三级分类，如 餐饮/外卖/午餐。要选到最细那一级', true),
    slot('amount', '支出记负数、收入记正数，如 -12.5', true),
    slot('time', '不填就记成今天 12:00:00', false),
    slot('account', '不填就记到默认账户', false),
    slot('ledger', '不填就记到默认账本', false),
    slot('currency', '不填就用默认币种', false),
    slot('note', '自由文本；名目写在这里，可带 #标签', false),
  ],
  'bill.record.update': [
    slot('id', '要改的那条记录的编号（撤销／恢复同样要它）', true),
    slot('op', '不填＝改字段；undo＝撤销／restore＝恢复', false),
    slot('category', '不改就别给', false),
    slot('amount', '不改就别给', false),
    slot('time', '不改就别给', false),
    slot('account', '不改就别给', false),
    slot('ledger', '不改就别给', false),
    slot('currency', '不改就别给', false),
    slot('note', '不改就别给', false),
  ],
};

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算。数字 `0` 视同没给（金额 0 本仓不记，裁定第 3 条）。 */
export function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'number' && v === 0) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 必需槽位里哪些没给（**只探针，不做真值校验**）。金额栏另判数字 `0` 与 `"0"` 串：它们视同没给。 */
export function missingSlots(params: Record<string, unknown>, slots: readonly RecordSlot[]): RecordSlot[] {
  return slots.filter((s) => {
    if (!s.required) return false;
    const v = params[s.name];
    if (!isGiven(v)) return true;
    if (s.name === 'amount') {
      if (typeof v === 'number' && v === 0) return true;
      if (typeof v === 'string' && v.trim() !== '' && Number(v.trim()) === 0) return true;
    }
    return false;
  });
}
