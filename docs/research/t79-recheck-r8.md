# #79 返修 R-8 定点复核（单席独立复核）

> 被审：R-8 commit `83e9e0c`（5 路径：lockstep 扩技能面＋用例 4 加 `workspace:` 断言＋新建 `assert-shape-data-79.test.mjs`＋changeset／报告§1／契约§5 三处文字）。
> 前置：红队 FAIL（S2 D-1：lockstep 不查技能面，MUT-4 绿）／蓝队 PASS（S2 G-3：`base-combos` workspace 口径未覆盖）。
> 本席：5 条任务全部自己跑出，不复述被审 runId。工作区并发他席（ticket 89 存活、本席多次 `WAIT-OWNER-ALIVE`；未提交 dirt：`M .gitignore`、`M packages/base-render/src/style.ts`（#89）、`?? help-visual-lock-89.test.mjs`（#89 WIP）等）——凡涉并发归因处均给文件级证据。
> 纪律：门禁全经 `run-locked --ticket 79`（GATE-RUN 见 §7）；禁全量 `t81-exec-smoke.mjs`（未跑）；变异即还原＋sha256 自证；未改产品代码（见 §8 自曝的两起未遂）；`commit --only` 本报告单文件；不 push；不关票；`packages/skill-calorie/SKILL.md` 首 3 字节 `2d2d2d`、30,143 B ✓。

## 1. 红 D-1：技能面 lockstep（MUT-4 复跑＋例外探针）

| | 被审声称（R-8 §“返修 R-8”表第 1 行） | 我的复算 | 判定 |
|---|---|---|---|
| 改后 | 新增用例「技能面…（D-1…)」：5 技能 `dependencies.base-link-core` 与工作区版本同 major.minor；`skill-calorie` devDep 钉死 `^0.1.0` | 读文件确认在位（`base-version-lockstep.test.mjs:90-110`）；基线 `78d01a3a` 8/8 绿；5 技能实测 `^0.2.0`、calorie `^0.1.0`、core `0.2.0` | 符 |
| 变异 MUT-4 | `skill-bill` range 退回 `^0.1.0` 必红，还原 sha `0326177B…` | 基线 sha `0326177BB8008701…`（与声称前缀一致）；降线后 `c35210f1` **exit 1**，唯一失败＝技能面用例，消息 `skill-bill …「^0.1.0」…不同版本线 / '0.1' !== '0.2'`（与声称 `actual 0.1 / expected 0.2` 一致）；还原 sha `0326177BB8008701…` 逐字节等，复跑 `8df92b75` 8/8 绿 | **成立** |
| 例外钉死 | skill-calorie 漂移即红 | 附加探针：calorie `^0.1.0→^0.2.0` → `834fcff4` **exit 1**，消息 `skill-calorie 的 base-link-core 例外值漂移（实得「^0.2.0」，G-2）`；还原 sha `E20CBA88…`，残留 `.mutbak-t79` 已清 0 | 成立 |

**任务 1 判定：PASS。** 原 MUT-4 盲区（降线仍绿）已关闭：同一动作现精确打红且仅该用例红（其余 5/5 绿，无误伤）。

## 2. 蓝 G-3：用例 4 `workspace:` 双变异

| | 被审声称（表第 2 行） | 我的复算 | 判定 |
|---|---|---|---|
| 改后 | 用例 4 加 `workspace:` 前缀断言（`base-combos` 去前缀即红） | 读文件确认在位（`:54-88`，`workspace:true` 分支 `:81-86`）；基线 combos sha `CE47FF3316F4E13…`（与红队基线 `ce47ff3316f4e139…` 同值交叉确认） | 符 |
| 变体 A 去前缀 | `workspace:^0.2.0→^0.2.0` 必红 | `ff906473` **exit 1**，唯一失败＝用例 4，消息 `必须带 workspace: 前缀（发布期防外泄 registry，G-3；去前缀即红）`；还原 `CE47FF3316F4E13…` 逐字节等 | **成立** |
| 变体 B 错线 | `workspace:^0.2.0→workspace:^0.1.0` 必红 | `df09b010` **exit 1**，唯一失败＝用例 4，消息 `「workspace:^0.1.0」…不同版本线 / '0.1' !== '0.2'`；还原同值；复跑 `8fa95b3d` 8/8 绿 | **成立** |

