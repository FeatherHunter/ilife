/** #295／#313 · 未搬迁命令清单的**唯一一份冻结键集**（只许变短）。
 *
 * 为什么单独一件：这份键集被两条棘轮用——`legacy-ratchet-295.test.mjs`（「清单外的新键进不来」
 * ＋「一个键恰住一处」）与 `legacy-partition-313.test.mjs`（「分区是纯搬迁：键集与分区前一致」）。
 * #313 A 段之前它是两份字面量、外加一份 gitignored 的 `.scratch/t313/legacy-baseline-keys.json`——
 * 同一个概念三个定义地（铁律二），而且那份 JSON 不在版本库里 ⇒ 干净 clone／CI 上必然红。
 * 现在只此一处定义，测试从版本库内的本文件引用；`.scratch` 那份 JSON 降级为**工作草稿**
 * （分区时的取证记录），**不再是判据**。
 *
 * 口径：#295 交付单文件 `src/cli/legacyCommands.ts` 时的 92 个键；`FROZEN_LEGACY_MAX`／
 * `FROZEN_LEGACY_LINES` 是当时的条数／行数实测值。**三处数字只许下降**：
 * 搬走一条命令时，同时删掉这里的键、把条数上限下调，并删掉它那一片里的那一行。
 *
 * 本文件不是 `*.test.mjs`，不进 `pnpm test` 的 glob；碰它＝一次**显式加码／减码动作**，得在评审里说出来。
 */

/** 冻结键集（#295 交付时的 92 条未搬迁命令）。 */
export const FROZEN_LEGACY_KEYS = new Set([
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

/** 条数上限（＝#295 交付时实测值，只许下降）。 */
export const FROZEN_LEGACY_MAX = 92;

/** 声明行数上限（＝#295 交付时单文件的实测值，只许下降）。
 * #313 A 段起量的是 `src/cli/legacy/scene-*.ts` 里**声明行的行数之和**（每行一条声明）；
 * 上限数字一字未动：拆 10 个文件必然多出 9 份文件头（说明与 import，不是声明），
 * 「物理行数」这个分母不再可比，而 92 条声明仍是 92 行。 */
export const FROZEN_LEGACY_LINES = 119;

/** 未搬迁清单的源目录（分区后的权威住处）。 */
export const LEGACY_DIR_REL = 'src/cli/legacy';
