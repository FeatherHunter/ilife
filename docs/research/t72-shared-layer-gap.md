# 旧版公共组件 vs 新 base-* 能力缺口盘点（#72）

- 票：#72（母图 #63 卡路里·本体图 1/3）；仓库 `D:\ilife`，branch master，HEAD `6b0c1e7`（工作树含 #56 未提交改动）。
- 本次全程只读：未改/删/改名两棵树任何既有文件（唯一写入 = 本报告 `D:\ilife\.scratch\research\t72-shared-layer-gap.md`）；未执行 git branch/checkout/switch/commit/push/stash/reset；未运行旧 Python；未写 OLD 树。
- 对照源：
  1. OLD 共享层（只读）`D:\2Study\StudyNotes\SKILLS\公共组件` —— `docs/component-contract.md` v1.30（389 行）、`assets/base.css`（495 行）、`assets/base.js`（949 行）、`assets/charts.js`（933 行）、`assets/help_template.html`（611 行）、`injector.py`（309 行）、`docs/help-template-contract.md`、`docs/scene-data-contract.md`、`README.md`、`CHANGELOG.md`、`tests/` 4 份。
  2. NEW 三包：`packages/base-link-core`、`packages/base-render`（npm `base-paint`）、`packages/base-combos`（src + package.json + test + scripts）。
  3. NEW 六技能 render 层与模板：`packages/skill-{calorie,memo-ilife,schedule,home,chef,bill}/src/render/*`、`templates/*.html`、`scripts/build-help.mjs`。
  4. 仓内边界规则：`tooling/check-boundaries.mjs`、`docs/p10-scaffold.md`、`docs/adr/0001-hexagonal-architecture.md`、`CONTEXT.md`。
  5. 既有研究：`docs/research/t67-key-audit.md`、`docs/calorie-parity-39.md`。
- 禁读声明：未读、未列、未引用任何路径名为 `.个人笔记不允许参考` 的内容（OLD 共享层与 OLD 卡路里技能均未触碰该目录）。

---

## 0. 结论速览

| 项 | 结论 |
|---|---|
| 判定行数 | **26 行**（覆盖票面点名的 14 项 + 旧契约其余可判定能力） |
| 判定计数 | **有 2 / 部分 7 / 无 17** |
| 有（2） | payload 信封（§4）、领域无关声明（§2）——均由 `base-link-core` 承接，但**契约字段与旧版不兼容**（旧 `status/data.meta/scene` vs 新 `version/skill/shape/key/data`） |
| 部分（7） | 占位符标准与填充机制、P0 守卫组、状态层三控件、样式 token、注入器接口、HELP 模板、版本与变更机制 |
| 无（17） | NO-SHARED/CHARTS 占位符族、toast、snapshot 结构化接口、复制按钮三件套、copyText、formPrompt、selectList、confirm、foldBox、smartSelect、图表组件、复合形态、HELP 速查台一键复制、08 规范关系、技能侧专属块（明确不做）、控件层测试资产、图表白名单例外（明确不做） |
| 占位符填充真相（一句话） | 填充者是**各技能包自己的 render 层**，填充物是**逐字复制的私有 CSS/JS 片段**；`base-paint` 不提供任何可注入的 CSS/JS 资产；`skill-calorie` 侧标记存在但**填充者缺席**。 |
| 缺口主因 | 新架构把"共享层"收窄为**类型契约 + 槽位装配**（`base-link-core` 取数契约、`base-paint` 渲染/装配、`base-combos` 语义键表），旧版真正让体验一致的是**HTML 层控件库 + 图表库 + HELP 壳 + 注入器**，这四块在新仓**整体不存在**。 |
| 最大风险 | 若不先把"占位符填充归属"钉死，任何新增控件/图表/HELP 都会继续被复制进 6 个技能包，越补越散。 |

---

## 1. 旧版公共组件能力清单（`docs/component-contract.md` v1.30 逐节）

### 1.0 资产总表

| 资产 | 大小 | 行数 | 角色（契约 §1 目录结构 · L39-54） |
|---|---|---|---|
| `assets/base.css` | 17,589 B | 495 | token A 组 + 全部控件样式唯一真相源 |
| `assets/base.js` | 46,892 B | 949 | P0 守卫 + P1/P1.5 控件唯一真相源 |
| `assets/charts.js` | 67,564 B | 933 | 图表组件（8 接口）唯一真相源 |
| `assets/help_template.html` | 40,927 B | 611 | 参数化 HELP 模板（一套模板 + 外部数据） |
| `injector.py` | 14,849 B | 309 | 注入器 CLI（硬拦截 + payload/CSS/图表注入 + HELP 模式） |
| `docs/component-contract.md` | 52,010 B | 389 | 本契约（v1.30） |
| `docs/help-template-contract.md` | 6,807 B | 105 | HELP 模板契约 v1.2 |
| `docs/scene-data-contract.md` | 7,264 B | 171 | 统一 scene_data 契约 v1（HELP 对外参数定死） |
| `docs/scene_data.schema.json` | 4,818 B | — | scene-data 契约机读编译版 |
| `docs/examples/help_example_data.json` | 12,228 B | — | HELP 数据样例 |
| `README.md` | 12,332 B | 182 | 使用手册（接管线 6 步/占位符/信封/验收清单） |
| `CHANGELOG.md` | 42,838 B | — | 版本变更记录（§8 机制载体） |
| `SKILL.md` | 4,123 B | — | Base Skill 定义 |
| `tests/test_components.py` | 151,422 B | 222 个 `test_` | 控件层守卫测试 |
| `tests/test_injector.py` | 11,728 B | 20 | 注入器守卫 |
| `tests/test_help_template.py` | 10,398 B | 18 | HELP 模板守卫 |
| `tests/test_scene_data_contract.py` | 8,997 B | 19 | scene-data 契约守卫 |
| `docs/reviews/*.html` | 9 件 | — | 验收 HTML 实物（toast 堆叠/yTicks/ownScale/图表缺口/smartSelect/HELP 术语等） |

测试函数合计 **279 个**（契约 §0 末条记 `tests/` 295/295 全绿，差额为参数化用例展开）。

### 1.1 §3 占位符标准（L64-75）

| 占位符 | 规则 | 用途 |
|---|---|---|
| `<!--INJECT-DATA-->` | 必须恰好 1 | payload JSON 注入点 |
| `<!--SHARED-HELPERS-->` | 必须恰好 1（硬拦截） | `base.js` 注入点 |
| `<!--SHARED-CSS-->` | 必须恰好 1（v1.2 新增，硬拦截） | `base.css` 注入点 |
| `<!--CHARTS-HELPERS-->` | 0 或 1（v1.3 正式化） | `charts.js` 注入点（`--charts`） |
| `<!--NO-SHARED-->` | 0 或 1（豁免通道） | 确无公共 JS/CSS 的静态页显式声明；与 SHARED 互斥，不得用注释掉占位符的方式隐式豁免 |

- 硬拦截语义（L73）：缺失/重复 → **渲染失败报错**。
- 实现落点：`injector.py:26-30`（常量）、`injector.py:71-97`（守卫与豁免互斥）、`README.md:65-86`（模板最小骨架）。

### 1.2 §4 payload 信封契约（L77-107）

