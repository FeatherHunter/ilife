# 居家管家 HELP：通用 help 模板的注入契约（票 #186）

调查日期 2026-09-12。一切结论以**代码**为准（行号按本仓当前在盘文件实测；老技能基线在 `D:\2Study\StudyNotes\SKILLS\`，只读）。

先说一句最容易踩的：仓内 base-paint 有**两套** help 渲染，不要混。

| 路 | 实现 | 入口 | 居家走哪条 |
| --- | --- | --- | --- |
| A · 老实物 help 模板（冻结的页面运行时，verbatim 搬家） | `packages/base-render/assets/help-template.html`（2053 行）→ 生成物 `src/helpShell.ts` | `base-paint/help-shell` 的 `renderHelpShellHtml` | ✅ **就走这条**（票据 #189"通用 help 模板"／卡路里＋记账同款） |
| B · 新组件式渲染（TS 直接拼 DOM） | `packages/base-render/src/help.ts` | 主入口 `renderHelpShell(input: HelpShellInput)` | ❌ 不是本图的面 |

A 路是「前缀 ＋ 一段 JSON ＋ 页面运行时」的整页静态文件：模板里**只有运行时脚本**，界面由浏览器执行脚本后才出来。所以本报告的"渲染落点"＝模板里那段运行时代码读到该键之后拿它拼了什么 DOM（脚本不跑，页面上什么都没有）。B 路虽然也认同名键（`src/spec/help.ts:93-103` 的 `SceneData`），但它的落点与 A 路**不完全一样**（例：B 路真渲染 `meta_blocks`／`subtitle`，A 路不渲染），票面问的是通用 help 模板，故以下默认 A 路，凡与 B 路有差异的逐条标出。

---

## 一、契约现状（逐字段：名／类型／必填／渲染落点／出处）

### 1.1 五张必填（模板硬读，缺了页面就空／错）

| 字段 | 类型 | 必填 | 渲染落点（A 路） | 出处 |
| --- | --- | --- | --- | --- |
| `skill_name` | `string` | 必填（`SceneData` 必填，机读 schema `minLength:1`） | ① hero 左上角小字 `eyebrow`；② 「关于」Tab 版本段的技能名 `<b>` | 读：`help-template.html:1648`；hero：`:1772`（`esc(SKILL_NAME)`）；关于：`:1817` |
| `title` | `string` | 必填（同上） | ① `<title>` 文档标题（经 `__HELP_TITLE__` 占位替换，`help-template.html:6`）；② hero 大字 `<h1>` | 读：`:1649`；hero：`:1772`（`esc(TITLE)`） |
| `subtitle` | `string` | 类型面可选 | **A 路不渲染**（只 `var SUBTITLE = HELP.subtitle \|\| ''`，全模板再无第二处引用——实测见 §1.4） | 读：`:1650`；schema：`src/spec/help.ts:116` |
| `contact` | `{items: {label:string; value:string; url?:true}[]; copy_all?:boolean}` | 类型面可选；不过 `:1801` 有 `CONTACT && CONTACT.items.length` 门 | 「关于」Tab 第一段「联系作者」：逐项 `<b>label</b>` ＋ 值（`url:true` 且值以 `http` 开头 → 渲染成 `<a target="_blank">`）；`copy_all` 为真再加一行「一键复制 全部联系信息」 | 读：`:1653`；渲染：`:1801-1815`（项 `:1803-1809`，`url` 判 `:1804`，`copy_all` `:1810-1813`） |
| `groups` | `{id:string; icon?:string; label:string; subgroups:{id:string; label:string; scenes:Scene[]}[]}[]` | **必填且非空**（`renderHelpShellHtml` 里 `groups.length===0` 直接抛 `HelpShellError('missing-data')`） | ① 底部 Tab 条：每域一个 `<button data-nav=id>`，图标走 `SVG_ICONS[icon]`，不在表里就当 emoji 渲染；② 每个域一页：二级组 `<details open>`（组名 ＋ 场景数），组内每场景一张卡片（唤醒词 chip ＋ 类型徽章 ＋ 场景名 ＋「复制」按钮）；③ hero 计数「N 场景」（由扁平化后的 `ALL.length` 派生） | 读／规格化：`:1675-1682`；扁平化：`:1687-1694`；hero：`:1772`；页面：`:1781-1797`；Tab：`:1829-1832`；空分组抛错：生成物 `src/helpShell.ts:149-151` |

场景 `Scene`（`scenes[]` 非空、`minItems:1`）的运行时读取：

| 场景字段 | 类型 | 必填 | 渲染落点 | 出处 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 必填（schema） | 卡片 `data-key`、详情页锚点 `SCENE[id]` | `:1663`、`:1691`、`:1786` |
| `title` | `string` | 必填（**由 `:1664` 硬读**） | 卡片名 `m-name`、复制按钮正文 | `:1664`、`:1789` |
| `wake_word` | `string` | 必填 | 绿色 chip（`chipHTML`） | `:1665`、`:1724-1725` |
| `status` | `string` | 必填（schema 枚举 `''`／`'【待开发】'`） | 等于 `'【待开发】'` 时多一枚「待开发」徽章 | `:1667`、`:1726` |
| `prompt_template` | `string` | 必填、非空 | 「复制」按钮按出来的正文（可带空槽；`buildPrompt` 再拼参数行） | `:1668`、`:1753-1764`、`:1790` |
| `types` | `(string \| {text:string; bg?:string; fg?:string})[]` | 可选（schema 非必填） | 类型徽章；配色查 `TYPE_DEFAULT` 表，表里没有的词退到 `'查看'` 的蓝底 | `:1666`、`:1698-1723` |
| `editable_fields` | `{name;label;value;hint?;required?}[]` | 可选（schema 非必填） | 详情展开后的参数输入框（`params`） | `:1669-1671`、`:1747-1751` |

> ⚠️ A 路的 `types` 配色表 `TYPE_DEFAULT`（`:1698-1709`）只认 10 个词：采集／查看／结果／向导／批量／校验／选择／过程／回执／录入。居家老数据的类型原子是采集／查看／选择／向导／回执（我在老 yaml 上点过：采集 25、回执 54、查看 41、选择 25、向导 3），**五个全在表里**，不用改模板。老 yaml 把类型写成单值字符串 `type: 采集+回执`，新契约要**按 `+` 切开成数组**（记账生成器就是 `types: ['采集']` 这种形状，见 `packages/skill-bill/src/triggers/wake-assets.ts:71-73`）。

### 1.2 三块可选

| 字段 | 类型 | 必填 | 渲染落点（A 路） | 出处 |
| --- | --- | --- | --- | --- |
| `meta_blocks` | `{id:string; title:string; html:string}[]` | 可选 | **不渲染**。模板只 `var META_BLOCKS = HELP.meta_blocks \|\| []`（`:1651`），此后 `META_BLOCKS` 全模板零引用（实测：全文出现 1 次）。它只进 `help-data` 的 JSON，是给页面外消费的透传位；记账接线就是要这点（`skill-bill/src/render/helpFile.ts:55` 注释「壳不渲染，供外部消费」） | 读：`:1651`；schema：`spec/help.ts:117-125`（`id/title/html` 三个都必填） |
| `version` | `string` | 可选 | 页面已编译进「关于」Tab 的「版本」段：`v` ＋ 值 ＋ ` · HELP 模板 v4`（模板原文是 CRLF 折行，拼出的字符串是 `v${version} · HELP 模板 v4`）。整段不判空——不给 `version` 就渲染成 `v · HELP 模板 v4` | 读：`:1654`；渲染：`:1817` |
| `init_banner` | `{title:string; subtitle?:string; button_text?:string; prompt?:string; steps?:string[]}` ＋ 老运行时额外认的 `closable`／`hidden` | 可选；但从 `:1775` 起**不判空**地读 `INIT_BANNER.title`／`.subtitle`／`.prompt`／`.button_text`／`.closable` | hero 下方首次使用横幅：标题 ＋ 副标题 ＋ 一枚「复制 prompt」按钮（`data-c` 就是 `prompt`）＋ ✕ 关闭按钮（`closable === false` 才不画）；`steps` 非空时横幅内再横排步骤卡（`{title, desc?}` 对象数组——注意模板写的是 `st.title`／`st.desc`，**不是**字符串数组，与 `spec/help.ts:73` 的类型面不一致） | 读：`:1652`；渲染：`:1775-1777`；关闭动作：`:1837-1841`；CSS：`:28-41` |
| `recommendations`（第四块，票面没点名但模板也读） | 模板读 `{name, desc, wake}` | 可选 | 「关于」Tab 第三段「其他技能」：`name` ＋ `desc` ＋ `wake` 徽章。不给就整段不出现 | 读：`:1656`；渲染：`:1819-1825` |

`init_banner.hidden` 的判法（全模板唯一显隐开关，`:1775`）：

```js
(INIT_BANNER && !INIT_BANNER.hidden ? '<div class="init-banner" …' : '')
```

即：**没有 `init_banner` 键 → 不显示；有键且 `hidden !== true`（含 `hidden` 缺失、`hidden: null`）→ 显示；`hidden: true` → 不显示**。记账据此定的口径是「键常在，显隐只走 `hidden`」，`hidden = initialized`（`skill-bill/src/render/helpFile.ts:15-17`、`:128`）。

### 1.3 文档标题与其余注入点

- **文档标题**：模板 `<title>__HELP_TITLE__</title>`（`help-template.html:6`；老权威模板同一行写的是 `HELP 原型 · V4 三级目录版`——这就是要清掉的**原型水印**，生成器专门立了「PREFIX 必须含该占位，写死即回原型水印」这条断言，见 `scripts/gen-help-shell.cjs:20-21`、`:42`）。渲染时由 `composeDocTitle` 算（生成物 `src/helpShell.ts:141-145`）：
  ```ts
  const skill = String(data.skill_name);
  const title = String(data.title);
  return title.includes(skill) ? title : skill + ' · ' + title;
  ```
  入参只有 `skill_name` 与 `title` 两项；`title` 已经自带技能名就不重复前缀（#145 修掉的那条重复标题缺陷）。替换发生在 PREFIX 上，且替换值经 `escapeTitleText`（`& < > "` 五字符，生成物 `:129-131`）。
