/** #40 · user_profile 读+写（对照老家 profile 系 CLI：--live-profile-set / --live-profile-activity / --live-profile-update）。
 *
 * 单例行 id=1（INSERT OR IGNORE 兜底，老家无行 UPDATE 0 行语义收敛为显式可运行）。
 * activity_level 值域沿 kcal.ts ACTIVITY_LEVELS（老家 #19A 英文字典）；中文别名（久坐/轻度/中度/活跃/高度活跃）
 * 为触发词语义归一，入库前转英文。gender 归一男/女→male/female（BMI 等读路径沿用英文）。
 * 失败抛 FetchError（缺失阻断不返空），不 print（打印归 CLI 唯一出口）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { ACTIVITY_LEVELS } from '../kcal.js';
import type { ActivityLevel } from '../kcal.js';
import { FetchError } from './errors.js';

export interface ProfileRow {
  id: number;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  note: string | null;
  activity_level: string | null;
  /** 库内原值（SQLite `CURRENT_TIMESTAMP`，UTC）；#177 起看档案结果页要显示这两列。 */
  created_at: string | null;
  updated_at: string | null;
}

export const ACTIVITY_ALIASES: Record<string, ActivityLevel> = {
  '久坐': 'sedentary',
  '轻度': 'light',
  '中度': 'moderate',
  '活跃': 'active',
  '高度活跃': 'very_active',
};

export function normalizeActivityLevel(v: unknown): ActivityLevel {
  const s = String(v ?? '').trim();
  if ((ACTIVITY_LEVELS as readonly string[]).includes(s)) return s as ActivityLevel;
  const hit = ACTIVITY_ALIASES[s];
  if (hit) return hit;
  throw new FetchError('activity_level 非法：' + JSON.stringify(s) + '（英文 ' + ACTIVITY_LEVELS.join('/') + ' 或中文 久坐/轻度/中度/活跃/高度活跃）');
}

export function normalizeGender(v: unknown): string {
  const s = String(v ?? '').trim();
  if (s === 'male' || s === 'female') return s;
  if (s === '男') return 'male';
  if (s === '女') return 'female';
  throw new FetchError('gender 非法：' + JSON.stringify(s) + '（male/female 或 男/女）');
}

function toAge(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  if (!Number.isInteger(n) || n < 1 || n > 130) throw new FetchError('age 非法：' + JSON.stringify(v) + '（须 1..130 整数）');
  return n;
}

function toHeightCm(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  if (!Number.isFinite(n) || n < 50 || n > 250) throw new FetchError('heightCm 非法：' + JSON.stringify(v) + '（须 50..250）');
  return n;
}

export function getProfile(db: DatabaseSync): ProfileRow | null {
  const row = db.prepare(
    'SELECT id, age, gender, height_cm, note, activity_level, created_at, updated_at FROM user_profile WHERE id = 1',
  ).get() as ProfileRow | undefined;
  return row ?? null;
}

export interface SetProfileInput {
  age?: unknown;
  gender?: unknown;
  heightCm?: unknown;
  activityLevel?: unknown;
  note?: unknown;
}

function normalizedPatch(input: SetProfileInput): { age?: number | null; gender?: string | null; height_cm?: number | null; activity_level?: string | null; note?: string | null } {
  const patch: { age?: number | null; gender?: string | null; height_cm?: number | null; activity_level?: string | null; note?: string | null } = {};
  if (input.age !== undefined) patch.age = input.age === null ? null : toAge(input.age);
  if (input.gender !== undefined) patch.gender = input.gender === null ? null : normalizeGender(input.gender);
  if (input.heightCm !== undefined) patch.height_cm = input.heightCm === null ? null : toHeightCm(input.heightCm);
  if (input.activityLevel !== undefined) patch.activity_level = input.activityLevel === null ? null : normalizeActivityLevel(input.activityLevel);
  if (input.note !== undefined) patch.note = input.note === null ? null : String(input.note);
  return patch;
}

function ensureRow(db: DatabaseSync): void {
  db.prepare('INSERT OR IGNORE INTO user_profile (id) VALUES (1)').run();
}

/** 档案的 CLI 参数名 ↔ 库列名（这份对照由本能力独占：写库的字段集合与「这次改了什么」都据它判）。 */
const PROFILE_COLUMNS: Record<string, keyof ProfileRow> = {
  age: 'age', gender: 'gender', heightCm: 'height_cm', activityLevel: 'activity_level', note: 'note',
};

/** 本次请求的字段里，值真的变了的那些（按 CLI 参数名报，与回执的 `writtenFields` 同口径）。
 *  库内 NULL 与请求里的 NULL 视为同一个值；没传的字段不算（那些列一个字都没动）。 */