```json
{ "status":"ok", "message":"(可选)",
  "data": { "meta": {"command_cn","occurred_at","skill_name?","wake_word?","skill_version?"},
            "scene": { "scene_id?", "snapshot": {title, summary[], sections[]},
                       "buttons": [{"label","text","kind":"primary|red"}] },
            "copy_log": {"thinking","data_structure","call_chain","timestamp","exception"} } }
```

- 必填：`status==='ok'`、`data.meta.command_cn`、`data.meta.occurred_at`、`data.scene`（对象）；`copy_log` 兼容 `data.copy_log` 与 `data.scene.copy_log` 两层（L103）。
- 校验：注入器 `--strict-payload` 走信封结构校验，缺必填 → error；关闭时仅 JSON 合法性（L107）。实现：`injector.py:33-59`（`_REQUIRED` + `validate_payload`）。
- `base.js` 侧运行时守门：`validate(p)`（`base.js:18`）——`status!=='ok'` / `data` 非对象即返回 `{ok:false,msg}`。

### 1.3 §5 P0 冻结签名（L109-120）

| 函数 | 签名 | 语义 | 实现行 |
|---|---|---|---|
| `esc(s)` | 字符串→转义 HTML | 防 XSS | `base.js:14` |
| `arr(v)` | 任意→数组 | 安全数组访问 | `base.js:15` |
| `val(v)` | 任意→HTML | null/空显示「未填写」 | `base.js:16` |
| `yes(v)` | 布尔→徽章 | 通过/未通过 | `base.js:17` |
| `validate(p)` | payload→{ok,msg} | 数据守门 | `base.js:18` |
| `_fbCopy(s)` | 字符串→bool | `execCommand` 兜底（内部） | `base.js:19` |
| `copyText(s, opts?)` | 字符串→void | clipboard + 兜底 + 双 toast，不改按钮文字 | `base.js:28` |
| `toast(msg, detail?, options?)` | 字符串→void | 通用提示控件 | `base.js:185`（`window.toast`） |

### 1.4 §5.1 toast 通用提示控件（v1.8 堆叠模式 · L122-141）

```js
toast(msg, detail?, { icon, badge:{text,type}, actions:[{label,onClick}], count,
                      lines:[], code, timeout=4500, maxStack=5 })
```

- 4 形态：徽章 / 操作 / 计数 / 留空；内置图标库 `copy|ok|warn|danger|info|emoji`（默认 📋）。
- 堆叠模式：同屏 ≤N（默认 5，≤820px 收窄为 3），老上旧下、间距 8px、超限 FIFO 挤掉最旧，单条独立计时。
- 无障碍 `role="status" aria-live="polite"`；样式 Base 内部注入，技能零样式。
- 实现：`base.js:36`（`ok`）、`44`（`fail`）、`77`（`ensureStyle` 自注入）、`86`（`getStack`）、`95-112`（`isMobile`/`stackCap`/`evictOldest`）、`122`（`dismiss`）、`131`（`show`）、`185`（对外）、`190`（`__hmToastFlush`）。

### 1.5 §6.1 snapshot 结构化接口（v1.2 核心 · 领域无关 · L145-166）

```js
buildDataText(p, format?) → 人类可读文本    // base.js:230
buildLogText(p, format?)  → 6 段日志文本     // base.js:267
```

- snapshot schema：`{title, summary[], sections:[{heading, rows[]}]}`；行可为字符串或 `{text, sensitive:true}`（敏感行复制时 `****` 并提示，`base.js:219 _rowText`）。
- `format`：`'text'`（默认）/`'json'`/`'csv'`。
- 结构校验违规**直接报错**：`base.js:197 _validateSnapshot`（title 非空字符串 + summary 数组 + sections 数组 + 每节 heading/rows）。
- 输出头：`【技能名 · 操作】` + 场景/时间行 + summary + sections；日志 6 段读 `data.copy_log`，缺省字段显示「(未知)」。

### 1.6 §6.2 复制按钮三件套（L168-178）

```js
copyText(s, opts?)          // opts.silent / opts.toast / onOk / onFail
actionBar(p, extra?, opts?) → HTML   // base.js:304
```

- `actionBar` = 场景按钮（`scene.buttons`，kind primary/red）+ **复制数据/复制日志 ghost 按钮**（独立一行，08 规范硬标准）；按钮文本可配，复制内容走 `buildDataText`/`buildLogText`。
- opts 增强：`{preview(点击前预览面板), formatMenu(格式选择), download(导出)}`；实现 `base.js:329 _showCopyPreview`、`343 __hmCopyData`、`344 __hmCopyLog`。
- 按钮规范：≤3 色按功能区分；ghost = 白底 + 浅主色描边（38% 透明度）+ 主色文字胶囊、min-height 40px、12px/600、独立一行（v1.26 #329 降权重）；偶数一行 2 个。
- 样式：`base.css:26-79`（`.copy` 基础）、`80-102`（`.hm-actions` 网格）、`263-314`（复制预览面板）。

### 1.7 §6.3 新控件（P0+P1 · L180-191）

| 组件 | 签名 | 语义 | 实现 |
|---|---|---|---|
| `formPrompt(fields, template)` | fields[]+模板→HTML | P0 参数表单 + 实时预览 + 空值拦截 + 复制 | `base.js:351`（`renderPreview` 374）；`base.css:103-134` |
| `selectList(items, batchActions?, opts?)` | items[]→HTML | P0 勾选列表 + 批量 + 「本组已选 x/y」计数联动 + 全选/单选行操作 | `base.js:427`（`widgetHtml` 440、`update` 494、`readAll` 514、`readChecked` 528）；`base.css:135-160` |
| `confirm({title,detail?,danger?,onOk})` | 配置→对话框 | P0 危险操作二次确认 | `base.js:560`；`base.css:180-204` |
| `foldBox(title, contentHtml)` | →HTML | P1 折叠区（默认折叠 + 统一展开动画） | `base.js:583`；`base.css:205-218` |
| `statusBadge(status, text?)` | 枚举→HTML | P1 状态徽章（非法 status 降级 `empty`；text esc） | `base.js:594`；`base.css:219-229` |
| `emptyState({icon?,text,hint?,action?})` | 配置→HTML | P1 空状态（icon/text/hint esc；`action` 受信 HTML 透传） | `base.js:608`；`base.css:230-245` |
| `errorReceipt({message,retryPrompt?,data?,log?,payload?})` | 配置→HTML | P1 错误回执（描述 + 重试 + 复制数据/日志；payload 显式优先、渲染期生成 `data-t` 零注入面、无 snapshot 容错） | `base.js:629`；`base.css:246-262` |
| `smartSelect(inputEl, config)` | input+config→{getState,getValue} | P1.5 字段级选择器 | `base.js:699`；见 §1.13 |

### 1.8 §6.4 样式 token A 组 + 控件样式（L193-197）

- token A 组 **12 变量**：`--fg/--fg2/--fg3/--bg/--card/--line/--blue/--blue2/--soft/--ok/--shadow`（`base.css:11-24`，另模板内再补 `--orange/--red`）。
- v1.2 起新增控件样式区段（`base.css` 章节注释）：复制按钮 26 / actionBar 80 / formPrompt 103 / selectList 135 / selectList 行内控件 161（v1.9）/ confirm 180 / foldBox 205 / statusBadge 219 / emptyState 230 / errorReceipt 246 / 复制预览面板 263 / smartSelect 315（v1.11）。
- 唯一真相源声明：全部样式在 `base.css`，技能零样式副本（L197）。

### 1.9 §6.5 图表组件（v1.6 全参数化 · CHARTS-HELPERS · L199-241）