- **`<script id="help-data" type="application/json">`**：模板正文里它长这样（`help-template.html:190`）：
  ```html
  <script id="help-data" type="application/json"><!--SLOT:1/INJECT-DATA · 运行时 HELP JSON 注入位…-->
  ```
  生成器把「开标签之后到配对 `</script>` 之前」整段丢掉，渲染时在这里拼 `JSON.stringify(data)`，且把 `<` 换成 `\u003c` 防破壳（生成物 `:152`、`:154`）。**注入的 JSON 就是调用方传进去的整份对象**——你多传一个键，它就多一个键（`renderHelpShellHtml` 的类型面 `HelpShellData` 只声明 5 项，运行时是透传）。反过来说：`title` 只进 `<title>` 不进 JSON 之外的 DOM，页面 h1 是运行时从 JSON 里读的。
- **另外两个槽是给生成器自己看的，不是调用方的注入点**：`SLOT:2/SHARED-HELPERS`（`:191`）与 `SLOT:3/SHARED-CSS`（`:192`）是「烘焙区指针」，内容已经 verbatim 落在 SUFFIX 里；生成器只断言这三个槽存在（`gen-help-shell.cjs:38-40`）。
- **调用的其余输入**：`now` 只影响内容（`subtitle`／`meta_blocks[0].html` 里的时间），模板不吃时间。**没有任何环境变量或额外参数**影响 A 路渲染。

