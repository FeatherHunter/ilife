# 旧版共享层 v1.30 签名清单（只读取证 · 搬清单不搬实现）

- 取证对象：`D:\2Study\StudyNotes\SKILLS\公共组件`（component-contract **v1.30**，26 项能力口径）
- 取证方式：只读旧版文档 + 注入器 + 资产目录清单；**未修改任何旧版文件**；未读 `卡路里\.个人笔记不允许参考`
- 用途：裁决 B1（按新架构重写；v1.30 控件签名当验收清单逐条对照）的**对照清单**
- 边界声明：本文件只抽清单，**不含**「新版有/无」判定；不含旧实现代码逻辑
- 证据路径缩写：
  - `contract` = `docs/component-contract.md`
  - `README` = `README.md`
  - `SKILL` = `SKILL.md`
  - `inj` = `injector.py`
  - `scene` = `docs/scene-data-contract.md`
  - `helptpl` = `docs/help-template-contract.md`
  - `schema` = `docs/scene_data.schema.json`
  - `CL` = `CHANGELOG.md`
  - 资产 = `assets/base.js` / `assets/base.css` / `assets/charts.js` / `assets/help_template.html`

---

## 0. 资产总表

| 路径 | 大小（bytes） | 角色 |
|---|---|---|
| `README.md` | 12332 | 使用手册 v1.2：接管线 6 步 / 占位符规范 / payload 信封 / 复制三件套 / 新控件 / toast / HELP 参数化 / 验收清单模板 |
| `SKILL.md` | 4123 | Base Skill 定义：触发词 / 资产清单 / 占位符契约 / 注入器用法 / 控件库 P0-P1.5 概览 |
| `CHANGELOG.md` | 42838 | 版本变更记录（契约 §8 载体）；v1.30 条目在 L5-L13 |
| `injector.py` | 14849 | 注入器实现（CLI + 硬拦截 + JS/CSS/图表注入 + payload 校验 + HELP 模式） |
| `assets/base.js` | 46892 | 控件库 JS 唯一真相源（P0 守卫组 / copyText / toast / buildDataText / buildLogText / actionBar / 新控件 / smartSelect） |
| `assets/base.css` | 17589 | token A 组 + 全部控件样式唯一真相源 |
| `assets/charts.js` | 67564 | 图表组件（7+1 接口：bar/line/donut/progress/combo/sparkline/gauge/scatter） |
| `assets/help_template.html` | 40927 | 参数化 HELP 模板（Base 资产 · 单一真相源） |
| `docs/component-contract.md` | 52010 | **冻结接口契约 v1.30**（§0-§9；本清单主源） |
| `docs/help-template-contract.md` | 6807 | 参数化 HELP 模板契约 v1.2（模板结构 / 注入参数 / 文件名 sanitize / 渲染流程） |
| `docs/scene-data-contract.md` | 7264 | 统一 scene_data 契约 v1（HELP 页对外参数人读版） |
| `docs/scene_data.schema.json` | 4818 | 同契约机读版（draft-07） |
| `docs/examples/help_example_data.json` | 12228 | 示例数据（覆盖 meta_blocks/init_banner/待开发/可编辑字段） |
| `docs/reviews/*.html` | 74354 等 9 个 | 历史验收演示页（归档物，术语可能滞后，**不作为签名来源**） |
| `tests/test_components.py` | 151422 | 控件函数守卫测试（本次未逐条抽取，见 §6 缺口） |
| `tests/test_injector.py` | 11728 | 注入器守卫测试 |
| `tests/test_help_template.py` | 10398 | HELP 模板守卫测试 |
| `tests/test_scene_data_contract.py` | 8997 | scene_data 契约守卫测试 |
| `.scratch/*` / `docs/reviews/*` | — | 历史中间物（示例页/拍板页/烟测脚本），非契约来源 |
| `iso_db/*` | — | 与共享层契约无关（cwd sentry 插件） |

---

## 1. 逐节签名清单

### §3 占位符标准（`contract:64-75`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §3 | `<!--INJECT-DATA-->` | `<!--INJECT-DATA-->`；数量规则「**必须恰好 1**」 | 数据注入点（payload JSON）；缺失/重复 → 渲染失败报错 | contract:68, contract:73 |
| §3 | `<!--SHARED-HELPERS-->` | `<!--SHARED-HELPERS-->`；「**必须恰好 1**（硬拦截）」 | 公共 JS 注入点（base.js）；缺失/重复 → 渲染失败报错 | contract:69, contract:73 |
| §3 | `<!--SHARED-CSS-->` | `<!--SHARED-CSS-->`；「**必须恰好 1**（v1.2 新增，硬拦截）」 | 公共 CSS 注入点（base.css）；缺失/重复 → 渲染失败报错 | contract:70, contract:73 |
| §3 | `<!--CHARTS-HELPERS-->` | `<!--CHARTS-HELPERS-->`；「0 或 1（v1.3 正式版）」 | 图表组件注入点（charts.js，`--charts` 参数） | contract:71 |
| §3 | `<!--NO-SHARED-->` | 无显式签名（散文条款）。原文摘录：「确无公共 JS/CSS 需求的模板（如纯静态展示页）必须**显式声明** `<!--NO-SHARED-->`（白名单式：缺省 = 必须注入）。」 | 豁免通道；与 SHARED 占位符互斥；不得用「注释掉占位符」隐式豁免 | contract:75 |
| §3 | 硬拦截语义 | 无显式签名（散文条款）。原文摘录：「INJECT-DATA 缺失/重复、SHARED-HELPERS 缺失/重复、SHARED-CSS 缺失/重复 → 渲染失败报错（防漂移机制）。」 | 校验失败即拒绝渲染 | contract:73 |

### §4 payload 信封契约（`contract:77-107`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §4 | 信封顶层 | `{ "status": "ok", "message": "(可选，失败时必有)", "data": { ... } }` | `status` 必填（值 `'ok'`）；`message` 可选，失败时必有 | contract:82-84, contract:105 |
| §4 | `data.meta` | `{ "command_cn": "操作中文名", "occurred_at": "本地时间", "skill_name": "技能中文名(可选, buildDataText 用)", "wake_word": "(可选)", "skill_version": "(可选)" }` | 必填：`command_cn` / `occurred_at`；可选：`skill_name`（buildDataText 用）/ `wake_word` / `skill_version` | contract:86-92, contract:105-106 |
| §4 | `data.scene` | `{ "scene_id": "(可选)", "snapshot": { "title": "...", "summary": [...], "sections": [...] }, "buttons": [ { "label": "...", "text": "...", "kind": "primary|red" } ] }` | `data.scene` 必填（对象）；`scene_id` 可选；`buttons[].kind` 枚举 `primary|red` | contract:93-97, contract:105 |
| §4 | `data.copy_log` | `{ "thinking": "...", "data_structure": "...", "call_chain": "...", "timestamp": "...", "exception": "..." }` | 6 段日志数据源；位置 = `data.copy_log`（顶层，兼容 `data.scene.copy_log`——base.js 两层都读） | contract:98, contract:103 |
| §4 | `--strict-payload` 校验 | 无显式签名（散文条款）。原文摘录：「注入器 **payload 结构校验**（`--strict-payload`）：缺必填字段 → error；关闭时仅 json 合法性校验（兼容存量技能过渡）。」 | 严格模式缺必填 → error；非严格仅校验 JSON 合法性 | contract:107 |

### §5 P0 冻结签名（`contract:109-120`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §5 | `esc` | `esc(s)` | 字符串→转义 HTML；防 XSS | contract:113 |
| §5 | `arr` | `arr(v)` | 任意→数组；安全数组访问 | contract:114 |
| §5 | `val` | `val(v)` | 任意→HTML；null/空显示「未填写」 | contract:115 |
| §5 | `yes` | `yes(v)` | 布尔→徽章；通过/未通过 | contract:116 |
| §5 | `validate` | `validate(p)` | payload→`{ok,msg}`；数据守门（`status==='ok'` + `data` 是对象） | contract:117 |
| §5 | `_fbCopy` | `_fbCopy(s)` | 字符串→bool；execCommand fallback（内部） | contract:118 |
| §5 | `copyText` | `copyText(s, opts?)` | 字符串→void；v2 语义：clipboard + fallback + 双 toast，**不改按钮文字**；`opts.silent` 可静默；v1.10（#328）新增 `opts.toast` 自定义文案 + `onOk`/`onFail` 回调（详见 §6.8） | contract:119 |
| §5 | `toast` | `toast(msg, detail?, options?)` | 字符串→void；通用提示控件（v1.2 增强，见 §5.1） | contract:120 |

