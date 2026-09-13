/** #40 · 卡路里写键分发（单条 CRUD 可执行链）：唯一出口 cmd_read 的写分支（memo.create/update/remove 范式）。
 *
 * 35 写键一律 receipt 形：先调现行 fetch 层库函数写库，再用 render/receipt.ts（T10）
 * buildCrudReceipt（照片键用 render/photo.ts 三回执）组装回执；envelope 数据为
 * { ok: true, message, receipt }（ok/message 过 envelope 全字段，receipt carry T10 形状）。
 * 本文件不写 render/ 新视图、不碰 envelope 键表（#41 边界）；HTML 为 dispatch 内联
 * receipt 小节（沿 cmd_read history/help 内联先例，不新增模板）——**唯一例外**是
 * #179 接线的场景 07 三条写入词（设置档案／设活动量／改档案）：它们的回执页换成
 * 能力目录 `src/profile/` 那两页整页装配（见 `profileReceiptDoc`），其余 32 条一字不改。
 * 退出码沿 T11 冻结：缺参/坏参 fail(2)；未知键上游拦（exit 3）；缺失阻断 fail(4)；
 * envelope/落盘 fail(5)。库函数 FetchError 透传（main 映射 exit 4）；body.ts
 * ValidationError 在此转 bad-input（exit 2）。
 *
 * #101 → #120 · 删除可恢复性口径（**不得承诺可恢复**——全仓 0 个 restore/undo/recover 入口）：
 * - 软删除、行仍在库、**已从查询与统计排除**：`exercise_log.is_deleted`（#120 起 `analysis/**`
 *   11 处查询统一内联 `analysis/utils.ts:EX_ALIVE`，删后 `view.home.deficitToday`／
 *   `view.deficit.avgExerciseBurn`／`buildSeries.exerciseKcal` 同步排除；**supersedes #101 的
 *   「仍计入历史统计」口径**，见 `docs/research/t120-softdelete-filter.md`）／
 *   `body_composition`／`body_measurements`（`is_deprecated`，读层 `fetch/body.ts:131,197,155,166`
 *   ＋ `analysis/series.ts:119,122`／`cross.ts:144-145` 均带 `is_deprecated = 0`）／
 *   `nutrition_products`（`diet/productStore.ts:72,108,114,120`）
 *   → 「（软删除：行保留，已从查询与统计中排除；暂无恢复入口）」
 * - 硬删除（行删除、不可恢复）：`food_log`／`weight_log`／`body_photos`（`DELETE FROM`）→ 「（硬删除，不可恢复）」
 * `items[].status` 结构化字段与 prose **同源**（同一口径常量派生，软/硬 ＋ 不可恢复）。
 * 依据：fetch 层 delete* 实测（`fetch/exercise.ts:216-238` 软删／`fetch/diet.ts:153-161` 硬删／
 * `fetch/weight.ts:148-178` 硬删／`fetch/body.ts:144-148,207-211` 软删）＋ 审计
 * `docs/research/t67-key-audit.md:246` ＋ 复跑证据 `docs/research/t120-probe-softdelete.mjs`。
 * 照片键文案在 `render/photo.ts:buildDeleteReceipt`。
 */
import type { DatabaseSync } from 'node:sqlite';

import {
  setActivityLevel,
  setProfile,
  updateProfile,
} from '../fetch/profile.js';
import type { ProfileRow } from '../fetch/profile.js';
import { getNutritionGoal, setNutritionGoal, updateWaterGoal } from '../fetch/nutritionGoal.js';
import { pauseAllGoals, resumeAllGoals, setWeightGoal } from '../fetch/goal.js';
import {
  ValidationError,
} from '../fetch/body.js';
import { withM5 } from '../render/receipt.js';
import type { CrudReceipt } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';

// #179 · 场景 07 三条写入词的回执页：整页装配住在能力目录 `src/profile/`（写前页在 setup.ts）。
import { buildProfileSettingReceiptDoc } from '../profile/setup.js';
import { buildProfileUpdateReceiptDoc } from '../profile/update.js';
import { isCalorieWriteKey } from './keys.js';
// #294 · 命令索引：命中即走能力目录里的实现，未命中的老键落下面的 dispatchInner switch。
import { REGISTRY } from './registry.js';

// #294 · 参数读取与回执底座上移共用位：能力目录里的命令与分派层用同一套口径（唯一定义地）。
import { fail, needNum, needStr, optNum, optStr } from '../shared/params.js';
import { SOFT_EXCLUDED, R, commandLine, out, provided, totalChanges } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';

/** `calorie.goal.set` 本次**实际被 SET 的列** → CLI 参数名（正本 §3.4「update 键＝本次实际变更字段」）。
 * 与 `fetch/nutritionGoal.ts` 的两条 UPSERT 同源（#127 已改）：传 `water` 走 6 列
 * （含 `water_goal`），不传则 SQL 里**没有** `water_goal` 列——该列保持原值，
 * **不属本次 SET 的字段**，故不得报 `water`。
 * 记账列 `updated_at` 无 CLI 参数，按 §3.4 不计入摘要。
 * #127：UPSERT 只覆盖传入列，`weight_goal`／`goal_deadline`／`goal_paused`／`start_weight`／
 * `start_date`／`exercise_goal`／未传的 `water_goal` 逐列保持原值（不再整行替换）。 */
