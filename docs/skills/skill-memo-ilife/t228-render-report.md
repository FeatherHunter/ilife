# #228 交付报告：渲染接线（5 项 ＋ 三块可选内容 → 通用 help 模板）

**结论一句话**：`buildMemoHelpFileData` → `renderMemoHelpHtml` 已把 #227 的**真资产**染成整页 HTML（`备忘录 · 使用手册`／8 域／13 二级组／30 场景／64 条 `editable_fields`，载荷 7 键、`aliases` 已剥净，6 个初始化步骤卡**序号＋标题＋说明齐全**），两门 `pnpm boundaries` 与 `gen:help-shell:check` 均**绿**；**四处共享层「校验器 vs 模板」不一致**按**裁决 20「取页面正确那一边」**逐条取边并留证，其中 `init_banner.steps` 的那处已按裁决从「上报」改为「照模板的对象形」。`init_banner.steps` 曾按更正 2 **停下来上报**，裁决 20 已定案。

- 裁决正本：`docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md`（19 条，冲突时以它为准）
- 施工日期 2026-09-12；分支 `master`；**未 commit、未 close 任何票、未动 #220 或别的 issue**

---

## 一、交付物（带 LF 行数）

| 文件 | 状态 | LF | 说明 |
| --- | --- | --- | --- |
| `packages/skill-memo-ilife/src/help/helpFile.ts` | **新增** | **220** | 3 个运行时导出：`buildMemoHelpFileData`／`renderMemoHelpHtml`／`formatHelpMinute`。**类型出口 0 个**（选项接口与两个常量都只进不出，需要类型处转引公共层 `HelpShellData`） |
| `packages/skill-memo-ilife/test/help-file-228.test.mjs` | **新增** | **191** | 15 条回归锁（真资产 → 载荷 → 整页 HTML 逐项断言），全绿 |
| `packages/skill-memo-ilife/package.json` | 改动 | 35 | `dependencies` **手工加一行** `"base-paint": "^0.3.0"`（值同记账） |
| `tooling/check-boundaries.mjs` | 改动 | 71 | `SKILLS_BASE_FROZEN` 就地删 `'skill-memo-ilife'` 一项（见 §五） |
| `pnpm-lock.yaml` | 改动（**非本席直接编辑**） | — | 见 §六第 3 条：`pnpm boundaries` 自带的 pre-flight 安装把 `packages/skill-memo-ilife` 的 `base-paint: ^0.3.0 / link:../base-render` 写进去了；本席**没有跑全量 `pnpm install`** |
| `docs/skills/skill-memo-ilife/t228-render-report.md` | 新增 | 本文件 | — |

**未碰**（只读）：`packages/skill-chef/**`、`packages/skill-calorie/**`、`packages/skill-schedule/**`、`packages/plugin-chef/**`、`packages/base-render/**`（含正被别家改的 `assets/help-template.html`／`src/helpShell.ts`／`test/help-shell-136.test.mjs`）。
**未转发**：`src/help/index.ts` 一字未动、包根出口维持 49（裁决 16／B3 已取消）。

### 行数口径（第四步·是否超线）

**本包告警线＝350 ＋ LF 口径**（`packages/skill-memo-ilife/AGENTS.md`，管 `src/**/*.ts` ＋ 包内 `scripts/*.mjs`）。
`helpFile.ts`＝**220 LF**、`test/*.mjs` 不在管辖内 ⇒ **本人这件不超线，不触发第四步**。
⚠️ 但**本包范围内有一件超线，属 #227**：`packages/skill-memo-ilife/scripts/gen-help-assets.mjs`＝**410 LF**（>350）。本席不越权改它，如实登记，请 #227 按第四步当场报「已超线，需要根据规则进行重构」并给拆法。

---

## 二、三条门的原始输出

### 门 1 · `pnpm boundaries`（退出码 0）

```
> ilife@0.1.0 boundaries D:\ilife
> node tooling/check-boundaries.mjs

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
```

**与基线对比**：改动前基线里的 `OK: skill-memo-ilife 依赖闭包不含 base-*（实得：无）` 一行**已按预期消失**（它被移出名单），其余 11 行逐字未变，末行 `boundaries: PASS` 同基线。