### §5.1 toast 通用提示控件（v1.8 堆叠模式 · #304 · 向后兼容）（`contract:122-141`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §5.1 | `toast` | `toast(msg, detail?, {`<br>`  icon: 'copy'|'ok'|'warn'|'danger'|'info'|emoji,`<br>`  badge: { text: '成功', type: 'ok'|'warn'|'danger' },`<br>`  actions: [{ label: '撤销', onClick: fn }],`<br>`  count: '5 条',`<br>`  lines: ['多行', '详情'],`<br>`  code: '错误堆栈...',`<br>`  timeout: 4500,`<br>`  maxStack: 5,`<br>`})` | 选项语义：`icon` 内置图标库或自定义 emoji（默认 `'copy'`=📋）；`badge` 标题右侧状态徽章；`actions` 快捷操作（最多 2 个）；`count` 轻量计数；`lines` 富详情多行；`code` 富详情代码块；`timeout` 自动消失时长（默认 4500）；`maxStack` 堆叠上限（默认 5；栈容量 = 栈内各 toast maxStack 最大值） | contract:124-135 |
| §5.1 | 向后兼容 | `toast(msg, detail)` 不带 options | 完全等价 v1.1 行为（调用方零改动） | contract:137 |
| §5.1 | 堆叠模式 | 无显式签名（散文条款）。原文摘录：「同屏最多 N 条同时可见（N 默认 5）；老上旧下（新 toast 贴屏幕底部出现，旧的向上顶，间距 8px）；超 N 挤掉最旧（FIFO）；≤820px 视口上限自动收窄为 3；单条独立计时消失。」 | 队列/容量/视口收窄/独立计时 | contract:138 |
| §5.1 | 无障碍 | `role="status" aria-live="polite"` | ARIA 属性恒定 | contract:139 |
| §5.1 | 三态文案 | 「已复制/粘贴给 AI · 复制失败/长按选择文本手动复制 · 请先勾选…」 | 08 表恒定文案 | contract:140 |
| §5.1 | 样式 | 无显式签名（散文条款）。原文摘录：「样式：Base 内部注入（深色毛玻璃 + 📋 + 知道了按钮 + ≤820px 全宽），技能零样式。」 | 样式归 Base，技能零样式副本 | contract:141 |

### §6.1 snapshot 结构化接口（v1.2 核心 · 领域无关）（`contract:145-166`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.1 | `buildDataText` | `buildDataText(p, format?) → 人类可读文本` | payload→人类可读数据文本 | contract:148 |
| §6.1 | `buildLogText` | `buildLogText(p, format?) → 6 段日志文本` | payload→6 段日志文本 | contract:149 |
| §6.1 | snapshot schema | `snapshot = { "title": "场景中文名", "summary": ["记录 5 条 · 覆盖 8h30m"], "sections": [ { "heading": "分类统计", "rows": ["睡眠 7h30m", "工作 2h"] } ] }` | title 标题（Base 输出头时用）；summary 关键指标行（行数不限）；sections 明细分节（节数不限，每节 heading+rows） | contract:154-160 |
| §6.1 | 行脱敏 | `row` 可为字符串或 `{ text: "密码", sensitive: true }` | 敏感字段复制时输出 `****` 并提示 | contract:162 |
| §6.1 | `format` 参数 | `'text'`(默认,人类可读) \| `'json'` \| `'csv'` | v1.2 新增；08 规范 §3 复制数据格式选择 | contract:163 |
| §6.1 | 结构校验 | 无显式签名（散文条款）。原文摘录：「title 非空字符串 + summary 数组 + sections 数组 + 每节含 heading/rows → 缺失/类型错 → **渲染失败报错**（Q7 用户拍板：违规直接报错）。」 | 违规直接报错 | contract:164 |
| §6.1 | 输出头 | `【技能名 · 操作】` + 场景/时间行 + summary 行 + sections 分节 | buildDataText 输出结构 | contract:165 |
| §6.1 | 6 段日志 | ①场景标识 ②AI 思考链 ③数据结构 ④调用链 ⑤时间戳版本 ⑥异常 | buildLogText 段序；读 `data.copy_log`，缺省字段显示「(未知)」 | contract:166 |

### §6.2 复制按钮控件（v1.2 增强）（`contract:168-178`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.2 | `copyText` | `copyText(s, opts?)` | `opts.silent` 静默复制（不弹 toast）；v1.10：`opts.toast` 文案 + `onOk`/`onFail`（见 §6.8） | contract:171 |
| §6.2 | `actionBar` | `actionBar(p, extra?, opts?) → HTML` | 输出场景按钮（`scene.buttons`，kind: primary/red）+ 复制数据/复制日志 ghost 按钮（独立一行，08 规范硬标准） | contract:172, contract:175 |
| §6.2 | 复制数据/日志控件 | 无显式签名（散文条款）。原文摘录：「按钮文本可配（默认「复制数据」「复制日志」）、复制内容由使用方决定（走 buildDataText/buildLogText）、参数校验拦不规范传参。」 | 属 Base 控件（用户拍板） | contract:176 |
| §6.2 | `opts` 增强 | `{ preview: bool(点击前弹预览面板), formatMenu: bool(格式选择菜单), download: bool(导出文件) }` | 预览 / 格式菜单 / 导出 | contract:177 |
| §6.2 | 按钮规范 | 无显式签名（散文条款）。原文摘录：「≤3 色按功能区分；ghost = 白底+浅主色描边（38% 透明度）+主色文字胶囊、min-height 40px、12px 600、独立一行（v1.26 · #329 降权重；v1.28 透明度对齐拍板页）；偶数一行 2 个。」 | 08 规范按钮规范 | contract:178 |

### §6.3 新控件（P0+P1 · v1.2 新增）（`contract:180-191`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.3 | `formPrompt` | `formPrompt(fields, template)`；fields: `[{key,label,type:'text'\|'number'\|'select',options?,default?,placeholder?}]` | fields[] + prompt 模板→HTML；P0：页内参数表单 + 实时预览 + 空值拦截（#122 拍板：禁系统弹窗）；生成表单+实时预览+空值拦截+复制按钮 | contract:184 |
| §6.3 | `selectList` | `selectList(items, batchActions?, opts?)` | items[] → HTML；P0：勾选列表 + 批量操作 + 「本组已选 x/y」计数联动（2026-08-11 手机端拍板：文本不省略/批量进内容区/计数联动/激活色随语义）；支持单选行操作+全选；v1.9（#327）items[].widget 行内控件 + `opts.onSubmit`（详见 §6.7） | contract:185 |
| §6.3 | `confirm` | `confirm({title, detail?, danger?, onOk})` | 配置→对话框；P0：危险操作二次确认；`danger=true` 红按钮+警示文案；点确认→`onOk()`，取消/遮罩→关闭 | contract:186 |
| §6.3 | `foldBox` | `foldBox(title, contentHtml)` | 字符串→HTML；P1：折叠区（查看详情/原始数据），默认折叠，展开动画统一 | contract:187 |
| §6.3 | `statusBadge` | `statusBadge(status, text?)`；status: `'ok'\|'warn'\|'danger'\|'empty'` | →HTML；P1：状态徽章（语义色统一）；v1.4 加固：非法/未知 status 白名单降级 `empty`（防无样式徽章）；text 缺省用语义默认（成功/警告/失败/无数据）；text 经 `esc` 防 XSS | contract:188 |
| §6.3 | `emptyState` | `emptyState({icon?, text, hint?, action?})` | 配置→HTML；P1：空状态（图示+文案+下一步建议）；v1.4 加固：icon/text/hint 一律 `esc` 防 XSS；`action` = **受信 HTML 透传**（调用方负责其内容安全） | contract:189 |
| §6.3 | `errorReceipt` | `errorReceipt({message, retryPrompt?, data?, log?, payload?})` | 配置→HTML；P1：错误回执（08 规范 §6.1：错误描述+修正重试+复制数据/日志）；v1.4 加固：①`payload` = 数据信封（显式传入优先；兼容 `window.__hmPayload` 全局兜底）②`data`/`log` 字符串直传（显式优先，缺省从 payload 生成）③复制按钮渲染期生成文本存 `data-t`，onclick 仅 `copyText(this.dataset.t)`——零注入面 ④payload 缺 `scene.snapshot` 时容错：不渲染复制数据/日志按钮，控件不抛错 ⑤布局：修正重试 primary wide 独立一行 + 复制数据/日志 ghost 一行 2 个 | contract:190 |
| §6.3 | `smartSelect` | `smartSelect(inputEl, config)` → `{getState, getValue}` | `<input>` + config → 选择器实例；P1.5（v1.11 · #312）：字段级「复用优先·新建其次」选择器；详见 §6.9 | contract:191 |

