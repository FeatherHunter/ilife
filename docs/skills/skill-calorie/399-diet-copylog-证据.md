# 票 #399 证据 · 饮食页复制日志接线（只修 `calorie.view.diet` 条目列表页）

- 根因（二选一已定）：`src/home/today.ts` 的 `viewDietOverview` 默认分支没把 `command`
  传给 `buildViewDietDoc`。`src/render/dietDocs.ts` 早就接 `input.command` 并透给
  `listPageCopy`（接到后有用），故本票 `dietDocs.ts` 零改。
- 改动（`today.ts` 仅传参一行，其余一行不碰）：
  `meals: mealSlice, mealTotal, mealsTruncated: mealTotal > MEAL_CAP,`
  → `meals: mealSlice, mealTotal, mealsTruncated: mealTotal > MEAL_CAP, command,`
- 判据（固定种子库 `docs/research/t81-seed.mjs`，`CALORIE_TODAY=2026-09-07`）：
  `calorie-cmd-read calorie.view.diet --params '{"window":"今日"}'` 产物里
  `data-action-id="ilife-copy-log"` 带 `data-t` 且无 `disabled`；
  点复制日志拿到六段日志，第 4 段＝本页命令原文。见 `399-green.log`。
- 变异自证两行读数：
  - 改坏（断开 `command` 透传）：`pass 1 / fail 2`，见 `399-red-mutation.log`。
  - 还原：`pass 3 / fail 0`，见 `399-green.log`。
- 运行标识与退出码：
  - 绿（还原）：`runId=2f1d2d8e-0606-4a54-b886-c05f25f97476`，`exit=0`。
  - 红（改坏）：`runId=3b030a06-64da-47fd-bc4c-3e73d05a76a6`，`exit=1`。
  - 编译：`node node_modules/typescript/bin/tsc -b packages/skill-calorie --force`
   （增量首编漏跟源码，已用 `--force` 对齐，`dist/home/today.js:153` 含 `, command`）。
- 关联回归：`diet-list-t271.test.mjs` 为 `pass 5 / fail 1`，
  唯一红灯是直调 `buildViewDietDoc` 的餐别支页名断言（`src/diet/todayDocs.ts` 的
  `buildMealDistributionPage` 一支）。该件与同目录另 10 件均有他人未提交改动，
  本票按写集未碰、未修；本票改动只影响默认分支的 `command` 透传，
  餐别／总览两支的入参值与行为不变。下一手请该分支 owning 席复核。
- 提交：见回执 commit 号（本目录三件＋源码一行＋新建测试，随同一次提交）。
