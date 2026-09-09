# 新旧 HELP 差异台账（#83 · 地图 #63 主线②）

> 本席＝「HELP 最终产物生成 ＋ 新旧差异台账席」。**只观测、不修代码、不改产物**。
> 旧侧＝**F3 根镜像** `D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html`（302,820 B，只读）＋ 两个冻结实例
> `fixtures/help-instances/*.html`（只读，哈希对账）；新侧＝**最终代码**（`5fffe1e`）在持锁下重生成的三态产物。
> 机器可读台账：`.scratch/t-parity/ledger.json`（41 行七维度）／解析：`.scratch/t-parity/{old,new,fixtures}-parse.json`／
> 产物清单：`.scratch/t-parity/gen-manifest.json`。**`.scratch/` 不入库**，哈希与路径逐条抄在本文件里。
>
> **纪律**：判定只用四值 `一致／差异（可解释）／新版缺失／新版新增`；每条差异带根因或归属票。
> **未**为「看起来一致」改代码或改产物；缺口如实登记并给「缺口 → 建议归属票」。

## 0. 起点与工作区（如实记录他票 WIP）

```
$ git log -1 --oneline
5fffe1e fix(83): 返修 R-1 相对落点（红队 S1-交付缺陷）＋ 红队审查报告 ＋ 定点复核

$ git status --short
 M .gitignore                                   ← 他票 WIP（**本席未动、未提交**）
?? docs/research/decision-116-3q-20260909.html   ← 他票 WIP
?? docs/research/t123-release-evidence/          ← 他票 WIP
（另有并发 session 的 t63-*／t89-*／t83-review-*／t-help-acceptance-* 未跟踪文件，均非本席路径）
```

- 本席**只新增** `docs/research/t-help-parity-{gen,extract,compare}.mjs` 与本文件；`packages/**`／`tooling/**`／既有 `docs/**` 零改动。
- 三态产物与中间 JSON 全部落 `.scratch/`（`.gitignore` 已忽略），**不入库**。

## 1. 三态产物（最终代码 · 持锁生成）

统一前置：`$env:SKILLS_DB_PATH = "D:\ilife\.scratch\final-db"`；每条命令都经 `node tooling/run-locked.mjs --ticket 83 -- …` 持锁。
权威复跑脚本＝`node docs/research/t-help-parity-gen.mjs --skip-build`（`RESULT: 31/31 gen-checks`），它把下表逐字落成
`.scratch/t-parity/gen-manifest.json`。

| 态 | 逐字命令（`--` 之后为持锁内层） | runId | exit | stdout 行 | `data.mode` | `delivery.mode` | 产物字节 | 产物行数 | sha256 | 落点 |
|---|---|---|---:|---:|---|---|---:|---:|---|---|
| `file`（缺省） | `node tooling/run-locked.mjs --ticket 83 -- node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center` | `824bfbfe-f255-4f0f-a72d-d30aa5eb1fd5` | 0 | 1 | `file` | `file` | **1,264,822** | 4,090 | `f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2` | `.scratch/final-db/calorie_html/身材照HELP_20260909_234219.html` |
| `inline` | `… --params '{"mode":"inline"}'` | `3e04a0e6-21bb-4f1a-99ba-5bafc9739d8d` | 0 | 1 | `inline` | `file` | **994,295** | 4,079 | `8c1683daacf8af9a98cc62e3a33c044efcece0d5b2e813299ebaeefedabc14f0` | `.scratch/final-db/calorie_html/身材照HELP_20260909_234219_2.html` |
| `text` | `… --params '{"mode":"text"}'` | `7ec29247-d609-43ec-aaa5-87b4555d7ed4` | 0 | 1 | `text` | `text` | **24,989** | 521 | `92425e0abb47e6268dbb19ecc7f66272f375b75259cf3ab768737f508934d8bb` | `.scratch/final-db/calorie_html/身材照HELP_20260909_234219_3.html` |

### 1.1 envelope 字段（三态实测）

