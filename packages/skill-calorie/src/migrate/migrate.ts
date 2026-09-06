/** T12 #38 · 老库到新 schema 的一次性迁移（只读复制件 → 写新库）。
 *
 * 对照：
 * - 老家 D:/2Study/StudyNotes/SKILLS/卡路里/scripts/db.py（只读对照，不跑不动 Python）：
 *   13 表 = 11 终态 + body_composition_new/_mig 历史重建临时表；entries→food_log 合并；
 *   sleep_records/fitness_goals 删除；intensity（中文低中高）→ difficulty 回填。
 * - T1 #20 终态 schema（packages/skill-calorie/src/schema.ts TABLE_DDLS 11 表 +
 *   applyMigrations 收敛单线，口径以现行代码为准）。
 * - 关键口径取数以现行代码为准：总热量排除饮水（analysis/series.ts WATER_NAME +
 *   fetch/diet.ts WATER_NAME，render/diet.ts 同口径）；体重 COUNT+SUM（fetch/weight.ts
 *   weight_log）；照片 COUNT（fetch/photos.ts body_photos）。
 *
 * 原则：
 * - 只读 src（DatabaseSync readOnly 打开，从不对其 exec 写；前后 stat 大小/mtime 记入报告）。
 * - 只写 dst（assertWritablePath 守卫：非 tmp 须 CALORIE_FORCE_PROD=1，真实 DB 零触碰）。
 * - 幂等可重跑：dst 侧每表先 DELETE 再按“基表→_new→_mig→entries”确定序重插，id 尽量保留，
 *   碰撞则顺序分配新 id（确定性），重跑结果一致。
 * - 三代收敛宁可多记不可丢：body_photos/measurements/composition 的 _new/_mig 行全部收敛进终态表；
 *   仅 workout_plans 受 UNIQUE(week,day,session) 约束去重（保留最小 id，冲突记入报告，回滚说明列出）。
 * - 失败回滚：dst 写全程包在单个 IMMEDIATE 事务里（含复制 + applyMigrations 回填 + 对账），
 *   对账不一致或任何异常即 ROLLBACK，dst 文件恢复到打开前状态（新文件则仅剩空 schema），见 MIGRATE_ROLLBACK.md。
 * - 缺失阻断不返空：src 缺失/空库（11 表全无）、dst 不可写、行数/口径对不上，一律抛错不返空报告。
 * - 面板/定时/外联动 out of scope：本模块只做表复制 + 对账，不碰任何渲染/定时/跨技能。
 */
import { mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { applyMigrations, initDb, TABLE_DDLS } from '../schema.js';
import { assertWritablePath } from '../paths.js';

const WATER_NAME = '💧水';

export const FINAL_TABLES: readonly string[] = Object.freeze(Object.keys(TABLE_DDLS));

/** 复制顺序：nutrition_products 先行（food_log 钠糖纤维回填依赖它），其余按终态表序。 */
const COPY_ORDER: readonly string[] = Object.freeze([
  'nutrition_products',
  'food_log',
  'daily_goal',
  'exercise_log',
  'weight_log',
  'workout_plan_config',
  'workout_plans',
  'body_photos',
  'user_profile',
  'body_composition',
  'body_measurements',
]);

const BODY_FAMILIES = new Set(['body_photos', 'body_measurements', 'body_composition']);
const LEGACY_SUFFIXES = ['_new', '_mig'] as const;
/** food 另收 entries（老家 2026-07-12 改名残留，见 schema.ts M1）。 */
const FOOD_SOURCES = ['food_log', 'entries'] as const;

export class MigrateMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrateMissingError';
  }
}

export class MigrateVerifyError extends Error {
  readonly report: MigrateReport;
  constructor(message: string, report: MigrateReport) {
    super(message);
    this.name = 'MigrateVerifyError';
    this.report = report;
  }
}

export interface TableReconcile {
  table: string;
  /** 每个物理来源表的行数（含不存在表记 0 且列出）。 */
  srcRaw: Record<string, number>;
  /** 收敛后期望落终态的行数（workout_plans 为去重后）。 */
  srcConverged: number;
  dst: number;
  ok: boolean;
  skippedUnique?: number;
}

export interface CaliberCheck {
  label: string;
  src: number;
  dst: number;
  ok: boolean;
}

export interface IdRemap {
  table: string;
  fromTable: string;
  oldId: number;
  newId: number;
}

export interface UniqueConflict {
  table: string;
  key: string;
  keptId: number;
  droppedId: number;
  fromTable: string;
}

