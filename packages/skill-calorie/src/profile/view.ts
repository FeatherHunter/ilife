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
 *
 * #177 补齐结果页的六项：BMI／BMR／TDEE／活动系数／创建时间／更新时间（老实物
 * `scripts/render_crud_view.py:91-104` 是十二字段的参照），另加「活动系数说明」。
 * 六项里 BMR／TDEE 走 `analysis/utils.energyOf`（四要素缺一即不出数字的唯一判据）；
 * BMI 取最近一条体重记录里存的值（记体重那条命令按当时身高考算的同一个数），本页不另算；
 * 创建／更新取库内原值。空库仍是既有缺失阻断口径（exit 4、不落盘），本页不新造空库态。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderKpiGrid, renderDisclosure, renderDataTable } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { getProfile } from '../fetch/profile.js';
import type { ProfileRow } from '../fetch/profile.js';
import { getNutritionGoal } from '../fetch/nutritionGoal.js';
import type { NutritionGoalRow } from '../fetch/nutritionGoal.js';
import { ACTIVITY_LEVELS } from '../kcal.js';
import { ACTIVITY_LEVEL_LABELS, TDEE_ACTIVITY_FACTORS, energyOf } from '../analysis/utils.js';
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

/** 最近一条体重记录（目录内共用：写前页只要重量，结果页还要它与 BMI／日期）。 */
interface LatestWeight {
  weightKg: number;
  /** 记体重那条命令按**当时**身高考算并存下的值；当时没身高即 null（缺口如实露出，不补算）。 */
  bmi: number | null;
  date: string;
  time: string | null;
}

/** 结果页六项里由「档案现值 ＋ 最近体重」得出或取出的一组（判据见 `analysis/utils.energyOf`）。 */
interface ProfileMetrics {
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  factor: number | null;
  missing: string[];
}

export interface ProfileView {
  profile: ProfileRow;
  nutrition: NutritionGoalRow | null;
  latestWeight: LatestWeight | null;
  latestWeightKg: number | null;
  hasGoal: boolean;
  metrics: ProfileMetrics;
}

/** 本能力的读数据来源（「复制日志」第 3 段后半；写库回执那两页用 `receipt.meta.source` 同形）。
 *  档案现值与最新体重同出一份查询（`profileSnapshot`），故两个只读页共用这一个说法。 */
export const PROFILE_SOURCE = 'user_profile ＋ weight_log';

/** 档案现值（可缺）＋ 最新体重：本目录只此一份查询，`buildProfileView` 与写前页共用。 */
export function profileSnapshot(db: DatabaseSync): {
  profile: ProfileRow | null;
  latestWeightKg: number | null;
  latestWeight: LatestWeight | null;
} {
  const profile = getProfile(db);
  let latest: { weight_kg: number; bmi: number | null; date: string; time: string | null } | undefined;
  try {
    latest = db.prepare(
      'SELECT weight_kg, bmi, date, time FROM weight_log ORDER BY date DESC, id DESC LIMIT 1',
    ).get() as { weight_kg: number; bmi: number | null; date: string; time: string | null } | undefined;
  } catch {
    latest = undefined;
  }
  return {
    profile,
    latestWeightKg: latest?.weight_kg ?? null,
    latestWeight: latest
      ? { weightKg: latest.weight_kg, bmi: latest.bmi ?? null, date: latest.date, time: latest.time ?? null }
      : null,
  };
}

/** ① 取数：档案（缺行即阻断，不返空）＋ 营养目标（可选）＋ 最新体重（可选）＋ 六项度量。 */
export function buildProfileView(db: DatabaseSync): ProfileView {
  const { profile, latestWeightKg, latestWeight } = profileSnapshot(db);
  if (!profile) throw new CalorieRenderError('missing-data', '未设档案（user_profile#1 缺失，先设置档案）');
  const nutrition = getNutritionGoal(db);
  const energy = energyOf({
    weightKg: latestWeightKg,
    heightCm: profile.height_cm,
    age: profile.age,
    gender: profile.gender,
    activityLevel: profile.activity_level,
  });
  return {
    profile,
    nutrition,
    latestWeight,
    latestWeightKg,
    hasGoal: nutrition !== null,
    metrics: { bmi: latestWeight?.bmi ?? null, ...energy },
  };
}

/** 性别显示值：库内两条归一说成中文，别的原样露出（不认识的绝不猜成男）。 */
function genderText(raw: string | null): string {
  if (raw === 'male') return '男';
  if (raw === 'female') return '女';
  return raw ?? '—';
}

/** 档位显示值：正本 `ACTIVITY_LEVEL_LABELS`；认不出的档位原样露出。 */
function activityText(level: string | null): string {
  if (level === null || level === '') return '—';
  return (ACTIVITY_LEVEL_LABELS[level] as string | undefined) ?? level;
}

/** BMI 分级（页面文案，非业务口径）：18.5 以下偏轻、18.5–24 正常、24 以上超重。 */
function bmiGrade(bmi: number): string {
  if (bmi < 18.5) return '偏轻';
  if (bmi <= 24) return '正常';
  return '超重';
}

/** BMI 显示值：数值 ＋ 分级（值那一列用；KPI 卡只放数值，分级落 detail）。 */
function bmiText(bmi: number | null): string {
  return bmi === null ? '—' : bmi + '（' + bmiGrade(bmi) + '）';
}

/** 「缺哪几项」的一句话：`missing` 为空即不缺（此时数字应当在场）。 */
function missText(missing: readonly string[]): string {
  return missing.length === 0 ? '' : '缺' + missing.join('／');
}

