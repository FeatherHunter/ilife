# t198 旧作息管家 HELP 查证：世代判定、内容骨架、落盘机制

> 票：[#198](https://github.com/FeatherHunter/ilife/issues/198)（作息管家HELP 1/10）· 2026-09-12
> 只读取证，未改旧仓任何文件。机器可读数据：`.scratch/t198/old-scenarios.json`

## 一、世代判定（本图最关键的一个事实）

**结论：旧作息管家的 HELP 从来没有换到公共组件的 help 模板。**

逐条证据：

| 判据 | `作息管家_HELP_20260811_125617.html`（旧实物） | `公共组件\assets\help_template.html`（公共模板） |
|---|---|---|
| `<script id="help-data">` 载荷 | **无** | 有 |
| 契约键 `skill_name`／`groups`／`subgroups`／`scenes`／`meta_blocks`／`init_banner` | **全部无** | 全部有 |
| 数据容器 | 内联 `window.__SCENARIOS__` | `help-data` JSON |
| 共享样式片段 `.phone{width:680px;max-width:100%` | 不命中 | 命中 |
| 页面标题 | `作息管家 · 唤醒词速查台` | `HELP 原型 · V4 三级目录版` |

对照：卡路里旧实物（`卡路里_HELP_20260906_220726.html`）与饼干记账旧实物（`饼干记账_HELP_*.html`）**都有** `help-data` 载荷 —— 作息管家是这两张图之外的第三种情况。

公共组件那边对这件事早有记录：`docs/help-template-contract.md` v1.2 §7 原文：

> 现有 4 种 HELP 布局家族（居家模板家族源 / 卡路里 4 层独立 / **作息 3 层+工具栏** / 私家大厨 ww-card）→ 技能重构时统一到 Base help_template.html，各技能传数据

公共组件侧只有一份 **10 场景的示例**（`公共组件\.scratch\help_作息管家_示例_v12.html`，4 组／5 二级组／10 场景，标题仍是原型水印），**不是**旧技能的实际产出。

### 两份旧实物的关系

| 文件 | 生成时间 | 计数 | 说明 |
|---|---|---|---|
| `.db\schedule_html\help\作息管家_HELP_20260811_125617.html` | 2026-08-11 12:56:17 | 5 类别／34 词／85 场景／1 待开发 | 旧技能的 HELP 快照，最新一份 |
| `SKILLS\作息管家\作息管家.html` | 2026-08-11 19:57:02 | 同上（内容同源） | ADR-0001 的稳定镜像，每次跑完覆盖写 |

两份内容同源、计数一致，**没有**饼干记账那次「上一代陷阱」的问题。

## 二、内容骨架（新 help 模板要传入的参数，就按这个准备）

来源：旧实物内联的 `window.__SCENARIOS__`，已原样取成 `.scratch/t198/old-scenarios.json`。

页头自报：`category_count=5`、`wakeword_count=34`、`scenario_count=85`、`pending_count=1`。

| 一级分组 | 旧 id | 图标 | 唤醒词 | 场景 |
|---|---|---|---|---|
| 写入与同步 | `write` | 📝 | 4 | 14 |
| 查询与浏览 | `query` | 🔍 | 12 | 28 |
| 日程与计划 | `plan` | 📅 | 10 | 28 |
| 分析与洞察 | `analyze` | 🔬 | 5 | 12 |
| 辅助与管理 | `admin` | ⚙️ | 3 | 3 |
| **合计** | | | **34** | **85** |

结构是三层：`categories[]` → `wake_words[]` → `scenarios[]`。每条场景带 `scenario_id`／`scenario_title`／`dimensions`／`prompt`／`status`／`result`。

映射到新契约（`公共组件\docs\help-template-contract.md` v1.2 的注入参数）：

| 新模板要的键 | 必填 | 从旧数据哪来 |
|---|---|---|
| `skill_name` | ✅ | 固定「作息管家」 |
| `title` | ✅ | 固定（照共享模板的标题派生口径） |
| `groups` | ✅ | `categories[]` → `groups[]`（两级：`subgroups` ← `wake_words[]`，`scenes` ← `scenarios[]`） |
| `subtitle` | 可选 | 计数派生 |
| `init_banner` | 可选 | 「首次使用」场景的 prompt |
| `meta_blocks` | 可选 | 两块（汇总／HELP 唤醒词，照前两张图） |
| `contact` | 可选 | 照前两张图同源 |
| `version` | 可选 | 技能数据世代 |
| `recommendations` | 可选 | 本图不做 |

每条场景要的字段：`id` ← `scenario_id`、`title` ← `scenario_title`、`wake_word` ← `wake_word`、`status` ← `status`、`prompt_template` ← `prompt`（**逐字零差异**）、`editable_fields` ← `dimensions`（形状需转换，见下）。

## 三、内容缺口的实测（供内容资产票参考）

拿旧 34 条唤醒词逐条比新仓 `packages/skill-schedule/SKILL.md` 的速查表：

- **真缺口 5 条**：`#1 准备消息`、`#2 同步作息`、`#3 增量同步`（语录取数链，迁移文档已判「以外置为准，不迁」）、`周视图`、`首次使用`。
- **写法差异 3 条**（新仓其实有对应词，只是名字不同）：`#23 按 ID 查记录` ↔ `按ID查记录`、`T4 类别深挖` ↔ `类别深挖`、`T5 异常检测` ↔ `异常检测`。
- **旧技能自标「待开发」1 条**：`写入与同步 / #0 记作息 / 场景「category 不在白名单」`。

## 四、生成与落盘机制（旧）

- 生成器：`SKILLS\作息管家\scripts\help_render.py`；页面模板：`SKILLS\作息管家\templates\help_center.html`。
- 落盘：`<SKILLS_DB_PATH>\schedule_html\help\作息管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`（同名递补）。
- 稳定镜像：ADR-0001（`docs\adr\0001-help-html-stable-mirror.md`）——技能根目录 `作息管家.html` 每次跑完**覆盖写**，作 IDE 即开即看的稳定入口；该 ADR 显式豁免「绝不覆盖」原则，快照目录内仍遵守递补。
- 另有独立页面 `templates\help_center.html` 的产物（`.db\schedule_html\help\help_center*.html`），与 HELP 不是同一件东西。

## 五、help 入口触发词

新仓今天 4 条（`packages/skill-schedule/src/policy/wakewords.ts:16-19`）：`作息管家 HELP`、`作息管家帮助`、`作息管家能做什么`、`作息管家使用说明` → 全部指向命令 `schedule.help.lookup`。

## 六、未解与风险

1. `dimensions` 是「参数名 → 说明」的自由对象，新契约的 `editable_fields` 要 `{name,label,value,hint,required}` 数组 —— 转换规则要在内容资产票里定死，不许丢字段。
2. 旧场景的 `result` 字段在新契约里没有对应位；要么并入 `editable_fields` 之外的备注，要么丢弃 —— 内容资产票定。
3. 旧 `help_center.html` 那份独立页面要不要产物，已进本图「未定」。
4. 旧实物的视觉基准**不用**（用户 Q11=A），但它仍是**内容基准**：85 条 prompt 逐字照搬。
