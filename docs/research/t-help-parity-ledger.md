# 新旧 HELP 差异台账（#83 · 地图 #63 主线②）

> 本席＝「HELP 最终产物生成 ＋ 新旧差异台账席」。**只观测、不修代码、不改产物**。
> 旧侧＝**F3 根镜像** `D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html`（302,820 B，只读）＋ 两个冻结实例
> `fixtures/help-instances/*.html`（只读，哈希对账）；新侧＝**最终代码**（`5fffe1e`）在持锁下重生成的三态产物。
> 机器可读台账：`.scratch/t-parity/ledger.json`（**51 行**七维度；sha256 `b634f0bf91451e4631c05ea7ebc53c95234903e57cb44ed78aec6e62da3ad094`，
> 去 `generatedAt` 后**逐字节确定**，同一输入复跑同值）／解析：`.scratch/t-parity/{old,new,fixtures}-parse.json`／
> 产物清单：`.scratch/t-parity/gen-manifest.json`。**`.scratch/` 不入库**，哈希与路径逐条抄在本文件里。
>
> **纪律**：判定只用四值 `一致／差异（可解释）／新版缺失／新版新增`；每条差异带根因或归属票。
> **未**为「看起来一致」改代码或改产物；缺口如实登记并给「缺口 → 建议归属票」。
> **本版＝返修 R-3**（两席对抗式审查：席 A `aee89ed`／席 B `05a72ee`），逐条处置见 **§9**。
> **R-7 补记**（席 B 定点复核 R3-B-1…B-4，salvage）：D6「Tab 形态」改判＋补「断点」行（51 行）、体积断言换标签壳金标式、
> 穷举键集改实测＋覆盖须非「一致」、证据方向一致性校验；逐条复算见 **§9.3**，计数与 sha 已同步更新。

## 0. 起点与工作区（如实记录他票 WIP）

```
$ git log -1 --oneline          # 首次观测（本席开工时）
5fffe1e fix(83): 返修 R-1 相对落点（红队 S1-交付缺陷）＋ 红队审查报告 ＋ 定点复核

$ git status --short
 M .gitignore                                   ← 他票 WIP（**本席未动、未提交**）
?? docs/research/decision-116-3q-20260909.html   ← 他票 WIP
?? docs/research/t123-release-evidence/          ← 他票 WIP
```

- R-3 返修时 HEAD＝`40cfce8`（他席 `docs(63)` 提交）；**代码面仍 `5fffe1e`**（该提交为文档提交，未触 `packages/**` 渲染面）。
  决定性证据：三态产物 sha256 在 23:38／23:42×2／23:59／00:00 **五次独立运行**（期间并发他席多次 `pnpm build`）中逐字相同。
- 本席**只新增／只改自己的 4 个文件**：`docs/research/t-help-parity-{gen,extract,compare}.mjs` 与本文件；`packages/**`／`tooling/**`／既有 `docs/**` 零改动。
- 三态产物与中间 JSON 全部落 `.scratch/`（`.gitignore` 已忽略），**不入库**。

## 1. 三态产物（最终代码 · 持锁生成）

统一前置：`$env:SKILLS_DB_PATH = "D:\ilife\.scratch\final-db"`；每条命令都经 `node tooling/run-locked.mjs --ticket 83 -- …` 持锁。
权威复跑脚本＝`node docs/research/t-help-parity-gen.mjs --skip-build`（`RESULT: 32/32 gen-checks`），它把下表逐字落成
`.scratch/t-parity/gen-manifest.json`。

| 态 | 逐字命令（`--` 之后为持锁内层） | runId | exit | stdout 行 | `data.mode` | `delivery.mode` | 产物字节 | 产物行数 | sha256 | 落点 |
|---|---|---|---:|---:|---|---|---:|---:|---|---|
| `file`（缺省） | `node tooling/run-locked.mjs --ticket 83 -- node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center` | `f3706336-83ab-473e-8fc3-c32d33c322be` | 0 | 1 | `file` | `file` | **1,264,822** | 4,090 | `f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2` | `.scratch/final-db/calorie_html/身材照HELP_20260910_000006.html` |
| `inline` | `… --params '{"mode":"inline"}'` | `69524bab-94f8-4425-8614-38cc866642fe` | 0 | 1 | `inline` | `file` | **994,295** | 4,079 | `8c1683daacf8af9a98cc62e3a33c044efcece0d5b2e813299ebaeefedabc14f0` | `.scratch/final-db/calorie_html/身材照HELP_20260910_000006_2.html` |
| `text` | `… --params '{"mode":"text"}'` | `758f9b1c-f3ac-4a6a-a963-53df88b9ba61` | 0 | 1 | `text` | `text` | **24,989** | 521 | `92425e0abb47e6268dbb19ecc7f66272f375b75259cf3ab768737f508934d8bb` | `.scratch/final-db/calorie_html/身材照HELP_20260910_000006_3.html` |

### 1.1 envelope 字段与观测点

- 顶层键恒 `version,skill,shape,key,data,delivery`（六键＝P9 五字段 ＋ #83 追加的 `delivery`；`version=0.1.0`、`skill=calorie`、`shape=list`、`key=calorie.help.center`）。
- stdout 行数恒 1（P9 纯净）。**stdout 字节是环境相关量**（A-S3-3）：`data.output` 含绝对路径 ⇒ `stdoutBytes ＝ 基线 ＋ 2×Δ(SKILLS_DB_PATH＋文件名长度)`；
  本席实测 `file/inline ＝ 1,276／1,280 B`、`text ＝ 26,827 B`（换 DB 路径即变，**勿当固定值比对**）。
- `data` 键：`file`／`inline` ＝ `items,total,sceneTotal,subgroupTotal,mode,bytes,output`；`text` 多一个 `text`（24,989 B，与产物逐字同源）。
- `data.items` 恒 10 组：`home(3/9) diet(9/70) weight(8/58) exercise(5/39) workout(6/32) goal(3/25) body_detail(4/13) body_photo(4/10) profile(3/4) analysis(9/176)`，`total=10 / subgroupTotal=54 / sceneTotal=436`。
- **观测点（登记，不判缺陷）· `inline` 态 `data.mode=inline` 但 `delivery.mode=file`**：片段按既有落盘管线写成 `.html` 文件。
  **归属（B-S2-1 更正）**：`mode` 参数面＝**#91 主**（`docs/research/t91-help-center-cli.md`：三态显式 `mode`）；`delivery` 字段面＝**#83 辅**（`envelope.ts:135,205`）。
  这是**规格内行为**（#83 三态判定的「有 HTML 产物即落盘」分支），故**不再列入缺口清单**。
  **命名歧义登记**：同一份 envelope 里 `data.mode`（交付形态）与 `delivery.mode`（落盘形态）语义不同 → 复核者须按字段名区分。
  **对 #89 的接口**：`inline` 产物**在磁盘上**（`…_2.html`，994,295 B），浏览器夹具须**读文件**，不能指望 envelope 内嵌。
- **三态同源（A-S3-4 更正）**：`inline` **不是** `file` 的连续子串（payload 块 270,259 B 插在内容段与 helpers 之间）。
  权威判据＝**分段逐字相等**：`style` 段／内容段 `<section id="ilife-help-shell">`／helpers 脚本三段 sha256 各自相等（`segEqual={"style":true,"content":true,"helpers":true}`），
  且 `inlineIsSubstringOfFile=false`（gen.mjs 已把这条过强命题钉成断言）。
- **字节稳定性（P-2）**：同一 commit 五次独立运行三态 sha256 **逐字相同**。

## 2. 七维度差异台账（51 行）

