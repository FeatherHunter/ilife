#!/usr/bin/env node
/** T6 #25 · 取数/导入 CLI：argv + 人读文本/JSON + exit 码（老家同行为）。
 * 用法：node dist/fetch/cli.js <import|validate|dedupe|export|history|audit|catalog-verify> ...
 * 运维定位（C1 #43）：本 CLI 仅运维（导入/校验/去重/导出/历史/审计/目录核验），不承载业务读写；
 * 业务唯一出口为 calorie-cmd-read（dist/cli/cmd_read.js），业务读写一律走该出口。
 * #606：`audit`／`catalog-verify` 的库面改走训记模块的能力门（缺省＝包内预置快照，`--catalog` 是显式覆盖）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { writeFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { openDb } from '../schema.js';
import { assertWritablePath, resolveDbPath } from '../paths.js';
import { dedupeReport, exportBySource, importProducts, validateFile } from './batch.js';
import type { DuplicatePolicy } from './batch.js';
import { getCalorieHistory } from '../analysis/historyStore.js';
import { auditPlanNames } from './audit.js';
import { verifyMovements } from '../xunji/index.js';
import { m } from '../entries/index.js';

const flag = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (name: string): boolean => process.argv.includes(name);

function openTarget(dbFlag: string | undefined, writable: boolean): DatabaseSync {
  const p = dbFlag ?? resolveDbPath();
  if (writable) assertWritablePath(p);
  return openDb(p);
}

async function askDuplicate(name: string): Promise<DuplicatePolicy> {
  const rl = createInterface({ input, output });
  try {
    const ans = (await rl.question(m('skill-calorie.fetch-cli.c001', { p0: String(name) }))).trim().toLowerCase();
    return ans === 'o' ? 'overwrite' : ans === 'd' ? 'deprecate' : 'skip';
  } finally {
    rl.close();
  }
}

async function cmdImport(file: string, dbFlag?: string): Promise<number> {
  if (!file) {
    console.error('用法：import <file> [--dry-run] [--on-duplicate o|s|d] [--db path]');
    return 1;
  }
  const dup = flag('--on-duplicate');
  const policy = dup === 'o' ? 'overwrite' : dup === 'd' ? 'deprecate' : dup === 's' ? 'skip' : 'ask';
  const db = openTarget(dbFlag, true);
  try {
    const r = await importProducts(db, file, { dryRun: has('--dry-run'), onDuplicate: policy, ask: askDuplicate });
    if (r.parseErrors.length > 0) console.log(m('skill-calorie.fetch-cli.c002', { p0: String(r.parseErrors.length) }));
    const badgeText = r.invalid.length === 0 ? m('skill-calorie.fetch-cli.c003') : m('skill-calorie.fetch-cli.c004', { p0: String(r.invalid.length) });
    console.log(m('skill-calorie.fetch-cli.c005', { p0: String(badgeText) }));
    if (r.dryRun) {
      console.log(m('skill-calorie.fetch-cli.c006'));
      return 0;
    }
    console.log('\n============================================================');
    console.log(m('skill-calorie.fetch-cli.c007'));
    console.log(m('skill-calorie.fetch-cli.c008', { p0: String(r.stats.inserted) }));
    console.log(m('skill-calorie.fetch-cli.c009', { p0: String(r.stats.updated) }));
    console.log(m('skill-calorie.fetch-cli.c010', { p0: String(r.stats.skipped) }));
    console.log(m('skill-calorie.fetch-cli.c011', { p0: String(r.stats.deprecated) }));
    console.log(m('skill-calorie.fetch-cli.c012', { p0: String(r.stats.failed) }));
    for (const f of r.failures) console.log(m('skill-calorie.fetch-cli.c013', { p0: String(f.line), p1: String(f.name), p2: String(f.error) }));
    return 0;
  } catch (e) {
    console.error(m('skill-calorie.fetch-cli.c014', { p0: String(e instanceof Error ? e.message : e) }));
    return 1;
  } finally {
    db.close();
  }
}

function cmdValidate(file: string): number {
  if (!file) {
    console.error(m('skill-calorie.fetch-cli.c023'));
    return 1;
  }
  try {
    const r = validateFile(file, flag('--json-output'));
    console.log(m('skill-calorie.fetch-cli.c015', { p0: String(r.valid), p1: String(r.total) }));
    // exit 只表达“校验是否执行成功”，失败行是结果不是命令失败（老家 #44）
    return 0;
  } catch (e) {
    console.error(m('skill-calorie.fetch-cli.c016', { p0: String(e instanceof Error ? e.message : e) }));
    return 1;
  }
}

function cmdDedupe(dbFlag?: string): number {
  const db = openTarget(dbFlag, false);
  try {
    const dups = dedupeReport(db);
    console.log(m('skill-calorie.fetch-cli.c017', { p0: String(dups.length) }));
    for (const g of dups) console.log(`   '${g.productName}' ×${g.ids.length} (IDs: ${g.ids.join(',')})`);
    return 0;
  } finally {
    db.close();
  }
}

function cmdExport(dbFlag?: string): number {
  const source = flag('--source');
  if (!source) {
    console.error(m('skill-calorie.fetch-cli.c018'));
    return 1;
  }
  const db = openTarget(dbFlag, false);
  try {
    const lines = exportBySource(db, source).map((r) => JSON.stringify(r));
    const out = flag('--output');
    if (out) writeFileSync(out, lines.join('\n') + '\n', 'utf8');
    else console.log(lines.join('\n'));
    return 0;
  } finally {
    db.close();
  }
}

function cmdHistory(dbFlag?: string): number {
  const days = Number(flag('--days') ?? 7);
  const db = openTarget(dbFlag, false);
  try {
    const h = getCalorieHistory(db, days);
    if (h.rows.length === 0) {
      console.log(m('skill-calorie.fetch-cli.c019', { p0: String(days) }));
      return 0;
    }
    console.log(m('skill-calorie.fetch-cli.c020', { p0: String(days) }));
    console.log('-'.repeat(70));
    for (const r of h.rows) {
      console.log(`${r.date} | ${r.calories} | ${r.protein} | ${r.carbs} | ${r.fat} | ${r.status}`);
    }
    console.log();
    return 0;
  } finally {
    db.close();
  }
}

function cmdAudit(dbFlag?: string): number {
  const db = openTarget(dbFlag, false);
  try {
    const catFlag = flag('--catalog');
    // #606：库面走训记模块（缺省＝包内预置快照；`--catalog` 是显式覆盖）。
    const rep = auditPlanNames(db, {
      catalogPath: catFlag,
      withSuggestions: has('--fix-suggestions'),
    });
    console.log(JSON.stringify(rep, null, 2));
    if (rep.status === 'fail') return 2;
    if (rep.status === 'warn' && has('--strict')) return 1;
    return 0;
  } finally {
    db.close();
  }
}

function cmdCatalogVerify(name: string): number {
  if (!name) {
    console.error(m('skill-calorie.fetch-cli.c021'));
    return 1;
  }
  const catFlag = flag('--catalog');
  const report = verifyMovements([name], catFlag === undefined ? {} : { catalogPath: catFlag });
  console.log(JSON.stringify(report.results[0], null, 2));
  // #606 口径：库读不出＝无法验证（不是「不合法」）；不在库＝校验失败。老实现这里恒退 0，是缺陷不照抄。
  if (!report.catalog_loaded) return 1;
  return report.invalid_count > 0 ? 4 : 0;
}

async function main(): Promise<number> {
  const [sub, arg] = process.argv.slice(2);
  const dbFlag = flag('--db');
  switch (sub) {
    case 'import':
      return cmdImport(arg, dbFlag);
    case 'validate':
      return cmdValidate(arg);
    case 'dedupe':
      return cmdDedupe(dbFlag);
    case 'export':
      return cmdExport(dbFlag);
    case 'history':
      return cmdHistory(dbFlag);
    case 'audit':
      return cmdAudit(dbFlag);
    case 'catalog-verify':
      return cmdCatalogVerify(arg);
    default:
      console.error(m('skill-calorie.fetch-cli.c022'));
      return 2;
  }
}

process.exitCode = await main();
