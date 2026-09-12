# 复审员 J · 对抗式复审：#228「渲染接线」的打假报告

- 复审对象：`packages/skill-memo-ilife/src/help/helpFile.ts`、`packages/skill-memo-ilife/test/help-file-228.test.mjs`、`docs/skills/skill-memo-ilife/t228-render-report.md`、`docs/skills/skill-memo-ilife/t228-body.md`
- 权威裁决：`docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md`
- 复审日期／环境：2026-09-12 13:38–13:45；Node v24.19.0；Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe`（headless `--dump-dom`）
- 权限姿态：**只读**。未改 `packages/**`、未改任何 issue、未 `git add`／`restore`／`reset`／commit。构建**只对本包**（`tsc --build packages/skill-memo-ilife/tsconfig.json`，该 tsconfig **无 project references**，实测不牵动任何兄弟包）。临时脚本全部落 `%TEMP%\t228j\`。**未跑**仓根 `tsc -b`、**未跑** `pnpm -r build`、**未**碰 `127.0.0.1:43120`。

---

## 一、总评与评分

**总评一句话**：**渲染结论是真的。** 我用真浏览器（不是桩）跑完了整页，`备忘录 · 使用手册`／8 域／13 二级组／30 场景／6 个步骤卡「序号＋标题＋说明」齐全／`editable_fields` 点开卡片真出 4 个可编辑输入框，三条硬规矩在**渲染后的可见正文**上全部为 0，三门真绿；而且我独立渲染出的两份产物与票内 `D:\.tmp-t228\` 的两份**SHA-256 逐字节相同**——这份交付没有伪造运行结果。

**但「自报的数字与裁决出处」有硬伤**：产物字节数写成字符数（115 137 vs 真 130 885）、门 3 的「原始输出」不是所写命令的产物、以及**它引作最高依据的「裁决 20」在裁决正本里根本不存在**（正本编号 1–19、21、22，正好跳过 20；全仓「裁决 20」只出现在 #228 自己那两件文档里；#228／#220 的 issue 评论各 0 条）。取边的**技术结论我验为真**，但**裁决权威在仓内不可复核**。

| 维度 | 权重（我定） | 得分 | 扣分点名 |
| --- | --- | --- | --- |
| 渲染正确性 | 0.40 | **94** | ①初始化横幅把 `SKILLS_DB_PATH`／`MEMO_MEDIA_DIR`／`SQLite + FTS5`／`Python`／`CLI` 这些实现细节字面带上**可见正文**，报告未声明（−4）；②`subtitle` 在页面上**无渲染落点**（肉眼看不到「8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0」），报告 §六-2-4 声明了但没进 §六-1 对账行（−2） |
| 硬规矩合规 | 0.25 | **93** | ①三条硬规矩只用**载荷段**口径自证「页面上没有」，而验收是肉眼页面（−5）；②可见正文确有 1 处 `HELP`（关于页「备忘录 v1.3.0 · HELP 模板 v4」，共享模板自带），报告只报「载荷 HELP 0 处」，读者会读成「页面上没有 HELP」（−2） |
| 自证可信度 | 0.20 | **84** | ①「裁决 20 ①」那条回归锁是**恒真**断言：载荷 JSON 本身就在整页 HTML 里，`HTML.includes(文案)` 必然真，与「模板渲染」无关（−8）；②仓内**没有任何渲染后 DOM 的锁**，而本票验收面恰恰是页面（−6）；③门 3 引的原始输出不是所写命令产出、且时间戳早于最终源码（−2） |
| 报告诚实度 | 0.15 | **76** | ①字节数当字符数报（−7）；②「裁决 20」在正本查不到却当最高依据，且把正本条数写成「19 条」（实为 21 条）（−9）；③`version` 取值的理由抄了**过时状态**（「sceneData 自述只给 2 个导出」，现自述并实为 3 个）（−4）；④§五 diff 的基线不是 HEAD（−2）；⑤门 3 证据不是最终版本批次（−2）。**加分项如实记**：27 vs 29、V6=B 落空、未起浏览器、410 LF 超线、`___` 机制未发生——都是主动自曝，值得保留 |

**综合评分：89 / 100**（＝94×0.40 ＋ 93×0.25 ＋ 84×0.20 ＋ 76×0.15）。

**给「渲染是否真的对」的明确结论**：**对。** 若只看页面，这一票的渲染结论可以采信；不能采信的是它的三处数字／出处，以及它那条「页面级」回归锁的强度。

---

## 二、打假 1–8 逐条

### 打假 1 · 整页 HTML 真的出得来、且内容对 ⇒ **复现成功**

命令（只本包，禁仓根 `tsc -b`）：

```
D:\ilife> node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force
（无输出）
exit=0
```

独立脚本 `%TEMP%\t228j\render.mjs`（自建，不 import 票内测试）：`buildMemoHelpFileData(new Date(2026,8,12,13,30), {})` → `renderMemoHelpHtml`。原始输出摘录：

```json
{
 "A. 文档标题": "备忘录 · 使用手册",
 "B. 载荷顶层键": ["skill_name","title","subtitle","contact","groups","version","init_banner"],
 "C. skill_name/title/version": ["备忘录","使用手册","1.3.0"],
 "D. subtitle": "8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0",
 "E. 分类/二级组/场景": [8, 13, 30],
 "G. contact.items[].url 存在": false,
 "H. meta_blocks 在不在": false,
 "I. recommendations 在不在": false,
 "P. 场景键并集": ["editable_fields","id","prompt_template","status","title","types","wake_word"],
 "Q. 闭集外键": [],
 "R. 含 aliases 的场景数": 0,
 "S. editable_fields 总条数": 64,
 "T. 带 editable_fields 的场景数": 27,
 "U. status 取值集合": [""],
 "W. types 原子计数": {"采集":20,"回执":30,"向导":4,"查看":10}
}
```

- 标题 ✅ `备忘录 · 使用手册`；`subtitle` ✅ 逐字。
- 载荷键 ✅ **恰好 7 键**，`meta_blocks`／`recommendations` **确实不在**。
- `groups` ✅ 8 域／13 二级组／30 场景；`editable_fields` ✅ 64 条（27 场景）。
- 场景键集 ✅ ⊆ 闭集 7 键（闭集外键＝空数组）；含 `aliases` 的场景 ✅ **0**（裁决 5 落地）。
- 补检：30 个场景 `id`／`title`／`wake_word`／`prompt_template` 全为非空串，`status` 全空串，唤醒词唯一数 29（`备忘改分类` 两场景共用，正是裁决 17 的有意共用）。

**最强一条独立证据**：我渲染的两份产物与票内临时产物**逐字节相同**：

```
FCCE8E6A2EFAD949138C1C40FD57FB35750037B335246EC3A4C50C31650B6207  r-init-false.html（我的）
FCCE8E6A2EFAD949138C1C40FD57FB35750037B335246EC3A4C50C31650B6207  备忘录_HELP_验证_20260912_133000.html（票内）
7815F0EB8698B4864B53DF823EBB26CA2A679AFB300DEBEEE964DAB9168751DB  r-init-true.html（我的）
7815F0EB8698B4864B53DF823EBB26CA2A679AFB300DEBEEE964DAB9168751DB  备忘录_HELP_验证_已初始化.html（票内）
```

（模板源 `help-template.html` 13:23:38、生成物 `dist/helpShell.js` 13:23:50，均早于票内 13:36 的落盘，故这次比对有效。）

### 打假 2 · 三条硬规矩在**渲染后可见正文**上复验 ⇒ **复现成功（但报告口径偏弱）**

方法：headless Chrome 跑模板运行时，注一只读探针，把 body 下**跳过 `SCRIPT`／`STYLE` 的文本节点**拼成正文（脚本源码不计＝文件的头注释／脚本不算正文）。原始输出（未初始化形态）：

```json
"页面正文全文": "备忘录 使用手册 30 场景 · 点击卡片查看详情并复制指令 30 场景 🔍 找场景 → 📋 复制指令 → 💬 发给 AI 🚀 第一次用备忘录? 从零搭建环境:检测 → 安装/配置 → 初始化数据库 → 生成报告,全程引导。 📋 复制 ✕ 1 检查并配置 Python 版本与依赖检测 2 数据存储 SQLite + FTS5 全文搜索 3 飞书 CLI 安装并授权(核心联动) 4 环境变量 SKILLS_DB_PATH / MEMO_MEDIA_DIR 5 初始化数据库 建表 + 提醒调度 6 生成报告 初始化报告页 …（30 张卡）… 联系作者 GitHub https://github.com/FeatherHunter/SKILLS Issues https://github.com/FeatherHunter/SKILLS/issues 版本 备忘录 v1.3.0 · HELP 模板 v4 📝 备忘类 🔍 查找类 ⏰ 提醒类 🎯 心愿类 ✅ 打卡类 💭 情绪类 🔄 同步类 🚀 初始化类 关于 ✕ 复制",
"禁词计数": {
  "memo.": 0, "--html": 0, "memo-cmd-read": 0, ".py": 0, "script/": 0, "packages/": 0, "memo_": 0,
  "SKILLS_DB_PATH": 1, "MEMO_MEDIA_DIR": 1, "SQLite": 1, "FTS5": 1, "Python": 1,
  "Cron": 0, "guid": 0, "task_guid": 0, "notes.due": 0, ".db": 0, "memo.db": 0,
  "待开发": 0, "无唤醒词": 0, "当前无": 0,
  "undefined": 0, "null": 0, "NaN": 0,
  "HELP": 1, "备忘录HELP": 0, "备忘录 HELP": 0
}
```

- 规矩① ✅ **0 处**：`memo.`／`--html`／`memo-cmd-read`／脚本路径（`.py`／`script/`／`packages/`／`memo_`）全 0。
- 规矩② ✅ **0 处**：`待开发`／`无唤醒词`／`当前无` 全 0。
- 规矩③ ✅ **0 处**：`备忘录HELP`／`备忘录 HELP` 全 0（HELP 自身唤醒词没上页面）。
- ⚠️ **口径补充（报告没写）**：可见正文里有 **1 处 `HELP`**——关于页的「备忘录 v1.3.0 · **HELP 模板 v4**」，是共享模板自带的版本标注（全部技能同款），**不是唤醒词**，不违 ③ 的字面；但报告的 P 行写「载荷出现「HELP」字面处数 0」，容易被读成「页面上没有 HELP」。
- ⚠️ **口径补充（合规边界）**：可见正文有 5 处实现细节字面：`SQLite + FTS5`、`SKILLS_DB_PATH / MEMO_MEDIA_DIR`、`Python`、`CLI`——来自 #228 **自己硬编码**的 6 步常量 `HELP_INIT_STEPS`。票面要求「与老 6 步逐字」、裁决 21 的 D7 也允许初始化处保留环境细节，故**不算违规**，但报告**没有登记**这一行（地图 D2／D5「页面只出现用户能说的话」在同一页面上被开了口子而不自知）。
- ⚠️ **文件≠正文**：整页**文件**层面 `待开发` 出现 **2 次**、`HELP` 出现 **12 次**，全部在模板脚本源码里（如 `s.status === '【待开发】'`、`var HELP = JSON.parse(...)`、注释 `SHARED-HELPERS`），渲染后正文为 0。这条要说清，否则「整页文件 grep」会得出相反结论。

### 打假 3 · 「DOM 桩真跑」能不能复现 ⇒ **复现成功（我改用真浏览器，证据更强）**

我没有重做它的桩，而是把产物丢进 **headless Chrome `--dump-dom`**，并在页尾注入只读探针读**渲染后的 DOM** 与模板顶层 `var`（经典 script，挂在 window 上）。原始输出：

```json
{
 "DOM title": "备忘录 · 使用手册",
 "DOM .init-banner": 1,
 "DOM .init-step": 6,
 "DOM .init-step .s-n": 6, "DOM .init-step .s-t": 6, "DOM .init-step .s-d": 6,
 "DOM .ib-title": "🚀 第一次用备忘录?",
 "DOM .ib-sub": "从零搭建环境:检测 → 安装/配置 → 初始化数据库 → 生成报告,全程引导。",
 "DOM .eyebrow": "备忘录", "DOM h1": "使用手册",
 "DOM .lead": "30 场景 · 点击卡片查看详情并复制指令",
 "DOM .subgroup": 13, "DOM .mini": 30, "DOM .page": 9, "DOM .tab-bar .tab": 9,
 "STEP s-n": ["1","2","3","4","5","6"],
 "STEP s-t": ["检查并配置 Python","数据存储","飞书 CLI","环境变量","初始化数据库","生成报告"],
 "STEP s-d": ["版本与依赖检测","SQLite + FTS5 全文搜索","安装并授权(核心联动)","SKILLS_DB_PATH / MEMO_MEDIA_DIR","建表 + 提醒调度","初始化报告页"],
 "STEP 空格子数": 0,
 "JS window.GROUPS.length": 8,
 "JS window.ALL.length": 30,
 "点击后 .pform": 1, "点击后 .pfield": 4, "点击后 input[data-p]": 4,
 "点击后 params 键": ["category","sub_category","media","due"],
 "点击后 .pfield label": ["分类选填","子分类选填","附件选填","排期日期选填"],
 "点击后 sheet 标题": "添加一条备忘笔记",
 "点击后 prompt 预览": "请帮我记一条备忘(唤醒词:记备忘):⏎⏎请按以下格式填写你的参数:⏎⏎  内  容: _____________ (你想记的话)…",
 "点击后 VIS undefined": 0
}
```

- `GROUPS=8`／`ALL=30` ✅、6 个步骤卡文案齐全 ✅、字面 `undefined` 为 **0** ✅ —— 与报告 §三-2 的 DOM 桩输出**逐项一致**。
- 报告 §三-2 里那几行「带字段场景 params 键／`.pform` 出现」我也复现了：**必须先点开卡片**（`.mini` 点击 → `openSheet()`；`.pform` 只在详情面板里生成），报告没写这一步，但结果一致。
- **特别是 `init_banner` 的 6 步：确实进了最终 HTML，且是渲染进 DOM 的，不只是躺在载荷里**（见下条）。
- 报告 §七-5 自述「**本席没有在真浏览器里打开产物**」——这轮我替它补上了：**结论一致，没有翻车**。

### 打假 4 · 裁决 20 的四行表是否逐条落地 ⇒ **四行全部 ✅ 落地，且取边在页面上是对的**

载荷侧（我的脚本）＋ B 路隔离（我的脚本，两条 import 路各跑一次）：

```json
{
 "T1 steps 是 {title,desc}[]": true,
 "T2 hidden 真的传了": true,
 "T3 closable 没传": true,
 "T4 contact.items[] 不带 url": true,
 "1 子路径 renderHelpShell(本票最终载荷)": "NO-THROW",
 "2 包根 renderHelpShell(本票最终载荷)": "HelpSchemaError/schema-invalid//init_banner/hidden/多余字段（additionalProperties:false）：hidden",
 "3 闭集内形状 + steps=[]（B路应过）": "NO-THROW",
 "4 + steps=本票对象形": "HelpSchemaError/schema-invalid//init_banner/steps/0/类型不符：期望 string，实际 object",
 "5 + closable:true": "HelpSchemaError/schema-invalid//init_banner/closable/多余字段（additionalProperties:false）：closable",
 "6 + hidden:false": "HelpSchemaError/schema-invalid//init_banner/hidden/多余字段（additionalProperties:false）：hidden",
 "7 contact 带 url:true": "HelpSchemaError/schema-invalid//contact/items/0/url/多余字段（additionalProperties:false）：url",
 "8 scene 带 aliases": "HelpSchemaError/schema-invalid//groups/0/subgroups/0/scenes/0/aliases/多余字段（additionalProperties:false）：aliases"
}
```

- ✅ `steps` 传 `{title,desc}[]`；✅ `hidden` 传；✅ `closable` 不传；✅ `contact` 不带 `url`（也无 `copy_all`）。
- **取边的技术前提我独立证真了**（把 `steps` 换成 `string[]` 再跑同一渲染器，真浏览器读数）：

```
steps = {title,desc}[]  ⇒  .init-step 6 / .s-n 6 / .s-t 6 / .s-d 6 / 空格子数 0 / 可见文本长度 1370
steps = string[]        ⇒  .init-step 6 / .s-n 6 / .s-t 6 / .s-d 0 / 空格子数 6 / 可见文本长度 1240
```

⇒ 「传字符串会渲染出 6 个**有序号、无文案**的空格子」**属实**（且字面 `undefined` 为 0，是空格子不是脏串）。**#228 取「页面正确」这一边，在页面上是对的。**
- 已初始化形态：`.init-banner` **0**（横幅真消失），两形态产物差 **1 字节**（真）。「键常在、显隐只走 `hidden`」成立。
- ⚠️ 但「**裁决 20**」这个名字与出处有问题，见打假 8 第 3 条。

### 打假 5 · 「踩坑留证」（两条 import 路）⇒ **技术前提复现成功；「假绿」那一段无法复现**

```json
{
 "0a 子路径 base-paint/help-shell 的导出": ["HELP_SHELL_DATA_OPEN","HELP_SHELL_PREFIX","HELP_SHELL_SUFFIX","HELP_SHELL_TITLE_SLOT","HelpShellError","composeDocTitle","renderHelpShell","renderHelpShellHtml"],
 "0b 子路径 renderHelpShell 是否 === renderHelpShellHtml": true,
 "0c 包根 base-paint 的 renderHelpShell 是否 === 子路径那个": false,
 "0d 包根有无 renderHelpShellHtml": false
}
```

- ✅ **B 路校验器在包根**：`base-paint` 根导出的是 `src/help.ts:renderHelpShell`（走 `validateSceneData`／`SCENE_DATA_SCHEMA`，fail-closed）。
- ✅ **子路径的 `renderHelpShell` 只是别名**：`===` `renderHelpShellHtml` 为 **true**（源码 `dist/helpShell.js` 里 `renderHelpShell = renderHelpShellHtml`），对同一份「schema-invalid」载荷 **NO-THROW**（不做任何 schema 校验）。用错子路径，确实会把「B 路必须拒」的断言做成**恒不成立**。
- ❌ 「本席第一版补证用错子路径、断言**假绿**过一次」：仓内**没有第一版脚本或输出留证**（`D:\.tmp-t228\` 只有最终版 `probe-steps2.mjs`／`verify-ruling20.mjs`），**无法复现**。技术前提为真，叙述本身是作者私有历史。

### 打假 6 · 导出面（裁决 16）⇒ **复现成功**

```json
{
 "helpFile.ts 运行时导出": ["buildMemoHelpFileData","formatHelpMinute","renderMemoHelpHtml"],
 "helpFile.ts 导出数": 3,
 "sceneData.ts 运行时导出": ["MEMO_HELP_GROUPS","MEMO_HELP_VERSION","buildHelpSceneIndex"],
 "sceneData.ts 导出数": 3,
 "src/help/index.ts 转发面(dist)": ["buildHelpLookup","lookupWake"],
 "包根运行时出口数": 49,
 "包根含 buildMemoHelpFileData": false, "包根含 renderMemoHelpHtml": false,
 "包根含 formatHelpMinute": false, "包根含 MEMO_HELP_GROUPS": false,
 "包根含 buildHelpSceneIndex": false, "包根含 MEMO_HELP_VERSION": false
}
```

- ✅ `helpFile.ts` 运行时导出**恰 3 个**；`dist/help/helpFile.d.ts` 实测只有 3 条 `export declare function`，选项接口模块私有、末尾 `export {}`（与报告 §六-1 一致）。
- ✅ `sceneData.ts` **3 个**（裁决 21 D4 批的就是 3 个）。
- ✅ `src/help/index.ts` **一字未动**（仍只有 `buildHelpLookup`／`lookupWake` ＋ type `HelpHit`）；包根出口**维持 49**；`package.json` 未新增子路径导出（`helpFile.js` 只能包内相对引用）。

### 打假 7 · 门的三条是否真绿 ⇒ **三条全绿（直跑取真退出码）**

```
D:\ilife> node tooling/check-boundaries.mjs
OK: link-core 零依赖
OK: render 无运行时依赖（link-core 仅 dev/typeof）
OK: render 不依赖 combos
OK: combos 强依赖 link-core
OK: present 只许字符串级引用，禁 import render
OK: link-core 源码不引用任何 workspace 包
OK: 装配 owner 归一 render（link-core/combos 无自装配）
OK: skill-chef 依赖闭包不含 base-*（实得：无）
OK: skill-home 依赖闭包不含 base-*（实得：无）
OK: 未迁移技能源码／模板不 import base-*（命中：无）
boundaries: PASS
exit1=0

D:\ilife> node packages/base-render/scripts/gen-help-shell.cjs --check
help-template check OK: prefix=b09b2ffb49aface7befedc79159467f93abc8be0aed7491539ab49ef3a853f0a suffix=eedea1d3bfb61034d919d826a45414802c7e457052b13ced3b76dd1364c6a866
exit2=0

D:\ilife> node --test packages/skill-memo-ilife/test/help-file-228.test.mjs
✔ …（15 条逐条 ✔，与报告 §二 门 4 的清单逐字同名）
ℹ tests 15
ℹ pass 15
ℹ fail 0
exit3=0
```

- ✅ 三条门真绿（`$LASTEXITCODE` 直读，不经 `pnpm <script> 2>&1` 的 `NativeCommandError` 假象）。
- ✅ 「只会构建本包」成立：`packages/skill-memo-ilife/tsconfig.json` **无 project references**，`--force` 也只列本包一个项目。
- ✅ `SKILLS_BASE_FROZEN` 现值＝`['skill-chef','skill-home']`（第 45 行），与报告 §五 一致。
- ⚠️ 但 `git diff HEAD -- tooling/check-boundaries.mjs` 是 **12 insertions／4 deletions**：名单从 `['skill-chef','skill-home','skill-schedule','skill-memo-ilife']` 变到 `['skill-chef','skill-home']`（少**两个**名字）＋注释「4 技能」改「3 技能」。报告 §五 写「唯一实质改动＝名单里少一个名字」——**只对「改动前的工作树」成立，对 HEAD 不成立**（报告确有「并发雷」段落交代对方那一笔，但 diff 块的呈现会让人把它读成自己那一笔）。

### 打假 8 · 报告诚实度 ⇒ **有真材实料的自证，也有三处可当场证伪的数字／出处**

**先记实话（这些都是真的，我逐条复算过）**：LF 220／191（与报告一致）；`package.json` 35 LF；64 条／27 场景；types 计数；场景 id 唯一；同参两次渲染逐字节相同；`pnpm-lock.yaml` 里 `base-paint` 4 处；`packages/skill-memo-ilife/node_modules/base-paint` 是指向 `D:\ilife\packages\base-render` 的 **Junction**；#242 真开（OPEN，标题与报告引的缺陷一致）；#228 未 close（OPEN）；两份产物与我的独立渲染 **SHA-256 相同**。**没有发现「声称测了但没测」的情形**——它的 DOM 桩输出我全复现了。

**再记硬伤（逐条给我跑的东西）**：

1. **❌ 产物字节数错**。报告 §三-1 的 `X. 产物字节数：115137`、§三-3 的「115 137 B／115 136 B」——**115 137 是字符数，不是字节数**：

   ```json
   "X. 产物字节数(未初始化)": 130885,
   "X2. 产物字节数(已初始化)": 130884,
   "X3. 两形态差(未−已)": 1,
   "X4. HTML 字符长度": 115137
   ```

   票内临时文件实测也是 **130 885 B**（`Get-ChildItem D:\.tmp-t228`）——即它自己的产物就是 130 885 B，报告里的 115 137 少算了 15 748 B（多字节字符的差额）。「两形态差 1 字节」是对的。
2. **❌ 门 3 的「原始输出」不是所写命令的产物**。报告写命令 `node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force`，却引了三行 `Projects in this build / is being forcibly rebuilt / Building project`。我实测：**不带 `--verbose` 时该命令零输出、退出码 0**；加 `--verbose` 才逐字出现那三行。另外报告引的时间戳是 **13:30:13**，而 `helpFile.ts` 最后改动是 **13:33:23**（裁决 20 改写之后）⇒ 那次类型门不是对最终源码跑的。我对最终源码重跑：**exit 0**，实质结论仍成立。
3. **❌ 「裁决 20」在裁决正本里不存在**。
   - `grep -r "裁决\s*20" docs/**/*.md`（排除 `node_modules`／`dist`）→ 命中 **12 行，全部在 `t228-body.md`／`t228-render-report.md`**（#228 自己的两件）。
   - `t220-orchestrator-decisions.md` 的 `### 裁决` 标题实测是：1、2、3、4、5、6、7、8、9、10、11、12、**21**、**22**、13、14、15、16、17、18、19 —— **编号恰好跳过 20**（共 21 条，报告却写「19 条」）。
   - `gh issue view 228 --json comments --jq '.comments|length'` → **0**；#220 → **0**。⇒ 不在 issue 评论里。
   - 仓内唯一等义的表述是 `t228-basender-schema-template-mismatch.md:69`「备忘录当前的取边是『A 路正确优先』」（**描述**）与 `:66`「倾向：以模板为准改 schema」（**建议**），**都不是裁决**。
   - 结论：**取边的技术结论为真（我验过），但把它写成「裁决 20 定案」的权威依据在仓内不可复核**。这正是本票最该补的一处：要么把裁决 20 落进正本，要么把引用改成本票自定取边＋依据文件。
