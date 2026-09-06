/** T4 #23 · plan_generator 取数+写数（对照老家 scripts/plan_generator.py）。
 *
 * 校验三硬止（动作库/器材/48h 间隔）+ 两软提示逐条对照；动作库默认空集
 * （老家 CATALOG 缺失即空集，同义），可注入。write 全量覆盖写（先清后插）。
 * 不 print，失败抛 FetchError；writePlan 有 errors 回 failed（老家同形状）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from './errors.js';

export const LEVEL_CONFIG: Record<string, { maxPerPartPerDay: number; maxPerPartPerWeek: number; restHours: number }> = {
  '新手': { maxPerPartPerDay: 6, maxPerPartPerWeek: 10, restHours: 72 },
  '中手': { maxPerPartPerDay: 10, maxPerPartPerWeek: 20, restHours: 48 },
  '老手': { maxPerPartPerDay: 99, maxPerPartPerWeek: 99, restHours: 48 },
};

export const EQUIPMENT_KEYWORDS: Record<string, string[]> = {
  '悍马机': ['悍马机', '悍马', '坐姿器械', '器械划船', '器械推胸'],
  '蝴蝶机': ['蝴蝶机'],
  '史密斯机': ['史密斯'],
  '哑铃': ['哑铃'],
  '杠铃': ['杠铃', '卧推', '划船', '硬拉', '深蹲'],
  '绳索': ['绳索', '龙门架'],
  '健腹轮': ['健腹轮'],
  '弹力带': ['弹力带'],
  '瑜伽垫': ['平板', '俯卧撑', '卷腹', '臀桥', '支撑'],
};

export function inferEquipment(movementName: string): string | null {
  for (const [equip, keywords] of Object.entries(EQUIPMENT_KEYWORDS)) {
    if (keywords.some((kw) => movementName.includes(kw))) return equip;
  }
  return null;
}

export interface PlanMovement {
  name?: string;
  part?: string;
  type?: string;
  sets?: unknown[];
}

export interface PlanSessionInput {
  session_label?: string;
  time_start?: string | null;
  time_end?: string | null;
  is_rest_day?: boolean;
  total_sets?: number | null;
  movements?: PlanMovement[];
}

export interface PlanDayInput {
  day_of_week?: number;
  sessions?: PlanSessionInput[];
}

export interface PlanWeekInput {
  week_number?: number;
  days?: PlanDayInput[];
}

export interface PlanInput {
  config?: { title?: string; description?: string; version?: string; start_date?: string; user_level?: string; available_equipment?: string[] };
  weeks?: PlanWeekInput[];
}

export interface PlanValidation {
  errors: string[];
  warnings: string[];
}

export function validatePlan(plan: PlanInput, opts: { catalog?: Iterable<string> } = {}): PlanValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const catalog = opts.catalog ? new Set(opts.catalog) : new Set<string>();
  const config = plan.config ?? {};
  const level = config.user_level ?? '中手';
  const availableEquip = config.available_equipment ?? [];
  const lvl = LEVEL_CONFIG[level] ?? LEVEL_CONFIG['中手'];
  const weeks = plan.weeks ?? [];
  if (weeks.length === 0) {
    errors.push('weeks 为空');
    return { errors, warnings };
  }
  const partDates = new Map<string, Array<[number, number]>>();
  const partDaySets = new Map<string, Map<string, number>>();
  for (const week of weeks) {
    const wn = week.week_number ?? 0;
    for (const day of week.days ?? []) {
      const dow = day.day_of_week ?? 0;
      for (const sess of day.sessions ?? []) {
        if (sess.is_rest_day) continue;
        for (const m of sess.movements ?? []) {
          const name = m.name ?? '';
          const p = m.part ?? '';
          if (catalog.size > 0 && !catalog.has(name)) errors.push('动作不在训记官方库：' + name);
          const equip = inferEquipment(name);
          if (equip && !availableEquip.includes(equip)) errors.push('缺少器材 ' + equip + '（动作：' + name + '）');
          const key = wn + ':' + dow;
          if (!partDaySets.has(key)) partDaySets.set(key, new Map());
          const per = partDaySets.get(key) as Map<string, number>;
          per.set(p, (per.get(p) ?? 0) + (m.sets ?? []).length);
          if (!partDates.has(p)) partDates.set(p, []);
          (partDates.get(p) as Array<[number, number]>).push([wn, dow]);
        }
      }
    }
  }
  const minDays = Math.max(Math.floor(lvl.restHours / 24), 2);
  for (const [p, occurrences] of partDates) {
    occurrences.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (let i = 1; i < occurrences.length; i++) {
      const prev = occurrences[i - 1] as [number, number];
      const curr = occurrences[i] as [number, number];
      const gap = (curr[0] - prev[0]) * 7 + (curr[1] - prev[1]);
      if (gap < minDays) errors.push('部位「' + p + '」间隔仅 ' + gap + ' 天，建议 ≥ ' + minDays + ' 天（第' + prev[0] + '周周' + prev[1] + ' → 第' + curr[0] + '周周' + curr[1] + '）');
    }
  }
  for (const [key, parts] of partDaySets) {
    const [wn, dow] = key.split(':');
    for (const [p, sets] of parts) {
      if (sets > lvl.maxPerPartPerDay) warnings.push('第' + wn + '周周' + dow + '·' + p + ' ' + sets + ' 组，建议 ≤ ' + lvl.maxPerPartPerDay + ' 组');
    }
  }
  for (const week of weeks) {
    const wn = week.week_number ?? 0;
    for (const day of week.days ?? []) {
      const dow = day.day_of_week ?? 0;
      const dayParts = new Map<string, string[]>();
      for (const sess of day.sessions ?? []) {
        if (sess.is_rest_day) continue;
        for (const m of sess.movements ?? []) {
          const p = m.part ?? '?';
          if (!dayParts.has(p)) dayParts.set(p, []);
          (dayParts.get(p) as string[]).push(m.type ?? '?');
        }
      }
      for (const [p, types] of dayParts) {
        if (types.length >= 2 && types.every((t) => t === types[0])) {
          warnings.push('第' + wn + '周周' + dow + '·' + p + ' 仅一种训练类型(' + types[0] + ')，建议增加不同角度');
        }
      }
    }
  }
  return { errors, warnings };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface WritePlanResult extends PlanValidation {
  insertedCount: number;
  totalWeeks?: number;
  status?: 'ok' | 'failed';
  dryRun?: true;
}

export function writePlan(db: DatabaseSync, plan: PlanInput, opts: { dryRun?: boolean; catalog?: Iterable<string> } = {}): WritePlanResult {
  const { errors, warnings } = validatePlan(plan, opts);
  if (opts.dryRun) return { errors, warnings, insertedCount: 0, dryRun: true };
  if (errors.length > 0) return { errors, warnings, insertedCount: 0, status: 'failed' };
  const config = plan.config ?? {};
  const weeks = plan.weeks ?? [];
  db.prepare('DELETE FROM workout_plan_config').run();
  db.prepare('INSERT INTO workout_plan_config (title, version, description, total_weeks, start_date) VALUES (?, ?, ?, ?, ?)').run(
    config.title ?? '', config.version ?? 'v1', config.description ?? '', weeks.length, config.start_date ?? todayISO(),
  );
  db.prepare('DELETE FROM workout_plans').run();
  let inserted = 0;
  for (const week of weeks) {
    const wn = week.week_number ?? 0;
    for (const day of week.days ?? []) {
      const dow = day.day_of_week ?? 0;
      (day.sessions ?? []).forEach((sess, idx) => {
        db.prepare(
          'INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements)' +
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          wn, dow, idx + 1, sess.session_label ?? '', sess.time_start ?? null, sess.time_end ?? null,
          sess.is_rest_day ? 1 : 0, sess.total_sets ?? null, JSON.stringify(sess.movements ?? []),
        );
        inserted += 1;
      });
    }
  }
  return { errors: [], warnings, insertedCount: inserted, totalWeeks: weeks.length, status: 'ok' };
}

export interface PlanConfigRow {
  title: string | null;
  version: string | null;
  description: string | null;
  total_weeks: number | null;
  start_date: string | null;
}

export interface PlanSessionRow {
  week_number: number;
  day_of_week: number;
  session_index: number;
  session_label: string;
  time_start: string | null;
  time_end: string | null;
  is_rest_day: number;
  total_sets: number | null;
  movements: PlanMovement[];
}

export function getPlan(db: DatabaseSync): { config: PlanConfigRow | null; sessions: PlanSessionRow[] } {
  const config = db
    .prepare('SELECT title, version, description, total_weeks, start_date FROM workout_plan_config WHERE id = 1')
    .get() as PlanConfigRow | undefined;
  const rows = db
    .prepare(
      'SELECT week_number, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements' +
        ' FROM workout_plans ORDER BY week_number, day_of_week, session_index',
    )
    .all() as Array<Omit<PlanSessionRow, 'movements'> & { movements: string }>;
  return {
    config: config ?? null,
    sessions: rows.map((r) => ({ ...r, movements: JSON.parse(r.movements || '[]') as PlanMovement[] })),
  };
}

const CONFIG_FIELDS = ['title', 'version', 'description', 'start_date'] as const;

export function updateConfig(db: DatabaseSync, fields: Partial<Record<(typeof CONFIG_FIELDS)[number], string>>): boolean {
  const keys = CONFIG_FIELDS.filter((k) => fields[k] !== undefined && fields[k] !== null);
  if (keys.length === 0) return false;
  const sets = keys.map((k) => k + ' = ?').join(', ');
  const upd = db
    .prepare('UPDATE workout_plan_config SET ' + sets + ', updated_at = CURRENT_TIMESTAMP WHERE id = 1')
    .run(...keys.map((k) => fields[k] as string));
  return Number(upd.changes) > 0;
}

export interface AddSessionInput {
  weekNumber: number;
  dayOfWeek: number;
  sessionLabel?: string;
  timeStart?: string | null;
  timeEnd?: string | null;
  isRestDay?: boolean;
  totalSets?: number | null;
  movements?: PlanMovement[];
}

export function addSession(db: DatabaseSync, s: AddSessionInput): { weekNumber: number; dayOfWeek: number; sessionIndex: number } {
  if (s.weekNumber === undefined || s.dayOfWeek === undefined) throw new FetchError('weekNumber/dayOfWeek 必填');
  const row = db
    .prepare('SELECT COALESCE(MAX(session_index), 0) + 1 AS si FROM workout_plans WHERE week_number = ? AND day_of_week = ?')
    .get(s.weekNumber, s.dayOfWeek) as { si: number };
  db.prepare(
    'INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements)' +
      ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    s.weekNumber, s.dayOfWeek, row.si, s.sessionLabel ?? '', s.timeStart ?? null, s.timeEnd ?? null,
    s.isRestDay ? 1 : 0, s.totalSets ?? null, JSON.stringify(s.movements ?? []),
  );
  return { weekNumber: s.weekNumber, dayOfWeek: s.dayOfWeek, sessionIndex: row.si };
}

const SESSION_FIELDS = ['session_label', 'time_start', 'time_end', 'is_rest_day', 'total_sets', 'movements'] as const;

export function updateSession(
  db: DatabaseSync, wn: number, dow: number, si: number,
  fields: Partial<{ sessionLabel: string; timeStart: string | null; timeEnd: string | null; isRestDay: boolean; totalSets: number | null; movements: PlanMovement[] }>,
): boolean {
  const map: Record<string, unknown> = {};
  if (fields.sessionLabel !== undefined && fields.sessionLabel !== null) map.session_label = fields.sessionLabel;
  if (fields.timeStart !== undefined) map.time_start = fields.timeStart;
  if (fields.timeEnd !== undefined) map.time_end = fields.timeEnd;
  if (fields.isRestDay !== undefined) map.is_rest_day = fields.isRestDay ? 1 : 0;
  if (fields.totalSets !== undefined) map.total_sets = fields.totalSets;
  if (fields.movements !== undefined) map.movements = JSON.stringify(fields.movements);
  const keys = SESSION_FIELDS.filter((k) => map[k] !== undefined);
  if (keys.length === 0) return false;
  const upd = db
    .prepare('UPDATE workout_plans SET ' + keys.map((k) => k + ' = ?').join(', ') + ', updated_at = CURRENT_TIMESTAMP WHERE week_number = ? AND day_of_week = ? AND session_index = ?')
    .run(...keys.map((k) => map[k] as string | number | null), wn, dow, si);
  return Number(upd.changes) > 0;
}

export function deleteSession(db: DatabaseSync, wn: number, dow: number, si: number): boolean {
  const upd = db
    .prepare('DELETE FROM workout_plans WHERE week_number = ? AND day_of_week = ? AND session_index = ?')
    .run(wn, dow, si);
  return Number(upd.changes) > 0;
}

export function copyWeek(db: DatabaseSync, fromWn: number, toWn: number): { copiedRows: number; fromWeek: number; toWeek: number } {
  db.prepare('DELETE FROM workout_plans WHERE week_number = ?').run(toWn);
  const ins = db
    .prepare(
      'INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements)' +
        ' SELECT ?, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements FROM workout_plans WHERE week_number = ?',
    )
    .run(toWn, fromWn);
  db.prepare('UPDATE workout_plan_config SET total_weeks = MAX(total_weeks, ?) WHERE id = 1').run(toWn);
  return { copiedRows: Number(ins.changes), fromWeek: fromWn, toWeek: toWn };
}

export function deleteWeek(db: DatabaseSync, wn: number): { deletedWeek: number } {
  db.prepare('DELETE FROM workout_plans WHERE week_number = ?').run(wn);
  db.prepare('UPDATE workout_plans SET week_number = week_number - 1 WHERE week_number > ?').run(wn);
  db.prepare('UPDATE workout_plan_config SET total_weeks = total_weeks - 1 WHERE id = 1 AND total_weeks > 1').run();
  return { deletedWeek: wn };
}

export function insertWeek(db: DatabaseSync, wn: number): { insertedAtWeek: number } {
  db.prepare('UPDATE workout_plans SET week_number = week_number + 1 WHERE week_number >= ?').run(wn);
  db.prepare('UPDATE workout_plan_config SET total_weeks = total_weeks + 1 WHERE id = 1').run();
  return { insertedAtWeek: wn };
}

export function deletePlan(db: DatabaseSync): { deletedConfig: PlanConfigRow; deletedRows: number; planSummary: PlanConfigRow } {
  const cfg = db
    .prepare('SELECT title, total_weeks, start_date FROM workout_plan_config WHERE id = 1')
    .get() as { title: string | null; total_weeks: number | null; start_date: string | null } | undefined;
  const summary: PlanConfigRow = { title: cfg?.title ?? null, version: null, description: null, total_weeks: cfg?.total_weeks ?? null, start_date: cfg?.start_date ?? null };
  const cnt = db.prepare('SELECT COUNT(*) AS n FROM workout_plans').get() as { n: number };
  db.prepare('DELETE FROM workout_plans').run();
  db.prepare('DELETE FROM workout_plan_config').run();
  return { deletedConfig: summary, deletedRows: cnt.n, planSummary: summary };
}

export function copyPlan(db: DatabaseSync, newTitle?: string): { newTitle: string | null; totalWeeks: number; copiedRows: number } {
  const cfg = db
    .prepare('SELECT title, version, description, total_weeks, start_date FROM workout_plan_config WHERE id = 1')
    .get() as (PlanConfigRow & { title: string | null }) | undefined;
  if (!cfg) return { newTitle: null, totalWeeks: 0, copiedRows: 0 };
  const title = newTitle ?? ((cfg.title ?? '健身计划') + ' 副本');
  const rows = db
    .prepare(
      'SELECT week_number, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements' +
        ' FROM workout_plans ORDER BY week_number, day_of_week, session_index',
    )
    .all() as Array<{ week_number: number; day_of_week: number; session_index: number; session_label: string; time_start: string | null; time_end: string | null; is_rest_day: number; total_sets: number | null; movements: string }>;
  db.prepare('DELETE FROM workout_plans').run();
  db.prepare('DELETE FROM workout_plan_config').run();
  db.prepare('INSERT INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, ?, ?, ?, ?, ?)').run(
    title, cfg.version ?? 'v1', cfg.description ?? '', cfg.total_weeks, cfg.start_date,
  );
  for (const r of rows) {
    db.prepare(
      'INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements)' +
        ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(r.week_number, r.day_of_week, r.session_index, r.session_label, r.time_start, r.time_end, r.is_rest_day, r.total_sets, r.movements);
  }
  return { newTitle: title, totalWeeks: cfg.total_weeks ?? 0, copiedRows: rows.length };
}

export function deleteDay(db: DatabaseSync, wn: number, dow: number): { weekNumber: number; dayOfWeek: number; deletedSessions: number; snapshot: Array<{ sessionIndex: number; sessionLabel: string }>; deleted: number } {
  const rows = db
    .prepare('SELECT session_index, session_label FROM workout_plans WHERE week_number = ? AND day_of_week = ? ORDER BY session_index')
    .all(wn, dow) as Array<{ session_index: number; session_label: string }>;
  const snapshot = rows.map((r) => ({ sessionIndex: r.session_index, sessionLabel: r.session_label }));
  const upd = db.prepare('DELETE FROM workout_plans WHERE week_number = ? AND day_of_week = ?').run(wn, dow);
  return { weekNumber: wn, dayOfWeek: dow, deletedSessions: snapshot.length, snapshot, deleted: Number(upd.changes) };
}
