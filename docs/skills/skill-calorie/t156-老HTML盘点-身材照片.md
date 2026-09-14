# t156 老 HTML 盘点 · 身材照片（场景09）

老技能只读源：`D:\2Study\StudyNotes\SKILLS\卡路里`。本件只盘身材照片相关的模板与渲染脚本，逐件比对「老技能有、新仓没有」的能力缺口，供新仓身材照片场景重写时参照。

## 范围

| # | 文件 | 行数 | 字节 | 类型 |
|---|------|------|------|------|
| 1 | `templates/body_photo_gallery.html` | 203 | 11196 | 模板 |
| 2 | `templates/body_photo_receipt.html` | 222 | 12500 | 模板 |
| 3 | `templates/body_photo_compare.html` | 132 | 7119 | 模板 |
| 4 | `templates/body_photo_gif_result.html` | 108 | 6035 | 模板 |
| 5 | `templates/body_photo_gif_planner.html` | 556 | 26875 | 模板 |
| 6 | `templates/body_photo_log_wizard.html` | 244 | 11287 | 模板 |
| 7 | `templates/body_photo_viewer.html` | 146 | 8000 | 模板 |
| 8 | `scripts/render_body_photo_gallery.py` | 172 | — | 渲染脚本 |
| 9 | `scripts/render_body_photo_receipt.py` | 331 | — | 渲染脚本 |
| 10 | `scripts/render_body_photo_compare.py` | 111 | — | 渲染脚本 |
| 11 | `scripts/render_body_photo_gif_result.py` | 137 | — | 渲染脚本 |
| 12 | `scripts/render_body_photo_gif_planner.py` | 257 | — | 渲染脚本 |
| 13 | `scripts/render_body_photo_log_wizard.py` | 42 | — | 渲染脚本 |

辅助参照（不计入 13 件）：`scripts/render_body_photo_viewer.py` 139L、`scripts/body_photo_tracker.py` 589L、`references/body_photos_schema.md` 19L、根目录样例 `body_photo_gif_planner_正面.html` 552L。

场景09 十条唤醒词：存身材照／移除身材照／设置照片标签／看身材照／查身材照详情／对比身材照／做身材照GIF／看身材照HELP／看身材照向导／看GIF规划器。

## 1. body_photo_gallery.html（相册）

### 服务哪条唤醒词
`查身材照`（`scripts/render_body_photo_gallery.py:5` 注释「对应 SKILL.md 唤醒词:查身材照」；注入 `meta.entity_type='看身材照'`／`meta.wake_word='查身材照'`，`render_body_photo_gallery.py:130`）。页眉徽章自称「结果型 · 看身材照」（`templates/body_photo_gallery.html:82`）。渲染器 CLI：`--date-from/--date-to/--tag-filter/--limit/--no-embed-images`（`render_body_photo_gallery.py:156`）。

### 页面结构
1. 页眉条 `.meta-bar`：左侧时间（`body_photo_gallery.html:80-83`）
2. 标题区 `h1` + `.sub` 副标题（`:85-86`）
3. KPI 三格 `.kpi-row`：照片总数／标签数／距上次拍照（`:88-92`）
4. 筛选栏 `.filter-bar`（标签 chips 由 JS 动态填，`:94`；`:122-141`）
5. 体积超限横幅 `.budget-banner`（条件插入，`:143-151`）
6. 照片网格 `.grid`（3 列拍立得，`:96`；`:153-181`）
7. 空态 `#empty`（`:97`；`:178-181`）
8. 底部按钮区 `.footer`（模板内留空 `:99-101`）+ `#actionbar-zone`（`:216-217`）

### 优秀 UI/UX 点
- KPI 三格信息密度合适：总数／标签数／距上次拍照，第三项带「N 天」单位换算（`:88-92`、`:117-120`）
- 拍立得式网格：卡片外包圆角 + 内嵌图片自身圆角，`aspect-ratio:3/4` 统一比例，`object-fit:cover`（`:37-41`）
- 照片占位三态分流且各带原因：未嵌入（体积超限）／照片数据不存在（含日期）／无法读取（`:156-163`）
- 体积预算横幅给的是「为什么 + 怎么办」：说明已嵌前 N 张、还剩 N 张、并指路「用标签或时间筛选分次查看」（`:143-151`）
- 标签 chips 自带计数（`标签 计数`），且 `title` 提示点击行为（`:129-135`）
- 点击 chip 零往返即时过滤，且 KPI 总数跟随可见张数联动（`:183-208`）
- 空态与错误态复用 Base 控件 `window.emptyState`／`window.errorReceipt`，全仓文案一致（`:106-109`、`:179`）
- 移动端：网格降 2 列、按钮拉到 44px 触摸高度、`flex:1 1 45%`（`:63-73`）

