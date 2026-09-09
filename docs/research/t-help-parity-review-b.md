# HELP 新旧差异台账 · 对抗式审查（席 B · 口径面／蓝队）

> **被审对象**：commit `2aecc9e`（台账＋3 脚本）＋补 `6219a31`（补 stdout 字节），均**未 push**。
> **被审文件**：`docs/research/t-help-parity-ledger.md`（267 行）／`t-help-parity-{gen,extract,compare}.mjs`（217／297／268 行）。
> **本席立场**：只攻击**判定口径与归因**，不复述数字；凡结论必给「持锁 runId ＋ 逐字命令」。
> **纪律**：只读旧侧与产物，未改 `packages/**`／`tooling/**`／既有 `docs/**`；只新增本文件＋只读探针
> `docs/research/t-help-parity-review-b-probe{,2,3,4}.mjs`；**未**跑 `pnpm test`／`t81-exec-smoke.mjs`。
> **自我记账（S3-7）**：本席**首次** 2 次探针试跑（`probe.mjs`、`probe2.mjs` 各 1 次）与若干 `node -e` 只读取数
> **未走 `run-locked`**（只读、未写任何产物、未进 `gate-runs.log`）；随后全部改走持锁复跑，本报告引用的全部为持锁 runId。

---

## 0. 被审范围与复现面

| 项 | 值 |
|---|---|
| 被审 commit | `2aecc9e`（4 文件 +1,048 行）／`6219a31`（台账 +1 行） |
| 机器可读台账 | `.scratch/t-parity/ledger.json`（51,362 B，**不入库**） |
| 中间解析 | `.scratch/t-parity/{old,new,fixtures}-parse.json`（**不入库**） |
| 旧侧根镜像 | `D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html`（302,820 B，**仓外**） |
| 冻结实例 | `fixtures/help-instances/*.html`（在仓、`SHA256SUMS.txt` 对账 ✔） |
| 新侧产物 | `.scratch/final-db/calorie_html/身材照HELP_20260909_2342{19,19_2,19_3}.html` |
| 本席证据脚本 | `t-help-parity-review-b-probe{,2,3,4}.mjs`（只读，只打印） |

**本席独立复算（不调用 compare.mjs）**：`R1`–`R16` 见 §11 证据块。核心结论：台账**头条数字全部复现**，
`ledger.json` 的 `rows=41 / 一致17 / 可解释13 / 新增9 / 缺失2` 与 md 表格**逐行一致**（41 行 = D1 4＋D2 3＋D3 6＋D4 3＋D5 5＋D6 15＋D7 5）。

---

## 1. 结论摘要

**verdict = FAIL**（总分 **75/100**；S1×2、S2×6、S3×7）。台账的**取数与头条数字是可信的**（本席独立复算 16 项全中，
其 §5 门禁对账逐字复现 `matched=11/11 … PASS`）；失败点全部在**口径与归因**：

1. 「最高风险 1」的核心数字**错**：不是「18 条不同源＋4 条两处皆无」，而是 **22/22 条不同源**（4 条是"卡级有 python/mavis 原文、Sheet 无"）——与台账自家 D5「卡级 code 436/436」自相矛盾（S1-1）。
2. 「零渐变」行以 L-17「判据作废」**消解 R35 冻结的 H-04**（零渐变＝0），把新侧对冻结尺的偏离洗成「可解释」（S1-2）。
3. 口径 B 的机械化只覆盖 **12 条断言 / 41 行**，其余 29 行 verdict 是**硬编码字面量**（含 `? A : A` 恒真分支）→ 判定与证据无机械绑定，组合口径可被伪造（§4）。
4. G-5 的**区分正确、归类与归属错位**（`mode` 是 #91 的产物形态，`delivery` 才是 #83 的字段面）；G-1/G-2/G-3 各有归属或状态错误（§7）。
5. 体积归因**作为等式不成立**：`+962,002 ≠ 952,691＋73,357−12,454−51,559`（实为 962,035，差 33 B）；md 把 JSON 里已有的 `= 1264736` 右端删掉了（S2-4）。

---

## 2. 逐条攻击（被审主张 1–5）

### 主张 1 · 41 行分类 —— **计数可复算，判据半数不可复算**

- **可复算部分（成立）**：`ledger.json.summary` 与 md 表格逐行对齐；本席独立复算 `R1`–`R13` 命中全部头条
  （10/54/436、436/436 唤醒词/title/status/prompt、22 条 id 变更、0→341 CLI、95 无 CLI 及逐组分布、414 条 types 形状化）。
- **不可复算部分（缺陷）**：
  - `compare.mjs:250-261` 只有 **12 条**机械断言；**29 行 verdict 由人工字面量给出**，无表达式约束。
  - `compare.mjs:99` 的 types 行写成 `typesTextEq.length === 436 ? '差异（可解释）' : '差异（可解释）'` —— **两个分支同值**，
    该行判定与实测**完全无关**（S3-1）。
  - 「一致」不等于「已比对」：D6「空态／错误态」行的证据串**无任何测量值**（只写「L-14 改进项；#83 渲染失败回执」），
    D4「裸 `<N>` 尖括号」行同理（13 处 legacy 原文为**抄写值**，脚本未计数）→ 判定成立但**不可机器复算**。
