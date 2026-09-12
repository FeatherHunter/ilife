# 02a · 通用 help 模板的注入面（证据摘录）

> 取证范围：只读 `docs/skills/skill-home/t186-template-contract.md` 第 1–95 行（offset 1／limit 95）。下表所有 `t186:NN` 指该文件行号；`HT:NNNN` 指 `packages/base-render/assets/help-template.html`（原文表格里不带文件名的 `:NNNN` 即此文件）。只写事实，不写设计结论。
> 原文自带更正：t202 起 `meta_blocks` 在 A 路**会**按 `m.id === g.key` 渲染（t186:3），§1.2 表格已就地改对。

## 0. 两条路（先分清，不要混）

| 路 | 实现 | 入口 | 居家走哪条 |
| --- | --- | --- | --- |
| A · 老实物 help 模板（冻结页面运行时，verbatim 搬家） | `packages/base-render/assets/help-template.html`（2053 行）→ 生成物 `src/helpShell.ts` | `base-paint/help-shell` 的 `renderHelpShellHtml` | ✅ **就走这条**（票据 #189「通用 help 模板」，卡路里＋记账同款） |
| B · 新组件式渲染（TS 直接拼 DOM） | `packages/base-render/src/help.ts` | 主入口 `renderHelpShell(input: HelpShellInput)` | ❌ 不是本图的面 |

出处：t186:9-12（表体）、t186:14。

- A 路＝「前缀 ＋ 一段 JSON ＋ 页面运行时」的整页静态文件：模板里**只有运行时脚本**，界面要浏览器执行脚本后才出来；故「渲染落点」＝运行时代码读到该键后拼了什么 DOM，脚本不跑页面上什么都没有（t186:14）。
- 两路认同名键（B 路 `SceneData`：`src/spec/help.ts:93-103`），但落点不完全一样（原文例：`meta_blocks`／`subtitle` B 路真渲染、A 路原文不渲染）（t186:14）。

## 1. 居家那条路的确切调用面

- 入口函数：`renderHelpShellHtml`；所在标识：`base-paint/help-shell`（t186:11）。
- 实现文件 vs 生成物：源 `packages/base-render/assets/help-template.html` → 生成物 `src/helpShell.ts`（同包）（t186:11）。
- 入参（JSON 载荷）＝**调用方传进去的整份对象，运行时透传**；类型面 `HelpShellData` 只声明 5 项（t186:74）。
- 载荷注入点：模板 `<script id="help-data" type="application/json">`（HT:190）开标签之后到配对 `</script>` 之前整段被生成器丢弃，渲染时拼 `JSON.stringify(data)`，且 `<` → `\u003c` 防破壳（生成物 `:152`、`:154`）（t186:70-74）。
- 文档标题另算：`composeDocTitle`（生成物 `src/helpShell.ts:141-145`）只吃 `skill_name`／`title` 两项（t186:63-69）。
- 调用其余输入：`now` 只影响内容（`subtitle`／`meta_blocks[0].html` 里的时间），模板不吃时间；**没有任何环境变量或额外参数**影响 A 路渲染（t186:76）。
- 生成器：`scripts/gen-help-shell.cjs`（只断言 3 个 SLOT + PREFIX 占位，不是调用方注入点）（t186:63、:75）。
- 抛错：`groups.length === 0` 时 `renderHelpShellHtml` 抛 `HelpShellError('missing-data')`（生成物 `src/helpShell.ts:149-151`）（t186:28）。
- 实测用的产物：`packages/base-render/dist/helpShell.js`（t186:80）。

## 2. 五张必填（模板硬读，缺了页面就空／错）逐字段

