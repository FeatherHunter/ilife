# #227「内容资产入库」对抗式复审报告（复审员 I）

**复审范围**：用户三条硬规矩／仓规合规／生成器纪律／**用户可见质量**（泛化扫全部 30 场景的可见字段）／报告诚实度。
**不重复复审员 H 的活**：条数／名称／顺序／差异声明的**逐字忠实**归 H；本报告只在必要处引用逐字数，不做逐字复对。
**只读声明**：本席未改 `packages/**`、未改任何 issue、未 commit、未 `git add`／`git reset`。全仓只新增本文件一个。
**没有人类在场**：无提问，查不到的一律写「查不到 ＋ 试过什么」。

---

## 0. 我审的那一版（指纹）

`HEAD = 3da2559`（2026-09-12 12:45:23）。`git status` 显示本图产物**全部在工作树／未跟踪态**。

| 文件 | LF（只数换行符） | sha256 前 16 | mtime |
|---|---|---|---|
| `src/help/scenes/memo.ts` | 123 | `5E34A946A4442240` | 13:36:02 |
| `src/help/scenes/search.ts` | 131 | `4A4A30DA7EDE0BC5` | 13:36:02 |
| `src/help/scenes/remind.ts` | 90 | `D5949CB18886D42B` | 13:36:02 |
| `src/help/scenes/wish.ts` | 103 | `8F3B5729F0805897` | 13:36:02 |
| `src/help/scenes/checkin.ts` | 71 | `3CB048E9631EF642` | 13:36:02 |
| `src/help/scenes/mood.ts` | 73 | `C46CA1C7ECE745C7` | 13:36:02 |
| `src/help/scenes/sync.ts` | 43 | `ABE4C7A090B2B2AC` | 13:36:02 |
| `src/help/scenes/init.ts` | 44 | `95B413C46137EC47` | 13:36:02 |
| `src/help/sceneData.ts` | 62 | `A9EF9BD193979E11` | 13:36:02 |
| `scripts/gen-help-assets.mjs` | **463** | `A907D15CA9EA868A` | 13:35:58 |
| `src/help/helpFile.ts`（#228） | 220 | `E20E7BBF3427D776` | 13:33:23 |
| `docs/.../t227-assets-report.md` | **419** | `CEE33F0863824C91` | **13:38:46** |
| `docs/.../t220-orchestrator-decisions.md` | 222 | `F2BE19647BD1636E` | 13:35:14 |

⚠️ **交付方在复审期间仍在改**：13:36:02 重跑生成器（D5／D7 落盘），13:38:46 才把报告从 389 行／40544 字节改写成 419 行（我 13:33 读到的旧版仍写着「`title`／`hint` 逐字保留」「生成器 411 LF」「摘要锁 `8cf5949a…`」）。**本报告按 13:38:46 版评分**；若之后再改，请按上表指纹重跑 §2 的命令。
⚠️ **暂存区在复审期间被动过**（只报事实、不问归属）：13:34 我首次 `git status` 时 #227 产物是 `A `（已入暂存）；13:39 再看已变 `??`（未跟踪），而 `helpFile.ts` 仍是 `A `。报告 §八 声称「裁决 21 之后不再动暂存区」——**至少有一次暂存变更发生在该窗口内**。

---

## 1. 总评与评分

**总评 82/100**（加权：三条硬规矩 30% ／ 仓规合规 30% ／ 生成器纪律 20% ／ 报告诚实度 20%）。