const goalSetWrittenFields = (hasWater: boolean): string[] =>
  ['calorie', 'protein', 'carbs', 'fat', ...(hasWater ? ['water'] : [])];

/* -------------------------------------- #179 · 场景 07 三条写入词的回执页（整页装配） */

/** 档案库列名 ↔ CLI 参数名（逐字段对照只用这 5 项，与 `PROFILE_UPDATABLE` 同集）。 */
const PROFILE_COLS: Record<string, keyof ProfileRow> = {
  age: 'age', gender: 'gender', heightCm: 'height_cm', activityLevel: 'activity_level', note: 'note',
};

/** 档案某字段的展示值：空库（无改前值）与库内 NULL 一律写「—」，不编数据。 */
function profileValue(row: ProfileRow | null, camel: string): string {
  const col = PROFILE_COLS[camel];
  if (!row || col === undefined) return '—';
  const v = row[col];
  return v === null || v === undefined ? '—' : String(v);
}

/** 改档案逐字段对照：字段名（CLI 参数名，与 `writtenFields` 同口径）＋ 改前 → 改后。
 *  形照 `profile/update.ts:diffRows` 的读法（`status`＝字段名、`reason`＝对照）。 */
function profileDiffItems(before: ProfileRow | null, after: ProfileRow, fields: string[]): CrudReceipt['items'] {
  return fields.map((f) => ({ status: f, reason: profileValue(before, f) + ' → ' + profileValue(after, f) }));
}

/** 三条写入词的回执页换成整页装配；**其余 32 条一律返回 null**，由 `dispatchWrite` 的
 *  `?? res.html` 原样放行——那些命令的产物与 `receiptHtml` 那条片段路径逐字节不变
 *  （分派只认这三个命令名，认不出就不进这条路，也不碰 `receiptHtml` 本身）。
 *  必须在 `withM5` 之后调用：新页要印 `affectedRows`／`writtenFields`／`m5Line`。
 *  #239：把命令原文一并交给回执页，进「复制日志」第 4 段（key 与 params 都在本处作用域里）。
 *  #175：把 `db` 也交给回执页——设置档案／设活动量那两页要读写后档案现值算性别与推荐活动量。 */
function profileReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  switch (key) {
    case 'calorie.profile.set':
    case 'calorie.profile.activity':
      return buildProfileSettingReceiptDoc(db, receipt, commandLine(key, params));
    case 'calorie.profile.update':
      return buildProfileUpdateReceiptDoc(receipt, commandLine(key, params));
    default:
      return null;
  }
}

/** 写分发（唯一出口 cmd_read 内调用；未知键上游已拦，此处再拦一道）。
 * #97 · M5：`affectedRows` 在此统一注入——写库前后各取一次 SQLite `total_changes()`，
 * 增量即「影响 N 行」（35 键单一来源，逐键不各自自报）。 */
