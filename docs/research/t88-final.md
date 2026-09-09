# #88《HELP 速查台重建：取 F3 并回补 F1／F2 独有能力》· 收尾结题（S5）

> 归属：map **#63** 票 **#88**。本文件＝**收尾交付**（验收总表 ＋ 四门／canonical 实测 ＋ 9 轮 delta 分类结论
> ＋ 两段变异自证索引 ＋ 偏离总账 ＋ 未做／未确证 ＋ **#91 接线说明**）。
> 前序正本：`t88-plan.md`(v2)／`t88-impl-a.md`／`t88-impl-b.md`／`t88-impl-governance-fix.md`／
> `t88-review-impl-{a,b}-{red,blue}.md`／`t88-review-governance-{red,blue}.md`／
> `t88-ruling-process-violation-b.md`（B 段过程违规＝具名比例处置，**不再处理**）／
> `t88-delta-flake-ruling.md`（§2／§5／§6／§7／§8）／`t120-ruling-swept-commit.md`。
> 收尾 session 的路径所有权（本文件 ＋ S5 代码）：`packages/base-render/src/controls.ts`、
> `packages/base-render/test/help-center-js-88.test.mjs`、`packages/skill-calorie/test/help-center-88.test.mjs`、
> `tooling/run-locked.mjs`、`tooling/test/run-locked.test.mjs`、`package.json`（**编排者追加授权**，见 §5-E）、
> `docs/research/t88-*`、`.changeset/t88-help-center.md`、`.scratch/t88/**`。
> **未触碰**：`cmd_read.ts`／`keys.ts`／`templates/*`／`plugin-*`／其余 5 技能／`src/analysis/**`／`src/spec/**`。

## 0. 结论

- **技术面**：A1–A8 全部达成；四门 exit 0；canonical `pnpm test` **失败集新增 0**；白名单 diff **0 行**；
  S5 三处 src 级变异 3/3 红→还原→绿；靶向 220/220；`pnpm gate:selftest` 20/20。
- **过程面**：#88 共 **1 条过程缺陷（S3，不阻断关闭）**——「B 段门禁未走 §2.4 包装器」，已由
  `t88-ruling-process-violation-b.md` 具名比例处置（不重做／不回填，归因编排者未广播新条款）。
- **用户可见性**：**#88 关闭时用户仍看不到新版速查台**（CLI 接线归 **#91**，见 §6）。
- 两席审查 verdict 均为 **FAIL**，但否决项**全部**是 S1-过程违规（已处置降 S3）与「证据面扣分」；
  **无一条 S1-交付缺陷**（红队 86／蓝队 84，技术面项「全部独立复现成立」）。

## 1. 验收总表（A1–A8，编排者冻结口径 `.scratch/orchestrator/t88-acceptance.md`）