| 维度 | 分 | 判定 |
|---|---|---|
| **一、用户三条硬规矩** | **100/100** | 三条全部机器可验通过，且仓内**有门**（`test/help-file-228.test.mjs:63,73-76`） |
| **二、仓规合规** | **68/100** | 扣 20：裁决 5 §五-4＋裁决 21 D2／D5 的**同一条规则没有扫完**，页面仍留 18 格实现细节字面（§3）；扣 8：裁决 21 D4「3 个导出」与盘上实际不符、第 3 个导出零消费者（§2.6）；扣 4：`sceneData.ts` 与 `helpFile.ts` 两处注释互斥（§2.7） |
| **三、生成器纪律（裁决 9／10）** | **95/100** | 扣 5：`version` 单一来源 ✓、三把摘要锁**经我独立复算全部对上** ✓、`--check` 只比对不落盘**我独立验证** ✓、禁手改 ✓、350 线 ✓；唯一缺口＝这套锁**不在任何仓内管线里**（`--check` 要仓外事实源在盘才跑得动），手改生成物在仓内无机械门 |
| **四、报告诚实度** | **64/100** | 扣 20：§3.1-15 与 §六末的全称断言「残余只有 `ID`／`HTML`／`UI`／`Python`」为**假**（漏报 ≥18 格，§3）；扣 12：§六 D4 把不存在的引文写成「逐字」（§2.6）；扣 4：报告与产物曾脱节 2 分 44 秒（13:36:02→13:38:46，现已自修） |

一句话：**生成器与三条硬规矩是真过关的，账也算得清；真正的窟窿是「同一条规则只执行到点名处为止」——页面还在说「原子操作／同事务／影响行数／级联／全文索引／字段／HTML」，而报告断言残余额已清空。**

---

## 2. 打假逐条（命令 ＋ 原始输出）

### 2.1 三条硬规矩：全部通过（含机械化证据）

命令（只读；产物经 `dist` 取，`dist` 与当前 `src` 同版——D5 新词在 `dist` 里命中，见 §2.4）：

```
node --input-type=module -e '<dump 30 场景全部可见字段>'
git grep -n '待开发|当前无|无唤醒词' -- packages/skill-memo-ilife/src
```

原始输出（我的扫描器，摘）：

```
statusSet: [""]            statusNonEmpty: []        awaitDevMarker: false
wakeAnchorMissing: []      （30/30 prompt 含「唤醒词:」锚点）
载荷 30 场景 status 取值集合 = [""]；全资产无【待开发】、无「当前无唤醒词可路由」类缺失标记
```

- **硬规矩 1（HELP 是完整体）**：30/30 `status === ''`，无 `【待开发】`，无缺失标记 ⇒ **PASS**。
  （报告 §3.1 端到端提到的「`待开发` 2 次」在**共享模板自带的 JS** 里（`dev: (s.status === '【待开发】')` ＋ 徽章文案），属 `packages/base-render/**`，且无数据可触发；**不构成本票违规**，但建议在 base-render 侧记一笔。）
- **硬规矩 2（命令不上页面）**：全 30 场景的 `prompt_template`／`title`／`hint`／`label` 里，`--`／`-c `／`memo.`／`notes.`／`memo_cli`／`update-category`／`wish-complete`／`wish-batch-plan`／`complete-wish`／`.py`／脚本路径 **逐 token 命中 0** ⇒ **PASS**。
- **硬规矩 3（HELP 自身唤醒词不上页面）**：资产里无 `备忘录HELP`／`备忘录 HELP`；无 `meta_blocks`／「怎么喊我」块（`sceneData.ts` 只导出 groups ＋ version ＋ 索引）；12 条 `aliases` 与 29 个主词**无一是 HELP 触发短语**（`SKILL.md:3` 的触发词＝「备忘录 HELP」）⇒ **PASS**。
  仓内还有一道门把这个规矩钉死：`test/help-file-228.test.mjs:73-76`
  `memo.`＝0／`--html|memo-cmd-read`＝0／`待开发|无唤醒词|当前无`＝0／**`HELP`＝0**（渲染后整页零 `HELP`）。
  ⚠️ 反向提醒：**这道门抓不到** `原子操作／同事务／影响行数／级联／全文索引／字段／HTML`（§3）——所以 §3 的漏网是「无门可抓」的漏网。

### 2.2 裁决 16：**通过**（我自己数的）

```
$ node <读取 dist/index.js 的导出>
包根运行时出口数 = 49
sceneData 导出 = MEMO_HELP_GROUPS | MEMO_HELP_VERSION | buildHelpSceneIndex
help/index 转发 = buildHelpLookup | lookupWake
```

`src/help/index.ts` 只有两行转发（`lookup.js` 的两个值 ＋ 一个类型）；`src/index.ts` 的 `export * from './help/index.js'` 未把新件带出去 ⇒ **49，不是 58** ⇒ **裁决 16 成立**。

