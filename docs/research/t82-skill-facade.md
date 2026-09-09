# #82 SKILL.md 门面重写：触发词 69 项与「卡路里HELP」入口（证据）

> 票：`FeatherHunter/ilife#82`（wayfinder 地图 `#63` 子票）。认领（本 session 第一笔写操作）：`gh issue edit 82 --add-assignee FeatherHunter`。
> 路径所有权：`packages/skill-calorie/SKILL.md`、`docs/research/t82-*`、`.changeset/t82-*`、`.scratch/t82/**`。**未动**：`scripts/build-help.mjs`／`src/**`／`test/**`／`templates/**`／`plugin-*`／其余 5 技能／`routing.ts`。
> 一句话：门面（`HELP-AUTO` 块**外**）按 `/writing-for-agents` 重写；单行 `description` 收进旧版 **69 项触发词**＋**「卡路里HELP」入口**；`HELP-AUTO` 块**逐字零改**。

## 0. 结论

- 票面三条验收**全部达成**：① `description` 含 69 项触发词 ＋ `卡路里HELP` 入口（**499 字符**，逐字同序 69/69）；② `skills-export` 测试绿（3/3）；③ 重跑 `build-help.mjs` 后**整文件 hash 不变**（门面零覆盖）。
- `HELP-AUTO` 块（15,645 字符，含两枚标记）与 `HEAD` **逐字相等**；本票改动全部在块外。
- `routing.ts` **零改动**（判定「不必改」＋「改必红 #81 冻结计数」，见 §3.2）；地图验收②按「`description` 触发 ＋ 正文给命令」收口（编排者 2026-09-09 书面确认）。

## 1. 验收逐条（票面口径）

| 票面验收 | 怎么满足 | 证据（可复跑） |
|---|---|---|
| `description` 含触发词与 HELP 入口 | 单行 `description: "「卡路里HELP」→calorie.help.center 出完整速查台；唯一出口 calorie-cmd-read。触发词：<69 项>"`；`SKILL.md:3` | `.scratch/t82/check-description.mjs` → **RESULT: 9/9**（含 69 项元素级逐字同序、499≤500、截断后 `卡路里HELP`＋命令仍可见） |
| `skills-export` 测试绿 | frontmatter 仍为 `name`＋单行 `description`（`key: value` 逐行成立） | `test/skills-export-47.test.mjs` **3/3 pass**（`GATE-RUN f7570290…` 组内） |
| 构建后 `HELP-AUTO` 块不覆盖门面改动 | 跑 `node packages/skill-calorie/scripts/build-help.mjs` → 文件 hash **前=后=7433560f**；块内／块外前缀／块外后缀三段逐字相等 | `.scratch/t82/check-acceptance3.mjs` → **RESULT: 9/9** |

## 2. 新旧 `description` 逐字对照

**旧版（只读对照 `D:\2Study\StudyNotes\SKILLS\卡路里\SKILL.md:3-7`，块标量 4 行）**：

```yaml
description: >
  饮食热量、饮水、体重、运动、营养追踪与分析技能(11 分类 446 场景)。
  说「卡路里HELP」打开完整能力速查台(一键复制 prompt)。
  触发词:看今日主页、看今日热量预算、…、本月复盘
  完整触发词见 SKILL.md §触发词速查表(权威:scripts/_triggers.py)。
```

**改前（新版，单行 62 字符，无任何触发词）**：

```
description: "卡路里一期饮食体重运动身体目标照片分析复盘，唯一出口 calorie-cmd-read（argv加JSON加exit）"
```

**改后（单行 499 字符）**：

```
description: "「卡路里HELP」→calorie.help.center 出完整速查台；唯一出口 calorie-cmd-read。触发词：看今日主页、看今日热量预算、记一餐、拍营养表记一餐、看今日饮食、记喝水、补记饮食、复制昨日饮食、改饮食记录、删饮食记录、看本周饮食、查食品、存食品、改食品、下架食品、批量导入食品、看营养结构、看今日营养、看饮食总览、看营养素深度、看高热量榜、看低热量榜、看频繁吃榜、看高碳水榜、看高蛋白榜、饮食复盘（本周）、看全部餐别分布（最近 7 天）、记体重、补录体重、看今日体重、看体重曲线、对比体重：最近 30 天 vs 之前 30 天、体重复盘（本周）、记运动、记力量训练、记有氧运动、补记运动、看今日运动、看运动趋势、运动复盘（本周）、看计划概览、看完整计划、看某天练什么、看某动作安排、定训练计划、落地训练、同步到训记、定营养目标、定体重目标、定饮水目标、看今日目标进度、记体脂（皮褶钳）、记围度、看体脂趋势、看围度趋势、记身材照、查身材照、生成身材照GIF、对比两张照片、设置档案、改档案、查档案、查健康报告、查热量趋势、查热量缺口、复盘、开启定时复盘、本周复盘、本月复盘"
```

