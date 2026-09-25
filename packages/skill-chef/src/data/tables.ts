/** #963 · 私家大厨数据族允许清单（显式声明）：目录命令允许暴露哪些表。
 *
 * 出处：`docs/agents/数据族-规格.md` §五——表清单必须显式，不能“库里有什么就给什么”。
 * 本家 17 张用户表（菜谱主表 ＋ 配料／步骤／分类等从表），与 `src/fetch/schema.ts` 的
 * `CHEF_TABLE_DDL` 同集合、同序（亦与 `src/data/run-query.ts` 的 `BACKUP_TABLES` 同序：
 * 备份是“一次导出全部数据”，目录是“允许程序逐表取数”，两处都是“全部用户表”，故同序）。
 * 跨表连接在本家最有用（主表 ＋ 从表按 `recipe_id`／`step_id` 关联取数）。
 *
 * 本家无不允许暴露的 SQLite 表：库里只有这 17 张用户表，无改名残留的老表；
 * 无口令列（居家管家 `accounts.encrypted_password` 那一类在本家不存在）；
 * 内部列亦无（`is_deleted`／`is_backfill`／`xunji_localid`／`seed_key` 在本家 DDL 里零命中）。
 * 若维护者后续裁定某表不暴露，删本清单一行即关（目录与校验同源，见 `./schema.ts`）。
 *
 * 列目录不另存第二份，运行时 `PRAGMA table_info` 现读（公共层 `readDataSchema`）。
 * 顺序即目录命令返回的顺序（确定性可比，判据按此逐条断言）。
 */
export const CHEF_DATA_TABLES = [
  'recipes',
  'recipe_categories',
  'recipe_seasons',
  'recipe_cooking_methods',
  'recipe_flavors',
  'recipe_diet_tags',
  'recipe_meal_types',
  'ingredients',
  'cooking_steps',
  'step_ingredients',
  'step_techniques',
  'tips',
  'recipe_history',
  'background_knowledge',
  'recipe_relations',
  'cookware',
  'nutrition_info',
] as const;

export type ChefDataTable = (typeof CHEF_DATA_TABLES)[number];