### 2.3 裁决 9：**通过**，且三把摘要锁由我**独立复算**（不是照抄生成器）

我按自己的实现（不回用生成器代码）重新解析老载荷、重算 canonical：

```
raw-bytes sha256   = 8a25dd587d6b96ae2b56a16a17812def84d819dafefa4daa134e1c01b68efd8a
utf8-string sha256 = 8a25dd587d6b96ae2b56a16a17812def84d819dafefa4daa134e1c01b68efd8a
legacy scenes=30 payload.version=1.3.0 canonical sha256 = 0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c
asset  scenes=30 version=1.3.0        canonical sha256 = 539fcf39e0abf1aff1944b125ac08d006937d362fd64e6746ac132af4a526035
payload.version === MEMO_HELP_VERSION ? true
```

三值＝生成器里锁的三值（`gen-help-assets.mjs:42,43,44`）⇒ 锁是真的、且**钉的是盘上字节**。
`version` 读取：`gen-help-assets.mjs:409` `const VERSION = yaml.top.version`，`:410` 断言顶层 `skill==='备忘录'`，`:411` 断言载荷与 yaml 一致 ⇒ **不是第四份手写副本**。
全包源码里 `1.3.0` 字面**只出现一处**（`sceneData.ts:37`，生成物）＋ 一处注释；`helpFile.ts:181` 走 `buildHelpSceneIndex().version` 派生 ⇒ 铁律二（概念唯一）在**代码层**成立。

**`--check` 只比对不落盘——我独立验（跑前后 mtime＋sha 逐件比对）**：

```
$ node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check
清洗：prompt 改动 24 处（CLI 9 ／ DB 12 ／ IMPL 3）／title 1 ／hint 3／剔除字段 12 条／牵动场景 16 个
摘要锁：… 清洗后 30 条 539fcf39…526035
OK：9 个文件与生成结果字节一致（--check 不落盘）        check-exit=0
=== AFTER ===  9/9 UNCHANGED（mtime-ticks＋sha 全等）    changed_count=0
```

**「禁手改」能抓漂移——我在仓外副本上做变异，不动仓内一个字节**：

```
Copy-Item -Recurse packages\skill-memo-ilife $env:TEMP\t227-pkg
node $env:TEMP\t227-pkg\scripts\gen-help-assets.mjs --check          → OK, exit 0
Add-Content $env:TEMP\t227-pkg\src\help\scenes\sync.ts '// tamper…'
node $env:TEMP\t227-pkg\scripts\gen-help-assets.mjs --check
  DRIFT：…\t227-pkg\src\help\scenes\sync.ts 与生成结果不一致（禁手改；重跑不带 --check 即覆盖）  → exit 1
$env:TEMP 副本里被改的那行仍在（--check 没覆盖它）＝1 处；仓内 sync.ts sha 仍 ABE4C7A090B2 未变
```

另核：`FILL_` 未回填即抛、摘要不符即抛，**没有 `--skip`／`--force` 之类旁路**（`gen-help-assets.mjs:430-434`）⇒ fail-closed 成立。

### 2.4 裁决 10 ＋ 包内 `AGENTS.md`（350 ＋ LF 口径）：**通过**

```
全包 src/**/*.ts ＋ scripts/*.mjs 按 LF 降序：
 463  scripts\gen-help-assets.mjs      ← 唯一超线
 238  src\cli\cmd_read.ts   220  src\help\helpFile.ts   131 scenes\search.ts
 128  src\help\memoOutput.ts 123 scenes\memo.ts … 71 scenes\checkin.ts
9 个资产件 = 43–131 LF，全部 ≤350；生成器 463 LF 已按必报五步第四步逐字报出（报告 §四＋§六 D3，裁决 21 D3 维持「先不拆」）
```

（`cmd_read.ts` 已从裁决 19 记的 147 涨到 238，属 #229 在途，仍在线上；不在本票账上。另：`src/help/` 现为 14 个文件：6 个机器件 ＋ 8 个域资产，`scenes/` 子目录形状＝裁决 17 维持的那条。）

### 2.5 裁决 21 D2：**12 处真落、且逐条声明**——通过