**头条数字（旧 → 新）**：分组 **10 → 10**｜子功能 **54 → 54**｜场景 **436 → 436**｜prompt 逐字 **436/436 相同**｜
CLI 展示命令 **0 → 341**（＋卡级 code 436 条，其中 **435 条逐字＝Scene.id**）｜file 态体积 **302,820 B → 1,264,822 B**。
判定分布：**一致 17／差异（可解释）20／新版新增 11／新版缺失 3**（合计 51 行；逐行机器可读见 `.scratch/t-parity/ledger.json`）。

### D1 分组数 —— 4/4 一致

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 分组条数 | 10 | 10 | **一致** | `D1.groups`；envelope `data.total=10` |
| 分组 id 序列逐字 | `home>diet>weight>exercise>workout>goal>body_detail>body_photo>profile>analysis` | 逐字相同 | **一致** | L-01／`helpCenter.ts:47 HELP_GROUPS` |
| 分组 label／icon 逐字 | 主页🏠／饮食🍚／体重⚖️／运动🏃／健身计划💪／目标管理🎯／身体细节🧬／身材照片📸／基础信息⚙️／分析📊 | 逐字相同（含 `profile=⚙️`） | **一致** | L-01（SoT `profile='🛠'` 已按 L-01 收敛为 F3） |
| 每分组子功能／场景分布 | `3:9 9:70 8:58 5:39 6:32 3:25 4:13 4:10 3:4 9:176` | 逐组相同 | **一致** | `D1.groupDigest` |

### D2 子功能数 —— 3/3 一致

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 子功能条数 | 54 | 54 | **一致** | envelope `data.subgroupTotal=54` |
| 子功能 id 集合逐字 | 54 条同序 | 54/54 逐字同序 | **一致** | L-03；「既有唤醒词」**仅出现在 `diet_9`／`analysis_9` 两组**且恒列组末（其余 8 组无此子功能，A-S3-8 措辞更正） |
| 子功能 label 逐字 | 54 条 | 54/54 逐字相同 | **一致** | L-18（diet 展示名取 F3「饮食」） |

### D3 场景（唤醒词）数 —— 5 一致 ＋ 1 可解释

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 场景条数 | 436 | 436 | **一致** | envelope `data.sceneTotal=436` |
| 唤醒词逐字 | 436 条 | **436/436 相同** | **一致** | 按 `(子分组 id, 组内序)` 对齐（**不以 `wake_word` 为 join 键**：434/436 唯一，`记身材照`×3，B-S3-6） |
| 场景 title 逐字 | 436 条 | **436/436 相同** | **一致** | 同上 |
| status 字段逐字 | 436 条空串 | 436/436 相同 | **一致** | 同上 |
| 场景 id 逐字 | 414/436 相同 ＋ 22 条 `legacy_{唤醒词}` | 414/436 相同 ＋ 22 条 `main_prompt.cli` 原文 | **差异（可解释）** | **L-19／#83 R-7**；22 条逐条见 `D3.idChanged` |
| 场景 id 唯一性 | — | 436/436 唯一 | **一致** | #88 断言 |

> 22 条 id 变更全部落在「既有唤醒词」子功能组（`diet_9` 1 条 ＋ `analysis_9` 21 条）。

### D4 每条场景的 prompt 文本 —— 2 一致 ＋ 2 可解释

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 每条场景 prompt_template 逐字 | 436 条 | **436/436 逐字相同** | **一致** | `D4.promptEq`；差异集为空 |
| types 徽章文本序列 | 414 条 `["结果"]`（字符串数组，shaped=0） | 414 条文本逐字相同，形状 `[{text,bg,fg}]`（shaped=414） | **差异（可解释）** | **L-12**／`helpCenter.ts:132 HELP_TYPE_BADGES`（只发字符串会丢三档色） |
| 裸 `<N>` 等尖括号 | **源码侧 13 处**（`t88-final.md:129`：`scene-02-diet.ts:29` 等）／**产物侧 prompt 内 0 处** | 源码侧 13 处／**产物侧 prompt 内 0 处**（唯一 `<N>` 在 1 条 scene id：text 态裸 1 处、payload 转义 `\u003cN>`、卡级 `&lt;N&gt;`） | **一致** | **A-2／B-S2-1 更正**：13 处是**源码侧**计数，产物侧不可复现；产物侧两侧均为 0 ⇒ 判「一致」 |
| subtitle（L-10 时间戳） | `"10 分类 · 436 场景 · 更新于 2026-08-14 11:38"` | `"10 分类 · 436 场景"`（不发时间戳） | **差异（可解释）** | **L-10／P-2**（`updatedAt` 缺省不写 → 字节稳定）；B-S3-3 新增登记 |

### D5 每条 CLI 展示命令 —— 3 新增 ＋ 1 缺失 ＋ 3 可解释

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| Sheet「可执行命令」行数 | **0**（F3 payload 无 `editable_fields`） | **341/436** | **新版新增** | **#106**（数据源 #81 exec 桶 341 条；`helpCenter.ts:94-123`） |
| 卡级 `<code class=cli>` 行数 | 0 | **436 条**，其中 **435 条逐字＝Scene.id**（1 条例外＝含 `<N>`／`"` 的 id，渲染为 `&lt;N&gt;`／`&quot;`，**反转义后 436/436**） | **新版新增** | **L-09**；**A-1／B-S3-2 更正**（原写「436＝Scene.id」） |
| 无 CLI 的场景数（**缺口**） | 不适用 | **95/436** | **新版缺失** | 分布 `diet 6／weight 18／exercise 1／workout 23／goal 3／body_detail 2／analysis 42`；根因＝**#81 non-exec 110 − 漂移 15 ＝ 95**（漂移归 #111/#112/#113；细分 out-of-scope 10 ＋ legacy-chain 85），**不是**「95 键」（**B-S2-3 更正**：SKILL.md 的「95 键」是键表口径，与 95 条 noCli 无关） |
| 卡级 code vs Sheet CLI（22 条 legacy） | 不适用 | **22/22 条不同源**：**18 条**卡级＝`python…`／`mavis…` 而 Sheet＝路由层新 CLI；**4 条**卡级有原文、Sheet **无字段行**（`看「有备注」的饮食记录`＝reason `noNoteFilter`；`开启／关闭／查定时复盘`＝reason `oosCron`） | **差异（可解释）** | **B-S1-1 更正**（原写「18 不同源＋4 两处皆无」，与「卡级 code 436/436」自相矛盾）；L-19＋#106 口径叠加 |
| 每卡按钮（静态 vs 运行时） | 每卡 1 个「复制」（运行时注入 `.mini`） | **静态 markup 1,308 个**（`data-action-id` 各 436：复制指令／复制唤醒词／复制参数）＋ 运行时注入卡头**第 4 个**（`injectCardCopy`） | **新版新增** | **A-4／B-S2-3 更正**（原写「每卡 3 按钮＝运行时注入」）：静态 `card-copy` 命中 0、JS `createElement("button")` 仅 4 处 |
| CLI 参数含冻结绝对日期 | 不适用 | **222/341** 条命令参数带 `YYYY-MM-DD`（如 `calorie.view.home --params '{"date":"2026-09-07"}'` **当日即错**） | **差异（可解释）** | **B-S2-5 新增登记**：样例参数由 #81 路由层冻结写入；建议归 #81 后续维护票或新票 |
| 95 条无字段卡的「复制参数」按钮 | 不适用 | 回落复制**卡级 code（＝Scene.id）**而非命令（样例 `diet_scan_label` → `data-t="diet_scan_label"`） | **差异（可解释）** | **B-S3-5 新增登记**（`t106:73` L-106-03） |

### D6 交互能力 —— 2 一致 ＋ 9 可解释 ＋ 6 新增 ＋ 2 缺失