### 过时或该丢的点
- 过滤靠反解 chip 文本 `chip.textContent.split(' ')[0]` 与 `c.textContent === tag + ' ' + count` 判断激活，标签含空格／纯数字即错（`:198`、`:204`）
- `.filter-bar input`、`.filter-bar .lbl` 样式定义在，但 DOM 里没有日期输入控件，属死样式（`:35-36`）
- `.btn`／`.btn-primary`／`.footer .btn-group` 全套按钮样式仍留在模板内，而复制数据／复制日志已统一由 Base `actionBar` 提供，属重复实现（`:54-62`、`:99-101`、`:216-217`；Base 唯一来源见 `tests/test_base_pipeline.py:232-251`）
- `filters.date_from/date_to` 只进副标题文案，页面无任何日期筛选交互（`:114-115`）
- `cell.dataset.tags` 写入后无人读取，残留钩子（`:167`）

### 新仓缺口
- 无「内联 base64 + 整页体积预算」的嵌入退让策略（超限即降级为占位并明示）
- 无标签 chips 计数与前端即时过滤（零往返重渲）
- 无照片占位三态（未嵌入／数据不存在／读取失败）及其原因文案
- 无 KPI「距上次拍照 N 天」这类节奏感指标

## 2. body_photo_receipt.html（操作回执）

### 服务哪条唤醒词
一条模板服务 6 个唤醒词（`scripts/render_body_photo_receipt.py:5` 注释「对应 SKILL.md 唤醒词(6 个)」），由场景字段 `scene` 分流：`批量存照片`／`存照片（含备注）`／`存一张照片`（`:81`）、`删身材照`（`:151`）、`改照片标签`／`加照片标签`／`删照片标签`（经 `_tag_op_data`，`:167`、`:188`、`:205`、`:226`）。对应十条中的「存身材照／移除身材照／设置照片标签」。CLI 六个 live 子模式：`--live-add/--live-delete/--live-tag-set/--live-tag-add/--live-tag-remove`（`:263-267`），`--chain` 强制（`:272`）。

### 页面结构
1. 页眉条 `.meta-bar`（`:99-102`）
2. 标题区 `h1` + `.sub`（状态徽章 + 场景句，`:104-105`）
3. 身份卡 `.id-card`：图标／操作标题／记录号／时间+类型／一句话摘要（`:107-115`）
4. 规律拍照提示 `.dist-card`（`:117`；填充 `:177-183`）
5. 照片明细 `.items-card`（`:119-122`；填充 `:185-209`）
6. 标签变更 `.diff-card`（改前 → 改后，`:124-137`；填充 `:211-229`）
7. 底部按钮区 + `#actionbar-zone`（`:139-141`、`:239`）

### 优秀 UI/UX 点
- 单模板承载三类操作，靠 `op`（create/delete/update）切换徽章配色、图标与标题：删=红 `✕ 删除成功`、改=橙 `✎ 修改成功`、存=蓝 `✓ 存入成功`（`:154-165`）
- 标签对照的标签词随场景替换：`改照片标签`→改前/改后，`加照片标签`→加前/加后，`删照片标签`→删除前/删除后，同结构不同措辞（`:215-219`）
- 规律拍照提示有正向反馈文案：≥14 天给「建议保持规律拍照节奏」，否则「节奏不错，继续保持」（`:177-183`）
- 批量存照逐张带状态徽章与失败原因，失败行单独一行红字说明（`:196-207`）
- 无变化场景降级优雅：标题自动改写为「标签(未变化)」（`:227`）
- 空标签统一渲染为灰底「(无)」，不出现空白破洞（`:195`、`:222`）