- 顶层键恒 `version,skill,shape,key,data,delivery`（六键＝P9 五字段 ＋ #83 追加的 `delivery`；`version=0.1.0`、`skill=calorie`、`shape=list`、`key=calorie.help.center`）。
- `data` 键：`file`／`inline` ＝ `items,total,sceneTotal,subgroupTotal,mode,bytes,output`；`text` 多一个 `text`（24,989 B，与产物逐字同源）。
- `data.items` 恒 10 组：`home(3/9) diet(9/70) weight(8/58) exercise(5/39) workout(6/32) goal(3/25) body_detail(4/13) body_photo(4/10) profile(3/4) analysis(9/176)`，`total=10 / subgroupTotal=54 / sceneTotal=436`。
- `delivery`：`{mode,path?,template,bytes}`；`file`／`inline` 的 `template='help-shell'`，`text` 的 `template='text'`。
  **观测点（登记，不判缺陷）**：`inline` 态的 `data.mode=inline` 但 `delivery.mode=file` —— 片段按既有落盘管线写成 `.html` 文件（#83 三态判定的「有 HTML 产物即落盘」分支），并非内嵌回传。
- 三态同源实证：`file` 产物内**逐字包含** `inline` 片段；`inline` **不带** payload JSON（`file` 的 `<script id="payload">` 270,259 B 是其独有）；`text` 无标签、无脚本、无 payload。
- **字节稳定性（P-2）**：同一 commit 三次独立运行（23:38／23:42 两轮 gen ＋ 一次手工复跑）三态 sha256 **逐字相同**。

## 2. 七维度差异台账

**头条数字（旧 → 新）**：分组 **10 → 10**｜子功能 **54 → 54**｜场景 **436 → 436**｜prompt 逐字 **436/436 相同**｜
CLI 展示命令 **0 → 341**（＋卡级 436 条 `<code>` 显示 Scene.id）｜file 态体积 **302,820 B → 1,264,822 B**。
判定分布：**一致 17／差异（可解释）13／新版新增 9／新版缺失 2**（合计 41 行；逐行机器可读见 `.scratch/t-parity/ledger.json`）。

### D1 分组数 —— 一致

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 分组条数 | 10 | 10 | **一致** | `old.counts.groups=10`／`new.counts.groups=10`；envelope `data.total=10` |
| 分组 id 序列 | `home>diet>weight>exercise>workout>goal>body_detail>body_photo>profile>analysis` | 逐字相同 | **一致** | L-01（分组序取 F3）／`helpCenter.ts:47 HELP_GROUPS` |
| 分组 label／icon | 主页🏠／饮食🍚／体重⚖️／运动🏃／健身计划💪／目标管理🎯／身体细节🧬／身材照片📸／基础信息⚙️／分析📊 | 逐字相同（含 `profile=⚙️`） | **一致** | L-01；与 SoT `CATEGORIES` 13 条的差异（`profile='🛠'`）已由 L-01 收敛为取 F3 |
| 每分组子功能／场景分布 | `3/9 9/70 8/58 5/39 6/32 3/25 4/13 4/10 3/4 9/176` | 逐组相同 | **一致** | `groupDigest` 逐组比对 |

### D2 子功能数 —— 一致

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 子功能条数 | 54 | 54 | **一致** | envelope `data.subgroupTotal=54` |
| 子功能 id 集合 | `{group}_{n}` 54 条（同序） | 54/54 逐字同序 | **一致** | L-03；`既有唤醒词` 恒最后（`helpCenter.ts:174`） |
| 子功能 label | 54 条 | 54/54 逐字相同 | **一致** | L-18（diet 展示名取 F3「饮食」，非 SoT「饮食记录」） |

### D3 场景（唤醒词）数 —— 一致（1 条可解释差异）

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 场景条数 | 436 | 436 | **一致** | envelope `data.sceneTotal=436` |
| 唤醒词逐字 | 436 条 | **436/436 相同** | **一致** | 按 `(子功能 id, 组内序)` 对齐后逐字比对 |
| 场景 title 逐字 | 436 条 | **436/436 相同** | **一致** | 同上 |
| `status` 字段 | 436 条空串 | 436/436 相同 | **一致** | 同上 |
| 场景 id 逐字 | 414 条相同 ＋ 22 条 `legacy_{唤醒词}` | 414 条相同 ＋ 22 条 `main_prompt.cli` 原文（python／mavis） | **差异（可解释）** | **L-19／#83 R-7**：F3 的 `legacy_*` 会让卡面显示不存在的命令；22 条逐条见 `ledger.json → dimensions.D3.idChanged` |
| 场景 id 唯一性 | — | 436/436 唯一 | **一致** | #88 断言 |