| # | 硬口径 | 结论 | 证据（`file:line`／命令／runId） |
|---|---|---|---|
| **A1** | 10 分组／54 子功能／436 场景，逐条可复算；id 436/436 唯一 | ✅ | `packages/skill-calorie/test/help-center-88.test.mjs:44`（10/54/436）`:51`（分组序／label／图标逐字=F3）`:62`（子功能序）`:70`（types 329/79/6/22＋恒发 `{text,bg,fg}`）`:96`（顶层键=F3 键集）`:113`（legacy 22）`:124`（id 轴子集）`:213`（数据层 id 436/436）`:221`（HTML 层 436/436＋元素 id 全唯一）；探针 `t88-probe-impl-a.mjs` 44/44（F3 逐条对账） |
| **A2** | 复用 base-render 冻结面 130（implemented 130／pending 0）；**不得新增契约面**；HELP 页适用 B1 逐值条目 | ✅ | `help-center-88.test.mjs:142`（`SPEC_FROZEN_SURFACE` 130/0）；`:148`（file 态 436 卡／54 子功能／1308 按钮）`:158`（inline 片段落点）`:169`（三态同源）；`src/spec/**` 本票**零改动**（`git diff --name-only 8bb13a9~1..HEAD -- packages/base-render/src/spec` 空）；S5 只改 `controls.ts` 的**运行时注入**逻辑（签名／`SharedHelpersInput`／契约面不变，`contract-signatures.test.mjs` exit 0） |
| **A3** | ①占位符 0 残留 ②id 唯一 ③copyText 单实现 | ✅ | ①`:182`（六标记逐个 0）`:192`（泛化 `<!--[A-Z0-9-]+-->` 0）`:198`（`report.markers` 六键）；②`:213`／`:221`／`:231`（人为重复抛 `duplicate-id`）；③`:244`（`COPY_RUNTIME_JS === buildSharedHelpersJs()`）`:250`（剥 helpers 后 `navigator.clipboard`／`execCommand`／`onclick=` 0）`:261`（技能侧零复制通道） |
| **A4** | 四门 exit 0；`pnpm test` 失败集**新增 0**（基线唯一） | ✅ | §2：四门 `runId=20b27301-a09e-4dae-88e0-ed8f0e360430`（build／boundaries／snapshot／publish 逐条 0）；canonical `runId=e5ba5021-a864-4af2-8f48-5c41497ec7cb`（`新增=0／消失=5`，白名单 diff 0 行） |
| **A5** | src 级变异 ≥3 处（红→还原→绿，还原自证 sha256） | ✅ | §4：A 段 4 处 ＋ B 段 2 处 ＋ S5 **3 处**（`runId=7fdaa6f4-e626-4723-8186-0e0b6325fea5`，单锁内 3/3 OK） |
| **A6** | 证据入仓 `docs/research/t88-*` ＋ 可复跑 `.mjs`，被 git 跟踪；摘要行机器可读 | ✅ | `git ls-files docs/research/t88-*`（本文件 ＋ 12 个 `.mjs` 探针／证据脚本）；`.mjs` 均打 `RESULT: n/m` 机读行 |
| **A7** | 只写声明路径；跨票改动→停下报告 | ✅（含 1 条如实补注） | 收尾两个 commit 只含声明路径（`git show --stat 7e3b864 29a8c46`）；`package.json` 为**编排者追加授权**；**共享 index 事件**见 §5-E |
| **A8** | #88 与 #91／#121 共用 `buildSharedHelpersJs` 产出面 → 严格串行 | ✅（本段实测） | 收尾期间 `ticket=91` 正在跑（`gate-runs.log` 14:09:36Z）但其改动面是 `cmd_read.ts`（**未提交 WIP**，本席零触碰）；`base-render/src/{controls,style}.ts` 本段仅本席改动（`git log --oneline --` 两条＝`e3690df`／`7e3b864`） |

## 2. 四门与 canonical 实测（全部持锁，`tooling/run-locked.mjs --ticket 88`）

