# 多语言 allowlist 分类台账（#1320）

本表是 `tooling/i18n-scope.json` 最终剩余豁免的逐条分类：一条＝「一件文件里的一个字面量」。allowlist 自 #1320 起是「文件＋字面量」登记，同一串在数据位放行、在界面位仍被门抓住。

判据按 `docs/agents/多语言-位置四分规则.md` 与 ADR-0004「数据不译」：命令关键字／唤醒词路由键／写进库的用户数据／派生件（样式、脚本源码、HELP 样例输出）／页内契约锚点（REQUIRED_BLOCKS、data-need）／机器键（协议字段、点分键、文件名）不迁；标题位与载荷位必须走 `m()`。

读数：剩余豁免 1879 对（文件·串），陈旧对 149 条已从 scope 删除；UI-cue 复扫剩余 127 对（全为已确认不译项，见附录）。

## 按包与用途分桶

| 包 | 对 | 用途桶 |
| --- | --- | --- |
| base-render | 1 | 开发者报文（不进渲染产物） 1 |
| plugin-bill-ilife | 7 | DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案） 7 |
| plugin-calorie | 15 | DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案） 15 |
| plugin-chef | 4 | DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案） 4 |
| plugin-home-ilife | 6 | DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案） 6 |
| plugin-manager | 2 | DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案） 2 |
| plugin-memo-ilife | 9 | DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案） 9 |
| plugin-schedule-ilife | 8 | DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案） 8 |
| skill-bill | 146 | PROTO_BASELINE 原型文件名（:245-249 注释「这是数据位不是文案 25；分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） 20；备注标签写库值（TAG_*） 17；HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） 9；CSS 注释（源码字符串里的 /* … */） 6；CSS 注释（源码字符串里的 /* … */；:60-67 是同一块注释的逐行片段） 6；分类写库值（CATEGORY） 5；模块导入路径（../shared/票据纸页型.js；brief 数据位·文件路径） 5；tagRecords(..., '退款') 过滤值（:47） 4；tagRecords(...) 过滤值（:81-86，库内备注标签比较） 4；tagRecords(...) 过滤值（:36-37） 3；CSV 表头匹配词 HEADER_WORDS.time（:56） 3；账本写库值（LEDGER） 2；CSV 表头匹配词 HEADER_WORDS.amount（:57） 2；CSV 表头匹配词 HEADER_WORDS.category（:58） 2；CSV 表头匹配词 HEADER_WORDS.account（:59） 2；CSV 表头匹配词 HEADER_WORDS.ledger（:60） 2；CSV 表头匹配词 HEADER_WORDS.note（:61） 2；派生件 2；命令键（:139） 1；tagRecords(..., '分期') 过滤值（:133） 1；CURRENCY 常量（:32-34 注释「#1212 1；copyText 表的命令键（:94） 1；机器键 1；TRANSFER_OUT_CATEGORY（:36 注释「跨技能契约，冻结不动」），写库分类值 1；TRANSFER_IN_CATEGORY，写库分类值 1；TRANSFER_LEDGER，写库账本值 1；WHY_MISSING（:81-83 注释「缺项判据位（不上屏）…分支标记不是文案」） 1；UNIT 常量（:33-34 注释「单位词按数据值处理，不进词条表」） 1；copyText 表的命令键（:126,146） 1；CSV 表头匹配词 HEADER_WORDS.time（:56，命中即认） 1；写库兜底分类（:222 空单元格 → '其他'，进 addBill） 1；写库兜底账本（:231 空单元格 → '生活'） 1；写库币种（:256 currency: '人民币'） 1；配置键名（:71,74 读 db.dir 判目录） 1；item.message.startsWith('不在')（:73）——把本地化消息当前缀判据 1；命令键（:82） 1；交付文件名主体 HELP_FILE_STEM（:37） 1；PACKAGE_MANIFEST 文件名（:47，读包版本） 1；命令示例参数值（:14,20,23；category 样例值） 1；命令示例参数值（:23；tag 样例值） 1；命令示例参数值（:23；file 样例值） 1；命令键（:146） 1；DETAIL_COPY_KEY 命令键（:156） 1 |
| skill-calorie | 625 | STRENGTH_KEYS／FLEX_KEYS／DAILY_KEYS／MET 词表与 HARD_WORDS 情绪词表，全部与用户输入或库值做 includes 匹配 80；速查台模型/展示序常量 62；部位/动作禁忌词表，与训练动作名 includes 匹配；星期汉字 7 条已迁 c003–c009 54；命令元数据（title/wakeWord/example） 44；XUNJI_SUBCOMMANDS 的 does/value/note 是声明面文档字段；run.ts 只读 name/usage/state/ownerTicket，cli 只打印 JSON 与 stderr，无渲染路径 35；训练水平键、器械别名表、UPDATE SQL 28；30 条 CSS 注释；PART_PALETTE 四元组是「库中词→类名后缀→rgb」，键与库值比对 26；SQL + 唤醒词表 a1..d4 + sameDayCompare(db,today,12,'一年前') 的标签参数（进 weightCompare.ts:187 label 判定） 22；复制载荷 metrics 键（本期/对比期/均值kg…）与唤醒词「对比体重 20；复制载荷 stat.metrics 的键（基线kg/黄线kg/…/结论/异常明细） 17；复制载荷 metrics 键 16；'今天' 已迁 c023；其余 '💧水' 库值、'meal.早餐' 载荷键、'早餐' 库值比较 14；OUTPUT_TYPE_LABELS／LEGACY_COMMAND_OVERRIDES／DYNAMIC_COMMAND_SEGMENTS 全部进文件名（output.ts:127 segs、:317 sanitizeFilenamePart） 14；[列名, 中文名] 字段对照表，按列名查找 13；派生件 11；NOTE_TAGS 备注快捷词表（写库 tags）+ date BETWEEN ? SQL 11；复制载荷 metrics 键（meal.早餐…）与 === '早餐' 库值查找 8；SLOTS 时段、CARDIO、MINUTE_UNIT、UNKNOWN_PART 参与 includes 判定与写库 8；部位/字段词表，按库值与输入比对 8；7 个部位名已迁 getter c012–c018；SOURCE_ALIASES 输入归一、'男'/'女' 比较为数据 8；PHOTO_LOG_TAGS 写库词表 8；检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title 7；scene 选择值比较（:340 if (scene === '改照片标签')） 7；SQL + 库 meal 枚举计数键（早餐/午餐/晚餐/加餐/夜宵） 6；唤醒词/协议 6；开发者报文（CalorieRenderError missing-data）与 category === '力量'/'有氧' 词表 5；SQL 与 dist['蛋白'] 等库值查找 4；MEAL_PARAMS 参数枚举与餐名映射键；3 条界面已迁 c085–c087 4；唤醒词/协议字段 4；库值映射（'💧水'、'低/中/高'） 4；数据层 humanText 查找键 3；'已完成' 已迁 c043；label === '一年前'/'半年前' 判定为数据 3；配置键 'db.dir' 与 message.startsWith('不在') 判定 3；'💧水' WATER_NAME 与 SQL 3；scene 选择值比较 3；unit === '自重' 比较与 missing-data 开发者报文 2；raw === '休息'、raw.includes('休息日') 库 sessionLabel 判定 2；'💧水' 水行名（库值） 2；SQL 2；kind: 力量|有氧 类型字段 2；'复制数据' 复制区锚点 2；windowParam === '本周'/'今日' 2；category === '力量'/'有氧' 2；NUTRI_PROFILE_LABELS 3 条已迁 getter c025–c027；'夏'/'冬' season 判定为数据 2；4 条已迁 c070–c073；'无记录'/'本周' 库值与窗口常量为数据 2；'卡路里_HELP' 文件名与 package.json 路径 2；照片记录类型词表，写库/比对 2；错误码/报文匹配 2；数据位 2；dist['力量'] 库值查找 1；性别归一化比较操作数（新版 male/男/空 → 男），只作判据不上屏；:100 同型 1；性别归一化比较操作数（female/女 → 女），只作判据不上屏 1；1 条已迁 c901；label.startsWith('日均') 载荷键判定 1；unit === '自重' 比较 1；source === '测试' 库值比较 1；6 条已迁 c146–c151；'今日喝水' 唤醒词比较为数据 1；status.includes('跳过') 库值判定 1；t.trendCn === '上升' 比较 1；summary.includes(' 条') 判定 1；kind === '有氧' 字段判定 1；'休息'/'休息日' 写库 sessionLabel 1；协议/唤醒词 1；2 条已迁 c073/c074；'复制数据' 锚点 1；1 条已迁 c027；'复制数据' 锚点 1；3 条已迁 c065–c067；'复制数据' 复制区锚点 1；配置键名（:91，读写与回执都用它） 1；字段名映射表 1；status 值比较（'跳过'） 1；3 条已迁 c220–c222；status === '无记录' 库值比较 1；体检行 id（:466；行标题/动作/来源均已 m()） 1；配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()） 1；体检行 id（机器键，插件设置页按 id 对接） 1；体检行 id（:499 起；机器键） 1；体检行 id（:540；机器键） 1；体检行 id（:557；机器键） 1；'训记官方动作.json' 文件路径 1；配置键 'xunji.key' 1 |
| skill-chef | 59 | 同上 6；体检项 id（机器键） 3；命令 key 子串 3；示例值（食材） 2；lookupWake 关键词 2；RELATION_TYPES 枚举值 2；缺省写库值（String(p.status ?? '未做')） 1；配置项查找键 entry.id === 'db.dir' 与 envelope 键 { 'db.dir': … } 1；体检 SQL（缺食材的菜） 1；体检 SQL（缺步骤的菜） 1；体检 SQL（缺火候的步骤） 1；体检 SQL（缺历史记录的菜） 1；备份导出 SQL（全量菜谱） 1；备份文件名前缀 1；体检项 id（机器键），同处可见文案走 m('skill-chef.health.*') 1；sourceOf(present, 'db.dir') 与体检项 id＝配置文件 key 1；sourceOf(present, 'db.name')＝配置文件 key 1；sourceOf(present, 'html.dir') 与体检项 id＝配置文件 key 1；EXAMPLE_VALUES 槽位示例值（菜名／新菜名），进 HELP 的 --params 示例串 1；示例值（菜系） 1；示例值（步骤） 1；示例值（描述） 1；示例值（单位） 1；示例值（分类/标签） 1；示例值（炊具） 1；示例值（关系/状态） 1；示例值（导入文件名） 1；示例值（派生出的新菜名） 1；示例值（关系类型） 1；示例值（关系说明） 1；lookupWake 关键词（['搜','找','查','寻'].some((c) => q.includes(c))） 1；status 比较值（recipe.status === '未做'） 1；写库值（['已做', now(), id]） 1；status 比较值与 SQL 参数（['已废弃','已废弃']） 1；L18 RELATION_TYPES = ['派生','变体','改良'] 枚举值（L42 includes 校验）；L67 缺省关系类型（写库值） 1；status 比较值 1；写库值（status: '未做'） 1；搜索主查询 SQL（db.prepare 的语句文本，参数走 ?） 1；SQL 片段（拼在 WHERE 条件后） 1；SQL 片段（EXISTS 子查询拼关联表名与列名） 1；入参比较值 1；写库值（['已废弃', now(), r.id]） 1；VIEW_CARDS 的 wake 字段（三张卡共用的唤醒词）；标题已走 m('skill-chef.view-page.c083…c085') 1；同上（两张卡共用）；标题 c086/c087 1；同上；标题 c088 1；同上；标题 c089 1；同上；标题 c090 1 |
| skill-home | 854 | 数据位 748；数据不译 90；机器键 9；配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()） 1；体检行 id（:466；行标题/动作/来源均已 m()） 1；体检行 id（机器键，插件设置页按 id 对接） 1；体检行 id（:499 起；机器键） 1；体检行 id（:540；机器键） 1；体检行 id（:557；机器键） 1；体检行 id（:614；机器键） 1 |
| skill-memo-ilife | 33 | 比较键 7；SQL 片段 2；const CHECKIN_TOP = '打卡'；:71/:77/:83 三处 category !== CHECKIN_TOP 比较键（是否出打卡页） 1；HealthItem.id 机器键（接口 readonly id: string，:43-50）；标题/报文/指引/来源同条已全 m() 1；:107 同上 id；:104 sourceOf(present,'db.dir') 是配置字段路径键（present 集合的键，返回值是来源人话），不是文案 1；配置字段路径键（sourceOf(present,'db.name')） 1；HealthItem.id 机器键（四档各一条） 1；:167 id；:165 配置字段路径键 1；HealthItem.id 机器键（「这个值从哪来」那一条） 1；:197 id；:208 配置字段路径键 1；HealthItem.id 机器键；**跨包消费证据** 1；HealthItem.id 机器键（包内模板目录那一条） 1；可执行文件名 1；Windows 下 .cmd 直 spawn 报 EINVAL，经 cmd.exe /d /s /c 中转的 file 名（execFileSync(file,…)）；:164 是注释 1；页种常量（const BATCH_PAGE_KIND: '结果页' \| '过程页' = '过程页'） 1；同上，页种枚举值 1；可执行文件候选路径段（%APPDATA%/Roaming/npm/lark-cli.cmd、Local/Programs/lark-cli/lark-cli.cmd）；:89 是注释 1；可执行文件候选路径段（Local/Programs/lark-cli/lark-cli.exe） 1；同 probe 的 Windows 中转 file 名（execFileSync(file,…)）；:89 是注释 1；远端自检对象的命名/反查前缀 SENTINEL_PREFIX（注释 1；const WISH_TOP = '心愿'；:27 if (before.category !== WISH_TOP) return … 比较键（本件不出文案） 1；const WISH_TOP = '心愿' 1；接口类型字面量 readonly kind: '过程页'（WishReceiptInput.page.kind），不是运行值；运行时分支看 input.page !== undefined（:72） 1；const WISH_TOP = '心愿'；:64/:105/:121 为比较/过滤 1；页种常量（const WISH_PAGE_KIND: '过程页' = '过程页'） 1；过滤键 1 |
| skill-schedule | 110 | 作息分类词表 77；未执行态集合 UNEXECUTED（:160），与 DB 值比较 2；HELP 产物文件名主体（:33，路径拼接；#1235:8 冻结） 1；回执计数桶键（:41 counts[e.completion || '未复盘']；:42 按 VALID_COMPLETIONS 过滤） 1；DB completion 存储值前缀比较（:122 startsWith('已完成')） 1；未执行态集合 UNEXECUTED（:160），与 DB completion 存储值比较 1；空值兜底与计数比较（:275 completionCounts，:281 过滤） 1；完成态比较（:277/:286/:307 p.completion === '已完成'） 1；聚合键取值 data.byL1['维持']（:323） 1；完成态比较（:325 p.completion === '已完成'） 1；完成态比较（:52 p.completion === '已完成'） 1；计数与原始状态比较（:56） 1；按分类标签取值（:183 rows.find(row => row.label === '维持')） 1；分类键比较（:187 label === '工作'） 1；配置键名（:91，读写与回执都用它） 1；FEISHU_OWNER_MARK 归属锚（:20） 1；FEISHU_SENTINEL_MARK 自检远端对象标题标记（:22） 1；可执行文件名候选（:46，Windows 查找表） 1；可执行文件名候选（:47，Windows 查找表） 1；可执行文件名候选（:97，穿透 .cmd 用） 1；可执行名（:380，平台探测） 1；配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()） 1；报文前缀判据（:448 message.startsWith('不在')）→ 机器码 DIR_MISSING；报文本身 :426 用 m('health.c018') 1；报文前缀判据（:448 startsWith('同名')）；报文 :329 用 m('health.c016')「同名文件占了它的位置」 1；体检行 id（:466；行标题/动作/来源均已 m()） 1；体检行 id（机器键，插件设置页按 id 对接） 1；体检行 id（:499 起；机器键） 1；体检行 id（:540；机器键） 1；体检行 id（:557；机器键） 1；体检行 id（:594；机器键） 1；体检行 id（:614；机器键） 1；sleepOf 分类包含判据（:103-104 c.includes('睡眠')） 1；sleepOf 分类包含判据（:103-104 c.includes('午睡')） 1 |

## base-render（1 对）

### 开发者报文（不进渲染产物）（1 对）

用途：开发者报文（不进渲染产物）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  条 | packages/base-render/src/components/bulk-bar/model.ts:133 | 不译 |

## plugin-bill-ilife（7 对）

### DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）（7 对）

用途：DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| backup.dir | packages/plugin-bill-ilife/src/settings.ts:113 | 不译 |
| backup.stem | packages/plugin-bill-ilife/src/settings.ts:122 | 不译 |
| db.dir | packages/plugin-bill-ilife/src/settings.ts:71 | 不译 |
| db.goals | packages/plugin-bill-ilife/src/settings.ts:89 | 不译 |
| db.name | packages/plugin-bill-ilife/src/settings.ts:80 | 不译 |
| html.dir | packages/plugin-bill-ilife/src/settings.ts:98 | 不译 |
| package.json | packages/plugin-bill-ilife/src/skill-tool.ts:43 | 不译 |

## plugin-calorie（15 对）

### DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）（15 对）

用途：DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| dsh-calorie.version | packages/plugin-calorie/src/bridge.ts:48 | 不译 |
| db.dir | packages/plugin-calorie/src/client.ts:271 | 不译 |
| db.name | packages/plugin-calorie/src/client.ts:265 | 不译 |
| dsh-calorie.version | packages/plugin-calorie/src/client.ts:70 | 不译 |
| html.dir | packages/plugin-calorie/src/client.ts:265 | 不译 |
| photos.dir | packages/plugin-calorie/src/client.ts:272 | 不译 |
| photos.gifs | packages/plugin-calorie/src/client.ts:265,266 | 不译 |
| db.dir | packages/plugin-calorie/src/settings.ts:71 | 不译 |
| db.name | packages/plugin-calorie/src/settings.ts:80 | 不译 |
| html.dir | packages/plugin-calorie/src/settings.ts:89 | 不译 |
| photos.dir | packages/plugin-calorie/src/settings.ts:98 | 不译 |
| photos.gifs | packages/plugin-calorie/src/settings.ts:119 | 不译 |
| xunji.catalog | packages/plugin-calorie/src/settings.ts:137 | 不译 |
| xunji.key | packages/plugin-calorie/src/settings.ts:106 | 不译 |
| package.json | packages/plugin-calorie/src/skill-tool.ts:43 | 不译 |

## plugin-chef（4 对）

### DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）（4 对）

用途：DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/plugin-chef/src/settings.ts:74 | 不译 |
| db.name | packages/plugin-chef/src/settings.ts:83 | 不译 |
| html.dir | packages/plugin-chef/src/settings.ts:92 | 不译 |
| package.json | packages/plugin-chef/src/skill-tool.ts:43 | 不译 |

## plugin-home-ilife（6 对）

### DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）（6 对）

用途：DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| backup.dir | packages/plugin-home-ilife/src/settings.ts:107 | 不译 |
| db.dir | packages/plugin-home-ilife/src/settings.ts:74 | 不译 |
| db.name | packages/plugin-home-ilife/src/settings.ts:83 | 不译 |
| html.dir | packages/plugin-home-ilife/src/settings.ts:92 | 不译 |
| key.file | packages/plugin-home-ilife/src/settings.ts:116 | 不译 |
| package.json | packages/plugin-home-ilife/src/skill-tool.ts:43 | 不译 |

## plugin-manager（2 对）

### DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）（2 对）

用途：DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| settings.section | packages/plugin-manager/src/client.ts:1499,1502 | 不译 |
| ilife-manager.roots | packages/plugin-manager/src/update-contract.ts:21 | 不译 |

## plugin-memo-ilife（9 对）

### DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）（9 对）

用途：DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/plugin-memo-ilife/src/client.ts:387 | 不译 |
| db.name | packages/plugin-memo-ilife/src/client.ts:383 | 不译 |
| html.dir | packages/plugin-memo-ilife/src/client.ts:383 | 不译 |
| lark.cli | packages/plugin-memo-ilife/src/client.ts:96 | 不译 |
| db.dir | packages/plugin-memo-ilife/src/settings.ts:77 | 不译 |
| db.name | packages/plugin-memo-ilife/src/settings.ts:86 | 不译 |
| html.dir | packages/plugin-memo-ilife/src/settings.ts:95 | 不译 |
| media.dir | packages/plugin-memo-ilife/src/settings.ts:104 | 不译 |
| package.json | packages/plugin-memo-ilife/src/skill-tool.ts:43 | 不译 |

## plugin-schedule-ilife（8 对）

### DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）（8 对）

用途：DSH 插件设置协议字段 / 机器键 / 文件名（非上屏文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/plugin-schedule-ilife/src/client.ts:171 | 不译 |
| db.name | packages/plugin-schedule-ilife/src/client.ts:167 | 不译 |
| html.dir | packages/plugin-schedule-ilife/src/client.ts:167 | 不译 |
| lark.cli | packages/plugin-schedule-ilife/src/client.ts:75 | 不译 |
| db.dir | packages/plugin-schedule-ilife/src/settings.ts:72 | 不译 |
| db.name | packages/plugin-schedule-ilife/src/settings.ts:81 | 不译 |
| html.dir | packages/plugin-schedule-ilife/src/settings.ts:90 | 不译 |
| package.json | packages/plugin-schedule-ilife/src/skill-tool.ts:43 | 不译 |

## skill-bill（146 对）

### copyText 表的命令键（:94）（1 对）

用途：copyText 表的命令键（:94）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| account.query | packages/skill-bill/src/account/copyTextAccount.ts:94 | 不译 |

### CURRENCY 常量（:32-34 注释「#1212（1 对）

用途：CURRENCY 常量（:32-34 注释「#1212：币种是数据值，不随语言变」），写库/比较值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 人民币 | packages/skill-bill/src/account/copyTextAccount.ts:34 | 不译 |

### 机器键（1 对）

用途：机器键：协议字段／点分键（entries 门抽取阶段剔除）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| account.write | packages/skill-bill/src/account/pageParts.ts | 不译 |

### WHY_MISSING（:81-83 注释「缺项判据位（不上屏）…分支标记不是文案」）（1 对）

用途：WHY_MISSING（:81-83 注释「缺项判据位（不上屏）…分支标记不是文案」）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 没给 | packages/skill-bill/src/account/params.ts:83 | 不译 |

### TRANSFER_LEDGER，写库账本值（1 对）

用途：TRANSFER_LEDGER，写库账本值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 转账 | packages/skill-bill/src/account/params.ts:39 | 不译 |

### TRANSFER_IN_CATEGORY，写库分类值（1 对）

用途：TRANSFER_IN_CATEGORY，写库分类值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 转账/转入 | packages/skill-bill/src/account/params.ts:38 | 不译 |

### TRANSFER_OUT_CATEGORY（:36 注释「跨技能契约，冻结不动」），写库分类值（1 对）

用途：TRANSFER_OUT_CATEGORY（:36 注释「跨技能契约，冻结不动」），写库分类值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 转账/转出 | packages/skill-bill/src/account/params.ts:37 | 不译 |

### 模块导入路径（../shared/票据纸页型.js；brief 数据位·文件路径）（5 对）

用途：模块导入路径（../shared/票据纸页型.js；brief 数据位·文件路径）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| ../shared/票据纸页型.js | packages/skill-bill/src/account/template-form.ts:23,24 | 不译 |
| ../shared/票据纸页型.js | packages/skill-bill/src/account/template-summary.ts:20,21 | 不译 |
| ../shared/票据纸页型.js | packages/skill-bill/src/account/template-update.ts:22,23 | 不译 |
| ../shared/票据纸页型.js | packages/skill-bill/src/goal/template-form.ts:22,23 | 不译 |
| ../shared/票据纸页型.js | packages/skill-bill/src/goal/template-progress.ts:21,22 | 不译 |

### PROTO_BASELINE 原型文件名（:245-249 注释「这是数据位不是文案（25 对）

用途：PROTO_BASELINE 原型文件名（:245-249 注释「这是数据位不是文案：不迁词条表、不译（手册 §4.5 数据不译）」）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| a01-看月度-proto.html | packages/skill-bill/src/analysis/pageParts.ts:251 | 不译 |
| a02-看年度-proto.html | packages/skill-bill/src/analysis/pageParts.ts:252 | 不译 |
| a03-看总览-proto.html | packages/skill-bill/src/analysis/pageParts.ts:253 | 不译 |
| a04-看周报-proto.html | packages/skill-bill/src/analysis/pageParts.ts:254 | 不译 |
| a05-看分类-proto.html | packages/skill-bill/src/analysis/pageParts.ts:255 | 不译 |
| a06-看账户-proto.html | packages/skill-bill/src/analysis/pageParts.ts:256 | 不译 |
| a07-看账本-proto.html | packages/skill-bill/src/analysis/pageParts.ts:257 | 不译 |
| a08-看结构-proto.html | packages/skill-bill/src/analysis/pageParts.ts:258 | 不译 |
| a09-做统计-proto.html | packages/skill-bill/src/analysis/pageParts.ts:259 | 不译 |
| a10-看对比-proto.html | packages/skill-bill/src/analysis/pageParts.ts:260 | 不译 |
| a11-看双区间-proto.html | packages/skill-bill/src/analysis/pageParts.ts:261 | 不译 |
| a12-看同比-proto.html | packages/skill-bill/src/analysis/pageParts.ts:262 | 不译 |
| a13-看分类对比-proto.html | packages/skill-bill/src/analysis/pageParts.ts:263 | 不译 |
| a14-看趋势-proto.html | packages/skill-bill/src/analysis/pageParts.ts:264 | 不译 |
| a15-看分类趋势-proto.html | packages/skill-bill/src/analysis/pageParts.ts:265 | 不译 |
| a16-看大额-proto.html | packages/skill-bill/src/analysis/pageParts.ts:266 | 不译 |
| a17-看高频-proto.html | packages/skill-bill/src/analysis/pageParts.ts:267 | 不译 |
| a18-看分布-proto.html | packages/skill-bill/src/analysis/pageParts.ts:268 | 不译 |
| a19-看活跃-proto.html | packages/skill-bill/src/analysis/pageParts.ts:269 | 不译 |
| a20-看洞察-proto.html | packages/skill-bill/src/analysis/pageParts.ts:270 | 不译 |
| a21-看异常-proto.html | packages/skill-bill/src/analysis/pageParts.ts:271 | 不译 |
| a22-看借贷-proto.html | packages/skill-bill/src/analysis/pageParts.ts:272 | 不译 |
| a23-看报销-proto.html | packages/skill-bill/src/analysis/pageParts.ts:273 | 不译 |
| a24-看分期-proto.html | packages/skill-bill/src/analysis/pageParts.ts:274 | 不译 |
| a25-看退款-proto.html | packages/skill-bill/src/analysis/pageParts.ts:275 | 不译 |

### tagRecords(...) 过滤值（:81-86，库内备注标签比较）（4 对）

用途：tagRecords(...) 过滤值（:81-86，库内备注标签比较）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 借入 | packages/skill-bill/src/analysis/scene-debt.ts:82 | 不译 |
| 借出 | packages/skill-bill/src/analysis/scene-debt.ts:81 | 不译 |
| 已还 | packages/skill-bill/src/analysis/scene-debt.ts:85,86 | 不译 |
| 未还 | packages/skill-bill/src/analysis/scene-debt.ts:83,84 | 不译 |

### tagRecords(..., '分期') 过滤值（:133）（1 对）

用途：tagRecords(..., '分期') 过滤值（:133）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 分期 | packages/skill-bill/src/analysis/scene-installment.ts:133 | 不译 |

### tagRecords(..., '退款') 过滤值（:47）（4 对）

用途：tagRecords(..., '退款') 过滤值（:47）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 退款 | packages/skill-bill/src/analysis/scene-refund.ts:47 | 不译 |
| #已退款 | packages/skill-bill/src/write/scene-refund.ts:23 | 不译 |
| #退款 | packages/skill-bill/src/write/scene-refund.ts:22 | 不译 |
| 退款/冲销 | packages/skill-bill/src/write/scene-refund.ts:18 | 不译 |

### tagRecords(...) 过滤值（:36-37）（3 对）

用途：tagRecords(...) 过滤值（:36-37）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| #待报销 | packages/skill-bill/src/analysis/scene-reimburse.ts:36 | 不译 |
| #报销到账 | packages/skill-bill/src/analysis/scene-reimburse.ts:37 | 不译 |
| #待报销 | packages/skill-bill/src/write/scene-reimburse.ts:18 | 不译 |

### 配置键名（:71,74 读 db.dir 判目录）（1 对）

用途：配置键名（:71,74 读 db.dir 判目录）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-bill/src/cli/config.ts:71,74 | 不译 |

### item.message.startsWith('不在')（:73）——把本地化消息当前缀判据（1 对）

用途：item.message.startsWith('不在')（:73）——把本地化消息当前缀判据

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 不在 | packages/skill-bill/src/cli/config.ts:73 | 不译 |

### copyText 表的命令键（:126,146）（1 对）

用途：copyText 表的命令键（:126,146）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| goal.query | packages/skill-bill/src/goal/copyTextGoal.ts:126,146 | 不译 |

### UNIT 常量（:33-34 注释「单位词按数据值处理，不进词条表」）（1 对）

用途：UNIT 常量（:33-34 注释「单位词按数据值处理，不进词条表」）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 元 | packages/skill-bill/src/goal/copyTextGoal.ts:34 | 不译 |

### HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用）（9 对）

用途：HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| backup.dir | packages/skill-bill/src/health.ts:480,490 | 不译 |
| config.file | packages/skill-bill/src/health.ts:339,346,353 | 不译 |
| db.dir | packages/skill-bill/src/health.ts:363,366 | 不译 |
| db.file | packages/skill-bill/src/health.ts:388,397,404,415 | 不译 |
| db.goals | packages/skill-bill/src/health.ts:452 | 不译 |
| db.name | packages/skill-bill/src/health.ts:385 | 不译 |
| goals.file | packages/skill-bill/src/health.ts:455,467 | 不译 |
| html.dir | packages/skill-bill/src/health.ts:427,429 | 不译 |
| value.source | packages/skill-bill/src/health.ts:443 | 不译 |

### 命令键（:82）（1 对）

用途：命令键（:82）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| help.lookup | packages/skill-bill/src/help/copyTextHelp.ts:82 | 不译 |

### PACKAGE_MANIFEST 文件名（:47，读包版本）（1 对）

用途：PACKAGE_MANIFEST 文件名（:47，读包版本）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| package.json | packages/skill-bill/src/help/helpFile.ts:52 | 不译 |

### 交付文件名主体 HELP_FILE_STEM（:37）（1 对）

用途：交付文件名主体 HELP_FILE_STEM（:37）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 饼干记账_HELP | packages/skill-bill/src/help/helpFile.ts:37 | 不译 |

### 命令示例参数值（:23；file 样例值）（1 对）

用途：命令示例参数值（:23；file 样例值）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| bills.csv | packages/skill-bill/src/help/lookup.ts:23 | 不译 |

### 命令示例参数值（:23；tag 样例值）（1 对）

