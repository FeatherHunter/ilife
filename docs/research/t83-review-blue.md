# #83 蓝队审查报告（wayfinder #63 · HTML-First 工作流与渲染失败回执落地）

- 被审提交：`8439976`（实现）／`14a7701`（证据）／`5fffe1e`（红队返修 R-1）。
- 审查席：**蓝队（独立对抗式，fresh session）**。不采信 `docs/research/t83-html-first.md`（实施者）与 `docs/research/t83-review-red.md`（红队）的任何结论——两者只作被审对象；本报告全部数字由本席自建脚本／变异重算。
- 自建物：探针 `docs/research/t83-review-blue.mjs`（**56/56 PASS**）、变异 `docs/research/t83-review-blue-mut.mjs`（**6 支，ALL OK**）。
- **结论：verdict PASS（五维 85）** —— S1-交付缺陷 **0**；S2 **2**（关闭前须改口径或补证）；S3 **9**。
- 本席相对两席的**增量发现**（两席均未记）：`delivery-83.test.mjs:246` 断言**恒真**（变异 MUT-83B-6 全绿）；`deliveryTemplateOf` 判定次序**零覆盖**（MUT-83B-3 全绿）；`mode:"inline"` 与 `delivery.mode:"inline"` 同名异义；同一键两条「文本」来源差 28 倍；`--params '{"delivery":"text"}'` 在参数白名单键上 exit 2；红队报告漏记 §2.4 过程违规。

---

## 1. 被审范围与路径合规核对

| commit | 文件 | 核对 |
|---|---|---|
| `8439976` | `skill-calorie/src/cli/cmd_read.ts`／`src/output.ts`／`src/render/envelope.ts`／`test/delivery-83.test.mjs`／`test/help-center-91.test.mjs`／`docs/research/t83-evidence.mjs` | 全部在票面声明面内 |
| `14a7701` | `.changeset/t83-html-first-delivery.md`／`docs/research/t83-{gate-runs.log,html-first.md,mutation.mjs}` | 证据面 |
| `5fffe1e` | `packages/skill-calorie/src/output.ts`（**唯一产品改动，1 行逻辑＋注释**）／`test/delivery-83.test.mjs`（+3 例）／`docs/research/t83-review-red*.{md,mjs}`／`t83-mutation.mjs`／`t83-html-first.md`／`.changeset` | 返修面收窄，符合红队返修声明 |

- **零越界**：三个 commit 均无 `packages/base-*/**`、`packages/skill-calorie/{SKILL.md,templates/**}`、`tooling/**` 改动（`git show --name-only` 逐笔）。
- **授权改动仅 2 token**：`help-center-91.test.mjs` 仅 `:33`（`ENVELOPE_FIELDS` 5→6）与 `:81`（文案）；`:114-115`／`:189` 原样通过——本席复核 diff 一致。
- **契约面**：`SPEC_FROZEN_SURFACE` 实测 **130 条**、其中 **0 条**含 `delivery`；`STRICT_ENVELOPE_FIELDS` 仍 5 项，`base-render/src/template.ts:195-203` 为 `hasOwnProperty` **存在性**校验（不拒多余键）→ 顶层追加 `delivery` **不违反**冻结面。
- **变异期临时动作（自曝）**：`t83-review-blue-mut.mjs` 在**单锁内**临时改写 `src/output.ts`／`src/cli/cmd_read.ts`／`src/render/envelope.ts`，每支**立即还原＋重建＋sha256 自证**（src 与 dist 双向逐字节相同），未留到批末。
- **写盘事故自检**：`packages/skill-calorie/SKILL.md` 首 3 字节 `2d 2d 2d`（未零填充）；`MUT-\d` 残留 **0**。
- **工作区快照**（收尾）：`git status --porcelain` 仅含本席新增 2 个 `docs/research/t83-review-blue*.mjs` ＋ 他票未跟踪文件（`.gitignore` 的 ` M` 为他席 WIP，本席未动）。
- **方法学自曝**：本席曾用 PowerShell 管道回写 `t83-review-blue.mjs`，因宿主实为 **Windows PowerShell 5.1**（`Get-Content -Raw` 默认 ANSI）导致 UTF-8 损坏 → 改为 write 工具重写；对应一次 `node` 语法错运行 `runId=a3b993f1`（已声明为过程轮）。

