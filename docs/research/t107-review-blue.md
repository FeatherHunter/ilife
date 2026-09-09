# #107 蓝队审查报告 · HELP：6 个死模板并入重建

> 对象：`d812dac`／`1fcc0f1`（票 #107，父图 #63 D4）。只读核查 ＋ 持锁独立复跑 ＋ 自设探针／缺口变异；未改源码／证据／tracker。
> 留痕（§2.4）：GATE-RUN runId=37f6c278-73cf-42c7-9565-b8d13a5ef792 cmd="node .scratch/orchestrator/blue11-run.mjs A"
> GATE-RUN runId=98787631-356a-437b-aab8-d8dd9fc55a85 cmd="node .scratch/orchestrator/blue11-run.mjs B"
> GATE-RELAX flag=--allow-nonzero reason=runId 98787631 末段为蓝队探针首版零标签口径过严判 FAIL，门禁结论正文逐条给出

## ① 路径／禁区
`git show --name-only d812dac 1fcc0f1`＝**14 条，全在声明路径内**（`src/render/helpCenter.ts`、`templates/*.html`×6、`test/skill-t11.test.mjs`、`docs/research/t107-*`×5、`.changeset/t107-*`）。**未触碰** `src/render/templates.ts`／`src/render/index.ts`／`src/cli/**`／`tooling/**`／`packages/base-render/**`／`SKILL.md`（#124 现场）／`scripts/**`。工作区 `git status --short` 无本票路径改动。**「未导出新函数」成立**：`src/render/index.ts:95-100` 为显式具名导出（非 `export *`），未加新名 ⇒ 包公开出口零新增。

## ② 契约面
`SceneData.meta_blocks`／`SceneMetaBlock{id,title,html}` 是**既有冻结槽位**：`packages/base-render/src/spec/help.ts:61-66,93-103,117-124`（`#78 implemented`），渲染 `packages/base-render/src/help.ts:653-656`→`:595-601`（`html` 原样透传 ⇒ 自负转义，用既有 `escapeHtml`，`src/index.ts:6`）；`test-d/contract-signatures.ts:349` 的 `keyof SceneData` 未变。**签名未改**（`helpCenter.ts:417` 与 `d812dac^` 同串；三态集合／返回形状未变，冻结口径 `t88-final.md:189`）；语义为**追加**：注入 `opts.sceneData` 亦多一块（`cmd_read.ts:788-789` 无用户可控 `meta_blocks`）。`HELP_COPY_ACTIONS`／`TEMPLATE_MARKERS` 未改（base-render 零改动）。

## ③ 模板改动性质
两处 in-place：`lead` 由「重复命令」改为一句说明；取数 `<pre>` 加 `class="view-cli"`。**核实**：6 件各有 **2–3 个 `<pre>`**（help 3）⇒ 裸 `<pre>` 必歧义，`view-cli` 是**必要消歧锚**，非为过门而改；`lead` 旧值＝命令副本且无消费方断言其旧值。行数恒 41、标记 @7／@37 不变 ⇒ #118 清单与 legacy 分型仍准；G2/G3 逐件加载（`check-publish.mjs:130-134,212-242`）复跑 exit 0。

## ④ 删 vs 并入：理由链验证（自推演）
删 6 件：**G1 绿**（tsc 不读模板）／**G2 绿**（`check-boundaries.mjs:33,52-56` 只扫 `SKILLS_5`）／**G3 绿**／**G4 红**（`check-publish.mjs:127`、`:132-133` 逐件点名、`:213`、`:218`、`:237` loadTemplate 抛）＋ canonical 新增红（`skill-t11.test.mjs:56-59`）。修 G4 须改 `tooling/**`（禁改）＋`templates.ts`（非本票）⇒ **并入是四门约束下唯一合法路径**。

## ⑤ 门禁与对账（逐条 exit · 本席实测）
`runId 37f6c278`（waitedMs=0）：**G1 0／G2 0／G3 0／G4 0**；靶向 `skill-t11＋help-center-88＋help-center-91` **0**；canonical 1 轮 `tests 1104／pass 1079／fail 25`（exit 1＝基线既有红）；`t101-fail-set` → `base=34 after=29 新增=0 消失=5`。**两轮 canonical 日志各自独立复跑均 `新增=0`**。白名单 `git diff --numstat 93e27f9 -- docs/research/t88-baseline/test-failset.txt` ＝ **0 行**。对账 `--ticket 107 --since 14:24:00Z --until 14:30:40Z --allow-nonzero` → `matched=10/10 scoped=10 undeclared=0 PASS`（导出版＝live 版；live `auditEntries=392`）；**去掉放宽即 FAIL（恰 2 条 exit≠0）⇒ 放宽必要且留痕**（证据 `:124`）。

