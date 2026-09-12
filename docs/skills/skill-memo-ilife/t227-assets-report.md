# #227 内容资产入库：老骨架 → 仓内 typed const · 交付报告

**结论一句话**：老骨架 30 场景已逐字落成 8 个域文件 ＋ 1 个组装件（8 域／13 二级组／30 场景／64 字段／12 别名），生成器 ＋ `--check` ＋ 三把 SHA-256 摘要锁在盘并全绿；与老实物的机器对账共 **53 处差异，逐条都是**本票声明过的清洗项——**零未声明偏差**。
**（复审员 I 的 M1／M2／M3 已执行）** **M1**：它点名的 **18 格用户可见实现细节字面已全部清掉**（`原子操作`／`同事务`／`影响行数`／`级联`／`全文索引`／`字段`／`二阶属性`／`批量版`／`自动化`／`HTML`／`UI`），并把它们**补进生成器的可见文案扫描表**、**撤掉 `HTML`／`UI` 的自设豁免**（复审员 I 判该豁免不成立）；**M2**：`sceneData.ts` **回到 2 个导出**（`MEMO_HELP_VERSION` 已撤——盘上 `helpFile.ts:181` 用 `buildHelpSceneIndex().version`，独立导出零消费者；`version` 仍单一来源）；**M3**：报告两处不实句已按盘上事实重写，并把「对账偏差 53 处」与「该清未清 18 格」两个口径**分开记**（§3.2）。

- 本票**只做内容资产**：不碰渲染、不碰出口、不动 `src/help/index.ts` 转发（裁决 16）、不改 `packages/base-render/**`、不改 `packages/base-combos/**`、不改 `tooling/check-boundaries.mjs`。
- 全程**只读**老技能目录 `D:\2Study\StudyNotes\SKILLS\备忘录\`（未写入一个字节）。

---

## 一、交付物（LF 口径，只数 `\n`）

| # | 文件 | LF | 导出 | 归票 |
|---|---|---|---|---|
| 1 | `packages/skill-memo-ilife/src/help/scenes/memo.ts` | 123 | `MEMO_HELP_MEMO` | #227 |
| 2 | `packages/skill-memo-ilife/src/help/scenes/search.ts` | 131 | `MEMO_HELP_SEARCH` | #227 |
| 3 | `packages/skill-memo-ilife/src/help/scenes/remind.ts` | 90 | `MEMO_HELP_REMIND` | #227 |
| 4 | `packages/skill-memo-ilife/src/help/scenes/wish.ts` | 103 | `MEMO_HELP_WISH` | #227 |
| 5 | `packages/skill-memo-ilife/src/help/scenes/checkin.ts` | 71 | `MEMO_HELP_CHECKIN` | #227 |
| 6 | `packages/skill-memo-ilife/src/help/scenes/mood.ts` | 73 | `MEMO_HELP_MOOD` | #227 |
| 7 | `packages/skill-memo-ilife/src/help/scenes/sync.ts` | 43 | `MEMO_HELP_SYNC` | #227 |
| 8 | `packages/skill-memo-ilife/src/help/scenes/init.ts` | 44 | `MEMO_HELP_INIT` | #227 |
| 9 | `packages/skill-memo-ilife/src/help/sceneData.ts` | 64 | `MEMO_HELP_GROUPS`／`buildHelpSceneIndex()`（**2 个**；复审 M2 撤销了第 3 个） | #227 |
| 10 | `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` | **497** ⚠️ | 脚本（不对外开接口） | #227 |
| 11 | `docs/skills/skill-memo-ilife/t227-assets-report.md` | 本文件 | — | #227 |

- 9 个资产件**全部 ≤ 131 LF**，远在 350 线内；**唯一超线的是生成器 497 LF**（§四按必报五步第四步报）。
- **未新增第 12 个文件**：生成器保持单文件（票 5 清单「脚本 1 个」），没另拆模块（§四给理由）。
- 类型面**不新造**：8 个域文件里的数据形状就是公共层契约的形状，本包**没有**再声明一套 `Scene`／`SceneGroup`（铁律二）；`sceneData.ts` 的组装用 `for…of` 取数，避免联合类型上 `.map`/`.reduce` 的签名不兼容。

---

## 二、事实源与生成器纪律

### 2.1 两处事实源（都只读）

| 源 | 用途 | 指纹 |
|---|---|---|
| ① 老实物契约载荷 `D:\2Study\StudyNotes\.db\memo_html\备忘录_HELP_20260820_162453.html` 的 `window.__DATA__` | **内容主体（逐字）** | 文件字节 sha256 ＝ `8a25dd587d6b96ae2b56a16a17812def84d819dafefa4daa134e1c01b68efd8a` |
| ② 老 `D:\2Study\StudyNotes\SKILLS\备忘录\references\scenarios.yaml` 顶层 `skill`／`version` ＋ 30 条的单行字段 | **`version` 的来源（裁决 9）＋ 交叉复核** | 顶层实测 `{"skill":"备忘录","version":"1.3.0"}` |

**为什么内容主体取「老实物载荷」而不是让 JS 再解析一遍 YAML**：那份载荷**就是**老转换层 `script/memo_render.py:527-599` `_scenarios_to_contract_data()` 的产出（`subtitle` 里逐字写着 `版本 1.3.0`，与 yaml 顶层一致），逐字零改写；而老 yaml 的 `prompt` 是多行双引号标量（带 `\n` 转义与行尾 `\` 折行续行），在 JS 里自写解析器属于**新增一处可能静默走样的映射**——记账先例（`packages/skill-bill/scripts/gen-wake-assets.mjs:25`）也是读老实物 HTML 的载荷。裁决 9 要的「`version` 从老 yaml 顶层读」照办：生成器**读 yaml 顶层**，并与载荷互校（不相等即 fail-closed）。

**两源逐条交叉复核（生成器每次跑都做，对不上即 fail-closed）**：30 行按 `scenario_id` 配对，逐条比 `wake_word`／`scenario_title`／`type`／`status`／`category`→域、`subfunction`→二级组、`dimensions` 键序→`editable_fields` name 序；另断言**域顺序＝yaml `categories` 顺序**、**组内序／组序＝yaml 书写序**。原始输出：`老 yaml 顶层：{"skill":"备忘录","version":"1.3.0"}；两地交叉复核 30/30 条逐字对上`。

> **一处必须记下的事实**：**载荷的场景顺序 ≠ yaml 的书写序**——`memo_batch_change_category` 在 yaml `:361`，却被老转换层收进 `memo` 域的「分类调整」组（载荷第 6 条）。老转换层先按 `category` 分域、再按 `subfunction` 收组（`memo_render.py:551-560`），所以「顺序」有两层：**域序／组序／组内序**才是「书写序」，场景的**全局**顺序由转换层重排。新资产照**载荷**（＝HELP 实际呈现的顺序），并在生成器里与 yaml 的书写序双向钉住。

### 2.2 生成器纪律（裁决 9）

- 用法：`node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（落盘）／`… --check`（**只比对不落盘**，不一致 exit 1）／`--src`／`--yaml` 可换源。
- **禁手改生成物**：9 个产物的文件头都逐字写着「机器生成，禁手改」＋ 改法（改生成器声明表再跑）。
- **三把摘要锁**（fail-closed，未回填即抛错，不给「跳过」分支）：
  - 事实源文件字节：`8a25dd58…`
  - **老 30 条 canonical**（`[id,title,wake_word,status,prompt_template,types,editable_fields]` 的 JSON）：`0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c`
  - 清洗后 30 条 canonical：`539fcf39e0abf1aff1944b125ac08d006937d362fd64e6746ac132af4a526035`
  - 两个 canonical 摘要由**另一支独立脚本**（未入库）从载荷复算，与生成器打印**逐字相同**。
- **不进 build／test 管线**（票 5 §2.2）：事实源在仓外，CI 不跑；改词只能走生成器。
- 断言：源形状（30/8/13、字段齐、id 唯一）＋ 产物形状（§三）＋ 清洗表逐条命中「恰好 1 次」＋ 清洗后 prompt 不得再含实现记号（`--`／`-c `／`note`／`task`／`due`／`Cron`／`GUID`／`active`／`dismissed`／`memo.`／`notes.`／`.py`／`select|insert|update` 等 17 个 token）。

---

## 三、必报五步 · 第五步「交付对账」

### 3.1 自证断言逐条（命令 ＋ 原始输出）

命令（在 `D:\ilife` 下）：