### 1.4 实测（不是读出来的）

我拿 `packages/base-render/dist/helpShell.js` 真跑了一遍（夹具：居家 skill_name／title ＋ 9 键全给，含 `meta_blocks`／`version`／`init_banner`／`recommendations`），逐键问「这段文本落进产物可见正文了吗」：

| 键 | 出现位置实测 |
| --- | --- |
| `title` | 在 `<title>` 里（正文第 149 字节） |
| `skill_name`／`title`（h1）／`groups`／`contact`／`init_banner` | 只以**运行时代码**形式存在（DOM 在浏览器里才拼出来），`groups` 的场景名／唤醒词／prompt、域名、联系作者段、横幅文案的字符串常量都在模板正文里 |
| `subtitle`／`meta_blocks`／`recommendations` | 只出现在 `help-data` 的 JSON 段内，**正文里一个可读字都没有** |
| `version` | 只出现在 `help-data` 的 JSON 段内（页面上的 `v2.0` 是运行时拼的，不在静态文本里） |

载荷段实测 1217 字节（3 域夹具）／整页 107000 字节；`__HELP_TITLE__` 与三个 SLOT 注释在产物里均已消失。探针脚本在 `.scratch/t186/`（临时件，不入库）。

---

## 二、居家取值表

内容资产按票 #188 落 `packages/skill-home/src/triggers/wake-assets.ts`（照记账同形：`scripts/gen-wake-assets.mjs` 机器生成 ＋ `--check` 字节比对 ＋ 头注释写事实源）。下表「派生」＝接线层从资产算，不写第二份。