用途：命令示例参数值（:23；tag 样例值）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 旅行 | packages/skill-bill/src/help/lookup.ts:23 | 不译 |

### 命令示例参数值（:14,20,23；category 样例值）（1 对）

用途：命令示例参数值（:14,20,23；category 样例值）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 餐饮 | packages/skill-bill/src/help/lookup.ts:14,20,23 | 不译 |

### CSS 注释（源码字符串里的 /* … */）（6 对）

用途：CSS 注释（源码字符串里的 /* … */）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| /* 折叠档的说明行（原型 .fold-note：12px／行高 1.6／ink-3／上下 2px 8px）——#1122 起 8 组默认收起。 */ | packages/skill-bill/src/help/lookupPage.ts:79 | 不译 |
| /* 组内行：原型 .qrows li（44 触摸行 ＋ 点线分隔）。 */ | packages/skill-bill/src/help/lookupPage.ts:75 | 不译 |
| /* 组标题：原型 .qgroup-head 的高度与字重（计数由自律条统一声明，不逐组挂胶囊）。 */ | packages/skill-bill/src/help/lookupPage.ts:73 | 不译 |
| /* 组：原型 .qgroup 的暖底卡片（圆角照皮肤闭集）。 */ | packages/skill-bill/src/help/lookupPage.ts:71 | 不译 |
| /* 自律条：原型 .check-mini 的浅绿卡（绿底＋一行字）。 */ | packages/skill-bill/src/help/lookupPage.ts:81 | 不译 |
| /* 锚点胶囊：原型 .toc-chips a 的几何（圆角走皮肤闭集，边色取最近的一档 token）。 */ | packages/skill-bill/src/help/lookupPage.ts:68 | 不译 |

### 命令键（:146）（1 对）

用途：命令键（:146）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| help.lookup | packages/skill-bill/src/help/lookupPage.ts:146 | 不译 |

### DETAIL_COPY_KEY 命令键（:156）（1 对）

用途：DETAIL_COPY_KEY 命令键（:156）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| record.detail | packages/skill-bill/src/query/detail.ts:156 | 不译 |

### CSV 表头匹配词 HEADER_WORDS.time（:56）（3 对）

用途：CSV 表头匹配词 HEADER_WORDS.time（:56）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 交易时间 | packages/skill-bill/src/setup/importer.ts:56 | 不译 |
| 时间 | packages/skill-bill/src/setup/importer.ts:56 | 不译 |
| 记账日期 | packages/skill-bill/src/setup/importer.ts:56 | 不译 |

### 写库币种（:256 currency: '人民币'）（1 对）

用途：写库币种（:256 currency: '人民币'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 人民币 | packages/skill-bill/src/setup/importer.ts:256 | 不译 |

### 写库兜底分类（:222 空单元格 → '其他'，进 addBill）（1 对）

用途：写库兜底分类（:222 空单元格 → '其他'，进 addBill）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 其他 | packages/skill-bill/src/setup/importer.ts:222 | 不译 |

### CSV 表头匹配词 HEADER_WORDS.category（:58）（2 对）

用途：CSV 表头匹配词 HEADER_WORDS.category（:58）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 分类 | packages/skill-bill/src/setup/importer.ts:58 | 不译 |
| 类别 | packages/skill-bill/src/setup/importer.ts:58 | 不译 |

### CSV 表头匹配词 HEADER_WORDS.note（:61）（2 对）

用途：CSV 表头匹配词 HEADER_WORDS.note（:61）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 备注 | packages/skill-bill/src/setup/importer.ts:61 | 不译 |
| 摘要 | packages/skill-bill/src/setup/importer.ts:61 | 不译 |

### CSV 表头匹配词 HEADER_WORDS.account（:59）（2 对）

用途：CSV 表头匹配词 HEADER_WORDS.account（:59）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 帐号 | packages/skill-bill/src/setup/importer.ts:59 | 不译 |
| 账户 | packages/skill-bill/src/setup/importer.ts:59 | 不译 |

### CSV 表头匹配词 HEADER_WORDS.ledger（:60）（2 对）

用途：CSV 表头匹配词 HEADER_WORDS.ledger（:60）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 帐本 | packages/skill-bill/src/setup/importer.ts:60 | 不译 |
| 账本 | packages/skill-bill/src/setup/importer.ts:60 | 不译 |

### CSV 表头匹配词 HEADER_WORDS.amount（:57）（2 对）

用途：CSV 表头匹配词 HEADER_WORDS.amount（:57）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 数额 | packages/skill-bill/src/setup/importer.ts:57 | 不译 |
| 金额 | packages/skill-bill/src/setup/importer.ts:57 | 不译 |

### CSV 表头匹配词 HEADER_WORDS.time（:56，命中即认）（1 对）

用途：CSV 表头匹配词 HEADER_WORDS.time（:56，命中即认）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 日期 | packages/skill-bill/src/setup/importer.ts:56 | 不译 |

### 写库兜底账本（:231 空单元格 → '生活'）（1 对）

用途：写库兜底账本（:231 空单元格 → '生活'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 生活 | packages/skill-bill/src/setup/importer.ts:231 | 不译 |

### 派生件（2 对）

用途：派生件：样式／脚本源码注释（不上屏）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|    修法：让这层纯分组的包裹节从布局里退场（`display: contents`），宽件重新成为栅格项。 | packages/skill-bill/src/shared/docPage.ts:65 | 不译 |
|    它挂在**本包产出的选择器**上（`.ilife-write` 由 `src/shared/writeParts.ts` 出）， | packages/skill-bill/src/shared/docPage.ts:66 | 不译 |

### CSS 注释（源码字符串里的 /* … */；:60-67 是同一块注释的逐行片段）（6 对）

用途：CSS 注释（源码字符串里的 /* … */；:60-67 是同一块注释的逐行片段）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|    全部落回「中间 880 列」，1280 档两翼逐点扫描非背景像素 0 行（内容墨迹最外沿 x174–1105）。 | packages/skill-bill/src/shared/docPage.ts:64 | 不译 |
|    所以按「样式随它的选择器」住本件，公共层不认这个类名。 */ | packages/skill-bill/src/shared/docPage.ts:67 | 不译 |
| /* t403-P2：详情键值列表（桌面藏，移动端替表格） */ | packages/skill-bill/src/shared/docPage.ts:103 | 不译 |
| /* t407-r3 B：黑底说明块（.ilife-toast）两栏等高＋行距 */ | packages/skill-bill/src/shared/docPage.ts:84 | 不译 |
| /* t728 逐页审计实测：公共层配方 ⑧ 的「宽件满铺」那条写的是 | packages/skill-bill/src/shared/docPage.ts:60 | 不译 |
| /* t728：桌面端表格用满正文列（只 1200px 以上生效，手机端不动） */ | packages/skill-bill/src/shared/docPage.ts:56 | 不译 |

### 命令键（:139）（1 对）

用途：命令键（:139）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| record.add | packages/skill-bill/src/write/copyTextReceipt.ts:139 | 不译 |

### 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」）（20 对）

用途：分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 住宿 | packages/skill-bill/src/write/sayWords.ts:104 | 不译 |
| 借贷/借入 | packages/skill-bill/src/write/sayWords.ts:149 | 不译 |
| 借贷/借出 | packages/skill-bill/src/write/sayWords.ts:133 | 不译 |
| 借贷/偿还 | packages/skill-bill/src/write/sayWords.ts:178 | 不译 |
| 借贷/收回 | packages/skill-bill/src/write/sayWords.ts:165 | 不译 |
| 其他收入 | packages/skill-bill/src/write/sayWords.ts:43,207 | 不译 |
| 其他收入/报销回款 | packages/skill-bill/src/write/sayWords.ts:120 | 不译 |
| 出行 | packages/skill-bill/src/write/sayWords.ts:27,59,72,104,207 | 不译 |
| 分期/家电 | packages/skill-bill/src/write/sayWords.ts:191 | 不译 |
| 分期/手机 | packages/skill-bill/src/write/sayWords.ts:191 | 不译 |
| 分期/电脑 | packages/skill-bill/src/write/sayWords.ts:191 | 不译 |
| 副业收入 | packages/skill-bill/src/write/sayWords.ts:43 | 不译 |
| 办公 | packages/skill-bill/src/write/sayWords.ts:104 | 不译 |
| 医疗 | packages/skill-bill/src/write/sayWords.ts:27 | 不译 |
| 奖金 | packages/skill-bill/src/write/sayWords.ts:43 | 不译 |
| 居住 | packages/skill-bill/src/write/sayWords.ts:27 | 不译 |
| 工资 | packages/skill-bill/src/write/sayWords.ts:43,207 | 不译 |
| 购物 | packages/skill-bill/src/write/sayWords.ts:27,59,72 | 不译 |
| 退款/冲销 | packages/skill-bill/src/write/sayWords.ts:88 | 不译 |
| 餐饮 | packages/skill-bill/src/write/sayWords.ts:27,59,72,104,207 | 不译 |

### 备注标签写库值（TAG_*）（17 对）

用途：备注标签写库值（TAG_*）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| #借入 | packages/skill-bill/src/write/scene-borrow.ts:26 | 不译 |
| #已还 | packages/skill-bill/src/write/scene-borrow.ts:28 | 不译 |
| #未还 | packages/skill-bill/src/write/scene-borrow.ts:27 | 不译 |
| #借出 | packages/skill-bill/src/write/scene-collect.ts:31 | 不译 |
| #已还 | packages/skill-bill/src/write/scene-collect.ts:33 | 不译 |
| #收回 | packages/skill-bill/src/write/scene-collect.ts:34 | 不译 |
| #未还 | packages/skill-bill/src/write/scene-collect.ts:32 | 不译 |
| #借出 | packages/skill-bill/src/write/scene-lend.ts:26 | 不译 |
| #已还 | packages/skill-bill/src/write/scene-lend.ts:28 | 不译 |
| #未还 | packages/skill-bill/src/write/scene-lend.ts:27 | 不译 |
| #已报销 | packages/skill-bill/src/write/scene-reimburse-done.ts:26 | 不译 |
| #待报销 | packages/skill-bill/src/write/scene-reimburse-done.ts:25 | 不译 |
| #报销到账 | packages/skill-bill/src/write/scene-reimburse-done.ts:27 | 不译 |
| #借入 | packages/skill-bill/src/write/scene-repay.ts:25 | 不译 |
| #偿还 | packages/skill-bill/src/write/scene-repay.ts:28 | 不译 |
| #已还 | packages/skill-bill/src/write/scene-repay.ts:27 | 不译 |
| #未还 | packages/skill-bill/src/write/scene-repay.ts:26 | 不译 |

### 账本写库值（LEDGER）（2 对）

用途：账本写库值（LEDGER）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 借贷 | packages/skill-bill/src/write/scene-borrow.ts:21 | 不译 |
| 借贷 | packages/skill-bill/src/write/scene-lend.ts:21 | 不译 |

### 分类写库值（CATEGORY）（5 对）

用途：分类写库值（CATEGORY）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 借贷/借入 | packages/skill-bill/src/write/scene-borrow.ts:20 | 不译 |
| 借贷/收回 | packages/skill-bill/src/write/scene-collect.ts:27 | 不译 |
| 借贷/借出 | packages/skill-bill/src/write/scene-lend.ts:20 | 不译 |
| 其他收入/报销回款 | packages/skill-bill/src/write/scene-reimburse-done.ts:18 | 不译 |
| 借贷/偿还 | packages/skill-bill/src/write/scene-repay.ts:18 | 不译 |

## skill-calorie（625 对）

### SQL + 库 meal 枚举计数键（早餐/午餐/晚餐/加餐/夜宵）（6 对）

用途：SQL + 库 meal 枚举计数键（早餐/午餐/晚餐/加餐/夜宵）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| ) AS total, COUNT(*) AS times FROM food_log WHERE date BETWEEN ? AND ? AND food_name != ? GROUP BY food_name ORDER BY total DESC LIMIT ? | packages/skill-calorie/src/analysis/anomaly/common.ts:63 | 不译 |
| 加餐 | packages/skill-calorie/src/analysis/anomaly/common.ts:81 | 不译 |
| 加餐/夜宵 | packages/skill-calorie/src/analysis/anomaly/common.ts:77 | 不译 |
| 午餐 | packages/skill-calorie/src/analysis/anomaly/common.ts:77 | 不译 |
| 早餐 | packages/skill-calorie/src/analysis/anomaly/common.ts:77 | 不译 |
| 晚餐 | packages/skill-calorie/src/analysis/anomaly/common.ts:77 | 不译 |

### SQL 与 dist['蛋白'] 等库值查找（4 对）

用途：SQL 与 dist['蛋白'] 等库值查找

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 加餐/夜宵 | packages/skill-calorie/src/analysis/anomaly/diet.ts:119 | 不译 |
| 碳水 | packages/skill-calorie/src/analysis/anomaly/diet.ts:84,90,94 | 不译 |
| 脂肪 | packages/skill-calorie/src/analysis/anomaly/diet.ts:85,90,95 | 不译 |
| 蛋白 | packages/skill-calorie/src/analysis/anomaly/diet.ts:83,90,93 | 不译 |

### dist['力量'] 库值查找（1 对）

用途：dist['力量'] 库值查找

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 力量 | packages/skill-calorie/src/analysis/anomaly/exercise.ts:71 | 不译 |

### 命令元数据（title/wakeWord/example）（44 对）

用途：命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| BMI 报告 | packages/skill-calorie/src/analysis/commands.ts:438 | 不译 |
| BMR 报告 | packages/skill-calorie/src/analysis/commands.ts:440 | 不译 |
| TDEE 报告 | packages/skill-calorie/src/analysis/commands.ts:439 | 不译 |
| calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}' | packages/skill-calorie/src/analysis/commands.ts:432 | 不译 |
| calorie-cmd-read calorie.view.health --params '{"window":"本周"}' | packages/skill-calorie/src/analysis/commands.ts:426 | 不译 |
| calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}' | packages/skill-calorie/src/analysis/commands.ts:429 | 不译 |
| 体重预测 | packages/skill-calorie/src/analysis/commands.ts:430 | 不译 |
| 健康报告(含对比) | packages/skill-calorie/src/analysis/commands.ts:445 | 不译 |
| 健康盘 | packages/skill-calorie/src/analysis/commands.ts:426 | 不译 |
| 健康趋势 | packages/skill-calorie/src/analysis/commands.ts:444 | 不译 |
| 唤醒词HELP | packages/skill-calorie/src/analysis/commands.ts:432 | 不译 |
| 复盘报告 | packages/skill-calorie/src/analysis/commands.ts:428 | 不译 |
| 多指标趋势 | packages/skill-calorie/src/analysis/commands.ts:434 | 不译 |
| 异常诊断 | packages/skill-calorie/src/analysis/commands.ts:431 | 不译 |
| 数据健康检查 | packages/skill-calorie/src/analysis/commands.ts:427 | 不译 |
| 整体趋势 | packages/skill-calorie/src/analysis/commands.ts:422 | 不译 |
| 查卡路里数据 | packages/skill-calorie/src/analysis/commands.ts:427 | 不译 |
| 查热量历史 | packages/skill-calorie/src/analysis/commands.ts:433 | 不译 |
| 每日六因素 | packages/skill-calorie/src/analysis/commands.ts:429 | 不译 |
| 水分摄入报告 | packages/skill-calorie/src/analysis/commands.ts:442 | 不译 |
| 热量历史 | packages/skill-calorie/src/analysis/commands.ts:433 | 不译 |
| 热量缺口 | packages/skill-calorie/src/analysis/commands.ts:425 | 不译 |
| 热量趋势 | packages/skill-calorie/src/analysis/commands.ts:421 | 不译 |
| 看BMI报告 | packages/skill-calorie/src/analysis/commands.ts:438 | 不译 |
| 看BMR报告 | packages/skill-calorie/src/analysis/commands.ts:440 | 不译 |
| 看TDEE报告 | packages/skill-calorie/src/analysis/commands.ts:439 | 不译 |
| 看体重 vs 摄入(最近 7 天) | packages/skill-calorie/src/analysis/commands.ts:424 | 不译 |
| 看健康报告(含对比) | packages/skill-calorie/src/analysis/commands.ts:445 | 不译 |
| 看健康盘 | packages/skill-calorie/src/analysis/commands.ts:426 | 不译 |
| 看健康趋势 | packages/skill-calorie/src/analysis/commands.ts:444 | 不译 |
| 看复盘报告 | packages/skill-calorie/src/analysis/commands.ts:428 | 不译 |
| 看整体趋势 | packages/skill-calorie/src/analysis/commands.ts:422 | 不译 |
| 看整体趋势(含目标对比) | packages/skill-calorie/src/analysis/commands.ts:434 | 不译 |
| 看每日六因素 | packages/skill-calorie/src/analysis/commands.ts:429 | 不译 |
| 看水分摄入报告 | packages/skill-calorie/src/analysis/commands.ts:442 | 不译 |
| 看热量缺口 | packages/skill-calorie/src/analysis/commands.ts:425 | 不译 |
| 看热量趋势 | packages/skill-calorie/src/analysis/commands.ts:421 | 不译 |
| 看综合评分 | packages/skill-calorie/src/analysis/commands.ts:443 | 不译 |
| 看营养分析 | packages/skill-calorie/src/analysis/commands.ts:423 | 不译 |
| 看蛋白质摄入报告 | packages/skill-calorie/src/analysis/commands.ts:441 | 不译 |
| 组合分析 | packages/skill-calorie/src/analysis/commands.ts:424 | 不译 |
| 综合评分 | packages/skill-calorie/src/analysis/commands.ts:443 | 不译 |
| 营养分析 | packages/skill-calorie/src/analysis/commands.ts:423 | 不译 |
| 蛋白质摄入报告 | packages/skill-calorie/src/analysis/commands.ts:441 | 不译 |

### 部位/动作禁忌词表，与训练动作名 includes 匹配；星期汉字 7 条已迁 c003–c009（54 对）

用途：部位/动作禁忌词表，与训练动作名 includes 匹配；星期汉字 7 条已迁 c003–c009

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| smith 机深蹲 | packages/skill-calorie/src/analysis/contraindications.ts:26 | 不译 |
| 仰卧 | packages/skill-calorie/src/analysis/contraindications.ts:15 | 不译 |
| 低杠深蹲 | packages/skill-calorie/src/analysis/contraindications.ts:31 | 不译 |
| 侧平举 | packages/skill-calorie/src/analysis/contraindications.ts:40 | 不译 |
| 侧平举超过 90° 时肩峰下空间消失，冈上肌撞击 | packages/skill-calorie/src/analysis/contraindications.ts:40 | 不译 |
| 俯卧 | packages/skill-calorie/src/analysis/contraindications.ts:15 | 不译 |
| 俯卧腿弯举 | packages/skill-calorie/src/analysis/contraindications.ts:27 | 不译 |
| 俯身 | packages/skill-calorie/src/analysis/contraindications.ts:25 | 不译 |
| 俯身/弯腰划船类 | packages/skill-calorie/src/analysis/contraindications.ts:25 | 不译 |
| 俯身角度超过 45° 时腰部竖脊肌持续等长收缩 + 腰椎剪切力，T-bar 划船最危险 | packages/skill-calorie/src/analysis/contraindications.ts:25 | 不译 |
| 倒蹬 | packages/skill-calorie/src/analysis/contraindications.ts:26 | 不译 |
| 倒蹬器械在膝屈曲 + 髋屈曲时腰椎屈曲代偿，突出节段受压(用户已主动删除器械倒蹬) | packages/skill-calorie/src/analysis/contraindications.ts:26 | 不译 |
| 全蹲 | packages/skill-calorie/src/analysis/contraindications.ts:31 | 不译 |
| 冲刺跑 | packages/skill-calorie/src/analysis/contraindications.ts:32 | 不译 |
| 前蹲 | packages/skill-calorie/src/analysis/contraindications.ts:31 | 不译 |
| 坐姿腿屈伸(开链)大重量时髌腱张力极高，易诱发髌腱炎 | packages/skill-calorie/src/analysis/contraindications.ts:33 | 不译 |
| 坐姿腿弯举 | packages/skill-calorie/src/analysis/contraindications.ts:27 | 不译 |
| 大幅度侧平举 | packages/skill-calorie/src/analysis/contraindications.ts:40 | 不译 |
| 大重量深蹲/全蹲 | packages/skill-calorie/src/analysis/contraindications.ts:31 | 不译 |
| 大重量直立划船 | packages/skill-calorie/src/analysis/contraindications.ts:38 | 不译 |
| 开链伸膝大重量 | packages/skill-calorie/src/analysis/contraindications.ts:33 | 不译 |
| 推举过头 | packages/skill-calorie/src/analysis/contraindications.ts:39 | 不译 |
| 支撑式 | packages/skill-calorie/src/analysis/contraindications.ts:15 | 不译 |
| 早安 | packages/skill-calorie/src/analysis/contraindications.ts:24 | 不译 |
| 杠铃划船 | packages/skill-calorie/src/analysis/contraindications.ts:25 | 不译 |
| 深蹲 | packages/skill-calorie/src/analysis/contraindications.ts:31 | 不译 |
| 直立划船 | packages/skill-calorie/src/analysis/contraindications.ts:38 | 不译 |
| 直立划船到顶端时肩关节内旋 + 外展，肩峰撞击 + 肩袖肌群挤压 | packages/skill-calorie/src/analysis/contraindications.ts:38 | 不译 |
| 硬拉 | packages/skill-calorie/src/analysis/contraindications.ts:24 | 不译 |
| 硬拉/罗马尼亚硬拉/早安式弯腰会让腰椎承受巨大轴向压力，突出节段受挤压加重 | packages/skill-calorie/src/analysis/contraindications.ts:24 | 不译 |
| 罗马尼亚 | packages/skill-calorie/src/analysis/contraindications.ts:24 | 不译 |
| 肩 | packages/skill-calorie/src/analysis/contraindications.ts:12,13,37,38,39,40,43 | 不译 |
| 腘绳肌在屈膝时收缩牵拉坐骨结节，导致骨盆前倾 + 腰椎屈曲，加重突出 | packages/skill-calorie/src/analysis/contraindications.ts:27 | 不译 |
| 腰 | packages/skill-calorie/src/analysis/contraindications.ts:12,13,24,25,26,27,43 | 不译 |
| 腿举 | packages/skill-calorie/src/analysis/contraindications.ts:26 | 不译 |
| 腿举/倒蹬类 | packages/skill-calorie/src/analysis/contraindications.ts:26 | 不译 |
| 腿屈伸 | packages/skill-calorie/src/analysis/contraindications.ts:33 | 不译 |
| 腿弯举 | packages/skill-calorie/src/analysis/contraindications.ts:27 | 不译 |
| 膝 | packages/skill-calorie/src/analysis/contraindications.ts:12,13,31,32,33,43 | 不译 |
| 臀桥 | packages/skill-calorie/src/analysis/contraindications.ts:24 | 不译 |
| 超过 90° 深度 + 大重量会让髌股关节压力激增，半月板承受剪切 | packages/skill-calorie/src/analysis/contraindications.ts:31 | 不译 |
| 跳箱 | packages/skill-calorie/src/analysis/contraindications.ts:32 | 不译 |
| 跳跃 | packages/skill-calorie/src/analysis/contraindications.ts:32 | 不译 |
| 跳跃/冲击类 | packages/skill-calorie/src/analysis/contraindications.ts:32 | 不译 |
| 跳跃落地时膝关节承受 5-7 倍体重冲击，半月板/韧带风险高 | packages/skill-calorie/src/analysis/contraindications.ts:32 | 不译 |
| 过头推举 | packages/skill-calorie/src/analysis/contraindications.ts:39 | 不译 |
| 过头推举大重量 | packages/skill-calorie/src/analysis/contraindications.ts:39 | 不译 |
| 过头推举超过头部时肱骨大结节与肩峰撞击，肩袖肌群受压 | packages/skill-calorie/src/analysis/contraindications.ts:39 | 不译 |
| 颈后推 | packages/skill-calorie/src/analysis/contraindications.ts:37 | 不译 |
| 颈后推举 | packages/skill-calorie/src/analysis/contraindications.ts:37 | 不译 |
| 颈后推举时肩关节外旋 + 极度外展，肩峰下撞击综合征风险极高 | packages/skill-calorie/src/analysis/contraindications.ts:37 | 不译 |
| 髋铰链轴向压力 | packages/skill-calorie/src/analysis/contraindications.ts:24 | 不译 |
| 高位 | packages/skill-calorie/src/analysis/contraindications.ts:15 | 不译 |
| 高杠深蹲 | packages/skill-calorie/src/analysis/contraindications.ts:31 | 不译 |

### 性别归一化比较操作数（female/女 → 女），只作判据不上屏（1 对）

用途：性别归一化比较操作数（female/女 → 女），只作判据不上屏

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 女 | packages/skill-calorie/src/analysis/utils.ts:101 | 不译 |

### 性别归一化比较操作数（新版 male/男/空 → 男），只作判据不上屏；:100 同型（1 对）

用途：性别归一化比较操作数（新版 male/男/空 → 男），只作判据不上屏；:100 同型

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 男 | packages/skill-calorie/src/analysis/utils.ts:62,100 | 不译 |

### 2 条已迁 c073/c074；'复制数据' 锚点（1 对）

用途：2 条已迁 c073/c074；'复制数据' 锚点

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 复制数据 | packages/skill-calorie/src/body/bodyDocs.ts:197,304 | 不译 |

### 1 条已迁 c027；'复制数据' 锚点（1 对）

用途：1 条已迁 c027；'复制数据' 锚点

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 复制数据 | packages/skill-calorie/src/body/compareCompositionDoc.ts:83 | 不译 |

### '复制数据' 复制区锚点（2 对）

用途：'复制数据' 复制区锚点

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 复制数据 | packages/skill-calorie/src/body/compareMeasureDoc.ts:77 | 不译 |
| 复制数据 | packages/skill-calorie/src/shared/copyArea.ts:118 | 不译 |

### 部位/字段词表，按库值与输入比对（8 对）

用途：部位/字段词表，按库值与输入比对

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 健身房 | packages/skill-calorie/src/body/log.ts:30 | 不译 |
| 健身房测 | packages/skill-calorie/src/body/log.ts:30 | 不译 |
| 医院 | packages/skill-calorie/src/body/log.ts:30 | 不译 |
| 医院测 | packages/skill-calorie/src/body/log.ts:30 | 不译 |
| 女 | packages/skill-calorie/src/body/log.ts:51,112 | 不译 |
| 家测皮褶钳 | packages/skill-calorie/src/body/log.ts:30 | 不译 |
| 男 | packages/skill-calorie/src/body/log.ts:50,112 | 不译 |
| 皮褶钳 | packages/skill-calorie/src/body/log.ts:30 | 不译 |

### 3 条已迁 c065–c067；'复制数据' 复制区锚点（1 对）

用途：3 条已迁 c065–c067；'复制数据' 复制区锚点

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 复制数据 | packages/skill-calorie/src/body/wizardDocs.ts:148,278 | 不译 |

### 7 个部位名已迁 getter c012–c018；SOURCE_ALIASES 输入归一、'男'/'女' 比较为数据（8 对）

用途：7 个部位名已迁 getter c012–c018；SOURCE_ALIASES 输入归一、'男'/'女' 比较为数据

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 健身房 | packages/skill-calorie/src/body/wizardPlate.ts:82 | 不译 |
| 健身房测 | packages/skill-calorie/src/body/wizardPlate.ts:81 | 不译 |
| 医院 | packages/skill-calorie/src/body/wizardPlate.ts:82 | 不译 |
| 医院测 | packages/skill-calorie/src/body/wizardPlate.ts:81 | 不译 |
| 女 | packages/skill-calorie/src/body/wizardPlate.ts:321 | 不译 |
| 家测皮褶钳 | packages/skill-calorie/src/body/wizardPlate.ts:81 | 不译 |
| 男 | packages/skill-calorie/src/body/wizardPlate.ts:320 | 不译 |
| 皮褶钳 | packages/skill-calorie/src/body/wizardPlate.ts:82 | 不译 |

### 配置键名（:91，读写与回执都用它）（1 对）

用途：配置键名（:91，读写与回执都用它）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-calorie/src/cli/config.ts:121 | 不译 |

### 配置键 'db.dir' 与 message.startsWith('不在') 判定（3 对）

用途：配置键 'db.dir' 与 message.startsWith('不在') 判定

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| photos.dir | packages/skill-calorie/src/cli/config.ts:121 | 不译 |
| 不在 | packages/skill-calorie/src/cli/config.ts:124 | 不译 |
| 同名 | packages/skill-calorie/src/cli/config.ts:124 | 不译 |

### '💧水' 水行名（库值）（2 对）

用途：'💧水' 水行名（库值）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 💧水 | packages/skill-calorie/src/diet/dietEngine.ts:128 | 不译 |
| 💧水 | packages/skill-calorie/src/diet/today.ts:35 | 不译 |

### source === '测试' 库值比较（1 对）

用途：source === '测试' 库值比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 测试 | packages/skill-calorie/src/diet/libraryDocs.ts:128 | 不译 |

### 6 条已迁 c146–c151；'今日喝水' 唤醒词比较为数据（1 对）

用途：6 条已迁 c146–c151；'今日喝水' 唤醒词比较为数据

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 今日喝水 | packages/skill-calorie/src/diet/nutritionPortDocs.ts:638 | 不译 |

### SQL（2 对）

用途：SQL

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  FROM nutrition_products WHERE is_deprecated = 0 ORDER BY product_name LIMIT ? | packages/skill-calorie/src/diet/productStore.ts:109 | 不译 |
| , updated_at = CURRENT_TIMESTAMP WHERE id = ? | packages/skill-calorie/src/diet/productStore.ts:90 | 不译 |

### status.includes('跳过') 库值判定（1 对）

用途：status.includes('跳过') 库值判定

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 跳过 | packages/skill-calorie/src/diet/receipt.ts:337 | 不译 |

### 复制载荷 metrics 键（meal.早餐…）与 === '早餐' 库值查找（8 对）

用途：复制载荷 metrics 键（meal.早餐…）与 === '早餐' 库值查找

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| meal.加餐 | packages/skill-calorie/src/diet/review.ts:95 | 不译 |
| meal.午餐 | packages/skill-calorie/src/diet/review.ts:93 | 不译 |
| meal.早餐 | packages/skill-calorie/src/diet/review.ts:92 | 不译 |
| meal.晚餐 | packages/skill-calorie/src/diet/review.ts:94 | 不译 |
| 加餐 | packages/skill-calorie/src/diet/review.ts:95 | 不译 |
| 午餐 | packages/skill-calorie/src/diet/review.ts:93 | 不译 |
| 早餐 | packages/skill-calorie/src/diet/review.ts:92 | 不译 |
| 晚餐 | packages/skill-calorie/src/diet/review.ts:94 | 不译 |

### MEAL_PARAMS 参数枚举与餐名映射键；3 条界面已迁 c085–c087（4 对）