```
node packages/skill-memo-ilife/scripts/gen-help-assets.mjs
node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check
node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife/tsconfig.json   # 只建本包（--dry 已确认图里只有本包）
node tooling/check-boundaries.mjs
```

原始输出（生成器，裁决 21 执行后重跑，节选逐字）：

```
事实源：D:\2Study\StudyNotes\.db\memo_html\备忘录_HELP_20260820_162453.html（55053 字节，sha256=8a25dd587d6b96ae…）
老 yaml 顶层：{"skill":"备忘录","version":"1.3.0"}；两地交叉复核 30/30 条逐字对上
形状：域 8／二级组 13（兜底 4）／场景 30／字段 64（含字段场景 27）／别名 12
原子：{"采集":20,"回执":30,"向导":4,"查看":10}
清洗：prompt 改动 34 处（CLI 9 ／ DB 12 ／ IMPL 13）／title 3 ／label 1 ／hint 9／剔除字段 12 条／牵动场景 19 个
摘要锁：老 30 条 0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c；清洗后 30 条 7c72fb924f8457e2130ebb0b331ae583c3aaaa64f4a04c27cf01da581c325827
已写入 9 个文件：
  src\help\scenes\memo.ts　123 LF
  src\help\scenes\search.ts　131 LF
  src\help\scenes\remind.ts　90 LF
  src\help\scenes\wish.ts　103 LF
  src\help\scenes\checkin.ts　71 LF
  src\help\scenes\mood.ts　73 LF
  src\help\scenes\sync.ts　43 LF
  src\help\scenes\init.ts　44 LF
  src\help\sceneData.ts　64 LF
```

| # | 票面要求的自证 | 实测 | 结论 |
|---|---|---|---|
| 1 | 场景＝30 | 30（唯一 id 30） | ✅ |
| 2 | 域＝8 | `[memo,search,remind,wish,checkin,mood,sync,init]` | ✅ |
| 3 | 二级组＝13 | 13（逐行对照见附录表 4／§3.3 声明三） | ✅ |
| 4 | 兜底（`label=基础`）＝4 | 4（checkin／mood／sync／init） | ✅ |
| 5 | `editable_fields`＝64 | 64 | ✅ |
| 6 | 涉及场景＝29 | **老口径 29**（有 `dimensions` 的场景）✅；**清洗后仍带字段＝27**（⚠️ 见 §六 D1） | ⚠️ |
| 7 | `aliases` 条数 | 12（唯一 12，与任何主词零撞词） | ✅ |
| 8 | `prompt` 改写＝8（＋6 条 DB 细节） | **CLI 类 9 处／并集 8 场景 ✅**；DB 类 **12 处／10 场景**（裁决点名 6 处 ＋ 同规则续扫 6 处 ⚠️D2，**裁决 21 判保持 12**）；IMPL 类 **13 处**（裁决 21 D7 的 3 处 ＋ 复审 M1 的 10 处）；合计 **34 处／18 个场景**，落在 26 行上，逐行对照见附录表 2 | ✅ |
| 9 | `type→types` 30 行 | 30 行全部落地，逐行对照见附录表 1 | ✅ |
| 10 | 原子计数 | `{回执:30, 采集:20, 查看:10, 向导:4}`（合计 64）；`types` 里 **0 处**「选择」 | ✅ |
| 11 | 二级组 id 13 行 | 见 §3.3 声明三（老 0 起 ↔ 新 1 起逐行） | ✅ |
| 12 | `--check` 幂等（连跑两次一致） | 两次均 `OK：9 个文件与生成结果字节一致（--check 不落盘）`，exit 0 | ✅ |
| 13 | 每个文件 LF ≤ 350（本包口径） | 9 个资产件 43–131 LF ✅；**生成器 497 LF ⚠️**（§四） | ⚠️ |
| 14 | `status` 一律空串、禁 `【待开发】` | 30 个 `status` 取值集合 ＝ `[""]`；生成器断言 `status !== ''` 即抛 | ✅ |
| 15 | 页面只出现唤醒词（**改后全量口径**） | 逐 token 复扫**可见文案**（`title`／`prompt`／`label`／`hint`），命中数**全 0**：`原子操作`／`同事务`／`影响行数`／`级联`／`全文索引`／`字段`／`二阶属性`／`批量版`／`自动化`／`HTML`／`UI`／`GUID`／`null`／`active`／`dismissed`／`due`／`Cron`／`note`／`task`／`CLI`／`notes.`（**不是**「只有 ID／HTML／UI／Python 残余」那句旧全称断言——那句已按复审 M3 作废）。**有意保留且都不是实现细节**：`ID` 47 格（老侧用户词，裁决 21 给的替换词就是「任务清单 ID」）、`YYYY-MM-DD` 13 格、`Python` 1 格（`memo_add_wish` 的用户内容示例）、`数据存储`／`初始化数据库`／`调度` 各 1 格（老 `SKILL.md:312-317` 安装 prompt 逐字） | ✅ |
| 16 | 可见文案换说法全量（裁决 21 D5／D7 ＋ 复审 M1） | `title` **3** ／`label` **11** ／`hint` **9** ＝ **23 处**，逐条见附录表 5；对账偏差合计 **53 处** ＝ prompt 18＋label 11＋hint 9＋title 3＋fields 12（两个口径分开，见 §3.2） | ✅ |
| 17 | 裁决 16（新件不许转发、包根出口维持 49） | **包根运行时出口实测 = 49**、其中 `MEMO_HELP_*` 前缀 **0 个**；`src/help/index.ts` 未改、无新转发 | ✅ |
| 18 | 复审 M2（`sceneData.ts` 回到 2 个导出） | `Object.keys(import('dist/help/sceneData.js'))` ＝ `["MEMO_HELP_GROUPS","buildHelpSceneIndex"]`；`MEMO_HELP_VERSION` 未导出、仍在文件内被 `buildHelpSceneIndex()` 使用 | ✅ |

`--check` 幂等（连跑两次，逐字）：

```
$ node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check
OK：9 个文件与生成结果字节一致（--check 不落盘）      [exit=0]
$ node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check
OK：9 个文件与生成结果字节一致（--check 不落盘）      [exit=0]
```

**变异自证（锁真的会红，复审 M1 后重跑）**：把 `src/help/scenes/sync.ts` 里刚换过说法的统计文案再动一个字节（`11 项统计` → `11 项统计 `）后

```
$ node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check
DRIFT：D:\ilife\packages\skill-memo-ilife\src\help\scenes\sync.ts 与生成结果不一致（禁手改；重跑不带 --check 即覆盖）
[exit=1]
$ node packages/skill-memo-ilife/scripts/gen-help-assets.mjs      # 还原
$ node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check
OK：9 个文件与生成结果字节一致（--check 不落盘）      [exit=0]
```

**类型与门**：

```
$ node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife/tsconfig.json
[tsc -b exit=0]          # 含 #228 已在盘上的 src/help/helpFile.ts；--dry 确认构建图里只有本包
$ node tooling/check-boundaries.mjs
boundaries: PASS         # 全 10 条 OK，含「未迁移技能源码／模板不 import base-*（命中：无）」
```

> 安全纪律：**没有**跑仓根 `tsc -b`／`pnpm -r build`；只对本包跑了 `tsc -b`（`--dry` 先确认无引用工程）；**没有**重启／触碰 `127.0.0.1:43120`。

**端到端（顺手做的一次真实集成，只读不落盘）**：用 #228 已在盘的 `src/help/helpFile.ts` 组装并渲染，产物 **130 825 字节**：

```
载荷 groups = 8　场景 = 30　载荷里含 aliases 的场景 = 0　载荷字段键集 = ["id","title","wake_word","status","prompt_template","types","editable_fields"]
载荷 version = 1.3.0　subtitle = 8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0
正文 "memo." = 0　"--html" = 0　"Cron" = 0　"GUID" = 0　"原子操作" = 0　"级联" = 0　"全文索引" = 0
30 个唤醒词在页面上出现 = 30／30
```

- `aliases` **0 条进载荷** ✅（裁决 5 的「资产侧留、组装时剥离」在真链路上成立）；
- 逐处核过上下文：`"note"` 的 2 次是内嵌 JSON 载荷里的**场景 id** `memo_remind_with_note` 与**字段键** `note_id`（可见 `label` 是「笔记 ID」）；`"active"` 的 13 次是共享模板自带的 CSS 伪类（`.copy-btn:active`／`.tab.active` 等）、1 次同上那个场景 id；**`"HTML"` 的 24 次全在模板自带的 JS／CSS 里**（`innerHTML`×9、`outerHTML`、`<html lang=…>`、以及 `action: 操作区 HTML` 这类模板注释）；`"待开发"` 2 次在模板的 `dev: (s.status === '【待开发】')` 分支——**都不是本资产的可见文案** ✅。