**触发词清单怎么核实的**（票面要求「自己核实实际应含哪些」）：

1. **来源**：旧基线 frontmatter `触发词:` 行以 `、` 切分 → **69 项**（`docs/research/t71-old-baseline-inventory.md:20/51` 同口径）；旧正文 L5 另注册 `卡路里HELP`（不在 69 项内）→ 合计 **70**。
2. **可达性**：探针 `.scratch/t82/verify-triggers.mjs`（只读；解析新 SoT `src/triggers/scene-*.ts` 的 `wake_word` ＋ `routing.ts` 的 `wakeWord/kind`）→ **旧 69 项 69/69 全在新 SoT**（434 唯一词／436 条）且**全被路由层命中**：`exec 60`／`non-exec 9`。9 条 non-exec ＝ `拍营养表记一餐`／`批量导入食品`／`体重复盘（本周）`／`看某天练什么`／`看某动作安排`／`定训练计划`／`落地训练`／`同步到训记`／`开启定时复盘`（#81「命中但不执行」桶，仍应可达）。
3. **逐字**：`.scratch/t82/check-description.mjs` 把新 `description` 的 `触发词：` 段按 `、` 切分后与旧 69 项**元素级比对（顺序敏感）** → `69/69 相等`。
4. **不写进去的**：旧版尾句「完整触发词见 SKILL.md §触发词速查表(权威:scripts/_triggers.py)」——权威已迁到新 SoT＋构建期 AUTO 块，该句在新区已失真。

**500 字符预算（宿主侧硬边界）**：DSH 宿主模型目录对 `description` 截断（`node_modules/@deepseek-ai/dsh-tool-skill/lib/index.js`：`DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH = 500`，超长 `slice(0,497)+'...'`）。本票最终 **499 字符 → 不触发截断**；`卡路里HELP`＋命令在第 1–30 字符，**即使截断也必然可见**（`check-description.mjs` 第 9 项自证）。

## 3. 「卡路里HELP」入口写法 ＋ 过时口径同步

### 3.1 入口（三处，块外）

1. **`description`（模型侧触发面）**：`「卡路里HELP」→calorie.help.center 出完整速查台`（`SKILL.md:3`）。
2. **门面首屏**（`SKILL.md:10`）：`- 用户说「**卡路里HELP**」→ 跑 `calorie-cmd-read calorie.help.center`（缺省 `mode=file`）出**完整能力速查台**；另两态与照片 10 键见下文 HELP 节。`
3. **`## HELP 现找与「卡路里HELP」速查台` 节**（`SKILL.md:186-191`）：`calorie-cmd-read calorie.help.center` → 缺省 `mode=file` 出完整 HTML 速查台（436 场景／54 子功能／10 分组、卡级复制按钮、落 `data.output`、约 1 MB **只落盘不进 envelope**）；`mode=inline|text` 另两态；非法 `mode`／`q`＋`mode` 同给 exit 2。

### 3.2 为什么不动 `routing.ts`（票面授权「先停下报告」的判定）

- `卡路里HELP` **不在** SoT（`inSot=false`）、**不在** `routing.ts`（`routed=false`）——探针实测。
- 让它进路由层只能新增词条，而 `test/calorie-routing-81.test.mjs` 冻结：`WAKE_ROUTES.length===436`（`:78`）／`Set(...).size===434`（`:140`）／`newEntries===56`（`:102`）／桶 `{exec:341,'non-exec':95}`（`:95`）→ **必红**，属 #81 冻结面。
- 补充事实（修正 #91 交接措辞）：`routing.ts` **当前无运行期消费者**——`git grep` 只在 `test/calorie-routing-81.test.mjs` 命中 `routesFor/ALL_ROUTES/EXEC_ROUTE_BY_KEY`，`src/**` 与 `plugin-*/src/**` 零 import。故 `routing.ts:632` 是**未来面板接线口径**，不是 agent 当前触发面；agent 的实际触发面＝skill 目录里的 `description`。
- 编排者 2026-09-09 书面确认：**本票不碰 `routing.ts`**；地图验收②按「`description` 含 `卡路里HELP` ＋ 正文给出命令」收口；routing 侧确定性入口不在本图做（会动 #81 冻结面）。