> 22 条 id 变更全部落在「既有唤醒词」子功能组（`diet_9` 1 条 ＋ `analysis_9` 21 条），旧 id 前缀恒 `legacy_`，新 id ＝ SoT `main_prompt.cli` 原文（如 `python scripts/render_review.py --type day`、`mavis cron list`）。

### D4 每条场景的 prompt 文本 —— 一致（1 条形状差异）

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 每条 prompt 逐字 | 436 条 `prompt_template` | **436/436 逐字相同**（含 22 条 legacy 原文） | **一致** | 对齐后 `promptEq=436`，差异集为空 |
| `types` 徽章文本序列 | 414 条，形如 `["结果"]`（字符串数组） | 414 条，文本逐字相同，形如 `[{text:"结果",bg:"#e8f2ff",fg:"#0a63ce"}]` | **差异（可解释）** | **L-12**：三档配色内联（`helpCenter.ts:132 HELP_TYPE_BADGES`）；只发字符串会走 CSS 默认色＝丢三档色 |
| 裸 `<N>` 等尖括号 | 逐字保留（13 处 legacy 原文） | 逐字保留（`text` 态不转义） | **一致** | #88 §5-D-4（A.4）：`text` 态为纯文本载体，转义反而与 CLI 原文不一致 |

### D5 每条 CLI 展示命令 —— 新版新增 ＋ 1 条缺口 ＋ 1 条口径叠加差异

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| Sheet「可执行命令」行 | **0**（F3 payload 无 `editable_fields`／`cli` 字段，不展示命令） | **341/436** | **新版新增** | **#106** 回补；数据源 #81 `WAKE_ROUTES` exec 桶 341 条（`helpCenter.ts:94-123`） |
| 卡级 `<code class="ilife-help-shell-cli">` | 0（F3 卡面无代码行） | **436/436**（内容＝`Scene.id`，非命令） | **新版新增** | **L-09**（F3 不显示；本项为新增展示） |
| 无 CLI 的场景（**缺口**） | 不适用 | **95/436 无「可执行命令」行** | **新版缺失** | 分布 `diet 6／weight 18／exercise 1／workout 23／goal 3／body_detail 2／analysis 42`；根因＝**#81 路由层 95 条 non-exec**（wizard／计划写入缺失／legacy python 无 exec 键），#106 按「不造空值行」不发字段 |
| 卡级 code 与 Sheet CLI 是否同源 | 不适用 | **18/22 条 legacy 两处不同源**：卡级＝`main_prompt.cli` 原文（python／mavis），Sheet＝路由层新 CLI；另 4 条两处皆无（`看「有备注」的饮食记录`、`开启／关闭／查定时复盘`） | **差异（可解释）** | **L-19 ＋ #106 口径叠加**：同一张卡上「卡级代码行」与「Sheet 可执行命令」显示不同命令。**建议**：维护者拍板是否收敛为「卡级只显示 id、命令只在 Sheet」（归 #106 后续或新票） |
| 「复制参数」按钮 | 0（旧卡面每卡 1 个「复制」） | 436（每卡 3 按钮：复制指令／复制唤醒词／复制参数） | **新版新增** | L-05／#88 S4-S5 运行时注入（主源取同卡 `<pre>` 原文） |

### D6 交互能力 —— 2 一致／7 差异（可解释）／5 新版新增／1 新版缺失