### 过时或该丢的点
- `h1` 静态写死「✅ 操作回执」，删除/修改成功也顶着对勾，与下方图标语义打架（`:104`）
- 明细行失败原因用内联魔法数对齐 `padding:0 0 10px 90px`，缩略图宽度一改就错位（`:207`）
- 明细右列状态徽章与 `.thumb` 宽度隐式耦合（缩略图固定宽），无 CSS 变量（`:199-206`）
- 两段 JS 直写 `innerHTML` 拼字符串（`:198-207`、`:224`），标签内容未转义
- 模板内 `.footer` 空占位壳 + 独立 actionbar 脚本脚注两套机制并存（`:139-141`、`:239-240`）

### 新仓缺口
- 无「一个回执模板按 op 状态机切换配色/图标/标题」的复用形态
- 无批量操作逐条状态徽章 + 失败原因的行内呈现
- 无标签变更「改前 → 改后」对照卡片（含场景化标签词）
- 无「距上次同标签拍照 N 天」的行为引导文案

## 3. body_photo_compare.html（对比两张照片）

### 服务哪条唤醒词
`对比身材照`／`对比两张照片`（`scripts/render_body_photo_compare.py:5`「对应 SKILL.md 唤醒词:对比两张照片」；`:119` 输出到 `对比两张照片/result`）。CLI：`--id1 --id2` 必填、`--no-embed-images`、`--chain` 必填（`:93-96`）。跨标签判定在渲染器侧算好：`cross_tag = sorted(p1.tag_list) != sorted(p2.tag_list)`（`:55`），`interval_days` 由日期差算出（`:70`）。

### 页面结构
1. 页眉条 `.meta-bar`（`templates/body_photo_compare.html:67-70`）
2. 标题区 `h1` + `.sub`（`:72-73`）
3. 跨标签警告条 `.cross-tag-warn`（条件显示，`:75`）
4. 并排两卡 `.compare`：图 / 「照片 1·2」/ 日期 / 标签 / 备注（`:77-96`）
5. 间隔横幅 `.interval-banner`：`间隔 N 天`（`:98`）
6. 底部按钮区 + `#actionbar-zone`（`:100-102`、`:141-142`）

### 优秀 UI/UX 点
- 并排双卡结构极干净：左右同构（图／身份／日期／标签／备注五层，`:78-95`），无多余指标干扰「看变化」
- 间隔天数是全场唯一的「大写数字」：26px、绿色、`tabular-nums`，把最能说明问题的数字顶到视觉最高优先级（`:24-27`、`:98`）
- 跨标签对比主动示警：标签不同即提示「可比性较弱，建议对比同角度(同标签)照片」——阻止用户得出错误结论（`:28-30`、`:75`）
- 拍立得式内嵌圆角与相册页一致，图与卡双层圆角（`:31-35`）
- 无图时不塌陷：`📷 无图` 占位保留卡片高度（`:122`）
- 窄屏自动转单列对照（`:54-60`），移动端可上下滑动比对

### 过时或该丢的点
- 模板内残留死代码：`function fmt(p)` 定义后从未调用，且函数体闭合后紧跟 `})();`，属未清理的实验残片（`:134-137`）
- 跨标签警告文案写死「同角度(同标签)」假设，标签体系一旦扩展（如季节标签）即误导（`:75`）
- 页头徽章与 `h1` 都写死「对比两张照片」，与「对比身材照」唤醒词口径不统一（`:69`、`:72`）
- 标签与备注均直写 `innerHTML`，未转义（`:124-126`）
- `.btn`／`.btn-primary` 按钮样式同样在模板内重复定义，与 Base actionBar 重叠（`:45-53`）

### 新仓缺口
- 无「同一角度跨时间并排 + 间隔天数」的对比视图
- 无可比性校验与示警（标签口径不一致时提示）
- 无对比视图的窄屏单列降级规则

## 4. body_photo_gif_result.html（GIF 结果）

### 服务哪条唤醒词
`做身材照GIF`／`生成身材照GIF`（`scripts/render_body_photo_gif_result.py:5`「对应 SKILL.md 唤醒词:生成身材照GIF」）。渲染器直接调 `body_photo_tracker.generate_gif`（`:43`），成功才渲染。CLI 面很宽：`--tag` 必填（包含匹配）、`--start/--end` 成对、`--days` 最近 N 天、`--photo-id` 可重复追加、`--width/--height`（默认 400×600）、`--duration`（默认 500ms）、`--transition` 三选一 cut/fade/dissolve（`:111-121`）。

