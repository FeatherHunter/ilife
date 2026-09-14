# t422 独立对抗审查报告（卡路里场景 04 运动 · 融合共用件）

**判定：FAIL** —— 一条 S1（入库状态不可复现验收：对入库提交的判据件复跑验收命令即红＝8 pass／1 fail）。工作区源码六件本身的质量、单源纪律与两条回归门禁经独立复跑与自设探针核实合格；修掉这一处入库面即可转放行。

审查席：独立对抗审查（票 #422）｜运行面 Windows ＋ node v24.19.0｜检索面＝`packages/<件>/src/**`（485 件，不含 `test`／`dist`／`node_modules`）
判据：`docs/agents/wording.md`（用词）＋ `packages/skill-calorie/AGENTS.md`（350 行告警线）

## 一、机器证据（本席本轮复跑，逐条 runId）

| # | 命令（均 `node tooling/run-locked.mjs --ticket 422 -- …`） | runId | exit | 读数 |
|---|---|---|---|---|
| 1 | `node --test packages/skill-calorie/test/fusion-shared-422.test.mjs` | `fc9147d0-85d0-41b4-8a81-acef6dd637fe` | **0** | tests 9／pass 9／fail 0 |
| 2 | `node --test packages/skill-calorie/test/exercise-receipt-264.test.mjs` | `8fd6a458-8046-4a82-bf2c-e45043553866` | **0** | tests 13／pass 13／fail 0 |
| 3 | `node --test packages/skill-calorie/test/doc-page-assert.mjs` | `a5c9ac1c-0b5e-4b3a-9616-f9e5508668d3` | **0** | tests 1／pass 1／fail 0 |

三条命令都跑在**工作区版本**的判据件上；1 号命令对**库内版本**（`git show HEAD:<判据件>`）复跑即红——见 §三-S1。

自设变异（本席自设，与票内两处不同；驱动 `.scratch/t422-review/mutation-driver.mjs`，逐文件整字节写回）：

| 步 | 动作 | runId | exit | 读数 |
|---|---|---|---|---|
| 注入 | `categoryColors.ts` `daily` 值改错（`#ff9500`→`#5856d6`，不删键）＋ `operationHead.ts` `create` 中文改坏（`新增`→`新增了`） | — | — | 两文件 sha256：`010a6454…d17`／`f6f128f5…0f8` |
| 红 | `pnpm build` ＋ 1 号命令 | `bc6b4872-898e-461a-8f6a-2b329eb56400` | **1** | tests 9／pass 8／fail 1；断言 `EXERCISE_CATEGORY_COLORS` 实测 `daily:'#5856d6'` ≠ 期望 `'#ff9500'` → 判据对**改值**敏感（票内只证了删键） |
| 还原 | 逐文件写回原字节（`writeFileSync` 备份） | — | — | `RESTORED … 与基线同值=true`，sha256 与基线**逐值相同**；未用 `git checkout --`／整目录还原 |
| 绿 | `pnpm build` ＋ 1 号命令 | `5ed92d17-8b21-4e2d-929e-7a7b87a7ec3a` | **0** | tests 9／pass 9／fail 0；`FINAL sha256` 与基线同值=true |

变异中途驱动曾在「应红」步被非零退出打断，本席当场把两文件写回原字节并复核：现树 `daily:'#ff9500'`／`create:'新增'`、全仓无变异残留（`.scratch/t422-review/residue-check.mjs`，命中只在本席草稿脚本自身）。

探针（第二读数，与票内判据不同源）：`docs/skills/skill-calorie/t422-review-probe.mjs`，`PROBE-VERDICT OK 硬不变量偏离条数=0`。四类色**键→值声明地**（源码树）＝1 件 `exercise/categoryColors.ts`（strength／cardio／flex／daily 各 1）；四态中文标签**键→值声明地**＝1 件 `shared/operationHead.ts`（新增／修改／删除各 1）；四值同现＝1 件。裸值口径对照：`#ff9500` 源码树 8 件、`#34c759` 7 件（公共层 token／图表缺省色），票面「全仓检索色值字面量」按裸值口径不成立，按**色表形状**口径成立——证据件已写明该口径，本席认可该处理。

