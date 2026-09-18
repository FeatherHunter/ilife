/** #342 · 场景 04 运动记录级明细：新命令 `calorie.view.exercise-records` 接住记录一族。
 *
 * 老实物 `render_exercise_summary.py --mode records` ＋ `--today`／`--yesterday`／
 * `--has-note`／`--category 力量|有氧`。本票新增一条读命令，产物是完整文档
 * （`assembleDocPage`，五连走共用助手 `doc-page-assert.mjs`），含记录级列表
 * （逐条：日期／类型／分类／时长／消耗／距离／心率／备注）。
 *
 * 判据先行（开工前实测，必须红）：`routesFor('看运动记录（有备注）')` 当刻只有
 * `non-exec`（`legacy-chain`，理由 `noNoteFilter`），无 `exec` 记录。
 * 本测试断言：
 *  1. 新命令 `window 7d` → `exit 0`、完整文档五连、含记录级列表 8 列；
 *  2. `routesFor('看运动记录（有备注）')` 有 `exec` 记录，实跑产物是这一页（含备注列）；
 *  3. `看运动记录（按力量筛选）`／`（按有氧筛选）` 的 `routesFor` 指向新命令，
 *     实跑分别是力量／有氧子集；
 *  4. `看今日运动`／`看昨日运动`（`order 150／151`，已自 `src/home/routes.ts` 搬进
 *     `src/exercise/routes.ts` 并改指新命令）的 `routesFor` 指向新命令，
 *     实跑分别是今日／昨日窗口的记录级明细。
 *
 * 变异证据（自证两行，机器读数见 `docs/skills/skill-calorie/t342-*.md`）：
 * - 变异红：把 `src/exercise/records.ts` 的记录表标题 `运动记录明细` 改字
 *   → 本测试变红；
 * - 还原一致：改回 → 全绿。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-records-342.test.mjs`
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
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const NEW_KEY = 'calorie.view.exercise-records';

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't342-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘，回信封 ＋ 产物文本。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) },
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

/** 新命令共用的完整文档＋记录级列表断言（五连走共用助手）。 */
function assertRecordsPage(r, what) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');
  assert.ok(r.file.includes('运动记录'), what + ' 缺运动记录题面');
  assert.ok(r.file.includes('运动记录明细'), what + ' 缺记录级列表标题');
  for (const col of ['日期', '类型', '分类', '时长', '消耗', '距离', '心率', '备注']) {
    assert.ok(r.file.includes(col), what + ' 记录级列表缺列：' + col);
  }
  assert.ok(r.file.includes('复制数据'), what + ' 缺复制区');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
}

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}

function todayISO() {
  // #676：CALORIE_TODAY 已退役，本件只用真实时钟（父进程与子进程同一天，不靠环境变量对齐）。
  return new Date().toISOString().slice(0, 10);
}

/** 种子：7 天窗内 3 条（力量有备注／有氧无备注／日常有备注），覆盖分类与备注两维。 */
function seedThree(dir) {
  const today = todayISO();
  const d1 = shiftISO(today, -2);
  const d2 = shiftISO(today, -1);
  const seeds = [
    { type: '卧推', calories: 150, minutes: 30, category: '力量', loadKg: 60, reps: 10, note: '夜练', date: d1 },
    { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5, date: d2 },
    { type: '步行', calories: 80, minutes: 20, category: '日常', steps: 3000, note: '通勤', date: today },
  ];
  for (let i = 0; i < seeds.length; i += 1) {
    const s = runCli(dir, 'calorie.exercise.add', seeds[i], 'seed-' + i);
    assert.equal(s.status, 0, 'seed ' + i + ' stderr=' + s.stderr.slice(-200));
  }
  return { today, d1, d2 };
}

test('#342 新命令 window 7d 出记录级明细（完整文档五连＋8 列）', () => {
  const dir = mkDir();
  seedThree(dir);
  const r = runCli(dir, NEW_KEY, { window: '7d' }, 'records-7d');
  assertRecordsPage(r, '运动记录 7d');
  assert.ok(r.file.includes('卧推'), '缺力量类型值');
  assert.ok(r.file.includes('户外跑'), '缺有氧类型值');
  assert.ok(r.file.includes('夜练'), '缺备注值');
});