4. **❌ `version` 取值的理由抄了过时状态**。报告 §六-2-3 与 `helpFile.ts:179-181` 都写「`sceneData.ts` 自述『本文件只给 2 个导出』，故 `version` 不从它的导出取」；但现 `sceneData.ts:21-25` 自述**3 个导出**，并在 `:37` **确实导出** `MEMO_HELP_VERSION = "1.3.0"`。运行期无影响（`buildHelpSceneIndex().version` 同为 `1.3.0`），但这是可当场证伪的「实测」式陈述。（`sceneData.ts` mtime 13:36:02，报告 13:36:17——差 15 秒，属「没重读」而非编造，但交付物里的注释现在就是错的。）
5. **❌ §五 diff 的基线不是 HEAD**（见打假 7 末）。
6. **❌「裁决 20 ①」那条回归锁证明不了页面**：`readPayload(HTML)` 取的就是整页 HTML 里的 `help-data` 段，所以 `HTML.includes(文案)` **恒真**。我实测：12 段文案在整页命中 12/12，**在载荷段内也是 12/12** ⇒ 这条断言与「模板把文案渲染进 DOM」无关。真正证明页面的是它的 DOM 桩（对）＋我这一轮的浏览器（对）。
7. **数字口径小账**：票面 `t228-body.md:33` 仍写「照资产里的清洗后 **76** 条渲染」（清洗前数），同文件 `:39/:40` 的进度段写 220/191 LF 与 64 条——**票面自身有旧数残留**，建议订正。
8. **顺带澄清来件口径**：派单里写的「自报 213 LF／135 LF」在仓内**找不到出处**——`t228-body.md:39-40` 与报告 §一 都写 **220／191**，我实测也是 **220／191**。这条不用追，按 220／191 记账。