### 页面结构
1. 页眉条 `.meta-bar`（`templates/body_photo_gif_result.html:57-60`）
2. 标题区 `h1` + `.sub`（`:62-63`；副标题为「标签「X」· N 张照片合成」，`:94`）
3. GIF 舞台 `.gif-stage`（`:65-67`，单片圆角+10px 拍立得式小边，`:24-28`）
4. 信息双列 `.info-grid` 七格（`:69-77`）：合成照片总数／帧数／时间跨度／首张日期／末张日期／标签／文件位置
5. 底部按钮区 + `#actionbar-zone`（`:79-81`、`:117-118`）

### 优秀 UI/UX 点
- 内嵌失败有优雅退路：GIF 过大不进 base64，改为「GIF 文件较大未内嵌,请本地打开:」+ 路径代码块，而非空白（`:99-101`）
- 缺失值统一渲染为 `—`，不出现空白单元格（`:104-107`）
- 信息网格里「时间跨度」与「首末日期」并存：既给跨度直觉又给精确日期（`:72-74`、`:105`）
- 长文本字段（标签、路径）单列降字号 `word-break:break-all`，不撑破卡片（`:34`、`:75-76`）
- 舞台区 `background:#000` 承托 GIF，保证透明/暗帧可见（`:27`）
- 页宽收窄到 720px（相比相册 860px），单张媒体居中，观看聚焦（`:17`）
- 渲染器把可调参数全暴露给 AI（尺寸/帧时长/转场），GIF 观感可协商（`render_body_photo_gif_result.py:117-120`）

### 过时或该丢的点
- `.info-grid` 七格固定顺序写死在模板，「文件位置」「标签」与统计值混排，主次不清（`:69-77`）
- `.btn` 系列样式同样重复定义但页面已无自建按钮（`:35-43`）
- 移动端 `.info-grid` 仍写 `1fr 1fr` 两列，未真降级为单列（`:47`）
- GIF 文件路径直接铺在正文里占版面，更适合收进复制数据/日志（`:76`、`:109`）
- `frame_count` 做了双重空判 `!== undefined && !== null`，说明上游字段既有缺失又有 null 两种空，契约含糊（`:104`）

### 新仓缺口
- 无「媒体产物超体积即降级为本地路径提示」的呈现约定
- 无 GIF 参数（尺寸/帧时长/转场）由用户协商后再合成的入口
- 无「信息网格 + 空值统一破折号」的字段呈现规范

## 5. body_photo_gif_planner.html（GIF 规划器）

### 服务哪条唤醒词
`看GIF规划器`（`scripts/render_body_photo_gif_planner.py:5` 注释仍是「生成身材照GIF」，但页面自称 planner：`templates/body_photo_gif_planner.html:7` `身材照 GIF planner · 卡路里`，脚本 `:258` 描述「渲染身材照 GIF planner HTML(v2.3.1 · 兼任 gallery)」）。它是**唯一一个「用户先在页面里做决定、再把 prompt 交回 AI」的交互型页面**。数据入口：`--ids`（逗号分隔，与 `--tag` 二选一）／`--tag`（按标签拉全部照片）／`--tags`（文件名用）（`render_body_photo_gif_planner.py:259-261`）。另有 URL 参数旁路：`?ids=12,15,22`、`?tag=`、`?tags=`（`body_photo_gif_planner.html:288-298`）。

### 页面结构
1. 标题区 `h1` + `.sub`（版本与五步流程一句话，`:181`）
2. `.tip.info` 工作流说明（四步有序列表，`:183-191`）
3. `.tip` 变更说明（解释为何去掉 cropper.js，并给出替代话术，`:193-198`）
4. 顶部统计条 `.summary-bar`：已选／总可用／文件丢失（隐藏条件显示）+ 全选/全不选/反选三个动作（`:200-221`）
5. `section 1` 照片列表 `.photo-list`（每项 = 勾选框 + 90×120 缩略图 + 信息 + 操作按钮 + 可折叠裁剪面板，`:223-229`；`:340-395`）
6. `section 2` GIF 细节 `.param-grid`：速度／循环／宽／高／水印／过渡 chips／输出文件名（`:231-273`）
7. `section 3` Prompt 预览 `.prompt-box` + 「📋 复制并发送给 AI」（`:275-281`）
8. 页脚版本戳（写明「无 cropper.js · 飞书 webview 兼容」，`:283`）+ `#actionbar-zone`（`:594-595`）