> ⚠️ 在本机 PowerShell 里 `pnpm <script> 2>&1` 会把 stderr 包成 `NativeCommandError` 从而**看起来**是 `[exit code: 1]`；上面是**直跑退出码 0** 的实测（`& node tooling/check-boundaries.mjs; $LASTEXITCODE` → `0`）。

### 门 2 · `pnpm --filter base-paint gen:help-shell:check`（退出码 0）

```
> base-paint@0.3.0 gen:help-shell:check D:\ilife\packages\base-render
> node scripts/gen-help-shell.cjs --check

help-template check OK: prefix=b09b2ffb49aface7befedc79159467f93abc8be0aed7491539ab49ef3a853f0a suffix=eedea1d3bfb61034d919d826a45414802c7e457052b13ced3b76dd1364c6a866
```

**与基线逐字一致**（前后缀哈希同编排会话记的基线）⇒ 那个正在改 `base-render` 的会话**没有**把生成物搞漂。

### 门 3 · 本包类型门（**只构建本包**）

```
> node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force

13:30:13 - Projects in this build:
    * packages/skill-memo-ilife/tsconfig.json
13:30:13 - Project 'packages/skill-memo-ilife/tsconfig.json' is being forcibly rebuilt
13:30:13 - Building project 'D:/ilife/packages/skill-memo-ilife/tsconfig.json'...
（无任何 error，退出码 0）
```

### 门 4 · 新增回归锁（15/15 绿）

```
$ node --test packages/skill-memo-ilife/test/help-file-228.test.mjs
✔ #228 文档标题由共享层拼成（title 不含技能名 ⇒ 走前缀支） (0.5280ms)
✔ #228 载荷顶层键＝5 必需 ＋ contact/version/init_banner 三块可选键 (0.4215ms)
✔ #228 subtitle 计数派生、版本取资产 (0.5123ms)
✔ #228 用户 V1／裁决 15：meta_blocks 与 recommendations 一律不传 (0.0774ms)
✔ #228 裁决 5：aliases 留在资产、载荷里必须剥净（闭集 7 键） (0.1515ms)
✔ #228 用户 U6／U1：页面上不出现命令名，也不标缺失 (0.1515ms)
✔ #228 contact 照老两项、不带 url（共享 schema 的 contact.items[] 是闭集） (0.1141ms)
✔ #228 init_banner：键常在、显隐只走 hidden、prompt 单源取 memo_init_setup (0.2358ms)
✔ #228 裁决 20 ①：6 条步骤的 title／desc 文案逐条出现在渲染出的 HTML 里 (0.1774ms)
✔ #228 裁决 20 ②：本票载荷只对 A 路合法（B 路校验器 schema-invalid，根因归 #242） (4.3317ms)
✔ #228 用户 V7：editable_fields 进了载荷，且 name/label 全是字符串（裁决 6 的硬门） (0.1783ms)
✔ #228 types 原子与老骨架一致（4 个原子，零表外词） (0.1109ms)
✔ #228 产物可复现：同参数两次渲染逐字节相同 (0.2632ms)
✔ #228 formatHelpMinute ＝ 老 %Y-%m-%d %H:%M（本地时区、零填充；坏参不返空串） (0.3539ms)
✔ #228 空分组走共享层 missing-data（不返空页） (0.0683ms)
ℹ tests 15  ℹ pass 15  ℹ fail 0
```

> ⚠️ **踩过的坑（留证）**：B 路校验器在**包根** `base-paint`；`base-paint/help-shell` 子路径导出的 `renderHelpShell` 只是 `renderHelpShellHtml` 的**别名**（生成物逐字 `typeof renderHelpShellHtml`），**不做 schema 校验**。用错子路径会让「只对 A 路合法」这条断言**假绿**。

⚠️ 仓根 `pnpm test` 会连带跑**别的会话**的用例（含 `help-shell-136` 等我不能碰的件），本报告**不以它作门**；本票只对自己那件负责。

---

## 三、整页渲染的验证方式

**用真资产验的，不是 fixture。** #227 的资产在本席施工中途落盘（`src/help/scenes/*.ts` ＋ `src/help/sceneData.ts`），落盘后本席**重跑了一遍整页渲染**，本报告全部数字都出自那一遍。

三条独立证据：

