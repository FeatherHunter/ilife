#!/usr/bin/env node
/** 备忘录 HELP 内容资产 · **声明表与摘要锁的数据件**（票 #855 从 `gen-help-assets.mjs` 抽出来）。
 *
 * 为什么单列一件：五处「非纯搬运」的规则（prompt 清洗／可见文案清洗／字段剔补／别名）＋ 三枚摘要锁
 * 是本资产的**事实**，生成器只是把它们读出来跑一遍。事实与跑法分开，改内容只碰本件。
 * 本件**纯字面量、零 import**：谁读它都不带副作用。
 *
 * 摘录自原件（逐字，未改一个字符）：
 */
/** 摘要锁（fail-closed）：① 老实物文件字节；② 老 30 条老骨架 canonical；③ 清洗后 30 条 canonical。 */
const SOURCE_SHA256 = '8a25dd587d6b96ae2b56a16a17812def84d819dafefa4daa134e1c01b68efd8a';
const LEGACY_DIGEST = '0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c';
const ASSET_DIGEST = '444f64515150e55bae81a49f11663b02a89697a5d6cc1ba5e0e3b6102bc94613';

/** 声明 2 · `prompt_template` 清洗表：`[场景 id, 老片段(逐字), 新片段, 类]`。
 *  类 `CLI` ＝ 用户 U6 的命令去化：`--html` 6 个场景 ＋ 子命令名 4 个场景 ＋ `-c` 1 个场景，**并集 8**；
 *  类 `DB` ＝ 老 yaml `:9`「不暴露 DB」：`notes.due`／`note`／`task`／`task_guid`／`GUID`／`Cron`。
 *  每条都断言「在老 prompt 里恰好出现 1 次」，对不上即 fail-closed。 */
const PROMPT_EDITS = [
  ['memo_search_keyword', '带 --html 时生成可视化搜索结果页。', '并生成可视化搜索结果页。', 'CLI'],
  ['memo_get_detail', '带 --html 时生成详情页。', '并生成详情页。', 'CLI'],
  ['memo_search_wish', 'AI 自动按"心愿"分类过滤,等同搜备忘 -c 心愿。', 'AI 自动按"心愿"分类过滤。', 'CLI'],
  ['memo_reminders_active', '带 --html 时生成可筛选的可视化页。', '并生成可筛选的可视化页。', 'CLI'],
  ['memo_reminders_active', '  状  态: _____________ (选填,active=默认/dismissed)', '  状  态: _____________ (选填,默认只看有效提醒)', 'DB'],
  ['memo_complete_wish', '先 wish-complete --html 生成向导', '先出一份完成向导页', 'CLI'],
  ['memo_wish_schedule', '先 wish-batch-plan --suggest-due X --html 生成向导', '先出一份排期向导页(可带建议日期)', 'CLI'],
  ['memo_batch_change_category', '调多条 update-category。', 'AI 逐条改分类。', 'CLI'],
  ['memo_sync_feishu', '2. 反向同步 done(飞书已完成 → 本地 complete-wish)', '2. 反向同步完成状态(飞书已完成 → 本地标记完成)', 'CLI'],
  ['memo_sync_feishu', '带 --html 时生成同步报告页(含 11 统计字段)。', '并生成同步报告页(含 11 统计字段)。', 'CLI'],
  ['memo_complete_wish', '新建打卡 note(同事务)', '新建一条打卡记录(同事务)', 'DB'],
  ['memo_wish_schedule', 'AI 设置本地 notes.due + 飞书 task 同步 due。', 'AI 设置本地排期日期,并与飞书任务同步。', 'DB'],
  ['memo_sync_feishu', '3. 反向同步 due(飞书 due 改 → 本地 notes.due 跟)', '3. 反向同步排期日期(飞书那边改了日期 → 本地跟着改)', 'DB'],
  ['memo_sync_feishu', '1. 本地补建(本地心愿无飞书 task → 自动建)', '1. 本地补建(本地心愿还没有飞书任务 → 自动建)', 'DB'],
  ['memo_remind_with_note', 'Cron 到点触发推送。', '到点自动推送提醒。', 'DB'],
  ['memo_add_wish', '飞书任务清单: _____________ (选填,tasklist GUID,留空=我的任务)', '飞书任务清单: _____________ (选填,留空=我的任务)', 'DB'],
  ['memo_add_wish', 'AI 创建心愿 note,自动建飞书 task 并写回 task_guid。', 'AI 创建心愿笔记,自动建飞书任务并建立关联。', 'DB'],
  ['memo_delete_wish', '若有飞书 task,会自动标完成。', '若有飞书任务,会自动标完成(想连它一起删掉时说「彻底删除」)。', 'DB'],
  ['memo_update_wish', '飞书 task 标题同步更新。', '飞书任务标题同步更新。', 'DB'],
  ['memo_add_mood', 'AI 创建情绪日记 note。', 'AI 创建一条情绪日记。', 'DB'],
  ['memo_add_checkin', 'AI 创建打卡 note。', 'AI 创建一条打卡记录。', 'DB'],
  ['memo_init_setup', '检查并配置 Python', '检查并配置运行环境', 'IMPL'],
  ['memo_init_setup', '飞书 CLI(未安装则引导我安装并授权)', '飞书联动(未安装则引导我安装并授权)', 'IMPL'],
  ['memo_init_setup', '、环境变量,初始化数据库', '、配置项,初始化数据库', 'IMPL'],
  ['memo_complete_wish', 'AI 执行原子操作:删除该心愿 + 新建一条打卡记录(同事务)。', 'AI 删除该心愿并新建一条打卡记录。', 'IMPL'],
  ['memo_delete_basic', 'AI 删除这些备忘并告知影响行数;', 'AI 删除这些备忘并告诉你改动了几条;', 'IMPL'],
  ['memo_update_basic', 'AI 更新这条备忘的字段,告诉你修改后的内容。', 'AI 更新这条备忘的内容,告诉你修改后的结果。', 'IMPL'],
  ['memo_get_detail', 'AI 显示这条备忘的全部字段。', 'AI 显示这条备忘的全部内容。', 'IMPL'],
  ['memo_sync_feishu', '并生成同步报告页(含 11 统计字段)。', '并回执 11 项统计。', 'IMPL'],
  ['memo_change_category_single', '(它是内容维度的二阶属性)。', '(它是内容的细分)。', 'IMPL'],
  ['memo_batch_change_category', 'AI 生成批量改分类向导 HTML,你在 UI 勾选 + 选目标分类', 'AI 生成批量改分类向导网页,你在页面上勾选 + 选目标分类', 'IMPL'],
  ['memo_batch_change_category', '目标分类: _____________ (建议目标,可在 HTML 改)', '目标分类: _____________ (建议目标,可在网页上改)', 'IMPL'],
  ['memo_complete_wish', '你在 HTML 勾选 + 填打卡内容。', '你在页面上勾选 + 填打卡内容。', 'IMPL'],
  ['memo_wish_schedule', '你在 HTML 微调。', '你在页面上微调。', 'IMPL'],
];

