# t471 · `list:'new'` 族进 HELP 检索面（裁定 B：另起「新词别名」节 ＋ 查找面登记）

> 票：#471（`卡路里 HELP 检索面：list:'new' 全族词不入速查台／lookup`）。裁定：**B**（总工程师定，负责人授权）。
> 本件是证据件；判据以源码与测试件为准，本件只记读数与对账。

**判定：B 案已落地并自证。** 数据源不动（`buildHelpSceneData()` 仍只收 `SceneTrigger`，场景面 437 条一字未动），
另起一节「新词别名」把 `list:'new'` 族按「词 → 命令」列出来（`meta_blocks` 块 ＋ `text` 段，三态同源），
并在查找面（`help-lookup.ts` 的派生别名表 `NEW_WORD_TABLE`）登记；同票把「含『目标』就合成 `定营养目标`」
那条兜底收窄到不误伤。**68 词逐词 `calorie.help.lookup` 由改前 `{"0":5,"4":63}` 变成改后 `{"0":68}`，
且 68/68 首条都是自己那条命令。**

提交：`11e1ac03`（本席 5 件：`helpCenter.ts`／`help-lookup.ts`／新测试件／本件／`packages/skill-calorie/AGENTS.md`）。

## 一、条数一律派生（票面「69 这个数不许手写」）

票面写「69 条」，**当刻声明件里是 68 条**——票面成文后 #426／#446 各清了若干条（票面「遗留出口」已预告这个飘）。
本件不写任何条数字面量，一律现算：

```
$ git grep -n "list: 'new'" -- packages/skill-calorie/src | wc -l
68
```

- 出处：9 个声明件（`src/{analysis,body,diet,exercise,goal,photo,profile,weight,workout}/routes.ts`）；
  按场景分布 `{10:11, 02:13, 08:4, 04:6, 06:3, 09:11, 07:2, 03:4, 05:14}`（场景 01 零条）。
- 生成物头注同一个数：`src/triggers/routes.generated.ts:6`「`NEW_KEY_ROUTES` 68 条」（`pnpm gen` 派生，非手写）。
- 节标题也是现算：`[新词别名（68 条）]` 由 `newAliasesTitle(aliases.length)` 生成，声明件增删一条即跟着变。
- 测试件同样不写条数：`test/help-new-family-471.test.mjs` ① 先把声明件逐行扫出来，再与生成物逐条对账。
- 散文里提到这一族一律写 `list:'new'`（不加空格）——票面的复现命令 `git grep -n "list: 'new'"` 因此仍报 **68**，
  与声明件逐行数相等（本席自己的注释第一版写了带空格的形态，当场被自己扫出来并订正）。

## 二、改了什么（逐件）

| 件 | 改动 |
|---|---|
| `packages/skill-calorie/src/photo/helpCenter.ts` | ＋「新词别名」节：`HELP_NEW_ALIASES_META_ID`／`HELP_NEW_ALIASES_META_TITLE`／`HelpNewAlias`／`newAliasesTitle`／`buildHelpNewAliases`／`renderNewAliasesHtml`／`helpNewAliasesMetaBlock`；`renderHelpCenterHtml` 把该块接进 `meta_blocks`（`file`／`inline`），`renderTextIndex` 追加同一份节（`text`）。**取数面一行未动**。 |
| `packages/skill-calorie/src/triggers/help-lookup.ts` | ＋派生别名表 `NEW_WORD_TABLE`（`NEW_KEY_ROUTES` 投影，剔除 `WAKE_TABLE` 已登记的 2 词）＋ `newWordHit`；`buildHelpLookup`／`searchHelp` 双注入；`searchHelp` 加**整词**前置；`isRegisteredQuery` 把「含『目标』就合成」兜底收窄。`WAKE_TABLE` 仍 6 行（既有断言钉死，本票一行不动）；`routeWakeword`／`HELP_EXEC_OVERRIDES`／`execCliFor` 一字未动。 |
| `packages/skill-calorie/test/help-new-family-471.test.mjs` | 新建：8 条用例，逐词（不抽样）覆盖全族。 |
| `packages/skill-calorie/AGENTS.md` | 告警线台账：`src/photo/helpCenter.ts` 当场实测 523→590（`--sync` 派生）＋ 结论列补 #471 在场与拆法。**同一次 `--sync` 另把 `src/photo/gifDoc.ts` 362→365**（他席在途件 #527 的实况；同步器按实况改，不是本席改数——见 §七）。 |

