/** #960 · 饼干记账数据族允许清单（显式声明）：目录命令允许暴露哪些表。
 *
 * 出处：`docs/agents/数据族-规格.md` §五——表清单必须显式，不能“库里有什么就给什么”。
 * 本家只有 1 张业务表 `bills`（见 `src/fetch/db.ts` 的 `BILLS_DDL`，10 列）；
 * 另有 `goals.json`（预算／目标／账户三组，经 `src/fetch/db.ts` 的 `loadGoals`／`saveGoals`
 * 原子读写）——它不是 SQLite 表，不在本族内，本族两条命令都不读它。
 *
 * 本家无不允许暴露的 SQLite 表：库里只有这一张表，无改名残留的老表；
 * 列目录不另存第二份，运行时 `PRAGMA table_info` 现读（公共层 `readDataSchema`）。
 *
 * 顺序即目录命令返回的顺序（确定性可比，判据按此逐条断言）。
 */
export const BILL_DATA_TABLES = [
  'bills',
] as const;

export type BillDataTable = (typeof BILL_DATA_TABLES)[number];