| 能力 | 旧值（F3） | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| 搜索（输入框＋清空＋计数） | 有：运行时注入 `#sB`／`#sClear`／`#hitC`，占位「搜索全部场景」 | 有：运行时注入 `input[type=search]` ＋ 清空 ＋ 计数，占位逐字相同 | **一致** | L-06；两侧静态 HTML 均**无**搜索框（旧 0／新 0）——都是 helpers 运行时注入 |
| 命中计数／空态文案 | 「匹配 N 个场景」／「没有找到相关场景,换个词试试～」 | 逐字相同 | **一致** | L-06 |
| 高亮 | 仅高亮卡面标题 `.m-name`（`<mark>`） | 整卡文本节点 `wrapTerm` ＋ `<mark class=…card-mark>` | **差异（可解释）** | L-06（S4）功能对等扩展：新版高亮**范围更广** |
| 跳页 | 命中后 `pages.scrollTo({left})` 翻到首个命中页 | `jumpTo` 勾选命中页 radio ＋ Enter 循环 | **差异（可解释）** | L-07（横滑页 → radio 标签条） |
| 复制按钮（卡级） | 每卡 1 个「复制」（运行时注入 `.mini`） | 每卡 3 个（运行时注入卡头） | **新版新增** | L-05／#88 S5（委派单点、跨实例去重） |
| 返回顶部 | **无**（`backTop` 0 处） | 有（`#backTop`，↑，aria「回到顶部」，`scrollTop>400` 才显形） | **新版新增** | L-15／H-19（R35 D-14 强制）／#88 S4 |
| Sheet 实时预览 | 有：底部弹层参数表单 → `[data-prev]` 实时重组 `buildPrompt` | 有：内联 `<details>` 字段输入 → 实时重组「prompt ＋ 空行 ＋ label: value」 | **差异（可解释）** | L-08（弹层 → 内联 `<details>`）；语义同源 |
| 参数必填校验 | 有：`getMissing` → toast「请先填写: …」并阻断复制 | **无**（字段是「可执行命令」展示行，无 `req` 语义） | **新版缺失** | 根因：新版字段来源＝#106 路由 CLI（展示用），非 F3 `params` 表单。**建议归属票**：#86（配置型 wizard 承载填写）；未落地前登记为可接受缺口 |
| copied 态 | toast「已复制」＋副文案「粘贴给 AI,技能会自动执行,完成后你会拿到结果 HTML。」 | 按钮 `copied` 类（450 ms）＋ toast「已复制」；失败态「复制失败／长按选择文本手动复制」 | **差异（可解释）** | **#121**（copied 态）／H-16（双反馈；toast 时长取冻结值 4500 ms，R35 裁定） |
| 剪贴板实现 | `document.execCommand('copy')` ＋ 隐藏 textarea 回退 | `navigator.clipboard.writeText()` ＋ textarea 回退 | **差异（可解释）** | 现代 API 迁移，行为等价（都带回退） |
| 键盘可达 | 无显式 Enter 处理 | 有：搜索框 Enter 循环跳下一个命中页 | **新版新增** | #88 S4（H-20 同批） |
| 焦点可见／动效可关 | 0／0 | `:focus-visible` 10 处／`prefers-reduced-motion` 1 处 | **新版新增** | L-15／H-20（R35 D-14 强制） |
| Tab 形态 | 横滑页 ＋ 底部 tabBar（scroll-snap） | radio 标签条（11 个 `.tab-input`） | **差异（可解释）** | L-07；断点 旧 `500/501/820` → 新 `820/720/640/400`（**L-13**，#89 验收） |
| 空态／错误态 | 无 try/catch → 白屏风险 | 静态 HTML 无解析步骤；渲染失败走 #83 模板回执 | **新版新增** | L-14／#83 |
| 零渐变 | 1 处（init-banner 135deg） | 1 处（charts 区 90deg） | **差异（可解释）** | L-17（零渐变判据作废，改按 CSS 区判） |

### D7 体积 —— 差异（可解释）＋ 1 条新版新增

| 项 | 旧值 | 新值 | 判定 | 证据／归属 |
|---|---|---|---|---|
| file 态字节 | **302,820 B** | **1,264,822 B**（+962,002 B，×4.18） | **差异（可解释）** | **L-16／P-5**：旧侧 DOM **运行时生成**（静态标记仅 **1,130 B**），新侧静态壳 |
| 体积归因（新侧构成） | — | markup **953,821** ＋ payload **270,259** ＋ css **21,016** ＋ js **19,640** | **差异（可解释）** | 静态 markup 占 75.4%：436 卡体 **930,351 B**（均 2,134 B/卡）＋1,308 按钮 386,454 B＋490 `<details>` 739,482 B＋341 字段行 108,521 B（**#106**）；payload 内 cli 字段 53,596 B（**#106**）＋ `meta_blocks` 1,826 B（**#107**，6 条看板入口 `home/diet/exercise/goal/photo-gallery/help`） |
| 体积增减（分块） | markup 1,130 ＋ payload 196,902 ＋ css 33,470 ＋ js 71,199 | markup 953,821 ＋ payload 270,259 ＋ css 21,016 ＋ js 19,640 | **差异（可解释）** | markup **+952,691 B**（静态壳取代运行时渲染）／payload **+73,357 B**（#106＋#107＋22 条 legacy 原文）／css **−12,454 B**／js **−51,559 B**（旧侧含完整渲染器＋hm 组件库） |
| inline／text 态字节 | 不适用（F3 无三态） | inline **994,295 B**／text **24,989 B**（521 行） | **新版新增** | #91 三态（`mode` 显式）／#83 delivery；`inline ＝ file −(head/doctype ＋ payload 270,259 B)` |
| 字节稳定性 | — | 三次独立运行 sha256 逐字相同 | **一致** | P-2（时间戳缺省不写）／#88 |