### 优秀 UI/UX 点
- 三步编号卡片（`.step-num` 圆形蓝底数字）把「选 → 调 → 复制」的线性流程做成可视步骤条（`:34-40`、`:225`、`:233`、`:277`）
- 页面即工作流的自解释：`.tip.info` 用有序列表写四步操作，连「点哪个按钮会触发 AI 跑哪条命令」都写明（`:183-191`）
- 子标题直接写成一句话流水线「浏览 → 选 → 输裁剪坐标 → 调细节 → 复制 prompt 给 AI」，用户一眼知道终点（`:181`）
- 参数默认值直接落进 input `value`（500ms／400×600／无限循环），用户零输入即可用（`:237`、`:242`、`:250`、`:254`）
- 过渡效果用 chips 单选（cut/fade/dissolve 带中文注解「直接切/渐变/溶解」），比下拉更直观（`:262-266`）
- 参数全部标注单位（单帧 ms、像素），水印与输出名给示例占位符（`:236`、`:257-258`、`:270`）
- Prompt 自动生成且**就是最终可执行命令**：把已选 ID、逐张裁剪「(x,y) w×h → 即 (x1,y1,x2,y2)」、速度/循环/尺寸/水印/过渡/输出拼成带 ```bash 围栏的 CLI（`:519-579`）
- 裁剪坐标自动换算成 CLI 期望的 `[x1,y1,x2,y2]`，用户只填左上原点 + 宽高（`:529-534`）
- 输出文件名可自动拼默认值 `${tag}_${首日期}_${末日期}.gif`（`:515`）
- 未完成勾选时点复制会给 toast 提示而非静默失败：`text.startsWith('//')` 判定占位 prompt（`:291`）
- 列表项状态可视化：未选 `opacity:.45` + 缩略图转灰（`:70-71`）
- 顺序可调（↑ 上移／↓ 下移，首尾自动 disabled）——直接决定 GIF 播放顺序，且禁用态由 JS 算（`:389-390`）
- 丢失文件不静默：统计条单独橙色计数「文件丢失(已跳过)」（`:211-214`）
- 裁剪面板可折叠（`.collapsed`），三键「✓ 应用／✎ 清除／↺ 全图」＋全图复位语义完整（`:86-90`、`:383-385`）
- 兼容性取舍写进页面和页脚：为飞书 webview 去掉 cropper.js，改 4 数字手输，并给「不会算坐标就说帮我裁左上 1/4」的降级话术（`:193-198`、`:283`）
- 体积优化取舍落在渲染器注释里：`all_photos` 只带元数据不嵌图、`selected_photos` 才嵌 base64（`render_body_photo_gif_planner.py:164-173`）；base64 不进 payload 段以免飞书 webview 审查截断（`:52`）
- 静态预填兜底：数据未注入时不清空 Python 预填的 `<img src="data:...">`（`:300-302`）
- 筛选回落链：URL `?tag=` → payload `current_tag` → `selected_photos` 全选（`:312`）

### 过时或该丢的点
- 版本号写死在用户可见文案里（子标题与页脚都是 `v2.3.5`），每次迭代都要改模板文案（`:181`、`:283`）
- 变更说明 `.tip`（讲 cropper.js 去留）属开发过程记录，常驻用户视野是噪音，应移到维护文档（`:193-198`）
- 复制按钮叫「📋 复制并发送给 AI」但实际只 `window.copyText`，不发送，文案夸大（`:279`、`:289-293`）
- 大段 HTML 由 JS 字符串拼接（`:340-395`），字段未转义，标签/备注含引号即破版
- `render_body_photo_gif_planner.py` 内还留着 `_render_photo_list_html` 这套 Python 侧预填（`:211-243`）与 JS 渲染双轨并行，两处按钮文案已不一致（Python「✂️ 框选裁剪」vs JS「✂️ 裁剪坐标」，`:243`、`:391`）
- 页面同时兼任 gallery（脚本描述自称），职责已混（`render_body_photo_gif_planner.py:258`）
- 交互全靠 URL 参数 + 全局函数挂 `window.selectAll/selectNone/selectInvert`，无状态封装，和「复制数据/日志」的只读回执范式不属一类（`:483-485`）

### 新仓缺口
- 无「用户先在 HTML 里做选择，再把可执行 prompt/命令交回 AI」的交互回填闭环
- 无裁剪坐标（像素框）录入与其到 CLI 参数的换算
- 无 GIF 播放顺序可调（上移/下移）与顺序即帧序的显式建模
- 无「丢失文件计数」与「已跳过」的显式交代
- 无把页面版本/兼容性取舍写进页脚的自描述习惯

## 6. body_photo_log_wizard.html（存照向导）

### 服务哪条唤醒词
`看身材照向导`（`scripts/render_body_photo_log_wizard.py:5`「对应 SKILL.md 唤醒词:记身材照」；页面自称 `配置型向导`，`templates/body_photo_log_wizard.html:103`）。与 planner 同属「用户在 HTML 里填表 → 复制 prompt 给 AI → AI 执行」的配置型页面，渲染脚本仅 42 行，几乎是纯模板。

### 页面结构
1. 标题区 `h1` + `.sub`（「配置型向导 · 填好参数后复制 prompt 给 AI」，`:102-103`）
2. `.tip` 工作流一句话（选文件 → 选 tag → 加备注 → 复制 prompt，并写明 AI 会跑 `body_photo_tracker.py add`，`:105-106`）
3. `h2 1️⃣ 选择照片文件`：`.file-drop` 拖放区 + 隐藏 `<input type="file" multiple>` + `.file-list`（`:110-116`）
4. `h2 2️⃣ 标签(tag)`：8 个预设 `.tag-chip` + 自定义输入（`maxlength=20`）（`:120-137`）
5. `h2 3️⃣ 备注(可选,推荐填)`：`textarea` + 示例占位（`:142-144`）
6. `h2 📋 复制 prompt 给 AI`：`.prompt-box` + `#copyPromptBtn`（`:149-151`）
7. payload 注入位 + `#actionbar-zone`（`:279`、`:283-284`）

