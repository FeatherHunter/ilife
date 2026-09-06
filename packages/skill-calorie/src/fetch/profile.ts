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
  const row = db.prepare('SELECT id, age, gender, height_cm, note, activity_level FROM user_profile WHERE id = 1').get() as
    | ProfileRow
    | undefined;
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

/** 设置档案（单例 upsert；至少 1 个字段，否则缺失阻断）。 */
export function setProfile(db: DatabaseSync, input: SetProfileInput): { before: ProfileRow | null; after: ProfileRow } {
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
  return { before, after };
}

/** 单独设活动量（--live-profile-activity 对照）。 */
export function setActivityLevel(db: DatabaseSync, activityLevel: unknown): { before: string | null; after: string } {
  if (activityLevel === undefined || activityLevel === null || String(activityLevel).trim() === '') {
    throw new FetchError('activityLevel 必填');
  }
  const norm = normalizeActivityLevel(activityLevel);
  const before = getProfile(db)?.activity_level ?? null;
  ensureRow(db);
  db.prepare('UPDATE user_profile SET activity_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(norm);
  return { before, after: norm };
}

export const PROFILE_UPDATABLE = ['age', 'gender', 'heightCm', 'activityLevel', 'note'] as const;

/** 改档案（--live-profile-update 对照：field+value 单字段或 fields 多字段）。 */
export function updateProfile(db: DatabaseSync, fields: Record<string, unknown>): { before: ProfileRow | null; after: ProfileRow; changed: string[] } {
  const bad = Object.keys(fields).filter((k) => !(PROFILE_UPDATABLE as readonly string[]).includes(k));
  if (bad.length) throw new FetchError('不支持字段: ' + bad.join(', ') + '；支持: ' + PROFILE_UPDATABLE.join(', '));
  if (!Object.keys(fields).length) throw new FetchError('至少传 1 个字段');
  const before = getProfile(db);
  const { after } = setProfile(db, fields as SetProfileInput);
  const changed = Object.keys(fields).filter((k) => {
    const col = k === 'heightCm' ? 'height_cm' : k === 'activityLevel' ? 'activity_level' : k;
    return (before as unknown as Record<string, unknown> | null)?.[col] !== (after as unknown as Record<string, unknown>)[col];
  });
  return { before, after, changed };
}
