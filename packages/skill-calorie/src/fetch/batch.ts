/** T6 #25 · 批量导入：import / validate / dedupe / export（老家 batch_import.py 同语义）。 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { validateRecord } from './validate.js';
import { FetchError } from './errors.js';
import { deprecateProduct } from './products.js';

export type DuplicatePolicy = 'overwrite' | 'skip' | 'deprecate';

export interface JsonlRecord {
  line: number;
  rec: Record<string, unknown>;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ImportStats {
  inserted: number;
  updated: number;
  skipped: number;
  deprecated: number;
  failed: number;
}

export interface ImportFailure {
  line: number;
  name: string;
  error: string;
}

export interface ImportResult {
  stats: ImportStats;
  failures: ImportFailure[];
  invalid: { line: number; name: string; error: string }[];
  parseErrors: ParseError[];
  dryRun: boolean;
}

/** 逐行读 JSONL（空行跳过不计数）；返回记录与解析错误。 */
export function readJsonl(file: string): { records: JsonlRecord[]; parseErrors: ParseError[] } {
  const records: JsonlRecord[] = [];
  const parseErrors: ParseError[] = [];
  // strip BOM：Windows 落盘 JSONL 常带 BOM，老家 utf-8-sig 同理容忍
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split('\n');
  text.forEach((raw, i) => {
    const line = i + 1;
    if (raw.trim() === '') return;
    try {
      const rec = JSON.parse(raw);
      records.push({ line, rec });
    } catch (e) {
      parseErrors.push({ line, message: e instanceof Error ? e.message : String(e) });
    }
  });
  return { records, parseErrors };
}

const normBrand = (rec: Record<string, unknown>): string | null => {
  const b = rec['brand'];
  return typeof b === 'string' && b !== '' ? b : null;
};

/** 去重判定：product_name（去首尾空格）+ brand 完全相同视为同一条。 */
export function dedupeKey(productName: string, brand: string | null): string {
  return `${productName.trim()}\u0001${brand ?? ''}`;
}

export function checkDuplicate(
  db: DatabaseSync,
  productName: string,
  brand: string | null,
): { id: number; isDeprecated: boolean } | null {
  const rows = db
    .prepare('SELECT id, brand, is_deprecated FROM nutrition_products WHERE product_name = ?')
    .all(productName.trim()) as { id: number; brand: string | null; is_deprecated: number }[];
  const hit = rows.find((r) => (r.brand ?? null) === brand);
  return hit ? { id: hit.id, isDeprecated: hit.is_deprecated === 1 } : null;
}

const NUM_COLS = ['calories', 'protein', 'fat', 'saturated_fat', 'carbohydrates', 'sugar', 'dietary_fiber', 'sodium'] as const;

function toInt01(v: unknown): number {
  return v === true || v === 1 ? 1 : 0;
}

function insertRecord(db: DatabaseSync, rec: Record<string, unknown>): number {
  const r = db
    .prepare(
      `INSERT INTO nutrition_products
       (product_name, brand, calories, protein, fat, saturated_fat, carbohydrates, sugar,
        dietary_fiber, sodium, source, note, is_deprecated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      (rec['product_name'] as string).trim(),
      normBrand(rec),
      ...NUM_COLS.map((c): number | null => (rec[c] as number | undefined) ?? null),
      (rec['source'] as string).trim(),
      typeof rec['note'] === 'string' ? rec['note'] : '',
      toInt01(rec['is_deprecated']),
    );
  return Number(r.lastInsertRowid);
}

function updateRecord(db: DatabaseSync, rec: Record<string, unknown>, id: number): void {
  db.prepare(
    `UPDATE nutrition_products SET calories = ?, protein = ?, fat = ?, saturated_fat = ?,
     carbohydrates = ?, sugar = ?, dietary_fiber = ?, sodium = ?, source = ?, note = ?,
     is_deprecated = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ).run(
    ...NUM_COLS.map((c): number | null => (rec[c] as number | undefined) ?? null),
    (rec['source'] as string).trim(),
    typeof rec['note'] === 'string' ? rec['note'] : '',
    toInt01(rec['is_deprecated']),
    id,
  );
}

// 废弃走 T4 deprecateProduct 单源语句；insert/update 保留本模块 SQL（source 列 + 全量覆盖与老家 parity）。
function deprecateRecord(db: DatabaseSync, id: number): void {
  const r = deprecateProduct(db, id);
  if (!r.ok) throw new FetchError(r.error ?? `废弃失败 id=${id}`);
}

export interface ImportOptions {
  /** 重复处理策略；老家默认逐条询问，CLI 用 --on-duplicate 指定，测试传显式值 */
  onDuplicate?: DuplicatePolicy | 'ask';
  /** ask 策略的应答器（CLI 接 stdin；测试可注入） */
  ask?: (productName: string, existingId: number, isDeprecated: boolean) => Promise<DuplicatePolicy | 'all-skip' | 'all-overwrite' | 'all-deprecate'>;
  dryRun?: boolean;
}

