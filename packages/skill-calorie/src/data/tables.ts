/** #954 · 卡路里数据族允许清单（显式声明）：目录命令允许暴露哪些表。
 *
 * 出处：`docs/agents/数据族-规格.md` §五——表清单必须显式，不能“库里有什么就给什么”。
 * 卡路里库里有不该暴露的东西：`exercise_log` 的 `is_deleted`／`is_backfill`／
 * `xunji_localid` 这类内部列、改名残留的老表（`entries`／`sleep_records`／`fitness_goals`，
 * 见 `src/schema.ts` 的 M1 清理）。允许清单只列这 11 张终态持久表（与 `TABLE_DDLS` 同集合）；
 * 列目录不另存第二份，运行时 `PRAGMA table_info` 现读（公共层 `readDataSchema`）。
 *
 * 顺序即目录命令返回的顺序（确定性可比，判据按此逐条断言）。
 */
export const CALORIE_DATA_TABLES = [
  'food_log',
  'daily_goal',
  'exercise_log',
  'weight_log',
  'nutrition_products',
  'workout_plan_config',
  'workout_plans',
  'body_photos',
  'user_profile',
  'body_composition',
  'body_measurements',
] as const;

export type CalorieDataTable = (typeof CALORIE_DATA_TABLES)[number];