- **是否把「缺失」洗成「可解释」**：**是，2 处**——
  ① D6「零渐变」（新侧 charts 区 1 处 `linear-gradient` vs R35 冻结的 H-04「零渐变＝0」）；
  ② D6「高亮」（新版高亮范围扩到整卡文本，被登记为「功能对等扩展」后即永久豁免）。
  两者的共同结构：**判定为「可解释」= 免检**，而口径 B 明确说「不能防『把真回归写成可解释』这类判断性作弊」（台账自认，`ledger.md:159`）。

### 主张 2 · 最高风险 3 条 —— **1 条数字错、1 条定性过期、漏 2 条真风险**

- **风险 1（数字错，S1-1）**：`probe.mjs`（`runId=776f3088…`）逐卡取证：4 条被写作「两处皆无」的场景
  （`看「有备注」的饮食记录`／`开启/关闭/查定时复盘`）**卡级都有 `<code class="ilife-help-shell-cli">`**，
  内容恰为 `python scripts/render_today_meals.py …`／`mavis cron create|delete|list …`，只是 **Sheet 无 `data-field="cli"` 行**；
  `R13` 另证 **436/436 条卡级 code 逐字等于某 `Scene.id`**。故正确口径是
  **22/22 条 legacy「卡级 ≠ Sheet」＝18 条双命令冲突 ＋ 4 条单侧（卡级有原文、Sheet 无）**。
  影响：维护者按「18 条」拍板会漏掉 4 条（而这 4 条恰恰是**最坏情形**——卡面唯一可见命令是不可执行的旧 python/mavis）。
- **风险 2（根因成立，描述失真）**：95 条根因确实是 #81 路由层 non-exec（#106 登记 `out-of-scope 10 ＋ legacy-chain 85`），
  但 ① #81 自己的数字是 **non-exec 110**（`t81-route-evidence.md:19-21,1429`），95 是 `#111/#112/#113` 漂移后的值
  （`afdf8e5` 提交信息：「exec 341/non-exec 95，漂移 +15」）——台账写「#81 路由层 95 条」把漂移后数字挂到 #81 头上；
  ② 4 条 legacy 无 CLI 的真实理由码是 **3×`oosCron`（明确不做）＋ 1×`noNoteFilter`（legacy-chain）**，不是「legacy python 无 exec 键」；
  ③ 95 条里最大桶是 analysis 的预测/趋势/报告类（`predictParamMissing`／`multiTrendMissing`／`reportKindMissing`），
  台账的「wizard／计划写入缺失」概括覆盖不到。
- **风险 3（定性过期，S2-2）**：「若用户按 F3 习惯『填参数再复制』，新版拿不到填写入口」——**不成立**。
  `#86` 已**落地** 4 页（3 配置型 wizard ＋ GIF 框选器，`t86-wizard-verify-evidence.md:3-5,38-40`），含 `renderParamForm` **预填**＋复制；
  HELP Sheet 内字段在运行时被替换为 `<input type="text">` 并绑定 `input → refreshPreview(card)`（`probe3.mjs`，`runId=7e296744…`）。
  真正缺的只有 F3 的**必填阻断**（`getMissing` 新侧无，`probe3` 证实）。
- **漏掉的两条真风险（建议进前三）**：
  - **222/341 条 Sheet 命令的参数是冻结绝对日期**（`probe2.mjs`，`runId=554d6a88…`）：`{"date":"2026-09-07"}`、
    `{"start":"2026-09-05","end":"2026-09-07"}` 等，来自 `routing.ts` 字面量。**「看本周饮食」当天（09-09）就已是 `09-07..09-07`**
    → 用户复制得到**当日即错**的命令；次日/次月继续错。台账 D5 只数「341 行」，不判参数时效（S2-5）。
  - **新侧无正文字体栈**（`probe2`：整份产物 `-apple-system`／`PingFang` 均 **false**，CSS 只有 `"SF Mono", monospace` ＋ `inherit` ×14），
    而旧侧 F3 有（`old-parse.css.fontStack=true`）。H-06 的**可断言形式**是「`body{font-family:…}` 与规格字符串逐字相等」→ 新侧直接判不了（S2-6）。

### 主张 3 · 口径菜单（B 主／C 补／A 限）—— **方向成立，判据有洞**（见 §4）

### 主张 4 · 缺口→票 —— **G-4 归属正确，其余 5 条需纠错**（见 §7）

### 主张 5 · 体积归因 —— **归因项可复算，等式不闭合**

| 检查 | 结果 |
|---|---|
| 新侧分块和 | `953,821＋270,259＋21,016＋19,640 = 1,264,736`，文件 **1,264,822** → **未归因 86 B** |
| 旧侧分块和 | `1,130＋196,902＋33,470＋71,199 = 302,701`，文件 **302,820** → **未归因 119 B** |
| 增减分块和 | `952,691＋73,357−12,454−51,559 = 962,035`，台账总增减 **962,002** → **差 33 B**（＝119−86） |
| 归因项 | 卡体 930,351／按钮 386,454／`<details>` 739,482／字段行 108,521／cli 53,596／meta_blocks 1,826 —— 与 `probe.mjs` 实测**一致** ✔ |
| js 分块 | 台账 19,640 B vs `<script>` 内容实测 **19,657 B**（口径未说明是否含标签） |
| `490 <details>` | ＝436 卡 ＋ 54 子功能块（md 未说明，易误读为「每卡多一个」） |