用途：MEAL_PARAMS 参数枚举与餐名映射键；3 条界面已迁 c085–c087

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 加餐 | packages/skill-calorie/src/diet/reviewDocs.ts:257,262,263 | 不译 |
| 午餐 | packages/skill-calorie/src/diet/reviewDocs.ts:257,262,263 | 不译 |
| 早餐 | packages/skill-calorie/src/diet/reviewDocs.ts:257,262,263 | 不译 |
| 晚餐 | packages/skill-calorie/src/diet/reviewDocs.ts:257,262,263 | 不译 |

### STRENGTH_KEYS／FLEX_KEYS／DAILY_KEYS／MET 词表与 HARD_WORDS 情绪词表，全部与用户输入或库值做 includes 匹配（80 对）

用途：STRENGTH_KEYS／FLEX_KEYS／DAILY_KEYS／MET 词表与 HARD_WORDS 情绪词表，全部与用户输入或库值做 includes 匹配

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| date BETWEEN ? AND ? | packages/skill-calorie/src/exercise/exerciseStore.ts:255 | 不译 |
| 一般 | packages/skill-calorie/src/exercise/exerciseStore.ts:89 | 不译 |
| 不行 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 中等 | packages/skill-calorie/src/exercise/exerciseStore.ts:89 | 不译 |
| 中等强度 | packages/skill-calorie/src/exercise/exerciseStore.ts:89 | 不译 |
| 侧平举 | packages/skill-calorie/src/exercise/exerciseStore.ts:54 | 不译 |
| 俯卧撑 | packages/skill-calorie/src/exercise/exerciseStore.ts:27,54 | 不译 |
| 做饭 | packages/skill-calorie/src/exercise/exerciseStore.ts:37,56 | 不译 |
| 八段锦 | packages/skill-calorie/src/exercise/exerciseStore.ts:36,55 | 不译 |
| 冥想 | packages/skill-calorie/src/exercise/exerciseStore.ts:36,55 | 不译 |
| 冲 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 冲刺 | packages/skill-calorie/src/exercise/exerciseStore.ts:30 | 不译 |
| 出汗多 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 划船 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 前平举 | packages/skill-calorie/src/exercise/exerciseStore.ts:54 | 不译 |
| 力竭 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 力量 | packages/skill-calorie/src/exercise/exerciseStore.ts:60,73 | 不译 |
| 卧推 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 史密斯 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 哑铃 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 喘 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 太极 | packages/skill-calorie/src/exercise/exerciseStore.ts:36,55 | 不译 |
| 家务 | packages/skill-calorie/src/exercise/exerciseStore.ts:37,56 | 不译 |
| 小黄车 | packages/skill-calorie/src/exercise/exerciseStore.ts:31 | 不译 |
| 干不动 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 平举 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 平板 | packages/skill-calorie/src/exercise/exerciseStore.ts:27,54 | 不译 |
| 引体 | packages/skill-calorie/src/exercise/exerciseStore.ts:27,54 | 不译 |
| 弯举 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 很累 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 很轻 | packages/skill-calorie/src/exercise/exerciseStore.ts:88 | 不译 |
| 微微 | packages/skill-calorie/src/exercise/exerciseStore.ts:88 | 不译 |
| 快跑 | packages/skill-calorie/src/exercise/exerciseStore.ts:30 | 不译 |
| 想死 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 慢跑 | packages/skill-calorie/src/exercise/exerciseStore.ts:30 | 不译 |
| 户外跑 | packages/skill-calorie/src/exercise/exerciseStore.ts:29 | 不译 |
| 打扫 | packages/skill-calorie/src/exercise/exerciseStore.ts:37,56 | 不译 |
| 拉伸 | packages/skill-calorie/src/exercise/exerciseStore.ts:36,55 | 不译 |
| 挺累 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 推举 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 推肩 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 撑不住 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 散步 | packages/skill-calorie/src/exercise/exerciseStore.ts:38,56,88 | 不译 |
| 日常 | packages/skill-calorie/src/exercise/exerciseStore.ts:62,69 | 不译 |
| 普通 | packages/skill-calorie/src/exercise/exerciseStore.ts:89 | 不译 |
| 暴毙 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 暴汗 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 有氧 | packages/skill-calorie/src/exercise/exerciseStore.ts:59,63,69 | 不译 |
| 杠铃 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 极限 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 柔韧 | packages/skill-calorie/src/exercise/exerciseStore.ts:61,69 | 不译 |
| 椭圆机 | packages/skill-calorie/src/exercise/exerciseStore.ts:33 | 不译 |
| 楼梯 | packages/skill-calorie/src/exercise/exerciseStore.ts:40 | 不译 |
| 正常 | packages/skill-calorie/src/exercise/exerciseStore.ts:89 | 不译 |
| 气喘吁吁 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 没什么 | packages/skill-calorie/src/exercise/exerciseStore.ts:88 | 不译 |
| 没感觉 | packages/skill-calorie/src/exercise/exerciseStore.ts:88 | 不译 |
| 洗衣 | packages/skill-calorie/src/exercise/exerciseStore.ts:37,56 | 不译 |
| 深蹲 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 清洁 | packages/skill-calorie/src/exercise/exerciseStore.ts:37,56 | 不译 |
| 游泳 | packages/skill-calorie/src/exercise/exerciseStore.ts:34 | 不译 |
| 爬楼 | packages/skill-calorie/src/exercise/exerciseStore.ts:40,56 | 不译 |
| 狠 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 瑜伽 | packages/skill-calorie/src/exercise/exerciseStore.ts:36,55 | 不译 |
| 硬拉 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 累死 | packages/skill-calorie/src/exercise/exerciseStore.ts:87 | 不译 |
| 自行车 | packages/skill-calorie/src/exercise/exerciseStore.ts:31 | 不译 |
| 自重 | packages/skill-calorie/src/exercise/exerciseStore.ts:27,54 | 不译 |
| 走路 | packages/skill-calorie/src/exercise/exerciseStore.ts:38,56 | 不译 |
| 跑 | packages/skill-calorie/src/exercise/exerciseStore.ts:50 | 不译 |
| 跑步机 | packages/skill-calorie/src/exercise/exerciseStore.ts:28 | 不译 |
| 路跑 | packages/skill-calorie/src/exercise/exerciseStore.ts:29 | 不译 |
| 跳绳 | packages/skill-calorie/src/exercise/exerciseStore.ts:32 | 不译 |
| 轻松 | packages/skill-calorie/src/exercise/exerciseStore.ts:88 | 不译 |
| 还行 | packages/skill-calorie/src/exercise/exerciseStore.ts:89 | 不译 |
| 适中 | packages/skill-calorie/src/exercise/exerciseStore.ts:89 | 不译 |
| 通勤 | packages/skill-calorie/src/exercise/exerciseStore.ts:39,56 | 不译 |
| 飞鸟 | packages/skill-calorie/src/exercise/exerciseStore.ts:26,54 | 不译 |
| 骑行 | packages/skill-calorie/src/exercise/exerciseStore.ts:31 | 不译 |
| 骑车 | packages/skill-calorie/src/exercise/exerciseStore.ts:31 | 不译 |

### 字段名映射表（1 对）

用途：字段名映射表

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 日期 | packages/skill-calorie/src/exercise/fieldLabels.ts:30 | 不译 |

### windowParam === '本周'/'今日'（2 对）

用途：windowParam === '本周'/'今日'

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 今日 | packages/skill-calorie/src/exercise/goal.ts:50 | 不译 |
| 本周 | packages/skill-calorie/src/exercise/goal.ts:49 | 不译 |

### status 值比较（'跳过'）（1 对）

用途：status 值比较（'跳过'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 跳过 | packages/skill-calorie/src/exercise/receipt.ts:386,389,390 | 不译 |

### category === '力量'/'有氧'（2 对）

用途：category === '力量'/'有氧'

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 力量 | packages/skill-calorie/src/exercise/records.ts:228,307 | 不译 |
| 有氧 | packages/skill-calorie/src/exercise/records.ts:229,307 | 不译 |

### [列名, 中文名] 字段对照表，按列名查找（13 对）

用途：[列名, 中文名] 字段对照表，按列名查找

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 右上臂 | packages/skill-calorie/src/fetch/body.ts:36 | 不译 |
| 右前臂 | packages/skill-calorie/src/fetch/body.ts:36 | 不译 |
| 右大腿 | packages/skill-calorie/src/fetch/body.ts:35 | 不译 |
| 右小腿 | packages/skill-calorie/src/fetch/body.ts:35 | 不译 |
| 左上臂 | packages/skill-calorie/src/fetch/body.ts:36 | 不译 |
| 左前臂 | packages/skill-calorie/src/fetch/body.ts:36 | 不译 |
| 左大腿 | packages/skill-calorie/src/fetch/body.ts:35 | 不译 |
| 左小腿 | packages/skill-calorie/src/fetch/body.ts:35 | 不译 |
| 肩围 | packages/skill-calorie/src/fetch/body.ts:37 | 不译 |
| 胸围 | packages/skill-calorie/src/fetch/body.ts:34 | 不译 |
| 腰围 | packages/skill-calorie/src/fetch/body.ts:34 | 不译 |
| 腹围 | packages/skill-calorie/src/fetch/body.ts:34 | 不译 |
| 臀围 | packages/skill-calorie/src/fetch/body.ts:34 | 不译 |

### '💧水' WATER_NAME 与 SQL（3 对）

用途：'💧水' WATER_NAME 与 SQL

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| date = ? AND food_name != ? | packages/skill-calorie/src/fetch/diet.ts:280 | 不译 |
| date BETWEEN ? AND ? AND food_name != ? | packages/skill-calorie/src/fetch/diet.ts:284 | 不译 |
| 💧水 | packages/skill-calorie/src/fetch/diet.ts:20 | 不译 |

### NUTRI_PROFILE_LABELS 3 条已迁 getter c025–c027；'夏'/'冬' season 判定为数据（2 对）

用途：NUTRI_PROFILE_LABELS 3 条已迁 getter c025–c027；'夏'/'冬' season 判定为数据

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 冬 | packages/skill-calorie/src/goal/nutritionGoal.ts:236,241,245 | 不译 |
| 夏 | packages/skill-calorie/src/goal/nutritionGoal.ts:236,241,245,246,248 | 不译 |

### 3 条已迁 c220–c222；status === '无记录' 库值比较（1 对）

用途：3 条已迁 c220–c222；status === '无记录' 库值比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 无记录 | packages/skill-calorie/src/goal/resultDocs.ts:209,236,238 | 不译 |

### 检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title（7 对）

用途：检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| cli.js | packages/skill-calorie/src/health.ts:505 | 不译 |
| land.cli | packages/skill-calorie/src/health.ts:536 | 不译 |
| photos.dir | packages/skill-calorie/src/health.ts:467,479 | 不译 |
| photos.gifs | packages/skill-calorie/src/health.ts:487,491 | 不译 |
| xunji.catalog | packages/skill-calorie/src/health.ts:550,554 | 不译 |
| xunji.cli | packages/skill-calorie/src/health.ts:508 | 不译 |
| xunji.key | packages/skill-calorie/src/health.ts:497 | 不译 |

### 体检行 id（:466；行标题/动作/来源均已 m()）（1 对）

用途：体检行 id（:466；行标题/动作/来源均已 m()）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| config.file | packages/skill-calorie/src/health.ts:344,351,358 | 不译 |

### 配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()）（1 对）

用途：配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-calorie/src/health.ts:368,371 | 不译 |

### 体检行 id（:499 起；机器键）（1 对）

用途：体检行 id（:499 起；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.file | packages/skill-calorie/src/health.ts:394,403,410,421 | 不译 |

### 体检行 id（机器键，插件设置页按 id 对接）（1 对）

用途：体检行 id（机器键，插件设置页按 id 对接）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.name | packages/skill-calorie/src/health.ts:391 | 不译 |

### 体检行 id（:540；机器键）（1 对）

用途：体检行 id（:540；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| html.dir | packages/skill-calorie/src/health.ts:433,435 | 不译 |

### 体检行 id（:557；机器键）（1 对）

用途：体检行 id（:557；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| value.source | packages/skill-calorie/src/health.ts:449 | 不译 |

### 4 条已迁 c070–c073；'无记录'/'本周' 库值与窗口常量为数据（2 对）

用途：4 条已迁 c070–c073；'无记录'/'本周' 库值与窗口常量为数据

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 无记录 | packages/skill-calorie/src/home/goalProgressDocs.ts:223,300 | 不译 |
| 本周 | packages/skill-calorie/src/home/goalProgressDocs.ts:455 | 不译 |

### '今天' 已迁 c023；其余 '💧水' 库值、'meal.早餐' 载荷键、'早餐' 库值比较（14 对）

用途：'今天' 已迁 c023；其余 '💧水' 库值、'meal.早餐' 载荷键、'早餐' 库值比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| meal.加餐 | packages/skill-calorie/src/home/today.ts:170 | 不译 |
| meal.午餐 | packages/skill-calorie/src/home/today.ts:168 | 不译 |
| meal.早餐 | packages/skill-calorie/src/home/today.ts:167 | 不译 |
| meal.晚餐 | packages/skill-calorie/src/home/today.ts:169 | 不译 |
| 上周 | packages/skill-calorie/src/home/today.ts:176 | 不译 |
| 上月 | packages/skill-calorie/src/home/today.ts:176 | 不译 |
| 加餐 | packages/skill-calorie/src/home/today.ts:170 | 不译 |
| 午餐 | packages/skill-calorie/src/home/today.ts:168 | 不译 |
| 早餐 | packages/skill-calorie/src/home/today.ts:167 | 不译 |
| 昨日 | packages/skill-calorie/src/home/today.ts:176 | 不译 |
| 晚餐 | packages/skill-calorie/src/home/today.ts:169 | 不译 |
| 本周 | packages/skill-calorie/src/home/today.ts:176 | 不译 |
| 本月 | packages/skill-calorie/src/home/today.ts:176 | 不译 |
| 💧水 | packages/skill-calorie/src/home/today.ts:155 | 不译 |

### 库值映射（'💧水'、'低/中/高'）（4 对）

用途：库值映射（'💧水'、'低/中/高'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 中 | packages/skill-calorie/src/migrate/migrate.ts:135 | 不译 |
| 低 | packages/skill-calorie/src/migrate/migrate.ts:134 | 不译 |
| 高 | packages/skill-calorie/src/migrate/migrate.ts:136 | 不译 |
| 💧水 | packages/skill-calorie/src/migrate/migrate.ts:32 | 不译 |

### OUTPUT_TYPE_LABELS／LEGACY_COMMAND_OVERRIDES／DYNAMIC_COMMAND_SEGMENTS 全部进文件名（output.ts:127 segs、:317 sanitizeFilenamePart）（14 对）

用途：OUTPUT_TYPE_LABELS／LEGACY_COMMAND_OVERRIDES／DYNAMIC_COMMAND_SEGMENTS 全部进文件名（output.ts:127 segs、:317 sanitizeFilenamePart）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 低热量 | packages/skill-calorie/src/output.ts:306 | 不译 |
| 全部 | packages/skill-calorie/src/output.ts:306,308 | 不译 |
| 卡路里_照片HELP | packages/skill-calorie/src/output.ts:43 | 不译 |
| 回执 | packages/skill-calorie/src/output.ts:285 | 不译 |
| 常吃 | packages/skill-calorie/src/output.ts:306 | 不译 |
| 结果 | packages/skill-calorie/src/output.ts:285 | 不译 |
| 肩 | packages/skill-calorie/src/output.ts:308 | 不译 |
| 腰 | packages/skill-calorie/src/output.ts:308 | 不译 |
| 膝 | packages/skill-calorie/src/output.ts:308 | 不译 |
| 过程 | packages/skill-calorie/src/output.ts:285 | 不译 |
| 食物排行 | packages/skill-calorie/src/output.ts:298 | 不译 |
| 高热量 | packages/skill-calorie/src/output.ts:306 | 不译 |
| 高碳水 | packages/skill-calorie/src/output.ts:306 | 不译 |
| 高蛋白 | packages/skill-calorie/src/output.ts:306 | 不译 |

### '卡路里_HELP' 文件名与 package.json 路径（2 对）

用途：'卡路里_HELP' 文件名与 package.json 路径

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| package.json | packages/skill-calorie/src/photo/helpFile.ts:42 | 不译 |
| 卡路里_HELP | packages/skill-calorie/src/photo/helpFile.ts:32 | 不译 |

### 速查台模型/展示序常量（62 对）

用途：速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 一键复制 | packages/skill-calorie/src/photo/helpScene.ts:210 | 不译 |
| 主页 | packages/skill-calorie/src/photo/helpScene.ts:76 | 不译 |
| 体重 | packages/skill-calorie/src/photo/helpScene.ts:78,107 | 不译 |
| 体重复盘 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 健身计划 | packages/skill-calorie/src/photo/helpScene.ts:80,106 | 不译 |
| 分析 | packages/skill-calorie/src/photo/helpScene.ts:85,111 | 不译 |
| 删身体细节 | packages/skill-calorie/src/photo/helpScene.ts:102 | 不译 |
| 卡路里 | packages/skill-calorie/src/photo/helpScene.ts:42 | 不译 |
| 可执行命令 | packages/skill-calorie/src/photo/helpScene.ts:131 | 不译 |
| 命令 | packages/skill-calorie/src/photo/helpScene.ts:133 | 不译 |
| 唤醒词速查台 | packages/skill-calorie/src/photo/helpScene.ts:43 | 不译 |
| 回执 | packages/skill-calorie/src/photo/helpScene.ts:188 | 不译 |
| 基础信息 | packages/skill-calorie/src/photo/helpScene.ts:84,100 | 不译 |
| 复盘 | packages/skill-calorie/src/photo/helpScene.ts:111 | 不译 |
| 存身材照 | packages/skill-calorie/src/photo/helpScene.ts:104 | 不译 |
| 安全检查 | packages/skill-calorie/src/photo/helpScene.ts:106 | 不译 |
| 定目标 | packages/skill-calorie/src/photo/helpScene.ts:101 | 不译 |
| 定训练计划 | packages/skill-calorie/src/photo/helpScene.ts:106 | 不译 |
| 对比体重 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 工作流程 | packages/skill-calorie/src/photo/helpScene.ts:135 | 不译 |
| 改体重记录 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 改目标 | packages/skill-calorie/src/photo/helpScene.ts:101 | 不译 |
| 改训练计划 | packages/skill-calorie/src/photo/helpScene.ts:106 | 不译 |
| 改资料 | packages/skill-calorie/src/photo/helpScene.ts:100 | 不译 |
| 改运动 | packages/skill-calorie/src/photo/helpScene.ts:103 | 不译 |
| 改饮食 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |
| 既有唤醒词 | packages/skill-calorie/src/photo/helpScene.ts:114 | 不译 |
| 查食品 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |
| 比身体细节 | packages/skill-calorie/src/photo/helpScene.ts:102 | 不译 |
| 比身材照 | packages/skill-calorie/src/photo/helpScene.ts:104 | 不译 |
| 目标管理 | packages/skill-calorie/src/photo/helpScene.ts:81,101 | 不译 |
| 看体重备注 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 看体重明细 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 看体重曲线 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 看体重稳不稳 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 看排行 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |
| 看档案 | packages/skill-calorie/src/photo/helpScene.ts:100 | 不译 |
| 看目标 | packages/skill-calorie/src/photo/helpScene.ts:101 | 不译 |
| 看营养 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |
| 看训练计划 | packages/skill-calorie/src/photo/helpScene.ts:106 | 不译 |
| 看身体细节 | packages/skill-calorie/src/photo/helpScene.ts:102 | 不译 |
| 看身材照 | packages/skill-calorie/src/photo/helpScene.ts:104 | 不译 |
| 看运动 | packages/skill-calorie/src/photo/helpScene.ts:103 | 不译 |
| 看饮食 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |
| 管身材照 | packages/skill-calorie/src/photo/helpScene.ts:104 | 不译 |
| 结果 | packages/skill-calorie/src/photo/helpScene.ts:187 | 不译 |
| 落地训练 | packages/skill-calorie/src/photo/helpScene.ts:106 | 不译 |
| 计划复盘 | packages/skill-calorie/src/photo/helpScene.ts:106 | 不译 |
| 记身体细节 | packages/skill-calorie/src/photo/helpScene.ts:102 | 不译 |
| 记运动 | packages/skill-calorie/src/photo/helpScene.ts:103 | 不译 |
| 记饮食 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |
| 设置资料 | packages/skill-calorie/src/photo/helpScene.ts:100 | 不译 |
| 身体细节 | packages/skill-calorie/src/photo/helpScene.ts:82,102 | 不译 |
| 身材照片 | packages/skill-calorie/src/photo/helpScene.ts:83,104 | 不译 |
| 过程 | packages/skill-calorie/src/photo/helpScene.ts:186 | 不译 |
| 运动 | packages/skill-calorie/src/photo/helpScene.ts:79,103 | 不译 |
| 运动分析 | packages/skill-calorie/src/photo/helpScene.ts:103 | 不译 |
| 运动复盘 | packages/skill-calorie/src/photo/helpScene.ts:103 | 不译 |
| 量体重 | packages/skill-calorie/src/photo/helpScene.ts:107 | 不译 |
| 餐别分布 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |
| 饮食 | packages/skill-calorie/src/photo/helpScene.ts:77,105 | 不译 |
| 饮食复盘 | packages/skill-calorie/src/photo/helpScene.ts:105 | 不译 |

### scene 选择值比较（3 对）

用途：scene 选择值比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 删照片标签 | packages/skill-calorie/src/photo/manage.ts:44,59 | 不译 |
| 加照片标签 | packages/skill-calorie/src/photo/manage.ts:44,54 | 不译 |
| 改照片标签 | packages/skill-calorie/src/photo/manage.ts:44,50 | 不译 |

### scene 选择值比较（:340 if (scene === '改照片标签')）（7 对）

用途：scene 选择值比较（:340 if (scene === '改照片标签')）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| GIF 合成由外部按本任务描述执行，本渲染不碰二进制 | packages/skill-calorie/src/photo/photo.ts:192 | 不译 |
| 删照片标签 | packages/skill-calorie/src/photo/photo.ts:335 | 不译 |
| 加照片标签 | packages/skill-calorie/src/photo/photo.ts:335,347 | 不译 |
| 对比两张照片 | packages/skill-calorie/src/photo/photo.ts:125,146 | 不译 |
| 改照片标签 | packages/skill-calorie/src/photo/photo.ts:335,340 | 不译 |
| 查身材照 | packages/skill-calorie/src/photo/photo.ts:156,173 | 不译 |
| 看身材照 | packages/skill-calorie/src/photo/photo.ts:73,115 | 不译 |

### 照片记录类型词表，写库/比对（2 对）

用途：照片记录类型词表，写库/比对

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 删照片标签 | packages/skill-calorie/src/photo/receipt.ts:86,145 | 不译 |
| 加照片标签 | packages/skill-calorie/src/photo/receipt.ts:85,141 | 不译 |

### PHOTO_LOG_TAGS 写库词表（8 对）

用途：PHOTO_LOG_TAGS 写库词表

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 侧面 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |
| 手臂 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |
| 正面 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |
| 正面灯光 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |
| 正面自然光 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |
| 背面 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |
| 腹部 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |
| 腿部 | packages/skill-calorie/src/photo/wizardPort.ts:53 | 不译 |

### 开发者报文（CalorieRenderError missing-data）与 category === '力量'/'有氧' 词表（5 对）

用途：开发者报文（CalorieRenderError missing-data）与 category === '力量'/'有氧' 词表

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 力量 | packages/skill-calorie/src/render/exercisePort.ts:109,110,248 | 不译 |
| 无${cat}记录：${start} ~ ${end} | packages/skill-calorie/src/render/exercisePort.ts:83 | 不译 |
| 日常 | packages/skill-calorie/src/render/exercisePort.ts:248 | 不译 |
| 有氧 | packages/skill-calorie/src/render/exercisePort.ts:181,182,248 | 不译 |
| 柔韧 | packages/skill-calorie/src/render/exercisePort.ts:248 | 不译 |

### unit === '自重' 比较与 missing-data 开发者报文（2 对）

用途：unit === '自重' 比较与 missing-data 开发者报文

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未设运动目标（daily_goal.exercise_goal 缺失，先维护运动目标，下一步跑 calorie-cmd-read calorie.goal.exercise --params '{"goal":300}'） | packages/skill-calorie/src/render/planPlate.ts:461 | 不译 |
| 自重 | packages/skill-calorie/src/render/planPlate.ts:368 | 不译 |

### 1 条已迁 c901；label.startsWith('日均') 载荷键判定（1 对）

用途：1 条已迁 c901；label.startsWith('日均') 载荷键判定

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 日均 | packages/skill-calorie/src/render/trendDocs.ts:281 | 不译 |

### 数据层 humanText 查找键（3 对）

用途：数据层 humanText 查找键

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 无热量目标（先设目标） | packages/skill-calorie/src/render/trendMiscPortDocs.ts:470 | 不译 |
| 无蛋白目标（先设目标） | packages/skill-calorie/src/render/trendMiscPortDocs.ts:471 | 不译 |
| 无饮水目标（先设目标） | packages/skill-calorie/src/render/trendMiscPortDocs.ts:472 | 不译 |

### unit === '自重' 比较（1 对）

用途：unit === '自重' 比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 自重 | packages/skill-calorie/src/render/workoutMovementTable.ts:60 | 不译 |

### 30 条 CSS 注释；PART_PALETTE 四元组是「库中词→类名后缀→rgb」，键与库值比对（26 对）

用途：30 条 CSS 注释；PART_PALETTE 四元组是「库中词→类名后缀→rgb」，键与库值比对

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|       按钮行自约束 520 居中 ＋ 窄屏塌列，断点用 HELP 的 820。 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:143 | 不译 |
|    12px ＋ --fg2，达 AA 对比度；老页那版 11px ＋ #86868b 因对比度 3.62:1 已被共享样式表否掉） */ | packages/skill-calorie/src/render/workoutPlanCss.ts:128 | 不译 |
|    共享区块自己那处 640 不撤——820 管本页，640 管共享件，两段同向不打架。 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:165 | 不译 |
|    字号 12 ＋ 浅底，与共享口径行同值（共享那件是纯文本单参、会转义，装不下标签，故本页自落一行）。 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:145 | 不译 |
|    桌面也没有滚轮横滚的直觉 —— 第 11、12 周等于看不见。改成**换行铺开**：都在页上，点得到。 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:86 | 不译 |
| /* ── T351-v9 · 负责人 2026-09-15 六条口径落点 ───────────────────────────── | packages/skill-calorie/src/render/workoutPlanCss.ts:138 | 不译 |
| /* 休息日标题：星期小 chip（与场次卡同款）＋ 状态词 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:154 | 不译 |
| /* 周区块与日区块；非激活面板靠本件生成的 :checked 规则收起来 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:98 | 不译 |
| /* 周区块标题：场次数做成胶囊（标题说「哪一周」、胶囊说「几场」，两件事各就各位） */ | packages/skill-calorie/src/render/workoutPlanCss.ts:150 | 不译 |
| /* 打印：页签是导航件不印，两级面板一律展开（内容在 DOM 里，不靠脚本显示） */ | packages/skill-calorie/src/render/workoutPlanCss.ts:134 | 不译 |
| /* 本族可点件的触摸目标（HELP 的两档：主导航 44px、次要 chip 38px） */ | packages/skill-calorie/src/render/workoutPlanCss.ts:71 | 不译 |
| /* 老 .day-tabs／.day-tab：日页签——胶囊＋激活态深底白字；无安排的星期压暗 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:91 | 不译 |
| /* 老 .rest-day：休息日卡居中留白 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:130 | 不译 |
| /* 老 .sess-head：一行信息密度高（周X ｜ 场次名 ｜ 时段 ｜ 共 N 组 ｜ 节奏） */ | packages/skill-calorie/src/render/workoutPlanCss.ts:107 | 不译 |
| /* 老 .session：白底＋细线＋16 圆角＋淡阴影 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:104 | 不译 |
| /* 老 .tabs／.tab：周次页签——胶囊＋激活态主色字与下划线。 | packages/skill-calorie/src/render/workoutPlanCss.ts:84 | 不译 |
| /* 老 token 名的页内别名（--lineS 照老值写死，无冻结对应） */ | packages/skill-calorie/src/render/workoutPlanCss.ts:79 | 不译 |
| /* 老模板第二处 @media：本页自造的件在窄屏塌列（断点用 HELP 的 820，不用老模板的 640）。 | packages/skill-calorie/src/render/workoutPlanCss.ts:164 | 不译 |
| /* 选钮：视觉上藏起来，仍在文档流里、仍可 Tab 与方向键操作（零脚本的两级页签就靠它） */ | packages/skill-calorie/src/render/workoutPlanCss.ts:81 | 不译 |
| 有氧 | packages/skill-calorie/src/render/workoutPlanCss.ts:37 | 不译 |
| 肩 | packages/skill-calorie/src/render/workoutPlanCss.ts:32 | 不译 |
| 背 | packages/skill-calorie/src/render/workoutPlanCss.ts:34 | 不译 |
| 胸 | packages/skill-calorie/src/render/workoutPlanCss.ts:31 | 不译 |
| 腹 | packages/skill-calorie/src/render/workoutPlanCss.ts:36 | 不译 |
| 腿 | packages/skill-calorie/src/render/workoutPlanCss.ts:35 | 不译 |
| 臂 | packages/skill-calorie/src/render/workoutPlanCss.ts:33 | 不译 |

### 派生件（11 对）

用途：派生件：样式／脚本源码注释（不上屏）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|       （`.ilw-sub-detail` / `.ilw-sub-type`）、页头下的计划信息条（`.ilw-meta` ＋ `.ilw-chip`）。 | packages/skill-calorie/src/render/workoutPlanCss.ts:141 | 不译 |
|       （`.ilw-week-count`）、休息日的星期小 chip（复用 `.ilw-sess-tag`）、动作副行的两颗小标签 | packages/skill-calorie/src/render/workoutPlanCss.ts:140 | 不译 |
|    T351-v12：窄屏与多周计划（实测 12 周）下原来靠横向滚动，而滚动条被 `scrollbar-width:none` 藏了、 | packages/skill-calorie/src/render/workoutPlanCss.ts:85 | 不译 |
|    ② 手机端照 HELP（`packages/base-render/src/helpShell.ts`）：触摸目标 ＋ 触屏三件 ＋ | packages/skill-calorie/src/render/workoutPlanCss.ts:142 | 不译 |
|    ⑤ 不用 `·` 顶替设计：四处串字符串的元素改成有形状的件 —— 周区块标题的场次胶囊 | packages/skill-calorie/src/render/workoutPlanCss.ts:139 | 不译 |
|    本页不再给 `th` 写死 `text-align`（v5 那句 `text-align:left` 会把右对齐列的表头摁回左边 ⇒ 表头与 | packages/skill-calorie/src/render/workoutPlanCss.ts:116 | 不译 |
|    表体在纵轴上错开，负责人附图点名）；横向内距也与 `td` 同值（右 10px／左 0），故同一列的**单元格边界 | packages/skill-calorie/src/render/workoutPlanCss.ts:117 | 不译 |
| /* 副行小字只收紧间距：字号与色仍走共享位的口径行（`renderCaliberLine` 的 ilife-block-caliber， | packages/skill-calorie/src/render/workoutPlanCss.ts:127 | 不译 |
| /* 动作副行：原来是一行「细化词 · 类型」，`·` 是拿符号顶替设计；改成两颗块级小标签。 | packages/skill-calorie/src/render/workoutPlanCss.ts:144 | 不译 |
| /* 老表：动作列加粗加宽、表头小字、数值列右对齐。**表头与表体的对齐同出一处**——`renderDataTable` 给 | packages/skill-calorie/src/render/workoutPlanCss.ts:114 | 不译 |
| /* 计划信息条：起日与计划说明。说明原文里若带 `·`（老技能当年就是这么写的），拆成胶囊排开 */ | packages/skill-calorie/src/render/workoutPlanCss.ts:157 | 不译 |

