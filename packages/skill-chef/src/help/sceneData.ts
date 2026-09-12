/** #213 · 私家大厨 HELP 内容资产：老骨架 48 卡 → 10 域／33 组／48 卡的 typed const。
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-chef/scripts/gen-help-assets.mjs` 产出。
 *    改内容＝改生成器里的声明表（十域表／组→域归属表／字段映射），再跑
 *    `node packages/skill-chef/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（全程只读）：
 *   ① 老技能 HELP 载荷 `.scratch/chef-help/legacy-chef-help-payload.json`（74,581 B）；**以 `$.scenarios[]` 为准**——
 *      载荷把同一批 48 条输出了两遍（`$.wake_words[].scenarios[]` 是第二遍视图，48/48 逐字相同），两遍不相加；
 *   ② `src/policy/wakewords.ts` 的 `WAKE_TABLE`（37 条 phrase）：唤醒词单一事实源，本件的 chip 路由与
 *      14 张卡的状态从它**派生**（`资产组名 − 表内 phrase`），不落第二份字面量。双向对账：表 37 ↔ 资产 33 组名；
 *      资产有表中无 ＝ 13 个老组名（→ 14 张 `'【待开发】'`）；表中有资产无 ＝ 17 条（4 条 HELP 自身触发词 ＋
 *      13 条新表多出词——后者见 t2 §3.1／§5.1，本票资产按老骨架保持 48 卡、不含它们）；
 *   ③ `docs/skills/skill-chef/t2-content-reconcile.md` §七 的 JSON 草案：形状起点，生成器已逐组／逐卡交叉复核。
 * 摘要锁：载荷文件 sha256＝c09f11d9ffa49e6b14c2ade094b5ab428f22fd440b2608442166e470db47d2ab
 *           老 48 条 sha256＝620653ed98c85acbeaf0ab646adf0ef48345f4d65d218a8d756f59f86757ae55
 *           映射后 48 条 sha256＝b87e504e2ecabccfcb9d7887e2a1153026bab6b882c9c068f29db93f82292d9f
 *
 * 与老骨架的**有意偏离**（四类，逐条对账见生成器头注释与 t2 §七）：
 *   1. `type`（单数、11 种字符串）→ `types`（复数数组）：按 `+` 拆、去 `(过程型)` 这类括号注；
 *   2. `dimensions`（42 键／80 条）→ `editable_fields`：键→`name`／`label`（逐字，不自造中文名），老值原文→`value`；
 *      **丢弃 1 条**＝`data_export_backup` 的畸形键 `默认不含)`（值为 `null`，过不了 `value: string`）；
 *      同卡 `include_archived` 照 t2 丁类定案补 `hint`（「是否含已废弃(选填，默认不含)」）；
 *   3. `status`：老件 48/48 空串是老家缺陷，不照抄 ⇒ 13 个不在 `WAKE_TABLE` 的老组名下 **14 张卡**标
 *      `'【待开发】'`（卡面出「待开发」徽章），其余 34 张空串；
 *   4. **不迁四项**：`result`（48/48；裁决「用户拿到的结果型 HTML 文件就是最好的执行结果」）／
 *      `html.command_cn`（与组名 48/48 逐字相同）／`html.template`（18 个老技能路径，新技能里一个不存在）／
 *      `html.data_source` ＋ `variants`（96 处全空）。
 *
 * 本文件给 **2 个导出**：`CHEF_SCENES`（全量 `groups`，复用公共层 `base-paint` 的契约类型）与
 * `buildChefSceneData()`（全量 `SceneData`）。页面级三项照裁决 6「逐项照记账」：`skill_name` 取老 `meta.skill`，
 * `title` 取**老家产物原文**（`.scratch/chef-help/A1-legacy-chef-help-skeleton.md:340`／`:398` 实测的
 * `<title>私家大厨 HELP · 能力速查</title>`；含技能名 ⇒ `composeDocTitle` 走「原样」支，标签页不重复技能名），
 * `version` 取老载荷 `meta.version`＝**技能数据世代**（非 npm 包版本；同值是巧合）。
 */

import type { SceneData, SceneGroup } from 'base-paint';