export async function importProducts(db: DatabaseSync, file: string, opts: ImportOptions = {}): Promise<ImportResult> {
  const { records, parseErrors } = readJsonl(file);
  const stats: ImportStats = { inserted: 0, updated: 0, skipped: 0, deprecated: 0, failed: 0 };
  const failures: ImportFailure[] = [];
  const invalid: ImportResult['invalid'] = [];
  const valid: JsonlRecord[] = [];
  for (const { line, rec } of records) {
    const v = validateRecord(rec);
    if (!v.ok) {
      invalid.push({ line, name: String((rec as Record<string, unknown>)['product_name'] ?? '<unknown>'), error: v.error ?? '' });
    } else {
      valid.push({ line, rec: rec as Record<string, unknown> });
    }
  }
  if (opts.dryRun || valid.length === 0) {
    return { stats, failures, invalid, parseErrors, dryRun: opts.dryRun ?? false };
  }
  let policy = opts.onDuplicate ?? 'ask';
  let applyAll: DuplicatePolicy | null = null;
  for (const { line, rec } of valid) {
    const name = (rec['product_name'] as string).trim();
    const brand = normBrand(rec);
    try {
      const dup = checkDuplicate(db, name, brand);
      if (!dup) {
        insertRecord(db, rec);
        stats.inserted += 1;
        continue;
      }
      let choice: DuplicatePolicy;
      if (applyAll) {
        choice = applyAll;
      } else if (policy === 'ask') {
        if (!opts.ask) throw new FetchError('重复需人工确认，CLI 请加 --on-duplicate o|s|d');
        const ans = await opts.ask(name, dup.id, dup.isDeprecated);
        if (ans === 'all-skip' || ans === 'all-overwrite' || ans === 'all-deprecate') {
          applyAll = ans.slice(4) as DuplicatePolicy;
          choice = applyAll;
        } else {
          choice = ans;
        }
      } else {
        choice = policy;
      }
      if (choice === 'overwrite') {
        updateRecord(db, rec, dup.id);
        stats.updated += 1;
      } else if (choice === 'deprecate') {
        deprecateRecord(db, dup.id);
        stats.deprecated += 1;
      } else {
        stats.skipped += 1;
      }
    } catch (e) {
      stats.failed += 1;
      failures.push({ line, name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { stats, failures, invalid, parseErrors, dryRun: false };
}

/** validate 子命令的结构化结果（与老家 --json-output 同形）。 */
export function validateFile(file: string, jsonOutput?: string): { total: number; valid: number; failed: number } {
  const { records, parseErrors } = readJsonl(file);
  const runs = records.map(({ line, rec }) => {
    const v = validateRecord(rec);
    return {
      line,
      status: v.ok ? 'ok' : 'failed',
      name: String((rec as Record<string, unknown>)['product_name'] ?? '<unknown>'),
      reason: v.ok ? '' : (v.error ?? ''),
    };
  });
  const valid = runs.filter((r) => r.status === 'ok').length;
  if (jsonOutput) {
    writeFileSync(
      jsonOutput,
      JSON.stringify({
        status: 'ok',
        summary: {
          jsonl_path: file,
          total: records.length,
          added: 0,
          updated: 0,
          skipped: 0,
          failed: runs.length - valid + parseErrors.length,
        },
        runs: [
          ...runs,
          ...parseErrors.map((p) => ({ line: p.line, status: 'failed', name: '(解析失败)', reason: p.message })),
        ],
      }),
      'utf8',
    );
  }
  return { total: records.length, valid, failed: runs.length - valid + parseErrors.length };
}

/** dedupe 子命令：全库去重检查，只报告不写库。 */
export function dedupeReport(db: DatabaseSync): { key: string; ids: number[]; productName: string; brand: string | null }[] {
  const rows = db.prepare('SELECT id, product_name, brand FROM nutrition_products').all() as {
    id: number;
    product_name: string;
    brand: string | null;
  }[];
  const groups = new Map<string, { ids: number[]; productName: string; brand: string | null }>();
  for (const r of rows) {
    const key = dedupeKey(r.product_name, r.brand ?? null);
    const g = groups.get(key) ?? { ids: [], productName: r.product_name.trim(), brand: r.brand ?? null };
    g.ids.push(r.id);
    groups.set(key, g);
  }
  return [...groups.entries()]
    .filter(([, g]) => g.ids.length > 1)
    .map(([key, g]) => ({ key, ...g }));
}

/** export 子命令：按 source 导出 JSONL 行对象。 */
export function exportBySource(db: DatabaseSync, source: string): Record<string, unknown>[] {
  return db.prepare('SELECT * FROM nutrition_products WHERE source = ? ORDER BY id').all(source) as Record<string, unknown>[];
}