### raw === '休息'、raw.includes('休息日') 库 sessionLabel 判定（2 对）

用途：raw === '休息'、raw.includes('休息日') 库 sessionLabel 判定

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 休息 | packages/skill-calorie/src/render/workoutPlanLook.ts:53 | 不译 |
| 休息日 | packages/skill-calorie/src/render/workoutPlanLook.ts:54 | 不译 |

### 复制载荷 metrics 键（本期/对比期/均值kg…）与唤醒词「对比体重（20 对）

用途：复制载荷 metrics 键（本期/对比期/均值kg…）与唤醒词「对比体重：」；4 条情景文案已迁 c064–c067

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 今天 | packages/skill-calorie/src/weight/compare.ts:189 | 不译 |
| 入冬最低 | packages/skill-calorie/src/weight/compare.ts:616 | 不译 |
| 入夏最低 | packages/skill-calorie/src/weight/compare.ts:615 | 不译 |
| 减重 N kg 那天 | packages/skill-calorie/src/weight/compare.ts:632 | 不译 |
| 区间 | packages/skill-calorie/src/weight/compare.ts:434,435 | 不译 |
| 变化kg | packages/skill-calorie/src/weight/compare.ts:426,428 | 不译 |
| 均值kg | packages/skill-calorie/src/weight/compare.ts:425,427 | 不译 |
| 均值差kg | packages/skill-calorie/src/weight/compare.ts:429 | 不译 |
| 对比体重： | packages/skill-calorie/src/weight/compare.ts:641 | 不译 |
| 对比期 | packages/skill-calorie/src/weight/compare.ts:189 | 不译 |
| 差值方向 | packages/skill-calorie/src/weight/compare.ts:436 | 不译 |
| 平台期首日 | packages/skill-calorie/src/weight/compare.ts:614 | 不译 |
| 日均速率差g | packages/skill-calorie/src/weight/compare.ts:430 | 不译 |
| 期初kg | packages/skill-calorie/src/weight/compare.ts:425,427 | 不译 |
| 期末kg | packages/skill-calorie/src/weight/compare.ts:425,427 | 不译 |
| 本期 | packages/skill-calorie/src/weight/compare.ts:189 | 不译 |
| 条数 | packages/skill-calorie/src/weight/compare.ts:434,435 | 不译 |
| 每天变化量 | packages/skill-calorie/src/weight/compare.ts:437 | 不译 |
| 波动kg | packages/skill-calorie/src/weight/compare.ts:426,428 | 不译 |
| 结论 | packages/skill-calorie/src/weight/compare.ts:437 | 不译 |

### t.trendCn === '上升' 比较（1 对）

用途：t.trendCn === '上升' 比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 上升 | packages/skill-calorie/src/weight/log.ts:274 | 不译 |

### summary.includes(' 条') 判定（1 对）

用途：summary.includes(' 条') 判定

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  条 | packages/skill-calorie/src/weight/receipt.ts:190 | 不译 |

### NOTE_TAGS 备注快捷词表（写库 tags）+ date BETWEEN ? SQL（11 对）

用途：NOTE_TAGS 备注快捷词表（写库 tags）+ date BETWEEN ? SQL

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| date BETWEEN ? AND ? | packages/skill-calorie/src/weight/records.ts:177 | 不译 |
| 早起 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 晨起 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 晨起空腹 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 生理期 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 睡前 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 空腹 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 运动前 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 运动后 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 餐前 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |
| 餐后 | packages/skill-calorie/src/weight/records.ts:12 | 不译 |

### 复制载荷 metrics 键（16 对）

用途：复制载荷 metrics 键

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  体重kg | packages/skill-calorie/src/weight/review.ts:739 | 不译 |
|  天数 | packages/skill-calorie/src/weight/review.ts:740 | 不译 |
|  日期 | packages/skill-calorie/src/weight/review.ts:738 | 不译 |
| 今年 | packages/skill-calorie/src/weight/review.ts:203 | 不译 |
| 对照区间 | packages/skill-calorie/src/weight/review.ts:649 | 不译 |
| 当前日期 | packages/skill-calorie/src/weight/review.ts:733 | 不译 |
| 总减重 | packages/skill-calorie/src/weight/review.ts:733 | 不译 |
| 截止 | packages/skill-calorie/src/weight/review.ts:441 | 不译 |
| 日期 | packages/skill-calorie/src/weight/review.ts:441 | 不译 |
| 本周 | packages/skill-calorie/src/weight/review.ts:200 | 不译 |
| 本月 | packages/skill-calorie/src/weight/review.ts:201 | 不译 |
| 状态 | packages/skill-calorie/src/weight/review.ts:441 | 不译 |
| 窗口 | packages/skill-calorie/src/weight/review.ts:647 | 不译 |
| 结论 | packages/skill-calorie/src/weight/review.ts:442,651,734 | 不译 |
| 预计达成日 | packages/skill-calorie/src/weight/review.ts:441 | 不译 |
| 首末 | packages/skill-calorie/src/weight/review.ts:648 | 不译 |

### 复制载荷 stat.metrics 的键（基线kg/黄线kg/…/结论/异常明细）（17 对）

用途：复制载荷 stat.metrics 的键（基线kg/黄线kg/…/结论/异常明细）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| σ趋势点数 | packages/skill-calorie/src/weight/volatilityDoc.ts:100 | 不译 |
| 基线kg | packages/skill-calorie/src/weight/volatilityDoc.ts:97 | 不译 |
| 基线σkg | packages/skill-calorie/src/weight/volatilityDoc.ts:97 | 不译 |
| 基线口径 | packages/skill-calorie/src/weight/volatilityDoc.ts:106 | 不译 |
| 基线模式 | packages/skill-calorie/src/weight/volatilityDoc.ts:107 | 不译 |
| 异常明细 | packages/skill-calorie/src/weight/volatilityDoc.ts:111 | 不译 |
| 最新偏离kg | packages/skill-calorie/src/weight/volatilityDoc.ts:102 | 不译 |
| 有记录天数 | packages/skill-calorie/src/weight/volatilityDoc.ts:99 | 不译 |
| 点数 | packages/skill-calorie/src/weight/volatilityDoc.ts:100 | 不译 |
| 窗口天数 | packages/skill-calorie/src/weight/volatilityDoc.ts:99 | 不译 |
| 红线kg | packages/skill-calorie/src/weight/volatilityDoc.ts:98 | 不译 |
| 结论 | packages/skill-calorie/src/weight/volatilityDoc.ts:110 | 不译 |
| 缺口天数 | packages/skill-calorie/src/weight/volatilityDoc.ts:99 | 不译 |
| 近期异常数 | packages/skill-calorie/src/weight/volatilityDoc.ts:101 | 不译 |
| 预警日 | packages/skill-calorie/src/weight/volatilityDoc.ts:109 | 不译 |
| 预警档位 | packages/skill-calorie/src/weight/volatilityDoc.ts:108 | 不译 |
| 黄线kg | packages/skill-calorie/src/weight/volatilityDoc.ts:98 | 不译 |

### '已完成' 已迁 c043；label === '一年前'/'半年前' 判定为数据（3 对）

用途：'已完成' 已迁 c043；label === '一年前'/'半年前' 判定为数据

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  克 | packages/skill-calorie/src/weight/weightCompare.ts:119 | 不译 |
| 一年前 | packages/skill-calorie/src/weight/weightCompare.ts:187 | 不译 |
| 半年前 | packages/skill-calorie/src/weight/weightCompare.ts:187 | 不译 |

### SQL + 唤醒词表 a1..d4 + sameDayCompare(db,today,12,'一年前') 的标签参数（进 weightCompare.ts:187 label 判定）（22 对）

用途：SQL + 唤醒词表 a1..d4 + sameDayCompare(db,today,12,'一年前') 的标签参数（进 weightCompare.ts:187 label 判定）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  WHERE date BETWEEN ? AND ? | packages/skill-calorie/src/weight/weightCompare3.ts:44 | 不译 |
| SELECT COUNT(*) AS n, COALESCE(SUM(duration_minutes), 0) AS v FROM schedule_records WHERE date BETWEEN ? AND ? AND (category LIKE '%睡眠%' OR activity LIKE '%睡眠%') | packages/skill-calorie/src/weight/weightCompare3.ts:66 | 不译 |
| 一年前 | packages/skill-calorie/src/weight/weightCompare3.ts:206 | 不译 |
| 三月前 | packages/skill-calorie/src/weight/weightCompare3.ts:208 | 不译 |
| 半年前 | packages/skill-calorie/src/weight/weightCompare3.ts:207 | 不译 |
| 对比体重：今天 vs 一年前今天 | packages/skill-calorie/src/weight/weightCompare3.ts:183 | 不译 |
| 对比体重：今天 vs 三月前今天 | packages/skill-calorie/src/weight/weightCompare3.ts:185 | 不译 |
| 对比体重：今天 vs 半年前今天 | packages/skill-calorie/src/weight/weightCompare3.ts:184 | 不译 |
| 对比体重：减重 N kg 那天 vs 今天 | packages/skill-calorie/src/weight/weightCompare3.ts:190 | 不译 |
| 对比体重：工作日 vs 周末 | packages/skill-calorie/src/weight/weightCompare3.ts:194 | 不译 |
| 对比体重：当前 vs 入冬最低 | packages/skill-calorie/src/weight/weightCompare3.ts:192 | 不译 |
| 对比体重：当前 vs 入夏最低 | packages/skill-calorie/src/weight/weightCompare3.ts:191 | 不译 |
| 对比体重：当前 vs 历史最低 | packages/skill-calorie/src/weight/weightCompare3.ts:188 | 不译 |
| 对比体重：当前 vs 历史最高 | packages/skill-calorie/src/weight/weightCompare3.ts:189 | 不译 |
| 对比体重：当前 vs 平台期首日 | packages/skill-calorie/src/weight/weightCompare3.ts:187 | 不译 |
| 对比体重：当前 vs 目标体重 | packages/skill-calorie/src/weight/weightCompare3.ts:186 | 不译 |
| 对比体重：最近 30 天 vs 之前 30 天 | packages/skill-calorie/src/weight/weightCompare3.ts:178 | 不译 |
| 对比体重：本周 vs 上周 | packages/skill-calorie/src/weight/weightCompare3.ts:180 | 不译 |
| 对比体重：本月 vs 上月 | packages/skill-calorie/src/weight/weightCompare3.ts:181 | 不译 |
| 对比体重：自定义两段时间 | packages/skill-calorie/src/weight/weightCompare3.ts:179 | 不译 |
| 对比体重：运动多 vs 运动少的两个月 | packages/skill-calorie/src/weight/weightCompare3.ts:193 | 不译 |
| 对比体重：近 N 天 vs 上一个 N 天 | packages/skill-calorie/src/weight/weightCompare3.ts:182 | 不译 |

### 唤醒词/协议（6 对）

用途：唤醒词/协议

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 挡板 | packages/skill-calorie/src/workout/land.ts:409 | 不译 |
| 落地训练 | packages/skill-calorie/src/workout/land.ts:50 | 不译 |
| 落地到本周末 | packages/skill-calorie/src/workout/landBatch.ts:42 | 不译 |
| 落地到本月底 | packages/skill-calorie/src/workout/landBatch.ts:43 | 不译 |
| 拉训记实绩 | packages/skill-calorie/src/workout/xunjiBackfill.ts:32 | 不译 |
| 同步到训记 | packages/skill-calorie/src/workout/xunjiPush.ts:39 | 不译 |

### kind: 力量|有氧 类型字段（2 对）

用途：kind: 力量\|有氧 类型字段

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 力量 | packages/skill-calorie/src/workout/planEditor.ts:36,73 | 不译 |
| 有氧 | packages/skill-calorie/src/workout/planEditor.ts:36,73 | 不译 |

### SLOTS 时段、CARDIO、MINUTE_UNIT、UNKNOWN_PART 参与 includes 判定与写库（8 对）

用途：SLOTS 时段、CARDIO、MINUTE_UNIT、UNKNOWN_PART 参与 includes 判定与写库

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 上午 | packages/skill-calorie/src/workout/planEditorPort.ts:51 | 不译 |
| 下午 | packages/skill-calorie/src/workout/planEditorPort.ts:51 | 不译 |
| 凌晨 | packages/skill-calorie/src/workout/planEditorPort.ts:51 | 不译 |
| 分钟 | packages/skill-calorie/src/workout/planEditorPort.ts:59 | 不译 |
| 力量 | packages/skill-calorie/src/workout/planEditorPort.ts:108,170 | 不译 |
| 晚上 | packages/skill-calorie/src/workout/planEditorPort.ts:51 | 不译 |
| 有氧 | packages/skill-calorie/src/workout/planEditorPort.ts:58 | 不译 |
| 未分类 | packages/skill-calorie/src/workout/planEditorPort.ts:61 | 不译 |

### kind === '有氧' 字段判定（1 对）

用途：kind === '有氧' 字段判定

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 有氧 | packages/skill-calorie/src/workout/planPayload.ts:140 | 不译 |

### 训练水平键、器械别名表、UPDATE SQL（28 对）

用途：训练水平键、器械别名表、UPDATE SQL

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| , updated_at = CURRENT_TIMESTAMP WHERE week_number = ? AND day_of_week = ? AND session_index = ? | packages/skill-calorie/src/workout/planStore.ts:340 | 不译 |
| 中手 | packages/skill-calorie/src/workout/planStore.ts:17,113 | 不译 |
| 俯卧撑 | packages/skill-calorie/src/workout/planStore.ts:30 | 不译 |
| 健腹轮 | packages/skill-calorie/src/workout/planStore.ts:28 | 不译 |
| 划船 | packages/skill-calorie/src/workout/planStore.ts:26 | 不译 |
| 卧推 | packages/skill-calorie/src/workout/planStore.ts:26 | 不译 |
| 卷腹 | packages/skill-calorie/src/workout/planStore.ts:30 | 不译 |
| 史密斯 | packages/skill-calorie/src/workout/planStore.ts:24 | 不译 |
| 史密斯机 | packages/skill-calorie/src/workout/planStore.ts:24 | 不译 |
| 哑铃 | packages/skill-calorie/src/workout/planStore.ts:25 | 不译 |
| 器械划船 | packages/skill-calorie/src/workout/planStore.ts:22 | 不译 |
| 器械推胸 | packages/skill-calorie/src/workout/planStore.ts:22 | 不译 |
| 坐姿器械 | packages/skill-calorie/src/workout/planStore.ts:22 | 不译 |
| 平板 | packages/skill-calorie/src/workout/planStore.ts:30 | 不译 |
| 弹力带 | packages/skill-calorie/src/workout/planStore.ts:29 | 不译 |
| 悍马 | packages/skill-calorie/src/workout/planStore.ts:22 | 不译 |
| 悍马机 | packages/skill-calorie/src/workout/planStore.ts:22 | 不译 |
| 支撑 | packages/skill-calorie/src/workout/planStore.ts:30 | 不译 |
| 新手 | packages/skill-calorie/src/workout/planStore.ts:16 | 不译 |
| 杠铃 | packages/skill-calorie/src/workout/planStore.ts:26 | 不译 |
| 深蹲 | packages/skill-calorie/src/workout/planStore.ts:26 | 不译 |
| 瑜伽垫 | packages/skill-calorie/src/workout/planStore.ts:30 | 不译 |
| 硬拉 | packages/skill-calorie/src/workout/planStore.ts:26 | 不译 |
| 绳索 | packages/skill-calorie/src/workout/planStore.ts:27 | 不译 |
| 老手 | packages/skill-calorie/src/workout/planStore.ts:18 | 不译 |
| 臀桥 | packages/skill-calorie/src/workout/planStore.ts:30 | 不译 |
| 蝴蝶机 | packages/skill-calorie/src/workout/planStore.ts:23 | 不译 |
| 龙门架 | packages/skill-calorie/src/workout/planStore.ts:27 | 不译 |

### '休息'/'休息日' 写库 sessionLabel（1 对）

用途：'休息'/'休息日' 写库 sessionLabel

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 休息 | packages/skill-calorie/src/workout/write.ts:129,479 | 不译 |

### 唤醒词/协议字段（4 对）

用途：唤醒词/协议字段

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| xunji.key | packages/skill-calorie/src/workout/xunjiKey.ts:76,104,112 | 不译 |
| 查训记KEY状态 | packages/skill-calorie/src/workout/xunjiKey.ts:36 | 不译 |
| 清训记KEY | packages/skill-calorie/src/workout/xunjiKey.ts:38 | 不译 |
| 设训记KEY | packages/skill-calorie/src/workout/xunjiKey.ts:37 | 不译 |

### 协议/唤醒词（1 对）

用途：协议/唤醒词

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| cli.js | packages/skill-calorie/src/workout/xunjiRunner.ts:60 | 不译 |

### '训记官方动作.json' 文件路径（1 对）

用途：'训记官方动作.json' 文件路径

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 训记官方动作.json | packages/skill-calorie/src/xunji/catalog.ts:28 | 不译 |

### 配置键 'xunji.key'（1 对）

用途：配置键 'xunji.key'

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| xunji.key | packages/skill-calorie/src/xunji/key.ts:22 | 不译 |

### 错误码/报文匹配（2 对）

用途：错误码/报文匹配

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 仅 vip | packages/skill-calorie/src/xunji/retry.ts:62 | 不译 |
| 仅vip | packages/skill-calorie/src/xunji/retry.ts:62 | 不译 |

### XUNJI_SUBCOMMANDS 的 does/value/note 是声明面文档字段；run.ts 只读 name/usage/state/ownerTicket，cli 只打印 JSON 与 stderr，无渲染路径（35 对）

用途：XUNJI_SUBCOMMANDS 的 does/value/note 是声明面文档字段；run.ts 只读 name/usage/state/ownerTicket，cli 只打印 JSON 与 stderr，无渲染路径

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| ${CLI} verify 哑铃弯举 | packages/skill-calorie/src/xunji/subcommands.ts:68 | 不译 |
| KEY 值 | packages/skill-calorie/src/xunji/subcommands.ts:149 | 不译 |
| KEY 管理（看状态／写入／清除）——KEY 存在配置文件里（#676） | packages/skill-calorie/src/xunji/subcommands.ts:145 | 不译 |
| res[] JSON 串 | packages/skill-calorie/src/xunji/subcommands.ts:92 | 不译 |
| 「卡路里有、训记没」的 title 怎么办（默认 fail） | packages/skill-calorie/src/xunji/subcommands.ts:123 | 不译 |
| 一条链跑完：补计划→记心愿→推送→回写（串行 N 天，写状态文件） | packages/skill-calorie/src/xunji/subcommands.ts:158 | 不译 |
| 与 --json 二选一 | packages/skill-calorie/src/xunji/subcommands.ts:93 | 不译 |
| 与 --json-file 二选一 | packages/skill-calorie/src/xunji/subcommands.ts:92 | 不译 |
| 动作名 | packages/skill-calorie/src/xunji/subcommands.ts:64 | 不译 |
| 只建状态文件，不实际跑 | packages/skill-calorie/src/xunji/subcommands.ts:163 | 不译 |
| 只构造请求，不调接口 | packages/skill-calorie/src/xunji/subcommands.ts:96,122 | 不译 |
| 只转换不调接口 | packages/skill-calorie/src/xunji/subcommands.ts:109 | 不译 |
| 同步天数（缺省 3） | packages/skill-calorie/src/xunji/subcommands.ts:161 | 不译 |
| 回写 [结束日−N+1, 结束日] 区间（缺省 1 天） | packages/skill-calorie/src/xunji/subcommands.ts:136 | 不译 |
| 尊重限频：窗口内二次调用先等（跨进程，默认关） | packages/skill-calorie/src/xunji/subcommands.ts:80 | 不译 |
| 幂等键 | packages/skill-calorie/src/xunji/subcommands.ts:94 | 不译 |
| 库文件路径 | packages/skill-calorie/src/xunji/subcommands.ts:65 | 不译 |
| 拉取某天的训记训练数据（只读，不改本仓） | packages/skill-calorie/src/xunji/subcommands.ts:74 | 不译 |
| 拉训记实绩并回写本仓运动记录（幂等） | packages/skill-calorie/src/xunji/subcommands.ts:132 | 不译 |
| 推送某天的训练计划到训记（新建，localid＝0；45 秒限频） | packages/skill-calorie/src/xunji/subcommands.ts:105 | 不译 |
| 改 RPE／难度／备注时建议带上 | packages/skill-calorie/src/xunji/subcommands.ts:95 | 不译 |
| 本仓新增的显式覆盖（老机器路径可作覆盖）；缺省读包内预置快照 | packages/skill-calorie/src/xunji/subcommands.ts:65 | 不译 |
| 校验动作名在不在训记官方库 | packages/skill-calorie/src/xunji/subcommands.ts:61 | 不译 |
| 用 include_full_data（30 秒限频） | packages/skill-calorie/src/xunji/subcommands.ts:78 | 不译 |
| 用本仓计划覆盖训记某天的训练（localid 已有，start／end＝0） | packages/skill-calorie/src/xunji/subcommands.ts:118 | 不译 |
| 结束日（缺省＝今天） | packages/skill-calorie/src/xunji/subcommands.ts:135 | 不译 |
| 缺则自动生成 | packages/skill-calorie/src/xunji/subcommands.ts:94 | 不译 |
| 至少一个；空格分隔多个 | packages/skill-calorie/src/xunji/subcommands.ts:64 | 不译 |
| 要做的那一步 | packages/skill-calorie/src/xunji/subcommands.ts:148 | 不译 |
| 要拉的那天 | packages/skill-calorie/src/xunji/subcommands.ts:77 | 不译 |
| 要推的那天 | packages/skill-calorie/src/xunji/subcommands.ts:108 | 不译 |
| 要覆盖的那天 | packages/skill-calorie/src/xunji/subcommands.ts:121 | 不译 |
| 起始日偏移（0＝今天） | packages/skill-calorie/src/xunji/subcommands.ts:162 | 不译 |
| 路径 | packages/skill-calorie/src/xunji/subcommands.ts:93 | 不译 |
| 输出原始 JSON，不整理 | packages/skill-calorie/src/xunji/subcommands.ts:79 | 不译 |

### 数据位（2 对）

用途：数据位：文件头声明「契约」（数据不译）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 只有 `key set` 要给（不回显、不进仓） | packages/skill-calorie/src/xunji/subcommands.ts:149 | 不译 |
| 训记 upsert 接口的原子调用（增／改，res[] 透传；`push-plan` 的底层） | packages/skill-calorie/src/xunji/subcommands.ts:89 | 不译 |

## skill-chef（59 对）

### 缺省写库值（String(p.status ?? '未做')）（1 对）

用途：缺省写库值（String(p.status ?? '未做')）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未做 | packages/skill-chef/src/add/run-write.ts:139 | 不译 |

### 配置项查找键 entry.id === 'db.dir' 与 envelope 键 { 'db.dir': … }（1 对）

用途：配置项查找键 entry.id === 'db.dir' 与 envelope 键 { 'db.dir': … }

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-chef/src/cli/config.ts:91,94 | 不译 |

### 备份导出 SQL（全量菜谱）（1 对）

用途：备份导出 SQL（全量菜谱）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| SELECT * FROM recipes WHERE status != '已废弃' ORDER BY name ASC | packages/skill-chef/src/data/run-query.ts:109 | 不译 |

### 体检 SQL（缺步骤的菜）（1 对）

用途：体检 SQL（缺步骤的菜）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| SELECT r.name AS name FROM recipes r LEFT JOIN cooking_steps s ON s.recipe_id = r.id WHERE s.id IS NULL AND r.status != '已废弃' | packages/skill-chef/src/data/run-query.ts:24 | 不译 |

### 体检 SQL（缺食材的菜）（1 对）

用途：体检 SQL（缺食材的菜）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| SELECT r.name AS name FROM recipes r LEFT JOIN ingredients i ON i.recipe_id = r.id WHERE i.id IS NULL AND r.status != '已废弃' | packages/skill-chef/src/data/run-query.ts:22 | 不译 |

### 体检 SQL（缺历史记录的菜）（1 对）

用途：体检 SQL（缺历史记录的菜）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| SELECT r.name AS name FROM recipes r LEFT JOIN recipe_history hh ON hh.recipe_id = r.id WHERE hh.id IS NULL AND r.status != '已废弃' | packages/skill-chef/src/data/run-query.ts:28 | 不译 |

### 体检 SQL（缺火候的步骤）（1 对）

用途：体检 SQL（缺火候的步骤）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| SELECT r.name AS name, s.sequence AS seq FROM cooking_steps s JOIN recipes r ON r.id = s.recipe_id WHERE (s.heat_level IS NULL OR s.heat_level = '') AND r.status != '已废弃' | packages/skill-chef/src/data/run-query.ts:26 | 不译 |

### 备份文件名前缀（1 对）

用途：备份文件名前缀：join(dirname(handle.path), '私家大厨备份_' + stamp() + '.json')

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 私家大厨备份_ | packages/skill-chef/src/data/run-query.ts:125 | 不译 |

### 体检项 id（机器键），同处可见文案走 m('skill-chef.health.*')（1 对）

用途：体检项 id（机器键），同处可见文案走 m('skill-chef.health.*')

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| config.file | packages/skill-chef/src/health.ts:365,372,379 | 不译 |

### sourceOf(present, 'db.dir') 与体检项 id＝配置文件 key（1 对）

用途：sourceOf(present, 'db.dir') 与体检项 id＝配置文件 key

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-chef/src/health.ts:389,392 | 不译 |

### 体检项 id（机器键）（3 对）

用途：体检项 id（机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.file | packages/skill-chef/src/health.ts:414,423,430,441 | 不译 |
| templates.dir | packages/skill-chef/src/health.ts:479 | 不译 |
| value.source | packages/skill-chef/src/health.ts:469 | 不译 |

### sourceOf(present, 'db.name')＝配置文件 key（1 对）

用途：sourceOf(present, 'db.name')＝配置文件 key

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.name | packages/skill-chef/src/health.ts:411 | 不译 |

### sourceOf(present, 'html.dir') 与体检项 id＝配置文件 key（1 对）

用途：sourceOf(present, 'html.dir') 与体检项 id＝配置文件 key

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| html.dir | packages/skill-chef/src/health.ts:453,455 | 不译 |

### 命令 key 子串（3 对）

用途：命令 key 子串

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| cooking.run | packages/skill-chef/src/help/lookup.ts:67 | 不译 |
| recipe.search | packages/skill-chef/src/help/lookup.ts:64 | 不译 |
| shopping.query | packages/skill-chef/src/help/lookup.ts:68 | 不译 |

### 同上（6 对）

用途：同上

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 下厨 | packages/skill-chef/src/help/lookup.ts:67 | 不译 |
| 买菜 | packages/skill-chef/src/help/lookup.ts:68 | 不译 |
| 做饭 | packages/skill-chef/src/help/lookup.ts:67 | 不译 |
| 寻 | packages/skill-chef/src/help/lookup.ts:63 | 不译 |
| 找 | packages/skill-chef/src/help/lookup.ts:63 | 不译 |
| 查 | packages/skill-chef/src/help/lookup.ts:63 | 不译 |

### lookupWake 关键词（2 对）

用途：lookupWake 关键词

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 做菜 | packages/skill-chef/src/help/lookup.ts:67 | 不译 |
| 清单 | packages/skill-chef/src/help/lookup.ts:68 | 不译 |

### 示例值（单位）（1 对）

用途：示例值（单位）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 克 | packages/skill-chef/src/help/lookup.ts:15 | 不译 |

### 示例值（步骤）（1 对）

用途：示例值（步骤）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 大火翻炒 | packages/skill-chef/src/help/lookup.ts:14 | 不译 |

### 示例值（描述）（1 对）

用途：示例值（描述）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 好吃 | packages/skill-chef/src/help/lookup.ts:14 | 不译 |

### 示例值（派生出的新菜名）（1 对）

用途：示例值（派生出的新菜名）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 小炒肉 | packages/skill-chef/src/help/lookup.ts:18,19 | 不译 |

### 示例值（菜系）（1 对）

用途：示例值（菜系）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 川菜 | packages/skill-chef/src/help/lookup.ts:14 | 不译 |

### 示例值（关系/状态）（1 对）

用途：示例值（关系/状态）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已做 | packages/skill-chef/src/help/lookup.ts:16 | 不译 |

### 示例值（分类/标签）（1 对）

用途：示例值（分类/标签）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 快手菜 | packages/skill-chef/src/help/lookup.ts:16 | 不译 |

### 示例值（关系说明）（1 对）

用途：示例值（关系说明）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 换个辣椒 | packages/skill-chef/src/help/lookup.ts:18,19 | 不译 |

### lookupWake 关键词（['搜','找','查','寻'].some((c) => q.includes(c))）（1 对）

用途：lookupWake 关键词（['搜','找','查','寻'].some((c) => q.includes(c))）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 搜 | packages/skill-chef/src/help/lookup.ts:63 | 不译 |

### 示例值（关系类型）（1 对）

用途：示例值（关系类型）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 派生 | packages/skill-chef/src/help/lookup.ts:18 | 不译 |

### 示例值（炊具）（1 对）

用途：示例值（炊具）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 炒锅 | packages/skill-chef/src/help/lookup.ts:16 | 不译 |

### 示例值（导入文件名）（1 对）

用途：示例值（导入文件名）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 菜谱.json | packages/skill-chef/src/help/lookup.ts:17 | 不译 |

### 示例值（食材）（2 对）

用途：示例值（食材）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 螺丝椒 | packages/skill-chef/src/help/lookup.ts:17 | 不译 |
| 辣椒 | packages/skill-chef/src/help/lookup.ts:14 | 不译 |

### EXAMPLE_VALUES 槽位示例值（菜名／新菜名），进 HELP 的 --params 示例串（1 对）

用途：EXAMPLE_VALUES 槽位示例值（菜名／新菜名），进 HELP 的 --params 示例串

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 辣椒炒肉 | packages/skill-chef/src/help/lookup.ts:13,18,19 | 不译 |

### 写库值（['已做', now(), id]）（1 对）

用途：写库值（['已做', now(), id]）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已做 | packages/skill-chef/src/history/run-record.ts:43 | 不译 |

### status 比较值（recipe.status === '未做'）（1 对）