**任务 2 判定：PASS。** 双变体各打红各的消息面正确（前缀面 vs 版本线面分离），还原绿。

## 3. 新单测 `assert-shape-data-79.test.mjs`（6＋7）＋反例探针

| | 被审声称（表第 3 行） | 我的复算 | 判定 |
|---|---|---|---|
| 文件 | 6 形状正例不抛＋7 反例必抛，落 `pnpm test` glob | 机数：`doesNotThrow` 6 行／`assert.throws` 7 行；单跑 `c231fbfc` 2/2 绿；canonical 全量内 ✔（`#79 assertShapeData 直测` pass，无 ✖） | 符 |
| 非恒真探针 | —（本席自加） | `.scratch/t79-recheck-shape-probe.mjs`：3 个**文件外**反例（`list items:'not-an-array'`／`stat metrics:null`／`receipt ok:'yes'`）全部真抛＋1 个文件外正例不抛＋`assert.throws` 对 no-op stub 的判别力自证 → `1d028a16` **exit 0**（`PROBE-EXTRA-8TH-OK`） | **成立**：实现真校验，测试真断言 |

**任务 3 判定：PASS。**

## 4. 渲染不变三项

| | 被审声称 | 我的复算 | 判定 |
|---|---|---|---|
| `snapshot:check` | exit 0（`0.1.0@932e7b250d278d50`） | `c902070b` exit 0，同值逐字 | 成立 |
| `snapshot:html:check` | exit 0（185 changed=0，fp `0686fc23…`） | `8f05f32f` exit 0，`artifacts=185 changed=0 added=0 removed=0` ✓；但本次 fp=`78cc9778…` ≠声称值（见下归因；fp 只报告不入快照，changed=0 不受影响） | **条件成立** |
| HELP file 态 sha | `f380ef68…`（1,264,822 B）×2 确定性 | 本席 runId `7ce68fd3`：A/B 双跑确定性 ✓（同 sha），但值为 `0743519a…`（1,264,952 B），`MATCHES-CLAIM=false`（见下归因） | **条件成立** |

**漂移归因（文件级，非 R-8）：** R-8 本体零 `src/`／`dist/` 改动（`git show 83e9e0c --stat` 5 路径无渲染输入）。工作区有 #89 未提交 dirt（`M packages/base-render/src/style.ts` 03:57:44 ＋ `dist/style.js` 被他席重编 03:58:49）。证据链：① 本地旧产物（00:21／03:43／03:56 三轮，预重编）均为 `f380ef685065a1e9…`×1,264,822 B ＝声称值；② 新旧 HELP 对字节 diff 首差异 @10523 恰为 H-06 `font-family: "SF Pro Display", …` 整行（#89 dirt），新件含 `SF Pro Display`＋`border-radius: 8px`，旧件无前者；③ 快照 fp 漂移同因（base-* 输入含他席 dirt）。**结论：R-8 代码层面的渲染不变成立；观察到的两处漂移全部归因并发他席，有逐字节证据。**

**任务 4 判定：PASS（附归因注记）。**

## 5. 门禁：四门＋`pnpm test` 失败集

四门（`t88-baseline/BASELINE.md` §2.3 冻结口径）全经 `--ticket 79`：

| 门 | runId | 结果 |
|---|---|---|
| `pnpm build` | `9e457e56` | exit 0 |
| `pnpm boundaries` | `308f01f3` | exit 0（PASS，5 技能闭包不含 base-*） |
| `pnpm snapshot:check` | `c902070b` | exit 0（`0.1.0@932e7b250d278d50`） |
| `pnpm publish:pre` | `5112d9ac` | exit 0（PASS） |
| 附：`pnpm snapshot:html:check` | `8f05f32f` | exit 0（185 changed=0） |

