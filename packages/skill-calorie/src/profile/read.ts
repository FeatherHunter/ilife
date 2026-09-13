/** 基础信息（HELP 场景 07「基础信息」· 子功能「看档案」）· **读命令入口**。
 *
 * #318 · 从 `src/cli/cmd_read.ts` 的 `case 'calorie.view.profile*'` 两条搬出：逻辑一字未动，只换住处
 * （分派层改走 `src/cli/registry.ts` 查表 ⇒ `commands.ts` 的 `run`）。
 * 取数与整页装配仍住原处（本目录 `view.ts`／`setup.ts`），本件只做入口。
 */
import type { DatabaseSync } from 'node:sqlite';
import { nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { buildProfileSettingDoc, buildProfileSettingView } from './setup.js';
import { buildProfileView, buildProfileViewDoc } from './view.js';

/** `calorie.view.profile` · 档案视图（档案四项 ＋ 是否有目标 ＋ 最新体重 ＋ 热量目标）。 */
export function viewProfile(_params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildProfileView(db);
  const metrics = nums({
    age: v.profile.age, heightCm: v.profile.height_cm,
    hasGoal: v.hasGoal ? 1 : 0, latestWeightKg: v.latestWeightKg,
    calorieGoal: v.nutrition?.calorie_goal,
  });
  // #179 · 结果页换整页装配（原 `renderProfileHtml` 只出 `<section>` 片段，双击打不开）。
  return { data: { metrics }, html: buildProfileViewDoc(v) };
}

/** `calorie.view.profile-wizard` · 档案预检页（写前确认：已填几项／改前值／活动量五档）。 */
export function viewProfileWizard(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildProfileSettingView(db, params);
  const metrics = nums({
    filledCount: v.filledCount, hasProfile: v.before ? 1 : 0,
    latestWeightKg: v.latestWeightKg, activityLevels: v.activityChoices.length,
  });
  return { data: { metrics }, html: buildProfileSettingDoc(v) };
}
