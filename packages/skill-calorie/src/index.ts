/** skill-calorie · T1 #20：schema 先行。取数/渲染 CLI 后续票补。 */
export { SCHEMA_VERSION, TABLE_DDLS, INDEX_SQLS, TRIGGER_SQLS, applyMigrations, initDb, openDb, listUserTables } from './schema.js';
export { DB_FILENAME, resolveDbDir, resolveDbPath, assertWritablePath } from './paths.js';
export {
  round2, isClean, SOURCE_HOME_CALIPER, SOURCE_HOSPITAL, SOURCE_GYM,
  SOURCE_CHOICES, SOURCE_LABELS, ACTIVITY_LEVELS, EXERCISE_CATEGORIES, EXERCISE_DIFFICULTIES,
} from './kcal.js';
export type { SourceChoice, ActivityLevel } from './kcal.js';
export * from './fetch/index.js';
export { KCAL_PER_KG, WEEKDAY_NAMES, weekdayName, buildDeficitData } from './analysis/deficit.js';
export type { DeficitDay, DeficitSummary, DeficitData } from './analysis/deficit.js';
export { buildTrendData } from './analysis/trend.js';
export type { TrendDay, TrendSummary, TrendData } from './analysis/trend.js';
export { buildExerciseReview } from './analysis/exerciseReview.js';
export type { ExerciseTypeStat, ExerciseReview } from './analysis/exerciseReview.js';
export { PRECISION_SUMMARY_FIELDS, PRECISION_SERIES_KEYS, findLeaks, assertNoLeak } from './analysis/precision.js';
export type { LeakReport } from './analysis/precision.js';
export * from './render/index.js';
export * from './migrate/migrate.js';