### §6.4 样式 token A 组 + 控件样式（base.css）（`contract:193-197`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.4 | token A 组 | `--fg/fg2/fg3/bg/card/line/blue/blue2/soft/ok/shadow`（原文写「token A 组 12 变量不变」，但**只列举 11 个名**） | 全局语义 token，控件/图表/HELP 共用 | contract:195 |
| §6.4 | v1.2 新增控件样式 | 「toast 徽章/操作/计数、formPrompt 表单、selectList 勾选、confirm 对话框、foldBox、statusBadge、emptyState、errorReceipt」 | 新增控件样式清单 | contract:196 |
| §6.4 | 唯一真相源 | 无显式签名（散文条款）。原文摘录：「全部样式唯一真相源在 base.css；技能零样式副本。」 | 技能零样式副本 | contract:197 |
| §6.4 | 实现侧 token 定义（旁证，非契约新增） | `--fg: #1d1d1f; --fg2: #6e6e73; --fg3: #86868b; --bg: #f5f5f7; --card: #ffffff; --line: #d2d2d7; --blue: #007aff; --blue2: #0a63ce; --soft: #f5f8ff; --ok: #34c759; --shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06);` | base.css `:root` 实定义 11 个（与 §6.4 列举一致，与「12 变量」表述不一致） | base.css:12-23 |

### §6.5 图表组件（v1.6 · CHARTS-HELPERS · 全参数化）（`contract:199-241`）

接口签名（逐字）：

```js
charts.bar(el, items[, opt])        // 柱状图
charts.line(el, items[, opt])       // 折线图
charts.donut(el, items[, opt])      // 环形图
charts.progress(el, pct[, opt])     // 进度条
charts.combo(el, {bars, lines}, opt) // 柱线组合（v1.6 新增）
charts.sparkline(el, items[, opt])  // 迷你趋势卡（v1.6 新增）
charts.gauge(el, pct[, opt])        // 仪表盘（v1.6 新增）
```

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.5 | `charts.bar` | `charts.bar(el, items[, opt])` | 柱状图；数据形状 `items: [{label, value, color?}]` | contract:202, contract:211 |
| §6.5 | `charts.line` | `charts.line(el, items[, opt])` | 折线图；`value` 显式 null = 缺失断点（仅 line 支持，线段断开；`connectNulls:true` 时跨断点连线） | contract:203, contract:211 |
| §6.5 | `charts.donut` | `charts.donut(el, items[, opt])` | 环形图 | contract:204 |
| §6.5 | `charts.progress` | `charts.progress(el, pct[, opt])` | 进度条；`pct` 非数报错，超界收敛 0~100 | contract:205, contract:232 |
| §6.5 | `charts.combo` | `charts.combo(el, {bars, lines}, opt)` | 柱线组合（v1.6 新增）；`{bars:[{label,value}], lines:[{label,value}]}`（同长同 label） | contract:206, contract:233 |
| §6.5 | `charts.sparkline` | `charts.sparkline(el, items[, opt])` | 迷你趋势卡（v1.6 新增）；`color/width/height` · `showValue` · `format`（涨绿跌红） | contract:207, contract:234 |
| §6.5 | `charts.gauge` | `charts.gauge(el, pct[, opt])` | 仪表盘（v1.6 新增）；`label/color/size` · `format` · `animation`（pct 非数报错） | contract:208, contract:235 |
| §6.5 | `charts.scatter`（v1.25 · #337） | `charts.scatter(el, items[, opt])` | items `[{x, y, label?}]` 双数值坐标（非法 x/y 直接报错，空数组 → emptyState）；线性回归线（最小二乘，`regression:false` 关闭，`regressionColor` 缺省 `#ff3b30` 虚线）；Y 轴刻度复用 line 的 yTicks 机制（scatter 缺省 4 条）；X 轴标签 `labels: 'edge'/'all'/'none'`；`format`/`tooltip`（最近点命中）/`animation`（点淡入）/`height`/`color`/`dotSize`（缺省 9px · v1.28 实现）；双端自适应沿用 line 语义（≤720px 点 8px） | contract:216, CL:59 |
| §6.5 | 数据形状（统一） | `items: [{label, value, color?}]` | `value` 显式 null = 缺失断点（仅 line 支持）；其余非数字 → 结构校验报错 | contract:211 |
| §6.5 | 结构校验（v1.6 硬行为） | 无显式签名（散文条款）。原文摘录：「items 非数组 / 元素缺 label / value 非法 → **直接抛错**（对齐 Base v1.2「违规报错」）；空数组 → emptyState 联动（合法场景）。」 | 违规抛错；空数组走空态 | contract:212 |
| §6.5 | 空态联动 | 无显式签名（散文条款）。原文摘录：「空数组 → `emptyState`（存在则用之，否则内联兜底）；donut 合计为零同样走空态。」 | 空态复用 emptyState | contract:213 |
| §6.5 | `connectNulls`（v1.14 · #356） | `line` 可选参数，默认 `false` | `true` 时跨 null 断点连线——跳过缺失值直接连接相邻有效点，数据点仍只在有值日渲染，首尾 null 不向图外延伸，全 null 系列仍空路径；与 `smooth`/`step`/`area`/`series`/`avgLine` 正交可组合 | contract:214 |
| §6.5 | `yTicks`（v1.15 · #333） | `line` 可选参数，默认 `false`；数字 = 刻度数量（收敛 2-6） | 左侧刻度短线 + 刻度文字（HTML 覆盖层，不占位）；刻度值 = 共享 Y 域（含 6% padding，尊重 yMin/yMax）均分，文字走 `format`；首尾刻度贴边防裁剪；与 `series`/`grid:false`/`tooltip` 正交；不改 X 轴标签策略、无交互 | contract:215 |
| §6.5 | `grouped`（v1.24 · #339） | `bar` 可选参数 `grouped: true` | 复用 #336 多值结构（零新字段）：每列 N 根并排子柱（`.hm-c-gw` 包裹，宽度均分，gap 3px）；高度相对共享域；每子柱独立颜色（`item.color` 或 `colors` 色板）；`segNames` 图例；`showValues` 每子柱顶部数值标签；`tooltip:true` 按子柱命中；校验与 stacked 同源；与 stacked 互斥（同传时 stacked 优先）；缺省渲染逐字节不变 | contract:217 |
| §6.5 | bar 多值 item 结构（v1.23 · #336 定义 · #339 复用） | `items: [{label, values: [v1, v2, ...], color?}]` | values = 多段/多值数组，长度各 item 一致，值必须为数字，违规直接报错；`segNames: [段名...]` 图例/段名（缺省「段1/段2…」）；每段颜色 = `item.color` 或 `colors` 色板逐段取色 | contract:218 |
| §6.5 | `stacked`（v1.23 · #336） | `stacked: true`；`stackMode: 'percent'`（缺省）/ `'absolute'` | 段纵向堆叠；`percent` = 柱内合计 100%，`absolute` = 相对全局最大合计；柱顶显示合计值（showValues/format）；段级 tooltip；不参与 yMin/yMax（percent 恒 0-100%）；缺省（不传 stacked/grouped）→ 既有单柱渲染逐字节不变 | contract:218 |
| §6.5 | 小缺口三能力（v1.22 · #341） | ①items 每点 `anomaly: true` ②`highlightPoints: 'turns'\|'crossings'` ③`showValues: 'edge'` | ①该点染警示红（默认 `#ff3b30`，含光晕；缺省 false）②拐点（方向变化点，dy 符号反转，两端点不判）/交点（多序列线相交段，段两端差值符号反转即交，标记段右端点）→ 圈选环（`.hm-c-dot-hl`，缺省 null）③只标首尾有效点；`showValues: true` 密集数据相邻标签中心距 <26 viewBox 单位时跳过；三项缺省 → 既有渲染逐字节不变 | contract:219 |
| §6.5 | `fillBetween`（v1.21 · #338） | `line` 可选参数，默认 `null`；`fillBetween: {a, b, color?}` | a/b = `series[]` 索引（数字，越界/相同/非数字/两系列 items 长度不一致 → 直接报错）；两线之间半透明填充（透明度 = `areaOpacity`，绘制在折线路径之前）；任一序列该点 null → 该段断开不跨空填充；**不随 connectNulls 跨空**；一次一组填充；与 band/markLine/series 正交 | contract:220 |
| §6.5 | `markLine` 竖线（v1.20 · #340） | `markLine: {xValue: <items 索引或 label>, label?, color?}` | 渲染垂直虚线（贯穿绘图区）+ 顶部文字标注（缺省标注文字 = 该点 label，可 `label` 覆盖；线色 `color` 缺省 `#ff9500`）；标注贴边防裁剪（点落左右 18% 区域锚定内侧边缘，中间居中）；与既有 `{value}`（水平阈值）按字段区分，可同传分别渲染；既有 `{value}` 行为零变更 | contract:221 |
| §6.5 | `band`（v1.19 · #335） | `line` 可选参数，默认 `null`；`band: {hi: [], lo: []}` | 主序列（items / series[0]）置信带：hi/lo 与 items 等长（不等 → 直接报错），每点值可为 null 断点（任一侧 null → 该段断开不填充）；半透明填充（`fill-opacity 0.15`，绘制在折线路径之前）；hi/lo 值并入共享 Y 域计算（显式 yMin/yMax 优先）；ownScale 主序列时跟随自身域；不参与 tooltip/图例；与 yTicks/connectNulls/markLine 正交 | contract:222 |
| §6.5 | `markPoint`（v1.18 · #319） | `line` 可选参数，默认 `false`；`true` 或 `{index\|value, label?, color?}` | 在主序列（items / series[0]）指定点渲染高亮数据点（白边 + 阴影圈）+ 上方文字标注；`true`/缺字段 = 默认取主序列最大值点；`{index:n}` 按 items 索引（越界忽略不报错）；`{value:v}` 按值匹配首个点；`label` 覆盖标注文字（缺省 = 该点值走 `format`）、`color` 覆盖标注色（缺省 = 序列色）；标注贴边防裁剪（点落左右 18% 区域锚定内侧边缘，中间居中）；与 series/showValues/markLine/highlightLast 正交；不影响 tooltip/动画 | contract:223 |
| §6.5 | `series[].ownScale`（v1.17 · #334） | `series` 条目可选字段，默认 `false` | `true` 时该系列按自身 min-max（+6% padding，忽略 yMin/yMax）独立归一化 → 铺满图高；ownScale 序列**不参与共享域**（yTicks/网格/markLine 仍以非 ownScale 序列域为准）；`legend:true` 且存在 ownScale 序列时图例末尾追加「各指标独立刻度」注记（虚线样式）；与 yTicks/legend/tooltip/area 正交；单序列 ownScale 无行为差异；不做第三轴/对数轴，`combo.y2` 语义不动 | contract:224 |
| §6.5 | 全参数表 · `line` | `height/compact/width` · `color/lineWidth/dashed` · `smooth`（Catmull-Rom，点在线 · v1.30）· `showDots/dotSize/dotStyle` · `area/areaOpacity` · `labels('edge'/'all'/'none'/'select')` · `showValues/labelRotate`（`showValues:'edge'` 首尾标签 · v1.22）· `yMin/yMax/grid` · `format` · `tooltip` · `markLine{value,label}`（水平阈值 · v1.16）+ `markLine{xValue,label,color}`（竖线 · v1.20）· `markPoint`（峰谷标注 · v1.18）· `band{hi,lo}`（置信带 · v1.19）· `fillBetween{a,b,color}`（线间填充 · v1.21）· `highlightPoints:'turns'\|'crossings'`（圈选 · v1.22）· items 每点 `anomaly:true`（异常染红 · v1.22）· `step` · `animation` · `series[{name,items,color,dashed,smooth,area,ownScale}]`（ownScale=独立刻度 · v1.17）· `avgLine(n)` · `legend` · `highlightLast` · `onclick/ondrill` · `emptyText` · `connectNulls`（跨缺失断点连线，默认 false · v1.14）· `yTicks`（Y 轴刻度数量 2-6 / false 关闭，默认 false · v1.15） | 不传 = 默认 | contract:229 |
| §6.5 | 全参数表 · `bar` | `format` · `colors/singleColor` · `height/compact` · `labels('all'/'none'/'select')` · `showValues` · `yMin/yMax/grid` · `tooltip/animation` · `onclick` · `stacked`（堆叠柱 · v1.23）· `grouped`（分组双柱 · v1.24）· `segNames`（段名图例/tooltip）· `stackMode:'percent'\|'absolute'`（缺省 percent） | 不传 = 默认 | contract:230 |
| §6.5 | 全参数表 · `donut` | `format` · `colors` · `size/ringWidth` · `legend('right'/'bottom'/'none')` · `showPercent` · `centerLabel/centerValue` · `animation` | 不传 = 默认 | contract:231 |
| §6.5 | 全参数表 · `progress` | `color/gradient` · `height(轨道px)` · `showPct` · `animation`（pct 非数报错，超界收敛 0~100） | 不传 = 默认 | contract:232 |
| §6.5 | 全参数表 · `combo` | `{bars:[{label,value}], lines:[{label,value}]}`（同长同 label）· `barColor/lineColor` · `format` · `height` · `legend` · `animation` · `onclick` | 不传 = 默认 | contract:233 |
| §6.5 | 全参数表 · `sparkline` | `color/width/height` · `showValue` · `format`（涨绿跌红） | 不传 = 默认 | contract:234 |
| §6.5 | 全参数表 · `gauge` | `label/color/size` · `format` · `animation`（pct 非数报错） | 不传 = 默认 | contract:235 |
| §6.5 | 坐标唯一性 | 无显式签名（散文条款）。原文摘录：「容器**零 padding**，留白进 SVG viewBox——数据点 overlay 与折线共享同一坐标系，物理对齐（实测误差 <0.2px）；`vector-effect="non-scaling-stroke"` 防拉伸线宽变形。」 | 坐标唯一性硬约束 | contract:237 |
| §6.5 | 双端自适应 | ≤720px：柱标签两行、图例下沉（donut）、折线高度 150、数据点 8px | 手机独立 UI | contract:238 |
| §6.5 | 语义色 | 默认 token A 组（`var(--blue,#007aff)` 带 fallback）；donut 内置 10 色 Apple 语义色板；series 逐条取色板 | 颜色来源 | contract:239 |
| §6.5 | 自包含 | 本地 esc 兜底，可独立注入；样式自注入（`hm-charts-style`） | 不依赖 base.js | contract:240 |
| §6.5 | 白名单例外 | 卡路里 `weight_volatility_v2` canvas 留技能自营，走公共层 ISSUE 审批 | 唯一例外项 | contract:241 |

