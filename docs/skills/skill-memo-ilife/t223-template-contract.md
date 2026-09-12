# 备忘录 HELP：通用 help 模板的注入契约 ＋ 备忘录专属取值（票 #223）

调查日期 2026-09-12。一切结论以**代码与产物的实测**为准；行号按本报告当日在本仓／老仓盘上的文件实测。
起点＝兄弟图 `#183` 的票 3 产物：`docs/skills/skill-home/t186-template-contract.md`（**实际读到的就是这个文件名**，227 行／30 KB，2026-09-12 仍在盘；`#183` 并发工作期间该目录未改名）。

---

## 〇、复核两条全局结论（票面要求「复核后可直接沿用」）

两条**均复核通过**，可以直接沿用。

### 结论 1：仓内有两套 help 渲染，本图走 A 路

| 路 | 实现 | 入口 | 备忘录走哪条 |
| --- | --- | --- | --- |
| **A** · 老实物 help 模板（冻结页面运行时，verbatim 搬家） | `packages/base-render/assets/help-template.html`（2053 行）→ 生成物 `src/helpShell.ts` | `base-paint/help-shell` 的 `renderHelpShellHtml` | ✅ **走这条**（地图 `#220` Destination 写死「与卡路里／饼干记账／居家管家同一套 UI」） |
| B · 组件式 TS 渲染 | `packages/base-render/src/help.ts` | 主入口 `renderHelpShell(input)` | ❌ 不是本图的面 |

复核证据：
- A 路的源＝`help-template.html`；切分点 `gen-help-shell.cjs:18`（`OPEN`）；PREFIX/SUFFIX 由 `:32`／`:36` 切出；渲染＝`gen-help-shell.cjs:148-155`（空 `groups` 抛 `HelpShellError('missing-data')`）。
- 老备忘录实物**就是 A 路的祖先**：`.db\memo_html\备忘录_HELP_20260813_161545.html` 里含 `scene-data 契约 v1`（×1）与 `Base Skill 控件库`（×1）——即老 `公共组件/assets/help_template.html`。所以本图不是换框架，是**同一套模板换代**（老 公共组件模板 → 新仓 `base-render/assets/help-template.html`）。

### 结论 2：A 路＝前缀 ＋ 一段 JSON ＋ 页面运行时；四个键有落点、两个键读完即弃

**复核通过，逐键实测（本报告 §二 表里给行号）。** 我另外补一条 `#186` 没点名的实测事实：

> **老产物的整页静态可见正文是空的。** 老 `备忘录_HELP_20260813_161545.html` 把 `<script>/<style>` 与标签全部剥掉后，`其他技能`／`联系作者`／`关于`／`版本`／`首次使用`／`HELP 汇总`／`HELP 唤醒词` 的可见文本命中数**全是 0**——界面完全由运行时代码跑出来。所以「肉眼验收去页面上找某个键」这件事在 A 路**根本不成立**；判断某个键在不在，只能看 `help-data` 的 JSON 载荷。

---

## 一、模板注入点清单（A 路，逐项带行号）

模板源＝`packages/base-render/assets/help-template.html`（下称「模板」）。

### 1.1 读取段（模板里 9 个键的取用点，`:1647-1656`）

| 行 | 代码 | 说明 |
| --- | --- | --- |
| `:1647` | `var HELP = JSON.parse(document.getElementById('help-data').textContent);` | 载荷入口 |
| `:1648` | `var SKILL_NAME = HELP.skill_name \|\| '';` | |
| `:1649` | `var TITLE = HELP.title \|\| '能力速查台';` | 缺省值是原型遗留串 |
| `:1650` | `var SUBTITLE = HELP.subtitle \|\| '';` | |
| `:1651` | `var META_BLOCKS = HELP.meta_blocks \|\| [];` | |
| `:1652` | `var INIT_BANNER = HELP.init_banner \|\| null;` | |
| `:1653` | `var CONTACT = HELP.contact \|\| null;` | |
| `:1654` | `var SKILL_VERSION = HELP.version \|\| '';` | |
| `:1655` | `var ABOUT_EXTRA = {};` | **声明即死**：唯一赋值是空对象字面量，全模板无第二处引用（实测全文 ×1） |
| `:1656` | `var RECOMMENDATIONS = HELP.recommendations \|\| [];` | |

### 1.2 八个键的渲染落点

| 键 | 落点 | 行号 |
| --- | --- | --- |
| `skill_name` | ① hero eyebrow 小字；②「关于」Tab 版本段的技能名 `<b>` | `:1772`（`esc(SKILL_NAME)`）、`:1817` |
| `title` | ① `<title>` 文档标题（`__HELP_TITLE__` 占位替换）；② hero 大字 `<h1>` | `:6`（占位）、`:1772`（`esc(TITLE)`）；替换口径＝生成物 `helpShell.ts:141-145` 的 `composeDocTitle` |
| `subtitle` | **无落点**。`:1650` 之后全模板零引用（实测全文 ×1） | — |
| `meta_blocks` | **无落点**。`:1651` 之后全模板零引用（实测全文 ×1） | — |
| `version` | 「关于」Tab 版本段：`v` ＋ 值 ＋ ` · HELP 模板 v4`（整段不判空） | `:1817` |
| `init_banner` | hero 下方首次使用横幅：`title`／`subtitle`／`button_text`／`prompt`（进复制按钮 `data-c`）／`steps[]`；`closable === false` 才不画 ✕ | 显隐门 `:1775`；steps `:1776`；✕ 关闭 `:1838-1841`；CSS `:28-41` |
| `contact` | 「关于」Tab 第一段「联系作者」：逐项 `<b>label</b>` ＋ 值；`it.url` 为真**且**值以 `http` 开头才渲染成 `<a target="_blank">`；`copy_all` 为真再加一行「一键复制 全部联系信息」 | 门 `:1801`；项 `:1803-1809`；`url` 判 `:1804`；`copy_all` `:1810-1813` |
| `recommendations` | 「关于」Tab 第三段「其他技能」：`r.name`／`r.desc`／`r.wake`（徽章）；整段不出现即不画 | 门 `:1819`；项 `:1821-1822` |

