/** 开始使用域·生成期预填（票 #1276 条目 24，用户 2026-10-13 追加需求：
 *  「设置当前配置 需要预装填当前 json配置文件里已有的配置」）。
 *
 * 这份值是**生成期**写进 HELP 页字段 `value` 的（用户打开页面时就该看见现值，
 * 否则「改哪格填哪格」还得先去翻文件），不是运行期读。
 *
 * 两条硬口径：
 *   · **只读**——用 `readBillConfigReadOnly()`（`../health.js`：全仓唯一那份「文件不在**不落默认件**」的
 *     只读解析器），绝不用 `loadBillConfig()`（文件不在会往家目录写一份默认配置）。
 *   · **只填文件里真写着的键**——用解析结果里的 `present` 判来源；没写的留空。表单里「空＝不改」是
 *     位面语义：把默认值预先填进去，会把「不改」变成「显式写一遍默认值」。
 */
import { readBillConfigReadOnly } from '../health.js';

/** 字段名 → 配置文件里的位置（字段名以 `./declaration.js` 的 `setup_config_write` 为准）。 */
const FIELD_OF: readonly { readonly field: string; readonly group: string; readonly key: string }[] = [
  { field: 'db_dir', group: 'db', key: 'dir' },
  { field: 'db_name', group: 'db', key: 'name' },
  { field: 'backup_dir', group: 'backup', key: 'dir' },
  { field: 'html_dir', group: 'html', key: 'dir' },
];

/** 生成期预填值（键＝HELP 字段名）。文件不在／读不出／这一键没写 ⇒ 结果里就没有那一位（那一格留空）。 */
export function configPrefillValues(): Record<string, string> {
  const read = readBillConfigReadOnly();
  if (read.kind !== 'ok') return {};
  const out: Record<string, string> = {};
  for (const { field, group, key } of FIELD_OF) {
    if (!read.present.has(group + '.' + key)) continue;
    const value = read.values[group]?.[key];
    if (typeof value === 'string' && value.trim() !== '') out[field] = value;
  }
  return out;
}
