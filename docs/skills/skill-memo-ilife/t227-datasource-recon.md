# t227 数据来源映射 ＋ 缺口清单（地图 `#220` 备忘录HELP真标准 · 侦察报告）

- 侦察员席位：只读侦察（未改 `packages/**`、未改任何 issue、未 commit、未建任何资产代码）
- 产物：本文件（唯一新建文件）
- 老侧全程只读：`D:\2Study\StudyNotes\SKILLS\备忘录\**`
- 复现命令见附录 G

---

## 订正记录（对抗式数字复审后，2026-09-12）

- **交付指纹（可复算）**：**尾部**（本行之后的全部字节）`sha256 = 1628d75e9f93955ee5d6d5ce95e3e5a66aea2b7b306e84e27f7ea505ae0d5974`，`79995` B ／ `707` 行；**头部**（文件起 → 本行）= `12` 行 ⇒ **全文 `719` 行**（全文字节数随本行数字微变，以附录 G.4 命令现读为准）。选「尾部哈希」是为了**非自指**：填本行不会改动被哈希的字节，可无限次复算。
- 复审来源：`docs/skills/skill-memo-ilife/t227-recon-review-C.md`（复审员 C，独立 replay）。
- **结论**：编号 1–10 的承重数字**全部通过**（30×9 逐字比对 mismatch 0／30 行 types 表 0 误差／13 行二级组 id 0 误差／21 条 `add_parser` 与「两表缺 3」／`subgroups[].id` 确为 0 起）——#227「逐字对得上」的判据未受损。
- 抓出 **6 类错数（落到 9 处）**，我都**回原始出处复算后确认属实**，逐处订正如下（**无一条拒绝照改**）：

| # | 原稿位置 | 错处 | 订正为 | 复算方式 |
|---|---|---|---|---|
| 1 | A.8 正文（原 `:297`） | 「①∪② = **23** 条」「1＋10＋12 = 23」 | **①∪② = 22**；分解 = **1 布尔 ＋ 9 非 html 非布尔的落回 ＋ 12 html = 22**。根因：**① ⊂ ②**，布尔行同时被计入 ②，我把它重复加了一次 | `all(b in fb for b in boo) == True` |
| 2 | E.9（原 `:590`） | 「先清洗 **23** 条（1＋10＋12）」「**10** 条落回补中文名」 | **22 条**；需补中文名的**非布尔**落回 = **9 条**（`remind_at`×2／`repeat_rule`×2／`start`／`end`／`status`／`tasklist_guid`／`reminder_id`）。同句「76−12 = 64」**保持不变**（字段总条数不受影响） | 脚本枚举 |
| 3 | A.5.1（原 `:179`） | 「`--html` **4** 条」＋「4＋4=8」 | **`--html` 6 个场景**（`search_keyword`／`get_detail`／`reminders_active`／`complete_wish`／`wish_schedule`／`sync_feishu`）；不重不漏分解 = **`--html` 6 ＋ 子命令名 4 ＋ `-c` 1，并集 8**（命中场景总数 8 不变） | 脚本枚举 |
| 4 | B.2／E.18 | 「实测编号行 ✅10 / 🟡3 / ❌16」 | **编号行 1–29 = ✅11 ／ 🟡2 ／ ❌16（= 29）**；**另有 1 条未编号行**（`:265`「备忘改分类(批量)」🟡）→ 含它则 🟡 有 **3 个行位**。✅ 行号名单 = `2,3,6,7,12,13,17,21,25,28,29` | 逐行解析 `:236-266` |
| 5 | 同处（漏纠） | 我原来只用「❌15」纠老文档，**没纠它 `:272` 的 ✅=10 也是错的**（清单漏了 `:264`「备忘录同步」#28 ✅） | 老文档 `:272` 的 ✅ 清单**同样错**，正确 ✅ = **11** | 逐行解析 |
| 6 | E.3（原 `:584`） | 「**33** 个场景组里 **27** 条两原子、**3** 条三原子」 | **30 场景 = 26 两原子 ＋ 4 三原子**（三原子 = `memo_complete_wish`／`memo_wish_schedule`／`memo_batch_change_category`／`memo_init_setup`）；该段原子计数 `{回执:30,采集:20,查看:10,向导:4}` 本身**是对的**，保持不变 | 脚本枚举 |
| 7 | B.3（原 `:449`） | `memo_cli.py:117 p_del.add_argument("-y","--yes",…)` | **`:1575`**（`:117` 是空行） | `Select-String '--yes'` |
| 8 | B.6（原 `:476`） | 「顶层允许键 **7** 个（`…:106-135`）」 | **9** 个：补 **`meta_blocks`（`:117-125`）**、**`recommendations`（`:228-236`）**；闭集行号到 **`:237-238`** 才闭合。**这条是方向性误导**：老实物 HELP 自己的唤醒词就装在 `meta_blocks` 里（`packages/skill-bill/src/triggers/wake-assets.ts:980` 逐字「老实物 `meta_blocks.help_wake_words` 那一块」）→ 我原 F.8 写的「无源可派生」**漏报了现成合规落点**，已改 | 通读 `help.ts:113-238` |
| 9 | A.7 第 8 行 | 批量改分类出处标 `SKILL.md:265/:732` | 那两行写的是「**备忘改分类**(批量)」；逐字 `批量改分类` 出现在 **`:169`**（表 1 口语列）／**`:644`**（路由规则）／**`:731`**（章节标题）／**`:754`**（引导话术），另 `:216`／`:638` 是「批量改分类**向导**」 | 逐字 grep |

- **顺带采纳的 5 条建议**：① A.5.1 显式补 `--suggest-due` 并声明裸词 `due` 不计（见 A.5.1 末注）；② A.7 出处改 `:644`／`:731`，另给「查提醒」补 `memo_render.py:45` 出处；③ 附录 G 增加「编号行 vs 行位」口径定义；④ 本节钉交付指纹；⑤ 新增 G.4「行号回读」方法。
- **本轮另新增 2 条复核期发现的硬事实**（复审未提，我实测补入 B.6）：`contact.items[]` 是 `{label,value}` **闭集** → 票 6 V6=B「补 `url` 字段」在现 schema 下**写不进去**；`init_banner.steps` **schema 要字符串数组、模板要对象数组**，老 `memo_render.py:516-523` 传的是对象 → 三者不一致（见 B.6.3／F.12／F.13）。

---

## 1. 一句话结论

**`t222-skeleton.json` 不够用，但 #227 也不需要靠它——目标形状的权威定义就在老家 `memo_render.py:527-599`。**

| 判断 | 依据 |
|---|---|
| skeleton **形状不对** | 它是 `domains[].subs[].scenes[]`，场景 5 字段 `{id, wake[], title, type, status}`，**没有 `prompt_template`／`types`／`editable_fields`／`aliases`／二级组 id**（`t222-skeleton.json` 顶层键只有 `schema/for_ticket/map/sources/counts/help_only/old_aliases_not_in_yaml/key_cn/wake_map/domains/new_table/old_scenes`）。 |
| skeleton **内容对**（可当校验基准的一半） | 与老 yaml 逐字段比对 **mismatch = 0**（30/30 × 9 字段，见 A.1）。 |
| **最大缺口不是 skeleton，是没人指出转换层** | 老 `script/memo_render.py:527-599` 的 `_scenarios_to_contract_data()` **逐字产出目标形状**：`scenario_id→id`、`scenario_title→title`、`wake_word→wake_word`、`status→status`、`prompt→prompt_template`、`type` 按 `+` 拆 `types`、`dimensions→editable_fields`、`subgroups[].id = f"{cat_key}_{len(g['subgroups'])}"`。**字段名逐字对得上票面**。 |
| #227 需要额外读哪些源 | **老侧只有 4 处**：① `references/scenarios.yaml`（560 行全量）② `SKILL.md` 抽 5 段（`:147-172`／`:226-266`／`:300`／`:477-563`／`:1082-1095`）③ `script/memo_cli.py:1541-1694`（21 子命令）④ `script/memo_render.py:49-69`（`DIM_LABEL_MAP`）＋`:527-599`（转换层）。**另加仓内第 5 处必读**：`packages/base-render/src/spec/help.ts`（`SCENE_DATA_SCHEMA` ＋ `validateSceneData`，三层闭集是硬门，见 B.6）。 |
| **但有一条票面没写的硬门** | `aliases` **在渲染载荷里无处可放**：`packages/base-render/src/spec/help.ts:152-190` 的 `scenes[]` 是 `additionalProperties:false` 的 **7 键闭集**，没有 `aliases`（见 B.6）。三个先例（记账／作息／卡路里）都没有这个位。#227 得先定落点。 |
| **HELP 自身唤醒词：有落点、但被裁不用** | 顶层 `meta_blocks`（`help.ts:117-125`）就是老实物装 HELP 自身唤醒词的地方（`wake-assets.ts:980`），**不是"无处可放"**；但票 6 V1=A 已由用户裁定不传 ⇒ 本票不落（F.8）。 |

---

## 2. A 逐字段来源映射

### A.0 目标形状与老家转换层的对照（权威定义）

老 `memo_render.py:569-581` 原样：

```python
        scene = {
            "id": s.get("scenario_id"),
            "title": s.get("scenario_title", ""),
            "wake_word": s.get("wake_word", ""),
            "status": s.get("status", ""),
            "prompt_template": s.get("prompt", ""),
        }
        types = [t.strip() for t in str(s.get("type", "")).split("+") if t.strip()]
        if types:
            scene["types"] = types
        if editable_fields:
            scene["editable_fields"] = editable_fields
        sub["scenes"].append(scene)
```

老 `memo_render.py:556-560`（二级组 id）：

```python
        sub_key = s.get("subfunction") or "基础"
        sub = next((sg for sg in g["subgroups"] if sg["label"] == sub_key), None)
        if sub is None:
            sub = {"id": f"{cat_key}_{len(g['subgroups'])}", "label": sub_key, "scenes": []}
```

仓内目标形状（`packages/skill-bill/src/triggers/wake-assets.ts:28-53`，记账已落地物，字段名逐字同）：

```ts
export interface WakeSceneAsset {
  readonly id: string; readonly title: string; readonly wake_word: string;
  readonly status: string; readonly prompt_template: string;
  readonly types: readonly WakeSceneType[];
}
export interface WakeSubgroupAsset { readonly id: string; readonly label: string; readonly scenes: readonly WakeSceneAsset[]; }
export interface WakeGroupAsset { readonly id: string; readonly icon: string; readonly label: string; readonly subgroups: readonly WakeSubgroupAsset[]; }
```

共享模板消费端（`packages/base-render/assets/help-template.html:1660-1673`）读 `s.id / s.title / s.wake_word / s.types / s.status / s.prompt_template / s.editable_fields`——**与上面逐字一致，零模板改动**。

> ⚠️ 一处**必须偏离老家**的地方：老家二级组 id **0 起**，票 6 V8=A 裁 **1 起**。转换层不能逐字搬（见 A.9）。

### A.1 `id` ← `scenario_id`（逐字）

**抽法说明（比要求更强）**：我没有只抽 3–5 条，而是**全 30 条 × 9 个可比字段**逐一 `==` 比对老 yaml 与 `t222-skeleton.json`：

命令：`yaml.safe_load(scenarios.yaml)` 后逐场景比对 `scenario_id↔id`、`scenario_title↔title`、`type↔type`、`status↔status`、`category↔category`、`wake_word↔wake[0]`、`subfunction↔subfunction`、`len(dimensions)↔n_dims`、`yaml 行 m['line'] 内容含 id 或唤醒词`。

结果：**`mismatch_count = 0`**（30/30 全对）。→ `id` **可逐字搬**，来源唯一：`scenarios.yaml` 各 `scenario_id`。

### A.2 `title` ← `scenario_title`（逐字）

同上，30/30 一致。抽样三条供肉眼核：

