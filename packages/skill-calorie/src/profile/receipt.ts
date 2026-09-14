/** 基础信息（HELP 场景 07「基础信息」）· 整页回执端口（#330 从分派层收回）。
 *
 * 三条档案写命令按命令名认领整页回执；其余命令一律返回 null（调用方原样放行）。
 * 必须在 `withM5` 之后调用：新页要印 `affectedRows`／`writtenFields`／`m5Line`。
 * 命令原文与库与回执一起交给装配页（复制日志第 4 段与写后现值计算用）。
 */
import type { DatabaseSync } from 'node:sqlite';
import type { CrudReceipt } from '../render/receipt.js';
import { commandLine } from '../shared/writeParts.js';
import { buildProfileSettingReceiptDoc } from './setup.js';
import { buildProfileUpdateReceiptDoc } from './update.js';

/** 整页回执的三条档案写命令（数据位，具名键集；分派层只调本函数，不再写命令名字面量比较）。 */
const PROFILE_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.profile.set',
  'calorie.profile.activity',
  'calorie.profile.update',
]);

/** 三条里只有改档案用改档案页，另两条走设置／活动量页；具名键集，不写字面量比较。 */
const PROFILE_UPDATE_KEYS: ReadonlySet<string> = new Set(['calorie.profile.update']);

export function profileReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!PROFILE_RECEIPT_KEYS.has(key)) return null;
  return PROFILE_UPDATE_KEYS.has(key)
    ? buildProfileUpdateReceiptDoc(receipt, commandLine(key, params))
    : buildProfileSettingReceiptDoc(db, receipt, commandLine(key, params));
}