---

## 三、不成立或无法复现的断言清单（一条一行）

1. 「产物字节数 **115 137 B**」——**不成立**：真字节 130 885 B（115 137 是字符数）。
2. 「已初始化产物 **115 136 B**」——**不成立**：真 130 884 B（差 1 字节这句是对的）。
3. 「门 3 的原始输出」＝`tsc --build … --force` 的输出——**不成立**：该命令零输出；那三行只在 `--verbose` 下出现。
4. 「门 3 的原始输出时间 13:30:13（对最终版本）」——**不成立**：`helpFile.ts` 最终改动 13:33:23，晚于该次构建。
5. 「**裁决 20** 载于 `t220-orchestrator-decisions.md`」——**不成立**：正本无此条（编号 1–19、21、22）。
6. 「`t220-orchestrator-decisions.md`（**19 条**，冲突时以它为准）」——**数字不符**：实测 21 条。
7. 「`sceneData.ts` 自述『本文件只给 **2 个导出**』」——**不成立**：现自述并实为 3 个，含 `MEMO_HELP_VERSION`。
8. 「`check-boundaries.mjs` 的唯一实质改动＝名单里**少一个名字**」——**仅相对改动前工作树成立**：对 HEAD 是两个名字＋注释 4→3。
9. 「第一版补证用错子路径、断言**假绿**过一次」——**无法复现**（仓内无第一版留证）；其技术前提（子路径是别名、不校验）**为真**。
10. 「载荷 `HELP` 字面 0 处 ⇒ 页面上没有 HELP」——**按页面口径不成立**：可见正文有 1 处（关于页「HELP 模板 v4」，共享模板自带，非唤醒词）。
11. 「裁决 20 ①（6 条步骤文案出现在 HTML 里）证明页面渲染正确」——**推理不成立**：该文案本来就在载荷里，断言恒真。
12. 「页面上不出现实现细节」——报告未主张，但**可见正文确有 5 处**（`SKILLS_DB_PATH`／`MEMO_MEDIA_DIR`／`SQLite`／`FTS5`／`Python`，另 `CLI`），须登记为已知口径而不是默认干净。