test('#342 有备注词有 exec 且实跑是这一页（只看带备注）', () => {
  const routes = routesFor('看运动记录（有备注）');
  const exec = routes.filter((x) => x.kind === 'exec');
  assert.ok(exec.length >= 1, '有备注词应有 exec 记录，实测 ' + JSON.stringify(routes));
  assert.ok(exec.some((x) => x.key === NEW_KEY), '有备注词应指新命令，实测 ' + JSON.stringify(exec));
  const cli = exec.find((x) => x.key === NEW_KEY).cli;
  assert.ok(cli.includes('hasNote'), '有备注路由应带 hasNote 参数，实测 ' + cli);
  const dir = mkDir();
  seedThree(dir);
  const r = runCli(dir, NEW_KEY, { window: '7d', hasNote: true }, 'records-note');
  assertRecordsPage(r, '有备注筛选');
  assert.ok(r.file.includes('夜练'), '备注筛选页缺有备注值');
  assert.ok(r.file.includes('通勤'), '备注筛选页缺第二条备注值');
  assert.ok(!r.file.includes('户外跑'), '备注筛选页不应含无备注的有氧行');
});

test('#342 按力量筛选指新命令且实跑是力量子集', () => {
  const routes = routesFor('看运动记录（按力量筛选）');
  const exec = routes.filter((x) => x.kind === 'exec');
  assert.ok(exec.some((x) => x.key === NEW_KEY), '力量筛选应指新命令，实测 ' + JSON.stringify(exec));
  const dir = mkDir();
  seedThree(dir);
  const r = runCli(dir, NEW_KEY, { window: '7d', category: '力量' }, 'records-strength');
  assertRecordsPage(r, '力量筛选');
  assert.ok(r.file.includes('卧推'), '力量子集缺卧推');
  assert.ok(r.file.includes('力量'), '力量子集缺分类值');
  assert.ok(!r.file.includes('户外跑'), '力量子集不应含有氧行');
});

test('#342 按有氧筛选指新命令且实跑是有氧子集', () => {
  const routes = routesFor('看运动记录（按有氧筛选）');
  const exec = routes.filter((x) => x.kind === 'exec');
  assert.ok(exec.some((x) => x.key === NEW_KEY), '有氧筛选应指新命令，实测 ' + JSON.stringify(exec));
  const dir = mkDir();
  seedThree(dir);
  const r = runCli(dir, NEW_KEY, { window: '7d', category: '有氧' }, 'records-cardio');
  assertRecordsPage(r, '有氧筛选');
  assert.ok(r.file.includes('户外跑'), '有氧子集缺户外跑');
  assert.ok(r.file.includes('有氧'), '有氧子集缺分类值');
  assert.ok(!r.file.includes('卧推'), '有氧子集不应含力量行');
});

test('#342 看今日／昨日运动路由指新命令且实跑是记录页（order 150／151 已搬）', () => {
  for (const w of ['看今日运动', '看昨日运动']) {
    const routes = routesFor(w);
    const exec = routes.filter((x) => x.kind === 'exec');
    assert.ok(exec.some((x) => x.key === NEW_KEY), w + '应指新命令，实测 ' + JSON.stringify(exec));
  }
  const dir = mkDir();
  const { today } = seedThree(dir);
  const yesterday = shiftISO(today, -1);
  const rToday = runCli(dir, NEW_KEY, { window: '今日' }, 'records-today');
  assertRecordsPage(rToday, '今日窗口');
  assert.ok(rToday.file.includes(today), '今日页缺今日日期 ' + today);
  const rY = runCli(dir, NEW_KEY, { window: '昨日' }, 'records-yesterday');
  assertRecordsPage(rY, '昨日窗口');
  assert.ok(rY.file.includes(yesterday), '昨日页缺昨日日期 ' + yesterday);
  assert.ok(today !== undefined, '种子日期占位');
});
