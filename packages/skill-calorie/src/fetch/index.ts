/** T6 #25 · 取数/导入/跨技能只读出口。 */
export { REQUIRED_FIELDS, OPTIONAL_FIELDS, NUMERIC_FIELDS, validateRecord } from './validate.js';
export type { ValidationResult } from './validate.js';
export {
  readJsonl,
  dedupeKey,
  checkDuplicate,
  importProducts,
  validateFile,
  dedupeReport,
  exportBySource,
} from './batch.js';
export type { DuplicatePolicy, ImportStats, ImportResult, ImportFailure, ImportOptions } from './batch.js';
export { getCalorieHistory, weightSeries } from './history.js';
export type { DayIntake, CalorieHistory } from './history.js';
export { readSkill, requireOk } from './cross-skill.js';
export type { SkillEnvelope, ReadSkillOptions } from './cross-skill.js';
export { DEFAULT_CATALOG_PATH, loadCatalog, suggestSimilar, verifyMovementName, verifyMany } from './xunji-catalog.js';
export type { VerifyResult } from './xunji-catalog.js';
export { collectPlanNames, auditPlanNames } from './audit.js';
export type { AuditStatus, AuditReport } from './audit.js';