| 场景 id | `scenario_title` 原文 | yaml 行 |
|---|---|---|
| `memo_add_basic` | `添加一条备忘笔记` | 54 |
| `memo_search_by_date` | `按日期范围搜索笔记` | 189 |
| `memo_init_setup` | `初始化备忘录(首次使用引导)` | 537 |

### A.3 `wake_word` ← `wake_word`（**老 yaml 就是单值**，不是数组）

**结论：目标字段形状与老源一致，无需拆数组。**

- 老 yaml 头注 `scenarios.yaml:5` 逐字：「`wake_word: 关联业务唤醒词(HELP 唯一展示名;别名只在 SKILL.md 匹配层,#31 Q1)`」
- 实测：30 条 `wake_word` **全部是 YAML 标量字符串**，无一条是 list。
- skeleton 的 `wake[]` 是票 2 提取脚本给的外壳：**长度直方图 `Counter({1: 30})`，多元素场景 = `[]`**——它把 30 个单值各包成 1 元数组，没有一条多词。
- 老转换层 `memo_render.py:572` 也是 `s.get("wake_word", "")` 直取单值。

**「一场景给了多个词」的实测答案：老 yaml 里 0 条。** 反向的「一个词对多个场景」有 1 条（`备忘改分类`，见 C.1）。

> 若 #227 的生成器照账单走，**不要照抄 skeleton 的 `wake[]`**，直接取 yaml 标量。

### A.4 `status` ← `status`

- 老 yaml **有**这个字段，契约定义在 `scenarios.yaml:10`：「`status: ""(可用) | "【待开发】"(禁用 + AI 必停)`」；`SKILL.md:1129` 同义。
- 取值实测：**30/30 全是空串 `''`**。`【待开发】` **老数据零使用**。
- skeleton 的 `status: ""` 30/30，一致。
- 转换层 `memo_render.py:573` 直取；`memo_render.py:584` 用它算「可用数」：`available = sum(1 for s in scenarios if not s.get("status"))`。
- 模板侧 `help-template.html:1667`：`dev: (s.status === '【待开发】')`——**登记位机制在，老数据没占位**。

**答「哪些进 HELP、哪些留登记位」**：老骨架层面**没有分歧**——30 条全进（`available = 30`），无人占用 `status`。票 6 U1/U2/U3=A 的「不标缺失」只是要求**不许**新造 `【待开发】` 标记。

### A.5 `prompt_template` ← `prompt`（**最大缺口的真答案**）

**来源：老 yaml 每条场景的 `prompt` 字段，30/30 全文都在，一字不缺。** skeleton 看不到它，是因为票 2 的提取脚本没取这个字段，**不是老家没有**。

- 老契约 `scenarios.yaml:9`：「`prompt: 稳定用户意图(不暴露 CLI / DB / Python / 模板路径)`」
- 老契约 `scenarios.yaml:19`：「复制契约:复制按钮直接复制 prompt 纯文本(自含唤醒词锚点,不加标签头 · 卡路里同型)」
- 转换层 `memo_render.py:574`：`"prompt_template": s.get("prompt", "")`。
- **不进资产的兄弟字段**：`result` / `dependencies`——`memo_render.py:535` 逐字：「`- result / dependencies 不展示(数据留 yaml · #295 决议)`」。

**原文样例（3 条完整，逐字）**：

`memo_add_basic`（yaml:61-64）：
```
请帮我记一条备忘(唤醒词:记备忘):

请按以下格式填写你的参数:

  内  容: _____________ (你想记的话)
  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)
  子分类: _____________ (选填,2 字简短描述,如"工作")
  附  件: _____________ (选填,文件名,如 receipt.jpg)

期望效果:
  AI 创建一条备忘,告诉你 ID 和创建时间。心愿类还会自动建飞书任务。
```

`memo_delete_basic`（yaml:97-98）：
```
请帮我删除一条或多条备忘(唤醒词:删备忘):

请按以下格式填写你的参数:

  笔记 ID: _____________ (可多个,空格分隔,如"15 18 22")

期望效果:
  AI 删除这些备忘并告知影响行数;有关联提醒时 AI 会先确认。
```

`memo_init_setup`（yaml:555-557）：
```
请帮我初始化备忘录,我是第一次使用(唤醒词:首次使用):

无需参数,直接发送。

请按步骤帮我搭建好环境:检查并配置 Python、数据存储(全文搜索)、飞书 CLI(未安装则引导我安装并授权)、环境变量,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装/怎么配,完成后生成初始化报告页给我,并带我浏览一遍全部功能。

期望效果:
  AI 逐步引导我从零搭建环境(检测→安装/配置→验证),缺什么给具体指引,初始化数据库,生成初始化报告页,报告就绪情况。
```

#### A.5.1 硬编码命令名排查（用户 U6 立规前的存量）

**`memo.*` 形式的命令名：0 条。** 全 30 条 prompt 里没有 `memo.search` / `memo.create` 之类的点号命令。

**但有 8 条 prompt 含 `memo_cli.py` 的子命令名或 CLI 开关**（都是 U6 立规后必须去掉的）：

| # | 场景 id | 唤醒词 | yaml 行 | 原文片段（逐字） | 命中 token | 建议改写 |
|---|---|---|---|---|---|---|
| 1 | `memo_search_keyword` | 搜备忘 | 150-151 | `带 --html 时生成可视化搜索结果页。` | `--html` | `并生成可视化搜索结果页。` |
| 2 | `memo_get_detail` | 看备忘 | 180 | `带 --html 时生成详情页。` | `--html` | `并生成详情页。` |
| 3 | `memo_search_wish` | 查心愿 | 215 | `AI 自动按"心愿"分类过滤,等同搜备忘 -c 心愿。` | `-c ` | `AI 自动按"心愿"分类过滤。` |
| 4 | `memo_reminders_active` | 看提醒 | 299 | `带 --html 时生成可筛选的可视化页。` | `--html` | `并生成可筛选的可视化页。` |
| 5 | `memo_complete_wish` | 完成心愿 | 332 | `批量场景:先 wish-complete --html 生成向导,你在 HTML 勾选 + 填打卡内容。` | `wish-complete`＋`--html` | `批量场景:先出一份完成向导页,你在 HTML 勾选 + 填打卡内容。` |
| 6 | `memo_wish_schedule` | 心愿排期 | 351-352 | `批量场景:先 wish-batch-plan --suggest-due X --html 生成向导,你在 HTML 微调。` | `wish-batch-plan`＋`--html` | `批量场景:先出一份排期向导页(可带建议日期),你在 HTML 微调。` |
| 7 | `memo_batch_change_category` | 备忘改分类 | 372 | `采纳复制 → 调多条 update-category。` | `update-category` | `采纳复制 → AI 逐条改分类。` |
| 8 | `memo_sync_feishu` | 备忘录同步 | 388-389 | `2. 反向同步 done(飞书已完成 → 本地 complete-wish)` ＋ `带 --html 时生成同步报告页(含 11 统计字段)。` | `complete-wish`＋`--html` | `2. 反向同步完成状态(飞书已完成 → 本地标记完成)` ＋ `并生成同步报告页(含 11 统计字段)。` |

**合计 8 条场景要改；其余 22 条 prompt 零命令 token。** 断言：**命中场景 `= 8`**（并集，不重不漏）；分解 = **`--html` 6 个场景**（表内 #1／#2／#4／#5／#6／#8）＋ **子命令名 4 个场景**（#5 `wish-complete`／#6 `wish-batch-plan`／#7 `update-category`／#8 `complete-wish`）＋ **`-c ` 1 个场景**（#3），**并集 = 8**（#5／#6／#8 同时命中 `--html` 与子命令名，故 `6+4+1 ≠ 8`，不能相加）。

> **附注（口径声明，避免下次又算成 8）**：另有两个 CLI 记号**有意不计入上表**——① `--suggest-due`（只出现在 `memo_wish_schedule`，与 #6 同一场景，已随 #6 一起改）；② **裸词 `due`**（出现在 `memo_wish_schedule`／`memo_sync_feishu` 两条 prompt，如 `飞书 task 同步 due`／`本地 notes.due`），它是**数据列名不是子命令**，已在 A.5.2 第二类里单独列，不重复计入命令 token。

#### A.5.2 顺带发现的**第二类**实现细节（老 yaml 自己的契约 `:9` 说「不暴露 DB」）

不在 U6 的"命令"范围内，但同样违反 `scenarios.yaml:9` 的自家契约，#227 应一并清（否则「逐字搬」会把 DB 字段名搬上页面）：

| # | 场景 id | yaml 行 | 原文片段（逐字） | 性质 |
|---|---|---|---|---|
| 1 | `memo_wish_schedule` | 350-351 | `AI 设置本地 notes.due + 飞书 task 同步 due。` | 表名＋列名 |
| 2 | `memo_sync_feishu` | 389 | `3. 反向同步 due(飞书 due 改 → 本地 notes.due 跟)` | 表名＋列名 |
| 3 | `memo_complete_wish` | 332 | `新建打卡 note(同事务)` | 表名 |
| 4 | `memo_add_wish` | 415 | `AI 创建心愿 note,自动建飞书 task 并写回 task_guid。` | 表名＋列名 |
| 5 | `memo_add_wish` | 414 | `(选填,tasklist GUID,留空=我的任务)` | 内部字段 |
| 6 | `memo_remind_with_note` | 264 | `Cron 到点触发推送。` | 实现机制名 |
| 7 | `memo_add_wish` / `memo_init_setup` | 412 / 540+544 | `Python 3.10+` 等 | 依赖文本（`dependencies` **不进页面**，`prompt` 里 `Python` 出现在 `memo_init_setup:556`「检查并配置 Python」——**这条是给用户的安装指引，属正常**，不建议清） |

> 处置口径建议：#1–#5 清成用户话（`本地排期 + 飞书任务同步`／`新建一条打卡记录`／`写回飞书任务`）；#6 可留（用户看得懂的调度说法）；#7 留。**这一条是我的判断，不是票 6 的裁决**，见 F.3。

### A.6 `types` ← `type` 按 `+` 拆分（**全 30 场景对照表**）

来源：老 yaml `type`（组合串，**是字符串不是数组**）→ `memo_render.py:576` `[t.strip() for t in str(s.get("type","")).split("+") if t.strip()]`。

