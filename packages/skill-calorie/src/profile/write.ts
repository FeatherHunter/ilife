/** 基础信息（HELP 场景 07「基础信息」· 子功能「设置资料」「改资料」）· **写命令入口**。
 *
 * #318 · 从 `src/cli/write.ts` 的 `case 'calorie.profile.*'` 三条搬出：逻辑一字未动，只换住处。
 * 三条一律 receipt 形；`affectedRows` 仍由 `dispatchWrite` 统一注入（本件不自报）。
 * 整页回执（设置档案／设活动量／改档案）的装配函数由本目录 `setup.ts`／`update.ts` 提供，
 * 分派层经本目录的门 `index.ts` 取用（#318 起的对外面）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { setActivityLevel, setProfile, updateProfile } from '../fetch/profile.js';
import type { ProfileRow } from '../fetch/profile.js';
import type { CrudReceipt } from '../render/receipt.js';
import { fail, needStr, optStr } from '../shared/params.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { R, out } from '../shared/writeParts.js';

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

/** 设置档案／改档案的公共体：`isSet` 决定走单例 upsert 还是只改已有档案（无行时按用户裁定报错）。 */
function profileUpsert(isSet: boolean, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
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

/** `calorie.profile.set` · 设置档案（身高／年龄／性别／活动量／备注，单例 upsert）。 */
export function writeProfileSet(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  return profileUpsert(true, params, db);
}

/** `calorie.profile.update` · 改档案（只改已有档案，逐字段对照）。 */
export function writeProfileUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  return profileUpsert(false, params, db);
}

/** `calorie.profile.activity` · 设活动量（单独一条词；不动其他档案字段）。 */
export function writeProfileActivity(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const level = optStr(params, 'activityLevel') ?? optStr(params, 'level') ?? '';
  if (!level.trim()) fail(2, '缺参数 activityLevel');
  const r = setActivityLevel(db, level);
  return out(R('设活动量', 'update', '已设活动量：' + (r.before ?? '—') + '→' + r.after, '设活动量', 'user_profile (写库回执)', {
    recordId: 1, ids: [1], idSource: 'singleton', writtenFields: ['activityLevel'], noChange: r.before === r.after,
  }));
}