### 1.3 `init_banner` 的显隐判法（全模板唯一显隐开关）

```js
(INIT_BANNER && !INIT_BANNER.hidden ? '<div class="init-banner" …' : '')   // :1775
```

即：**无 `init_banner` 键 → 不显；有键且 `hidden !== true`（含键缺失、`null`）→ 显；`hidden: true` → 不显。**
`#186` 据此定的「键常在、显隐只走 `hidden`」口径，模板侧复核成立。

### 1.4 `types` 配色表 `TYPE_DEFAULT`（`:1698-1709`）

认这 **10** 个词（少一个就退回 `'查看'` 的蓝底，见 `:1714`／`:1719`）：
`采集`／`查看`／`结果`／`向导`／`批量`／`校验`／`选择`／`过程`／`回执`／`录入`。

`types` 元素允许写成 `{text, bg?, fg?}` 自定义色（`:1712-1716`）。

### 1.5 `editable_fields` 落点（票面重点之一）

| 行 | 说明 |
| --- | --- |
| `:1669-1671` | `normalizeScenes` 把 `s.editable_fields` 映射成 `params`：`{key: f.name, label: f.label, value: f.value \|\| '', req: !!f.required, hint: f.hint \|\| ''}` |
| `:1747-1751` | `readParams(id)` 从 `document.querySelector('.pform[data-pid="…"]')` 里读 `input[data-p]` |
| `:1753-1764` | `buildPrompt(s, v)`：prompt 正文 ＋ 空行 ＋ 每行 `label: value`（**用的是 `label` 不是 `name`**） |
| `:1765-1767` | `getMissing(s, v)`：`p.req && !(v[p.key] \|\| '').trim()` → 报「缺必填」 |

⇒ **`editable_fields` 是「详情页参数输入框 ＋ 复制时把 `label: 值` 追加到 prompt 末尾」的机制**，不是装饰。

### 1.6 其它注入点

- **`<title>` 占位**：`:6` 的 `__HELP_TITLE__`。生成器立了硬门「PREFIX 必须含该占位，源里写死即回原型水印」（`gen-help-shell.cjs:21`、`:42`）。文档标题＝`composeDocTitle`（生成物 `helpShell.ts:141-145`）：`title.includes(skill_name) ? title : skill_name + ' · ' + title`。
- **`help-data` 段**：模板正文 `:190`；生成器丢弃中段，渲染时拼 `JSON.stringify(data)` 并把 `<` 转 `\u003c`（生成物 `:152`、`:154`）。**传入的整份对象原样进载荷**（类型面 `HelpShellData` 只声明 5 键，运行时透传）。
- **`SLOT:1/2/3`**（`:190-192`）是「烘焙区指针」，不是调用方注入点；生成器只断言存在（`gen-help-shell.cjs:38-40`）。
- **模板不吃时间、不吃环境变量**：`now` 只影响调用方算出来的字符串。
- **产物逐字节可复现**：同一份 `data` 两次渲染一致；变的是调用方传进去的 `subtitle` 时间戳。

---

## 二、备忘录取值表（逐项：值 ｜ 出处 ｜ 一句话理由）

下表的「新仓件」按本图 `Notes` 定的落点 `packages/skill-memo-ilife/`；资产件名由票 5／7 定，本报告只写取值。

### 2.1 八项取值