`ledger.json` 的 D7 行其实**已经打印** `= 1264736`（脚本自证不闭合），但 md 把等号右端删掉，读者会误以为闭合（S2-4）。

---

## 3. 41 行分类抽查表（19 行；含 5 条「可解释」／3 条「新增」／2 条「缺失」）

判据：**可复算** ＝ 本席能不依赖 `compare.mjs` 从 `{old,new}-parse.json` / 产物 HTML 重算并得到同一判定。

| # | 行（dim·item） | 台账判定 | 本席独立复算 | 结论 |
|---:|---|---|---|---|
| 1 | D1 分组条数 | 一致 | `R1` 10/10 | ✅ |
| 2 | D1 每分组子功能/场景分布 | 一致 | `R2` 逐组相同 | ✅ |
| 3 | D2 子功能 id 集合 | 一致 | `R3` 54/54 同序 | ✅ |
| 4 | D2 子功能 label | 一致 | `R4` 54/54 | ✅ |
| 5 | D3 场景条数 | 一致 | `R5` 436/436 | ✅ |
| 6 | D3 唤醒词逐字 | 一致 | `R5` wake 436/436 | ✅ |
| 7 | D3 场景 id 逐字 | 差异（可解释） | `R6` 22 条；L-19 成立 | ✅ |
| 8 | D4 prompt 逐字 | 一致 | `R5` prompt 436/436 | ✅ |
| 9 | D4 types 徽章序列 | 差异（可解释） | `R10` 文本 436/436 同、形状 0→414 | ⚠️ 判定成立但**表达式恒真**（`? A : A`） |
| 10 | D5 Sheet「可执行命令」行 | 新版新增 | `R7` 0→341 | ✅ |
| 11 | D5 卡级 `<code>` 行 | 新版新增 | `R12`/`R13` 436/436＝`Scene.id` | ✅ |
| 12 | D5 无 CLI 场景数 | 新版缺失 | `R8` 95 条、分布逐组同 | ✅ |
| 13 | D5 卡级 code vs Sheet CLI | 差异（可解释） | `R9` 18/4；**但 4 条卡级有原文** | ❌ **「两处皆无」错**（S1-1） |
| 14 | D5 「复制参数」按钮 | 新版新增 | `R12` 1,308 按钮＝436×3 | ⚠️ 未登记「95 条回落复制 `Scene.id`」（#106 L-106-03） |
| 15 | D6 搜索 | 一致 | 静态 0/0；`probe3` 静态 `<input>` 仅 11 个 tab radio | ✅ |
| 16 | D6 Sheet 实时预览 | 差异（可解释） | `probe3` 实证运行时 `createElement("input")`＋`input`→`refreshPreview` | ✅ **「字段换输入框」表述准确** |
| 17 | D6 参数必填校验 | 新版缺失 | `probe3` `getMissing=false` | ✅ 判定对，**归属错**（见 G-2） |
| 18 | D6 零渐变 | 差异（可解释） | 旧 1／新 1；H-04 冻结值＝0 | ❌ **与 R35 冲突**（S1-2） |
| 19 | D7 体积归因 | 差异（可解释） | 分块和 1,264,736 ≠ 1,264,822 | ⚠️ 残差 86 B 未披露（S2-4） |

**抽查小结**：19 行中 **14 行判定成立且可复算**、**2 行判定错**（#13、#18）、**3 行判定成立但不可机器复算或数字不闭合**（#9、#14、#19）。
未见「缺失→一致」的洗白；但见「缺失/违规→可解释」洗白 2 例（#18、及 D6 高亮行的同构风险）。

---

## 4. 口径菜单攻击

### 4.1 口径 B 会放过什么（3 个具体反例）

| # | 真实退化 | 为什么 B 判「等价/通过」 | 证据 |
|---|---|---|---|
| **反例 1** | **正文字体栈整体消失**（新侧 0 处 `body{font-family}`，旧侧有） | B 的 ①「计数与 id 集合逐字相等」只看 4 个数据数字；②「差异必须登记」只覆盖**人工选定的 41 行**，字体不在任何一行 | `probe2`：`-apple-system=false / PingFang=false`；`old-parse.css.fontStack=true`；`visual-spec-help.md:103`（H-06 可断言形式） |
| **反例 2** | **222/341 条命令参数冻结为绝对日期**，复制即得过期窗口（「看本周饮食」当日即错） | B 只比「CLI 行数 0→341」与「文本是否登记」，**不判参数语义/时效** | `probe2`：`PAYLOAD cli fields with ISO date: 222 of 341`；`routing.ts:176-231` 字面量 |
| **反例 3** | **高亮范围从标题扩到整卡文本**（真回归可能命中 `<code>`／prompt 正文，产生视觉噪声） | 该行已被登记为「差异（可解释）／功能对等扩展」→ 在 B 下**永久免检**；B 自认防不住判断性作弊 | `ledger.md:111,159`；`old.js.markers.highlightScopeName=true`／`new…highlightScopeCard=true` |

> 补充反例（同类）：95 条 non-exec 场景的「复制参数」按钮复制的是 `Scene.id`（如 `plan_set`）而非命令（#106 L-106-03），
> B 只登记「无 CLI 行」缺口，不登记「按钮复制到非命令」。