## 二、逐条路径

| 件 | 状态 | 读数 |
|---|---|---|
| `src/shared/operationHead.ts` | 在 | 92 LF；四态三张表唯一定义地；表外 op 回退原 op 字串＋`empty` 档，与老实物 `|| op` 同口径 |
| `src/shared/fieldLabel.ts` | 在 | 43 LF；只给口径，缺项回退原键名；同域二次登记报错 |
| `src/shared/sourceLine.ts` | 在 | 45 LF；走公共层 `renderCaliberLine`（`ilife-block-caliber`） |
| `src/shared/conclusionLine.ts` | 在 | 21 LF；只定类名 `ilife-block-conclusion`，文案必填 |
| `src/shared/emptyGuide.ts` | 在 | 39 LF；结构仍走公共层 `renderEmptyBlock`，三件套必填、无跨域默认文案 |
| `src/exercise/categoryColors.ts` | 在 | 32 LF；四类色本仓唯一定义地；表外类别给 `undefined`（不编缺省色） |
| `test/fusion-shared-422.test.mjs` | 在，**未入库** | 工作区 264 LF／16271 B，与 HEAD 差 21 增 4 删（见 §三-S1） |
| `docs/skills/skill-calorie/t422-融合共用件.md` | 在（已入库） | 承载提交 `4d502fb`（`docs/skills/skill-calorie/t422-融合共用件.md`）；六件＋判据由 `b8520ed6` 一并卷走，同一文档 §九 已记账 |
| `src/exercise/commands.ts`／`routes.ts` | 未动 | `git diff --stat b8520ed6 HEAD -- <两条>` 空；本票提交也未含（`git show --name-only b8520ed6` 无命中）；两件最近承载提交是 `505002d`（#266） |
| `packages/base-render/` | 未由本票改 | `b8520ed6` 未含该目录任何路径；最近承载提交 `f481af5`（#421）。工作区当刻有别席在途改动（`blocks.ts`／`charts.ts` 等，`git status` 未提交），非本票范围 |
| 提交范围 | 与声明一致 | 六件＋判据＋证据件共 8 条路径，`git diff HEAD -- <8 条>` 中 7 条为空、判据件 1 条非空（§三-S1） |
| 行数纪律 | 合格 | 最大 92 LF（`operationHead.ts`），判据 264 LF，包内 350 行告警线内无超线 |

## 三、缺陷清单