### 2.1 五张必填

| 键 | 取值 | 来源／派生法 |
| --- | --- | --- |
| `skill_name` | `'居家管家'` | 接线常量。老实物页面的 eyebrow／关于段就是这四个字（老 `居家管家.html` 的 payload 里 `summary.title` 为「居家管家 · 使用手册(HELP)」，技能名同类） |
| `title` | `'居家管家 · 使用手册(HELP)'` | 老 `help_center.py:110` 的 `summary.title` **逐字**。它自带技能名 ⇒ `composeDocTitle` 走"原样"支，文档标题不重复 |
| `subtitle` | `'9 功能域 · 73 场景 · 版本 2.0 · 更新于 ' ＋ formatHelpMinute(now)` | 计数由 `WAKE_GROUPS.length`／`WAKE_ASSETS.length` 派生（改资产即跟变）；版本与时间戳照老 `help_center.py:111` 同一通式。⚠️ A 路不渲染它——但老实物有这个字符串，且 `meta_blocks[0]` 要用它，照记账「一处算、两处用」原样保留 |
| `contact` | `{items:[{label:'邮箱',value:'975559549@qq.com'},{label:'GitHub',value:'https://github.com/FeatherHunter/SKILLS',url:true},{label:'Issues',value:'https://github.com/FeatherHunter/SKILLS/issues',url:true}], copy_all:true}` | 值取老 `居家管家/scripts/help_center.py:31-35` 的 `CONTACT`（同 qq 邮箱／同 SKILLS 仓与 issues 地址，与记账同源）；形状照记账 `skill-bill/src/render/helpFile.ts:46-53`（`url:true` ⇒ 渲染成可点链接；老居家模板 `help_center.html:378-381` 也把这三项列成 邮箱／GitHub／Issues） |
| `groups` | `WAKE_GROUPS` 直转（只读引用不 clone） | 见 §2.2 |

### 2.2 `groups` 怎么喂（9 域／30 子功能／73 场景）

准确形状（三层，字段名逐字）：

```jsonc
{
  "id": "items",                  // 域名（英文 key）
  "icon": "🏠",                    // 老 yaml domains[].icon；不在模板 SVG_ICONS 表里就当 emoji 画
  "label": "物品管理",              // 域中文名
  "subgroups": [{
    "id": "items_1",              // 二级组 id（见下"命名"）
    "label": "录入",               // 老 yaml 场景的 sub 字段
    "scenes": [{
      "id": "add_text",           // 老 yaml scenario_id（唯一，73/73）
      "title": "录入一件新物品",     // 老 yaml scenario_title
      "wake_word": "录物品",        // 老 yaml wake_word
      "status": "",               // 73/73 为空串（可用）——老 yaml 全是 `status: ''`
      "prompt_template": "请加载「居家管家」技能,帮我录入一件新物品(唤醒词:录物品):\n\n …",  // 老 yaml prompt 逐字
      "types": ["采集", "回执"]      // 老 yaml type 单值字符串按 `+` 切开
    }]
  }]
}
```

域顺序与二级组顺序**照老 `domains` 列表与场景出现序**（老 `help_center.py:77-104` 的成组规则：一级＝`domains` 顺序固定、二级＝按场景出现顺序去重、三级＝按 yaml 出现顺序）。

实点（我在老 `references/scenarios.yaml` 上数的，供 #188 对账）：