> 反向记录：**没有**发现伪造运行结果、夸大测试条数、或把「没跑」说成「跑了」的情形；`SHA-256` 逐字节相同是最硬的反证。

---

## 四、对 #228 关票的意见

**结论：可以关，但先补三件（不涉及重做渲染）。**

理由（正面）：渲染结论**经真浏览器独立复核为真**；三条硬规矩在渲染后可见正文上全 0；裁决 20 的四行取边逐条落地且技术前提被证真；三门真绿（直跑退出码 0）；15/15 真绿；导出面守规（3／3／49）；产物可复现且与票内留档 SHA-256 相同。

**关票前必须补**：
1. **裁决出处落定**：把「裁决 20」写进 `t220-orchestrator-decisions.md`（正本补一条，或改成「本票自定取边＋依据 `t228-basender-schema-template-mismatch.md`」）。现状是：报告拿一个仓内不存在的裁决当最高依据，而正本的编号还正好跳过 20。
2. **报告订正并重出原始输出**：字节数改 130 885／130 884；门 3 换真实输出（补 `--verbose`）；并对**最终版本**（13:33 之后的 `helpFile.ts`）重跑一次三门＋测试，把这一批的输出放进报告。
3. **三条硬规矩的报告行改成「渲染后可见正文」口径**，并把三处口径事实写清：① 关于页那 1 处 `HELP 模板 v4`；② 初始化横幅 5 处实现细节字面；③ `subtitle` 在页面上看不到（`§六-2-4` 已声明，但 §六-1 的对账行没有它）。

