/** #255 · 目标管理单一来源：代表唤醒词由路由层派生，缺项即红（真假对照）。
 *
 * 真（绿）：真实路由层上 `checkGoalCoverage()` 必过——29 唤醒词人人有 exec 路由、
 * 15 键个个有目标唤醒词、9 个展示代表词人人路由回同键且互不重复；
 * `goalRepresentatives()` 的 4 处修复逐字等于路由层（`看目标完成度`／`看目标配置`／
 * `看目标推荐`／`看体重目标进度`），`buildHelpBlock()` 的目标段无错配无重复。
 * 假（红）：合成输入里删掉一个目标唤醒词（`看目标配置`）→ `checkGoalCoverage()` 必抛
 * 且点名该词；逐字节还原后必绿（自证见证据 `t255-单一来源-证据.md`）。
 *
 * 运行：`node tooling/run-locked.mjs --ticket 255 -- node --test packages/skill-calorie/test/t255-单一来源.test.mjs`
 * 只读 `dist/`，不写任何东西（`build-help.mjs` 被 import 时零副作用）。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  GOAL_READ_KEYS,
  GOAL_FAMILY_KEYS,
  goalRepresentatives,
  checkGoalCoverage,
  buildHelpBlock,
  buildMissingReport,
} from '../scripts/build-help.mjs';
// #702 · 换缝：`ALL_ROUTES` 的正本件是生成物 `routes.generated.js`；`routing.js` 只是薄转出它
// （`src/triggers/routing.ts:35,137` 逐字），同一符号两个路径由结构门 `scripts/check-one-path.mjs` 判红。
// 本件取值语句一字未动，只把 import 路径换成正本件。
import { ALL_ROUTES } from '../dist/triggers/routes.generated.js';
import { SCENE_06_GOAL } from '../dist/triggers/scene-06-goal.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const FROZEN = SCENE_06_GOAL.map((t) => t.wake_word);

test('#255 真：目标 29 词 15 键双向覆盖必过', () => {
  const r = checkGoalCoverage();
  assert.equal(r.wakes, 29, '目标唤醒词应 25 冻结＋4 新拟修复＝29');
  assert.equal(r.keys, 15, '目标族应写 5＋读 10＝15');
  assert.equal(r.reps, 9, '展示代表词应 9');
  assert.deepEqual([...FROZEN].length, 25, '冻结词应 25');
});

test('#255 真：4 处修复逐字等于路由层首词', () => {
  const g = goalRepresentatives();
  assert.equal(g.get('calorie.view.goal'), '看目标完成度');
  assert.equal(g.get('calorie.view.goal-config'), '看目标配置');
  assert.equal(g.get('calorie.view.goal-recommend'), '看目标推荐');
  assert.equal(g.get('calorie.view.goal-weight'), '看体重目标进度');
  assert.equal(g.get('calorie.view.goal-wizard'), '看目标预检');
  // 每个代表词在路由层确有同键 exec 记录（路由回同键）：
  for (const k of GOAL_READ_KEYS) {
    const w = g.get(k);
    const hits = ALL_ROUTES.filter((x) => x.kind === 'exec' && x.wakeWord === w);
    assert.ok(hits.some((x) => x.key === k), w + ' 未路由回 ' + k);
  }
  // 9 个代表词互不重复：
  assert.equal(new Set(g.values()).size, g.size, '代表词重复');
});

test('#255 真：SKILL 目标段无错配无重复', () => {
  const block = buildHelpBlock();
  const rowOf = (key) => block.split('\n').find((l) => l.includes('| ' + key + ' |'));
  assert.ok(rowOf('calorie.view.goal').startsWith('| 看目标完成度 |'), 'view.goal 首列');
  assert.ok(rowOf('calorie.view.goal-config').startsWith('| 看目标配置 |'), 'view.goal-config 首列');
  assert.ok(rowOf('calorie.view.goal-recommend').startsWith('| 看目标推荐 |'), 'view.goal-recommend 首列');
  assert.ok(rowOf('calorie.view.goal-weight').startsWith('| 看体重目标进度 |'), 'view.goal-weight 首列');
  assert.ok(rowOf('calorie.view.goal-wizard').startsWith('| 看目标预检 |'), 'view.goal-wizard 首列');
  // 写词只许指向写命令：定营养／定体重两词各只领一行写键：
  const dingYing = block.split('\n').filter((l) => l.startsWith('| 定营养目标 |'));
  assert.equal(dingYing.length, 1, '定营养目标应只一行：' + JSON.stringify(dingYing));
  assert.ok(dingYing[0].includes('calorie.goal.set'), '定营养目标应指写命令');
  const dingTi = block.split('\n').filter((l) => l.startsWith('| 定体重目标 |'));
  assert.equal(dingTi.length, 1, '定体重目标应只一行');
  assert.ok(dingTi[0].includes('calorie.goal.weight'), '定体重目标应指写命令');
  // 看今日目标进度只领一行（场景 01 代管的 progress），不再占目标管理两行：
  const today = block.split('\n').filter((l) => l.startsWith('| 看今日目标进度 |'));
  assert.equal(today.length, 1, '看今日目标进度应只一行：' + JSON.stringify(today));
  assert.ok(today[0].includes('calorie.view.goal-progress'), '看今日目标进度应指 progress');
});

test('#255 真：全量缺失清单里目标族为零（其余各域只报不拦）', () => {
  const r = buildMissingReport();
  const goalHit = (s) => GOAL_FAMILY_KEYS.some((k) => s.includes(k))
    || ['看目标完成度', '看目标配置', '看目标推荐', '看体重目标进度', '看目标预检'].some((w) => s.includes(w));
  assert.deepEqual(r.noWake.filter(goalHit), [], '目标族不应出现在无词清单');
  assert.deepEqual(r.mismatched.filter(goalHit), [], '目标族不应出现在错配清单');
  assert.deepEqual(r.duplicated.filter(goalHit), [], '目标族不应出现在重复清单');
  console.log('GOAL-COVERAGE ok（wakes=29 keys=15 reps=9 dupe=0）');
});

test('#255 假：删掉看目标配置即红（缺项即红的机械证明）', () => {
  const pruned = ALL_ROUTES.filter((r) => r.wakeWord !== '看目标配置');
  assert.throws(() => checkGoalCoverage({ routes: pruned }), /看目标配置/,
    '删掉目标唤醒词后应抛并点名');
  // 还原即绿（同一进程内原输入仍过）：
  assert.doesNotThrow(() => checkGoalCoverage(), '还原后应绿');
  console.log('MUTATION-GOAL-MISSING ok（删看目标配置必红，还原必绿）');
});