三态落点：

- `file`：`file.html` 里 `data-meta-id="new-word-aliases"` 恰 1 处、`data-new-alias="词"` 恰 68 处；
  产物 1,564,241 B → 1,605,084 B（同一次渲染）。
- `inline`：同 1 处节块（片段同源）。
- `text`：`[新词别名（68 条）]` ＋ 68 行「词 · 命令名」，行缩进 **2 空格**（场景行恒 4 空格，`#91` 的 `textSceneIds`
  与 `#106` 的「4 空格＝场景行」判据都不受影响）；文本 25,405 B／522 行 → 28,692 B／592 行。
  **文本态只发命令名、不发 CLI**：`#88 D-3` 冻结「text 态尖括号集恒 `{<N>}`」，而族里 `存身材照` 一族的 CLI
  自带 `<照片路径>`／`<日期>` 占位符，发 CLI 会当场破那条断言（本件测试第 ③ 条把这条口径也钉住）。

## 三、逐词读数（68 词，改前／改后）

改前两列＝本票动手前的当刻读数（真出口，探针 `probe-before`）；「改前判定」＝首条是不是自己那条命令。

| 词 | 键 | 场景 | 改前 exit | 改前判定 | 改后 exit | 改后首条键 |
|---|---|---|---|---|---|---|
| `看组合分析` | `calorie.view.combined` | 10 | 4 | 无命中 | 0 | `calorie.view.combined` |
| `看热量缺口` | `calorie.view.deficit` | 10 | 4 | 无命中 | 0 | `calorie.view.deficit` |
| `看健康盘` | `calorie.view.health` | 10 | 4 | 无命中 | 0 | `calorie.view.health` |
| `查唤醒词` | `calorie.help.lookup` | 10 | 4 | 无命中 | 0 | `calorie.help.lookup` |
| `查热量历史` | `calorie.history` | 10 | 4 | 无命中 | 0 | `calorie.history` |
| `看体重预测` | `calorie.view.predict` | 10 | 4 | 无命中 | 0 | `calorie.view.predict` |
| `看异常诊断` | `calorie.view.anomaly` | 10 | 4 | 无命中 | 0 | `calorie.view.anomaly` |
| `看热量趋势` | `calorie.view.calorie-trend` | 10 | 4 | 无命中 | 0 | `calorie.view.calorie-trend` |
| `查数据健康` | `calorie.view.lint-health` | 10 | 4 | 无命中 | 0 | `calorie.view.lint-health` |
| `看整体趋势` | `calorie.view.long-trend` | 10 | 0 | 别的命令 | 0 | `calorie.view.long-trend` |
| `看营养分析` | `calorie.view.nutrition-analysis` | 02 | 4 | 无命中 | 0 | `calorie.view.nutrition-analysis` |
| `看复盘报告` | `calorie.view.review-template` | 10 | 4 | 无命中 | 0 | `calorie.view.review-template` |
| `看每日六因素` | `calorie.view.six-factors` | 02 | 4 | 无命中 | 0 | `calorie.view.six-factors` |
| `看体成分` | `calorie.view.body-composition` | 08 | 4 | 无命中 | 0 | `calorie.view.body-composition` |
| `看围度记录` | `calorie.view.body-measure` | 08 | 4 | 无命中 | 0 | `calorie.view.body-measure` |
| `看围度向导` | `calorie.view.measure-wizard` | 08 | 4 | 无命中 | 0 | `calorie.view.measure-wizard` |
| `看体脂向导` | `calorie.view.composition-wizard` | 08 | 4 | 无命中 | 0 | `calorie.view.composition-wizard` |
| `看今日饮食记录` | `calorie.today` | 02 | 4 | 无命中 | 0 | `calorie.today` |
| `看饮食复盘` | `calorie.view.diet-review` | 02 | 4 | 无命中 | 0 | `calorie.view.diet-review` |
| `查高热量排行` | `calorie.view.ranking` | 02 | 4 | 无命中 | 0 | `calorie.view.ranking` |
| `查食品库` | `calorie.view.library` | 02 | 4 | 无命中 | 0 | `calorie.view.library` |
| `搜食品` | `calorie.view.search` | 02 | 4 | 无命中 | 0 | `calorie.view.search` |
| `看去重报告` | `calorie.view.dedupe` | 02 | 4 | 无命中 | 0 | `calorie.view.dedupe` |
| `查营养配比` | `calorie.view.nutrition-ratio` | 02 | 4 | 无命中 | 0 | `calorie.view.nutrition-ratio` |
| `看营养素明细` | `calorie.view.nutrition-detail` | 02 | 4 | 无命中 | 0 | `calorie.view.nutrition-detail` |
| `看食品来源分布` | `calorie.view.source-stats` | 02 | 4 | 无命中 | 0 | `calorie.view.source-stats` |
| `看今日饮水` | `calorie.view.today-water` | 02 | 4 | 无命中 | 0 | `calorie.view.today-water` |
| `看批量导入预览` | `calorie.view.batch-import-preview` | 02 | 4 | 无命中 | 0 | `calorie.view.batch-import-preview` |
| `看运动目标` | `calorie.view.exercise-goal` | 04 | 0 | 别的命令 | 0 | `calorie.view.exercise-goal` |
| `看力量总览` | `calorie.view.exercise-strength` | 04 | 4 | 无命中 | 0 | `calorie.view.exercise-strength` |
| `看有氧总览` | `calorie.view.exercise-cardio` | 04 | 4 | 无命中 | 0 | `calorie.view.exercise-cardio` |
| `看运动分类占比` | `calorie.view.exercise-distribution` | 04 | 4 | 无命中 | 0 | `calorie.view.exercise-distribution` |
| `看运动复盘` | `calorie.view.exercise-recap` | 04 | 4 | 无命中 | 0 | `calorie.view.exercise-recap` |
| `看运动消耗趋势` | `calorie.view.exercise-trend` | 04 | 4 | 无命中 | 0 | `calorie.view.exercise-trend` |
| `看目标配置` | `calorie.view.goal-config` | 06 | 0 | 自己的键 | 0 | `calorie.view.goal-config` |
| `看目标状态` | `calorie.view.goal-status` | 06 | 0 | 自己的键 | 0 | `calorie.view.goal-status` |
| `看目标预检` | `calorie.view.goal-wizard` | 06 | 0 | 别的命令 | 0 | `calorie.view.goal-wizard` |
| `存身材照` | `calorie.photo.add` | 09 | 4 | 无命中 | 0 | `calorie.photo.add` |
| `移除身材照` | `calorie.photo.remove` | 09 | 4 | 无命中 | 0 | `calorie.photo.remove` |
| `设置照片标签` | `calorie.photo.tag` | 09 | 4 | 无命中 | 0 | `calorie.photo.tag` |
| `看身材照` | `calorie.photo.list` | 09 | 4 | 无命中 | 0 | `calorie.photo.list` |
| `查身材照详情` | `calorie.photo.detail` | 09 | 4 | 无命中 | 0 | `calorie.photo.detail` |
| `对比身材照` | `calorie.photo.compare` | 09 | 4 | 无命中 | 0 | `calorie.photo.compare` |
| `做身材照GIF` | `calorie.photo.gif` | 09 | 4 | 无命中 | 0 | `calorie.photo.gif` |
| `看身材照HELP` | `calorie.help.center` | 09 | 4 | 无命中 | 0 | `calorie.help.center` |
| `看身材照向导` | `calorie.view.photo-log-wizard` | 09 | 4 | 无命中 | 0 | `calorie.view.photo-log-wizard` |
| `看GIF规划器` | `calorie.view.gif-planner` | 09 | 4 | 无命中 | 0 | `calorie.view.gif-planner` |
| `选身材照` | `calorie.view.photo-picker` | 09 | 4 | 无命中 | 0 | `calorie.view.photo-picker` |
| `看档案视图` | `calorie.view.profile` | 07 | 4 | 无命中 | 0 | `calorie.view.profile` |
| `看档案预检` | `calorie.view.profile-wizard` | 07 | 4 | 无命中 | 0 | `calorie.view.profile-wizard` |
| `看体重历史` | `calorie.view.weight-history` | 03 | 4 | 无命中 | 0 | `calorie.view.weight-history` |
| `看体重对比` | `calorie.view.weight-compare` | 03 | 4 | 无命中 | 0 | `calorie.view.weight-compare` |
| `看体重复核` | `calorie.view.weight-review` | 03 | 4 | 无命中 | 0 | `calorie.view.weight-review` |
| `看波动分析` | `calorie.view.volatility` | 03 | 4 | 无命中 | 0 | `calorie.view.volatility` |
| `看训练计划` | `calorie.view.plan` | 05 | 4 | 无命中 | 0 | `calorie.view.plan` |
| `看禁忌扫描` | `calorie.view.contraindication` | 05 | 4 | 无命中 | 0 | `calorie.view.contraindication` |
| `看训练计划复盘` | `calorie.view.exercise-review` | 05 | 4 | 无命中 | 0 | `calorie.view.exercise-review` |
| `看落地训练进度` | `calorie.view.process-progress` | 05 | 4 | 无命中 | 0 | `calorie.view.process-progress` |
| `确认定训练计划` | `calorie.workout.plan-set` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-set` |
| `确认复制训练计划` | `calorie.workout.plan-copy` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-copy` |
| `确认定一周计划` | `calorie.workout.plan-set-week` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-set-week` |
| `确认加训练动作` | `calorie.workout.plan-add-movement` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-add-movement` |
| `确认定休息日` | `calorie.workout.plan-set-rest` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-set-rest` |
| `确认改训练计划` | `calorie.workout.plan-update` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-update` |
| `确认改某天训练` | `calorie.workout.plan-update-day` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-update-day` |
| `确认删某天训练` | `calorie.workout.plan-delete-day` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-delete-day` |
| `确认改动作` | `calorie.workout.plan-update-movement` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-update-movement` |
| `确认撤销训练计划` | `calorie.workout.plan-delete` | 05 | 4 | 无命中 | 0 | `calorie.workout.plan-delete` |

**exit 分布前后对照**：改前 `{"0":5,"4":63}` → 改后 `{"0":68}`；判定分布改前 `{"MISS":63,"OTHER":3,"SELF":2}`
→ 改后 `{"SELF":68,"MISS":0,"OTHER":0}`（票面记的是 69 词时的 `{"0":5,"4":64}`，同一形状，差的那一条是 #426／#446 清掉的）。

改前那 5 条 `exit 0` 的去向，逐条说清：

- `看目标配置`／`看目标状态`：改前是**巧合的自己**——`#291 乙` 早把这两条登记进手写表 `WAKE_TABLE`，CLI 与派生表逐字相同；
- `看整体趋势`：改前命中的是 `看整体趋势(体重+摄入+运动)…` 那一族**模糊命中**（是别的键，不是自己的 `view.long-trend`）；
- `看运动目标`／`看目标预检`：改前命中的是**写词** `定营养目标`（`goal_set_nutrition`）——就是票面点名的「错位命中」。
  这两条的根子在 `help-lookup.ts` 那条「查不到可执行命中且 query 含『目标』就合成 `定营养目标`」的兜底（C3 #43）。

