## 决议

**关票**。报告落 `docs/skills/skill-memo-ilife/t223-template-contract.md`（38235 B／340 行；只读调查，未改源码、未提交、未动 issue）。

复核通过 `#186` 的两条全局结论（读到的正是 `docs/skills/skill-home/t186-template-contract.md`，未改名）：本图走 **A 路**（`packages/base-render/assets/help-template.html` → 生成物 `src/helpShell.ts` → `base-paint/help-shell` 的 `renderHelpShellHtml`），不走 B 路（`src/help.ts` 组件式）；A 路是「前缀 ＋ 一段 JSON ＋ 页面运行时」，`subtitle` 与 `meta_blocks` 读完即弃。

### 一条 `#186` 没点名的实测（定了本图怎么看老产物）

**老产物剥离脚本后静态可见正文为空**：「其他技能／联系作者／关于／版本」这类字样命中全 0。⇒ 要判某个键在不在，**只能看 `help-data` 的 JSON**，不能看静态 DOM。

### 备忘录取值表（8 项，逐项定位到老 `memo_render.py`）

| 键 | 值 | 出处 |
|---|---|---|
| `skill_name` | `'备忘录'` | `memo_render.py:586` |
| `title` | `'使用手册'`（不含技能名 ⇒ 新文档标题＝`备忘录 · 使用手册`） | `memo_render.py:587` |
| `subtitle` | `'8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0'`（派生） | `memo_render.py:588-589` ＋ `:583-584` |
| `meta_blocks` | 形状照记账两块；`[0]` 与 `subtitle` 同源；**`[1]` 当前无源可派生** | 形状 `skill-bill/src/render/helpFile.ts:106-111`；老家**无**此键（载荷实测） |
| `version` | `'1.3.0'` | 老 `references/scenarios.yaml:25` ＋ `memo_render.py:590` |
| `init_banner` | 键常在、`hidden=已初始化`；标题／正文／复制按钮文案 ＋ prompt 取 `memo_init_setup` ＋ 老 6 步，均已逐字录进报告 | `memo_render.py:496-524` |
| `contact` | 两项（GitHub `https://github.com/FeatherHunter/SKILLS`／Issues `…/issues`），**无 `url`、无 `copy_all`** | `memo_render.py:592-597` |
| `recommendations` | **不传**（载荷无此键；模板门判空） | `memo_render.py:585-599` |

模板注入点（A 路，`help-template.html`）：读取段 `:1647-1656`；落点 `skill_name` `:1772`＋`:1817`／`title` `:6`＋`:1772`／`subtitle` **无**／`meta_blocks` **无**／`version` `:1817`／`init_banner` 门 `:1775`、steps `:1776`／`contact` `:1801-1813`／`recommendations` `:1819-1822`；`editable_fields`→params `:1669-1671`；`TYPE_DEFAULT` `:1698-1709`（10 词）；`ABOUT_EXTRA` `:1655` 声明即死。

### 三个必查点的结论

1. 老产物确**无** `meta_blocks`（载荷 7 键）；`editable_fields` 是 **76 条／29 场景**（不是 76 场景），且实测**有脏数据**（1 条布尔 `name`／`label`、22 条 ASCII label 回落、12 条 CLI 开关 `html`）。
2. `openMemoDb(join(SKILLS_DB_PATH,'memo'))` **不建库**（`src/fetch/db.ts:21-29` 只有 stat／access，无 mkdir、无 DDL），且新库是**目录**不是 `memo.db`。⇒「看帮助不许把库建出来」在本技能天然过关（仍要在分派顺序上证一遍）。
   ⚠️ 但**老家的初始化判法在本机实测判错**：`D:\.db\memo.db` 是 0 字节空壳，而真正的库目录 `D:\.db\memo` **不存在** ⇒ 老判法答「已初始化」，而库其实是空的。**口径须重定义为「memo 库目录存在」**，已并入票 6（裁决）／票 8（接线）／票 9（出口）。
3. `recommendations` **不传**；`types` 4 个原子（回执／采集／查看／向导）**全在**模板配色表里，不用改公共层。

### 额外实测（票面没问，但影响下游）

- 老 `公共组件/injector.py:127` 必填仅 `skill_name`／`title`／`groups` ⇒ 老家一直没传 `meta_blocks` 也过校验。
- 记账 `skill-bill/src/fetch/paths.ts:22` 的 `mkdirSync` 会被 `cmd_read.ts:85` 判初始化时调到（建 `SKILLS_DB_PATH` 目录，不建库文件）——**备忘录无此问题**。
- `packages/skill-memo-ilife/package.json` 现**无** `base-paint` 依赖（只有 `base-link-core`）⇒ 渲染接线票要新增依赖 ＋ 动 `tooling/check-boundaries.mjs:37` 的冻结名单。
- 老 `title` 是原型水印 `HELP 原型 · V4 三级目录版`（老 injector 无文档标题占位）；新线 `composeDocTitle` 修掉它，**不是回归**。
- 老 `groups[].subgroups[].id` 是 `memo_0`／`memo_1`…（**0 起**，与记账／居家 1 起**不同**）。

### 未尽事项已并进票（不新开票）

- **票 6（`#226`）**：`editable_fields` 进不进；`meta_blocks[1]` 该不该有；`title` 要不要自带技能名；`version` 是否仍取 `1.3.0`；22 条 label 的正确中文值；二级组 `id` 序数从 0 还是 1 起（同时并进票 7）。
- **票 7（`#227`）**：老 `id` 0 起的实测 ＋ `editable_fields` 的规模与脏数据。
- **票 8（`#228`）**：新增 `base-paint` 依赖；`meta_blocks[1]` 无源；A 路不渲染 `subtitle`／`meta_blocks`；`composeDocTitle` 不是回归。
- **票 9（`#229`）**：不建库的实测；`init_banner` 的逐字文案位置；三项待裁（逃生阀／`contact` 补不补／`version`）。

### 本票没有关掉的雾

报告的「没读透」10 条里，9 条已挂到上面四张票；第 9 条（8 域 icon 全 emoji、不在 `SVG_ICONS`、视觉同兄弟技能）**不报为缺陷**，留在报告里备查。第 10 条（老产物带／不带 banner 的根因）是**推断**（同批两组仅差 1222 B），不再追。

### 计数自证

8 项取值逐项带「老仓路径:行号」；模板注入点逐行给出；三个必查点各有一条可复现的实测（`db.ts` 只读、载荷 JSON 解析、模板 grep）。报告里凡是推断都标了「推断」。
