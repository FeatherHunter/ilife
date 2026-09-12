/** #179 · 「看档案」：档案读链取数 ＋ 结果页整页（HELP 一级分组「基础信息」→ 子功能「看档案」）。
 *
 * 取数唯一来源：`fetch/profile.getProfile`（单例 id=1，无行即 missing）＋
 * `fetch/nutritionGoal.getNutritionGoal`（可选）＋ `weight_log` 最新一条（可选）。
 * 原住 `src/render/profilePlate.ts`，#179 搬进本能力目录（同一个取数不留两处）。
 *
 * 目录内共用（`structure.md:94`「只有出这个目录才算对外」）：`profileSnapshot` 那句
 * 「档案现值 ＋ 最新体重」的查询只写一份，写前页（同目录 `setup.ts`）从它取改前值，
 * 不进对外清单。空档案即抛 `missing-data`（用户 2026-09-11 裁定不兜底）——写前页不
 * 走它，故空库仍能开页。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderKpiGrid, renderDisclosure, renderDataTable } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { getProfile } from '../fetch/profile.js';
import type { ProfileRow } from '../fetch/profile.js';
import { getNutritionGoal } from '../fetch/nutritionGoal.js';
import type { NutritionGoalRow } from '../fetch/nutritionGoal.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';

/** envelope 头（值对齐 `cli/keys.ts` ENVELOPE_VERSION／CALORIE_SKILL）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·档案';
/** 本页由哪条命令产出（写进「复制日志」第 4 段，可照抄重跑）。 */
const VIEW_KEY = 'calorie.view.profile';

export interface ProfileView {
  profile: ProfileRow;
  nutrition: NutritionGoalRow | null;
  latestWeightKg: number | null;
  hasGoal: boolean;
}

/** 本能力的读数据来源（「复制日志」第 3 段后半；写库回执那两页用 `receipt.meta.source` 同形）。
 *  档案现值与最新体重同出一份查询（`profileSnapshot`），故两个只读页共用这一个说法。 */
export const PROFILE_SOURCE = 'user_profile ＋ weight_log';

/** 档案现值（可缺）＋ 最新体重：本目录只此一份查询，`buildProfileView` 与写前页共用。 */
export function profileSnapshot(db: DatabaseSync): { profile: ProfileRow | null; latestWeightKg: number | null } {
  const profile = getProfile(db);
  let latest: { weight_kg: number } | undefined;
  try {
    latest = db.prepare('SELECT weight_kg FROM weight_log ORDER BY date DESC, id DESC LIMIT 1').get() as
      | { weight_kg: number }
      | undefined;
  } catch {
    latest = undefined;
  }
  return { profile, latestWeightKg: latest?.weight_kg ?? null };
}

/** ① 取数：档案（缺行即阻断，不返空）＋ 营养目标（可选）＋ 最新体重（可选）。 */
export function buildProfileView(db: DatabaseSync): ProfileView {
  const { profile, latestWeightKg } = profileSnapshot(db);
  if (!profile) throw new CalorieRenderError('missing-data', '未设档案（user_profile#1 缺失，先设置档案）');
  const nutrition = getNutritionGoal(db);
  return { profile, nutrition, latestWeightKg, hasGoal: nutrition !== null };
}

/** ② 结果页整页：档案五项 KPI ＋ 逐字段表 ＋ 复制区（完整文档，不是片段）。 */
export function buildProfileViewDoc(v: ProfileView): string {
  const p = v.profile;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: VIEW_KEY,
    data: {
      metrics: metricsOf({
        age: p.age, heightCm: p.height_cm, hasGoal: v.hasGoal ? 1 : 0,
        latestWeightKg: v.latestWeightKg, calorieGoal: v.nutrition?.calorie_goal,
      }),
    },
  };
  const content = [
    renderKpiGrid([
      { label: '档案视图', value: (p.gender ?? '—') + ' ' + (p.age ?? '—') + '岁', detail: '身高 ' + (p.height_cm ?? '—') + ' cm' },
      { label: '活动量', value: p.activity_level ?? '—' },
      { label: '目标', value: v.hasGoal ? '已设' : '未设', detail: v.nutrition ? v.nutrition.calorie_goal + ' 卡' : '' },
      { label: '最新体重', value: v.latestWeightKg === null ? '—' : v.latestWeightKg + ' kg' },
    ]),
    renderDataTable({
      columns: [{ key: 'field', label: '字段' }, { key: 'value', label: '现值' }],
      rows: [
        { field: '身高(cm)', value: p.height_cm ?? '—' },
        { field: '年龄', value: p.age ?? '—' },
        { field: '性别', value: p.gender ?? '—' },
        { field: '活动量', value: p.activity_level ?? '—' },
        { field: '备注', value: p.note ?? '—' },
      ],
      caption: '档案现值（user_profile#1 单例行）',
    }),
    renderDisclosure({
      title: '营养目标（' + (v.hasGoal ? '已设' : '未设') + '）',
      contentHtml: v.nutrition
        ? '热量 ' + v.nutrition.calorie_goal + ' 卡 · 蛋白 ' + v.nutrition.protein_goal + ' · 碳水 ' + v.nutrition.carbs_goal + ' · 脂肪 ' + v.nutrition.fat_goal
        : '未设营养目标（定营养目标后可在此看到口径）',
    }),
    copyArea({
      title: '复制数据',
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: 'calorie-cmd-read ' + VIEW_KEY, source: PROFILE_SOURCE,
          actionAt: nowStamp(), version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '档案视图',
    eyebrow: '基础信息 · 看档案',
    subtitle: '档案现值 ＋ 最新体重（档案缺失即阻断，不返空页）',
    content,
  });
}