**四个点名词改后逐条**：`看运动目标`→`calorie.view.exercise-goal`／`看目标配置`→`calorie.view.goal-config`／
`看目标状态`→`calorie.view.goal-status`／`看目标预检`→`calorie.view.goal-wizard`，四条**都不再落到 `定营养目标`**。

**兜底收窄（宁缺勿错）**：`isRegisteredQuery(query)` 认「词面等于某条登记词，或查询里含某条登记整词」，
命中即不合成。收窄的鉴别探针（只含派生表里的整词、手写表对不上）：`看目标预检表`／`看运动目标明细`
→ 改后**无命中**（宁可 `exit 4`，不给别的写命令）；未登记词的正面基线 `给我看目标` → 兜底照旧生效（既有行为不削）。

## 四、变异自证（两红一绿，机器读数）

| 变异 | 改坏哪一处 | 读数 |
|---|---|---|
| MUT-A | `helpCenter.ts` 的 `buildHelpNewAliases()` 取数改回「只认场景记录」（`isSceneTrigger` 口径） | 构建 `runId=d28b1c2f-0959-42af-b1e7-34c9f5a4e4ef`(exit 0) → 新测试 **红** `runId=3839bd18-c988-4edf-ad7e-614524a0b7de`(exit 1)：②③④ 三条红（`pass 4 / fail 4`） |
| MUT-B | `help-lookup.ts` 的 `NEW_WORD_TABLE` 少登记一条（`看目标预检`） | 构建 `runId=58213dfc-ac25-42a7-a599-7caa1ee2b568`(exit 0) → 新测试 **红** `runId=d09d8fd2-1ca1-407a-aefb-5428b5852143`(exit 1)：⑤⑥⑦ 三条红（`pass 5 / fail 3`），⑦ 正是「该词被兜底顶成写词」那条 |
| 还原 | 两处按备份逐字还原（sha256 与备份相同） | 构建 `runId=496f00d4-4534-49e4-a44c-38896128f34d`(exit 0) → 新测试 **绿** `runId=736a5216-7d20-4a46-9b7d-2b3a55d6d4a2`(exit 0)：`8/8` |

