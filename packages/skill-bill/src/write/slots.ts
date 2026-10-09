/** 写入域两条写命令的槽位表与缺项探针（**唯一定义地**，本票从 `collect.ts` 原样搬来）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/write.ts`——两条写命令的处理体：拿 `missingSlots` 探「必需槽位在不在」，
 *      拿 `RECORD_SLOTS` 派生「记一笔写进库的列全集」；
 *   ② `src/write/collect.ts`——采集页分派位（经它转出给三套测试），它把这一张表当 `CollectInput.slots`
 *      交给场景件与五张模板件，字段卡照它出表单。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，同一套采集页要同一张槽位表）。
 *
 * 「一条命令要哪些槽位、哪个必需」与「表单怎么摆」原本同住一件；本票按场景拆件时把前者单独搬到这里，
 *  理由：场景件只管自己那张页怎么摆，槽位表是两条命令共有的**事实**，搬进场景件就会各抄一份。
 *
 * 必需性照 `src/shared/category.ts` 的 `validateRecord`：分类与金额没有缺省值（必需），
 *  时间／账户／账本／币种／备注都有缺省值（可缺）。七槽里的「名目」没有库列：它落在三级分类的最后一段
 *  （如 `餐饮/外卖/午餐`）或备注里，提示里写明。
 *  `missingSlots` 只做「在不在」的探针；方向不符那一半住 `../shared/blockedSlots.ts` 的 `blockedItems`，
 *  **只服务录入路径**（`bill.record.add` 采集页传 `kind`；`bill.record.update` 那一支不判方向）。
 *  真值校验仍走 `./record.js` 的 `validateAddInput`／`validateUpdateInput`（阻断项清空后才走到那一步）。
 *
 *  #1206 首切件（多语言文本外置）：提示句不住这里，住 `../entries/zh.ts`（中文基准）
 *  与 `../entries/en.ts`（英文列）；`recordSlots(language)` 按语言取值（不给＝`zh`，
 *  与改造前逐字节相同）。中文名仍走 `fieldLabelOf` 映射件（同一概念只一处定义，不另起 key）。
 */
import { resolve } from 'base-entries';
import { SKILL_BILL_CATALOG, type SkillBillMessageId } from '../entries/index.js';
import { fieldLabelOf } from './userWording.js';

/** 一个槽位：参数名／中文名／怎么给／是否必需。
 *  中文名的**唯一定义地**是 `../shared/userWording.js` 的 `fieldLabelOf`（库列名与用户说法只在那里对照一次）：
 *  本表只写参数名与怎么给，中文名由它派生——两处各写一份中文名就会走散。 */
export interface RecordSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 一条槽位（中文名走映射件，不在这里另写一份对照；提示句走词条表）。 */
function slot(name: string, hintId: SkillBillMessageId, required: boolean, language: string): RecordSlot {
  return { name, label: fieldLabelOf(name), hint: resolve(SKILL_BILL_CATALOG, language, hintId), required };
}

/** 两条写命令的槽位表。提示句都是**用户说法**：`缺省＝…` 这类口径词不上屏（本轮整改）。
 *  `RECORD_SLOTS` 是 `zh` 那一份，保持既有形状（名目仍走映射件派生）。 */
export function recordSlots(language: string = 'zh'): Record<string, readonly RecordSlot[]> {
  return {
    'bill.record.add': [
      slot('category', 'slots.add.category.hint', true, language),
      slot('amount', 'slots.add.amount.hint', true, language),
      slot('time', 'slots.add.time.hint', false, language),
      slot('account', 'slots.add.account.hint', false, language),
      slot('ledger', 'slots.add.ledger.hint', false, language),
      slot('currency', 'slots.add.currency.hint', false, language),
      slot('note', 'slots.add.note.hint', false, language),
    ],
    'bill.record.update': [
      slot('id', 'slots.update.id.hint', true, language),
      slot('op', 'slots.update.op.hint', false, language),
      slot('category', 'slots.update.category.hint', false, language),
      slot('amount', 'slots.update.amount.hint', false, language),
      slot('time', 'slots.update.time.hint', false, language),
      slot('account', 'slots.update.account.hint', false, language),
      slot('ledger', 'slots.update.ledger.hint', false, language),
      slot('currency', 'slots.update.currency.hint', false, language),
      slot('note', 'slots.update.note.hint', false, language),
    ],
  };
}

export const RECORD_SLOTS: Record<string, readonly RecordSlot[]> = recordSlots('zh');

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