| 键 | 备忘录取值 | 出处（路径:行号） | 一句话理由 |
| --- | --- | --- | --- |
| `skill_name` | `'备忘录'` | 老 `script/memo_render.py:586`（`"skill_name": "备忘录"`）；老产物载荷实测 `skill_name == '备忘录'` | 老转换层与老产物两处同值，逐字照搬；hero eyebrow 与「关于」版本段都用它 |
| `title` | `'使用手册'` | 老 `script/memo_render.py:587`（`"title": "使用手册"`）；老产物载荷实测 `title == '使用手册'` | 老口径逐字。⚠️ 它**不含**技能名 ⇒ 新模板 `composeDocTitle` 走「加前缀」支，文档标题＝`备忘录 · 使用手册`（老产物 `<title>` 是原型水印 `HELP 原型 · V4 三级目录版`，见 §四.1） |
| `subtitle` | `'8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0'`（计数派生，非写死） | 老 `script/memo_render.py:588-589`：`f"{len(categories)} 个分类 · {total} 个场景 · {available} 可用 · 版本 {scenarios_data.get('version','')}"`；`total`＝`:583`、`available`＝`:584`；老产物载荷实测同串 | A 路**不渲染**它（§1.2），但`meta_blocks[0].html` 要用同一份串（老口径「一处算、两处用」）＋下游可见，故照传。⚠️ 注意老串是「**分类**」不是记账／居家的「功能域」，且**多一段 `N 可用`**——照老逐字，别对齐记账 |
| `meta_blocks` | **两块的形状照记账，但 `[1]` 现在填不出内容**：`[{id:'help_summary', title:'HELP 汇总', html:'<p>'+subtitle串+'</p>'}, {id:'help_wake_words', title:'HELP 唤醒词', html:'<p>'+HP.join(' / ')+'</p>'}]`，其中 `HP`＝新 `wakewords.ts` 的 `WAKE_TABLE` 里 `key === 'memo.help.lookup'` 的短语集合 —— **实测为空集**（见下） | 老产物**无** `meta_blocks`（实测载荷 7 键＝`skill_name/title/subtitle/version/init_banner/contact/groups`，`'meta_blocks' in data == False`）＝老家没有这个先例；形状照记账 `src/render/helpFile.ts:106-111`；`HP` 派生法照记账 `src/triggers/wake-assets.ts:984-986`；`memo.help.lookup` 在新仓 `packages/skill-memo-ilife/src/policy/wakewords.ts:13-30` 的 `WAKE_TABLE`（16 条字面 ＋ `WAKE_TOPS` 展开）里**不存在** | 契约面照记账补齐两块（下游可见、键集稳定）；但**第 2 块在票 9／10 把 `memo.help.lookup` 建进口径层之前无源可派生**，硬填就得复写第二份 HELP 短语——那正是记账派生的反面。**建议**：`[0]` 照传；`[1]` 等口径层有了 `memo.help.lookup` 再派生，否则整块 `meta_blocks` 只传 `[0]`（或两块都等）。这是**取舍**，不是事实，故同时进 §五 |
| `version` | `'1.3.0'`（老 `references/scenarios.yaml:25` 的 `version: 1.3.0`） | 老 `script/memo_render.py:590`（`scenarios_data.get("version", "")`）；老产物载荷 `version == '1.3.0'` 且 `subtitle` 里同值 | 语义＝**技能数据世代**，不是 npm 包版本（`packages/skill-memo-ilife/package.json` 的 `version` 是 `0.1.0`）——同记账 `helpFile.ts:13-14` 口径。界面上落成 `v1.3.0 · HELP 模板 v4`（`:1817`）。⚠️ 新仓 `WAKE_TABLE` 与老 yaml 不是同一代资产（新表 28 唤醒词／10 命令 vs 老 30 场景／29 唯一唤醒词），这个 `1.3.0` 是不是新资产的世代值**无权威出处**，见 §五 |
| `init_banner` | 形状：键**常在**、显隐走 `hidden`（`hidden = 已初始化`）<br>`title`＝`'🚀 第一次用备忘录?'`<br>`subtitle`＝`'从零搭建环境:检测 → 安装/配置 → 初始化数据库 → 生成报告,全程引导。'`<br>`button_text`＝`'📋 复制'`<br>`prompt`＝场景 `memo_init_setup` 的 `prompt` 逐字（**单源**，见 §2.3）<br>`closable`＝`true`<br>`steps`＝老 6 步（见 §2.3）<br>`hidden`＝`<已初始化>` | 老 `script/memo_render.py:496-524`（`_init_banner`）逐字；`title` `:511`、`subtitle` `:512`、`button_text` `:513`、`closable` `:515`、`steps` `:516-523`；显隐判法 `:501`（`if _help_initialized(): return None`）；老产物**实证**：`备忘录_HELP_20260813_143518.html`（105215 B）载荷里有完整 `init_banner`，`备忘录_HELP_20260813_161545.html`（103993 B）载荷里 `init_banner == null`——同一天两代产物，**差 1222 B 就是这块**；老 `:501` 的「未初始化才给键」写法在新模板下要改成「键常在 ＋ `hidden`」（模板 `:1775` 只认 `hidden`，照记账 `helpFile.ts:15-17`） | 文案逐字取老（UI 层不比对老 HELP，但文案没有理由自创）；`prompt` 必须从内容资产里取，不抄第二份 |
| `contact` | `{items:[{label:'GitHub', value:'https://github.com/FeatherHunter/SKILLS'}, {label:'Issues', value:'https://github.com/FeatherHunter/SKILLS/issues'}]}`——**两项**，**无 `url` 标记**，**无 `copy_all`** | 老 `script/memo_render.py:592-597`（`"contact": {"items": [GitHub, Issues]}`）；老产物载荷实测同构、且 `'copy_all' in contact == False`、每个 item 只有 `label`／`value` 两键；老 `公共组件/injector.py:127` 的 `_HELP_REQUIRED_TOP` 也不含 `contact` | 老家**只有两项、且没有邮箱／手机号**（与记账／居家的三项不同——那两家有 `975559549@qq.com`）。形状照老逐字；要不要补 `url:true`／`copy_all` 是**取舍**（§五），因为模板 `:1804` 要求 `url` 为真才成链接，而老实物两项都不带这个标记 |
| `recommendations` | **不传**（键缺席） | 老 `script/memo_render.py:585-599` 的返回字典**无此键**；老产物载荷实测 `'recommendations' in data == False`；且老 HELP 全页可见文本 `其他技能` 命中 **0**（剥离脚本后全文扫描）——`其他技能` 那 3 处在老产物里全是**运行时代码／注释**（模板 `:1818-1825`），载荷无键 ⇒ 该段永不渲染 | 与居家裁定同结论、且证据更硬：老家 HELP **确实没有**「其他技能」段（不是「找不到」而是「载荷无键 ＋ 门判空」）。它在 A 路本来也不渲染，传了只是给载荷多一个漂移面 |

### 2.2 `groups`（备忘录的准确形状 ＋ 老骨架实点）

形状逐字（老产物载荷实测）：

