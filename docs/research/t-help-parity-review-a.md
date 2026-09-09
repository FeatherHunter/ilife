# HELP 新旧差异台账 · 对抗式审查席 A（数据面/红队）

> **被审**：commit `2aecc9e`（`docs/research/t-help-parity-{gen,extract,compare}.mjs` ＋ `t-help-parity-ledger.md`）＋ 补 `6219a31`（台账补 stdout 字节）。
> **被审产物**：`.scratch/final-db/calorie_html/*.html`（三态）／`.scratch/t-parity/*.json`（中间件）。
> **本席立场**：独立重算，**不复用**被审产物与中间 JSON。凡数字必自跑；凡结论必给可复跑命令。
> **纪律**：全部持锁 `node tooling/run-locked.mjs --ticket 63 -- …`；产物只落 `.scratch/review-a-*`；
> 只新增本文件与 `docs/research/t-help-parity-review-a-probe.mjs`；未跑全量 `pnpm test`／`t81-exec-smoke.mjs`。

---

## 0. 独立复算边界与探针

| 项 | 本席做法 |
|---|---|
| 新侧产物 | 自己的 `SKILLS_DB_PATH=D:\ilife\.scratch\review-a-db`，持锁重生成 **5 轮**（3 轮 regen ＋ 1 轮 `--same` ＋ 1 轮 **`tsc -b` 重建后** regen），共 17 个产物文件 |
| 旧侧 | 只读 `D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html`（302,820 B，sha `940939c772b3d304…`） |
| 解析器 | 自写 `t-help-parity-review-a-probe.mjs`（单遍切片 ＋ 结构化取键，**非**抄 `extract.mjs`） |
| 源码↔dist 前提 | 额外跑 `node tooling/run-locked.mjs --ticket 63 -- pnpm build`（`tsc -b`）：**440 个 dist 文件 0 变更**，重建后产物 sha 不变 |
| 中间件 | 仅 `.scratch/review-a-probe/{regen,parse-a,analyze-a,extra-a,deep-a,same-source,final-checks}.json` |

复跑（逐字）：

```powershell
node docs/research/t-help-parity-review-a-probe.mjs --regen --rounds 3   # 9 次持锁 CLI
node docs/research/t-help-parity-review-a-probe.mjs --parse              # 两侧独立解析
node docs/research/t-help-parity-review-a-probe.mjs --analyze            # 七维度重算 + 25 条逐字抽样
node docs/research/t-help-parity-review-a-probe.mjs --extra              # 卡级 code／按钮／payload 归因
node docs/research/t-help-parity-review-a-probe.mjs --deep               # 尖括号与旧侧 sheet 数据源
node docs/research/t-help-parity-review-a-probe.mjs --same               # 三态同源
```

---

## 1. 逐条攻击结论

### 主张 1 · 三态字节／sha／稳定性 —— **成立（stdout 字节：成立但为环境相关量）**

| 态 | 台账字节 | 本席实测 | 台账 sha256 | 本席实测 sha256 | 判定 |
|---|---:|---:|---|---|---|
| file | 1,264,822 | **1,264,822** | `f380ef685065a1e9…b79c2` | **逐字相同** | 成立 |
| inline | 994,295 | **994,295** | `8c1683daacf8af9a…c14f0` | **逐字相同** | 成立 |
| text | 24,989 | **24,989** | `92425e0abb47e626…d8bb3` | **逐字相同** | 成立 |

- **确定性**：每态 5 次独立运行（3 轮 regen ＋ `--same` ＋ 重建后 regen）sha256 **各只有 1 个取值**；`tsc -b` 重建（440 dist 文件 0 变更）后仍逐字相同 → 既非时间戳也非构建产物漂移，**确定性成立**（P-2）。
- **契约**：三态 exit=0、stdout 恰 1 行、顶层六键 `version,skill,shape,key,data,delivery`、`data.bytes＝delivery.bytes＝产物字节`、`data.text`（text 态）**与 text 产物逐字相等**（含尾换行）、`inline` 无 payload、`text` 无标签（唯一尖括号是命令行里的 `<N>`）——逐条实测通过。
- **stdout 字节**：台账 1,276／1,280／26,827；本席 1,282／1,286／26,829–26,833。差额 **恰为 2×Δ路径长度**（本席 DB 目录名 `review-a-db` 比 `final-db` 长 3 字符，路径在 `data.output` 与 `delivery.path` 各出现一次）。**结论：台账数字自洽，但属环境相关量，换路径即不可逐字复现**（→ S3-3）。

