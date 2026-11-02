/** #179 · 「看档案」：档案读链取数 ＋ 结果页整页（HELP 一级分组「基础信息」→ 子功能「看档案」）。
 *
 * 取数唯一来源：`fetch/profile.getProfile`（单例 id=1，无行即 missing）＋
 * `goal/nutritionGoal.getNutritionGoal`（可选）＋ `weight_log` 最新一条（可选）。
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
 *
 * #238 返修：英文枚举与库列名不再上页——性别／活动量走同目录 `labels.ts` 的中文说法，档案现值表
 * 的表题不再写 `user_profile#1 单例行`、表说也不再写 `weight_log.bmi` 这类库名；「没有值」这一页
 * 只有一个词（`未设置`；正在算而缺项的仍写「— ＋ 缺哪项」）；首卡不再与页标题同名；复制区不再出
 * 与按钮同名的大标题，粘贴出去的页名写中文（`【calorie 查档案】`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderKpiGrid, renderDisclosure, renderDataTable } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { getProfile } from '../fetch/profile.js';
import type { ProfileRow } from '../fetch/profile.js';
import { getNutritionGoal } from '../goal/nutritionGoal.js';
import type { NutritionGoalRow } from '../goal/nutritionGoal.js';
import { ACTIVITY_LEVELS } from '../kcal.js';
import { ACTIVITY_LEVEL_LABELS, TDEE_ACTIVITY_FACTORS, energyOf } from '../analysis/utils.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';
import { activityLabel, genderLabel } from './labels.js';
import { m } from '../entries/index.js';

/** envelope 头（值对齐 `cli/keys.ts` ENVELOPE_VERSION／CALORIE_SKILL）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const docTitle = (): string => m('skill-calorie.profile-view.c064');
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

/** BMI 分级（页面文案，非业务口径）：18.5 以下偏轻、18.5–24 正常、24 以上超重。 */
function bmiGrade(bmi: number): string {
  if (bmi < 18.5) return m('skill-calorie.profile-view.c001');
  if (bmi <= 24) return m('skill-calorie.profile-view.c002');
  return m('skill-calorie.profile-view.c003');
}

/** BMI 显示值：数值 ＋ 分级（值那一列用；KPI 卡只放数值，分级落 detail）。 */
function bmiText(bmi: number | null): string {
  return bmi === null ? '—' : bmi + '（' + bmiGrade(bmi) + '）';
}

/** 「缺哪几项」的一句话：`missing` 为空即不缺（此时数字应当在场）。 */
function missText(missing: readonly string[]): string {
  return missing.length === 0 ? '' : m('skill-calorie.profile-view.c004', { p0: String(missing.join('／')) });
}

/** 活动系数说明（五档）：本档标出来，口径一句话写在表说里。
 *  #238 清单 15 条同一条口径：不出「入库值」那一列（列里是库内英文枚举 `moderate` 这类字，
 *  用户拿它没用——老实物选项也只给中文 label），档位标签就是给人看的那一份。 */
function factorTable(current: string | null): string {
  const known = current !== null && current !== '' ? (TDEE_ACTIVITY_FACTORS[current] ?? null) : null;
  // 口径句的后半段与「本档」标记都是**条件文案**：先把它们各算成一句，整句才拿得到一条词条
  // （迁移器只迁「一条链顶」，链里再嵌三元就拆不出一句完整的话）。
  const knownText = known === null ? m('skill-calorie.profile-view.c005') : activityLabel(current) + ' ×' + known;
  const rows = ACTIVITY_LEVELS.map((level) => {
    const curMark = level === current ? m('skill-calorie.profile-view.c006') : '';
    return {
      label: (ACTIVITY_LEVEL_LABELS[level] as string) + curMark,
      factor: '×' + String(TDEE_ACTIVITY_FACTORS[level]),
    };
  });
  return renderDataTable({
    columns: [{ key: 'label', label: m('skill-calorie.profile-view.c007') }, { key: 'factor', label: m('skill-calorie.profile-view.c008') }],
    rows,
    caption: m('skill-calorie.profile-view.c009', { p0: String(knownText) }),
  });
}

