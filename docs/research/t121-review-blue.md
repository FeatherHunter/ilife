# #121 蓝队审查报告：复制按钮 `copied` 态（H-16 JS 侧）

> 被审：`d0e0546`（实现＋单测＋CDP 脚本）／`04968f5`（证据＋对账源＋changeset）。
> 独立复跑：**全部**经 `node tooling/run-locked.mjs --ticket 121-review-blue -- …`（协议 §2.4）；逐条 runId 见文末。
> 探针／变异器（自写，可复跑）：`.scratch/orchestrator/blue12-probe-p1.mjs`／`blue12-scope.mjs`／`blue12-mut.mjs`＋`blue12-mut2.ps1`。

## ① 路径／禁区

`git show --name-only`：`d0e0546` = `controls.ts`／`style.ts`／`test/copy-copied-121.test.mjs`／`docs/research/t121-browser-evidence.mjs`；`04968f5` = `docs/research/t121-copied-runtime.md`／`t121-gate-runs.log`／`.changeset/t121-copy-copied-runtime.md`。**7 文件全部落在派单声明路径内**。禁区扫描（`help.ts`／`charts.ts`／`blocks.ts`／`skill-calorie/**`／`tooling/**`／`plugin-*`／`spec/**`）→ **零命中**。审计日志全量 grep：无 `git add -A`／`git add .`／`push`／`stash`／`reset --hard`／`clean`；reflog 线性（HEAD@{0..7} 全为 commit）；`master…origin/master [ahead 37]` → **未 push**。

## ② 契约面

- `BuildSharedHelpersJs = (input?: SharedHelpersInput) => string`（`packages/base-render/src/spec/controls.ts:182`）与 `SharedHelpersInput`（`:148`）**两提交零改动** → 签名不变；JS 侧落点仍在 `buildSharedHelpersJs()`（`controls.ts:579`）、挂既有 `boot()`／既有委派。
- `HELP_COPY_COPIED_CLASS`（`controls.ts:528`）／`HELP_COPY_COPIED_MS`（`:532`）：`git grep` 无 `export` → **零新契约面** ✓。
- 冻结面：spec registry **130 条**零改动；`contract-signatures.test.mjs` ＋ `help-center-js-88.test.mjs` → **54/54 pass，exit 0**；`packages/base-render/test/*.test.mjs` → **475/475 pass，exit 0**；`copy-copied-121` 单跑 **10/10 exit 0**。

## ③ 样式单一来源

- 新增 CSS **全部**落在 `style.ts` 的 `SECTION_BUILDERS.helpShell`（区起点 `:513`，改动行 `:779,782,795-800,937,940,1036-1042`）；产出 CSS 恰 **3 条** `.copied`（#75 的 `.ilife-copy-btn.copied` ＋ 本票两条），`--ok` 全表**定义 1 次**，diff 内**零新增 token**；skill 侧零改动、未走 `extraCss`（`git grep copied -- packages/skill-*` 无命中）。
- T9／T11：`style.test.mjs` ＋ `copy-copied-121` 合并 **39/39 exit 0**。
- 弹簧逐字比对（我自己 diff 源文件）：#75 基座 `:358` 与新增 `:779`／`:937` 同为 `transition: transform .45s cubic-bezier(.34, 1.56, .64, 1), background-color .2s ease`；`:active` `:373` 与 `:783`／`:941` 同为 `transform: scale(.96)`；reduced-motion 处理与 `.ilife-copy-btn`（`:1021-1026`）同形（`transition:none` ＋ `transform:none`）✓。

## ④ 跨票影响（controls.ts／style.ts 是 6 技能共用产出面；我持锁逐条自跑）

| 门 | exit | 实测 |
|---|---|---|
| `pnpm build` | **0** | `tsc -b` 无诊断 |
| `pnpm boundaries` | **0** | `boundaries: PASS` |
| `pnpm snapshot:check` | **0** | `OK: 快照 == 实际拉取版（0.1.0@932e7b25）` |
| `pnpm snapshot:html:check`（#96 新门） | **0** | `artifacts=185 changed=0 added=0 removed=0`（5 技能） |
| `pnpm publish:pre` | **0** | `check-publish --pre：PASS` |
| 契约靶向（54 条） | **0** | 54/54 |
| style＋copy-copied | **0** | 39/39 |
| base-render 全套 | **0** | 475/475 |
| canonical `pnpm test`（1 轮） | **1** | tests 1107／pass 1080／fail 27；delta **base=34 after=31 新增=2 消失=5** |

- 两条新增**全在 `packages/skill-calorie`**（`T9 目标分析盘 parity`／`cmd-read-t11.test.mjs`，签名 `exit 3221225477 stderr=`；`fetch.test.mjs` 文件级），**base-render 零失败**；干净重建后**单跑各 2× 全绿**（`r1a/r1b`／`r2a/r2b`）→ 事实登记，**不自行援引豁免**（见 ⑨ S3-4）。
- 白名单 `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` = **0 行** ✓。

## ⑤ 门禁与对账