还原自证：`helpCenter.ts` sha256 `5A061766…A9A2`、`help-lookup.ts` sha256 `EF36B181…59AC`，与变异前备份逐字节相同。

测试件自己也带夹具级变异自证（第 ⑧ 条）：拿同一判据跑「节少一条」的夹具必抛 `节缺词`，对剩下的那批则不报
（免得判据只是「永远抛」）。

## 五、靶向回归与全量回归

- **`node --test packages/skill-calorie/test/help-center-88.test.mjs`**：改前 **25 例／15 通过／10 红**，
  改后 **25 例／15 通过／10 红**，**红的用例名逐个相同**（都是当刻 436→437 漂移与冻结面色值那批，
  属图外票 #645 的地盘，本票**没有**顺手修）。⇒ 本改动**没让它多红**。
  （改前读数：`runId=9c68d387-4270-47b0-97c8-6077d9142bdf` 门内实跑 exit 1 ＋ 同状态直跑 TAP 汇总，
  存 `.scratch/t471/baseline-help88.txt`；改后读数：`runId=baa752c6-59a4-4e54-a37b-bf2c454e0909` exit 1。）
- **HELP 相关 16 件靶向集**（88／91／106／skill-t11／t291／c43／t367／t368／photo-help-flow-345／delivery-83／
  help-delivery-139／photo-helpdoc-488／render-copy-90／help-reuse-245／help-paths-133／t278）：
  改前 `145 例／119 通过／26 红`，改后 `145 例／119 通过／26 红`，**红名单逐条相同**（Compare-Object 两侧皆空）。
  改后 `runId=bd53ffc7-efd2-4aa1-9781-23d8752a778f`。