生成器自证（我跑出来的）：`DB 12`。报告 §3.3 声明二 与附录表 2 把这 12 处**逐行列了老行→新行**（我按产物 dump 抽查表 2 右列 6 行逐字一致）⇒ D2 这一项**做完了**。
（裁决 21 D2 给的 12 处里含 `reminders_active` 的 `active=默认/dismissed`、`sync_feishu`／`delete_wish`／`update_wish` 的 `飞书 task`、`add_checkin`／`add_mood` 的 `创建… note`——四处都在盘。）

### 2.6 裁决 21 D4：**不成立**（打假）

任务书要我核「`sceneData.ts` 导出 3 个是否与 `helpFile.ts` 的实际 import 相符（不多不少）」。盘上：

```
helpFile.ts:37  import { MEMO_HELP_GROUPS, buildHelpSceneIndex } from './sceneData.js';   ← 两个名字
helpFile.ts:179 // 技能数据世代取自资产件：`sceneData.ts` 有意**不**另开 `version` 导出（它自述「本文件只给 2 个导出」）
sceneData.ts:21 // 本文件给 3 个导出：`MEMO_HELP_VERSION`… `MEMO_HELP_GROUPS`… `buildHelpSceneIndex()`
sceneData.ts:37 export const MEMO_HELP_VERSION = "1.3.0";
全包 grep 'MEMO_HELP_VERSION'：只有 sceneData.ts 自己（:37 定义、:61 自用）＋ 两处注释，**零外部消费者**
（cmd_read.ts:12 只 import buildHelpSceneIndex；helpFile.ts:181 用 buildHelpSceneIndex().version）
```

⇒ **导出 3 ≠ 实际 import 2**，第 3 个导出**没有任何消费者**。而报告 §六 D4 与裁决 21 D4 的支点原话是「`helpFile.ts:32` 逐字 `import { MEMO_HELP_GROUPS, MEMO_HELP_VERSION } from './sceneData.js'`；不导出则该文件 **TS2459**」——**盘上 `:32` 不是这行，`:37` 也不是这段内容**，且 `:179` 明说不导出。按报告自己的口径，这一句是「实测」，实为过时推断。

### 2.7 铁律二在注释层破了（代码层没破）

`sceneData.ts:23-24`（说 helpFile 正 import 版本、故必须导出）与 `helpFile.ts:179`（说 sceneData 有意不导出、自述只给 2 个）**互相打脸**。谁按任一注释动手都会错一次。

### 2.8 裁决 21 D5／D7：**改了，且我核过**（含理由成立性判定）

| 裁决点 | 盘上实测（逐字） | 判定 |
|---|---|---|
| D5-1 `title` | `wish.ts:47` `给心愿设排期日期(同步到飞书)` | **已清 ✓**，与裁决示例逐字同 |
| D5-2 `hint:tasklist_guid` | `wish.ts:74` `飞书任务清单 ID(可选)` | **已清 ✓**；与裁决示例「任务清单 ID(可选)」差「飞书」二字，**理由成立**（加信息不删信息） |
| D5-3 `hint:status` | `remind.ts:75` `有效(默认)/已废弃` | **已清 ✓**；与裁决示例「活跃/已忽略」用词不同，**理由成立**：`有效`＝本场景标题／正文自己的词（「查看所有有效提醒」），`废弃`＝老 `COMMAND_CN_MAP` 给 `dismiss` 的中文名。裁决该处的括注是示例、且同句要求「保留语义」 |
| D5-4 `hint:sub_category` | `memo.ts:102` `新子分类(2 字自由文本,留空即清除)` | **已清 ✓**，与裁决示例逐字同 |
| D7 `memo_init_setup` | `init.ts:37` `检查并配置运行环境、数据存储(全文搜索)、飞书联动(未安装则引导我安装并授权)、配置项,初始化数据库,配置提醒调度` | **`Python`／`CLI`／`环境变量` 已清 ✓**；保留的 `运行环境／数据存储／飞书联动／初始化数据库／配置提醒调度` **有老侧逐字出处**——我核了 `D:\2Study\StudyNotes\SKILLS\备忘录\SKILL.md:312-317`，逐字：「1. 检查环境:运行环境、数据存储、飞书联动(可选)… 2. 初始化数据库:建好备忘录的数据表 … 4. 配置提醒调度」。⇒ **D7 的保留理由成立** |
| 未覆盖 | `数据存储(全文搜索)` 的 `(全文搜索)` | 老 **yaml** prompt 原文（非 SKILL.md 那套词），报告未给理由；**判定：低风险（老侧原文），但要补一句声明** |

