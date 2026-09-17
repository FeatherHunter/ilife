/** 取数层 barrel：T3 饮食 / 运动 / 身体 / envelope 结构段 + T6 导入 / 历史 / 跨技能只读。
 *  #294：体重取数已搬进能力目录 `src/weight/records.ts`（归属律）——共用位里不再出现能力名。 */
export { FetchError } from './errors.js';
export * from './diet.js';
export * from '../exercise/exerciseStore.js';
export * from './body.js';
export { CALORIE_SKILL, calorieKey, fetchPayload, KEYS } from './shapes.js';
export type { FetchPayload } from './shapes.js';
// T6 #25 · 批量导入 / 近日 history / 跨技能只读 / 计划审计（训记动作库已搬进 `src/xunji/`，#606）
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
export { getCalorieHistory, weightSeries } from '../analysis/historyStore.js';
export type { DayIntake, CalorieHistory } from '../analysis/historyStore.js';
export { readSkill, requireOk } from './cross-skill.js';
export type { SkillEnvelope, ReadSkillOptions } from './cross-skill.js';
export { getProfile, setProfile, setActivityLevel, updateProfile, normalizeActivityLevel, normalizeGender, PROFILE_UPDATABLE, ACTIVITY_ALIASES } from './profile.js';
export type { ProfileRow, SetProfileInput } from './profile.js';
// 训记动作库与动作名校验已搬进 `src/xunji/`（#606）：要用走那个能力的门 `../xunji/index.js`，
// 本 barrel 不再转出（动作库的家只有一个）。
export { collectPlanNames, auditPlanNames } from './audit.js';
export type { AuditStatus, AuditReport } from './audit.js';
