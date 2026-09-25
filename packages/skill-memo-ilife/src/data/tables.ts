/** #964 · 备忘录数据族允许清单（显式声明）：目录命令允许暴露哪些表。
 *
 * 出处：`docs/agents/数据族-规格.md` §五——表清单必须显式，不能“库里有什么就给什么”。
 * 本家有 2 张业务表（`notes`／`reminders`，列见 `src/db/readonly.ts` 的 `MemoNote`／`MemoReminder`）；
 * 包内没有建表语句——结构住仓外（老 `script/init.sql`），包内只以类型声明枚举列名，
 * 正是规格 §五“列目录运行时现读”的用例：列与类型一律 `PRAGMA table_info` 现读（公共层 `readDataSchema`），
 * 不维护第二份清单。
 *
 * 不暴露的东西（显式登记）：`sqlite_sequence`（自增计数内表）、`notes_fts` 一系全文副表
 * （老家 #180 已停用 FTS 查询路径，测试库亦不建该表）——不在清单里即不可查，引擎按项拒并点名。
 *
 * 顺序即目录命令返回的顺序（确定性可比，判据按此逐条断言）。
 */
export const MEMO_DATA_TABLES = [
  'notes',
  'reminders',
] as const;

export type MemoDataTable = (typeof MEMO_DATA_TABLES)[number];