### 2.9 报告诚实度：逐句核（真／假／不可复现）

| 报告句 | 我的核法 | 判定 |
|---|---|---|
| §3.1-17「包根运行时出口实测 = 49」 | 我自己数 | **真** |
| §3.1-12「`--check` 幂等，exit 0」＋变异自证 | 我在副本上重做变异 | **真** |
| §3.1 端到端「`active` = 14＝13 CSS ＋ 1 场景 id」 | 我数模板：`active` 命中 **13** | **真（支持该句）** |
| §八「`.scratch-t227*` 返回空」 | `Get-ChildItem . -Filter '.scratch-t227*'` | **真（空）** |
| §2.2「两个 canonical 摘要由另一支独立脚本复算」 | 脚本未入库、已删 | **不可复现**（但摘要值我独立复算**对上**，故不是假；建议删句或把脚本入库） |
| §3.1-15／§六末「残余只有 `ID`／`HTML`／`UI`／`Python`」 | 我全量扫 30 场景可见字段 | **假（漏报 ≥18 格，见 §3）** |
| §六 D4「`helpFile.ts:32` 逐字 import…」 | 读文件 | **假（盘上 :37，两个名字；:179 说不导出）** |
| §3.2「偏差总数 = 41」 | 未独立复算全部 41（需另一套老侧 diff），抽查表 5 四处逐字一致 | **未全核**（不判真伪；口径本身自洽：10＋3＋15＋12＋1） |
| §3.1-8「牵动 15 场景」vs 自证输出「牵动场景 16 个」 | 同页对读 | **同一名词两个数、未对齐**（16＝15 个 prompt 场景 ∪ 1 个只改 hint 的场景）⇒ 小瑕疵 |

---

## 3. 用户可见的实现细节字面清单（**最重要产出**）

**可见面口径**：`title`（直接渲染）／`label`（`<label>` 渲染）／`hint`（渲染为输入框 `placeholder`，`help-template.html:1931` 逐字 `placeholder="' + esc(p.hint || '')`）／`prompt_template`（场景卡正文＋可复制指令）。
**不在可见面**（故不计）：字段 `name`（只进 `data-p` 属性，`help-template.html:1931`）、`id`／`wake_word`／`types`／`status`／`aliases`。

### 3.1 已清（命中 0，逐 token 核过）

`--`／`-c `／`memo.`／`notes.`／`memo_cli`／`update-category`／`wish-complete`／`wish-batch-plan`／`complete-wish`／`.py`／`script/`／`Cron`／`GUID`／`uuid`／`null`／`active`／`dismissed`／`note`／`task`／`due`／`SQL|SELECT|INSERT|UPDATE|DELETE`／`【待开发】`／`当前无唤醒词可路由`。

### 3.2 **未清**（18 格，报告一条都没声明）