## ⑥ 提交／tracker
审计日志可见 `git add`／`git commit --only` 的**逐条显式路径**（`53b6067d`／`983cdf19`／`1312bdf6`／`b1f41b9e`）⇒ **无 `git add -A`／`.`**；无危险 git（本窗口 reflog 仅 commit）；**未 push**（`git branch -r --contains d812dac` 空）；证据 6 件均受跟踪。票面 `OPEN`／`closedAt=null`／1 评论；body **字面 `\n` 0 处、真换行 16、无 BOM、旧进度块保留**。**认领＝第一笔写操作**：assignee `14:20:29Z` ＜ 最早产物 `14:21:03Z` ＜ 首次持锁运行 `14:24:02Z` ＜ 首次提交 `14:30:51Z`。

## ⑦ 测试断言是否削弱
**文件名硬断言完整保留**（`skill-t11.test.mjs:56-59`，`deepEqual` 6 名 ＋ 与 `CALORIE_TEMPLATES` 双向对齐），既有断言无放宽。新断言对 **title／cli** 有鉴别力：我独立复跑 M1 锚点漂移→fail=1、M2 摘块→fail=1、M3 改 `home.html` `<h1>`→产物 SHA 变＋新标题落地、还原 sha 全 match（`helpCenter.ts a9468c31…`／`home.html 38900703…`，与我实测工作区一致）。**两处覆盖缺口见⑨-1/2**。

## ⑧ 自设探针（被审脚本盲区）
`blue11-probe.mjs` **23/23 PASS**：① 逐条目可定位源文件——每个 `data-view-entry="<name>"` 恰 1 次且该 `<li>` 只含本模板标题/命令（实施者只数总数 6）；② 入口段零 `<`（实施者与 `help-center-91:148` 只按标签名白名单）；③ 入口块落在 `id="ilife-help-shell"` 内；④ 6 条 `lead` 真进 file 产物。**新变异两支**（`98787631`）：条目名恒 `home` → `skill-t11` **仍绿**；`lead` 恒硬编码 → **仍绿**。另选 **`diet.html` 的 `lead`** 证承重：产物 SHA 变＋新 lead 落地、还原回原 ✓。

## ⑨ 缺陷清单（S1-交付 0／S1-过程 0／S2 0／S3 8）
1. **本票**：`data-view-entry` 逐条目映射无断言（GAP1 仍绿）——实现正确、断言无鉴别力。
2. **本票**：`lead` 既未断言来自磁盘也未断言进产物（GAP2 仍绿）；证据 §4「抽取值逐字来自磁盘原文」应限定为 title／cli。
3. **本票**：证据 §6／票面「canonical 1 轮」不准（实为 2 次；两轮 delta 一致，结论不变）。
4. **范围外（并发）**：file／inline 字节对 base-paint 资产敏感（#121 在飞改 `base-render/src/style.ts`，mtime 14:34:54Z）：同 commit 实测 1,033,461→1,033,640 B；**text 24,989 B／`92425e0abb47e626` 与登记值逐字相同**（text 不含资产）⇒ 漂移非 #107 内容，登记值宜加「依赖 base-paint 快照」注。
5. **本票**：证据引 `spec/help.ts`／`help.ts` 缺包前缀（实为 `packages/base-render/src/…`）。
6. **本票**：text 态入口行沿用子功能行 2 空格缩进（`helpCenter.ts:395` vs `:403`），仅靠 `[看板页入口]` 区分。
7. **本票（取舍）**：`renderHelpCenterHtml` 硬依赖 6 件模板（缺件三态皆抛 `missing-data`）；G4 逐件门已兜底，建议后续票登记该新失败模式。
8. **范围外**：text 全文含 1 处 `<`（line 97 legacy CLI `--days <N>`）；「text 零标签」实为标签名白名单口径，建议收紧。

## ⑩ 五维＋verdict
契约一致 30→**28**｜证据真实可复现 25→**22**｜parity 20→**18**｜工程红线 15→**15**｜文档同步 10→**8**。
总分 **91**（均分 18.2／20）；S1 0、S2 0 ⇒ **verdict：PASS**（8 条 S3 记账；1／2／5 建议随关闭记录订正）。