### §6.6 复合形态（v1.6 新增）（`contract:243-251`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.6 | `combo` | `combo`（签名见 §6.5：`charts.combo(el, {bars, lines}, opt)`） | 用途：柱=量 + 线=趋势/目标；H3 场景：每日摄入(柱)+累计趋势(线)、每周录入(柱)+均线(线) | contract:249 |
| §6.6 | `sparkline` | `sparkline`（签名见 §6.5：`charts.sparkline(el, items[, opt])`） | 用途：迷你趋势卡（无坐标轴 + 首尾值 + 涨绿跌红）；H3 场景：概览页每个分类一个小趋势 | contract:250 |
| §6.6 | `gauge` | `gauge`（签名见 §6.5：`charts.gauge(el, pct[, opt])`） | 用途：弧形进度 + 目标刻度；H3 场景：单指标达成（今日目标 80%） | contract:251 |
| §6.6 | 形态原则 | 无显式签名（散文条款）。原文摘录：「「无法统一的」不是形态参数，而是**组合**——新形态独立成组件，共享同一 token/空态/双端规则。」 | 组合优先，不堆形态参数 | contract:245 |

### §6.7 selectList 行内控件（v1.9 · #327）（`contract:253-290`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.7 | `items[].widget` | `widget?: { type: 'date' \| 'text' \| 'select', key: '读取时使用的字段键', label?: '控件标题', placeholder?: '占位提示', options?: [ '原始值' \| { value, label } ] }` | v1.9 · 单条目最多 1 个；`key` 缺省 `'w'+行号`；`label`/`placeholder` 走 esc；`options` 缺省渲染「请选择」占位（select 用） | contract:260-269 |
| §6.7 | 宽容渲染 | 无显式签名（散文条款）。原文摘录：「非法 `type` 降级 `text`；`key` 缺省 `'w'+行号`；`options` 元素可为字符串（value=label）或 `{value,label}` 对象。」 | 不报错降级 | contract:272 |
| §6.7 | 共存 | 无显式签名（散文条款）。原文摘录：「控件渲染在行内（`.sl-widget`），勾选/批量/计数全部照常；**计数联动只随勾选态，控件值变化不干扰**「本组已选 x/y」。」 | 行内控件与勾选/批量/计数共存 | contract:273 |
| §6.7 | 安全 | 无显式签名（散文条款）。原文摘录：「label/placeholder/option value+label 渲染一律 `esc`，零注入面。」 | 零注入面 | contract:274 |
| §6.7 | 读取接口 | `selectList(items, batchActions?, { onSubmit(selectedIds, values){} })` | v1.9 选定形态 = `opts.onSubmit` 等价形式，**非返回对象** | contract:279-281 |
| §6.7 | 触发时机 | 无显式签名（散文条款）。原文摘录：「任意批量操作按钮点击后触发（与按钮自身 `onClick` 并列调用；无勾选时与既有拦截一致，不触发）。」 | 触发条件 | contract:284 |
| §6.7 | `values` 形状 | `{ [id]: { [key]: value } }` | **全部行内值**：含未勾选条目；无 widget 条目不出现；未填统一归一 `null`（date/text 空输入、select 占位项） | contract:285 |
| §6.7 | id 键 | `id` 统一字符串键（与勾选 idList 一致，来自 DOM `data-id`） | 键类型约定 | contract:286 |
| §6.7 | 批量回调增强 | `batchActions[].onClick(ids, values)` | 第二参 `values` = **勾选条目对应**的行内值 `{ [id]: { [key]: value } }`（只读勾选条目；未填 → null 不报错；未勾选条目不参与）；旧回调只取第一参，零影响 | contract:288 |
| §6.7 | 样式 | `.sl-widget*` 走 token A 组（base.css v1.9），技能零样式副本 | 样式归属 | contract:290 |
| §6.7 | 非破坏性声明 | 无显式签名（散文条款）。原文摘录：「未声明 `widget` 的既有调用渲染输出与行为完全不变（守卫测试逐字节回归 outerHTML）。」 | 向后兼容 | contract:255 |

