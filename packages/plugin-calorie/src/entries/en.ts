/** plugin-calorie · 词条表（英文列：与 `zh.ts` 同 key）。
 *
 *  空串＝未录（#1306：缺词条门判红），迁移票内必须补齐。
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`PluginCalorieMessageId` 从 zh 派生，见 `index.ts`）。
 */
import type { MessageTable } from 'base-entries';

export const en = {} as const satisfies MessageTable;