| 能力 | 旧值（F3） | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 搜索（输入框＋清空＋计数） | 有（`#sB`／`#sClear`／`#hitC`） | 有（运行时注入 `input[type=search]` ＋ 清空 ＋ 计数） | **一致** | L-06；两侧静态 HTML 均无搜索框（旧 0／新 0） |
| 命中计数／空态文案逐字 | 「匹配 N 个场景」／「没有找到相关场景,换个词试试～」 | 逐字相同 | **一致** | L-06 |
| Tab 形态（横滑页 → radio 标签条） | 横滑页 `.page` ＋ 底部 tabBar（scroll-snap） | radio 标签条（`.ilife-help-shell-tab-input` 11 个） | **差异（可解释）** | **R3-B-1 更正**：本行值列两侧不同，原判「一致」系 rule 误测 `jumpPage`（两侧恒 true）所致；现 rule 测 `tabRadios`（旧 0／新 11），`evidenceRef` 指向本行证据对。**L-07**（横滑页 → radio 标签条，功能对等） |
| 断点（mediaQueries） | 3 组：`@media(min-width:501px)`／`@media(max-width:500px)`／`@media (max-width: 820px)` | 5 组：`@media (max-width: 820px)`／`720px`／`640px`／`400px`／`@media (prefers-reduced-motion: reduce)` | **差异（可解释）** | **R3-B-1 补行**：`mediaQueries` 真差异此前**无行可依**（G-4 指针悬空）；现独立成行并承接 G-4。**L-13／#89**（B1 视觉锁逐值验收） |
| 高亮 | 仅高亮卡面标题 `.m-name` | 整卡文本节点 `wrapTerm` ＋ `<mark class=card-mark>` | **差异（可解释）** | L-06（S4）；B §4.1 反例 3 指出「范围扩大」可能产生视觉噪声 → 已在 §3 用 C 口径兜 |
| 跳页 | 命中后 `pages.scrollTo({left})` | `jumpTo` 勾选命中页 radio ＋ Enter 循环 | **差异（可解释）** | L-07（横滑页 → radio 标签条） |
| 复制按钮（卡级） | 每卡 1 个（运行时 `.mini`） | 静态 3 个/卡（Sheet 内）＋ 运行时卡头 1 个 | **新版新增** | L-05／#88 S4-S5 |
| 返回顶部 | **无**（`backTop` 0 处） | 有（`#backTop`，↑，aria「回到顶部」，`scrollTop>400` 才显形） | **新版新增** | L-15／H-19（R35 D-14 强制） |
| Sheet 实时预览 | 有（弹层参数表单 → `[data-prev]` 实时重组 `buildPrompt`） | 有（内联 `<details>` 字段输入 → 实时重组「prompt ＋ 空行 ＋ label: value」） | **差异（可解释）** | L-08（弹层 → 内联 `<details>`） |
| 参数必填校验 | 有：`getMissing` → toast「请先填写: …」并阻断复制（**代码级判定**：F3 根镜像 436 场景 `editable_fields` 全空 → 该表单／校验在本数据上不可观测，A-S3-7） | **无**必填阻断（Sheet 字段可编辑，但无 `req` 语义、不阻断复制） | **新版缺失** | 根因：新版 Sheet 字段来源＝#106 路由 CLI（展示＋可改），非 F3 `params` 表单；**建议归属票 #86**（配置型 wizard 已落地，承载填写） |
| copied 态（toast 文案） | toast「已复制」＋副文案「粘贴给 AI,技能会自动执行,完成后你会拿到结果 HTML。」 | toast「已复制」（失败态「复制失败／长按选择文本手动复制」） | **差异（可解释）** | #121／H-16（toast 4500 ms 取冻结值） |
| copied 态（按钮 450 ms 态） | 无（无 `copied` 类切换） | 有（按钮 `copied` 类，450 ms 后复原） | **新版新增** | #121／H-16 |
| 剪贴板实现 | `document.execCommand('copy')` ＋ textarea 回退 | `navigator.clipboard.writeText()` ＋ textarea 回退，**仍带** `execCommand('copy')` 兜底 | **差异（可解释）** | **A-S3-6 更正**（原写「textarea 回退」漏记 execCommand） |
| 键盘可达 | 有：`newIn.addEventListener('keydown'…Enter…doNew())`（作用于「新增」输入框） | 有：搜索框 Enter 循环跳到下一个命中页 | **差异（可解释）** | **A-3 更正**（原判「新版新增」与 `ledger.json→D6.oldMarkers.keyboardEnter=true` 自相矛盾）→ **能力对等扩展** |
| 焦点可见／动效可关 | 0／0 | `:focus-visible` 10 处／`prefers-reduced-motion` 1 处 | **新版新增** | L-15／H-20（R35 D-14 强制） |
| 空态／错误态 | 无 try/catch → 白屏风险 | 静态 HTML 无解析步骤；渲染失败走 #83 模板回执 | **新版新增** | L-14／#83 |
| 数字等宽（tnum，H-07） | 无（`tnum` 0） | 有（`font-feature-settings: "tnum"`） | **新版新增** | H-07（旧侧不达标＝OLD-DEVIATION）；穷举对账新增行 |
| 零渐变（H-04） | 1 处（init-banner 135deg）＝**OLD-DEVIATION** | 1 处 `linear-gradient(90deg,var(--fg3,#86868b)…)`（charts 区）——**与 H-04「命中数 = 0」冲突，未消解** | **差异（可解释）** | **B-S1-2 更正**：删除 L-17「判据作废」的消解写法；H-04（`visual-spec-help.md:82`，R35 已定「零渐变基准取 B1」）要求命中 0 ⇒ **交 #89 裁定** |
| 正文字体栈（H-06） | 有：`-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif` | **无**（CSS 内仅 `"SF Mono", monospace` 与 `font-family: inherit`；`-apple-system`／`PingFang` 命中 0） | **新版缺失** | **B-S2-6 新增登记**：H-06 断言形式（字体栈逐字）在新侧不成立（`visual-spec-help.md:99`）→ #83 登记／#89 裁定 |

### D7 体积 —— 5 可解释 ＋ 2 新增 ＋ 1 一致

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| file 态字节 | **302,820 B** | **1,264,822 B**（+962,002 B，×4.18） | **差异（可解释）** | **L-16／P-5**：旧侧 DOM **运行时生成**（静态标记 1,130 B），新侧静态壳 |
| 体积构成（块口径闭合） | 旧：内容 302,700 ＋ 标签壳 120 ＝ **302,820** | 新：内容 1,264,736 ＋ 标签壳 86 ＝ **1,264,822** | **差异（可解释）** | **R-7／R3-B-2 更正**：旧「残差 0」 headline 是定义式恒真（`markup ＝ 文件 − 块`），改断言**内容口径 ＋ 独立正则标签壳 ＝ 文件字节**（新 `1264736+86=1264822`／旧 `302700+120=302820`）＋ 金标 **86／120／Δ−34** |
| 体积残差（两处） | 旧侧标签壳 **120 B** | 新侧标签壳 **86 B** | **差异（可解释）** | ① 构成残差＝三个块的标签壳（新 86／旧 120）；② 增减残差＝**−34 B**（120→86）。口径声明：本脚本 size 账按「多块 style 原文直接相连」计，与席 B 的 `join('\n')` 口径差 1 B（旧壳 120 vs 119）＝A-S3-5 已登记的 ±1 口径混用 |
| 体积增减（分块 ＋ 标签壳闭合） | markup 1,130 ＋ payload 196,902 ＋ css 33,469 ＋ js 71,199 | markup 953,821 ＋ payload 270,259 ＋ css 21,016 ＋ js 19,640 | **差异（可解释）** | markup **+952,691**／payload **+73,357**（#106 cli 字段 53,596 B＋#107 `meta_blocks` 1,826 B＋22 条 legacy 原文）／css **−12,453**／js **−51,559**；分块和 **962,036** ＋ 标签壳 **−34** ＝ **962,002**（闭合） |
| 与 L-16 记录值对账 | L-16 记 1,010,979 B（#88 期） | 1,264,822 B → **+253,843 B** | **差异（可解释）** | **B-S3-3 新增登记**：增量归 #106（341 条 CLI 字段）＋#107（看板入口）＋#121 等，未逐字节二分 |
| payload 顶层键 | `skill_name,title,subtitle,contact,groups`（5 键） | `…,meta_blocks`（6 键） | **新版新增** | **B-S3-4 新增登记**：#107 看板页入口段（6 条：`home／diet／exercise／goal／photo-gallery／help`） |
| inline／text 态字节 | 不适用 | inline **994,295 B**／text **24,989 B** | **新版新增** | #91 三态／#83 delivery |
| 字节稳定性（多次运行同 sha256） | — | 五次独立运行 sha256 逐字相同 | **一致** | P-2 |