| 字段 | 类型 | 渲染落点（A 路） | 出处 |
| --- | --- | --- | --- |
| `skill_name` | `string`；`SceneData` 必填、机读 schema `minLength:1` | ① hero 左上角小字 `eyebrow`；②「关于」Tab 版本段的技能名 `<b>` | 读 HT:1648；hero HT:1772（`esc(SKILL_NAME)`）；关于 HT:1817（t186:24） |
| `title` | `string`；同上必填 | ① `<title>` 文档标题（经 `__HELP_TITLE__` 占位替换，HT:6）② hero 大字 `<h1>` | 读 HT:1649；hero HT:1772（`esc(TITLE)`）（t186:25） |
| `subtitle` | `string`；**类型面可选** | **A 路不渲染**：只 `var SUBTITLE = HELP.subtitle \|\| ''`，全模板再无第二处引用（§1.4 实测同结论） | 读 HT:1650；schema `src/spec/help.ts:116`（t186:26） |
| `contact` | `{items: {label:string; value:string; url?:true}[]; copy_all?:boolean}`；类型面可选，但 HT:1801 有 `CONTACT && CONTACT.items.length` 门 | 「关于」Tab 第一段「联系作者」：逐项 `<b>label</b>` ＋ 值；`url:true` 且值以 `http` 开头 → `<a target="_blank">`；`copy_all` 为真再加一行「一键复制 全部联系信息」 | 读 HT:1653；渲染 HT:1801-1815（项 1803-1809、`url` 判 1804、`copy_all` 1810-1813）（t186:27） |
| `groups` | `{id:string; icon?:string; label:string; subgroups:{id:string; label:string; scenes:Scene[]}[]}[]`；**必填且非空** | ① 底部 Tab 条：每域一 `<button data-nav=id>`，图标走 `SVG_ICONS[icon]`，不在表里当 emoji 渲染；② 每域一页：二级组 `<details open>`（组名＋场景数），组内每场景一卡片（唤醒词 chip ＋ 类型徽章 ＋ 场景名 ＋「复制」按钮）；③ hero 计数「N 场景」（由扁平化后 `ALL.length` 派生） | 读／规格化 HT:1675-1682；扁平化 HT:1687-1694；hero HT:1772；页面 HT:1781-1797；Tab HT:1829-1832；空分组抛错生成物 `src/helpShell.ts:149-151`（t186:28） |

场景 `Scene`（`scenes[]` 非空、`minItems:1`）的运行时读取（t186:30-40）：

| 场景字段 | 类型 | 必填 | 渲染落点 | 出处 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 必填（schema） | 卡片 `data-key`、详情页锚点 `SCENE[id]` | HT:1663、:1691、:1786 |
| `title` | `string` | 必填（由 HT:1664 硬读） | 卡片名 `m-name`、复制按钮正文 | HT:1664、:1789 |
| `wake_word` | `string` | 必填 | 绿色 chip（`chipHTML`） | HT:1665、:1724-1725 |
| `status` | `string` | 必填（schema 枚举 `''`／`'【待开发】'`） | 等于 `'【待开发】'` 时多一枚「待开发」徽章 | HT:1667、:1726 |
| `prompt_template` | `string` | 必填、非空 | 「复制」按钮按出的正文（可带空槽；`buildPrompt` 再拼参数行） | HT:1668、:1753-1764、:1790 |
| `types` | `(string \| {text:string; bg?:string; fg?:string})[]` | 可选（schema 非必填） | 类型徽章；配色查 `TYPE_DEFAULT`，表里没有的词退到 `'查看'` 的蓝底 | HT:1666、:1698-1723 |
| `editable_fields` | `{name;label;value;hint?;required?}[]` | 可选（schema 非必填） | 详情展开后的参数输入框（`params`） | HT:1669-1671、:1747-1751 |

- `TYPE_DEFAULT`（HT:1698-1709）只认 10 个词：采集／查看／结果／向导／批量／校验／选择／过程／回执／录入。老数据原子是采集／查看／选择／向导／回执（老 yaml 计数：采集 25、回执 54、查看 41、选择 25、向导 3），五个全在表里，不用改模板（t186:42）。
- 老 yaml 类型是单值字符串 `type: 采集+回执`，新契约要**按 `+` 切成数组**（记账形状 `types: ['采集']`，见 `packages/skill-bill/src/triggers/wake-assets.ts:71-73`）（t186:42）。