```jsonc
{
  "id": "memo",                     // 老 yaml categories[].key
  "icon": "📝",                      // 老 yaml categories[].icon（emoji ⇒ 模板走 :1743 的 emoji 支）
  "label": "备忘类",                  // 老 yaml categories[].name
  "subgroups": [{
    "id": "memo_0",                 // 老的生成法：`f"{cat_key}_{len(g['subgroups'])}"`（memo_render.py:559）→ 0 起
    "label": "基础记录",              // 老 yaml scenarios[].subfunction（空 → "基础"兜底，:556）
    "scenes": [{
      "id": "memo_add_basic",       // 老 yaml scenario_id
      "title": "添加一条备忘笔记",      // 老 yaml scenario_title
      "wake_word": "记备忘",          // 老 yaml wake_word
      "status": "",                 // 30/30 空串（可用）
      "prompt_template": "请帮我记一条备忘(唤醒词:记备忘):\n\n…",   // 老 yaml prompt 逐字
      "types": ["采集", "回执"]       // 老 yaml type 单值按 + 切开（memo_render.py:576）
      // editable_fields：见 §2.4（要传的话）
    }]
  }]
}
```

老 8 域实点（我解析老 `references/scenarios.yaml` 得到，供票 2／7 对账）：

| 序 | 域 key | label | icon | 场景数 | 二级组（按书写序，括号内为场景数） |
| --- | --- | --- | --- | --- | --- |
| 1 | `memo` | 备忘类 | 📝 | 6 | 基础记录(3)、分类调整(3) |
| 2 | `search` | 查找类 | 🔍 | 7 | 基础查找(3)、时间查找(1)、分类查找(3) |
| 3 | `remind` | 提醒类 | ⏰ | 4 | 创建提醒(2)、查看提醒(2) |
| 4 | `wish` | 心愿类 | 🎯 | 5 | 心愿推进(2)、心愿管理(3) |
| 5 | `checkin` | 打卡类 | ✅ | 3 | 基础(3) |
| 6 | `mood` | 情绪类 | 💭 | 3 | 基础(3) |
| 7 | `sync` | 同步类 | 🔄 | 1 | 基础(1) |
| 8 | `init` | 初始化类 | 🚀 | 1 | 基础(1) |

合计 **8 域／13 二级组／30 场景**（与地图 `Notes` 的骨架一致）；`status` 30/30 为空串；
四个域只有 1 个二级组 ⇒ 走「基础」兜底的有 4 处（`checkin`／`mood`／`sync`／`init`）——对应地图 `Notes` 说的那 4 处，票 5／6 再判要不要真建二级组。

老实物的 `subgroups[].id` 是 `memo_0`／`memo_1`…（`{域key}_{序数}`，**0 起**），与记账／居家的「1 起」不同；新资产取哪种由票 5／7 定，本报告只报老值。

### 2.3 `init_banner` 的取值来源与 `prompt` 单源

`prompt` 取自老 `references/scenarios.yaml:535-559` 的场景 `memo_init_setup`（`wake_word: 首次使用`、`type: 向导+采集+回执`、`dimensions: {}`），其 `prompt`（`:555-557`）逐字：

```
请帮我初始化备忘录,我是第一次使用(唤醒词:首次使用):

无需参数,直接发送。

请按步骤帮我搭建好环境:检查并配置 Python、数据存储(全文搜索)、飞书 CLI(未安装则引导我安装并授权)、环境变量,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装/怎么配,完成后生成初始化报告页给我,并带我浏览一遍全部功能。

期望效果:
  AI 逐步引导我从零搭建环境(检测→安装/配置→验证),缺什么给具体指引,初始化数据库,生成初始化报告页,报告就绪情况。
```

老 `steps`（6 步，`memo_render.py:516-523`，**是 `{title, desc}` 对象数组**，与模板 `:1776` 读的 `st.title`／`st.desc` 一致）：

1. `检查并配置 Python` / `版本与依赖检测`
2. `数据存储` / `SQLite + FTS5 全文搜索`
3. `飞书 CLI` / `安装并授权(核心联动)`
4. `环境变量` / `SKILLS_DB_PATH / MEMO_MEDIA_DIR`
5. `初始化数据库` / `建表 + 提醒调度`
6. `生成报告` / `初始化报告页`

> `#186` 记过一处类型面不一致：`spec/help.ts:73` 写的是字符串数组，而模板 `:1776` 读 `st.title`／`st.desc`。**老备忘录的实物是对象数组**，以模板为准。

### 2.4 备忘录特殊点 1：`meta_blocks` 与 `editable_fields`

**(a) `meta_blocks`：老家没有这个字段，两块都要新决定。**

事实：老产物载荷 7 键，**无** `meta_blocks`（`'meta_blocks' in data == False`；原始串里 `meta_blocks` 只出现 1 次＝模板第 `:1651` 行的运行时声明）。
老 `公共组件/injector.py:127` 的 `_HELP_REQUIRED_TOP = ('skill_name','title','groups')`、`:138` 的校验——`meta_blocks`／`version`／`init_banner`／`contact`／`subtitle` 全**不是**必填，所以老家一直没传也没人发现。

要补的话：两块形状照记账（§2.1 那一行）。**第 2 块现在填不出内容**——见 §2.1 `meta_blocks` 行的理由，与 §五.1。

**(b) `editable_fields`：老产物 `29/30` 场景有、合计 `76` 条。**（票面说「有 76 个」——**复核：是 76 个条目、分布在 29 个场景**，不是 76 个场景；`editable_fields` 这个词在老产物原始串里出现 30 次＝模板运行时 1 次 ＋ 29 个场景各 1 次。）