| # | 场景 | 字段 | 原文（可见，逐字） | 属于 |
|---|---|---|---|---|
| 1 | `memo_complete_wish` | **title** | `把心愿标记为已完成(原子操作)` | 实现术语（原子性） |
| 2 | `memo_complete_wish` | prompt | `AI 执行原子操作:删除该心愿 + 新建一条打卡记录(同事务)。` | 原子操作＋**事务**（DB）；本行是本票改过的行，只清了 `note`，`原子操作/同事务` 原地不动 |
| 3 | `memo_delete_basic` | prompt | `AI 删除这些备忘并告知影响行数;有关联提醒时 AI 会先确认。` | **影响行数**＝SQL affected rows |
| 4 | `memo_delete_basic` | label | `级联删除提醒` | **级联**＝SQL CASCADE |
| 5 | `memo_delete_basic` | hint | `是否级联删关联提醒(默认否,有提醒则报错)` | 同上 |
| 6 | `memo_search_keyword` | hint | `搜索词(全文索引)` | **全文索引**＝FTS |
| 7 | `memo_update_basic` | prompt | `AI 更新这条备忘的字段,告诉你修改后的内容。…` | **字段**＝schema 词 |
| 8 | `memo_get_detail` | prompt | `AI 显示这条备忘的全部字段。并生成详情页。` | 字段 |
| 9 | `memo_sync_feishu` | prompt | `并生成同步报告页(含 11 统计字段)。` | 字段；**这行也是本票刚改过的行**（只换了 `--html`） |
| 10 | `memo_change_category_single` | prompt | `子分类不会被改动(它是内容维度的二阶属性)。` | 数据模型术语（维度／二阶属性） |
| 11 | `memo_change_category_single` | hint | `原话含'都/全部/多个 ID' → 走批量版` | 暴露内部路由规则 |
| 12 | `memo_batch_change_category` | hint | `原话含'都/全部/多个 ID'` | 同上 |
| 13 | `memo_delete_basic` | hint | `跳过二次确认(自动化用)` | 内部机制 |
| 14 | `memo_batch_change_category` | **title** | `批量改分类(过程型 HTML 向导)` | **HTML**＝标记语言名 |
| 15 | `memo_batch_change_category` | prompt | `AI 生成批量改分类向导 HTML,你在 UI 勾选 + 选目标分类 → 采纳复制 → AI 逐条改分类。` | HTML ＋ **UI** |
| 16 | `memo_batch_change_category` | prompt | `目标分类: _____________ (建议目标,可在 HTML 改)` | HTML |
| 17 | `memo_batch_change_category` | hint | `建议目标分类(HTML 可改)` | HTML |
| 18 | `memo_complete_wish` / `memo_wish_schedule` | prompt | `…你在 HTML 勾选 + 填打卡内容。` ／ `…你在 HTML 微调。` | HTML（计 2 行，见下） |

明细计数：`HTML` 6 格（#14／15／16／17／18×2）＋ `UI` 1 格（#15 同格）＋ `原子操作` 2 格（#1／2）＋ `事务` 1 格（#2）＋ `影响行数` 1 格（#3）＋ `级联` 2 格（#4／5）＋ `全文索引` 1 格（#6）＋ `字段` 3 格（#7／8／9）＋ `维度/二阶属性` 1 格（#10）＋ `走批量版` 2 格（#11／12）＋ `自动化用` 1 格（#13）。**去重后 18 个可见格**。

### 3.3 保留**成立**的（判它成立，不扣分）

| 项 | 出处 | 判定 |
|---|---|---|
| `ID`（48 个可见格，如「笔记 ID」「必填,数字 ID」） | 老侧用户词；**裁决 21 D5 自己给的替换词就是「任务清单 ID」** | **保留成立** |
| `YYYY-MM-DD`／`HH:MM` 等格式占位 | 用户要填的格式 | **保留成立** |
| `memo_add_wish` prompt 的 `如"想学 Python"` | **用户内容示例**，删了丢例子；生成器按场景精确禁用（`SCENE_FORBIDDEN`）而非全局禁 | **保留成立（且这个做法是对的）** |
| `数据存储／初始化数据库／配置提醒调度`（`memo_init_setup`） | 老 `SKILL.md:312-317` 逐字就是这套用户话（我读过原文件） | **保留成立** |
| `HTML`／`UI`（6＋1 格） | 报告称「有意保留：说的是用户收到的那张页面，不是语言名」 | **理由不成立**：HTML **就是**标记语言名；且该豁免是生成器注释里**自设**的（`gen-help-assets.mjs:97-101`），裁决 21 D5 只给了「改了会丢用户语义」这一条例外，没给「HTML/UI 豁免」。⇒ 计入 §3.2 未清，但**等级＝建议改**（用户三条硬规矩未点名，可见性也只是术语层） |

---

## 4. 违反项清单（一条一行）