### 主张 2 · 七维度头条数字 —— **成立（其中 2 项表述/闭合不成立，见 §3）**

分组 **10→10**、子功能 **54→54**、场景 **436→436**、prompt **436/436 逐字**、CLI 展示 **0→341**、体积 **302,820→1,264,822（+962,002）**——六项独立重算全部复现。
两项须降级：**卡级 code「436 条＝Scene.id」实为 435/436 逐字**（S3-2）；**体积四段分块加总 962,035 ≠ +962,002**（S3-1）。

### 主张 3 · 差异 41 行（17 一致／13 可解释／9 新增／2 缺失）—— **成立（分布成立，2 行内容有缺陷）**

本席用**本席的 DB 与 out 目录**复跑被审脚本链：`ROWS 41 {"一致":17,"差异（可解释）":13,"新版新增":9,"新版缺失":2}`；`ledger.json` 逐行判定与台账表一致。但其中：
- D4「裸 `<N>` 尖括号（13 处）」→ **产物侧 0 处**（S2-1）；
- D6「键盘可达＝新版新增」→ 与台账自身 marker 矛盾（S2-2）；
- D5/D6「每卡 3 按钮＝运行时注入」→ 实为**静态 markup**（S2-3）。

### 主张 4 · `RESULT 31/31、18/18、12/12` —— **成立**

以**本席的 DB／out 目录**复跑（`--skip-build --db .scratch/review-a-db --out .scratch/review-a-run`）：

```
RESULT: 31/31 gen-checks
RESULT: 18/18 extract-checks
RESULT: 12/12 compare-checks
ROWS 41 {"一致":17,"差异（可解释）":13,"新版新增":9,"新版缺失":2}
HEADLINE old=302820B/10g/54sg/436sc | new=1264822B/10g/54sg/436sc | cli=0->341 | promptEq=436/436 | idChanged=22
```

三脚本自证陷阱分析见 §4。

---

## 2. 本席独立重算的七维度表

对齐口径：`(子功能 id, 组内序)`；并额外用 `(子功能 id, 唤醒词)` 交叉验证。