## 3. 三块可选（原文 §1.2 表里还有第四块 recommendations）逐字段

| 字段 | 类型 | 不传时的默认表现 | 出处 |
| --- | --- | --- | --- |
| `meta_blocks` | `{id:string; title:string; html:string}[]`（schema 里三个都必填：`spec/help.ts:117-125`） | 不传即 `[]`，该页输出与旧版逐字节相同；`id` 不命中任何分组的块不上页（死载荷）。渲染自 t202 起：读 `var META_BLOCKS = HELP.meta_blocks \|\| []`（HT:1653），在**分组页锚点**后按 `m.id === g.key` 渲同 id 的块（HT:1786-1789；`title` 转义、`html` 原样透传）。记账传的两块 id 与它 7 个分组 id 零碰撞 → 记账页上仍不渲染（同旧版；`skill-bill/src/render/helpFile.ts:55` 注释已同步） | 读 HT:1653；渲染 HT:1786-1789；schema `spec/help.ts:117-125`（t186:48） |
| `version` | `string` | 整段**不判空**：不给就渲染成 `v · HELP 模板 v4`（给则是 `v${version} · HELP 模板 v4`，模板原文 CRLF 折行） | 读 HT:1654；渲染 HT:1817（t186:49） |
| `init_banner` | `{title:string; subtitle?:string; button_text?:string; prompt?:string; steps?:string[]}` ＋ 老运行时额外认的 `closable`／`hidden` | 见下方 `hidden` 判法：**没有 `init_banner` 键 → 不显示**。有键时自 HT:1775 起**不判空**读 `.title`／`.subtitle`／`.prompt`／`.button_text`／`.closable`；渲染 hero 下方首次使用横幅：标题＋副标题＋一枚「复制 prompt」按钮（`data-c` 即 `prompt`）＋ ✕ 关闭（`closable === false` 才不画）；`steps` 非空时横幅内横排步骤卡——模板写 `st.title`／`st.desc`，**是 `{title, desc?}` 对象数组、不是字符串数组**，与 `spec/help.ts:73` 类型面不一致 | 读 HT:1652；渲染 HT:1775-1777；关闭动作 HT:1837-1841；CSS HT:28-41（t186:50） |
| `recommendations`（票面没点名，模板也读） | 模板读 `{name, desc, wake}` | 不给就整段不出现。「关于」Tab 第三段「其他技能」：`name` ＋ `desc` ＋ `wake` 徽章 | 读 HT:1656；渲染 HT:1819-1825（t186:51） |

`init_banner.hidden` 是**全模板唯一显隐开关**（HT:1775 原文）：

```js
(INIT_BANNER && !INIT_BANNER.hidden ? '<div class="init-banner" …' : '')
```

即：没有 `init_banner` 键 → 不显示；有键且 `hidden !== true`（含 `hidden` 缺失、`hidden: null`）→ 显示；`hidden: true` → 不显示（t186:53-58）。记账据此定的口径是「键常在，显隐只走 `hidden`」，`hidden = initialized`（`skill-bill/src/render/helpFile.ts:15-17`、`:128`）（t186:59）。

## 4. 文档标题与其余注入点（§1.3）

