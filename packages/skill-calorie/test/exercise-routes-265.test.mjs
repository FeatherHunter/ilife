/** #265 · 场景 04 运动：7 条读类词归位（拿回各自那一页）。
 *
 * 判据先行（开工前实测，必须红）：这 7 条词当刻 `routesFor` 全指
 * `calorie.view.exercise`（运动总览），本测试断言它们分别指
 * `-distribution`／`-trend`／`-recap` → 现状必红。
 * 本测试断言：
 *  1. `routesFor(7 条词)` 的 exec 记录 key 分别是 distribution(1)／trend(1)／recap(5)；
 *  2. 逐条按路由 cli 实跑（临时库，custom 用具体日期代占位），产物题面是各自那一页
 *     （题面含各自页名 ＋ 复制载荷头认「技能 · 页名」），且不是「运动总览 」；
 *  3. 冻结表 `scene-04-exercise.ts` 这 7 条的 `main_prompt.cli`／`data_source`
 *     与路由 cli 逐字一致（D2④ 同源）。
 *
 * #465 更新判据：页身份改由**可见面题面**＋**载荷面复制头**两处认，全份产物零命令键
 * （旧断言要产物含 `c.key`，与本图「可见面零工程话」口径正面冲突；对照见 t465 证据件）。
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
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

/** 7 条词 → 期望键／页名／眉标（分布 1＋趋势 1＋复盘 5）。
 *  #465：版式换过后题面不再连写窗口，页身份改认「眉标逐字 ＋ 载荷头页名」（两处都是人话）。
 *  #475：`titleExact`＝该页题面**逐字页名**（分布页，窗口住「窗口」卡）；缺省＝题面连写窗口（趋势／复盘）。 */
const CASES = [
  { word: '看运动类型分布', key: 'calorie.view.exercise-distribution', page: '运动类型分布', eyebrow: '运动 · 类型分布', titleExact: true },
  { word: '看运动趋势', key: 'calorie.view.exercise-trend', page: '运动趋势', eyebrow: '运动 · 趋势' },
  { word: '运动复盘（本周）', key: 'calorie.view.exercise-recap', page: '运动复盘', eyebrow: '运动 · 复盘' },
  { word: '运动复盘（本月）', key: 'calorie.view.exercise-recap', page: '运动复盘', eyebrow: '运动 · 复盘' },
  { word: '运动复盘（最近 90 天）', key: 'calorie.view.exercise-recap', page: '运动复盘', eyebrow: '运动 · 复盘' },
  { word: '运动复盘（今年）', key: 'calorie.view.exercise-recap', page: '运动复盘', eyebrow: '运动 · 复盘' },
  { word: '运动复盘（自定义时间）', key: 'calorie.view.exercise-recap', page: '运动复盘', eyebrow: '运动 · 复盘' },
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
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir))},
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
  // #676：CALORIE_TODAY 已退役，本件只用真实时钟（父进程与子进程同一天，不靠环境变量对齐）。
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

/** 复制菜单某一格式的 `data-t` 载荷（**机器面**；实体还原后原样返回）。 */
function copyPayload(html, fmt) {
  const m = new RegExp('data-fmt="' + fmt + '"[^>]*?data-t="([^"]*)"').exec(html);
  assert.ok(m !== null, '产物里读不到 ' + fmt + ' 格式的复制载荷');
  return m[1]
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** **可见面**眉标逐字（`运动 · <页名>`）；读不到即 fail（形制变了要当面红，不静默放过）。 */
function eyebrow(html) {
  const m = /<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html);
  assert.ok(m !== null, '产物里读不到眉标（ilife-block-page-shell-eyebrow）');
  return m[1];
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
    assert.equal(eyebrow(r.file), c.eyebrow, c.word + ' 眉标不是各自那一页：' + eyebrow(r.file));
    assert.ok(r.file.includes(c.page), c.word + ' 缺题面 ' + c.page);
    // #475 补硬：页题认**页题节点**的文本（旧写法 `r.file.includes(c.page)` 会被 `<title>`／复制载荷代跑，
    // 页题节点本身改成别的字样也不红）。分布页题面逐字页名——连写窗口即红。
    const t = /<h1 class="ilife-block-page-shell-title">([^<]*)<\/h1>/.exec(r.file);
    assert.ok(t !== null, c.word + ' 产物里读不到页题节点（ilife-block-page-shell-title）');
    assert.ok(c.titleExact === true ? t[1] === c.page : t[1].startsWith(c.page + ' '),
      c.word + ' 页题节点不是本页题面：' + JSON.stringify(t[1]));
    // #465 口径：页的「身份」认人话两面 —— 可见面（眉标逐字）＋载荷面（复制头「技能 · 页名」）；
    // 命令键一次都不许印出来（旧断言 `r.file.includes(c.key)` 要产物含命令键，与新口径正面冲突）。
    assert.ok(!r.file.includes('calorie.view.'), c.word + ' 产物里出现命令键 calorie.view.*');
    assert.ok(!r.file.includes('移植'), c.word + ' 产物里出现工序词「移植」');
    const fold = copyPayload(r.file, 'text');
    assert.ok(fold.startsWith('【calorie ' + c.page + '】\n'),
      c.word + ' 复制载荷头不是「技能 · 页名」：' + JSON.stringify(fold.slice(0, 40)));
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