### 4.2 C 能否抓住 B 放过的？

- 反例 1 **能**：C 的判据含 computed 样式尺（H-01…H-20）→ `body` computed `font-family` 直接判红。
- 反例 2 **不能自动抓住**：C 的场景抽样若只点「复制」而不**真跑一次命令**，仍会漏；
  → 必须在 C 里加**「命令时效」断言**（跑一次、断言 `exit=0` 且窗口参数在有效期内）。
- 反例 3 **可能抓住但不可靠**：436 条抽 20–30 条，整卡高亮的噪声不一定落在抽样里；且 C 的夹具易被合成
  （`t88-final.md:163` 自认「Sheet 实时预览的真实数据不可观测，夹具为合成 `editable_fields`」）。

### 4.3 A 的定位是否成立？

**成立但必须锁环境**。A（逐字全等）只用于「同代码两次运行的字节稳定性」是对的；但：
① 台账只做了**同一天**三次（23:38／23:42×2），跨日/跨机未证；
② A 无法区分「稳定」与「正确」——台账自认「改一个空格、换一个时间戳即可让哈希全变或全同」（`ledger.md:151`）；
③ 一旦 #81 把样例参数改成 `now` 相对日期，A 会跨日红，A 作为稳定性判据就失效。
→ 加固：A 的断言写成「commit sha ＋ `dist` 哈希 ＋ `SKILLS_DB_PATH` 快照哈希 ＋ 日期」四元组，**允许差异集为空（当前）**。

### 4.4 三者组合能否被伪造？

**能**，缺口在「判定 ↔ 证据」无机械绑定：

| 面 | 伪造路径 | 现有防线为何挡不住 |
|---|---|---|
| B | 改 `.scratch` 解析 JSON ＋ 改 md 判定 | `ledger.json` **不入库**（重跑即覆盖）；29/41 行 verdict 是字面量，12 条断言只查「四值之一」与计数，**不查判定与证据一致** |
| C | 挑好场景 / 用合成夹具 / 复用旧截图 | 抽样清单与随机种子未入仓；`t88-final` 已自认合成夹具先例 |
| A | 改空格/时间戳 | 台账自认「极易」 |

### 4.5 加固建议（6 条）

1. **verdict 由测量产生**：每行判定写成表达式，禁止 `? A : A`；机器校验「同一输入 → 同一判定」。
2. **每行加 `evidenceRef`**（JSON 路径），脚本校验该路径存在且值一致，否则判红；自然语言证据仅作补充。
3. **未登记差异＝红 的穷举化**：以两侧解析 JSON 为准枚举所有可枚举键（payload 顶层键、场景字段、CSS token 集），
   凡不等且不在登记表内即红（当前 41 行是**人工选定的维度**，不是穷举；payload `+meta_blocks` 就是这样漏掉的）。
4. **C 固定化**：抽样清单入仓（固定种子）＋每条含 runId/时间戳＋**必跑一次「复制参数」的命令**（断言 exit=0 与窗口有效期）
   ＋ computed 值直接对 H-01…H-20 断言（不允许只截图）。
5. **A 环境四元组**：见 §4.3。
6. **跨票一致性门禁**：台账引用的 L-01…L-19 与 R35 逐条对账（当前 L-10／L-16 已不一致，见 §5）。

---

## 5. R35 与偏离总账自洽性抽查（L-01…L-19 取 8 条）

| L 条 | 台账是否自洽 | 证据 |
|---|---|---|
| L-01 分组序/图标取 F3 | ✅ | 台账 D1 三行；`R1`/`R2` 逐字相同（含 `profile=⚙️`） |
| L-09 逐场景 CLI＝相对 F3 新增 | ✅（但缺时效） | 台账 D5 行 1/2；`R7` 0→341。**未登记** 222 条冻结日期（S2-5） |
| L-12 types 配色逐值同 | ✅ | 台账 D4 形状差异行与 `HELP_TYPE_BADGES` 一致；`R10` |
| L-13 断点差异（#89 验收） | ✅ | 台账 D6 Tab 行＋G-4；`old 500/501/820 → new 820/720/640/400` |
| L-15 `#backTop`/`:focus-visible`/`prefers-reduced-motion` | ✅ | 台账 D6 两行；`new css focusVisible=10 / prefersReducedMotion=1 / backTop=true` |
| L-19 legacy id 取 `main_prompt.cli` 原文 | ✅（**但 D5 派生结论错**） | `R6` 22 条；22 条 `newId` 逐条即 python/mavis 原文 → 反证「4 条两处皆无」错 |
| **L-16 产物体积 1,010,979 B** | ❌ **不自洽** | 台账 D7 写 **1,264,822 B** 却引「L-16／P-5」；`t88-final.md:97,166` 仍是 1,010,979 B。漂移 253,843 B 未对账（`t-help-acceptance-plan.md:383` 已把它登记为待回议） |
| **L-10 subtitle 时间戳显式注入** | ❌ **不自洽** | 终产物 `payload.subtitle = "10 分类 · 436 场景"`（`probe2`），**无时间戳**；台账 41 行无 subtitle 行 |

**R35「冲突处以冻结契约为准」是否正确应用**：