1. **载荷反解**（从整页 HTML 的 `help-data` 段解 JSON，照 `helpShell.ts` 的 `\u003c` 口径反解）：

```json
{
  "A. 文档标题": "备忘录 · 使用手册",
  "B. 载荷顶层键": ["skill_name","title","subtitle","contact","groups","version","init_banner"],
  "C. skill_name/title/version": ["备忘录","使用手册","1.3.0"],
  "D. subtitle": "8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0",
  "E. 分类数/二级组数/场景数": [8, 13, 30],
  "F. contact": {"items":[{"label":"GitHub","value":"https://github.com/FeatherHunter/SKILLS"},
                           {"label":"Issues","value":"https://github.com/FeatherHunter/SKILLS/issues"}]},
  "H. 给 initialized=true": true,
  "I. recommendations 在不在": false,
  "J. meta_blocks 在不在": false,
  "K. 载荷里含 aliases 的场景数": 0,
  "L. 场景卡的键集（并集）": ["editable_fields","id","prompt_template","status","title","types","wake_word"],
  "M. 场景卡键集是否 ⊆ 闭集7键": true,
  "N. 载荷出现 memo. 命令名处数": 0,
  "O. 出现「待开发」处数": 0,
  "P. 出现「HELP」字面处数": 0,
  "Q. editable_fields 总条数": 64,
  "R. 带 editable_fields 的场景数": 27,
  "S. editable_fields name/label 全为 string": true,
  "T. status 取值集合": [""],
  "U. types 原子计数": {"采集":20,"回执":30,"向导":4,"查看":10},
  "V. 场景 id 唯一": true,
  "W. 同参数两次渲染逐字节相同": true,
  "X. 产物字节数": 115137,
  "Y. formatHelpMinute": "2026-09-12 13:30",
  "Z. 坏参数（缺 Date）": "MemoRenderError/MEMO_TEMPLATE_MISSING"
}
```

2. **模板运行时真跑了一遍**（把 `helpShell.ts` 的 SUFFIX 里两段 `<script>` 取出来，在**极简 DOM 桩**上 `new Function` 执行；只读观测，不改模板源）：

```json
{
  "运行时错误": [],
  "模板 GROUPS 数": 8,
  "模板 ALL 场景数": 30,
  "hero eyebrow/h1": "备忘录 / 使用手册",
  "底部 Tab 数": 9,
  "横幅 class=init-banner": true,
  "步骤卡 init-step 数": 6,
  "步骤卡 s-t 文案": ["检查并配置 Python","数据存储","飞书 CLI","环境变量","初始化数据库","生成报告"],
  "步骤卡 s-d 文案": ["版本与依赖检测","SQLite + FTS5 全文搜索","安装并授权(核心联动)","SKILLS_DB_PATH / MEMO_MEDIA_DIR","建表 + 提醒调度","初始化报告页"],
  "页面出现字面 undefined": false,
  "页面出现 memo. 命令名": false,
  "带字段场景 id": "memo_add_basic",
  "带字段场景 params 键": ["category","sub_category","media","due"],
  "带字段场景 params label": ["分类","子分类","附件","排期日期"],
  "带字段场景 .pform 出现": true,
  "带字段场景 data-p 键": ["data-p=\"category\"","data-p=\"sub_category\"","data-p=\"media\"","data-p=\"due\""]
}
```

3. **整页文件落盘可人工验收**（临时目录，已 `.gitignore` 的 `D:\.tmp-*`）：
   - `D:\.tmp-t228\备忘录_HELP_验证_20260912_133000.html`（未初始化形态，115 137 B）
   - `D:\.tmp-t228\备忘录_HELP_验证_已初始化.html`（已初始化形态，115 136 B）
   - 两者差 **1 字节**＝ `init_banner.hidden` 的 `false`→`true`，正是「键常在、显隐只走 `hidden`」的实证。

---

## 四、四处「校验器 vs 模板」不一致（本票实测，逐条留证）

通用模板有**两条消费路**，对同一份载荷的要求**互相冲突**：
- **A 路**（`renderHelpShellHtml`，本图的**交付路径**）**不做 schema 校验**，只要求 `groups` 非空；
- **B 路**（`renderHelpShell` → `validateSceneData` → `SCENE_DATA_SCHEMA`）是 fail-closed 的校验器。