**不建议**：因上述任何一条重做渲染或改共享层（`packages/base-render/**` 一行未动是对的；分歧归 `#242` 也真开了票）。**不建议**把「页面级回归锁」的缺口算成 #228 的阻塞项，但要在 #233 肉眼终审的清单里写明「仓内没有渲染后 DOM 的自动锁，页面正确性靠人工终审」。

**给 #233（终审）的一条提示**：维护者肉眼打开时，**不会**看到「8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0」这句（A 路模板对 `subtitle` 无渲染落点，只能看到 hero 的「30 场景」与关于页的「v1.3.0」）。若终审判据含这句原话，必须先对齐口径，否则会把共享层的既有形态误判成 #228 的缺件。

---

## 五、给编排会话的整改清单

### 必须改（与关票绑）

1. **正本补裁决 20 或改引用**（见 §四-1）。若裁决 20 确实只存在于会话对话，请**逐字抄进正本**并注明时间。
2. **报告数字与原始输出订正**（见 §四-2）：字节数、门 3 输出与批次。
3. **门 3 的门把式写对**：命令写 `--verbose`（或把引文换成无 `--verbose` 时的真实输出＝空），并在报告里注明该次构建对应的源码版本（`helpFile.ts` 的 LF／mtime）。
4. **报告 §六-1 的对账行补三行**：① 可见正文的 1 处 `HELP 模板 v4`；② 初始化横幅 5 处实现细节字面（`SQLite + FTS5`／`SKILLS_DB_PATH`／`MEMO_MEDIA_DIR`／`Python`／`CLI`）＋保留理由（票面「与老 6 步逐字」＋ D7 例外）；③ `subtitle` 无渲染落点 ⇒ 终审看不到。
5. **票面旧数订正**：`t228-body.md:33` 的「清洗后 76 条」改 64 条（与同文件进度段、报告、实测一致）。
6. **报告 §五 的 diff 基线标注**：写清「`-` 侧＝HEAD（仍含 `skill-schedule`／`skill-memo-ilife`），`+` 侧含并发会话的 `#199` 那一笔」，或直接贴 `git diff HEAD` 的完整 hunk。

