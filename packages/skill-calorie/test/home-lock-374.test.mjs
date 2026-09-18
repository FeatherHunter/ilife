/** #374 · 场景 01 主页 9 条真正的交付出口锁（CLI 级，不是模块级）。
 *
 * 每条＝对应唤醒词 `main_prompt.cli`（逐字照 `src/triggers/scene-01-home.ts` order 0–8），
 * 在固定种子库（`docs/research/t81-seed.mjs::seedFull`，`CALORIE_TODAY＝SEED_TODAY`）上经
 * `dist/cli/cmd_read.js` 真跑，断言两档：① 落盘／绝对路径／可打开／字节如实；
 * ② 内容与字段（`help-delivery-139` 形状＋`help-shell-134` 整页五连＋页上针位）。
 * 空库一档：可读缺失阻断 exit 4、不落盘也算跑得通（与 #371／#372／#373 同口径）。
 * 视觉留 #375 肉眼，本文件不做视觉判断。
 * 变异：`T374_BREAK=1` 给首条加一处必 miss 的针，必红；去掉必绿。
 * 运行：`node --test packages/skill-calorie/test/home-lock-374.test.mjs`
 *
 * #401c · 针位收一号：`HOME` 首针原为「今日总览」（h1 里那个整串），现改「总览」——
 * #401c 照审计工单把页名改成如实反映**本唤醒词的窗口**（今日／近 7 天／近 30 天），
 * 同一命令键（`calorie.view.home`）带不同 `windowDays` 不再四页共用一个「今日总览」。
 * 针的**本意**是「h1 位有内容且是这一族的话」，故取共有的「总览」二字；其余针一字未动。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const BREAK = process.env.T374_BREAK === '1';

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { assertDocPage } = await import(pathToFileURL(join(HERE, 'doc-page-assert.mjs')).href);

const HOME = ['总览', '今日摄入', '蛋白', '饮水', '今日缺口', '连续记录', '周均摄入', '复制数据'];
const CASES = [
  { wake: '看今日主页', key: 'calorie.view.home', cli: `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'`, shape: 'doc', needles: [...HOME, 'calorie.view.home'] },
  { wake: '看今日饮食概览', key: 'calorie.view.diet', cli: `calorie-cmd-read calorie.view.diet --params '{"window":"今日"}'`, shape: 'doc', needles: ['累计', '日均', '目标', '趋势', '按日汇总', '蛋白', 'calorie.view.diet'] },
  { wake: '看今日运动概览', key: 'calorie.view.exercise', cli: `calorie-cmd-read calorie.view.exercise --params '{"window":"今日"}'`, shape: 'doc', needles: ['总消耗', '总时长', '按日消耗', '按类型明细', 'calorie.view.exercise'] },
  { wake: '看今日体重概览', key: 'calorie.view.weight', cli: 'calorie-cmd-read calorie.view.weight', shape: 'doc', needles: ['体重总览', '最新体重', '距目标', '变化', '体重曲线', '体重记录', 'calorie.view.weight'] },
  { wake: '看今日目标进度', key: 'calorie.view.goal-progress', cli: `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'`, shape: 'doc', needles: ['目标进度', '热量目标', '每日达标', '复制数据', 'calorie.view.goal-progress'] },
  { wake: '看本周主页', key: 'calorie.view.home', cli: `calorie-cmd-read calorie.view.home --params '{"windowDays":7,"date":"今日"}'`, shape: 'doc', needles: [...HOME, 'calorie.view.home'] },
  { wake: '看本月主页', key: 'calorie.view.home', cli: `calorie-cmd-read calorie.view.home --params '{"windowDays":30,"date":"今日"}'`, shape: 'doc', needles: [...HOME, 'calorie.view.home'] },
  { wake: '看连续记录天数', key: 'calorie.view.home', cli: `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'`, shape: 'doc', needles: [...HOME, 'calorie.view.home'] },
  { wake: '看今日热量预算', key: 'calorie.view.home', cli: `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'`, shape: 'doc', needles: [...HOME, 'calorie.view.home'] },
];
if (BREAK) CASES[0].needles.push('__MUTATED_MISSING__');

function tokenize(cli) {
  const out = []; let cur = ''; let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function runOne(workDir, cli) {
  const toks = tokenize(cli);
  const r = spawnSync(process.execPath, [CLI, ...toks.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(workDir), ...freezeClock(SEED_TODAY) },
  });
  return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '').slice(0, 300) };
}
function checkSeeded(c) {
  const workDir = mkdtempSync(join(tmpdir(), 't374-seed-'));
  const db = openDb(join(workDir, DB_FILENAME));
  seedFull(db);
  db.close();
  const r = runOne(workDir, c.cli);
  assert.equal(r.status, 0, c.wake + ' exit 0（stderr：' + r.stderr + '）');
  assert.equal(r.stdout.trim().split('\n').length, 1, c.wake + ' stdout 恒一行 JSON');
  const env = JSON.parse(r.stdout.trim());
  assert.equal(env.key, c.key, c.wake + ' envelope key');
  assert.equal(env.shape, 'stat', c.wake + ' shape');
  const out = env?.data?.output;
  assert.ok(out && isAbsolute(out), c.wake + ' output 须绝对路径：' + out);
  assert.equal(basename(dirname(out)), 'calorie_html', c.wake + ' 落 calorie_html/');
  assert.ok(existsSync(out), c.wake + ' 产物须真实落盘');
  const html = readFileSync(out, 'utf8');
  assert.equal(env?.delivery?.bytes, statSync(out).size, c.wake + ' delivery.bytes＝落盘字节');
  assert.equal(Buffer.byteLength(html, 'utf8'), statSync(out).size, c.wake + ' 字节如实');
  assert.equal(env?.delivery?.path, out, c.wake + ' delivery.path 与 output 同值');
  if (c.shape === 'doc') assertDocPage(html, c.wake);
  else {
    assert.ok(html.startsWith('<section'), c.wake + ' 片段页以 <section 起');
    assert.equal(html.startsWith('<!doctype html>'), false, c.wake + ' 片段页不得已是完整文档');
  }
  for (const n of c.needles) assert.ok(html.includes(n), c.wake + ' 页上无位：' + n);
}
function checkEmpty(c) {
  const workDir = mkdtempSync(join(tmpdir(), 't374-empty-'));
  const r = runOne(workDir, c.cli);
  const landed = existsSync(join(workDir, 'calorie_html')) ? readdirSync(join(workDir, 'calorie_html')).length : 0;
  assert.equal(r.status, 4, c.wake + ' 空库 exit 4（stderr：' + r.stderr + '）');
  assert.ok(/缺失阻断|missing-data|取数失败/.test(r.stderr), c.wake + ' 空库须可读阻断');
  assert.equal(landed, 0, c.wake + ' 空库不落盘');
}

for (const c of CASES) {
  test('#374 ' + c.wake + '（有段出页／无段阻断算通）', () => {
    checkSeeded(c);
    checkEmpty(c);
  });
}