## 2. 缺陷清单

### D-1（**S2** · 本票范围 · parity／契约）回执覆盖面窄于 M4 字面：exit 4／exit 2 **不发回执**

- 复现（真机）：`SKILLS_DB_PATH=<空库 tmp> node packages/skill-calorie/dist/cli/cmd_read.js calorie.history --params '{"days":3}'` → **exit 4**、stdout 0 B、stderr 仅 `ERR 4: 取数失败（缺失阻断）…`、**无 `RECEIPT` 行**。
- 证据：`OBS B14`——`exit4 receiptLines=0`／`exit2-空q=0`／`exit2-非法mode=0`／`exit5=1`（`cmd_read.ts:1170-1176`）。
- 判据：旧铁则正本（只读基线 `卡路里/SKILL.md:18-19`）字面「渲染失败（**退出码非 0**／产物缺失）→ 输出错误回执」；旧 `scripts/render_error_receipt.py` 的用法注释覆盖面更宽（「AI 在**写库失败／补记冲突／校验不过**时调用」）。本票只覆盖 exit 5 ⇒ M4 回执铁则**覆盖面缺口**。
- 归属：**本票范围**（票面验收只写「渲染失败回执」，取数失败是否算渲染失败属口径问题，需维护者拍定；红队已记 S3-3，本席升为 S2 并给出判据）。

### D-2（**S2** · 本票范围 · 验收字面）验收①「成功渲染并**打开**」未被证明，证据表却列作已达成

- 证据：`docs/research/t83-html-first.md:61` 行标题「① 成功渲染并**打开**（4 键 × 4 产物族）」，同行的实测只有 `mode=file`／`path` 绝对／`path===data.output`／`bytes===statSync().size`／无 `data.html|text`——**没有任何「打开」观测**（无浏览器／查看器／宿主 tab 证据）；`t83-evidence.mjs` 亦只断言产物存在与字节数（全文无 open／打开相关观测）。
- 本席复核：「打开」在旧契约里是 AI／宿主动作；本票唯一出口只负责落盘＋回传落点；地图 Out of scope 明列「安装／双路实证归打通图」。⇒ 技术交付完整，但**证据表述与验收字面不符**。
- 归属：本票范围。最小整改：证据表改称「渲染并落盘＋回传落点」，并把「打开」标为未确证／转 #64（与③「无对应模板」同等的如实标注）。

### S3（记账跟进，不阻塞关闭）