| 维度 | 项 | 旧侧（F3 302,820 B） | 新侧（本席产物 1,264,822 B） | 本席判定 | 与台账 |
|---|---|---|---|---|---|
| **D1** | 分组条数 | 10 | 10 | 一致 | ✅ |
| | 分组 id 序列 | `home>diet>weight>exercise>workout>goal>body_detail>body_photo>profile>analysis` | 逐字相同 | 一致 | ✅ |
| | label／icon | 10 组（含 `profile=⚙️`） | 逐字相同 | 一致 | ✅ |
| | 子功能/场景分布 | `3/9 9/70 8/58 5/39 6/32 3/25 4/13 4/10 3/4 9/176` | 逐组相同 | 一致 | ✅ |
| **D2** | 子功能条数 | 54 | 54 | 一致 | ✅ |
| | 子功能 id 集合 | 54 条同序 | 54/54 同序同 id | 一致 | ✅ |
| | 子功能 label | 54 条 | 54/54 逐字相同（0 处不同） | 一致 | ✅ |
| **D3** | 场景条数 | 436 | 436 | 一致 | ✅ |
| | 唤醒词逐字 | 436 | **436/436 相同**（另按唤醒词对齐 434/434，2 条同组同唤醒词，见注） | 一致 | ✅ |
| | title／status 逐字 | 436／436 空串 | **436/436 相同** | 一致 | ✅ |
| | 场景 id 逐字 | 414 条相同 ＋ 22 条 `legacy_*` | 414 相同 ＋ 22 条 `main_prompt.cli` 原文（`python…`／`mavis…`） | 差异（可解释） | ✅ |
| | id 唯一性 | 436/436 | 436/436 | 一致 | ✅ |
| **D4** | prompt 逐字 | 436 条 | **436/436 相同，差异集为空**（25 条抽样逐字，含首/尾/随机中段/legacy） | 一致 | ✅ |
| | types 文本序列 | 414 条字符串数组 | 414 条 `{text,bg,fg}`，文本逐字相同 | 差异（可解释） | ✅ |
| | 裸 `<N>` 等尖括号 | **prompt 内 0 处**（全 payload 0 处 `<`） | **prompt 内 0 处**；全产物仅 1 处（新侧 1 条 scene id，payload 内转义为 `\u003cN>`，text 态裸 `<N>`） | **不成立（13 处不可复现）** | ❌ S2-1 |
| **D5** | Sheet「可执行命令」行 | **0**（436 场景 `editable_fields` 全空） | **341**（payload `editable_fields.cli` ＝341，静态字段行 `<li class="…-field">` 亦 341，双路一致） | 新版新增 | ✅ |
| | 无 CLI 场景（缺口） | 不适用 | **95/436**（diet 6／weight 18／exercise 1／workout 23／goal 3／body_detail 2／analysis 42，合计 95） | 新版缺失 | ✅ |
| | 卡级 `<code class=cli>` | 0 | **436**；内容＝Scene.id **435/436 逐字**（i=78 为 HTML 实体转义形式）；22 条 id 本身即 `python…`／`mavis…` 命令 | 新版新增（「非命令」不成立） | ⚠️ S3-2 |
| | 卡级 vs Sheet 同源 | 不适用 | 22 条 legacy 中 **18 条两处不同源**、**4 条两处皆无** | 差异（可解释） | ✅ |
| | 「复制参数」按钮 | 0 | **436**（`data-action-id="ilife-help-copy-params"` 直接计数 436；三键各 436＝1,308 按钮） | 计数成立；**「运行时注入」不成立** | ⚠️ S2-3 |
| **D6** | 搜索／计数／空态文案 | 运行时注入（`#sB`／`#hitC`） | 运行时注入（`type=search`），文案逐字相同 | 一致 | ✅ |
| | 高亮 | 仅 `.m-name` | `wrapTerm` 整卡 | 差异（可解释） | ✅ |
| | 跳页 | `scrollTo({left})` | `jumpTo` ＋ Enter 循环 | 差异（可解释） | ✅ |
| | 返回顶部 | 无（0 处） | 有（`backTop` 标记 true） | 新版新增 | ✅ |
| | Sheet 实时预览 | `data-prev`＋`buildPrompt` | `refreshPreview`＋字段输入 | 差异（可解释） | ✅ |
| | 参数必填校验 | `getMissing`＋`请先填写` **存在**，但 F3 数据 0 条 `editable_fields`（本数据上不可观测） | 无 | 新版缺失（方向成立，旧侧「有」为代码级） | ⚠️ S3-7 |
| | copied 态／剪贴板 | `execCommand('copy')`＋回退 | `navigator.clipboard` ＋**`execCommand('copy')` 回退** | 差异（可解释）；台账漏记回退 | ⚠️ S3-6 |
| | 键盘可达 | **有**：`newIn.addEventListener('keydown', …Enter… doNew())` | 有：搜索框 Enter 循环跳页 | **不成立（台账判「新版新增」）** | ❌ S2-2 |
| | 焦点可见／动效可关 | 0／0 | `:focus-visible` **10**／`prefers-reduced-motion` **1** | 新版新增 | ✅ |
| | Tab 形态／断点 | 横滑页，断点 `500/501/820` | radio 11 个，断点 `820/720/640/400` | 差异（可解释） | ✅ |
| | 零渐变 | 1 处（135deg） | 1 处（90deg） | 差异（可解释） | ✅ |
| **D7** | file 态字节 | 302,820 | **1,264,822**（+962,002，×4.18） | 差异（可解释） | ✅ |
| | 分块构成 | markup 1,130／payload 196,902／css 33,470／js 71,199 | markup 953,821／payload 270,259／css 21,016／js 19,640 | 各值复现 | ✅ |
| | 分块增减 | — | +952,691／+73,357／−12,454／−51,559 ＝ **962,035** | **不闭合（残差 33 B）** | ❌ S3-1 |
| | 归因子项 | — | 卡体 930,351（均 2,134）／按钮 386,454／`<details>` 739,482／字段行 108,521／payload cli 53,596（341 条）／`meta_blocks` 1,826（6 入口） | 逐项复现 | ✅ |
| | inline／text 字节 | 不适用 | 994,295／24,989（521 行） | 新版新增 | ✅ |
| | 字节稳定性 | — | 5 次运行 sha 各 1 值 | 一致 | ✅ |