/** 声明 5 · `title`／`label`／`hint` 里的实现细节字面（裁决 21 的 D5 ＋ 复审 M1：与 DB 类同一条规则，
 *  可见性更高）。`[类, 场景 id, 老片段, 新片段]`；`title`＝标题，`label:<字段名>`＝字段名，`hint:<字段名>`＝提示。
 *  **保留语义、只换说法**：`due`→同步到飞书；`GUID`→ID；`active/dismissed`→有效/已废弃
 *  （用老侧自己的词：`dismiss`＝废弃提醒）；`'null'`→留空即清除；`级联`→连同关联提醒一起删；
 *  `原子操作`／`同事务`／`影响行数`／`全文索引`／`字段`／`二阶属性`／`批量版`／`自动化用`／`HTML`／`UI`
 *  → 用户话（复审员 I 的 M1 逐条改法）。 */
const TEXT_EDITS = [
  ['title', 'memo_wish_schedule', '(同步飞书 due)', '(同步到飞书)'],
  ['hint:tasklist_guid', 'memo_add_wish', '飞书任务清单 GUID(可选)', '飞书任务清单 ID(可选)'],
  ['hint:status', 'memo_reminders_active', 'active(默认)/dismissed', '有效(默认)/已废弃'],
  ['hint:sub_category', 'memo_change_subcategory', "'null' 清除", '留空即清除'],
  ['title', 'memo_complete_wish', '(原子操作)', '(转成打卡记录)'],
  ['title', 'memo_batch_change_category', '(过程型 HTML 向导)', '(网页向导)'],
  ['label:with_reminders', 'memo_delete_basic', '级联删除提醒', '连同关联提醒一起删'],
  ['hint:with_reminders', 'memo_delete_basic', '是否级联删关联提醒(默认否,有提醒则报错)', '是否连同关联提醒一起删(默认否,有提醒则报错)'],
  ['hint:true', 'memo_delete_basic', '跳过二次确认(自动化用)', '跳过二次确认'],
  ['hint:keyword', 'memo_search_keyword', '搜索词(全文索引)', '搜索词'],
  ['hint:bulk_indicator', 'memo_change_category_single', "原话含'都/全部/多个 ID' → 走批量版", '多条一起改时,写「都」或「全部」'],
  ['hint:bulk_indicator', 'memo_batch_change_category', "原话含'都/全部/多个 ID'", '一次改多条(原话含「都/全部/多个 ID」)'],
  ['hint:to_category', 'memo_batch_change_category', '建议目标分类(HTML 可改)', '建议目标分类(网页上可改)'],
];

/** 清洗后 `prompt_template` 里不许再出现的实现记号（页面只出现唤醒词）。 */
const PROMPT_FORBIDDEN = ['--', '-c ', 'memo.', 'memo_cli', 'notes.', 'note', 'task', 'due',
  'Cron', 'GUID', 'guid', 'active', 'dismissed', 'SQL', '.py', 'SELECT', 'INSERT', 'UPDATE', 'script/',
  '原子操作', '同事务', '影响行数', '级联', '全文索引', '字段', '二阶属性', '批量版', '自动化', 'HTML', 'UI'];