> ### 裁决 20（编排会话，2026-09-12）：取「页面正确」那一边
> **凡「满足校验器」与「页面渲染正确」冲突时，取页面正确那一边**，分歧逐条记账（本文件 ＋ `#242`），**不许改共享层**。
> 依据：本图交付路径是 A 路、维护者验收只看页面；校验器那半条是**共享层缺陷**。

| 键 | 校验器（`renderHelpShell` → `validateSceneData` → `SCENE_DATA_SCHEMA`；锚点 `scene_data` / `additionalProperties:false` / `init_banner` / `contact`） | A 路模板运行时（锚点 `INIT_BANNER && !INIT_BANNER.hidden` / `INIT_BANNER.steps.map` / `it.url`） | 本票取边（＝裁决 20） |
| --- | --- | --- | --- |
| `init_banner.steps` | 只许 **`string[]`** ⇒ 对象数组报 `类型不符：期望 string，实际 object` | 读 `st.title`／`st.desc` ⇒ 要 **`{title,desc}[]`** | **传 `{title,desc}[]`**：`string[]` 会渲染出 6 个**有序号、无文案**的空格子＝**用户看得见的缺陷**；校验器那半条归 `#242` |
| `init_banner.hidden` | **闭集外** ⇒ `schema-invalid 多余字段（additionalProperties:false）：hidden` | 显隐**唯一**开关 | **传**（不传则「已初始化」的差异永远显不出来） |
| `init_banner.closable` | **闭集外** ⇒ `schema-invalid` | `=== false` 才不画 ✕（缺省＝画 ✕） | **不传**（缺省已等价于老的 `closable:true`，且少一处闭集外字段） |
| `contact.items[].url` | **闭集外** ⇒ `schema-invalid` | `it.url` 为真才渲染成 `<a>` | **不传**（用户 V6=B 要「可点」的意图**落空**，链接由 `value` 明文承载；根因同归 `#242`） |

**原始输出（隔离探针，`D:\.tmp-t228\probe-steps2.mjs`；每行都是 `renderHelpShell` 的实测抛错）**：

```
init_banner 无 steps（只有 title/subtitle/button_text/prompt）   A=OK  B=OK
init_banner + closable:true                                       A=OK  B=THROW HelpSchemaError/schema-invalid 多余字段（additionalProperties:false）：closable
init_banner + hidden:false                                        A=OK  B=THROW HelpSchemaError/schema-invalid 多余字段（additionalProperties:false）：hidden
init_banner + steps=字符串数组                                     A=OK  B=OK
init_banner + steps=对象数组                                       A=OK  B=THROW HelpSchemaError/schema-invalid 类型不符：期望 string，实际 object
contact 无 url（老形）                                             A=OK  B=OK
contact 带 url:true                                                A=OK  B=THROW HelpSchemaError/schema-invalid 多余字段（additionalProperties:false）：url
contact 带 copy_all:true（布尔）                                    A=OK  B=THROW HelpSchemaError/schema-invalid 类型不符：期望 string，实际 boolean
scene 带 aliases                                                   A=OK  B=THROW HelpSchemaError/schema-invalid 多余字段（additionalProperties:false）：aliases
```

> ⚠️ **必须是隔离探针**：最初把 `closable:true` 和 `steps` 放一起测时，**先炸的是 `closable`**（校验器逐键走，`additionalProperties` 那一关先命中）——差点把结论记反。上表是逐维隔离后的结果。

### `init_banner.steps`：上报 → 裁决 20 定案，本票已按裁决改

- **满足校验器**（`string[]`）⇒ **模板渲染不对**：6 个步骤格只有序号、**文案为空**（`esc(undefined)` → `''`；实测「字面 `undefined`」为 **0** 次，是**空格子**不是脏字串）。
- **满足模板**（`{title,desc}[]`）⇒ **校验器拒**（`类型不符：期望 string，实际 object`）。
- **两种不可能同时对** ⇒ 本席按更正 2 **停下上报**（未自行改共享层）。
- **裁决 20 定案：改成传 `{title,desc}[]`**（空格子是用户看得见的缺陷；校验器那半条归 `#242`）。**本票已改完并补了两条验证**（见下）。

#### 裁决 20 的补证 ①：6 条步骤的 title／desc **逐条命中整页 HTML**（原始输出）