> 注（D3）：`body_photo_1` 内两条场景同唤醒词「记身材照」，故 `(子功能 id, 唤醒词)` 对齐只能覆盖 434 条；按 `(子功能 id, 组内序)` 对齐 436/436 且 title／wake／status 同时逐字相同 → 索引对齐成立，非掩盖差异。

**逐字抽样（25 条，`--analyze` 全量落 `analyze-a.json`）**：i=0/1/2（首）、433/434/435（尾）、75/78/182/188/196/217/218/271/300/307/327/345/357/381/400（随机中段）、415/416/417/428（legacy 组）→ **eq=true 25/25**，字节长度亦逐条相等（如 i=0 202/202、i=196 470/470、i=400 370/370）。差异集为空，**不是「归一化后相同」**——比对用 `===` 全等，无 trim／无大小写／无空白折叠。

---

## 3. 缺陷清单

### S1-交付缺陷
**无。** 四条被审主张的头条数字与产物哈希全部独立复现；未发现会使交付不可用的缺陷。

### S2（证据/判定不可复现或自相矛盾）

| ID | 缺陷 | 本席实测证据 | 归属 |
|---|---|---|---|
| **S2-1** | 台账 D4「裸 `<N>` 等尖括号｜逐字保留（**13 处** legacy 原文）」在**产物侧不可复现** | prompt_template 内 `<` 计数：旧 **0**／新 **0**；两侧全 payload 裸 `<` 0 处；新侧唯一 `<N>` 在 **1 条 scene id**（`python scripts/render_today_meals.py --with-note --days <N> …`），payload 内转义为 `\u003cN>`、卡级为 `&lt;N&gt;`、**仅 text 态裸 1 处**。13 处实为 `t88-final.md:129` 的**源码侧**计数（`scene-02-diet.ts:29` 等），台账未重算即抄用 | **#83**（本台账）；根因 `t88-final.md §5-D-4` |
| **S2-2** | 台账 D6「键盘可达｜旧＝无显式 Enter 处理｜新版新增」与**台账自身机器证据矛盾** | 旧侧 JS 实测：`newIn.addEventListener('keydown', function(e){ if(e.key === 'Enter') doNew(); });`；且 `ledger.json → dimensions.D6.oldMarkers.keyboardEnter === true`（新侧亦 true）。正确表述：旧侧 Enter 作用于「新增」输入框，新侧作用于搜索框循环跳页（**能力对等扩展，非新增**） | **#83** |
| **S2-3** | 台账 D5／D6 把每卡 3 按钮记为「运行时注入卡头」 | 静态 markup 实测 `data-action-id`：`copy-prompt` 436／`copy-wakeWord` 436／`copy-params` 436＝**1,308 个静态 `<button>`**；新侧 JS 仅 4 处 `createElement("button")`（与卡级按钮无关）。计数正确、**归因错误** | **#83** |

### S3（表述精度／算术闭合）

| ID | 缺陷 | 实测 |
|---|---|---|
| S3-1 | 体积分块增减**不闭合** | +952,691＋73,357−12,454−51,559 ＝ **962,035**，头条 +962,002，**残差 33 B**＝两侧 `script/style` 标签壳 119→86（本席以「两块 js 用 `\n` 连接」口径算为 962,034／残差 32 B）。建议补「标签壳 −33 B」一项或声明分块非穷尽 |
| S3-2 | 「卡级 code 436 条＝Scene.id」 | **435/436 逐字**；i=78 一条为 HTML 实体转义形式（`&lt;N&gt;`／`&quot;`），语义相同、字节不同。另该行括注「非命令」对 22 条不成立（其 id 本身即 `python…`／`mavis…` 命令） |
| S3-3 | stdout 字节 1,276／1,280／26,827 | 依赖 `SKILLS_DB_PATH` 与落点文件名长度：`stdoutBytes ＝ 基线 ＋ 2×ΔpathLen`（本席 1,282／1,286／26,829–26,833）。建议标注为环境相关量 |
| S3-4 | §1.1「file 产物内**逐字包含** inline 片段」 | 不成立：inline（994,295 B）**不是** file 的连续子串。实测结构：file ＝ head(163 字符) ＋ style(21,015) ＋ markup(766,634) ＋ **payload 块(179,970 字符)** ＋ helpers 脚本(18,897) ＋ 尾 `\n</body>\n</html>`(16)；inline ＝ style ＋ markup ＋ helpers（两段各自逐字相同，payload 块插在中间）。`gen.mjs` 的断言只比对 `inlineHtml.trim().slice(0,200)`，故通过 |
| S3-5 | 分块口径不一致 | `extract.mjs` 对 css 用 `join('\n')`（→33,470），对 js 用直接拼接（→71,199）；同侧两块 js 若以 `\n` 连接为 71,200。±1 B 级，但两口径混用应声明 |
| S3-6 | D6「剪贴板实现」新侧描述 | 新侧实为 `navigator.clipboard.writeText()` ＋ **`execCommand('copy')` 回退**（台账写「textarea 回退」，漏记 execCommand 仍在） |
| S3-7 | D6「参数必填校验 旧＝有」 | 为**代码级**判定：F3 根镜像 436 场景 `editable_fields` 全空 → 该表单／校验在本数据上不可观测（判定方向不变） |
| S3-8 | D2「`既有唤醒词` 恒最后」 | 易误读：54 子功能中仅 `diet_9`／`analysis_9` 两组以「既有唤醒词」结尾，其余 8 组无该子功能 |

