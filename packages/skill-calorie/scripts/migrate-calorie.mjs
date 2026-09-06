#!/usr/bin/env node
/** T12 #38 · 迁移 CLI（一次性）：只读老库复制件 → 写新库 + 行数对账 + 口径抽查。
 *
 * 用法（一行）：
 *   node packages/skill-calorie/scripts/migrate-calorie.mjs --src <老库复制件.db> --dst <新库.db> [--json <报告.json>]
 *
 * 约束：engines>=22.13；缺参/缺文件阻断不返空；dst 非 tmp 须 CALORIE_FORCE_PROD=1；
 * 成功 exit 0 打人读对账表（+ --json 落盘机器报告）；失败 exit 非 0 走 stderr：
 * 1 预检(node版本) / 2 用法 / 3 缺失(src缺/空库/dst拒绝) / 4 对账不一致(已回滚) / 5 IO。
 * 真实 DB 碰都不碰：src 永远 readOnly 打开；dst 写守卫见 paths.assertWritablePath。
 * 面板/定时/外联动 out of scope，本脚本只做表复制+对账。
 */
import { writeFileSync } from 'node:fs';
import { formatReportText, migrateCalorieDb, MigrateMissingError, MigrateVerifyError } from '../dist/migrate/migrate.js';

function fail(code, msg) {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}

function parseArgs(argv) {
  const o = { src: undefined, dst: undefined, json: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--src' && i + 1 < argv.length) o.src = argv[++i];
    else if (a === '--dst' && i + 1 < argv.length) o.dst = argv[++i];
    else if (a === '--json' && i + 1 < argv.length) o.json = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('用法：node packages/skill-calorie/scripts/migrate-calorie.mjs --src <老库复制件.db> --dst <新库.db> [--json <报告.json>]');
      process.exit(0);
    } else fail(2, '未知参数：' + a + '（用法：--src <复制件> --dst <新库> [--json <报告.json>]）');
  }
  if (!o.src) fail(2, '缺 --src（老库复制件路径必填）');
  if (!o.dst) fail(2, '缺 --dst（新库路径必填）');
  return o;
}

const { src, dst, json } = parseArgs(process.argv.slice(2));
try {
  const report = migrateCalorieDb(src, dst);
  const text = formatReportText(report);
  console.log(text);
  if (json) writeFileSync(json, JSON.stringify(report, null, 2), 'utf8');
  process.exit(0);
} catch (e) {
  if (e instanceof MigrateVerifyError) {
    console.error(formatReportText(e.report));
    fail(4, e.message);
  } else if (e instanceof MigrateMissingError) {
    fail(3, e.message);
  } else {
    fail(5, e instanceof Error ? (e.stack ?? e.message) : String(e));
  }
}