```js
charts.bar(el, items[, opt])        // charts.js:354
charts.line(el, items[, opt])       // charts.js:397
charts.donut(el, items[, opt])      // charts.js:689
charts.progress(el, pct[, opt])     // charts.js:339
charts.combo(el, {bars,lines}, opt) // charts.js:730（v1.6）
charts.sparkline(el, items[, opt])  // charts.js:801（v1.6）
charts.gauge(el, pct[, opt])        // charts.js:821（v1.6）
charts.scatter(el, items[, opt])    // charts.js:845（v1.25）
```

- 数据形状统一 `items:[{label,value,color?}]`；`value:null` = 缺失断点（仅 line）；结构违规**直接抛错**，空数组 → `emptyState` 联动（L211-213）。
- line 参数族（L229）：height/compact/width、color/lineWidth/dashed、smooth（Catmull-Rom，v1.30）、showDots/dotSize/dotStyle、area/areaOpacity、labels(edge/all/none/select)、showValues/labelRotate、yMin/yMax/grid、format、tooltip、markLine{value}|{xValue}、markPoint、band{hi,lo}、fillBetween{a,b}、highlightPoints(turns/crossings)、items[].anomaly、step、animation、series[{name,items,color,dashed,smooth,area,ownScale}]、avgLine(n)、legend、highlightLast、onclick/ondrill、emptyText、connectNulls（v1.14）、yTicks（v1.15）。
- bar（L230）：format/colors/singleColor/height/compact/labels/showValues/yMin/yMax/grid/tooltip/animation/onclick/stacked（v1.23）/grouped（v1.24）/segNames/stackMode(percent|absolute)；多值 item 单一真相源 `{label, values:[...], color?}`（L218）。
- donut（L231）/progress（L232）/combo（L233）/sparkline（L234）/gauge（L235）各自参数族；scatter 另含 regression/regressionColor/dotSize/labels（L216）。
- 工程约束：纯 CSS+SVG 无外部依赖（`charts.js:5`）、坐标唯一性（容器零 padding，留白进 viewBox，L237）、双端自适应 ≤720px（L238）、语义色默认 token A 组 + donut 10 色 Apple 色板（L239）、自包含自注入样式 `hm-charts-style`（L240，`charts.js:47-49`）、白名单例外：技能自营 canvas（L241）。
- 内部实现要点：`_validate` 31、`_merge` 43、`_PALETTE` 44、`_linePoints` 141、`_polyPath` 153、`_linePath` 154、`_areaPath` 169、`_smoothPath` 178、`_avgSeries` 200、`_bindTooltip` 215、`_barMulti` 247（stacked/grouped 共用）。

### 1.10 §6.6 复合形态（v1.6 · L243-251）

| 组件 | 用途 | H3 场景 |
|---|---|---|
| `combo` | 柱=量 + 线=趋势/目标 | 每日摄入(柱)+累计趋势(线) |
| `sparkline` | 迷你趋势卡（无坐标轴 + 首尾值 + 涨绿跌红） | 概览页每分类一个小趋势 |
| `gauge` | 弧形进度 + 目标刻度 | 单指标达成 |

设计原则（L245）："无法统一的"不是形态参数而是**组合**——新形态独立成组件，共享同一 token/空态/双端规则。

### 1.11 §6.7 selectList 行内控件（v1.9 · L253-290）

```js
items: [{ id, title, sub?, group?,
          widget?: { type:'date'|'text'|'select', key?, label?, placeholder?, options?[] } }]
selectList(items, batchActions?, { onSubmit(selectedIds, values) })
```

- 宽容渲染：非法 `type` 降级 text；`key` 缺省 `'w'+行号`；`options` 元素可为字符串或 `{value,label}`。
- 共存：控件渲染在行内 `.sl-widget`，勾选/批量/计数照常；**计数只随勾选态**，控件值变化不干扰。
- 读取接口：批量按钮点击后 `onSubmit(selectedIds, values)`；`values = {[id]:{[key]:value}}` 含未勾选条目，未填归一 `null`；`batchActions[].onClick(ids, values)` 第二参只含勾选条目。
- 安全：label/placeholder/option 一律 esc，零注入面；样式 `.sl-widget*` 走 token A 组（`base.css:161-179`）。

### 1.12 §6.8 copyText 反馈钩子（v1.10 · L292-312）

```js
copyText(s, { silent?, toast:{ok:{msg,detail,icon?}, fail:{...}}, onOk?, onFail? })
```

- 只覆盖提供字段，未提供回落默认；失败徽章恒在不可移除；`onOk`/`onFail` 互斥且必触发；`silent` 时不弹 toast 但回调仍触发；空串直接 return。

### 1.13 §6.9 smartSelect 选择器组件（v1.11/v1.12 · L314-354）

```js
smartSelect(inputEl, config) → { getState, getValue }
config = { options:[{name,disabled}], inferred, recommended_new,
           initial:{name,source}, texts:{...}, theme:{brand,brandSoft,onBrand,deep} }
```

- 初始选中优先级：**AI 推断 > 历史预填 > AI 推荐新建 > 空**（`initial` 缺省自行推导）；绝不静默填错。
- 回填协议：`input.value` + `input.dataset.source`（白名单 `inferred|recommended_new|existing|history|custom|empty`）+ `input.dataset.new` + `change` 事件；prompt 由上层自拼，组件零 prompt 知识。
- 候选区折叠 `maxChips`（默认 8，v1.12）：超阈值折叠 + 「展开全部(N)」/「收起」；初始选中项保可见；搜索全量过滤；展开态点选后保持展开。
- 降级：options 空且无 inferred/recommended_new/initial → 降级普通输入。
- 守卫：结构违规直接 throw（`smartSelect 违规: …`）；类名全 `ss-` 命名空间（封装纪律，禁止裸类名）；全部动态文本 esc；chip 用 `<button type="button">`。

### 1.14 §7 注入器接口（v1.3 · L356-367）

```bash
python injector.py <模板.html> --payload <数据.json> [--output <输出.html>] \
  [--js <资产.js>] [--css <资产.css>] [--charts <图表.js>] [--strict-payload] [--help-template]
```

- 校验：INJECT-DATA 恰 1 / SHARED-HELPERS 恰 1 / SHARED-CSS 恰 1 / CHARTS ≤1；NO-SHARED 豁免时 SHARED 必须为 0（互斥拒绝）。
- 注入顺序：**SHARED(JS) → SHARED-CSS → CHARTS → DATA**（`injector.py:104-122`）。
- payload：JSON 合法性必校验，`--strict-payload` 加信封校验；`</` 转义为 `<\/`（L121）。
- HELP 模式（`--help-template`，`injector.py:243-286`）：走 `validate_help_data`（scene-data 契约 v1 校验）+ 文件名 sanitize + 输出 `help_<技能名>.html`。
- 输出：写文件 + 打印结果 JSON（`status: ok/error`，含 output/template/bytes），exit 0/1。
- 可测核心：`inject(...)`（L68）返回 `(html, error)`，CLI 只是薄壳（`main` L194）。

### 1.15 §8 版本与变更机制（L369-376）

- Base 资产带版本号，变更记入 `CHANGELOG.md`（42,838 B，最新 v1.30）。
- **签名变更 = 破坏性变更**：必须全技能同步 + 一次性完成 + 变更记录；不允许新旧签名并存跨版本漂移。
- 非破坏性变更（内部实现/样式细节）可独立发布。
- 任何变更先开公共层 ISSUE（总纲 09 §92），review 后实施。
- 契约 §0 版本表 31 行（v1.0→v1.30），每条含 issue 号 + 破坏性标注。