| # | 哪条规矩 | 证据 | 影响 |
|---|---|---|---|
| V1 | 裁决 5 §五-4 ＋ 裁决 21 D2 的同一条规则（页面只许出现用户能说的话） | §3.2 的 18 格仍在盘上；生成器把 `HTML/UI/ID` 写进**自设豁免**，其余 8 类连豁免都没写（`VISIBLE_FORBIDDEN` 表里根本没有 `原子操作/事务/影响行数/级联/全文索引/字段/维度`） | 用户点开 HELP 仍会看到「原子操作／同事务／影响行数／级联／全文索引／统计字段／二阶属性／HTML」——U6 立规的意图（页面只说人话）没达成；且**无机械门**能防回归 |
| V2 | 裁决 21 D5 的「残余 4 处」口径 ＋ 报告诚实度 | 报告 §3.1-15 逐字「残余只有**有意保留**的 `ID`／`HTML`／`UI`／`Python`」；§六末同 | 这是**全称断言**：编排／复审若据此认为残余额已清空而关票，等于放行 V1 的 18 格 |
| V3 | 裁决 21 D4（导出「不多不少」）＋ 铁律五（接口小） | §2.6：3 个导出 vs helpFile 实际 import 2 个；`MEMO_HELP_VERSION` 零消费者 | 对外多一个**白占位**导出（本票唯一的对外面），且它存在的理由（helpFile 需要）在盘上已不成立 |
| V4 | 铁律二（概念唯一）——**注释层** | `sceneData.ts:23-24` ↔ `helpFile.ts:179` 互相打脸（一说必须导出、一说有意不导出） | 后来者按任一注释改都会错一次；版本口径的说法不唯一 |
| V5 | 报告诚实度（把推断／过时引文写成「实测／逐字」） | §六 D4「`helpFile.ts:32` 逐字 `import {…MEMO_HELP_VERSION}`」——盘上 `:37` 且无该名字 | 裁决 D4 的支点引文不可查，讨论会建在沙上 |
| V6 | 报告 §八「裁决 21 之后不再执行任何 `git add`／`restore --staged`／`reset`」 | §0 的事实：13:34 时 #227 产物为 `A `，13:39 变 `??` | 若编排按暂存区提交，**#227 四类产物会漏**（现在是未跟踪态）；须提交前人工核（归属不明，可能是别的会话） |
| V7 | 账本一致性（编排侧） | `t225-structure-design.md:226` 仍写「清洗后 64 条／29 场景」；裁决 21 D1 已判 **27**，t220 也已订正 | 同一件事在两张票面上两个数，后续验收会对不上 |

**已核通过、明确不判违反的**：三条硬规矩（§2.1）；裁决 16＝49（§2.2）；裁决 9 全部四项＋三把摘要锁（§2.3）；350 线＋9 件 42–131 LF＋生成器 463 已按第四步报（§2.4）；D2 的 12 处逐条声明（§2.5）；D5 四处＋D7 三处已清且保留项理由成立（§2.8）；D1／D3／D6 与裁决 21 结论一致；文件名取自 HELP 一级分组（8 域 id＋中文分组名，无自造词）、9/9 头注释逐字「机器生成，**禁手改**」＋改法、8/8 域文件各**恰 1 个导出**；裁决 17 要求票 5 补的「平铺 vs `scenes/`」对比已补（`t225:144`）；报告未引那个不存在的 `tests/test_html_trigger_coverage.py`（裁决 9 的告警已遵守）。

---

## 5. 给编排会话的整改清单

### 必须改（3 项）

**M1 · 清掉 §3.2 的 18 格（保留语义、只换说法）**，建议改法：
- `原子操作` → 直接说结果：「AI 一次做完：删除该心愿并新建一条打卡记录」；title 的 `(原子操作)` 去掉或换「(一次完成)」
- `(同事务)` → 删（信息量为零，且是 DB 词）
- `影响行数` → 「改动了几条」
- `级联删除提醒`／`是否级联删关联提醒` → 「连同关联提醒一起删」／「是否连带删除关联提醒(默认否,有提醒则报错)」
- `搜索词(全文索引)` → `搜索词`
- `字段` → 「内容项」；`含 11 统计字段` → 「含 11 项统计」
- `内容维度的二阶属性` → 「子分类只是内容的细分，不受顶层分类影响」
- `'都/全部/多个 ID' → 走批量版` → 「说『都/全部/多个』时按批量处理」（或直接删）／`(自动化用)` → 删
- `HTML` → 「网页」，`UI` → 「页面」（6＋1 格）
- **同时**：把新词补进 `gen-help-assets.mjs` 的 `VISIBLE_FORBIDDEN`（`原子操作`／`事务`／`影响行数`／`级联`／`全文索引`／`字段`／`维度`／`属性`），并**把 `HTML`／`UI` 从自设豁免里拿掉**（要豁免就得有裁决，而不是注释）。否则同类词下次还会长回来。
- 建议加一道机械门：在 `test/help-file-228.test.mjs` 现有 4 条正则断言旁，再断一条 `/原子操作|同事务|影响行数|级联|全文索引|HTML|GUID|null|active|dismissed/` 命中 0——这正是「点名之外」的防回归。