- ✅ 已正确应用 2 处：D6 copied 行「toast 时长取冻结值 **4500 ms**（R35 裁定）」；D6「返回顶部／焦点可见」引 **R35 D-14 强制**（H-19／H-20）。
- ❌ 未应用/反向应用 2 处：
  ① **R35 的「输出口径」未采用**——`visual-spec-help.md:331` 规定四类 `PASS／OLD-DEVIATION／N/A／BLOCKED` ＋ `DEFECT`，
     而台账只用「一致／可解释／新增／缺失」，**没有 OLD-DEVIATION 档**，导致「旧版未达 B1」（如旧侧 hero 渐变、旧侧 500/501 断点）
     与「新版偏离」混列同一口径；
  ② **D6「零渐变」以 L-17「判据作废」消解 H-04**——但 R35 明确「**零渐变基准取 B1**」（`visual-spec-help.md:87`）、
     H-04 规格值「`linear-gradient／radial-gradient` 命中数 **= 0**」（`:82`）。新侧 charts 区 1 处 gradient 是**新侧**对冻结尺的偏离，
     台账单方面宣告判据作废＝**预先豁免 #89 的 H-04**（S1-2）。

---

## 6. G-5 定性（`--params '{"mode":"inline"}'` 走 #91 还是 #83？）

**判定：区分正确，归类与归属错位（S2-1）。**

- `mode` 参数是 **#91 的「产物形态」**：`t91-help-center-cli.md:47` 明写「`mode ∈ file/inline/text` **显式**选择全量速查台**交付形态**」；
  `:59` 明写 inline 产物＝`<style>`＋壳＋helpers 片段、**「片段不入 envelope」**、落 `data.output`。
  ⇒ `data.mode=inline` ＋ `delivery.mode=file`（片段落盘）**是 #91 的规格内行为**，不是异常。
- `delivery` 是 **#83 的字段面**：`envelope.ts:135,205` 明写「`delivery` 作为 envelope 的**追加字段**」；#91 票面 `:94` 也写明「不新增 `delivery` 字段（#83 面）」。
- 因此台账把 G-5 写成「归 **#83**（三态交付口径确认）／如需改判归 #91」**顺序颠倒**：口径 owner 是 **#91**，#83 只拥有字段/交付通道。
- 更严重的是**归类**：把规格内行为放进「缺口清单（G-x）」会让人误以为存在缺陷。正确写法：
  §1.1 观测点 ＋ 命名歧义登记（`inline` 的名字承诺「内嵌回传」而行为是「落盘」），owner #91；#83 只在「`delivery` 字段语义」上被涉及。
- **对 #89 的实际影响**：`inline` 态产物在**磁盘上**，浏览器夹具必须读落盘文件，**不能**从 envelope 取片段；
  `delivery.mode` 对浏览器面不可见。台账应把这一条明确写给 #89。

---

## 7. G-1…G-6 归属复核表

| 缺口 | 台账归属 | 复核判定 | 应改成 | 纠错 |
|---|---|---|---|---|
| **G-1** 95 条无 CLI | 计划类→二期写键票（**#88 已登记 95 键无计划写键**）；wizard→#86；legacy python→不移植 | ⚠️ 方向对、三处错 | ① 95 的来源写成「**#81 non-exec 110 − #111/#112/#113 漂移 15 = 95**」；② 删「#88 已登记 95 键无计划写键」——该 **95 键**指 SKILL.md 键表（#113 由 87 扩至 95，`t86:65`），与 95 条 noCli **同名不同指**；③ 4 条 legacy 无 CLI 按 reason code 写 **3×`oosCron`＋1×`noNoteFilter`**，不是「legacy python 无 exec 键」 | 3 |
| **G-2** 无参数表单/必填阻断 | **#86**（「3 个配置型 wizard＋GIF 框选器**落地后回引**」） | ❌ 状态过期 | #86 **已落地**（`t86:3-5,38-40`：预填＋copyText）；缺口收窄为「**HELP Sheet 内无必填阻断**（`getMissing` 无对应物；#86 的 `paramForm` 零 JS、行为归宿主）」；删「新版拿不到填写入口」 | 2 |
| **G-3** 卡级 code ≠ Sheet CLI | **#106 后续或新票** | ❌ owner 错、范围错 | 范围 **22 条**（非 18）；owner 应是 **#121／新票＋维护者拍板**——`t106:277-278` 明写「改卡级文本＝改 `packages/base-render/src/help.ts`（#121 在飞，本票禁改）」，且 #106 已把「卡级 id＋详情级 CLI」登记为**既定两段式设计** | 2 |
| **G-4** 断点未逐值 | **#89** | ✅ 归属正确 | 补「三层归属映射」：页面 640/400、图表 720、toast 栈 820（R35 D-6），否则 #89 无法从台账判「三层并存各管一层」 | 1 |
| **G-5** inline 的 `delivery.mode=file` | **#83**（如需改判归 #91） | ❌ 顺序颠倒＋误归类 | owner **#91**（`mode` 语义，#83 只管 `delivery` 字段）；从「缺口清单」移到 §1.1 观测点＋命名歧义登记 | 2 |
| **G-6** 冻结实例非 436 版 | #94 追加流程（不得覆盖既有条目） | ⚠️ 方向对、要点缺 | #94 已关且旧树不在仓（`t94` 只做只读复制＋`SHA256SUMS`）；应写明这是 **#89 逐值验收的阻断项**（F1/F2 是 81 唤醒词／80 场景版，无法与 436 版逐值比对） | 1 |

