# #79 审查席 2（蓝队·工程红线／渲染不变面）· 审查报告（第 2 任）

> 被审：票 **#79**，提交 `abcde5e`／`40fa1c5`／`47d346c`，证据 `docs/research/t79-base-contract.md`。
> 主张：渲染输出不变（`snapshot:check` changed=0、`snapshot:html:check` 185 件 changed=0、HELP file 态 sha `f380ef68…` 前后同值）；
> `base-* fingerprint` 变化只报告不入快照故无害；三包 0.2.0；CI 断言；缺口只登记。
> 本席探针：`docs/research/t79-review-blue-probe.mjs`（保命提交 `8515ccb`，只读＋变异自证逐字节还原）。
> **verdict：PASS（附整改清单）**。五维：渲染不变 100／版本工程红线 90／CI 鉴别力 95／发布面安全 85／证据与登记诚实 95。

## 0. 方法与纪律

- 全部门禁经 `node tooling/run-locked.mjs --ticket 79 -- …`（GATE-RUN 留痕 8 条，见 §5）；诊断类直跑（探针 help／fp／mut-a／residue、npm view、grep）不写 gate 日志。
- 禁全量 `pnpm test`（未跑）；变异（mut-a）逐字节还原并自证（§4）；未改任何产品代码（`git status --short packages/ pnpm-lock.yaml .changeset/` 空）；`commit --only`；不 push；不关票。
- 自检 `packages/skill-calorie/SKILL.md`：首 3 字节 `2d2d2d`（`---`），30,143 B（与报告 §10 一致）。

## 1. 范围合规（逐笔 `git show --stat`／`git diff --name-only`）

| 提交 | 性质 | 产品代码改动 | 结论 |
|---|---|---|---|
| `abcde5e` | 实施主体（18 文件） | 仅版本面：`base-link-core`／`base-combos` version 0.1.0→0.2.0、`base-combos` 内 `workspace:^0.2.0`、`base-render` devDep `^0.2.0`、5 技能 `base-link-core: ^0.2.0`、`pnpm-lock.yaml`（6 specifier＋skill-calorie 落 registry 0.1.0）、`.changeset/config.json` fixed 组＋新 changeset；新增测试 `base-version-lockstep.test.mjs`＋4 探针（docs 内）。**`packages/*/src`、`*/dist`、`packages/skill-calorie/**` 零触碰**（`git diff --name-only abcde5e~1 abcde5e -- <src/dist/skill-calorie>` 空） | 合规 |
| `40fa1c5` | 文档补丁 | 仅 `t79-base-contract.md`＋`t79-gen-report.mjs`＋误并入的他席 `t83-recheck-r2.md`（＋19 行，即自曝 P-1；HEAD 链 `40fa1c5→223f1a5→5e2eb22` 完整在位，未做历史改写） | 合规（过程问题见 §3 S3-2） |
| `47d346c` | 文档补丁（§11＋§7.1） | 仅 2 个 docs/research 文件 | 合规 |

## 2. 逐条攻击（9 攻，结论先行）

