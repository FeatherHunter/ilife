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
 *  时间／账户／账本／币种／备注都有缺省值（可缺）。七槽里的「名目」没有库列：它落在三级分类的 L3
 *  （如 `餐饮/外卖/午餐` 的第三级）或备注里，提示里写明。
 *  `missingSlots` 只做「在不在」的探针；方向不符那一半住 `../shared/blockedSlots.ts` 的 `blockedItems`，
 *  **只服务录入路径**（`bill.record.add` 采集页传 `kind`；`bill.record.update` 那一支不判方向）。
 *  真值校验仍走 `src/policy` 的 `validateAddInput`／`validateUpdateInput`（阻断项清空后才走到那一步）。
 */

/** 一个槽位：参数名／中文名／怎么给／是否必需。 */
export interface RecordSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 两条写命令的槽位表。 */
export const RECORD_SLOTS: Record<string, readonly RecordSlot[]> = {
  'bill.record.add': [
    { name: 'category', label: '分类', hint: '三级分类：L1/L2/L3，如 餐饮/外卖/午餐（L3 即名目）', required: true },
    { name: 'amount', label: '金额', hint: '支出为负、收入为正，如 -12.5', required: true },
    { name: 'time', label: '时间', hint: '缺省＝今天 12:00:00', required: false },
    { name: 'account', label: '账户', hint: '缺省＝默认账户', required: false },
    { name: 'ledger', label: '账本', hint: '缺省＝默认账本', required: false },
    { name: 'currency', label: '币种', hint: '缺省＝默认币种', required: false },
    { name: 'note', label: '备注', hint: '自由文本；名目写在这里，可带 #标签', required: false },
  ],
  'bill.record.update': [
    { name: 'id', label: '记录编号', hint: '要改的那条记录的 id（撤销／恢复同样要它）', required: true },
    { name: 'op', label: '操作', hint: '缺省＝改字段；undo＝撤销（软删）／restore＝恢复', required: false },
    { name: 'category', label: '分类', hint: '不改就别给', required: false },
    { name: 'amount', label: '金额', hint: '不改就别给', required: false },
    { name: 'time', label: '时间', hint: '不改就别给', required: false },
    { name: 'account', label: '账户', hint: '不改就别给', required: false },
    { name: 'ledger', label: '账本', hint: '不改就别给', required: false },
    { name: 'currency', label: '币种', hint: '不改就别给', required: false },
    { name: 'note', label: '备注', hint: '不改就别给', required: false },
  ],
};

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算。0 算给了（金额 0 是合法值）。 */
export function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 必需槽位里哪些没给（**只探针，不做真值校验**）。 */
export function missingSlots(params: Record<string, unknown>, slots: readonly RecordSlot[]): RecordSlot[] {
  return slots.filter((s) => s.required && !isGiven(params[s.name]));
}