### 优秀 UI/UX 点
- 四段式表单，每段标题自带 emoji 序号，扫一眼即知做到第几步（`:110`、`:120`、`:142`、`:149`）
- 预设标签本身就是「拍摄口径词表」：正面／背面／侧面／正面自然光／正面灯光／手臂／腹部／腿部，把「可比对」这件事固化成词表（`:124-131`）
- 预设 chip 与自定义输入互斥且实时同步：点 chip 清空自定义，输入自定义则取消 chip 激活（`:216-231`）
- 备注占位符给三个真实范例：「7/1 早上空腹 / 减脂期第 30 天 / 体脂钳测前」——直接教用户写出有对比价值的备注（`:144`）
- 照片列表可拖入也可点选，逐项 `✕ 移除`（`:172`、`:198-202`）
- Prompt 随表单实时重算，缺项时给出**指到具体步骤**的占位提示：`// 请先选照片文件(上方第 1 步)`、`// 请填 tag(上方第 2 步)`（`:247-253`）
- 生成的 prompt 就是完整可执行 CLI，备注做了引号转义 `note.replace(/"/g,'\\"')`（`:255-268`）
- prompt 末尾指定交接物：「完成后用 crud_receipt.html 返回回执」，形成「向导 → 执行 → 回执」闭环（`:270`）
- 复制前拦截占位文本并 toast，不让用户粘贴一条注释给 AI（`:163`）

### 过时或该丢的点
- 复制按钮叫「复制 prompt 给 AI」但只调 `window.copyText`，不发送，文案与行为不符（`:151`、`:161-164`）
- 预设标签硬编码在模板 HTML 中，不与数据库已有标签联动，用户既有的自定义标签永远不会出现在 chip 里（`:123-131`）
- prompt 只带文件名不带绝对路径，AI 需自行猜路径（`:255`、`:267`）
- 文件选择无格式/体积校验，`accept="image/*"` 不拦 HEIC，体积超限要到写库阶段才炸（`:115`）
- 表单无「上次选择记忆」，每次存照都要重选 tag 与重填备注（无对应代码）
- 页面没有版本戳（planner 有），同族两页自描述习惯不统一