- 独立复跑 `check-gate-audit … --log docs/research/t121-gate-runs.log --ticket 121 --since … --until … --allow-nonzero` → **`matched=28/28 scoped=28 undeclared=0`，`gate-audit: PASS`（exit 0）**；`GATE-RELAX flag=--allow-nonzero` 在证据 `:130` 留痕 ✓；导出对账源受跟踪 ✓。
- **S3-1**（本票范围）：证据 `:180` 引文 `OK: 5 技能 HTML 快照 == 实际（185 件产物，changed=0）` **不是工具输出**（真实为两行：`…（185 件产物，base-* 指纹 edd0c9cb…，base-* 文件 24 件）` ＋ `RESULT: artifacts=185 changed=0 …`），且审计日志中 `ticket=121` 的 `snapshot:html:check` 条目为 **0** → 按 §2.4.3 该运行不得作门禁证据；**实质结论经我 g4 独立复跑为真**，故只判记账。
- **S3-2**（本票范围）：证据 `:128` 称「窗口右端之后本票仅剩一次 `git commit`」，实际另有 `runId=95fff23b cmd="pnpm build" exit=0 at=14:44:56Z`（ticket=121，窗口外）→ **漏记一次运行**。

## ⑥ 提交／tracker

7 个文件全部 `git ls-files` 受跟踪 ✓；`#121` **state=OPEN**（未提前关票）；body 首字节 `23 23 20`（**无 BOM**）、无 CR、无字面 `\n`；旧进度块保留（`### 进度历史` ＋ `## 进度：0%` 条目）、新增 `## 进度：90%` ＋「本票不自行关票」✓。认领＝第一笔写操作：timeline `assigned 14:32:00Z` ＜ 首次持锁 `RUN 14:35:07Z` ＜ 首 commit `14:38:32Z` ✓。证据 sha256 逐值吻合：`controls.ts 82575C21…7DCF`／`style.ts 04182D2D…EC5F`（我独立 `Get-FileHash` 一致）。

## ⑦ 并发污染

- #82 `SKILL.md`：canonical 窗口 `14:41:16–14:41:48Z`，其重写提交 `d719197 @14:42:17Z`；现状 `SKILL.md` 30052 B／**0 个 NUL**／首字节 `---\n`，`git diff HEAD` 空 → **无零填充事故**，实施者自述与实测一致。
- 我的 canonical 轮 `14:45:26–14:45:56Z`：审计日志显示 #82（14:44:44／14:45:57）前后相邻、#106（14:46:08）紧随 → 高负载并发上下文，与两条 skill-calorie 崩溃签名自洽。
- `style.ts` 交叠面：历史仅 `#121`(d0e0546) 与 `#88`(e3690df) 动过；`#106`（`helpCenter.ts`）／`#107` 未触 `style.ts`；跑完 `git diff HEAD -- packages/base-render/src` **空**。

## ⑧ 新探针（3 支，均为被审脚本覆盖不到的盲区）

1. **P1 真页选择器／层叠 ＋ 真 class 列表**（`blue12-probe-p1.mjs`，**6/6 PASS**）：真 `renderHelpShell()` 页取到 6 个静态复制按钮，class 逐字 `ilife-help-shell-btn ilife-help-shell-btn-prompt`、全部带 `data-t`；**我自写**的选择器匹配＋特异性引擎判定 `background` 胜者：静态 `var(--blue) → var(--ok)`（胜者 `.ilife-help-shell-btn.copied`，2 类）、卡级 `var(--card) → var(--ok)`；用**真产出文本**＋**我自写** DOM 桩跑点击 → `copied` **只加被点击的那个**（静态 ✔／卡级 ✔）。实施者的 B1–B6 桩**只用 `ilife-copy-btn`**，从未覆盖 HELP 壳两类按钮；其 S3 也只查「同名规则块存在」，不证命中／不证层叠。
2. **P3 作用域清点**（`blue12-scope.mjs`）：新增 `transition`／`:active` 挂**基类** `.ilife-help-shell-btn`——真页只有 3 个复制按钮吃该基类，`backtop` 是独立类且自带 `transition: opacity .2s ease` → **无越界按压效果**（排除了一条我怀疑的 S2）。
3. **变异 M-A1／M-A2／M-B**（src 级，`blue12-mut.mjs`；还原后 sha256 逐次等于 `04182D2D…EC5F`，`VERIFY EQUAL=true`）：**M-A1** 删 `.help-shell-card-copy:active{transform:scale(.96)}` → **39/39 仍绿**；**M-A2** 删 #121 新增的 reduced-motion 归零块 → **39/39 仍绿**；**M-B 正对照** 卡级 `.copied` 背景 `--ok→--blue` → **38 pass/1 fail 红**（证明我的复跑有鉴别力）。

## ⑨ 缺陷清单（归属标注）

