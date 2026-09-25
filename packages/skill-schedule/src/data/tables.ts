/** #961 · 作息数据族允许清单（显式声明）：目录命令允许暴露哪些表。
 *
 * 出处：`docs/agents/数据族-规格.md` §五——表清单必须显式，不能“库里有什么就给什么”。
 * 作息库里有不该暴露的东西：旧版小时表改名保留的
 * `schedule_plans_legacy_2026_06_29`（见 `src/fetch/db.ts` 的改名语义，只留数据、不提供查询）；
 * 允许清单只列这 3 张终态业务表；列目录不另存第二份，运行时 `PRAGMA table_info` 现读
 * （公共层 `readDataSchema`）。
 *
 * 顺序即目录命令返回的顺序（确定性可比，判据按此逐条断言）。
 * 维护者裁定：3 张业务表可暴露，旧表不暴露（本件即裁定落点）。
 */
export const SCHEDULE_DATA_TABLES = [
  'schedule_records',
  'daily_summary',
  'schedule_plans',
] as const;

export type ScheduleDataTable = (typeof SCHEDULE_DATA_TABLES)[number];

/** 不允许暴露的表（遗留出口，登记并留说明）：旧版小时表改名保留，只留数据、不提供查询。 */
export const SCHEDULE_DATA_EXCLUDED_TABLES = [
  'schedule_plans_legacy_2026_06_29',
] as const;