### §6.8 copyText 反馈钩子（v1.10 · #328）（`contract:292-312`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.8 | `copyText` 选项 | `copyText(s, { silent: true, toast: { ok: { msg: '已存剪贴板', detail: '发给 AI 执行', icon: '🎉' }, fail: { msg: '复制失败啦', detail: '请长按手动复制', icon: '😭' } }, onOk: function(){}, onFail: function(){} })` | `silent` = v1.1 既有：不弹 toast；`toast` = v1.10 新增：自定义反馈文案（缺省回落默认）；`onOk` = 复制成功（主路径或兜底）触发；`onFail` = 最终失败（剪贴板不可用且兜底失败）触发 | contract:297-305 |
| §6.8 | 文案覆盖规则 | 无显式签名（散文条款）。原文摘录：「`toast.ok/fail` 只覆盖提供的字段（`msg`/`detail`/`icon`），未提供字段回落默认——ok 默认 `已复制/粘贴给 AI`（无图标），fail 默认 `复制失败/长按选择文本手动复制` + `badge:{text:'失败',type:'danger'}`（失败徽章恒在，不可移除）。」 | 字段级覆盖 | contract:308 |
| §6.8 | 回调语义 | 无显式签名（散文条款）。原文摘录：「`onOk` 在复制成功（`navigator.clipboard` 主路径或 `_fbCopy` 兜底）必触发；`onFail` 在最终失败必触发；两者互斥。」 | 互斥必触发 | contract:309 |
| §6.8 | silent 组合 | 无显式签名（散文条款）。原文摘录：「`silent:true` 时不弹 toast，但回调仍触发（08 规范定制文案场景的标准做法：silent + 自定义乐观 toast + onFail 纠错）。」 | 静默仍回调 | contract:310 |
| §6.8 | 空串 | `copyText('')` 直接 return，无 toast 无回调（既有语义） | 空串短路 | contract:311 |
| §6.8 | 安全 | 文案经 `toast` 内部 `esc` 转义（既有） | 转义面 | contract:312 |
| §6.8 | 非破坏性声明 | 无显式签名（散文条款）。原文摘录：「未传新选项时行为与 v1.9 逐字一致（守卫测试断言 toast 文案）。」 | 向后兼容 | contract:294 |

### §6.9 smartSelect 选择器组件（v1.11 · #312 · 立项 #320）（`contract:314-354`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §6.9 | `smartSelect` | `smartSelect(inputEl, config) → { getState, getValue }` | 字段级「复用优先·新建其次」选择器；与 copyText/actionBar 同级 Base 组件，注入走 SHARED-HELPERS / SHARED-CSS 管线（入 base.js / base.css，注入器零改动）；非破坏性 | contract:316, contract:319 |
| §6.9 | `config` 形状 | `{ "options": [{"name": "美团", "disabled": false}, {"name": "支付宝", "disabled": true}], "inferred": "美团", "recommended_new": "美团月付", "initial": {"name": "美团", "source": "inferred"}, "texts": { "candTitle", "search", "newPlaceholder", "newButton": "＋ 新建", "emptyButton": "留空(不填)", "badgeInferred": "AI 推断", "badgeRecommendedNew": "AI 推荐·新建", "badgeExisting": "已有", "badgeHistory": "历史", "badgeCustom": "自定义", "cardSrc": { "inferred", "recommended_new", "existing", "history", "custom", "empty" } }, "theme": { "brand": "#123a63", "brandSoft": "#e9f0f7", "onBrand": "#ffffff", "deep": "#0b1f3b" } }` | snake_case，与数据契约 `form.selector.<fieldKey>` 对齐；`texts`/`theme` 外部注入（零领域词） | contract:324-337 |
| §6.9 | 行为契约（#307 形态定稿） | 无显式签名（散文条款）。原文摘录：「chips 平铺候选 + 顶部「已选卡片」（SVG ✓ 圆形图标 + 来源徽章）；初始选中优先级 = **AI 推断 > 历史预填 > AI 推荐新建 > 空**（`initial` 缺省时组件自行推导；无推断时默认选中「AI 推荐新建」项）；用户可改选已有 / 自定义新建 / 留空；**绝不静默填错**。」 | 另含：新建值以 chip 加入候选区（「自定义」徽章 + 选中态），重名自动选中已有项；相似提示组件内置；停用态划线置灰不可点；搜索过滤候选；主题色默认账本藏蓝 `#123A63`（CSS 变量每实例可覆盖） | contract:340 |
| §6.9 | 候选区折叠（v1.12） | `maxChips`（缺省 8；0/负数/非数字 = 不折叠） | 候选超阈值只显前 maxChips 个 + 「展开全部(N)」/「收起」按钮；初始选中项在折叠区时保可见；搜索输入全量过滤（跳过折叠）；搜索框内容跨渲染保持；展开态点选后保持展开；账户/账本等小候选集（<10 个）不受影响 | contract:341 |
| §6.9 | 降级 | 无显式签名（散文条款）。原文摘录：「`options` 缺省空数组 **且** 无 `inferred` / `recommended_new` / `initial` → 组件降级为普通输入（T4 决议：键空 → options 空数组 → 降级），输入值回填 `source=custom` / 空 `source=empty`。」 | 降级路径 | contract:342 |
| §6.9 | 回填协议 · `input.value` | `input.value` = 最终选中值（留空 = 空串） | 组件→上层通道 | contract:347 |
| §6.9 | 回填协议 · `input.dataset.source` | `input.dataset.source` = 来源（白名单） | 组件→上层通道 | contract:348 |
| §6.9 | 回填协议 · `input.dataset.new` | `input.dataset.new` = `'1'` = 选了新建（recommended_new/custom） | 组件→上层通道 | contract:349 |
| §6.9 | 回填协议 · 事件 | `change`（bubbles）每次选中触发；`smartSelect(el).getState()/getValue()` 可选 | 组件→上层通道；prompt 由上层 buildPrompt 自拼，组件零 prompt 知识 | contract:350, contract:343 |
| §6.9 | source 白名单 | `inferred \| recommended_new \| existing \| history \| custom \| empty` | 违规直接报错 | contract:352 |
| §6.9 | 守卫 | 无显式签名（散文条款）。原文摘录：「config 非对象 / options 非数组 / option 缺 name / disabled 非布尔 / inferred、recommended_new 非字符串 / initial 缺 name 或 source 不在白名单 / inputEl 非 `<input>` → `throw new Error('smartSelect 违规: …')`；类名全 `ss-` 命名空间（**封装纪律**，禁止裸类名 plain/ai/new/sel/dis/ic/nm/src/empty 等）；全部动态文本经 `esc` 零注入面；候选 chip 用 `<button type="button">`（无障碍 + 键盘可用）。」 | 结构校验违规直接报错（对齐 Base v1.2 原则） | contract:353 |
| §6.9 | 样式 | `.ss-*` 走 base.css（token A 组 + 主题 CSS 变量），技能零样式副本；手机 ≤820px 独立适配（新建行纵向、触控高度） | 样式归属 | contract:354 |

### §7 注入器接口（v1.3）（`contract:356-367`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §7 | CLI 用法 | `python injector.py <模板.html> --payload <数据.json> [--output <输出.html>] [--js <资产.js>] [--css <资产.css>] [--charts <图表.js>] [--strict-payload]` | 另含 `--help-template`（HELP 参数化模式，见 §3 节） | contract:359, inj:204-205 |
| §7 | 校验 | INJECT-DATA 恰 1 / SHARED-HELPERS 恰 1 / **SHARED-CSS 恰 1**（v1.2 新增）/ CHARTS ≤1 | 违规拒绝渲染 | contract:362 |
| §7 | 注入顺序 | SHARED(JS) → SHARED-CSS → CHARTS → DATA | 替换顺序固定 | contract:363, inj:104 |
| §7 | `--css` | base.css 注入点（缺省 = assets/base.css）；NO-SHARED 豁免时 CSS 同样豁免 | 缺省资产路径 | contract:364 |
| §7 | `--charts`（v1.3 正式化） | charts.js 注入点（缺省 = 不注入）；模板含 `<!--CHARTS-HELPERS-->` 时替换为资产内容 | 可选注入 | contract:365 |
| §7 | payload 校验 | json 合法性必校验；`--strict-payload` 时按 §4 信封结构校验 | 两档校验 | contract:366 |
| §7 | 输出 | 写文件 + 打印结果 JSON（status ok/error） | 成功/失败均打印 JSON | contract:367 |

