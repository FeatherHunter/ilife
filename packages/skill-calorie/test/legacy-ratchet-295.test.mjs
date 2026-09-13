/**
 * #295 · 未搬迁命令清单（`src/cli/legacyCommands.ts`）的机器棘轮。
 *
 * 这份清单是 #295 引入的**过渡期住处**：92 条命令的声明暂时住在 `src/cli/` 这个工种名目录里，
 * 「每搬走一条＝删这里一行」。红队实测过它的退化风险：**没有机器门时，「只许变短」只是一句约定**，
 * 迟早变成第二个手写 `keys.ts`（蓝队 S2-①）。这里把约定变成门：
 *   ① 清单外的新键**进不来**（新命令必须住它自己的能力目录 `src/<能力>/commands.ts`）；
 *   ② 条数与文件行数**只许下降**（改上限数字＝一次显式的加码动作，得在评审里说出来）。
 *
 * 形状照 `cmd-registry-294.test.mjs` 的棘轮（冻结 case 清单 ＋ 行数上限），口径与它一致。
 * 不加身份断言（不钉「谁搬了什么」），只钉「只能变短」——搬场景是各场景图与 #297 的活。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { LEGACY_COMMANDS } from '../dist/cli/legacyCommands.js';
import { REGISTRY } from '../dist/cli/registry.js';
import { DECLARED_KEYS } from './declared.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEGACY_FILE = join(HERE, '..', 'src', 'cli', 'legacyCommands.ts');

/* ── 冻结基线（#295 交付时的值，只许变短） ─────────────────────────────────────────────── */

const FROZEN_LEGACY_KEYS = new Set([
  'calorie.body.composition-add', 'calorie.body.composition-remove', 'calorie.body.measure-add', 'calorie.body.measure-remove',
  'calorie.diet.add', 'calorie.diet.batch', 'calorie.diet.copy', 'calorie.diet.remove',
  'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range', 'calorie.diet.remove-by-type', 'calorie.diet.update',
  'calorie.diet.update-by-date', 'calorie.exercise.add', 'calorie.exercise.remove', 'calorie.exercise.update',
  'calorie.goal.pause', 'calorie.goal.resume', 'calorie.goal.set', 'calorie.goal.water',
  'calorie.goal.weight', 'calorie.help.center', 'calorie.help.lookup', 'calorie.history',
  'calorie.photo.add', 'calorie.photo.compare', 'calorie.photo.detail', 'calorie.photo.gif',
  'calorie.photo.list', 'calorie.photo.remove', 'calorie.photo.tag', 'calorie.product.add',
  'calorie.product.deprecate', 'calorie.product.update', 'calorie.profile.activity', 'calorie.profile.set',
  'calorie.profile.update', 'calorie.today', 'calorie.view.anomaly', 'calorie.view.batch-import-preview',
  'calorie.view.body-composition', 'calorie.view.body-measure', 'calorie.view.calorie-trend', 'calorie.view.combined',
  'calorie.view.composition-wizard', 'calorie.view.contraindication', 'calorie.view.dedupe', 'calorie.view.deficit',
  'calorie.view.diet', 'calorie.view.diet-review', 'calorie.view.exercise', 'calorie.view.exercise-cardio',
  'calorie.view.exercise-distribution', 'calorie.view.exercise-goal', 'calorie.view.exercise-recap', 'calorie.view.exercise-review',
  'calorie.view.exercise-strength', 'calorie.view.exercise-trend', 'calorie.view.gif-planner', 'calorie.view.goal',
  'calorie.view.goal-config', 'calorie.view.goal-expiring', 'calorie.view.goal-predict', 'calorie.view.goal-progress',
  'calorie.view.goal-recommend', 'calorie.view.goal-status', 'calorie.view.goal-vs-actual', 'calorie.view.goal-weight',
  'calorie.view.goal-wizard', 'calorie.view.health', 'calorie.view.home', 'calorie.view.library',
  'calorie.view.lint-health', 'calorie.view.long-trend', 'calorie.view.measure-wizard', 'calorie.view.nutrition-analysis',
  'calorie.view.nutrition-detail', 'calorie.view.nutrition-ratio', 'calorie.view.photo-log-wizard', 'calorie.view.plan',
  'calorie.view.plan-wizard', 'calorie.view.predict', 'calorie.view.process-progress', 'calorie.view.profile',
  'calorie.view.profile-wizard', 'calorie.view.ranking', 'calorie.view.review-template', 'calorie.view.search',
  'calorie.view.six-factors', 'calorie.view.source-stats', 'calorie.view.today-water', 'calorie.water.log',
]);

/** 只许变短的上限：条数上限与文件行数上限，各等于 #295 交付时的值（长一点即红）。 */
const FROZEN_LEGACY_MAX = 92;
const FROZEN_LEGACY_LINES = 119;

/* ── 棘轮 ─────────────────────────────────────────────────────────────────────────────── */

test('#295 棘轮：未搬迁清单只许变短——新键不得住进来', () => {
  const now = LEGACY_COMMANDS.map((d) => d.key);
  assert.equal(new Set(now).size, now.length, '未搬迁清单出现重复键（一个键恰住一处）');
  const intruders = now.filter((k) => !FROZEN_LEGACY_KEYS.has(k));
  assert.deepEqual(intruders, [],
    '未搬迁清单出现了冻结清单外的新键（新命令要住它自己的能力目录 src/<能力>/commands.ts，这里只进不出）：' +
      intruders.join('、'));
  assert.ok(FROZEN_LEGACY_KEYS.size <= FROZEN_LEGACY_MAX,
    '冻结清单本身变长了（加码）：' + FROZEN_LEGACY_KEYS.size + ' > ' + FROZEN_LEGACY_MAX);
});

test('#295 棘轮：未搬迁清单的条数与行数只许下降', () => {
  assert.ok(LEGACY_COMMANDS.length <= FROZEN_LEGACY_MAX,
    '未搬迁清单条数变高：' + LEGACY_COMMANDS.length + ' > ' + FROZEN_LEGACY_MAX + '（搬走才减，加一条即红）');
  const lines = readFileSync(LEGACY_FILE, 'utf8').split('\n').length - 1;
  assert.ok(lines <= FROZEN_LEGACY_LINES,
    'legacyCommands.ts 行数变高：' + lines + ' > ' + FROZEN_LEGACY_LINES);
});

test('#295 对账：一个键恰住一处（未搬迁清单与能力目录不许声明同一个键）', () => {
  const both = [...LEGACY_COMMANDS.map((d) => d.key), ...Object.keys(REGISTRY)];
  assert.equal(new Set(both).size, both.length,
    '一个键住了两处：未搬迁清单与能力目录都声明了它（铁律二：一个键恰一处）');
  assert.deepEqual([...new Set(both)].sort(), [...DECLARED_KEYS].sort(),
    '两个权威源之和 != 全量声明（对账源 test/declared.mjs 应恰为两边合流）');
});