| # | 场景 id | 唤醒词 | 老 `type` 原值 | 目标 `types` | 原子数 |
|---|---|---|---|---|---|
| 1 | `memo_add_basic` | 记备忘 | `采集+回执` | `["采集","回执"]` | 2 |
| 2 | `memo_update_basic` | 改备忘 | `采集+回执` | `["采集","回执"]` | 2 |
| 3 | `memo_delete_basic` | 删备忘 | `采集+回执` | `["采集","回执"]` | 2 |
| 4 | `memo_change_category_single` | 备忘改分类 | `采集+回执` | `["采集","回执"]` | 2 |
| 5 | `memo_change_subcategory` | 备忘改子分类 | `采集+回执` | `["采集","回执"]` | 2 |
| 6 | `memo_search_keyword` | 搜备忘 | `查看+回执` | `["查看","回执"]` | 2 |
| 7 | `memo_search_alias` | 查备忘 | `查看+回执` | `["查看","回执"]` | 2 |
| 8 | `memo_get_detail` | 看备忘 | `查看+回执` | `["查看","回执"]` | 2 |
| 9 | `memo_search_by_date` | 按时间搜备忘 | `查看+回执` | `["查看","回执"]` | 2 |
| 10 | `memo_search_wish` | 查心愿 | `查看+回执` | `["查看","回执"]` | 2 |
| 11 | `memo_search_checkin` | 查打卡 | `查看+回执` | `["查看","回执"]` | 2 |
| 12 | `memo_search_mood` | 查情绪 | `查看+回执` | `["查看","回执"]` | 2 |
| 13 | `memo_remind_with_note` | 记提醒 | `采集+回执` | `["采集","回执"]` | 2 |
| 14 | `memo_remind_existing` | 设提醒 | `采集+回执` | `["采集","回执"]` | 2 |
| 15 | `memo_reminders_active` | 看提醒 | `查看+回执` | `["查看","回执"]` | 2 |
| 16 | `memo_completed_reminders` | 查已提醒备忘 | `查看+回执` | `["查看","回执"]` | 2 |
| 17 | `memo_complete_wish` | 完成心愿 | `向导+采集+回执` | `["向导","采集","回执"]` | 3 |
| 18 | `memo_wish_schedule` | 心愿排期 | `向导+采集+回执` | `["向导","采集","回执"]` | 3 |
| 19 | `memo_batch_change_category` | 备忘改分类 | `向导+采集+回执` | `["向导","采集","回执"]` | 3 |
| 20 | `memo_sync_feishu` | 备忘录同步 | `查看+回执` | `["查看","回执"]` | 2 |
| 21 | `memo_add_wish` | 记心愿 | `采集+回执` | `["采集","回执"]` | 2 |
| 22 | `memo_delete_wish` | 删心愿 | `采集+回执` | `["采集","回执"]` | 2 |
| 23 | `memo_update_wish` | 改心愿 | `采集+回执` | `["采集","回执"]` | 2 |
| 24 | `memo_add_checkin` | 记打卡 | `采集+回执` | `["采集","回执"]` | 2 |
| 25 | `memo_delete_checkin` | 删打卡 | `采集+回执` | `["采集","回执"]` | 2 |
| 26 | `memo_update_checkin` | 改打卡 | `采集+回执` | `["采集","回执"]` | 2 |
| 27 | `memo_add_mood` | 记情绪 | `采集+回执` | `["采集","回执"]` | 2 |
| 28 | `memo_delete_mood` | 删情绪 | `采集+回执` | `["采集","回执"]` | 2 |
| 29 | `memo_update_mood` | 改情绪 | `采集+回执` | `["采集","回执"]` | 2 |
| 30 | `memo_init_setup` | 首次使用 | `向导+采集+回执` | `["向导","采集","回执"]` | 3 |

**自证断言**：`行数 = 30`；原子计数 `{回执: 30, 采集: 20, 查看: 10, 向导: 4}`，`合计 = 64`（＝票 3 的 4 原子数，逐一对上）；**`types` 里不出现 `选择`**（票 3 结论确认）。

**形状答案**：目标是 `readonly WakeSceneType[]`（账单口径），**不是**组合串。拆法照 `memo_render.py:576`：按 `+` split ＋ strip ＋ 去空。

> 模板侧兼容性：`help-template.html:1698-1709` 的 `TYPE_DEFAULT` **认得 10 个词**（采集／查看／结果／向导／批量／校验／**选择**／过程／回执／录入）。**`选择` 在配色表里本来就有**（`:1705`），只是老备忘录数据没用它 → 票 3「没有『选择』」指的是**数据没有**，不是模板没有。**模板零改动结论成立。**

### A.7 `aliases` ← **不是老 yaml 字段**（三处合起来）

老 yaml 头注 `:5` 逐字：「别名只在 SKILL.md 匹配层」→ **别名表必须从 `SKILL.md` 与仓内新表凑**。票 6 U4=A 定口径：「**老词为主名、新词进 `aliases`**；4 条情绪孪生不各占一行场景」。

**完整别名清单（12 条，机器可核）**：

| # | 别名（词） | 归到场景 id | 出处（实测行号） | 那处独有信息 |
|---|---|---|---|---|
| 1 | `完成打卡` | `memo_complete_wish` | `SKILL.md:262`（HTML 对照表行 26「完成心愿(别名:完成打卡)」）／`:300`（唤醒词总表）／`:700`（章节行） | 三处同名，yaml 里 0 次 |
| 2 | `初始化` | `memo_init_setup` | `SKILL.md:300` | 只在总表，yaml 里 0 次 |
| 3 | `新手` | `memo_init_setup` | `SKILL.md:300` | 同上 |
| 4 | `记情绪日记` | `memo_add_mood` | `SKILL.md:479`（「子唤醒词:记心愿、记打卡、记情绪日记」） | SKILL.md 正文用新名，yaml 主词是 `记情绪` |
| 5 | `查情绪日记` | `memo_search_mood` | `SKILL.md:525`／`:536`／`:540` | 三处 |
| 6 | `改情绪日记` | `memo_update_mood` | `SKILL.md:547` | — |
| 7 | `删情绪日记` | `memo_delete_mood` | `SKILL.md:563` | — |
| 8 | `批量改分类` | `memo_batch_change_category` | skeleton `new_table`（新仓 `packages/skill-memo-ilife/src/policy/wakewords.ts:16`）＋ `SKILL.md:169`（表 1 口语列）／`:644`（路由规则）／`:731`（章节标题）／`:754`（引导话术）；另 `:216`／`:638` 写作「批量改分类**向导**」 | 新表拆词；yaml 里没有。⚠️ 原稿误标 `:265`／`:732`——那两行逐字是「**备忘改分类**(批量)」，不是本别名 |
| 9 | `改子分类` | `memo_change_subcategory` | 新表（`wakewords.ts:17`）＋ `SKILL.md:245` | 票 2 认定的**唯一一条被子串救回**的老场景 |
| 10 | `查提醒` | `memo_reminders_active` | 新表（`wakewords.ts:22`）；老侧另有出处 **`memo_render.py:45`**（`COMMAND_CN_MAP` 逐字 `"reminders": "查提醒"`） | **SKILL.md 两张表都没有**，只在新表 ＋ 老渲染层的中文名表 |
| 11 | `记一条` | `memo_add_basic` | 新表（`wakewords.ts:28`） | 同上 |
| 12 | `添加笔记` | `memo_add_basic` | 新表（`wakewords.ts:29`）＋ `SKILL.md:477`（章节标题「### 添加笔记」是功能名不是唤醒词） | 章节名当别名 |

**自证断言**：`别名条数 = 12`（3 ＋ 4 ＋ 5），`唯一词 = 12`（无重复）。

**明确「不进取」的三处**（都有硬依据）：

1. **HELP 自身的 9 条触发短语**（`备忘录 HELP`／`备忘录 help`／`备忘 HELP`／`备忘录的help在哪`／`帮我看下备忘录的使用说明`／`/备忘录-help`／`/备忘录 help`／`备忘录 manual`／`备忘录 guide`，出处 `SKILL.md:1088-1095`）——票 6 **V1=A** 明裁不上页面；且 U7 更正为 **9 条**（不是 8 条，`guide` 与 `manual` 同格）。skeleton 的 `help_only` 已收这 9 条。
2. **表 1 的 42 条口语样例**（`SKILL.md:158-172`，15 数据行，逐行样例数 `3,3,2,2,2,2,3,3,3,3,3,3,2,3,5` ＝ 42）——它们是**句子**（含 `xxx` 占位、`#15`、`"上周做了什么"`），不是词形别名。**票 6 没有裁这一条**（见 F.1）。
3. **`查备忘`** 不作为别名——理由见 C.2：它在 yaml 里**有自己的场景卡** `memo_search_alias`，`SKILL.md:239`／`:524` 说它是「搜备忘的别名」是**老文档与老 yaml 自相矛盾**，资产必须以 yaml 为准（否则 `memo_search_alias` 会变成没有 `wake_word` 的空卡）。

### A.8 `editable_fields` ← `dimensions`（**不是 `keys`／`n_dims`**）

**先回答"`keys`／`n_dims` 是不是它"：不是。**

- skeleton 的 `n_dims` 是**条数**（老 `dimensions` 的键数），`keys` 实测 `old_scenes[0]` 是 `[]`、`landing=none` 的场景全为 `[]` —— 它是票 2 给"新表 key 落点"准备的字段，**与老 `dimensions` 无关**。
- 真来源是 `memo_render.py:562-567`：

```python
        dims = s.get("dimensions") or {}
        editable_fields = [
            {"name": k, "label": DIM_LABEL_MAP.get(k, k), "value": "",
             "hint": str(v), "required": False}
            for k, v in dims.items() if v
        ] or None
```

- `label` 表在 `memo_render.py:49-69` `DIM_LABEL_MAP`（19 个键：`id/ids/content/category/sub_category/media/due/with_reminders/true/bulk_indicator/note_id/at/repeat_type/rule/date/keyword/from_category/to_category/wish_id`）。
- 模板消费端 `help-template.html:1669-1671`：`params: (s.editable_fields||[]).map(f => ({key:f.name, label:f.label, value:f.value||'', req:!!f.required, hint:f.hint||''}))` → **目标形状的字段名是 `name/label/value/hint/required`**。
- **票 6 V7=A：进**（「使用这个参数，挺好的」），按**清洗后的 76 条**落。

**三类缺陷落到具体条目（不是只给数量）**：

| 缺陷 | 条数 | 具体条目 |
|---|---|---|
| ① 布尔脏数据 | **1** | `memo_delete_basic` 的 `dimensions` 键 `true`（yaml:96 `true: 跳过二次确认(自动化用)`）→ YAML 把键解析成 **Python 布尔 `True`**，`name` 与 `label` 都成 `True`。`DIM_LABEL_MAP` 写的是字符串 `"true"`，**查不中**（布尔 ≠ 字符串）。→ 清洗：键写成字符串 `"true"` 或改名 `confirm_skip`，label 补 `跳过二次确认`。 |
| ② label 落回 ASCII 键名 | **22**（去重后 **9** 个键） | `html`×12、`remind_at`×2、`repeat_rule`×2、`True`×1、`start`×1、`end`×1、`status`×1、`tasklist_guid`×1、`reminder_id`×1 |
| ③ CLI 开关 `html` | **12**（**⊂ ②，不是并列**） | `memo_search_keyword`／`memo_get_detail`／`memo_search_by_date`／`memo_search_wish`／`memo_search_checkin`／`memo_search_mood`／`memo_reminders_active`／`memo_completed_reminders`／`memo_complete_wish`／`memo_wish_schedule`／`memo_batch_change_category`／`memo_sync_feishu` |

> ⚠️ **票面口径的一处澄清（复审订正）**：票面把三类并列写「1 条布尔 ＋ 22 条回落 ＋ 12 条 html」，读起来像 35 条；实测 **① ⊂ ②**（布尔行的键 `True` 同时**不**在 `DIM_LABEL_MAP` 里，故它也被计入那 22 条落回）→ **① ∪ ② = 22 条**，分解 = **1 布尔 ＋ 9 非 html 非布尔的落回 ＋ 12 html = 22**（③ ⊂ ②，`① ∪ ② ∪ ③` 仍是 22，**不是 23**）。**#227 施工时按 22 条去清，不要按 35 条、也不要按 23 条找。**

**76 条全表（`#` | 场景 id | `name` | 目标 `label` | 缺陷标记）**——`value` 全为 `''`、`required` 全为 `false`、`hint` = 老 `dimensions` 值原文逐字（照 `memo_render.py:565`，yaml 行号可查）：