| # | 攻击点 | 本席独立实测 | 结论 |
|---|---|---|---|
| A1 | `snapshot:check` 是否真绿且同值 | 自跑 runId `7ef62bb6` exit 0：`OK: 快照 == 实际拉取版（0.1.0@932e7b250d278d50）`——与主张逐字同值 | 成立 |
| A2 | `snapshot:html:check` 185 件是否真 changed=0 | 自跑 runId `192bc8c3` exit 0：`artifacts=185 changed=0 added=0 removed=0 base-* fingerprint=0686fc230318e7d4520170192aefe673`——件数、changed、**新指纹值**与主张三者全对上 | 成立 |
| A3 | HELP file 态 sha 是否真是 `f380ef68…`（自建 tmp DB，非复述） | 探针 `help`：自建两个 tmp DB（`.scratch/t79-review-blue/db-a/b-*`）各跑 `cmd_read.js calorie.help.center`，两次 sha256 均为 `f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2`，1,264,822 B，`mode=file`，`template=help-shell`，DETERMINISTIC=true | 成立 |
| A4 | 「快照前后同值」是否同一份快照（没被更新过） | `tooling/skill-html.snapshot.json` 工作树 clean；`git log` 该文件最近改动止于 #96（`8727d9d`／`a87df7b`）；`abcde5e~1→HEAD` 间 `tooling/` 仅新增 lockstep 测试；快照文本无 `fingerprint` 键（§2 A5）——**快照文件未被本票改写**，changed=0 是真不变不是重写基线 | 成立 |
| A5 | 指纹变化是否真无害（不入快照） | 代码：`buildSnapshot()` 产物键＝generatedBy/ticket/purpose/hashAlgo/textKeepMaxBytes/skills/artifactCount/artifacts（`skill-html-snapshot.mjs:206-219`），无指纹字段；`compare()` 只比逐件 sha256（:255-273）；指纹仅出现在控制台 RESULT 行（:364/:377/:424/:428）且注释 `:298` 明示「只报告、不入快照」。探针 `fp`：快照文本不含 `fingerprint`／`0686fc23`／`edd0c9cb`，artifactCount=185。输入含 `base-render/package.json`（:300）而本票改了该文件 devDep range——指纹 `edd0c9cb→0686fc23` 变化方向与机理吻合，且零产物受影响 | 成立 |
| A6 | 跨包消费方（5 技能＋plugin）是否仍绿 | 自跑：`boundaries` PASS（runId `07eec2cc`，含 5 技能闭包不含 base-*、源码不 import base-*）；`install --frozen-lockfile` exit 0（runId `f9e8a29b`）；`publish:pre` PASS（`88a5ca41`）；`publish:fresh` PASS（`c7993e4a`，G3 模板逐件＋契约键全绿） | 成立 |
| A7 | CI 接线＋鉴别力 | 接线：`.github/workflows/ci.yml` 的 `build-test`（:34）与 `win-detail`（:117）都跑 `pnpm test`，其 glob 含 `packages/base-render/test/*.test.mjs`（根 package.json），lockstep 测试双 job 覆盖；`snapshot:check`／`snapshot:html:check`／`boundaries`／publish 三门亦在 CI（build-test／publish-gates）。鉴别力：探针 `mut-a` 见 §4，RED-THEN-GREEN OK | 成立 |
| A8 | 0.2.0 发布面冲突 | `npm view` 实测：`base-link-core@[0.1.0]`、`base-combos@[0.1.0]`（本地 0.2.0 纯前进，无同号异内容冲突）；`base-paint@[0.1.0, 0.2.0]`（本地 0.2.0 不动）。fixed 组发版语义与之一致 | 成立 |
| A9 | §9 缺口是否真是只登记 | `abcde5e~1→47d346c` 间 `packages/skill-calorie/**` 零改动；G-1：契约 §5 L946 仍写 `fixed: []`＋「不实际升版」，文档漂移属实；G-2：skill-calorie 锁文件落 registry 0.1.0 属实，但 4 处引用全是 `import type`（keys.ts:11／cmd_read.ts:118／envelope.ts:8／shapes.ts:7，类型擦除）——「低」定级恰当；G-3：`--pre --only base-combos` 实测 FAIL「含 workspace: 外泄」exit 1（见 §3 S2-1），而 CI 口径 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint` 不含 base-combos故未暴露——登记属实；G-4：`assertShapeData` 在 `packages/base-render/test/`＋`test/` 零命中（抽查）；G-5：既有基线事项，非本票引入 | 成立 |
| A10 | 对照表背书抽查（130 条逐字性，非逐条重验——超出蓝队面，机制级抽查） | `contract-signatures.test.mjs` 自跑 47/47 PASS（runId `a0ef4ba3`，含 SPEC_FROZEN_SURFACE 逐字比对＋文档投影绑死）；lockstep 5/5 PASS（`6785c21b`） | 机制成立 |

## 3. 缺陷（S1／S2／S3＋归属）

- **S1：无。** 渲染不变三项硬判据本席独立复现全绿；无源码／产物改动；CI 断言有鉴别力。
- **S2-1（归属 #79，已登记未修＝G-3，本席复现确认）**：`base-combos/package.json` 的 `workspace:^0.2.0` 会使任何含 base-combos 的 `check-publish --pre` 变红（实测 `--only base-combos` → FAIL，exit 1）。当前 CI `--only` 口径绕过它，故为**潜伏**而非当下红。定级 S2（发布红线潜伏），不推翻 PASS（见 §6），整改清单 T1。
- **S3-1（归属 tooling，非 #79 引入，既有工具 bug，附带发现）**：`node tooling/check-publish.mjs --pre`（无 `--only` 全量口径）直接崩溃：`TypeError [ERR_INVALID_ARG_TYPE]` 于 `check-publish.mjs:98`（`withFileTypes:true` 取到 Dirent 却传给 `join`）。后果：全量发布门目前**跑不起来**（只能跑 `--only`），G-3 这类问题缺全量兜底。整改清单 T2（另开票，不在本票验收内扣分）。
- **S3-2（归属 #79 实施席，过程问题，已自曝＝§11 P-1／P-2，不另扣分）**：`40fa1c5` 误并他席 `t83-recheck-r2.md` 19 行；`reset --soft` 误退 HEAD 后 10 秒内恢复。本席复核：HEAD 链完整（`40fa1c5→223f1a5→5e2eb22→…→8515ccb`），`git status` 无残留，无内容损失。自曝充分，关闭。

## 4. 探针变异（mut-a：改版本→红→还原→绿）

| 步 | 动作 | 实测 |
|---|---|---|
| 0 | 基线 `node --test base-version-lockstep.test.mjs` | exit 0，5/5 |
| 1 | 变异 `base-combos` version 0.2.0→0.1.0（`ce47ff33…→3f715113…`） | 断言 exit 1，唯一失败＝「三包 version 逐字相等」，消息 `实得：base-link-core@0.2.0 / base-paint@0.2.0 / base-combos@0.1.0`（pass 4／fail 1） |
| 2 | 还原 | `restored=ce47ff33…`，byte-identical=true；复跑 exit 0，5/5 |
| 3 | 残留扫描 | 工作树 diff 中 `MUT-\d` 命中 0；文件命中 17 处全是历史他票文档的变异术语（非本席残留）；`git status packages/` clean |

 verdict：**RED-THEN-GREEN OK**——CI 断言对版本偏斜有且仅有目标用例变红，无误伤（其余 4 用例在变异下仍绿）。

## 5. 门禁表（本席 8 条 GATE-RUN，全 exit 0；对账见 §8）

| 命令 | runId | 关键输出 |
|---|---|---|
| `pnpm snapshot:check` | `7ef62bb6-d912-49ba-ad1f-3e5ccdd66b25` | `0.1.0@932e7b250d278d50` |
| `pnpm snapshot:html:check` | `192bc8c3-7ca0-41c3-8c3a-42102170cdc4` | 185 changed=0，fp `0686fc23…` |
| `pnpm boundaries` | `07eec2cc-de37-4df9-9bc7-c623735408a0` | PASS |
| `pnpm install --frozen-lockfile` | `f9e8a29b-cf31-4378-a818-ea017a9cc56d` | Already up to date |
| `pnpm publish:pre` | `88a5ca41-88f0-4cef-97b5-bfd5d89ef32e` | PASS |
| `pnpm publish:fresh` | `c7993e4a-0668-4b1a-aff3-aba94bca8ee1` | PASS（G3 全绿） |
| `node --test …/base-version-lockstep.test.mjs` | `6785c21b-390d-4f10-9ba0-87583b2f61fc` | 5/5 |
| `node --test …/contract-signatures.test.mjs` | `a0ef4ba3-8328-4878-a914-a347b2484199` | 47/47 |

直跑诊断（非 GATE-RUN）：探针 help（sha `f380ef68…`×2 确定性）／fp（快照无指纹）／mut-a＋residue／`--pre --only base-combos`（红，G-3 证据）／全量 `--pre` 崩溃（S3-1 证据）／`npm view` 三包已发布版本。

## 6. 五维＋verdict＋整改清单

| 维 | 分 | 依据 |
|---|---|---|
| ① 渲染不变 | 100 | A1–A5 全独立复现；快照文件未被重写（A4） |
| ② 版本工程红线 | 90 | 三包 0.2.0 前进合法；fixed 组＋lockstep 机制对；扣 10 分给 S2-1 潜伏 |
| ③ CI 鉴别力 | 95 | 双 job 接线＋红绿变异精确；扣 5 分：lockstep 第 4 用例只覆盖 combos／paint 两条边（5 技能 range 不在断言内，靠 check-publish 同源口径补） |
| ④ 发布面安全 | 85 | 当前口径四门全绿＋无同号冲突；扣 15 分：S2-1＋S3-1（全量口径不可跑） |
| ⑤ 证据与登记诚实 | 95 | 33→本席抽查无一失实；§11 自曝充分；扣 5 分：P-1 污染需靠自曝而非机制拦截 |

**verdict：PASS（附整改清单，不关票由编排者定）。** 渲染不变是硬判据，三项全部由本席用自己的运行独立复现；其余主张全部成立；唯一 S2 为已登记的潜伏项，不影响本次验收结论。

整改清单（另开票，不 блокировать 本票）：T1 给 `base-combos` 的 `workspace:` 留白名单或发布期替换（G-3／S2-1）；T2 修 `check-publish.mjs:98` Dirent 崩溃恢复全量口径（S3-1）；T3 skill-calorie 解冻后 `base-link-core ^0.1.0→^0.2.0`（G-2）；T4 契约 §5「现状／不升版」措辞更新（G-1）；T5 共享仓禁用 `amend`／`reset`（过程，已自曝）。

## 7. 本席交付与纪律核对

- 保命：`git commit --only docs/research/t79-review-blue-probe.mjs` → `8515ccb`（单文件，stat 已核）。
- 本报告提交同样 `commit --only docs/research/t79-review-blue*.mjs`；未改产品代码；未 push；未关票。
- 并发说明：红席同票号并发跑门（gate 日志 interleave），本席 8 条 RUN 均 waitedMs≤1、无锁争用；机械 `check-gate-audit` 窗口会含红席条目，故本席做手工一对一对账（§8）代替。

## 8. 对账（手工一对一：证据 runId ⟺ gate-runs.log RUN 条目，8/8 exit 0）

`7ef62bb6`（19:42:40Z）／`192bc8c3`（19:42:58Z）／`07eec2cc`（19:43:16Z）／`f9e8a29b`（19:43:16Z）／`88a5ca41`（19:43:17Z）／`c7993e4a`（19:43:20Z）／`6785c21b`（19:43:52Z）／`a0ef4ba3`（19:44:07Z）——START／RUN 成对，exit 全 0，无未声明的本席条目。