### 新仓缺口
- 无「用户在本机选文件、由页面产出可执行命令」的配置型向导形态
- 无预设标签词表 + 自定义互斥的标签录入控件
- 无备注范例式占位（教用户写可比对备注）
- 无「缺项时提示指到第几步」的表单校验话术
- 无「向导页明确交代下一步回执页」的跨页面交接约定

## 7. body_photo_viewer.html（单张查看）

### 服务哪条唤醒词
`查身材照详情`（`scripts/render_body_photo_viewer.py:5`「对应 SKILL.md 唤醒词:查身材照(单图子路径)」；`:134` 传 `command_cn="查身材照"`）。渲染器 Python 侧就把大图 base64 直接写进 `<img src>`（`:136-143`，`max_dim=800`），JS 只填元数据。邻居由 `get_neighbor_ids(photo_id, tag)` 在同一标签内取相邻（`:84-98`）。

### 页面结构
1. 页眉条 `.meta-bar`（`templates/body_photo_viewer.html:66-69`，徽章「报告型 · 单图查看」）
2. 标题区 `h1` + `.sub`（`:71-72`；副标题为 `日期 · 标签 · #id`，`:115`）
3. 前后导航 `.prev-next`（`:74-77`）
4. 主图卡 `.photo-card`：黑底图区（`.photo-wrap`，`:79-82`）+ 信息区（日期／标签／`#id`／备注，`:83-88`）
5. 动作区 `.actions` 三键：🗑️ 删除这张／✏️ 修改标签／← 返回画廊（`:91-95`）
6. `.tip` 删除语义说明（`:97-99`）
7. 页脚版本戳 `body_photo_viewer v1.0`（`:101`）+ `#actionbar-zone`（`:166-167`）

### 优秀 UI/UX 点
- 主图观看体验优先：`background:#000` + `max-height:75vh` + `object-fit:contain`，竖图横图都不裁切（`:27-29`）
- 同标签内前后翻页零往返：`prev_id/next_id` 由后端算好，直接编进 `body_photo_viewer.html?id=` 链接（`:74-77`、`:132-143`）
- 首尾自动禁用：无 prev/next 时给 `disabled` 类并 `pointer-events:none`，不出现坏链接（`:45`、`:137`、`:142`）
- 返回画廊保留上下文：`backBtn` 带 `?tag=` 回到同标签筛选态（`:147-148`）
- 「修改标签」深链到画廊的写路径 `body_photo_gallery.html?action=retag&id=&tag=`（`:151`）
- 删除前用 `confirm` 报全身份「#id (日期 标签)」，并在 tip 里说明「只删 DB 记录、文件仍留在 `photos/`」——破坏性操作可逆性交代清楚（`:97-99`、`:154-158`）
- 备注缺失渲染为「(无备注)」，不留白（`:129`）
- 图挂时改 `alt` 为「日期 标签 (图加载失败)」而不是重设 src，保留后端预填图（`:105-124`）
- 元数据与图片渲染分离：图片走 Python 注入、元数据走 JS，避免大数据进 JS 字符串（`render_body_photo_viewer.py:136-143`）

### 过时或该丢的点
- 「🗑️ 删除这张」按钮点下去只是把一句中文口令 `删除身材照 #id ...` 复制到剪贴板，不发送、无后续反馈，用户会以为已经删了（`:92`、`:154-158`）
- 「修改标签」是死链级隐式协议：`?action=retag` 需 gallery 侧实现，viewer 自己不校验，gallery 不认就没反应（`:151`）
- 移动端断点里残留 `.section`／`.kpi-grid`／`.food-card .macros`／`.table-wrap` 等**本页不存在的类名**，是从其它页面复制的样板（`:51-60`）
- `#payload` 注入位排在读取它的脚本之后（脚本 `:104-159` 早于 payload `:162`），静态顺序上 `window.__P__` 必为 null；能否跑通取决于 Base 注入器是否前移占位符（`_base_render.inject` 以 `strict=False` 原地替换），移植时应把 payload 位提前到首个脚本之前
- 标题与副标题都只写「身材照」，未体现「详情」语义，页面自称「报告型」而徽章语义与唤醒词不齐（`:68`、`:71`）
- `.btn`／`.btn-danger`／`.btn-primary` 又一套按钮样式在模板内重复定义（`:35-41`）