| 门／轮 | 命令 | runId | exit |
|---|---|---|---|
| 四门 | `powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/t88/s5-run.ps1 gates` | `20b27301-a09e-4dae-88e0-ed8f0e360430` | **0**（内层 `build=0／boundaries=0／snapshot=0／publish=0`，见 `.scratch/t88/s5-gates.log`） |
| 靶向 | `… s5-run.ps1 targeted`（`help-center-88`＋`help-center-js-88`＋`help`＋`style`＋`contract-signatures`＋`controls`） | `ead0a6a8-4010-45ea-a57d-28262d4181d0` | **0**（**220/220 pass／fail 0**） |
| canonical | `… s5-run.ps1 canonical`（`pnpm test` 1 轮） | `e5ba5021-a864-4af2-8f48-5c41497ec7cb` | **1**（**基线既有红**；`tests 1097／pass 1072／fail 25`） |
| delta 判据 | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t88/s5-canonical-out.log` | — | **`base=34 after=29 新增=0 消失=5`** |
| 白名单 | `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` | — | **0 行** |
| 门禁工具自证 | `pnpm gate:selftest`（自带 `--lock-dir .scratch/locks-selftest`，**调用方不得再套**） | `95b06450-30d1-4eaf-9acf-96ef392f9856`（见 `.scratch/locks-selftest/gate-runs.log`） | **0**（**20/20 pass／fail 0**） |
| 跑后自检 | `git status --short -- packages/skill-calorie/SKILL.md` | — | **空**（#124 未复现）；`git status --short` 无本席未提交改动 |

**当轮并发上下文**（`t88-delta-flake-ruling.md` §3-3 要求）：canonical 轮期间同时有 **#96**（快照门自证／收尾）
与 **#91**（`cmd_read.ts` 接线 WIP，工作区未提交 63 行）两个 session 在跑；**无 headless 浏览器实证同时跑**。

## 3. 9 轮 delta 分类结论（A／B 段 canonical，＋收尾第 10 轮）

判据：`t88-delta-flake-ruling.md` §2／§5.1／§5.2／§6／§7／§8（**以具名测试名集合**为准，不以 exit 码为准）。

| 轮次 | 新增 | 分类（签名／单独复跑／并发） | 结论 |
|---|---|---|---|
| A 段 1–3 轮 | 0 | — | 新增 0（并集 0） |
| B 段轮 1／2 | 各 1（`output-naming-87.test.mjs:58`／`cmd-read-t11.test.mjs:69`） | **B 类**：`exit=3221225477`（`0xC0000005`）＋ stderr 空 ＋ 单独复跑 6/6 绿 | 不计入 |
| B 段轮 8 | 1（`cmd-write-40-persist.test.mjs:80`） | **B 类**（§5.3 具名裁决）：`exit=3221225501`（`0xC000001D`）＋单独复跑 4/4 绿 | 不计入 |
| B 段轮 9 | 4（`softdelete-120`×2／`cmd-write-40-persist`／`cmd-write-40.test.mjs:53`） | 前 3 条＝**他票在途 WIP ＋ 同树前轮绿**（§6 三步判定）；第 4 条严格读**触发 §5.2-5 → 判 C 类**，但红队独立单独复跑 **2× exit 0（13/13）**、且属 #120 路径 | 均**不计入 #88 delta**；第 4 条按 §5.2-5 字面**不得主张 B 类**，如实登记为「证据面缺口（S3）」 |
| 治理返修轮 | 3 | 均**他票 WIP ＋ 同树前轮绿**（§6） | 不计入 |
| 审查席独立轮（红／蓝各 1） | 35／37 | **全为他票在途改动**（`#97 · M5 四要素` 35 条由并发 session 未还原变异 `receipt.ts:110 // MUT-97-2` 造成；另 2 条 #120 软删 WIP） | 不计入；已由 `t88-delta-flake-ruling.md` §7 更正对 #97 的误判（陈旧 `dist` 假红） |
| **收尾第 10 轮** | **0** | `base=34 after=29 新增=0 消失=5` | **#88 自身路径 delta = 0** |

**并集结论**：9 轮 canonical 并集「新增」**全部**落在 #88 路径之外，按 §5.1／§6／§7／§8 逐条分类后
**真 delta = 0**；唯一证据面缺口＝轮 9 第 4 条缺 §5.2-5 的单独复跑留痕（红队已代跑 2× 绿），记 **S3**。

## 4. 变异自证索引（src 级，红→还原→绿，还原自证 sha256）

| 段 | 变异 | 落点 | 红 | 还原 |
|---|---|---|---|---|
| A | MUT-A | `helpCenter.ts` legacy `id` 改回 `'legacy_' + wake_word` | 靶向 23/22/1（唯一红＝R1-7） | sha 一致；23/23 |
| A | MUT-B | `helpCenter.ts` `sharedCssText` 置空 | `TemplateError: asset-missing` | sha 一致；绿 |
| A | MUT-B2 | `sharedCssText` 追加 `/* <!--SHARED-CSS--> */` | 守卫① 两用例红 | sha 一致；绿 |
| A | MUT-C | `inlineFragment` 追加第二套复制实现 | 守卫③ 红 | sha 一致；绿 |
| A | MUT-E（**红队自设**） | `receipt` 色改过程色 | 其 23 用例**全绿** → 暴露 D-1 | sha 一致；绿 |
| B | MUT-B1 | `controls.ts` `getAttribute(TEXT_ATTR)` → `textContent` | S4-6 红（`data-t` 断言） | sha 一致；绿 |
| B | MUT-B2 | `style.ts` 类名换回 v1 被拒名 | `style.test.mjs` T11＋S4-3 红 | sha 一致；绿 |
| **S5** | **A1 委派去重失效** | `controls.ts` `if (ev[HANDLED_PROP]) return;` → `=== null` | S4-6 红：**实测一次点击复制 4 次** | `423CBFAF…DB69` 一致；绿 |
| **S5** | **A2 卡级按钮回退为只读 Sheet 按钮** | `injectCardCopy` 的 `pre` 选择器改成永不命中 | S4-6 ⑩ 红：无 Sheet 按钮的卡不再注入 | `423CBFAF…DB69` 一致；绿 |
| **S5** | **A3 互换 receipt／process 配色** | `HELP_TYPE_BADGES` 两行换色（MUT-E 场景） | `D-1 三档徽章色逐条映射` 红：`回执 的 bg 必须逐字取 F3 TYPE_DEFAULT` | `B7FA011F…4128` 一致；绿 |