- **全量套件**（`test/*.test.mjs` 187 件）：改后 `1725 例／1635 通过／90 红`，`runId=21e11214-bc95-46dc-befc-4087f0523d9d`。
  90 红里与本票取数面相关的只有 8 个文件（全部落在上面那 16 件里，红名单与改前逐条相同）；
  另有 `t445-告警线门` 2 红是**本票改超线件必然触发**的台账陈化——已按 §七 同步回绿（`9/9`）。
  其余文件不引用本票动过的任何符号（`searchHelp`／`lookupWake`／`HELP_LOOKUP`／`help.lookup`／`help.center`／
  `renderHelpCenterHtml`／`buildHelpSceneData`），按静态面即不可能受影响。

## 六、生成物重跑

- `node packages/skill-calorie/scripts/gen-cli.mjs` → `runId=de25c232-8d26-40ec-b0fa-e668ca4afd64`(exit 0)：
  `src/cli/keys.ts`／`src/cli/registry.ts`／`src/triggers/routes.generated.ts` 三件 sha256 前后不变（无 diff 可提交）。
- `node packages/skill-calorie/scripts/build-help.mjs` → `runId=56be3ee3-52d1-4b41-84dd-9b76a035a3f6`(exit 0)：
  重跑后 `SKILL.md` 与当刻 `HEAD` 逐字节相同（本席窗口内他席刚落了 `9223d938 文档(155): SKILL.md 两处写键条数订正为 47`，
  与重跑结果同值）⇒ 本票对生成物**零 diff**，故提交里不含生成物。生成物一律未手改。