1. **S1 · 本票范围（判据件）**：入库状态不可复现验收。`node --test …fusion-shared-422.test.mjs` 对 **HEAD 版本**复跑为 8 pass／1 fail（`AssertionError: 技能层不许自造空态结构（只许调公共层）`，实测 `['skill-calorie/src/body/bodyDocs.ts']` ≠ `[]`）；对**工作区版本**复跑才 9 pass。工作区对判据件的两处放宽（空态结构断言由 `deepEqual(hits, [])` 改为只读＋仅对本票六件断言、公共层空态构件断言由 `deepEqual` 改 `includes`）**未提交**，本席无法从 git 复现证据件 §六 的 9/9。红因触发点是别席在途件 `body/bodyDocs.ts`（`class="…empty"`），不是六件本身。修法：把工作区判据件那一处更正**照原字节提交**（属交付件自身，`git commit -F <msg> -- packages/skill-calorie/test/fusion-shared-422.test.mjs`），并在证据件补一行「判据件入库版本＝`<新 sha256>`，复跑 runId＝…」；本席写路径只许写本报告与探针两件，未代改。
2. **本票范围 · 记账缺口**：证据件称「六件是回执页族＋六个读页族的**共用**件」，但探针按 import 计数：六件在 `packages` 全树的消费方**各只有判据文件 1 处**（`RESULT/PROBE-CONSUMER`）。共用位「从第二个用法里长出来」这条纪律当刻以票面指定为据、尚无代码用法支撑；建议证据件把「消费方不在本票」写成**待接线清单**（哪张页族票接哪一件），免得后续盘账时被当成既有能力。
3. **本票范围 · 同形件未合并（部分已记账）**：`fieldLabel` 定义地除本件外另有 2 处（`exercise/receipt.ts:61` 私有、`profile/labels.ts:28` 导出且自带 5 键表）、`sourceLine` 另有 3 处私有同名件（`weight/history.ts:462`、`weight/volatilityDoc.ts:206`、`diet/nutritionPortDocs.ts:59`）。证据件 §一末段只点了运动域那一处，未记 `profile/labels.ts` 与另两处 `sourceLine`；建议补齐清单与收口去向（第二用法出现时按 `registerFieldLabels('exercise', 表)` 搬）。
4. **范围外（别席在途，仅登记）**：`body/bodyDocs.ts` 自造空态结构 1 处（本席探针 `PROBE-MY 域=body`／判据读数一致）；`profile`／`diet` 域结论条／徽章命中 0，`weight` 域结论块 8 件、徽章 1 件（`weight/history.ts`）、空态同名符号 2 件——与证据件 §四 逐条相符，合并与否属别域票。
5. **范围外（样张残留）**：`docs/skills/skill-calorie/t156-样张-写后回执.html:154` 有老式 `opLabels`（`update:'已更新'`／`delete:'已删除'`，与老表逐字不同源）。票面明令不碰 docs 样张，只作残留登记。
6. 未发现：证据造假（本席复跑的 9/9／13/13／1/1 与变异红→绿均为真读数）、用户可见回归（三条门禁绿、六件当刻无页面接线故无可见面变化）、色档写第二份色值（六件不含任何色值字面量，色档只给公共层档名）。

## 四、五维评分（30／25／20／15／10）

| 维 | 满分 | 得分 | 依据 |
|---|---|---|---|
| 交付完整度 | 30 | 30 | 六件齐、各自可判、行数在告警线内；`commands.ts`／`routes.ts`／`base-render/` 未动 |
| 证据可信度 | 25 | 18 | 读数本身为真且可复跑，但入库判据件与工作区不一致 → 入库状态不可复现，S1 |
| 单源与结构纪律 | 20 | 20 | 四类色、四态标签／图标、四态色档各只一处（源码树口径）；共用位不出现能力名；每件对外 ≤4 名 |
| 回归安全 | 15 | 15 | 264／doc-page 两条门禁绿；变异改值→红→还原→绿，逐文件 sha256 同值 |
| 提交范围纪律 | 10 | 8 | 只提交声明路径、pathspec 模式、卷席事件已记账；扣 2＝判据件仍留在工作区未入库 |
| **合计** | **100** | **91** | 均分 91.0（≥85 线）；但 S1 按票面一票否决 → **FAIL**。S1 那处更正提交后，本席倾向放行 |

## 五、下一手

1. 编排者指派（或授权本席）把工作区判据件那一处更正照原字节提交，并补一行入库 sha256／复跑 runId 进 `t422-融合共用件.md`；随后 1 号命令对 HEAD 版本复跑一次应绿。
2. 证据件补两处记账：六件待接线清单（§三-2）、`profile/labels.ts` 与三处私有 `sourceLine` 的收口去向（§三-3）。
3. 别域同形件合并（weight 结论块 8 件／photo `opBadgeOf`＋`badgeBlock`）仍待裁定，与本票写路径无关。

## 六、本席产出

- 本报告：`docs/skills/skill-calorie/t422-review-报告.md`
- 探针：`docs/skills/skill-calorie/t422-review-probe.mjs`（只读，可复跑，`PROBE-VERDICT OK`）
- 草稿（不入提交）：`.scratch/t422-review/`（变异驱动、残件检查、库内／工作区两口径判据对跑、原字节备份 `orig/`）