S5 三处**在同一把锁内**跑完（`runId=7fdaa6f4-e626-4723-8186-0e0b6325fea5`，`RESULT: 3/3 fails=0`，
脚本 `.scratch/t88/s5-mut.mjs`，日志 `.scratch/t88/s5-mut3.log`）。

## 5. 偏离总账

### 5-A · A 段台账 L-01…L-19（正本 `t88-impl-a.md` §5，逐条已入仓）
L-01 分组序／图标取 F3；L-02 复盘→分析；L-03 子功能 id `{group}_{n}`；L-04 legacy id（**被 L-19 取代**）；
L-05 卡级复制按钮（S4 已做）；L-06 搜索／高亮／跳页（S4 已做）；L-07 Tab 横滑→radio 标签条（功能对等）；
L-08 Sheet 弹层→内联 `<details>`（功能对等）；**L-09 逐场景 CLI 文本＝相对 F3 新增（完整 CLI 展示归 #106）**；
L-10 subtitle 时间戳显式注入；L-11 不发 `version`；**L-12 types 配色逐值同（S5 已补逐条断言）**；
L-13 断点差异（#89 验收）；L-14 空／错误态改进；L-15 `#backTop`（S4 已做）；**L-16 产物体积 1,010,979 B（P-5 交付形态）**；
L-17 零渐变判据作废；**L-18 diet 展示名取 F3「饮食」（SoT「饮食记录」）**；
**L-19 legacy 卡面 id 取 `main_prompt.cli` 原文（F3 的 `legacy_*` 会让卡面显示不存在的命令）**。

### 5-B · B 段 S3（红队 ⑦-3 逐条）
(a) 无 Sheet prompt 按钮的卡静默跳过 → **S5 已修**（主源改同卡 `<pre>`，见 5-D）；
(b) marker 早于 `initHelpShell()` 落盘 → 半初始化不可自愈 → **登记不修**（真实页面 helpers 只注入一次；
半初始化需 `initSearch` 抛错才可触发，且重载即恢复）；
(c) 删 marker 后重复注入使点击委派倍增 → **S5 已修**（跨实例事件标记，见 5-D）；
(d) 污染窗口内自判 delta → 已由 `t88-delta-flake-ruling.md` §6／§7 裁定；
(e) `e3690df` 提交信息样本 1,027,850 B vs 证据 1,027,870 B → 历史陈述不一致，**不改写历史**，登记。

### 5-C · 治理／审查项
- B 段门禁未走 §2.4 包装器 → `t88-ruling-process-violation-b.md` 具名比例处置（**S3，不阻断关闭**，不重做／不回填）。
- 蓝队 D-2（证据 §3.1 `union=31` vs 日志 `union=32`）／D-3（轮 9 缺单独复跑）／D-4（flake 命令未入仓）→ S3 登记。
- 蓝队自报：`5716b83` 连带提交红队报告（共享 index）→ 按 `dispatch-rules.md` §4.6 降级为「推荐做法」，不判 S1。
- 红队 §附：`t88-review-impl-b-red.md` 被连带提交 → 同上，byte-exact 无缺失。
- 范围外：`.scratch/locks/owner.json` 零填充第 4 例（#124 登记）；`receipt.ts` 跨 session 变异残留（#97）。

### 5-D · S5（本席）新增／决策
1. **A.1 委派倍增已修**：`boot()` 内委派**只挂一次**（`clickBound`）＋ **跨实例**去重（事件对象一次性标记
   `HANDLED_PROP`）。**只加 `clickBound` 不够**：helpers 被多次注入时每个实例各有闭包，实测仍 4 次复制——
   故跨实例判据是本条的关键，已由 S5-A1 变异与浏览器用例双证。