| 序 | 域 id | 域 label | icon | 二级组数 | 组名（按出现序） |
| --- | --- | --- | --- | --- | --- |
| 1 | `items` | 物品管理 | 🏠 | 7 | 录入／查找／更新／标签与分类／照片档案／盘点／物品历史 |
| 2 | `space` | 空间与位置 | 🗺️ | 4 | 位置管理／固定位／收纳建议／空间视图 |
| 3 | `outfit` | 穿搭出行 | 👕 | 4 | 穿搭推荐／衣橱管理／出行清单／旅行穿搭计划 |
| 4 | `stats` | 统计总览 | 📊 | 1 | 统计总览 |
| 5 | `express` | 快递购物 | 📦 | 4 | 购物清单／缺货检测／快递跟踪／囤货盘点 |
| 6 | `receipt` | 票据凭证 | 🧾 | 4 | 购买记录／保修与保养／证件管理／账号密码 |
| 7 | `family` | 家庭协作 | 👨‍👩‍👧 | 2 | 借用管理／家人档案 |
| 8 | `setup` | 开始使用 | 🚀 | 1 | 开始使用 |
| 9 | `link` | 联动功能 | 🔗 | 3 | 联动总览／食品联动／价格联动 |

合计 **9 域／30 二级组／73 场景**（老 yaml 实测：73 个 `- id`、73 个唯一唤醒词、73 个唯一 id；`status` 全空）。票面「9 域／30 子功能／73 场景」与 yaml 一致。

二级组 `id` 的命名（老 yaml 没有这个字段，是新的）：记账用 `<域 id>_<序数>`（`write_1`…`query_3`…`setup_3`，共 20 个，见 `skill-bill/src/triggers/wake-assets.ts` 的 `subgroups[].id`）。居家照抄 ⇒ `items_1`…`items_7`、`space_1`…`space_4`、…、`link_1`…`link_3`。**`id` 在三层都要求唯一**（模板把场景 id 当 `SCENE` 字典键用，重名即后写覆盖前者）。

生成器要立形状断言（照记账 `scripts/gen-wake-assets.mjs:99-118`）：域数 9、组数 30、场景数 73、id 唯一、`types` 非空且都落在模板配色表内、`status` 全场同一取值。**事实源是老 yaml，不是老实物 HTML**——不要拿 `居家管家/居家管家.html`（84,577 B／73 场景）或 `.db\home_manager_html\居家管家_HELP_20260811_102414.html`（75,514 B／59 场景）当搬运源：后者是旧一代、少 14 条（地图 #183 的 Notes 已把这条写死）。HTML 件旧一代的事实源是老 yaml，`help_center.py:62-104` 从 yaml 出发。

### 2.3 `meta_blocks` 两块（一处算、两处用）

| 块 | `id` | `title` | `html` | 派生法 |
| --- | --- | --- | --- | --- |
| 汇总 | `help_summary` | `'HELP 汇总'` | `'<p>' ＋ summaryLine ＋ '</p>'` | `summaryLine` **就是 `subtitle` 那一份字符串**（同一个变量传两处，别算两遍——记账 `helpFile.ts:137`／`:144`） |
| 唤醒词 | `help_wake_words` | `'HELP 唤醒词'` | `'<p>' ＋ HELP_WAKE_WORDS.join(' / ') ＋ '</p>'` | `HELP_WAKE_WORDS` 从**口径层** `WAKE_TABLE` 派生：`filter(e => e.key === 'home.help.lookup').map(e => e.phrase)`（照 `skill-bill/src/triggers/wake-assets.ts:984-986`）。居家实得 **3 条**：`居家管家 帮助` / `居家管家帮助` / `居家管家能做什么`（`packages/skill-home/src/policy/wakewords.ts:21-23`） |

口径提醒：这 3 条 HELP 自身的话**不进场景目录**（防自指，照记账／卡路里），只在 `meta_blocks[1]` 里出现。

### 2.4 `version`

取 **`'2.0'`**，照老居家 `references/scenarios.yaml:1` 的 `version: '2.0'`（老 `help_center.py:118` 的 `data.get('version','2.0')` 同值）。**语义是技能数据世代，不是 npm 包版本**（`skill-home/package.json` 是 `0.1.0`）——记账在 #145 已经把这条口径定死（`skill-bill/src/render/helpFile.ts:13-14`、`:28-29`），居家跟着同值、同理由。界面上它会进「关于」Tab 的 `v2.0 · HELP 模板 v4`。

### 2.5 `init_banner` 的显隐口径

**新仓照搬老家的判法，并且不建库。** 老口径原文（居家 `scripts/help_center.py:38-49`，与记账 `render_help.py:91-102` 一字同形）：