全量 `pnpm test`（canonical，`f50391cf` exit 1＝基线既有红口径）：`tests 1149／suites 137／pass 1122／fail 27`。`t101-fail-set.mjs` 对 `t88-baseline/test-failset.txt`（`feb2717f`）：

```
base=34 after=32 新增=3 消失=5
+ #89 R-9 回归：B1 H-10 形状集合（父 suite 名）
+ H-10 HELP 区 border-radius 全集 ⊆ {8px,14px,20px,999px,50%}（charts 区除外）
+ H-10 `.ilife-help-shell-card-mark` 逐字 8px（4px 已消除）
- 5 条＝基线已登记抖动项（#41 M3／#76／#80／helpers ≤820px／③ check-combos，与既往报告逐字同集）
```

**新增 3 条归因：** 全部落在未跟踪的 #89 WIP 文件 `packages/base-render/test/help-visual-lock-89.test.mjs:69-70`（`describe '#89 R-9 回归：B1 H-10 形状集合'` 内 2 用例＋父名），随 glob 被本轮 canonical 捎带；R-8 改动面（版本字段／range／changeset／2 个新测试）∩ 失败集＝空（R-8 的 8 用例在 canonical 内全绿）。白名单 `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt`＝**0 行**（未改口径）。

**任务 5 判定：PASS（R-8 归因新增 0；全量新增 3 系并发他席 WIP，有文件级归因）。**

## 6. 变异总表（红→还原绿，sha 自证）

| # | 变异 | 红 runId／exit | 红消息 | 还原 sha | 绿 runId |
|---|---|---|---|---|---|
| MUT-4 复跑 | skill-bill `^0.2.0→^0.1.0` | `c35210f1`／1 | 不同版本线 `0.1≠0.2`，仅技能面用例红 | `0326177B…`等 | `8df92b75` 8/8 |
| 例外探针 | skill-calorie `^0.1.0→^0.2.0` | `834fcff4`／1 | 例外值漂移（G-2） | `E20CBA88…` | （随 `8fa95b3d` 8/8） |
| G-3A | combos 去 `workspace:` | `ff906473`／1 | 必须带 workspace: 前缀 | `CE47FF33…`等 | `8fa95b3d` 8/8 |
| G-3B | combos `workspace:^0.1.0` | `df09b010`／1 | 不同版本线 `0.1≠0.2` | `CE47FF33…`等 | `8fa95b3d` 8/8 |

`.mutbak-t79` 残留 0（复核 `Get-ChildItem -Recurse *.mutbak*` 空）。

## 7. 对账声明（供 `check-gate-audit`）