### §8 版本与变更机制（`contract:369-376`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §8 | 版本号声明 | 「Base 资产带版本号（当前 v1.10），变更记入 `CHANGELOG.md`」 | 无显式签名；**注：此处「当前 v1.10」与文档版本 v1.30 不一致，见 §6 缺口** | contract:371, contract:1 |
| §8 | 破坏性变更 | 「**签名变更 = 破坏性变更**：必须全技能同步 + 一次性完成 + 变更记录；不允许「新签名 + 旧签名并存」跨版本漂移」 | 破坏性变更流程 | contract:372 |
| §8 | 非破坏性变更 | 「非破坏性变更（内部实现/样式细节）：可独立发布，CHANGELOG 记录」 | 独立发布 | contract:373 |
| §8 | ISSUE 前置 | 「任何变更先开公共层 ISSUE（总纲 09 §92），review 后实施」 | 变更前置流程 | contract:374 |
| §8 | v1.2 破坏性说明 | 「buildDataText/buildLogText 从「居家管家字段绑定」重构为「snapshot 通用结构」——**当前零消费方**（作息管家是第一个），重构零成本；未来居家管家迁移按 v1.2 接口传参」 | 历史破坏性变更记录 | contract:375 |
| §8 | v1.3 非破坏性说明 | 「新增 charts.js 资产（新增接口，既有接口零变更）——居家管家/饼干记账图表迁移属于 6 张技能重构票，迁移完成前技能内图表实现冻结」 | 历史非破坏性变更记录 | contract:376 |
| §8 | CHANGELOG 头声明 | 「**签名变更 = 破坏性变更**（必须全技能同步 + 一次性完成 + 本文件记录）;非破坏性变更（内部实现/样式细节）可独立发布。任何变更先开公共层 ISSUE（总纲 09 §92）。」 | 同 §8 口径 | CL:3 |

### §9 与既有规范的关系（`contract:378-383`）

| 节号 | 能力名 | 旧签名（逐字，含参数名与默认值） | 语义（输入→输出、副作用、失败行为） | 证据 |
|---|---|---|---|---|
| §9 | 08 规范 | 「**#248/08-HTML交互规范.md** = prompt 参数格式 / 复制数据日志 / 按钮颜色布局的规范本体（Base 对齐；用户提示「不一定都对」→ 落地时对抗式审查逐条验证）」 | 规范本体对齐关系 | contract:380 |
| §9 | T3 草案 | 「**T3 草案（#263）** = 本契约的盘点基础」 | 盘点来源 | contract:381 |
| §9 | 居家管家注入器范式 | 「**居家管家 render/__init__.py** = 注入器范式（迁移完成后退役，见 §2）」 | 注入器范式来源 | contract:382 |
| §9 | #269 试点拍板 | 「**#269 试点用户拍板** = v1.2 接口定稿依据（Grill 收口 2026-08-11：snapshot 结构化 / toast 通用化 / 复制按钮控件化 / 校验违规报错 / 新控件 P0+P1 / CSS 注入）」 | 定稿依据 | contract:383 |

---

## 2. 占位符标记全清单 + injector.py 对外接口签名

### 2.1 占位符标记（逐字，共 5 个）

| # | 标记（逐字） | 数量规则 | 用途 | 证据 |
|---|---|---|---|---|
| 1 | `<!--INJECT-DATA-->` | 必须恰好 1 | 数据注入点（payload JSON） | contract:68, inj:26, SKILL:39, README:69 |
| 2 | `<!--SHARED-HELPERS-->` | 必须恰好 1（硬拦截） | 公共 JS 注入点（base.js） | contract:69, inj:27, SKILL:40, README:70 |
| 3 | `<!--SHARED-CSS-->` | 必须恰好 1（v1.2 新增，硬拦截） | 公共 CSS 注入点（base.css） | contract:70, inj:28, SKILL:41, README:71 |
| 4 | `<!--CHARTS-HELPERS-->` | 0 或 1（v1.3 正式版） | 图表组件注入点（charts.js，`--charts`） | contract:71, inj:30, SKILL:43, README:73 |
| 5 | `<!--NO-SHARED-->` | 0 或 1（与 SHARED 互斥） | 豁免通道（白名单式） | contract:75, inj:29, SKILL:42, README:72 |

- 模板最小骨架（逐字，`README:77-86`）：`<script id="payload" type="application/json"><!--INJECT-DATA--></script>` + `<script>` 包 `<!--SHARED-HELPERS-->` + `<style>` 包 `<!--SHARED-CSS-->`
- 约定：「占位符必须放在独立 `<script>`/`<style>` 块内，勿与 `</script>`/`</style>` 字样混在资产注释里」（`README:63`）
- 资产内实际注入点：`help_template.html:195`（`INJECT-DATA`，容器 `id="help-data"`）、`:197`（`SHARED-HELPERS`）、`:200`（`SHARED-CSS`）；**help_template.html 内无 `<!--CHARTS-HELPERS-->`**（见 §6 缺口）

### 2.2 `injector.py` 对外接口签名（函数名 / 参数 / 返回 / 异常）

| # | 接口 | 签名（逐字） | 返回 / 异常 | 证据 |
|---|---|---|---|---|
| 1 | `validate_payload` | `def validate_payload(payload, strict=False)` | 返回 `(ok, msg)`；docstring：「payload 结构校验。strict=True 时校验信封必填字段。返回 (ok, msg)」；无显式 raise | inj:50-59 |
| 2 | `load_asset` | `def load_asset(path, label)` | 返回 `(text|None, err|None)`；文件不存在 → `(None, f'资产缺失: {path}（{label}）')`；无显式 raise | inj:62-65 |
| 3 | `inject` | `def inject(template_text, payload, js_asset=None, css_asset=None, charts_asset=None, strict=False)` | 返回 `(html, error)`；docstring：「核心注入逻辑（可测）。返回 (html, error)」；校验失败 → `(None, 错误文案)`；无显式 raise | inj:68-123 |
| 4 | `validate_help_data` | `def validate_help_data(data)` | 返回 `(ok, msg)`；docstring：「scene-data 契约 v1 校验。返回 (ok, msg)。」；无显式 raise | inj:134-180 |
| 5 | `sanitize_help_filename` | `def sanitize_help_filename(skill_name)` | 返回 `(filename|None, err|None)`；docstring：「skill_name → 安全文件名（help_<skill_name>.html）」；非法字符 → `(None, '文件名包含不安全字符: …（只允许字母数字下划线中文连字符）')` | inj:183-191 |
| 6 | `main` | `def main()` | 返回 int 退出码（成功 `0` / 失败 `1`）；副作用：写输出文件 + 打印结果 JSON；`sys.exit(main())` 在 `__main__` 下调用 | inj:194-309 |
| 7 | 模块常量 | `BASE_DIR` / `ASSETS` / `DEFAULT_JS = ASSETS / 'base.js'` / `DEFAULT_CSS = ASSETS / 'base.css'` | 资产路径基准；`BASE_DIR = pathlib.Path(__file__).resolve().parent` | inj:21-24 |
| 8 | 占位符常量 | `INJECT_DATA` / `SHARED_HELPERS` / `SHARED_CSS` / `NO_SHARED` / `CHARTS_HELPERS` | 逐字字符串常量 | inj:26-30 |
| 9 | 必填字段表 | `_REQUIRED = { 'status': v == 'ok', 'data.meta.command_cn': str 且 strip 非空, 'data.meta.occurred_at': str 且 strip 非空, 'data.scene': isinstance(v, dict) }` | `--strict-payload` 校验依据 | inj:33-38 |
| 10 | HELP 必填表 | `_HELP_REQUIRED_TOP = ('skill_name', 'title', 'groups')` | HELP 模式顶层必填 | inj:127 |
| 11 | HELP 文件名正则 | `_HELP_FILENAME_RE = _re.compile(r'^[a-zA-Z0-9_\-\u4e00-\u9fa5]+\.html$')` | 文件名 sanitize | inj:131 |
| 12 | CLI 参数 | `template`（位置）/ `--payload`（required）/ `--output` / `--js`（default=None）/ `--css`（default=None）/ `--charts`（default=None）/ `--strict-payload`（store_true）/ `--help-template`（store_true） | 参数缺省语义见 `--help` 文案 | inj:196-206 |
| 13 | 输出契约 | 打印 `json.dumps({'status': 'ok'|'error', 'data': {...}, 'message': ...}, ensure_ascii=False)`；退出码 0/1 | 成功 data 含 `output`/`template`；失败 data 视分支含 `template`/`payload`/`output` | inj:210-305 |
| 14 | 异常行为 | 无自定义异常类；错误一律走「返回错误元组 + 打印 error JSON + `return 1`」；`argparse` 参数错误抛 `SystemExit` | 无 raise 的对外契约 | inj:50-305 |
| 15 | 输出路径缺省 | 普通模式：`template_path.parent / 'out' / template_path.name`；HELP 模式：`template_path.parent / 'out' / help_<skill_name>.html`；HELP 模式显式 `--output` 含 `..` → 拒绝 | 落盘位置 | inj:297-298, inj:272, inj:251-258 |

