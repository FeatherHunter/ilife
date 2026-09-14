/** #265 · 场景 04 运动：7 条读类词归位（拿回各自那一页）。
 *
 * 判据先行（开工前实测，必须红）：这 7 条词当刻 `routesFor` 全指
 * `calorie.view.exercise`（运动总览），本测试断言它们分别指
 * `-distribution`／`-trend`／`-recap` → 现状必红。
 * 本测试断言：
 *  1. `routesFor(7 条词)` 的 exec 记录 key 分别是 distribution(1)／trend(1)／recap(5)；
 *  2. 逐条按路由 cli 实跑（临时库，custom 用具体日期代占位），产物题面是各自那一页
 *     （eyebrow 含各自 key ＋ title 含各自页名），且不是「运动总览 」；
 *  3. 冻结表 `scene-04-exercise.ts` 这 7 条的 `main_prompt.cli`／`data_source`
 *     与路由 cli 逐字一致（D2④ 同源）。
 *
 * 变异证据（自证两行，机器读数见 `docs/skills/skill-calorie/t265-*.md`）：
 * - 变异红：任一条词的声明改回 `calorie.view.exercise` → 本测试变红；
 * - 还原一致：改回 → 全绿。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-routes-265.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { routesFor } from '../dist/triggers/routing.js';
import { SCENE_04_EXERCISE } from '../dist/triggers/scene-04-exercise.js';
import { assertDocPage } from './doc-page-assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

/** 7 条词 → 期望键／页名／eyebrow（分布 1＋趋势 1＋复盘 5）。 */
const CASES = [
  { word: '看运动类型分布', key: 'calorie.view.exercise-distribution', title: '运动类型分布 ' },
  { word: '看运动趋势', key: 'calorie.view.exercise-trend', title: '运动趋势 ' },
  { word: '运动复盘（本周）', key: 'calorie.view.exercise-recap', title: '运动复盘 ' },
  { word: '运动复盘（本月）', key: 'calorie.view.exercise-recap', title: '运动复盘 ' },
  { word: '运动复盘（最近 90 天）', key: 'calorie.view.exercise-recap', title: '运动复盘 ' },
  { word: '运动复盘（今年）', key: 'calorie.view.exercise-recap', title: '运动复盘 ' },
  { word: '运动复盘（自定义时间）', key: 'calorie.view.exercise-recap', title: '运动复盘 ' },
];

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't265-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

function runCli(dir, key, params, outName) {
  const out = join(dir, outName + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  const stdout = String(r.stdout || '').trim();
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}

function todayISO() {
  const pin = process.env['CALORIE_TODAY'];
  if (pin !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(pin)) return pin;
  return new Date().toISOString().slice(0, 10);
}

function seedThree(dir) {
  const today = todayISO();
  const seeds = [
    { type: '慢跑', calories: 320, minutes: 30, date: shiftISO(today, -2) },
    { type: '卧推', calories: 150, minutes: 30, category: '力量', loadKg: 60, reps: 10, date: shiftISO(today, -1) },
    { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5, date: today },
  ];
  for (let i = 0; i < seeds.length; i += 1) {
    const s = runCli(dir, 'calorie.exercise.add', seeds[i], 'seed-' + i);
    assert.equal(s.status, 0, 'seed ' + i + ' stderr=' + s.stderr.slice(-200));
  }
  return today;
}

/** 从路由 cli 文本里抠出 key 与 params（custom 占位用真实日期代）。 */
function parseCli(cli, today) {
  const m = String(cli).match(/^calorie-cmd-read\s+(\S+)\s+--params\s+'(.*)'$/s);
  assert.ok(m, '路由 cli 不是唯一出口形态：' + cli);
  const params = JSON.parse(m[2]);
  if (params.window === 'custom') {
    params.start = shiftISO(today, -6);
    params.end = today;
  }
  return { key: m[1], params };
}

test('#265 7 条词 routesFor 分别指 distribution/trend/recap', () => {
  for (const c of CASES) {
    const routes = routesFor(c.word);
    const exec = routes.filter((x) => x.kind === 'exec');
    assert.ok(exec.length >= 1, c.word + ' 应有 exec 记录，实测 ' + JSON.stringify(routes));
    assert.ok(exec.some((x) => x.key === c.key), c.word + ' 应指 ' + c.key + '，实测 ' + JSON.stringify(exec));
  }
});

test('#265 逐条按路由 cli 实跑是各自那一页、不是运动总览', () => {
  const dir = mkDir();
  const today = seedThree(dir);
  for (const c of CASES) {
    const routes = routesFor(c.word);
    const exec = routes.filter((x) => x.kind === 'exec').find((x) => x.key === c.key);
    assert.ok(exec, c.word + ' 缺期望 key 的 exec 记录');
    const { key, params } = parseCli(exec.cli, today);
    assert.equal(key, c.key, c.word + ' 路由 cli 的 key 不一致');
    const r = runCli(dir, key, params, 't265-' + c.word.replace(/[（）() ]/g, '_'));
    assert.equal(r.status, 0, c.word + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
    assertDocPage(r.file, c.word);
    assert.ok(r.envelope !== null, c.word + ' stdout 不是信封 JSON');
    assert.equal(r.envelope.data.output, r.out, c.word + ' 信封交付路径不是本次 --html 那一份');
    assert.ok(isAbsolute(r.envelope.data.output), c.word + ' 交付路径不是绝对路径');
    assert.ok(r.file.includes(c.key), c.word + ' 缺 eyebrow key ' + c.key);
    assert.ok(r.file.includes(c.title), c.word + ' 缺题面 ' + c.title);
    assert.ok(!r.file.includes('运动总览 '), c.word + ' 仍是运动总览页');
    assert.ok(r.file.includes('复制数据'), c.word + ' 缺复制区');
    assert.ok(r.file.length > 10000, c.word + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
  }
});

test('#265 冻结表 7 条 cli/data_source 与路由逐字一致', () => {
  for (const c of CASES) {
    const routes = routesFor(c.word);
    const exec = routes.filter((x) => x.kind === 'exec').find((x) => x.key === c.key);
    assert.ok(exec, c.word + ' 缺期望 key 的 exec 记录');
    const frozen = SCENE_04_EXERCISE.filter((t) => t.wake_word === c.word);
    assert.equal(frozen.length, 1, c.word + ' 在冻结表应恰 1 条，实测 ' + frozen.length);
    assert.equal(frozen[0].main_prompt.cli, exec.cli, c.word + ' 冻结 main_prompt.cli 不一致');
    assert.equal(frozen[0].data_source, exec.cli, c.word + ' 冻结 data_source 不一致');
  }
});