用途：status 比较值（recipe.status === '未做'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未做 | packages/skill-chef/src/history/run-record.ts:43 | 不译 |

### status 比较值与 SQL 参数（['已废弃','已废弃']）（1 对）

用途：status 比较值与 SQL 参数（['已废弃','已废弃']）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已废弃 | packages/skill-chef/src/relation/run-query.ts:64,67 | 不译 |

### RELATION_TYPES 枚举值（2 对）

用途：RELATION_TYPES 枚举值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 变体 | packages/skill-chef/src/relation/run-write.ts:18 | 不译 |
| 改良 | packages/skill-chef/src/relation/run-write.ts:18 | 不译 |

### status 比较值（1 对）

用途：status 比较值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已废弃 | packages/skill-chef/src/relation/run-write.ts:72 | 不译 |

### 写库值（status: '未做'）（1 对）

用途：写库值（status: '未做'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未做 | packages/skill-chef/src/relation/run-write.ts:88 | 不译 |

### L18 RELATION_TYPES = ['派生','变体','改良'] 枚举值（L42 includes 校验）；L67 缺省关系类型（写库值）（1 对）

用途：L18 RELATION_TYPES = ['派生','变体','改良'] 枚举值（L42 includes 校验）；L67 缺省关系类型（写库值）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 派生 | packages/skill-chef/src/relation/run-write.ts:18,67 | 不译 |

### SQL 片段（EXISTS 子查询拼关联表名与列名）（1 对）

用途：SQL 片段（EXISTS 子查询拼关联表名与列名）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  t WHERE t.recipe_id = r.id AND t. | packages/skill-chef/src/search/run.ts:51 | 不译 |

### 搜索主查询 SQL（db.prepare 的语句文本，参数走 ?）（1 对）

用途：搜索主查询 SQL（db.prepare 的语句文本，参数走 ?）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| SELECT DISTINCT r.* FROM recipes r LEFT JOIN ingredients i ON i.recipe_id = r.id WHERE (r.name LIKE ? OR r.description LIKE ? OR i.name LIKE ?) AND r.status != '已废弃' ORDER BY r.name ASC | packages/skill-chef/src/search/run.ts:38 | 不译 |

### SQL 片段（拼在 WHERE 条件后）（1 对）

用途：SQL 片段（拼在 WHERE 条件后）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| r.status != '已废弃' | packages/skill-chef/src/search/run.ts:47 | 不译 |

### 入参比较值（1 对）

用途：入参比较值：stockRaw === '不核对'（表示跳过库存核对）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 不核对 | packages/skill-chef/src/shopping/run.ts:99 | 不译 |

### 写库值（['已废弃', now(), r.id]）（1 对）

用途：写库值（['已废弃', now(), r.id]）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已废弃 | packages/skill-chef/src/update/run-write.ts:238 | 不译 |

### 同上；标题 c088（1 对）

用途：同上；标题 c088

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 查看步骤 | packages/skill-chef/src/view/page.ts:47 | 不译 |

### 同上；标题 c090（1 对）

用途：同上；标题 c090

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 查看背景 | packages/skill-chef/src/view/page.ts:49 | 不译 |

### 同上；标题 c089（1 对）

用途：同上；标题 c089

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 查看营养 | packages/skill-chef/src/view/page.ts:48 | 不译 |

### 同上（两张卡共用）；标题 c086/c087（1 对）

用途：同上（两张卡共用）；标题 c086/c087

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 查看食材 | packages/skill-chef/src/view/page.ts:45,46 | 不译 |

### VIEW_CARDS 的 wake 字段（三张卡共用的唤醒词）；标题已走 m('skill-chef.view-page.c083…c085')（1 对）

用途：VIEW_CARDS 的 wake 字段（三张卡共用的唤醒词）；标题已走 m('skill-chef.view-page.c083…c085')

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 查看食谱 | packages/skill-chef/src/view/page.ts:42,43,44 | 不译 |

## skill-home（854 对）

### 数据位（748 对）

用途：数据位：文件头声明「事实源」（数据不译）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 勾选 | packages/skill-home/src/express/pages/express.ts:64 | 不译 |
| 在家 | packages/skill-home/src/express/pages/express.ts:74 | 不译 |
| 备用 | packages/skill-home/src/express/pages/express.ts:75 | 不译 |
| 复制数据 | packages/skill-home/src/express/pages/express.ts:68 | 不译 |
| 复制日志 | packages/skill-home/src/express/pages/express.ts:69 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/express/pages/express.ts:56 | 不译 |
| 快递中 | packages/skill-home/src/express/pages/express.ts:72 | 不译 |
| 快递中物品（名称/已等N天/是否超时） | packages/skill-home/src/express/pages/express.ts:59,88 | 不译 |
| 我收到了 | packages/skill-home/src/express/pages/express.ts:65 | 不译 |
| 拦截态：请先勾选收到的物品 | packages/skill-home/src/express/pages/express.ts:55 | 不译 |
| 摘要 | packages/skill-home/src/express/pages/express.ts:61 | 不译 |
| 收到的放备用 | packages/skill-home/src/express/pages/express.ts:66 | 不译 |
| 新到的物品录入 | packages/skill-home/src/express/pages/express.ts:67 | 不译 |
| 空态：当前没有快递中物品 | packages/skill-home/src/express/pages/express.ts:54 | 不译 |
| 超时 | packages/skill-home/src/express/pages/express.ts:73 | 不译 |
| 超时天数 | packages/skill-home/src/express/pages/express.ts:60 | 不译 |
| 勾选 | packages/skill-home/src/express/pages/list.ts:70 | 不译 |
| 复制数据 | packages/skill-home/src/express/pages/list.ts:71 | 不译 |
| 复制日志 | packages/skill-home/src/express/pages/list.ts:72 | 不译 |
| 已买 | packages/skill-home/src/express/pages/list.ts:76 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/express/pages/list.ts:56 | 不译 |
| 待买 | packages/skill-home/src/express/pages/list.ts:75 | 不译 |
| 待买条目（名称/数量/来源标注） | packages/skill-home/src/express/pages/list.ts:59 | 不译 |
| 我买到了 | packages/skill-home/src/express/pages/list.ts:64 | 不译 |
| 拦截态：请先勾选买到的条目 | packages/skill-home/src/express/pages/list.ts:55 | 不译 |
| 摘要 | packages/skill-home/src/express/pages/list.ts:61 | 不译 |
| 检测家里缺什么 | packages/skill-home/src/express/pages/list.ts:68 | 不译 |
| 清单内查重结果 | packages/skill-home/src/express/pages/list.ts:60 | 不译 |
| 清单外新买的 | packages/skill-home/src/express/pages/list.ts:65 | 不译 |
| 清掉已买记录 | packages/skill-home/src/express/pages/list.ts:69 | 不译 |
| 空态：清单是空的＋试试引导 | packages/skill-home/src/express/pages/list.ts:54 | 不译 |
| 给已有物品补货 | packages/skill-home/src/express/pages/list.ts:66 | 不译 |
| 记一笔要买的 | packages/skill-home/src/express/pages/list.ts:67 | 不译 |
| 加入购物清单 | packages/skill-home/src/express/pages/missing.ts:61 | 不译 |
| 勾选 | packages/skill-home/src/express/pages/missing.ts:60 | 不译 |
| 在家 | packages/skill-home/src/express/pages/missing.ts:68 | 不译 |
| 备用 | packages/skill-home/src/express/pages/missing.ts:69 | 不译 |
| 复制数据 | packages/skill-home/src/express/pages/missing.ts:64 | 不译 |
| 复制日志 | packages/skill-home/src/express/pages/missing.ts:65 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/express/pages/missing.ts:52 | 不译 |
| 拦截态：请先勾选缺货物品 | packages/skill-home/src/express/pages/missing.ts:51 | 不译 |
| 按范围检测 | packages/skill-home/src/express/pages/missing.ts:62 | 不译 |
| 摘要 | packages/skill-home/src/express/pages/missing.ts:57 | 不译 |
| 检测范围 | packages/skill-home/src/express/pages/missing.ts:56 | 不译 |
| 空态：库存充足没有缺货物品 | packages/skill-home/src/express/pages/missing.ts:50 | 不译 |
| 缺货物品（物品/当前数量/阈值/建议量） | packages/skill-home/src/express/pages/missing.ts:55 | 不译 |
| 设置阈值 | packages/skill-home/src/express/pages/missing.ts:63 | 不译 |
| 低 | packages/skill-home/src/express/pages/stock.ts:78,146 | 不译 |
| 修正实际数量 | packages/skill-home/src/express/pages/stock.ts:69 | 不译 |
| 充足 | packages/skill-home/src/express/pages/stock.ts:77 | 不译 |
| 分区空态：常用品还没设阈值 | packages/skill-home/src/express/pages/stock.ts:58 | 不译 |
| 勾选 | packages/skill-home/src/express/pages/stock.ts:68 | 不译 |
| 囤货物品（名称/数量/阈值/库存状态） | packages/skill-home/src/express/pages/stock.ts:63 | 不译 |
| 复制数据 | packages/skill-home/src/express/pages/stock.ts:73 | 不译 |
| 复制日志 | packages/skill-home/src/express/pages/stock.ts:74 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/express/pages/stock.ts:60 | 不译 |
| 拦截态：请先勾选 | packages/skill-home/src/express/pages/stock.ts:59 | 不译 |
| 摘要 | packages/skill-home/src/express/pages/stock.ts:65 | 不译 |
| 未设阈值提示 | packages/skill-home/src/express/pages/stock.ts:64 | 不译 |
| 检测缺货 | packages/skill-home/src/express/pages/stock.ts:72 | 不译 |
| 空 | packages/skill-home/src/express/pages/stock.ts:79,147 | 不译 |
| 空态：还没有设置囤货阈值的物品 | packages/skill-home/src/express/pages/stock.ts:57 | 不译 |
| 设置阈值 | packages/skill-home/src/express/pages/stock.ts:70 | 不译 |
| 设阈值 | packages/skill-home/src/express/pages/stock.ts:71 | 不译 |
| 价格（选填） | packages/skill-home/src/items/pages/add_form.ts:39 | 不译 |
| 位置（选填） | packages/skill-home/src/items/pages/add_form.ts:37 | 不译 |
| 借用中 | packages/skill-home/src/items/pages/add_form.ts:59 | 不译 |
| 全部确认（N条） | packages/skill-home/src/items/pages/add_form.ts:49 | 不译 |
| 分区「分类分布」 | packages/skill-home/src/items/pages/add_form.ts:45 | 不译 |
| 分类* | packages/skill-home/src/items/pages/add_form.ts:35 | 不译 |
| 名称* | packages/skill-home/src/items/pages/add_form.ts:34 | 不译 |
| 在家 | packages/skill-home/src/items/pages/add_form.ts:54 | 不译 |
| 备注 | packages/skill-home/src/items/pages/add_form.ts:44 | 不译 |
| 备用 | packages/skill-home/src/items/pages/add_form.ts:55 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/add_form.ts:50 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/add_form.ts:51 | 不译 |
| 已废弃 | packages/skill-home/src/items/pages/add_form.ts:64 | 不译 |
| 已用完 | packages/skill-home/src/items/pages/add_form.ts:61 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/add_form.ts:30 | 不译 |
| 录入日期（补录） | packages/skill-home/src/items/pages/add_form.ts:42 | 不译 |
| 待处理 | packages/skill-home/src/items/pages/add_form.ts:63 | 不译 |
| 必填项标*做空值拦截 | packages/skill-home/src/items/pages/add_form.ts:31 | 不译 |
| 快递中 | packages/skill-home/src/items/pages/add_form.ts:62 | 不译 |
| 找不到 | packages/skill-home/src/items/pages/add_form.ts:65 | 不译 |
| 数量 | packages/skill-home/src/items/pages/add_form.ts:36 | 不译 |
| 旅游中 | packages/skill-home/src/items/pages/add_form.ts:57 | 不译 |
| 标签（逗号分隔） | packages/skill-home/src/items/pages/add_form.ts:43 | 不译 |
| 洗护中 | packages/skill-home/src/items/pages/add_form.ts:58 | 不译 |
| 状态 | packages/skill-home/src/items/pages/add_form.ts:38 | 不译 |
| 确认写入／确认变更（按mode） | packages/skill-home/src/items/pages/add_form.ts:48 | 不译 |
| 空态：无（表单页） | packages/skill-home/src/items/pages/add_form.ts:29 | 不译 |
| 穿着中 | packages/skill-home/src/items/pages/add_form.ts:56 | 不译 |
| 维修中 | packages/skill-home/src/items/pages/add_form.ts:60 | 不译 |
| 购买日期 | packages/skill-home/src/items/pages/add_form.ts:40 | 不译 |
| 过期日期 | packages/skill-home/src/items/pages/add_form.ts:41 | 不译 |
| 全部 | packages/skill-home/src/items/pages/browse.ts:38 | 不译 |
| 分组切换 | packages/skill-home/src/items/pages/browse.ts:40 | 不译 |
| 分组卡片（名称/ID/位置/数量/状态） | packages/skill-home/src/items/pages/browse.ts:34 | 不译 |
| 分组名（N） | packages/skill-home/src/items/pages/browse.ts:39 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/browse.ts:42 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/browse.ts:43 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/browse.ts:30 | 不译 |
| 当前分组名 | packages/skill-home/src/items/pages/browse.ts:35 | 不译 |
| 排序：相关 | packages/skill-home/src/items/pages/browse.ts:41 | 不译 |
| 物品状态 | packages/skill-home/src/items/pages/browse.ts:46 | 不译 |
| 空态：无匹配物品 | packages/skill-home/src/items/pages/browse.ts:29 | 不译 |
| 计数 | packages/skill-home/src/items/pages/browse.ts:33 | 不译 |
| 价格 | packages/skill-home/src/items/pages/detail.ts:39 | 不译 |
| 位置 | packages/skill-home/src/items/pages/detail.ts:37 | 不译 |
| 关联物品 | packages/skill-home/src/items/pages/detail.ts:43 | 不译 |
| 关联空态 | packages/skill-home/src/items/pages/detail.ts:30 | 不译 |
| 减 | packages/skill-home/src/items/pages/detail.ts:53 | 不译 |
| 分类 | packages/skill-home/src/items/pages/detail.ts:36 | 不译 |
| 同位置邻居 | packages/skill-home/src/items/pages/detail.ts:44 | 不译 |
| 备注 | packages/skill-home/src/items/pages/detail.ts:40 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/detail.ts:59 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/detail.ts:60 | 不译 |
| 废 | packages/skill-home/src/items/pages/detail.ts:55 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/detail.ts:32 | 不译 |
| 录入时间 | packages/skill-home/src/items/pages/detail.ts:42 | 不译 |
| 快捷操作 | packages/skill-home/src/items/pages/detail.ts:46 | 不译 |
| 操作历史 | packages/skill-home/src/items/pages/detail.ts:47 | 不译 |
| 操作历史空态「暂无记录」 | packages/skill-home/src/items/pages/detail.ts:31 | 不译 |
| 改 | packages/skill-home/src/items/pages/detail.ts:50 | 不译 |
| 最后使用 | packages/skill-home/src/items/pages/detail.ts:41 | 不译 |
| 查看完整历史 | packages/skill-home/src/items/pages/detail.ts:57 | 不译 |
| 查看照片 | packages/skill-home/src/items/pages/detail.ts:58 | 不译 |
| 标 | packages/skill-home/src/items/pages/detail.ts:54 | 不译 |
| 标签 | packages/skill-home/src/items/pages/detail.ts:38 | 不译 |
| 标记使用 | packages/skill-home/src/items/pages/detail.ts:56 | 不译 |
| 物品状态 | packages/skill-home/src/items/pages/detail.ts:63 | 不译 |
| 相似物品 | packages/skill-home/src/items/pages/detail.ts:45 | 不译 |
| 移 | packages/skill-home/src/items/pages/detail.ts:51 | 不译 |
| 空态：未找到该物品 | packages/skill-home/src/items/pages/detail.ts:29 | 不译 |
| 补 | packages/skill-home/src/items/pages/detail.ts:52 | 不译 |
| 价格 | packages/skill-home/src/items/pages/duplicates.ts:35 | 不译 |
| 位置/数量 | packages/skill-home/src/items/pages/duplicates.ts:33 | 不译 |
| 分类 | packages/skill-home/src/items/pages/duplicates.ts:34 | 不译 |
| 复制合并建议 | packages/skill-home/src/items/pages/duplicates.ts:41 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/duplicates.ts:42 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/duplicates.ts:43 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/duplicates.ts:30 | 不译 |
| 物品状态 | packages/skill-home/src/items/pages/duplicates.ts:46 | 不译 |
| 独立录入 | packages/skill-home/src/items/pages/duplicates.ts:40 | 不译 |
| 空态：没有发现重复物品 | packages/skill-home/src/items/pages/duplicates.ts:29 | 不译 |
| 组内件数 | packages/skill-home/src/items/pages/duplicates.ts:36 | 不译 |
| 首件状态 | packages/skill-home/src/items/pages/duplicates.ts:37 | 不译 |
| 分享位置 | packages/skill-home/src/items/pages/locate.ts:38 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/locate.ts:40 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/locate.ts:41 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/locate.ts:30 | 不译 |
| 我找到了 | packages/skill-home/src/items/pages/locate.ts:37 | 不译 |
| 扩大寻找 | packages/skill-home/src/items/pages/locate.ts:39 | 不译 |
| 查询词 | packages/skill-home/src/items/pages/locate.ts:34 | 不译 |
| 物品状态 | packages/skill-home/src/items/pages/locate.ts:44 | 不译 |
| 空态：没找到＋扩大寻找引导 | packages/skill-home/src/items/pages/locate.ts:29 | 不译 |
| 置顶卡片（照片/名称/ID/位置/数量/状态） | packages/skill-home/src/items/pages/locate.ts:33 | 不译 |
| 下载照片 | packages/skill-home/src/items/pages/photos.ts:40 | 不译 |
| 全部 | packages/skill-home/src/items/pages/photos.ts:35 | 不译 |
| 全部\|类型筛选\|确认顺序变更\|加图·补拍\|删除选中\|下载照片\|复制数据\|复制日志 | packages/skill-home/src/items/pages/photos.ts:59 | 不译 |
| 删除选中 | packages/skill-home/src/items/pages/photos.ts:39 | 不译 |
| 加图·补拍 | packages/skill-home/src/items/pages/photos.ts:38 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/photos.ts:41 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/photos.ts:42 | 不译 |
| 当前mode | packages/skill-home/src/items/pages/photos.ts:32 | 不译 |
| 普通 | packages/skill-home/src/items/pages/photos.ts:45 | 不译 |
| 普通\|说明书-使用\|说明书-安装\|说明书-保养 | packages/skill-home/src/items/pages/photos.ts:61 | 不译 |
| 照片列表（顺序/类型/主图标记） | packages/skill-home/src/items/pages/photos.ts:31 | 不译 |
| 物品（名称/ID） | packages/skill-home/src/items/pages/photos.ts:30 | 不译 |
| 物品（名称/ID）\|照片列表（顺序/类型/主图标记）\|当前mode | packages/skill-home/src/items/pages/photos.ts:58 | 不译 |
| 确认顺序变更 | packages/skill-home/src/items/pages/photos.ts:37 | 不译 |
| 空态：暂无照片＋补拍引导\|异常：数据解析失败 | packages/skill-home/src/items/pages/photos.ts:60 | 不译 |
| 类型筛选 | packages/skill-home/src/items/pages/photos.ts:36 | 不译 |
| 说明书-使用 | packages/skill-home/src/items/pages/photos.ts:46 | 不译 |
| 说明书-保养 | packages/skill-home/src/items/pages/photos.ts:48 | 不译 |
| 说明书-安装 | packages/skill-home/src/items/pages/photos.ts:47 | 不译 |
| 匹配度% | packages/skill-home/src/items/pages/search_list.ts:49 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/search_list.ts:44 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/search_list.ts:45 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/search_list.ts:30 | 不译 |
| 录入新物品 | packages/skill-home/src/items/pages/search_list.ts:43 | 不译 |
| 拍照找物品 | packages/skill-home/src/items/pages/search_list.ts:42 | 不译 |
| 搜索 | packages/skill-home/src/items/pages/search_list.ts:39 | 不译 |
| 摘要指标 | packages/skill-home/src/items/pages/search_list.ts:34 | 不译 |
| 本地筛选 | packages/skill-home/src/items/pages/search_list.ts:40 | 不译 |
| 本地筛选框 | packages/skill-home/src/items/pages/search_list.ts:36 | 不译 |
| 查询词 | packages/skill-home/src/items/pages/search_list.ts:35 | 不译 |
| 物品状态 | packages/skill-home/src/items/pages/search_list.ts:48 | 不译 |
| 空态：未命中→录入新物品引导 | packages/skill-home/src/items/pages/search_list.ts:29 | 不译 |
| 细化筛选 | packages/skill-home/src/items/pages/search_list.ts:41 | 不译 |
| 结果卡片（名称/ID/照片/位置/数量/状态/匹配%） | packages/skill-home/src/items/pages/search_list.ts:33 | 不译 |
| 上一套 | packages/skill-home/src/outfit/pages/outfit_picker.ts:76 | 不译 |
| 上班 | packages/skill-home/src/outfit/pages/outfit_picker.ts:83,114 | 不译 |
| 今天穿这套 | packages/skill-home/src/outfit/pages/outfit_picker.ts:78 | 不译 |
| 场合与天气 | packages/skill-home/src/outfit/pages/outfit_picker.ts:72 | 不译 |
| 备选组合 | packages/skill-home/src/outfit/pages/outfit_picker.ts:71 | 不译 |
| 复制数据 | packages/skill-home/src/outfit/pages/outfit_picker.ts:79 | 不译 |
| 复制日志 | packages/skill-home/src/outfit/pages/outfit_picker.ts:80 | 不译 |
| 多部位槽位（外层/内搭） | packages/skill-home/src/outfit/pages/outfit_picker.ts:68,101 | 不译 |
| 家居 | packages/skill-home/src/outfit/pages/outfit_picker.ts:86,114 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/outfit/pages/outfit_picker.ts:65 | 不译 |
| 换一套 | packages/skill-home/src/outfit/pages/outfit_picker.ts:77 | 不译 |
| 推荐理由 | packages/skill-home/src/outfit/pages/outfit_picker.ts:70 | 不译 |
| 槽位切换 | packages/skill-home/src/outfit/pages/outfit_picker.ts:75 | 不译 |
| 正式 | packages/skill-home/src/outfit/pages/outfit_picker.ts:87,114 | 不译 |
| 空态：无空态文案 | packages/skill-home/src/outfit/pages/outfit_picker.ts:64 | 不译 |
| 约会 | packages/skill-home/src/outfit/pages/outfit_picker.ts:84,114 | 不译 |
| 自定义 | packages/skill-home/src/outfit/pages/outfit_picker.ts:88,114 | 不译 |
| 运动 | packages/skill-home/src/outfit/pages/outfit_picker.ts:85,114 | 不译 |
| 风格标签 | packages/skill-home/src/outfit/pages/outfit_picker.ts:69 | 不译 |
| 健身 | packages/skill-home/src/outfit/pages/travel_trip.ts:70 | 不译 |
| 出发前核对 | packages/skill-home/src/outfit/pages/travel_trip.ts:186 | 不译 |
| 出差 | packages/skill-home/src/outfit/pages/travel_trip.ts:71 | 不译 |
| 在家 | packages/skill-home/src/outfit/pages/travel_trip.ts:79 | 不译 |
| 复制数据 | packages/skill-home/src/outfit/pages/travel_trip.ts:66 | 不译 |
| 复制日志 | packages/skill-home/src/outfit/pages/travel_trip.ts:67 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/outfit/pages/travel_trip.ts:56 | 不译 |
| 旅游中 | packages/skill-home/src/outfit/pages/travel_trip.ts:32,78,141,174 | 不译 |
| 旅行 | packages/skill-home/src/outfit/pages/travel_trip.ts:72 | 不译 |
| 汇总 | packages/skill-home/src/outfit/pages/travel_trip.ts:61 | 不译 |
| 清单物品卡片（名称/数量/位置/理由） | packages/skill-home/src/outfit/pages/travel_trip.ts:60,93 | 不译 |
| 游泳 | packages/skill-home/src/outfit/pages/travel_trip.ts:74 | 不译 |
| 滑雪 | packages/skill-home/src/outfit/pages/travel_trip.ts:76 | 不译 |
| 爬山 | packages/skill-home/src/outfit/pages/travel_trip.ts:75 | 不译 |
| 确认带出（标旅游中） | packages/skill-home/src/outfit/pages/travel_trip.ts:64 | 不译 |
| 确认归位 | packages/skill-home/src/outfit/pages/travel_trip.ts:65 | 不译 |
| 空态：没有旅游中的物品／清单为空 | packages/skill-home/src/outfit/pages/travel_trip.ts:55 | 不译 |
| 自定义 | packages/skill-home/src/outfit/pages/travel_trip.ts:77 | 不译 |
| 行程类型/天数/操作mode | packages/skill-home/src/outfit/pages/travel_trip.ts:59,92 | 不译 |
| 超市 | packages/skill-home/src/outfit/pages/travel_trip.ts:73 | 不译 |
| 冲突提示 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:62 | 不译 |
| 复制数据 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:70 | 不译 |
| 复制日志 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:71 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:57 | 不译 |
| 无冲突态：衣物充足无重复冲突 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:56 | 不译 |
| 日期按钮 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:67 | 不译 |
| 每日温度 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:74 | 不译 |
| 每日计划（第N天＋温度＋组合） | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:61,88 | 不译 |
| 汇总 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:64 | 不译 |
| 生成行李清单 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:69 | 不译 |
| 目的地/天数 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:60,87 | 不译 |
| 空态：没有可计划的衣物 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:55 | 不译 |
| 行李汇总 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:63 | 不译 |
| 采纳这天 | packages/skill-home/src/outfit/pages/trip_outfit_plan.ts:68 | 不译 |
| AI建议一句 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:64,90 | 不译 |
| 先不处理 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:70 | 不译 |
| 在家口径 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:77 | 不译 |
| 复制数据 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:72 | 不译 |
| 复制日志 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:73 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:59 | 不译 |
| 无闲置态：衣橱状态良好 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:58 | 不译 |
| 标记废弃 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:68 | 不译 |
| 汇总 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:65 | 不译 |
| 物品状态 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:76 | 不译 |
| 空态：衣橱还没有在家衣物 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:57 | 不译 |
| 缺口加入购物清单 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:71 | 不译 |
| 衣橱构成 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:62 | 不译 |
| 送人 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:69 | 不译 |
| 闲置清单 | packages/skill-home/src/outfit/pages/wardrobe_analyze.ts:63 | 不译 |
| 候选位置 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:56 | 不译 |
| 全选/全不选 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:62 | 不译 |
| 复制数据 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:64 | 不译 |
| 复制日志 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:65 | 不译 |
| 季节 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:52 | 不译 |
| 季节衣物清单 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:54 | 不译 |
| 已收纳 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:69 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:49 | 不译 |
| 拿出 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:161 | 不译 |
| 操作（收纳/拿出） | packages/skill-home/src/outfit/pages/wardrobe_season.ts:53 | 不译 |
| 收纳 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:212,216 | 不译 |
| 收纳位置下拉 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:55,60 | 不译 |
| 汇总 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:57 | 不译 |
| 物品状态 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:68 | 不译 |
| 确认收纳／确认拿出 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:63 | 不译 |
| 空态：没有带季节标签的在家衣物＋打标签引导 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:48 | 不译 |
| 自定义 | packages/skill-home/src/outfit/pages/wardrobe_season.ts:61 | 不译 |
| 其他 | packages/skill-home/src/receipt/pages/accounts.ts:88,133 | 不译 |
| 复制密码 | packages/skill-home/src/receipt/pages/accounts.ts:80 | 不译 |
| 复制密码前二次确认 | packages/skill-home/src/receipt/pages/accounts.ts:70 | 不译 |
| 复制数据 | packages/skill-home/src/receipt/pages/accounts.ts:81 | 不译 |
| 复制日志 | packages/skill-home/src/receipt/pages/accounts.ts:82 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/receipt/pages/accounts.ts:68 | 不译 |
| 总数 | packages/skill-home/src/receipt/pages/accounts.ts:74 | 不译 |
| 敏感横幅：本页不含任何明文密码 | packages/skill-home/src/receipt/pages/accounts.ts:69 | 不译 |
| 新增账号 | packages/skill-home/src/receipt/pages/accounts.ts:78 | 不译 |
| 查看密码 | packages/skill-home/src/receipt/pages/accounts.ts:79 | 不译 |
| 社交 | packages/skill-home/src/receipt/pages/accounts.ts:87,133 | 不译 |
| 空态提示 | packages/skill-home/src/receipt/pages/accounts.ts:75 | 不译 |
| 空态：暂无账号 | packages/skill-home/src/receipt/pages/accounts.ts:67 | 不译 |
| 账号分组（平台/用户名/类型） | packages/skill-home/src/receipt/pages/accounts.ts:73 | 不译 |
| 购物 | packages/skill-home/src/receipt/pages/accounts.ts:85,133 | 不译 |
| 银行 | packages/skill-home/src/receipt/pages/accounts.ts:86,133 | 不译 |
| N天后到期 | packages/skill-home/src/receipt/pages/certificates.ts:93,107 | 不译 |
| 今天到期 | packages/skill-home/src/receipt/pages/certificates.ts:92 | 不译 |
| 到期 | packages/skill-home/src/receipt/pages/certificates.ts:139 | 不译 |
| 即将到期 | packages/skill-home/src/receipt/pages/certificates.ts:89 | 不译 |
| 复制数据 | packages/skill-home/src/receipt/pages/certificates.ts:84 | 不译 |
| 复制日志 | packages/skill-home/src/receipt/pages/certificates.ts:85 | 不译 |
| 已过期 | packages/skill-home/src/receipt/pages/certificates.ts:90 | 不译 |
| 已过期N天 | packages/skill-home/src/receipt/pages/certificates.ts:91,106 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/receipt/pages/certificates.ts:73 | 不译 |
| 敏感口径：号码脱敏·复制数据不含证件号 | packages/skill-home/src/receipt/pages/certificates.ts:74 | 不译 |
| 新增证件 | packages/skill-home/src/receipt/pages/certificates.ts:83 | 不译 |
| 更新 | packages/skill-home/src/receipt/pages/certificates.ts:81 | 不译 |
| 有效 | packages/skill-home/src/receipt/pages/certificates.ts:88 | 不译 |
| 空态提示 | packages/skill-home/src/receipt/pages/certificates.ts:78 | 不译 |
| 空态：暂无登记 | packages/skill-home/src/receipt/pages/certificates.ts:72 | 不译 |
| 补照片 | packages/skill-home/src/receipt/pages/certificates.ts:82 | 不译 |
| 证件清单（类型/持有人/ID/到期日/剩余天数/证件状态/脱敏号码/备注） | packages/skill-home/src/receipt/pages/certificates.ts:77,105 | 不译 |
| 今天最后可退 | packages/skill-home/src/receipt/pages/purchase_records.ts:79 | 不译 |
| 分类卡片筛选 | packages/skill-home/src/receipt/pages/purchase_records.ts:72 | 不译 |
| 分类统计（分类/笔数/金额） | packages/skill-home/src/receipt/pages/purchase_records.ts:67,94 | 不译 |
| 可退·剩N天 | packages/skill-home/src/receipt/pages/purchase_records.ts:80,96 | 不译 |
| 复制数据 | packages/skill-home/src/receipt/pages/purchase_records.ts:74 | 不译 |
| 复制日志 | packages/skill-home/src/receipt/pages/purchase_records.ts:75 | 不译 |
| 已过退货期N天 | packages/skill-home/src/receipt/pages/purchase_records.ts:78,95 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/receipt/pages/purchase_records.ts:63 | 不译 |
| 新增购买记录 | packages/skill-home/src/receipt/pages/purchase_records.ts:73 | 不译 |
| 未设退货 | packages/skill-home/src/receipt/pages/purchase_records.ts:81 | 不译 |
| 空态提示 | packages/skill-home/src/receipt/pages/purchase_records.ts:69 | 不译 |
| 空态：暂无分类统计／暂无记录 | packages/skill-home/src/receipt/pages/purchase_records.ts:62 | 不译 |
| 购买记录（物品名/ID/购买日/价格/渠道/商家客服/退货窗口/退货截止） | packages/skill-home/src/receipt/pages/purchase_records.ts:66,93 | 不译 |
| 顺路提醒 | packages/skill-home/src/receipt/pages/purchase_records.ts:68 | 不译 |
| 保修/保养清单（物品名/ID/类型/状态/到期日/剩余天数/维修次数/服务事件） | packages/skill-home/src/receipt/pages/warranty.ts:48,78 | 不译 |
| 全部 | packages/skill-home/src/receipt/pages/warranty.ts:65 | 不译 |
| 到期未做 | packages/skill-home/src/receipt/pages/warranty.ts:64 | 不译 |
| 即将到期 | packages/skill-home/src/receipt/pages/warranty.ts:62 | 不译 |
| 在保 | packages/skill-home/src/receipt/pages/warranty.ts:61 | 不译 |
| 复制数据 | packages/skill-home/src/receipt/pages/warranty.ts:57 | 不译 |
| 复制日志 | packages/skill-home/src/receipt/pages/warranty.ts:58 | 不译 |
| 已做 | packages/skill-home/src/receipt/pages/warranty.ts:66 | 不译 |
| 已过 | packages/skill-home/src/receipt/pages/warranty.ts:63 | 不译 |
| 执行保养 | packages/skill-home/src/receipt/pages/warranty.ts:55 | 不译 |
| 新增保修/保养 | packages/skill-home/src/receipt/pages/warranty.ts:56,79 | 不译 |
| 状态筛选 | packages/skill-home/src/receipt/pages/warranty.ts:49,53 | 不译 |
| 空态提示 | packages/skill-home/src/receipt/pages/warranty.ts:50 | 不译 |
| 记录维修 | packages/skill-home/src/receipt/pages/warranty.ts:54 | 不译 |
| 保留份数下拉 | packages/skill-home/src/setup/pages/backup_receipt.ts:72 | 不译 |
| 保留份数输入 | packages/skill-home/src/setup/pages/backup_receipt.ts:69 | 不译 |
| 保留份数默认值 | packages/skill-home/src/setup/pages/backup_receipt.ts:82 | 不译 |
| 删除最旧备份 | packages/skill-home/src/setup/pages/backup_receipt.ts:76 | 不译 |
| 备份历史（保留N份） | packages/skill-home/src/setup/pages/backup_receipt.ts:67 | 不译 |
| 复制数据 | packages/skill-home/src/setup/pages/backup_receipt.ts:78 | 不译 |
| 复制日志 | packages/skill-home/src/setup/pages/backup_receipt.ts:79 | 不译 |
| 导出CSV | packages/skill-home/src/setup/pages/backup_receipt.ts:75 | 不译 |
| 导出JSON | packages/skill-home/src/setup/pages/backup_receipt.ts:74 | 不译 |
| 已导出 | packages/skill-home/src/setup/pages/backup_receipt.ts:149 | 不译 |
| 本次备份（路径/大小/时间） | packages/skill-home/src/setup/pages/backup_receipt.ts:66 | 不译 |
| 知道了 | packages/skill-home/src/setup/pages/backup_receipt.ts:77 | 不译 |
| 确认备份 | packages/skill-home/src/setup/pages/backup_receipt.ts:73 | 不译 |
| 距上次备份天数 | packages/skill-home/src/setup/pages/backup_receipt.ts:68 | 不译 |
| 6步步骤条 | packages/skill-home/src/setup/pages/first_use_wizard.ts:30 | 不译 |
| 一键重试 | packages/skill-home/src/setup/pages/first_use_wizard.ts:37 | 不译 |
| 下一步 | packages/skill-home/src/setup/pages/first_use_wizard.ts:33 | 不译 |
| 先配置环境变量 | packages/skill-home/src/setup/pages/first_use_wizard.ts:38 | 不译 |
| 复制数据 | packages/skill-home/src/setup/pages/first_use_wizard.ts:41 | 不译 |
| 复制日志 | packages/skill-home/src/setup/pages/first_use_wizard.ts:42 | 不译 |
| 建库结果 | packages/skill-home/src/setup/pages/first_use_wizard.ts:32 | 不译 |
| 开始初始化 | packages/skill-home/src/setup/pages/first_use_wizard.ts:36 | 不译 |
| 开始录入第一批 | packages/skill-home/src/setup/pages/first_use_wizard.ts:39,70 | 不译 |
| 环境信息 | packages/skill-home/src/setup/pages/first_use_wizard.ts:31 | 不译 |
| 知道了 | packages/skill-home/src/setup/pages/first_use_wizard.ts:40 | 不译 |
| 健康 | packages/skill-home/src/setup/pages/health_report.ts:118 | 不译 |
| 健康标记 | packages/skill-home/src/setup/pages/health_report.ts:65 | 不译 |
| 动作列 | packages/skill-home/src/setup/pages/health_report.ts:66 | 不译 |
| 勾选 | packages/skill-home/src/setup/pages/health_report.ts:69 | 不译 |
| 单级位置 | packages/skill-home/src/setup/pages/health_report.ts:91 | 不译 |
| 复制数据 | packages/skill-home/src/setup/pages/health_report.ts:72 | 不译 |
| 复制日志 | packages/skill-home/src/setup/pages/health_report.ts:73 | 不译 |
| 复制选中修复引导 | packages/skill-home/src/setup/pages/health_report.ts:70 | 不译 |
| 待处理 | packages/skill-home/src/setup/pages/health_report.ts:77 | 不译 |
| 无标签物品 | packages/skill-home/src/setup/pages/health_report.ts:91 | 不译 |
| 无照片物品 | packages/skill-home/src/setup/pages/health_report.ts:91 | 不译 |
| 检查项列表 | packages/skill-home/src/setup/pages/health_report.ts:63 | 不译 |
| 环境信息 | packages/skill-home/src/setup/pages/health_report.ts:62 | 不译 |
| 知道了 | packages/skill-home/src/setup/pages/health_report.ts:71 | 不译 |
| 良好 | packages/skill-home/src/setup/pages/health_report.ts:76 | 不译 |
| 问题总数 | packages/skill-home/src/setup/pages/health_report.ts:64 | 不译 |
| 冲突名单 | packages/skill-home/src/setup/pages/import_restore.ts:68 | 不译 |
| 冲突处理下拉 | packages/skill-home/src/setup/pages/import_restore.ts:73 | 不译 |
| 四步（选择文件/校验结果/冲突预览/确认导入） | packages/skill-home/src/setup/pages/import_restore.ts:66 | 不译 |
| 复制数据 | packages/skill-home/src/setup/pages/import_restore.ts:77 | 不译 |
| 复制日志 | packages/skill-home/src/setup/pages/import_restore.ts:78 | 不译 |
| 导入结果 | packages/skill-home/src/setup/pages/import_restore.ts:69 | 不译 |
| 已从备份恢复 | packages/skill-home/src/setup/pages/import_restore.ts:127 | 不译 |
| 撤销导入 | packages/skill-home/src/setup/pages/import_restore.ts:75 | 不译 |
| 校验项 | packages/skill-home/src/setup/pages/import_restore.ts:67 | 不译 |
| 知道了 | packages/skill-home/src/setup/pages/import_restore.ts:76 | 不译 |
| 确认导入 | packages/skill-home/src/setup/pages/import_restore.ts:74 | 不译 |
| 覆盖同名 | packages/skill-home/src/setup/pages/import_restore.ts:82 | 不译 |
| 跳过同名 | packages/skill-home/src/setup/pages/import_restore.ts:81 | 不译 |
| 选择文件 | packages/skill-home/src/setup/pages/import_restore.ts:72 | 不译 |
| 预告通过 | packages/skill-home/src/setup/pages/import_restore.ts:126 | 不译 |
| 位置状态（非「在家」括号标出） | packages/skill-home/src/space/pages/fixed_spot.ts:72 | 不译 |
| 关闭 | packages/skill-home/src/space/pages/fixed_spot.ts:67 | 不译 |
| 固定位表单 | packages/skill-home/src/space/pages/fixed_spot.ts:61 | 不译 |
| 在家 | packages/skill-home/src/space/pages/fixed_spot.ts:26 | 不译 |
| 复制prompt | packages/skill-home/src/space/pages/fixed_spot.ts:66 | 不译 |
| 复制数据 | packages/skill-home/src/space/pages/fixed_spot.ts:68 | 不译 |
| 复制日志 | packages/skill-home/src/space/pages/fixed_spot.ts:69 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/space/pages/fixed_spot.ts:55 | 不译 |
| 物品表单 | packages/skill-home/src/space/pages/fixed_spot.ts:60 | 不译 |
| 现有固定位清单（名称/ID/当前活跃位置/固定位） | packages/skill-home/src/space/pages/fixed_spot.ts:59 | 不译 |
| 空态：还没有固定位＋常用件引导 | packages/skill-home/src/space/pages/fixed_spot.ts:54 | 不译 |
| 表单空值拦截 | packages/skill-home/src/space/pages/fixed_spot.ts:56 | 不译 |
| 解除 | packages/skill-home/src/space/pages/fixed_spot.ts:65 | 不译 |
| 设置固定位 | packages/skill-home/src/space/pages/fixed_spot.ts:64 | 不译 |
| 位置树 | packages/skill-home/src/space/pages/location_manage.ts:60 | 不译 |
| 位置路径多级 | packages/skill-home/src/space/pages/location_manage.ts:79 | 不译 |
| 关闭 | packages/skill-home/src/space/pages/location_manage.ts:74 | 不译 |
| 删除 | packages/skill-home/src/space/pages/location_manage.ts:71 | 不译 |
| 受影响物品 | packages/skill-home/src/space/pages/location_manage.ts:63 | 不译 |
| 复制prompt | packages/skill-home/src/space/pages/location_manage.ts:73 | 不译 |
| 复制数据 | packages/skill-home/src/space/pages/location_manage.ts:75 | 不译 |
| 复制日志 | packages/skill-home/src/space/pages/location_manage.ts:76 | 不译 |
| 已有路径 | packages/skill-home/src/space/pages/location_manage.ts:61 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/space/pages/location_manage.ts:57 | 不译 |
| 改名 | packages/skill-home/src/space/pages/location_manage.ts:70 | 不译 |
| 新位置路径表单 | packages/skill-home/src/space/pages/location_manage.ts:66 | 不译 |
| 新建位置 | packages/skill-home/src/space/pages/location_manage.ts:69 | 不译 |
| 源位置表单 | packages/skill-home/src/space/pages/location_manage.ts:65 | 不译 |
| 目标 | packages/skill-home/src/space/pages/location_manage.ts:62 | 不译 |
| 相似位置组 | packages/skill-home/src/space/pages/location_manage.ts:64 | 不译 |
| 确认合并 | packages/skill-home/src/space/pages/location_manage.ts:72 | 不译 |
| 空态：还没有位置＋建第一个位置引导 | packages/skill-home/src/space/pages/location_manage.ts:56 | 不译 |
| 下钻 | packages/skill-home/src/space/pages/space_view.ts:59 | 不译 |
| 位置状态（缺省在家） | packages/skill-home/src/space/pages/space_view.ts:69 | 不译 |
| 减 | packages/skill-home/src/space/pages/space_view.ts:62 | 不译 |
| 分层空态提示 | packages/skill-home/src/space/pages/space_view.ts:56 | 不译 |
| 复制建位置 | packages/skill-home/src/space/pages/space_view.ts:63 | 不译 |
| 复制收纳建议 | packages/skill-home/src/space/pages/space_view.ts:64 | 不译 |
| 复制数据 | packages/skill-home/src/space/pages/space_view.ts:65 | 不译 |
| 复制日志 | packages/skill-home/src/space/pages/space_view.ts:66 | 不译 |
| 子层 | packages/skill-home/src/space/pages/space_view.ts:52 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/space/pages/space_view.ts:48 | 不译 |
| 当前层名/路径 | packages/skill-home/src/space/pages/space_view.ts:54 | 不译 |
| 当前层物品（名称/数量/状态） | packages/skill-home/src/space/pages/space_view.ts:53 | 不译 |
| 移 | packages/skill-home/src/space/pages/space_view.ts:60 | 不译 |
| 空态：这里还没有东西（全屋与单层两套文案） | packages/skill-home/src/space/pages/space_view.ts:47 | 不译 |
| 补 | packages/skill-home/src/space/pages/space_view.ts:61 | 不译 |
| 路径总数 | packages/skill-home/src/space/pages/space_view.ts:55 | 不译 |
| 面包屑 | packages/skill-home/src/space/pages/space_view.ts:51 | 不译 |
| 备选空态：暂无其他备选 | packages/skill-home/src/space/pages/suggest_storage.ts:61 | 不译 |
| 复制收纳建议 | packages/skill-home/src/space/pages/suggest_storage.ts:76 | 不译 |
| 复制数据 | packages/skill-home/src/space/pages/suggest_storage.ts:77 | 不译 |
| 复制日志 | packages/skill-home/src/space/pages/suggest_storage.ts:78 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/space/pages/suggest_storage.ts:62 | 不译 |
| 当前mode | packages/skill-home/src/space/pages/suggest_storage.ts:68 | 不译 |
| 总量 | packages/skill-home/src/space/pages/suggest_storage.ts:67 | 不译 |
| 批量标记 | packages/skill-home/src/space/pages/suggest_storage.ts:66 | 不译 |
| 找没固定位的常用件 | packages/skill-home/src/space/pages/suggest_storage.ts:75 | 不译 |
| 换一个建议 | packages/skill-home/src/space/pages/suggest_storage.ts:74 | 不译 |
| 推荐列表（推荐位置/理由/备选位置） | packages/skill-home/src/space/pages/suggest_storage.ts:65 | 不译 |
| 无依据态 | packages/skill-home/src/space/pages/suggest_storage.ts:69 | 不译 |
| 无依据态：暂无依据 | packages/skill-home/src/space/pages/suggest_storage.ts:60 | 不译 |
| 空态：都有固定位了／没有可建议的物品 | packages/skill-home/src/space/pages/suggest_storage.ts:59 | 不译 |
| 设为固定位 | packages/skill-home/src/space/pages/suggest_storage.ts:73 | 不译 |
| 采纳（去移物品） | packages/skill-home/src/space/pages/suggest_storage.ts:72 | 不译 |
| N天后到期 | packages/skill-home/src/stats/pages/expiring.ts:92,113 | 不译 |
| 今天到期 | packages/skill-home/src/stats/pages/expiring.ts:91 | 不译 |
| 分类下拉 | packages/skill-home/src/stats/pages/expiring.ts:80 | 不译 |
| 分类筛选 | packages/skill-home/src/stats/pages/expiring.ts:76 | 不译 |
| 勾选 | packages/skill-home/src/stats/pages/expiring.ts:81 | 不译 |
| 可调档位 | packages/skill-home/src/stats/pages/expiring.ts:75 | 不译 |
| 复制数据 | packages/skill-home/src/stats/pages/expiring.ts:86 | 不译 |
| 复制日志 | packages/skill-home/src/stats/pages/expiring.ts:87 | 不译 |
| 已用完 | packages/skill-home/src/stats/pages/expiring.ts:82,93 | 不译 |
| 已过期N天 | packages/skill-home/src/stats/pages/expiring.ts:90,112 | 不译 |
| 已过期与未来N天预告（剩余天数） | packages/skill-home/src/stats/pages/expiring.ts:73,111 | 不译 |
| 废弃 | packages/skill-home/src/stats/pages/expiring.ts:83,94 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/stats/pages/expiring.ts:70,110 | 不译 |
| 忽略 | packages/skill-home/src/stats/pages/expiring.ts:84,95 | 不译 |
| 拦截态：还没有勾选任何处理 | packages/skill-home/src/stats/pages/expiring.ts:69,109 | 不译 |
| 摘要 | packages/skill-home/src/stats/pages/expiring.ts:77 | 不译 |
| 确认处理 | packages/skill-home/src/stats/pages/expiring.ts:85 | 不译 |
| 空态：没有即将过期的物品＋已检查未来N天 | packages/skill-home/src/stats/pages/expiring.ts:68,108 | 不译 |
| 预告天数 | packages/skill-home/src/stats/pages/expiring.ts:74 | 不译 |
| AI建议 | packages/skill-home/src/stats/pages/idle.ts:78,111 | 不译 |
| 先不处理 | packages/skill-home/src/stats/pages/idle.ts:87,95 | 不译 |
| 分类下拉 | packages/skill-home/src/stats/pages/idle.ts:83 | 不译 |
| 分类筛选 | packages/skill-home/src/stats/pages/idle.ts:79 | 不译 |
| 勾选 | packages/skill-home/src/stats/pages/idle.ts:84 | 不译 |
| 复制数据 | packages/skill-home/src/stats/pages/idle.ts:89 | 不译 |
| 复制日志 | packages/skill-home/src/stats/pages/idle.ts:90 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/stats/pages/idle.ts:73,110 | 不译 |
| 拦截态：还没有勾选任何处理 | packages/skill-home/src/stats/pages/idle.ts:72,109 | 不译 |
| 标记废弃 | packages/skill-home/src/stats/pages/idle.ts:85,93 | 不译 |
| 确认处理 | packages/skill-home/src/stats/pages/idle.ts:88 | 不译 |
| 空态标记 | packages/skill-home/src/stats/pages/idle.ts:80 | 不译 |
| 空态：衣橱状态良好＋没有超N天未使用 | packages/skill-home/src/stats/pages/idle.ts:71,108 | 不译 |
| 送人 | packages/skill-home/src/stats/pages/idle.ts:86,94 | 不译 |
| 闲置标准天数 | packages/skill-home/src/stats/pages/idle.ts:77 | 不译 |
| 闲置清单（按闲置时长排序） | packages/skill-home/src/stats/pages/idle.ts:76 | 不译 |
| AI建议 | packages/skill-home/src/stats/pages/inventory_stat.ts:88,117 | 不译 |
| 复制数据 | packages/skill-home/src/stats/pages/inventory_stat.ts:94 | 不译 |
| 复制日志 | packages/skill-home/src/stats/pages/inventory_stat.ts:95 | 不译 |
| 复制首次盘点 | packages/skill-home/src/stats/pages/inventory_stat.ts:93 | 不译 |
| 复查入口 | packages/skill-home/src/stats/pages/inventory_stat.ts:87 | 不译 |
| 复查盘点 | packages/skill-home/src/stats/pages/inventory_stat.ts:92 | 不译 |
| 完成率与趋势 | packages/skill-home/src/stats/pages/inventory_stat.ts:84 | 不译 |
| 已处理 | packages/skill-home/src/stats/pages/inventory_stat.ts:100 | 不译 |
| 已复查 | packages/skill-home/src/stats/pages/inventory_stat.ts:101 | 不译 |
| 已完成 | packages/skill-home/src/stats/pages/inventory_stat.ts:99 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/stats/pages/inventory_stat.ts:81,115 | 不译 |
| 有无数据标记 | packages/skill-home/src/stats/pages/inventory_stat.ts:89 | 不译 |
| 盘点明细（时间/范围/缺/多/异/状态） | packages/skill-home/src/stats/pages/inventory_stat.ts:85,116 | 不译 |
| 空态：还没有盘点记录＋完成首次盘点引导 | packages/skill-home/src/stats/pages/inventory_stat.ts:80,114 | 不译 |
| 进行中 | packages/skill-home/src/stats/pages/inventory_stat.ts:98 | 不译 |
| 遗留差异总数 | packages/skill-home/src/stats/pages/inventory_stat.ts:86 | 不译 |
| 价值TOP | packages/skill-home/src/stats/pages/overview.ts:118,147 | 不译 |
| 位置分布 | packages/skill-home/src/stats/pages/overview.ts:115 | 不译 |
| 全部合法物品状态 | packages/skill-home/src/stats/pages/overview.ts:130 | 不译 |
| 分区空态：暂无分类/位置/状态数据 | packages/skill-home/src/stats/pages/overview.ts:109,144 | 不译 |
| 分类分布 | packages/skill-home/src/stats/pages/overview.ts:114 | 不译 |
| 复制初始化 | packages/skill-home/src/stats/pages/overview.ts:124 | 不译 |
| 复制数据 | packages/skill-home/src/stats/pages/overview.ts:126 | 不译 |
| 复制日志 | packages/skill-home/src/stats/pages/overview.ts:127 | 不译 |
| 复制补价提示 | packages/skill-home/src/stats/pages/overview.ts:125 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/stats/pages/overview.ts:110,145 | 不译 |
| 归属分布 | packages/skill-home/src/stats/pages/overview.ts:117 | 不译 |
| 摘要（件数/总价/价格覆盖率/近30天变动） | packages/skill-home/src/stats/pages/overview.ts:113,146 | 不译 |
| 点柱子复制筛选浏览prompt | packages/skill-home/src/stats/pages/overview.ts:123,149 | 不译 |
| 状态分布 | packages/skill-home/src/stats/pages/overview.ts:116 | 不译 |
| 空态：还没有物品＋录入第一批引导 | packages/skill-home/src/stats/pages/overview.ts:108,143 | 不译 |
| 趋势 | packages/skill-home/src/stats/pages/overview.ts:120 | 不译 |
| 高频TOP | packages/skill-home/src/stats/pages/overview.ts:119,148 | 不译 |