### 2.1 差异条数与最高风险 3 条

- 差异合计 **24 条**（13 可解释 ＋ 9 新版新增 ＋ 2 新版缺失），其中「新版缺失」2 条＝**D5 的 95 条无 CLI**、**D6 的参数必填校验**。
- **风险 1（口径叠加 · 用户可见）**：D5「卡级 code vs Sheet CLI 不同源」——22 条 legacy 卡上，卡级显示 `python …`／`mavis …`，Sheet 显示 `calorie-cmd-read …`。两条口径（L-19 忠实回放 ＋ #106 取路由层）各自正确，叠加后同一张卡给出两个不同命令 → **建议维护者拍板**（收敛为「卡级只显示 id」或「卡级显示 Sheet 同一命令」）。
- **风险 2（能力缺口 · 95/436）**：95 条场景没有「可执行命令」行（计划类 23、分析类 42、体重复盘／对比 18 等）。F3 里这些场景**有 prompt 可复制**，新版也有 prompt，但**没有可直接执行的一行命令** → 与「完整能力速查台」的期望有落差。根因 #81 non-exec（95 条），非 #106 漏做。
- **风险 3（能力缺失 · 表单）**：F3 的 Sheet 有参数表单＋必填校验（`getMissing` 阻断复制），新版 Sheet 只有只读字段＋实时预览。若用户按 F3 习惯「填参数再复制」，新版拿不到填写入口 → 建议归 #86。

## 3. 比对规则菜单（交维护者拍板）

三个候选口径，均与 `docs/research/t88-final.md` §5-A（L-01…L-19）与 **R35 裁定「与冻结契约冲突处以契约为准」**自洽。

### 口径 A · 逐字全等（byte-exact）

- **判据**：新旧产物（或两侧 payload JSON）**逐字节**相同；任何字节差异即不通过。
- **成本**：极低（`sha256` 一行即可判）；但**必然不通过**——两侧是不同交付形态（旧＝运行时渲染 302 KB，新＝静态壳 1.26 MB）。
- **会漏掉什么**：漏掉「功能对等但形态不同」的全部合法偏离（L-05…L-19 全被判红），也漏掉「同一渲染路径下的语义回归」；把 L-16／P-5 的设计选择误判为缺陷。
- **能否被伪造**：**极易**——改一个空格、换一个时间戳即可让哈希全变或全同，判据不含语义。
- **结论**：**不推荐**（作为门禁会把 24 条已知可解释差异全部误报）。

### 口径 B · 结构化等价 ＋ 登记偏离（**推荐**）

- **判据**：对两侧**结构化解剖**后逐维度比对（本文件 D1–D7）：① 计数与 id 集合**逐字相等**（分组 10／子功能 54／场景 436／唤醒词与 prompt 436/436）；② 差异**必须**在台账登记并带根因或归属票；③ 未登记差异＝红。辅以三态 envelope 契约（exit／五字段＋delivery／`data.bytes＝产物字节`）。
- **成本**：中（本席已交付 `t-help-parity-{gen,extract,compare}.mjs`，`RESULT: 31/31`＋`18/18`＋`12/12`，一次复跑约 1 分钟，全程持锁）。
- **会漏掉什么**：① 纯视觉／像素级偏差（H-01…H-14 的逐值尺，需 #89 的浏览器面）；② 运行时行为（点击一次是否真复制、搜索是否真过滤）——结构里看不出来；③ 新登记的「差异」若被写成「可解释」但实际是回归（靠人审）。
- **能否被伪造**：**较难但非不可能**——伪造需同时改两侧解析数据与台账（都在可写工作区）；缓解＝台账 JSON 由脚本产出、脚本受跟踪、哈希入档、且 `ledger.json` 可一键复算。**不能**防「把真回归写成可解释」这类判断性作弊。
- **与 t88 自洽**：L-01…L-19 正是「结构化等价 ＋ 登记偏离」的实例（22 条 id／types 形状／体积／断点全部登记）；R35「与冻结契约冲突处以契约为准」＝偏离的**裁决口径**，本口径只负责「发现并登记」，裁决权仍在维护者。