- **D-3（本票引入 · 契约一致性）同一键两条「文本」来源差 28 倍**：`OBS B12` `mode:'text'`＝24,989 B（渲染层文本）vs `delivery:'text'`＝898 B（`buildDataText` 投影）；`mode:'file'＋delivery:'text'` 时 delivery 覆盖页面形态（898 B、不落盘，`OBS B12b`）。
- **D-4（本票范围 · 测试鉴别力）`delivery-83.test.mjs:246` 断言恒真**：`assert.equal(html, rec.html === undefined ? html : rec.html, …)`——`rec.html===undefined` 时比较 `html` 与自身，**从不校验**「落盘态不重复回传正文」。变异 **MUT-83B-6**（落盘态也回传正文）→ 靶向 **59/59 全绿**；本席探针 `B15` 独立证明当前行为正确（`recHasHtml=false`）。建议改一行：`assert.equal(rec.html, undefined, …)`。
- **D-5（本票范围 · 测试鉴别力）`deliveryTemplateOf` 判定次序零覆盖**：变异 **MUT-83B-3**（`shape==='receipt'` 提到 `<!DOCTYPE` 前）→ 59/59 全绿；`OBS B10b`（receipt 形全文档 → `doc-shell`，receipt 语义被吞）。当前 99 键实测 **0 例**（`B8c`），属潜在误判面。
- **D-6（本票引入 · 三态可达性）`delivery:"text"` 非通用开关**：`OBS B4e` `calorie.exercise.update --params '{"id":1,"calories":10,"delivery":"text"}'` → **exit 2 `不支持字段: delivery`**（`write.ts:600/740/779/881` 四处白名单）；而 `.changeset/t83-html-first-delivery.md` 把 `--params '{"delivery":"text"}'` 写成通用触发。
- **D-7（本票引入 · 命名歧义）`mode:"inline"`（页面形态）≠ `delivery.mode:"inline"`（交付通道）**：`OBS B11` 可写盘时 `mode:inline` → `delivery.mode=file`、994,295 B 落盘。
- **D-8（本票范围 · 文档同步）**：`t83-html-first.md:7`「新测试（10 用例）」实为 **13 例**；`help-center-91.test.mjs:8` 注释仍写「五字段」；`SKILL.md:31` 未同步「`data.output` 恒绝对」（changeset 已写）。
- **D-9（本票引入 · 消费方影响）`data.output` 由「原样」变「恒绝对」**：全仓 `.ts` **零程序消费方**（grep `data.output` 无读取点）；已发布 `0.2.0` 实测回传为相对（`docs/research/t123-release-evidence/afk-20260909-02.md:33`）→ 属改进（旧基线 `html_path()` 亦绝对），但须在 `SKILL.md`／变更日志显式记账。
- **D-10（范围外发现 · 审查留痕）红队报告漏记 §2.4 过程违规**：`t83-review-red.md` 未列实施者自认的裸跑（协议 §6.1④ 要求「报告与关闭记录仍须逐条列出该 S3」）。编排者已在票面按 §6.1② 出具具名比例处置（首犯／一次性／不类推）→ **不阻断**，但红队留痕缺项成立。
- **D-11（本票范围）`delivery.reason` 未透出**：只读回退时显式 `--output` 被静默忽略（`OBS B2f`：`delivery` 键集＝`mode/template/bytes`）。红队 S3-2 已记，本席独立复现。

### 本席复核为「两席结论正确」的项（负结果，如实记录）

- **R-1 真修好且落点恒等**：`B9a/B9b/B9c/B9d/B9g` 覆盖 绝对／`\\?\` 扩展长度前缀／驱动器相对（跨盘 cwd）／默认落点 → `resolve()` 归一后**落点与请求逐字相同**、`--output` 语义未变；变异 **MUT-83B-1**（还原「原样回传」）→ 靶向 **fail=3，恰为三条 R-1 测试**（`⑥ 相对 SKILLS_DB_PATH／相对 --output／相对＋写键`）→ 返修**承重**。
- **`--html` legacy 别名**：`B1a-f`（相对路径）全绿；变异 **MUT-83B-2**（摘别名）→ **fail=4**（T8 parity／T10 照片 parity／#87 ⑧ 等）⇒ 既有测试**确实覆盖**该别名（本席原假设的盲区不成立）。
- **三态真可达**：file（`B1/B8`）、inline（`B2` 显式只读落点／`B6` 默认目录只读 1 MB）、text（`B3` 渲染层／`B4` 用户明确要文本）。**「无对应模板」仍无真机 key**：`OBS B5` `q:""`→exit 2、缺 `q`→exit 2、`q:"   "`→exit 4，三条路径均不触发 `html.trim()===''` ⇒ 实施者「如实标注」成立。
- **`delivery` 注入范围**：**99 键全量扫描**（`B8-SWEEP`）——exit 0 的 **37 键全部**带 `delivery`；`noDelivery=0`、`bad=0`（路径绝对／`path===data.output`／`bytes===statSync().size`／P9 一行）；产物族分布 `stat/doc-shell 22｜stat/fragment 9｜receipt/receipt 4｜list/fragment 1｜list/help-shell 1`；`template` 与**实际产物结构**独立复算 **0 不一致**。写键 receipt 族覆盖（`B8`＋`B4`）。
- **P9**：成功态恰一行 JSON（`B1f/B6b/B8b`）；失败态 stdout **0 B**（`B14` 四例）。
- **1 MB 内联**：`B6` 只读目录下 `calorie.help.center` → `mode=inline`／`template=help-shell`／stdout **1,324,650 B 恰一行**／`bytes===byteLength(data.html)`。
- **变异复核（实施者 M1／M2 真红）**：**MUT-83B-4**（摘只读回退）fail=1；**MUT-83B-5**（摘 `delivery` 注入）fail=12；两支还原后 sha256（src＋dist）逐字节相同、靶向 59/59 绿。

## 3. 门禁实测（全部经 `run-locked --ticket 83`；runId 见 §6）

| 门 | 命令 | exit | 关键行 |
|---|---|---|---|
| 四门 | `pnpm build` | 0 | `tsc -b` 无 error |
| | `pnpm boundaries` | 0 | 通过 |
| | `pnpm snapshot:check` | 0 | 快照一致 |
| | `pnpm publish:pre` | 0 | PASS |
| 靶向 | `node --test delivery-83／cmd-read-t11／render-copy-90／help-center-91／skill-t11／output-naming-87` | 0 | `tests 59／pass 59／fail 0` |
| 本席探针 | `node docs/research/t83-review-blue.mjs` | 0 | `RESULT-BLUE: 56/56 PASS` |
| 本席变异 | `node docs/research/t83-review-blue-mut.mjs` | 0 | `RESULT-MUT-BLUE: ALL OK`（6 支） |
| canonical | `pnpm test` | 1 | `tests 1137／suites 133／pass 1112／fail 25`（既有红）→ `t101-fail-set`（t88 白名单 34）：**base=34 after=29 新增=0 消失=5**（消失 5 条均为基线已登记抖动项）。**附注**：对**陈旧**名单 `docs/research/t101-baseline-failures.txt`（27 条）会报「新增 3」，逐条核为 `#81 路由层`／`#93 ①`／`FX-81-5`——三者**均在 t88 白名单内**，**与本票零归因**。 |
| 白名单 diff | `git diff --stat -- docs/research/t88-baseline/test-failset.txt .scratch/t88/baseline/test-failset.txt` | — | 0 行（未改口径） |