### 1.16 §9 与既有规范的关系（L378-383）

- `#248/08-HTML交互规范.md` = prompt 参数格式 / 复制数据日志 / 按钮颜色布局的规范本体（Base 对齐；用户提示"不一定都对"→ 落地时对抗式审查逐条验证）。
- T3 草案（#263）= 本契约盘点基础；`居家管家 render/__init__.py` = 注入器范式（迁移完成后退役）。
- §2 另声明 SHARED_JS 全家桶处置（L61）：Base 等价物走 Base、图表走 charts.js、**居家特定（metaHeader/remindersBlock）留技能侧**；迁移完成前 Base 为唯一可写处，技能内文件只读。

### 1.17 `assets/help_template.html` 结构（611 行）

| 区段 | 行 | 内容 |
|---|---|---|
| `<head>` + 模板内联 CSS | 1-~190 | 自带 token 变量与整页样式（`.stage/.phone/.app/.hero/.sheet/.toast` 等）；**注意**：模板自身 CSS 与 `base.css` 是两套，模板只靠 `<!--SHARED-CSS-->` 复用 Base |
| 页面骨架 | ~30-192 | 顶部标题区 / 搜索区 / Tab 目录 / 场景卡 / Sheet 弹层 / 关于 Tab / 底部（`#shCopy` 复制按钮 L187、`#toast` L191） |
| 注入管线 | 194-201 | `<!--INJECT-DATA-->`（L195，`<script id="help-data" type="application/json">`）+ `<!--SHARED-HELPERS-->`（L197，独立 `<script>` 块）+ `<!--SHARED-CSS-->`（L200，独立 `<style>` 块） |
| 数据解析与归一 | 204-253 | `HELP = JSON.parse(...)`、`SKILL_NAME/TITLE/SUBTITLE/META_BLOCKS/INIT_BANNER/CONTACT/SKILL_VERSION/RECOMMENDATIONS`、`normalizeScenes`（L218，契约 v1 `groups→subgroups→scenes` → 原型内部结构） |
| 渲染工具 | 254-330 | `esc` 254、`typeBadgeHTML` 268（types 徽章，含自定义 bg/fg）、`chipHTML` 282、`tabIconHTML` 298、`readParams` 305、`buildPrompt` 311（editable_fields → prompt 拼装）、`getMissing` 323（必填空值拦截）、`<header class="hero">` 330 |
| 交互 | 411-611 | `lockPagesHeight` 411、`curIndex/syncTab` 417-418、`centerTab` 457、`openSheet/closeSheet` 473-501、`showToast/toastMsg` 518-521、`doCopy` 524（复用 Base copyText/toast）、`doSearch` 554（跨 Tab 全局搜索 + 高亮） |

配套契约：`help-template-contract.md` §1 模板结构、§2 注入参数（`skill_name`/`title` 必填 + `subtitle/init_banner/meta_blocks/contact/version/recommendations` 可选）、§3 scenes 卡片（`editable_fields`）、§4 文件名 sanitize、§5 渲染流程、§6 归一化层取消（Base 零翻译）、§7 与现有 4 种 HELP 布局家族收敛关系。

### 1.18 scene-data 契约（HELP 对外参数定死）

`docs/scene-data-contract.md`：顶层 `{skill_name,title,subtitle?,meta_blocks?,groups[]}`；`groups[] = {id,icon?,label,subgroups[{id,label,scenes[]}]}`；`scenes[] = {id,title,wake_word,types?[],status(''|【待开发】),prompt_template,editable_fields?[]}`；`types` 支持多标签与自定义配色（§3.1）；`meta_blocks` Base 原样透传不渲染（§4）；`editable_fields` 对齐复制按钮契约 v2（§5）；机读 schema `docs/scene_data.schema.json` + 守卫 `tests/test_scene_data_contract.py`（§7）。

### 1.19 测试资产

`tests/` 四份共 **279 个 `test_` 函数**，覆盖：控件全量签名与边界（`test_components.py` 222，含 XSS/容错/布局/逐字节回归断言）、注入器硬拦截与 HELP 模式（`test_injector.py` 20）、HELP 模板渲染（`test_help_template.py` 18）、scene-data 契约（`test_scene_data_contract.py` 19）。契约 §0 每条版本都记「守卫测试 +N → 全量全绿」。

---

## 2. 新版 base-* 现有出口

### 2.1 `packages/base-link-core`（npm `base-link-core` v0.1.0 · 零依赖）

`src/index.ts:1-8` 的出口清单（逐条）：

| 出口 | 种类 | 一行用途 | 实现 |
|---|---|---|---|
| `ENVELOPE_VERSION` | const `'0.1.0'` | 信封 semver 版本 | `envelope.ts:7` |
| `ENVELOPE_SHAPES` | const 数组 | 6 形状 `list/detail/stat/receipt/analysis/fallback` | `envelope.ts:10` |
| `createEnvelope(input)` | fn | 造信封并逐形状全字段校验（缺即 throw） | `envelope.ts:92` |
| `parseEnvelope(input)` | fn | 校验未知输入（CLI/跨包边界），非法 throw | `envelope.ts:108` |
| `isEnvelope(input)` | fn | 布尔守卫（try/catch parse） | `envelope.ts:122` |
| `assertShapeData(shape, data)` | fn | 按形状断言 `data` 全字段 | `envelope.ts:55` |
| `Envelope` / `EnvelopeShape` / `EnvelopeDataByShape` | type | 信封类型（`version/skill/shape/key/data`） | `envelope.ts:13-29` |
| `createRegistry(knownKeys)` | fn | 电话本：`keys/has/resolve`（未知 key throw） | `registry.ts:30` |
| `parseRegistryKey(raw)` | fn | `skill.combo` 命名空间解析 + 裸 key 拒绝并给修复提示 | `registry.ts:11` |
| `Registry` / `RegistryKey` / `ParsedKey` | type | registry 类型 | `registry.ts:4-28` |
| `runCombo(registry, req, fetchData)` | fn | 唯一取数编排：key 先过 registry → 取数 → 过 envelope | `runner.ts:17` |
| `RunRequest` / `Fetcher` | type | 取数请求/取数函数契约 | `runner.ts:6-15` |
| `LinkCoreError` / `EnvelopeError` / `RegistryError` / `RunnerError` | class | 错误基类 + 三码（`ENVELOPE_INVALID`/`REGISTRY_UNKNOWN_KEY`/`RUNNER_FAILED`） | `errors.ts:2-30` |

显式红线/out of scope（文件头注释）：
- `envelope.ts:1-4`：「零依赖：手写守卫（不用 Zod），保 P4 零依赖冻结；Zod 可后加于 combos/skill 层」。
- `errors.ts:1`：「坏输入一律 throw，永不返空数组冒充正常」。
- `registry.ts:1`：「裸 key 拒绝并给修复提示；对不上注册表即 fail」。
- `runner.ts:1`：「失败 throw，永不合成空数组」。
- **本包不含任何 HTML/CSS/浏览器代码**（无 DOM 引用）。

### 2.2 `packages/base-render`（npm `base-paint` v0.1.0 · 无运行时依赖）

`src/index.ts:1-9` 的出口清单：