| # | 场景 id | name | label | 缺陷 |
|---|---|---|---|---|
| 1 | `memo_add_basic` | `category` | 分类 | |
| 2 | `memo_add_basic` | `sub_category` | 子分类 | |
| 3 | `memo_add_basic` | `media` | 附件 | |
| 4 | `memo_add_basic` | `due` | 排期日期 | |
| 5 | `memo_update_basic` | `id` | 笔记 ID | |
| 6 | `memo_update_basic` | `content` | 内容 | |
| 7 | `memo_update_basic` | `category` | 分类 | |
| 8 | `memo_update_basic` | `sub_category` | 子分类 | |
| 9 | `memo_delete_basic` | `id` | 笔记 ID | |
| 10 | `memo_delete_basic` | `with_reminders` | 级联删除提醒 | |
| 11 | `memo_delete_basic` | `true`（解析成布尔 `True`） | `跳过二次确认`（现落回布尔） | **①布尔脏数据 ＋ ②回落** |
| 12 | `memo_change_category_single` | `id` | 笔记 ID | |
| 13 | `memo_change_category_single` | `category` | 分类 | |
| 14 | `memo_change_category_single` | `bulk_indicator` | 批量判定 | |
| 15 | `memo_change_subcategory` | `id` | 笔记 ID | |
| 16 | `memo_change_subcategory` | `sub_category` | 子分类 | |
| 17 | `memo_search_keyword` | `keyword` | 关键词 | |
| 18 | `memo_search_keyword` | `category` | 分类 | |
| 19 | `memo_search_keyword` | `sub_category` | 子分类 | |
| 20 | `memo_search_keyword` | `due` | 排期日期 | |
| 21 | `memo_search_keyword` | `html` | `生成结果页开关`（现落回 `html`） | **②回落 ＋ ③HTML 开关（剔除）** |
| 22 | `memo_search_alias` | `keyword` | 关键词 | |
| 23 | `memo_get_detail` | `id` | 笔记 ID | |
| 24 | `memo_get_detail` | `html` | `生成详情页开关`（现落回 `html`） | **②＋③（剔除）** |
| 25 | `memo_search_by_date` | `start` | `开始日期`（现落回 `start`） | **②回落** |
| 26 | `memo_search_by_date` | `end` | `结束日期`（现落回 `end`） | **②回落** |
| 27 | `memo_search_by_date` | `category` | 分类 | |
| 28 | `memo_search_by_date` | `html` | 落回 `html` | **②＋③（剔除）** |
| 29 | `memo_search_wish` | `keyword` | 关键词 | |
| 30 | `memo_search_wish` | `due` | 排期日期 | |
| 31 | `memo_search_wish` | `html` | 落回 `html` | **②＋③（剔除）** |
| 32 | `memo_search_checkin` | `keyword` | 关键词 | |
| 33 | `memo_search_checkin` | `html` | 落回 `html` | **②＋③（剔除）** |
| 34 | `memo_search_mood` | `keyword` | 关键词 | |
| 35 | `memo_search_mood` | `html` | 落回 `html` | **②＋③（剔除）** |
| 36 | `memo_remind_with_note` | `content` | 内容 | |
| 37 | `memo_remind_with_note` | `remind_at` | `提醒时间`（现落回 `remind_at`） | **②回落** |
| 38 | `memo_remind_with_note` | `repeat_type` | 重复类型 | |
| 39 | `memo_remind_with_note` | `repeat_rule` | `重复规则`（现落回 `repeat_rule`） | **②回落** |
| 40 | `memo_remind_existing` | `note_id` | 笔记 ID | |
| 41 | `memo_remind_existing` | `remind_at` | `提醒时间`（现落回） | **②回落** |
| 42 | `memo_remind_existing` | `content` | 内容 | |
| 43 | `memo_remind_existing` | `repeat_type` | 重复类型 | |
| 44 | `memo_remind_existing` | `repeat_rule` | `重复规则`（现落回） | **②回落** |
| 45 | `memo_reminders_active` | `status` | `提醒状态`（现落回 `status`） | **②回落** |
| 46 | `memo_reminders_active` | `html` | 落回 `html` | **②＋③（剔除）** |
| 47 | `memo_completed_reminders` | `html` | 落回 `html` | **②＋③（剔除）** |
| 48 | `memo_complete_wish` | `ids` | 笔记 ID | |
| 49 | `memo_complete_wish` | `content` | 内容 | |
| 50 | `memo_complete_wish` | `html` | 落回 `html` | **②＋③（剔除）** |
| 51 | `memo_wish_schedule` | `ids` | 笔记 ID | |
| 52 | `memo_wish_schedule` | `due` | 排期日期 | |
| 53 | `memo_wish_schedule` | `html` | 落回 `html` | **②＋③（剔除）** |
| 54 | `memo_batch_change_category` | `from_category` | 原分类 | |
| 55 | `memo_batch_change_category` | `to_category` | 目标分类 | |
| 56 | `memo_batch_change_category` | `bulk_indicator` | 批量判定 | |
| 57 | `memo_batch_change_category` | `html` | 落回 `html` | **②＋③（剔除）** |
| 58 | `memo_sync_feishu` | `html` | 落回 `html` | **②＋③（剔除）** |
| 59 | `memo_add_wish` | `content` | 内容 | |
| 60 | `memo_add_wish` | `sub_category` | 子分类 | |
| 61 | `memo_add_wish` | `due` | 排期日期 | |
| 62 | `memo_add_wish` | `tasklist_guid` | `飞书任务清单`（现落回 `tasklist_guid`） | **②回落** |
| 63 | `memo_delete_wish` | `id` | 笔记 ID | |
| 64 | `memo_update_wish` | `id` | 笔记 ID | |
| 65 | `memo_update_wish` | `content` | 内容 | |
| 66 | `memo_add_checkin` | `content` | 内容 | |
| 67 | `memo_add_checkin` | `sub_category` | 子分类 | |
| 68 | `memo_add_checkin` | `reminder_id` | `关联提醒`（现落回 `reminder_id`） | **②回落** |
| 69 | `memo_delete_checkin` | `id` | 笔记 ID | |
| 70 | `memo_update_checkin` | `id` | 笔记 ID | |
| 71 | `memo_update_checkin` | `content` | 内容 | |
| 72 | `memo_add_mood` | `content` | 内容 | |
| 73 | `memo_add_mood` | `sub_category` | 子分类 | |
| 74 | `memo_delete_mood` | `id` | 笔记 ID | |
| 75 | `memo_update_mood` | `id` | 笔记 ID | |
| 76 | `memo_update_mood` | `content` | 内容 | |

**自证断言**：`行数 = 76`；`涉及场景 = 29`（`memo_init_setup` 的 `dimensions: {}` → 空 → `editable_fields = None`，**不产生任何条目**）；`① = 1`；`② = 22`；`③ = 12`；`② 非 ③ = 10`。

**两处 `DIM_LABEL_MAP` 自身的旧账**（照抄会连带出错，建议 #227 顺手在生成器里修，**不动老仓**）：
- 表里是 `at`／`rule`，老 yaml 用的是 `remind_at`／`repeat_rule` → 4 条落回（#37/39/41/44）。
- 表里没有 `start`／`end`／`status`／`tasklist_guid`／`reminder_id`／`html` → 6 个键 15 条落回。

### A.9 `subgroups[].id`：老 0 起 → 新 1 起（**13 行完整对照表**）

- 老生成式：`memo_render.py:559` `f"{cat_key}_{len(g['subgroups'])}"` → **0 起**。
- 票 6 **V8=A**：「二级组 id **从 1 起**」；票 6 **U8=A**：「照老写『基础』，保持 13 个二级组」；记账实测通式 `<域id>_<序数>` 1 起（`gen-wake-assets.mjs:37` `subgroup: 'write_1'`）。

| # | 域 key | 老 id（0 起） | **新 id（1 起）** | `label` | 场景数 | 兜底? | 场景 id（组内序 = 书写序） |
|---|---|---|---|---|---|---|---|
| 1 | `memo` | `memo_0` | **`memo_1`** | 基础记录 | 3 | | `memo_add_basic` / `memo_update_basic` / `memo_delete_basic` |
| 2 | `memo` | `memo_1` | **`memo_2`** | 分类调整 | 3 | | `memo_change_category_single` / `memo_change_subcategory` / `memo_batch_change_category` |
| 3 | `search` | `search_0` | **`search_1`** | 基础查找 | 3 | | `memo_search_keyword` / `memo_search_alias` / `memo_get_detail` |
| 4 | `search` | `search_1` | **`search_2`** | 时间查找 | 1 | | `memo_search_by_date` |
| 5 | `search` | `search_2` | **`search_3`** | 分类查找 | 3 | | `memo_search_wish` / `memo_search_checkin` / `memo_search_mood` |
| 6 | `remind` | `remind_0` | **`remind_1`** | 创建提醒 | 2 | | `memo_remind_with_note` / `memo_remind_existing` |
| 7 | `remind` | `remind_1` | **`remind_2`** | 查看提醒 | 2 | | `memo_reminders_active` / `memo_completed_reminders` |
| 8 | `wish` | `wish_0` | **`wish_1`** | 心愿推进 | 2 | | `memo_complete_wish` / `memo_wish_schedule` |
| 9 | `wish` | `wish_1` | **`wish_2`** | 心愿管理 | 3 | | `memo_add_wish` / `memo_delete_wish` / `memo_update_wish` |
| 10 | `checkin` | `checkin_0` | **`checkin_1`** | **基础** | 3 | ✅ | `memo_add_checkin` / `memo_delete_checkin` / `memo_update_checkin` |
| 11 | `mood` | `mood_0` | **`mood_1`** | **基础** | 3 | ✅ | `memo_add_mood` / `memo_delete_mood` / `memo_update_mood` |
| 12 | `sync` | `sync_0` | **`sync_1`** | **基础** | 1 | ✅ | `memo_sync_feishu` |
| 13 | `init` | `init_0` | **`init_1`** | **基础** | 1 | ✅ | `memo_init_setup` |

**自证断言**：`二级组 = 13`；`兜底（label = 基础）= 4`；`场景合计 = 30`。

**4 处「分类下只有一个子功能 → 走『基础』兜底」全覆盖**：`checkin` / `mood` / `sync` / `init` —— 正好是 yaml 里 `subfunction` **缺省**的 8 条场景所属的 4 个域（`key counts: subfunction: 22` → 8 条无 `subfunction`，落成 4 个「基础」组）。落点：`memo_render.py:556` `sub_key = s.get("subfunction") or "基础"`。

**8 个域 id / 图标 / 名称**（`groups[]` 顶层，顺序 = `categories` 顺序，**不是**场景出现顺序）：`memo 📝 备忘类` / `search 🔍 查找类` / `remind ⏰ 提醒类` / `wish 🎯 心愿类` / `checkin ✅ 打卡类` / `mood 💭 情绪类` / `sync 🔄 同步类` / `init 🚀 初始化类`。

---

## 3. B 事实源清单与优先级

**结论：老侧是四合一（不是两处）**，优先级 = yaml（内容主体）＞ memo_render 转换层（形状）＞ SKILL.md 三张表（别名 ＋ 判定）＞ memo_cli 子命令表（补漏）。

### B.1 `D:\2Study\StudyNotes\SKILLS\备忘录\references\scenarios.yaml`（26 145 B，**560 行**）

| 行段 | 内容 | **此处独有、别处没有的信息** |
|---|---|---|
| `:1-22` | 头注契约 | `#31 Q1`（别名只在 SKILL.md 匹配层）／`#31 Q3`（subfunction 空 = 基础兜底）／`#31 Q4`（**无 order 字段，组内序 = 书写序**）／`:16` 逐字「30 个场景 = 29 个唯一唤醒词(28 业务 + 首次使用;备忘改分类 单条+批量 共用)」／`:19` 复制契约／`:20` DB fallback |
| `:26-50` | `categories` 8 条 | id／中文名／**icon**（`groups[].icon` 唯一来源；SKILL.md 没有图标定义） |
| `:51-560` | `scenarios` 30 条 | **`prompt` 30 条全文**（skeleton 里没有）／**`dimensions` 76 条原文**（skeleton 只有 `n_dims` 计数）／`category`＋`subfunction`（分组的唯一来源）／`status`／`result`（不进页面）／`dependencies` **仅 `:540-554` 一条**（`memo_init_setup`） |

### B.2 `D:\2Study\StudyNotes\SKILLS\备忘录\SKILL.md`（73 013 B，**1174 行**）

