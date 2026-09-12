## Destination

在 DSH 对 AI 说「私家大厨help」→ **明确拿到 help HTML 文件**（落盘＋可打开）：产物落 `<SKILLS_DB_PATH>/cook_html/help/私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`，回执给绝对路径。文件由**已经开发好的通用 help 模板**渲染（仓内真相源 `packages/base-render/assets/help-template.html` → 出口 `base-paint/help-shell`，与卡路里／饼干记账／居家管家同一套 UI），内容是私家大厨自己的（老骨架 10 域／33 组／48 场景，新表多出的条目补进对应域）；**UI 层不与老 HELP 逐字比对**（老件自持壳，全库唯一没迁过通用模板的技能）。技能侧（`skill-chef`）与插件侧（`dsh-chef` ＋ DSH 真机装机）都要跑通，并由维护者肉眼终审「过」。两条同时达成即本图完成。

> 判定口径（2026-09-12 与你一轮对齐定案）：**①明确拿到 help HTML 文件 ②用现成通用 help 模板渲染（不看老 HELP 的 UI）**，外加维护者肉眼终审「过」。照邻居地图 #183（居家管家）与 #143（饼干记账）的规矩。
>
> ⚠️ **口径①「说一句 help 就该拿到那一份新产物」已由 [#245](https://github.com/FeatherHunter/ilife/issues/245) 就地改写（2026-09-12，维护者答复）**：本图管「谁调 HELP」，#245 判「反复读要不要新建」。新口径＝**缺省即复用**：同一主体 **24 小时内只留一份**（`--params '{"reuseHours":0}'` 才是「每次都要一份最新的」）；**HELP 类**（HELP 文件／速查表／照片 HELP）吃这个窗口，**其他 HTML**（业务页面／失败回执）一律新落、不吃窗口。**「明确拿到产物」这条不变**——缺省照样每次都回一份能打开的绝对路径。

## 进度：50%

**画图完成（2026-09-12）**：13 张子票已建（#209–#219 ＋ #236 ＋ #237）、原生子议题边与原生阻塞边逐项校验通过（expected＝actual）。

**四张 frontier 票已认领并推进（2026-09-12 执行轮）**：

- **票 1（#209）** 调查交付 `t1-bill-recipe.md`，两席对抗式审查 **7/10** 与 **6.5/10**（9 条硬伤／漏件），整改完成 **68,790 → 116,163 B**。
- **票 2（#210）** 调查交付 `t2-content-reconcile.md` **98,405 B／1028 行**；两席审查 **6.3/10** 与 **6/10**（12 条硬伤），整改中。
- **票 3（#211）** 调查交付 `t3-template-contract.md`；两席审查 **8/10** 与 **5/10**（9 条硬伤），整改完成 **61,994 → 111,942 B**。
- **票 10（#218）** 实施完成：报告 `t10-install.md`（409 行）。技能提供方已建、客户端产物已打包、web profile 已挂；`client-bundle-48` **9 红 → 6 红**（chef 3 例转绿）、plugin-chef **15/15**、skill-chef **24/24**、`tsc -b` exit 0、`boundaries` PASS、`snapshot:html:check` changed=0；探针实例 67 模块组合包 **行首 ESM 0 处**；**本会话技能目录已出现 `skill-chef`**。

**本轮实测推翻／改正的既有说法（已回写正文）**：① 字段映射 `scenario_title→name`／`scenario_id→key` **是错的**，实为 `→title`／`→id`（权威：模板 `:1658-1682` 与 `spec/help.ts:30-46`）；② 老件**有搜索框**（`help.html:237-242`），原记「无搜索」错；③ `dimensions` 是 **42** 键而非 41（含畸形键 `默认不含)`）；④ 告警线实测 `db.ts` **LF 451**、`cmd_read.ts` **LF 388**；⑤ 占位符是**双**花括号 `{{菜名}}` 共 **16** 条。

**本轮定案的两条技术裁定**：① `_N` **从 1 起步**（照老家 `align_08.py:52-65`），**不照抄 bill 的 `_2`**；② `dimensions` 与 `{{…}}` 的正确落点是 `editable_fields`（**不是** chip；chip 只取 `wake_word`）。

**已实测的两条环境事实**：告警线落点 `packages/skill-chef/AGENTS.md` **今天不存在**；`chef-cmd-read` **不在系统 PATH** 上（插件侧不受影响——bridge 按包名解析绝对路径 spawn，实测 exit 0）。

**四张 frontier 票收官（2026-09-12）**：票 1 `#209`／票 2 `#210`／票 3 `#211`／票 10 `#218` **全部关闭**，阻塞边自动解锁——票 4（`#212` 决策）、票 5（`#213` 内容资产）、票 6（`#214` 渲染接线）三张进入 frontier。

**闸门票已开：[`#236` 私家大厨HELP 结构设计：新件住哪（必报五步第一／二步，先报用户点头）](https://github.com/FeatherHunter/ilife/issues/236)**——已挂为票 5／票 6／票 7 的阻塞边。**它的关票条件是「拿到用户点头」**。

**三张调查票的最终体量**：`t1-bill-recipe.md` 120,846 B／964 行；`t2-content-reconcile.md` 165,303 B／1,389 行；`t3-template-contract.md` 114,692 B／818 行；`t10-install.md` 617 行。**共 19 席子代理**（4 交付 ＋ 8 对抗式审查 ＋ 5 整改 ＋ 2 验证 ＋ 装机整改链）参与，查出并修掉 **30＋ 条硬伤**。

**Q7 已裁（2026-09-12）**：维护者取 **乙**——「命名与落盘」收成**共用位**，三家（私家大厨／饼干记账／卡路里）一起改成走它；对外函数名裁为 **`saveHtmlFile`**（原拟 `saveHelpFile`，用户原话「这个名字不好。叫 saveHtmlFile 感觉更好」）。落盘位置同步改判为 `<SKILLS_DB_PATH>/cook_html/help/`。**票 4（`#212`）据此关闭**（决议落票面评论），新开 **票 13（`#237`）共用件 saveHtmlFile**，已挂为票 7 的阻塞边。

**本轮收盘（2026-09-12）**：**5 张子票已关／共 13 张**（票 1／2／3／4／10）；闸门票 `#236` 仍在等用户点头，票 5／票 6 被它挡着；票 13 无阻塞可开工。

**等你裁的三项**（写在 `#236` 里，也在对话正文里报你）：① 14 张卡的 chip 路由（甲保留老词／乙换新表最近可路由词／丙保留老词＋另加可路由提示位）；② `title`／`contact`／`subtitle` 三项取值（老家无对应物）；③ `体检` 的域归属（老骨架 `data` 完整度评分 vs 新命令 `history.query kind=quality` 评分口碑，**语义也不同**）。

## Notes

- **本图要交货**：默认「只出决定、不出东西」在这里不适用——必须交出能跑的功能。
- **会话纪律**：不弹窗问，一律写在对话正文里问（`AGENTS.md` 已立规）。
- **用户原话**：本图一切决策的源头在文末「用户原话采访区」；执行中与采访区冲突的，以采访区为准。
- **重复检查**：#57（chef复制样板线）覆盖桥／面板／frontmatter／技能提供方＋双路证据，**不含 HELP 文件交付**；#18（私家大厨 TS 迁移一期）只做数据层；仓里没有既有 map／issue 覆盖本需求（2026-09-12 查 `wayfinder:map` 全量与关键词搜索），故本图为**新增**。
- **照抄样板**：饼干记账那张地图（#143，8 张子票全关）是交付线的样板；居家管家那张（#183，11 张子票）是**本图的形式样板**——本图与它同题同形，因为它就是把同一件事在另一个技能上做一遍。「饼干记账到底怎么做的」本身就是票 1。
- **并发**：本图由多个会话并行推进（2026-09-12 实测：另一会话已关闭票 1／2／3／10 并开出闸门票 `#236`）。地图正文是共享件——**改正文一律以「取回线上正文 → 就地改 → 以文件方式写回」进行，不许拿本地旧稿整篇覆盖**（2026-09-12 踩过一次：线上正文被回写工具拆坏 60 行表格与 4 处代码围栏，本次已修复）。
- 工作树里还有别的会话在改 `skill-calorie`（`src/profile/`／`src/shared/`）与 `docs/skills/skill-schedule/`。本图任何 build／test 都会踩到他人未提交的改动——**先划边界再动**；只 `git add` 自己的文件；`pnpm test` 会顺手改写其他技能的 `SKILL.md`（已知问题，跑完 `git checkout` 还原）。

### 地面真相（只读，六份证据件在 `.scratch/chef-help/`）

- 老技能 HELP 触发词只有一条：`私家大厨 HELP`（老件载荷 `$.meta.help_wake_word`；页面另显示 33 个组名 + 4 个别名 = 37）。
- 老生产路（**源码仍在磁盘上**）：`scripts/render_help.py`（276 行，技能根 scripts 下）读 `references/scenarios.yaml` → 注入 `templates/help.html`（19,938 B，技能自有模板）的 `<!--INJECT-DATA-->` → 落 `$CHEF_OUTPUT_DIR/help/私家大厨_HELP_<YYYYMMDD_HHMMSS>.html`；注入形状是 **`window.__HELP__`**，不是 `help-data`。
- ⚠️ **私家大厨是全库唯一没迁过通用模板的技能**：全量扫 `D:\2Study\StudyNotes\` 下 **5,187 个 HTML**，走通用模板的 92 个里**含厨师标识的 0 个**；厨师树 52 件、`CookHub` 49 件，共享标记（`help-data`／`meta_blocks`／`init_banner`）齐全者**都是 0**。别拿老件当视觉基准。
- 老内容骨架（页面真渲染的层）：**33 个一级分组（唤醒词组）／48 张场景卡**；载荷把 48 条清单输出了两遍（`$.scenarios` 与展开后的 `$.wake_words[].scenarios` 逐字节相同）。
- ⚠️ **「域」这一层在源头只写了一半**：`$.scenarios[].domain` 只覆盖 **13/48**（源 `scenarios.yaml` 里 `domain:` 恰好出现 13 次），页面完全不渲染它。由 `$.scenarios[].html.template` 的目录名反推可得**完整 10 域／48 卡**，且这 10 个名字**三处独立佐证**：模板目录名、技能自带 `render_修改.py`／`render_历史.py`／`render_搜索筛选.py` 等脚本名、`references/wake_word_variants.md` 的分节标题。
- 域与卡数：做菜 5／查看 8／搜索筛选 13／修改 4／历史 4／采购 1／录入 6／派生 3／开始使用 1／数据管理 3 ＝ **48**。（域 key 的权威出处见票 2 与 `#236`：`cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`。）
- 旧产出落点与命名：老件在 `<SKILLS_DB_PATH>/CookHub/help/`（老根由 `CHEF_OUTPUT_DIR` 决定，Windows 兜底 `D:/CookHub`，实机重定向到 `.db`）；通式 `私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`，**文件名主体＝`私家大厨_HELP`**；冲突走 `unique_output_path()`，`_N` **从 1 起步**、绝不覆盖。
- **本次落盘位置已改判**（用户 2026-09-12 明确）：`<SKILLS_DB_PATH>/cook_html/help/`——把老目录 `CookHub/` 换成 `cook_html/`，`help/` 子目录保留；理由是与 `calorie_html/`／`biscuit_accountant_html/`／`home_manager_html/`／`memo_html/`／`schedule_html/` 同形。**文件名主体与通式不变。** 实机展开为 `D:\2Study\StudyNotes\.db\cook_html\help\`（`SKILLS_DB_PATH` 实机取值已确认，User 级环境变量）。
- ⚠️ **固定名镜像 `私家大厨_HELP.html` 不是源码契约**：`grep 私家大厨_HELP\.html` 全树 **0 命中**，`render_help.py` 全文只有一处写文件、只写时间戳件；该固定名件是更早的那份（08-10 对 08-20），判为手工／外部复制产物。**新仓不写镜像**（与 #131／#143「镜像默认关」口径一致）。
- ⚠️ 技能根 `SKILL.md` 的 `私家大厨.html`（63,901 B，`<title>私家大厨 — 使用手册</title>`）**不是 HELP 产物**，是给人看的使用手册——同名不同物的坑。
- ⚠️ **老文档不可当数据源**（三处实证）：老 `SKILL.md` 说 `render_help.py` 是单次覆盖、待优化，而源码**早已是** `_N` 语义；老 `SKILL.md` 另说「35 业务唤醒词 + 61 场景」，实测是 **33 组／48 场景**；`references/wake_word_variants.md` 与载荷有实质漂移（文档独有 `修改难度`／`修改份量`／`排除可选`，载荷独有 `查看全部`／`首次使用`／`体检`／`批量改`／`备份`／`从已有派生新菜`）。
- ⚠️ **计数陷阱**：payload 里字符串 `scenario_id` 出现 **96** 次，但 JSON 解析后只有 **48** 个场景对象（`$.scenarios` 与 `$.wake_words[].scenarios` 是同一批的两份视图）。**以 `json.loads`／`JSON.parse` 为准，不许用 grep 数。**
- ⚠️ **字段名两代不兼容，必须二选一**：老 chef 用单数 `type`（字符串，如 `"向导+选择+回执"`），通用 help 模板契约用复数 `types`（数组）；老场景 10 键、契约场景 6 键；**没有中间态**。
- ⚠️ **chef 还额外注入了一份 `window.__A08__`**（底部复制动作栏：`copy_data` 5 段 ＋ `copy_log` 6 段 ＋ `extra_buttons`），calorie／bill 产物 `__A08__` 实测为 0。本图目的地只到「拿到 HELP 文件」，归票 3 判要不要。
- 老 HELP 触发词：主词 `私家大厨 HELP`（三处独立登记），另 5 条文档级变体（`菜谱 HELP`／`能做什么`／`你能做什么`／`菜谱本怎么用`／`这能做啥`）；老机制是 **AI 读合约判定**，脚本不读输入，且 HELP 词不出现在它自己生成的页里（防死循环）。新仓 `SKILL.md` 的 4 条（私家大厨HELP／菜谱HELP／查帮助／能做什么）与老家不完全同形。
- 通用 help 模板的注入器硬校验（`公共组件\injector.py` 的 `validate_help_data`，以代码为准）：顶层非空 `skill_name`／`title`／`groups`；group 必 `id`＋`label`；subgroup 必 `label`＋非空 `scenes`；scene 必 `id`／`title`／`wake_word`／`prompt_template` 四元组；`status` 仅 `''` 或 `【待开发】`；**group id 与 scene id 共用一个唯一集合 → 全局唯一**。另 `contact` 是事实标准但校验不拦、契约文档未收录。⚠️ **仓内 A 路一处兜底都没有**：`renderHelpShellHtml()` 唯一运行时校验是 `groups` 非空。
- ⚠️ **换模板是换信息架构，不是换皮**：老件是**单列 · 一层手风琴**（33 个唤醒词组逐组折叠，浅色 iOS 风，无 tab 栏、无深色模式；⚠️ **但有搜索框**——`templates/help.html:237-242`「搜索框(§07 §10 s09 大规模可用 · 60+ 场景必须能定位)」，2026-09-12 实测改正，此前正文误记「无搜索」）；通用 help 模板渲染出来是**底部 tab 栏（每域一个）＋ 场景行 ＋ 点击开底部抽屉**，页面结构预期＝**11 个底部 Tab**（10 域 ＋「关于」）。老件的这几件在新契约里**没有字段位**：4 条别名与 `aliases_expanded_count=37`、`type`（11 型，契约是复数 `types` 数组）。
- ⚠️ **字段映射（2026-09-12 实测定案；此前本条写错，以模板为准）**：注入层读 `s.id`／`s.title`／`s.wake_word`／`s.types`／`s.prompt_template`／`s.status`／`s.editable_fields[{name,label,value,required,hint}]`（权威证据 `packages/base-render/assets/help-template.html:1658-1682` 契约注释＋归一化代码；正式契约 `packages/base-render/src/spec/help.ts:30-46`）。**正确换算：`scenario_id→id`、`scenario_title→title`、`prompt→prompt_template`、`type`（单数字符串，11 型）→`types`（数组）。** `key`／`name` 是模板**内部**原型名，注入 false 会被忽略——**照错写会得到「48 张卡标题与 id 全空」的页面**。`dimensions` 实测 **42** 键（＝合法 41 ＋ 畸形键 `默认不含)`，归属卡 `data_export_backup`），正确落点是 `editable_fields`（**不是** chip；chip 只取 `wake_word`）。老件自带的 `esc()` 与 `#toast` 与共享模板**同名**，不可照搬。
- ⚠️ **`meta_blocks` 与 `subtitle` 读了不渲染、`recommendations` 真渲染**（票 3 实测）。
- ⚠️ **占位符是双花括号 `{{菜名}}`，共 16 条**（票 3 实测）。
- 老件两处死代码／源资产 bug（进 Notes，不在本图修）：`$.scenarios[].status` **48/48 全为空串** → 全部卡恒显「✓ 可用」，Hero「待开发」恒 0，页脚「待开发场景…」分支永不执行；`references/scenarios.yaml` 的 `exclude_optional: 默认不含)` 多一个右括号 → 载荷 `$.scenarios[46].dimensions` 出现畸形键 `默认不含)=null`，页面原样渲染出来。
- 通用 help 模板的仓内真相源：`packages/base-render/assets/help-template.html`——它是**生成物** `src/helpShell.ts` 的源；改渲染必须改生成器 `packages/base-render/scripts/gen-help-shell.cjs` 再跑 `pnpm --filter base-paint gen:help-shell`，手改生成物会被 `gen:help-shell:check` 判红；**包内生成器不会被仓级 `pnpm build` 带跑**。出口：`base-paint@0.3.0` 的 `./help-shell`（`renderHelpShellHtml`）。
- 新仓现状：`chef.help.lookup` 只回一份速查列表（`packages/skill-chef/src/cli/cmd_read.ts:327` 的 `case` → `buildHelpItems()` → envelope → stdout），**该分支零 IO**；全文件唯一的落盘是 `cmd_read.ts:375` 的通用 `--html <路径>`。`packages/skill-chef/src/help/lookup.ts` 49 行，`WAKE_TABLE` 唯一上游。**证实「chef 今天没有任何 HELP 文件交付」。** 新表 37 条唤醒词／8 条命令。
- ⚠️ **chef 今天说一句 help 就会建库**（票 1 实测）：`cmd_read.ts:98-99` 在 `:327` 的 help 分支**之前**就开库，实测建出 `chef_data.db` 282,624 B。票 7 必须把 HELP 分支挪到开库之前。
- ⚠️ **落盘管线的消费者实测 2 家不是 3 家**（跨技能 import 0 处）⇒ #147 合流触发点第 1 条在动手前是「**即将**命中」；维护者 2026-09-12 裁 **乙** 之后即为「命中」，收口走票 13。
- `resolveDbDir()` 无默认值、缺 `SKILLS_DB_PATH` 即抛（`packages/skill-chef/src/fetch/paths.ts:10`）；另有测试隔离守卫 `assertWritablePath`（非 tmp 路径写库须 `CHEF_FORCE_PROD=1`）——**票 7／票 8 的端到端验收要过这道守卫**。
- ⚠️ **`packages/skill-chef/SKILL.md` 现在没有 frontmatter**（首行是 `# 私家大厨（chef）SKILL`），`packages/skill-chef/package.json` 的 `files` 也**不含 `SKILL.md`**（只有 `dist` ＋ `templates/*.html`）。这两处是 #150 在 bill 上实测出的同一对断链点：缺 frontmatter → skills-cli「首行须 `---` 且含 `name`＋`description`，缺任一即整包跳过」→ **DSH 里根本看不到这个技能**；缺 `files` 条目 → 装上也只有 `dist`／`templates`，提供方读不到说明面 → `list` **静默返空**。归票 10 修。

### 插件侧装机的地雷与运维禁令（2026-09-12 票 10 实测，票 10／11 的前置）

- ⚠️ **地雷**：`packages/plugin-chef/package.json` 声明了 `dsh.client.platform === 'web'`，但它的 `dist/client.js` 是 **tsc 直出的裸 ESM**（831 B，首行注释、**无 `window.__ModuleLoader__.load` 注册头**）。#150 亲历的真事故：DSH 把所有插件客户端拼成**一条**普通 `<script>`，一处 ESM 语法错 → 整条不执行 → **所有插件都注册不上** → 页面 `Failed to load plugins`、**整个 web GUI 起不来**。故**「装进 web profile」之前必须先把 chef 的客户端产物打成 loader 工厂包**（照 bill：`tsdown.config.ts` ＋ `tsconfig.client.json` ＋ `build:host && build:client` ＋ `tsdown@0.22.14`；宿主不得再导出 `./client.js` 的值）。**这不是可选项，是票 10 的前置条件。**
- ⚠️ **守门回路**：`node --test test/client-bundle-48.test.mjs` 自动发现所有声明 `dsh.client.platform === 'web'` 的包。本图执行前基线＝**9 例红**，逐包 3 例：`dsh-chef` 3 红（本图范围，票 10 修）、`dsh-home-ilife` 3 红、`dsh-schedule-ilife` 3 红（**两者出本图范围**，它们没装进任何 profile 故不是现行地雷）。**动插件面前先跑这道门。**
- ⚠️ **运维禁令四条**（票 10 审查 A 席点出、编排方复核）：
  1. **改 `packages/plugin-chef/src/client.ts` 后一律跑 `npm run build:client`（tsdown），绝不单跑 `tsc -b`／`build:host`。** 单跑 `tsc -b` 会用**裸 ESM 覆写 `dist/client.js`、当场毁掉 `window.__ModuleLoader__.load` 注册头**，装了这个插件的 profile 下次启动即崩。
  2. **不要为了「刷新」再跑 `dsh plugin --profile web install`。** 现状是「手工 Junction ＋ pnpm 部分接管」的混合态，install 会再次改指方向。要刷新技能内容，改仓库即可——链接位都指向仓库包。
  3. **不要为了让 `snapshot:check` 变绿去跑 `pnpm snapshot`。** 它现在**红**，但已两次独立复算证实是**预存**：sha 只由 `ilife-skills/package.json` version ＋ `combos.yaml` ＋ `present.ts` 三源算出；`git show HEAD:` 逐源重算＝`932e7b250d278d50`（与快照文件逐字相同），工作树＝`ef9b16473d03cf19`（因**他人**未提交改动偏移）。重写快照会把别人的改动写进去。
  4. **回滚卡要用先补第 4 行**：票 10 的 install 新建了**四个**链接位——profile 的 `node_modules/skill-chef`、profile 的 `node_modules/dsh-chef`、profile 的 `.dsh-module-fallback/node_modules/skill-chef`、`~/.agents/skills/skill-chef`（报告原回滚块只 `rmdir` 三个，漏了 `dsh-chef`，已补）。

### 新代码架构规则（`docs/agents/structure.md` 五条铁律 ＋ 必报五步）——本图的落地尺度

1. 新增／改动的 HELP 相关件，目录名取自 **HELP 一级分组**（对私家大厨＝票 2 对账表里那 10 个域的英文名；先例 `docs/skills/skill-calorie/t179-180-structure-design.md`）；
2. 被碰到的旧件**就地摆正**，不顺手扩大范围；
3. 每张写代码的票：第一步「影响清单」与第二步「结构设计」**先报用户点头**再动手；超告警线当场报「已超线，需要根据规则进行重构。」；交付时报第五步「交付对账」（唯一机械验收点）；
4. **整包按 HELP 一级分组重排不在本图内**（另立票）。

- 现状缺口（已实测）：`packages/skill-chef/src/` 一级目录 5 个里 4 个是工种／自造层名（`cli`／`fetch`／`policy`／`render`，只有 `help/` 站得住）；18 个源文件里 11 个按工种／角色起名。全部属「整包重排」那张票。
- **chef 的 HELP 一级分组名单**：票 2 已交出 **10 域中英名对照表**（域 key 权威出处＝老件十份域文件的文件级 `domain.key`：`cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`；两处词形不一致已标注，以域文件为准）。
- **告警线**：`packages/skill-chef/` 今天**没有行数告警线**（无 `AGENTS.md`）。本图取 **350 ＋ LF 口径（只数 `\n`）**，写进 `packages/skill-chef/AGENTS.md`（该文件今天不存在，`#236` 要判要不要一并建）。按此实测超线 2 个：`src/fetch/db.ts` **LF 451**、`src/cli/cmd_read.ts` **LF 388**；两件都在本图范围内被碰到，票 6／7 开工前须当场报「已超线，需要根据规则进行重构。」
- **解冻**：chef 现在在 `tooling/check-boundaries.mjs` 的 `SKILLS_BASE_FROZEN` 名单里（`['skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife']`），要用共享 help 模板必须先移出。移出＝数组里删掉 `'skill-chef'` 一项（两半断言都由这个数组派生，一处改同时解除）＋ 照 bill 先例在 `:30-36` 的注释里补记移出理由。`pnpm snapshot:html:check` 与 `snapshot:check` 已实测全绿，移出名单本身不动快照。

- **用词纪律**：写正文与文档一律照 `docs/agents/wording.md`（不说「壳」，说「help 模板」；`chef.help.lookup` 这类叫「命令」，不叫「键」）。
- **文档与产出落点**：代码与产物落 `packages/skill-chef/`，文档落 `docs/skills/skill-chef/`。

## 计划（任务清单）

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引 -->

| 序 | 票 | 类型 | 被谁阻塞 |
|---|---|---|---|
<!-- PLAN-ROWS-START -->
| 1 | [私家大厨HELP（1/11）调查：饼干记账的 HELP 交付实现逐件读懂 → 私家大厨照抄清单](https://github.com/FeatherHunter/ilife/issues/209) | research | — |
| 2 | [私家大厨HELP（2/11）调查：内容资产对账（老 10 域／33 组／48 场景 ↔ 新表 37 条唤醒词／8 条命令）](https://github.com/FeatherHunter/ilife/issues/210) | research | — |
| 3 | [私家大厨HELP（3/11）调查：通用 help 模板的注入契约＋私家大厨专属取值](https://github.com/FeatherHunter/ilife/issues/211) | research | — |
| 4 | [私家大厨HELP（4/11）决策：命名落盘管线的归属＋缺省出口口径](https://github.com/FeatherHunter/ilife/issues/212) | grilling | [票 1](https://github.com/FeatherHunter/ilife/issues/209) |
| 5 | [私家大厨HELP（5/11）内容资产入库：老骨架 → 仓内 typed const](https://github.com/FeatherHunter/ilife/issues/213) | task | [票 2](https://github.com/FeatherHunter/ilife/issues/210) ＋ [票 12](https://github.com/FeatherHunter/ilife/issues/236) |
| 6 | [私家大厨HELP（6/11）渲染接线：5 项＋三块可选内容 → 通用 help 模板](https://github.com/FeatherHunter/ilife/issues/214) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/209) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/211) ＋ [票 12](https://github.com/FeatherHunter/ilife/issues/236) |
| 7 | [私家大厨HELP（7/11）出口与命名落盘：缺省＝HELP 文件，速查走显式参数](https://github.com/FeatherHunter/ilife/issues/215) | task | [票 4](https://github.com/FeatherHunter/ilife/issues/212) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/214) ＋ [票 12](https://github.com/FeatherHunter/ilife/issues/236) ＋ [票 13](https://github.com/FeatherHunter/ilife/issues/237) |
| 8 | [私家大厨HELP（8/11）锁：CLI 级用例（真 spawn 出口）](https://github.com/FeatherHunter/ilife/issues/216) | task | [票 7](https://github.com/FeatherHunter/ilife/issues/215) |
| 9 | [私家大厨HELP（9/11）SKILL.md 说明面](https://github.com/FeatherHunter/ilife/issues/217) | task | [票 7](https://github.com/FeatherHunter/ilife/issues/215) |
| 10 | [私家大厨HELP（10/11）插件侧最小装机（技能提供方＋DSH profile；收窄 #57）](https://github.com/FeatherHunter/ilife/issues/218) | task | — |
| 11 | [私家大厨HELP（11/11）真机端到端＋肉眼终审](https://github.com/FeatherHunter/ilife/issues/219) | task | [票 8](https://github.com/FeatherHunter/ilife/issues/216) ＋ [票 9](https://github.com/FeatherHunter/ilife/issues/217) ＋ [票 10](https://github.com/FeatherHunter/ilife/issues/218) |
| 12 | [私家大厨HELP 结构设计：新件住哪（必报五步第一／二步，先报用户点头）](https://github.com/FeatherHunter/ilife/issues/236) | task | — |
| 13 | [私家大厨HELP（13/13）共用件 saveHtmlFile：新建包 ＋ 卡路里／记账／大厨三家改成走它](https://github.com/FeatherHunter/ilife/issues/237) | task | — |
<!-- PLAN-ROWS-END -->

**此刻的 frontier**：**票 5（`#213`）／票 6（`#214`）／结构设计闸门（`#236`，待用户点头）**。票 5／票 6／票 7 被 `#236` 阻塞；票 7 另被票 6／票 13 阻塞（票 4 已裁并关闭）。**票 13（`#237`）无阻塞，可直接开工**（它是共用件本身，不依赖 chef 的内容资产）。

## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

- [票 1 调查：饼干记账的 HELP 交付实现逐件读懂 → 私家大厨照抄清单](https://github.com/FeatherHunter/ilife/issues/209) — 交付 `t1-bill-recipe.md`（120,846 B／964 行）。5 件最小链（内容资产 → 渲染接线 → 命名落点通式 → 独占落盘点 → 出口分派）；8 件必改（**下界**，另含 `check-boundaries.mjs` 与 `package.json`）／6 件不抄。两条硬事实：**chef 今天说一句 help 就会建库**（`cmd_read.ts:98-99` 在 `:327` 的 help 分支之前就开库）；**落盘管线的消费者实测 2 家不是 3 家** ⇒ #147 合流触发点第 1 条是「**即将**命中」。裁定 **`_N` 从 1 起步**（照老家 `align_08.py:52-65`）。
- [票 3 调查：通用 help 模板的注入契约＋私家大厨专属取值](https://github.com/FeatherHunter/ilife/issues/211) — 交付 `t3-template-contract.md`（114,692 B／818 行）。确认本图走 **A 路**（`assets/help-template.html` → `gen-help-shell.cjs` → `src/helpShell.ts`；出口 `base-paint/help-shell`，三家邻居同路）；注入形状是 `<script id="help-data">` 的整份 JSON，**不是**老家的 `window.__HELP__`；`meta_blocks` 与 `subtitle` 读了不渲染、`recommendations` 真渲染；**契约在仓内没有任何硬校验兜底**。页面结构预期＝**11 个底部 Tab**。
- [票 4 决策：命名落盘管线的归属＋缺省出口口径](https://github.com/FeatherHunter/ilife/issues/212) — **维护者 2026-09-12 裁 乙**：命名与落盘收成**共用位**，三家一起改成走它；对外函数名＝**`saveHtmlFile`**；参数只给三个（`dir`／`stem`／`html`），时间戳格式与「绝不静默覆盖」由共用件自己钉死。落盘位置改判 `<SKILLS_DB_PATH>/cook_html/help/`。据此开票 13（`#237`）。
- [票 10 插件侧最小装机（技能提供方＋DSH profile；收窄 #57）](https://github.com/FeatherHunter/ilife/issues/218) — 交付 `t10-install.md`（617 行）。**动手前拆掉「装未打包插件会炸掉整个 web GUI」的地雷**，并**结构性修掉复发路径**（`tsconfig.json` exclude `src/client.ts` ＋ 宿主断掉 `./client.js` 的类型引用）。`client-bundle-48` **9 红 → 6 红**；探针 67 模块／16,663,701 B／**行首 ESM 0 处**；**`snapshot:check` 红经两次独立复算证实为预存**。两席审查 7.5/10 ＋ 7.6/10，**共同结论：留着安全，不必回滚**。

> **尚未关账的两条（如实）**：① 票面「`~/node_modules` 走 Junction」**只做了一半**（实测是普通目录、无 `SKILL.md`，对照 `~/node_modules/skill-bill` 是 Junction）→ 转票 11；② **插件半尚未在当前 GUI 生效**（host 起于 00:39:56，`dsh-chef` 进 profile 在 11:27:39）——本会话技能目录出现 `skill-chef` 走的是 `~/.agents/skills/` **目录发现路**，**不是** `ctx.skills.registerProvider` ⇒ 票 11 必须重启后复验。

## Not yet specified

- **速查支的产物名与落点**：老家没有这一支（老技能只有一个 HELP），卡路里给了 `卡路里_速查台_<TS>.html`、记账给了 `饼干记账_速查表_<TS>.html`；私家大厨要不要分名、叫什么——归票 7。
- **那 4 条别名（`开始做菜`／`不想要`／`删掉`／`废弃`）与 6 条只在载荷不在文档的词**（`查看全部`／`首次使用`／`体检`／`批量改`／`备份`／`从已有派生新菜`）在 HELP 里的去留——票 2 对账表已出，等 `#236` 点头时一并看。
- **首次使用横幅（`init_banner`）的显隐口径**：老家是「DB 文件存在＝已初始化」；新仓要不要照搬、要不要「跑完不建库」——票 3 已给取值，等 `#236` 点头时一并看。
- **共用件的包名与落点**：`saveHtmlFile` 住哪个新包、叫什么名——**新建目录层级要用户点头**（`structure.md:88`），由票 13 的第一步连提议一起报。

## Out of scope

- 其余 5 个技能（卡路里／饼干记账／居家管家／作息／备忘）的 HELP 交付：本图只做私家大厨。（票 13 是**例外**：它按维护者 2026-09-12 的裁决把三家一起改成走共用件，属于本图目的地内钦定的跨技能收口。）
- 私家大厨其余场景页（过程型／结果型 HTML）与做菜模式页：本图只做 HELP。
- `packages/skill-chef/src` 整包按 HELP 一级分组重排（4 个工种目录名 ＋ 11 个文件名）：出本图目的地，另立票。
- 发布态（抬版本＋发版＋真 npm 安装验证）：出本图，风险留给发版票。实测缺口：`base-paint@0.3.0` 的 exports 没有 `./help-shell`，发布态会 `ERR_PACKAGE_PATH_NOT_EXPORTED`。
- 面板／侧栏的 HELP 入口、插件里「打开文件」的动作：属 #57 那条线。
- 「触发词投影器」（各技能触发词表未必与 bill 同形，其余技能复用本图配方时的投影件）：#143 已把它划出图外，应另起一图。

## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）

### 需求原话（2026-09-12）

```
/wayfinder
请帮我处理一个需求（严格遵循 wayfinder 技能规则）。
仓库（已自动填入当前工作区）：https://github.com/FeatherHunter/ilife

## 澄清
- [ ] 对目标 / 范围 / 偏好有假设时，先用 grilling 技能澄清，不默认

## 判断分类（先查仓库已有 wayfinder:map 和 issue，确认是否做过）
- [ ] 新增：全新需求 → 新建 map
  - [ ] 写出 map：Destination + Notes + plan
  - [ ] 先把该 map 的现有正文取下来存成文件（文件里必须保留 `## Destination` 一节），改好任务清单后再调 先 gh api repos/{owner}/{repo}/issues/{child} --jq .id 取子议题数据库 id，再 gh api repos/{owner}/{repo}/issues/{map}/sub_issues -X POST -F sub_issue_id={id} 建边；以 gh api repos/{owner}/{repo}/issues/{map}/sub_issues --jq length 校验计数与预期一致。阻塞关系建原生依赖边：gh api repos/{owner}/{repo}/issues/{child}/dependencies/blocked_by -X POST -F issue_id={阻塞它的那张票的数据库 id}；子票正文首行的 `Blocked by: #n` 只作降级兜底。
  - [ ] 关联到该 map 的每个 ticket 都由脚本建原生边并自己校验数量；仅当后端明确不支持原生边时才回退到任务清单 + Part of
  - [ ] 阻塞关系以脚本建的原生依赖边为准；正文里的 `Blocked by: #<n>` 行只作降级兜底
- [ ] 复用：这个需求之前已做过（已有 map / issue）→ 打开复用它，不重复建
- [ ] 直接实现：需求很小 → 建一个 issue 直接实现，不建大 map

## 自查（对检查清单做检查）
- [ ] 逐项核对上面每个 `- [ ]`：是否已落实、无遗漏；漏项补上，不跳过
- [ ] 校验：看关联脚本回包的 expected 与 actual 是否一致（对不上脚本会非零退出，不要当成成功），且面板列表的 `closed/total` 不为 0/0（有子票时）
- [ ] 结束前按进度契约更新（## 进度：N% + 下一步；95% 须写明待确认什么，未确认不得 close）

## 正文格式（写/改 issue 正文时必须遵守）
- [ ] 用真实换行书写：每个 `## 章节` 独占一行，段落间留空行
- [ ] 禁止字面 \n 转义（不要把换行写成 \n 两个字符）、禁止正文以 BOM（\ufeff）开头
- [ ] 写回 issue 正文时以文件方式提交（文件内为真实换行），不要内联转义字符串
- [ ] 正例：`## 进度：90%` 独占一行，空行后接 `下一步：xxx`（反例：`## 进度：90%\n下一步：xxx`）
```

```
需求描述：调查卡路里HELP HTML开发的MAP和饼干记账开发HELP HTML的MAP。要求本次任务开发私家大厨的HELP HTML。深度学习之前成功的经验。不同之处在于本次开发会遵循新的代码架构规则。过程中所有文档和输出都放在skill-私家大厨下面。D:\2Study\StudyNotes\SKILLS\私家大厨 是老技能
```

### 一轮对齐回答原话（Q1–Q8＋Q4b，2026-09-12；一行对应一个问题）

```
下面回答一行对应一个问题：
A
A 
照居家：老骨架为准，新表多出的补进对应域 
四条，照居家
350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md
只做私家大厨 ＋ HELP HTML
有执行：不只出决定，还要交出能跑的东西
[Q7命名落盘管线的归属 ＋ 缺省出口口径]-Q7问题没听懂是什么决策
A ·docs/skills/skill-chef/
```

**逐条对照**（Q1／Q2／Q3／Q4／Q4b／Q5／Q6／Q7／Q8 顺序）：

| 题 | 原话 | 定案 |
|---|---|---|
| Q1 判定口径 | `A` | ①明确拿到 help HTML 文件 ②用现成通用 help 模板渲染，不与老件逐字比对 ＋ 肉眼终审「过」 |
| Q2 一级分组 | `A` | 用那 10 个域做一级分组，48 条逐条归域 |
| Q3 内容骨架 | `照居家：老骨架为准，新表多出的补进对应域` | 同文字 |
| Q4 新规尺度 | `四条，照居家` | 四条全取，整包重排另立票 |
| Q4b 告警线 | `350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md` | 350 ＋ LF，落 `packages/skill-chef/AGENTS.md` |
| Q5 范围 | `只做私家大厨 ＋ HELP HTML` | 同文字 |
| Q6 交货 | `有执行：不只出决定，还要交出能跑的东西` | 同文字 |
| Q7 管线归属＋缺省口径 | `[Q7命名落盘管线的归属 ＋ 缺省出口口径]-Q7问题没听懂是什么决策` | 已重新解释；**2026-09-12 复裁：乙 ＋ 函数名 `saveHtmlFile`**（见下节） |
| Q8 文档落点 | `A ·docs/skills/skill-chef/` | `docs/skills/skill-chef/` |

### Q7 三轮往返（2026-09-12，verbatim）

**第一轮（落盘位置改判）：**

```
Q7 放在 环境变量DB 下的目录 名为 cook_html目录下的help目录下

你说的 搬到公共区让三家共用 我感兴趣，但是不确定如何做到每个技能有自己的自定义？通过参数实现吗？
```

**第二轮（钉死项要变成能力）：**

```
钉死（函数自己的判断）提供能力：
1. 是否开启自动递补
2. 支持复用，比如有一天不想生成那么多help html 则是复用模式。发现已经有了直接返回
3. 还有其他的你想想

此外你举例 各个技能的help html要存放 是如何传入参数的？各个场景的html文件又是如何传入参数调用的？
```

**第三轮（定案）：**

```
saveHelpFile -- 这个名字不好。叫 saveHtmlFile 感觉更好。我们用乙（建共用件，推荐）
```

**定案一（落盘位置）**：`<SKILLS_DB_PATH>/cook_html/help/`——把老目录 `CookHub/` 换成 `cook_html/`（与 `calorie_html/`／`biscuit_accountant_html/`／`home_manager_html/` 同形），`help/` 子目录保留；文件名主体 `私家大厨_HELP` 与通式 `_N`（**从 1 起步**）不变。

**定案二（管线归属）**：取 **乙**——命名与落盘收成**共用位**，卡路里／饼干记账／私家大厨三家一起改成走它。归票 13（`#237`）。

**定案三（函数名与形状）**：对外名 **`saveHtmlFile`**（用户裁「saveHelpFile 这个名字不好」）。参数只给调用者能给的三项 —— `dir`／`stem`／`html`；**时间戳格式与「绝不静默覆盖」由共用件自己钉死**（若把它们也做成参数，它就只剩 `fs.writeFile` 包一层，正是铁律五点名的「白占一层的转发包装」）。

**定案四（`onExists` 四态 ＋ 能力清单）**：用户点名「是否开启自动递补」与「复用模式」，收敛为 `onExists`＝`succession`（缺省）／`reuse`／`overwrite`／`fail`。⚠️ `reuse` 的判据**不能按文件名**（时间戳到秒，两次跑几乎不可能同名，等于没做），须按 `byDay` 或 `byContent`。另建议一并做**文件名安全化** `sanitize(stem)`（Windows 非法字符与长度上限；场景页一带用户输入就必须有）与**写后回读校验**（回执的 `bytes` 必须是实际落盘值）。可选开关 `files` 多份／`dryRun`／`keepLast: N`。**不做**原子写。