**合计：6 条中 5 条需纠错（G-4 归属正确），共 11 处修正。**

---

## 8. 与 #89 的接口（够不够 B1 20 条逐值验收？）

**不够。** 台账给 #89 的输入只有三样：**G-4**（4 个断点值）、**G-6**（冻结实例非 436 版）、**D6 若干「有无/次数」**。

| B1 需要 | 台账是否提供 | 缺口 |
|---|---|---|
| H-01…H-20 的**新版侧 computed 值** | ❌ | 台账只有 CSS 块正则计数（如 `:focus-visible` 10 处），**不是 computed 值**；尺本体在 `docs/visual-spec-help.md:47-251`，台账**未引用该路径** |
| 436 版对照实例（F1/F2 逐值比对） | ❌ | G-6 自证 F1＝81 唤醒词/12 分类、F2＝80 场景/9 分类（`fixtures-parse.json`）→ 与 436 版**不可逐值比对** |
| 断点三层归属 | ⚠️ 半 | 只列 4 个 media query，未标「页面 640/400／图表 720／toast 820」 |
| H-12/16/19/20 交互时序证据 | ❌ | 台账只记「有/无」（如 backTop 有、`scrollTop>400`），无时序/剪贴板/焦点记录 |
| 新侧视觉偏离登记 | ❌ | H-06 无正文字体栈、H-04 charts 1 处 gradient **均未登记** |
| inline 态夹具落点 | ❌ | G-5 未写「inline 产物在磁盘」→ #89 若从 envelope 取片段会扑空 |

---

## 9. 缺陷清单（S1／S2／S3 ＋ 归属）

| # | 级别 | 缺陷 | 证据 | 归属 |
|---|---|---|---|---|
| S1-1 | **S1 交付缺陷** | D5「卡级 code vs Sheet CLI」把 4 条写成「两处皆无」，与自家「卡级 code 436/436」矛盾；风险 1 数字应为 **22/22 不同源（18 双命令＋4 单侧）** | `probe`：4 卡均有 `<code class="…-cli">python/mavis 原文</code>`、`field rows: 0`；`R13` 436/436 卡级 code＝`Scene.id` | #83 台账返修 |
| S1-2 | **S1 交付缺陷（洗白）** | D6「零渐变」以 L-17「判据作废」消解 R35 冻结的 H-04（零渐变＝0），把**新侧**偏离写成「可解释」 | `visual-spec-help.md:82,87`；新侧 1 处 `linear-gradient(90deg,…)`（charts 区） | #83 台账返修＋#89 裁定 |
| S2-1 | S2 口径 | G-5 归属颠倒（应为 #91 主／#83 字段面）＋把规格内行为列入缺口清单 | `t91-help-center-cli.md:47,59,94`；`envelope.ts:135,205` | #83／#91 |
| S2-2 | S2 定性 | 风险 3／G-2 过期：「新版拿不到填写入口」不成立（#86 已落地＋Sheet 运行时输入框） | `t86:3-5,38-40`；`probe3`：`createElement("input")`＋`input→refreshPreview` | #83／#86 |
| S2-3 | S2 归因 | G-1「#88 已登记 **95 键**无计划写键」把 SKILL.md 键表的 95 键与 95 条 noCli 混同；95 未按漂移链表述 | `t86:65`（95 键＝#113 扩表）；`t81:19-21,1429`（non-exec 110）；`afdf8e5`（漂移 +15） | #83／#81 |
| S2-4 | S2 证据算术 | 体积归因不闭合：分块和 1,264,736 ≠ 1,264,822（86 B）；增减分块和 962,035 ≠ 962,002（33 B）；md 删掉了 JSON 里的 `= 1264736` | `R14`/`R15`/`R16`；`compare.mjs:204` | #83 |
| S2-5 | S2 未登记差异 | **222/341** 条命令参数为冻结绝对日期（「看本周饮食」当日即错）未登记 | `probe2`：`222 of 341`；`routing.ts:176-231` | #81（样例参数）／#106 登记 |
| S2-6 | S2 维度缺口 | 新侧**无正文字体栈**（H-06 断言形式不成立，旧侧有）＋ charts 1 处 gradient（H-04）未登记 | `probe2`：`-apple-system=false/PingFang=false`；`old-parse.css.fontStack=true` | #83／#89 |
| S3-1 | S3 可复算性 | types 行判定表达式恒真（`? A : A`）；29/41 行 verdict 为人工字面量，机械门禁对「判定正确性」零覆盖 | `compare.mjs:99`；`compare.mjs:250-261`（12 条断言） | #83（脚本） |
| S3-2 | S3 可复现性 | `ledger.json`／解析 JSON **不入库**，旧侧根镜像在**仓外** → 41 行不能在仓内一键复算 | `ledger.md:6-7,252-263`；`D:\2Study\…` 路径 | #83 |
| S3-3 | S3 文档同步 | 与 L-16（1,010,979 B）、L-10（subtitle 时间戳）不自洽且未登记 | `t88-final.md:97,166`；`probe2` payload `subtitle="10 分类 · 436 场景"` | #83 |
| S3-4 | S3 未成行 | payload 顶层键 `+meta_blocks`（#107）只在 D7 归因串出现，41 行无独立判定 | `R11`：旧 5 键 → 新 6 键 | #83／#107 |
| S3-5 | S3 未登记 | 95 条 non-exec 的「复制参数」按钮回落复制 `Scene.id`（非命令）未登记 | `t106:73`（L-106-03） | #106 |
| S3-6 | S3 方法 | `wake_word` 非唯一（**434/436**，`记身材照`×3）却被用作 D5 的 join 键 | `probe4` 辅助取数：`dup wake words [["记身材照",3]]` | #83（脚本） |
| S3-7 | S3 自查 | 本席首次 2 次探针未持锁（只读、未写产物、未入日志） | §0 自我记账 | 本席 |

