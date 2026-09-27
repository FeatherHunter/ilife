/** #213 · 私家大厨 HELP 内容资产：老骨架 48 卡 → 10 域／33 组／48 卡的 typed const。
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-chef/scripts/gen-help-assets.mjs` 产出。
 *    改内容＝改生成器里的声明表（十域表／组→域归属表／字段映射），再跑
 *    `node packages/skill-chef/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（全程只读）：
 *   ① 老技能 HELP 载荷 `.scratch/chef-help/legacy-chef-help-payload.json`（74,581 B）；**以 `$.scenarios[]` 为准**——
 *      载荷把同一批 48 条输出了两遍（`$.wake_words[].scenarios[]` 是第二遍视图，48/48 逐字相同），两遍不相加；
 *   ② `src/policy/wakewords.ts` 的 `WAKE_TABLE`（50 条 phrase，下标 1..50）：唤醒词单一事实源，
 *      本件的 chip 路由与 48 张卡的 status 从它**派生**（`资产组名 − 表内 phrase`），不落第二份字面量。
 *      双向对账：表 50 ↔ 资产 33 组名；资产有表中无 ＝ 0 个组名（13 个老组名 #841 起已入表 ⇒ 48 张卡全可用）；
 *      表中有资产无 ＝ 17 条（4 条 HELP 自身触发词 ＋ 13 条新表多出词——后者见 t2 §3.1／§5.1，
 *      本票资产按老骨架保持 48 卡、不含它们）；
 *   ③ `docs/skills/skill-chef/t2-content-reconcile.md` §七 的 JSON 草案：形状起点，生成器已逐组／逐卡交叉复核。
 * 摘要锁：载荷文件 sha256＝c09f11d9ffa49e6b14c2ade094b5ab428f22fd440b2608442166e470db47d2ab
 *           老 48 条 sha256＝620653ed98c85acbeaf0ab646adf0ef48345f4d65d218a8d756f59f86757ae55
 *           映射后 48 条 sha256＝0c5a63dcfe59e4a1ca0729b2f064358b379e0dcf82091e7888edb2c6b2f2899a
 *
 * 与老骨架的**有意偏离**（四类，逐条对账见生成器头注释与 t2 §七）：
 *   1. `type`（单数、11 种字符串）→ `types`（复数数组）：按 `+` 拆、去 `(过程型)` 这类括号注；
 *   2. `dimensions`（42 键／80 条）→ `editable_fields`：键→`name`／`label`（逐字，不自造中文名），老值原文→`value`；
 *      **丢弃 1 条**＝`data_export_backup` 的畸形键 `默认不含)`（值为 `null`，过不了 `value: string`）；
 *      同卡 `include_archived` 照 t2 丁类定案补 `hint`（「是否含已废弃(选填，默认不含)」）；
 *   3. `status`：老件 48/48 空串是老家缺陷，不照抄；#213 首版把 13 个不在 `WAKE_TABLE` 的老组名下
 *      **14 张卡**标 `'【待开发】'`，#841 起那些组名已入表 ⇒ **48/48 全空串**（卡面不出「待开发」徽章）；
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
      { id: 'cooking_start_fresh', title: '做菜·按步骤从头做', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「做菜模式」。\n\n我想按步骤做一道菜,请带我一步一步完成。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想做的菜名。', required: true, kind: 'text' }] },
      { id: 'cooking_start_with_history', title: '做菜·带上次经验再做一次', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「做菜模式」。\n\n上次做得不错,我想再做一次并改进,请带我按步骤完成。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想再做的菜名。', required: true, kind: 'text' }] },
      { id: 'cooking_start_double_servings', title: '做菜·做双份', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「做菜模式」。\n\n今晚来客人,我想做双份,请按份量带我一步一步完成。\n菜名:{{recipe}}\n份数:{{servings}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想做的菜名。', required: true, kind: 'text' }, { name: 'servings', label: '份数', value: '', hint: '单位份,只收纯数字,如2。', required: true, kind: 'number', min: 1, max: 20, step: 1 }] },
      { id: 'cooking_resume_after_pause', title: '做菜·从中断处继续', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「做菜模式」。\n\n我刚才做到一半,请从我停下的那一步继续带我做完。\n菜名:{{recipe}}\n已做到第几步:{{step}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写做到一半的菜名。', required: true, kind: 'text' }, { name: 'step', label: '已做到第几步', value: '', hint: '从1起纯数字,如3,表示已完成的步数。', required: true, kind: 'number', min: 1, step: 1 }] },
      { id: 'cooking_during_waiting_step', title: '做菜·等待时能否做别的', wake_word: '做菜模式', types: ['向导', '选择', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「做菜模式」。\n\n这道菜正在炖,我想知道能不能去干别的,请告诉我。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写正在做的菜名。', required: true, kind: 'text' }] },
    ] },
  ] },
  { id: 'view', icon: '👀', label: '查看', subgroups: [
    { id: '查看食谱', label: '查看食谱', scenes: [
      { id: 'view_full_recipe', title: '看菜谱·看完整做法', wake_word: '查看食谱', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看食谱」。\n\n我想看这道菜的完整做法。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想看的菜名。', required: true, kind: 'text' }] },
      { id: 'view_for_beginner', title: '看菜谱·新手关键点', wake_word: '查看食谱', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看食谱」。\n\n我是新手,请讲这道菜的关键点和易错处。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想学的菜名。', required: true, kind: 'text' }] },
      { id: 'view_recipe_with_substitution', title: '看菜谱·食材替换问法', wake_word: '查看食谱', types: ['查看', '选择'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看食谱」。\n\n这道菜缺一味料,我想问能不能用别的代替。\n菜名:{{recipe}}\n替换问法:{{ingredient_swap}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写缺料的菜名。', required: true, kind: 'text' }, { name: 'ingredient_swap', label: '替换问法', value: '', hint: '如没有鸡丁用虾球代替,写手头的料和想问的替换。', required: true, kind: 'text' }] },
    ] },
    { id: '查看食材', label: '查看食材', scenes: [
      { id: 'view_ingredients_only', title: '看食材·只看用料', wake_word: '查看食材', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看食材」。\n\n我想只看这道菜需要哪些用料。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想看用料的菜名。', required: true, kind: 'text' }] },
      { id: 'view_ingredients_grouped', title: '看食材·按类别分组看', wake_word: '查看食材', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看食材」。\n\n请把这道菜的食材按肉菜调料分组给我。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想分组看的菜名。', required: true, kind: 'text' }] },
    ] },
    { id: '查看步骤', label: '查看步骤', scenes: [
      { id: 'view_steps_only', title: '看步骤·只看做法步骤', wake_word: '查看步骤', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看步骤」。\n\n我想只看这道菜的详细步骤。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想看步骤的菜名。', required: true, kind: 'text' }] },
    ] },
    { id: '查看营养', label: '查看营养', scenes: [
      { id: 'view_nutrition_only', title: '看营养·只看热量蛋白', wake_word: '查看营养', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看营养」。\n\n我想只看这道菜的热量和蛋白质。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想看营养的菜名。', required: true, kind: 'text' }] },
    ] },
    { id: '查看背景', label: '查看背景', scenes: [
      { id: 'view_background_only', title: '看背景·只看典故来历', wake_word: '查看背景', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看背景」。\n\n我想知道这道菜有什么历史典故。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想知道来历的菜名。', required: true, kind: 'text' }] },
    ] },
  ] },
  { id: 'search', icon: '🔍', label: '搜索筛选', subgroups: [
    { id: '搜索食谱', label: '搜索食谱', scenes: [
      { id: 'search_by_name_keyword', title: '搜菜·按关键词搜', wake_word: '搜索食谱', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「搜索食谱」。\n\n我想按关键词找菜。\n关键词:{{keyword}}', editable_fields: [{ name: 'keyword', label: '关键词', value: '', hint: '如排骨,可写菜名或食材片段。', required: true, kind: 'text' }] },
      { id: 'search_fuzzy_match', title: '搜菜·错字也能搜', wake_word: '搜索食谱', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「搜索食谱」。\n\n我可能记错字了,请模糊帮我找到对的菜。\n关键词:{{keyword}}', editable_fields: [{ name: 'keyword', label: '关键词', value: '', hint: '如宫保鸡丁,可写错字或谐音。', required: true, kind: 'text' }] },
    ] },
    { id: '筛选菜系', label: '筛选菜系', scenes: [
      { id: 'filter_cuisine_basic', title: '筛选·按菜系选', wake_word: '筛选菜系', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选菜系」。\n\n我想按菜系找菜。\n菜系:{{cuisine}}', editable_fields: [{ name: 'cuisine', label: '菜系', value: '', hint: '如川菜,可写具体菜系名。', required: true, kind: 'text' }] },
      { id: 'filter_combined', title: '筛选·菜系加时间组合选', wake_word: '筛选菜系', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选菜系」。\n\n我想按菜系和时间组合找菜。\n菜系:{{cuisine}}\n最长时间:{{time_max}}', editable_fields: [{ name: 'cuisine', label: '菜系', value: '', hint: '如川菜,可写具体菜系名。', required: true, kind: 'text' }, { name: 'time_max', label: '最长时间', value: '', hint: '单位分钟,只收纯数字,如30。', required: true, kind: 'number', min: 1, max: 300, step: 1 }] },
    ] },
    { id: '筛选食材', label: '筛选食材', scenes: [
      { id: 'filter_by_ingredient_basic', title: '筛选·按食材选', wake_word: '筛选食材', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选食材」。\n\n我想找含某种食材的菜。\n食材:{{ingredient}}', editable_fields: [{ name: 'ingredient', label: '食材', value: '', hint: '如虾,写具体食材名。', required: true, kind: 'text' }] },
      { id: 'filter_exclude_ingredient', title: '筛选·排除忌口食材', wake_word: '筛选食材', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选食材」。\n\n我有忌口,请帮我排除相关食材再推荐。\n排除食材:{{ingredient_exclude}}', editable_fields: [{ name: 'ingredient_exclude', label: '排除食材', value: '', hint: '如辣,写不想吃的食材名。', required: true, kind: 'text' }] },
    ] },
    { id: '筛选难度', label: '筛选难度', scenes: [
      { id: 'filter_difficulty_easy', title: '筛选·按难度选', wake_word: '筛选难度', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选难度」。\n\n我想按难度找菜。\n难度:{{difficulty}}', editable_fields: [{ name: 'difficulty', label: '难度', value: '', hint: '如简单,可写简单或快手菜等难度词。', required: true, kind: 'text' }] },
    ] },
    { id: '筛选时间', label: '筛选时间', scenes: [
      { id: 'filter_time_quick', title: '筛选·按用时选', wake_word: '筛选时间', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选时间」。\n\n我想找短时间内能搞定的菜。\n最长时间:{{time_max}}', editable_fields: [{ name: 'time_max', label: '最长时间', value: '', hint: '单位分钟,只收纯数字,如30。', required: true, kind: 'number', min: 1, max: 300, step: 1 }] },
    ] },
    { id: '筛选炊具', label: '筛选炊具', scenes: [
      { id: 'filter_by_cookware', title: '筛选·按炊具选', wake_word: '筛选炊具', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选炊具」。\n\n我想按家里炊具找菜。\n炊具:{{cookware}}', editable_fields: [{ name: 'cookware', label: '炊具', value: '', hint: '如砂锅,可写具体炊具名。', required: true, kind: 'text' }] },
    ] },
    { id: '筛选口味', label: '筛选口味', scenes: [
      { id: 'filter_by_flavor', title: '筛选·按口味选', wake_word: '筛选口味', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选口味」。\n\n我想按口味找菜。\n口味:{{flavor}}', editable_fields: [{ name: 'flavor', label: '口味', value: '', hint: '如辣,可写具体口味词。', required: true, kind: 'text' }] },
    ] },
    { id: '筛选季节', label: '筛选季节', scenes: [
      { id: 'filter_by_season', title: '筛选·按季节选', wake_word: '筛选季节', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选季节」。\n\n我想按季节找合适的菜。\n季节:{{season}}', editable_fields: [{ name: 'season', label: '季节', value: '', hint: '必选一项,如夏天选夏。', required: true, kind: 'select', options: ['春', '夏', '秋', '冬'] }] },
    ] },
    { id: '筛选状态', label: '筛选状态', scenes: [
      { id: 'filter_by_status', title: '筛选·按练习状态选', wake_word: '筛选状态', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「筛选状态」。\n\n我想按练习状态找菜。\n状态:{{status}}', editable_fields: [{ name: 'status', label: '状态', value: '', hint: '必选一项,如已做。', required: true, kind: 'select', options: ['未做', '已做', '熟练', '已废弃'] }] },
    ] },
    { id: '查看全部', label: '查看全部', scenes: [
      { id: 'list_all_recipes', title: '看全部·列出所有菜', wake_word: '查看全部', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看全部」。\n\n我想列出所有食谱看看。' },
    ] },
  ] },
  { id: 'update', icon: '✏️', label: '修改', subgroups: [
    { id: '修改食谱', label: '修改食谱', scenes: [
      { id: 'update_main_fields', title: '改菜谱·改主要信息', wake_word: '修改食谱', types: ['对比', '确认', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「修改食谱」。\n\n我想改这道菜的主要信息,请先给我看改前和待写内容,确认后再写入。\n菜名:{{recipe}}\n改什么:{{field}}\n改成什么:{{new_value}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保虾球,写要改的菜名。', required: true, kind: 'text' }, { name: 'field', label: '改什么', value: '', hint: '如难度改简单,可写难度或份量等多项。', required: true, kind: 'text' }, { name: 'new_value', label: '改成什么', value: '', hint: '如4人份,写改后的新值内容。', required: true, kind: 'text' }] },
    ] },
    { id: '修改步骤', label: '修改步骤', scenes: [
      { id: 'update_step_content', title: '改步骤·改内容或顺序', wake_word: '修改步骤', types: ['对比', '确认', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「修改步骤」。\n\n我想改这道菜的某个步骤,请先给我看改前和待写内容,确认后再写入。\n菜名:{{recipe}}\n第几步:{{step}}\n改法:{{action}}\n新内容:{{new_content}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保虾球,写要改的菜名。', required: true, kind: 'text' }, { name: 'step', label: '第几步', value: '', hint: '从1起纯数字,如2,表示要改的步骤。', required: true, kind: 'number', min: 1, step: 1 }, { name: 'action', label: '改法', value: '', hint: '必选一项，如改内容。', required: true, kind: 'select', options: ['改内容', '重排顺序'] }, { name: 'new_content', label: '新内容', value: '', hint: '如具体新做法,写完整的新步骤内容或重排说明。', required: true, kind: 'text' }] },
    ] },
    { id: '修改食材', label: '修改食材', scenes: [
      { id: 'update_ingredient', title: '改食材·改用量或增减', wake_word: '修改食材', types: ['对比', '确认', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「修改食材」。\n\n我想改这道菜的食材,请先给我看改前和待写内容,确认后再写入。\n菜名:{{recipe}}\n食材:{{ingredient}}\n改法:{{action}}\n新内容:{{new_content}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保虾球,写要改的菜名。', required: true, kind: 'text' }, { name: 'ingredient', label: '食材', value: '', hint: '如虾仁,写要改的食材名。', required: true, kind: 'text' }, { name: 'action', label: '改法', value: '', hint: '必选一项，如改用量。', required: true, kind: 'select', options: ['改用量', '添加食材', '关联步骤'] }, { name: 'new_content', label: '新内容', value: '', hint: '如300克,写新的用量或新增内容。', required: true, kind: 'text' }] },
    ] },
    { id: '废弃食谱', label: '废弃食谱', scenes: [
      { id: 'discard_recipe', title: '废弃·废弃一道菜', wake_word: '废弃食谱', types: ['确认', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「废弃食谱」。\n\n我想废弃这道菜,请先告诉我这是哪一道,确认后再执行。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保虾球,写要废弃的菜名。', required: true, kind: 'text' }] },
    ] },
  ] },
  { id: 'history', icon: '📜', label: '历史', subgroups: [
    { id: '记录做菜', label: '记录做菜', scenes: [
      { id: 'record_cook', title: '记做菜·记一次下厨', wake_word: '记录做菜', types: ['采集', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「记录做菜」。\n\n我刚做完一道菜,请帮我记下来。\n菜名:{{recipe}}\n评分(选填):{{rating}}\n反馈:{{feedback}}\n日期(选填):{{backdate}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保虾球,写刚做过的菜名。', required: true, kind: 'text' }, { name: 'rating', label: '评分(选填)', value: '', hint: '0到5可带小数,空表示不评分,如4.5。', required: false, kind: 'number', min: 0, max: 5, step: 0.1 }, { name: 'feedback', label: '反馈', value: '', hint: '如虾很弹下次少放盐,写一句话真实反馈。', required: true, kind: 'text' }, { name: 'backdate', label: '日期(选填)', value: '', hint: '空等于今天；填了必须是YYYY-MM-DD，如2026-09-20。', required: false, kind: 'date' }] },
    ] },
    { id: '查看历史', label: '查看历史', scenes: [
      { id: 'view_history_list', title: '查历史·看下厨时间线', wake_word: '查看历史', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看历史」。\n\n我想看这道菜的烹饪历史。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想查的菜名。', required: true, kind: 'text' }] },
    ] },
    { id: '查看统计', label: '查看统计', scenes: [
      { id: 'view_stats_dashboard', title: '查统计·看单菜统计', wake_word: '查看统计', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看统计」。\n\n我想看这道菜的平均评分和做过几次。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想查的菜名。', required: true, kind: 'text' }] },
      { id: 'view_stats_global', title: '查统计·看整体情况', wake_word: '查看统计', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看统计」。\n\n我想看看我最近的厨艺整体情况。' },
    ] },
  ] },
  { id: 'shopping', icon: '🛒', label: '采购', subgroups: [
    { id: '生成清单', label: '生成清单', scenes: [
      { id: 'shopping_generate', title: '采购·生成采购清单', wake_word: '生成清单', types: ['查看', '勾选'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「生成清单」。\n\n我想按几道菜生成采购清单,需要时请联动居家管家帮我核对库存。\n菜名:{{recipe}}\n份数(选填):{{servings}}\n排除可选(选填):{{exclude_optional}}\n核对库存(选填):{{stock_check}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保虾球和辣炒虾球,多个用顿号或和分隔。', required: true, kind: 'text' }, { name: 'servings', label: '份数(选填)', value: '', hint: '空等于1份；单菜写纯数字如2，多菜写2,1。', required: false, kind: 'text' }, { name: 'exclude_optional', label: '排除可选(选填)', value: '', hint: '空等于不排除,必选一项,如不排除。', required: false, kind: 'select', options: ['排除', '不排除'] }, { name: 'stock_check', label: '核对库存(选填)', value: '', hint: '空等于核对,必选一项,如核对。', required: false, kind: 'select', options: ['核对', '不核对'] }] },
    ] },
  ] },
  { id: 'add', icon: '📝', label: '录入', subgroups: [
    { id: '录入食谱', label: '录入食谱', scenes: [
      { id: 'add_from_image', title: '录入·图片录入', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「录入食谱」。\n\n我发一张菜的图片,请帮我录入这道菜。' },
      { id: 'add_from_markdown', title: '录入·从文档录入', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「录入食谱」。\n\n我发一份文档,请帮我录入这道菜。' },
      { id: 'add_from_conversation', title: '录入·对话逐步录入', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「录入食谱」。\n\n我想对话录入一道新菜,请一步一步问我补齐。' },
      { id: 'add_from_template', title: '录入·按固定格式录入', wake_word: '录入食谱', types: ['采集', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「录入食谱」。\n\n我想按固定格式录入这道菜,请带我逐项填写。' },
    ] },
    { id: '导入食谱', label: '导入食谱', scenes: [
      { id: 'import_from_json', title: '导入·从文件导入', wake_word: '导入食谱', types: ['采集', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「导入食谱」。\n\n我发一份文件,请帮我导入食谱。' },
      { id: 'import_validation_failed', title: '导入·缺项补齐后重试', wake_word: '导入食谱', types: ['采集', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「导入食谱」。\n\n上次导入缺项,我已补齐,请帮我重新导入。' },
    ] },
  ] },
  { id: 'relation', icon: '🌿', label: '派生', subgroups: [
    { id: '添加派生关系', label: '添加派生关系', scenes: [
      { id: 'add_relation', title: '派生·添加两菜关系', wake_word: '添加派生关系', types: ['采集', '确认', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「添加派生关系」。\n\n我想记下两道菜的派生关系,请确认后再写入。\n子菜:{{child}}\n父菜:{{parent}}\n关系类型:{{relation_type}}\n改动说明:{{change_summary}}', editable_fields: [{ name: 'child', label: '子菜', value: '', hint: '如宫保虾球,写派生出的菜名。', required: true, kind: 'text' }, { name: 'parent', label: '父菜', value: '', hint: '如宫保鸡丁,写被派生的菜名。', required: true, kind: 'text' }, { name: 'relation_type', label: '关系类型', value: '', hint: '必选一项,如派生。', required: true, kind: 'select', options: ['派生', '变体', '改良'] }, { name: 'change_summary', label: '改动说明', value: '', hint: '如鸡丁换虾球减辣,写一句话改动。', required: true, kind: 'text' }] },
    ] },
    { id: '查看派生关系', label: '查看派生关系', scenes: [
      { id: 'view_relation_tree', title: '派生·看关联菜', wake_word: '查看派生关系', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「查看派生关系」。\n\n我想看看这道菜关联了哪些菜。\n菜名:{{recipe}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保鸡丁,写想查的菜名。', required: true, kind: 'text' }] },
    ] },
    { id: '从已有派生新菜', label: '从已有派生新菜', scenes: [
      { id: 'derive_from_existing', title: '派生·照着旧菜创新菜', wake_word: '从已有派生新菜', types: ['采集', '确认', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「从已有派生新菜」。\n\n我想照着一道旧菜派生新菜,请确认后再写入。\n母本菜:{{source}}\n新菜名:{{target}}\n差异:{{differences}}', editable_fields: [{ name: 'source', label: '母本菜', value: '', hint: '如咖喱牛腩,写被派生的旧菜名。', required: true, kind: 'text' }, { name: 'target', label: '新菜名', value: '', hint: '如咖喱鸡,写派生出的新菜名。', required: true, kind: 'text' }, { name: 'differences', label: '差异', value: '', hint: '如牛腩换鸡加椰浆,写与母本的不同。', required: true, kind: 'text' }] },
    ] },
  ] },
  { id: 'setup', icon: '🚀', label: '开始使用', subgroups: [
    { id: '首次使用', label: '首次使用', scenes: [
      { id: 'first_use', title: '开始·首次使用向导', wake_word: '首次使用', types: ['向导', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「首次使用」。\n\n我是第一次用,请带我完成初始化。' },
    ] },
  ] },
  { id: 'data', icon: '🗄️', label: '数据管理', subgroups: [
    { id: '体检', label: '体检', scenes: [
      { id: 'data_quality_report', title: '体检·查菜谱库问题', wake_word: '体检', types: ['查看'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「体检」。\n\n我想给菜谱库做一次体检,请告诉我问题和建议。\n范围(选填):{{scope}}', editable_fields: [{ name: 'scope', label: '范围(选填)', value: '', hint: '空等于全部食谱,可写指定菜名。', required: false, kind: 'text' }] },
    ] },
    { id: '批量改', label: '批量改', scenes: [
      { id: 'data_batch_edit', title: '批量改·改一菜多处', wake_word: '批量改', types: ['采集', '确认', '回执'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「批量改」。\n\n我想批量改一道菜,请先给我看改前和待写内容,确认后再写入。\n菜名:{{recipe}}\n改哪个部分:{{tab}}\n新内容:{{new_content}}', editable_fields: [{ name: 'recipe', label: '菜名', value: '', hint: '如宫保虾球,写要改的菜名。', required: true, kind: 'text' }, { name: 'tab', label: '改哪个部分', value: '', hint: '必选一项,如食材。', required: true, kind: 'select', options: ['食材', '步骤', '标签'] }, { name: 'new_content', label: '新内容', value: '', hint: '如具体新内容,写改后的完整内容。', required: true, kind: 'text' }] },
    ] },
    { id: '备份', label: '备份', scenes: [
      { id: 'data_export_backup', title: '备份·导出整库备份', wake_word: '备份', types: ['转移'], status: '', prompt_template: '请你加载技能 私家大厨,执行唤醒词「备份」。\n\n我想备份菜谱库。\n范围(选填):{{scope}}\n含废弃(选填):{{include_archived}}', editable_fields: [{ name: 'scope', label: '范围(选填)', value: '', hint: '空等于全部食谱,可写指定菜名。', required: false, kind: 'text' }, { name: 'include_archived', label: '含废弃(选填)', value: '', hint: '空等于不含,必选一项,如不含。', required: false, kind: 'select', options: ['含废弃', '不含'] }] },
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