用途：数据位：文件头声明「生成」（数据不译）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 今日到期 | packages/skill-home/src/family/pages/family_borrow.ts:54 | 不译 |
| 借入 | packages/skill-home/src/family/pages/family_borrow.ts:111,116,151 | 不译 |
| 借出 | packages/skill-home/src/family/pages/family_borrow.ts:110,116,151 | 不译 |
| 借出/借入双向分区 | packages/skill-home/src/family/pages/family_borrow.ts:40 | 不译 |
| 借用 | packages/skill-home/src/family/pages/family_borrow.ts:142 | 不译 |
| 借用中 | packages/skill-home/src/family/pages/family_borrow.ts:56 | 不译 |
| 复制催还文案 | packages/skill-home/src/family/pages/family_borrow.ts:47 | 不译 |
| 复制数据 | packages/skill-home/src/family/pages/family_borrow.ts:49 | 不译 |
| 复制日志 | packages/skill-home/src/family/pages/family_borrow.ts:50 | 不译 |
| 已归还 | packages/skill-home/src/family/pages/family_borrow.ts:55 | 不译 |
| 已超期 | packages/skill-home/src/family/pages/family_borrow.ts:53 | 不译 |
| 归还 | packages/skill-home/src/family/pages/family_borrow.ts:149 | 不译 |
| 登记表单 | packages/skill-home/src/family/pages/family_borrow.ts:43 | 不译 |
| 确认归还 | packages/skill-home/src/family/pages/family_borrow.ts:46 | 不译 |
| 确认登记 | packages/skill-home/src/family/pages/family_borrow.ts:48 | 不译 |
| 记录（物品名/对象/借出日/约定归还日/状态/已借天数/备注） | packages/skill-home/src/family/pages/family_borrow.ts:42 | 不译 |
| 超期件数 | packages/skill-home/src/family/pages/family_borrow.ts:41 | 不译 |
| 复制数据 | packages/skill-home/src/family/pages/family_members.ts:46 | 不译 |
| 复制日志 | packages/skill-home/src/family/pages/family_members.ts:47 | 不译 |
| 成员关系自由文本 | packages/skill-home/src/family/pages/family_members.ts:50 | 不译 |
| 成员列表 | packages/skill-home/src/family/pages/family_members.ts:37 | 不译 |
| 添加成员表单 | packages/skill-home/src/family/pages/family_members.ts:40 | 不译 |
| 物品归属勾选清单 | packages/skill-home/src/family/pages/family_members.ts:38 | 不译 |
| 物品总数 | packages/skill-home/src/family/pages/family_members.ts:39 | 不译 |
| 物品默认归属使用者 | packages/skill-home/src/family/pages/family_members.ts:51 | 不译 |
| 确认标记归属 | packages/skill-home/src/family/pages/family_members.ts:44 | 不译 |
| 确认添加 | packages/skill-home/src/family/pages/family_members.ts:45 | 不译 |
| 移除成员 | packages/skill-home/src/family/pages/family_members.ts:43 | 不译 |
| 分类树（层级＋每类计数） | packages/skill-home/src/items/pages/category_manage.ts:29 | 不译 |
| 删除拦截说明 | packages/skill-home/src/items/pages/category_manage.ts:31 | 不译 |
| 合并 | packages/skill-home/src/items/pages/category_manage.ts:35 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/category_manage.ts:37 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/category_manage.ts:38 | 不译 |
| 操作提示 | packages/skill-home/src/items/pages/category_manage.ts:30 | 不译 |
| 改名 | packages/skill-home/src/items/pages/category_manage.ts:34 | 不译 |
| 新建顶级分类 | packages/skill-home/src/items/pages/category_manage.ts:36 | 不译 |
| 种子8类（只可改不可删） | packages/skill-home/src/items/pages/category_manage.ts:41 | 不译 |
| 变更前 | packages/skill-home/src/items/pages/confirm.ts:32 | 不译 |
| 变更后 | packages/skill-home/src/items/pages/confirm.ts:33 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/confirm.ts:39 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/confirm.ts:40 | 不译 |
| 引导语 | packages/skill-home/src/items/pages/confirm.ts:31 | 不译 |
| 影响说明 | packages/skill-home/src/items/pages/confirm.ts:35 | 不译 |
| 标题 | packages/skill-home/src/items/pages/confirm.ts:30 | 不译 |
| 确认 | packages/skill-home/src/items/pages/confirm.ts:38 | 不译 |
| 逐条entries（含子标签） | packages/skill-home/src/items/pages/confirm.ts:34 | 不译 |
| 变更结果（字段级before→after） | packages/skill-home/src/items/pages/receipt.ts:34 | 不译 |
| 处理明细 | packages/skill-home/src/items/pages/receipt.ts:37 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/receipt.ts:43 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/receipt.ts:44 | 不译 |
| 已变更数量： | packages/skill-home/src/items/pages/receipt.ts:108 | 不译 |
| 已变更状态： | packages/skill-home/src/items/pages/receipt.ts:109 | 不译 |
| 已更新标签： | packages/skill-home/src/items/pages/receipt.ts:110 | 不译 |
| 已移动： | packages/skill-home/src/items/pages/receipt.ts:107 | 不译 |
| 当前状态（名称/ID/分类/位置×数量/状态/标签/备注） | packages/skill-home/src/items/pages/receipt.ts:35 | 不译 |
| 撤销 | packages/skill-home/src/items/pages/receipt.ts:41 | 不译 |
| 收尾语 | packages/skill-home/src/items/pages/receipt.ts:38 | 不译 |
| 查看详情 | packages/skill-home/src/items/pages/receipt.ts:42 | 不译 |
| 标签加/去 | packages/skill-home/src/items/pages/receipt.ts:48 | 不译 |
| 标签变更（去除/新增） | packages/skill-home/src/items/pages/receipt.ts:36 | 不译 |
| 物品状态 | packages/skill-home/src/items/pages/receipt.ts:47 | 不译 |
| 主物品 | packages/skill-home/src/items/pages/relations.ts:29 | 不译 |
| 关联列表（是否反向/关系类型/对方名称/对方ID） | packages/skill-home/src/items/pages/relations.ts:30 | 不译 |
| 同捆 | packages/skill-home/src/items/pages/relations.ts:42 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/relations.ts:35 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/relations.ts:36 | 不译 |
| 常用搭配 | packages/skill-home/src/items/pages/relations.ts:43 | 不译 |
| 替代 | packages/skill-home/src/items/pages/relations.ts:41 | 不译 |
| 解除 | packages/skill-home/src/items/pages/relations.ts:33 | 不译 |
| 解除关联 | packages/skill-home/src/items/pages/relations.ts:111 | 不译 |
| 设置关联 | packages/skill-home/src/items/pages/relations.ts:34 | 不译 |
| 配件 | packages/skill-home/src/items/pages/relations.ts:39 | 不译 |
| 配套 | packages/skill-home/src/items/pages/relations.ts:40 | 不译 |
| 一键清理 | packages/skill-home/src/items/pages/tag_manage.ts:38 | 不译 |
| 合并 | packages/skill-home/src/items/pages/tag_manage.ts:37 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/tag_manage.ts:42 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/tag_manage.ts:43 | 不译 |
| 当前mode | packages/skill-home/src/items/pages/tag_manage.ts:33 | 不译 |
| 忽略 | packages/skill-home/src/items/pages/tag_manage.ts:39 | 不译 |
| 改名 | packages/skill-home/src/items/pages/tag_manage.ts:36 | 不译 |
| 整理建议 | packages/skill-home/src/items/pages/tag_manage.ts:40 | 不译 |
| 新建标签 | packages/skill-home/src/items/pages/tag_manage.ts:41 | 不译 |
| 无相近标签 | packages/skill-home/src/items/pages/tag_manage.ts:125,128,200 | 不译 |
| 未使用标签 | packages/skill-home/src/items/pages/tag_manage.ts:32 | 不译 |
| 标签总览（标签名/件数/使用次数） | packages/skill-home/src/items/pages/tag_manage.ts:30 | 不译 |
| 相似度公式 | packages/skill-home/src/items/pages/tag_manage.ts:46 | 不译 |
| 相似标签对（相似度%） | packages/skill-home/src/items/pages/tag_manage.ts:31 | 不译 |
| 相近标签： | packages/skill-home/src/items/pages/tag_manage.ts:125 | 不译 |
| 事件类型 | packages/skill-home/src/items/pages/undo_select.ts:32,42 | 不译 |
| 勾选事件 | packages/skill-home/src/items/pages/undo_select.ts:36 | 不译 |
| 可撤销操作（最近N条） | packages/skill-home/src/items/pages/undo_select.ts:31 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/undo_select.ts:38 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/undo_select.ts:39 | 不译 |
| 确认撤销勾选项 | packages/skill-home/src/items/pages/undo_select.ts:37 | 不译 |
| 通用操作分组 | packages/skill-home/src/items/pages/undo_select.ts:33 | 不译 |