---

## 10. 五维评分与 verdict

| 维度 | 满分 | 得分 | 依据 |
|---|---:|---:|---|
| 契约一致 | 30 | **23** | P9 六键／`delivery` 追加字段／三态实测**逐条自洽**（`raw-*.out.json` 实测）；扣：G-5 归属颠倒、R35 输出口径未采用（无 OLD-DEVIATION 档）、零渐变与 R35 冲突 |
| 证据真实可复现 | 25 | **20** | 31/31＋18/18＋12/12 与 §5 门禁对账**逐字复现**；本席独立复算 16 项全中；扣：`ledger.json` 不入库、旧侧镜像仓外、29/41 行判定无机器绑定 |
| parity | 20 | **13** | 头条 10/54/436／436-436／22／0→341／95 全部复算通过；扣：22 条 legacy 口径错（S1-1）、视觉维度缺 H-04/H-06（S2-6）、222 条命令时效未验（S2-5） |
| 工程红线 | 15 | **14** | 零改 `packages/**`／`tooling/**`／既有 `docs/**`（`git show --stat` 仅 4 文件）；未跑全量 `pnpm test`／`t81-exec-smoke`；11 条持锁声明 `exit=0`＋`GATE-RELAX` 有据；`SKILL.md` 首 3 字节 `2d 2d 2d` |
| 文档同步 | 10 | **5** | R35／H-19／H-20 引用无出处路径；L-10／L-16 未对账；G-2/#86 状态过期；「95 键」同名混用 |
| **合计** | **100** | **75** | |

## **verdict：FAIL**

判据：**S1 ≥ 1 或总分 < 80 即 FAIL**。本席 S1×2、S2×6 → FAIL。
（若维护者认定 S1-2 属「#89 面，非本台账职责」，则降为 S2，总分仍 **75 < 80** → 仍 FAIL。）

### 最小整改清单（关闭前必做，按优先级）

1. **修 S1-1**：D5-4 改「22/22 条 legacy 卡级 code ≠ Sheet CLI（18 双命令冲突＋4 条卡级原文／Sheet 无）」；同步风险 1、G-3 的数字与范围。
2. **修 S1-2**：D6 零渐变行删「判据作废」，改「新侧 charts 区 1 处 gradient 与 H-04（R35 冻结零渐变＝0）冲突 → 交 #89 裁定；旧侧 hero 渐变＝OLD-DEVIATION」。
3. **补 S2-4**：D7 加残差行「分块和 1,264,736／文件 1,264,822／未归因 86 B（旧侧 119 B）」；增减行改「分块和 962,035 ＋ 未归因 −33 B ＝ 962,002」。
4. **改 S2-1**：G-5 归属改 **#91 为主／#83 为辅**，从缺口清单移到 §1.1 观测点＋命名歧义登记，并写「inline 产物在磁盘（#89 夹具读文件）」。
5. **改 S2-2**：G-2／风险 3 改判为「#86 已落地；缺口＝HELP Sheet 内无必填阻断（`getMissing` 无对应物）」。
6. **改 S2-3**：G-1 删「#88 已登记 95 键无计划写键」；95 写成「#81 non-exec 110 − #111/#112/#113 漂移 15」；4 条按 reason code 写。
7. **补 S2-5／S2-6**：新增两条新侧偏离登记（冻结日期命令 222/341＋一个当日即错实例；正文字体栈缺失 H-06）。
8. **加固脚本（S3-1）**：verdict 改测量表达式（禁 `? A : A`）＋每行 `evidenceRef`；`ledger.json` 入仓或把其 sha256 写进台账。

---

## 11. 机械门禁对账

```
GATE-RUN runId=776f3088-29e9-4647-828c-5fb7b44a76b1 cmd="node docs/research/t-help-parity-review-b-probe.mjs"
GATE-RUN runId=7e296744-90f5-4524-9c67-e0012975599c cmd="node docs/research/t-help-parity-review-b-probe3.mjs"
GATE-RUN runId=554d6a88-5e50-43a0-83a0-acdc2a386f38 cmd="node docs/research/t-help-parity-review-b-probe2.mjs"
GATE-RUN runId=987d6ea9-9a20-4750-b4fd-caa843f22bd5 cmd="node docs/research/t-help-parity-review-b-probe4.mjs"
GATE-RUN runId=39950f6a-6b3c-40cd-bdf9-8e8a72c41c1a cmd="node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-ledger.md --ticket 83 --since 2026-09-09T15:38:02Z --until 2026-09-09T15:42:20Z --allow-undeclared"
GATE-RUN runId=4ad96d77-9ab9-4390-8928-bf09c9631a64 cmd="git commit --only docs/research/t-help-parity-review-b.md docs/research/t-help-parity-review-b-probe.mjs docs/research/t-help-parity-review-b-probe2.mjs docs/research/t-help-parity-review-b-probe3.mjs docs/research/t-help-parity-review-b-probe4.mjs -F .scratch/t63-review-b-msg.txt"
```