### 3.3 同步 #91 交接的过时口径（`SKILL.md:184` 旧文）

| 旧文（改前） | 新文（改后） |
|---|---|
| `身材照片 HELP：calorie.help.center（全量 10 键，顺序跟 SCENE_09_PHOTO SoT 序）/ --params '{"q":"记身材照"}' 现找` | `照片 10 键走 q（不是 mode）：--params '{"q":"记身材照"}' 现找、{"q":""} 全表，顺序跟 SCENE_09_PHOTO SoT 序` |
| （无） | 新增首条：`「卡路里HELP」速查台（Q9）：…缺省 mode=file 出完整 HTML 速查台（436 场景／54 子功能／10 分组…）` |

#91 交接的第三项「`SKILL.md:184` 口径待同步」**本票闭环**。

## 4. 验收③自证（构建前后块外内容对比）

持锁跑 `node tooling/run-locked.mjs --ticket 82 -- node packages/skill-calorie/scripts/build-help.mjs`（`runId=2ba91cd7…`，exit 0）：

| 段 | 构建前 | 构建后 | 判据 |
|---|---|---|---|
| 整文件 `git hash-object` | `7433560f0c3ccc4dbb77884110e028569e84238c` | **同值** | 重建幂等 |
| `HELP-AUTO` 块（含两枚标记） | 15,645 字符 | **同值** | 块内零改 |
| 块外前缀 | 5,964 字符 | **同值** | 门面零覆盖 |
| 块外后缀 | 1,682 字符 | **同值** | 门面零覆盖 |
| 文件 size | 30,052 B | 30,052 B | — |

`.scratch/t82/check-acceptance3.mjs` → **RESULT: 9/9**（另证 4 处门面改动重建后仍在、旧过时句已消失）。

## 5. 门禁实测（全部经 `tooling/run-locked.mjs --ticket 82`）

| # | 命令 | runId | exit |
|---|---|---|---|
| 1 | `pnpm build` | `fc2baf10-93e2-45ad-a2bb-49d4e268b9df` | **0** |
| 2 | `pnpm boundaries` | `a06d633c-50a5-4168-8084-3f3ee17e94e3` | **0** |
| 3 | `pnpm snapshot:check` | `ab3d28d9-9742-4896-bb22-ea02e21b14a1` | **0** |
| 4 | `pnpm publish:pre` | `dedb7010-b684-43cc-9851-5daa53928451` | **0** |
| 5 | `pnpm help:examples:check`（#99 的门） | `578596e9-9acb-4e94-916c-738e416d8c91` | **0**（`RESULT: 99/99`） |
| 6 | `node packages/skill-calorie/scripts/build-help.mjs`（验收③自证） | `2ba91cd7-a025-41c8-8b15-8adcebd3f432` | **0** |
| 7 | 靶向 5 文件 `node --test …` | `f7570290-f2e6-45b5-97d0-c63a8a503cac` | **1**（32 tests／31 pass／1 fail，见下） |
| 8 | canonical `pnpm test`（1 轮） | `b831a6be-1f5f-4909-966d-baa37b464423` | **1**（既有红，见下） |

**最终树复跑**（写完证据文档／changeset 后，同一工作区再跑一遍，故 §5 表格后半段为最终树口径）：

| # | 命令 | runId | exit |
|---|---|---|---|
| 9 | `pnpm build` | `0a48f461-ca1a-4b0f-a7c6-47f6a64258ae` | **0**（waitedMs=30026） |
| 10 | `pnpm boundaries` | `1b25cca0-242e-47c5-9579-5bb7b6ca3801` | **0** |
| 11 | `pnpm snapshot:check` | `17194887-6727-473a-a7de-567ece28f1f7` | **0** |
| 12 | `pnpm publish:pre` | `ae310953-1903-4766-8592-736f8969d1e4` | **0** |
| 13 | `pnpm help:examples:check` | `90aa32d9-62a8-4326-b451-e28d0ced311c` | **0**（`RESULT: 99/99`） |