/** 10 域／33 组／48 卡：域序＝t2 §一 域序 1..10；组序＝载荷 `$.wake_words[]` 序按域收组；卡序＝载荷书写序。 */
export const CHEF_SCENES: readonly SceneGroup[] = [
  { id: 'cook', icon: '🍳', label: '做菜', subgroups: [
    { id: '做菜模式', label: '做菜模式', scenes: [
      { id: 'cooking_start_fresh', title: '全新开始(含每步内联 + 完结闭环)', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '帮我做一道{{菜名}},我要按步骤来。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }] },
      { id: 'cooking_start_with_history', title: '含上次经验(历史驱动再开做)', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '再做一次{{菜名}},上次做得不错但想改进。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'history', label: 'history', value: '之前做过' }] },
      { id: 'cooking_start_double_servings', title: '双份份量', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '做{{菜名}},今晚来客人,做两人份。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'servings', label: 'servings', value: '2 份' }] },
      { id: 'cooking_resume_after_pause', title: '断点续做(AI 会话记忆)', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '我刚才做到第 {{N}} 步,继续帮我做完。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'progress', label: 'progress', value: '已做 N 步' }] },
      { id: 'cooking_during_waiting_step', title: '等待步骤中并行做其他', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '{{菜名}}正在炖,我能去干别的吗？', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'step_type', label: 'step_type', value: '等待型(炖/烤/腌)' }] },
    ] },
  ] },
  { id: 'view', icon: '👀', label: '查看', subgroups: [
    { id: '查看食谱', label: '查看食谱', scenes: [
      { id: 'view_full_recipe', title: '完整食谱', wake_word: '查看食谱', types: ['查看'], status: '', prompt_template: '看看{{菜名}}怎么做。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }] },
      { id: 'view_for_beginner', title: '新手强调(关键成功点)', wake_word: '查看食谱', types: ['查看'], status: '', prompt_template: '我是新手,{{菜名}}的关键点是什么？', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'user_state', label: 'user_state', value: '新手' }] },
      { id: 'view_recipe_with_substitution', title: '替换食材预览(临时假设)', wake_word: '查看食谱', types: ['查看', '选择'], status: '', prompt_template: '{{菜名}}里没有 X,能用 Y 代替吗？', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'ingredient_swap', label: 'ingredient_swap', value: '替换某食材' }] },
    ] },
    { id: '查看食材', label: '查看食材', scenes: [
      { id: 'view_ingredients_only', title: '只看食材', wake_word: '查看食材', types: ['查看'], status: '', prompt_template: '{{菜名}}需要哪些食材？', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'focus', label: 'focus', value: '食材' }] },
      { id: 'view_ingredients_grouped', title: '食材分组(11 大类)', wake_word: '查看食材', types: ['查看'], status: '', prompt_template: '{{菜名}}的食材按肉/菜/调料分组给我。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'group_by', label: 'group_by', value: '分类' }] },
    ] },
    { id: '查看步骤', label: '查看步骤', scenes: [
      { id: 'view_steps_only', title: '只看步骤', wake_word: '查看步骤', types: ['查看'], status: '', prompt_template: '{{菜名}}怎么做？详细步骤。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'focus', label: 'focus', value: '步骤' }] },
    ] },
    { id: '查看营养', label: '查看营养', scenes: [
      { id: 'view_nutrition_only', title: '只看营养', wake_word: '查看营养', types: ['查看'], status: '', prompt_template: '{{菜名}}的热量和蛋白质多少？', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'focus', label: 'focus', value: '营养' }] },
    ] },
    { id: '查看背景', label: '查看背景', scenes: [
      { id: 'view_background_only', title: '只看背景文化', wake_word: '查看背景', types: ['查看'], status: '', prompt_template: '{{菜名}}有什么历史典故？', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'focus', label: 'focus', value: '背景' }] },
    ] },
  ] },
  { id: 'search', icon: '🔍', label: '搜索筛选', subgroups: [
    { id: '搜索食谱', label: '搜索食谱', scenes: [
      { id: 'search_by_name_keyword', title: '关键词搜索(菜名/食材)', wake_word: '搜索食谱', types: ['查看'], status: '', prompt_template: '搜索排骨。', editable_fields: [{ name: 'keyword', label: 'keyword', value: '菜名片段' }] },
      { id: 'search_fuzzy_match', title: '错字模糊匹配(纠错提示)', wake_word: '搜索食谱', types: ['查看'], status: '', prompt_template: '搜索宫暴鸡丁(应为宫保)。', editable_fields: [{ name: 'keyword', label: 'keyword', value: '错字/谐音' }] },
    ] },
    { id: '筛选菜系', label: '筛选菜系', scenes: [
      { id: 'filter_cuisine_basic', title: '按菜系筛选', wake_word: '筛选菜系', types: ['查看'], status: '', prompt_template: '川菜有哪些？', editable_fields: [{ name: 'cuisine', label: 'cuisine', value: '川/粤/湘等' }] },
      { id: 'filter_combined', title: '多维组合筛选(≤3 维)', wake_word: '筛选菜系', types: ['查看'], status: '', prompt_template: '川菜里 30 分钟内能搞定的。', editable_fields: [{ name: 'cuisine', label: 'cuisine', value: '川' }, { name: 'time_max', label: 'time_max', value: '30 分钟' }, { name: 'extra', label: 'extra', value: '可加第 3 维' }] },
    ] },
    { id: '筛选食材', label: '筛选食材', scenes: [
      { id: 'filter_by_ingredient_basic', title: '按食材筛选', wake_word: '筛选食材', types: ['查看'], status: '', prompt_template: '哪些菜里有虾。', editable_fields: [{ name: 'ingredient', label: 'ingredient', value: '具体食材名' }] },
      { id: 'filter_exclude_ingredient', title: '排除食材(忌口)', wake_word: '筛选食材', types: ['查看'], status: '', prompt_template: '不吃辣,有什么菜？', editable_fields: [{ name: 'ingredient_exclude', label: 'ingredient_exclude', value: '不吃某食材' }] },
    ] },
    { id: '筛选难度', label: '筛选难度', scenes: [
      { id: 'filter_difficulty_easy', title: '按难度筛选', wake_word: '筛选难度', types: ['查看'], status: '【待开发】', prompt_template: '来个简单的。', editable_fields: [{ name: 'difficulty', label: 'difficulty', value: '简单/快手菜' }] },
    ] },
    { id: '筛选时间', label: '筛选时间', scenes: [
      { id: 'filter_time_quick', title: '按时间筛选(30 分钟内)', wake_word: '筛选时间', types: ['查看'], status: '【待开发】', prompt_template: '30 分钟内的菜。', editable_fields: [{ name: 'time_max', label: 'time_max', value: '30 分钟' }] },
    ] },
    { id: '筛选炊具', label: '筛选炊具', scenes: [
      { id: 'filter_by_cookware', title: '按炊具筛选', wake_word: '筛选炊具', types: ['查看'], status: '【待开发】', prompt_template: '用砂锅做的菜。', editable_fields: [{ name: 'cookware', label: 'cookware', value: '砂锅/高压锅等' }] },
    ] },
    { id: '筛选口味', label: '筛选口味', scenes: [
      { id: 'filter_by_flavor', title: '按口味筛选', wake_word: '筛选口味', types: ['查看'], status: '', prompt_template: '辣的菜有哪些。', editable_fields: [{ name: 'flavor', label: 'flavor', value: '辣/甜/鲜等' }] },
    ] },
    { id: '筛选季节', label: '筛选季节', scenes: [
      { id: 'filter_by_season', title: '按季节筛选', wake_word: '筛选季节', types: ['查看'], status: '', prompt_template: '夏天适合吃什么。', editable_fields: [{ name: 'season', label: 'season', value: '春/夏/秋/冬' }] },
    ] },
    { id: '筛选状态', label: '筛选状态', scenes: [
      { id: 'filter_by_status', title: '按状态筛选', wake_word: '筛选状态', types: ['查看'], status: '【待开发】', prompt_template: '已做的菜。', editable_fields: [{ name: 'status', label: 'status', value: '未做/已做/熟练/已废弃' }] },
    ] },
    { id: '查看全部', label: '查看全部', scenes: [
      { id: 'list_all_recipes', title: '列出所有食谱', wake_word: '查看全部', types: ['查看'], status: '', prompt_template: '查看全部。' },
    ] },
  ] },
  { id: 'update', icon: '✏️', label: '修改', subgroups: [
    { id: '修改食谱', label: '修改食谱', scenes: [
      { id: 'update_main_fields', title: '修改食谱主信息', wake_word: '修改食谱', types: ['对比', '确认', '回执'], status: '', prompt_template: '请加载「私家大厨」技能,帮我修改食谱(唤醒词:修改食谱):\n菜  名: _____________\n要改什么: _____________ (如: 难度改简单 / 份量改 4 人份 / 总时间改 30 分钟)', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'field', label: 'field', value: '目标字段(描述/难度/份量/总时间/状态/图/来源/来源链接,可多个)' }, { name: 'new_value', label: 'new_value', value: '新值(用户提供)' }] },
    ] },
    { id: '修改步骤', label: '修改步骤', scenes: [
      { id: 'update_step_content', title: '修改步骤(内容/重排)', wake_word: '修改步骤', types: ['对比', '确认', '回执'], status: '【待开发】', prompt_template: '请加载「私家大厨」技能,帮我修改步骤(唤醒词:修改步骤):\n菜  名: _____________\n改哪个步骤: _____________ (如: 第 2 步)\n改成什么: _____________ (内容,或「把第 2 步和第 3 步换一下」)', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'step', label: 'step', value: '目标步骤(第 N 步)' }, { name: 'action', label: 'action', value: '改内容 / 重排顺序' }] },
    ] },
    { id: '修改食材', label: '修改食材', scenes: [
      { id: 'update_ingredient', title: '修改食材(用量/添加/关联步骤)', wake_word: '修改食材', types: ['对比', '确认', '回执'], status: '【待开发】', prompt_template: '请加载「私家大厨」技能,帮我修改食材(唤醒词:修改食材):\n菜  名: _____________\n改什么食材: _____________ (如: 虾仁用量改 300g / 加一味生抽 / 生抽关联到第 2 步)', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'ingredient', label: 'ingredient', value: '目标食材' }, { name: 'action', label: 'action', value: '改用量 / 添加食材 / 关联步骤' }] },
    ] },
    { id: '废弃食谱', label: '废弃食谱', scenes: [
      { id: 'discard_recipe', title: '废弃食谱(只增不删)', wake_word: '废弃食谱', types: ['确认', '回执'], status: '', prompt_template: '请加载「私家大厨」技能,帮我废弃食谱(唤醒词:废弃食谱):\n菜  名: _____________', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'confirm', label: 'confirm', value: '确认废弃(口语词「删掉/不要/废弃」经 AI 确认后执行)' }] },
    ] },
  ] },
  { id: 'history', icon: '📜', label: '历史', subgroups: [
    { id: '记录做菜', label: '记录做菜', scenes: [
      { id: 'record_cook', title: '记录做菜(完整 + 快速 + 补录)', wake_word: '记录做菜', types: ['采集', '回执'], status: '', prompt_template: '请加载「私家大厨」技能,帮我记录做菜(唤醒词:记录做菜):\n菜  名: _____________\n评  分: _____________ (选填,0-5 可带小数)\n反  馈: _____________ (必填,一句话真实反馈,如「虾很Q弹,下次少放盐」)\n日  期: _____________ (选填,补录填昨天日期,默认今天)', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }, { name: 'rating', label: 'rating', value: '评分(0-5,可小数,选填)' }, { name: 'feedback', label: 'feedback', value: '一句话反馈(必填真实内容,禁「无」占位)' }, { name: 'backdate', label: 'backdate', value: '补录日期(选填,默认今天,YYYY-MM-DD)' }] },
    ] },
    { id: '查看历史', label: '查看历史', scenes: [
      { id: 'view_history_list', title: '历史时间线', wake_word: '查看历史', types: ['查看'], status: '', prompt_template: '看看{{菜名}}的烹饪历史。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }] },
    ] },
    { id: '查看统计', label: '查看统计', scenes: [
      { id: 'view_stats_dashboard', title: '单菜统计', wake_word: '查看统计', types: ['查看'], status: '', prompt_template: '{{菜名}}的平均评分是多少?做过几次?', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }] },
      { id: 'view_stats_global', title: '全局统计(整体画像)', wake_word: '查看统计', types: ['查看'], status: '', prompt_template: '帮我看看我最近的厨艺整体情况。', editable_fields: [{ name: 'scope', label: 'scope', value: '全部食谱' }] },
    ] },
  ] },
  { id: 'shopping', icon: '🛒', label: '采购', subgroups: [
    { id: '生成清单', label: '生成清单', scenes: [
      { id: 'shopping_generate', title: '生成采购清单', wake_word: '生成清单', types: ['查看', '勾选'], status: '', prompt_template: '请加载「私家大厨」技能,帮我生成采购清单(唤醒词:生成清单):\n菜  名: _____________ (1 个或多个,如: 宫保虾球,辣炒虾球)\n份  数: _____________ (选填,如 2 表示双份;多菜可用 2,1 分别指定)\n排除可选: _____________ (选填,填「排除」则不含可选食材)\n核对家里库存: _____________ (选填,默认核对;不需要填「不核对」;核对由 AI 联动「居家管家」查询,你无需操作)', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名(可多个,逗号/和/顿号分隔)' }, { name: 'servings', label: 'servings', value: '份数倍数(选填,默认 1;不同菜可不同)' }, { name: 'exclude_optional', label: 'exclude_optional', value: '排除可选食材(选填,默认不排除)' }, { name: 'stock_check', label: 'stock_check', value: '是否核对居家管家库存(选填,默认核对)' }] },
    ] },
  ] },
  { id: 'add', icon: '📝', label: '录入', subgroups: [
    { id: '录入食谱', label: '录入食谱', scenes: [
      { id: 'add_from_image', title: '图片录入(识别图片)', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '[发送图片] 录入这道菜。', editable_fields: [{ name: 'input', label: 'input', value: '图片' }] },
      { id: 'add_from_markdown', title: 'MD 文件录入', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '[发送 MD 文件] 录入。', editable_fields: [{ name: 'input', label: 'input', value: 'MD 文件' }] },
      { id: 'add_from_conversation', title: '对话录入(逐步收集)', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '请加载「私家大厨」技能,帮我录入一道新菜(唤醒词:录入食谱):', editable_fields: [{ name: 'input', label: 'input', value: '对话逐步补充' }] },
      { id: 'add_from_template', title: '结构化模板录入(表单)', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '用表单方式录入这道菜。', editable_fields: [{ name: 'input', label: 'input', value: '表单' }] },
    ] },
    { id: '导入食谱', label: '导入食谱', scenes: [
      { id: 'import_from_json', title: 'JSON 文件导入', wake_word: '导入食谱', types: ['采集', '回执'], status: '【待开发】', prompt_template: '导入食谱 [JSON 文件]。', editable_fields: [{ name: 'input', label: 'input', value: 'JSON 文件' }] },
      { id: 'import_validation_failed', title: '导入校验失败(补齐后重试)', wake_word: '导入食谱', types: ['采集', '回执'], status: '【待开发】', prompt_template: '导入这个 JSON。', editable_fields: [{ name: 'input', label: 'input', value: 'JSON 有缺字段' }] },
    ] },
  ] },
  { id: 'relation', icon: '🌿', label: '派生', subgroups: [
    { id: '添加派生关系', label: '添加派生关系', scenes: [
      { id: 'add_relation', title: '添加派生关系', wake_word: '添加派生关系', types: ['采集', '确认', '回执'], status: '【待开发】', prompt_template: '请加载「私家大厨」技能,帮我添加派生关系(唤醒词:添加派生关系):\n子  菜: _____________ (如: 宫保虾球)\n父  菜: _____________ (如: 宫保鸡丁)\n关系类型: _____________ (派生 / 变体 / 改良)\n改动说明: _____________ (必填,如「鸡丁换虾球,减辣」)', editable_fields: [{ name: 'child', label: 'child', value: '子菜(派生出的菜)' }, { name: 'parent', label: 'parent', value: '父菜(派生自的菜)' }, { name: 'relation_type', label: 'relation_type', value: '关系类型(派生/变体/改良)' }, { name: 'change_summary', label: 'change_summary', value: '改动说明(必填)' }] },
    ] },
    { id: '查看派生关系', label: '查看派生关系', scenes: [
      { id: 'view_relation_tree', title: '查看派生关系(家族树)', wake_word: '查看派生关系', types: ['查看'], status: '【待开发】', prompt_template: '看看{{菜名}}的家族关系。', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名' }] },
    ] },
    { id: '从已有派生新菜', label: '从已有派生新菜', scenes: [
      { id: 'derive_from_existing', title: '从已有派生新菜', wake_word: '从已有派生新菜', types: ['采集', '确认', '回执'], status: '【待开发】', prompt_template: '请加载「私家大厨」技能,帮我从已有菜谱派生新菜(唤醒词:从已有派生新菜):\n母  本: _____________ (如: 咖喱牛腩)\n新菜名: _____________ (如: 咖喱鸡)\n差  异: _____________ (如: 牛腩换鸡,咖喱少放,加椰浆)', editable_fields: [{ name: 'source', label: 'source', value: '母本菜(从它派生)' }, { name: 'target', label: 'target', value: '新菜名' }, { name: 'differences', label: 'differences', value: '差异描述(用户语言,AI 预填)' }] },
    ] },
  ] },
  { id: 'setup', icon: '🚀', label: '开始使用', subgroups: [
    { id: '首次使用', label: '首次使用', scenes: [
      { id: 'first_use', title: '首次使用(初始化工作流)', wake_word: '首次使用', types: ['向导', '回执'], status: '【待开发】', prompt_template: '请加载「私家大厨」技能,帮我完成首次使用初始化(唤醒词:首次使用):' },
    ] },
  ] },
  { id: 'data', icon: '🗄️', label: '数据管理', subgroups: [
    { id: '体检', label: '体检', scenes: [
      { id: 'data_quality_report', title: '数据质量报告', wake_word: '体检', types: ['查看'], status: '', prompt_template: '请加载「私家大厨」技能,帮我做一次菜谱库体检(唤醒词:体检):\n范  围: _____________ (选填,默认全部食谱)', editable_fields: [{ name: 'scope', label: 'scope', value: '全部食谱' }] },
    ] },
    { id: '批量改', label: '批量改', scenes: [
      { id: 'data_batch_edit', title: '批量编辑', wake_word: '批量改', types: ['采集', '确认', '回执'], status: '【待开发】', prompt_template: '请加载「私家大厨」技能,帮我批量编辑菜谱(唤醒词:批量改):\n菜  名: _____________ (如: 宫保虾球)\n改哪个部分: _____________ (食材 / 步骤 / 标签)', editable_fields: [{ name: 'recipe', label: 'recipe', value: '指定菜名(单菜多字段)' }, { name: 'tab', label: 'tab', value: '食材 / 步骤 / 标签' }] },
    ] },
    { id: '备份', label: '备份', scenes: [
      { id: 'data_export_backup', title: '导出备份', wake_word: '备份', types: ['转移'], status: '【待开发】', prompt_template: '请加载「私家大厨」技能,帮我备份菜谱库(唤醒词:备份):\n范  围: _____________ (选填,默认全部;要含已废弃的填「含废弃」)', editable_fields: [{ name: 'scope', label: 'scope', value: '全部食谱' }, { name: 'include_archived', label: 'include_archived', value: '是否含已废弃(选填', hint: '是否含已废弃(选填，默认不含)' }] },
    ] },
  ] },
];

/** 全量 `SceneData`（`base-paint` 的 `spec/help.ts` 契约形状；`subtitle`／`contact` 归装配层 #214）。 */
export function buildChefSceneData(): SceneData {
  return {
    skill_name: '私家大厨',
    title: '私家大厨 HELP · 能力速查',
    version: '0.1.0',
    groups: CHEF_SCENES,
  };
}