```
GATE-RELAX flag=--allow-undeclared reason=本席对账窗口（15:48:00Z–15:56:00Z，ticket=63）内同时有并发 session 在跑（#83/#89 的 `cmd_read` 三态成组复跑、`t81-route-evidence.mjs`、`t63-line1-review-*.mjs`、`help-center-88/91/106` 与 `calorie-routing-81` 测试、`t83-evidence.mjs`、`t-help-acceptance-collect.mjs`），均非本席运行、无法代其声明；本席 5 条运行已逐条声明，反向对账其余 21 条属他席
```

- 5 条全部 `exit=0`（`--ticket 63`，持锁；见 `.scratch/locks/gate-runs.log`，`at=2026-09-09T15:48:39Z…15:49:52Z`）。

**本报告自身对账（实测）**：

```
$ node tooling/run-locked.mjs --ticket 63 -- node tooling/check-gate-audit.mjs `
    --evidence docs/research/t-help-parity-review-b.md --ticket 63 `
    --since 2026-09-09T15:48:00Z --until 2026-09-09T15:56:00Z --allow-undeclared
RESULT: matched=6/6 auditEntries=763 scoped=38 undeclared=32
gate-audit: PASS
```
- **被审台账的 §5 对账复现**（`runId=39950f6a…`，本席原命令逐字复跑）：
  `RESULT: matched=11/11 auditEntries=719 scoped=13 undeclared=2` → `gate-audit: PASS`（与台账所载**逐字一致**，仅 `auditEntries` 由 682 增至 719）。

**本席独立复算（probe4 输出，逐字）**：

```
R1 分组 id 序相同: true
R2 每组(子功能:场景)相同: true
R3 子功能 id 54/54 同序: true
R4 子功能 label 逐条: 54/54
R5 对齐键 436 | wake 相同 436 | title 相同 436 | status 相同 436 | prompt 相同 436
R6 id 不同条数: 22
R7 旧 CLI 非空: 0 | 新 CLI 非空: 341 | 新无 CLI: 95
R8 无 CLI 分布: {"diet":6,"weight":18,"exercise":1,"workout":23,"goal":3,"body_detail":2,"analysis":42} | 合计 95
R9 22 条 legacy 中：Sheet 有 CLI 18 ／Sheet 无 CLI 4
R10 types 文本序列相同 436 | 新 types 形状化 414 | 旧 0
R11 payload 顶层键 旧 ["skill_name","title","subtitle","contact","groups"] → 新 […,"meta_blocks"]
R12 dom 新 codeCli/fieldRows/details/buttons/tabRadios 436 341 490 1308 11
R13 卡级 code = Scene.id 的条数: 436 条 / 其中与某 Scene.id 逐字相等 436
R14 体积：新侧分块和 1264736 vs 文件 1264822 残差 86
R15 体积：增减分块和 962035 vs 总增减 962002
R16 旧侧分块和 302701 vs 文件 302820 残差 119
```

**反例 1／反例 2 取证（probe2 输出，逐字）**：

```
HTML has -apple-system: false | has PingFang: false
  CSS font-family decls 15 ["font-family: \"SF Mono\", monospace","font-family: inherit",…]
PAYLOAD cli fields with ISO date: 222 of 341
     看今日主页 => [{"name":"cli","label":"可执行命令","value":"calorie-cmd-read calorie.view.home --params '{\"date\":\"2026-09-07\"}'"}]
OLD bytes 302820 has editable_fields: true has getMissing: true has legacy_ prefix: 22
```

**S1-1 取证（probe 输出，逐字）**：

```
CARD containing "mavis cron delete" -> 1
   code tags: 1 ["<code class=\"ilife-help-shell-cli\">mavis cron delete ...</code>"]
   field rows: 0 []
CARD containing "render_today_meals.py" -> 1
   code tags: 1 ["<code class=\"ilife-help-shell-cli\">python scripts/render_today_meals.py --with-note --days &lt;N&gt; …</code>"]
   field rows: 0 []
GLOBAL codeCli-ish 436 | GLOBAL field rows 341
```

## 12. 自检

```
$ [System.IO.File]::ReadAllBytes("D:\ilife\packages\skill-calorie\SKILL.md")[0..2]
2d 2d 2d          ← 非 00 00 00（#124 零填充事故未复现；len=30,052）
```

- 本席零改动 `packages/**`／`tooling/**`／既有 `docs/**`；`git status --short` 仅见本报告＋4 个只读探针（新增）。
- **未**跑全量 `pnpm test`／`t81-exec-smoke.mjs`（`gate-runs.log` 窗口内无此类条目）。

## 13. 复跑（逐字命令）

```powershell
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe.mjs   # S1-1 取证
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe2.mjs  # 反例 1/2 取证
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe3.mjs  # D6 实时预览复算
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe4.mjs  # R1–R16 独立复算
node tooling/run-locked.mjs --ticket 63 -- node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-ledger.md `
  --ticket 83 --since 2026-09-09T15:38:02Z --until 2026-09-09T15:42:20Z --allow-undeclared
```