```
══ ① 步骤文案逐条命中整页 HTML ══
┌─────────┬────┬─────────┬───────────────────────────────────┬──────┐
│ (index) │ 序 │ 字段    │ 文案                              │ 命中 │
├─────────┼────┼─────────┼───────────────────────────────────┼──────┤
│ 0       │ 1  │ 'title' │ '检查并配置 Python'               │ true │
│ 1       │ 1  │ 'desc'  │ '版本与依赖检测'                  │ true │
│ 2       │ 2  │ 'title' │ '数据存储'                        │ true │
│ 3       │ 2  │ 'desc'  │ 'SQLite + FTS5 全文搜索'          │ true │
│ 4       │ 3  │ 'title' │ '飞书 CLI'                        │ true │
│ 5       │ 3  │ 'desc'  │ '安装并授权(核心联动)'            │ true │
│ 6       │ 4  │ 'title' │ '环境变量'                        │ true │
│ 7       │ 4  │ 'desc'  │ 'SKILLS_DB_PATH / MEMO_MEDIA_DIR' │ true │
│ 8       │ 5  │ 'title' │ '初始化数据库'                    │ true │
│ 9       │ 5  │ 'desc'  │ '建表 + 提醒调度'                 │ true │
│ 10      │ 6  │ 'title' │ '生成报告'                        │ true │
│ 11      │ 6  │ 'desc'  │ '初始化报告页'                    │ true │
└─────────┴────┴─────────┴───────────────────────────────────┴──────┘
命中 = 12 / 12
模板侧的读法锚点（逐字）: INIT_BANNER.steps.map(function(st, i){ return '<div class="init-step"><div class="s-n">' + (i+1) + '</div><div class="s-t">' + esc(st.title) + ...
```

**模板运行时实测（不是只看「没抛错」）**——同一个 DOM 桩上真跑一遍，解析渲染出的 `.init-step` 节点：

```json
"步骤卡 init-step 数": 6,
"步骤卡 s-t 文案": ["检查并配置 Python","数据存储","飞书 CLI","环境变量","初始化数据库","生成报告"],
"步骤卡 s-d 文案": ["版本与依赖检测","SQLite + FTS5 全文搜索","安装并授权(核心联动)","SKILLS_DB_PATH / MEMO_MEDIA_DIR","建表 + 提醒调度","初始化报告页"],
"页面出现字面 undefined": false
```

⇒ 6 个格子**序号 ＋ 标题 ＋ 说明**全都在（改前是 6 个空格子）。

#### 裁决 20 的补证 ②：本票载荷**只对 A 路合法**（共享层缺陷的证据，不是我们交付的缺陷）

```
══ ② 本票最终载荷 → B 路校验器 ══
A. 本票**最终**载荷（对象形 steps ＋ hidden）        : HelpSchemaError | code=schema-invalid | path=/init_banner/hidden | 多余字段（additionalProperties:false）：hidden
B. 逐维隔离：只留闭集键 ＋ steps=本票对象形        : HelpSchemaError | code=schema-invalid | path=/init_banner/steps/0 | 类型不符：期望 string，实际 object
C. 逐维隔离：只留闭集键 ＋ steps=[]（schema 要的形）: NO-THROW（过了校验器）
D. 逐维隔离：C 再单独加回 hidden                    : HelpSchemaError | code=schema-invalid | path=/init_banner/hidden | 多余字段（additionalProperties:false）：hidden
E. 对照：只留闭集键 ＋ contact 两项（无 url）        : NO-THROW（过了校验器）
```

**读法（给 `#233` 的读者）**：
- 分歧**恰两处**——`init_banner.steps` 的对象形（`path=/init_banner/steps/0`）与 `init_banner.hidden`（`path=/init_banner/hidden`），**各自单跑都能判 invalid**，是两处独立分歧；
- **其余形状在 B 路全过**（C／E 两行 `NO-THROW`）：`groups`／`scenes`／`editable_fields`／`contact`／`version`／`subtitle` **没有** schema 问题；
- 第 1 行 A 命中 `hidden` 而非 `steps`，是因为校验器**逐键走**、`additionalProperties` 那一关对 `hidden` 先命中；用 B／D 两行隔离过，不是「只错一处」。
- ⇒ **这是共享层「模板要对象数组／schema 要字符串数组」＋「模板认 `hidden`／schema 闭集不收」的两处自相矛盾**，根因归 `#242`。