### 口径 C · 场景级抽样 ＋ 交互实测（浏览器面）

- **判据**：按分组分层抽样（如每组 2–3 条场景 ＋ 22 条 legacy 全覆盖），在真实浏览器里实测：搜索命中数、高亮、跳页、复制 1 次、返回顶部、Sheet 实时预览、copied 态；断言 computed 样式尺（H-15…H-20）。
- **成本**：高（需要浏览器夹具／#89 的 B1 尺；每条场景要真点）。
- **会漏掉什么**：漏掉**未抽到**的场景（436 条里抽 20–30 条）；漏掉数据面完整性（抽样通过≠436 条全对）；对「95 条无 CLI」这类**集合级**缺口不敏感。
- **能否被伪造**：**难**（真实浏览器行为难以伪造），但可被「挑好场景」规避；且证据是截图／日志，复核成本高。
- **结论**：作为 B 的**补充**（B 管数据面与登记，C 管交互面），不作为唯一口径。

### 推荐（一句话）

**B 为主口径 ＋ C 为抽样补充**：门禁用 B（可复跑、可复算、自动判红未登记偏离），验收轮用 C 抽查 22 条 legacy ＋ 每组 2 条 ＋ 交互 7 项；**A 只用于「同代码两次运行」的字节稳定性**（本文件 D7 已用：三次运行 sha256 相同）。

## 4. 缺口清单 → 建议归属票

| # | 缺口（如实登记） | 证据 | 建议归属票 |
|---|---|---|---|
| G-1 | 95/436 场景无 Sheet「可执行命令」行（其中 4 条 legacy python／mavis 原文无 exec 路由） | D5；`.scratch/t-parity/ledger.json → dimensions.D5.noCli` | 计划类 → 二期写键票（#88 已登记 95 键无计划写键）；wizard 类 → **#86**；legacy python 类 → 登记「不移植」 |
| G-2 | Sheet 无 F3 的参数表单与必填阻断（`getMissing`） | D6 | **#86**（3 个配置型 wizard ＋ GIF 框选器落地后回引）；未落地前按 SKILL.md「文字 verify」fallback |
| G-3 | 22 条 legacy 卡上「卡级 code（python 原文）≠ Sheet CLI（新命令）」 | D5；`dimensions.D3.idChanged` | **#106 后续或新票**（需维护者拍板收敛口径） |
| G-4 | 断点三层并存（旧 `500/501/820` → 新 `820/720/640/400`），未做逐值视觉验收 | D6（Tab 形态行） | **#89**（B1 视觉锁验收；L-13 已登记） |
| G-5 | `inline` 态 `delivery.mode=file`（片段落盘而非内嵌回传） | §1.1 | **#83**（三态交付口径确认）／如需改判归 #91 |
| G-6 | 冻结实例为 v2.4.12／v2.4.13 期（81 唤醒词／12 分类；80 场景／9 分类），**不是** 436 场景版 | `.scratch/t-parity/fixtures-parse.json`（哈希对账 ✔） | 参考物；如需 436 版对照物 → **#94** 追加流程（不得覆盖既有条目） |

## 5. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 83 --since 2026-09-09T15:38:02Z --until 2026-09-09T15:42:20Z`（覆盖本席全部持锁运行；窗口内他席
`t83-review-blue.mjs`／`pnpm build` 条目见下方 GATE-RELAX）。

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

GATE-RELAX flag=--allow-undeclared reason=同一票号 83 有并发 session 在跑（窗口内 runId=43cd77c4… 的 `pnpm build` 与 runId=a3b993f1… 的 `node docs/research/t83-review-blue.mjs` 均非本席运行，无法代其声明）；本席 11 条运行已逐条声明，反向对账其余条目属他席
```

> 上表 §1 的 `--params` 为**可读写法**；本块按 `gate-runs.log` 的**转义原文**书写（`\"{\\\"mode\\\":\\\"inline\\\"}\"`），
> 供 `check-gate-audit.mjs` 逐字匹配（归一化后两侧同为 `--params "{\"mode\":\"inline\"}"`）。

- 11 条声明全部 `exit=0`（无需 `--allow-nonzero`）；`--allow-undeclared` 的放宽理由已按 §6 写进本文件。
- 逐条 runId ↔ 命令 ↔ 产物哈希的对应关系见 §1 表与 `.scratch/t-parity/gen-manifest.json`。

**对账输出（实测）**：