**M2 · 修 D4 的「3 个导出」**（二选一，别留悬空）：
- (a) `helpFile.ts` 改成 `import { MEMO_HELP_GROUPS, MEMO_HELP_VERSION }` 并用它做 `version`（则 3 个导出名副其实，且与 `sceneData.ts:23-24` 的注释一致）；或
- (b) `sceneData.ts` 去掉 `MEMO_HELP_VERSION` 导出、`helpFile.ts:179` 与报告 §五／§六 D4 统一改成「2 个导出（version 经 `buildHelpSceneIndex().version` 派生）」，并**订正裁决 21 D4 的支点引文**。
无论选哪条，**两处互斥注释（V4）必须同批改**。

**M3 · 改报告的两处不实句**：
- §3.1-15 与 §六末的「残余只有 `ID`／`HTML`／`UI`／`Python`」→ 换成 §3.2 的**全量 18 格清单**（含「已清」与「保留」两栏）；
- §六 D4 的「`helpFile.ts:32` 逐字 …」→ 按盘上 `:37` 重写，或删掉该引文只留结论。

### 建议改（4 项）

- **S1**：报告把两个口径分开写——「**偏差** 41 处（新旧差异，已逐条声明）」与「**该清未清** N 格（同规则续扫）」。现在的「零未声明偏差」在字面上为真，但会被读成「页面已经干净」，V2 就是这么发生的。
- **S2**：生成器 `--check` 把「可见文案禁用词扫描：命中 0／命中 K 处」也打进输出（现在只有抛错时才可见），让复审一眼可核；顺带把 `牵动场景 15／16` 的口径在输出里写清（V-§2.9 的小瑕疵）。
- **S3**：`t225-structure-design.md:226` 的「29 场景」随裁决 21 D1 订正为 **27**（V7）。
- **S4**：**提交前核暂存区**：#227 的四类产物此刻是**未跟踪**（`??`），`helpFile.ts` 仍是 `A `；别让 `git commit`（不带 `-a`）把 #227 漏掉（V6）。

### 附：本席的复现命令（全部只读）

```
node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check        # 形状／清洗／摘要锁／校验和
node <dump sceneData.js 的 30 场景可见字段>                                 # §3 清单来源
node <独立重算 payload+canonical 的 sha256>                                # §2.3 三把锁
node <数 dist/index.js 导出>                                              # §2.2 → 49
Test-Path .scratch-t227*；Get-ChildItem . -Filter '.scratch-t227*'         # §2.9 → 空
仓外副本变异 → --check → DRIFT/exit 1                                      # §2.3 禁手改
```

**仓外临时件（复审用，非仓库文件）**：`%TEMP%\t227-scan-I.mjs`、`t227-detect-I.mjs`、`t227-exports-I.mjs`、`t227-digest-I.mjs`、`t227-dump-I.txt`、包副本 `%TEMP%\t227-pkg\`——收工已删。仓内**只有本报告一个新增文件**。

---

## 6. 复核结论（一句话）

**三条硬规矩 100 分、生成器纪律 95 分，这两块可以放行；卡口在「页面可见质量」与「报告的两句全称断言」——18 格实现细节字面还在用户眼前，而报告写着残余额已清空。M1 不改完，`memo.help.lookup` 落地后用户看到的仍是「原子操作／同事务／影响行数／级联／全文索引／HTML」。**