### 新仓缺口
- 无单图详情页的「大图优先 + 信息卡」版式与 75vh 观看规则
- 无同标签内前后翻页（首尾自动禁用）的浏览链
- 无破坏性操作的「可逆性说明」（删记录不删文件）
- 无「返回到带筛选上下文的列表」的链接约定

## 八、老模板 → 唤醒词 对应表

| 唤醒词（场景09） | 老模板 | 形态 | 备注 |
|---|---|---|---|
| 存身材照 | `body_photo_log_wizard.html` + `body_photo_receipt.html` | 配置型向导 → 回执 | 向导产 prompt，AI 执行后出回执（`body_photo_log_wizard.html:270`、`render_body_photo_receipt.py:81`） |
| 移除身材照 | `body_photo_receipt.html` | 回执 | `op=delete`，`scene=删身材照`（`render_body_photo_receipt.py:151`） |
| 设置照片标签 | `body_photo_receipt.html` | 回执 | 三个子场景改/加/删标签，标签词随场景切换（`render_body_photo_receipt.py:188/205/226`；`body_photo_receipt.html:215`） |
| 看身材照 | `body_photo_gallery.html` | 结果型 | 相册 + 标签筛选（`render_body_photo_gallery.py:5`） |
| 查身材照详情 | `body_photo_viewer.html` | 报告型 | 单图子路径（`render_body_photo_viewer.py:5`） |
| 对比身材照 | `body_photo_compare.html` | 结果型 | 双图并排 + 间隔天数（`render_body_photo_compare.py:5`） |
| 做身材照GIF | `body_photo_gif_result.html` | 结果型 | 渲染器直接合成 GIF（`render_body_photo_gif_result.py:5`） |
| 看身材照HELP | 无专属模板 | — | 本次 7 件模板中无 HELP 页；HELP 属共享 help 模板族，不在本件范围 |
| 看身材照向导 | `body_photo_log_wizard.html` | 配置型 | 页面自称「配置型向导」（`:103`） |
| 看GIF规划器 | `body_photo_gif_planner.html` | 配置型 | 与上者同族，页面自称 planner（`:7`） |

两个结构规律值得新仓直接借用：一是**同一模板按 `op`／`scene` 状态机分流多条唤醒词**（`body_photo_receipt.html` 一件顶六条）；二是**配置型（用户填 → 出命令）与结果型／报告型（只读回执）严格分族**，配置型额外挂 `#copySendBtn`，只读型复制按钮统一走 Base `actionBar`（证据：7 件模板均含 `#actionbar-zone`，且 `tests/test_base_pipeline.py:232-251` 断言模板内不得再自建复制按钮）。

## 九、取证方法与边界

- 老技能全程只读（`D:\2Study\StudyNotes\SKILLS\卡路里`），未改动新仓任何代码、issue 或 git 状态。
- 每个模板读前 120 行 + 用 grep 定位结构关键词（`class=`／`id=`／`<h2`／`<button`／`复制`／`data-`／`payload`）；`gif_planner` 另读 `181-302`、`515-589` 两窗口，未整文件通读。
- 渲染脚本只用 grep 看唤醒词注释、CLI 参数与 payload 字段构造，未整读；`body_photo_tracker.py`（589L）与 `references/body_photos_schema.md`（19L）本次仅列出、未阅读，相关结论未写入本件。
- 行数与任务给定值有出入（实测）：`gallery` 219L、`receipt` 242L、`compare` 144L、`gif_result` 120L、`gif_planner` 597L、`log_wizard` 286L、`viewer` 169L。本件行号均以实测文件为准。
- 未运行任何渲染器；「模板能否跑通」类判断（如 viewer 的 payload 顺序）只基于静态阅读，已在正文标注需实测确认。
- Base 公共层（`window.actionBar`／`errorReceipt`／`emptyState`／`statusBadge`／`toast`／`copyText`／`SHARED-CSS`／`SHARED-HELPERS`）由 `scripts/_base_render.py:39-72` 经 `公共组件/injector.py` 注入，其内部实现未展开阅读。
