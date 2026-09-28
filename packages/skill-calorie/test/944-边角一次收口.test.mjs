/** #944 边角一次收口：D1 缺参无确认串 ＋ 真日历 ＋ 示例空形态 ＋ 回执影响 —— 票面验收用例。
 *
 *  这是算法／载荷契约正本的单元测试＋一处真交付出口抽查，不是交付面验收（交付面验收见 946–949 四件）：
 *  被测件即本次断言的正本（`shared/params.ts` 的真日历、`planPreviewPayloads.ts` 的载荷契约），迁移票点到它时一起收口。
 *  同一符号只从一条 `dist` 路径取（`check-one-path`）。
 *
 *  跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 *  `node --test packages/skill-calorie/test/944-边角一次收口.test.mjs`；两条都经
 *  `node tooling/run-locked.mjs --ticket 944 -- <命令>`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const DB_FILENAME = 'calorie_data.db';

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

function mkTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 't944edge-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}
const TPL = mkTemplate();

const { isStrictCalendarDate } = await import(pathToFileURL(join(PKG, 'dist', 'shared', 'params.js')).href);
const { startDateInvalid } = await import(pathToFileURL(join(PKG, 'dist', 'workout', 'planStore.js')).href);
const { planConfirmCommand, planModifyPayload } = await import(pathToFileURL(join(PKG, 'dist', 'workout', 'planPreviewPayloads.js')).href);

function runCli(key, params) {
  const tmp = mkdtempSync(join(tmpdir(), 't944edge-'));
  const home = homeEnvOf(tmp);
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, ...home },
  });
  return { exit: r.status, stderr: String(r.stderr ?? ''), stdout: String(r.stdout ?? '') };
}

function runCliSeeded(key, params) {
  const runDir = join(TPL, 'rcpt-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(TPL, DB_FILENAME), join(runDir, DB_FILENAME));
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(runDir)), ...freezeClock(SEED_TODAY) },
  });
  return { exit: r.status, stderr: String(r.stderr ?? ''), stdout: String(r.stdout ?? '') };
}

test('#944边角 D1：set-week 缺 days 不出确认串、只出修改指令', () => {
  const confirm = planConfirmCommand('set-week', { week: 1 });
  assert.equal(confirm, '', '缺 days 还给出确认串，原样跑必 exit 2');
  const modify = planModifyPayload('set-week');
  assert.ok(modify.includes('calorie.workout.plan-set-week'), '修改指令丢了命令名');
  const ok = planConfirmCommand('set-week', { week: 1, days: [{ dayOfWeek: 1 }] });
  assert.ok(ok.includes('calorie.workout.plan-set-week'), '给了 days 反而没串');
  console.log('T944EDGE-D1 缺参无确认串=1 有参有串=1');
});

test('#944边角 日历：02-30 非法、闰年 02-29 合法、13-45 非法', () => {
  assert.equal(isStrictCalendarDate('2026-02-30'), false, '02-30 应非法');
  assert.equal(isStrictCalendarDate('2024-02-29'), true, '闰年 02-29 应合法');
  assert.equal(isStrictCalendarDate('2026-13-45'), false, '13-45 应非法');
  assert.equal(startDateInvalid('2026-02-30'), true, '校验器与写路径同源，02-30 同样非法');
  assert.equal(startDateInvalid('2026-09-21'), false, '合法日期被误杀');
  const bad = runCli('calorie.workout.plan-update', { start_date: '2026-02-30' });
  assert.equal(bad.exit, 2, '写路径 02-30 应 exit 2，实测 ' + bad.exit + ' ' + bad.stderr);
  console.log('T944EDGE-CAL 02-30非法=1 闰29合法=1 写路径exit2=1');
});

test('#944边角 示例：plan-wizard 空模板照抄即跑', () => {
  const r = runCli('calorie.view.plan-wizard', {});
  assert.equal(r.exit, 0, '空模板应 exit 0，实测 ' + r.exit + ' ' + r.stderr);
  console.log('T944EDGE-EX 空模板exit0=1');
});

test('#944边角 回执：改标题带影响话术', () => {
  const r = runCliSeeded('calorie.workout.plan-update', { title: '边角复核X' });
  assert.equal(r.exit, 0, '改标题应 exit 0，实测 ' + r.exit + ' ' + r.stderr);
  assert.ok(r.stdout.includes('只改标题，不影响周次与训练内容'), '回执缺影响话术');
  console.log('T944EDGE-RCPT 影响进回执=1');
});