---

## 3. scene-data 契约（HELP 页对外参数，逐字段）

权威声明：「**Help HTML 对外参数定死 = 本契约。**」（`scene:5`）

### 3.1 顶层字段（`scene:13-29`、`helptpl:30-42`、`schema:7-12`）

| 字段 | 类型 | 必填 | 说明 | 证据 |
|---|---|---|---|---|
| `skill_name` | string | ✅ | 技能中文名 · 页面标题/文件名 | scene:25, schema:10 |
| `title` | string | ✅ | 页面大标题（如 能力速查台） | scene:26, schema:11 |
| `subtitle` | string | 可选 | 副标题/一句话说明 | scene:27, schema:12 |
| `meta_blocks` | array | 可选 | 技能特有元信息透传块 | scene:28, schema:13-26 |
| `groups` | array | ✅ | 2 级分组（category → subfunction） | scene:29, schema:27-59 |
| `init_banner` | object | 可选 | 首次使用横幅（title/subtitle/button_text/prompt/steps） | helptpl:35 |
| `contact` | object | 可选 | 联系作者（items + copy_all） | helptpl:38 |
| `version` | string | 可选 | 技能版本号 | helptpl:39 |
| `recommendations` | array | 可选 | 其他技能推荐 | helptpl:40 |

### 3.2 `groups[]` / `subgroups[]`（`scene:50-57`、`schema:31-58`）

| 字段 | 类型 | 必填 | 说明 | 证据 |
|---|---|---|---|---|
| `groups[].id` | string | ✅ | 分组唯一标识（英文语义化）；重复 → 校验失败 | scene:52, inj:148-150 |
| `groups[].icon` | string | 可选 | 一级分组图标（emoji，显示在 Tab） | scene:53 |
| `groups[].label` | string | ✅ | 一级分组展示名 | scene:54 |
| `groups[].subgroups[].id` | string | ✅ | 二级分组唯一标识 | scene:55 |
| `groups[].subgroups[].label` | string | ✅ | 二级分组展示名（折叠组标题） | scene:56 |
| `groups[].subgroups[].scenes` | array | ✅ | 场景卡片（非空数组） | scene:57, inj:158-159 |

### 3.3 `scenes[]`（`scene:61-81`、`schema:64-107`）

| 字段 | 类型 | 必填 | 说明 | 证据 |
|---|---|---|---|---|
| `id` | string | ✅ | 场景唯一标识（对齐源数据 scenario_id/id/key）；全局唯一 | scene:75, inj:170-172 |
| `title` | string | ✅ | 场景标题（卡片名） | scene:76 |
| `wake_word` | string | ✅ | 唤醒词（卡片 chip 展示） | scene:77 |
| `types` | array | 可选 | **场景类型徽章数组（1~N 个）**；元素 = 字符串（默认配色）或 `{text, bg?, fg?}`（自定义文字+颜色，缺省走默认） | scene:78, schema:70-88 |
| `status` | string | ✅ | `''` 可用 / `【待开发】` 禁用（禁用 = 醒目标注 + 复制按钮仍可点）；注入器只允许这两值 | scene:79, inj:168-169 |
| `prompt_template` | string | ✅ | **复制指令 全文，与技能 scene_data 定稿零差异**（#123 契约） | scene:80 |
| `editable_fields` | array | 可选 | 参数化表单字段（见 §3.4） | scene:81 |
| `types` 默认配色表 | — | — | 内置：采集/录入=绿、查看/结果/回执/校验/选择=蓝、向导/过程=青、批量=紫；未知名 = 蓝兜底 | scene:96 |
| `types` 卡片空间 | — | — | 1~2 个徽章最稳（手机 390px）；3 个以上自动换行，建议折叠进详情弹层（Sheet） | scene:97 |

### 3.4 `meta_blocks[]`（`scene:99-116`、`schema:16-25`）

| 字段 | 类型 | 必填 | 说明 | 证据 |
|---|---|---|---|---|
| `id` | string | ✅ | 块唯一标识 | scene:112 |
| `title` | string | ✅ | 块标题（透传字段 · 页面不渲染展示） | scene:113 |
| `html` | string | ✅ | **技能方提供的 HTML 原文**，Base 原样透传（页面不渲染；转义需求技能方自理；禁止 `</script>`/`</style>` 字样混入资产注释） | scene:114 |
| 渲染口径 | — | — | Base 当前不渲染展示 meta_blocks（对齐 V4.16 定稿原型——无此区块）；技能重构票如需展示，由技能侧自行扩展渲染 | scene:116 |

### 3.5 `editable_fields[]`（`scene:118-136`、`helptpl:55`、`schema:91-106`）

| 字段 | 类型 | 必填 | 说明 | 证据 |
|---|---|---|---|---|
| `name` | string | ✅ | 参数名（填进 prompt 的 key） | scene:130 |
| `label` | string | ✅ | 显示标签 | scene:131 |
| `value` | string | ✅ | 推荐值/默认值（可为空） | scene:132 |
| `hint` | string | 可选 | 输入提示（placeholder） | scene:133 |
| `required` | bool | 可选 | 必填标记（空值拦截；缺省 false） | scene:134, schema:103 |

### 3.6 文件名与渲染流程

| 项 | 规则（逐字） | 证据 |
|---|---|---|
| 缺省文件名 | `help_<skill_name>.html`（skill_name 经 sanitize 后拼接） | helptpl:66, inj:188 |
| 显式 `--output` | 文件名部分只允许 `[a-zA-Z0-9_\-\u4e00-\u9fa5]+.html`；路径含 `..` 穿越 → 报错拒绝 | helptpl:67, inj:253-265 |
| 渲染流程 | `<技能 scene_data 重构对齐契约> → scene_data.json → 公共组件/injector.py --help-template <help_template.html> --payload scene_data.json [--output help_<技能>.html] → help_<skill_name>.html（单文件离线 · 可手机打开）` | helptpl:73-79 |
| 校验失败行为 | 渲染失败报错（与组件契约硬拦截同级） | helptpl:42, scene:160 |
| 模板结构落点 | 标题区注入 skill_name/title/subtitle/init_banner；meta_blocks 透传；groups → Tab + 子功能折叠 + 场景卡；Sheet 弹层 = editable_fields + Prompt 实时预览 + 复制；关于 Tab = contact/version/recommendations | helptpl:16-26 |
| 示例数据 | `docs/examples/help_example_data.json`（覆盖 meta_blocks/init_banner/待开发/可编辑字段全特性） | README:37, CL:301 |

---

## 4. payload 信封契约（字段与类型）

来源 `contract:81-107`（人读）；无独立机读 schema（见 §6 缺口）。类型列中「(推断)」= 文档未写类型，按示例值与用法推定。

| 路径 | 类型 | 必填 | 语义 / 取值 | 证据 |
|---|---|---|---|---|
| `status` | string | ✅ | 值 `'ok'`（严格校验断言 `v == 'ok'`） | contract:83, inj:34 |
| `message` | string（推断） | 可选 | 「(可选，失败时必有)」；`validate()` 失败时作为 msg 回显 | contract:84, contract:117 |
| `data` | object | ✅ | 信封数据体；严格校验要求是 dict | contract:85, inj:37 |
| `data.meta.command_cn` | string | ✅ | 操作中文名；严格校验要求 strip 非空 | contract:87, inj:35 |
| `data.meta.occurred_at` | string | ✅ | 本地时间；严格校验要求 strip 非空 | contract:88, inj:36 |
| `data.meta.skill_name` | string | 可选 | 技能中文名（可选, buildDataText 用） | contract:89 |
| `data.meta.wake_word` | string | 可选 | 唤醒词 | contract:90 |
| `data.meta.skill_version` | string | 可选 | 技能版本号 | contract:91 |
| `data.scene` | object | ✅ | 场景对象；严格校验要求是 dict | contract:93, inj:37 |
| `data.scene.scene_id` | string | 可选 | 场景标识 | contract:94 |
| `data.scene.snapshot` | object | 可选（但 buildDataText 结构校验要求） | `{ title, summary, sections }`；结构校验违规直接报错 | contract:95, contract:164 |
| `data.scene.snapshot.title` | string | ✅（snapshot 内） | 非空字符串 | contract:95, contract:164 |
| `data.scene.snapshot.summary` | array | ✅（snapshot 内） | 关键指标行（行数不限） | contract:95, contract:164 |
| `data.scene.snapshot.sections` | array | ✅（snapshot 内） | 每节含 `heading` + `rows` | contract:95, contract:164 |
| `data.scene.snapshot.sections[].rows[]` | string 或 `{ text, sensitive: true }` | — | 敏感行复制时输出 `****` 并提示 | contract:162 |
| `data.scene.buttons` | array | 可选 | `[{ label, text, kind: "primary|red" }]`；actionBar 输出场景按钮 | contract:96, contract:175 |
| `data.copy_log` | object | 可选 | `{ thinking, data_structure, call_chain, timestamp, exception }` | contract:98 |
| `data.copy_log` 位置 | — | — | `data.copy_log`（顶层，兼容 `data.scene.copy_log`——base.js 两层都读） | contract:103 |
| 严格校验行为 | — | — | 缺必填字段 → error；关闭时仅 json 合法性校验 | contract:107 |
| 失败回执 JSON | — | — | `{'status': 'error', 'data': {...}, 'message': ...}`（`ensure_ascii=False`） | inj:210-211, inj:292-294 |