---

## 4. 脚本可信度：不是「只数自己的断言」，但判定层未被覆盖

| 脚本 | 是否自证 | 可伪造／空转点 |
|---|---|---|
| `gen.mjs` | **否**：断言＝exit／stdout 行数／五字段／`delivery.bytes＝data.bytes＝产物字节`／三态落盘，均为对**外部产物**的检查 | ① `--skip-build` 使「最终代码」前提不在脚本内被证明（本席以 `tsc -b` 复核：440 dist 文件 0 变更 → 前提在本机成立）；② 「inline 片段逐字出现在 file 内」只比对**前 200 字符** → 结论过强（S3-4） |
| `extract.mjs` | **否**：跨源解析（旧侧 HTML ↔ 新侧产物），期望值 10/54/436、436、341 为硬编码，数据一变即红 | 两侧共用同一 `parseHtml`：**对称性缺陷**（两侧同被误读）不会被 parity 发现；缓解＝两侧 payload 顶层键本就不同（旧无 `meta_blocks`）仍各自解析成功 |
| `compare.mjs` | **否**：跨源逐字比对，`promptEq===436` 会因对齐数不足而失败（非恒真） | ① 「复制参数按钮」＝ `dom.buttons − 436×2`：**算术恒等式，不可能失败**（本席直接数 `data-action-id` 得 436，结论对但该断言零信息量）；② **verdict 是硬编码字符串**，脚本不校验「判定 ↔ marker」一致性 → S2-2 这类错判不会被红灯拦下；③ D7 只算 `delta＝新−旧`，**不校验**四段分块之和＝delta → 33 B 残差静默通过 |

**结论**：三脚本是**真跨源比较**，不是「只数自己的断言」型自证；但**判定与归因层**（D5/D6/D7 的 verdict 与 attribution）不在机械断言覆盖内——本席实测到 3 处此类缺陷（S2-2／S2-3／S3-1），说明「B 口径（结构化等价＋登记偏离）」的机器部分只守数据面，**偏离登记的正确性仍全靠人审**（台账 §3 口径 B 自述的「不能防把真回归写成可解释」在本例已被验证为现实风险，而非理论风险）。

---

## 5. 门禁实测表

对账窗口：`--ticket 63 --since 2026-09-09T15:46:00Z --until 2026-09-09T15:54:00Z`（覆盖本席 20 条持锁运行）。

`GATE-RUN` 声明（20 条，逐字取自 `gate-runs.log`；每条 `at` 与 `exit` 见下表）：