| 行段（实测） | 内容 | **独有信息** |
|---|---|---|
| `:147-172`（数据行 **15**） | 用户原话 → 唤醒词 反向指引表 | **42 条口语样例**（逐行 `3,3,2,2,2,2,3,3,3,3,3,3,2,3,5`）＋ 每行的 **CLI 命令列**（`add`／`search`／`wish-complete 或 complete-wish`／`add + remind 或 remind`…）＋ 反查步骤 `:174-178`。行 10 唤醒词格写「记提醒 / 设提醒」（一词两场景的对照写法） |
| `:226-266`（编号行 **1-29** 全部带判定；＋ 1 条**未编号**行 `:265`） | 唤醒词 → HTML 生成对照表（`:226-294`） | **每场景的 HTML 判定 ＋ 模板文件名＋命令原文**；**编号行 1–29 = ✅11 ／ 🟡2 ／ ❌16（= 29）**（✅ 行号 = `2,3,6,7,12,13,17,21,25,28,29`；🟡 = `26,27`）；另 `:265` 未编号行「备忘改分类(批量)」🟡 → 含它则 🟡 有 **3 个行位**、全表 **30 个判定行位**；**`:268-275` 统计表**；`:290-292` 防文档裂缝守护（`tests/test_html_trigger_coverage.py`）。**此表没有「首次使用」行**（＝票 2 说的「第三类」）。⚠️ **统计表自己算错两处**：`:270-275` 写 `✅10 ／ 🟡4 ／ ❌15 ／ 合计29`，而 ① `:272` 的 **✅ 清单漏了 `:264`「备忘录同步」#28**（✅ 实为 **11**）、② **❌ 清单实际列了 16 个词**（`:274`）、③ 🟡 只有 2 个编号行位。**正确值＝编号行 `11+2+16 = 29` ✓**，含未编号批量行则 30 行位。 |
| `:300`（1 行，超长） | 唤醒词总表 | **`完成打卡`／`初始化`／`新手` 三个别名的唯一出处**（yaml 里 0 次）；`:302-305` 分类子唤醒词清单（写作 `记情绪/删情绪/改情绪/查情绪`，与 `:479/:525/:536/:547/:563` 的 `…情绪日记` 写法**并行存在**） |
| `:477-563`（章节段） | 功能与唤醒词 | 正文口径的**子唤醒词新写法**（`记情绪日记` `:479`、`查情绪日记` `:525/:536/:540`、`改情绪日记` `:547`、`删情绪日记` `:563`）；`:524` 逐字「唤醒词:搜备忘、查备忘(别名)」（＝C.2 的矛盾源）；`:638-656` **「备忘改分类」一词两命令的消歧规则**（原话含「都/全部/多个 ID」→ 批量；唯一出处）；`:732` 「唤醒词:备忘改分类(批量场景…)」 |
| `:1082-1095`（8 行表，**9 条短语**） | HELP 唤醒词灵活匹配 | **HELP 自身 9 条触发短语 ＋ 判定三原则**（`manual` 与 `guide` **同格**，故 9 条不是 8 条）；`:1102-1105` 反例；`:1141` 「不展示 HELP 唤醒词自身」 |
| `:1076-1174`（99 行） | HELP 分支全文 | `:1113-1116` 行为四步（读 yaml → 转换层 → 时间戳副本路径 `memo_html\备忘录_HELP_<YYYYMMDD>_<HHMMSS>.html` → 覆盖 skill 根）；`:1118-1133` 场景资产契约 11 字段表；`:1135-1141` HELP HTML 必须 5 条；`:1153-1160` CLI 契约（**无 `--html` flag**） |
| `:81-146` | HTML 交付规范 ＋ checklist | 交付协议（`<media>` ＋ 浏览器并行） |
| 全文件 | — | **`首次使用`（Init）在两张表里都缺席**：`SKILL.md` 里它只出现在 `:300`、`:322-441` 行为规范段、`:312` 安装 prompt；**两张对照表 0 行** → 只按两表建别名/资产表必漏它 |

### B.3 `D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_cli.py`（78 635 B，**1816 行**）

- `:1541` `sub = parser.add_subparsers(dest="command")`；`:1544-1694` **21 条 `add_parser`**；`:1696+` dispatch。
- **21 条完整清单（实测行号）**：`add:1544`／`search:1553`／`update:1562`／`delete:1571`／`complete-wish:1579`／`get:1587`／`search-date:1592`／`update-category:1600`／`update-sub-category:1605`／`set-due:1610`／`wish-batch-plan:1615`／`wish-complete:1622`／`batch-update-category:1635`／`sync-from-feishu:1641`／`remind:1645`／`due:1653`／`dismiss:1657`／`reminders:1661`／`completed:1666`／`init-report:1673`／`help:1687`。
- **独有信息（别处没有）**：
  - **两张表里都没有的子命令 = 3 条**（我实测，**比票面说的 2 条多一条**）：`due`（`:1653`）、**`dismiss`（`:1657`）**、`init-report`（`:1673`）。票面只点了 `due`／`init-report`。
  - `dismiss` 在老 SKILL.md 里**只有一行**（`:839-840`「### 废弃提醒 / 命令:`script/memo_cli.py dismiss <id>`」），**无唤醒词、无场景卡、不在两张表**。
  - `complete-wish`（`:1579`）与 `wish-complete`（`:1622`）是**两条不同子命令**（前者原子执行，后者生成向导）——SKILL.md `:165` 写「`wish-complete` 或 `complete-wish`」，容易被误当同一条。
  - 老 21 条里**没有 `remove`**（票 14 已证）；「删 X」是独立 `delete`。
  - `:1575` `p_del.add_argument("-y","--yes",...)`（＝`dimensions` 里那个布尔脏键的真实开关；原稿误写 `:117`，那是空行）。

**两表覆盖度自证**：21 条子命令中，出现在 `:147-172` 的有 **16** 条，出现在 `:226-292` 的有 **16** 条，并集 **18** 条，**3 条不在任一张表**。

### B.4 `D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py`（26 984 B，**661 行**）

| 行段 | 内容 | **独有信息** |
|---|---|---|
| `:40-46` | `COMMAND_CN_MAP` | 5 条查询命令 → 中文名（**不进 HELP**，是查询页信封用） |
| `:49-69` | `DIM_LABEL_MAP`（19 键） | **`editable_fields[].label` 的唯一来源**（票 3 说 `help-template.html:1669` 认这个字段，但**中文名表只在这里**） |
| `:527-599` | `_scenarios_to_contract_data()` | **目标形状的权威转换定义**（见 A.0）；`:531-536` 逐字映射注释；`:556` 基础兜底；`:559` 二级组 id 生成式；`:562-567` editable_fields；`:569-581` scene 组装；`:576` types 拆分；`:583-589` 头信息（`skill_name:'备忘录'`／`title:'使用手册'`／`subtitle`／`version:1.3.0`）；`:591` `init_banner`；`:592-597` `contact` 两项（无 url） |
| `:602-661` | `render_help()` | 3 副本机制（时间戳副本 ＋ 覆盖 `<SKILL_DIR>\备忘录.html` ＋ `--output` 追加）；`:606` 时间戳路径形态 |

### B.5 仓内既有参照物（**读，不改**）

- 形状：`packages/skill-bill/src/triggers/wake-assets.ts:28-53`（3 接口 ＋ `WAKE_GROUPS` ＋ `WAKE_ASSETS`／`SCENE_BY_ID`／`WAKE_ASSET_TOTAL`／`HELP_WAKE_WORDS` 派生）。
- 生成器：`packages/skill-bill/scripts/gen-wake-assets.mjs:29-30`（`EXPECT` fail-closed）／`:99-118`（`assertShape`）／`:120-130`（新增条目挂位）／`:10`（`--check`）。
- 模板消费：`packages/base-render/assets/help-template.html:1660-1673`（`normalizeScenes`）／`:1698-1709`（`TYPE_DEFAULT` 10 词）／`:1746+`（参数机制）。
- 出口：`renderHelpShellHtml`（`base-paint/help-shell`）＝ `packages/base-render/src/spec/help.ts:240` `HELP_SHELL_ID = 'ilife-help-shell'`；`packages/skill-bill/src/render/helpFile.ts:152` 是调用范例。
- **`packages/skill-memo-ilife/` 现无 `src/triggers/**`**（记账有、备忘录没有）→ #227 是**从零建**，不是改造。

### B.6 ⚠️ 硬边界：`SCENE_DATA_SCHEMA` 是"唯一机读权威"，**没有 `aliases` 位**

`packages/base-render/src/spec/help.ts`（281 行）逐字声明 `:9`：「AC-4：`SCENE_DATA_SCHEMA` 是**唯一机读权威**」。该 schema **三层全部 `additionalProperties: false`**（`:111`／`:130`／`:140`／`:152`），即**多一个键就校验失败**：

| 层 | 行号 | 允许键（闭集） | `required` |
|---|---|---|---|
| 顶层 | `:113-237`（闭集到 `:238`） | **9 个键**：`skill_name`(`:114`) / `title`(`:115`) / `subtitle`(`:116`) / **`meta_blocks`(`:117-125`)** / `groups`(`:126-197`) / `init_banner`(`:198-209`) / `contact`(`:210-226`) / `version`(`:227`) / **`recommendations`(`:228-236`)** | `['skill_name','title','groups']` |
| `groups[]` | `:130-134` | `id` / `icon` / `label` / `subgroups` | `['id','label','subgroups']` |
| `subgroups[]` | `:140-149` | `id` / `label` / `scenes`（`minItems: 1`） | `['id','label','scenes']` |
| **`scenes[]`** | **`:152-190`** | **`id` / `title` / `wake_word` / `types` / `status` / `prompt_template` / `editable_fields`（共 7 个）** | `['id','title','wake_word','status','prompt_template']` |
| `editable_fields[]` | `:174-188` | `name` / `label` / `value` / `hint` / `required` | `['name','label','value']` |

**由此得到三条硬约束（票面没写，但机器会拒收）：**

1. **`aliases` 在渲染载荷里无处可放**——票面「一场景一唤醒词、别名进 `aliases`」的 `aliases` **不是 `SCENE_DATA_SCHEMA` 的字段**。它只能落在**资产侧**（`WAKE_GROUPS` 的 TS 接口加字段 → 但 `WAKE_GROUPS` 要直接当 `HELP_GROUPS` 传进模板，多一个键就 schema 校验失败）**或**另建一张旁表（照 `skill-schedule` 的 `HELP_SCENE_RESULTS`／`HELP_GROUP_NOTES` 伴随表形，`gen-help-assets.mjs` 文件头有说明）。**#227 必须先决定这个落点，否则「逐字搬 ＋ 别名单」会被 schema 挡死。**
2. **`status` 只许 `''` 或 `'【待开发】'`**（`:172` `enum`）—— 与老数据 30/30 空串一致，**没有第三种可能**；也再次印证"不标缺失"以外的值写不进去。
3. **`editable_fields[].name` 与 `label` 必须是 `string`**（`:181-182`）→ A.8 那条布尔脏数据（`name = True`、`label = True`）**过不了校验**。清洗不是"整洁偏好"，是**硬门**。

**校验在哪执行（复审补证）**：`packages/base-render/src/help.ts:338-362` 的 `validateSceneData()` **校验整个 payload**，次序恒为 `duplicate-id`（`:343`，**只查场景 `id` 唯一**，不查 `wake_word` 唯一）→ `status-invalid` → `types-invalid` → **`schema-invalid`（`:358` `firstViolation(SCENE_DATA_SCHEMA, data, '')`）**，首个命中即抛。
> 推论（修正 C.1 的措辞）：**重复的 `wake_word` 能过 schema**（schema 不管它），但会破坏「唤醒词 → 场景」反查与资产侧双向对账测试；而重复的 `id` 会被 `duplicate-id` 直接拒收。

#### B.6.3 复核期另发现的两处 schema／实现不一致（复审未提，我实测补入）