## 七、告警线与台账（必报五步第四步）

**已超线，需要根据规则进行重构。** `src/photo/helpCenter.ts` 当刻 **590 行 > 350 告警线**（本票进场 523，
＋67：本节件头／类型／四个函数／两处接线／文件头一行）。超因：这一件同时住着「速查台数据模型
（`buildHelpSceneData`）」＋「两处补充节的投影（看板页入口 ＋ 本票的新词别名）」＋「三态壳落地
（`sectionFragment`／`inlineFragment`／`renderTextIndex`）」三组活，补充节每加一处就再长一截。

**本次先不拆**：结构重排不在 #471 写集（票面只给本件、`help-lookup.ts`、新测试件、证据件四处；
新建文件要走编排者派单），且本票正在 HELP 三态上做行为变更，同窗口再叠结构变更会把「逐词命中的前后对照」
变成两条变更的合成读数。**拆法**（已写进台账结论列）＝把补充节的投影整支搬进姊妹件
`src/photo/helpSections.ts`：`buildHelpViewEntries`／`renderViewEntriesHtml`／`helpViewEntriesMetaBlock` 与
`buildHelpNewAliases`／`newAliasesTitle`／`renderNewAliasesHtml`／`helpNewAliasesMetaBlock`（两节的 `META_ID`／
`META_TITLE` 常量随行），本件只留 `buildHelpSceneData` 与三态壳落地并薄转出；待收口票认领。

台账读数（`check-warning-line.mjs`）：

- `--sync --dry`（落盘前）：`SYNC-PLAN 改=2 增=0 删=0` → `SYNC-CHANGE src/photo/helpCenter.ts 台账=523 实况=590`
  ＋ `SYNC-CHANGE src/photo/gifDoc.ts 台账=362 实况=365`。
- `--sync`：`SYNC-VERIFY ok`；复跑无参 → **`RESULT: 91/91`、`PASS: 告警线台账齐全且与实况一致`**。
- `node --test packages/skill-calorie/test/t445-告警线门.test.mjs` → **`9/9` 全绿**（改后，见 §GATE-RUN ⑫）。