- 模板 `<title>__HELP_TITLE__</title>`（HT:6）。老权威模板同一行写的是 `HELP 原型 · V4 三级目录版`，即要清掉的**原型水印**；生成器立了「PREFIX 必须含该占位，写死即回原型水印」断言（`scripts/gen-help-shell.cjs:20-21`、`:42`）（t186:63）。
- 文档标题由 `composeDocTitle` 算（生成物 `src/helpShell.ts:141-145`）：`const skill = String(data.skill_name); const title = String(data.title); return title.includes(skill) ? title : skill + ' · ' + title;`——入参只有 `skill_name`／`title`；`title` 已自带技能名就不重复前缀（#145 修掉的重复标题缺陷）。替换发生在 PREFIX 上，替换值经 `escapeTitleText`（`& < > "` 五字符，生成物 `:129-131`）（t186:63-69）。
- 数据槽 `<script id="help-data" type="application/json">`（HT:190）见 §1；**`title` 只进 `<title>`，不进 JSON 之外的 DOM**，页面 h1 是运行时从 JSON 读的（t186:74）。
- `SLOT:2/SHARED-HELPERS`（HT:191）、`SLOT:3/SHARED-CSS`（HT:192）是**生成器的烘焙区指针、不是调用方注入点**（内容已 verbatim 落在 SUFFIX），生成器只断言三个槽存在（`gen-help-shell.cjs:38-40`）（t186:75）。
- 无环境变量、无额外参数影响 A 路渲染（t186:76）。

## 5. §1.4 实测（不是读出来的）

原文用 `packages/base-render/dist/helpShell.js` 真跑一遍：夹具＝居家 `skill_name`／`title` ＋ 9 键全给（含 `meta_blocks`／`version`／`init_banner`／`recommendations`），逐键问「这段文本落进产物可见正文了吗」（t186:80）：

| 键 | 出现位置实测 |
| --- | --- |
| `title` | 在 `<title>` 里（正文第 149 字节）（t186:84） |
| `skill_name`／`title`(h1)／`groups`／`contact`／`init_banner` | 只以**运行时代码**形式存在（DOM 浏览器里才拼）；`groups` 的场景名／唤醒词／prompt、域名、联系作者段、横幅文案的字符串常量都在模板正文里（t186:85） |
| `subtitle`／`meta_blocks`／`recommendations` | 只出现在 `help-data` 的 JSON 段内，**正文里一个可读字都没有**（t186:86） |
| `version` | 只出现在 `help-data` 的 JSON 段内（页面上的 `v2.0` 是运行时拼的，不在静态文本里）（t186:87） |

- 载荷段实测 1217 字节（3 域夹具）／整页 107000 字节；`__HELP_TITLE__` 与三个 SLOT 注释在产物里均已消失（t186:89）。
- 探针脚本在 `.scratch/t186/`，原文标注「临时件，不入库」（t186:89）。

## 6. 本区间没查清／留了问号的项

1. **包名**：原文只给入口标识 `base-paint/help-shell`（t186:11），与本区间多处出现的目录 `packages/base-render` 的对应关系（谁是真包名、导出表怎么写的）本区间未给。
2. `HelpShellData` 「只声明 5 项」（t186:74）——**未列出这 5 项的名字**，是否恰等于 §1.1 的五张必填未明说。
3. §1.1 表格中 `contact`／`groups` 等行的 `:NNNN` 未逐行标文件名（原文语义是 HT），本区间未逐条回原文核对。
4. `SVG_ICONS` 表里有哪些 icon 名、`TYPE_DEFAULT` 十个词各自的配色值，本区间只给词表／名字，未给取值（t186:28、:42）。
5. A／B 两路落点差异只举了 `meta_blocks`／`subtitle` 两例（t186:14），**没有穷举清单**。
6. `recommendations` 是「三块可选」之外的第四块，票面未点名（t186:51），是否正式契约字段未知。
7. `status` schema 枚举只写 `''`／`'【待开发】'`（t186:37），给其它值时的行为未说明。
8. 实测夹具 9 键、字节数 1217／107000 的具体构造（3 域夹具有哪些域、9 键是哪 9 键）本区间未给，且探针脚本是不入库的临时件（t186:80、:89）→ §1.4 **不可原样复跑**。
9. `now` 的取值形状／传入方式未给（只知它只影响内容，t186:76）。