1. **`contact.items[]` 是 `{label, value}` 闭集**（`:218-222`：`additionalProperties:false`，`required:['label','value']`，`properties` 只有这两个）→ **票 6 V6=B「补 `url` 字段使其可点」在现 schema 下加不进去**。可行路径只有两条：把链接塞进 `value`（string，模板会 `esc` 后当文本显示）或走 schema 改动。（`contact.copy_all` 是 string，`contact` 本身还有这个可选位。）
2. **`init_banner.steps` 三方不一致**：
   - schema `:207`：`steps: { type:'array', items:{ type:'string' } }` → **要字符串数组**；
   - 模板 `help-template.html:1778`：`INIT_BANNER.steps.map(st => … esc(st.title) … (st.desc ? …))` → **要对象数组 `{title, desc}`**；
   - 老 `memo_render.py:516-523` 实际传的就是对象数组 → **与模板一致、与 schema 冲突**（会被 `:358` 判 `schema-invalid`）。
   ⇒ 这不是 #227 能自己定的事（属出口票 #8 的面），但 **#227 若被要求落 `init_banner`，必须知道它今天过不了校验**，别原样搬。

### B.7 姊妹先例：`skill-schedule` 已落地同类资产（**两处别照抄**）

`packages/skill-schedule/src/help/scenes/help-assets.ts`（73 750 B）＋ `packages/skill-schedule/scripts/gen-help-assets.mjs` 是比记账更近的先例（同为"老 HELP 场景 → groups/subgroups/scenes ＋ `editable_fields`"）：

- 配置：`:47-50` 契约闭集 `CONTRACT_GROUP_KEYS = ['id','icon','label','subgroups']`／`CONTRACT_SUBGROUP_KEYS = ['id','label','scenes']`／**`CONTRACT_SCENE_KEYS = ['id','title','wake_word','status','prompt_template','editable_fields']`**／`CONTRACT_FIELD_KEYS = ['name','label','value','hint','required']`——**与 B.6 的 schema 逐字一致**，可当 #227 的直接模板。
- 命名：产物在 **`src/help/scenes/help-assets.ts`**（不叫 `wake-assets.ts`）；生成器叫 `gen-help-assets.mjs`，带 `--check`（`:12`）。
- 事实源放 `.scratch/`（工作副本，不入库，`:15`）→ #227 的事实源在仓外（老技能目录），仓内不落第二份 payload 副本，同理。
- ⚠️ **别照抄之一**：schedule 生成器**有意不落 `types`**（源数据无类型位，凭空补＝自造内容，`:59` 附近文件头长注）。**备忘录相反——老 `type` 字段存在且票面点名要 `types`，必须落。**
- ⚠️ **别照抄之二**：schedule 有 `NO_COMMAND_WAKE_WORDS`（`:59`）并**主动标 `【待开发】`**（共 11 条）。**备忘录票 6 U1/U2/U3=A 明裁"不标缺失"→ #227 不许有这个常量、不许标。**
- ⚠️ 另一条纪律差：schedule 生成器**有 import 守卫**（被 `import` 时不执行生成，文件头 `:4-9` 明写「`skill-bill/scripts/gen-wake-assets.mjs` 与本包 `build-help.mjs` 那两份都没有这层守卫（被 import 即执行），别照抄」）→ #227 走哪一份就照哪一份的守卫口径，别混。

---

## 4. C 「一场景一唤醒词」冲突排查

### C.1 唯一真冲突：`备忘改分类` 一词对两场景

- yaml `:105` `memo_change_category_single` 的 `wake_word: 备忘改分类`；yaml `:361` `memo_batch_change_category` 的 `wake_word: 备忘改分类`。实测：`{'备忘改分类': ['memo_change_category_single', 'memo_batch_change_category']}`。
- 老侧靠 **`SKILL.md:638-656` 的消歧规则**（原话含「都／全部／多个 ID」→ 批量）扛；老 `yaml:16` 逐字承认「备忘改分类 单条+批量 共用」。
- 票 6 **U3=A** 只裁了「**不额外标记无唤醒词**」（不许写缺失标记），**没有裁这个词在资产里落到哪一条**。
- skeleton 也把它标成 `landing: none` 的两条（`keys: []`，`route.kind: no_route`）。
- **风险**：#227 若照 yaml 逐字搬，资产里 `wake_word` 会出现重复值 → 「唤醒词 → 场景」反查一对二；照账单型测试（`skill-bill/test/wake-assets.test.mjs` 那类双向对账）必红。**注意边界**：这条**不会被 schema 拦**——`SCENE_DATA_SCHEMA` 只查场景 `id` 唯一（`base-render/src/help.ts:343` `duplicate-id`），**不查 `wake_word` 唯一**（见 B.6 补证）→ 它会**静默通过校验**，只在唤醒词反查与对账测试上暴露。
- **建议口径（我的建议，非裁决）**：单条场景保留主词 `备忘改分类`；批量场景主词改用新表词 `批量改分类`，并把 `备忘改分类` 放进它的 `aliases`。这样两场景都有一词、`aliases` 里也没有跨场景撞词（已实测，见 C.4）。**落地前需票 6/票 8 追认，见 F.2。**

### C.2 `查备忘`：老文档与老 yaml 自相矛盾（**不是冲突，是需要选边**）

- yaml `:158-160` 给了它**独立场景卡** `memo_search_alias`（`scenario_title: 搜备忘的别名(同义触发)`）。
- `SKILL.md:239` 写「查备忘(搜备忘别名)」、`:524` 写「唤醒词:搜备忘、查备忘(别名)」。
- **两边都承认它是别名，但 yaml 又给了它一张卡** → 资产必须以 yaml 为准（卡留着、`wake_word` 就是 `查备忘`，**不列进 `aliases`**），否则这张卡会变成没有 `wake_word` 的空卡。老转换层 `memo_render.py:572` 也是这么做的（直取 `wake_word`）。

### C.3 4 条情绪孪生的存活形态（票 2 的提醒）

- **老骨架 30 条里，这 4 条各自占一行**（全部实测行号）：`memo_search_mood`（yaml:237，唤醒词 `查情绪`）／`memo_add_mood`（:496，`记情绪`）／`memo_delete_mood`（:510，`删情绪`）／`memo_update_mood`（:523，`改情绪`）。
- **这不违反 U4**：U4 针对的是**新表的 4 条新词**（`记情绪日记`／`查情绪日记`／`改情绪日记`／`删情绪日记`，skeleton `new_table` 的 `landing: no_old_scene`），它们**不许各占一行新场景**，而应成为老 4 行的 `aliases`。票 2 自己在 `t222-content-reconcile.md:169-171` 逐字写明：「入库时这 4 条要和老场景合并成一条（一场景一唤醒词，别名进 aliases），不能各占一行」。
- 所以资产仍应是 **30 条场景**，不是 34 条。

### C.4 加别名后的全量冲突枚举（**机器实测**）

- 一个场景对多词：**11 个场景**（4 条情绪 ＋ 2 条 init ＋ 2 条 add_basic ＋ batch ＋ subcategory ＋ reminders），最多 3 词（`memo_add_basic`：`记备忘` ＋ `记一条` ＋ `添加笔记`）。
- 一个词对多场景：**只有 `备忘改分类` 1 处**（C.1）。
- 别名与「别场景的 `wake_word`」重名：**0 处**。
- 别名与「本场景的 `wake_word`」重名：**0 处**。
- 主词 ＋ 别名的全量**子串包含对 = 6 对**：`删情绪 ⊂ 删情绪日记`／`改子分类 ⊂ 备忘改子分类`／`改情绪 ⊂ 改情绪日记`／`查情绪 ⊂ 查情绪日记`／`记情绪 ⊂ 记情绪日记`／**`搜备忘 ⊂ 按时间搜备忘`**。
- 其中**跨场景的只有 1 对**：`搜备忘 ⊂ 按时间搜备忘`（＝票 2 的 `old_ambiguous_routes = 1`）。其余 5 对同场景，无害但要求做**最长匹配**。

**所以：只要 C.1 那一个词钉死归属，加别名后跨场景零冲突。**

---

## 5. D `t222-content-reconcile.md` 对账表可行性

**文件事实**：`D:\ilife\docs\skills\skill-memo-ilife\t222-content-reconcile.md`，93 976 B，**2683 行**。

### D.1 对账表的行号范围（实测）

| 区段 | 行号 | 表格行数 | 内容 |
|---|---|---|---|
| §2.1 老 30 → 新表（18 逐字命中） | **`:100-125`**（表体 `:102-121`，18 数据行；`:123-125` 歧义注） | 18 | 老场景 id／行／老域／二级组／老唤醒词／新表短语／新 key／shape／老 CLI |
| §2.2 老 30 → 新表（12 无落点） | **`:127-149`**（表体 `:132-145`，12 数据行） | 12 | 每条给「新表出路」＋「裁定归属」 |
| §2.3 新表 28 → 老骨架（10 条老没有的） | **`:151-174`**（表体 `:153-164`，10 数据行；`:166-171` 拆「真新增 6／改名孪生 4」） | 10 | 老骨架有没有／归属挂哪个老场景 |
| §2.4 反向缺口 | `:176-183`（散文） | — | `memo.stats` 老骨架 0 内容 |
| §3.1 逐级计数 | **`:189-201`**（表体 `:191-201`，8 域 ＋ 合计行） | 8+1 | 域／中文名／二级组数／场景数／逐字命中／无落点／新表 key |
| §3.1 13 个二级组 | **`:203-223`**（表体 `:205-219`，13 行；`:221-223` 兜底说明） | 13 | 含 4 处基础兜底 |
| §4A 域级归属 | `:229-243`（表体 `:234-243`，8 行） | 8 | 老 8 域 ↔ 新 4 顶层 ＋ 10 命令 |
| §4B 10 命令归属 | `:245-261`（表体 `:247-258`，10 行） | 10 | 命令／中文名／shape／老承接数 |
| §4C 中英名对照 | `:263-294`（表体 `:268-274` ＋ `:278-289`） | — | 三层名 ＋ 10 命令中文名 |
| §5 U 清单 | `:298-314` | — | 要用户拍板项（**已被票 6 全部关掉**） |
| §6 边界 | `:315-332` | — | 明列「没读透」 |
| 附录 A 脚本/自查 | `:333-388`（数字溯源表 `:364-381`，自查 `:383-388`） | — | 每个数对应哪条命令 |
| **附录 B 机器可读骨架** | **`:392-2683`**（2292 行 JSON，与 `t222-skeleton.json` 宣称逐字相同） | — | 大段副本 |

**汇总断言**：对账三张核心表 = **`:100-174`**（40 数据行 ＝ 18 ＋ 12 ＋ 10）；计数与分组表 = **`:189-223`**（8+1 ＋ 13 行）；归属表 = **`:229-294`**。合起来 **`:100-294`**（195 行）是"对账表"的整体范围。