### 3.2 与老骨架的逐字对账（条数／名称／顺序）

对账方法：把老实物载荷的 30 条与 `dist` 里的真产物**按 `scenario_id` 配对**，逐条比 `title`／`wake_word`／`status`／`types`／`prompt_template`／`editable_fields`（name 序列、label、hint）。

```
偏差总数 = 53　分类 = {"prompt":18,"label":11,"hint":9,"title":3,"fields":12}
prompt 逐字未动 = 12／30　title 逐字未动 = 27／30
wake_word 差异 0 处、types 差异 0 处
```

| 维度 | 对账结果 |
|---|---|
| **条数** | 老 30 ↔ 新 30，**一条不多、一条不少**；8 域、13 二级组、4 兜底一一对上 |
| **名称** | `title` **3 处**、`label` **11 处**、`hint` **9 处**（全是换说法，逐条见声明五）；`wake_word` **0 处偏差**；`editable_fields` 的 64 个 `name` 全部逐字（`true` 那条由 YAML 布尔改回字符串 `'true'`，属声明项） |
| **顺序** | 域序＝老 `categories` 序；组序＝二级组首次出现序；组内序＝yaml 书写序；场景全局序＝老转换层（＝老实物）序。三者都在生成器里断言，逐条通过 |
| **反复触发词** | `备忘改分类` 一词对两场景（`memo_change_category_single`／`memo_batch_change_category`）**逐字保留**——老 yaml 头注 `:16` 自述「单条+批量 共用」，非缺陷（裁决 7／§五待裁项 1） |
| **不进资产的兄弟字段** | `result`／`dependencies` **有意不落**，照老转换层 `memo_render.py:535`「result / dependencies 不展示(数据留 yaml · #295 决议)」 |

**两个口径分开记（复审 M3(3) 要求）**：

1. **对账偏差 = 53 处**（机器按 id 配对逐字段比对得出，**全部是声明项**）：18 处 `prompt_template`（34 个片段）＋ 11 处 `label`（＝裁决 6 补中文名 10 ＋ 换说法 1）＋ 9 处 `hint` ＋ 3 处 `title` ＋ 12 处字段剔除（`html`）＝ **53**。**没有第 54 处。**
2. **该清未清的格子 = 0 格**（复审员 I 的 M1 口径：可见面逐 token 复扫，21 个实现记号命中数全 0；上一轮它点名的 **18 格已全清**，见声明五）。这两个数**不是一回事**：53 是「我改了多少处、逐条报备」，0 是「还剩多少处没改」。上一轮我错在把「残余」写成全称句（「残余只有 ID／HTML／UI／Python」），实际当时还有 18 格——那句话已作废重写（§3.1 第 15 行）。

### 3.3 五类改动的逐条声明

#### 声明一 · 二级组 id：老 0 起 → 新 1 起（票 6 V8=A；这是**对老生成器的有意偏离**）

| # | 域 | 老 id（0 起） | 新 id（1 起） | `label` | 场景数 | 兜底 | 场景 id（组内序） |
|---|---|---|---|---|---|---|---|
| 1 | `memo` | `memo_0` | `memo_1` | 基础记录 | 3 | | `memo_add_basic`／`memo_update_basic`／`memo_delete_basic` |
| 2 | `memo` | `memo_1` | `memo_2` | 分类调整 | 3 | | `memo_change_category_single`／`memo_change_subcategory`／`memo_batch_change_category` |
| 3 | `search` | `search_0` | `search_1` | 基础查找 | 3 | | `memo_search_keyword`／`memo_search_alias`／`memo_get_detail` |
| 4 | `search` | `search_1` | `search_2` | 时间查找 | 1 | | `memo_search_by_date` |
| 5 | `search` | `search_2` | `search_3` | 分类查找 | 3 | | `memo_search_wish`／`memo_search_checkin`／`memo_search_mood` |
| 6 | `remind` | `remind_0` | `remind_1` | 创建提醒 | 2 | | `memo_remind_with_note`／`memo_remind_existing` |
| 7 | `remind` | `remind_1` | `remind_2` | 查看提醒 | 2 | | `memo_reminders_active`／`memo_completed_reminders` |
| 8 | `wish` | `wish_0` | `wish_1` | 心愿推进 | 2 | | `memo_complete_wish`／`memo_wish_schedule` |
| 9 | `wish` | `wish_1` | `wish_2` | 心愿管理 | 3 | | `memo_add_wish`／`memo_delete_wish`／`memo_update_wish` |
| 10 | `checkin` | `checkin_0` | `checkin_1` | **基础** | 3 | ✅ | `memo_add_checkin`／`memo_delete_checkin`／`memo_update_checkin` |
| 11 | `mood` | `mood_0` | `mood_1` | **基础** | 3 | ✅ | `memo_add_mood`／`memo_delete_mood`／`memo_update_mood` |
| 12 | `sync` | `sync_0` | `sync_1` | **基础** | 1 | ✅ | `memo_sync_feishu` |
| 13 | `init` | `init_0` | `init_1` | **基础** | 1 | ✅ | `memo_init_setup` |

**偏离只有序号基址一处**：老生成式 `f"{cat_key}_{len(g['subgroups'])}"`（`memo_render.py:559`，0 起）→ 新 `f"{域id}_{序数}"` 1 起（记账通式，票 6 V8=A）。`label`／分组归属／组内场景**逐字照旧**。

#### 声明二 · `prompt_template` 去命令化 ＋ 去 DB／实现细节（34 处片段／26 行／18 场景，逐行在附录表 2）

- **CLI 类 9 处**（用户 U6）：分解＝`--html` **6 个场景**（`memo_search_keyword`／`memo_get_detail`／`memo_reminders_active`／`memo_complete_wish`／`memo_wish_schedule`／`memo_sync_feishu`）＋ 子命令名 **4 个场景**（`wish-complete`／`wish-batch-plan`／`update-category`／`complete-wish`；后两个场景与前一组重叠）＋ `-c` **1 个场景**（`memo_search_wish`）⇒ **并集 8 个场景**（＝裁决 14 的口径，**不是** 4＋4）。
- **DB 类 12 处／10 场景**（老 yaml `:9`「不暴露 CLI / DB / Python / 模板路径」）：
  - **裁决点名的那 6 处全部落地**（＝侦察报告 A.5.2 行 1–6）：`wish_schedule` 的 `notes.due + 飞书 task 同步 due`／`sync_feishu` 的 `反向同步 due(… notes.due 跟)`／`complete_wish` 的 `新建打卡 note(同事务)`／`add_wish` 的 `创建心愿 note…写回 task_guid` 与 `tasklist GUID`／`remind_with_note` 的 `Cron 到点触发推送`；
  - **另 6 处是按同一条规则续扫出来的**（侦察报告 A.5.2 漏列）：`reminders_active` 的 `active=默认/dismissed`、`sync_feishu` 的 `飞书 task`、`delete_wish`／`update_wish` 的 `飞书 task`、`add_checkin`／`add_mood` 的 `创建… note`（新增 5 个场景）。**裁决 21 判：保持 12 处**（规则不是「只许 6 处」）。
- **IMPL 类 13 处／10 场景**（裁决 21 D7 ＋ 复审 M1：编程语言名／接口名／DB 列名／内部状态值／标记语言名 → 用户话）：
  - 裁决 21 D7 的 **3 处**（`memo_init_setup`）：`检查并配置 Python`→`检查并配置运行环境`、`飞书 CLI(未安装则引导我安装并授权)`→`飞书联动(…)`、`、环境变量,初始化数据库`→`、配置项,初始化数据库`。口径＝**换成用户能说的话、保留语义不删信息**，且与老 `SKILL.md:312-317` 的安装 prompt（逐字用「运行环境／数据存储／飞书联动(可选)／配置数据目录」）**同词**——即这不是新造说法，是老侧自己就有的用户话；`数据库`/`初始化数据库` 保留（老 `SKILL.md:314` 同样用「初始化数据库:建好备忘录的数据表」，属老侧用户口径）。
  - 复审员 I 的 **M1 那 10 处**（`原子操作`→直说结果、`同事务`→删、`影响行数`→`改动了几条`、`字段`→`内容`、`(含 11 统计字段)`→`(11 项统计)`、`二阶属性`→`内容的细分`、`HTML`→`网页`、`UI`→`页面`、`(建议目标,可在 HTML 改)`→`(…可在网页上改)`；逐条见附录表 2 第 1–5、7、12、13、15、25 行）。
- 反向断言（生成器内建）：清洗后任何 `prompt_template` 若仍含 **30 个**实现记号之一 ⇒ 当场抛错；`memo_init_setup` **另加**逐场景禁用 `Python`／`CLI`／`环境变量`（`Python` 不入全局表——它在 `memo_add_wish` 里是**用户内容示例**「如"想学 Python"」，删了会丢例子）。

#### 声明三 · `editable_fields` 清洗（老 76 → 新 64；要清 22 条 ＝ 1 布尔 ＋ 9 非 html 落回 ＋ 12 html）

| 处置 | 条数 | 条目 |
|---|---|---|
| 剔除 `html` CLI 开关 | **12** | `memo_batch_change_category`／`memo_search_keyword`／`memo_get_detail`／`memo_search_by_date`／`memo_search_wish`／`memo_search_checkin`／`memo_search_mood`／`memo_reminders_active`／`memo_completed_reminders`／`memo_complete_wish`／`memo_wish_schedule`／`memo_sync_feishu` |
| 补中文 `label` | **10** | `memo_delete_basic/true`→跳过二次确认（**那条布尔脏数据**）、`memo_search_by_date/start`→开始日期、`…/end`→结束日期、`memo_remind_with_note/remind_at`→提醒时间、`…/repeat_rule`→重复规则、`memo_remind_existing/remind_at`→提醒时间、`…/repeat_rule`→重复规则、`memo_reminders_active/status`→提醒状态、`memo_add_wish/tasklist_guid`→飞书任务清单、`memo_add_checkin/reminder_id`→关联提醒 |

- **22 条的算法照裁决 6**：`1 布尔 ⊂ 9 非 html 落回` ⇒ `①∪②∪③ = 1＋9＋12 = 22`（**不是 23，也不是 35**）。生成器断言 `老侧 html 字段数 = 12`、`老侧布尔脏字段数 = 1`、`老字段数 = 76`、`新字段数 = 64`。
- 布尔那条的清洗口径：YAML 把键 `true` 解析成布尔 ⇒ `name`／`label` 双双成布尔（老实物里逐字就是 `"name": true, "label": true`），**过不了** `base-render` 的 `editable_fields` schema。清洗＝**键按字符串 `'true'` 落**（`name` 必须 string），`label` 取老 `DIM_LABEL_MAP` 里本来就有的 `跳过二次确认`（`memo_render.py:58`）。⇒ 保留老键形，不另造新键名（另一种合法改法是改名 `confirm_skip`，未采用，理由：老表里已有 `"true"` 的中文名，说明原意就是字符串键）。
- `value` 全 `''`、`required` 全 `false`；`hint` **逐字照老转换层**（`memo_render.py:563-567`），**只有 9 处**按裁决 21 D5 ＋ 复审 M1 换说法（见声明五）。

#### 声明四 · 新增 `aliases` 12 条（老 yaml `:30` 禁此字段，管不到本仓资产）

| # | 别名 | 归到场景 | 出处（老侧优先） |
|---|---|---|---|
| 1 | `完成打卡` | `memo_complete_wish` | 老 `SKILL.md:262`（「完成心愿(别名:完成打卡)」）／`:300` |
| 2 | `初始化` | `memo_init_setup` | 老 `SKILL.md:300`（yaml 里 0 次） |
| 3 | `新手` | `memo_init_setup` | 老 `SKILL.md:300` |
| 4 | `记情绪日记` | `memo_add_mood` | 老 `SKILL.md:479`（正文用新名，yaml 主词是 `记情绪`） |
| 5 | `查情绪日记` | `memo_search_mood` | 老 `SKILL.md:525`／`:536`／`:540` |
| 6 | `改情绪日记` | `memo_update_mood` | 老 `SKILL.md:547` |
| 7 | `删情绪日记` | `memo_delete_mood` | 老 `SKILL.md:563` |
| 8 | `批量改分类` | `memo_batch_change_category` | 老 `SKILL.md:169`（表 1 口语列「批量改分类」）／`:644` 路由规则／`:731` 章节标题／`:754`；新表 `wakewords.ts:16` |
| 9 | `改子分类` | `memo_change_subcategory` | 新表 `wakewords.ts:17`（老侧只作 `备忘改子分类` 的子串） |
| 10 | `查提醒` | `memo_reminders_active` | 新表 `wakewords.ts:22` ＋ 老 `memo_render.py:45` `COMMAND_CN_MAP["reminders"]="查提醒"` |
| 11 | `记一条` | `memo_add_basic` | 新表 `wakewords.ts:28` |
| 12 | `添加笔记` | `memo_add_basic` | 新表 `wakewords.ts:29`（老侧仅 `SKILL.md:477` 章节名） |

**收词规则与「不进取」（逐条给出反证）**：
- **只收老侧会路由的词**；来源三处照裁决 19 的订正：① 老 `references/scenarios.yaml`（主词本身）② 老 `SKILL.md` 两张表与 `:300`／`:302-305` ③ `references/examples.md`（**贡献 0 条**：该文件 12 个例子全是 `script/memo_cli.py …` 命令示例，没有词形别名——已逐行读过）。
- **CLI 子命令那一处贡献 0 条**（老 `memo_cli.py` 里 `alias|aliases|HELP_` 零命中）——**本票没有去那里找词**。
- **42 条口语样例不进**（`SKILL.md:158-172`，是句子、带 `xxx`／`#15` 占位，不是词形路由键）；**HELP 自身 9 条不进**（用户 V1；落点 `meta_blocks` **存在但有意不用**，裁决 15）；**`查备忘` 不进**（它在 yaml 里有自己的场景卡 `memo_search_alias`，逐字保留为主词）；**`废弃提醒` 不进**（新表有、老侧零场景可归，裁决 7「无老场景可归 → 不落页面」）。
- `:302-305` 那 12 条分类子唤醒词（记/删/改/查 × 心愿/打卡/情绪）**已入选**——它们**就是**老场景的主词（yaml `wake_word` 逐字），故落在 `wake_word` 位而非 `aliases`；与 `:479` 等正文的「…情绪日记」新写法配对后，新写法那 4 条进 `aliases`（上表 4–7）。
- **零冲突**：别名与主词撞词 0 处、别名之间重复 0 处（生成器断言）；`备忘改分类` 一词对两场景**逐字保留**（老 yaml 头注 `:16` 自述「单条+批量 共用」，非缺陷）。

#### 声明五 · `title`／`label`／`hint` 换说法（**23 处** ＝ `title` 3 ＋ `label` 11 ＋ `hint` 9）

口径＝裁决 21 D5「**保留语义、只换说法、不许删信息**」＋ 复审员 I 的 M1 逐条改法；每处都由生成器的 `TEXT_EDITS` 表驱动，断言「老片段恰好出现 1 次」，改完再过 `VISIBLE_FORBIDDEN` 扫描（命中即抛）。

**A. 复审 M1 点名的 18 格（本轮新清）**

| # | 位置 | 场景 | 老（逐字） | 新（逐字） | 改法依据 |
|---|---|---|---|---|---|
| 1 | `title` | `memo_batch_change_category` | `批量改分类(过程型 HTML 向导)` | `批量改分类(网页向导)` | `HTML`→`网页` |
| 2 | `title` | `memo_complete_wish` | `把心愿标记为已完成(原子操作)` | `把心愿标记为已完成(转成打卡记录)` | `原子操作`→**直说结果** |
| 3 | `prompt` | `memo_update_basic` | `AI 更新这条备忘的字段,告诉你修改后的内容。` | `AI 更新这条备忘的内容,告诉你修改后的结果。` | `字段`→`内容` |
| 4 | `prompt` | `memo_delete_basic` | `AI 删除这些备忘并告知影响行数;` | `AI 删除这些备忘并告诉你改动了几条;` | `影响行数`→`改动了几条` |
| 5 | `prompt` | `memo_change_category_single` | `(它是内容维度的二阶属性)。` | `(它是内容的细分)。` | `二阶属性`→`内容的细分` |
| 6 | `label:with_reminders` | `memo_delete_basic` | `级联删除提醒` | `连同关联提醒一起删` | `级联`→用户话 |
| 7 | `hint:with_reminders` | `memo_delete_basic` | `是否级联删关联提醒(默认否,有提醒则报错)` | `是否连同关联提醒一起删(默认否,有提醒则报错)` | 同上 |
| 8 | `hint:true` | `memo_delete_basic` | `跳过二次确认(自动化用)` | `跳过二次确认` | `自动化用`→**删**（该参数是给用户填的，不是只给自动化） |
| 9 | `hint:bulk_indicator` | `memo_change_category_single` | `原话含'都/全部/多个 ID' → 走批量版` | `多条一起改时,写「都」或「全部」` | **不再暴露内部路由**（原文像给 AI 的路由指令） |
| 10 | `hint:bulk_indicator` | `memo_batch_change_category` | `原话含'都/全部/多个 ID'` | `一次改多条(原话含「都/全部/多个 ID」)` | 同上，改成用户视角 |
| 11 | `hint:keyword` | `memo_search_keyword` | `搜索词(全文索引)` | `搜索词` | `全文索引`→删（实现词） |
| 12 | `prompt` | `memo_get_detail` | `AI 显示这条备忘的全部字段。` | `AI 显示这条备忘的全部内容。` | `字段`→`内容` |
| 13 | `prompt` | `memo_sync_feishu` | `并生成同步报告页(含 11 统计字段)。` | `并生成同步报告页(11 项统计)。` | `字段`→`项统计` |
| 14 | `prompt` | `memo_complete_wish` | `AI 执行原子操作:删除该心愿 + 新建一条打卡记录(同事务)。` | `AI 删除该心愿并新建一条打卡记录。` | `原子操作`＋`同事务`→直说结果 |
| 15 | `prompt` | `memo_complete_wish` | `你在 HTML 勾选 + 填打卡内容。` | `你在页面上勾选 + 填打卡内容。` | `HTML`→`页面` |
| 16 | `prompt` | `memo_wish_schedule` | `你在 HTML 微调。` | `你在页面上微调。` | 同上 |
| 17 | `prompt` | `memo_batch_change_category` | `AI 生成批量改分类向导 HTML,你在 UI 勾选 + 选目标分类` | `AI 生成批量改分类向导网页,你在页面上勾选 + 选目标分类` | `HTML`→`网页`、`UI`→`页面` |
| 18 | `prompt` | `memo_batch_change_category` | `目标分类: _____________ (建议目标,可在 HTML 改)` | `目标分类: _____________ (建议目标,可在网页上改)` | 同上 |

**B. 裁决 21 D5 的 4 处（上一轮已清，列此备查）**

| # | 位置 | 场景 | 老（逐字） | 新（逐字） | 备注 |
|---|---|---|---|---|---|
| 19 | `title` | `memo_wish_schedule` | `给心愿设排期日期(同步飞书 due)` | `给心愿设排期日期(同步到飞书)` | `due` 是列名 |
| 20 | `hint:tasklist_guid` | `memo_add_wish` | `飞书任务清单 GUID(可选)` | `飞书任务清单 ID(可选)` | **保留「飞书」**（裁决示例写「任务清单 ID」，本票补回归属） |
| 21 | `hint:status` | `memo_reminders_active` | `active(默认)/dismissed` | `有效(默认)/已废弃` | 用老侧自己的词（「有效提醒」／`dismiss`＝废弃提醒）；与裁决示例「活跃／已忽略」同义不同词 |
| 22 | `hint:sub_category` | `memo_change_subcategory` | `新子分类(2 字自由文本,'null' 清除)` | `新子分类(2 字自由文本,留空即清除)` | `'null'`→`留空` |

**C. 裁决 6 的 10 处 `label` 补中文名**（`memo_delete_basic/true`→跳过二次确认 等）见附录表 5 第 6、13–19、21、23 行——那 10 处**不是** M1 项，属裁决 6 的既定清洗。

> 23 处**都不删信息**：`飞书`／`有效`／`废弃`／`留空`／`多条一起改`／`转成打卡记录` 全部保留或换成更准的中文词；第 20／21 条与裁决示例的差异**只有用词**，语义一一对应（§六 D5 有说明，裁决 21 明示接受反驳）。

---

## 四、必报五步 · 第四步：**已超线，需要根据规则进行重构。**

> 按 `packages/skill-memo-ilife/AGENTS.md`：告警线 350 ＋ LF 口径（只数 `\n`），范围含本包 `src/**/*.ts` 与包内 `scripts/*.mjs`。

- **实测（复审 M1 后重测）**：`packages/skill-memo-ilife/scripts/gen-help-assets.mjs` ＝ **497 LF**，超线 **147 行**；9 个产物件 43–131 LF，**全部在线上**。
- **为什么超**：这个生成器一个人干了五件事——读载荷、读 yaml 并两源交叉复核、四张声明式清洗表（34 处 prompt 改写／23 处 title／label／hint／12＋10 处字段清洗／12 条别名）、形状断言（30/8/13/4/64/12＋原子计数＋两张禁用词扫描表）、9 个文件的序列化与 `--check`。**表本身占 ~130 行**，而以「逐条可核」为要求，这些表不宜压缩。
- **这次为什么先不拆**（三条，均可核）：① 它是**一次性生成器、不进 build／test 管线**（文件头 `:7` 写明，事实源在仓外，CI 本就不跑）；② 拆成两个模块会让「读老骨架 → 写资产」这条**单向管线**多一层间接（第二处事实源路径／第二份摘要常量），收益不抵阅读成本；③ 真正的判据是**产物**——9 个资产件全部远在线上，且它们是 `tsc` 编译进 `dist` 的源码。
- **拆法（留给后来者，随时可做）**：把「老 yaml 单行标量解析 ＋ canonical 序列化／摘要」整段（约 70 行）移出为 `scripts/gen-help-yaml.mjs`，生成器只 `import`；届时两件都远在 350 线下。
- ⚠️ 本票**不擅自新增文件**：票 5 `t225-structure-design.md` 的文件清单逐字是「脚本 **1 个**」，多拆一件等于改票 5 的形状，留给编排裁（§六 D3）。

---

## 五、给下游的接口（#228／#229 直接用）

```ts
// packages/skill-memo-ilife/src/help/sceneData.ts —— 3 个导出
export const MEMO_HELP_VERSION: string;            // '1.3.0'（生成器从老 yaml 顶层读入）
export const MEMO_HELP_GROUPS: readonly ...[];     // 8 个域对象（域序＝老 categories 序）
export function buildHelpSceneIndex(): {
  items: { id; icon; label; subgroupCount; sceneCount }[];   // 一行一域
  total: number; subgroupTotal: number; sceneTotal: number; version: string;
};                                                  // 实测 {total:8, subgroupTotal:13, sceneTotal:30, version:'1.3.0'}
```

- 每个场景的键序：`id`／`title`／`wake_word`／`status`／`prompt_template`／`types`／`editable_fields`（可选）／**`aliases`（可选，资产侧专有）**。**渲染载荷必须先剥 `aliases`**（裁决 5）——`base-render` 的 `scenes[]` 是闭集 7 键，塞进去会校验失败。
- **`aliases` 是资产侧字段，不在 `SCENE_DATA_SCHEMA` 里**：`report §三.1` 的端到端实测显示 #228 现有的逐键重建已把它剥干净（载荷 0 处）。
- 版本只有**一处定义**（生成器从老 yaml 顶层读）；#228 取版本的正确姿势是 **`buildHelpSceneIndex().version`**（盘上 `helpFile.ts:181` 就是这么取的）。**不要**在 `helpFile.ts` 里再写一份字面量，也**不要**再要一个独立导出——复审 M2 已把 `MEMO_HELP_VERSION` 的导出撤掉。这 2 个名字**不进** `src/help/index.ts` 的转发、**不扩包根出口**（裁决 16；实测包根运行时出口 **49**、`MEMO_HELP_*` 前缀 **0** 个）。

---

## 六、偏差与拿不准（逐条，含裁决 21 与复审员 I 的处置）

| # | 事项 | 事实 | 本票处置 | 裁决／复审结论 |
|---|---|---|---|---|
| **D1** | 「涉及场景＝29」的口径 | 老侧有 `dimensions` 的场景 = **29**（`memo_init_setup` 为空）✅；但**清洗掉 12 条 `html` 后**，`memo_completed_reminders` 与 `memo_sync_feishu` 的唯一维度就是 `html` ⇒ 这两条清洗后**一个字段都不剩**，真产物里**没有** `editable_fields` 键 ⇒ 清洗后仍带字段的场景 = **27** | 两个数都断言、都在报告里给（29／27）；两条场景按老转换层「空 ⇒ 不出键」（`... or None`）的口径**不落空数组** | **判 27，落法正确**（裁决 21 D1）；编排已把裁决 6 订正为 27 |
| **D2** | DB 类清洗从 6 处扩到 12 处 | 裁决点名 6 处（侦察 A.5.2 行 1–6）全部落地；按**同一条规则**续扫又找出 6 处：`active=默认/dismissed`(prompt)／`飞书 task`×3／`创建…note`×2 | **一并清洗**，逐行在附录表 2 声明 | **保持 12 处**（裁决 21 D2：裁决给的是规则，不是「只许 6 处」） |
| **D3** | 生成器超线（现 497 LF） | §四 | 按第四步当场报，**先不拆**（理由三条） | **维持「先不拆」**（裁决 21 D3），理由成立 |
| **D4** | `sceneData.ts` 导出数 | **盘上事实（复审员 I 实测，本席复核）**：`src/help/helpFile.ts:37` 只 `import { MEMO_HELP_GROUPS, buildHelpSceneIndex }`；`:181` 用 `const version = String(buildHelpSceneIndex().version);` ⇒ `MEMO_HELP_VERSION` **零外部消费者**。⚠️ 我上一轮写的「`helpFile.ts:32` 逐字 import `MEMO_HELP_VERSION`」**盘上不存在**（该行是更早的一版文件，#228 后来改了 import；我按旧快照当证据，属引证不实，复审 M3(2) 指出，认） | **撤掉 `MEMO_HELP_VERSION` 的导出**，回到 **2 个导出**（`MEMO_HELP_GROUPS`／`buildHelpSceneIndex()`）；`version` 仍是生成器从老 yaml 顶层写入、**唯一来源**（不再手写副本，裁决 9 不破） | **裁决 21 D4 已被复审 M2 推翻**：回到 2 个导出（独立导出是没人用的接口，违铁律五）。本票已执行，`Object.keys()` 实测 2 个 |
| **D5** | 残余可见文案 | **复审 M1 的实质缺口**：我第一轮只清了自己点过名的词，**同一条规则没有续扫**，页面上还留着 **18 格**实现细节字面（`原子操作`／`同事务`／`影响行数`／`级联`×2／`全文索引`／`字段`×3／`二阶属性`／`批量版`×2／`自动化用`／`HTML`×6／`UI`）——**我上一轮那句「残余只有 `ID`／`HTML`／`UI`／`Python`」的全称断言为假**（复审 M3(1) 指出，认） | **18 格已全清**（声明五 A 表逐条）；新记号**补进生成器 `VISIBLE_FORBIDDEN`**（现 30 个 token，命中即抛）；**`HTML`／`UI` 的自设豁免已撤**（复审员 I 判其不成立：`HTML` 就是标记语言名，且那条例外是生成器注释自设的，裁决只给了「改成会丢语义」这一条例外） | **已执行**；两处用词保留我的选择（`飞书任务清单 ID(可选)` 保留「飞书」、`有效/已废弃` 用老侧词），裁决 21 明示接受反驳 |
| **D6** | 别名里 4 条只有新表依据 | `改子分类`／`查提醒`／`记一条`／`添加笔记`：老侧**没有**独立词形（分别是老词子串／老渲染层中文名／章节名） | 按裁决 7 **收**（12 条与侦察报告 A.7 的 12 条逐条一致） | **保持 12**（裁决 21 D6）；裁决 5 的措辞已由编排订正为「只收会路由的词（老侧或新表），排除自由口语样例」 |
| **D7** | `memo_init_setup` 的 `Python`／`CLI`／`环境变量` | 该条是安装指引，侦察 A.5.2 行 7 说「不建议清」（**建议不是裁决**） | **已按裁决 21 清洗**（声明二 IMPL 类前 3 处）；`数据库`／`初始化数据库`／`调度` **保留**，理由：老 `SKILL.md:312-317` 的安装 prompt 自己就用「运行环境／飞书联动(可选)／**初始化数据库**／提醒调度」这套用户话，换词与老侧同词、不误导用户 | **已执行**（裁决 21 D7）；保留项理由如上 |
| **M3** | 报告两处不实句 | ① §3.1-15 与 §六末的**全称断言**「残余只有 `ID`／`HTML`／`UI`／`Python`」为假；② §六 D4 引的 `helpFile.ts:32` 逐字引文盘上不存在 | ① 已改成**全量清单**（§3.1 第 15 行：21 个 token 命中数全 0 ＋ 有意保留 6 类逐条列）；② 已按盘上事实重写（见本表 D4 行）；两个口径已在 §3.2 分开记 | **已执行** |

**有意保留、不进清洗表的可见记号（全量，供复审一眼核 —— 它们都不是实现细节）**：`ID` **47 格**（老侧用户词「笔记 ID」，且裁决 21 给的替换词就是「任务清单 ID」）／`YYYY-MM-DD` 等格式占位 **13 格**／`Python` **1 格**（`memo_add_wish` 的**用户内容示例**「如"想学 Python"」，删了会丢例子）／`数据存储` 1 格、`初始化数据库` 1 格、`调度` 1 格（老 `SKILL.md:312-317` 安装 prompt 逐字）。这四类由生成器的扫描表**显式排除**，理由写在生成器注释里。

> **还差一条我没做、给出理由**：复审建议「在 `test/help-file-228.test.mjs` 加一条正则门（`原子操作|同事务|影响行数|级联|全文索引|HTML|GUID|null|active|dismissed` 命中 0）」。**那个文件是 #228 的件**（编排已点名「我的地盘」不含它），本票**没有改它**——同一条规则我已落在**生成器**里 fail-closed（`VISIBLE_FORBIDDEN` ＋ `PROMPT_FORBIDDEN` 两张表，跑生成器即门）。若编排要把它加进那道测试门，请交给 #228 或明示授权我改。

---

## 附录 · 五张机器生成的对账表

> 生成方式：从**真产物**（`dist`）与**老实物载荷**直接对比打印，非手抄。

### 表 1 · 30 行 `type` → `types`（逐字拆分，域序＋组内序）

| # | 场景 id | 唤醒词 | 老 `type` | `types` | 原子 | 字段数 | `aliases` |
|---|---|---|---|---|---|---|---|
| 1 | `memo_add_basic` | 记备忘 | `采集+回执` | `["采集", "回执"]` | 2 | 4 | 记一条、添加笔记 |
| 2 | `memo_update_basic` | 改备忘 | `采集+回执` | `["采集", "回执"]` | 2 | 4 | — |
| 3 | `memo_delete_basic` | 删备忘 | `采集+回执` | `["采集", "回执"]` | 2 | 3 | — |
| 4 | `memo_change_category_single` | 备忘改分类 | `采集+回执` | `["采集", "回执"]` | 2 | 3 | — |
| 5 | `memo_change_subcategory` | 备忘改子分类 | `采集+回执` | `["采集", "回执"]` | 2 | 2 | 改子分类 |
| 6 | `memo_batch_change_category` | 备忘改分类 | `向导+采集+回执` | `["向导", "采集", "回执"]` | 3 | 3 | 批量改分类 |
| 7 | `memo_search_keyword` | 搜备忘 | `查看+回执` | `["查看", "回执"]` | 2 | 4 | — |
| 8 | `memo_search_alias` | 查备忘 | `查看+回执` | `["查看", "回执"]` | 2 | 1 | — |
| 9 | `memo_get_detail` | 看备忘 | `查看+回执` | `["查看", "回执"]` | 2 | 1 | — |
| 10 | `memo_search_by_date` | 按时间搜备忘 | `查看+回执` | `["查看", "回执"]` | 2 | 3 | — |
| 11 | `memo_search_wish` | 查心愿 | `查看+回执` | `["查看", "回执"]` | 2 | 2 | — |
| 12 | `memo_search_checkin` | 查打卡 | `查看+回执` | `["查看", "回执"]` | 2 | 1 | — |
| 13 | `memo_search_mood` | 查情绪 | `查看+回执` | `["查看", "回执"]` | 2 | 1 | 查情绪日记 |
| 14 | `memo_remind_with_note` | 记提醒 | `采集+回执` | `["采集", "回执"]` | 2 | 4 | — |
| 15 | `memo_remind_existing` | 设提醒 | `采集+回执` | `["采集", "回执"]` | 2 | 5 | — |
| 16 | `memo_reminders_active` | 看提醒 | `查看+回执` | `["查看", "回执"]` | 2 | 1 | 查提醒 |
| 17 | `memo_completed_reminders` | 查已提醒备忘 | `查看+回执` | `["查看", "回执"]` | 2 | 0 | — |
| 18 | `memo_complete_wish` | 完成心愿 | `向导+采集+回执` | `["向导", "采集", "回执"]` | 3 | 2 | 完成打卡 |
| 19 | `memo_wish_schedule` | 心愿排期 | `向导+采集+回执` | `["向导", "采集", "回执"]` | 3 | 2 | — |
| 20 | `memo_add_wish` | 记心愿 | `采集+回执` | `["采集", "回执"]` | 2 | 4 | — |
| 21 | `memo_delete_wish` | 删心愿 | `采集+回执` | `["采集", "回执"]` | 2 | 1 | — |
| 22 | `memo_update_wish` | 改心愿 | `采集+回执` | `["采集", "回执"]` | 2 | 2 | — |
| 23 | `memo_add_checkin` | 记打卡 | `采集+回执` | `["采集", "回执"]` | 2 | 3 | — |
| 24 | `memo_delete_checkin` | 删打卡 | `采集+回执` | `["采集", "回执"]` | 2 | 1 | — |
| 25 | `memo_update_checkin` | 改打卡 | `采集+回执` | `["采集", "回执"]` | 2 | 2 | — |
| 26 | `memo_add_mood` | 记情绪 | `采集+回执` | `["采集", "回执"]` | 2 | 2 | 记情绪日记 |
| 27 | `memo_delete_mood` | 删情绪 | `采集+回执` | `["采集", "回执"]` | 2 | 1 | 删情绪日记 |
| 28 | `memo_update_mood` | 改情绪 | `采集+回执` | `["采集", "回执"]` | 2 | 2 | 改情绪日记 |
| 29 | `memo_sync_feishu` | 备忘录同步 | `查看+回执` | `["查看", "回执"]` | 2 | 0 | — |
| 30 | `memo_init_setup` | 首次使用 | `向导+采集+回执` | `["向导", "采集", "回执"]` | 3 | 0 | 初始化、新手 |

原子计数：`{回执: 30, 采集: 20, 查看: 10, 向导: 4}`，合计 64；**30 场景 ＝ 26 条两原子 ＋ 4 条三原子**（裁决 14）；`选择` 0 次。

### 表 2 · `prompt_template` 逐行改写（老行 → 新行，机器 diff 得出；26 行／34 处片段／18 场景）

| # | 场景 id | 老行（逐字） | 新行（逐字） |
|---|---|---|---|
| 1 | `memo_update_basic` | `  AI 更新这条备忘的字段,告诉你修改后的内容。心愿类会同步飞书任务标题。` | `  AI 更新这条备忘的内容,告诉你修改后的结果。心愿类会同步飞书任务标题。` |
| 2 | `memo_delete_basic` | `  AI 删除这些备忘并告知影响行数;有关联提醒时 AI 会先确认。` | `  AI 删除这些备忘并告诉你改动了几条;有关联提醒时 AI 会先确认。` |
| 3 | `memo_change_category_single` | `  AI 改这条备忘的顶层分类;子分类不会被改动(它是内容维度的二阶属性)。` | `  AI 改这条备忘的顶层分类;子分类不会被改动(它是内容的细分)。` |
| 4 | `memo_batch_change_category` | `  目标分类: _____________ (建议目标,可在 HTML 改)` | `  目标分类: _____________ (建议目标,可在网页上改)` |
| 5 | `memo_batch_change_category` | `  AI 生成批量改分类向导 HTML,你在 UI 勾选 + 选目标分类 → 采纳复制 → 调多条 update-category。` | `  AI 生成批量改分类向导网页,你在页面上勾选 + 选目标分类 → 采纳复制 → AI 逐条改分类。` |
| 6 | `memo_search_keyword` | `  AI 列出含关键词的所有笔记。带 --html 时生成可视化搜索结果页。` | `  AI 列出含关键词的所有笔记。并生成可视化搜索结果页。` |
| 7 | `memo_get_detail` | `  AI 显示这条备忘的全部字段。带 --html 时生成详情页。` | `  AI 显示这条备忘的全部内容。并生成详情页。` |
| 8 | `memo_search_wish` | `  AI 自动按"心愿"分类过滤,等同搜备忘 -c 心愿。` | `  AI 自动按"心愿"分类过滤。` |
| 9 | `memo_remind_with_note` | `  AI 先创建笔记,再创建关联提醒,Cron 到点触发推送。` | `  AI 先创建笔记,再创建关联提醒,到点自动推送提醒。` |
| 10 | `memo_reminders_active` | `  状  态: _____________ (选填,active=默认/dismissed)` | `  状  态: _____________ (选填,默认只看有效提醒)` |
| 11 | `memo_reminders_active` | `  AI 按时间排序列出提醒。带 --html 时生成可筛选的可视化页。` | `  AI 按时间排序列出提醒。并生成可筛选的可视化页。` |
| 12 | `memo_complete_wish` | `  AI 执行原子操作:删除该心愿 + 新建打卡 note(同事务)。` | `  AI 删除该心愿并新建一条打卡记录。` |
| 13 | `memo_complete_wish` | `  批量场景:先 wish-complete --html 生成向导,你在 HTML 勾选 + 填打卡内容。` | `  批量场景:先出一份完成向导页,你在页面上勾选 + 填打卡内容。` |
| 14 | `memo_wish_schedule` | `  AI 设置本地 notes.due + 飞书 task 同步 due。` | `  AI 设置本地排期日期,并与飞书任务同步。` |
| 15 | `memo_wish_schedule` | `  批量场景:先 wish-batch-plan --suggest-due X --html 生成向导,你在 HTML 微调。` | `  批量场景:先出一份排期向导页(可带建议日期),你在页面上微调。` |
| 16 | `memo_add_wish` | `  飞书任务清单: _____________ (选填,tasklist GUID,留空=我的任务)` | `  飞书任务清单: _____________ (选填,留空=我的任务)` |
| 17 | `memo_add_wish` | `  AI 创建心愿 note,自动建飞书 task 并写回 task_guid。` | `  AI 创建心愿笔记,自动建飞书任务并建立关联。` |
| 18 | `memo_delete_wish` | `  AI 删除这条心愿;若有飞书 task,会自动标完成。` | `  AI 删除这条心愿;若有飞书任务,会自动标完成。` |
| 19 | `memo_update_wish` | `  AI 更新内容,飞书 task 标题同步更新。` | `  AI 更新内容,飞书任务标题同步更新。` |
| 20 | `memo_add_checkin` | `  AI 创建打卡 note。` | `  AI 创建一条打卡记录。` |
| 21 | `memo_add_mood` | `  AI 创建情绪日记 note。` | `  AI 创建一条情绪日记。` |
| 22 | `memo_sync_feishu` | `  1. 本地补建(本地心愿无飞书 task → 自动建)` | `  1. 本地补建(本地心愿还没有飞书任务 → 自动建)` |
| 23 | `memo_sync_feishu` | `  2. 反向同步 done(飞书已完成 → 本地 complete-wish)` | `  2. 反向同步完成状态(飞书已完成 → 本地标记完成)` |
| 24 | `memo_sync_feishu` | `  3. 反向同步 due(飞书 due 改 → 本地 notes.due 跟)` | `  3. 反向同步排期日期(飞书那边改了日期 → 本地跟着改)` |
| 25 | `memo_sync_feishu` | `  带 --html 时生成同步报告页(含 11 统计字段)。` | `  并生成同步报告页(11 项统计)。` |
| 26 | `memo_init_setup` | `请按步骤帮我搭建好环境:检查并配置 Python、数据存储(全文搜索)、飞书 CLI(未安装则引导我安装并授权)、环境变量,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装/怎么配,完成后生成初始化报告页给我,并带我浏览一遍全部功能。` | `请按步骤帮我搭建好环境:检查并配置运行环境、数据存储(全文搜索)、飞书联动(未安装则引导我安装并授权)、配置项,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装/怎么配,完成后生成初始化报告页给我,并带我浏览一遍全部功能。` |

> 本表按**改动行**列（**26 行**）；按**改动片段**数是 **34 处**（第 26 行一行内含 3 处；第 1/2/3/5/7/12/17 行各含 1–2 处），牵动 **18 个场景**。

### 表 3 · `editable_fields` 清洗（老 76 → 新 64）

| 处置 | 条数 | 条目 |
|---|---|---|
| 剔除 `html` CLI 开关 | 12 | `memo_batch_change_category/html`、`memo_search_keyword/html`、`memo_get_detail/html`、`memo_search_by_date/html`、`memo_search_wish/html`、`memo_search_checkin/html`、`memo_search_mood/html`、`memo_reminders_active/html`、`memo_completed_reminders/html`、`memo_complete_wish/html`、`memo_wish_schedule/html`、`memo_sync_feishu/html` |
| 补中文 `label`（含 1 条布尔脏数据） | 10 | `memo_delete_basic/true`→跳过二次确认、`memo_search_by_date/start`→开始日期、`memo_search_by_date/end`→结束日期、`memo_remind_with_note/remind_at`→提醒时间、`memo_remind_with_note/repeat_rule`→重复规则、`memo_remind_existing/remind_at`→提醒时间、`memo_remind_existing/repeat_rule`→重复规则、`memo_reminders_active/status`→提醒状态、`memo_add_wish/tasklist_guid`→飞书任务清单、`memo_add_checkin/reminder_id`→关联提醒 |

### 表 4 · 域／二级组／场景／字段计数（派生）

| 域 | icon | label | 二级组 | 场景 | 字段 |
|---|---|---|---|---|---|
| `memo` | 📝 | 备忘类 | `memo_1`(基础记录) `memo_2`(分类调整) | 6 | 19 |
| `search` | 🔍 | 查找类 | `search_1`(基础查找) `search_2`(时间查找) `search_3`(分类查找) | 7 | 13 |
| `remind` | ⏰ | 提醒类 | `remind_1`(创建提醒) `remind_2`(查看提醒) | 4 | 10 |
| `wish` | 🎯 | 心愿类 | `wish_1`(心愿推进) `wish_2`(心愿管理) | 5 | 11 |
| `checkin` | ✅ | 打卡类 | `checkin_1`(基础) | 3 | 6 |
| `mood` | 💭 | 情绪类 | `mood_1`(基础) | 3 | 5 |
| `sync` | 🔄 | 同步类 | `sync_1`(基础) | 1 | 0 |
| `init` | 🚀 | 初始化类 | `init_1`(基础) | 1 | 0 |
| **合计** | | | **13** | **30** | **64** |

### 表 5 · `title`／`label`／`hint` 换说法（23 处；机器 diff 得出，逐条对应声明五）

| # | 位置 | 场景 | 老（逐字） | 新（逐字） |
|---|---|---|---|---|
| 1 | `title` | `memo_batch_change_category` | `批量改分类(过程型 HTML 向导)` | `批量改分类(网页向导)` |
| 2 | `title` | `memo_complete_wish` | `把心愿标记为已完成(原子操作)` | `把心愿标记为已完成(转成打卡记录)` |
| 3 | `title` | `memo_wish_schedule` | `给心愿设排期日期(同步飞书 due)` | `给心愿设排期日期(同步到飞书)` |
| 4 | `label`（`with_reminders`） | `memo_delete_basic` | `级联删除提醒` | `连同关联提醒一起删` |
| 5 | `hint`（`with_reminders`，label＝连同关联提醒一起删） | `memo_delete_basic` | `是否级联删关联提醒(默认否,有提醒则报错)` | `是否连同关联提醒一起删(默认否,有提醒则报错)` |
| 6 | `label`（`true`） | `memo_delete_basic` | `true`（布尔脏数据） | `跳过二次确认` |
| 7 | `hint`（`true`，label＝跳过二次确认） | `memo_delete_basic` | `跳过二次确认(自动化用)` | `跳过二次确认` |
| 8 | `hint`（`bulk_indicator`，label＝批量判定） | `memo_change_category_single` | `原话含'都/全部/多个 ID' → 走批量版` | `多条一起改时,写「都」或「全部」` |
| 9 | `hint`（`sub_category`，label＝子分类） | `memo_change_subcategory` | `新子分类(2 字自由文本,'null' 清除)` | `新子分类(2 字自由文本,留空即清除)` |
| 10 | `hint`（`to_category`，label＝目标分类） | `memo_batch_change_category` | `建议目标分类(HTML 可改)` | `建议目标分类(网页上可改)` |
| 11 | `hint`（`bulk_indicator`，label＝批量判定） | `memo_batch_change_category` | `原话含'都/全部/多个 ID'` | `一次改多条(原话含「都/全部/多个 ID」)` |
| 12 | `hint`（`keyword`，label＝关键词） | `memo_search_keyword` | `搜索词(全文索引)` | `搜索词` |
| 13 | `label`（`start`） | `memo_search_by_date` | `start` | `开始日期` |
| 14 | `label`（`end`） | `memo_search_by_date` | `end` | `结束日期` |
| 15 | `label`（`remind_at`） | `memo_remind_with_note` | `remind_at` | `提醒时间` |
| 16 | `label`（`repeat_rule`） | `memo_remind_with_note` | `repeat_rule` | `重复规则` |
| 17 | `label`（`remind_at`） | `memo_remind_existing` | `remind_at` | `提醒时间` |
| 18 | `label`（`repeat_rule`） | `memo_remind_existing` | `repeat_rule` | `重复规则` |
| 19 | `label`（`status`） | `memo_reminders_active` | `status` | `提醒状态` |
| 20 | `hint`（`status`，label＝提醒状态） | `memo_reminders_active` | `active(默认)/dismissed` | `有效(默认)/已废弃` |
| 21 | `label`（`tasklist_guid`） | `memo_add_wish` | `tasklist_guid` | `飞书任务清单` |
| 22 | `hint`（`tasklist_guid`，label＝飞书任务清单） | `memo_add_wish` | `飞书任务清单 GUID(可选)` | `飞书任务清单 ID(可选)` |
| 23 | `label`（`reminder_id`） | `memo_add_checkin` | `reminder_id` | `关联提醒` |

> 构成：`title` 3（M1 两条 ＋ 裁决 21 D5 一条）／`label` 11（裁决 6 的 10 条补中文名 ＋ M1 的 1 条换说法）／`hint` 9（裁决 21 D5 三条 ＋ M1 六条）。

---

## 七、没做的事（避免误读）

- 没 commit、没动 `#220` 或任何 issue；**裁决 21 之后一律不再动暂存区**（见 §八）。
- 没改 `packages/skill-memo-ilife/{cmd_read.ts,envelope.ts,package.json,SKILL.md}`（#229／#231）、没改 `tooling/check-boundaries.mjs`（#228）、没改 `packages/base-combos/**`（#229）、没改 `packages/base-render/**`（别的会话在动）、没碰 #229 正在改的 `test/render.test.mjs` 与 `docs/memo-migration-split.md`。
- 没改 `src/help/index.ts`：新件**不进**它的转发、包根出口**维持 49**（裁决 16，实测 49／`MEMO_HELP_*` 0 个）。
- 没跑仓根 `tsc -b`／`pnpm -r build`；没重启／触碰 GUI `127.0.0.1:43120`。
- 没在仓外新建任何文件（老技能目录与老实物 HTML 全程只读）；临时取证脚本与中间文件写在仓根 `.scratch-t227-*`，**每轮收工都清空**（见 §八）。

## 八、仓库卫生

- 临时取证脚本与产物（第一轮 9 个 ＋ 裁决 21 那轮 6 个 ＋ 复审 M1 这轮 5 个）**每轮收工都从仓根删净**：收工前 `Get-ChildItem . -Filter '.scratch-t227*'` **返回空**。
- **暂存区**：本票**不执行任何 `git add`／`git restore --staged`／`git reset`／`git commit`**（暂存与提交由编排独占管理；复审员 I 观察到的 13:34→13:39 索引变动是编排的 `restore`，不是本票动作）。本票的 4 类产物留在**工作树**里即为交付形态：
  `packages/skill-memo-ilife/src/help/scenes/*.ts`（8）、`packages/skill-memo-ilife/src/help/sceneData.ts`、`packages/skill-memo-ilife/scripts/gen-help-assets.mjs`、`docs/skills/skill-memo-ilife/t227-assets-report.md`（＋票面 `t227-body.md` 的进度行）。
- **票面已推线上**：`gh issue edit 227 --body-file docs/skills/skill-memo-ilife/t227-body.md`（本轮执行，未 close）。
- 工作树里别的会话的改动（`packages/skill-chef/**`、`packages/skill-schedule/**`、`packages/plugin-chef/**`、`packages/base-render/**`、`pnpm-lock.yaml`、`tooling/check-boundaries.mjs`）**全程只读**，一个字节没碰。