export function dispatchWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (!isCalorieWriteKey(key)) fail(3, '未知 calorie 写键：' + key);
  const before = totalChanges(db);
  try {
    // #294 · 注册表先行：命中即走能力目录那道门；未命中的老键照旧落 dispatchInner 的 switch
    // （两条路各有断言，见 test/cmd-registry-294）。
    const spec = REGISTRY[key];
    const res = spec && spec.kind === 'write' ? spec.run(params, db) : dispatchInner(key, params, db);
    const receipt = withM5(res.data.receipt, { affectedRows: totalChanges(db) - before });
    return { data: { ...res.data, receipt }, html: profileReceiptDoc(key, params, receipt, db) ?? res.html };
  } catch (e) {
    if (e instanceof ValidationError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
}

function dispatchInner(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  switch (key) {
    case 'calorie.profile.set':
    case 'calorie.profile.update': {
      const isSet = key === 'calorie.profile.set';
      const scene = isSet ? '设置档案' : '改档案';
      const wake = isSet ? '设置档案' : '改档案';
      const picked: Record<string, unknown> = {};
      if (params['fields'] !== undefined) {
        const f = params['fields'];
        if (typeof f !== 'object' || f === null || Array.isArray(f)) fail(2, 'fields 须为对象');
        Object.assign(picked, f);
      } else if (params['field'] !== undefined) {
        picked[String(needStr(params, 'field'))] = params['value'];
      } else {
        for (const k of ['age', 'gender', 'heightCm', 'activityLevel', 'note'] as const) {
          if (params[k] !== undefined) picked[k] = params[k];
        }
      }
      for (const k of Object.keys(picked)) {
        if (!['age', 'gender', 'heightCm', 'activityLevel', 'note'].includes(k)) fail(2, '不支持字段: ' + k);
      }
      if (Object.keys(picked).length === 0) fail(2, '至少传 1 个档案字段');
      // #175 · 两条词分走各自的能力：`设置档案` 是单例 upsert（无行则建行），
      // `改档案` 只改已有档案（无行时按用户裁定报错，见 fetch/profile.ts 的空库守卫）。
      const r = isSet ? setProfile(db, picked) : updateProfile(db, picked);
      const after = r.after;
      return out(R(scene, 'update', '已' + scene + '（身高 ' + (after.height_cm ?? '—') + ' · 年龄 ' + (after.age ?? '—') + ' · 活动量 ' + (after.activity_level ?? '—') + '）', wake, 'user_profile (写库回执)', {
        recordId: 1, ids: [1], idSource: 'singleton', writtenFields: Object.keys(picked), noChange: r.changed.length === 0,
        // #179 · 改档案回执带逐字段对照（设置档案没有「改前」概念，items 保持空）。
        items: isSet ? [] : profileDiffItems(r.before, after, Object.keys(picked)),
      }));
    }
    case 'calorie.profile.activity': {
      const level = optStr(params, 'activityLevel') ?? optStr(params, 'level') ?? '';
      if (!level.trim()) fail(2, '缺参数 activityLevel');
      const r = setActivityLevel(db, level);
      return out(R('设活动量', 'update', '已设活动量：' + (r.before ?? '—') + '→' + r.after, '设活动量', 'user_profile (写库回执)', {
        recordId: 1, ids: [1], idSource: 'singleton', writtenFields: ['activityLevel'], noChange: r.before === r.after,
      }));
    }
    case 'calorie.goal.set': {
      const calorie = needNum(params, 'calorie');
      const protein = needNum(params, 'protein');
      const carbs = needNum(params, 'carbs');
      const fat = needNum(params, 'fat');
      const water = optNum(params, 'water');
      if (!(calorie > 0)) fail(2, '热量目标必须为正数');
      for (const [k, v] of [['protein', protein], ['carbs', carbs], ['fat', fat]] as const) {
        if (v < 0) fail(2, k + ' 不能为负');
      }
      if (water !== undefined && water < 0) fail(2, 'water 不能为负');
      const had = getNutritionGoal(db) !== null;
      const r = setNutritionGoal(db, { calorie, protein, carbs, fat, water });
      const tail = r.consistent ? ' · 宏量自洽' : ' · ⚠宏量换算差 ' + r.diffKcal + ' 卡（>50 建议复核）';
      return out(R('定营养目标', had ? 'update' : 'create', '已定营养目标：' + r.calorieGoal + ' 卡·蛋白 ' + r.proteinGoal + '·碳水 ' + r.carbsGoal + '·脂肪 ' + r.fatGoal + (r.waterGoal === null ? '' : '·饮水 ' + r.waterGoal) + tail, '定营养目标', 'daily_goal (写库回执)', {
        recordId: 1, ids: [1], idSource: 'singleton', writtenFields: goalSetWrittenFields(water !== undefined),
      }));
    }
    case 'calorie.goal.water': {
      const water = needNum(params, 'water');
      if (getNutritionGoal(db) === null) throw new CalorieRenderError('missing-data', '尚无营养目标行（先定营养目标）');
      const r = updateWaterGoal(db, water);
      return out(R('定饮水目标', 'update', '已定饮水目标：' + (r.oldWaterGoal ?? '—') + '→' + r.newWaterGoal + ' ml', '定饮水目标', 'daily_goal (写库回执)', {
        recordId: 1, ids: [1], idSource: 'singleton', writtenFields: ['water'], noChange: r.oldWaterGoal === r.newWaterGoal,
      }));
    }
    case 'calorie.goal.weight': {
      const kg = needNum(params, 'kg');
      if (!(kg > 0) || kg > 500) fail(2, 'kg 须为 0..500');
      const r = setWeightGoal(db, {
        kg, deadline: params['deadline'], startKg: params['startKg'], startDate: params['startDate'],
      });
      return out(R('定体重目标', 'update', '已定体重目标 ' + r.weightGoal + ' kg' + (r.deadline ? '（截止 ' + r.deadline + '）' : '') + (r.startKg !== null ? ' · 起点 ' + r.startKg + ' kg' : ''), '定体重目标', 'daily_goal (写库回执)', {
        recordId: 1, ids: [1], idSource: 'singleton',
        writtenFields: provided(params, ['kg', 'deadline', 'startKg', 'startDate']),
      }));
    }
    case 'calorie.goal.pause': {
      const r = pauseAllGoals(db);
      return out(R('暂停所有目标', 'update', '已暂停所有目标（记录照常，仅目标暂停）', '暂停所有目标', 'daily_goal (写库回执)', {
        recordId: r.id, ids: [r.id], idSource: 'singleton', writtenFields: ['goal_paused'],
      }));
    }
    case 'calorie.goal.resume': {
      const r = resumeAllGoals(db);
      return out(R('重启所有目标', 'update', '已重启所有目标（恢复正常）', '重启所有目标', 'daily_goal (写库回执)', {
        recordId: r.id, ids: [r.id], idSource: 'singleton', writtenFields: ['goal_paused'],
      }));
    }
    default:
      fail(3, '未知 calorie 写键：' + key);
      throw new Error('unreachable');
  }
}