/** 活动系数说明（五档）：本档标出来，口径一句话写在表说里。 */
function factorTable(current: string | null): string {
  const known = current !== null && current !== '' ? (TDEE_ACTIVITY_FACTORS[current] ?? null) : null;
  return renderDataTable({
    columns: [{ key: 'label', label: '档位' }, { key: 'level', label: '入库值' }, { key: 'factor', label: '系数' }],
    rows: ACTIVITY_LEVELS.map((level) => ({
      label: (ACTIVITY_LEVEL_LABELS[level] as string) + (level === current ? '（本档）' : ''),
      level,
      factor: '×' + String(TDEE_ACTIVITY_FACTORS[level]),
    })),
    caption: 'TDEE ＝ BMR × 活动系数（运动消耗另计，不进这个数）；本档＝'
      + (known === null ? '档案里没有活动量，系数不取默认档' : activityText(current) + ' ×' + known),
  });
}

/** ② 结果页整页：七张 KPI ＋ 档案现值表 ＋ 六项度量表 ＋ 活动系数说明 ＋ 营养目标 ＋ 复制区。 */
export function buildProfileViewDoc(v: ProfileView): string {
  const p = v.profile;
  const m = v.metrics;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: VIEW_KEY,
    data: {
      metrics: metricsOf({
        age: p.age, heightCm: p.height_cm, hasGoal: v.hasGoal ? 1 : 0,
        latestWeightKg: v.latestWeightKg, calorieGoal: v.nutrition?.calorie_goal,
        bmi: m.bmi, bmr: m.bmr, tdee: m.tdee, activityFactor: m.factor,
      }),
    },
  };
  const weightDetail = v.latestWeight === null
    ? '无记录'
    : v.latestWeight.date + (v.latestWeight.time === null ? '' : ' ' + v.latestWeight.time);
  const content = [
    // KPI 的 value 槽是给一个**短值**的（28px 粗体）：分级与单位一律落 12px 的 detail，
    // 否则 390px 下「22.9（正常）」会折成两行、把整排卡片一起拉高（#179 同款排版口径）。
    renderKpiGrid([
      { label: '档案视图', value: genderText(p.gender) + ' ' + (p.age ?? '—') + '岁', detail: '身高 ' + (p.height_cm ?? '—') + ' cm' },
      { label: '活动量', value: activityText(p.activity_level), detail: m.factor === null ? '系数待补' : '系数 ×' + m.factor },
      {
        label: '最近 BMI',
        value: m.bmi === null ? '—' : String(m.bmi),
        detail: m.bmi === null
          ? (v.latestWeight === null ? '无体重记录可算' : '该条记录未算 BMI（记体重时档案缺身高）')
          : bmiGrade(m.bmi) + ' · 最近一条体重记录算的值',
      },
      {
        label: 'BMR',
        value: m.bmr === null ? '—' : String(m.bmr),
        detail: m.bmr === null ? missText(m.missing) + '，不算' : '卡/天 · Mifflin-St Jeor',
      },
      {
        label: 'TDEE',
        value: m.tdee === null ? '—' : String(m.tdee),
        detail: m.tdee === null ? missText(m.missing) + '，不算' : '卡/天 · BMR × 系数 ' + m.factor,
      },
      {
        label: '最近体重',
        value: v.latestWeightKg === null ? '—' : v.latestWeightKg + ' kg',
        detail: weightDetail,
      },
      { label: '目标', value: v.hasGoal ? '已设' : '未设', detail: v.nutrition ? v.nutrition.calorie_goal + ' 卡' : '未定营养目标' },
    ]),
    renderDataTable({
      columns: [{ key: 'field', label: '字段' }, { key: 'value', label: '现值' }],
      rows: [
        { field: '身高(cm)', value: p.height_cm ?? '—' },
        { field: '年龄', value: p.age ?? '—' },
        { field: '性别', value: p.gender ?? '—' },
        { field: '活动量', value: p.activity_level ?? '—' },
        { field: '备注', value: p.note ?? '—' },
        { field: '档案创建', value: p.created_at ?? '—' },
        { field: '档案更新', value: p.updated_at ?? '—' },
      ],
      caption: '档案现值（user_profile#1 单例行）；末两行＝创建时间／更新时间，库内原值（SQLite CURRENT_TIMESTAMP，UTC）',
    }),
    renderDataTable({
      // 两列（口径挪进表说）：390px 下三列的「值」会被挤成一字一行，而口径本来就是一段话。
      columns: [{ key: 'item', label: '指标' }, { key: 'value', label: '值' }],
      rows: [
        { item: 'BMI', value: bmiText(m.bmi) },
        { item: 'BMR', value: m.bmr === null ? '—（' + missText(m.missing) + '，不算）' : m.bmr + ' 卡/天' },
        { item: 'TDEE', value: m.tdee === null ? '—（' + missText(m.missing) + '，不算）' : m.tdee + ' 卡/天' },
        { item: '活动系数', value: m.factor === null ? '—' : '×' + m.factor },
      ],
      caption: '档案度量（BMI／BMR／TDEE／活动系数）：BMI 取 weight_log.bmi（记体重时按当时身高考算，本页不另算）；'
        + 'BMR ＝ Mifflin-St Jeor（10×体重 ＋ 6.25×身高 − 5×年龄 ＋ 性别项）；TDEE ＝ BMR × 活动系数'
        + (m.factor === null ? '（系数待补）' : '（' + m.factor + '，运动消耗另计）')
        + (m.missing.length === 0 ? '' : '；本次' + missText(m.missing) + '，缺项一律不编默认值'),
    }),
    renderDisclosure({ title: '活动系数说明（五档）', contentHtml: factorTable(p.activity_level) }),
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
    subtitle: '档案现值 ＋ 最近体重（档案缺失即阻断，不返空页）',
    content,
  });
}