### `contact` 与用户 V6=B

用户 V6=B 要**可点链接**，但共享 schema 的 `contact.items[]` 是**闭集 `{label,value}`**、加 `url` 必 `schema-invalid`；**模板与 schema 在这一点上不一致**。本票**不动共享层**，照老两项传 `{label,value}`（URL 明文写在 `value` 里，用户至少看得见、可复制），**可点那半条落空**，共享层的不一致另记 `#242`。

---

## 五、`tooling/check-boundaries.mjs` 具体怎么改的（贴 diff）

**并发雷的处理**：该文件带别的会话未提交的改动（`'skill-schedule'` 已被移出、票面写的 `:37` 已漂到 `:41`）。本席**只就地改工作树**、**只删 `'skill-memo-ilife'` 这一项**、**保留对方的 `#199` 注释块与移出**、**绝不按 `git HEAD` 重写整个文件**。`'skill-home'` 属 `#183`，**未碰**。

```diff
-// #96 那条「尚未迁移」的现状断言对它已失效。其余 4 个技能的断言一字未放宽（仍查依赖闭包＋源码）。
-const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife'];
+// #96 那条「尚未迁移」的现状断言对它已失效。
+// #199 起 skill-schedule **移出**该名单：…（对方原文，逐字保留，此处略）
+// #220 起 skill-memo-ilife **移出**该名单：地图 #220 已裁「备忘录 HELP 走共享 help 模板
+// base-paint/help-shell」（走 A 路＝`renderHelpShellHtml`，裁决正本 docs/skills/skill-memo-ilife/
+// t220-orchestrator-decisions.md），memo 自此同样是有意的消费方。同上：断言口径、判定实现
+// 与其余技能的覆盖面一律未动，只是这一份「尚未迁移」名单再少一个名字。
+const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home'];
```

`git diff` 里这段的**唯一实质改动**＝名单里少一个名字；另加 5 行说明注释（照 `#145`／`#199` 的先例形）。**未改**断言口径、判定实现、扫描范围。

---

## 六、必报五步 · 第五步「交付对账」

### 1. 票面要求 → 实际交付（逐条）

| 票面要求 | 实际 | 判 |
| --- | --- | --- |
| `helpFile.ts` **3 个导出** | `buildMemoHelpFileData`／`renderMemoHelpHtml`／`formatHelpMinute`；**类型出口 0**（`dist/help/helpFile.d.ts` 实测只有那 3 条 `export declare function`，选项接口是模块私有、末尾 `export {}`） | ✅ |
| 走 A 路 `import { renderHelpShellHtml } from 'base-paint/help-shell'` | 逐字 | ✅ |
| 不碰 `packages/base-render/**` | 一行未改（`git status` 无本席条目） | ✅ |
| `skill_name='备忘录'`／`title='使用手册'` | 载荷实测同值；文档标题 `备忘录 · 使用手册` | ✅ |
| `subtitle='8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0'` | **派生**得同串（8／30／30／1.3.0 全从资产算） | ✅ |
| `version='1.3.0'`（技能数据世代） | 取资产公开导出，非 npm `0.1.0` | ✅ |
| `recommendations` 不传 | 载荷无此键 | ✅ |
| `contact` V6=B 补 `url` 使其可点 | ⚠️ **未补**：共享 schema 闭集禁 `url`；链接由 `value` 承载；根因归 `#242` | ⚠️ 见 §四 |
| 初始化口径＝「memo 库目录存在」 | 本模块只收 `opts.initialized`（零 IO）；**判目录**归 #229 | ✅（接缝） |
| `init_banner` 键常在、`hidden=已初始化` | 实测 `hidden:false`→`true`；两形态产物差 1 字节 | ✅ |
| 标题／正文／按钮文案与老 6 步 prompt 逐字 | `prompt` **单源**取 `memo_init_setup.prompt_template`；标题／正文／按钮照 `t223-template-contract.md`；**`steps` 取老 `{title,desc}` 6 步**（裁决 20），12 段文案逐条命中页面 | ✅ |
| `editable_fields` 要渲染（V7） | 载荷 64 条／27 场景；模板实测 `.pform` ＋ 4 个 `input[data-p]` ＋ 中文 label | ✅ |
| `aliases` 组装时剥离（裁决 5） | 逐键重建 ⇒ 含 `aliases` 的场景数 **0**；键集 ⊆ 闭集 7 键 | ✅ |
| 页面无命令（U6） | 载荷 `memo.` **0** 处；`--html`／`memo-cmd-read` **0** 处 | ✅ |
| 不标缺失（U1／U2／U3） | `待开发|无唤醒词|当前无` **0** 处；`status` 全空串 | ✅ |
| HELP 自身唤醒词不上页面（V1） | `meta_blocks` 整块不传；载荷 `HELP` 字面 **0** 处 | ✅ |
| `package.json` 手工加 `base-paint` 一行 | 逐字 `"base-paint": "^0.3.0"` | ✅ |
| `check-boundaries.mjs` 只删一项 | 见 §五 diff | ✅ |
| 交付报告含第五步对账 | 本文件 | ✅ |

