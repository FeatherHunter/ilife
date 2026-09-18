/** skill-calorie · 包对外的门。
 *
 * #703 · 收窄到一页：这里只列**包外真有调用方**的值名（当刻实测 63 个；口径与逐名清单见
 * `docs/skills/skill-calorie/t703-公开面收窄-证据.md`）。原来那三条 `export *`（`fetch/`／
 * `render/`／`migrate/`）会带出 402 个名字（值 285 ＋ 类型 117），其中 339 个在包外零引用。
 *
 * 判断口径：全仓 import 语句里解析到本包 `dist/index.js` 的具名导入（包内测试 102 件、仓根测试 6 件、
 * 证据脚本 11 件、包内脚本 1 件）。加名字之前先问「谁在取」——没人取的名字不走这扇门；
 * `package.json` 的 `exports` 同时只留 `.`／`./cli`／`./package.json` 三条子路径。
 *
 * 本件今天仍是「包级出口直引能力内部件」的形态（`weight/records.ts`／`analysis/*.ts`）：
 * 那是搬迁前的既有面，本票只负责把名字数收下来（口径见证据件「留下的 63 个」那一节）。
 */
export { TABLE_DDLS, applyMigrations, initDb, openDb, listUserTables } from './schema.js';
export { DB_FILENAME, resolveDbDir, assertWritablePath } from './paths.js';
export { round2, isClean } from './kcal.js';
export { FetchError, KEYS, calorieKey, fetchPayload } from './fetch/index.js';
export { addMeal, addMealsBatch, copyMeals, deleteMeal, deleteMealsByType, getDailySummary, inferMealType, listMeals, updateMeal } from './fetch/index.js';
export { ValidationError, addComposition, addMeasurement, compareMeasurements, listCompositions, listMeasurements, trendComposition, trendMeasurement } from './fetch/index.js';
export { addRecord, combinedCalories, convertLoadKg, copyYesterday, deleteDay, deleteRecord, estimateCaloriesMet, estimateDifficultyMet, inferCategory, listWindow, lookupMet, parseUserDifficulty, resolveWindow, updateRecord } from './fetch/index.js';
export { batchLogWeight, deleteWeight, deltaLast, fetchWeightLogs, getWeightHistory, logWeight, noteTag, updateWeight } from './weight/records.js';
export { KCAL_PER_KG, buildDeficitData } from './analysis/deficit.js';
export { buildTrendData } from './analysis/trend.js';
export { buildExerciseReview } from './analysis/exerciseReview.js';
export { assertNoLeak, findLeaks } from './analysis/precision.js';
export { MigrateMissingError, MigrateVerifyError, formatReportText, migrateCalorieDb } from './migrate/migrate.js';