### 2.1 差异条数与最高风险 3 条

- 差异合计 **34 条**（20 可解释 ＋ 11 新版新增 ＋ 3 新版缺失）；「新版缺失」3 条＝**D5 的 95 条无 CLI**、**D6 的参数必填阻断**、**D6 的正文字体栈（H-06）**。
- **风险 1（口径叠加 · 用户可见）**：D5「卡级 code vs Sheet CLI」——**22/22 条 legacy 卡**上，卡级显示 `python …`／`mavis …`（18 条 Sheet 另给新 CLI，4 条 Sheet 无字段行）。两条口径各自正确，叠加后同一张卡给出两个不同命令 → **建议维护者拍板**（收敛为「卡级只显示 id」或「卡级显示 Sheet 同一命令」）。
- **风险 2（能力缺口 · 95/436）**：95 条场景没有「可执行命令」行（workout 23、analysis 42、weight 18 等），且这 95 条的「复制参数」按钮回落复制 **Scene.id**（非命令）。根因 #81 non-exec，非 #106 漏做。
- **风险 3（时效 · 222/341）**：341 条命令中 **222 条**参数是**冻结绝对日期**（`--params '{"date":"2026-09-07"}'`），复制即执行会指向过去窗口；「看本周饮食」这类词当日即错。**新增登记（B-S2-5）**，建议归 #81 后续维护票。

## 3. 比对规则菜单（交维护者拍板）

三个候选口径，均与 `docs/research/t88-final.md` §5-A（L-01…L-19）与 **R35 裁定「与冻结契约冲突处以契约为准」**自洽。

### 口径 A · 逐字全等（byte-exact）

- **判据**：新旧产物（或两侧 payload JSON）逐字节相同；任何字节差异即不通过。
- **成本**：极低（一行 `sha256`）；但**必然不通过**——两侧是不同交付形态（旧运行时渲染 302 KB vs 新静态壳 1.26 MB）。
- **会漏掉什么**：全部合法形态偏离（L-05…L-19 全红）；也漏掉语义回归；把 L-16／P-5 的设计选择误判为缺陷。
- **能否被伪造**：**极易**——改一个空格／换时间戳即可让哈希全变或全同。
- **R-3 加固后定位（B §4.3）**：A **只**用于「同代码两次运行的字节稳定性」，且断言写成**四元组**＝`commit sha ＋ dist 哈希 ＋ SKILLS_DB_PATH 快照哈希 ＋ 日期`，允许差异集为空（当前为空）。**不可**作正确性判据。

### 口径 B · 结构化等价 ＋ 登记偏离（**推荐**）

- **判据**：两侧结构化解剖后逐维度比对（D1–D7）：① 计数与 id 集合逐字相等；② 差异**必须**登记并带根因或归属票；③ 未登记差异＝红；④ 三态 envelope 契约（exit／五字段＋`delivery`／`data.bytes＝产物字节`）。
- **R-3 加固（本版已落地，见 §9；R-7 补记见 §9.3）**：
  1. **判定由测量产生**：51 行 verdict 全部由 `rule(实测值)` 计算，脚本内无判定字面量、无 `? A : A`；
  2. **每行 `evidenceRef`** 指向 `ledger.json` 证据对表（D6 行形如 `D6.newDom.tabRadios`），收尾断言 **51/51 可解析** ＋ **方向一致性**（`一致⟺证据相等`，R-7）；
  3. **穷举对账**：枚举 payload 顶层键／场景字段键（解析 JSON 实测）／CSS token／JS marker／DOM 计数（含 `tabRadios`）共 **18 个可枚举差异键**，**100% 须被判定≠「一致」的登记行覆盖**（未覆盖即红）——B 反例「`+meta_blocks` 漏登」即由这条捕获；
  4. `ledger.json` **逐字节确定**（去时间戳）→ sha256 `b634f0bf…a3ad094` 写进本台账，第三方可一键复算；
  5. 禁用 `wake_word` 作 join 键（434/436 唯一）。
- **会漏掉什么**：① 纯视觉／像素级偏差（H-01…H-14 逐值尺，需 #89 浏览器面）；② 运行时行为（点击是否真复制、搜索是否真过滤）；③ **语义时效**（222 条冻结日期——已在 B 内登记，但 B 不自动判「窗口是否还有效」）；④ 「把真回归写成可解释」的判断性作弊（靠人审）。
- **能否被伪造**：**较难但非不可能**——伪造需同时改两侧解析 JSON ＋ `ledger.json` ＋ 台账 md；缓解＝判定由脚本算、`evidenceRef` 机器校验、穷举对账、sha256 入档、一键复算。**不能**防判断性作弊。
- **与 t88 自洽**：L-01…L-19 正是「结构化等价 ＋ 登记偏离」的实例；R35 是偏离的**裁决口径**，本口径只负责发现与登记。

### 口径 C · 场景级抽样 ＋ 交互实测（浏览器面）

- **判据**：按分组分层抽样 ＋ 22 条 legacy 全覆盖，在真实浏览器实测：搜索命中数、高亮、跳页、复制 1 次、返回顶部、Sheet 实时预览、copied 态；并断言 computed 样式尺（H-01…H-20）。
- **R-3 加固（B §4.5-4）**：① **抽样清单入仓＋固定种子**（可复现，不许挑好场景）；② 每条含 `runId`／时间戳；③ **必跑一次「复制参数」命令**，断言 `exit=0` 且窗口参数在有效期内（直接兜 B 反例 2）；④ computed 值直接对 H-01…H-20 断言，不允许只截图（兜反例 1 字体栈、反例 3 高亮噪声）。
- **成本**：高（浏览器夹具／#89 的 B1 尺；每条真点）。
- **会漏掉什么**：未抽到的场景（436 条抽 20–30 条）；数据面完整性（抽样通过 ≠ 436 条全对）；集合级缺口（95 条无 CLI）不敏感。
- **能否被伪造**：**难**（真实浏览器行为难伪造），但可被「挑好场景」规避；夹具易被合成（`t88-final.md:163` 自认合成先例）→ 故必须固定种子入仓。

### 推荐（一句话）

**B 为主口径 ＋ C 为抽样补充**：门禁用 B（可复跑、可复算、未登记偏离自动红），验收轮用 C 抽查（22 条 legacy ＋ 每组 2 条 ＋ 交互 7 项 ＋ 一条真跑命令）；**A 仅用于同代码两次运行的字节稳定性**（四元组口径）。

## 4. 缺口清单 → 建议归属票（R-3 更正后）