**两行都要动、只有一行是本席的**：`src/photo/gifDoc.ts` 362→365 是他席在途件（#527，同窗口已提交 `a436ac00`）的实况；
同步器按实况整表同步，本席没有改那个数（脚本只能整表同步，手改「当场实测」列是包规明禁的做法）。
本席的件只有 `helpCenter.ts` 一行。

## 八、GATE-RUN 对账行

全部经 `node tooling/run-locked.mjs --ticket 471 -- <命令>`（`gate-runs.log` 可复核）：

| # | 命令（本席声明） | runId | exit | 读数 |
|---|---|---|---|---|
| ① | `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（改前基线） | `b979dfbb-1044-4504-a0d0-b1938701781e` | 0 | 编译通过 |
| ② | `node --test packages/skill-calorie/test/help-center-88.test.mjs`（改前） | `9c68d387-4270-47b0-97c8-6077d9142bdf` | 1 | 25／15／**10** |
| ③ | `node .scratch/t471/probe.mjs`（改前逐词） | `ee9a7bb1-6b13-4cd0-85f2-d6288aa1dea4` | 0 | 68 词 `{"0":5,"4":63}`；节 0 处 |
| ④ | `tsc -b packages/skill-calorie`（改后首建） | `4033194a-8e4a-4a5e-8fe8-3005f0378be9` | 0 | 编译通过 |
| ⑤ | `node .scratch/t471/probe.mjs`（改后首跑，file 态读数被 #245 复用件污染，作废） | `4ebe6e1f-5acd-4d48-8005-bbe497030f7b` | 0 | 判据加「先清 calorie_html」后重跑 |
| ⑥ | `node .scratch/t471/probe.mjs`（改后，清落盘件重跑） | `41bc0a8c-ee4e-4b11-8482-3fd82265858b` | 0 | 68 词 `{"0":68}`；节 1 处／136 属性 |
| ⑦ | `tsc -b packages/skill-calorie`（散文订正后重建） | `65afa44a-6114-473e-a76f-641e7b0264e5` | 0 | 编译通过 |
| ⑧ | `node --test packages/skill-calorie/test/help-new-family-471.test.mjs`（首跑） | `e76d1d30-f37c-4030-83b0-715c12fde09a` | 1 | 红：扫描面把散文当声明行（本席夹具缺陷，当场修） |
| ⑨ | 同上（次跑） | `c6eeca48-e280-4845-95a8-0f3cc43f4b37` | 1 | 红：④ 判据取错参照（场景数≠新场景记录数）＋⑧ 夹具错位（当场修） |
| ⑩ | 同上（绿） | `a7b5bdf8-937f-4cbd-9418-a203535ef319` | 0 | **8/8** |
| ⑪ | `node --test …` 16 件靶向集 | `bd53ffc7-efd2-4aa1-9781-23d8752a778f` | 1 | 145／119／26（红名单与改前逐条相同） |
| ⑫ | `node --test "packages/skill-calorie/test/*.test.mjs"` 全量 | `21e11214-bc95-46dc-befc-4087f0523d9d` | 1 | 1725／1635／90（其中 t445 2 红＝台账陈化，见 ⑯ 回绿） |
| ⑬ | MUT-A 构建／测试 | `d28b1c2f-0959-42af-b1e7-34c9f5a4e4ef`／`3839bd18-c988-4edf-ad7e-614524a0b7de` | 0／**1** | 变异红 |
| ⑭ | MUT-B 构建／测试 | `58213dfc-ac25-42a7-a599-7caa1ee2b568`／`d09d8fd2-1ca1-407a-aefb-5428b5852143` | 0／**1** | 变异红 |
| ⑮ | 还原构建／测试 | `496f00d4-4534-49e4-a44c-38896128f34d`／`736a5216-7d20-4a46-9b7d-2b3a55d6d4a2` | 0／0 | 还原绿 `8/8` |
| ⑯ | `node --test packages/skill-calorie/test/t445-告警线门.test.mjs`（台账同步后） | 直跑（无锁；见 `.scratch/t471/t445-after.txt`） | 0 | **9/9** |
| ⑰ | `node --test packages/skill-calorie/test/help-center-88.test.mjs`（改后靶向） | `baa752c6-59a4-4e54-a37b-bf2c454e0909` | 1 | 25／15／**10**（与改前逐条相同） |
| ⑱ | `node .scratch/t471/probe.mjs`（终读数） | `696d326f-8c1d-4609-b4dc-80a90479234a` | 0 | 68 词 `{"0":68}`；text 68/68；file 节 1 处 |
| ⑲ | `node packages/skill-calorie/scripts/gen-cli.mjs` | `de25c232-8d26-40ec-b0fa-e668ca4afd64` | 0 | 三件生成物无 diff |
| ⑳ | `node packages/skill-calorie/scripts/build-help.mjs` | `56be3ee3-52d1-4b41-84dd-9b76a035a3f6` | 0 | `SKILL.md` 与 HEAD 一致（零 diff） |
| ㉑ | `git add <5 路径>`／`git diff --cached --name-only`／`git commit -F … -- <5 路径>` | `90d745c4-a244-4490-b8fc-7652b73d5104`／`53974a3f-fd73-4dd3-bd34-172df59bddec` | 0／0 | 提交 `11e1ac03`；暂存区复核只含本席 5 件（见下表） |
| ㉒ | `node packages/skill-calorie/scripts/gen-cli.mjs --check`（`gen:check`） | `bd89c07e-cca6-4d86-b141-2a4f18c8046e` | 0 | `GEN-CHECK PASS`：键 129（写 47 ＋ 读 82），能力 10 个声明 129 条、未搬迁清单 0 条 |
| ㉓ | `node packages/skill-calorie/scripts/check-examples.mjs`（`help:examples:check`） | `f9597483-e15e-40d2-a29a-30759fc7fcc6` | 0 | `RESULT: 129/129`、`PASS: SKILL.md 示例逐行可执行` |
| ㉔ | `node --test packages/skill-calorie/test/help-new-family-471.test.mjs`（提交后复绿） | `09d182e8-ae3e-4dbe-a948-c50321842a2e` | 0 | **8/8**（终局读数） |

坐席外的只读动作（不入门）：`git grep -n "list: 'new'"`（68）、`check-warning-line.mjs`（`RESULT: 91/91`）、
`node .scratch/t471/analyze.mjs`／`peek.mjs`／`guard-check.mjs`。

## 九、未做项与遗留出口

- **不关票**、不改任何别票的正文／label／状态（票面硬规矩，逐条守）。
- **没动** `src/triggers/wake-assets.ts` 与它的指纹测试；**没动** `wake` 表任何一条；
  **没改** `calorie-routing-81.test.mjs`／`exercise-port-111.test.mjs` 等冻结计数面；**没放宽**任何既有断言；
  停在线外的 10 条红（`help-center-88` 等）一条不碰——归图外票 #645／各自票。
- **不并数据源**：`buildHelpSceneData()` 的取数面一行未动（`groups` 仍 437 条场景，含 22 条 legacy）；
  「新词别名」只是**补充节**（`meta_blocks` ＋ text 段），不是场景。
- **查找面按「整词」登记，不做子串扩散**：新词表只做整词前置——子串扩散会让 `看`／`运动` 这类模糊查询被远端新词抢首条。
  代价是「打错一个字」的查询仍走既有模糊面或收窄后的兜底（`看目标预检表` 这类含整词的查询则宁缺勿错）。
- **`new` 表定义该不该收紧**（键内已有 `wake` 入口就不许再登记 `new`）：票面写的是「当场另开票」，本件不写校验器。
- **`#343`／`#386`／`#426`／`#446` 均未触**；跨技能（其余五家 0 条 `list:'new'`）无动作。
- 探针与中间读数住 `.scratch/t471/`（易失；判据以本件与测试件为准）。