```
GATE-RUN runId=4d717d26-4c24-4612-af32-f59cdef8c14f cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=4d2d565f-3864-476e-b5cf-84ab545c1bf3 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=ef635514-7f2e-4047-93c0-28de9dd70971 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=ee28e388-71ac-4ec3-9d0f-b17400c5eb6d cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=1e061c37-50e7-4e5f-8f54-6d16e22cdf52 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=6d9202d4-eba2-45c1-aceb-42e6f9a87c19 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=44a39ce4-a69d-40a4-895d-21f2c6a6547f cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=6ea201f3-d1ff-4634-8d86-41ce7ceac597 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=4582c918-7247-4d50-b25d-5b0a5251882e cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=7d8b61cf-64d2-4e8c-bb21-f35a969b46f8 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=5f72a5fc-e850-40e4-8b03-f3386d48810e cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=6aa76062-50e0-463f-bb55-cdbdab366af0 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=155efa8e-86fb-426f-9408-8bc92fa66a1a cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=78a005e1-b44c-437b-b06d-2fab997f977e ticket=83 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=1d84a25f-3930-4bfd-bcb5-38ea54d114d3 ticket=83 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=0552087b-0a8a-4949-b3e2-fe4e3e11a81d ticket=83 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=e754461e-d780-4bc1-88bd-13bfcaa5383f cmd="pnpm build"
GATE-RUN runId=ec480511-8fba-4db7-a379-85b522e351fe cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=4b6a8c09-7c91-4564-8add-f87f6830f2c3 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=a7202017-d650-4940-bfb3-189993a2e5d6 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""

GATE-RELAX flag=--allow-undeclared reason=同一票号 63 在本窗口有并发 session 运行（`t-help-parity-review-b-probe*.mjs`／`t63-line1-*`／`t81-*`／`t83-evidence`／`node --test *` 等，均非本席命令，无法代其声明）；本席 20 条运行已逐条声明，反向对账其余条目属他席
```

| # | 命令 | runId | at（UTC） | exit |
|---:|---|---|---|---:|
| 1 | `node … cmd_read.js calorie.help.center` | `4d717d26…` | 15:46:21.846 | 0 |
| 2–4 | 三态（regen R1） | `4d2d565f…`／`ef635514…`／`ee28e388…` | 15:48:33.3–.9 | 0 |
| 5–7 | 三态（regen R2） | `1e061c37…`／`6d9202d4…`／`44a39ce4…` | 15:48:34.1–.7 | 0 |
| 8–10 | 三态（regen R3） | `6ea201f3…`／`4582c918…`／`7d8b61cf…` | 15:48:34.9–35.4 | 0 |
| 11–13 | 三态（`--same`） | `5f72a5fc…`／`6aa76062…`／`155efa8e…` | 15:50:16.2–.7 | 0 |
| 14–16 | 三态（复跑被审 `gen.mjs`，票号 83） | `78a005e1…`／`1d84a25f…`／`0552087b…` | 15:50:23.6–24.2 | 0 |
| 17 | `pnpm build`（`tsc -b`，waitedMs=170095） | `e754461e…` | 15:53:29.940 | 0 |
| 18–20 | 三态（重建后 regen） | `ec480511…`／`4b6a8c09…`／`a7202017…` | 15:53:33.5–34.1 | 0 |

- 20 条声明**全部 exit=0**（无需 `--allow-nonzero`）；其中 `e754461e`（`pnpm build`）`waitedMs=170095`（等他席释放锁）。
- 另：本席复跑被审脚本链时，`gen.mjs` 默认票号为 83，故 `78a005e1／1d84a25f／0552087b` 三条记在 **ticket=83** 日志下（属本席运行、非本席票号，如实登记）。
- **被审台账的门禁主张独立复核**：以台账 §5 的逐字命令重跑 → `RESULT: matched=11/11 auditEntries=730 scoped=13 undeclared=2`＋`gate-audit: PASS`，与台账所载一致（auditEntries 因日志增长由 682→730，属预期）。

**对账输出（本席实测）**：

```
$ node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-review-a.md --ticket 63 `
    --since 2026-09-09T15:46:00Z --until 2026-09-09T15:54:00Z --allow-undeclared
证据：D:\ilife\docs\research\t-help-parity-review-a.md
审计：D:\ilife\.scratch\locks\gate-runs.log（RUN 条目 774 条；窗口内 38 条，ticket=63，since=2026-09-09T15:46:00Z，until=2026-09-09T15:54:00Z）
声称运行 20 条
  - 证据 :173 runId=4d717d26-4c24-4612-af32-f59cdef8c14f cmd=node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center
  …（20 条逐条列出，均命中 exit=0）
反向对账：窗口内无人声明的 RUN 条目 21 条（他席：`t-help-parity-review-b-probe*.mjs`／`t63-line1-*`／`t81-*`／`node --test *` 等）
RESULT: matched=20/20 auditEntries=774 scoped=38 undeclared=21
gate-audit: PASS
```

> 首次对账 `matched=0/0`（本席把 `GATE-RUN` 写成了 `# <时间> exit=0 GATE-RUN …`，`CLAIM_RE` 要求行首即 `GATE-RUN`）→ 修正后 20/20。
> 其中 3 条（`78a005e1／1d84a25f／0552087b`）属被审 `gen.mjs` 复跑、日志记在 `ticket=83`，故按工具支持写显式 `ticket=83` 跨票号认领（见 `check-gate-audit.mjs:204` 注释）。

