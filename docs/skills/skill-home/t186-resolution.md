## 决议

**关票**。报告落 `docs/skills/skill-home/t186-template-contract.md`（30 KB／227 行；只读调查，未改源码、未提交、未动 issue；探针脚本落 `.scratch/t186/`，不入库）。

### 最要紧的一条：仓内有两套 help 渲染，别混

| 路 | 实现 | 入口 | 居家走哪条 |
|---|---|---|---|
| **A · 老实物 help 模板**（冻结的页面运行时，verbatim 搬家） | `packages/base-render/assets/help-template.html`（2053 行）→ 生成物 `src/helpShell.ts` | `base-paint/help-shell` 的 `renderHelpShellHtml` | ✅ **居家就走这条**（用户裁定的「与卡路里／记账同一套通用模板」） |
| B · 新组件式渲染（TS 直接拼 DOM） | `packages/base-render/src/help.ts` | 主入口 `renderHelpShell(input)` | ❌ 不是本图的面 |

A 路是「前缀 ＋ 一段 JSON ＋ 页面运行时」的整页静态文件——界面由浏览器执行脚本后才出来。**`subtitle` 与 `meta_blocks` 在 A 路读完即弃（不渲染）**，只进 `help-data` 的 JSON；`version`／`init_banner`／`contact`／`recommendations` 有渲染落点。这不是缺陷，是「模板不渲染归模板，透传位归透传位」——记账已按同一口径做过肉眼终审。

### 居家取值表（已写进票 6 的票面）

- `skill_name`＝`居家管家`；`title`＝`居家管家 · 使用手册(HELP)`（自带技能名 ⇒ `composeDocTitle` 走「原样」支，不重复前缀；原型水印已被 `__HELP_TITLE__` 占位替换清掉）。
- `subtitle`／`meta_blocks[0]`＝同一个字符串（**一处算、两处用**）：`9 功能域 · 73 场景 · 版本 2.0 · 更新于 <时间>`。
- `meta_blocks[1]`＝3 条 HELP 唤醒词（从口径层 `WAKE_TABLE` 派生，不进场景目录，防自指）。
- `version`＝`'2.0'`（老 yaml 同值；语义是技能数据世代，不是 npm 包版本）。
- `contact`＝老 `help_center.py:31-35` 那三项（邮箱／GitHub／Issues）；`recommendations` **不传**（老居家 HELP 全页没有「其他技能」段，那是老公共组件的作息示例里的）。
- `init_banner`：照老家「DB 文件存在＝已初始化」，`hidden = initialized`（键常在，显隐只走 `hidden`）；读失败照显；**不调 `openHomeDb`**。⚠️ 居家坑：`fetch/paths.ts:20-23` 的 `resolveDbPath()` 自己带 `mkdirSync`，判初始化别直接用它。

### 资产形状（已写进票 5 的票面）

三层 `groups[].subgroups[].scenes[]`，字段名逐字：`id／title／wake_word／status／prompt_template／types`；`types` 由老 yaml 的单值 `type: 采集+回执` 按 `+` 切开；二级组 `id` 照记账通式 `<域id>_<序数>`；实测 **9 域／30 组／73 场景**，73/73 `status` 为空串，类型原子（采集／查看／选择／向导／回执）**全在模板配色表里**，不用改公共层。

### 事实源纪律（摘要进告示）

搬运源是**老 yaml**（`SKILLS\居家管家\references\scenarios.yaml`），**不是**老实物 HTML——技能根那份（84,577 B／73 场景）与 `.db` 那份（75,514 B／59 场景）都是旧一代产物，后者还少 14 条。

### 本票没有关掉的雾

`init_banner.prompt` 取哪条场景的 prompt（老家那条场景 id 叫 `first_use`、记账叫 `setup_init_wizard`）；`types` 切分后的顺序与去重规则——两条都要票 5 与票 6 对齐，已写进票 5 票面。