## 4. 自设新探针与变异：覆盖了什么盲区、结果

| 编号 | 覆盖的盲区（既有两脚本未覆盖） | 结果 |
|---|---|---|
| B1 | `--html` legacy 别名 ＋ **相对**路径（两脚本只用 `--output`） | 6/6 PASS |
| B2 | 显式 `--output` 落在**只读目录**（既有只覆盖默认目录只读） | 6/6 PASS（含 `delivery.reason` 缺失＝D-11） |
| B3 | ③ 文本态 ＋ `--output`（落点／同值／字节） | 5/5 PASS |
| B4 | 写键 ＋ `delivery:"text"` ＋ **只读句柄回读库**（`n=1, grams=250`）＋白名单键 | 5/5 PASS；`OBS B4e` 抓出 D-6 |
| B5 | 「无对应模板」结构缝的**真机可达性**（空 `q`／缺 `q`／空白 `q`） | 2/2 PASS（均不可达） |
| B6 | 1 MB 产物内联的 **stdout 体积／行数** | 4/4 PASS |
| B7 | `mode:'text'` ＋ 相对 `SKILLS_DB_PATH` 的 `data.output`≡`delivery.path` | 2/2 PASS |
| B8 | **99 键注入覆盖扫描** ＋ template 与**实际产物结构**独立复算 | 4/4 PASS（37 键 exit 0，0 违规） |
| B9 | R-1 归一化的**恒等性**（绝对／`\\?\`／驱动器相对／默认） | 6/6 PASS |
| B10 | `deliveryTemplateOf` 误判面（receipt 形全文档） | 观测；配 MUT-83B-3 |
| B11 | `mode:"inline"` vs `delivery.mode:"inline"` 命名歧义 | 观测 → D-7 |
| B12 | 同一键两条「文本」来源 | 观测 → D-3 |
| B14 | exit 4／2 是否发回执（M4 字面） | 观测 → D-1 |
| B15 | 回执「落盘态不回传正文」独立证明 | 观测 → D-4 |
| **MUT-83B-1** | R-1 归一化是否承重 | **红 fail=3**（恰三条 R-1 测试）；还原 sha256 双向相同 |
| **MUT-83B-2** | `--html` 别名覆盖度 | **红 fail=4** ⇒ 无盲区（负结果） |
| **MUT-83B-3** | `deliveryTemplateOf` 判定次序 | **全绿 59/59 ⇒ 零鉴别力**（D-5） |
| **MUT-83B-4** | 复核实施者 M1（只读回退） | **红 fail=1** |
| **MUT-83B-5** | 复核实施者 M2（`delivery` 注入） | **红 fail=12** |
| **MUT-83B-6** | 回执落盘态是否回传正文 | **全绿 59/59 ⇒ 断言恒真**（D-4） |

## 5. 五维评分

| 维（权重） | 分 | 依据 |
|---|---|---|
| 契约一致（30） | **26** | 三态＋`delivery` 与方案 A 逐条一致、只追加、P9 未破、130 条冻结面零触碰、R-1 承重且落点恒等（B9）；扣 D-1 回执口径、D-3 双文本源、D-7 命名歧义 |
| 证据真实可复现（25） | **21** | 四门／靶向／探针／变异／canonical delta 全部独立复跑一致；扣 D-2「打开」夸大、D-8 用例数过期、红队 S3-5（`.scratch/t83/gates.mjs` 不可复跑） |
| parity（20） | **17** | M4 三条中「命中即渲染」「禁手写 HTML 兜底」成立（回执走 `renderErrorHtml`）、回执命名逐字对齐旧 `操作失败`；扣 D-1 |
| 工程红线（15） | **14** | 零越界／零 `tooling/**`／授权 2 token／变异 sha256 自证／无 `git add -A`；扣 1 分：实现期裸跑事实（已由编排者 §6.1② 处置） |
| 文档同步（10） | **7** | 证据齐、changeset 齐；扣 D-8、D-10 |
| **合计** | **85** | 量刑律：S1-交付缺陷 0；无「未被 §6.1② 处置」的 S1-过程违规；85 ≥ 85 → **PASS** |

**verdict：PASS（五维 85）**。D-1／D-2 为 **S2**：按 §6「关闭前必须修完，除非编排者书面改期并给出具名票号」——建议**关闭前**由维护者就 D-1 拍口径、由实施者改 D-2 表述；若两者均被判定为口径外，可直接关闭并转票。

## 6. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 83 --since 2026-09-09T15:36:00.000Z --until 2026-09-09T15:50:00.000Z`（窗口内 ticket=83 的 `RUN` 共 **27** 条：本席 16 条 ＋ 并发他席 11 条）。对账源 `docs/research/t83-review-blue-gate-runs.log`（受跟踪）。

**本席门禁证据（exit=0）**

GATE-RUN runId=43cd77c4-e596-4fde-a9b1-0c5a3f108c00 cmd=pnpm build
GATE-RUN runId=00f3e6a4-4371-4e27-bb0e-909017e92ec7 cmd=pnpm build
GATE-RUN runId=005aec00-0415-4830-9eeb-ccb9ed7435ee cmd=node --test packages/skill-calorie/test/delivery-83.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs
GATE-RUN runId=28e95781-60be-41bc-840d-e1cbb2ad75be cmd=pnpm boundaries
GATE-RUN runId=12012bba-f60c-4ff4-bebc-fcbeb32daa2c cmd=pnpm snapshot:check
GATE-RUN runId=48326cfe-6f22-4fd4-8af1-47638e75dc6d cmd=pnpm publish:pre
GATE-RUN runId=14f974bc-b456-4ea9-af50-f4afa0e6c67a cmd=node docs/research/t83-review-blue.mjs
GATE-RUN runId=465f6bfd-34d5-49ad-9fb4-2023de7936fb cmd=node docs/research/t83-review-blue-mut.mjs
GATE-RUN runId=adcdfff1-ed2b-473a-aada-74d75b61b2a0 cmd=node docs/research/t83-review-blue-mut.mjs

**本席过程轮（非门禁证据，逐条声明）**

GATE-RUN runId=a3b993f1-4973-4f06-8c6e-37eb50aafca7 cmd=node docs/research/t83-review-blue.mjs
GATE-RUN runId=c0c2ad24-742b-4837-8e65-98e93e489207 cmd=node docs/research/t83-review-blue.mjs
GATE-RUN runId=02345c33-64f4-46b0-a4b9-30b1f57758c0 cmd=node docs/research/t83-review-blue.mjs
GATE-RUN runId=ac0bf06b-f5c7-4fdb-ac39-562e59f7bd7f cmd=node docs/research/t83-review-blue.mjs
GATE-RUN runId=6aa13830-edc9-4330-9dd3-d603bc8de5bc cmd=node docs/research/t83-review-blue.mjs
GATE-RUN runId=48e53a8d-9e4a-4527-993a-34c9b213039f cmd=node docs/research/t83-review-blue.mjs
GATE-RUN runId=f680a57a-1570-4c31-8472-cbebaee0df42 cmd=pnpm test

**并发窗口内非本席 RUN（仅登记以通过反向对账，不作为本席证据）**：`8ec55c1a`／`74c76e0f`／`2d86d743`／`51c8e6b4`／`2132a51f`／`16bbcbe4`／`0df7895a`／`4a2d38f1`／`824bfbfe`／`3e04a0e6`／`7ec29247`（他席以 `--ticket 83` 运行 `cmd_read.js calorie.help.center` 等；同时段另有 `t89-probe-help-interactive.mjs`／`t-help-acceptance-collect.mjs`／`t-help-parity-review-b-probe.mjs` 在跑，见 `.scratch/locks/gate-runs.log`）。

GATE-RELAX flag=--allow-nonzero reason=本席 6 条 exit≠0 的 `t83-review-blue.mjs` 全为**探针自身缺陷**的修复轮（① `import` 相对路径错→改 ROOT 绝对；② 回读表名错 `water_log`→`food_log`；③ B6 未清只读目录基线产物→覆盖旧文件仍成功（与红队 R6 同一陷阱）；④ B8d 阈值／B9e 进程内 `SKILLS_DB_PATH` 未设），逐条修后 `14f974bc` 56/56 绿；`f680a57a` canonical `pnpm test` exit 1 系基线既有红（判据＝失败集新增 0，实测 `base=34 after=29 新增=0`）。

GATE-RELAX flag=--allow-undeclared reason=窗口内 11 条 `RUN`（上列 runId）为**并发他席**以 `--ticket 83` 运行（`cmd_read.js calorie.help.center` 等；同时段另有 `t89-probe-help-interactive.mjs`／`t-help-acceptance-collect.mjs`／`t-help-parity-review-b-probe.mjs`），非本席执行、不得作为本席证据声明；本席自己的 16 条已逐条声明（`matched=16/16`）。

对账命令（逐字复跑）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t83-review-blue.md \
  --ticket 83 --since 2026-09-09T15:36:00.000Z --until 2026-09-09T15:50:00.000Z \
  --allow-nonzero --allow-undeclared --export docs/research/t83-review-blue-gate-runs.log
```

实测结果：`RESULT: matched=16/16 auditEntries=713 scoped=27 undeclared=11` → **gate-audit: PASS**（exit 0）。

## 7. 最小整改清单（S2；不阻断 verdict，但按 §6 须关闭前处置）

| 项 | 谁改 | 改什么 | 验收判据 | 预期证据 |
|---|---|---|---|---|
| D-1 | 维护者拍口径 ＋ 实施者（若补） | 二选一：① 回执覆盖 exit 4／2（`cmd_read.ts:1170-1176` 改为先发 `RECEIPT` 再 `fail`）；② 票面／契约显式写「回执＝渲染/落盘失败（exit 5）专属」 | ① 三态各一例 exit 4／2 出现 `RECEIPT` 且 stdout 仍空；② 票面口径行 ＋ `t83-html-first.md` 同步 | 新增 `delivery-83` 用例 ≥3 ＋ 新 `runId` |
| D-2 | 实施者 | `t83-html-first.md:61` 标题去掉「并打开」，并把「打开」列入未确证／转 #64 | 证据表无「打开」已达成字样；票面关闭记录注明 | `docs/research/t83-html-first.md` diff |
| D-4／D-5（建议同修） | 实施者 | `delivery-83.test.mjs:246` 改 `assert.equal(rec.html, undefined, …)`；新增 1 条 `deliveryTemplateOf('receipt','<!DOCTYPE…')` 断言 | 变异 MUT-83B-6／MUT-83B-3 由**全绿**变**红** | `t83-review-blue-mut.mjs` 复跑（6 支全红） |
