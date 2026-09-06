/** 取数层 barrel：T3 饮食 / 体重 / 运动 / 身体 / envelope 结构段 + T6 导入 / 历史 / 跨技能只读。 */
export { FetchError } from './errors.js';
export * from './diet.js';
export * from './weight.js';
export * from './exercise.js';
export * from './body.js';
export { CALORIE_SKILL, calorieKey, fetchPayload, KEYS } from './shapes.js';
export type { FetchPayload } from './shapes.js';
// T6 #25 · 批量导入 / 近日 history / 跨技能只读 / 训记 catalog / 计划审计
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
export { getProfile, setProfile, setActivityLevel, updateProfile, normalizeActivityLevel, normalizeGender, PROFILE_UPDATABLE, ACTIVITY_ALIASES } from './profile.js';
export type { ProfileRow, SetProfileInput } from './profile.js';
export { DEFAULT_CATALOG_PATH, loadCatalog, suggestSimilar, verifyMovementName, verifyMany } from './xunji-catalog.js';
export type { VerifyResult } from './xunji-catalog.js';
export { collectPlanNames, auditPlanNames } from './audit.js';
export type { AuditStatus, AuditReport } from './audit.js';