| # | 缺口（如实登记） | 证据 | 建议归属票 |
|---|---|---|---|
| G-1 | **95/436 场景无 Sheet「可执行命令」行**（根因＝#81 non-exec **110 − 漂移 15 ＝ 95**；细分 out-of-scope 10 ＋ legacy-chain 85）；其中 4 条＝legacy python／mavis 原文，reason code：`noNoteFilter` ×1、`oosCron` ×3 | D5；`D5.noCli` | wizard 类 5 条 → **#86**；计划类 → 二期写键票；legacy python 类 → 登记「不移植」。（**B-S2-3 更正**：删除原「#88 已登记 95 键无计划写键」——「95 键」是 SKILL.md 键表口径，与 95 条 noCli 无关） |
| G-2 | **HELP Sheet 内无必填阻断**（F3 `getMissing` 无对应物） | D6「参数必填校验」 | **#86**（配置型 wizard 已落地：`016bf9f`／`18354fe`／`aef6ae0`／`90128d8`，Sheet 字段运行时换 `input`）。（**B-S2-2 更正**：原「新版拿不到填写入口」已过期） |
| G-3 | **22/22 条 legacy 卡「卡级 code ≠ Sheet CLI」**（18 双命令＋4 卡级单侧） | D5；`D5.legacyCardVsSheet` | **#106 后续或新票**（需维护者拍板收敛口径） |
| G-4 | 断点三层并存（旧 `500/501/820` → 新 `820/720/640/400`），未做逐值视觉验收 | D6「断点（mediaQueries）」（**R-7 更正**：原指「Tab 形态」行，悬空；现独立成行承接） | **#89**（B1 视觉锁；L-13 已登记） |
| G-5 | ~~inline 态 delivery.mode=file~~ → **已移出缺口清单**：属 #91／#83 规格内行为，改登记为 §1.1 观测点＋命名歧义 | §1.1 | **#91 主／#83 辅**（B-S2-1 更正） |
| G-6 | 冻结实例为 v2.4.12／v2.4.13 期（81 唤醒词／12 分类；80 场景／9 分类），**不是** 436 场景版 | `fixtures-parse.json`（哈希对账 ✔） | 参考物；如需 436 版对照物 → **#94** 追加流程（不得覆盖既有条目） |
| G-7 | **222/341 条命令参数为冻结绝对日期**（当日即错的实例：`看今日主页 → --params '{"date":"2026-09-07"}'`） | D5；`D5.cliDatedCount` | **#81 后续维护票或新票**（样例参数口径） |
| G-8 | 新侧**无正文字体栈**（H-06 断言不成立）＋ charts 区 1 处 gradient（H-04 冲突） | D6 | **#89 裁定**／#83 登记 |
| G-9 | 95 条无字段卡的「复制参数」按钮复制 **Scene.id**（非命令） | D5；`t106:73` L-106-03 | **#106**（登记）／随 G-1 一并处置 |

## 5. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 83 --since 2026-09-09T15:38:02Z --until 2026-09-09T16:02:00Z`（覆盖本席首轮 11 条 ＋ R-3 返修轮 17 条，共 **28 条**持锁运行）。

```
GATE-RUN runId=8ec55c1a-667b-4a97-a37d-845c8a08b6de cmd="pnpm build"
GATE-RUN runId=74c76e0f-d8ce-40bd-a650-7bed4411d499 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=2d86d743-e40e-4794-8f9c-6a669a3850ec cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=51c8e6b4-d3b2-439b-9218-95a7113ded27 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=2132a51f-4ec0-4be7-bcc0-52f7427de0ee cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=16bbcbe4-a747-4dea-a841-581b6de11a8d cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=0df7895a-f42c-476a-b860-8040b4cd2a0d cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=4a2d38f1-ceec-43b4-866f-055cda3ab05d cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=824bfbfe-f255-4f0f-a72d-d30aa5eb1fd5 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=3e04a0e6-21bb-4f1a-99ba-5bafc9739d8d cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=7ec29247-d609-43ec-aaa5-87b4555d7ed4 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""

GATE-RELAX flag=--allow-undeclared reason=同一票号 83 有并发 session 在跑（窗口内他席条目：`t83-review-blue.mjs`／`t83-recheck-r2-scope.mjs`／`pnpm test`／他席 `pnpm build` 等，均非本席运行，无法代其声明）；本席 28 条运行已逐条声明（含 R-3 返修轮 17 条），反向对账其余条目属他席

# ── R-3 返修轮（窗口 2：2026-09-09T15:59:00Z – 16:02:00Z）────────────────────────
GATE-RUN runId=bb4ae993-9e91-473c-9f25-507dc587491f cmd="pnpm build"
GATE-RUN runId=e49d2663-53c9-4fbd-a5b0-6a23401dd1dc cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=680c07ba-0955-433e-9869-8d0b222ebb05 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=c0df8187-ba22-44a1-a88a-ec5b37b6ae67 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=f3706336-83ab-473e-8fc3-c32d33c322be cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=69524bab-94f8-4425-8614-38cc866642fe cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=758f9b1c-f3ac-4a6a-a963-53df88b9ba61 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=a6bd449e-3d67-457f-ba76-e9da69db4eb8 cmd="node docs/research/t-help-parity-review-a-probe.mjs --analyze"
GATE-RUN runId=5b5c1348-9458-4138-a13c-2427f143f596 cmd="node docs/research/t-help-parity-review-b-probe.mjs"
GATE-RUN runId=1a34504c-fcf7-4459-aab6-bb67c24e1b9d cmd="node docs/research/t-help-parity-review-b-probe2.mjs"
GATE-RUN runId=cda085db-9647-476d-9021-dc5fd7ce1806 cmd="node docs/research/t-help-parity-review-b-probe3.mjs"
GATE-RUN runId=10f93a9a-0a80-4c8f-962a-f5896fa4a79b cmd="node docs/research/t-help-parity-review-b-probe4.mjs"
GATE-RUN runId=db3eb030-3749-4739-aaa3-321489754984 cmd="node docs/research/t-help-parity-review-a-probe.mjs"
GATE-RUN runId=ed1204b3-5611-4e22-85b3-2a2a110101c4 cmd="node docs/research/t-help-parity-review-b-probe.mjs"
GATE-RUN runId=7e7c2487-e935-4d1a-a321-f34556d4898d cmd="node docs/research/t-help-parity-review-b-probe2.mjs"
GATE-RUN runId=c75a0829-b156-41ef-a693-827c78f93df3 cmd="node docs/research/t-help-parity-review-b-probe3.mjs"
GATE-RUN runId=2495d0ac-4975-456d-aac2-e58db070994b cmd="node docs/research/t-help-parity-review-b-probe4.mjs"
```

> 上表 §1 的 `--params` 为**可读写法**；本块按 `gate-runs.log` 的**转义原文**书写（`\"{\\\"mode\\\":\\\"inline\\\"}\"`），
> 供 `check-gate-audit.mjs` 逐字匹配（归一化后两侧同为 `--params "{\"mode\":\"inline\"}"`）。

**对账输出（实测）**：

```
$ node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-ledger.md --ticket 83 `
    --since 2026-09-09T15:38:02Z --until 2026-09-09T16:02:00Z --allow-undeclared
证据：D:\ilife\docs\research\t-help-parity-ledger.md
审计：D:\ilife\.scratch\locks\gate-runs.log（RUN 条目 840 条；窗口内 66 条，ticket=83）
声称运行 28 条（首轮 11 ＋ R-3 返修轮 17）
反向对账：窗口内无人声明的 RUN 条目 38 条（他席 t83-review-blue.mjs／t83-recheck-r2-scope.mjs／pnpm test／他席 build 等）
RESULT: matched=28/28 auditEntries=840 scoped=66 undeclared=38
gate-audit: PASS
```

## 6. 自检（#124 事故面）

```
$ (Get-Content packages\skill-calorie\SKILL.md -AsByteStream -TotalCount 3) | % { '{0:x2}' -f $_ }
2d 2d 2d          ← 非 00 00 00（#124 零填充事故未复现）