/** 档案现值表里的一格：空值统一写「未设置」；性别与活动量走中文说法（#238 清单 2、7 条）。 */
function profileCell(kind: 'gender' | 'activity' | 'plain', raw: string | number | null): string {
  if (raw === null || raw === undefined || raw === '') return m('skill-calorie.profile-view.c010');
  if (kind === 'gender') return genderLabel(String(raw));
  if (kind === 'activity') return activityLabel(String(raw));
  return String(raw);
}

/** ② 结果页整页：七张 KPI ＋ 档案现值表 ＋ 六项度量表 ＋ 活动系数说明 ＋ 营养目标 ＋ 复制区。 */
export function buildProfileViewDoc(v: ProfileView): string {
  const p = v.profile;
  const metrics = v.metrics;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: VIEW_KEY,
    data: {
      metrics: metricsOf({
        age: p.age, heightCm: p.height_cm, hasGoal: v.hasGoal ? 1 : 0,
        latestWeightKg: v.latestWeightKg, calorieGoal: v.nutrition?.calorie_goal,
        bmi: metrics.bmi, bmr: metrics.bmr, tdee: metrics.tdee, activityFactor: metrics.factor,
      }),
    },
  };
  const weightDetail = v.latestWeight === null
    ? m('skill-calorie.profile-view.c011')
    : v.latestWeight.date + (v.latestWeight.time === null ? '' : ' ' + v.latestWeight.time);
  const factorTail = metrics.factor === null ? m('skill-calorie.profile-view.c012') : m('skill-calorie.profile-view.c013', { p0: String(metrics.factor) });
  const missingTail = metrics.missing.length === 0 ? '' : m('skill-calorie.profile-view.c014', { p0: String(missText(metrics.missing)) });
  const goalWord = v.hasGoal ? m('skill-calorie.profile-view.c015') : m('skill-calorie.profile-view.c016');
  const content = [
    // KPI 的 value 槽是给一个**短值**的（28px 粗体）：分级与单位一律落 12px 的 detail，
    // 否则 390px 下「22.9（正常）」会折成两行、把整排卡片一起拉高（#179 同款排版口径）。
    renderKpiGrid([
      // 首卡不再叫「档案视图」——那与页标题是同一句（#238 清单 4 条）；这一格说的是「这是谁」。
      { label: m('skill-calorie.profile-view.c017'), value: m('skill-calorie.profile-view.c018', {
        p0: String(profileCell('gender', p.gender)),
        p1: String(profileCell('plain', p.age)),
      }), detail: m('skill-calorie.profile-view.c019', { p0: String(profileCell('plain', p.height_cm)) }) },
      { label: m('skill-calorie.profile-view.c020'), value: profileCell('activity', p.activity_level), detail: metrics.factor === null ? m('skill-calorie.profile-view.c021') : m('skill-calorie.profile-view.c022', { p0: String(metrics.factor) }) },
      {
        label: m('skill-calorie.profile-view.c023'),
        value: metrics.bmi === null ? '—' : String(metrics.bmi),
        detail: metrics.bmi === null
          ? (v.latestWeight === null ? m('skill-calorie.profile-view.c024') : m('skill-calorie.profile-view.c025'))
          : m('skill-calorie.profile-view.c026', { p0: String(bmiGrade(metrics.bmi)) }),
      },
      {
        label: 'BMR',
        value: metrics.bmr === null ? '—' : String(metrics.bmr),
        detail: metrics.bmr === null ? m('skill-calorie.profile-view.c027', { p0: String(missText(metrics.missing)) }) : m('skill-calorie.profile-view.c028'),
      },
      {
        label: 'TDEE',
        value: metrics.tdee === null ? '—' : String(metrics.tdee),
        detail: metrics.tdee === null ? m('skill-calorie.profile-view.c029', { p0: String(missText(metrics.missing)) }) : m('skill-calorie.profile-view.c030', { p0: String(metrics.factor) }),
      },
      {
        label: m('skill-calorie.profile-view.c031'),
        value: v.latestWeightKg === null ? m('skill-calorie.profile-view.c032') : v.latestWeightKg + ' kg',
        detail: weightDetail,
      },
      { label: m('skill-calorie.profile-view.c033'), value: v.hasGoal ? m('skill-calorie.profile-view.c034') : m('skill-calorie.profile-view.c035'), detail: v.nutrition ? m('skill-calorie.profile-view.c036', { p0: String(v.nutrition.calorie_goal) }) : m('skill-calorie.profile-view.c037') },
    ]),
    renderDataTable({
      columns: [{ key: 'field', label: m('skill-calorie.profile-view.c038') }, { key: 'value', label: m('skill-calorie.profile-view.c039') }],
      rows: [
        { field: m('skill-calorie.profile-view.c040'), value: profileCell('plain', p.height_cm) },
        { field: m('skill-calorie.profile-view.c041'), value: profileCell('plain', p.age) },
        { field: m('skill-calorie.profile-view.c042'), value: profileCell('gender', p.gender) },
        { field: m('skill-calorie.profile-view.c043'), value: profileCell('activity', p.activity_level) },
        { field: m('skill-calorie.profile-view.c044'), value: profileCell('plain', p.note) },
        { field: m('skill-calorie.profile-view.c045'), value: profileCell('plain', p.created_at) },
        { field: m('skill-calorie.profile-view.c046'), value: profileCell('plain', p.updated_at) },
      ],
      caption: m('skill-calorie.profile-view.c047'),
    }),
    renderDataTable({
      // 两列（口径挪进表说）：390px 下三列的「值」会被挤成一字一行，而口径本来就是一段话。
      columns: [{ key: 'item', label: m('skill-calorie.profile-view.c048') }, { key: 'value', label: m('skill-calorie.profile-view.c049') }],
      rows: [
        { item: 'BMI', value: bmiText(metrics.bmi) },
        { item: 'BMR', value: metrics.bmr === null ? m('skill-calorie.profile-view.c050', { p0: String(missText(metrics.missing)) }) : m('skill-calorie.profile-view.c051', { p0: String(metrics.bmr) }) },
        { item: 'TDEE', value: metrics.tdee === null ? m('skill-calorie.profile-view.c052', { p0: String(missText(metrics.missing)) }) : m('skill-calorie.profile-view.c053', { p0: String(metrics.tdee) }) },
        { item: m('skill-calorie.profile-view.c054'), value: metrics.factor === null ? '—' : '×' + metrics.factor },
      ],
      caption: m('skill-calorie.profile-view.c055', { p0: String(factorTail), p1: String(missingTail) }),
    }),
    renderDisclosure({ title: m('skill-calorie.profile-view.c056'), contentHtml: factorTable(p.activity_level) }),
    renderDisclosure({
      title: m('skill-calorie.profile-view.c057', { p0: String(goalWord) }),
      contentHtml: v.nutrition
        ? m('skill-calorie.profile-view.c058', {
          p0: String(v.nutrition.calorie_goal),
          p1: String(v.nutrition.protein_goal),
          p2: String(v.nutrition.carbs_goal),
          p3: String(v.nutrition.fat_goal),
        })
        : m('skill-calorie.profile-view.c059'),
    }),
    copyArea({
      // 粘贴出去的页名写中文（#238 清单 13 条 / 票面裁定 3）：内部命令名对用户没有意义。
      data: { envelope, title: m('skill-calorie.profile-view.c060') },
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
    docTitle: docTitle(),
    title: m('skill-calorie.profile-view.c061'),
    eyebrow: m('skill-calorie.profile-view.c062'),
    subtitle: m('skill-calorie.profile-view.c063'),
    content,
    pageUi: true,
    // 宽屏单列锁（#946 同款修法）：读数卡与两张表在 ≥1001 档默认横跨整壳 1240、比页头宽 180px，
    // 用户 2026-09-24 在图上报「桌面端超出 880 正文列」⇒ 本页与档案族另三页一并收回中间那一列。
    lockColumn: true,
  });
}