**靶向组明细**（`node --test test/skills-export-47.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/calorie-c43.test.mjs packages/plugin-calorie/test/skills-provider.test.mjs test/calorie-routing-81.test.mjs`）：`#47 skills-export 3/3`、`skill-t11 9/9`（含 M6 正文 7 串、互联区新鲜）、`calorie-c43 7/7`（含 C1 运维定位、C7 默认目标值）、`#56 provider 5/5`（`description` 同源断言）；**唯一红**＝`FX-81-5 不变量：exec ⟺ 实跑 exit 0`（`test/calorie-routing-81.test.mjs:293`，读 `docs/research/t81-exec-smoke.md` 的「非零 1」行）——**该测试名在基线白名单内**（`docs/research/t88-baseline/test-failset.txt`），且 `t81-exec-smoke.md` 工作区无改动 → **既有红，非本票引入**（本票只改 SKILL.md 门面，与该快照零因果）。

**canonical ＋ t101 delta**：`pnpm test` → `tests 1114／pass 1089／fail 25／exit 1`；`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t82/gate-8-canonical-1.log` → **`base=34 after=29 新增=0 消失=5`**。

- **新增=0 达成**（判据以具名测试名集合为准，不以 exit 码为准）。
- 白名单文件 diff **0 行**（`git diff -- docs/research/t88-baseline/test-failset.txt` 空）。
- **消失 5 条**（全为基线既有红，本票零因果）：`#41 M3 真 CLI 串行冒烟 18 新键`／`#76 无宿主可执行证据`／`#80 HELP 生成与键名一致性`／`helpers JS 在 ≤820px 视口把反馈栈收窄为 3`／`③ check-combos 全绿`——按 `docs/research/t88-delta-flake-ruling.md` 口径属**抖动侧（方向为变绿）**，不构成新增。
- **并发上下文**：本轮全部门禁经持锁包装器执行；`pnpm build` 与 3 次靶向/canonical 运行均出现 `waitedMs=10005～10014`（锁被他人持有 10 s 后取得，`WAITED_*` 落盘于 `.scratch/locks/gate-runs.log`），期间至少有一席在跑（`WAIT-OWNER-ALIVE pid=31172 ticket=121`）。故 canonical 的失败集合含并发抖动成分；判据只用**具名集合的新增=0**。

## 6. 变异自证（文档级；本票无 `src/**` 改动）

> 本票唯一改动面是文档 `SKILL.md`，无 src 可变异 → 变异打在**受门禁看守的文档面**上，逐处「变异 → 对应门红 → `git checkout HEAD -- <路径>` 还原 → 门绿 → sha 复核」。

（本节在提交后补跑，见下表。）

| 变异 | 做法 | 应红 | 实测 | 还原自证 |
|---|---|---|---|---|
| **MUT-82-1** | `description` 改回**多行块标量**（复刻票面前提 S1-1 的坏形态） | `skills-export` 的「frontmatter 行须为 `key: value`」＋ provider 拿不到候选 | `node --test test/skills-export-47.test.mjs packages/plugin-calorie/test/skills-provider.test.mjs` → **exit 1**（pass 5／fail 3）：`AssertionError: frontmatter 行须为 key: value：  卡路里一期饮食体重运动身体目标照片分析复盘。`；`#56 list/get` 双红（解析器返 null → 候选为空）。`runId=137891ed…` | `git checkout HEAD -- …` → hash `7433560f…`（=HEAD blob）；复跑 **8/8 pass exit 0**（`runId=e10cafa8…`） |
| **MUT-82-2** | 手删 `HELP-AUTO` 块内**一行示例** | #99 生成期门四判据之首（产物不新鲜）＋行数 | `pnpm help:examples:check` → **exit 1**：`STRUCT 产物不新鲜：AUTO 块 != 生成器输出`／`STRUCT 示例行数 98 != 组合键数 99`／`STRUCT 缺示例行：calorie.diet.add`，`RESULT: 0/98`。`runId=17ea6aab…` | 还原 → hash `7433560f…`；复跑 **`RESULT: 99/99` exit 0**（`runId=4c61a24b…`） |
| **MUT-82-3** | `description` 删「`卡路里HELP`」入口 | 本票验收探针 | `.scratch/t82/check-description.mjs` → **exit 1**（`RESULT: 6/9`）：`RED 含 卡路里HELP`／`RED 含 calorie.help.center`／`RED 截断后仍含…` | 还原 → hash `7433560f…`；复跑 **`RESULT: 9/9` exit 0** |