```
$ node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-ledger.md --ticket 83 `
    --since 2026-09-09T15:38:02Z --until 2026-09-09T15:42:20Z --allow-undeclared
证据：D:\ilife\docs\research\t-help-parity-ledger.md
审计：D:\ilife\.scratch\locks\gate-runs.log（RUN 条目 682 条；窗口内 13 条，ticket=83）
声称运行 11 条
反向对账：窗口内无人声明的 RUN 条目 2 条（43cd77c4 pnpm build／a3b993f1 t83-review-blue.mjs，均他席）
RESULT: matched=11/11 auditEntries=682 scoped=13 undeclared=2
gate-audit: PASS
```

## 6. 自检（#124 事故面）

```
$ (Get-Content packages\skill-calorie\SKILL.md -AsByteStream -TotalCount 3) | % { '{0:x2}' -f $_ }
2d 2d 2d          ← 非 00 00 00（#124 零填充事故未复现）

$ MUT-\d 残留扫描（packages/skill-calorie/src ＋ tooling ＋ docs）
src/tooling 命中 0；docs 命中仅历史证据/变异脚本内的**登记性引用**（t82-mutate.mjs、t83-review-blue-mut.mjs、t88/t97 台账等），非本席引入
```

- 本席零改动 `packages/**`／`tooling/**`／既有 `docs/**`（`git status` 仅见本席新增的 3 个脚本 ＋ 本文件）。
- 产物未做任何手工编辑；三态 sha256 与生成时一致（§1）。

## 7. 复跑（逐字命令）

```powershell
$env:SKILLS_DB_PATH = "D:\ilife\.scratch\final-db"
node docs/research/t-help-parity-gen.mjs                      # 持锁 build ＋ 三态生成 → gen-manifest.json（RESULT: 31/31）
node docs/research/t-help-parity-extract.mjs                  # 两侧结构化解析 → {old,new,fixtures}-parse.json（RESULT: 18/18）
node docs/research/t-help-parity-compare.mjs                  # 七维度台账 → ledger.json（RESULT: 12/12）
node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-ledger.md --ticket 83 `
  --since 2026-09-09T15:38:02Z --until 2026-09-09T15:42:20Z --allow-undeclared
```

- 旧侧路径可覆盖：`--old "D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html"`；冻结实例目录可覆盖：`--fixtures fixtures/help-instances`。
- 三脚本均**只读**旧侧与冻结实例，只写 `.scratch/`；`gen.mjs --skip-build` 可复用已构建 `dist/`。

## 8. 产物／中间件清单（`.scratch/`，不入库）

| 路径 | 字节 | sha256／说明 |
|---|---:|---|
| `.scratch/final-db/calorie_html/身材照HELP_20260909_234219.html` | 1,264,822 | `f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2` |
| `.scratch/final-db/calorie_html/身材照HELP_20260909_234219_2.html` | 994,295 | `8c1683daacf8af9a98cc62e3a33c044efcece0d5b2e813299ebaeefedabc14f0` |
| `.scratch/final-db/calorie_html/身材照HELP_20260909_234219_3.html` | 24,989 | `92425e0abb47e6268dbb19ecc7f66272f375b75259cf3ab768737f508934d8bb` |
| `.scratch/t-parity/gen-manifest.json` | — | 三态逐字命令／runId／exit／envelope／哈希 |
| `.scratch/t-parity/old-parse.json` | — | 旧侧解析（302,820 B／`940939c772b3d304b1f59ff4557501ffa33ab1677dea8c8fef7617beb91118cc`） |
| `.scratch/t-parity/fixtures-parse.json` | — | 两冻结实例解析（哈希与 `SHA256SUMS.txt` 对账 ✔） |
| `.scratch/t-parity/new-parse.json` | — | 三态新侧解析 |
| `.scratch/t-parity/ledger.json` | — | 七维度 41 行机器可读台账 |

**旧侧参考哈希**：F3 根镜像 `940939c772b3d304b1f59ff4557501ffa33ab1677dea8c8fef7617beb91118cc`（302,820 B）；
冻结实例 `56807c11bd32be7afd7a3a2623ee1a79ef2bf41e6ecb08077b758de144befa28`（65,366 B）／
`1c7a0f1168fb34badbc83e73115ad4d6dd6fb9b9f7b677d2f0aee8184d84e8c1`（73,811 B）——三者本席**只读**，未改一字节。
