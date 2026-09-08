# T71 — 「HELP 速查台」三件 HTML 产物解剖报告（只读取证）

**审计对象**（`D:\2Study\StudyNotes\SKILLS\卡路里\`，只读，未做任何写/改/删/改名）：

| # | 文件 | 磁盘字节 | 行数 | 编码 |
|---|---|---|---|---|
| F1 | `calorie_html\卡路里_HELP_20260730_130429.html` | 65,366 | 492 | UTF-8 无 BOM |
| F2 | `calorie_html\卡路里_HELP_20260731_201530.html` | 73,811 | 596 | UTF-8 无 BOM |
| F3 | `卡路里.html`（根镜像） | 302,820 | 2,048 | UTF-8 无 BOM |

**硬规则遵守**：全程未读取/列举/glob/grep/引用 `卡路里\.个人笔记不允许参考\`（该目录名仅在顶层目录枚举中作为同级项出现，未下钻、未列内容）。所有写入仅落在 `D:\ilife\.scratch\research\`（`help_0730.json` / `help_0731.json` / `help_root.json` / `analyze_*.py` / `count_triggers.py` / `prompts.py` / `final_counts.py`）。

**方法**：用 `read` 分块读 F1 全量（492 行）、F2 全量（596 行）、F3 关键区段；用 `[System.IO.File]::ReadAllLines(...UTF8)` + `[regex]::Matches` 做计数；把三个文件的注入 JSON 抽出到 scratch 后用 Python `json.loads` 统计；用 `ast.parse` 统计 `_triggers.py`；用 `git log/show`（只读）定位产生两件产物的渲染器提交。

---

## 0. 一句话结论

三件产物是**同一个产品概念的三代实现**，互不兼容：

- **F1（0730）** = 自研模板 v2.4.12 家族，**2 层折叠**（分类 → 唤醒词，唤醒词内含变体折叠），数据源是旧 12 分类 / 81 唤醒词 / 112 prompt 的 `_triggers` 快照。
- **F2（0731）** = 自研渲染器 v3.0「merged」家族，**4 层折叠**（分类 → 子功能 → 场景 → 详情），数据源 `merged(scene_data + _triggers.py)`，9 分类 / 80 场景。
- **F3（根）** = **完全换架构**：`公共组件`（Base Skill）参数化 `help_template.html` + `base.js` + `base.css` 注入，**手机壳 + 底部 Tab 横滑 + Sheet 弹层**，10 分组 / 54 子功能 / **436 场景**，数据源 `_triggers.py` 唯一权威（经 `render_help_center.py` v4.0 转换层）。

F3 不是 F1/F2 的延续，而是 `公共组件/assets/help_template.html` 的注入产物（可逐行对齐，见 §A.3）。

---

## A. 页面骨架（有序 section 清单 + 元素/类名 + 行号）

### A.1 F1 `卡路里_HELP_20260730_130429.html`（492 行）

| # | Section | 元素 / 类名 | 行号 |
|---|---|---|---|
| 1 | doctype/head/title | `<title>📚 卡路里 · 唤醒词速查台</title>` | 1–6 |
| 2 | 单块内联样式 | `<style>` … `</style>` | 7–297 |
| 3 | body | `<body>` | 299 |
| 4 | HERO | `.hero > .container`（渐变底 `linear-gradient(135deg,#fafbfc,#f0f4f8)`） | 301–305 |
| 4a | 标题 | `<h1>📚 卡路里 · 唤醒词速查台</h1>` | 302 |
| 4b | 一句引导 | `.hero .sub`「💡 点 ▸ 类别 → 选唤醒词 → 复制 prompt → 贴给 AI」 | 303 |
| 4c | 统计条（JS 填充） | `.stats#heroStats` | 304 |
| 5 | 主容器 | `.container` | 307–310 |
| 5a | 内容挂载点 | `<main id="mainContent">`（初始 `.empty` 加载中…） | 308 |
| 5b | 页脚（**硬编码字符串**） | `<footer>卡路里技能 · 唤醒词速查台 · v2.4.12 · 2026-07-26</footer>` | 309 |
| 6 | Toast 反馈层 | `#toast.toast[role=status][aria-live=polite]` + `.toast-icon/.toast-body/.toast-title/.toast-detail/.toast-close` | 313–320 |
| 7 | 注入数据 | `<script>window.__DATA__ = {…}</script>`（单行 JSON，30,529 字符） | 323 |
| 8 | 控制脚本 | `<script>` … `</script>` | 325–490 |

**运行时渲染出来的层级**（`render()` 384–415 / `renderWordCard()` 440–457 / `renderVariant()` 459–467）：

```
main#mainContent
└─ details.cat-block[id=cat-<key>][data-cat-name]
   ├─ summary  → span(icon) + span(name) + span.count-pill(条目数)
   └─ div.cat-content
      └─ details.word-card                        ← L2
         ├─ summary → span.ww-name + span.ww-aliases>span* + span.ww-count(「N变体」)
         │            + button.copy-btn.copy-main（📋 复制，onclick=copyMainPrompt(i)）
         └─ div.word-content
            ├─ div.ww-desc
            ├─ div.prompt-cli（CLI 命令）
            ├─ div.prompt-main（主 prompt 全文）
            └─ div.variants-section            ← L3
               ├─ div.variants-header（「变体 (N)」）
               └─ details.variant-block
                  ├─ summary → span.v-label
                  └─ div.v-content → div.prompt-cli + div.prompt-main
                                     + button.copy-btn[data-prompt]
```

**F1 没有的**：搜索框、类别导航条、展开/收起全部、复制全部、关于/联系、深色模式。`/search /expandAll /collapseAll /copyAll 已删除（v2.4.10）` 明写在 `:487`。

### A.2 F2 `卡路里_HELP_20260731_201530.html`（596 行）

| # | Section | 元素 / 类名 | 行号 |
|---|---|---|---|
| 1 | head/title | 同 F1 | 1–6 |
| 2 | 内联样式 | `<style>` … `</style>` | 7–319 |
| 3 | HERO | `.hero > .container` | 323–327 |
| 3a | 引导语（改为 4 层口径） | `.hero .sub`「💡 点 ▸ 类别 → 子功能 → 场景 → 详情 → 复制 prompt」 | 325 |
| 3b | 统计条 | `.stats#heroStats` | 326 |
| 4 | **搜索区（新增，sticky）** | `.search-wrap` > `input.search#searchInput` + `.search-meta > #searchCount + #dataSource` | 330–336 |
| 5 | 内容挂载点 | `<main id="mainContent">` | 337 |
| 6 | 页脚（**JS 数据填充**） | `<footer id="footer">` | 338 |
| 7 | Toast | `#toast.toast` 同 F1 结构 | 342–349 |
| 8 | 注入数据 | `<script>window.__DATA__ = {…}</script>`（36,843 字符，含 `meta`） | 351 |
| 9 | 控制脚本 | `<script>` … `</script>` | 353–594 |

**运行时层级**（`render()` 461–516 / `renderSubBlock()` 450–459 / `renderScene()` 433–448 / `renderSceneDetail()` 418–431）：

```
main#mainContent
└─ details.cat-block[id=cat-<key>][data-cat]        ← L1（无 open 属性 = 默认折叠）
   ├─ summary → span(icon) + span(name) + span.count-pill
   └─ div.cat-content
      └─ details.sub-block[data-sub][open]          ← L2（默认展开）
         ├─ summary → span(子功能名) + span.sub-count(「N 场景」)
         └─ div.sub-content
            └─ details.scene-card[data-key][data-cat][data-sub]   ← L3
               ├─ summary → span.scene-name + span.scene-wake + span.scene-output.<process|result|receipt>
               │            + span.scene-ext(🔗 依赖外部) + button.copy-btn.copy-main[data-prompt-index][data-wake]
               └─ div.scene-content
                  └─ div.scene-detail                ← L4
                     ├─ div.intent（user_intent）
                     ├─ div.cli（data_source）
                     ├─ pre.prompt-pre（prompt_template 全文）
                     └─ div.meta > span*（📦 data_source / 🎨 html_template / 🔗 依赖外部 / 📋 data_fields）
```

`updateSearchCount()`（582–591）在搜索框下方显示「共 N 场景」/「匹配 M / N」/「无匹配」。

### A.3 F3 `卡路里.html`（根镜像，2,048 行）

**骨架 = `公共组件/assets/help_template.html`（611 行）+ 3 处注入**，可精确对账：

| help_template.html | 注入物 | F3 落点 | 行数增量 |
|---|---|---|---|
| `:195` `<script id="help-data" type="application/json"><!--INJECT-DATA--></script>` | 契约 JSON（单行 110,207 字符） | `:195`（同行内联） | 0 |
| `:197` `<!--SHARED-HELPERS-->` | `公共组件/assets/base.js` | `:197–1145` | +948 |
| `:200` `<!--SHARED-CSS-->` | `公共组件/assets/base.css` | `:1148–1637` | +489 |
| `:203–609` 控制脚本 | （模板自带） | `:1640–2045` | — |

611 + 948 + 489 = 2,048 ✅ 与 F3 行数一致。

| # | Section | 元素 / 类名 | 行号 |
|---|---|---|---|
| 1 | `<title>HELP 原型 · V4 三级目录版</title>`（原型遗留标题） | — | 6 |
| 2 | 原型控制台样式 | `<style>` … `</style>` | 7–168 |
| 3 | body / 手机壳舞台 | `.stage > .stage-title + .stage-sub` | 170–174 |
| 4 | 手机壳 + 内容容器 | `.phone > .notch + .screen#screen`（680px 宽；≤500px 变 100vw/100vh） | 176 |
| 5 | Sheet 遮罩 | `.sheet-mask#sheetMask` | 178 |
| 6 | 底部 Sheet 弹层 | `.sheet#sheet` > `.grip` + `.s-close#sheetClose` + `.s-scroll`（`.s-head#shHead` + `#shBody`）+ `.s-actions` > `button.copy-btn#shCopy` | 179–189 |
| 7 | 遗留 toast 占位（`display:none`，实际未被 base.js 使用） | `.toast#toast` | 191 |
| 8 | 注入数据 | `<script id="help-data" type="application/json">{…}</script>` | 195 |
| 9 | base.js | `<script>` … `</script>` | 196–1145 |
| 10 | base.css | `<style>` … `</style>` | 1147–1638 |
| 11 | 控制台脚本 | `<script>` … `</script>` | 1640–2046 |

**运行时层级**（`render` 在 `:1766–1829`，分组/子功能/卡片在 `:1776–1792`）：

```
.screen#screen
└─ .app > .app-inner
   ├─ header.hero → .h-left(.eyebrow 技能名 / h1 标题 / .lead「436 场景 · 点卡片看详情」)
   │                + .h-badge「436 场景」+ .hero-steps(.step→.arrow→.step→.arrow→.step)
   ├─ .init-banner#initBanner（可选 · 本产物未注入）
   ├─ .search-wrap > .search-box(.s-icon + input#sB[type=search] + button.s-clear#sClear)
   ├─ .hitcount#hitC + .search-empty#emptyC
   ├─ .pages#pages（横向 ViewPager，scroll-snap: x proximity）
   │  └─ .page[data-page=<group.id>]  ×10
   │     └─ details.subgroup[open]
   │        ├─ summary(子功能名 + span.sg-count)
   │        └─ .sg-body > .grid（2 列）
   │           └─ .mini[data-key] → .m-top(.chip + .type-badge*) + .m-bottom(.m-name + button.copy-btn[data-c])
   │  └─ .page[data-page="about"]（关于 Tab：.about-sec 联系作者 / 版本 / 其他技能）
   └─ .tab-bar#tabBar > button.tab[data-nav] ×11（10 分组 + 关于）
```

### A.4 三者差异

| 维度 | F1 (0730) | F2 (0731) | F3 (根) |
|---|---|---|---|
| 架构家族 | 自研模板 v2.4.12 | 自研渲染器 v3.0 merged | Base 参数化 `help_template.html` |
| 折叠层数 | L1 分类 → L2 唤醒词 → L3 变体 | L1 分类 → L2 子功能 → L3 场景 → L4 详情 | 底部 Tab 分页 → 子功能折叠 → 场景卡 → Sheet 详情 |
| 搜索 | ❌（v2.4.10 删除，`:487`） | ✅ sticky + 5 字段匹配 + 自动展开 | ✅ sticky + `<mark>` 高亮 + 自动跳页 |
| 分类导航 | ❌ 仅折叠 | ❌ 仅折叠 | ✅ 底部 Tab 横滑 + 点击居中 |
| 每场景 CLI 展示 | ✅ `div.prompt-cli`（`:452`） | ✅ `.cli`（`:427`） | ❌ 契约里没有 `data_source` 字段 |
| 变体/示例 prompt | ✅ 31 变体 + `fill_hints`（但 `fill_hints` 未渲染） | ❌ 1 场景 1 prompt | ❌ 1 场景 1 prompt（130 条含 `____` 空位） |
| 参数表单 + 实时预览 | ❌ | ❌ | ✅ 代码路径存在（`openSheet` 1910–1937），但本产物 0 场景有 `editable_fields` → 不出现 |
| 关于/联系作者 | ❌ | ❌ | ✅（`:1796–1820`） |
| 版本/日期戳 | 硬编码页脚「v2.4.12 · 2026-07-26」（`:309`） | 数据驱动页脚「渲染时间:2026-07-31 20:15:30」+「源:merged(...)」（`:475–478`） | 关于 Tab「v · HELP 模板 v4」（`SKILL_VERSION` 为空，见 §D 缺陷） |
| 断点 | 600 / 900 | 600 / 900 | 500 / 501 / 820 |
| 深色模式 | ❌ | ❌ | ❌ |
| 数据契约 | 旧 12 分类 / 81 唤醒词 / 112 prompt | 9 分类 / 80 场景 | 10 分组 / 54 子功能 / 436 场景 |

---

## B. 「一键复制 prompt」交互

### B.1 F1（0730）

- **prompt 文本来源**：两套机制并存
  - 主 prompt：**不落地在 DOM**，只存 JSON blob（`:323`）；按钮是 `onclick="event.preventDefault(); event.stopPropagation(); copyMainPrompt(${i})"`（`:449`），`copyMainPrompt(i)`（`:480–485`）从 `DATA.data.triggers[i].main_prompt.text` 取。
  - 变体 prompt：**序列化进 HTML 属性** `data-prompt="${escapeHTML(v.prompt)}"`（`:465`），`bindCopyButtons()`（`:469–477`）读 `btn.dataset.prompt`。
- **复制函数**：`copyText(text, btn)`（`:334–356`）。
- **剪贴板机制**：`navigator.clipboard.writeText(text).then(after).catch(()=>{fallback(text);after();})`（`:353–354`）；`fallback(text)`（`:376–382`）= 创建隐藏 `<textarea>` + `document.execCommand('copy')` + 移除。
- **复制后反馈**（3 重）：
  1. Toast `showToast(wake)`（`:364–369`）—— 4,500 ms 自动消失（`:368`）；内容「已复制 <em>{唤醒词}</em>」+「粘贴给 AI(微信/飞书/任何 AI 工具),卡路里技能会自动执行这个流程,完成后你会在飞书收到 HTML」+ 关闭按钮「✓ 知道了」（`:316–319`）；`aria-live=polite`（`:313`）。
  2. 按钮文案变「✓ 已复制」+ `.copied` 类（绿底 + `copySuccess` 弹跳动画，`:176–185`），2,000 ms 复原（`:346–352`）。
  3. 无原生 alert。
- **已知缺陷**：`copyMainPrompt` 用 `document.querySelector('.word-card:nth-of-type(${i + 1}) .copy-btn.copy-main')`（`:483`）定位按钮——`nth-of-type` 按父元素内计数（`.cat-content`），不是全局索引，因此 i>0 时视觉反馈常落在**错误的按钮**上（复制内容本身正确）。

### B.2 F2（0731）

- **prompt 来源**：**只用索引**。按钮 `data-prompt-index="${i}"` + `data-wake`（`:444`），`bindCopyButtons()`（`:536–548`）读 `DATA.data.scenes[idx].prompt_template || .prompt`。
- **复制函数**：`copyText(text, btn)`（`:364–381`）；toast 文案取自 `btn.dataset.wake`（`:366–368`）。
- **剪贴板机制**：与 F1 相同（`navigator.clipboard.writeText` `:378–380` + `fallback` `:391–397`）。
- **复制后反馈**：Toast（`:399–416`，4,500 ms）+ 按钮「✓ 已复制」+`.copied`（`:371–377`，2,000 ms）。**不关闭、不折叠**任何 `<details>`。
- **兼容壳**：`copyMainPrompt(i)`（`:384–389`）保留为旧接口（注释明写「ticket 07 兼容」）。
- **已知缺陷**：`fallback()` 里写成 `ta.style.csssheet`（`:393`，拼写错误，应为 `cssText`），隐藏样式未生效——textarea 短暂可见但不影响复制结果。

### B.3 F3（根）

- **prompt 来源**：**渲染时序列化进 `data-c` 属性**：`'<button class="copy-btn" data-c="' + esc(buildPrompt(s, {})) + '">复制</button>'`（`:1785`）。
- **复制函数**：`doCopy(text)`（`:1961–1967`）——**只走 `document.execCommand('copy')`**（`:1965`），**没有 `navigator.clipboard`**。
  - 注意：同文件注入的 `base.js` 里有更完整的 `copyText(s, opts)`（`:224–255`，`navigator.clipboard` + `_fbCopy` 回退 + 可配 toast 文案）与 `_fbCopy()`（`:215`），但控制台的复制路径**没有调用它**（与 `公共组件/docs/help-template-contract.md:98`「复制指令交互复用 Base P0（copyText/toast）」不一致）。
- **事件绑定**：全局委托 `document.addEventListener('click', …)`（`:1970–1985`）抓 `[data-c]`；若场景有参数则重算 `buildPrompt(s, readParams(s.id))` 并做必填拦截（`:1976–1981`，缺失时 `toastMsg('请先填写: …')` `:1958–1960`）。
- **复制后反馈**：`showToast()`（`:1955–1957`）→ Base `toast('已复制', '粘贴给 AI,技能会自动执行,完成后你会拿到结果 HTML。', {icon:'copy'})` → `.hm-toast-stack` 堆叠 toast（base.js `:265–390`，`aria-live=polite` `:335`）；**复制后不自动关 Sheet**（`:1984` 注释 B3）。
- **Sheet 内复制**：`#shCopy` 在 `openSheet()` 里被赋 `dataset.pid = s.id`（`:1926`）与 `dataset.c = buildPrompt(s, {})`（`:1927`）；参数输入 `input` 事件实时重写 `[data-prev]` 预览（`:1929–1933`）。
- **参数拼接格式**（`buildPrompt` `:1748–1759`）：`prompt_template` + 空行 + 每行 `label + ': ' + value`。

### B.4 复制内容逐字样例（来自各文件注入 JSON，`\n` 已还原）

**F1 / F2 共有的一条（主 prompt）**
```
请你加载技能 卡路里,执行唤醒词「开卡路里」。

我想看今日主页 dashboard(KPI 卡片 + 今日目标完成度 + 最近 7 天趋势小图 + 待办事项)。

完成后给 1 句话总结,不需要过多文字解释。
```
**F1 变体样例**（label `开卡路里 [指定日期]`，`cli: python scripts/render_home.py --date 2026-07-20`，`fill_hints: ['日期 YYYY-MM-DD: ']`）
```
请你加载技能 卡路里,执行唤醒词「开卡路里 [指定日期]」。

我要看过去某一天(不是今天)的主页 dashboard。

完成后给 1 句话总结,不需要过多文字解释。
```

**F2 主 prompt 样例**（`key=home_today_overview`）
```
请你加载技能 卡路里,执行唤醒词「看今日主页」。

我想看今天主页 dashboard:今日 4 维 KPI(热量/蛋白/饮水/运动)+ 今日目标完成度 + 最近 7 天趋势小图 + 待办事项。

完成后给 1 句话总结,不需要过多文字解释。
```
**F3 主 prompt 样例**（`id=home_today_overview`；收尾语已换成 HTML 交付纪律）
```
请你加载技能 卡路里,执行唤醒词「看今日主页」。

我想看今天的主页 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```
**F3 最长一条**（`id=body_meas_add`，288 字符，含 13 个 `____` 空位）
```
请你加载技能 卡路里,执行唤醒词「记围度」。

我量了身体围度,请帮我记录 13 项围度(胸/腰/腹/臀/肩/大腿/小腿/手臂/前臂,左+右),量了哪项填哪项,没量的留空。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。

胸围(cm):____
腰围(cm):____
…
右前臂(cm):____
```

**三者是否不同**：是。F1/F2 收尾语为「完成后给 1 句话总结…」；F3 全部换成 `_triggers.py:86` 的 `tail`「交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。」——F3 中 `1 句话总结` 出现 0 次，`三句话` 出现 436/436 次。

---

## C. 数据注入点

### C.1 形状与占位符

| | F1 | F2 | F3 |
|---|---|---|---|
| 注入点 | 模板 `<!--INJECT-DATA-->` 已被替换为 `<script>window.__DATA__ = {payload};</script>`（`templates/help_center.html` 家族；占位符残留 = 0） | 同左 | `<script id="help-data" type="application/json">{payload}</script>`（`:195`） |
| 定位变量 | `window.__DATA__` → `const DATA = window.__DATA__ && …status==='ok' ? window.__DATA__ : null`（`:326`） | 同左（`:355`）+ `const META = DATA.meta \|\| {}`（`:356`） | `var HELP = JSON.parse(document.getElementById('help-data').textContent)`（`:1642`） |
| 信封 | `{status, data:{summary,categories,triggers}, message}`（无 `meta`） | `{status, meta, data:{summary,categories,scenes}, message}` | **无信封**，直接是契约对象 `{skill_name,title,subtitle,contact,groups}` |
| 条目字段 | `{category,wake_word,aliases,desc,main_prompt:{cli,text},fill_hints,variants:[{label,cli,prompt,fill_hints}]}` | 13 字段 `{key,name,wake_word,category,subfunction,output_type,html_template,data_source,prompt_template,user_intent,data_fields,depends_on_external,order,_from,_legacy}` | `groups[].{id,icon,label,subgroups[].{id,label,scenes[].{id,title,wake_word,status,prompt_template,types}}}` |
| `message` | `已加载 81 唤醒词 / 112 prompt` | `已加载 80 场景 / 9 分类 · 数据源:merged(scene_data + _triggers.py)` | 无 |
| `meta` | — | `{"source":"merged(scene_data + _triggers.py)","mode":"merged","rendered_at":"2026-07-31 20:15:30","scene_data_count":1,"triggers_count":80}` | 无 |

### C.2 实测条目数（附命令与输出）

**计数命令（统一写法）**
```powershell
$lines = [System.IO.File]::ReadAllLines($f, [System.Text.Encoding]::UTF8)
# 找到 window.__DATA__ / help-data 所在行 → 去掉 script 包裹 → 反转义 <\/ → 写 scratch JSON
# python: json.loads(...) 后按字段计数
```
输出要点：
- F1：`JSON blob at 1-based line 323, line length 30529` → `triggers len: 81`；`total variants: 31`；`triggers with main_prompt.text: 81`；`triggers with main_prompt.cli: 81`；`dup wake words: []`；`categories: 12`；`summary: {"total_wake_words": 81, "total_prompts": 112, "total_categories": 12, by_category{…}}`；`fill_hints` 出现 82 次（81 主 + 1 变体），非空 fill_hints 的 trigger 12 个 / 合计 40 项。
- F2：`JSON blob at 1-based line 351, line length 36843` → `scenes len: 80`；`categories` 数组声明 11 项，`summary.total_categories = 9`（`目标管理`/`技能协同` 声明但 0 场景，`render()` `:498` 跳过空组）；`meta.triggers_count = 80`；`variants: 0`。
- F3：`line 195 length=110207` → `groups: 10`，`subgroups: 54`，`scenes: 436`；`unique ids: 436/436`；`types: {结果 329, 回执 79, 过程 6}`；无 `types` 的 22 条（全部是 legacy）；`prompts containing ____: 130`；`prompts containing 三句话: 436`；`1 句话总结: 0`；重复唤醒词 1 个（`记身材照` ×3 场景，id 各不相同）；prompt 长度 70–288 字符（均值 109.6）。
- `_triggers.py`（`ast.parse`）：`TRIGGERS` 在 `:109` 起，**436 个元素**；分类直方图 `{主页 9, 饮食 70, 体重 58, 运动 39, 健身计划 32, 目标管理 25, 基础信息 4, 身体细节 13, 身材照片 10, 分析 167, 复盘 9}`；新 13 字段 414 条 / legacy 22 条。

**权威链闭环**：`_triggers.py` 436 条 → `render_help_center.py:build_contract()`（`:96–194`）把 `复盘 9` 映射进 `分析`（`CATEGORY_LEGACY_NAME` `:56–58`）→ `分析 167+9 = 176`，正好等于 F3 里 `analysis` 分组 176 场景；10 分组 / 54 子功能 / 436 场景全部对上（测试亦断言 `tests/test_base_pipeline.py:85–90`：`len(groups)==10`、`total==436`、id 唯一）。

### C.3 产物来源定位（git，只读）

- **F1** ← 提交 `d54aa9f3`（2026-07-26 11:54「help_center 复制反馈(v2.4.12 · 按钮 4 状态 + iOS 风 toast)」）时期的渲染器 + 模板：该提交的 `build_data()` 产出 `summary{total_wake_words,total_prompts,total_categories,by_category}` + `categories` + `triggers{category,wake_word,aliases,desc,main_prompt,variants}`，模板含 `.word-card`/`.variant-block`，页脚字符串 `v2.4.12 · 2026-07-26` 由该提交引入（`git log -S` 命中）。
- **F2** ← 提交 `587b5013`（2026-07-31 18:17「渲染器升级到 v3.0，支持场景数据合并」）：该版 `build_data(mode='merged')` 产出 `meta.source = 'merged(scene_data + _triggers.py)'`、`scene_data_count`、`total_scenes`、`total_prompts = len(scenes) # 1 prompt / scene(无变体)`，与 F2 的 `meta` 逐字段一致。
- 两件产物本身**未纳入 git**（`git log -- <artifact>` 无输出），无法用 git 直接证明「哪个 commit 生成了哪一次渲染」；但上述渲染器/模板指纹是唯一匹配项。
- **F3** ← `render_help_center.py` v4.0（`:1–22` docstring，2026-08-13，#316 task ④）+ `公共组件/injector.py` + `公共组件/assets/help_template.html`；`subtitle` 里的 `更新于 2026-08-14 11:38` 与 `_triggers.py` mtime（2026-08-14 11:37）一致。`ADR-0001`（`docs/adr/0001-help-html-as-root-mirror.md`）规定根镜像 = 最新 `卡路里_HELP_<TS>.html` 的重命名，`mirror_to_root()`（`render_help_center.py:211–234`）实现。

---

## D. 「完整能力速查台」构成要素 × 三文件存在性

| # | 能力 | F1 | F2 | F3 | 证据 |
|---|---|---|---|---|---|
| 1 | Hero：技能名 + 标题 + 一句引导 + 统计 | ✅ | ✅ | ✅（形态不同：`.hero-steps` 三步引导 + `.h-badge`） | F1 `:301–305`；F2 `:323–327`；F3 `:1766–1769` |
| 2 | 统计数字（分类/场景/prompt） | ✅ 3 项 | ✅ 3 项 | ✅ 1 项（「436 场景」两处） | F1 `:393–396`；F2 `:469–472`；F3 `:1767` |
| 3 | 搜索 / 过滤 | ❌ | ✅ 5 字段 + 自动展开 + 计数 | ✅ 全 Tab 跨页 + `<mark>` 高亮 + 自动跳页 | F2 `:550–591`；F3 `:1991–2037` |
| 4 | 分类分组 | ✅ 12 分类 | ✅ 9 分类 × 子功能 | ✅ 10 Tab × 54 子功能 | F1 `:404–411`；F2 `:490–508`；F3 `:1776–1792` |
| 5 | 分类导航 | ❌ | ❌ | ✅ 底部 Tab 横滑 + 点击居中 + 滚动同步 | F3 `:1823–1828`、`:1844–1900` |
| 6 | 逐场景 CLI 命令展示 | ✅ `.prompt-cli` | ✅ `.cli` | ❌ 契约无 `data_source`（违反 ADR-0008 §必须遵守 3） | F1 `:452`；F2 `:427`；`docs/adr/0008:36–39` |
| 7 | 一键复制 prompt | ✅ 主 + 变体 | ✅ 每场景 | ✅ 卡片 + Sheet | 见 §B |
| 8 | 示例/变体 prompt | ✅ 31 变体 | ❌ | ❌ | F1 `:454–455`；F2/F3 数据无 variants |
| 9 | 使用说明 | ✅ hero sub | ✅ hero sub | ✅ `.hero-steps` 三步 | F1 `:303`；F2 `:325`；F3 `:1768` |
| 10 | 版本 / 日期戳 | ✅ 硬编码 `v2.4.12 · 2026-07-26` | ✅ 数据驱动 `rendered_at` + `源:` | ⚠️ 关于 Tab 有版本区块，但 `HELP.version` 未注入 → 渲染成「v · HELP 模板 v4」 | F1 `:309`；F2 `:475–478`；F3 `:1812` |
| 11 | 复制反馈 toast | ✅ iOS 风 + 4.5s + 关闭 | ✅ 同 | ✅ Base 堆叠 toast（最多 5 条 / ≤820px 收窄 3 条） | F1 `:195–247`,`:364–369`；F3 `:1955–1957`，base.js `:265–390` |
| 12 | 按钮四态反馈 | ✅ `:176–185` | ✅ `:220–229` | ✅ `.copy-btn:active`（无 `copied` 态） | 同左 |
| 13 | 空态 / 错误态 | ✅「❌ 数据加载失败」 | ✅ 同 +「暂无场景」/「无匹配」 | ❌ 无 try/catch：`JSON.parse` 失败即整页白屏 | F1 `:386–388`；F2 `:463`,`:510`,`:589`；F3 `:1642` |
| 14 | 响应式（手机/平板/桌面） | ✅ 600/900 | ✅ 600/900 | ✅ 500/501/820 | 见 §E |
| 15 | 安全区适配 | ✅ `env(safe-area-inset-bottom)` | ✅ | ✅（tab-bar / sheet / toast / 多处） | F1 `:280`,`:290`；F3 `:119`,`:156`,`:271` |
| 16 | 深色模式 | ❌ | ❌ | ❌（三文件 `prefers-color-scheme` 出现 0 次） | 实测 grep |
| 17 | 可访问性 | ⚠️ `role=status` + `aria-live` | ⚠️ 同 | ⚠️ `aria-live` + `aria-label`，无键盘快捷键 | F1 `:313`；F2 `:342`；F3 `:335`,`:1770` |
| 18 | 关于 / 联系作者 / 其他技能 | ❌ | ❌ | ✅ | F3 `:1796–1820` |
| 19 | 参数表单 + 实时预览 | ❌ | ❌ | ✅ 代码路径（`editable_fields`），本产物 0 场景使用 | F3 `:1910–1937`；契约 `help-template-contract.md:54–60` |
| 20 | 首用引导横幅 | ❌ | ❌ | ✅ 代码路径（`init_banner`），本产物未注入 | F3 `:1770–1772` |
| 21 | 单文件离线 | ✅ 外部 `src/href` = 0 | ✅ = 0 | ✅ = 0（仅 SVG `xmlns` 与联系链接是文本） | 实测 grep |
| 22 | 持久化偏好（localStorage） | ❌ | ❌ | ❌（三文件 0 次） | 实测 grep |
| 23 | 数据驱动页脚/来源标注 | ❌ | ✅ | ⚠️ `subtitle` 读了但**从不渲染**（`:1645` 定义、无使用点） | 见 §F |

**F1 的死数据**：`fill_hints`（40 项）在 JSON 里出现 82 次，但渲染函数（`renderWordCard`/`renderVariant`）从不引用 → 页面上不可见。
**F2 违反自家 ADR**：`renderSceneDetail()` 渲染 `data_fields` 与「🔗 依赖外部」（`:423–425`），正是 `docs/adr/0008-help-html-design-principles.md:51–52` 明令禁止展示的元数据。
**F3 的死代码/死字段**：`SUBTITLE`（`:1645`）、`META_BLOCKS`（`:1646`）、`ABOUT_EXTRA`（`:1650`）定义后无渲染点；`.t-view/.t-wizard/.t-collect/.t-result/.t-batch`（`:80–85`）未被 JS 使用（`typeBadgeHTML` 走内联 style，`:1705–1718`），只有 `.t-dev` 被用（`:1721`）；`#toast`（`:191`）被 base.js 的 `.hm-toast-stack` 取代；`.stage-title/.stage-sub`（`:173–174`）在桌面端会显示「📱 HELP 原型 · V4 三级目录版」原型遗留文案（≤500px 才隐藏，`:161`）。

---

## E. 复刻规格（TypeScript 技能）——验收标准

> 目标：用 TS 重建「完整能力速查台」的 UI+UX。**建议以 F3 为视觉/交互基线**（它是三者中最完整、且已有正式契约 `公共组件/docs/scene-data-contract.md` + `help-template-contract.md`），把 F1/F2 的独有能力（CLI 展示、变体示例、搜索计数）作为可选增强项回补。

### E.1 设计令牌（从内联 CSS 逐字读出）

**F1/F2 令牌组**（`F1:9–13`，`F2:9–14`）：
```
--bg:#f5f6f7; --card:#fff; --text:#1c1c1e; --sub:#6b6b6f;
--accent:#0071e3; --green:#34c759; --border:#e5e5e7;
--code-bg:#f0f0f2; --shadow:0 1px 2px rgba(0,0,0,.04);
--orange:#ff9500;                    /* 仅 F2 :13 */
```
- 字体栈（body，`F1:17` / `F2:18`）：`-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif`；`font-size:13px; line-height:1.4; -webkit-font-smoothing:antialiased`
- 等宽栈（`F1:130`,`:135`）：`"SF Mono", Consolas, monospace`
- Hero 字号（相对 body 百分比）：h1 `220%`（=28.6px，weight 700，`letter-spacing:-.3px`，`line-height:1.15`）；`.sub` `105%`（=`--accent`）；`.stats` `115%`
- 类型徽章底色（`F2:168–170`）：`process #fff3e0 / #ff9500`，`result #e3f2fd / #0071e3`，`receipt #e8f5e9 / #34c759`
- 主 prompt 块（`F1:127–132`）：`background:#f0f7ff; border-left:2px solid var(--accent); border-radius:4px; font-size:11.5px`
- 折叠头（`F1:87–91`/`F2:105–109`）：`background:#fafbfc; padding:7px 12px; font-size:13px; font-weight:600; min-height:36px`；箭头 `content:'▸'`，`[open]` 时 `rotate(90deg)`，`transition:transform .12s`
- Toast（`F1:195–247`）：`background:rgba(28,28,30,.94)`，`backdrop-filter:blur(20px) saturate(180%)`，`border-radius:14px`，`padding:13px 14px 13px 16px`，`max-width:480px; min-width:320px`，`bottom:32px`，`z-index:9999`；标题 `#fff`、副文 `#c8c8cc`、强调绿 `#4dd96b`、关闭按钮底 `rgba(255,255,255,.10)`
- 圆角阶梯：卡片 8px → 子卡 6px → 变体/按钮 5px → 药丸 999px
- 容器：`max-width:960px; padding:0 12px 40px`（`F1:20`）

**F3 令牌组**（原型块 `:9`；Base 块 `:1159–1171`）
```
/* 原型块 :9 */
--fg:#1d1d1f; --fg2:#6e6e73; --fg3:#86868b; --bg:#f2f2f7; --card:#fff;
--line:#d1d1d6; --blue:#007aff; --blue2:#0a63ce; --soft:#f0f6ff;
--ok:#34c759; --orange:#ff9500; --red:#ff3b30;
--shadow:0 1px 2px rgba(0,0,0,.04),0 4px 14px rgba(0,0,0,.05);

/* Base token A 组 :1159–1171（后出现 → 同名变量覆盖前者） */
--fg:#1d1d1f; --fg2:#6e6e73; --fg3:#86868b; --bg:#f5f5f7; --card:#ffffff;
--line:#d2d2d7; --blue:#007aff; --blue2:#0a63ce; --soft:#f5f8ff;
--ok:#34c759; --shadow:0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06);
```
⚠️ **实测要点**：两个 `<style>` 都是 `:root` 同优先级，后者（Base，`:1147` 之后）胜出 → 页面实际 `--bg=#f5f5f7`、`--line=#d2d2d7`、`--soft=#f5f8ff`，原型里的 `#f2f2f7/#d1d1d6/#f0f6ff` 是**失效值**；`--orange/--red` 因 Base 未重定义而保留。复刻时不要盲抄原型块。
- 字体栈（`:10`）：`-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif`；`font-size:14px; line-height:1.5`
- 等宽栈：`.sheet .prompt-box/.pprev` = `ui-monospace,Menlo,monospace`（`:143`,`:154`）；base.js toast code = `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`（`:271`）
- 类型徽章（`TYPE_DEFAULT` `:1693–1704`）：采集/录入 `#e7f8ee/#1a7a3a`；查看/结果/回执/校验/选择 `#e8f2ff/#0a63ce`；向导/过程 `#e2f7f5/#00897b`；批量 `#f3e9fb/#8e3fc9`；未知 → 蓝兜底
- 圆角阶梯：hero/subgroup/mini/sheet-mask 12px → copy-btn/tab-ico 8–9px → tab 14px → 药丸 999px → sheet 顶角 22px / 底角 36px
- 触控尺寸：`.copy-btn` `min-height:36px`（`:86`）、`.mini .copy-btn` 26px（`:116`）、Sheet 主复制钮 48px（`:157`）、Base `button.copy` `min-height:44px`（`:1187`）
- 阴影：`--shadow`（见上）；Sheet `0 -8px 40px rgba(0,0,0,.25)`（`:135`）；Tab 激活 `0 4px 12px rgba(0,122,255,.3)`（`:129`）

### E.2 断点

| 文件 | 断点 | 内容 |
|---|---|---|
| F1/F2 | `@media (max-width:600px)` | body 12.5px；容器 padding 8px/底部 60px；h1 18px；stats 11px；折叠头 padding 8px 10px/12.5px；toast 变全宽 `left:12px;right:12px` + `bottom:calc(12px + env(safe-area-inset-bottom,0))`；`body{padding-bottom:env(safe-area-inset-bottom,0)}` |
| F1/F2 | `@media (min-width:601px) and (max-width:900px)` | `.container{max-width:720px}` |
| F3 | `@media(min-width:501px)` | `.tab-bar{width:680px;left:50%;transform:translateX(-50%)}` |
| F3 | `@media(max-width:500px)` | `.phone{width:100%;height:100vh}`，`.stage` 归零，`.sheet-mask` 全屏，`.sheet` 全宽，隐藏 `.stage-title/.stage-sub` |
| F3 (base) | `@media (max-width:820px)` | toast 栈上限 5→3（base.js `:291–304`）；base.css 三处 `.ss-*` / smartSelect 降级（`:1400`,`:1448`,`:1633`） |

### E.3 最低实现要求（编号验收标准）

1. **数据契约（唯一输入）**：页面只接受一个 JSON 契约对象 `{skill_name, title, subtitle?, init_banner?, meta_blocks?, groups[], contact?, version?, recommendations?}`；`groups[]` 必须为**两级** `{id, icon?, label, subgroups[{id, label, scenes[]}]}`；`scenes[]` 为 `{id, title, wake_word, types?, status, prompt_template, editable_fields?}`。缺 `skill_name`/`title`/`groups` → **渲染失败报错**，不得产出半成品页面。（依据 `公共组件/docs/scene-data-contract.md:11–81`、`injector.py:127–138`、`help-template-contract.md:42`）
2. **唯一注入点**：产物必须是单文件 HTML，数据以 `<script id="help-data" type="application/json">` 内联；注入后**占位符 0 残留**（`<!--INJECT-DATA-->` / `<!--SHARED-HELPERS-->` / `<!--SHARED-CSS-->` 各恰好 1 次，缺失/重复即硬拦截）。（`公共组件/injector.py:5–7`,`:26–28`；`tests/test_base_pipeline.py:110–113`）
3. **数据即真相**：场景总数、分组数、子功能数必须**由数据算出**，不得硬编码；产物中「N 场景」计数必须等于 `Σ scenes.length`。参考断言：10 分组 / 436 场景 / id 全局唯一（`tests/test_base_pipeline.py:84–90`）。
4. **四层信息架构**：一级分组（Tab）→ 二级子功能（可折叠，默认展开）→ 三级场景卡（2 列网格）→ 四级详情（底部 Sheet）。禁止破坏该层级（`docs/adr/0008:77`）。
5. **卡片必备元素**：场景标题、唤醒词 chip、类型徽章（1–N 个，默认配色表见 §E.1）、复制按钮；`status==='【待开发】'` 时渲染 `t-dev` 徽章且复制按钮**仍可点**（`scene-data-contract.md:79`、`help-template-contract.md:62`）。
6. **搜索**：sticky 吸顶输入框；输入即过滤（大小写不敏感）；命中 `title/wake_word/分组名/子功能名` 任一即显示；命中时自动展开所属子功能与分组；空结果给明确空态；显示「匹配 M / N」计数；清空按钮恢复全量并回到原 Tab；对标题命中片段加 `<mark>` 高亮。（F3 `:1991–2037`；F2 `:550–591` 为简化版参照）
7. **一键复制**：每个场景卡与 Sheet 各有一个复制按钮；复制内容 = `prompt_template`（无参数时逐字相等，**不做任何 trim/换行改写**）；有 `editable_fields` 时 = `prompt_template` + `\n\n` + 每行 `label + ': ' + value`（空值行省略），且 `required` 字段为空时**拒绝复制**并提示缺失字段名。（F3 `:1748–1759`,`:1976–1981`；契约 `scene-data-contract.md:118–136`）
8. **剪贴板**：优先 `navigator.clipboard.writeText()`；不可用或 reject 时回退隐藏 `<textarea>` + `document.execCommand('copy')`；**不得只实现其中一种**（F3 只实现回退，属回归）。（F1 `:353–355`；base.js `:248–254`）
9. **复制反馈**：复制成功后必须给出非模态反馈（toast），文案含「已复制」+ 场景/唤醒词标识；toast 自动消失（F1/F2 = 4500ms；Base 栈式可配）；可手动关闭；按钮同时进入 `copied` 态（绿底 + 动画）并在 2000ms 内复原；**复制后不关闭详情层**（B3 决策，F3 `:1984`）。
10. **参数表单实时预览**：Sheet 内 `editable_fields` 渲染为 `label + input(placeholder=hint)`，`选填` 标注非必填；输入时实时重算预览文本（F3 `:1918–1933`）。
11. **每场景可执行命令展示（增强项，建议保留）**：若数据带 `data_source`，在详情层展示为可复制的等宽代码块；约定 `python ` 前缀（`docs/adr/0008:36–39`）。
12. **空态/错误态**：数据缺失或 `status!=='ok'` → 明确错误页，禁止白屏（F3 当前**缺**此守卫，`:1642` 直接 `JSON.parse`；复刻必须补 try/catch）。
13. **响应式**：必须通过 375px 手机 / 768px 平板 / 1280px 桌面三档；含 `<meta name="viewport">`、≥1 个 `@media`、无固定 px 高度的 `<svg>`、表格须在 `overflow-x:auto` 容器内（`scripts/check_html_responsive.py:48–109`）；iOS 安全区用 `env(safe-area-inset-bottom)`。
14. **触控目标**：主要操作按钮 ≥44px（Base 规范 `button.copy{min-height:44px}`）；F1/F2 的 4px/8px padding 按钮（约 24px 高）视为不达标。
15. **离线自足**：产物 0 个外部 `src/href`（可用 data-URI 内联 SVG），可 `file://` 直接打开，手机可看。
16. **可访问性**：toast `role="status"` + `aria-live="polite"`；图标按钮给 `aria-label`；折叠用原生 `<details>/<summary>` 或等效键盘可达实现。
17. **版本/来源戳**：页脚或关于区必须显示 `version` 与渲染时间（`rendered_at`）；**若契约提供 `subtitle` 就必须渲染它**（F3 读了不渲染，属缺陷）。
18. **令牌单一来源**：颜色/字体/圆角/阴影只能有一组 `:root` 变量；禁止像 F3 那样两套同名变量互相覆盖（`:9` vs `:1159–1171`）。
19. **守卫测试**：至少 4 条自动化断言 —— ① 契约校验通过；② 注入后 3 占位符 0 残留 + `id="help-data"` 存在；③ 场景数零丢失（`total == 数据源条数`）且 id 唯一；④ 产物含公共 `copyText` 实现、无自研复制/剪贴板重复实现（`tests/test_base_pipeline.py:78–113`,`:234–298`）。
20. **移动端 `<details>` 兜底（可选但已实战验证）**：部分 Android WebView / 旧 iOS Safari 上原生 `<details>` 偶发不响应，需在 `summary` 的 `click` 后 50ms 检查 `open` 是否翻转、未翻转则强制翻转，并跳过复制按钮的点击（F1 `:422–438`；F2 `:518–534`）。

---

## F. 未能确定 / 需注意的边界

1. **F1、F2 产物的生成命令未留痕**：`git log -- <artifact>` 无输出（产物不入库）；只能按渲染器/模板指纹定位到 `d54aa9f3`（F1 家族）与 `587b5013`（F2 家族）。**无法 100% 证明**具体是哪一次渲染调用产生的这两个文件。
2. **F1 的 12 分类数据源文件未定位**：F1 的 payload 无 `meta`，未记录 `scene_data` 来源；`_triggers.py` 现为 436 条、13 分类（含 `目标管理`/`基础信息`），与 F1 的 12 分类（`饮食记录/食品库/综合/身体成分/围度`）不符 → F1 数据来自更早的 `_triggers` 快照，具体提交未追（非本次交付必需）。
3. **F2 的 `scene_data_count: 1`** 表示当时只有 1 个开发期场景 JSON 参与合并；未读取 `.scratch/scene_data/*.json` 逐个核对是哪一个（该目录在允许范围内，但与本报告结论无关）。
4. **`templates/help_center_v2_4_12.html.bak`（521 行，mtime 2026-07-31 17:23）** 结构上属 F2 家族（`.sub-block/.scene-card/data-prompt-index`，占位符在 `:333`），但多出一套 `.scene-prompt-preview` 内联预览机制（`.bak:175`），F2 产物里不存在 → **它不一定是生成 F2 的那一版模板**，只能算最近的幸存者。当前正式模板是 `公共组件/assets/help_template.html`（611 行），`templates/help_center.html` 已退役（`tests/test_base_pipeline.py:92–95`）。
5. **F1 静态 body 的 `<div>` 不配对**：`:299–321` 区间 11 个 `<div` vs 12 个 `</div>`（多出的一个在 `:321`）；浏览器会自行纠错，实际渲染不受影响，但复刻时应避免。
6. **F3 的 `SKILL_VERSION` 为空**：注入数据无 `version` 字段，故关于 Tab 显示「卡路里 / v · HELP 模板 v4」（`:1812`）——这是数据缺口而非代码 bug。
7. **深色模式**：三件产物均无 `prefers-color-scheme`，无法从现有实现推断设计意图；若复刻需要，须新设计。