| 出口 | 种类 | 一行用途 | 实现 |
|---|---|---|---|
| `createPageRegistry()` | fn | 单品页自注册表（重复 slotId throw，返回幂等 disposer） | `ui.ts:35` |
| `pageOrReco(reg, reco)` | fn | 缺席纯条件渲染：有页用页，无页用 reco（不轮询不返空） | `ui.ts:58` |
| `recoDescriptor(skill, slotId, order, title)` | fn | 推荐安装占位描述子 | `ui.ts:23` |
| `PageDescriptor` / `PageKind` / `PageRegistry` | type | 页面描述子/种类/注册表 | `ui.ts:7-33` |
| `STYLE_PREFIX` (`'ilife-'`) | const | 类名前缀（红线：样式只抖 render） | `style.ts:7` |
| `STYLE_TOKENS` | const 冻结对象 | **9 个** token：`radius/gap/fontSize/fg/muted/accent/danger/border/bg` | `style.ts:10-20` |
| `STYLE_VERSION` | const `'0.1.0'` | 样式表版本 | `style.ts:8` |
| `cx(...names)` | fn | 类名拼接（自动加前缀，falsy 跳过） | `style.ts:25` |
| `token(name)` | fn | 取 token（样式消费唯一入口） | `style.ts:30` |
| `StyleTokenName` | type | token 名联合类型 | `style.ts:22` |
| `RenderError` | class | 渲染错误（`missing-data`/`bad-envelope`/`reco-only`） | `contract.ts:22` |
| `RENDER_CONTRACT_VERSION` / `RENDER_ENVELOPE_VERSION` | const `'0.1.0'` | 渲染契约版本 / 期望信封版本（漂移由单测钉死） | `contract.ts:10-12` |
| `escapeHtml(s)` | fn | 转义 `&<>"`（**注意：不转 `'`**，与各技能本地实现不同） | `contract.ts:31` |
| `renderPage(page, env)` | fn | 实页渲染（reco 误入/data 缺席/版本不符即 throw，**不返空页**） | `contract.ts:40` |
| `renderReco(page)` | fn | 占位渲染（带 `data-missing="1"` 显式标记） | `contract.ts:50` |
| `RenderErrorCode` / `RenderOutput` | type | 错误码 / 输出（contractVersion + slotId + html） | `contract.ts:14-20` |
| `INJECTOR_DEFAULT_MAX_RETRIES` (10) / `INJECTOR_DEFAULT_RETRY_MS` (1000) | const | 有界重试参数 | `injector.ts:48-49` |
| `mountInjector(port, pages, opts)` | fn | 挂载全部页面描述子（幂等 + 有界重试 + 卸载清理） | `injector.ts:52` |
| `openPage(port, page, sessionId?)` | fn | path seed 内容型打开；缺席静默返回 | `injector.ts:104` |
| `MountHandle` / `MountOptions` / `SlotsPort` / `TabEntry` / `TabScope` / `TabSeed` | type | 槽位端口与挂载契约 | `injector.ts:11-46` |