### 2. 有意偏离／必须声明的事实（逐条）

1. **`editable_fields`＝64 条／27 场景**，不是票面与 `t225-structure-design.md` §2.2 写的「64 条／**29** 场景」。差 2 个场景本席没去追（属 #227 的内容面），但**它是承重数**：本席的测试按**实测的 27** 断，不按 29 断——照 29 写会**必红**。
2. **二级组 id 从 1 起**（老生成器 0 起）：与 #227 资产一致，本席不对账细节。
3. **`version` 不是从 `sceneData.ts` 的 `version` 导出取的**：#227 的 `sceneData.ts` 自述「本文件只给 2 个导出」，`version` **随 `buildHelpSceneIndex()` 的载荷出去**，故本模块用 `buildHelpSceneIndex().version` 取值——**不写第四份副本**（裁决 9 的同一理），也**不给 #227 加第 3 个导出**（守护每件 ≤5 导出与裁决 16 的接口小）。
4. **`subtitle` 在 A 路模板无渲染落点**（锚点：`var SUBTITLE = HELP.subtitle || ''` 之后全模板零引用）⇒ 它**只进 `help-data` 载荷**，页面上看不到；本票照传（票 3 口径），但**不把它当可见面**。
5. **`meta_blocks` 是合规落点、用户 V1 已裁不用**（裁决 15 的措辞）——不是「无源可派生」。
6. **`aliases` 与老 `references/schema.md:30` 的「禁字段」不冲突**：那条禁令管的是**老 yaml**；新资产的 `aliases` 住技能侧、渲染时剥离（裁决 5）。
7. **`备忘改分类` 一词对两场景是逐字保留**（裁决 17／内容裁决 1），载荷**无唯一性约束**（`duplicate-id` 只查场景 `id`），本席实测载荷里 30 个场景 id 唯一、无报错。

### 3. 并发纪律怎么守的（逐条）

1. **`pnpm-lock.yaml`**：**没有跑全量 `pnpm install`**。动了锁的**唯一**动作是 `pnpm boundaries` 自带的 pre-flight 安装（`Scope: all 18 workspace projects` / `Already up to date` / `Done in 1.5s`），它把 `packages/skill-memo-ilife` 的 `base-paint: ^0.3.0 / link:../base-render` 写进 importer（`pnpm-lock.yaml:167-169`）——这是本席 `package.json` 那**一行改动**的**应有结果**。
   **只增不减核账**：12 个 importer（memo／bill／schedule／calorie／chef／home／base-render／base-link-core／base-combos／plugin-chef／plugin-memo-ilife／plugin-bill-ilife）**个个都在**；锁里 `base-paint` 的 `specifier: ^0.3.0` 共 4 处（bill／schedule／memo／另一家），**没有一家被写没了**。