---

## 5. 版本与变更机制（§8 原文要点）

| 要点 | 原文要点（压缩，逐字关键句保留） | 证据 |
|---|---|---|
| 版本号声明 | 「Base 资产带版本号（当前 v1.10），变更记入 `CHANGELOG.md`」 | contract:371 |
| 签名变更 = 破坏性 | 「必须全技能同步 + 一次性完成 + 变更记录；不允许「新签名 + 旧签名并存」跨版本漂移」 | contract:372, CL:3 |
| 非破坏性变更 | 「内部实现/样式细节：可独立发布，CHANGELOG 记录」 | contract:373, CL:3 |
| ISSUE 前置 | 「任何变更先开公共层 ISSUE（总纲 09 §92），review 后实施」 | contract:374, CL:3 |
| 历史破坏性说明 | v1.2：buildDataText/buildLogText 从「居家管家字段绑定」重构为「snapshot 通用结构」——当前零消费方 | contract:375 |
| 历史非破坏性说明 | v1.3：新增 charts.js 资产（新增接口，既有接口零变更） | contract:376 |
| 变更如何记 | `CHANGELOG.md` 每条含：版本号 + 日期 + 标题（issue 号）+ 「非破坏性/破坏性」+ 签名是否变更 + 现象/根因/修复/守卫测试计数；契约 §0 版本记录表同步 | CL:5-13, contract:8-37 |
| v1.30 条目要点 | 「**charts.line smooth 曲线不经过中间数据点修复**（非破坏性 · 纯内部实现 · 签名零变更）」；根因 `_smoothPath` off-by-one；修复为「标准均匀 Catmull-Rom→Bezier 转换」；「曲线严格经过全部数据点（合约 §6.5「点在线」兑现）」；守卫测试 +5 → tests/ 295/295 | CL:7-13 |
| 契约侧版本标注 | 契约标题 `# Base 组件契约 v1.30`；来源行逐版列 v1.3→v1.30；§0 版本记录表 21 行 | contract:1-3, contract:8-37 |
| 资产侧版本标注（旁证） | `assets/base.js` 头注释写 `v1.2` / 契约 `v1.2`；`assets/base.css` 头注释写 `v1.11`；`assets/charts.js` 头注释写 `v1.30` | base.js:1-2, base.css:1, charts.js:1 |
| 迁移期冻结口径 | 「迁移完成前：公共组件的任何修改只允许发生在 Base，技能内文件只读（防止同源双写漂移）」 | contract:60 |

---

## 6. 抽取缺口

1. **`metaHeader` / `remindersBlock` 无契约签名（只有名字）**。缺什么：两者的参数名/返回值/语义。为什么缺：契约 §6 无条目，仅 `SKILL:61` 列名、`contract:61` 判为「居家特定留技能侧」；实现侧存在 `metaHeader(p, m)` / `remindersBlock(p)`（`base.js:298-299`）。需要谁补：公共层维护者裁定「纳入 v1.30 清单 / 明确排除」，再定新架构归属。
2. **§6.4 写「token A 组 12 变量」但只列 11 个名**（`contract:195`；`CL:348` 同样写 12）。为什么缺：文档自相矛盾；`base.css:12-23` 实定义 11 个（`--fg/fg2/fg3/bg/card/line/blue/blue2/soft/ok/shadow`）。需要谁补：维护者确认第 12 个变量的名字（或修正为 11）。
3. **版本号「当前 v1.10」与文档 v1.30 不一致**（`contract:371` vs `contract:1`）；资产头注释版本三处不同：base.js `v1.2`（`base.js:1-2`）、base.css `v1.11`（`base.css:1`）、charts.js `v1.30`（`charts.js:1`）。为什么缺：§8 未定义「版本号唯一声明处」。需要谁补：维护者给出单一版本源（契约标题 / 资产头 / CHANGELOG 三者优先级）。
4. **`type`（单数）vs `types`（数组）命名分歧**。为什么缺：`helptpl:52` 写 `"type": "采集/查看/结果/向导/批量/校验（可选）"`，而 `scene:78`、`schema:70-88`、示例数据（`help_example_data.json:100` 等 10 处）均为 `types` 数组。需要谁补：维护者裁定权威字段名（下游按错字段会静默丢失徽章）。
5. **`init_banner` / `contact` / `version` / `recommendations` 在机读 schema 中不存在**，而 schema 顶层 `additionalProperties: false`（`schema:8`）会直接拒绝这些字段。为什么缺：`helptpl:35,38,39,40` 声明它们为注入参数，示例数据 `help_example_data.json:5,313,329` 实际使用，schema 未收录。需要谁补：维护者同步 schema 或收窄契约。
6. **注入器校验口径 ≠ schema 口径**。`validate_help_data`（`inj:134-180`）只校验 `skill_name/title/groups` + `groups[].id/label/subgroups` + `scenes` 必填字段（`id/title/wake_word/prompt_template`）+ `status` 二态 + id 唯一 + `editable_fields[].name/label`；**不校验** `types`、`subtitle`、`meta_blocks`、`init_banner/contact/version/recommendations`，也无 `additionalProperties: false` 等价拦截。需要谁补：维护者给「注入器校验 = schema 校验」的一致性口径。
7. **payload 信封无机读 schema**。字段类型（`message`、`buttons[].kind` 枚举、`copy_log` 五字段类型）只能从散文与示例推断。需要谁补：公共层维护者（若下游要机器校验）。
8. **`buildDataText` / `buildLogText` 的 `format` 语义不完整**：只声明 `'text'|'json'|'csv'`（`contract:163`），未定义 `buildLogText` 各 format 行为、CSV 转义/分隔规则、`json` 输出键名。需要谁补：维护者。
9. **base.js 暴露但契约未声明的全局**：`window.toast`（`base.js:185`）、`window.__hmToastFlush`（`:190`）、`window.__hmPayload`（`:305`，被 `errorReceipt` 兜底读取）、`window.__hmCopyData`（`:343`）、`window.__hmCopyLog`（`:344`）。为什么缺：契约只声明函数签名，未声明全局注入面。需要谁补：维护者裁定新架构是否保留这些全局名。
10. **`help_template.html` 无 `<!--CHARTS-HELPERS-->` 注入点**（grep 全文件仅 3 个占位符：`:195/:197/:200`）。为什么缺：HELP 模板是否要预留图表注入点未在契约中说明。需要谁补：维护者。
11. **README 与契约的 payload 示例字段不一致**：README §3 示例（`README:90-112`）缺 `message` 与 `data.scene.buttons`，且未含 §4 的 `buttons[].kind` 枚举。为什么缺：README 为操作手册节选。需要谁补：下游以契约 §4 为准即可，但需维护者确认 README 不构成第二真相源。
12. **旧版守卫测试断言清单未抽取**（`tests/test_components.py` 151422 bytes、295/295 全绿口径见 `CL:13`）。为什么缺：本票范围只抽文档签名清单，未逐条读测试。需要谁补：若新架构要复用验收断言，另开票从 `tests/*.py` 抽断言清单。
13. **`assets/*.js|css` 内部私有函数面未抽取**（如 `_validateSnapshot`、`_rowText`、`_showCopyPreview`、`_fbCopy` 之外的内部工具，`base.js:197/219/329`）。为什么缺：契约 §5 只把 `_fbCopy` 标为「内部」，其余属实现细节；按 B1「不搬实现」有意排除。需要谁补：无需补，仅提示下游不要把实现细节当契约。
14. **历史归档物术语滞后**：`docs/reviews/*.html`、`.scratch/*.html` 保留「复制 prompt」旧词，而 v1.27/v1.28 已统一为「复制指令」（`CL:36`）。为什么缺：归档物按规范不动。需要谁补：抽取时不要从 reviews/.scratch 采词（本清单已只采契约/README/SKILL/CHANGELOG）。