用途：数据位：文件头声明「契约」（数据不译）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| (无历史) | packages/skill-home/src/items/pages/history.ts:140 | 不译 |
| 事件条目（类型/摘要/diff展开） | packages/skill-home/src/items/pages/history.ts:33 | 不译 |
| 位置轨迹 | packages/skill-home/src/items/pages/history.ts:31 | 不译 |
| 位置轨迹\|时间线（N条）\|事件条目（类型/摘要/diff展开）\|已撤销标记 | packages/skill-home/src/items/pages/history.ts:58 | 不译 |
| 全部 | packages/skill-home/src/items/pages/history.ts:37 | 不译 |
| 全部\|类型筛选\|展开详情\|撤销\|复制数据\|复制日志 | packages/skill-home/src/items/pages/history.ts:59 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/history.ts:41 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/history.ts:42 | 不译 |
| 展开详情 | packages/skill-home/src/items/pages/history.ts:39 | 不译 |
| 差异处理 | packages/skill-home/src/items/pages/history.ts:47 | 不译 |
| 已撤销 | packages/skill-home/src/items/pages/history.ts:48 | 不译 |
| 已撤销标记 | packages/skill-home/src/items/pages/history.ts:34 | 不译 |
| 撤销 | packages/skill-home/src/items/pages/history.ts:40 | 不译 |
| 时间线（N条） | packages/skill-home/src/items/pages/history.ts:32 | 不译 |
| 状态变更 | packages/skill-home/src/items/pages/history.ts:45 | 不译 |
| 状态变更\|盘点\|差异处理\|已撤销 | packages/skill-home/src/items/pages/history.ts:61 | 不译 |
| 盘点 | packages/skill-home/src/items/pages/history.ts:46 | 不译 |
| 空态：暂无事件\|异常：数据解析失败 | packages/skill-home/src/items/pages/history.ts:60 | 不译 |
| 类型筛选 | packages/skill-home/src/items/pages/history.ts:38 | 不译 |
| 先不处理 | packages/skill-home/src/items/pages/inventory_diff.ts:40 | 不译 |
| 动作集 | packages/skill-home/src/items/pages/inventory_diff.ts:31 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/inventory_diff.ts:42 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/inventory_diff.ts:43 | 不译 |
| 多 | packages/skill-home/src/items/pages/inventory_diff.ts:47 | 不译 |
| 差异分组missing/extra/diff/pending | packages/skill-home/src/items/pages/inventory_diff.ts:29 | 不译 |
| 差异分组missing/extra/diff/pending\|所属盘点记录\|动作集\|新位置输入\|批量行 | packages/skill-home/src/items/pages/inventory_diff.ts:59 | 不译 |
| 异 | packages/skill-home/src/items/pages/inventory_diff.ts:48 | 不译 |
| 录入为新物品 | packages/skill-home/src/items/pages/inventory_diff.ts:38 | 不译 |
| 待确认 | packages/skill-home/src/items/pages/inventory_diff.ts:49 | 不译 |
| 忽略 | packages/skill-home/src/items/pages/inventory_diff.ts:37 | 不译 |
| 所属盘点记录 | packages/skill-home/src/items/pages/inventory_diff.ts:30 | 不译 |
| 批量确认 | packages/skill-home/src/items/pages/inventory_diff.ts:41 | 不译 |
| 批量行 | packages/skill-home/src/items/pages/inventory_diff.ts:33 | 不译 |
| 按实际更新 | packages/skill-home/src/items/pages/inventory_diff.ts:36 | 不译 |
| 按实际更新\|忽略\|录入为新物品\|标记复查\|先不处理\|批量确认\|复制数据\|复制日志 | packages/skill-home/src/items/pages/inventory_diff.ts:60 | 不译 |
| 新位置输入 | packages/skill-home/src/items/pages/inventory_diff.ts:32 | 不译 |
| 标记复查 | packages/skill-home/src/items/pages/inventory_diff.ts:39 | 不译 |
| 空态：该记录没有未处理差异\|异常：数据解析失败 | packages/skill-home/src/items/pages/inventory_diff.ts:61 | 不译 |
| 缺 | packages/skill-home/src/items/pages/inventory_diff.ts:46 | 不译 |
| 缺\|多\|异\|待确认 | packages/skill-home/src/items/pages/inventory_diff.ts:62 | 不译 |
| function recCmd(btn,kind){var id=btn.dataset.r\|\|"";var sc=btn.dataset.sc\|\|"全屋"; | packages/skill-home/src/items/pages/inventory_records.ts:97 | 不译 |
| 历史盘点（N） | packages/skill-home/src/items/pages/inventory_records.ts:30 | 不译 |
| 历史盘点（N）\|发生时间\|缺/多/异/待确认计数\|记录状态 | packages/skill-home/src/items/pages/inventory_records.ts:57 | 不译 |
| 发生时间 | packages/skill-home/src/items/pages/inventory_records.ts:31 | 不译 |
| 处理差异 | packages/skill-home/src/items/pages/inventory_records.ts:37 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/inventory_records.ts:40 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/inventory_records.ts:41 | 不译 |
| 复查 | packages/skill-home/src/items/pages/inventory_records.ts:38 | 不译 |
| 多 | packages/skill-home/src/items/pages/inventory_records.ts:66 | 不译 |
| 展开详情 | packages/skill-home/src/items/pages/inventory_records.ts:36 | 不译 |
| 展开详情\|处理差异\|复查\|开始盘点\|复制数据\|复制日志 | packages/skill-home/src/items/pages/inventory_records.ts:58 | 不译 |
| 已处理 | packages/skill-home/src/items/pages/inventory_records.ts:46 | 不译 |
| 已复查 | packages/skill-home/src/items/pages/inventory_records.ts:47 | 不译 |
| 已完成 | packages/skill-home/src/items/pages/inventory_records.ts:45 | 不译 |
| 开始盘点 | packages/skill-home/src/items/pages/inventory_records.ts:39 | 不译 |
| 异 | packages/skill-home/src/items/pages/inventory_records.ts:66 | 不译 |
| 待确认 | packages/skill-home/src/items/pages/inventory_records.ts:66 | 不译 |
| 空态：还没有盘点记录\|异常：数据解析失败 | packages/skill-home/src/items/pages/inventory_records.ts:59 | 不译 |
| 缺 | packages/skill-home/src/items/pages/inventory_records.ts:66 | 不译 |
| 缺/多/异/待确认计数 | packages/skill-home/src/items/pages/inventory_records.ts:32 | 不译 |
| 记录状态 | packages/skill-home/src/items/pages/inventory_records.ts:33 | 不译 |
| 进行中 | packages/skill-home/src/items/pages/inventory_records.ts:44 | 不译 |
| 进行中\|已完成\|已处理\|已复查 | packages/skill-home/src/items/pages/inventory_records.ts:60 | 不译 |
| .tri[data-v="不在"].on{background:#ff3b30;border-color:#ff3b30} | packages/skill-home/src/items/pages/inventory_round.ts:84 | 不译 |
| .tri[data-v="不确定"].on{background:#ff9500;border-color:#ff9500} | packages/skill-home/src/items/pages/inventory_round.ts:85 | 不译 |
| .tri[data-v="在"].on{background:#34c759;border-color:#34c759} | packages/skill-home/src/items/pages/inventory_round.ts:83 | 不译 |
| 三态判定 | packages/skill-home/src/items/pages/inventory_round.ts:32 | 不译 |
| 上次待复查（置顶） | packages/skill-home/src/items/pages/inventory_round.ts:30 | 不译 |
| 不在 | packages/skill-home/src/items/pages/inventory_round.ts:48 | 不译 |
| 不确定 | packages/skill-home/src/items/pages/inventory_round.ts:49 | 不译 |
| 保存进度 | packages/skill-home/src/items/pages/inventory_round.ts:41 | 不译 |
| 借用中 | packages/skill-home/src/items/pages/inventory_round.ts:53 | 不译 |
| 发现清单外物品 | packages/skill-home/src/items/pages/inventory_round.ts:39 | 不译 |
| 在 | packages/skill-home/src/items/pages/inventory_round.ts:47 | 不译 |
| 在/不在/不确定 | packages/skill-home/src/items/pages/inventory_round.ts:38 | 不译 |
| 在/不在/不确定\|发现清单外物品\|状态不变＋状态下拉\|保存进度\|确认提交（含差异）\|复制数据\|复制日志 | packages/skill-home/src/items/pages/inventory_round.ts:67 | 不译 |
| 在\|不在\|不确定\|状态不变\|在家\|备用\|借用中\|维修中\|找不到\|已废弃 | packages/skill-home/src/items/pages/inventory_round.ts:69 | 不译 |
| 在家 | packages/skill-home/src/items/pages/inventory_round.ts:51 | 不译 |
| 备用 | packages/skill-home/src/items/pages/inventory_round.ts:52 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/inventory_round.ts:43 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/inventory_round.ts:44 | 不译 |
| 已废弃 | packages/skill-home/src/items/pages/inventory_round.ts:56 | 不译 |
| 找不到 | packages/skill-home/src/items/pages/inventory_round.ts:55 | 不译 |
| 数量修正 | packages/skill-home/src/items/pages/inventory_round.ts:33 | 不译 |
| 新位置 | packages/skill-home/src/items/pages/inventory_round.ts:35 | 不译 |
| 核对清单（ID/位置/数量/状态） | packages/skill-home/src/items/pages/inventory_round.ts:31 | 不译 |
| 状态不变 | packages/skill-home/src/items/pages/inventory_round.ts:50 | 不译 |
| 状态不变＋状态下拉 | packages/skill-home/src/items/pages/inventory_round.ts:40 | 不译 |
| 状态修正（下拉） | packages/skill-home/src/items/pages/inventory_round.ts:34 | 不译 |
| 确认提交（含差异） | packages/skill-home/src/items/pages/inventory_round.ts:42 | 不译 |
| 空态：范围内没有物品\|异常：数据解析失败 | packages/skill-home/src/items/pages/inventory_round.ts:68 | 不译 |
| 维修中 | packages/skill-home/src/items/pages/inventory_round.ts:54 | 不译 |
| 范围 | packages/skill-home/src/items/pages/inventory_round.ts:29 | 不译 |
| 范围\|上次待复查（置顶）\|核对清单（ID/位置/数量/状态）\|三态判定\|数量修正\|状态修正（下拉）\|新位置 | packages/skill-home/src/items/pages/inventory_round.ts:66 | 不译 |
| btn.classList.add(btn.dataset.v==="带走"?"on-take":"on-leave");} | packages/skill-home/src/items/pages/move_checklist.ts:84 | 不译 |
| 不带走 | packages/skill-home/src/items/pages/move_checklist.ts:38,46 | 不译 |
| 二态标记 | packages/skill-home/src/items/pages/move_checklist.ts:32 | 不译 |
| 全不带走 | packages/skill-home/src/items/pages/move_checklist.ts:36 | 不译 |
| 全带走 | packages/skill-home/src/items/pages/move_checklist.ts:35 | 不译 |
| 全带走\|全不带走\|带走\|不带走\|统一确认\|复制清单\|复制数据\|复制日志 | packages/skill-home/src/items/pages/move_checklist.ts:57 | 不译 |
| 分组（每组建数） | packages/skill-home/src/items/pages/move_checklist.ts:30 | 不译 |
| 分组（每组建数）\|物品（ID/名称/位置/数量）\|二态标记 | packages/skill-home/src/items/pages/move_checklist.ts:56 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/move_checklist.ts:41 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/move_checklist.ts:42 | 不译 |
| 复制清单 | packages/skill-home/src/items/pages/move_checklist.ts:40 | 不译 |
| 已提交 | packages/skill-home/src/items/pages/move_checklist.ts:100 | 不译 |
| 带走 | packages/skill-home/src/items/pages/move_checklist.ts:37,45 | 不译 |
| 带走\|不带走 | packages/skill-home/src/items/pages/move_checklist.ts:59 | 不译 |
| 物品（ID/名称/位置/数量） | packages/skill-home/src/items/pages/move_checklist.ts:31 | 不译 |
| 空态：无空态文案\|异常：数据解析失败 | packages/skill-home/src/items/pages/move_checklist.ts:58 | 不译 |
| 统一确认 | packages/skill-home/src/items/pages/move_checklist.ts:39 | 不译 |
| (无位置) | packages/skill-home/src/items/pages/photo_wall.ts:110 | 不译 |
| 全部 | packages/skill-home/src/items/pages/photo_wall.ts:36 | 不译 |
| 分组（分类/位置） | packages/skill-home/src/items/pages/photo_wall.ts:31 | 不译 |
| 去补拍 | packages/skill-home/src/items/pages/photo_wall.ts:38 | 不译 |
| 复制数据 | packages/skill-home/src/items/pages/photo_wall.ts:41 | 不译 |
| 复制日志 | packages/skill-home/src/items/pages/photo_wall.ts:42 | 不译 |
| 按位置浏览 | packages/skill-home/src/items/pages/photo_wall.ts:39 | 不译 |
| 无照片件数 | packages/skill-home/src/items/pages/photo_wall.ts:33 | 不译 |
| 普通 | packages/skill-home/src/items/pages/photo_wall.ts:46 | 不译 |
| 点图复制详情prompt | packages/skill-home/src/items/pages/photo_wall.ts:40 | 不译 |
| 照片类型 | packages/skill-home/src/items/pages/photo_wall.ts:45 | 不译 |
| 照片网格 | packages/skill-home/src/items/pages/photo_wall.ts:32 | 不译 |
| 类型筛选 | packages/skill-home/src/items/pages/photo_wall.ts:37 | 不译 |
| 说明书-使用 | packages/skill-home/src/items/pages/photo_wall.ts:47 | 不译 |
| 说明书-保养 | packages/skill-home/src/items/pages/photo_wall.ts:49 | 不译 |
| 说明书-安装 | packages/skill-home/src/items/pages/photo_wall.ts:48 | 不译 |

### 数据不译（90 对）

用途：数据不译：页面契约锚点（REQUIRED_BLOCKS 机审锚点，payload 附录）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/family/pages/family_borrow.ts:37 | 不译 |
| 空态：暂无借用记录 | packages/skill-home/src/family/pages/family_borrow.ts:35 | 不译 |
| 超期提醒 | packages/skill-home/src/family/pages/family_borrow.ts:36 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/family/pages/family_members.ts:34 | 不译 |
| 无物品态：库里还没有物品 | packages/skill-home/src/family/pages/family_members.ts:33 | 不译 |
| 空态：还没有家人档案 | packages/skill-home/src/family/pages/family_members.ts:32 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/category_manage.ts:25 | 不译 |
| 拦截态：有物品的分类不可删 | packages/skill-home/src/items/pages/category_manage.ts:26 | 不译 |
| 空态：树为空即只有「新建顶级分类」 | packages/skill-home/src/items/pages/category_manage.ts:24 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/confirm.ts:27 | 不译 |
| 空态：无（确认页） | packages/skill-home/src/items/pages/confirm.ts:26 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/history.ts:28 | 不译 |
| 空态：暂无事件 | packages/skill-home/src/items/pages/history.ts:27 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/inventory_diff.ts:26 | 不译 |
| 空态：该记录没有未处理差异 | packages/skill-home/src/items/pages/inventory_diff.ts:25 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/inventory_records.ts:27 | 不译 |
| 空态：还没有盘点记录 | packages/skill-home/src/items/pages/inventory_records.ts:26 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/inventory_round.ts:26 | 不译 |
| 空态：范围内没有物品 | packages/skill-home/src/items/pages/inventory_round.ts:25 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/move_checklist.ts:27 | 不译 |
| 空态：无空态文案 | packages/skill-home/src/items/pages/move_checklist.ts:26 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/photo_wall.ts:28 | 不译 |
| 空态：没有带照片的物品 | packages/skill-home/src/items/pages/photo_wall.ts:26 | 不译 |
| 补充态：还有N件无照片→去补拍 | packages/skill-home/src/items/pages/photo_wall.ts:27 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/photos.ts:27 | 不译 |
| 空态：暂无照片＋补拍引导 | packages/skill-home/src/items/pages/photos.ts:26 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/receipt.ts:31 | 不译 |
| 标签空值（无） | packages/skill-home/src/items/pages/receipt.ts:30 | 不译 |
| 空态：无字段级变化 | packages/skill-home/src/items/pages/receipt.ts:29 | 不译 |
| 建立区占位文案 | packages/skill-home/src/items/pages/relations.ts:25 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/relations.ts:26 | 不译 |
| 空态：暂无关联 | packages/skill-home/src/items/pages/relations.ts:24 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/tag_manage.ts:27 | 不译 |
| 无可清理标签时不出「一键清理」 | packages/skill-home/src/items/pages/tag_manage.ts:26 | 不译 |
| 空态：暂无标签 | packages/skill-home/src/items/pages/tag_manage.ts:25 | 不译 |
| 异常：数据解析失败 | packages/skill-home/src/items/pages/undo_select.ts:28 | 不译 |
| 拦截态：请先勾选 | packages/skill-home/src/items/pages/undo_select.ts:27 | 不译 |
| 空态：暂无可撤销操作 | packages/skill-home/src/items/pages/undo_select.ts:26 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/receipt/pages/warranty.ts:45 | 不译 |
| 无事件时折叠区空态 | packages/skill-home/src/receipt/pages/warranty.ts:44 | 不译 |
| 空态：暂无登记 | packages/skill-home/src/receipt/pages/warranty.ts:43 | 不译 |
| 异常：数据解析失败／数据校验失败／备份失败 | packages/skill-home/src/setup/pages/backup_receipt.ts:62 | 不译 |
| 空值拦截：该参数不能为空 | packages/skill-home/src/setup/pages/backup_receipt.ts:63 | 不译 |
| 空态：暂无备份记录 | packages/skill-home/src/setup/pages/backup_receipt.ts:61 | 不译 |
| 幂等提示：已初始化 | packages/skill-home/src/setup/pages/first_use_wizard.ts:27 | 不译 |
| 异常：数据解析失败／数据校验失败／初始化失败 | packages/skill-home/src/setup/pages/first_use_wizard.ts:26 | 不译 |
| 异常：数据解析失败／数据校验失败 | packages/skill-home/src/setup/pages/health_report.ts:59 | 不译 |
| 拦截态：请先勾选至少1个问题 | packages/skill-home/src/setup/pages/health_report.ts:58 | 不译 |
| 空态：数据健康良好＋未发现数据问题 | packages/skill-home/src/setup/pages/health_report.ts:57 | 不译 |
| 冲突超10条折叠 | packages/skill-home/src/setup/pages/import_restore.ts:61 | 不译 |
| 异常：数据解析失败／数据校验失败／导入失败 | packages/skill-home/src/setup/pages/import_restore.ts:62 | 不译 |
| 承诺语：导入前自动备份＋失败回滚 | packages/skill-home/src/setup/pages/import_restore.ts:63 | 不译 |

用途：数据不译：比较／写库值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 全屋 | packages/skill-home/src/items/inventory.ts:18 | 不译 |
| 按位置 | packages/skill-home/src/items/inventory.ts:18 | 不译 |
| 正式 | packages/skill-home/src/outfit/outfit.ts:48,106 | 不译 |
| 运动 | packages/skill-home/src/outfit/outfit.ts:48,106 | 不译 |

用途：数据不译：台账文件级裁定（数据位保留：关系类型枚举（写库））

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 同捆 | packages/skill-home/src/items/update.ts:22 | 不译 |
| 常用搭配 | packages/skill-home/src/items/update.ts:22,30 | 不译 |
| 替代 | packages/skill-home/src/items/update.ts:22 | 不译 |
| 配件 | packages/skill-home/src/items/update.ts:22 | 不译 |
| 配套 | packages/skill-home/src/items/update.ts:22 | 不译 |

用途：数据不译：台账文件级裁定（数据位保留：面料词／检索 LIKE／场合·季节枚举／收纳动作码）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| %穿% | packages/skill-home/src/outfit/outfit.ts:19 | 不译 |
| %衣% | packages/skill-home/src/outfit/outfit.ts:18 | 不译 |
| %鞋% | packages/skill-home/src/outfit/outfit.ts:20 | 不译 |
| 上班 | packages/skill-home/src/outfit/outfit.ts:48 | 不译 |
| 冬季 | packages/skill-home/src/outfit/outfit.ts:49 | 不译 |
| 夏季 | packages/skill-home/src/outfit/outfit.ts:49 | 不译 |
| 家居 | packages/skill-home/src/outfit/outfit.ts:48 | 不译 |
| 已收纳 | packages/skill-home/src/outfit/outfit.ts:51 | 不译 |
| 帽 | packages/skill-home/src/outfit/outfit.ts:16 | 不译 |
| 拿出 | packages/skill-home/src/outfit/outfit.ts:53 | 不译 |
| 收纳 | packages/skill-home/src/outfit/outfit.ts:54 | 不译 |
| 春秋 | packages/skill-home/src/outfit/outfit.ts:49 | 不译 |
| 穿 | packages/skill-home/src/outfit/outfit.ts:15 | 不译 |
| 约会 | packages/skill-home/src/outfit/outfit.ts:48 | 不译 |
| 自定义 | packages/skill-home/src/outfit/outfit.ts:48 | 不译 |
| 衣 | packages/skill-home/src/outfit/outfit.ts:13 | 不译 |
| 鞋 | packages/skill-home/src/outfit/outfit.ts:14 | 不译 |

用途：数据不译：台账文件级裁定（数据位保留：行程类型枚举／参数别名／状态码）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 健身 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |
| 出差 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |
| 在家 | packages/skill-home/src/outfit/trip.ts:29 | 不译 |
| 天数 | packages/skill-home/src/outfit/trip.ts:18 | 不译 |
| 旅游中 | packages/skill-home/src/outfit/trip.ts:29 | 不译 |
| 旅行 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |
| 游泳 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |
| 滑雪 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |
| 爬山 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |
| 自定义 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |
| 行程类型 | packages/skill-home/src/outfit/trip.ts:23 | 不译 |
| 超市 | packages/skill-home/src/outfit/trip.ts:15 | 不译 |

### 机器键（9 对）

用途：机器键：文件名／路径（派生件定位）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| manifest.json | packages/skill-home/src/fetch/backup.ts:167,225 | 不译 |

用途：机器键：协议字段／点分键（entries 门抽取阶段剔除）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| key.file | packages/skill-home/src/health.ts:538,542,551 | 不译 |
| paths.split | packages/skill-home/src/health.ts:525 | 不译 |
| price.cover | packages/skill-home/src/stats/pages/overview.ts:261,299 | 不译 |
| price.covered | packages/skill-home/src/stats/pages/overview.ts:299 | 不译 |
| price.total | packages/skill-home/src/stats/pages/overview.ts:299 | 不译 |
| price.cover | packages/skill-home/src/stats/stats.ts:27 | 不译 |
| price.covered | packages/skill-home/src/stats/stats.ts:26 | 不译 |
| price.total | packages/skill-home/src/stats/stats.ts:26 | 不译 |

### 体检行 id（:466；行标题/动作/来源均已 m()）（1 对）

用途：体检行 id（:466；行标题/动作/来源均已 m()）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| config.file | packages/skill-home/src/health.ts:410,417,424 | 不译 |

### 配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()）（1 对）

用途：配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-home/src/health.ts:385,434,437 | 不译 |

### 体检行 id（:499 起；机器键）（1 对）

用途：体检行 id（:499 起；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.file | packages/skill-home/src/health.ts:459,468,475,486 | 不译 |

### 体检行 id（机器键，插件设置页按 id 对接）（1 对）

用途：体检行 id（机器键，插件设置页按 id 对接）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.name | packages/skill-home/src/health.ts:456 | 不译 |

### 体检行 id（:540；机器键）（1 对）

用途：体检行 id（:540；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| html.dir | packages/skill-home/src/health.ts:499,501 | 不译 |

### 体检行 id（:614；机器键）（1 对）

用途：体检行 id（:614；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| templates.dir | packages/skill-home/src/health.ts:572 | 不译 |

### 体检行 id（:557；机器键）（1 对）

用途：体检行 id（:557；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| value.source | packages/skill-home/src/health.ts:515 | 不译 |

## skill-memo-ilife（33 对）

### const CHECKIN_TOP = '打卡'；:71/:77/:83 三处 category !== CHECKIN_TOP 比较键（是否出打卡页）（1 对）

用途：const CHECKIN_TOP = '打卡'；:71/:77/:83 三处 category !== CHECKIN_TOP 比较键（是否出打卡页）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 打卡 | packages/skill-memo-ilife/src/checkin/receipt.ts:26 | 不译 |

### HealthItem.id 机器键（接口 readonly id: string，:43-50）；标题/报文/指引/来源同条已全 m()（1 对）

用途：HealthItem.id 机器键（接口 readonly id: string，:43-50）；标题/报文/指引/来源同条已全 m()

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| config.file | packages/skill-memo-ilife/src/cli/health/items.ts:80,87,94 | 不译 |

### :107 同上 id；:104 sourceOf(present,'db.dir') 是配置字段路径键（present 集合的键，返回值是来源人话），不是文案（1 对）

用途：:107 同上 id；:104 sourceOf(present,'db.dir') 是配置字段路径键（present 集合的键，返回值是来源人话），不是文案

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-memo-ilife/src/cli/health/items.ts:104,107 | 不译 |

### HealthItem.id 机器键（四档各一条）（1 对）

用途：HealthItem.id 机器键（四档各一条）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.file | packages/skill-memo-ilife/src/cli/health/items.ts:123,132,139,150 | 不译 |

### 配置字段路径键（sourceOf(present,'db.name')）（1 对）

用途：配置字段路径键（sourceOf(present,'db.name')）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.name | packages/skill-memo-ilife/src/cli/health/items.ts:120 | 不译 |

### :167 id；:165 配置字段路径键（1 对）

用途：:167 id；:165 配置字段路径键

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| html.dir | packages/skill-memo-ilife/src/cli/health/items.ts:165,167 | 不译 |

### HealthItem.id 机器键；**跨包消费证据**（1 对）

用途：HealthItem.id 机器键；**跨包消费证据**：packages/plugin-memo-ilife/src/client.ts:96 if (rec['id'] !== 'lark.cli') continue;（:68 注释「体检报告里 lark.cli 那一项」）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| lark.cli | packages/skill-memo-ilife/src/cli/health/items.ts:217 | 不译 |

### :197 id；:208 配置字段路径键（1 对）

用途：:197 id；:208 配置字段路径键

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| media.dir | packages/skill-memo-ilife/src/cli/health/items.ts:197,208 | 不译 |

### HealthItem.id 机器键（包内模板目录那一条）（1 对）

用途：HealthItem.id 机器键（包内模板目录那一条）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| templates.dir | packages/skill-memo-ilife/src/cli/health/items.ts:235 | 不译 |

### HealthItem.id 机器键（「这个值从哪来」那一条）（1 对）

用途：HealthItem.id 机器键（「这个值从哪来」那一条）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| value.source | packages/skill-memo-ilife/src/cli/health/items.ts:184 | 不译 |

### Windows 下 .cmd 直 spawn 报 EINVAL，经 cmd.exe /d /s /c 中转的 file 名（execFileSync(file,…)）；:164 是注释（1 对）

用途：Windows 下 .cmd 直 spawn 报 EINVAL，经 cmd.exe /d /s /c 中转的 file 名（execFileSync(file,…)）；:164 是注释

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| cmd.exe | packages/skill-memo-ilife/src/cli/health/probe.ts:170 | 不译 |

### 可执行文件名（1 对）

用途：可执行文件名：join(homedir(),'AppData','Roaming','npm','lark-cli.cmd')，探测候选路径

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| lark-cli.cmd | packages/skill-memo-ilife/src/cli/health/probe.ts:142 | 不译 |

### SQL 片段（2 对）

用途：SQL 片段：同上，.prepare(...) 实参（WHERE 与分页排序的一部分）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
|  ORDER BY created_at DESC LIMIT ? | packages/skill-memo-ilife/src/db/readonly.ts:186 | 不译 |

用途：SQL 片段：进 const where: string[]，随后 .prepare('SELECT * FROM notes WHERE ' + where.join(' AND ') + ' ORDER BY …')

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| date(created_at) BETWEEN date(?) AND date(?) | packages/skill-memo-ilife/src/db/readonly.ts:178 | 不译 |

### 比较键（7 对）

用途：比较键：created.category !== '备忘'／after.category !== '备忘'／before.category !== '备忘'（是否出本域页）。同文件可见位（:34/:46/:49/:52/:58 标题、:78-89 摘要）全已 m()

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 备忘 | packages/skill-memo-ilife/src/memo/receipt.ts:33,51,57 | 不译 |

用途：比较键：created.category === '心愿'／before.category === '心愿'／after.category === '心愿'，决定走哪个域页

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 心愿 | packages/skill-memo-ilife/src/memo/run.ts:104,149,178,254 | 不译 |

用途：比较键：after.category === '情绪日记'／before.category === '情绪日记'

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 情绪日记 | packages/skill-memo-ilife/src/memo/run.ts:181,257 | 不译 |

用途：比较键：if (type === '一次性' && !at) fail(2, m('skill-memo-ilife.remind-run.c023'))。值来自 src/remind/policy.ts:9 REMIND_REPEAT_TYPES=['一次性',…]、:12 DEFAULT_REPEAT_TYPE='一次性'（注释：reminders.repeat_type 列里存的就是这个中文字面值，不是文案）。该值上屏时经 m('…c034',{p0:type}) 作**数据值**（不译）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 一次性 | packages/skill-memo-ilife/src/remind/run.ts:131 | 不译 |

用途：比较键：if (category === '情绪日记') return { text: m('…c007'), … }

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 情绪日记 | packages/skill-memo-ilife/src/search/run.ts:126 | 不译 |

用途：比较键：if (category === '打卡') return { text: m('skill-memo-ilife.search-run.c006'), … }；同一行的可见文案是 m(c006)，字面量只做判别

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 打卡 | packages/skill-memo-ilife/src/search/run.ts:125 | 不译 |

用途：比较键：if (category !== '心愿') return null;（排期只对心愿类生效）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 心愿 | packages/skill-memo-ilife/src/wish/due.ts:32 | 不译 |

### 页种常量（const BATCH_PAGE_KIND: '结果页' \| '过程页' = '过程页'）（1 对）

用途：页种常量（const BATCH_PAGE_KIND: '结果页' \\| '过程页' = '过程页'）：比较与分派用的枚举值，非上屏字（页面标题另走 m()）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 结果页 | packages/skill-memo-ilife/src/memo/run.ts:32 | 不译 |

### 同上，页种枚举值（1 对）

用途：同上，页种枚举值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 过程页 | packages/skill-memo-ilife/src/memo/run.ts:32 | 不译 |

### 同 probe 的 Windows 中转 file 名（execFileSync(file,…)）；:89 是注释（1 对）

用途：同 probe 的 Windows 中转 file 名（execFileSync(file,…)）；:89 是注释

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| cmd.exe | packages/skill-memo-ilife/src/sync/feishu.ts:95 | 不译 |

### 可执行文件候选路径段（%APPDATA%/Roaming/npm/lark-cli.cmd、Local/Programs/lark-cli/lark-cli.cmd）；:89 是注释（1 对）

用途：可执行文件候选路径段（%APPDATA%/Roaming/npm/lark-cli.cmd、Local/Programs/lark-cli/lark-cli.cmd）；:89 是注释

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| lark-cli.cmd | packages/skill-memo-ilife/src/sync/feishu.ts:49,62 | 不译 |

### 可执行文件候选路径段（Local/Programs/lark-cli/lark-cli.exe）（1 对）

用途：可执行文件候选路径段（Local/Programs/lark-cli/lark-cli.exe）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| lark-cli.exe | packages/skill-memo-ilife/src/sync/feishu.ts:61 | 不译 |

### 远端自检对象的命名/反查前缀 SENTINEL_PREFIX（注释（1 对）

用途：远端自检对象的命名/反查前缀 SENTINEL_PREFIX（注释：老逐字，feishu_sync.py:62）。:85 作为参数拼进 createTask 的 summary（m('skill-memo-ilife.sync-sentinel.c003',{p0:SENTINEL_PREFIX,…})）、:18 进描述、:167 进「怎么清」文案；本地回执里它是**参数值**，不是文案

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| [备忘录测试] | packages/skill-memo-ilife/src/sync/sentinel.ts:14 | 不译 |

### const WISH_TOP = '心愿'；:27 if (before.category !== WISH_TOP) return … 比较键（本件不出文案）（1 对）

用途：const WISH_TOP = '心愿'；:27 if (before.category !== WISH_TOP) return … 比较键（本件不出文案）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 心愿 | packages/skill-memo-ilife/src/wish/complete.ts:12 | 不译 |

### const WISH_TOP = '心愿'（1 对）

用途：const WISH_TOP = '心愿'：:125 **写库值** category: WISH_TOP（addNote），其余 :63/:110/:168/:200/:246 为比较键

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 心愿 | packages/skill-memo-ilife/src/wish/ensure.ts:27 | 不译 |

### 接口类型字面量 readonly kind: '过程页'（WishReceiptInput.page.kind），不是运行值；运行时分支看 input.page !== undefined（:72）（1 对）

用途：接口类型字面量 readonly kind: '过程页'（WishReceiptInput.page.kind），不是运行值；运行时分支看 input.page !== undefined（:72）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 过程页 | packages/skill-memo-ilife/src/wish/receipt.ts:49 | 不译 |

### const WISH_TOP = '心愿'；:64/:105/:121 为比较/过滤（1 对）

用途：const WISH_TOP = '心愿'；:64/:105/:121 为比较/过滤

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 心愿 | packages/skill-memo-ilife/src/wish/reconcile.ts:18 | 不译 |

### 过滤键（1 对）

用途：过滤键：listNotes(db).filter((n) => n.category === '心愿')

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 心愿 | packages/skill-memo-ilife/src/wish/run.ts:92 | 不译 |

### 页种常量（const WISH_PAGE_KIND: '过程页' = '过程页'）（1 对）

用途：页种常量（const WISH_PAGE_KIND: '过程页' = '过程页'）：比较用枚举值

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 过程页 | packages/skill-memo-ilife/src/wish/run.ts:26 | 不译 |

## skill-schedule（110 对）

### 分类键比较（:187 label === '工作'）（1 对）

用途：分类键比较（:187 label === '工作'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 工作 | packages/skill-schedule/src/analyze/analyzeDocs.ts:187 | 不译 |

### 按分类标签取值（:183 rows.find(row => row.label === '维持')）（1 对）

用途：按分类标签取值（:183 rows.find(row => row.label === '维持')）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 维持 | packages/skill-schedule/src/analyze/analyzeDocs.ts:183 | 不译 |

### 配置键名（:91，读写与回执都用它）（1 对）

用途：配置键名（:91，读写与回执都用它）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-schedule/src/cli/config.ts:91 | 不译 |

### FEISHU_SENTINEL_MARK 自检远端对象标题标记（:22）（1 对）

用途：FEISHU_SENTINEL_MARK 自检远端对象标题标记（:22）：写远端并作前缀识别

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| [作息管家测试] | packages/skill-schedule/src/fetch/feishu.ts:22 | 不译 |

### 可执行文件名候选（:97，穿透 .cmd 用）（1 对）

用途：可执行文件名候选（:97，穿透 .cmd 用）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| cmd.exe | packages/skill-schedule/src/fetch/feishu.ts:97 | 不译 |

### 可执行文件名候选（:46，Windows 查找表）（1 对）

用途：可执行文件名候选（:46，Windows 查找表）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| lark-cli.cmd | packages/skill-schedule/src/fetch/feishu.ts:46,48 | 不译 |

### 可执行文件名候选（:47，Windows 查找表）（1 对）

用途：可执行文件名候选（:47，Windows 查找表）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| lark-cli.exe | packages/skill-schedule/src/fetch/feishu.ts:47 | 不译 |

### FEISHU_OWNER_MARK 归属锚（:20）（1 对）

用途：FEISHU_OWNER_MARK 归属锚（:20）：写进远端事件 description，并据此识别／清理自有对象

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 作息管家自动同步 | packages/skill-schedule/src/fetch/feishu.ts:20 | 不译 |

### 可执行名（:380，平台探测）（1 对）

用途：可执行名（:380，平台探测）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| cmd.exe | packages/skill-schedule/src/health.ts:380 | 不译 |

### 体检行 id（:466；行标题/动作/来源均已 m()）（1 对）

用途：体检行 id（:466；行标题/动作/来源均已 m()）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| config.file | packages/skill-schedule/src/health.ts:466,473,480 | 不译 |

### 配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()）（1 对）

用途：配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.dir | packages/skill-schedule/src/health.ts:420,423,491 | 不译 |

### 体检行 id（:499 起；机器键）（1 对）

用途：体检行 id（:499 起；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.file | packages/skill-schedule/src/health.ts:499,508,515,526 | 不译 |

### 体检行 id（机器键，插件设置页按 id 对接）（1 对）

用途：体检行 id（机器键，插件设置页按 id 对接）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| db.name | packages/skill-schedule/src/health.ts:496 | 不译 |

### 体检行 id（:540；机器键）（1 对）

用途：体检行 id（:540；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| html.dir | packages/skill-schedule/src/health.ts:540,542 | 不译 |

### 体检行 id（:594；机器键）（1 对）

用途：体检行 id（:594；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| lark.cli | packages/skill-schedule/src/health.ts:594 | 不译 |

### 体检行 id（:614；机器键）（1 对）

用途：体检行 id（:614；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| templates.dir | packages/skill-schedule/src/health.ts:614 | 不译 |

### 体检行 id（:557；机器键）（1 对）

用途：体检行 id（:557；机器键）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| value.source | packages/skill-schedule/src/health.ts:557 | 不译 |

### 报文前缀判据（:448 message.startsWith('不在')）→ 机器码 DIR_MISSING；报文本身 :426 用 m('health.c018')（1 对）

用途：报文前缀判据（:448 message.startsWith('不在')）→ 机器码 DIR_MISSING；报文本身 :426 用 m('health.c018')

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 不在 | packages/skill-schedule/src/health.ts:448 | 不译 |

### 报文前缀判据（:448 startsWith('同名')）；报文 :329 用 m('health.c016')「同名文件占了它的位置」（1 对）

用途：报文前缀判据（:448 startsWith('同名')）；报文 :329 用 m('health.c016')「同名文件占了它的位置」

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 同名 | packages/skill-schedule/src/health.ts:448 | 不译 |

### HELP 产物文件名主体（:33，路径拼接；#1235:8 冻结）（1 对）

用途：HELP 产物文件名主体（:33，路径拼接；#1235:8 冻结）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 作息管家_HELP | packages/skill-schedule/src/help/helpFile.ts:33 | 不译 |

### 回执计数桶键（:41 counts[e.completion || '未复盘']；:42 按 VALID_COMPLETIONS 过滤）（1 对）

用途：回执计数桶键（:41 counts[e.completion \|\| '未复盘']；:42 按 VALID_COMPLETIONS 过滤）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未复盘 | packages/skill-schedule/src/plan/index.ts:41 | 不译 |

### DB completion 存储值前缀比较（:122 startsWith('已完成')）（1 对）

用途：DB completion 存储值前缀比较（:122 startsWith('已完成')）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已完成 | packages/skill-schedule/src/plan/planDocs.ts:122 | 不译 |

### 完成态比较（:277/:286/:307 p.completion === '已完成'）（1 对）

用途：完成态比较（:277/:286/:307 p.completion === '已完成'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已完成 | packages/skill-schedule/src/plan/replayDocs.ts:277,286,307 | 不译 |

### 空值兜底与计数比较（:275 completionCounts，:281 过滤）（1 对）

用途：空值兜底与计数比较（:275 completionCounts，:281 过滤）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未复盘 | packages/skill-schedule/src/plan/replayDocs.ts:275,281,287,308 | 不译 |

### 未执行态集合 UNEXECUTED（:160），与 DB 值比较（2 对）

用途：未执行态集合 UNEXECUTED（:160），与 DB 值比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未完成 | packages/skill-schedule/src/plan/replayDocs.ts:160 | 不译 |
| 未完成(不可抗力) | packages/skill-schedule/src/plan/replayDocs.ts:160 | 不译 |

### 未执行态集合 UNEXECUTED（:160），与 DB completion 存储值比较（1 对）

用途：未执行态集合 UNEXECUTED（:160），与 DB completion 存储值比较

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 部分完成 | packages/skill-schedule/src/plan/replayDocs.ts:160 | 不译 |

### 完成态比较（:325 p.completion === '已完成'）（1 对）

用途：完成态比较（:325 p.completion === '已完成'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已完成 | packages/skill-schedule/src/plan/replaySections.ts:325 | 不译 |

### 聚合键取值 data.byL1['维持']（:323）（1 对）

用途：聚合键取值 data.byL1['维持']（:323）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 维持 | packages/skill-schedule/src/plan/replaySections.ts:323 | 不译 |

### 完成态比较（:52 p.completion === '已完成'）（1 对）

用途：完成态比较（:52 p.completion === '已完成'）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 已完成 | packages/skill-schedule/src/plan/reviewDocs.ts:52 | 不译 |

### 计数与原始状态比较（:56）（1 对）

用途：计数与原始状态比较（:56）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 未复盘 | packages/skill-schedule/src/plan/reviewDocs.ts:56 | 不译 |

### 作息分类词表（77 对）

用途：作息分类词表：一级/二级分类名与别名（写进 DB、参与白名单校验与按类聚合 key；:9 起，:55/:61 用原始词表名拼开发者报文）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| AI调优 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 代办 | packages/skill-schedule/src/policy/category.ts:20,89 | 不译 |
| 休息 | packages/skill-schedule/src/policy/category.ts:19,88,105 | 不译 |
| 休闲 | packages/skill-schedule/src/policy/category.ts:106 | 不译 |
| 会议 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 伴侣 | packages/skill-schedule/src/policy/category.ts:18,87 | 不译 |
| 保健 | packages/skill-schedule/src/policy/category.ts:14,83 | 不译 |
| 修行 | packages/skill-schedule/src/policy/category.ts:14,83 | 不译 |
| 做饭 | packages/skill-schedule/src/policy/category.ts:13,82 | 不译 |
| 健康 | packages/skill-schedule/src/policy/category.ts:9,14,77,83,105,107,147 | 不译 |
| 健身 | packages/skill-schedule/src/policy/category.ts:14,83,107 | 不译 |
| 八段锦 | packages/skill-schedule/src/policy/category.ts:14,83 | 不译 |
| 冥想 | packages/skill-schedule/src/policy/category.ts:14,83 | 不译 |
| 决策 | packages/skill-schedule/src/policy/category.ts:20,89 | 不译 |
| 出行 | packages/skill-schedule/src/policy/category.ts:107 | 不译 |
| 创作 | packages/skill-schedule/src/policy/category.ts:9,17,78,86 | 不译 |
| 剪辑 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 午睡 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 发呆 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 同事 | packages/skill-schedule/src/policy/category.ts:18,87 | 不译 |
| 娱乐 | packages/skill-schedule/src/policy/category.ts:105 | 不译 |
| 学习 | packages/skill-schedule/src/policy/category.ts:9,15,16,77,84,85,106,147 | 不译 |
| 宠物 | packages/skill-schedule/src/policy/category.ts:18,87 | 不译 |
| 家人 | packages/skill-schedule/src/policy/category.ts:18,87 | 不译 |
| 家务 | packages/skill-schedule/src/policy/category.ts:107 | 不译 |
| 就医 | packages/skill-schedule/src/policy/category.ts:13,82 | 不译 |
| 工作 | packages/skill-schedule/src/policy/category.ts:9,15,77,84,147,153 | 不译 |
| 康复 | packages/skill-schedule/src/policy/category.ts:14,83 | 不译 |
| 开发 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 手机 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 技术 | packages/skill-schedule/src/policy/category.ts:16,85 | 不译 |
| 投入 | packages/skill-schedule/src/policy/category.ts:9,18,78,87,106,147 | 不译 |
| 护肤 | packages/skill-schedule/src/policy/category.ts:13,82 | 不译 |
| 收拾 | packages/skill-schedule/src/policy/category.ts:20,89 | 不译 |
| 教学 | packages/skill-schedule/src/policy/category.ts:17,86 | 不译 |
| 散步 | packages/skill-schedule/src/policy/category.ts:13,19,82,88 | 不译 |
| 文字 | packages/skill-schedule/src/policy/category.ts:17,86 | 不译 |
| 文案 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 日常 | packages/skill-schedule/src/policy/category.ts:9,20,78,89,107,147 | 不译 |
| 朋友 | packages/skill-schedule/src/policy/category.ts:18,87 | 不译 |
| 服务 | packages/skill-schedule/src/policy/category.ts:18,87 | 不译 |
| 杂事 | packages/skill-schedule/src/policy/category.ts:20,89 | 不译 |
| 沟通 | packages/skill-schedule/src/policy/category.ts:18,87 | 不译 |
| 洗漱 | packages/skill-schedule/src/policy/category.ts:13,82,106 | 不译 |
| 游戏 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 玩耍 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 用餐 | packages/skill-schedule/src/policy/category.ts:13,82 | 不译 |
| 看病 | packages/skill-schedule/src/policy/category.ts:14,83 | 不译 |
| 睡眠 | packages/skill-schedule/src/policy/category.ts:13,82 | 不译 |
| 研究 | packages/skill-schedule/src/policy/category.ts:16,85 | 不译 |
| 社交 | packages/skill-schedule/src/policy/category.ts:18,87,106 | 不译 |
| 等候 | packages/skill-schedule/src/policy/category.ts:20,89 | 不译 |
| 维持 | packages/skill-schedule/src/policy/category.ts:9,13,77,82,105,106,107,147 | 不译 |
| 编程 | packages/skill-schedule/src/policy/category.ts:17,86 | 不译 |
| 考试 | packages/skill-schedule/src/policy/category.ts:16,85 | 不译 |
| 菜谱 | packages/skill-schedule/src/policy/category.ts:17,86 | 不译 |
| 行政 | packages/skill-schedule/src/policy/category.ts:20,89 | 不译 |
| 视频 | packages/skill-schedule/src/policy/category.ts:17,19,86,88 | 不译 |
| 计划 | packages/skill-schedule/src/policy/category.ts:107 | 不译 |
| 设计 | packages/skill-schedule/src/policy/category.ts:17,86 | 不译 |
| 语言 | packages/skill-schedule/src/policy/category.ts:16,85 | 不译 |
| 读书 | packages/skill-schedule/src/policy/category.ts:16,85 | 不译 |
| 调整 | packages/skill-schedule/src/policy/category.ts:9,19,78,88,105,106,147 | 不译 |
| 调研 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 财务 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 起居 | packages/skill-schedule/src/policy/category.ts:105 | 不译 |
| 过渡 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 运动 | packages/skill-schedule/src/policy/category.ts:14,83,105 | 不译 |
| 运营 | packages/skill-schedule/src/policy/category.ts:15,84 | 不译 |
| 追剧 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 通勤 | packages/skill-schedule/src/policy/category.ts:13,82,105 | 不译 |
| 采购 | packages/skill-schedule/src/policy/category.ts:13,82 | 不译 |
| 阅读 | packages/skill-schedule/src/policy/category.ts:16,19,85,88,106 | 不译 |
| 音乐 | packages/skill-schedule/src/policy/category.ts:19,88 | 不译 |
| 音频 | packages/skill-schedule/src/policy/category.ts:17,86 | 不译 |
| 餐饮 | packages/skill-schedule/src/policy/category.ts:106 | 不译 |
| 饮食 | packages/skill-schedule/src/policy/category.ts:107 | 不译 |

### sleepOf 分类包含判据（:103-104 c.includes('午睡')）（1 对）

用途：sleepOf 分类包含判据（:103-104 c.includes('午睡')）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 午睡 | packages/skill-schedule/src/query/queryDocs.ts:103 | 不译 |

### sleepOf 分类包含判据（:103-104 c.includes('睡眠')）（1 对）

用途：sleepOf 分类包含判据（:103-104 c.includes('睡眠')）

| 字面量 | 文件:行 | 裁定 |
| --- | --- | --- |
| 睡眠 | packages/skill-schedule/src/query/queryDocs.ts:103,104 | 不译 |

## 附录：UI-cue 复扫剩下的行（127 对）

按 #1320 的复现扫描口径（label/title/h2/button/aria-/placeholder/text:/emptyText/option/header/thead/tooltip/notice/msg:/detail: 等 UI 线索正则逐行命中）。票面 203 处是 #1317 修复前、按旧「整串豁免」扫描的读数；这些面已全部迁走，下面只剩已确认不译项（机器键／写库数据／命令文件名主体／页面契约锚点）。

| 字面量 | 文件:行 | 用途 |
| --- | --- | --- |
| config.file | packages/skill-bill/src/health.ts:339,346,353 | HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） |
| db.dir | packages/skill-bill/src/health.ts:363,366 | HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） |
| db.file | packages/skill-bill/src/health.ts:388,397,404,415 | HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） |
| html.dir | packages/skill-bill/src/health.ts:427,429 | HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） |
| value.source | packages/skill-bill/src/health.ts:443 | HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） |
| goals.file | packages/skill-bill/src/health.ts:455,467 | HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） |
| backup.dir | packages/skill-bill/src/health.ts:480,490 | HealthItem.id（机器锚点，面板定位用；同一 id 在多分支复用） |
| 餐饮 | packages/skill-bill/src/write/sayWords.ts:27,59,72,104,207 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 出行 | packages/skill-bill/src/write/sayWords.ts:27,59,72,104,207 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 购物 | packages/skill-bill/src/write/sayWords.ts:27,59,72 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 居住 | packages/skill-bill/src/write/sayWords.ts:27 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 医疗 | packages/skill-bill/src/write/sayWords.ts:27 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 工资 | packages/skill-bill/src/write/sayWords.ts:43,207 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 奖金 | packages/skill-bill/src/write/sayWords.ts:43 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 副业收入 | packages/skill-bill/src/write/sayWords.ts:43 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 其他收入 | packages/skill-bill/src/write/sayWords.ts:43,207 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 退款/冲销 | packages/skill-bill/src/write/sayWords.ts:88 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 住宿 | packages/skill-bill/src/write/sayWords.ts:104 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 办公 | packages/skill-bill/src/write/sayWords.ts:104 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 其他收入/报销回款 | packages/skill-bill/src/write/sayWords.ts:120 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 借贷/借出 | packages/skill-bill/src/write/sayWords.ts:133 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 借贷/借入 | packages/skill-bill/src/write/sayWords.ts:149 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 借贷/收回 | packages/skill-bill/src/write/sayWords.ts:165 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 借贷/偿还 | packages/skill-bill/src/write/sayWords.ts:178 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 分期/手机 | packages/skill-bill/src/write/sayWords.ts:191 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 分期/电脑 | packages/skill-bill/src/write/sayWords.ts:191 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 分期/家电 | packages/skill-bill/src/write/sayWords.ts:191 | 分类槽 value 与 label（件头 :8「写进库的数据（手册 §5「数据不译」），留中文字面量」） |
| 热量趋势 | packages/skill-calorie/src/analysis/commands.ts:421 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看热量趋势 | packages/skill-calorie/src/analysis/commands.ts:421 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 整体趋势 | packages/skill-calorie/src/analysis/commands.ts:422 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看整体趋势 | packages/skill-calorie/src/analysis/commands.ts:422 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 营养分析 | packages/skill-calorie/src/analysis/commands.ts:423 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看营养分析 | packages/skill-calorie/src/analysis/commands.ts:423 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 组合分析 | packages/skill-calorie/src/analysis/commands.ts:424 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看体重 vs 摄入(最近 7 天) | packages/skill-calorie/src/analysis/commands.ts:424 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 热量缺口 | packages/skill-calorie/src/analysis/commands.ts:425 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看热量缺口 | packages/skill-calorie/src/analysis/commands.ts:425 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 健康盘 | packages/skill-calorie/src/analysis/commands.ts:426 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看健康盘 | packages/skill-calorie/src/analysis/commands.ts:426 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| calorie-cmd-read calorie.view.health --params '{"window":"本周"}' | packages/skill-calorie/src/analysis/commands.ts:426 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 数据健康检查 | packages/skill-calorie/src/analysis/commands.ts:427 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 查卡路里数据 | packages/skill-calorie/src/analysis/commands.ts:427 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 复盘报告 | packages/skill-calorie/src/analysis/commands.ts:428 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看复盘报告 | packages/skill-calorie/src/analysis/commands.ts:428 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 每日六因素 | packages/skill-calorie/src/analysis/commands.ts:429 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看每日六因素 | packages/skill-calorie/src/analysis/commands.ts:429 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}' | packages/skill-calorie/src/analysis/commands.ts:429 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 体重预测 | packages/skill-calorie/src/analysis/commands.ts:430 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 异常诊断 | packages/skill-calorie/src/analysis/commands.ts:431 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 唤醒词HELP | packages/skill-calorie/src/analysis/commands.ts:432 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}' | packages/skill-calorie/src/analysis/commands.ts:432 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 热量历史 | packages/skill-calorie/src/analysis/commands.ts:433 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 查热量历史 | packages/skill-calorie/src/analysis/commands.ts:433 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 多指标趋势 | packages/skill-calorie/src/analysis/commands.ts:434 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看整体趋势(含目标对比) | packages/skill-calorie/src/analysis/commands.ts:434 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| BMI 报告 | packages/skill-calorie/src/analysis/commands.ts:438 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看BMI报告 | packages/skill-calorie/src/analysis/commands.ts:438 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| TDEE 报告 | packages/skill-calorie/src/analysis/commands.ts:439 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看TDEE报告 | packages/skill-calorie/src/analysis/commands.ts:439 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| BMR 报告 | packages/skill-calorie/src/analysis/commands.ts:440 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看BMR报告 | packages/skill-calorie/src/analysis/commands.ts:440 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 蛋白质摄入报告 | packages/skill-calorie/src/analysis/commands.ts:441 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看蛋白质摄入报告 | packages/skill-calorie/src/analysis/commands.ts:441 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 水分摄入报告 | packages/skill-calorie/src/analysis/commands.ts:442 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看水分摄入报告 | packages/skill-calorie/src/analysis/commands.ts:442 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 综合评分 | packages/skill-calorie/src/analysis/commands.ts:443 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看综合评分 | packages/skill-calorie/src/analysis/commands.ts:443 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 健康趋势 | packages/skill-calorie/src/analysis/commands.ts:444 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看健康趋势 | packages/skill-calorie/src/analysis/commands.ts:444 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 健康报告(含对比) | packages/skill-calorie/src/analysis/commands.ts:445 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| 看健康报告(含对比) | packages/skill-calorie/src/analysis/commands.ts:445 | 命令元数据（title/wakeWord/example）：title 是业务页文件名主体，按 docs/agents/多语言-文件名裁决.md 裁决 2 冻结不译；wakeWord/example 是路由键与可执行命令行（数据） |
| config.file | packages/skill-calorie/src/health.ts:344,351,358 | 体检行 id（:466；行标题/动作/来源均已 m()） |
| db.dir | packages/skill-calorie/src/health.ts:368,371 | 配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()） |
| db.file | packages/skill-calorie/src/health.ts:394,403,410,421 | 体检行 id（:499 起；机器键） |
| html.dir | packages/skill-calorie/src/health.ts:433,435 | 体检行 id（:540；机器键） |
| value.source | packages/skill-calorie/src/health.ts:449 | 体检行 id（:557；机器键） |
| photos.dir | packages/skill-calorie/src/health.ts:467,479 | 检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title |
| photos.gifs | packages/skill-calorie/src/health.ts:487,491 | 检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title |
| xunji.key | packages/skill-calorie/src/health.ts:497 | 检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title |
| xunji.cli | packages/skill-calorie/src/health.ts:508 | 检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title |
| land.cli | packages/skill-calorie/src/health.ts:536 | 检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title |
| xunji.catalog | packages/skill-calorie/src/health.ts:550,554 | 检查项机器 id（config.file/db.dir/…/xunji.catalog）与 'cli.js' 路径片段；同件 :344 已迁 title |
| 主页 | packages/skill-calorie/src/photo/helpScene.ts:76 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 饮食 | packages/skill-calorie/src/photo/helpScene.ts:77,105 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 体重 | packages/skill-calorie/src/photo/helpScene.ts:78,107 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 运动 | packages/skill-calorie/src/photo/helpScene.ts:79,103 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 健身计划 | packages/skill-calorie/src/photo/helpScene.ts:80,106 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 目标管理 | packages/skill-calorie/src/photo/helpScene.ts:81,101 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 身体细节 | packages/skill-calorie/src/photo/helpScene.ts:82,102 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 身材照片 | packages/skill-calorie/src/photo/helpScene.ts:83,104 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 基础信息 | packages/skill-calorie/src/photo/helpScene.ts:84,100 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 分析 | packages/skill-calorie/src/photo/helpScene.ts:85,111 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 过程 | packages/skill-calorie/src/photo/helpScene.ts:186 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 结果 | packages/skill-calorie/src/photo/helpScene.ts:187 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| 回执 | packages/skill-calorie/src/photo/helpScene.ts:188 | 速查台模型/展示序常量：分组 label 是 SoT 分类键（上屏经 helpGroupLabelOf 取词），子功能名是排序键；徽章/字段标签/一键复制只喂已下线的速查台模型（无上屏位），按 #1197 冻结契约面不迁 |
| xunji.key | packages/skill-calorie/src/workout/xunjiKey.ts:76,104,112 | 唤醒词/协议字段 |
| config.file | packages/skill-chef/src/health.ts:365,372,379 | 体检项 id（机器键），同处可见文案走 m('skill-chef.health.*') |
| db.dir | packages/skill-chef/src/health.ts:389,392 | sourceOf(present, 'db.dir') 与体检项 id＝配置文件 key |
| db.file | packages/skill-chef/src/health.ts:414,423,430,441 | 体检项 id（机器键） |
| html.dir | packages/skill-chef/src/health.ts:453,455 | sourceOf(present, 'html.dir') 与体检项 id＝配置文件 key |
| value.source | packages/skill-chef/src/health.ts:469 | 体检项 id（机器键） |
| templates.dir | packages/skill-chef/src/health.ts:479 | 体检项 id（机器键） |
| db.dir | packages/skill-home/src/health.ts:385,434,437 | 配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()） |
| config.file | packages/skill-home/src/health.ts:410,417,424 | 体检行 id（:466；行标题/动作/来源均已 m()） |
| db.file | packages/skill-home/src/health.ts:459,468,475,486 | 体检行 id（:499 起；机器键） |
| html.dir | packages/skill-home/src/health.ts:499,501 | 体检行 id（:540；机器键） |
| value.source | packages/skill-home/src/health.ts:515 | 体检行 id（:557；机器键） |
| paths.split | packages/skill-home/src/health.ts:525 | 机器键：协议字段／点分键（entries 门抽取阶段剔除） |
| key.file | packages/skill-home/src/health.ts:538,542,551 | 机器键：协议字段／点分键（entries 门抽取阶段剔除） |
| templates.dir | packages/skill-home/src/health.ts:572 | 体检行 id（:614；机器键） |
| config.file | packages/skill-memo-ilife/src/cli/health/items.ts:80,87,94 | HealthItem.id 机器键（接口 readonly id: string，:43-50）；标题/报文/指引/来源同条已全 m() |
| db.dir | packages/skill-memo-ilife/src/cli/health/items.ts:104,107 | :107 同上 id；:104 sourceOf(present,'db.dir') 是配置字段路径键（present 集合的键，返回值是来源人话），不是文案 |
| db.file | packages/skill-memo-ilife/src/cli/health/items.ts:123,132,139,150 | HealthItem.id 机器键（四档各一条） |
| html.dir | packages/skill-memo-ilife/src/cli/health/items.ts:165,167 | :167 id；:165 配置字段路径键 |
| value.source | packages/skill-memo-ilife/src/cli/health/items.ts:184 | HealthItem.id 机器键（「这个值从哪来」那一条） |
| media.dir | packages/skill-memo-ilife/src/cli/health/items.ts:197,208 | :197 id；:208 配置字段路径键 |
| lark.cli | packages/skill-memo-ilife/src/cli/health/items.ts:217 | HealthItem.id 机器键；**跨包消费证据**：packages/plugin-memo-ilife/src/client.ts:96 if (rec['id'] !== 'lark.cli') continue;（:68 注释「体检报告里 lark.cli 那一项」） |
| templates.dir | packages/skill-memo-ilife/src/cli/health/items.ts:235 | HealthItem.id 机器键（包内模板目录那一条） |
| 打卡 | packages/skill-memo-ilife/src/search/run.ts:125 | 比较键：if (category === '打卡') return { text: m('skill-memo-ilife.search-run.c006'), … }；同一行的可见文案是 m(c006)，字面量只做判别 |
| 情绪日记 | packages/skill-memo-ilife/src/search/run.ts:126 | 比较键：if (category === '情绪日记') return { text: m('…c007'), … } |
| db.dir | packages/skill-schedule/src/health.ts:420,423,491 | 配置键名＋体检行 id（:420 id: 'db.dir'；行标题/动作/来源已 m()） |
| config.file | packages/skill-schedule/src/health.ts:466,473,480 | 体检行 id（:466；行标题/动作/来源均已 m()） |
| db.file | packages/skill-schedule/src/health.ts:499,508,515,526 | 体检行 id（:499 起；机器键） |
| html.dir | packages/skill-schedule/src/health.ts:540,542 | 体检行 id（:540；机器键） |
| value.source | packages/skill-schedule/src/health.ts:557 | 体检行 id（:557；机器键） |
| lark.cli | packages/skill-schedule/src/health.ts:594 | 体检行 id（:594；机器键） |
| templates.dir | packages/skill-schedule/src/health.ts:614 | 体检行 id（:614；机器键） |