```python
def _is_initialized() -> bool:
    env = os.environ.get("HELP_INITIALIZED")      # 测试/镜像可重现：1/0 强制
    if env is not None: return env.strip().lower() in ("1","true","yes")
    db_path = _find_db_path(SKILL_DIR, DB_FILENAME)
    return db_path.exists()                        # ← DB 文件存在＝已初始化
```

建议落法（与记账同形，`skill-bill/src/cli/cmd_read.ts:82-86`／`:106`）：

1. **判法**：`existsSync(<db 路径>)` ⇒ 已初始化 ⇒ `init_banner.hidden = true`。
2. **键常在、显隐走 `hidden`**：不给状态就 `hidden: false`（横幅照显）。这样键集不随状态变，用例能断言同一个键集。
3. **读失败／异常 ⇒ `initialized = false`（照显，fail-open）**：误显只多一条提示；误藏会让新用户不知道从哪开始，而 HELP 页正是新用户的发现面。
4. **不调 `openHomeDb`**：它会 `new DatabaseSync` ＋ 跑 `CREATE TABLE IF NOT EXISTS…` 全量 DDL（`skill-home/src/fetch/db.ts:54-70` 起），等于让「看帮助」这个只读页把 `home.db` 建出来。记账把这条写成了硬口径（`skill-bill/src/render/helpFile.ts` 头注释 ＋ `cmd_read.ts:69-78`「在开库之前走」）。
5. ⚠️ **居家特有的坑（记账没有）**：`skill-home/src/fetch/paths.ts:20-23` 的 `resolveDbPath()` 里带 `mkdirSync(dir, { recursive: true })`——**光算路径就会把 `SKILLS_DB_PATH` 目录建出来**。想做到"跑完不建库"，判初始化时不能直接用它，要么在接线层自拼 `join(resolveDbDir(), 'home.db')`，要么给 paths 增一个不建目录的只读取路径出口（哪个归 #187／#189 定，本票只报坑）。
6. `SKILLS_DB_PATH` 未设时 `resolveDbDir()` 抛（`paths.ts:9-18`）；居家出口的 `preflight()` 本来就要求必设（`cmd_read.ts:40-46`），接线层照它的行为 fail-open 即可。

**文案**（照记账形状换技能名，记账那条是从老 `render_help.py:69-74` 逐字拿的）：

- `title`：`'🚀 第一次用居家管家?'`
- `subtitle`：`'从「初始化」开始 — 自动检测环境、确认数据目录、建库、验证,全程零决策。完成初始化后,本区域将不再出现。'`
- `button_text`：`'📋 复制初始化 prompt'`
- `prompt`：**取自内容资产里初始化场景的 `prompt_template`**（单源，不抄第二份）。记账取的是场景 id `setup_init_wizard`（`render_help.py:77`／`:124-132`），居家对应场景是老 yaml `SM8-1`（`references/scenarios.yaml:886-900`）：`scenario_id: first_use`、`wake_word: 首次使用`、`type: 向导+回执`，其 `prompt` 为：
  `请加载「居家管家」技能,帮我完成首次使用初始化(唤醒词:首次使用):`
  ⇒ 新资产里的场景 `id` 应定为 `first_use`，接线层按这个 id 取 `prompt_template`；场景缺位即抛（不静默把横幅降级掉，照记账 `helpFile.ts:113-121`）。
- A 路只读 `title`／`subtitle`／`prompt`／`button_text`／`closable`／`steps`；老居家这边的横幅本来在 `help_center.html` 里另有 6 步文案，新线**不必搬**（用户 2026-09-11 裁定 UI 层不看老 HELP；模板的 `steps` 想要就传 `{title, desc}` 对象数组，不传就一行步骤卡都不画）。

### 2.6 `contact`／`recommendations`