export interface MigrateReport {
  src: string;
  dst: string;
  srcStatBefore: { size: number; mtimeMs: number };
  srcStatAfter: { size: number; mtimeMs: number };
  srcReadOnly: boolean;
  tables: TableReconcile[];
  calibers: {
    kcalExclWater: CaliberCheck;
    weightCount: CaliberCheck;
    weightSum: CaliberCheck;
    photoCount: CaliberCheck;
  };
  remapped: IdRemap[];
  uniqueConflicts: UniqueConflict[];
  warnings: string[];
  ok: boolean;
}

export function assertNodeEngines(): void {
  const parts = process.versions.node.split('.').map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  if (!(major > 22 || (major === 22 && minor >= 13))) {
    throw new MigrateMissingError('node 低于 22.13：' + process.versions.node + '（铁律 engines>=22.13）');
  }
}

export function intensityToDifficulty(v: unknown): string | null {
  if (v === '低') return 'easy';
  if (v === '中') return 'normal';
  if (v === '高') return 'hard';
  return null;
}

function listTables(db: DatabaseSync): Set<string> {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function tableCols(db: DatabaseSync, table: string): string[] {
  const rows = db.prepare('PRAGMA table_info(' + table + ')').all() as { name: string }[];
  return rows.map((r) => r.name);
}

function countRows(db: DatabaseSync, table: string): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM ' + table).get() as { n: number };
  return row.n;
}

function srcCandidates(table: string): string[] {
  // 通用收敛：任何终态表若残留 _new/_mig 同名表（一键回归/崩溃中断），一律收敛；
  // food 另收 entries（老家改名残留）。BODY_FAMILIES 仅用于文档分组，逻辑全表通用。
  void BODY_FAMILIES;
  if (table === 'food_log') return [...FOOD_SOURCES, ...LEGACY_SUFFIXES.map((s) => table + s)];
  return [table, ...LEGACY_SUFFIXES.map((s) => table + s)];
}

function openSrcReadOnly(srcPath: string): { db: DatabaseSync; readOnly: boolean } {
  try {
    const db = new DatabaseSync(srcPath, { readOnly: true } as unknown as Record<string, unknown> as never);
    return { db, readOnly: true };
  } catch {
    // 极老 Node 无 readOnly 选项时降级：本模块仍只发 SELECT/PRAGMA，从不写 src。
    const db = new DatabaseSync(srcPath);
    return { db, readOnly: false };
  }
}

function sumKcalExclWater(db: DatabaseSync, tables: Set<string>, candidates: string[]): number {
  const live = candidates.filter((t) => tables.has(t));
  if (live.length === 0) return 0;
  const union = live.map((t) => 'SELECT calories, food_name FROM ' + t).join(' UNION ALL ');
  const row = db
    .prepare('SELECT COALESCE(SUM(calories),0) AS s FROM (' + union + ") WHERE food_name != '" + WATER_NAME + "'")
    .get() as { s: number };
  return row.s;
}

function sumWeight(db: DatabaseSync, tables: Set<string>): { n: number; sum: number } {
  if (!tables.has('weight_log')) return { n: 0, sum: 0 };
  const row = db
    .prepare('SELECT COUNT(*) AS n, COALESCE(SUM(weight_kg),0) AS s FROM weight_log')
    .get() as { n: number; s: number };
  return { n: row.n, sum: row.s };
}

function countPhotosConverged(db: DatabaseSync, tables: Set<string>): number {
  const live = srcCandidates('body_photos').filter((t) => tables.has(t));
  if (live.length === 0) return 0;
  const union = live.map((t) => 'SELECT id FROM ' + t).join(' UNION ALL ');
  const row = db.prepare('SELECT COUNT(*) AS n FROM (' + union + ')').get() as { n: number };
  return row.n;
}

export interface MigrateOptions {
  /** 允许覆盖已存在的 dst 文件（默认 true：幂等重跑即覆盖语义；设 false 则存在即抛）。 */
  allowOverwrite?: boolean;
}