function changedFields(before: ProfileRow | null, after: ProfileRow, camels: readonly string[]): string[] {
  return camels.filter((k) => {
    const col = PROFILE_COLUMNS[k];
    return col === undefined ? false : (before?.[col] ?? null) !== (after[col] ?? null);
  });
}

/** 设置档案（单例 upsert：无行则建行，有行则改；至少 1 个字段，否则缺失阻断）。
 *  返回值多一个 `changed`（＝本次真的变了的字段，按 CLI 参数名），回执的「无实际变化」据它判。 */
export function setProfile(db: DatabaseSync, input: SetProfileInput): { before: ProfileRow | null; after: ProfileRow; changed: string[] } {
  const inputRec = input as Record<string, unknown>;
  const camels = Object.keys(inputRec).filter((k) => inputRec[k] !== undefined);
  const patch = normalizedPatch(input);
  const keys = Object.keys(patch);
  if (keys.length === 0) throw new FetchError('至少传 1 个档案字段（age/gender/heightCm/activityLevel/note）');
  const before = getProfile(db);
  ensureRow(db);
  const sets = keys.map((k) => k + ' = ?').join(', ');
  const vals = keys.map((k) => patch[k as keyof typeof patch] ?? null);
  db.prepare('UPDATE user_profile SET ' + sets + ", updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(...vals);
  const after = getProfile(db);
  if (!after) throw new FetchError('set 后 user_profile#1 缺失');
  return { before, after, changed: changedFields(before, after, camels) };
}

/** 单独设活动量（--live-profile-activity 对照）。
 *
 * **空库守卫（2026-09-12 · 与「改档案」同一条裁定的第一性原理延伸）**：活动量是档案的一个字段，
 * 「设」＝改已有档案的那个字段——无档案时抛 `FetchError`（CLI exit 4、不落盘、不建行），不再 `ensureRow` 建行后更新。
 * 三条理由：① 创建档案只许一条路（`setProfile`／设置档案，它一次收身高/年龄/性别/活动量）；
 * 这里若能把行建出来，库里就会出现「只填了活动量」的半份档案，下游 TDEE 一律算不出（`nutritionGoal` 会缺身高/年龄/性别）；
 * ② 回执会写「已设活动量：—→active」，凭空一个改前值——正是改档案那条缺陷的同型；
 * ③ 守卫住能力层：两个函数都能创建同一行＝同一件事有两个定义（铁律二）。
 * 校验次序：先判值合法（坏值 exit 4，既有口径），再判档案在不在（缺失阻断 exit 4）。 */
export function setActivityLevel(db: DatabaseSync, activityLevel: unknown): { before: string | null; after: string } {
  if (activityLevel === undefined || activityLevel === null || String(activityLevel).trim() === '') {
    throw new FetchError('activityLevel 必填');
  }
  const norm = normalizeActivityLevel(activityLevel);
  const row = getProfile(db);
  if (!row) throw new FetchError('尚无档案（先设置档案，再设活动量）');
  const before = row.activity_level ?? null;
  db.prepare('UPDATE user_profile SET activity_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(norm);
  return { before, after: norm };
}

export const PROFILE_UPDATABLE = ['age', 'gender', 'heightCm', 'activityLevel', 'note'] as const;

/** 改档案（--live-profile-update 对照：field+value 单字段或 fields 多字段）。
 *
 * **空库守卫（#175 · 用户 2026-09-11 裁定：档案不存在时报错即可、不做特殊兜底）**：
 * 「改」在语义上以「已有一份档案」为前提——无行时抛 `FetchError`（CLI 映射 exit 4、不落盘），
 * 不再走 `setProfile` 的 `INSERT OR IGNORE` 建行后更新。理由是那样会出一份「改前 → 改后」、
 * 而改前根本无值的回执，等于替用户编一个改前值。守卫住**能力层**而非命令分派处：
 * 这是「改」自己的能力前置条件，住在分派处只保护 CLI 这一个调用方。
 * 校验次序：先查字段合法（坏参 exit 2），再查档案在不在（缺失阻断 exit 4）——参数错比状态缺失更好指出。
 * 「设置档案」不走这里：它是单例 upsert（无行则建行），走 `setProfile`。 */
export function updateProfile(db: DatabaseSync, fields: Record<string, unknown>): { before: ProfileRow | null; after: ProfileRow; changed: string[] } {
  const bad = Object.keys(fields).filter((k) => !(PROFILE_UPDATABLE as readonly string[]).includes(k));
  if (bad.length) throw new FetchError('不支持字段: ' + bad.join(', ') + '；支持: ' + PROFILE_UPDATABLE.join(', '));
  if (!Object.keys(fields).length) throw new FetchError('至少传 1 个字段');
  if (!getProfile(db)) throw new FetchError('尚无档案（先设置档案，再改）');
  return setProfile(db, fields as SetProfileInput);
}