---

## 6. 五维评分与 verdict

| 维度 | 满分 | 得分 | 依据 |
|---|---:|---:|---|
| **契约一致** | 30 | **28** | 三态 exit／单行 stdout／六键 envelope／`data.bytes＝delivery.bytes＝产物字节`／`data.text` 与 text 产物逐字／inline 无 payload／text 无标签——逐条实测通过；扣 2：`data.mode=inline` 而 `delivery.mode=file` 的交付语义仍属未决（台账 G-5 已登记，但契约面读起来自相矛盾） |
| **证据真实可复现** | 25 | **19** | sha256／字节／10-54-436／prompt 436/436／CLI 0→341／95 缺口分布／22 条 id 变更／三脚本 31-18-12 全部独立复现，且 `tsc -b` 重建后不变；扣 6：3 条 S2（13 处不可复现、键盘可达与自身 marker 矛盾、按钮归因错误）＋1 条 S3-4 结论过强（「逐字包含」有反例） |
| **parity** | 20 | **17** | 六项头条 parity 独立重算全部成立，缺口（95 条无 CLI／参数校验）与偏离（22 条 id／types 形状／断点／体积）登记方向正确；扣 3：2 行判定／归因与实测不符（S2-2／S2-3） |
| **工程红线** | 15 | **13** | 只新增 3 脚本＋1 文档；`packages/**`／`tooling/**`／既有 `docs/**` 零改动（`git status` 复核）；产物与中间件全在 `.scratch/`；20 条持锁运行全 exit=0 且逐条声明＋`GATE-RELAX` 理由在册；`SKILL.md` 首 3 字节 `2d 2d 2d`（#124 未复现）；扣 2：权威复跑用 `--skip-build`，「最终代码」前提不在脚本内自证（本席以重建补齐），且 `compare.mjs` 存在 1 处恒真断言 |
| **文档同步** | 10 | **7** | 台账表与 `ledger.json` 逐行一致、口径菜单与缺口归属清晰；扣 3：3 处表述与机器数据不符（S2-1／S2-2／S2-3）＋1 处过强（S3-4） |
| **合计** | **100** | **84** | |

**verdict：PASS（附条件）**

- 四条被审主张的头条数字（三态字节／sha／确定性、10-54-436、prompt 436/436、CLI 0→341、+962,002、41 行分布、31-18-12）**全部独立复现**，未发现 S1 交付缺陷，故不判 FAIL。
- 但 **3 条 S2 必须在台账落定前修正**（13 处尖括号计数、键盘可达判定、按钮归因），否则「机器可复算台账」的名声会盖过其判断层：`compare.mjs` 的机械断言不覆盖 verdict，S2-2 这类错判不会触发红灯。
- 1 条建议补项：体积分块加总与头条差 33 B（S3-1），补一行「标签壳 −33 B」即可闭合。

## 7. 自检

```
$ node -e "const b=require('fs').readFileSync('packages/skill-calorie/SKILL.md');console.log([...b.slice(0,3)].map(x=>x.toString(16).padStart(2,'0')).join(' '))"
2d 2d 2d          ← 非 00 00 00（#124 零填充事故未复现；审查收尾时复测，SKILL.md 30,143 B）

$ git status --short docs/research/t-help-parity-review-a*
?? docs/research/t-help-parity-review-a-probe.mjs
?? docs/research/t-help-parity-review-a.md
```

- 本席本次**只新增**上述 2 个文件。审查期间工作区另有并发 session 的改动（`packages/**`／`.changeset/**`／`pnpm-lock.yaml`／`docs/research/t63-*` 等），**均非本席所为**，本席未 `git add` 除自己 2 个文件外的任何路径。
- 产物与中间 JSON 全部落 `.scratch/review-a-*`（不入库）：`.scratch/review-a-db/`（17 个产物）、`.scratch/review-a-probe/`、`.scratch/review-a-run/`。
- 未执行全量 `pnpm test`／`t81-exec-smoke.mjs`；唯一的重活是 1 次 `pnpm build`（`tsc -b`，持锁，exit=0）。
