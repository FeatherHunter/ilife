/** #291 乙 · 三条自造词（看目标推荐／看目标配置／看目标状态）走查找层别名。
 *
 * 落地：`src/triggers/help-lookup.ts` 的 WAKE_TABLE 加三行（SoT 零改动，别名唯一上游仍为该表；
 * buildHelpLookup／searchHelp 双注入沿 #43 形状通用化，饮食三行命中形状逐字不变）。
 * 五组判据：
 *   ① WAKE_TABLE 6 行，三条新行 key／cli 逐字同路由层（`src/goal/routes.ts:34-35,37`）；
 *   ② 三词 `lookupWake`／`searchHelp` 首命中都是可执行 cli（逐字等于路由层那串）；
 *   ③ 三词走 `calorie.help.lookup` 真出口，首条即该串；
 *   ④ SoT 零改动（`TRIGGERS.length === 436`）＋饮食三别名回归（仍首命中 diet.add）；
 *   ⑤ 三条 view 命令在 seedFull 临时库真出口 exit 0（seed 照抄 `goal-wizard-251.test.mjs:29-39`）。
 *
 * 运行（持锁，票 291）：
 *   node tooling/run-locked.mjs --ticket 291 -- node node_modules/typescript/bin/tsc -b packages/skill-calorie
 *   node tooling/run-locked.mjs --ticket 291 -- node --test packages/skill-calorie/test/t291-自造词别名.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { TRIGGERS, HELP_LOOKUP, lookupWake, searchHelp, WAKE_TABLE, routeWakeword, isExecCli } from '../dist/triggers/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

/** 三词期望：cli 逐字同路由层 `src/goal/routes.ts:34-35,37`（`routes.generated.ts:456-457,525` 同串）。 */
const EXPECT = {
  '看目标推荐': { key: 'calorie.view.goal-recommend', cli: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
  '看目标配置': { key: 'calorie.view.goal-config', cli: 'calorie-cmd-read calorie.view.goal-config' },
  '看目标状态': { key: 'calorie.view.goal-status', cli: 'calorie-cmd-read calorie.view.goal-status' },
};
const PHRASES = Object.keys(EXPECT);

function runCli(dir, key, params, htmlName) {
  const args = [key, '--params', JSON.stringify(params ?? {})];
  let out = null;
  if (htmlName) {
    out = join(dir, htmlName + '.html');
    args.push('--html', out);
  }
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: '2026-09-07' },
  });
  return {
    status: r.status, out,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    file: out !== null && existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** seedFull 照抄 `goal-wizard-251.test.mjs:29-39`：档案 ＋ 体重 ＋ 已有目标（含体重目标与截止）。 */
function mkSeedFullDb() {
  const dir = mkdtempSync(join(tmpdir(), 't291-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 34, \'female\', 163, \'moderate\')').run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES ('2026-09-07', '07:00:00', 62.5, 163, 23.5)").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1500, 120, 150, 45, 2200, 58, \'2026-12-31\')').run();
  db.close();
  return dir;
}

test('#291 乙① WAKE_TABLE 6 行：饮食三行不动，新三行 key／cli 逐字同路由层', () => {
  assert.equal(WAKE_TABLE.length, 6);
  for (const [i, phrase] of ['记早餐', '记午餐', '记晚餐'].entries()) {
    assert.equal(WAKE_TABLE[i].phrase, phrase);
    assert.equal(WAKE_TABLE[i].key, 'calorie.diet.add');
    assert.equal(WAKE_TABLE[i].cli, 'calorie-cmd-read calorie.diet.add');
  }
  for (const phrase of PHRASES) {
    const row = WAKE_TABLE.find((e) => e.phrase === phrase);
    assert.ok(row, phrase + ' 不在 WAKE_TABLE');
    assert.equal(row.key, EXPECT[phrase].key);
    assert.equal(row.cli, EXPECT[phrase].cli, phrase + ' cli 未逐字同路由层');
  }
});

test('#291 乙② 三词 routeWakeword → 命令键＋可执行 cli', () => {
  for (const phrase of PHRASES) {
    const route = routeWakeword(phrase);
    assert.ok(route, phrase + ' 无路由');
    assert.equal(route.key, EXPECT[phrase].key);
    assert.equal(route.cli, EXPECT[phrase].cli);
    assert.ok(isExecCli(route.cli), phrase + ' 非可执行：' + route.cli);
  }
});

test('#291 乙③ 三词 lookupWake／searchHelp 首命中可执行 cli（逐字等于路由层那串）', () => {
  for (const phrase of PHRASES) {
    const hits = lookupWake(HELP_LOOKUP, phrase);
    assert.ok(hits.length >= 1, phrase + ' HELP_LOOKUP 无命中');
    assert.equal(hits[0].cli, EXPECT[phrase].cli, phrase + ' lookup 首条：' + hits[0].cli);
    assert.equal(hits[0].scene, '06', phrase + ' 应落场景 06');
    const s = searchHelp(TRIGGERS, phrase);
    assert.ok(s.length >= 1, phrase + ' searchHelp 无命中');
    assert.equal(s[0].cli, EXPECT[phrase].cli, phrase + ' search 首条：' + s[0].cli);
    assert.ok(isExecCli(s[0].cli), phrase + ' search 首条非可执行');
  }
});

test('#291 乙④ 三词 calorie.help.lookup 真出口首条即该串', () => {
  const dir = mkdtempSync(join(tmpdir(), 't291-help-'));
  openDb(join(dir, DB_FILENAME)).close();
  for (const phrase of PHRASES) {
    const r = runCli(dir, 'calorie.help.lookup', { q: phrase });
    assert.equal(r.status, 0, phrase + ' help.lookup exit ' + r.status + ' ' + r.stderr);
    const env = JSON.parse(r.stdout);
    assert.ok(env.data.total >= 1, phrase + ' 无命中');
    assert.equal(String(env.data.items[0].cli), EXPECT[phrase].cli, phrase + ' 出口首条：' + env.data.items[0].cli);
  }
});

test('#291 乙⑤ SoT 零改动（436）＋饮食三别名回归（仍首命中 diet.add）', () => {
  assert.equal(TRIGGERS.length, 436, 'SoT 条数漂移：本票不许动冻结词表');
  for (const phrase of ['记早餐', '记午餐', '记晚餐']) {
    assert.equal(routeWakeword(phrase).key, 'calorie.diet.add');
    const hits = lookupWake(HELP_LOOKUP, phrase);
    assert.ok(hits.length >= 1 && hits.every((h) => h.cli.includes('calorie.diet.add')), phrase + ' 命中走散');
    assert.ok(searchHelp(TRIGGERS, phrase)[0].cli.includes('calorie.diet.add'), phrase + ' 首条走散');
  }
});

test('#291 乙⑥ 三条 view 命令 seedFull 真出口 exit 0（看目标状态附完整落盘）', () => {
  const cases = [
    ['看目标推荐', 'calorie.view.goal-recommend', { profile: 'cut' }],
    ['看目标配置', 'calorie.view.goal-config', {}],
    ['看目标状态', 'calorie.view.goal-status', {}],
  ];
  for (const [phrase, key, params] of cases) {
    const dir = mkSeedFullDb();
    const r = runCli(dir, key, params, key === 'calorie.view.goal-status' ? 'goal-status' : null);
    assert.equal(r.status, 0, phrase + '（' + key + '）应 exit 0，实测 ' + r.status + ' ' + r.stderr);
    assert.equal(JSON.parse(r.stdout).key, key, phrase + ' 信封 key 走散');
  }
  const dir = mkSeedFullDb();
  const r = runCli(dir, 'calorie.view.goal-status', {}, 'goal-status');
  const env = JSON.parse(r.stdout);
  assert.ok(typeof env.data.output === 'string' && /^([A-Za-z]:\\|\/)/.test(env.data.output), 'data.output 应是绝对路径');
  assert.equal(readFileSync(env.data.output, 'utf8').length, r.file.length, '回执路径与产物字节应一致');
});