老生成法（`memo_render.py:562-567`）：

```python
dims = s.get("dimensions") or {}
editable_fields = [
    {"name": k, "label": DIM_LABEL_MAP.get(k, k), "value": "",
     "hint": str(v), "required": False}
    for k, v in dims.items() if v
] or None                       # 全空 ⇒ 不给这个键（memo_init_setup 就是这样，实测 0 条）
```

`required` **恒为 `False`**（`:565`）⇒ 模板 `:1765-1767` 的 `getMissing` 永远报不出「缺必填」，必填性只写在 `hint` 的自然语言里。

**要不要进新 HELP？** 记账的资产没有这个字段，所以没有先例可照抄。老备忘录有，而且它不是装饰（§1.5：详情页会出现参数输入框，复制时把 `label: 值` 追加到 prompt 末尾）。这是一个**取舍**，不是事实，故进 §五.2。但我把**三个会直接坏掉的缺陷**查清了，供裁决用：

| 缺陷 | 实测 | 后果 |
| --- | --- | --- |
| ① `true` 键在 YAML 里是**布尔**，不是字符串 | 老 `references/scenarios.yaml:96` 写 `true: 跳过二次确认(自动化用)`；PyYAML 把它解成 Python `True` ⇒ `DIM_LABEL_MAP.get(True, True)` 未命中 ⇒ 老产物载荷里出现 `{"name": true, "label": true, "hint": "跳过二次确认(自动化用)", "required": false}`（场景 `memo_delete_basic`，实测） | 模板 `:1748` 会生成 `querySelector('.pform[data-pid="…"]')` 里的 `input[data-p=true]`、`:1759` 会拼出 `true: 值`。**JSON 里 `name`／`label` 是布尔值**是脏数据；新资产必须写成字符串键（`skip_confirm` 之类）＋ 中文 label |
| ② 22/76 条 label **未命中** `DIM_LABEL_MAP`，回落成原始 ASCII 键 | 实测缺失项：`html`(12)、`remind_at`(2)、`repeat_rule`(2)、`start`／`end`／`status`／`tasklist_guid`／`reminder_id`(各 1)，＋上面的 `True`(1) | 用户在详情页看到英文键名（`html`、`start`、`remind_at`…）。`DIM_LABEL_MAP`（`memo_render.py:49-69`）本来有 `at:'提醒时间'`，但 yaml 里的键是 `remind_at` ⇒ **映射表已经跟资产脱节** |
| ③ `html` 是 12 条 CLI 开关，不是用户参数 | 实测 12 个场景带 `html` dimension，`hint` 形如「生成可视化结果页」「过程型 HTML 向导(批量场景推荐)」 | 它是「要不要出 HTML」的内部开关（`memo_cli.py` 里各 `--html` flag），把它当参数输入框给用户填是**实现细节泄漏** |

> 顺带一条同源脱节：`DIM_LABEL_MAP` 的 `repeat_type`（`memo_render.py:62`）在 yaml 里出现 2 次，而 yaml 里另有 1 处写 `repeat_rule`（`DIM_LABEL_MAP` 里是 `rule`）——键名两套并存。

### 2.5 备忘录特殊点 2：`init_banner` 的显隐口径与「不建库」

**(a) 老家口径＝「DB 文件存在＝已初始化」，且它今天在这台机器上判错。**

老 `script/memo_render.py:486-493`：

```python
def _help_initialized():
    env = os.environ.get("HELP_INITIALIZED")      # 1/0 强制（测试/镜像可重现）
    if env is not None:
        return env.strip().lower() in ("1", "true", "yes")
    from memo_cli import DB_FILENAME, _find_db_path
    return _find_db_path(Path(__file__).parent.parent, DB_FILENAME).exists()
```

老 `script/memo_cli.py:29` `DB_FILENAME = "memo.db"`；`:48-56` `_find_db_path`＝`SKILLS_DB_PATH / db_filename`，**未设 env 时**才 `_fallback_db_dir().mkdir(parents=True, exist_ok=True)`（`:55`）再返回 `D:/.db/memo.db`。

**实测这台机器**：`D:\.db\memo.db` **存在但是 0 字节空文件**（mtime 2026-07-14）；`D:\.db\memo` **不存在**。
⇒ 老的判法回答「已初始化」（所以 8/13 16:15 那份产物 `init_banner == null`）。
⇒ 但**新的备忘录库不在那儿**：新仓 `src/cli/cmd_read.ts:129` 用的是 `openMemoDb(join(dbPath, 'memo'))`，即 `<SKILLS_DB_PATH>/memo/`（一个**目录**，里面是 `*.json` 笔记文件，`src/fetch/db.ts:48-51`），**不是** `memo.db`。

所以「老家=DB 文件存在」这条口径在新仓**不能逐字搬**：老看的是文件 `<SKILLS_DB_PATH>/memo.db`，新库是目录 `<SKILLS_DB_PATH>/memo/`。以老式判法判新库，在同一台机器上会判成「已初始化」，而新库其实就是空的。

**(b) 新仓 `openMemoDb(join(SKILLS_DB_PATH,'memo'))` 会不会顺手建库？——不会。**

`src/fetch/db.ts:21-29` 全文只有三件事：`statSync(dir)`（不存在即抛 `MEMO_DB_MISSING`）、`st.isDirectory()` 检查、`accessSync(dir, R_OK)`（不可读即抛 `MEMO_DB_UNREADABLE`）。
**没有 `mkdirSync`、没有 `writeFileSync`、没有 `DatabaseSync`、没有任何 DDL。** 它是一层「只读校验 ＋ 返回 `{dir}`」。