- `contact`：值见 §2.1（老 `居家管家/scripts/help_center.py:31-35` 的三项，**不含手机号**——老注释写明是开源 PII 保护的约束，`help_center.py:29-30`）。
- `recommendations`：**建议不传**。理由两条：① 老居家 HELP 根本没有「其他技能」段（我在 `居家管家.html` 上全页搜「其他技能」零命中；老居家模板 `templates/help_center.html` 也只有联系作者段 `:376-390`）——票面说的「老家 HELP 里其他技能那块」在老居家这里**不存在**，实际有这块的是老公共组件的**作息**示例（`SKILLS\公共组件\.scratch\help_作息管家_示例_v12.html:195`，值形如 `{"name":"卡路里","desc":"…","wake":"卡路里HELP"}`）；② 它与 `meta_blocks` 一样在 A 路不渲染，传了只有"页面对外载荷多个键"的效果，反而多一个漂移面。
- 顺带把**模板读法与类型面的不一致**记下来（省得后面撞）：A 路依次读 `recommendations[].name/desc/wake`（`:1821-1822`），而 `spec/help.ts:86-90` 的 `SceneRecommendation` 与 B 路渲染器读的是 `name/reason/wake_word`（`src/help.ts:576-585`）。要传就照 A 路的三个名（`name/desc/wake`）。

---

## 三、跟记账的差异与坑