$ MUT-\d 残留扫描（packages/skill-calorie/src ＋ tooling ＋ docs）
src/tooling 命中 0；docs 命中仅历史证据/变异脚本内的**登记性引用**，非本席引入
```

- 本席零改动 `packages/**`／`tooling/**`／既有 `docs/**`（`git status` 仅见本席 4 个文件）。
- 产物未做任何手工编辑；三态 sha256 与生成时一致（§1）。

## 7. 复跑（逐字命令）

```powershell
$env:SKILLS_DB_PATH = "D:\ilife\.scratch\final-db"
node docs/research/t-help-parity-gen.mjs                      # 持锁 build ＋ 三态生成 → gen-manifest.json（RESULT: 32/32）
node docs/research/t-help-parity-extract.mjs                  # 两侧结构化解析 → {old,new,fixtures}-parse.json（RESULT: 27/27）
node docs/research/t-help-parity-compare.mjs                  # 七维度台账 → ledger.json（RESULT: 29/29）
# 两席审查探针（受跟踪，只读）
node tooling/run-locked.mjs --ticket 83 -- node docs/research/t-help-parity-review-a-probe.mjs --analyze
node tooling/run-locked.mjs --ticket 83 -- node docs/research/t-help-parity-review-b-probe.mjs
node tooling/run-locked.mjs --ticket 83 -- node docs/research/t-help-parity-review-b-probe2.mjs
node tooling/run-locked.mjs --ticket 83 -- node docs/research/t-help-parity-review-b-probe3.mjs
node tooling/run-locked.mjs --ticket 83 -- node docs/research/t-help-parity-review-b-probe4.mjs
node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-ledger.md --ticket 83 `
  --since 2026-09-09T15:38:02Z --until 2026-09-09T16:02:00Z --allow-undeclared
```

- 旧侧路径可覆盖：`--old "D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html"`；冻结实例目录：`--fixtures fixtures/help-instances`。
- 三脚本均**只读**旧侧与冻结实例，只写 `.scratch/`；`gen.mjs --skip-build` 可复用已构建 `dist/`。

## 8. 产物／中间件清单（`.scratch/`，不入库）

| 路径 | 字节 | sha256／说明 |
|---|---:|---|
| `.scratch/final-db/calorie_html/身材照HELP_20260910_000006.html` | 1,264,822 | `f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2` |
| `.scratch/final-db/calorie_html/身材照HELP_20260910_000006_2.html` | 994,295 | `8c1683daacf8af9a98cc62e3a33c044efcece0d5b2e813299ebaeefedabc14f0` |
| `.scratch/final-db/calorie_html/身材照HELP_20260910_000006_3.html` | 24,989 | `92425e0abb47e6268dbb19ecc7f66272f375b75259cf3ab768737f508934d8bb` |
| `.scratch/t-parity/gen-manifest.json` | — | 三态逐字命令／runId／exit／envelope／哈希／分段同源 |
| `.scratch/t-parity/old-parse.json` | — | 旧侧解析（302,820 B／`940939c772b3d304b1f59ff4557501ffa33ab1677dea8c8fef7617beb91118cc`） |
| `.scratch/t-parity/fixtures-parse.json` | — | 两冻结实例解析（哈希与 `SHA256SUMS.txt` 对账 ✔） |
| `.scratch/t-parity/new-parse.json` | — | 三态新侧解析 |
| `.scratch/t-parity/ledger.json` | — | 七维度 **51 行** ＋ 穷举对账 18 键；sha256 **`b634f0bf91451e4631c05ea7ebc53c95234903e57cb44ed78aec6e62da3ad094`**（去时间戳后逐字节确定） |

**旧侧参考哈希**：F3 根镜像 `940939c772b3d304b1f59ff4557501ffa33ab1677dea8c8fef7617beb91118cc`（302,820 B）；
冻结实例 `56807c11bd32be7afd7a3a2623ee1a79ef2bf41e6ecb08077b758de144befa28`（65,366 B）／
`1c7a0f1168fb34badbc83e73115ad4d6dd6fb9b9f7b677d2f0aee8184d84e8c1`（73,811 B）——三者本席**只读**，未改一字节。

## 9. 返修 R-3（两席审查）

> 依据：席 A `docs/research/t-help-parity-review-a.md`（`aee89ed`，PASS 84／S2×3＋S3×8）与
> 席 B `docs/research/t-help-parity-review-b.md`（`05a72ee`，FAIL 75／S1×2＋S2×6＋S3×7）。
> 本席**逐条独立复算**后处置（**全部接受，无一条「不接受」**；下列「改前 → 改后」为逐字对照）。

| 项 | 级别 | 处置 | 改前 → 改后 | 本席复算证据 |
|---|---|---|---|---|
| **A-1／B-S3-2** 卡级 code＝Scene.id | S2 | **接受** | 「436 条＝Scene.id」→「**435 条逐字**＝Scene.id；1 条例外＝含 `<N>`／`"` 的 id 渲染为 `&lt;N&gt;`／`&quot;`，**反转义后 436/436**」 | `dom.cardCodeVerbatimEq=435`／`cardCodeUnescapeEq=436`；A 探针 `codeEqIdByOrder=435, attrEqCode=436, mismatches[0].i=78` |
| **A-2／B-S2-1** 裸 `<N>` 13 处 | S2 | **接受** | 「13 处 legacy 原文（逐字保留）」→「**源码侧 13 处**（`t88-final.md:129`）／**产物侧 prompt 内 0 处**；唯一 `<N>` 在 1 条 scene id」；判定改 **一致** | 本席实测 `oldPromptLt=0 / newPromptLt=0`；`textBareLtN=1`、`cardCodeLt=1`、payload 转义 |
| **A-3** 键盘可达 | S2 | **接受** | 「旧＝无显式 Enter／新版新增」→「**能力对等扩展**：旧 Enter 作用于「新增」输入框，新作用于搜索框循环跳页」 | 旧 JS `newIn.addEventListener('keydown'…Enter…doNew())`；`oldMarkers.keyboardEnter=true`（旧台账自相矛盾） |
| **A-4／B-S2-3** 每卡 3 按钮归因 | S2 | **接受** | 「运行时注入卡头」→「**静态 markup 1,308 个**（`data-action-id` 各 436）＋ 运行时注入卡头**第 4 个**」 | `staticButtonsWithActionId=1308`、`staticCardCopyButtons=0`、`jsCreateButton=4` |
| **B-S1-1** 22 条 legacy 数字 | **S1** | **接受** | 「18 条不同源＋4 条两处皆无」→「**22/22 条不同源**（18 双命令 ＋ 4 条卡级有原文／Sheet 无字段行）」；风险 1 与 G-3 同步改 | 卡级 code 存在 22/22（1 条经实体转义）；Sheet 字段 18/22；4 条 reason＝`noNoteFilter`×1／`oosCron`×3 |
| **B-S1-2** 零渐变 H-04 | **S1** | **接受** | 删「L-17 判据作废」→「新侧 charts 区 1 处 `linear-gradient(90deg,…)` **与 H-04 冲突未消解 → 交 #89 裁定**；旧侧 hero 渐变＝OLD-DEVIATION」 | `visual-spec-help.md:82,87`（H-04 级别 C，R35 已定「零渐变基准取 B1」）；新 CSS 1 处 90deg |
| **B-S2-1** G-5 归属 | S2 | **接受** | 「缺口清单 G-5／#83」→「**§1.1 观测点**（规格内行为）＋ 命名歧义登记；**#91 主／#83 辅**；并写『inline 产物在磁盘，#89 夹具须读文件』」 | `t91-help-center-cli.md`（`mode` 面）；`envelope.ts:135,205`（`delivery` 面）；实测 `…_2.html` 994,295 B 在盘 |
| **B-S2-2** G-2 过期 | S2 | **接受** | 「新版拿不到填写入口」→「缺口＝**HELP Sheet 内无必填阻断**（`getMissing` 无对应物）」 | #86 已落地：`016bf9f`／`18354fe`／`aef6ae0`／`90128d8`；Sheet 字段运行时换 `input`（`bindField`） |
| **B-S2-3** G-1 归因 | S2 | **接受** | 删「#88 已登记 **95 键**无计划写键」→「**#81 non-exec 110 − 漂移 15 ＝ 95**（out-of-scope 10 ＋ legacy-chain 85）；4 条按 reason code」 | `t63-acceptance-line1.md:61,94-96,106`（`DRIFT exec 341／non-exec 95`）；`routing.ts:186,232,579,582,590` |
| **B-S2-4** 体积不闭合 | S2 | **接受** | 补两处残差行并保留等号右端：构成 `…＝1,264,736`（内容口径）／**块口径 ＝1,264,822 残差 0**；增减 `962,036 ＋ 标签壳 −34 ＝ 962,002` | 实测 `blockSum=1,264,822`（残差 0）、`innerResidual=86`（旧 120）、`innerDeltaSum=962,036` |
| **B-S2-5** 222 条冻结日期 | S2 | **接受（新增登记）** | 新增 D5 行「CLI 参数含冻结绝对日期 **222/341**」＋ G-7 | `cliDatedCount=222`；样例 `calorie.view.home --params '{"date":"2026-09-07"}'`；B probe2 `222 of 341` |
| **B-S2-6** 字体栈／gradient | S2 | **接受（新增登记）** | 新增 D6 行「正文字体栈（H-06）＝**新版缺失**」；零渐变行并入 H-04 冲突（见 S1-2） | 新 CSS `font-family` 仅 `"SF Mono"`／`inherit`；`-apple-system`／`PingFang` 命中 0 |
| **A-S3-1／B-S3-3** L-16／L-10 对账 | S3 | **接受（新增登记）** | 新增 D4「subtitle（L-10）」行与 D7「与 L-16 记录值对账」行（**+253,843 B**） | 旧 subtitle 含「更新于 2026-08-14 11:38」；新为「10 分类 · 436 场景」；L-16 记 1,010,979 B |
| **A-S3-2** 卡级 code 逐字率 | S3 | **接受** | 见 A-1（435/436＋1 例外） | 同上 |
| **A-S3-3** stdout 字节 | S3 | **接受** | §1.1 标注为**环境相关量**（`Δ＝2×ΔpathLen`），实测 1,276／1,280／26,827 | `stdoutBytes` 与 `data.output` 路径长度成正比 |
| **A-S3-4** 「file 逐字包含 inline 片段」 | S3 | **接受** | 改为「**分段逐字相等**（style／`<section>` 内容段／helpers 三段 sha256 相等）」＋把「inline 是 file 子串」**钉成 false 断言** | `segEqual={style:true,content:true,helpers:true}`、`inlineIsSubstringOfFile=false`、payload 块 270,259 B 插在中间 |
| **A-S3-5** 分块口径 | S3 | **接受** | extract 改**块口径／内容口径双记**，并声明 ±1 B 连接符口径（本账旧壳 120 vs 席 B 119） | `size.markup/payloadBlock/payloadInner/styleBlock/styleInner/jsBlock/jsInner` 七项双记 |
| **A-S3-6** 剪贴板回退 | S3 | **接受** | 「textarea 回退」→「textarea 回退，**仍带** `execCommand('copy')` 兜底」 | `newMarkers.execCommandFallback=true` |
| **A-S3-7** 必填校验可观测性 | S3 | **接受** | 该行标注「**代码级判定**：F3 根镜像 436 场景 `editable_fields` 全空 → 本数据上不可观测（方向不变）」 | 旧 payload `editable_fields` 命中 0 |
| **A-S3-8** 「既有唤醒词恒最后」 | S3 | **接受** | 改为「**仅 `diet_9`／`analysis_9` 两组**有该子功能且恒列组末」 | `subgroupDigest` 逐条 |
| **B-S3-4** payload 顶层键 | S3 | **接受（新增行）** | 新增 D7「payload 顶层键」行（`+meta_blocks`，#107） | 旧 5 键／新 6 键；6 条入口 `home/diet/exercise/goal/photo-gallery/help` |
| **B-S3-5** 无字段卡「复制参数」 | S3 | **接受（新增行）** | 新增 D5 行：回落复制 **Scene.id** | 样例 `diet_scan_label` → `data-t="diet_scan_label"`；`t106:73` L-106-03 |
| **B-S3-6** wake_word join 键 | S3 | **接受** | 脚本改用 `(子分组 id, 组内序)` 对齐；断言 `wakeWordUnique=434`＋dup `记身材照×3` | `derived.wakeWordDups=[["记身材照",3]]` |
| **B-S3-1** verdict 恒真／硬编码 | S3 | **接受** | 见 §9.1 ①②③ | 51 行全部 `rule(实测值)`；`? A : A` 已删；`evidenceRef` 51/51 可解析 |

### 9.1 脚本加固点（B §4.5／A §4）

1. **判定由测量产生**：`add(dim,item,old,new,rule,…)`，`rule()` 返回四值之一，脚本内**无判定字面量**；旧版 `typesTextEq.length === 436 ? A : A` 恒真分支已删（断言数 21 → 23 → **29**，R-7 加方向一致性／金标／覆盖判定）。
2. **`evidenceRef` 机器校验**：51 行逐行带证据对（D6 行形如 `D6.newMarkers.*`／`D6.newCss.*`／`D6.newDom.*`），收尾 `resolveRef` 断言 **51/51 可解析** ＋ **方向一致性 51/51**（`both` 行 `一致⟺证据相等`；`new-only` 行须新增／缺失；`na` 行限 ≤3，当前 2 行：场景 id 唯一性／字节稳定性）。
3. **穷举对账**：18 个可枚举差异键（payload 顶层键／场景字段键·实测／CSS token ×5／JS marker ×6／DOM 计数 ×6 含 `tabRadios`）**100% 被判定≠「一致」的登记行覆盖**，未覆盖即红。
4. **体积等式闭合（R-7 改述）**：删「块口径残差 0」恒真 headline，改断言**内容口径 ＋ 独立正则标签壳 ＝ 文件字节**（新 `1264736+86=1264822`／旧 `302700+120=302820`）＋ **标签壳金标 86／120／Δ−34** ＋ `分块和＋标签壳差＝头条 delta`（`962036−34=962002`）。
5. **`ledger.json` 逐字节确定**：删 `generatedAt` → sha256 可复算并写进 §8（复跑同值 `b634f0bf…a3ad094`）。
6. **inline／file 关系钉死**：分段 sha256 相等 ＋ `inlineIsSubstringOfFile === false`（把过强命题钉红）。

### 9.2 两席探针复跑（R-3 判据）

| 探针 | runId | exit | 与台账一致性 |
|---|---|---:|---|
| `t-help-parity-review-a-probe.mjs --analyze` | `a6bd449e-3d67-457f-ba76-e9da69db4eb8` | 0 | D1–D7 逐项与台账同值（`idEq=414`／`idChanged=22`／`promptEqIdx=436`／`newCli=341`／`noCli=95`／`codeEqIdByOrder=435`／`attrEqCode=436`／`deltaSum=962,034`／`tagShellDelta=−32`——口径差见 D7 残差行声明） |
| `t-help-parity-review-b-probe.mjs` | `5b5c1348-9458-4138-a13c-2427f143f596` | 0 | `new-sum 1,264,736 residual 86`／`old-sum 302,700 residual 120`／`delta-sum 962,036 gap 34`／legacy 4 条 Sheet CLI 无 |
| `t-help-parity-review-b-probe2.mjs` | `1a34504c-fcf7-4459-aab6-bb67c24e1b9d` | 0 | `PAYLOAD cli fields with ISO date: 222 of 341`（与 D5 新行同值） |
| `t-help-parity-review-b-probe3.mjs` | `cda085db-9647-476d-9021-dc5fd7ce1806` | 0 | 卡级 3 静态按钮／Sheet 字段结构复核一致 |
| `t-help-parity-review-b-probe4.mjs` | `10f93a9a-0a80-4c8f-962a-f5896fa4a79b` | 0 | R1–R16 与台账逐行同值（R5 `prompt/wake/title/status 436`、R7 `0/341/95`、R9 `18/4`、R11 顶层键、R12 DOM、R14/R16 残差） |

> 结论：席 B 的 **2 处 S1 ＋ 6 处 S2 已在台账中消失**（S1-1→D5 22/22；S1-2→D6 H-04 交裁定；S2-1→§1.1＋#91 主；
> S2-2→G-2 改判；S2-3→G-1 改归因；S2-4→D7 两处残差闭合；S2-5→D5 222/341 新行；S2-6→D6 字体栈新行）；
> 席 A 的 3 条 S2 各有更正行（A-1→D5 435/436；A-2→D4 源码侧 13／产物侧 0；A-3→D6 能力对等扩展；A-4→D5 静态 1,308）。

### 9.3 返修 R-7（席 B 定点复核 R3-B-1…B-4 · salvage 验证）

> 前任（台账原作者）已销毁，留下未提交改动；本席逐 hunk 审查、独立复算、补齐台账正文同步后提交。
> 本轮只改 3 个文件：`t-help-parity-compare.mjs`／`t-help-parity-extract.mjs`／本文件（`gen.mjs` 未动；`packages/**` 零改动）。

| # | 缺陷 | 前任改动 | 本席独立复算（持锁 `--ticket 83`） | 结论 |
|---|---|---|---|---|
| **R3-B-1**（S1） | D6「Tab 形态」误判「一致」＋断点无行可依 | Tab 行 rule 改测 `tabRadios`、判可解释；补「断点（mediaQueries）」行；G-4 指针本席补指断点行 | `tabRadios` 旧 **0**／新 **11**；mediaQueries 旧 3 组（500/501/820）→ 新 5 组（820/720/640/400＋reduced-motion）；两行 verdict 均为**差异（可解释）**；旧误判行经方向谓词验证**会被拦截** | ✅ 留用 ＋ 本席补 G-4 指针与 §2/§8 计数 |
| **R3-B-2** | 体积两条恒等式断言 | extract 加独立正则 `tagsBytes`；断言换 `innerSum＋tagsBytes＝total` ＋ 金标 86／120／Δ−34 | 独立正则复算：新 6 标签 **86 B**（`style×2＋payload脚本×2＋普通脚本×2`）、旧 10 标签 **120 B**；`1264736+86=1264822`／`302700+120=302820`／`962036−34=962002`；旧恒等式行已删 | ✅ 留用 ＋ 本席改述 D7「体积构成」行 headline |
| **R3-B-3** | 穷举键集硬编码＋覆盖不查判定 | `enumPairs` 改由 `rawKeys`（extract 实测）产生，新增 `subgroup.fieldKeys`／`dom.tabRadios`；覆盖须 `verdict≠一致` | scene 键旧 6 键 → 新 7 键（＋`editable_fields`）确由解析 JSON 产生；`enumDiffs` **18/18** 被非「一致」行覆盖（`mediaQueries→断点`、`tabRadios→Tab 形态`）；硬编码探针 `false` | ✅ 留用 |
| **R3-B-4** | `evidenceRef` 只查可解析 | 证据对表 `{old,new,mode}` ＋ 方向一致性断言（`both`：`一致⟺相等`；`new-only`：须新增／缺失；`na` 限 ≤3） | **51/51** 行通过；`na` 恰 2 行（场景 id 唯一性／字节稳定性）；probe5 `BIND-MISMATCH` **0**、`md-missing` **0**、`verdict mismatch` **0** | ✅ 留用 |

前任遗漏（本席补齐，均属上面 4 条的台账同步，不重开）：① §2/§2.1/§6/D6 表头计数仍为 50 行版（→51 行：一致 17／可解释 20／新增 11／缺失 3）；
② `ledger.json` sha 仍为 R-3 值（→`b634f0bf…a3ad094`，复跑逐字稳定）；③ G-4 证据指针仍指「Tab 形态」（→「断点（mediaQueries）」）；
④ §3-§9.1 的 50/50、17 键、`23/23`、`D5.noCli` 旧 ref 例（→51/51、18 键、`29/29`、证据对表述）；⑤ D7「体积构成」行 headline 仍写「残差 0 严格闭合」（→内容＋标签壳式）。
`evidence.eNN` 自动编号（非 D6 行）为前任实现选择：md↔ledger 一致性按 item＋判定核对（probe5 §1 **0 缺失／0 误判**），`dimensions` 旧表保留可读，未引入新不一致，故留用。

```
GATE-RUN runId=1fad4fd4-d43b-4302-8124-0cc366a4089e cmd="node docs/research/t-help-parity-extract.mjs"
GATE-RUN runId=a198c626-2f6c-458b-8fe8-bec6978eb9c7 cmd="node docs/research/t-help-parity-compare.mjs"
GATE-RUN runId=585b5fd5-3c81-4a6f-8f9c-68fbb3ec2007 cmd="node docs/research/t-help-parity-compare.mjs"
GATE-RUN runId=798d15ad-823a-4225-99a3-1b455eb02cc7 cmd="node docs/research/t-help-parity-review-b-probe.mjs"
GATE-RUN runId=fb6fd4b4-c8b3-4edb-8a47-293f830ed69e cmd="node docs/research/t-help-parity-review-b-probe2.mjs"
GATE-RUN runId=ee5bba43-ccdc-4474-880e-44b898d3d35a cmd="node docs/research/t-help-parity-review-b-probe3.mjs"
GATE-RUN runId=da420ba0-e8d5-427d-9ee6-90c1f02a275a cmd="node docs/research/t-help-parity-review-b-probe4.mjs"
GATE-RUN runId=0e590f7b-a768-4476-8daa-b79cc2f0cd29 cmd="node docs/research/t-help-parity-review-b-probe5.mjs"
```

> `gen.mjs --skip-build` 本轮超时中断（120 s，进程已杀，输出未采用）：`gen.mjs` 本轮零改动且 compare 已断言产物 sha 与 manifest 一致（PASS），故不重跑、不声明。
> 摘要行：extract `RESULT: 27/27`；compare `RESULT: 29/29`（`LEDGER-SHA256 b634f0bf…a3ad094`，复跑逐字稳定）；
> probe `222 of 341`／probe3 输入框运行时注入／probe4 `R1–R16` 全同值（含 R12 `tabRadios 11`、R14/R16 残差 86/120）；
> probe5 `MD rows 97 | ledger rows 51 | md-missing 0 | verdict mismatch 0`，`一致` 行 BIND-MISMATCH 0，硬编码 `false`，覆盖缺口 0。

**R-7 对账输出（实测，宽窗口覆盖 R-3 28 条 ＋ R-7 8 条）**：

```
$ node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-ledger.md --ticket 83 `
    --since 2026-09-09T15:38:02Z --until 2026-09-09T20:05:00Z --allow-undeclared
RESULT: matched=36/36 auditEntries=960 scoped=114 undeclared=78
gate-audit: PASS
```