> 与 `#186` 报的居家坑对比：居家的坑是 `skill-home/src/fetch/paths.ts:20-23` 的 `resolveDbPath()` **自带 `mkdirSync(dir,{recursive:true})`**——**光算路径就把目录建出来**。备忘录的 `openMemoDb` 没有这个坑。顺带：记账的 `skill-bill/src/fetch/paths.ts:22` 也有 `mkdirSync`，而它的 `cmd_read.ts:85` 判初始化调的正是 `resolveDbPath()` ⇒ **记账这条其实会把 `SKILLS_DB_PATH` 目录建出来**（不建库文件）；只是它不建 `biscuit_accountant.db` 本体，所以「不开库」的承诺在「库文件」这一层成立。备忘录没有这个问题。

**(c) 「看帮助不许把库建出来」这篇该怎么判（建议落法）。**

1. **判对象**：判 **memo 库目录** `<SKILLS_DB_PATH>/memo` 是否存在（就是 `cmd_read.ts:129` 传给 `openMemoDb` 的那个 `join(dbPath,'memo')`）。别判 `memo.db`——那是老世代的文件，新线不存在这个东西。
2. **判法**：`existsSync(join(resolveDbDir(), 'memo'))` ⇒ 已初始化 ⇒ `init_banner.hidden = true`。`node:path` 的 `join` 是纯字符串运算，**不建目录**。
3. **不复用 `openMemoDb` 来判**：它读得没错、也确实不建任何东西，但判「在不在」用 `existsSync` 更直白，且不必为「目录不存在」这条正常路径去吃一个 `MemoFetchError` 异常（`db.ts:24`）。要用也行（`try { openMemoDb(...); true } catch { false }`），结论一样。
4. **键常在、显隐走 `hidden`**：`hidden = initialized`（照 `#186` §2.5-2 与记账 `helpFile.ts:128`），键集不随状态变。
5. **读失败／异常 ⇒ `initialized = false`（横幅照显，fail-open）**：照记账 `cmd_read.ts:82-86` 的 `helpInitialized()` 同形。误显只多一条提示，误藏会让新用户找不到入口，而 HELP 页正是新用户的发现面。
6. **`SKILLS_DB_PATH` 未设时**：新 `cmd_read.ts:21-22` 的 `preflight()` 本来就 `fail(1,…)`（「无默认值，必设」）⇒ 帮助命令直接退出 1，**不存在**「无 env 也要判」的情形（老家的 fallback 到 `D:/.db` 的隐式写生产路径，新线已明确不继承）。故判初始化不必自己处理「env 缺失」，照 preflight 的行为即可。
7. **`HELP_INITIALIZED` 逃生阀**：老 `:489-491` 那个 env 覆盖值得保留（测试／镜像可重现），但这是**取舍**（记账没有），见 §五.5。

**(d) 老产物的 `HELP_INITIALIZED` 痕迹**：同一天的产物两种形态并存——`备忘录_HELP_20260813_143518.html`（105215 B）带完整 `init_banner`，同一批的其它 6 份（103993 B）`init_banner == null`。这正是 `_help_initialized()` 在两次调用间给出不同答案的直接证据（第三次测试进程里 `_find_db_path` 的 fallback 分支会建 `D:/.db` 目录 —— 那目录今天确实在盘上，而 `memo.db` 是个 0 字节空壳）。**这条只说明老判法不稳，不作新线的口径依据。**

### 2.6 备忘录特殊点 3：`contact` 取老哪几项（逐字值）

老 `script/memo_render.py:592-597`：

```python
"contact": {
    "items": [
        {"label": "GitHub", "value": "https://github.com/FeatherHunter/SKILLS"},
        {"label": "Issues", "value": "https://github.com/FeatherHunter/SKILLS/issues"},
    ]
},
```

**就这两项，逐字，顺序照上**。老产物载荷实测完全一致，且：
- 每项**只有** `label`／`value` 两键，**没有** `url`；
- `contact` **没有** `copy_all`。

⇒ 照老逐字传的话，模板 `:1804` 的 `if (it.url && String(it.value).indexOf('http') === 0)` 判假 ⇒ 两个链接渲染成**纯文本** `<span>`（`:1807`），不是可点 `<a>`；`copy_all` 缺失 ⇒ 不画「一键复制」行（`:1810`）。
老实物确实是这个观感（老模板的判法不同，见 §五.6）。**要不要补 `url:true`／`copy_all:true` 是取舍**——记账／居家都有，备忘录老家没有。

### 2.7 备忘录特殊点 4：`recommendations` 传不传

**不传。** 三条证据：
1. 老 `memo_render.py:585-599` 的返回字典没有这个键；
2. 老产物载荷实测 `'recommendations' in data == False`；
3. 老 HELP 全页（剥离 `<script>`／`<style>`／标签后的可见文本）`其他技能` 命中 **0**——载荷无键 ⇒ 模板 `:1819` 的门判假 ⇒ 那一整段从不渲染。原始串里 `其他技能` 的 3 处命中全是模板自己的运行时代码与注释（`:1818`／`:1820`／`:1822`）。

⇒ 与居家裁定**同结论**，但注意理由的**强弱不同**：居家是「全页搜不到那一块」（存在性未定），备忘录是「载荷无键 ＋ 门判空 ⇒ 结构上不可能出现」。另外，家在 A 路本来就不渲染它，传了只多一个漂移面。