1. **生成物不要手改**：`packages/base-render/src/helpShell.ts` 与 `packages/base-render/test/help-shell-136.test.mjs` 都是 `packages/base-render/scripts/gen-help-shell.cjs` 的产物（含源切分哈希，`help-shell-136.test.mjs` 里两条 `assert.equal(sha(...), '<哈希>')` 就是它）。改模板只改源，然后 `pnpm --filter base-paint gen:help-shell`；`pnpm --filter base-paint gen:help-shell:check` 只比对不写盘，手改生成物必判红（生成器 `:278-295`）。模板源本身还有两条硬门：**必须全 CRLF**（`gen-help-shell.cjs:28`）、开头必须是 `<!DOCTYPE html>`（`:29`）——用编辑器转 LF 会当场抛。
2. **居家要动两道边界门**（记账踩过，居家必然重复）：`tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 名单里**现在还有 `skill-home`**，且同一脚本 `:45`／`:56-60` 会扫居家 `src/**/*.ts` 与 `templates/*.html`，命中 `import ... base-paint/base-render` 即破界（`:60` 断言）。照 #145 的收窄法把 `skill-home` 移出名单并写明理由，其余三技能断言一字不动。
3. **依赖声明口径**：`base-paint: "^0.3.0"`（技能包版本号 ＋ `pnpm-workspace.yaml` 的 `linkWorkspacePackages: true` 把本地解析成 `link:`，锁文件才保 `link:`；记账先例 `packages/skill-bill/package.json:24-26`）。
4. **发布态风险（本图的 Out of scope，但要知道）**：npm 上 `base-paint@0.3.0` 的 `exports` **没有** `./help-shell`（`#143` Q11=A 把风险留给发版票）——本机走 junction／link 能跑通，真·安装态会 `ERR_PACKAGE_PATH_NOT_EXPORTED`。
5. **模板侧四处"读了不用"别当成少传了**：`subtitle`／`meta_blocks`／`recommendations` 在 A 路都不渲染，`ABOUT_EXTRA`（`:1655`）连来源都没有（声明即死）。居家若照记账传全 `subtitle`＋`meta_blocks`，产物里它们只在 `help-data` 的 JSON 段里——**肉眼验收时别去页面上找它们**（记账的 `snapshot:html:*` 与肉眼终审都没受这点影响）。
6. **别混两套渲染的落点**：B 路（`src/help.ts`）真渲染 `meta_blocks`（`:595-601`）、`subtitle`（hero 区）、`recommendations.name/reason/wake_word`（`:572-588`），文档标题拼法也不同（`title · skill_name`，`src/help.ts:611-614`，与 A 路方向相反）。本图交付物是 A 路，验产物时以 A 路为准。
7. **`groups` 形状的三处不变量**（模板会因此炸或错，不是"能容忍"级）：`groups` 空即抛（生成物 `helpShell.ts:149-151`，调用方按 code `missing-data` 处理，记账落 exit 5）；`scenes` 为空的分组会渲染成一张空白 `<details>`（schema 里 `minItems:1` 只是机读约束，A 路不校验）；场景 `id` 重名会让详情页取错场景。
8. **产物可复现**：`now` 必须显式传（同一 `now` 两次渲染逐字节一致），时间戳格式 `YYYY-MM-DD HH:MM`（本地时区、零填充），坏 Date 即抛、不返空串（记账 `helpFile.ts:89-97`）。
9. **`help-data` 的 JSON 逐字可回读**：测试里用「抽 `help-data` 段 → `JSON.parse`」断言键集与值（`help-file-145.test.mjs:10-16`），居家照抄这一手最省事。
10. **用词**：正文写「help 模板」不写「壳」（`docs/agents/wording.md:35`）；`home.help.lookup` 叫"命令"不叫"键"（`:19`）。本报告为对照票面原文，标题与表格里保留了票面用词。

---

## 四、拿不准的

1. **老 yaml 的 `1-1`／`SM8-1` 编号要不要带进新资产**：记账的 `scenes[].id` 用的是**语义 id**（老实物的 `scenario_id`，如 `write_expense`），不是序号。居家老 yaml 两套都有（`id: 1-1` 序号 ＋ `scenario_id: add_text`）。我倾向 `id = scenario_id`（模板把 id 当锚点用，语义 id 更稳），但这归 #188 的资产票定；票面只说「老骨架 9 域／30 组／73 场景」。
2. **`subtitle` 到底要不要传**：A 路不渲染 ⇒ 传了只有"载荷里有"；但 `meta_blocks[0].html` 要用它，且老实物有这个字符串。记账传了。我倾向照传（保持两处同源、下游可见），但若 #189 判"不渲染的东西不传"，`meta_blocks[0]` 就得自己算一遍——那就成了两处算，违反"一处算两处用"，我建议别那么做。
3. **`version` 该不该取 `'2.0'`**：老 yaml 写死 `version: '2.0'`，但新仓 `home.*` 命令表是另一次改动（91 条唤醒词／21 条命令），"数据世代"是否仍算 2.0 没有权威出处可查（老 repo 没有版本升级记录）。记账有 `init-status` 自述「v2.0 特征 deleted_at」佐证；居家**没有**同款佐证。若 #189 判"资产换代即抬版本"，这里要重取一次——但抬到什么值同样没出处，保守做法是照老 yaml 的 `2.0`。
4. **`init_banner.prompt` 取哪个场景**：我按记账的"取初始化场景的 prompt_template"口径指到了老 yaml `SM8-1`（`scenario_id: first_use`）。但老居家**另有**一个 `type: 向导+回执` 的 6 步向导（`result` 里写着「6 步向导(环境检测→配置→建库→建分类→引导→回执)」），记账那把取的是老 yaml 里场景 id `setup_init_wizard`（`render_help.py:77` 的 `SETUP_INIT_SCENE_ID`），而居家老 yaml 这一条的场景 id 是 `first_use`——两边**名字不同、做法相同**。**#188 落资产时这条场景的最终 `id` 用哪个名字，直接决定 #189 的取值常量**——这条要两张票对齐（我建议资产里就用 `first_use`，因为它是老 yaml 的原文）。
5. **`types` 切分后的顺序与去重**：老 yaml 的 `type: 采集+回执` 我没有逐条核对 73 条的原子顺序；若 #188 生成器要合并同义原子（如 `查看+选择` 与 `选择+查看`），顺序规则得先定（模板按数组顺序画徽章，顺序会变外观）。
6. **`contact.items[].url` 在居家要不要标**：老居家模板把 GitHub／Issues 渲染成 `<a>`（`help_center.html:378-381` 只判字段存在，不判 `url` 标记），记账那边是**显式** `url: true`。我照记账标了 `url: true`；若 #189 想要"另两行也照老样"，两者外观其实一致（值以 `http` 开头 ＋ `url:true` 才成链接），故无实差。
7. **`meta_blocks`／`recommendations` 在 A 路不渲染这件事要不要报给维护者**：记账已完成肉眼终审「过」，说明"不渲染也不影响观感"；但票面 §1 问的是"三块的渲染落点"，如实答就是"两块不渲染"。若维护者期望 `meta_blocks` 真显示在页面上，那需要改模板（走 base-paint 的公共层 issue），**不在本图**——这条我只报现象，不擅自定调。
8. **`home.db` 的判初始化要不要看 WAL 边车**：`openHomeDb` 开 `PRAGMA journal_mode=WAL`（`db.ts:66`），即已初始化的库里可能有 `home.db-wal`／`home.db-shm`。判"文件存在"只看主库文件即可（老家同口径），但若某天出现"只有边车、没有主库"的残局，`existsSync` 会判未初始化 ⇒ 横幅照显，代价可接受。