还原动作全部经持锁（`git checkout HEAD -- packages/skill-calorie/SKILL.md`），三处还原后 `git hash-object` 均等于 `HEAD` blob `7433560f…`；期间 `check-integrity.mjs` **8/8**（首 3 字节 `2d 2d 2d`、零 NUL）。

## 7. 偏离记账 / 未做 / 风险 top3

**偏离**：

- **D-1**：`description` 未保留旧版「一期饮食体重运动身体目标照片分析复盘」全域摘要句与 `argv+JSON+exit`——为把 69 项触发词压进宿主 **500 字符**目录预算（最终 499）。两者语义在正文 `SKILL.md:8`（全域全量）与「唯一出口（T11）」节（P9 契约）**原样保留**；恢复需放弃约 22 字符 → 目录尾部将截断 4–5 个低频词。
- **D-2**：**未动 M6 节**（内容与位置）——其正文归 #98／#86 冻结（`skill-t11` 逐串断言 ＋ 两票证据），本票只在其上方加了门面指针。**登记 S3**：M6 自称「本节优先级最高，高于本文件下方所有操作规范」却位于第 6 节（在「唯一出口／envelope／口径」之后），位置与自称存在落差；建议另票（或随 SKILL.md 下次大改）处理。
- **D-3**：`HELP-AUTO` 块内 `calorie.help.center` 的代表唤醒词仍是「记身材照」（`REPR` 在 `scripts/build-help.mjs:56`，**本票禁改**，归 #99）→ 与「`help.center` 现承载全量速查台」有轻微落差；正文 HELP 节已补口径，块内差异登记。
- **D-4**：`routing.ts` 零改动（§3.2）。
- **D-5**：「公共安装器运行时」段落的 HTML 落点行去重为指针（单一来源＝「唯一出口（T11）」节），消除同一含义两处维护。

**未做／未确证**：① `description` 与 SoT 的一致性**无自动门**（探针在 `.scratch/`，未入 CI）；② 宿主 500 字符截断只在源码层面确证，**未在真实会话里观测截断后目录行**；③ 9 条 non-exec 词进 `description` 后的**运行时回执引导**（命中但不执行时说什么）不在本票改动面，属路由层／#81 侧。

**风险 top3**：

1. `description` 从 62 → 499 字符，常驻上下文成本 +437 字符（约 150 token/轮），且**几乎用尽 500 字符预算**——后续任何往 `description` 加字的票都会立刻被宿主截断，须先做减法。
2. 触发词是旧 frontmatter 的**逐字快照**：SoT／路由改名时 `description` 不会自动跟随，无测试看守（探针未入 CI）。
3. 9 条 non-exec 词现在也会经 `description` 把 agent 拉进本技能（#81 口径「命中但不执行」），若正文引导不足，用户可能期待落空——已由 M6 节与路由 `reason` 逐字口径承接，但未在本票做端到端观测。

## 8. 机械门禁对账（协议 §2.4）

**对账窗口**：`--ticket 82 --since 2026-09-09T14:38:50.000Z --until 2026-09-09T14:43:30.000Z`（覆盖本票全部门禁／靶向／canonical／变异轮次；证据提交本身在窗口之外，与 #97 同做法）。**受跟踪对账源**：`docs/research/t82-gate-runs.log`（本窗口内 `RUN` 条目导出）。

窗口内**每一条** `RUN` 都声明如下（含 `git` 条目——为满足 §2.4② 反向对账）：

