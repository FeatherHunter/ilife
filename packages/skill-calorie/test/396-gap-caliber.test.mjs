/** #396 · 今日缺口展示消歧（只动展示、不改算法）——真出口判据，固定种子库。
 *
 * 裁定二选一（回写票面）：①口径取 TDEE 系（series 同源；BMR 口径值 780 须改算法，
 * 本票禁区不许）；口径名取老技能 ADR-0013 中文「热量缺口」（TDEE 口径默认），英文不上屏
 * （`t425` 裁定 1 ＋ `t401c` 探针 A1）；②展示取「口径名与算式同页可见」（卡片并列不动，
 * 避免版式重排）。只动 `homeDocs.ts`（行内 6 改 6 删，LF 钉 334），`homeViewParts.ts` 一字未动。
 *
 * **#396 值的重冻（#609 重冻第二批，值处逐条写出处）**：本票「算法未动」这条判据冻的是**当刻口径**的缺口
 * 1687（#396 当时的读数），#609 重冻为 **1696**。成因与出处：提交 `7831393`（#518 W2）把
 * `src/analysis/series.ts::loadProfileTdee` 由 `calcTdee(70.0, …)` 改成**读最近一次称重**
 * （本仓种子库 `docs/research/t81-seed.mjs` 最近一次称重 ＝ `2026-09-08 70.6kg`），TDEE 由 2556 抬到
 * 2565（Δ9 卡/日）；缺口 ＝ TDEE ＋ 当日运动 − 摄入 ＝ 2565 ＋ 320 − 1189 = **1696**。
 * 同上屏值「消耗」由 2876 变 **2885**（＝2565＋320）。回退口径一字未变：档案无体重记录时 TDEE 仍 2556
 * （#590 的 A/B 读数 1696 ↔ 1687 见 `docs/skills/skill-calorie/t589-重冻-证据.md`）。
 * 跑法：`node --test packages/skill-calorie/test/396-gap-caliber.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 真出口跑一遍：固定种子库（`SEED_TODAY`）＋`dist/cli/cmd_read.js`，与 `t401c` 探针同法。 */
function render(params) {
  const workDir = mkdtempSync(join(tmpdir(), 't396-seed-'));
  const db = openDb(join(workDir, DB_FILENAME));
  seedFull(db);
  db.close();
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.home', '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(workDir)), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, '真出口 exit 0（stderr：' + String(r.stderr).slice(0, 300) + '）');
  const env = JSON.parse(String(r.stdout).trim());
  return { env, html: readFileSync(env.data.output, 'utf8') };
}

const OVERVIEW = render({ date: '今日' });
const BUDGET = render({ date: '今日', section: 'budget' });

test('#396 口径名与算式同页可见（overview）：卡名带热量缺口＋算式＋基准说明', () => {
  for (const needle of [
    '今日缺口（热量缺口）',
    '缺口等于消耗减摄入',
    '日常消耗加运动',
    '日常消耗取档案静态值',
    '与目标减摄入基准不同',
  ]) {
    assert.ok(OVERVIEW.html.includes(needle), '页上无位：' + needle);
  }
  // 老针位兼容：`home-lock-374` 的 `今日缺口` 仍是新卡名的子串。
  assert.ok(OVERVIEW.html.includes('今日缺口'), '老针位 `今日缺口` 丢了');
});

test('#396 算法未动：缺口值仍是 TDEE 系（1696），611 只是还能吃多少', () => {
  /* 1696 的出处＝`Math.round((10×70.6 ＋ 6.25×175 − 5×30 ＋ 5)×1.55) ＋ 320 − 1189`：
   * 算式住 `src/analysis/utils.ts::calcTdee`（Mifflin-St Jeor × `TDEE_ACTIVITY_FACTORS.moderate=1.55`），
   * 体重 70.6kg 住种子库**最近一次称重**、运动 320 住 2026-09-07 那条运动记录、摄入 1189 住当日饮食合计；
   * 成因提交号与 Δ9 的推导见件头「#396 值的重冻」段（#609 重冻第二批）。 */
  assert.equal(OVERVIEW.env.data.metrics.deficitToday, 1696, '缺口值变了（算法被顺手改了）');
  assert.equal(OVERVIEW.env.data.metrics.intakeCal, 1189, '摄入变了（种子漂移）');
  // 611＝目标 1800 − 摄入 1189：预算侧的数，与缺口不是同一个量（票面已查清）。
  assert.equal(1800 - 1189, 611, '前置算式');
  assert.ok(OVERVIEW.html.includes('1696'), '缺口值 1696 没上屏');
  assert.ok(OVERVIEW.html.includes('2885'), '消耗 2885 没上屏（2565＋320）');
});

test('#396 英文不上屏：可见文本无全大写常量（t401c A1 同口径）', () => {
  const allowed = new Set(['AI', 'JSON']);
  const hits = machineWords(OVERVIEW.html)
    .filter((w) => w.hit !== null && !allowed.has(w.hit))
    .map((w) => w.kind + '＝「' + w.hit + '」');
  assert.deepEqual(hits, [], '可见文本里出现机器话：' + hits.join('　'));
});

test('#396 分隔符守卫：新增文案无并列分隔符（t401 同口径）', () => {
  const parallel = ['·', '；', ';', '｜', '|', '／', '/', '、', '＋'];
  for (const needle of [
    '今日缺口（热量缺口）',
    '缺口等于消耗减摄入',
    '日常消耗加运动',
    '日常消耗取档案静态值',
    '与目标减摄入基准不同',
    '摄入比消耗少。与目标减摄入基准不同',
  ]) {
    for (const sep of parallel) assert.ok(!needle.includes(sep), '新增文案含并列分隔符：' + needle + ' ← ' + sep);
  }
  assert.ok(visibleText(stripCopyPayload(OVERVIEW.html)).length > 0, '可见文本抽空了');
});

test('#396 分档限定：budget 档不出缺口卡（仍是剩余预算）', () => {
  assert.ok(BUDGET.html.includes('剩余预算'), 'budget 档丢了主角');
  assert.ok(!BUDGET.html.includes('今日缺口（热量缺口）'), '缺口卡名漏进 budget 档');
});