2. **`node_modules` 链接**：因 `packages/skill-memo-ilife/node_modules/` 下**没有** `base-paint`，本席建了一条**本地 junction** `packages/skill-memo-ilife/node_modules/base-paint → D:\ilife\packages\base-render`（`node_modules/` 被 `.gitignore`，不入库；这正是 pnpm 本该建的链接）。**未跑全量安装**。
3. **不跑递归构建**（#241 的雷）：全程**只**对本包跑 `node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json`。**未**跑仓根 `tsc -b`、**未**跑 `pnpm -r build`、**未**跑包内 `build`（它的第二步 `scripts/build-help.mjs` 会**改写 `SKILL.md`**，而 `SKILL.md` 归 #231）⇒ 为此绕开包内 `build` 脚本、只跑 `tsc`。
4. **快照未误伤**：`tooling/skill-html-snapshot.mjs:48` 备忘录条的填充器是 `fillSharedMarkers`——本席**没跑** `snapshot:html`／`--write`，**没写**快照件。
5. **`base-render`**：一行未碰；跑 `gen:help-shell:check` 仍绿，判过不是我们造成的漂移。

### 4. `git add` 边界

**只 `git add` 自己这 4 件**：`packages/skill-memo-ilife/src/help/helpFile.ts`、`packages/skill-memo-ilife/test/help-file-228.test.mjs`、`packages/skill-memo-ilife/package.json`、`tooling/check-boundaries.mjs`（外加交付报告 `docs/skills/skill-memo-ilife/t228-render-report.md`）。
**不 add** #227 的件（`src/help/sceneData.ts`／`src/help/scenes/`／`scripts/gen-help-assets.mjs`／`AGENTS.md`／`SKILL.md`）。
`pnpm-lock.yaml` 正被别家改写 ⇒ **本席不 add 它**，把判断留给编排会话（本席只提供 §六第 3 条的核账）。

---

## 七、拿不准／停下上报（逐条）

1. **【已裁·已改完】`init_banner.steps` 两形态不可能同时正确**（§四）⇒ **裁决 20：取页面正确那一边**，本票已改成传 `{title,desc}[]`，并补了两条验证（12/12 文案命中 ＋ B 路隔离探针）。**本席未自行扩 schema、未改模板源。**
2. **【已上报·落空·根因归 #242】`contact` 的可点链接**：用户 V6=B 的意图**未能完全达成**（schema 闭集禁 `url`）。链接以明文 `value` 承载，可复制、不可点。
3. **【承重数冲突·编排已裁】** `editable_fields` 涉及场景数**实测 27**，而 `t225-structure-design.md` §2.2 写 **29**（旧数）。编排会话已把裁决 6 订正为 **27**（根因：12 条 `html` 里有 2 个场景**只有** html 字段，剔除后归零 ⇒ 29−2=27），本席的断言按 **27**。
4. **【越权但如实登记】** #227 的 `scripts/gen-help-assets.mjs`＝**410 LF > 350**，触发本包第四步；归 #227（编排已下达）。
5. **【本席未验的】** 本席**没有**在真浏览器里打开产物（未起浏览器、未起任何服务）；UI 层的「观感」结论全部来自**模板源逐字**＋**极简 DOM 桩上的真跑**。产物文件已落在 `D:\.tmp-t228\`，人工可开。
6. **【#227 施工中途的返工】** 本席第一次构建时，#227 的域文件导出的是**数组**（`export const MEMO_HELP_MEMO = [`），`MEMO_HELP_GROUPS` 因而是**嵌套一层**的 `[[…],[…]]`，运行时 `G[0].subgroups` 为 `undefined`、tsc 报 6 个错；#227 随后改成**单对象**导出（`= {`）后重建即全清。**这是 #227 已自愈的中间态**，本席只作记录（编排已记下，供 #227 复审用）。
7. **【口径提示】** `hint` 字段实测**不带 `___` 占位符**（0 条），故「老 prompt 的 `___` 空槽 ＋ `editable_fields` 追加 `label: 值`」的**双重参数机制**未实际发生；但 `editable_fields[].name` 仍是内部标识符（`category`／`due`／`tasklist_guid` 等）住在载荷里——模板只渲染 `label`，故**用户面上不是缺陷**，如未来有下游直读 `name` 需注意。
8. **【本席踩坑留证】** B 路校验器在**包根** `base-paint`；子路径 `base-paint/help-shell` 导出的 `renderHelpShell` 是 `renderHelpShellHtml` 的**别名**（生成物逐字 `typeof renderHelpShellHtml`），**不做 schema 校验**。本席第一版补证 ② 用错子路径，「只对 A 路合法」那条断言**假绿**了一次，改用包根后转真。**下游若要复现校验器行为，务必从包根 import。**