2. **A.2 静默跳过已修**：卡级按钮主源改为同卡 `<pre class="prompt">` 原文（读不到才回落 Sheet 按钮 `data-t`）。
   实测**真实壳 436/436 卡都有 `<pre>`**（`probe-a2.mjs`，`runId=3e91643b-92f5-4fc6-9219-9f10bd65af56`）→
   结构上不再丢卡，且解掉红队 ④(a) 的「卡级按钮跟 Sheet 按钮走」耦合。
   **口径更正（登记）**：派单所写「实测 436 卡中 434 有卡级按钮／2 张无」**与真实渲染不符**——
   真实渲染 `promptButton=436／noButton=0／pre=436`；「434」来自红队探针**人为删掉卡 0／1 的 Sheet 按钮**后的
   合成场景。本席按「不静默跳过」的**意图**修复（主源去耦合 ＋ 补 ⑩ 断言），并把实测数字如实登记。
3. **A.3 三档色逐条断言已补**：`TYPE_DEFAULT[text] → {bg,fg}` 逐档钉死 ＋ 徽章恒等
   `HELP_TYPE_BADGES[output_type]` ＋ 三档条数 329/79/6 ＋ 键→文本映射（A3 变异证明有鉴别力）。
4. **A.4 `text` 态裸 `<N>` ＝ 保持逐字**：实证 `text` 态尖括号文本**唯一**是 `<N>`，来源为 legacy
   `main_prompt.cli` 原文（`scene-02-diet.ts:29` 等 13 处），`text` 态是**纯文本载体**（无 HTML 上下文）
   → **不做 HTML 转义**（转义反而与 CLI 原文不一致），补断言钉死来源（`text.html` 不得含 `&lt;`）。
5. **A.5 子进程超时已修**：`--child-timeout-ms`（默认 900000）／`--child-kill-grace-ms`（默认 15000）→
   杀**进程树** ＋ `RUN … timeout=1` ＋ **exit 124** ＋ 放锁。顺序不可交换：**先** `taskkill /T /F`，
   只有它失败才 `child.kill('SIGKILL')`（先 kill shell 会让 taskkill 找不到 PID，孙进程活到自然退出，
   实测 30 s）。自证用例 ⑨／⑨b。

### 5-E · 路径与提交归属（如实补注）
- **`package.json` 改动属本票（编排者追加授权）**：`gate:selftest` 改用 `--lock-dir .scratch/locks-selftest`
  （原样会与外层 `run-locked` 抢同一把锁 → 死锁；#96 蓝队实测占锁 ≈67 s）。**该改动被并发 session #96 的
  提交 `83ebad4`（`fix(96): D-1 自锁修复（gate:selftest:html 改用独立锁目录）`）连带提交**（共享 index），
  故 `29a8c46` 的 `--stat` 只有 2 个文件。内容逐字正确（`git show HEAD:package.json` 两行均带 `--lock-dir`），
  按 `dispatch-rules.md` §4.6「如实补注归属、不返工」处置（**S3 记账**）。
- `gate:selftest:html`（#96 路径）**本席未改**；口径已核对：两者**同为自持锁**（均 `--lock-dir .scratch/locks-selftest`）
  → **调用方一律不得再套 `run-locked`**。
- 收尾 commit：`7e3b864`（S5 代码＋测试）、`29a8c46`（run-locked 超时＋自证）、本文件所在 commit（证据）。

## 6. 未做／未确证（**最重要的一条在最前**）

1. **#88 关闭时用户仍看不到新版速查台** —— HEAD 上 `calorie.help.center` **仍只服务照片 10 键**
   （`git show HEAD:packages/skill-calorie/src/cli/cmd_read.ts` 的该 case ＝ `lookupPhotoHelp`／`buildPhotoHelp`，
   `keys.ts:87` shape 仍为 `list`／标题「身材照HELP」）。**CLI 接线归 #91**（见 §7）。
   实测：收尾期间 **#91 正在把接线写进工作区**（`git status --short` 显示 `cmd_read.ts` 未提交改动 63 行），
   本席**未触碰、未提交**该文件。
2. `--expect-exit <n> --reason <基线既有红>`（门禁对 canonical 既有红的**显式**承认开关）**待修**，
   本 session 不做（当前靠 `GATE-RELAX flag=--allow-nonzero` ＋ 失败集新增 0 判据）。