显式红线/out of scope（文件头注释）：
- `style.ts:1-5`：「样式唯一真相源。红线：样式只抖 render——改样式只改本文件，link-core/combos/单品包禁止自带样式常量。类名前缀统一 `STYLE_PREFIX`，token 表冻结」。
- `ui.ts:1-5`：「纯数据，无 DOM、无 host、无运行时依赖……总管只消费注册表，禁止 import 单品页组件（P7 #8 验收）」。
- `contract.ts:1-5`：「缺失阻断不返空：data 缺席/版本不对即抛 RenderError，绝不输出静默空页。link-core 只做 typeof 级消费（import type），运行时零依赖红线不断」。
- `injector.ts:1-8`：「装配唯一 owner（归一 render）。better-sidebar 槽位注册只许住这里……host 无关设计」。
- `style/tokens.css`：**仅 3 行**（`:root{--ilife-font:system-ui,sans-serif}`），且 `package.json:11-13` 的 `files:["dist"]` **不含 style/** → 该 CSS 不随包发布。
- **本包不含控件、不含图表、不含 HTML 模板、不含 HELP**；`renderPage` 只把 `env.data` JSON 化并转义（`contract.ts:45-46`），不是"页面模板渲染器"。

### 2.3 `packages/base-combos`（npm `base-combos` v0.1.0 · 依赖 base-link-core）

| 出口 | 种类 | 一行用途 | 实现 |
|---|---|---|---|
| `PRESENT_KEYS` | const `string[]` | **87 个** registry key 字面量（calorie 77 + memo 10） | `present.ts:3-91`（`@generated`，由 `scripts/gen-present.mjs` 从 `combos.yaml` 生成） |
| `comboEnvelope(key)` | fn | **骨架占位**：key 过 registry 后返回 `list` 形状空载荷 | `index.ts:9-12` |

显式红线/out of scope（文件头注释）：
- `present.ts:1-2`：「`@generated` —— 手改无效（构建覆盖）。present 层红线：只许 string 字面量引 registry key，禁 import render」。
- `index.ts:8`：「骨架占位：key 先过 registry（对不上即 throw），载荷走 envelope list 全字段；真实载荷 P7/skilllink 落包」。
- `combos.yaml`（29,341 B，846 行）：`combos` 36 条（30 场景 + 6 L6 空位）+ `channels` 15 对 + `scenarios` 30 + `fallbacks` 6 + `l6_slots` 6；文件头写明「本文件只有声明式联动描述，无库定义语句」「L6.1～L6.6 只留空位，内容一期不记录」。
- `scripts/build-help.mjs`：构建期把 `combos.yaml` 投影成 `HELP.md` 标记块（`<!-- HELP-AUTO-START -->`/`<!-- HELP-AUTO-END -->`，L9-10），运行时不计算 HELP。
- **本包无 HTML/CSS/浏览器代码**。

### 2.4 三包合计：共享层"有什么"

- 取数/载荷契约（envelope 6 形状 + registry 命名空间 + runner）。
- 槽位装配（页面自注册 + better-sidebar 端口 + 有界重试）。
- 9 个 JS 样式 token + 类名前缀工具 + 两个 `escapeHtml` 实现。
- 语义键表（87 键字面量）+ 构建期 HELP.md 表格投影。
- **没有**：任何 `.css`/`.js` 可注入资产（除 3 行不入包的 `tokens.css`）、任何 HTML 模板/控件/图表/HELP 壳/占位符注入器。

---

## 3. 逐条判定表

判定口径：**有** = 旧能力在新架构下已有等价物（可跨技能复用）；**部分** = 有名称/雏形或局部实现，但缺契约、缺资产或缺统一落点；**无** = 完全不存在（含"只有技能包私有复制品"）。

| # | 旧版能力（出处） | 新版对应物 | 判定 | 建议归属 | 理由 |
|---|---|---|---|---|---|
| 1 | 占位符标准与填充机制（§3 L64-75；README §2 L65-86） | 6 技能各自 `SHARED_CSS_MARKER`/`SHARED_HELPERS_MARKER` + `fillTemplate`/`fillSharedMarkers`；`base-paint` 无占位符 API | **部分** | **base-* 新增**（base-paint 增统一注入器/填充 API） | 标记常量重复 6 份、填充语义 2 套（bill/schedule/home/chef 包 `<style>`；memo-ilife 原样注入）、恰一次校验 5 份各自 throw 不同错误码（`BILL_MARKER_INVALID` 等）而非统一硬拦截、无 `INJECT-DATA` 占位符约定；calorie 侧标记无人填 |
| 2 | `NO-SHARED` 豁免 + `CHARTS-HELPERS` 占位符（§3 L71-75） | 无 | **无** | **明确不做**（CHARTS 随图表票回归时再定） | 新架构无"豁免通道"概念；图表若落地，注入点应走统一注入器而非独立占位符 |
| 3 | payload 信封 + 结构校验（§4 L77-107） | `base-link-core` `Envelope`（6 形状 + semver + 全字段断言） | **有** | **保持 base-link-core**；技能包负责领域数据 → 形状映射 | 能力对等且更严（`createEnvelope`/`parseEnvelope`/`assertShapeData` 缺即 throw）；但**字段不兼容**（旧 `status/data.meta/scene` vs 新 `version/skill/shape/key/data`），旧信封不得直接搬 |
| 4 | P0 守卫组 `esc/arr/val/yes/validate`（§5 L109-120） | `escapeHtml`（`base-paint/contract.ts:31` + 各技能本地实现）；`validate` 由 envelope 承担 | **部分** | **base-* 新增**（归一 esc 到一处） | `escapeHtml` 至少 3 处独立实现且转义集不一致（base-paint 不转 `'`，技能实现转）；`arr/val/yes` 属展示语义，可判"技能包内" |
| 5 | toast 通用提示控件（§5.1 L122-141） | 仅 CLI 侧 `function toast(msg){console.error(...)}`（home:37/chef:36/bill:34/schedule:36/calorie:64/memo:16） | **无** | **base-* 新增** | 同名不同物（stderr 日志 ≠ UI 控件）；旧版是 4 形态 + 堆叠 + 无障碍的完整控件 |
| 6 | snapshot 结构化接口 `buildDataText`/`buildLogText`（§6.1 L145-166） | 无（各技能自建领域 data 对象 + 模板） | **无** | **base-* 新增**（或维护者拍板用 envelope shape 取代） | 旧接口的"领域无关 + text/json/csv + 敏感行脱敏 + 结构校验报错"整体缺失；复制文本是 HELP/回执体验的基础 |
| 7 | 复制按钮三件套 `actionBar` + 复制数据/日志 ghost（§6.2 L168-178） | 无（calorie 模板内联 `copyData()`；4 技能共享 3 行 `copyItem` 片段） | **无** | **base-* 新增** | 按钮规范（≤3 色/ghost 38%/min-height 40/偶数一行 2 个）+ 预览/格式菜单/导出全部缺失 |
| 8 | `copyText`（含 v1.10 toast 钩子）（§5 L119、§6.8 L292-312） | 4 技能同一段 `navigator.clipboard.writeText` 3 行片段；无兜底/无 toast/无回调 | **无** | **base-* 新增** | 缺 `_fbCopy` 兜底、双 toast、`silent`、`toast.ok/fail`、`onOk/onFail` |
| 9 | `formPrompt`（§6.3 L184） | 无 | **无** | **base-* 新增** | 页内表单 + 实时预览 + 空值拦截 + 复制，是"过程型"场景的载体 |
| 10 | `selectList`（含 v1.9 行内 widget）（§6.3 L185、§6.7 L253-290） | 无 | **无** | **base-* 新增** | 勾选/批量/计数联动/行内 date-text-select/`onSubmit(ids,values)` 全部缺失 |
| 11 | `confirm`（§6.3 L186） | 无 | **无** | **base-* 新增** | 危险操作二次确认，写链回执体验依赖它 |
| 12 | `foldBox`（§6.3 L187） | 无 | **无** | **base-* 新增** | 折叠区 + 统一展开动画 |
| 13 | 状态层 `statusBadge`/`emptyState`/`errorReceipt`（§6.3 L188-190） | 各技能模板内私有 `.hm-empty` div / `.receipt` 样式（如 memo-ilife `html.ts:20`、bill/schedule `SHARED_CSS` 里的 `.receipt/.hm-empty`） | **部分** | **base-* 新增**（技能私有实现收敛） | 有视觉雏形但无 API、无白名单降级、无 XSS 守卫、无"无 snapshot 容错" |
| 14 | `smartSelect`（§6.3 L191、§6.9 L314-354） | 无 | **无** | **base-* 新增**（或维护者拍板：新架构交互面归插件 client 侧） | 组件 29+8 守卫测试规模的成熟控件，新仓零对应物 |
| 15 | 样式 token A 组 + 控件样式（§6.4 L193-197） | `base-paint/style.ts` 9 token + `cx`/`token`；`style/tokens.css` 3 行（不入包） | **部分** | **base-* 新增**（base-paint/style 扩为唯一真相源 + 产出可注入 CSS 文本） | token 数量/语义/色系与旧 A 组不同（深色 vs Apple 浅色），且**无 CSS 资产产出**；技能只能内联 `style="color:..."`（calorie `html.ts:39-61`）或复制私有 CSS 串 |
| 16 | 图表组件 `charts.*` 8 接口（§6.5 L199-241） | 无（全仓零 `<svg>`/`<canvas>`/`polyline`；calorie 仅 `html.ts:55` div 进度条 `bar()`） | **无** | **base-* 新增** | 旧 67.6 KB 资产、8 接口、全参数化 + 双端自适应 + 空态联动 + 结构校验，是"三图"验收的核心 |
| 17 | 复合形态 `combo`/`sparkline`/`gauge`（§6.6 L243-251） | 无 | **无** | **base-* 新增**（与图表同票） | 与图表共享 token/空态/双端规则，应同批落地 |
| 18 | 注入器接口 `injector.py`（§7 L356-367） | `base-paint/injector.ts`（槽位装配，同名不同物）；HTML 填充散在 6 技能 | **部分** | **base-* 新增**（HTML 注入器） | 缺 CLI、缺 `--strict-payload`、缺注入顺序保证、缺 HELP 模式、缺结果 JSON；`base-paint` 的 injector 是 DSH 槽位装配，不处理 HTML |
| 19 | HELP 模板 + scene-data 契约（`help_template.html` 611 行 + 2 契约 + 校验） | `scripts/build-help.mjs` 把表格注入 `SKILL.md`/`HELP.md` 标记块；无 HTML 模板、无 scene-data 契约 | **部分** | **base-* 新增**（模板壳 + 数据契约 + 校验）；数据内容归技能包 | 新机制是"文档标记块"而非"HTML 速查台"；且 `base-combos/HELP.md:66-73` 有实缺陷（见附录 B） |
| 20 | HELP 速查台一键复制指令（旧 `卡路里.html` 302KB 形态） | 无（`calorie.help.center`/`help.lookup` 只返回照片 HELP 命中） | **无** | **技能包内**（数据）+ base-* 提供壳 | 唤醒词/场景数据是技能资产；但"点击卡片 → 拼 prompt → 复制"的交互壳属共享层 |
| 21 | 版本与变更机制（§8 L369-376） | 三包各自 `STYLE_VERSION`/`ENVELOPE_VERSION`/`RENDER_CONTRACT_VERSION`/`RENDER_ENVELOPE_VERSION` + 1 条漂移单测（`base-render/test/render.test.mjs:63-65`） | **部分** | **base-* 新增** | 缺统一版本表、缺 CHANGELOG、缺"签名变更=破坏性变更 + 全技能同步"流程；新仓用 changesets（root `package.json` 有 `changeset:status`）但未覆盖契约冻结语义 |
| 22 | 与 08-HTML交互规范的关系（§9 L378-383） | 无（`docs/` 无交互规范；只有 migration-split/parity/scaffold/env/public-installer） | **无** | **维护者拍板**（是否随公共层移植） | 旧契约把按钮色/布局/复制格式的规范本体外置在 08 文档；新仓若不移植，控件层将无验收基准 |
| 23 | 领域无关声明（§2 L56-62） | `base-link-core`/`base-paint` 全领域无关（envelope/registry/token/槽位） | **有** | **保持** | 新架构更彻底：连渲染模板都下沉到技能包，base 只认形状与槽位 |
| 24 | 技能侧专属块 `metaHeader`/`remindersBlock`（§2 L61） | 无 | **无** | **明确不做** | 旧契约已声明"居家特定留技能侧"，新架构应维持同一判定 |
| 25 | 控件层测试资产（§0 各条 + tests/ 279 函数） | `base-link-core`（root `test/link-core.test.mjs`）、`base-paint`（`test/render.test.mjs` 133 行）；控件层零测试 | **无** | **base-* 新增**（随控件层同批补守卫） | 无控件即无控件测试；旧版每能力都有守卫测试（含逐字节回归/XSS/边界） |
| 26 | 图表白名单例外（技能自营 canvas，§6.5 L241） | 无 | **无** | **明确不做**（若维护者要保留需拍板） | 新架构尚无图表层，例外机制无从谈起；若将来落地需重新定义白名单 |

**计数：有 2 / 部分 7 / 无 17（合计 26 行）。**

---

## 4. 占位符填充真相

**问题**：新仓 6 技能模板都留 `<!--SHARED-CSS-->`/`<!--SHARED-HELPERS-->`（本次实测 `packages|skills|apps|tooling|docs` 去 node_modules/dist 后 **74 处 `SHARED-CSS` + 74 处 `SHARED-HELPERS` = 148 处**；票面记 146 处，差异为统计路径口径），今天到底谁在填、填什么、有没有真共享资产？

**结论：既不是"空的"，也不是"共享的"，而是"每技能复制的私有实现"，外加 calorie 一处"空实现"。**

1. **谁填**：填充者一律是**技能包自己的 render 层**，不是 base-*。
   - `skill-bill`：`src/render/html.ts:53-58` 定义 `SHARED_CSS_MARKER`/`SHARED_HELPERS_MARKER`/`SHARED_CSS`/`SHARED_HELPERS` + `fillTemplate`（L60-69，替换时给 CSS 包 `<style>`）；调用点 `src/cli/cmd_read.ts:450`。
   - `skill-schedule`：`html.ts:62-67` + `fillTemplate`（L69）；调用点 `cmd_read.ts:286`。
   - `skill-home`：`html.ts:59-64` + `fillTemplate`（L66）；调用点 `cmd_read.ts:721`。
   - `skill-chef`：`html.ts:68-73` + `fillTemplate`（L75）。
   - `skill-memo-ilife`：`html.ts:52-61` 只有 `fillSharedMarkers(template, css, helpers)`，**包内不提供默认 css/helpers**，内容由调用方决定。
   - `skill-calorie`：**render 层零引用**（`src/render/*.ts` 无 `SHARED` 字样）；`templates/{home,diet,exercise,goal,help,photo-gallery}.html` 第 7 行 `<style><!--SHARED-CSS--></style>`、第 37 行 `<!--SHARED-HELPERS-->` 永远不被替换；且 `package.json:16-19` 的 `files` 只有 `dist` + `SKILL.md`（**模板不随包发布**）。calorie 的运行时 HTML 由 `renderHomeHtml` 等函数直接串字符串产出（`html.ts:37-44` `pageShell`），走 base-paint 的 `token()`/`cx()` 内联样式。
2. **填什么**：`SHARED_CSS` 是**同一段约 300 字符的 CSS 字面量**在 4 个技能里逐字重复（`.page/.item/.item-head/.badge/.amt/.receipt/.stat/.analysis/.hm-empty`，bill/chef/home/schedule 的 `html.ts` 对应行完全一致）；`SHARED_HELPERS` 是**同一段 3 行 `copyItem(id)`**（`navigator.clipboard.writeText`）逐字重复 4 份。memo-ilife 无内置内容。**没有任何"共享 CSS/JS 资产"被注入**：`base-paint/style/tokens.css` 仅 3 行且 `files:["dist"]` 不含它；`base-link-core`/`base-combos` 无 HTML/CSS 资产；全仓不存在 base.js/base.css 等价物。
3. **共享层现状定性**：**per-skill duplicated（逐技能复制）**——占位符机制保留了形状，共享实体被复制到技能包；`skill-calorie` 是**空实现**（标记在、填充者缺、模板不发包）。真正跨技能复用的只有 `base-paint` 的 9 个 JS token + `escapeHtml`（后者还被各技能本地实现覆盖）。

---

## 5. 建议（按优先级）

### 5.1 base-* 必须补什么（旧体验可复现的最小集）

| 优先级 | 补什么 | 落点建议 | 依据 |
|---|---|---|---|
| P0-1 | **统一 HTML 注入器 + 占位符契约**：`SHARED-CSS`/`SHARED-HELPERS`/`INJECT-DATA`/`CONTENT` 恰一次硬拦截、注入顺序、`--strict` 校验、结果 JSON | `base-paint` 新增（如 `src/html.ts` 或 `src/inject/`）；6 技能删除私有 `SHARED_*` 常量改调用它 | §3 L64-75、§7 L356-367；现状 4 份重复 + 2 套语义 |
| P0-2 | **共享样式资产**：把 `STYLE_TOKENS` 扩为旧 A 组等价（或重新定义）+ 产出可注入 CSS 文本 + 控件样式区 | `base-paint/style.ts` 为唯一真相源，构建期 emit（含入包 `files`） | §6.4 L193-197；`style/tokens.css` 3 行不入包 |
| P0-3 | **控件层**：`toast`、`copyText`（含兜底/回调）、`actionBar` + 复制数据/日志、`emptyState`/`statusBadge`/`errorReceipt` | base-* 新增（浏览器侧资产，与 style 同源） | §5.1/§6.2/§6.3；缺 5 行判定 |
| P1-1 | **复制文本序列化**：`buildDataText`/`buildLogText` 等价（text/json/csv + 敏感行脱敏 + 结构校验报错） | base-* 新增，输入对齐 envelope（或维护者拍板改用 shape） | §6.1 L145-166 |
| P1-2 | **图表层**：8 接口 + 复合形态 + 双端自适应 + 空态联动 + 结构校验 | base-* 新增（一票两批：四形态 + 复合形态） | §6.5/§6.6；全仓零 SVG |
| P2-1 | **HELP 壳 + scene-data 契约 + 校验**（HTML 速查台） | base-* 新增模板与契约；数据由技能包提供 | `help_template.html` 611 行 + 2 契约 |
| P2-2 | **表单交互控件**：`formPrompt`/`selectList`(+widget)/`confirm`/`foldBox`/`smartSelect` | base-* 新增，或按 §5.3 第 8 条改由插件 client 侧承担 | §6.3/§6.7/§6.9 |
| P2-3 | **版本与变更机制**：统一契约版本表 + CHANGELOG + "签名变更=破坏性变更" 规则并入 changesets | base-* 仓库级 | §8 L369-376 |
| P2-4 | **控件层守卫测试**（含逐字节回归/XSS/边界） | base-* 新增，随控件同批 | 旧 `tests/` 279 函数 |

### 5.2 留在技能包内（不进 base-*）

- 领域数据组织与 77 键/形状映射（`skill-calorie/src/render/envelope.ts`、`cli/keys.ts`）。
- 唤醒词与场景数据（436 条 SoT、`triggers/*`、`scene-*.ts`）与 HELP 数据内容（`calorie.help.center`/`help.lookup` 的命中集）。
- 技能专属块（旧 `metaHeader`/`remindersBlock` 类，§2 L61 已定）。
- CLI 唯一出口（argv + JSON + exit）、DB schema/迁移/审计。
- 技能自有页面模板（可继续留包内），但**占位符填充与资产注入必须改走 base-***。

### 5.3 维护者拍板（不代为决定）

1. **`component-contract.md` v1.30 整份搬还是重写**：建议"重写为 base-* 契约（语义照抄、签名按 TS/包结构重定）"，但整搬/重写由维护者定。
2. **snapshot 结构化接口（§6.1）移植还是用 envelope shape 取代**：决定 `copyText`/`buildDataText` 的输入形态与旧 HELP/回执的兼容方式。
3. **占位符填充归属**：`base-paint`（渲染包）/ 新增第四包 / 构建期工具三选一；以及是否允许技能保留私有模板与私有 CSS。
4. **图表白名单例外（技能自营 canvas）是否保留**（§6.5 L241）。
5. **08-HTML交互规范是否随公共层移植**（§9 依赖它，新仓无对应文档）。
6. **HELP 形态收口**：HTML 速查台（旧 `help_template.html`）与 SKILL.md 标记块（新 `build-help.mjs`）并存还是收一。
7. **`formPrompt`/`selectList`/`smartSelect` 这类表单交互控件是否属新架构**：新架构是"sidebar 槽 + CLI 单轨"，交互面可能应由插件 client 侧（`plugin-*/src/client.ts`）承担，而非技能 HTML。
8. **版本机制粒度**：三包独立版本 + changesets，还是恢复"公共层统一版本 + 破坏性变更全技能同步"。

---

## 6. 冻结边界规则（约束新代码能住哪）

| 规则 | 出处 | 对本次盘点的约束 |
|---|---|---|
| `base-link-core` 零依赖；源码不得引用任何 workspace 包 | `tooling/check-boundaries.mjs:12-13,23` | 控件/图表/CSS 资产**不能**塞进 link-core |
| `base-paint` 无运行时依赖（link-core 仅 dev/`import type`）；不依赖 combos | `check-boundaries.mjs:14-16` | 新增渲染资产不能引 base-link-core 运行时 |
| `base-combos` 强依赖 link-core；`present.ts` 只许字符串级引 key，禁 import render | `check-boundaries.mjs:17-20` | 语义键表不得携带渲染逻辑 |
| 装配 owner 归一 render：`registerTab`/`openTab`/`mountInjector` 只许住 `base-paint` | `check-boundaries.mjs:24-28` | 注入/装配新代码落 `base-paint` |
| 插件槽位：`registerTab`/`openTab` 写死原生组件、无动态加载、无轮询；缺席纯条件渲染 | `docs/p10-scaffold.md:27-31` | 控件/HELP 的"打开"动作必须经槽位，不得自起 host |
| 纯 CLI 单轨：面板只经 `host.call` → spawn 技能 `cmd_read`（argv+JSON+exit）；单品/总管源码禁 import 技能实现 | `docs/p10-scaffold.md:41-44` | 共享层不得直接读技能 DB/实现 |
| 缺失阻断不返空：`SkillBridgeError` + `renderPage` 的 `missing-data` 一律抛错 | `docs/p10-scaffold.md:43-44`；`base-render/src/contract.ts:40-46` | 新控件/图表/HELP 必须沿用"抛错不返空" |
| 样式只抖 render；类名前缀 `ilife-`；token 表冻结；单品包禁自带样式常量 | `base-render/src/style.ts:1-5` | 新增样式只能改 `style.ts`；与现状 6 技能各自内联/私有 CSS 冲突，需一并收口 |
| 六边形架构：client 产物须过 loader 校验（无 `node:`）、两侧只经端口对话 | `docs/adr/0001-hexagonal-architecture.md:8-13` | 浏览器侧控件资产必须 browser-safe（不能 `node:`） |
| 技能包不动（P10 范围）：插件只读消费 dist/CLI，无反向依赖 | `docs/p10-scaffold.md:68` | base-* 新增不得要求技能包反向 import 插件 |
| 术语以 `CONTEXT.md` 为准（设置面/干活面/sidebar槽/技能功能页） | `CONTEXT.md` + `AGENTS.md` | 报告与后续票的用词基线 |

---

## 附录 A · 证据与复现

```powershell
# OLD 契约逐节
Get-Content "D:\2Study\StudyNotes\SKILLS\公共组件\docs\component-contract.md" | Select-String -Pattern '^#{2,3} '
# OLD 资产函数/样式/图表行号
Select-String -Path "D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js"     -Pattern '^\s*(function|window\.)'
Select-String -Path "D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.css"    -Pattern '^/\* ──'
Select-String -Path "D:\2Study\StudyNotes\SKILLS\公共组件\assets\charts.js"   -Pattern '^\s{2}\w+:function'
# NEW 三包出口
Get-Content D:\ilife\packages\base-link-core\src\index.ts
Get-Content D:\ilife\packages\base-render\src\index.ts
Get-Content D:\ilife\packages\base-combos\src\index.ts
# 占位符填充者
Select-String -Path D:\ilife\packages\*\src\render\*.ts -Pattern 'SHARED_CSS|SHARED_HELPERS|fillTemplate|fillSharedMarkers'
# 边界断言
node D:\ilife\tooling\check-boundaries.mjs
```

## 附录 B · 顺带发现（不属 #72 判定，但影响 HELP 归属决策）

1. **`base-combos/HELP.md` 生成缺陷**：`HELP.md:66-71` 出现 6 行 `undefined：undefined（undefined）`，`HELP.md:73` 的 L6 空位列表为空。根因在 `scripts/build-help.mjs:18` 的段头正则 `^([A-Za-z_]+):\s*$` **不匹配含数字的 `l6_slots:`**（`combos.yaml:834`），导致 `fallbacks` 段解析越界吞掉 `l6_slots` 条目、`l6_slots` 段自身永远匹配不到。
2. **`channels` 与 `combos` 键形不一致**：`combos.yaml:446-461` 的 channels 用下划线键（`calorie.view_home`），`combos.yaml:5+` 与 `PRESENT_KEYS` 用点号键（`calorie.view.home`）；`HELP.md:43-46` 因此展示 4 个非注册键。
3. **`escapeHtml` 转义集不一致**：`base-paint/contract.ts:31` 只转 `&<>"`，`skill-memo-ilife/src/render/html.ts:8-10` 另转 `'`——归一 esc 时需统一口径。
4. **calorie 的 6 个模板是死资产**：有双标记但不被 render 引用、不随包发布（`package.json:16-19`），与母图 #63「新版 6 个 templates/*.html 的去留」待判项一致。
5. **`skill-memo`（无 -ilife）目录无 package.json**：`packages/skill-memo` 仅剩残留（与母图 #63「5 个只剩 tsbuildinfo 的残留目录」待判项相关）。