顺带记下**读法与类型面不一致**（要传时照模板的键名）：模板 `:1821-1822` 读 `r.name`／`r.desc`／`r.wake`，而 `src/spec/help.ts:86-90` 的类型面与 B 路渲染器读的是 `name`／`reason`／`wake_word`（同 `#186` §2.6 所述）。

### 2.8 备忘录特殊点 5：`types` 的原子集合与配色表

**老数据类型原子（4 个）：`回执` ×30、`采集` ×20、`查看` ×10、`向导` ×4**（从老 yaml 的 30 条 `type` 按 `+` 切开统计；老产物载荷实测同值）。

老 yaml 的完整 `type` 取值只有 3 种：`采集+回执`(16)、`查看+回执`(10)、`向导+采集+回执`(4)。

**模板配色表 `TYPE_DEFAULT`（`:1698-1709`）认 10 个词**：`采集`／`查看`／`结果`／`向导`／`批量`／`校验`／`选择`／`过程`／`回执`／`录入`。

⇒ **四个原子全部在表里，无一个需要自定义配色，模板零改动。**（票面点名的「采集／查看／选择／向导／回执」里，备忘录老数据实际**没有** `选择`——那是居家／记账的词；备忘录用的是 `回执`。）

若票 2／6 的裁决让新资产多出表外词（例：把 HELP 自身也当一个场景、或把老 `result` 里的措辞提成 `type`），必须**报出来**：表外词会静默退回 `'查看'` 的蓝底（模板 `:1714`／`:1719`），不报错。

---

## 三、给下游票的接线契约要点（本票只报事实）

1. **`renderHelpShellHtml` 的类型面只声明 5 键**（生成物 `helpShell.ts:97-103`），运行时**全量透传** ⇒ 多传的 `meta_blocks`／`version`／`init_banner`／`recommendations` 原样进 `help-data`。备忘录的 `HelpFileData` 若要照记账声明 8 键，是**类型面超集**，不违反 base 契约。
2. **`groups` 空即抛**（生成物 `helpShell.ts:149-151`，`HelpShellError('missing-data')`，记账落 exit 5）——备忘录 8 域非空，不触发。
3. **生成物不要手改**：`src/helpShell.ts` ＋ `test/help-shell-136.test.mjs` 都是 `scripts/gen-help-shell.cjs` 的产物（两条 sha 断言）；模板源必须**全 CRLF**（`:28`）且起于 `<!DOCTYPE html>`（`:29`）。
4. **文档标题会变**：老产物 `<title>` 是原型水印 `HELP 原型 · V4 三级目录版`；新线取 `title='使用手册'`（不含技能名）⇒ `composeDocTitle` 出 `备忘录 · 使用手册`。**这是修好的水印，不是回归。**
5. **`subtitle` 计数一律派生**：8／30／30 三个数字从内容资产算（照记账 `helpFile.ts:100-103`），并把同一份串喂 `meta_blocks[0].html`（一处算、两处用）。
6. **`now` 显式传入**保证产物可复现；格式 `YYYY-MM-DD HH:MM`（本地时区零填充）。
7. **落点**：产物落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`（地图 `Notes` 与老 `memo_cli.py` §07 口径），老那条「覆盖技能根 `备忘录.html`」本图**不做**（地图 `Notes` 已裁）。
8. **依赖与边界**：`packages/skill-memo-ilife/package.json` 现在**没有** `base-paint` 依赖（只有 `base-link-core: ^0.3.0`）⇒ 接 `base-paint/help-shell` 要新增依赖 ＋ 把 `skill-memo-ilife` 移出 `tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 名单（同 `#186` §三.2／§三.3）。
9. **`src/help/lookup.ts` 的现状**：它只喂构建期注入 `SKILL.md` 的速查表（`SKILL.md:19-54` 的 `HELP-AUTO-START/END` 段），**不产 HELP 文件**——本图是新增一条交付路，不是改它。

---

## 四、我实测到、但票面没问的三件事

1. **老产物 `<title>` 是原型水印**：`HELP 原型 · V4 三级目录版`——老 `公共组件/injector.py` 只替换 `<!--INJECT-DATA-->` 那个占位，没有文档标题占位，所以水印一路带到了产物。新模板 `:6` 的 `__HELP_TITLE__` ＋ `gen-help-shell.cjs:42` 的硬门就是为清掉它。
2. **老 `editable_fields` 有脏数据**（§2.4 表）：1 条布尔 `name`/`label`、22 条 ASCII 键回落、12 条 CLI 开关 `html`。若决定把 `editable_fields` 搬进新 HELP，**不能逐字搬**。
3. **老判初始化在本机判错**（§2.5(a)）：`D:\.db\memo.db` 是 0 字节空壳而 `D:\.db\memo` 不存在 ⇒ 老判法答「已初始化」，新库其实是空的。这条也说明老「DB 文件存在」口径在新线必须重定义为「memo 库目录存在」。

---

## 五、没读透／拿不准