- **S1：0**。**S2：0**。
- **S3-1**（本票范围）：⑤ 的 snapshot:html:check 引文非逐字 ＋ 无 `GATE-RUN` 声明（§2.4.3）。
- **S3-2**（本票范围）：⑤ 的「窗口外仅剩一次 git commit」与审计日志不符（漏记 `pnpm build` 一次）。
- **S3-3**（本票范围）：`:active scale(.96)` 与 reduced-motion 归零**无自动化守卫**（M-A1／M-A2 变异后全绿；CDP A7 只测 `transition-duration`）。
- **S3-4**（跨票／环境，登记待裁）：我轮 canonical `新增=2`，两条均在 `packages/skill-calorie`、干净重建后单跑各 2× 全绿、签名属 §5.1 进程级异常形态；按 §6「session 不得自行援引豁免」→ **只登记事实**。
- **范围外发现**：`packages/skill-calorie/src/render/helpCenter.ts`（M）＋`test/help-center-106.test.mjs`（??）为 **#106 在途 WIP**，非本票路径，未被我 `git add`。

## ⑩ 五维＋均分＋verdict

| 维 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **30** | 签名／常量不导出／spec 130 条零改／54-54＋475-475 |
| 证据真实可复现 25 | **21** | sha 逐值吻合、对账 28/28；扣 S3-1／S3-2 ＋ CDP 未由我独立复跑 |
| parity 20 | **19** | 选择器命中＋层叠胜出＋运行时加类由 P1 独立证明；浏览器 computed 色未独立复跑 |
| 工程红线 15 | **15** | 无越界／无危险 git／未 push／全程持锁／无 install |
| 文档同步 10 | **8** | changeset＋票面进度块正确；扣两处证据记账 |

**均分 93（≥85）、无 S1-交付缺陷、无未处置的 S1-过程违规 → verdict：PASS**（S3 四条记账；S3-4 待编排者裁定）。

```text
# 我的独立复跑（ticket=121-review-blue，经持锁包装器）
GATE-RUN runId=0a13cb6d-94b3-4bda-930a-3a9316a2f089 cmd=pnpm build
GATE-RUN runId=035909fa-735b-4599-a7fc-b9529b9902a1 cmd=pnpm boundaries
GATE-RUN runId=c562e28f-197b-4f8b-b480-20b7dc553d90 cmd=pnpm snapshot:check
GATE-RUN runId=383e4d5d-9822-4649-8002-4186bde7776b cmd=pnpm snapshot:html:check
GATE-RUN runId=0389c740-e67b-4c76-a4bf-1e883ee32bff cmd=pnpm publish:pre
GATE-RUN runId=fcd50be9-f405-4330-84d6-80ada0c6eabe cmd=node --test packages/base-render/test/contract-signatures.test.mjs packages/base-render/test/help-center-js-88.test.mjs
GATE-RUN runId=2c4a7a5f-816f-46c1-8e11-c0b4844514dd cmd=node --test packages/base-render/test/style.test.mjs packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=43f8ddac-d078-4f9b-8d21-04c7485b6037 cmd=node --test packages/base-render/test/*.test.mjs
GATE-RUN runId=081e5df2-2b03-41bc-92e6-cc3e5d7df7be cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=753a29da-58ab-49c2-a84b-1c029595c61f cmd=pnpm test
GATE-RUN runId=2699e654-162e-4f48-87f4-5845d2bcab2a cmd=pnpm build
GATE-RUN runId=a75456d0-46cc-46f0-99b1-985f0954b184 cmd=node --test packages/skill-calorie/test/cmd-read-t11.test.mjs
GATE-RUN runId=e8729773-887d-4a24-b80c-3fef8677b407 cmd=node --test packages/skill-calorie/test/cmd-read-t11.test.mjs
GATE-RUN runId=67396f49-a446-4a72-abc0-4a1ede8e4412 cmd=node --test packages/skill-calorie/test/fetch.test.mjs
GATE-RUN runId=b4736eaf-13a9-4c13-9f1b-ff2ab07160bd cmd=node --test packages/skill-calorie/test/fetch.test.mjs
GATE-RUN runId=aab0d42b-766f-4b71-a474-d02b7f71f714 cmd=pnpm build
GATE-RUN runId=30c61c89-4892-4938-8bad-92d851ad7ba6 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs packages/base-render/test/style.test.mjs
GATE-RUN runId=96762337-6c71-428d-ac40-027d118c2822 cmd=pnpm build
GATE-RUN runId=a789a451-99ae-4ea1-9a84-50da7988228e cmd=pnpm build
GATE-RUN runId=dc9b5e5e-3e07-4d79-8784-feb4e16ba9d0 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs packages/base-render/test/style.test.mjs
GATE-RUN runId=a296d6d5-ebf0-40a6-a6c0-2bc5a14adbb7 cmd=pnpm build
GATE-RUN runId=c28a8b16-3e0a-412c-bfe0-dedb29f56562 cmd=pnpm build
GATE-RUN runId=30854e16-f3e0-4c42-8ea8-c0fdd438c2e0 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs packages/base-render/test/style.test.mjs
GATE-RUN runId=7c9c8ac1-c7fa-4318-9f37-8bf158e50ca1 cmd=pnpm build
GATE-RELAX flag=--allow-nonzero reason=本报告同时登记 canonical 红轮（exit=1，既有红）与 M-B 正对照红轮（exit=1）；门禁结论只取上表 exit=0 的条目。
```