3. **F3 搜索作用域未逐值比对**（F3 的搜索是否含 Sheet 内文本／是否大小写敏感未逐值核；本票只证
   「命中数＝可见卡数／高亮＝搜索词／计数文案逐字」）。
4. **Sheet 实时预览的真实数据不可观测**（夹具为合成 `editable_fields`；F3 `buildPrompt` 语义已按
   `prompt ＋ 空行 ＋ label: value` 逐字实现并由浏览器用例证，但未与 F3 真实数据逐条对账）。
5. 卡面按钮文案取 `HELP_COPY_ACTIONS.prompt.label`（「复制指令」）——F3 无卡级按钮（L-05），**无 F3 逐字可比**。
6. 产物体积 1,010,979 B vs F3 302,820 B（L-16／P-5 交付形态差异，未收敛，属设计选择）。
7. `changeset:status` 环境红（`Cannot find module '@changesets/errors'`）——**未自行 install**（协议 §2.1），如实标注。
8. 未复核：`publish:tarball`／`fresh`／`plan`／`doctor`（本段未改发布面）；MUT-B2／C／D 未逐条复跑（同族已覆盖）。

## 7. #91 接线说明（**可直接执行**；本票不改 `cmd_read.ts`／`keys.ts`）

### 7.1 接缝签名（`packages/skill-calorie/src/render/helpCenter.ts`，已导出 `render/index.ts:98`）

```ts
export const HELP_CENTER_MODES = ['file', 'inline', 'text'] as const;
export type HelpCenterMode = (typeof HELP_CENTER_MODES)[number];

export interface HelpCenterRenderOptions {
  readonly mode?: HelpCenterMode;      // 缺省 'file'（P-5）
  readonly updatedAt?: string;         // 形如 '2026-09-09 12:00'；缺省不写时间戳（字节稳定，P-2）
  readonly sceneData?: SceneData;      // 复用已派生数据；缺省现派生
  readonly strict?: boolean;           // 透传 fillTemplate 的信封校验
}
export interface HelpCenterRenderResult {
  readonly mode: HelpCenterMode;
  readonly html: string;
  readonly report: FillTemplateReport; // 六标记逐项计数（守卫①读它）
}
export function renderHelpCenterHtml(opts?: HelpCenterRenderOptions): HelpCenterRenderResult;
export function buildHelpSceneData(opts?: { updatedAt?: string }): SceneData;
export function helpCenterAssets(): TemplateAssets; // { sharedHelpersJs: COPY_RUNTIME_JS, sharedCssText: buildStyleSheet().css }
```

### 7.2 三态语义（同一 `SceneData` ＋ 同一资产 ＋ 同一 `renderHelpShell`，**不存在第二套数据路径**）

| mode | `html` 是什么 | 落点／用途 | 体积量级（实测） |
|---|---|---|---|
| `file`（**默认**） | 完整 HTML 文档（`<!DOCTYPE html>`…`</html>`） | 落盘／`file://` 打开；**唯一需要 `--output` 的形态** | ≈1,027,870 B／4,042 行 |
| `inline` | `<style>` ＋ `<section id="ilife-help-shell">…</section>` ＋ helpers `<script>`（无 `<head>`／`<body>`） | 宿主页面内嵌片段 | ≈1,027,8xx B |
| `text` | 纯文本索引（无标签、无脚本；`skill_name title`／`subtitle`／`[分组]`／`  子功能 (id)`／`    唤醒词 · id`） | CLI／日志面复用 | ≈数十 KB |

非法 `mode` → `CalorieRenderError('bad-input')`（**调用方应转 exit 2**）。

### 7.3 现状（HEAD）与 #91 需要做什么

1. **键语义**：`calorie.help.center` 现在＝**照片 10 键 HELP**（`keys.ts:87` `shape:'list'`／标题「身材照HELP」；
   `cmd_read.ts` 的 case 走 `lookupPhotoHelp(q)`／`buildPhotoHelp()`）。#91 要让它**同时**承载**全量速查台**。
   **推荐口径**（与工作区 #91 WIP 一致）：新增显式参数 `--params '{"mode":"file|inline|text"}'`；
   `q`／`keyword` 仍走**照片 10 键**（非空 q＝现找、无命中 exit 4；`q:""`＝全量 10 键）；
   `q` 与 `mode` **互斥** → exit 2。**不得**用「有没有 mode」以外的隐式推断（D6）。
