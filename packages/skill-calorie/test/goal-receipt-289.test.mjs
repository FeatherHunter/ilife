/** #289 · 写后回执三族字段补齐（营养／饮水／体重）＋自动算两段对照。
 *
 * 前置 #253（骨架 5/5 绿）只给了三块：操作回执／字段变更／库里现在的目标。本票在 `src/goal/receipt.ts`
 * 装配三族区块（`sec-macro`／`sec-water`／`sec-rate`）与自动算段（`sec-auto`），吃 `set.ts` 草稿与
 * `recommendWaterGoal` 现成口径，不新增命令，不改唤醒词。
 *
 * 判据（形状沿 `test/goal-receipt-253.test.mjs` 的临时种子库＋真 CLI）：
 *   §4.1 营养写回执含 `宏量换算 {x} 卡` 与 `diff {±Y} 卡`，`|diff|>50` 出 `建议复核`，换算式逐值可对；
 *   §4.2 热量 `<` BMR 出低值提示，`≥` 出 `BMR 安全确认`，缺项出 `缺×，不算`；
 *   §4.3 饮水写回执含 `体重 {w} kg × {35|30} ml/kg`＋季节＋推荐值，改类含旧→新 vs 推荐三段；
 *   §4.4 体重写回执含目标／截止／剩余天数／建议速率／起始日／起点体重／公式，极端出红条，无截止出固定句；
 *   §4.5 自动算三条含推荐值段＋采纳后写入值段，采纳值逐格读库；
 *   §4.6 暂停／重启页无新增段落（他域逐字节不变的页内证据，跨页字节比对见证据件）。
 *
 * 数据面：临时库（`mkdtemp`）＋ `docs/research/t81-seed.mjs` 的 `seedFull()`，`CALORIE_TODAY` 钉
 * `SEED_TODAY`（2026-09-07）。种子画像：30／男／175／moderate，最新体重 70.6kg，热量 1800／150／200／50，
 * 饮水 2000，体重目标 68，截止 2026-12-31。季节按运行月现算（老技能 `nutrition_goal.py:266-269` 同规则）。
 *
 * 预期值出处（证据 `t289-补齐-证据.md` §3，老文件行号）：
 * BMR＝round(10×70.6＋6.25×175−5×30＋5)＝1655；手填 1800/150/200/50 合计 1850 diff ＋50（边界一致）；
 * 反例 1800/100/100/100 合计 1700 diff −100；70.6→68／115天 per_week 0.16；70.6→60／24天 per_week 3.09
 * 且 daily 3400（双极端）；饮水 70.6×35＝2471（夏）／×30＝2118（冬）。
 * 自动算推荐数与 wizard 页同源（`buildGoalDraft`，cut：2065／141／247，与老模板 2064 差一是 #251 取整口径，不退）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（用例吃 dist），再
 * node --test packages/skill-calorie/test/goal-receipt-289.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { seedFull, SEED_TODAY } from '../../../docs/research/t81-seed.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
/** 四个新增段落锚点（暂停／重启页必须一个都没有）。 */
const NEW_SECTIONS = ['sec-macro', 'sec-water', 'sec-rate', 'sec-auto'];
/** 运行月推季节（老技能 `nutrition_goal.py:266-269`：6/7/8/9 月为夏）。 */
const SUMMER = (() => { const m = new Date().getMonth() + 1; return m >= 6 && m <= 9; })();
const ML_PER_KG = SUMMER ? 35 : 30;
const SEASON = SUMMER ? '夏' : '冬';
/** 种子体重 70.6kg 的饮水推荐（`int(w×ml/kg)`，`nutrition_goal.py:271`）。 */
const WATER_REC = Math.trunc(70.6 * ML_PER_KG);