### 建议改（不阻塞）

7. **补一条渲染后 DOM 的回归锁**（本票最实质的自证缺口）。仓内已有两条现成路子：`packages/skill-schedule/test/help-file-202.test.mjs:126` 的手写极简 DOM 桩（「不装 jsdom，只实现模板运行时真正用到的那些面」），或照 `packages/base-render/test/help-center-js-88.test.mjs`／`controls.test.mjs` 的 headless Chrome `--dump-dom` 路线（本机 Chrome 可用）。至少要锁住：`.init-step` 6 且 `.s-t`／`.s-d` 文案齐全、可见正文无 `memo.`、可见正文无字面 `undefined`。理由：把 `st.title` 改成别的键，现有 15 条**仍会全绿**，而页面已经坏了。
8. **「裁决 20 ①」改名**为「载荷携带 6 条步骤文案」（它验的是载荷），别让读者以为页面已被锁；真正的页面证据是 DOM 桩／浏览器那一批，建议把该批输出留档进报告（我这一轮的浏览器方法可直接引用）。
9. **`helpFile.ts:179-181` 的注释与报告 §六-2-3 的理由改写**：`sceneData.ts` 已有 `MEMO_HELP_VERSION`；如实写成「为少一条导入仍走 `buildHelpSceneIndex()` 取版本」，或直接改 import 成 `MEMO_HELP_VERSION`（同样 1 条导入、语义更直白）。
10. **给 `#233` 的终审清单加一句**「本票无渲染后 DOM 自动锁，页面正确性靠人工终审」，并把 `D:\.tmp-t228\` 那两份（或重出的）整页 HTML 一并交人工打开——**注意它们不在仓内**，#233 若要留档须另定落点（落盘归 #229）。
11. **初始化 6 步的实现细节字面**：若 #233 肉眼终审认为「SKILLS_DB_PATH / MEMO_MEDIA_DIR」不该上页面，归 **#227 内容面**统一清洗（#228 只是一行常量），别在 #228 里就地改文案——那会同时违反票面「与老 6 步逐字」。

---

### 附：本轮全部命令（可复跑）

```
node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force        # exit 0
node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force --verbose
node %TEMP%\t228j\render.mjs                      # 载荷／整页／硬规矩／字节数复算
node %TEMP%\t228j\chrome-probe.mjs %TEMP%\t228j\r-init-false.html      # 真浏览器读渲染后 DOM
node %TEMP%\t228j\probe2.mjs %TEMP%\t228j\r-init-false.html ".mini[data-key=\"memo_add_basic\"]"
node %TEMP%\t228j\probe3.mjs %TEMP%\t228j\r-init-false.html            # 页面正文全文＋禁词计数
node %TEMP%\t228j\bpath.mjs                       # 两条 import 路 ＋ 裁决 20 四行表
node %TEMP%\t228j\exports.mjs                     # 导出面 3／3／49 ＋ 载荷补检
node tooling/check-boundaries.mjs                                                              # exit 0
node packages/base-render/scripts/gen-help-shell.cjs --check                                   # exit 0
node --test packages/skill-memo-ilife/test/help-file-228.test.mjs                              # 15/15 exit 0
Get-FileHash <我的产物>,<票内产物> -Algorithm SHA256                                            # 两组相同
```

**只读自证**：本轮未执行 `git add`／`restore`／`reset`／`commit`；`packages/**` 无我方写入（`dist/**` 为本包构建产物，已被 `.gitignore:2` 忽略）；唯一新建的仓内文件是本报告。