export function migrateCalorieDb(srcPath: string, dstPath: string, opts: MigrateOptions = {}): MigrateReport {
  assertNodeEngines();
  if (!srcPath) throw new MigrateMissingError('缺 --src（老库复制件路径必填，不返空）');
  if (!dstPath) throw new MigrateMissingError('缺 --dst（新库路径必填，不返空）');
  const srcAbs = resolve(srcPath);
  const dstAbs = resolve(dstPath);
  if (srcAbs === dstAbs) throw new MigrateMissingError('src 与 dst 不能是同一文件（防覆盖老库复制件）');
  let srcStat: { size: number; mtimeMs: number };
  try {
    const st = statSync(srcAbs);
    if (!st.isFile()) throw new Error('非文件');
    srcStat = { size: st.size, mtimeMs: st.mtimeMs };
  } catch {
    throw new MigrateMissingError('src 不存在或不可读：' + srcAbs);
  }
  // dst 写守卫：非 tmp 须 CALORIE_FORCE_PROD=1（真实 DB 零触碰，见 paths.ts）。
  assertWritablePath(dstAbs);
  if (opts.allowOverwrite === false) {
    try {
      statSync(dstAbs);
      throw new MigrateMissingError('dst 已存在且 allowOverwrite=false：' + dstAbs);
    } catch (e) {
      if (e instanceof MigrateMissingError) throw e;
    }
  }
  mkdirSync(dirname(dstAbs), { recursive: true });

  const { db: src, readOnly } = openSrcReadOnly(srcAbs);
  try {
    const srcTables = listTables(src);
    const hasAnyFinal = [...FINAL_TABLES, 'entries'].some((t) => srcTables.has(t));
    if (!hasAnyFinal) {
      throw new MigrateMissingError('src 空库：11 终态表与 entries 全无（' + srcAbs + '），拒绝返空报告');
    }

    // 先收集 src 期望口径（事务外只读快照，用于事务内对账）。
    const expectedCounts = new Map<string, { raw: Record<string, number>; convergedRows: Record<string, unknown>[]; converged: number }>();
    for (const table of COPY_ORDER) {
      const raw: Record<string, number> = {};
      const rows: Record<string, unknown>[] = [];
      for (const cand of srcCandidates(table)) {
        if (!srcTables.has(cand)) {
          raw[cand] = 0;
          continue;
        }
        const n = countRows(src, cand);
        raw[cand] = n;
        if (n === 0) continue;
        const got = src.prepare('SELECT * FROM ' + cand).all() as Record<string, unknown>[];
        for (const r of got) (r as Record<string, unknown>).__srcTable = cand;
        rows.push(...got);
      }
      expectedCounts.set(table, { raw, convergedRows: rows, converged: rows.length });
    }
    const srcKcal = sumKcalExclWater(src, srcTables, [...FOOD_SOURCES]);
    const srcWeight = sumWeight(src, srcTables);
    const srcPhotos = countPhotosConverged(src, srcTables);

    const dst = new DatabaseSync(dstAbs);
    try {
      initDb(dst);
      const dstTables = listTables(dst);
      for (const t of COPY_ORDER) {
        if (!dstTables.has(t)) throw new Error('dst 缺终态表：' + t);
      }

      const remapped: IdRemap[] = [];
      const uniqueConflicts: UniqueConflict[] = [];
      const warnings: string[] = [];
      if (!readOnly) warnings.push('src 未能以 readOnly 打开（Node 选项缺失），本脚本仍只发 SELECT/PRAGMA，未写 src；详见报告 srcReadOnly=false');

      dst.exec('BEGIN IMMEDIATE');
      try {
        for (const table of COPY_ORDER) {
          const dstCols = tableCols(dst, table);
          const dstSet = new Set(dstCols);
          dst.exec('DELETE FROM ' + table);
          const bucket = expectedCounts.get(table);
          const rows = bucket?.convergedRows ?? [];
          if (rows.length === 0) continue;
          // 确定序：基表先、_new 次、_mig 末、entries 末；同表内按 id 升序（NULL 末）。
          const orderOf = (cand: string): number => {
            if (cand === table) return 0;
            if (cand === table + '_new') return 1;
            if (cand === table + '_mig') return 2;
            return 3;
          };
          rows.sort((a, b) => {
            const oa = orderOf(String(a.__srcTable));
            const ob = orderOf(String(b.__srcTable));
            if (oa !== ob) return oa - ob;
            const ia = typeof a.id === 'number' ? (a.id as number) : Number.MAX_SAFE_INTEGER;
            const ib = typeof b.id === 'number' ? (b.id as number) : Number.MAX_SAFE_INTEGER;
            return ia - ib;
          });
          const usedIds = new Set<number>();
          let maxId = 0;
          for (const r of rows) {
            if (typeof r.id === 'number' && Number.isInteger(r.id)) maxId = Math.max(maxId, r.id as number);
          }
          let nextId = maxId;
          const usedUnique = new Set<string>();
          const srcColsPerTable = new Map<string, Set<string>>();
          for (const cand of srcCandidates(table)) {
            if (!srcTables.has(cand)) continue;
            srcColsPerTable.set(cand, new Set(tableCols(src, cand)));
          }
          for (const r of rows) {
            const cand = String(r.__srcTable);
            const srcSet = srcColsPerTable.get(cand) ?? new Set<string>();
            const cols = dstCols.filter((c) => srcSet.has(c) && c !== 'intensity' && r[c] !== undefined);
            // exercise 特殊：intensity→difficulty 一次性回填（T1 M5 口径）。
            const out: Record<string, unknown> = {};
            for (const c of cols) out[c] = r[c];
            if (table === 'exercise_log' && dstSet.has('difficulty')) {
              const hasDiff = srcSet.has('difficulty') ? r.difficulty : undefined;
              if ((hasDiff === null || hasDiff === undefined) && srcSet.has('intensity')) {
                const mapped = intensityToDifficulty(r.intensity);
                if (mapped !== null) out.difficulty = mapped;
              }
            }
            // id 碰撞（跨世代同 id 不同行）→ 分配新 id，宁可多记不可丢。
            if (out.id !== undefined && out.id !== null) {
              const idNum = Number(out.id);
              if (usedIds.has(idNum)) {
                nextId += 1;
                remapped.push({ table, fromTable: cand, oldId: idNum, newId: nextId });
                out.id = nextId;
                usedIds.add(nextId);
              } else {
                usedIds.add(idNum);
              }
            }
            // workout_plans 唯一键去重（保留最小 id，冲突记入报告）。
            if (table === 'workout_plans') {
              const key = String(out.week_number) + '|' + String(out.day_of_week) + '|' + String(out.session_index);
              if (usedUnique.has(key)) {
                uniqueConflicts.push({
                  table,
                  key,
                  keptId: Number.NaN,
                  droppedId: typeof out.id === 'number' ? (out.id as number) : -1,
                  fromTable: cand,
                });
                continue;
              }
              usedUnique.add(key);
            }
            const keys = Object.keys(out).filter((k) => k !== '__srcTable');
            if (keys.length === 0) continue;
            const placeholders = keys.map(() => '?').join(', ');
            const quoted = keys.map((k) => '"' + k + '"').join(', ');
            const vals = keys.map((k) => out[k] as never);
            dst.prepare('INSERT INTO ' + table + ' (' + quoted + ') VALUES (' + placeholders + ')').run(...vals);
          }
        }

        // 复制后回填：钠糖纤维/目标列/废弃标记等（T1 applyMigrations 幂等语义）。
        applyMigrations(dst);

        // 事务内对账：行数 + 关键口径，不一致即回滚（零部分写入）。
        const tables: TableReconcile[] = [];
        let allOk = true;
        for (const table of COPY_ORDER) {
          const bucket = expectedCounts.get(table);
          const raw = bucket?.raw ?? {};
          let expected = bucket?.converged ?? 0;
          let skippedUnique = 0;
          if (table === 'workout_plans') {
            const seen = new Set<string>();
            let uniq = 0;
            for (const r of bucket?.convergedRows ?? []) {
              const key = String(r.week_number) + '|' + String(r.day_of_week) + '|' + String(r.session_index);
              if (!seen.has(key)) {
                seen.add(key);
                uniq += 1;
              }
            }
            skippedUnique = expected - uniq;
            expected = uniq;
          }
          const dstCount = countRows(dst, table);
          const ok = dstCount === expected;
          if (!ok) allOk = false;
          tables.push({ table, srcRaw: raw, srcConverged: expected, dst: dstCount, ok, skippedUnique });
        }
        const dstKcalRow = dst
          .prepare("SELECT COALESCE(SUM(calories),0) AS s FROM food_log WHERE food_name != '" + WATER_NAME + "'")
          .get() as { s: number };
        const dstWeight = sumWeight(dst, listTables(dst));
        const dstPhotosRow = dst.prepare('SELECT COUNT(*) AS n FROM body_photos').get() as { n: number };
        // weight SUM 浮点：round2 后比对（kcal 公约：库里存原始，序列化前 round2）。
        const wSrc = Math.round(srcWeight.sum * 100) / 100;
        const wDst = Math.round(dstWeight.sum * 100) / 100;
        const calibers = {
          kcalExclWater: { label: '总热量(去水)', src: srcKcal, dst: dstKcalRow.s, ok: srcKcal === dstKcalRow.s },
          weightCount: { label: '体重行数', src: srcWeight.n, dst: dstWeight.n, ok: srcWeight.n === dstWeight.n },
          weightSum: { label: '体重合计kg(round2)', src: wSrc, dst: wDst, ok: wSrc === wDst },
          photoCount: { label: '照片数', src: srcPhotos, dst: dstPhotosRow.n, ok: srcPhotos === dstPhotosRow.n },
        };
        if (!calibers.kcalExclWater.ok || !calibers.weightCount.ok || !calibers.weightSum.ok || !calibers.photoCount.ok) {
          allOk = false;
        }
        const stAfter = statSync(srcAbs);
        const report: MigrateReport = {
          src: srcAbs,
          dst: dstAbs,
          srcStatBefore: srcStat,
          srcStatAfter: { size: stAfter.size, mtimeMs: stAfter.mtimeMs },
          srcReadOnly: readOnly,
          tables,
          calibers,
          remapped,
          uniqueConflicts,
          warnings,
          ok: allOk,
        };
        if (!allOk) {
          dst.exec('ROLLBACK');
          throw new MigrateVerifyError('对账不一致已回滚（dst 恢复打开前状态），见报告 tables/calibers', report);
        }
        dst.exec('COMMIT');
        const stAfterCommit = statSync(srcAbs);
        report.srcStatAfter = { size: stAfterCommit.size, mtimeMs: stAfterCommit.mtimeMs };
        if (report.srcStatBefore.size !== report.srcStatAfter.size || report.srcStatBefore.mtimeMs !== report.srcStatAfter.mtimeMs) {
          report.warnings.push('src 文件 stat 在迁移前后发生变化（本脚本未写 src，请核查是否有外部进程触碰复制件）');
          report.ok = false;
          throw new MigrateVerifyError('src 复制件在迁移期间被外部改动，已提交但标为失败（dst 已写，src 需重取复制件后重跑）', report);
        }
        return report;
      } catch (e) {
        try {
          dst.exec('ROLLBACK');
        } catch {
          // 已回滚或无事务：忽略二次错误，抛原始错误。
        }
        throw e;
      } finally {
        dst.close();
      }
    } finally {
      src.close();
    }
  } catch (e) {
    try {
      src.close();
    } catch {
      // 忽略关闭错误。
    }
    throw e;
  }
}