1. **`meta_blocks[1]`（HELP 唤醒词）拿什么填** —— 记账的派生法是从口径层 `WAKE_TABLE` 过滤 `bill.help.lookup`（`wake-assets.ts:984-986`）。新仓 `packages/skill-memo-ilife/src/policy/wakewords.ts:13-37` 的 `WAKE_TABLE`（16 条字面 ＋ `WAKE_TOPS` 展开）**没有** `memo.help.lookup`，`memo_cmd_read` 的十键里也没有 help 键（`cmd_read.ts:33-97`）。所以这个块**当前无源可派生**；`memo.help.lookup` 何时建、叫什么、有几个短语，属于票 9／10。老 SKILL.md 另有「HELP 灵活匹配」的 8 种原话变体（老 `SKILL.md:1080-1095`：`备忘录 HELP`／`备忘录 help`／`备忘 HELP`／`备忘录的help在哪`／`帮我看下备忘录的使用说明`／`/备忘录-help`／`/备忘录 help`／`备忘录 manual|guide`），但那是**匹配规则表**、不是短语常量，而且老 `SKILL.md:1141` 明写「**不展示 HELP 唤醒词自身**（避免死循环）」——照这条，`meta_blocks[1]` 在备忘录这里**可能本来就不该有内容**。我倾向前者（等口径层）＋ 承认后者（老家明确不自指），但**没有权威出处能定**，留给票 8／9。
2. **`editable_fields` 到底进不进新 HELP** —— 事实查清了（§2.4）：老家 29/30 场景有、76 条、且有 3 类缺陷；记账的资产**完全没这个字段**，所以「照抄样板」给不出答案。取舍点：进了＝详情页多出参数输入框、复制出的 prompt 末尾会自动追加 `label: 值`（对老 `prompt` 里已手写 `____` 空槽的场景是**双重参数机制**）；不进＝丢掉一键填参的能力，且老 `dimensions` 里的真实参数信息只剩 `prompt` 自然语言。**我倾向不进**（老那 76 条逐字搬会带脏数据，清洗又要逐条裁定，属票 6 的内容裁决面），但这不在票 3 的裁决权内。
3. **`version` 该不该取 `'1.3.0'`** —— 老 yaml `:25` 写死 `version: 1.3.0`，老产物同值，出处明确。但新仓 `WAKE_TABLE`（28 唤醒词／10 命令）与老 yaml（30 场景／29 唯一唤醒词）**不是同一代资产**，「数据世代」是否仍是 `1.3.0` 无权威出处（老 repo 无版本升级记录：ADR-0001 只说版本号 SoT 是 `SKILL.md`，没说资产换代要不要抬）。保守照老 `1.3.0`，同 `#186` §四.3 的处境。
4. **`title` 取 `'使用手册'` 还是自带技能名** —— 老 `memo_render.py:587` 是 `'使用手册'`，逐字就是它。但记账／居家的 `title` 是 `'饼干记账 · 使用手册(HELP)'` 这种自带技能名的形（`helpFile.ts:27`），`#145` 的 `composeDocTitle` 正是为这种形写的。备忘录照老取 `'使用手册'` ⇒ 文档标题变 `备忘录 · 使用手册`（新拼），hero 大字仍是 `使用手册`、技能名只在 eyebrow 小字里。老 `render_help.py` 那条「#303 验收反馈：技能名应在大字行」的教训（`gen-help-shell.cjs:136-139` 引述）在备忘录这里**没有被满足**。要不要为了这条改 `title`（如 `'备忘录 · 使用手册(HELP)'`）是**取舍**，会影响文档标题与 hero 大字。
5. **`HELP_INITIALIZED` 逃生阀要不要保留** —— 老 `memo_render.py:489-491` 有（测试／镜像可重现），记账**没有**。留＝多一个 env 面；不留＝老测试语料里的镜像用例无处落。§2.5(c) 我按「照记账」写，但这条没出处。
6. **`contact` 的观感要不要对齐记账／居家** —— 老备忘录两项都不带 `url`（⇒ 模板渲染成纯文本，§2.6），也没有 `copy_all`。记账／居家是三项（多一个 `975559549@qq.com` 邮箱）＋ `url:true` ＋ `copy_all:true`。老 HELP 与老模板的判法不同（老 `公共组件` 模板只判字段存在），所以「老观感」不能直接推断新观感。补不补是**取舍**；另外**要不要给备忘录加邮箱**更是个内容决定（老备忘录从没有过）。
7. **老 `DIM_LABEL_MAP` 的完整修正值** —— 我只报了缺哪些（§2.4 表②）。22 条的正确中文 label 属内容裁决（票 6），本报告不擅自发明。
8. **新资产里那 4 处「单子功能域」要不要真建二级组** —— 老实物有 `checkin_0`／`mood_0`／`sync_0`／`init_0` 四个叫「基础」的二级组（`memo_render.py:556` 的兜底）。新 HELP 保留这 4 个「基础」组、还是把场景直接挂到域下，属票 5／6（地图 `Not yet specified` 已列）。本报告只报老值。
9. **`groups[].icon` 全走 emoji 支** —— 8 个域的 icon 都是 emoji（📝🔍⏰🎯✅💭🔄🚀），**一个都不在**模板 `SVG_ICONS`（`:1732-1739` 只认 `write`／`calendar`／`chart`／`grid`／`target`／`rocket`）⇒ 全部由 `:1743` 画成 emoji 字符，不是 SVG。视觉上与记账／居家（也是 emoji）一致，故不报为缺陷；但若维护者要求底部 Tab 用 SVG 线条图标，得改资产 icon 值（属内容裁决）。
10. **老产物两种形态（带/不带 `init_banner`）的根因** —— §2.5(d) 给出的解释（`_help_initialized()` 在 `HELP_INITIALIZED` 与 fallback 目录创建之间摇摆）是**推断**，不是逐次复现的实证（老 `memo_cli.py` 的 `pytest`／测试语料我没有逐条跑）。确定的事实只有两条：两份产物同一天生成、载荷差一个 `init_banner`（1222 B）；`D:\.db` 目录存在而 `memo.db` 是 0 字节。**新线不受影响**（口径重定义为「memo 库目录存在」）。