GATE-RUN runId=fc2baf10-93e2-45ad-a2bb-49d4e268b9df cmd=pnpm build
GATE-RUN runId=a06d633c-50a5-4168-8084-3f3ee17e94e3 cmd=pnpm boundaries
GATE-RUN runId=ab3d28d9-9742-4896-bb22-ea02e21b14a1 cmd=pnpm snapshot:check
GATE-RUN runId=dedb7010-b684-43cc-9851-5daa53928451 cmd=pnpm publish:pre
GATE-RUN runId=578596e9-9acb-4e94-916c-738e416d8c91 cmd=pnpm help:examples:check
GATE-RUN runId=2ba91cd7-a025-41c8-8b15-8adcebd3f432 cmd=node packages/skill-calorie/scripts/build-help.mjs
GATE-RUN runId=f7570290-f2e6-45b5-97d0-c63a8a503cac cmd=node --test test/skills-export-47.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/calorie-c43.test.mjs packages/plugin-calorie/test/skills-provider.test.mjs test/calorie-routing-81.test.mjs
GATE-RUN runId=b831a6be-1f5f-4909-966d-baa37b464423 cmd=pnpm test
GATE-RUN runId=0a48f461-ca1a-4b0f-a7c6-47f6a64258ae cmd=pnpm build
GATE-RUN runId=1b25cca0-242e-47c5-9579-5bb7b6ca3801 cmd=pnpm boundaries
GATE-RUN runId=17194887-6727-473a-a7de-567ece28f1f7 cmd=pnpm snapshot:check
GATE-RUN runId=ae310953-1903-4766-8592-736f8969d1e4 cmd=pnpm publish:pre
GATE-RUN runId=90aa32d9-62a8-4326-b451-e28d0ced311c cmd=pnpm help:examples:check
GATE-RUN runId=1ffc2046-8b72-4931-b8f0-5bc2846424fe cmd=git add packages/skill-calorie/SKILL.md docs/research/t82-skill-facade.md .changeset/t82-skill-facade.md
GATE-RUN runId=5f2c5e9a-96f6-4294-a58f-c8dd70e6a3f5 cmd=git commit --only packages/skill-calorie/SKILL.md docs/research/t82-skill-facade.md .changeset/t82-skill-facade.md -F .scratch/t82/commit-msg-1.txt
GATE-RUN runId=137891ed-7aa2-44be-95e5-7a2dd8a703bf cmd=node --test test/skills-export-47.test.mjs packages/plugin-calorie/test/skills-provider.test.mjs
GATE-RUN runId=b78e486e-4e52-4149-9bda-8fdd7ff6eec2 cmd=git checkout HEAD -- packages/skill-calorie/SKILL.md
GATE-RUN runId=e10cafa8-171b-4344-b941-9b6b0f28df59 cmd=node --test test/skills-export-47.test.mjs packages/plugin-calorie/test/skills-provider.test.mjs
GATE-RUN runId=17ea6aab-a1dd-460b-bfa0-356eb86a3c6c cmd=pnpm help:examples:check
GATE-RUN runId=45b64ca0-eb1b-4949-963f-a991da0b21b9 cmd=git checkout HEAD -- packages/skill-calorie/SKILL.md
GATE-RUN runId=4c61a24b-bb88-43dc-b26c-561034110962 cmd=pnpm help:examples:check
GATE-RUN runId=3a3bccc8-6cec-40cb-aa7e-84934329d23b cmd=git checkout HEAD -- packages/skill-calorie/SKILL.md

GATE-RELAX flag=--allow-nonzero reason=四条非 0 条目**按设计**为红：`f7570290`／`b831a6be` 是基线既有红（`FX-81-5` 在白名单内；canonical `pnpm test` 恒 exit 1，判据是「具名失败集新增 0」），`137891ed`／`17ea6aab` 是 §6 的**变异应红**轮次；门禁证据只认 13 条 exit=0 条目（§5 表 1–6／9–13 行）。

复跑口径（第三方可直接执行，`--log` 指受跟踪对账源）：

```sh
node tooling/check-gate-audit.mjs --evidence docs/research/t82-skill-facade.md --log docs/research/t82-gate-runs.log \
  --ticket 82 --since 2026-09-09T14:38:50.000Z --until 2026-09-09T14:43:30.000Z --allow-nonzero
```

**对账实测**：`RESULT: matched=22/22 auditEntries=22 scoped=22 undeclared=0` → `gate-audit: PASS`（exit 0）。不带 `--allow-nonzero` 时为 `matched=18/22 undeclared=4`（正是 §6 的 4 条应红轮次），故放宽必须留痕（上一条 `GATE-RELAX`）。