配套机器证据：`docs\skills\skill-memo-ilife\t222-evidence\`（6 个文件：`extract-full.txt` 21 085 B／`join.txt`／`lines.txt`／`names.txt` 18 938 B／`routes.txt` 10 147 B／`skeleton.json` 57 989 B，与 `t222-skeleton.json` 同尺寸）。

### D.2 能不能直接当「双向对齐」校验基准？**一半能，一半不能**

**能（可直接当基准）**：
- 「老 30 → 新表」与「新表 28 → 老」两个方向的方向性对账，`:100-174` **已经做完**（18／12／10 三个数 ＋ 每条归属），票 8 的「与票 2 对账表双向对齐」可以逐行核。
- 计数基准：8 域／13 二级组／30 场景／29 唯一唤醒词／4 处兜底／76 dims／12 无落点／18 逐字命中 —— 全部在 `:189-223` 与 skeleton `counts` 里，可机器断言（skeleton `counts` 有 27 个键）。

**不能（缺什么，逐条）**：
1. **不比对「仓内资产」**——资产还不存在，`:100-174` 比的是「老骨架 ↔ 新表（28 个唤醒词）」。资产建成后需要**第三个方向**：`资产 ↔ 老 yaml`（30 条逐字：条数／名称／顺序）＋ `资产 ↔ 新表`（`WAKE_TABLE` 28 条）。票 2 的表**给不出资产侧的任何一行**。
2. **非机器可读**——`:100-174` 与 `:189-294` 全是 Markdown 表格 ＋ 散文；`t222-evidence/*.txt` 是自由文本；唯一机器可读的 `skeleton.json` **形状是 `domains/subs/scenes`，不是目标资产形状**，且**不含 `prompt`／`editable_fields`／`aliases`／二级组 id**。
3. **#227 要落的四样东西，票 2 表里没有对应列**：① `prompt_template` 去命令化后的**文本**（无列）② `editable_fields` 76 条明细（票 2 只给了 `n_dims` 计数 ＋ 票 3 给了三类缺陷的**数量**，没有条目清单）③ `aliases` 清单（票 2 只给 `old_aliases_not_in_yaml` 4 行原始 `raw` 字符串）④ 13 个二级组 id（票 2 有 `sub_cn` 名字，**没有 id**）。
4. **一处已被票 6 改动**：`:138` 把「票 6 裁」的 `备忘改分类` 归属留成空白；票 6 U3=A 也没补上（见 C.1／F.2）→ 这张表有一格是空的，双向对齐会在那一行卡住。
5. **一处口径已过时**：`:171` 的「改名对清单（脚本 N 行）」把 `备忘改子分类→改子分类` 算进"改名孪生"，票 6 U4=A 的口径是**老词为主名、新词进 aliases** → 方向与该行相反，引用时要反过来读。

**结论**：`t222-content-reconcile.md:100-174` ＋ `:189-223` 可以当「与票 2 对账表双向对齐」的**核对清单**；但 #227 **必须自己新造机器可核的资产侧检查**（照 `gen-wake-assets.mjs:99-118` 的 `assertShape` ＋ 双向对账测试），不能指望票 2 这份文档现成跑绿。

---

## 6. E 给 #227 的施工要点（一条条可执行）

1. **形状认 `memo_render.py:527-599`，不认 skeleton。** 目标字段逐字：`id/title/wake_word/status/prompt_template/types`（`+ editable_fields`，票 6 V7=A）。skeleton 只当"老侧事实"的二手校验，别当原料。
2. **`wake_word` 取 yaml 标量**，不要包数组（skeleton 的 `wake[]` 是外壳）。票面「一场景一唤醒词」与老源一致。
3. **`type` 必须按 `+` 拆成 `types` 数组**，用 `split('+')` ＋ `strip` ＋ 去空。**实测分布：30 场景 = 26 条两原子 ＋ 4 条三原子**（三原子 = `memo_complete_wish`／`memo_wish_schedule`／`memo_batch_change_category`／`memo_init_setup`）；照 A.6 全表逐行对。断言：原子计数 `{回执:30, 采集:20, 查看:10, 向导:4}`。
4. **二级组 id 用 1 起**（票 6 V8=A），照 A.9 的 13 行表；**不要**照抄 `memo_render.py:559` 的 0 起生成式。生成器里写死 `EXPECT = {groups: 8, subgroups: 13, scenes: 30, uniqueWakeWords: 29}` 做 fail-closed（照 `gen-wake-assets.mjs:30`）。
5. **二级组按 `label` 认身份、按书写序定组内序**（`memo_render.py:557`）。**别按场景出现顺序重建组**：`memo_batch_change_category` 在 yaml 是第 19 条（`:361`），但它落在第 2 个二级组「分类调整」的**末尾**。`categories` 顺序 = `groups[]` 顺序（`memo_render.py:544`），**不是**场景出现顺序。
6. **`prompt_template` 逐字搬 `prompt`，然后按 A.5.1 的 8 条改**（这是唯一的"不逐字"例外，用户 U6 立规）；改完在资产文件头逐条列出改了哪 8 条（照 `wake-assets.ts:14-17` 的"非纯搬运"声明格式）。
7. **`prompt_template` 里 `result`／`dependencies` 不进**（`memo_render.py:535` 明写）。别把 `result` 里的 `搜备忘 -c 心愿` 之类漏进来——`result` 不是页面内容。
8. **`aliases` 12 条照 A.7 落**；**HELP 自身 9 条短语一律不进**（V1=A）；**`查备忘` 不进 `aliases`**（它有自己的场景卡，C.2）。
9. **`editable_fields` 按 76 条落，但先清洗 22 条**（**1 布尔 ＋ 9 非 html 非布尔的落回 ＋ 12 html = 22**；注意 **① ⊂ ②**：布尔行的键 `True` 也不在 `DIM_LABEL_MAP` 里，**它同时属于两类，别重复计数、别按 35 条或 23 条找**）。清洗后条数 = `76 − 12（html 剔除）= 64`；其中 `memo_delete_basic` 的布尔条改成字符串键＋中文名，**另 9 条**落回补中文名（`remind_at`×2／`repeat_rule`×2／`start`／`end`／`status`／`tasklist_guid`／`reminder_id`）。**落完断言**：`涉及场景 = 29`（`memo_init_setup` 无字段）；`name` 与 `label` 全部是字符串（B.6 硬门）。
10. **顺手修 `DIM_LABEL_MAP` 的两处旧账**：`at→remind_at`、`rule→repeat_rule`；补 `start/end/status/tasklist_guid/reminder_id`。**在生成器里修，不动老仓**。
11. **`备忘改分类` 的一词两场景必须先有口径**（C.1）：建议单条留主词、批量改主词为 `批量改分类` ＋ 把 `备忘改分类` 放进批量的 `aliases`。**在票 6/票 8 追认前不要默选一种**。
12. **不许新造 `【待开发】`**（票 6 U1/U2/U3=A）：老 30/30 `status` 空串，资产也全空串。别为「新表暂无唤醒词」写任何缺失标记。
13. **不许把 HELP 场景卡进目录**（V1=A）：老 30 条里本来就没有，资产也不许新加。
14. **`groups[].icon` 只来自 yaml `:26-50`**（SKILL.md 没有图标定义）；`groups[].label` = `categories[].name`，`subgroups[].label` = `subfunction`（缺省 `基础`）。目标接口里**二级组字段名是 `label` 不是 `title`／`name`**（`wake-assets.ts:41-45`）。
15. **文案头信息照票 6 裁**：`title = '使用手册'`（V2=A）、`version = '1.3.0'`（V3=A）、`contact` 补可点 `url`（V6=B）、初始化口径改「memo 库目录存在」（V4=A）、不要 `HELP_INITIALIZED` 逃生阀（V5=A）、`memo.stats` 不展（U5=A，只在口径区留一行）。
16. **交付对账要自造三份机器可核**：① 资产 ↔ 老 yaml（条数／名称／顺序逐字）② 资产 ↔ 新表 `WAKE_TABLE`（28 条，双向）③ 资产 ↔ `t222-content-reconcile.md:100-174` 逐行。照 `skill-bill/test/wake-assets.test.mjs` 的形。
17. **生成器 ＋ 产物都要入仓**，产物**禁手改**；`--check` 只比对不落盘；老侧事实源在仓外，CI 跑不了 `--check`（照 `gen-wake-assets.mjs:12-13` 的纪律）。
18. **老 `SKILL.md` 的统计表自己错两处**（复审订正）：`:270-275` 写 `✅10 ／ 🟡4 ／ ❌15 ／ 合计29`，实测**编号行 1–29 = ✅11 ／ 🟡2 ／ ❌16（= 29）**，含 `:265` 未编号批量行则 🟡 3 个行位。老表的 `✅10` **也错**（`:272` 清单漏了 `:264`「备忘录同步」#28），`❌15` 也错（`:274` 实际列 16 个词）——**两处都不能引用**。引用该表做「逐字对上」时**只信编号行的逐行判定，不信它的统计行**。
19. **先解决 `aliases` 的落点（B.6 硬门）。** `SCENE_DATA_SCHEMA` 三层全 `additionalProperties:false`，`scenes[]` 只有 7 个键、**没有 `aliases`**。选项：(a) 资产侧 TS 接口带 `aliases`，**出口层剥离后**再传 `groups`（照 `helpFile.ts:152` 只传 schema 认识的键）；(b) 另建伴随表（照 `skill-schedule` 的 `HELP_SCENE_RESULTS` 形）。**别把 `aliases` 直接塞进 `WAKE_GROUPS` 当 `HELP_GROUPS` 用——会校验失败。**
20. **`editable_fields` 清洗是硬门不是偏好**：`name`／`label` 必须 `string`（`help.ts:181-182`），布尔脏条**必然**校验失败；`status` 只许 `''`／`'【待开发】'`（`help.ts:172`）。
21. **命名与先例**：产物建议照 `skill-schedule` 走 `src/help/scenes/help-assets.ts` ＋ `scripts/gen-help-assets.mjs`（`--check` ＋ 闭集断言）；**但两处别照抄**——schedule **不落 `types`**（备忘录必须落）、schedule **主动标 `【待开发】`**（备忘录 U1/U2/U3=A **禁止**标）。见 B.7。
22. **老技能目录是仓外事实源**：照 `gen-wake-assets.mjs:12-13` 的口径，`--check` 只在事实源在盘的机器上可跑，CI 不跑；**仓内不落第二份 payload 副本**（单一事实源）。

---

## 7. F 查不到／不敢确定的（如实列，不猜）

1. **42 条口语样例（`SKILL.md:158-172`）进不进 `aliases`——票 6 没有裁。**
   我试过：读完 `t226-body.md` 全 16 条定案 ＋ `t226-resolution.md`，没有任何一条提到"口语样例"或"表 1"。U4 只裁了情绪族 5 词。
   我的判断（**不是裁决**）：样例是**句子**（`"帮我记一下:今天开了个会"`／`"搜一下 xxx"`／`"#15 是什么"`），进 `aliases` 会把别名表撑成句表且带占位符；老口径 `yaml:5` 明写别名在 SKILL.md 匹配层，建议**不进**，留在新 SKILL.md 的匹配层。
2. **`备忘改分类` 在资产里归哪一条场景——票 6 U3 的答案（A=不标缺失）没有覆盖归属。**
   我试过：`t226-body.md` U3 行（`:13` 提问 ＋ `:41` 定案「同 U2（不额外标记无唤醒词）」）、`t226-resolution.md` 全文、`t222-content-reconcile.md:138`（那一格写的就是「票 6 裁」而票 6 没补）。→ **这一格是空的**。我在 C.1／E.11 给了建议口径，但**需要追认**。
3. **`prompt` 里的 DB／实现细节词（`notes.due`／`note`／`task_guid`／`tasklist GUID`／`Cron`）要不要一起清——U6 只立了"命令不上页面"，没立"实现细节不上页面"。**
   我试过：`yaml:9` 的老契约**自己**写着「不暴露 CLI / **DB** / Python / 模板路径」，`SKILL.md:1128` 重复同一条 → 老契约**已经禁止**，只是老数据违反了自己的契约。判断：**应清**，但这属于"逐字搬 vs 守契约"的取舍，见 A.5.2 的 7 条清单，建议票 8 一并追认。
4. **`废弃提醒`（新表 28 之一）进不进资产——U6=A 只裁了「老 4 条『删 X』整体归 `memo.remove`」，没说这个词有没有场景卡。**
   我试过：`t226-body.md:17`（U6 提问）／`:44`（U6 定案）／`t222-content-reconcile.md:158`（那一格写「无承接场景……票 6 裁」）／`SKILL.md:839-840`（老侧只有一行命令、**无唤醒词**）。→ **老侧无内容、票 6 未裁**。若照 U5=A 的口径「老骨架没有的不展」，它应与 `memo.stats` 同处置（不展）；但 U5 只点了 `stats`，**我不敢替票 6 推及 `废弃提醒`**。
5. **`memo.stats` 的"口径区留一行"具体留什么、留在哪个字段——U5=A 只说了"不展"。**
   我试过：`t226-body.md:43`（U5 定案全文就那一句）。**资产接口里没有"口径区"字段**（`wake-assets.ts:30-53` 只有 id/title/wake_word/status/prompt_template/types ＋ 组三层）→ 无处可落。落法待定。
6. **`editable_fields` 的 `hint` 要不要保留／截断——票 6 V7=A 只说"按清洗后的 76 条落"，没说 `hint` 处置。**
   老 `hint = str(v)` 是 `dimensions` 值原文（含「必填,数字 ID,可多个」这类说明）。模板 `help-template.html:1670` 认 `hint`。我按"照老"记录在 A.8 里（hint 逐字 = yaml 值原文）；是否截断／是否展示，票面未裁。
7. **`skill_name`／`subtitle`／`init_banner`／`contact` 的落点字段名**：老 `memo_render.py:585-598` 的 payload 顶层还有 `skill_name/title/subtitle/version/init_banner/contact`。目标资产接口（`wake-assets.ts`）**只有 `WAKE_GROUPS`**，没有这 6 个顶层键——它们应落在**出口层**（`renderHelpShellHtml` 的 data）而非资产。**票 8（渲染/出口票）的活，本票只需知道不要塞进 `WAKE_GROUPS`。** 我未读 `base-paint/help-shell` 的完整 data 类型定义（超出本票范围）。
8. **`help_only` 9 条的处置（复审订正：原措辞「无源可派生」漏报了现成落点）**：
   - **落点存在**：`SCENE_DATA_SCHEMA` 顶层有 **`meta_blocks`（`help.ts:117-125`，item = `{id,title,html}`，required 三者全要）**，老实物 HELP 自己的唤醒词就是装在这里的——`packages/skill-bill/src/triggers/wake-assets.ts:980` 逐字：「HELP 自身的唤醒词（老实物 `meta_blocks.help_wake_words` 那一块；4 条，不进场景目录）」。记账是从口径层 `WAKE_TABLE` 派生（`wake-assets.ts:984-986`），不落第二份字面量。
   - **所以准确的说法是**：落点**合规且已被先例使用**，但**备忘录侧另有"无源可派生"的实情**——新备忘录 `WAKE_TABLE`（`wakewords.ts:13-37`，28 条）**没有 help 条目**，`filter(e => e.key === 'memo.help.lookup')` 派不出东西（该 key 在 `MemoKey` 联合类型 `:5-7` 里也不存在）。
   - **两条叠加 → 票 6 V1=A 已由用户裁定不传**「怎么喊我」那块 ⇒ **本票不落**。若日后要落，要么先给 `WAKE_TABLE` 补 help 条目再派生（记账路），要么往 `meta_blocks` 里写字面量（`{id,title,html}` 三键齐备）。**处置仍待票 8，但"无处可放"的说法是错的。**
9. **没跑的复现入口**：`docs/skills/skill-memo-ilife/t222-extract.mjs`（37 790 B）我**只读未跑**——它的 `evidence` 模式会写 `t222-evidence/`（`t222-content-reconcile.md:357` 明写"唯一会写文件的那条"）。本席是只读席位，故未执行；票 8 若要重跑，命令是 `node docs/skills/skill-memo-ilife/t222-extract.mjs`（无参＝全量到 stdout）。
10. **`aliases` 到底落在哪个字段名／哪一层——票面没说，schema 也不允许。**
    我试过：读 `packages/base-render/src/spec/help.ts:106-195` 全文（三层闭集）、`skill-bill/src/triggers/wake-assets.ts:28-53`（记账接口里**也没有 `aliases`**）、`skill-schedule` 的 `gen-help-assets.mjs:47-50`（契约闭集里**也没有**）。→ **全仓三个先例都没有 `aliases` 这个位**。票 6 U4=A 定了"新词进 `aliases`"这个**口径**，但**没定它住在哪**。B.6／E.19 给了两个候选落点，**需要裁决**。
11. **`types` 的 `Scene` 接口是否允许自定义配色对象——不影响本票，但顺带记**：`help.ts:158-171` 的 `types` 元素是 `oneOf[string, {text,bg,fg}]`，备忘录只用字符串原子即可（4 个原子都在 `TYPE_DEFAULT` 里）。未发现需要自定义配色的场景。
12. **票 6 V6=B「`contact` 补 `url` 使其可点」在现 schema 下加不进去**（复核期新发现）：`help.ts:218-222` 的 `contact.items[]` 是 `{label,value}` 闭集 ＋ `additionalProperties:false` → 加 `url` 键必 `schema-invalid`（`help.ts:358`）。可行路径只有「把链接放进 `value`」或「改 schema」（后者属 base-render 的面，不是 #227 能定的）。**归票 8 落，本票只报事实。**
13. **`init_banner.steps` 三方不一致**（复核期新发现）：schema `help.ts:207` 要**字符串数组**、模板 `help-template.html:1778` 要**对象数组 `{title,desc}`**、老 `memo_render.py:516-523` 传的是**对象数组**。⇒ 老 `init_banner` payload **今天过不了 schema 校验**；谁对谁错需要 #8 裁。**#227 若要落 `init_banner`，不要原样搬。**
14. **本报告自身的行号引用可靠性（复审建议）**：全篇 100+ 处源码行号引用，首版错了 2 处（`memo_cli.py` 的 `-y/--yes`、`help.ts` 顶层闭集范围），复审抓出后已订正。**审计期内本文件被改过**（复审员按冻结版 `sha256 A645AEC213083AC7C912884A6030EA0A82E1135F271BAA46EEFCEBB7990027CA` 审计），故本版起在头部钉「本行之后全部字节」的 sha256（见 G.4）——**引用本报告前请先复算指纹**。
15. **仓内行号会漂（事实，非不确定项）**：本报告引用 `packages/base-render/**` 的行号时，工作树里 `packages/base-render/assets/help-template.html`、`src/helpShell.ts`、`test/help-shell-136.test.mjs` **正被别的会话改动（未提交）**。这些行号对**当前 HEAD 与本报告写作时的工作树**成立；若那些改动落地，引用前请按「锚点字符串」而非裸行号定位（例如搜 `normalizeScenes`／`TYPE_DEFAULT`／`INIT_BANNER.steps`）。

---

## 附录 G 复现命令与方法（本报告每个数都可复查）

全部为**只读**：`yaml.safe_load` 读老 yaml、`json.loads` 读 skeleton、`read_text` 读 SKILL.md／`memo_cli.py`／`help.ts`；**未写任何仓内文件**（临时输出落 `%TEMP%\t227\`）。工作树里别的会话的未提交改动（`packages/skill-chef/**`、`packages/skill-schedule/**`、`packages/skill-calorie/**`、`packages/skill-memo-ilife/**`、`packages/plugin-memo-ilife/**`、`pnpm-lock.yaml`、`tooling/check-boundaries.mjs`）**全程只读、未修改一个字节**（本席在仓内只新建了本报告一个文件）。

| 数 | 怎么来的 |
|---|---|
| 30 场景／8 域／13 二级组／4 兜底／76 dims／12 html／1 布尔／22 落回 | `yaml.safe_load(scenarios.yaml)` 后按 `memo_render.py:544-581` 的算法**重放**一遍分组与 `editable_fields` |
| id/title 逐字一致（mismatch=0） | 30 条 × 9 字段与 `t222-skeleton.json.old_scenes` 逐字段 `==` |
| `wake[]` 长度直方图 `{1:30}` | `Counter(len(m['wake']) for m in skeleton['old_scenes'])` |
| 原子计数 `{回执:30,采集:20,查看:10,向导:4}`；**26 两原子 ＋ 4 三原子** | `type.split('+')` 后计数；原子个数分布 `Counter(len(atoms))` |
| 21 子命令／3 条不在两表 | 正则扫 `memo_cli.py` 的 `add_parser(`（`:1541` 单一 `add_subparsers`）；再对 `SKILL.md:147-172`／`:226-292` 逐行 `(?<![\w-])CMD(?![\w-])` 匹配 |
| 42 条口语样例 | 逐行数 `SKILL.md:158-172` 的成对引号（`"` 计数 ÷ 2） |
| 别名 12 条／跨场景子串对 1 对 | 别名表硬编码（出处见 A.7 行号）后与 30 个 `wake_word` 做 `a in b` 全枚举；同场景对照按别名归属场景求并集后归一 |
| prompt 命令 token 命中场景 = 8 | 30 条 `prompt` 扫 `--html`／`-c `／21 个子命令名，**取并集**；不重不漏分解 = `--html` 6 ＋ 子命令名 4 ＋ `-c` 1（**三项相加 ≠ 8，因为 #5／#6／#8 重复命中**） |
| `editable_fields` 缺陷 22 条 | `① = {键是 bool}`、`② = {键不是 `DIM_LABEL_MAP` 的 str 键 或 键是 bool}`、`③ = {键 == 'html'}`；实测 **① ⊂ ②**、**③ ⊂ ②** → `①∪②∪③ = 22 = 1 + 9 + 12` |
| 「两表缺 3 条子命令」 | 21 条 ∖ (`:147-172` ∪ `:226-292`) = `due`／`dismiss`／`init-report` |
| 对账文档行号 | `Select-String '^#{1,3} '` 取标题行 ＋ 逐段 `read` 核实表体起止 |

### G.3 统计口径定义（复审教训：第 4／5 条就是栽在这里）

| 术语 | 定义 | 例（`SKILL.md:226-294` HTML 对照表） |
|---|---|---|
| **编号行** | 表内第 1 列是**数字**的行（`1`…`29`），即"编号唤醒词" | **29 行**：`✅11 ／ 🟡2 ／ ❌16 = 29` |
| **未编号行** | 表内第 1 列是 `-` 的行（该表只有 1 条：`:265` 备忘改分类(批量)） | 1 行 🟡 |
| **行位** | 编号行 ＋ 未编号行的**总判定格数** | **30 行位**：`✅11 ／ 🟡3 ／ ❌16 = 30` |
| 备注 | 老文档 `:270-275` 的统计表用的是"唤醒词口径"（29），且 **✅／❌ 两个清单本身各错一处**（见 B.2） | — |

### G.4 交付指纹复算（本报告头部那行）

头部「交付指纹」行的 `sha256` 覆盖**该行之后的全部字节**（这样该行自身的填入不会改变被哈希的内容，可无限次复算）。PowerShell 一行：

```powershell
$p='D:\ilife\docs\skills\skill-memo-ilife\t227-datasource-recon.md'
$t=[System.IO.File]::ReadAllText($p,[System.Text.Encoding]::UTF8)
$mark='**交付指纹（可复算）**'
$i=$t.IndexOf($mark); $j=$t.IndexOf("`n",$i)+1
$sha=[System.Security.Cryptography.SHA256]::Create()
($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($t.Substring($j))) | ForEach-Object { $_.ToString('x2') }) -join ''
```

> 注：`Get-Content` 的分行计数会把**末尾换行**算成一行 → 本报告"647 行"是 `ReadAllText` 去尾换行后的行数，与 `(Get-Content).Count + 1` 差 1，属同一事实的两种记法。

**本报告自证断言汇总（订正后）**：`场景=30`／`域=8`／`二级组=13`／`兜底=4`／`editable_fields=76`／`涉及场景=29`／`①布尔=1`／`②落回=22`／`③html=12`／`②非③=10`／**`①∪②∪③=22`（= 1＋9＋12；**不是 23，因 ① ⊂ ②**）**／`aliases=12`／**`prompt 需改=8`（并集；= `--html` 6 ＋ 子命令 4 ＋ `-c` 1）**／`type→types 表=30 行`／**`原子分布 = 26 两原子 ＋ 4 三原子`**／`二级组 id 对照=13 行`／`21 子命令中两表缺=3`／**`SKILL.md HTML 表编号行 1–29 = ✅11＋🟡2＋❌16`**。