2. **`--output`**：`file`／`inline` 态产物 ≈1 MB，**不要塞回 envelope**（会让每次调用背 1 MB JSON）；
   走既有 `--output <路径>` 落盘，`data` 只回**索引＋元信息**。
3. **delivery 字段与 #83 的关系**：本键的 envelope 形状现登记为 **`list`**（`envelope.ts:107`
   `PHOTO_VIEW_KEYS.help`／`:117` `help:'list'`）。#83（HTML-First 工作流与渲染失败回执落地）定的是
   「html ＋ data ＋ 回执」的**交付契约**；#91 落接线时须二选一并写清：
   ① **保持 `list`**，`data` ＝ 速查台索引（分组／子功能／场景数）＋ `mode` ＋ `bytes`，`html` 走 `--output`；
   ② 若确需新增 delivery 字段（如 `mode`／`bytes`／`text`），**须走 #92 的追加流程**（本票不得新增契约面，A2）。
   `text` 态可把文本放进 `data.text`（体积小）；`file`／`inline` **不得**把 1 MB 文本放进 `data`。
4. **#88 提供的保证**（#91 可依赖）：10/54/436 逐条复算、id 436/436 唯一、三态同源、零占位符残留、
   helpers 单实现（卡级复制／搜索／Sheet 预览／`#backTop` 全在 `buildSharedHelpersJs` 内，签名不变）、
   卡级按钮 436/436、`data-t` 与同卡 `<pre>` 逐字相等、委派点击只复制 1 次。
5. **#91 不得做**：改 `base-render` 的 helpers 签名／`SharedHelpersInput`／`src/spec/**`；改 F3 展示面常量；
   删 6 个死模板（#107）；动 `src/analysis/**`。

## 8. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 88 --since 2026-09-09T14:07:50Z --until 2026-09-09T14:09:40Z`（收尾轮的最后 6 条运行；
窗口外条目属他人票号或本席过程运行，不在对账范围）。对账源导出：`docs/research/t88-gate-runs.log`。

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 因冻结基线白名单既有红必然 exit=1（判据＝失败集新增=0，非 exit 码）；本票 A4 口径即如此

GATE-RUN runId=7fdaa6f4-e626-4723-8186-0e0b6325fea5 cmd="node .scratch/t88/s5-mut.mjs"
GATE-RUN runId=ceecc1c1-4d37-463e-8e1c-a07ac1354152 cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/t88/s5-run.ps1 gates"
GATE-RUN runId=03bdc30c-2bdd-4879-a240-239d54bc54df cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/t88/s5-run.ps1 canonical"
GATE-RUN runId=ead0a6a8-4010-45ea-a57d-28262d4181d0 cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/t88/s5-run.ps1 targeted"
GATE-RUN runId=20b27301-a09e-4dae-88e0-ed8f0e360430 cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/t88/s5-run.ps1 gates"
GATE-RUN runId=e5ba5021-a864-4af2-8f48-5c41497ec7cb cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/t88/s5-run.ps1 canonical"

**过程运行（非门禁证据，仅供追溯）**：`3e91643b`（`probe-a2.mjs`：436/436／`<N>` 归因）、
`66390152`／`84cc4d4f`（收尾脚本早期两跑：`pwsh` 不存在／**ps1 未传播子命令 exit 导致假绿**，
已修 `exit $worst` 后以 `ead0a6a8` 重跑）、`b1981981`（变异脚本锚点未命中，非红非绿）、
`afe7c99a`／`7d58b7af`（两次 `git commit --only`）。

## 9. 关闭清单

- [x] 四门 exit 0；canonical 新增 0；白名单 0 行；靶向 220/220；`gate:selftest` 20/20。
- [x] S5 三处 src 级变异 3/3；A／B 段变异索引齐备。
- [x] 证据入仓（本文件 ＋ `docs/research/t88-*`）；工作区干净（本席路径无未提交／未跟踪）。
- [x] 票面进度 100% ＋ 结题评论（含两席 verdict／全部 commit sha／裁定指针／未做项）＋ `gh issue close 88`。
- [ ] **用户可见**：等 **#91** 接线落地（§6-1／§7）。