```
GATE-RUN runId=78d01a3a-489a-4553-bce1-f1b8a32f0dbd cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs packages/base-render/test/assert-shape-data-79.test.mjs"
GATE-RUN runId=326e3b92-bd18-4851-90f3-0fbf5ec29d2c cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=c35210f1-714b-40a9-911c-0c6da762d9ab cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=8df92b75-df93-46c6-b2bd-11389ae472f6 waitedMs=0 cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs packages/base-render/test/assert-shape-data-79.test.mjs"
GATE-RUN runId=834fcff4-6585-4fe6-890e-f356b0c47e92 cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=ff906473-e548-4669-9196-a9eb30c82056 cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=df09b010-b8fe-4d1e-97a1-812c1ea6f4eb cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=8fa95b3d-76dd-4d76-908b-a62a0b7ec100 cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs packages/base-render/test/assert-shape-data-79.test.mjs"
GATE-RUN runId=c231fbfc-141a-4fb7-a031-67152f6b4630 cmd="node --test packages/base-render/test/assert-shape-data-79.test.mjs"
GATE-RUN runId=c977c765-f82c-4caf-ac7b-e985824b58c1 cmd="node .scratch/t79-recheck-shape-probe.mjs"
GATE-RUN runId=1d028a16-3d09-4593-897a-3ae91d09e8ce cmd="node .scratch/t79-recheck-shape-probe.mjs"
GATE-RUN runId=c902070b-6d7b-4010-a0ab-2c5add2295a7 cmd="pnpm snapshot:check"
GATE-RUN runId=8f05f32f-6bff-4ba4-a3f3-6a80e1c97a74 cmd="pnpm snapshot:html:check"
GATE-RUN runId=7ce68fd3-ce3b-43de-bcfa-b45041eb7fa4 cmd="node docs/research/t79-review-blue-probe.mjs help"
GATE-RUN runId=9e457e56-b570-4d7f-b3b4-3a9734753f95 cmd="pnpm build"
GATE-RUN runId=308f01f3-6965-477a-bae3-53fd2734e8ab cmd="pnpm boundaries"
GATE-RUN runId=5112d9ac-7691-4eb2-a6fe-a723d4d675cd cmd="pnpm publish:pre"
GATE-RUN runId=f50391cf-4a65-439c-bfe9-8d72bff80ccb cmd="pnpm test"
GATE-RUN runId=feb2717f-6f59-4c35-a077-887c4fbd039b cmd="node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t79-recheck/canonical.log"
GATE-RELAX flag=--allow-nonzero reason=非零 6 条全是取证对象本身：4 条变异自证红（326e3b92／c35210f1／834fcff4／ff906473／df09b010 内 5 条，其中 326e3b92 系本席 BOM 失误见 §8）＋全量 pnpm test 基线既有红（f50391cf exit 1，判据是失败集新增 0）＋t101-fail-set（feb2717f exit 1，新增 3 系 #89 WIP，见 §5）
GATE-RELAX flag=--allow-undeclared reason=同票红/蓝席历史条目＋ticket 89 会话并发跑门（本席多次 WAIT-OWNER-ALIVE：c231fbfc／1d028a16／c902070b／7ce68fd3，waitedMs 10-30s），时间窗无法切分；本席 19 条上表一对一声明
```

## 8. 过程自曝（无内容损失）

| # | 事件 | 处置与复核 |
|---|---|---|
| E-1 | 变异首试用 pwsh `Set-Content -Encoding utf8` 写回，带入 BOM，致 `326e3b92` 以 JSON 解析错红（非目标断言） | 立即用备份逐字节还原（sha 回 `0326177B…`），改用 BOM-safe helper（`.scratch/t79-recheck-mut.mjs`，`readFileSync/writeFileSync`）重做，得目标红 `c35210f1` |
| E-2 | 探针首跑 `c977c765` exit 1：`.scratch` 内 `import 'base-link-core'` 无法解析（包解析边界） | 改为相对 `../packages/base-link-core/dist/index.js` 导入，重跑 `1d028a16` 绿；诊断类失败，无副作用 |
| E-3 | 变异 helper 的 backup／mutate／restore 共 6 次文件写未套 `run-locked`（裸改；测试运行本身全部持锁） | 全部即时还原且 sha256 逐字节自证（§6），`.mutbak` 残留 0；以后变异脚本整体套锁跑 |

## 9. verdict

**verdict: PASS。** R-8 逐条兑现：① 技能面 lockstep 关闭红 D-1（MUT-4 复跑红，还原绿，sha 自证；例外钉死同效）；② `workspace:` 双变异精确打红（前缀面／版本线面分离）；③ 新单测 6＋7 在位且非恒真（文件外探针绿）；④ 渲染三项在 R-8 代码层面不变（快照双门 changed=0；HELP/fp 漂移经逐字节归因为并发 #89 dirt）；⑤ 四门全绿，全量失败集 R-8 归因新增 0，白名单 0 行。**无阻塞整改**，不改判红队 D-1 的历史定级（R-8 之前的状态），只确认 R-8 已将其关闭。建议（非阻塞）：#89 落定后重跑 HELP sha 回到 `f380ef68…` 再合入；canonical 口径宜排除他席 WIP 未跟踪文件后再取一轮干净 delta。