/** 报告渲染：人读对账表（一行一表 + 口径抽查）。 */
export function formatReportText(report: MigrateReport): string {
  const lines: string[] = [];
  lines.push('src: ' + report.src + ' (readOnly=' + String(report.srcReadOnly) + ')');
  lines.push('dst: ' + report.dst);
  lines.push('表 行数对账（src收敛 → dst）：');
  for (const t of report.tables) {
    const raw = Object.entries(t.srcRaw)
      .map(([k, v]) => k + '=' + String(v))
      .join(' ');
    lines.push(
      '  ' + t.table + ': ' + raw + ' => ' + String(t.srcConverged) + ' → ' + String(t.dst) + ' ' + (t.ok ? 'OK' : 'MISMATCH') +
        (t.skippedUnique ? ' (UNIQUE去重' + String(t.skippedUnique) + ')' : ''),
    );
  }
  lines.push('口径抽查（现行代码口径）：');
  for (const c of [report.calibers.kcalExclWater, report.calibers.weightCount, report.calibers.weightSum, report.calibers.photoCount]) {
    lines.push('  ' + c.label + ': src=' + String(c.src) + ' dst=' + String(c.dst) + ' ' + (c.ok ? 'OK' : 'MISMATCH'));
  }
  if (report.remapped.length > 0) {
    lines.push('跨世代同 id 重映射（多记不丢）' + String(report.remapped.length) + ' 行：');
    for (const r of report.remapped.slice(0, 20)) {
      lines.push('  ' + r.table + ' ' + r.fromTable + ' id ' + String(r.oldId) + ' → ' + String(r.newId));
    }
    if (report.remapped.length > 20) lines.push('  …另 ' + String(report.remapped.length - 20) + ' 行略');
  }
  if (report.uniqueConflicts.length > 0) {
    lines.push('UNIQUE 冲突去重（workout_plans 保留最小 id）' + String(report.uniqueConflicts.length) + ' 行，见回滚说明：');
    for (const u of report.uniqueConflicts.slice(0, 20)) {
      lines.push('  key ' + u.key + ' drop id ' + String(u.droppedId) + ' from ' + u.fromTable);
    }
  }
  for (const w of report.warnings) lines.push('WARN: ' + w);
  lines.push(report.ok ? 'MIGRATE OK（幂等可重跑：同 src/dst 重跑行数一致）' : 'MIGRATE FAIL（已回滚，见 MIGRATE_ROLLBACK.md）');
  return lines.join('\n');
}