/** 一份标准种子库（只写系统 tmp）。 */
function mkSeed() {
  const dir = mkdtempSync(join(tmpdir(), 't289-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    seedFull(db);
  } finally {
    db.close();
  }
  return dir;
}

/** 种子库再删档案表（造 `energyOf` 缺项：缺身高／年龄／性别／活动量，体重 70.6 还在）。 */
function mkSeedNoProfile() {
  const dir = mkSeed();
  const db = openDb(join(dir, DB_FILENAME));
  try {
    db.prepare('DELETE FROM user_profile').run();
  } finally {
    db.close();
  }
  return dir;
}

/** 一份空库（只有 schema：无目标行算无截止分支）。 */
function mkEmpty() {
  const dir = mkdtempSync(join(tmpdir(), 't289-bare-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一次并落盘，exit 0 才回可见文本。 */
function runOk(dir, key, params, outName) {
  const out = join(dir, outName + '.html');
  const args = [BIN, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push('--html', out);
  const r = spawnSync(NODE_BIN, args, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, key + ' 应 exit 0，实测 ' + r.status + ' ' + String(r.stderr || '').trim().slice(-400));
  assert.ok(existsSync(out), key + ' 未落盘 ' + out);
  return readFileSync(out, 'utf8');
}

/** 页面可见文案（去 script／style、去全部标签）：断言词在不在看这一层。 */
function visibleText(html) {
  return html.slice(html.indexOf('<body>'))
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function hasAll(v, words, where) {
  for (const w of words) assert.ok(v.includes(w), where + ' 缺词：' + w);
}

test('§4.1 营养族：宏量合计与换算式逐值可对，反例出建议复核', () => {
  const v = visibleText(runOk(mkSeed(), 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, 'n1'));
  hasAll(v, ['合计 1850 卡', '宏量换算 1850 卡', 'diff ＋50 卡', '一致', '换算式', '蛋白 150×4＋碳水 200×4＋脂肪 50×9＝1850 卡'], '手填向量');
  assert.ok(!v.includes('不一致'), '边界 diff 50 应判一致');
  const bad = visibleText(runOk(mkSeed(), 'calorie.goal.set', { calorie: 1800, protein: 100, carbs: 100, fat: 100 }, 'n2'));
  hasAll(bad, ['宏量换算 1700 卡', 'diff -100 卡', '不一致，建议复核'], '反例向量');
});

test('§4.2 BMR 提示：低值警告／安全确认／缺项不算', () => {
  const low = visibleText(runOk(mkSeed(), 'calorie.goal.set', { calorie: 1200, protein: 150, carbs: 200, fat: 50 }, 'b1'));
  hasAll(low, ['BMR 1655 卡', '基础代谢', '低于基础代谢 BMR 1655 卡', '建议复核'], '低值向量');
  const ok = visibleText(runOk(mkSeed(), 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, 'b2'));
  hasAll(ok, ['BMR 1655 卡', 'BMR 安全确认'], '安全向量');
  const miss = visibleText(runOk(mkSeedNoProfile(), 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, 'b3'));
  hasAll(miss, ['缺身高', '不算'], '缺项向量');
  assert.ok(!miss.includes('BMR 1655'), '缺项时不许出 BMR 数字');
});

test('§4.3 饮水族：体重×ml/kg＋季节＋推荐值，改类三段对照', () => {
  const v = visibleText(runOk(mkSeed(), 'calorie.goal.water', { water: 2400 }, 'w1'));
  hasAll(v, ['70.6 kg × ' + ML_PER_KG + ' ml/kg', '季节', SEASON, '推荐 ' + WATER_REC + ' ml'], '饮水对照');
  hasAll(v, ['旧 2000 → 新 2400 ml', '推荐 ' + WATER_REC + ' ml'], '改类三段');
});

test('§4.4 体重族：剩余天数与建议速率及公式，极端红条与无截止固定句', () => {
  const v = visibleText(runOk(mkSeed(), 'calorie.goal.weight', { kg: 68, deadline: '2026-12-31' }, 't1'));
  hasAll(v, ['115 天', '建议速率', '0.16 kg/周', '2.6kg ÷ 115天 × 7 = 0.16 kg/周', '每日增加 174 卡缺口'], '常规向量');
  assert.ok(!v.includes('极端目标'), '常规向量不许出极端');
  const hot = visibleText(runOk(mkSeed(), 'calorie.goal.weight', { kg: 60, deadline: '2026-10-01' }, 't2'));
  hasAll(hot, ['极端目标', '3.09 kg/周', '10.6kg ÷ 24天 × 7 = 3.09 kg/周', '每日增加 3400 卡缺口'], '极端向量');
  const bare = visibleText(runOk(mkEmpty(), 'calorie.goal.weight', { kg: 68 }, 't3'));
  assert.ok(bare.includes('未设置截止日期，无法计算建议速率。'), '无截止固定句');
  const st = visibleText(runOk(mkSeed(), 'calorie.goal.weight', { kg: 65, startKg: 72, startDate: '2026-09-01', deadline: '2026-12-31' }, 't4'));
  hasAll(st, ['7.0kg ÷ 115天 × 7 = 0.43 kg/周', '72 kg', '2026-09-01'], '含起始日向量');
});

test('§4.5 自动算：推荐值段＋采纳后写入值段两段对照', () => {
  const v = visibleText(runOk(mkSeed(), 'calorie.goal.set', { calorie: 2065, protein: 141, carbs: 247, fat: 57, profile: 'cut' }, 'a1'));
  hasAll(v, ['推荐值', '采纳后写入值', '减脂（cut）', '热量 2065 卡', 'BMR 1655 卡', 'TDEE 2565 卡', '每周 0.5 kg/周', '宏量换算 2065 卡 diff ＋0 卡', '推荐依据', '采纳值逐格读库'], '营养自动算');
  const w = visibleText(runOk(mkSeed(), 'calorie.goal.water', { water: 2471, profile: 'cut' }, 'a2'));
  hasAll(w, ['推荐值', '采纳后写入值', '饮水', '推荐 2471 ml'], '饮水自动算');
  const t = visibleText(runOk(mkSeed(), 'calorie.goal.weight', { kg: 66, deadline: '2026-12-31', profile: 'cut' }, 'a3'));
  hasAll(t, ['推荐值', '采纳后写入值', '66 kg'], '体重自动算');
  const plain = visibleText(runOk(mkSeed(), 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, 'a0'));
  assert.ok(!plain.includes('采纳后写入值'), '不带 profile 不许出采纳段');
});

test('§4.6 他域页无新增段落：暂停／重启页四锚点全缺，三族页各有其段', () => {
  const pause = runOk(mkSeed(), 'calorie.goal.pause', {}, 'z1');
  const resume = runOk(mkSeed(), 'calorie.goal.resume', {}, 'z2');
  for (const s of NEW_SECTIONS) {
    assert.ok(!pause.includes(s), '暂停页不许含 ' + s);
    assert.ok(!resume.includes(s), '重启页不许含 ' + s);
  }
  const set = runOk(mkSeed(), 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, 'z3');
  const water = runOk(mkSeed(), 'calorie.goal.water', { water: 2400 }, 'z4');
  const weight = runOk(mkSeed(), 'calorie.goal.weight', { kg: 68, deadline: '2026-12-31' }, 'z5');
  assert.ok(set.includes('sec-macro') && !set.includes('sec-water') && !set.includes('sec-rate'), '营养页只增营养段');
  assert.ok(water.includes('sec-water') && !water.includes('sec-macro') && !water.includes('sec-rate'), '饮水页只增饮水段');
  assert.ok(weight.includes('sec-rate') && !weight.includes('sec-macro') && !weight.includes('sec-water'), '体重页只增速率段');
});
