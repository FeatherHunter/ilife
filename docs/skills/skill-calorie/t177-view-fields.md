# t177 · 结果页「查档案」六项字段（必报五步 ＋ 交付对账）

> 票：[卡路里场景 07 基础信息：结果页 · 查档案](https://github.com/FeatherHunter/ilife/issues/177)（地图 [wayfinder] 卡路里场景 07 基础信息 #152 的子议题）。
> 判据 `docs/agents/structure.md`（五条铁律 ＋ 必报五步）；用词沿 `docs/agents/wording.md`。
> 行数口径：LF 计数（`[IO.File]::ReadAllText` 数 `\n`）。

## 一、影响清单（第一步）

| 文件 | 一句话 | 碰它的理由 |
| --- | --- | --- |
| `packages/skill-calorie/src/analysis/utils.ts` | 新增 `EnergyParts`／`EnergyResult` ／ `energyOf()`（BMR／TDEE ＋ 缺项判据） | 六项里 BMR／TDEE 的公式已住这里（`TDEE_ACTIVITY_FACTORS`／`calcTdee`）；「四要素缺一即不出数字」这条口径只能有一处定义（铁律二） |
| `packages/skill-calorie/src/fetch/profile.ts` | `ProfileRow` 增 `created_at`／`updated_at` 两列，`getProfile` 同批取 | 创建／更新时间是档案自己的列，页面要显示就得取出来 |
| `packages/skill-calorie/src/profile/view.ts` | 看档案结果页补齐六项 ＋ 活动系数说明 | 本票交付物本体 |
| `packages/skill-calorie/src/profile/setup.ts` | 私有 `tdeeOrNull`／`missingTdeeParts`／`genderOrNull` 换成 `energyOf` | 同一个口径不留两处（铁律二）；页面文案与数字逐字不变 |
| `packages/skill-calorie/test/profile-view-177.test.mjs` | 新测试（4 例） | 程序断言这一档 |

一次性脚本（不进源码、`gitignore`）：`.scratch/t177/run.mjs`（造库真跑）、`probe-history.mjs`（旁证）。

**不碰**：`src/cli/cmd_read.ts`（票面只要页面；该文件 1230 行、超告警线，重构已立 #181）；`src/triggers/scene-07-profile.ts`（HELP 那一条已走票面预留的备选路径，见第五节）。

## 二、结构设计（第二步）

- **六项里算得出的那几项的判据住 `analysis/utils.ts` 的 `energyOf`**：它同时装「BMR 公式 ＋ 活动系数 ＋ 缺哪几项」。放在这里的第一性理由是——**公式本来就在这个文件**（`TDEE_ACTIVITY_FACTORS`／`calcTdee`），判据贴着公式才不会被两处各写一遍。
- **`view.ts` 一个名字都没多给**：`ProfileView` 增一个 `metrics` 字段（类型 `ProfileMetrics` 不对外导出），文件对外仍是 5 个名字（`ProfileView`／`PROFILE_SOURCE`／`profileSnapshot`／`buildProfileView`／`buildProfileViewDoc`），不触铁律五。
- **`setup.ts` 对外 3 个名字不变**：删掉 3 个私有件（−21 行），改成一行 import（+1 行）。
- **不新建文件**：`src/profile/` 下的文件名按子功能取（`setup.ts`／`update.ts`／`view.ts`），没有「度量」这个子功能，所以不新起 `metrics.ts` 一类工种名文件（铁律四）。
- **性别归一为什么没并进 `fetch/profile.normalizeGender`**：那一份的契约是「认不出即抛」（写库用），`energyOf` 要的是「认不出即算缺项」（读页用）——两处契约不同，合并会把「坏输入」和「数据缺项」混成一条路。两者认的写法同一套（`male`／`female`／`男`／`女`），已在两处注释里互相指认。
- **BMI 不另算**：取 `weight_log.bmi`（记体重那条命令按当时身高考算并存下的同一个数），本页不写第二份 BMI 公式——同一个 BMI 在「记体重回执」与「查档案结果页」才是同一个值。

## 三、六项字段对照（老实物 → 新页）

老实物 `scripts/render_crud_view.py:91-104` 是十二字段的参照；新页逐项对上，另标出口径：

| 老实物字段 | 新页落点 | 新页取值 |
| --- | --- | --- |
| 年龄(AGE) | 档案现值表 ＋ KPI「档案视图」 | `user_profile.age` |
| 性别(GENDER) | 档案现值表 ＋ KPI「档案视图」 | `user_profile.gender`（表里库内原值 `male`／KPI 写「男」） |
| 身高(HEIGHT_CM) | 档案现值表 ＋ KPI 卡副行 | `user_profile.height_cm` |
| 活动量(ACTIVITY_LEVEL) | 档案现值表 ＋ KPI「活动量」 | 库内值 ＋ 中文档位 |
| **活动系数** | KPI 卡副行 ＋ 度量表 ＋「活动系数说明（五档）」 | `TDEE_ACTIVITY_FACTORS[activity_level]`，本档标出 |
| 最近体重 | KPI「最近体重」 | `weight_log` 最新一条（含日期时间） |
| **最近 BMI** | KPI「最近 BMI」＋ 度量表 | `weight_log.bmi`（该条记录的值） |
| **BMR(Mifflin-St Jeor)** | KPI「BMR」＋ 度量表 | `energyOf().bmr`（四舍五入） |
| **TDEE(BMR × 活动系数)** | KPI「TDEE」＋ 度量表 | `energyOf().tdee` |
| **档案创建** | 档案现值表「档案创建」 | `user_profile.created_at`（库内 UTC 原值） |
| **档案更新** | 档案现值表「档案更新」 | `user_profile.updated_at`（库内 UTC 原值） |
| 备注 | 档案现值表 | `user_profile.note` |

**与老实物的两处有意不同**（都是「不编数据」这条口径的延伸）：

1. 老件在缺项时回落 `age=30`／`height=175`／`weight=70`／`gender=male` 再算（`render_crud_view.py:60-70`）。新页**不回落**：缺哪一项就在那格写「缺×，不算」，页面任何位置都不出现凭默认值算出的数。这条由 `#176` 裁定、本票沿用，判据收在 `energyOf` 一处。
2. 老件的 BMI 分级把「< 18.5」也写成 `—`；新页给「偏轻」，三级齐。

## 四、空库态与缺项口径

- **空库（`user_profile#1` 无行）＝既有缺失阻断口径，本票不新造空库态**：`calorie.view.profile` exit **4**、**不落盘**、stderr 逐字 `ERR 4: 取数失败（缺失阻断）：未设档案（user_profile#1 缺失，先设置档案）`（`packages/skill-calorie/SKILL.md:46` 的「缺失阻断不返空」＋ `test/render-t41.test.mjs:251` 那条断言同口径）。实测：落盘文件 0 字节、`landed=false`。
- **档案在、但某几项缺**：页面照常出（exit 0），缺项一格写「—（缺…，不算）」，度量表表说补一句「本次缺×，缺项一律不编默认值」。
- **有档案缺体重**这一档实测：KPI 的 BMR／TDEE 值 `—`、副行「缺体重，不算」；BMI `—`、「无体重记录可算」；活动系数照出 `×1.55`。页面 63,517 字节。

## 五、HELP 查找条目：为什么走票面预留的备选路径

票面第 3 条首选「改 SoT 的 `main_prompt.cli` ＋ `data_source`」；实施时实测**走不通**，改走票面同时预留的备选路径（`HELP_EXEC_OVERRIDES.profile_view`，`src/triggers/help-lookup.ts:85`）：

- 改 SoT 会让冻结账目连环动：① `test/calorie-triggers.test.mjs` 逐条 sha 红（要同批重算 `test/calorie-sot.snapshot.json` 的 `entry_sha.profile_view`）；② `test/calorie-routing-81.test.mjs:227` 的 D2⑤ 里，`calorie.view.profile` 一旦成为冻结直连命令，就与既有新拟词「看档案视图」（`routing.ts:649`）撞命令，57 新拟命令／99 可达命令／399 执行记录的账目要连带动。
- 那套数据面清理（375 条 `cli` ＋ 353 条 `data_source` 成批重写、快照同批重算）**是 #180 的活**；本图只修用户看到的这一条。
- **实测**（本票复跑）：`calorie.help.lookup` 带 `{"q":"查档案"}` 回 `{"wake_word":"查档案","key":"profile_view","cli":"calorie-cmd-read calorie.view.profile"}` —— 已经是真实命令，不再是老 python 死命令。该结论已由本票新测试钉住（第 4 例）。
- 连带的**有意更新**一处（先前已落）：D2⑤ 的基线计算跳过一个具名例外 `calorie.view.profile`（理由与撤销条件写在测试注释里）；**根因清了就该撤**——撤的时机是 #180。

## 六、UI 两关

量测口径：Chrome CDP 探针 `.scratch/t179/probe.mjs`（零依赖），390px 与 1440px 两档；本轮读数落 `.scratch/t177/shots177/*.json`，截图同目录。

**① 代码级审查（四关全过）**

| 关 | 390px（有档案有体重／缺体重） | 1440px（同上两档） |
| --- | --- | --- |
| 横向溢出 0 | 右 0／左 0／内部横向滚动 0；`docScrollWidth=390=innerWidth` | 右 0／左 0／内部滚动 0；`docScrollWidth=1440=innerWidth` |
| 触控目标（窄屏 ≥44／桌面 ≥40） | 交互件 7 个，**不足 44 的 0 个** | 交互件 7 个，不足 40 的 **0 个**；其中 5 个为 40px（复制数据／复制日志／三个菜单项） |
| 对比度 AA | 低对比件 **0** 个；正文最小字号问题件 0 | 低对比件 **0** 个；正文最小字号问题件 0 |
| 间距成体系 | 内边距集合 `20px 16px 60px`／`0px`／`14px`／`0px 14px` | 内边距集合 `32px 20px 80px`／`0px`／`14px`／`0px 14px` |

**1440 档那 5 个 40px 件正是票面写死的桌面口径**（「触控目标：窄屏 ≥44px／桌面 ≥40px（桌面沿用 `packages/base-render` 的冻结值）」——`src/style.ts:394-399` 与 `ACTION_BAR_DEFAULTS.minHeightPx`），与 #179 已验收的场景 07 各页**同款同值**，非本票引入。

**② 截图级审查（亲眼看过，不是只跑脚本）**：本轮两档各拍一张、共四张（有档案有体重／有档案缺体重 × 390／1440），逐张看过并据此**改了两轮**：

1. 首轮 390px：KPI 卡的「22.9（正常）」「1651 卡/天」在 28px 值槽里折成两行（#179 记过同款陷阱，只是这次值更长）→ 值只留数，分级与单位落 12px 副行。
2. 首轮 390px：六项那张三列表把「2026-08-01 09:00:00」挤成三行、口径列吃掉整宽 → 创建／更新两行挪进「档案现值」两列表（它们本来就是档案的列），度量表改两列、口径改由表说承载。
3. 次轮复看：两档所有格子单行可读，无裁切、无挤压、无折字。

**仍留着、本票不动的**：`营养目标` 与 `活动系数说明` 两个折叠区的交互样式沿用共享层现值；本页新增内容没有引入任何自有样式（全走 `base-paint/blocks`）。

## 七、交付对账（第五步）

| 第一步说过的 | 实际碰到的 | 偏差 |
| --- | --- | --- |
| `analysis/utils.ts` 加 `energyOf` | 同（＋65 行，`calcTdee` 原样不动） | 无 |
| `fetch/profile.ts` 两列 | 同（`ProfileRow` ＋ `getProfile` 的 SELECT） | 无 |
| `profile/view.ts` 六项 ＋ 系数说明 | 同（＋174 行） | 无 |
| `profile/setup.ts` 换 `energyOf` | 同（删 3 个私有件，−21 行；文件 395 → 374 行） | 无 |
| 新测试 `profile-view-177.test.mjs` | 同（137 行、4 例） | 无 |
| 不碰 `cmd_read.ts`／SoT | 同（`git diff --stat` 只有上面 4 个源文件） | 无 |

**未改动面的旁证**：预检确认页 `calorie.view.profile-wizard` 改动前后落盘**同为 65,438 字节**（`setup.ts` 的换法没动页面任何一个字）。

**读数**：`pnpm build`（走 `tooling/run-locked.mjs --ticket 177`）exit 0；包内全量 `node --test "packages/skill-calorie/test/*.test.mjs"`（同样持锁）= **452 例／450 过／2 红**，两红都是既有基线：① `#180 场景数据的三个字段里不得再出现脚本命令`（#180 自己登记的有意红）；② `fetch-t6.test.mjs` 的 history 用例——**时间炸弹**：该用例第 97 行用缺省日期（＝今天）配固定 2026-09-04/05 两条数据，7 天窗滚过 09-06 就空（旁证脚本 `.scratch/t177/probe-history.mjs`：显式 09-06 窗内 2 行、缺省 0 行），与本票改动无关。`node --test test/calorie-routing-81.test.mjs` = 1 红（既有基线 FX-81-5）；`node packages/skill-calorie/scripts/check-examples.mjs` = **100/100 PASS**。

## 八、悬账与已知偏离

1. **`fetch-t6.test.mjs:97` 是时间炸弹**（既定日期＋缺省窗口），今天起必红。不属本票范围，未改；建议单开一张小票（一行修法：把缺省调用也传到固定日期）。
2. **1440 档复制区触控 40px**：base-render 的冻结常量，与 #179 各页同款；连共享层一起改属另一张票。
3. **`analysis/utils.ts`／`setup.ts` 超告警线**：本包没在自己那儿写下告警线数字（#179 已登记同一缺口）；`setup.ts` 本票是**净减 21 行**（395 → 374），只删不拆。
4. **envelope 的 `data.metrics` 未跟页面一起长**：`cmd_read.ts:1034-1038` 仍只投影 `age`／`heightCm`／`hasGoal`／`latestWeightKg`／`calorieGoal`；页面复制区（AI 拿到的那份）**已带** `bmi`／`bmr`／`tdee`／`activityFactor`。没跟的原因是那文件超线且重构票 #181 在途——不顺手扩大范围。
5. **`renderProfileHtml` 仍是死件**（`src/render/html.ts`，全仓只剩 `test/render-t41.test.mjs:225` 一处引用）——#179 已登记，留给 #181。
