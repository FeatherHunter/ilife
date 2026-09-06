#!/usr/bin/env node
/** T6 #25 · 取数/导入 CLI：argv + 人读文本/JSON + exit 码（老家同行为）。
 * 用法：node dist/fetch/cli.js <import|validate|dedupe|export|history|audit|catalog-verify> ...
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { writeFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { openDb } from '../schema.js';
import { assertWritablePath, resolveDbPath } from '../paths.js';
import { dedupeReport, exportBySource, importProducts, validateFile } from './batch.js';
import type { DuplicatePolicy } from './batch.js';
import { getCalorieHistory } from './history.js';
import { auditPlanNames } from './audit.js';
import { loadCatalog, verifyMovementName } from './xunji-catalog.js';

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
    const ans = (await rl.question(`重复 '${name}'：[o]覆盖 [s]跳过 [d]废弃（默认 s）`)).trim().toLowerCase();
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
    if (r.parseErrors.length > 0) console.log(`JSON 解析失败: ${r.parseErrors.length} 行`);
    console.log(`校验通过: ${r.invalid.length === 0 ? '全部' : r.invalid.length + ' 条失败'}`);
    if (r.dryRun) {
      console.log('\n🔍 Dry-run 模式,不写入数据库');
      return 0;
    }
    console.log('\n============================================================');
    console.log('📊 导入完成');
    console.log(`   ✅ 新增: ${r.stats.inserted}`);
    console.log(`   🔄 覆盖: ${r.stats.updated}`);
    console.log(`   ⏭️  跳过: ${r.stats.skipped}`);
    console.log(`   🗑️  废弃: ${r.stats.deprecated}`);
    console.log(`   ❌ 失败: ${r.stats.failed}`);
    for (const f of r.failures) console.log(`   第 ${f.line} 行: ${f.name} - ${f.error}`);
    return 0;
  } catch (e) {
    console.error(`导入失败: ${e instanceof Error ? e.message : e}`);
    return 1;
  } finally {
    db.close();
  }
}

function cmdValidate(file: string): number {
  if (!file) {
    console.error('用法：validate <file> [--json-output path]');
    return 1;
  }
  try {
    const r = validateFile(file, flag('--json-output'));
    console.log(`校验通过: ${r.valid} / ${r.total}`);
    // exit 只表达“校验是否执行成功”，失败行是结果不是命令失败（老家 #44）
    return 0;
  } catch (e) {
    console.error(`校验失败: ${e instanceof Error ? e.message : e}`);
    return 1;
  }
}

function cmdDedupe(dbFlag?: string): number {
  const db = openTarget(dbFlag, false);
  try {
    const dups = dedupeReport(db);
    console.log(`重复组: ${dups.length}`);
    for (const g of dups) console.log(`   '${g.productName}' ×${g.ids.length} (IDs: ${g.ids.join(',')})`);
    return 0;
  } finally {
    db.close();
  }
}

function cmdExport(dbFlag?: string): number {
  const source = flag('--source');
  if (!source) {
    console.error('用法：export --source X [--output F] [--db path]');
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
      console.log(`最近${days}天无记录`);
      return 0;
    }
    console.log(`\n热量历史（最近${days}天）:`);
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
    const rep = auditPlanNames(db, {
      catalog: catFlag ? loadCatalog(catFlag) : undefined,
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
    console.error('用法：catalog-verify <动作名> [--catalog path]');
    return 1;
  }
  const catFlag = flag('--catalog');
  console.log(JSON.stringify(verifyMovementName(name, catFlag ? loadCatalog(catFlag) : undefined), null, 2));
  return 0;
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
      console.error('用法：cli.js <import|validate|dedupe|export|history|audit|catalog-verify> ...');
      return 2;
  }
}

process.exitCode = await main();