/** 逐场景额外禁用。`memo_init_setup` 那条：编程语言名与接口名不许上页面（裁决 21 D7）。
 *  `Python` **不入全局表**——它在 `memo_add_wish` 里是**用户内容示例**（`如"想学 Python"`），
 *  删了会丢例子，故按场景精确禁用。 */
const SCENE_FORBIDDEN = { memo_init_setup: ['Python', 'CLI', '环境变量'] };

/** 清洗后 `title`／`label`／`hint` 里不许再出现的实现记号（裁决 21 ＋ 复审 M1：可见文案与 prompt 同一条规则）。
 *  **不列入**（有意保留，且都不是实现细节）：`ID`（老侧用户词，裁决 21 给的替换词就是「任务清单 ID」）、
 *  `YYYY-MM-DD`／`HH:MM` 等格式占位、`Python`（`memo_add_wish` 的**用户内容示例**）、
 *  `数据存储`／`初始化数据库`／`调度`（老 `SKILL.md:312-317` 的安装 prompt 逐字）。
 *  ⚠️ 复审员 I 已判：先前给 `HTML`／`UI` 开的豁免**不成立**（`HTML` 就是标记语言名，且那条例外是
 *  生成器注释自设的）——本表现**照收**，见 `TEXT_EDITS` 里那 5 处换说法。 */
const VISIBLE_FORBIDDEN = ['GUID', 'null', 'active', 'dismissed', 'due',
  'Cron', 'note', 'task', '--', 'memo.', 'notes.', 'script/',
  '原子操作', '同事务', '影响行数', '级联', '全文索引', '字段', '二阶属性', '批量版', '自动化', 'HTML', 'UI'];

/** 声明 3 · `editable_fields` 清洗（裁决 6：要清的共 22 条 ＝ 1 布尔 ＋ 9 非 html 落回 ＋ 12 html）。 */
const DROP_FIELDS = new Set(['html']); // 12 条 CLI 开关（老 :147／:178 等）
const LABEL_FIX = { // 9 条非布尔 ASCII 落回 → 中文名（7 个键；`remind_at`／`repeat_rule` 各 2 条）
  remind_at: '提醒时间', repeat_rule: '重复规则', start: '开始日期', end: '结束日期',
  status: '提醒状态', tasklist_guid: '飞书任务清单', reminder_id: '关联提醒',
};
/** 1 条布尔脏数据：老 yaml `memo_delete_basic.dimensions.true` 被 YAML 解析成布尔 `true` ⇒
 *  `name`／`label` 都成布尔，**过不了 `base-render` 的 `editable_fields` schema**（裁决 6）。
 *  清洗：键按字符串 `'true'` 落（`name` 必须 string），label 取老 `DIM_LABEL_MAP` 的 `跳过二次确认`。 */
const BOOL_FIELD = { name: 'true', label: '跳过二次确认' };

/** 声明 4 · `aliases` 12 条（裁决 5 收词规则：只收老侧会路由的词；42 条口语样例／HELP 自身 9 条不进）。
 *  来源 ① 老 yaml（主词本身）；② 老 `SKILL.md` 两张表与 `:300`／`:302-305`；③ `references/examples.md`（贡献 0 条）；
 *  新表（`src/policy/wakewords.ts`）里**能归到老场景**的新词按裁决 7 也进（`改子分类`／`查提醒`／`记一条`／`添加笔记`）；
 *  `废弃提醒`（新表有、老侧零场景可归）按裁决 7 不上页面。 */
const ALIASES = {
  memo_complete_wish: ['完成打卡'], // SKILL.md:262／:300
  memo_init_setup: ['初始化', '新手'], // SKILL.md:300（yaml 里 0 次）
  memo_add_mood: ['记情绪日记'], // SKILL.md:479
  memo_search_mood: ['查情绪日记'], // SKILL.md:525／:536／:540
  memo_update_mood: ['改情绪日记'], // SKILL.md:547
  memo_delete_mood: ['删情绪日记'], // SKILL.md:563
  memo_batch_change_category: ['批量改分类'], // SKILL.md:169／:644／:731／:754 ＋ 新表 wakewords.ts:16
  memo_change_subcategory: ['改子分类'], // 新表 wakewords.ts:17（老侧只作 `备忘改子分类` 的子串）
  memo_reminders_active: ['查提醒'], // 新表 wakewords.ts:22 ＋ 老 `memo_render.py:45` COMMAND_CN_MAP
  memo_add_basic: ['记一条', '添加笔记'], // 新表 wakewords.ts:28-29（`添加笔记` 另见 SKILL.md:477 章节名）
};
export { SOURCE_SHA256, LEGACY_DIGEST, ASSET_DIGEST, PROMPT_EDITS, TEXT_EDITS, PROMPT_FORBIDDEN, SCENE_FORBIDDEN, VISIBLE_FORBIDDEN, DROP_FIELDS, LABEL_FIX, BOOL_FIELD, ALIASES };
