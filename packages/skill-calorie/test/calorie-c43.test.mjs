/** C2-C6 #43 · 卡路里重审修复批验收（tmp 隔离，真实 DB 零触碰）。
 * C1/C7 走文档断言；C2 别名→diet.add；C3 去legacy首命中；C4 空尾日回零；C5 缺身高仍记；C6 收据HTML结构化分项。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/calorie-c43.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { TRIGGERS, HELP_LOOKUP, lookupWake, searchHelp, WAKE_TABLE, routeWakeword, isExecCli } from '../dist/triggers/index.js';
import { buildDietOverview, buildMealDistribution, zeroMealDistribution } from '../dist/render/index.js';
import { logWeight } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const SKILL_MD = join(HERE, '..', 'SKILL.md');
const FETCH_CLI = join(HERE, '..', 'dist', 'fetch', 'cli.js');

function run(key, params, envExtra, extraArgs) {
  const a = key === undefined ? [] : (params === undefined ? [key] : [key, '--params', typeof params === 'string' ? params : JSON.stringify(params)]);
  if (extraArgs) a.push(...extraArgs);
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function runOk(dir, key, params, extraArgs) {
  const r = run(key, params, { SKILLS_DB_PATH: dir }, extraArgs);
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-600));
  return JSON.parse(r.stdout);
}

function mkHelpDb() {
  const dir = mkdtempSync(join(tmpdir(), 'c43-help-'));
  openDb(join(dir, 'calorie_data.db')).close();
  return dir;
}

function mkDietDb() {
  const dir = mkdtempSync(join(tmpdir(), 'c43-diet-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2)").run();
  db.close();
  return dir;
}

test('C1 fetch-cli运维定位注明（SKILL唯一出口节+fetch头注）', () => {
  const skill = readFileSync(SKILL_MD, 'utf8');
  assert.match(skill, /运维定位/);
  assert.match(skill, /skill-calorie-fetch/);
  assert.match(skill, /业务读写唯一出口仍为.*calorie-cmd-read/);
  const cli = readFileSync(join(HERE, '..', 'src', 'fetch', 'cli.ts'), 'utf8');
  assert.match(cli, /运维定位/);
  assert.match(cli, /业务唯一出口为 calorie-cmd-read/);
  void FETCH_CLI;
});

test('C7 默认目标值1800/2000来源文档一笔', () => {
  const skill = readFileSync(SKILL_MD, 'utf8');
  assert.match(skill, /默认目标值/);
  assert.match(skill, /1800/);
  assert.match(skill, /2000/);
  assert.match(skill, /schema\.ts daily_goal/);
});

test('C2 记早餐/午餐/晚餐别名→calorie.diet.add（WAKE_TABLE+现找）', () => {
  assert.equal(WAKE_TABLE.length, 3);
  for (const phrase of ['记早餐', '记午餐', '记晚餐']) {
    const route = routeWakeword(phrase);
    assert.ok(route, phrase + ' 无路由');
    assert.equal(route.key, 'calorie.diet.add');
    const hits = lookupWake(HELP_LOOKUP, phrase);
    assert.ok(hits.length >= 1, phrase + ' HELP_LOOKUP 无命中');
    assert.ok(hits.every((h) => h.cli.includes('calorie.diet.add')), phrase + ' 非 diet.add：' + JSON.stringify(hits));
    const s = searchHelp(TRIGGERS, phrase);
    assert.ok(s.length >= 1, phrase + ' searchHelp 无命中');
    assert.ok(s[0].cli.includes('calorie.diet.add'), phrase + ' 首条非 diet.add：' + s[0].cli);
  }
  const dir = mkHelpDb();
  for (const phrase of ['记早餐', '记午餐', '记晚餐']) {
    const env = runOk(dir, 'calorie.help.lookup', { q: phrase });
    assert.ok(env.data.total >= 1);
    assert.ok(String(env.data.items[0].cli).includes('calorie.diet.add'), phrase + ' CLI首条非 diet.add：' + env.data.items[0].cli);
  }
});

test('C3 HELP去legacy首命中（看今日主页→view.home，减肥/目标首条可执行）', () => {
  const home = searchHelp(TRIGGERS, '看今日主页');
  assert.ok(home.length >= 1);
  assert.ok(home[0].cli.includes('calorie.view.home'), '看今日主页首条非 view.home：' + home[0].cli);
  assert.ok(isExecCli(home[0].cli));
  for (const q of ['减肥', '目标']) {
    const hits = searchHelp(TRIGGERS, q);
    assert.ok(hits.length >= 1, q + ' 无命中');
    assert.ok(isExecCli(hits[0].cli), q + ' 首条非可执行：' + hits[0].cli);
  }
  const dir = mkHelpDb();
  const homeEnv = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  assert.ok(String(homeEnv.data.items[0].cli).includes('calorie.view.home'));
  assert.ok(String(homeEnv.data.items[0].cli).startsWith('calorie-cmd-read calorie.'));
  const jf = runOk(dir, 'calorie.help.lookup', { q: '减肥' });
  assert.ok(String(jf.data.items[0].cli).startsWith('calorie-cmd-read calorie.'), '减肥首条：' + jf.data.items[0].cli);
  const mb = runOk(dir, 'calorie.help.lookup', { q: '目标' });
  assert.ok(String(mb.data.items[0].cli).startsWith('calorie-cmd-read calorie.'), '目标首条：' + mb.data.items[0].cli);
});

test('C4 view.diet空尾日回零而非整窗missing', () => {
  const dir = mkDietDb();
  const db = openDb(join(dir, 'calorie_data.db'));
  const o = buildDietOverview(db, '2026-09-05', '2026-09-06');
  assert.equal(o.loggedDays, 1);
  assert.throws(() => buildMealDistribution(db, '2026-09-06'), /无饮食记录/);
  const zero = zeroMealDistribution('2026-09-06');
  assert.equal(zero.totalCalories, 0);
  assert.ok(zero.slices.every((s) => s.calories === 0 && s.count === 0 && s.pct === 0));
  db.close();
  const env = runOk(dir, 'calorie.view.diet', { start: '2026-09-05', end: '2026-09-06' });
  assert.equal(env.shape, 'stat');
  assert.equal(env.data.metrics.distTotal, 0);
  const htmlFile = join(dir, 'diet.html');
  const r = run('calorie.view.diet', { start: '2026-09-05', end: '2026-09-06' }, { SKILLS_DB_PATH: dir }, ['--html', htmlFile]);
  assert.equal(r.status, 0);
  assert.match(readFileSync(htmlFile, 'utf8'), /餐别分布/);
});

test('C5 缺身高仍记体重 BMI null（库函数级）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'c43-w-'));
  const db = openDb(join(dir, 'w.db'));
  const r = logWeight(db, 70, '', '2026-09-10', '07:00:00');
  assert.equal(r.bmi, null);
  db.close();
});

test('C6 写收据HTML结构化分项', () => {
  const dir = mkDietDb();
  const htmlFile = join(dir, 'receipt.html');
  const env = runOk(dir, 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06', time: '08:00:00' }, ['--html', htmlFile]);
  assert.equal(env.shape, 'receipt');
  assert.ok(env.data.receipt.items.length >= 1);
  const html = readFileSync(htmlFile, 'utf8');
  assert.match(html, /<li>/);
  assert.match(html, /鸡胸/);
});
