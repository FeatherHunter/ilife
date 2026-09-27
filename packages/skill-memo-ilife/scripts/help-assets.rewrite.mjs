#!/usr/bin/env node
/** 备忘录 HELP 内容资产 · **#974 重写表**（30 场景的内容事实，唯一来源）。
 *
 * 为什么单列一件：本票把 30 场景的 `title`／`prompt_template`／`editable_fields` 从「老骨架逐字搬运＋清洗」
 * 换成「按规范逐句重写」，重写的那份内容就是资产的事实——它住本件，生成器只负责把它铺成 8 个域文件。
 *
 * 规则（第一性原理，逐条对齐卡路里标杆 `.scratch/help-prompt-rewrite/PROMPT-REWRITE.md`，
 * 口径以卡路里 #970 关闭后的真实终态为准，不以 8 卡标杆批为准）：
 *   1. 首行＝`请你加载技能 备忘录,执行唤醒词「<唤醒词>」。`——唤醒词本体逐字取自冻结词表，
 *      路由（`src/<域>/routes.ts`）与 `src/help/lookup.ts` 一行不动；
 *   2. `say`＝正文里那一句人话：只留唤醒词与参数行没说到的信息（流程、确认、联动、范围、顺序）。
 *      老骨架的 `请按以下格式填写你的参数:`／`期望效果:` 标签／`无需参数,直接发送。` 一律不写：
 *      前两者是页面代填的脚手架与复述，后者页面用控件有无表达。可以留空（纯壳卡）。
 *   3. 参数行＝`<标签>:{{<name>}}`，一行一参；标签＝字段 `label`；`required:false` 的标签带 `(选填)`；
 *   4. `kind` 闭集 `text/number/select/date/week`（缺省 `text`），`select` 必带非空 `options`；
 *      `number` 只收纯数字（单位住 `hint`）；`date` 归 ISO（`YYYY-MM-DD`）；`week` 暂无实例；
 *      老 dimensions 里的命令行开关（`true` 跳过二次确认／`bulk_indicator` 批量判定）与内部值
 *      （`reminder_id` 关联提醒）不立字段，语义改由 `say` 承载。
 *   5. 字段集＝参数行集：生成器逐场景断言「正文 `{{name}}` 集 ＝ 字段 `name` 集」，一一对应。
 *
 * 字段简写：`F(name, label, kind, required, hint, options?)`——`value` 一律空串（无预置值，
 * 相对默认词如「今天／昨天」只进 `hint`，不进 `value`）。
 */
const F = (name, label, kind, required, hint, options) => (
  options ? { name, label, kind, required, hint, options } : { name, label, kind, required, hint });

/** 正文人话句的包装：有 `say` 就单独成段（首行与参数行之间），没有就只省这一段。 */
function composePrompt(wakeWord, say, fields) {
  const lines = ['请你加载技能 备忘录,执行唤醒词「' + wakeWord + '」。'];
  if (say) lines.push('', say);
  if (fields.length) lines.push('', ...fields.map((f) => f.label + ':{{' + f.name + '}}'));
  return lines.join('\n');
}

/** 30 场景重写表：`id → { title, say, fields }`。`title`＝标题（与唤醒词一致，撞名时才区分）。 */
export const REWRITE = {
  /* ── 备忘类：基础记录 ─────────────────────────────────────────────── */
  memo_add_basic: {
    title: '记备忘',
    say: '记完告诉我这条笔记的 ID 和创建时间;分类选心愿时,会自动建好飞书任务。',
    fields: [
      F('content', '内容', 'text', true, '如 买牛奶'),
      F('category', '分类(选填)', 'select', false, '空＝备忘', ['备忘', '心愿', '打卡', '情绪日记']),
      F('sub_category', '子分类(选填)', 'text', false, '2 字,如 工作;没给就由我推断'),
      F('media', '附件(选填)', 'text', false, '图片/音频/视频的文件名,如 receipt.jpg'),
      F('due', '排期日期(选填)', 'date', false, '仅心愿生效;格式 YYYY-MM-DD'),
    ],
  },
  memo_update_basic: {
    title: '改备忘',
    say: '改完告诉我改成什么样了;分类是心愿时,飞书任务的标题会一起更新。',
    fields: [
      F('id', '笔记 ID', 'text', true, '数字,如 15'),
      F('content', '新内容(选填)', 'text', false, '改后的话'),
      F('category', '新分类(选填)', 'select', false, '空＝不改', ['备忘', '心愿', '打卡', '情绪日记']),
      F('sub_category', '新子分类(选填)', 'text', false, '2 字;空＝不改'),
    ],
  },
  memo_delete_basic: {
    title: '删备忘',
    say: '可以一次删多条,删完告诉我改动了几条;有关联提醒时,先告诉我再删。',
    fields: [
      F('id', '笔记 ID', 'text', true, '数字,可多个,空格分隔,如 15 18 22'),
    ],
  },
  /* ── 备忘类：分类调整 ─────────────────────────────────────────────── */
  memo_change_category_single: {
    title: '备忘改分类',
    say: '一次只改一条;只动顶层分类,子分类不动。',
    fields: [
      F('id', '笔记 ID', 'text', true, '数字,如 15'),
      F('category', '新分类', 'select', true, '', ['备忘', '心愿', '打卡', '情绪日记']),
    ],
  },
  memo_change_subcategory: {
    title: '备忘改子分类',
    say: '一次只改一条;所有分类的笔记都能改,新子分类留空就清除。',
    fields: [
      F('id', '笔记 ID', 'text', true, '数字,如 15'),
      F('sub_category', '新子分类(选填)', 'text', false, '2 字,如 工作;留空＝清除'),
    ],
  },
  memo_batch_change_category: {
    title: '批量改分类(网页向导)',
    say: '先出一份批量改分类向导页,你在页面上勾选并选好目标分类,采纳复制后我逐条改。子分类不动。',
    fields: [
      F('from_category', '原分类', 'select', true, '', ['备忘', '心愿', '打卡', '情绪日记']),
      F('to_category', '目标分类', 'select', true, '先给个建议值,页面上还能改', ['备忘', '心愿', '打卡', '情绪日记']),
    ],
  },
  /* ── 查找类：基础查找 ─────────────────────────────────────────────── */
  memo_search_keyword: {
    title: '搜备忘',
    say: '列出含关键词的所有笔记,并出一份可视化搜索结果页。',
    fields: [
      F('keyword', '关键词', 'text', true, '如 咖啡'),
      F('category', '分类(选填)', 'select', false, '空＝不限', ['备忘', '心愿', '打卡', '情绪日记']),
      F('sub_category', '子分类(选填)', 'text', false, '按子分类过滤;2 字'),
      F('due', '排期日期(选填)', 'date', false, '只看排在这一天的;格式 YYYY-MM-DD'),
    ],
  },
  memo_search_alias: {
    title: '查备忘',
    say: '搜含关键词的笔记,并出一份可视化结果页。',
    fields: [
      F('keyword', '关键词', 'text', true, '如 咖啡'),
    ],
  },
  memo_get_detail: {
    title: '看备忘',
    say: '把这条笔记的全部内容给我看,并出一份详情页。',
    fields: [
      F('id', '笔记 ID', 'text', true, '数字,如 15'),
    ],
  },
  /* ── 查找类：时间查找 ─────────────────────────────────────────────── */
  memo_search_by_date: {
    title: '按时间搜备忘',
    say: '列出这段时间里的所有笔记,按创建时间倒序。',
    fields: [
      F('start', '开始日期', 'date', true, '格式 YYYY-MM-DD,如 2026-07-01'),
      F('end', '结束日期', 'date', true, '格式 YYYY-MM-DD,如 2026-07-07'),
      F('category', '分类(选填)', 'select', false, '只看这个分类;空＝不限', ['备忘', '心愿', '打卡', '情绪日记']),
    ],
  },
  /* ── 查找类：分类查找 ─────────────────────────────────────────────── */
  memo_search_wish: {
    title: '查心愿',
    say: '自动按「心愿」分类过滤,列出结果。',
    fields: [
      F('keyword', '关键词(选填)', 'text', false, '如 游泳'),
      F('due', '排期日期(选填)', 'date', false, '只看排在这一天的;格式 YYYY-MM-DD'),
    ],
  },
  memo_search_checkin: {
    title: '查打卡',
    say: '自动按「打卡」分类过滤,列出结果。',
    fields: [
      F('keyword', '关键词(选填)', 'text', false, '如 跑步'),
    ],
  },
  memo_search_mood: {
    title: '查情绪',
    say: '自动按「情绪日记」分类过滤,列出结果。',
    fields: [
      F('keyword', '关键词(选填)', 'text', false, '如 加班'),
    ],
  },
  /* ── 提醒类 ──────────────────────────────────────────────────────── */
  memo_remind_with_note: {
    title: '记提醒',
    say: '先建好笔记,再挂上关联提醒,到点自动推送。',
    fields: [
      F('content', '笔记内容', 'text', true, '要提醒的事,如 取牛奶'),
      F('remind_at', '提醒时间', 'text', true, '格式 YYYY-MM-DD HH:MM,如 2026-07-25 09:00'),
      F('repeat_type', '重复类型(选填)', 'select', false, '空＝一次性', ['一次性', '每天', '每周', '每月', '每年']),
      F('repeat_rule', '重复规则(选填)', 'text', false, '每天 HH:MM;每周 周几 HH:MM;每月 几号 HH:MM;每年 MM-DD HH:MM'),
    ],
  },
  memo_remind_existing: {
    title: '设提醒',
    say: '不填笔记 ID 也可以,那就单独建一条提醒。',
    fields: [
      F('note_id', '笔记 ID(选填)', 'text', false, '数字,如 15'),
      F('remind_at', '提醒时间', 'text', true, '格式 YYYY-MM-DD HH:MM,如 2026-07-25 09:00'),
      F('content', '提醒内容(选填)', 'text', false, '如 该跑步了'),
      F('repeat_type', '重复类型(选填)', 'select', false, '空＝一次性', ['一次性', '每天', '每周', '每月', '每年']),
      F('repeat_rule', '重复规则(选填)', 'text', false, '每天 HH:MM;每周 周几 HH:MM;每月 几号 HH:MM;每年 MM-DD HH:MM'),
    ],
  },
  memo_reminders_active: {
    title: '看提醒',
    say: '按时间排序列出提醒,并出一份可筛选的可视化页。',
    fields: [
      F('status', '提醒状态(选填)', 'select', false, '空＝只看有效提醒',
        ['有效', { value: '已废弃', label: '已废弃(撤下提醒,笔记保留)' }]),
    ],
  },
  memo_completed_reminders: {
    title: '查已提醒备忘',
    say: '列出已触发的提醒、关联的打卡笔记和触发时间。',
    fields: [],
  },
  /* ── 心愿类 ──────────────────────────────────────────────────────── */
  memo_complete_wish: {
    title: '完成心愿',
    say: '把一个心愿转成打卡记录:原心愿删除,新打卡记下内容。多个心愿时,先出一份完成向导页,你在页面上勾选并填打卡内容。',
    fields: [
      F('ids', '心愿 ID', 'text', true, '数字,可多个,空格分隔,如 15 18 22'),
      F('content', '打卡内容(选填)', 'text', false, '空＝拷贝心愿原文'),
    ],
  },
  memo_wish_schedule: {
    title: '心愿排期',
    say: '排期日期会同步到飞书任务;多个心愿时,先出一份排期向导页(可带建议日期),你在页面上微调。',
    fields: [
      F('ids', '心愿 ID', 'text', true, '数字,可多个,空格分隔,如 15 18 22'),
      F('due', '排期日期', 'date', true, '期望完成日期;格式 YYYY-MM-DD,如 2026-07-30'),
    ],
  },
  memo_add_wish: {
    title: '记心愿',
    say: '自动建好对应的飞书任务并建立关联。',
    fields: [
      F('content', '内容', 'text', true, '如 想学游泳'),
      F('sub_category', '子分类(选填)', 'text', false, '2 字,如 学习'),
      F('due', '排期日期(选填)', 'date', false, '想哪天完成;格式 YYYY-MM-DD'),
      F('tasklist_guid', '飞书任务清单(选填)', 'text', false, '任务清单 ID;空＝我的任务'),
    ],
  },
  memo_delete_wish: {
    title: '删心愿',
    say: '它挂了飞书任务的话,会先把任务标完成;想连任务一起删掉,就说「彻底删除」。',
    fields: [
      F('id', '心愿 ID', 'text', true, '数字,如 15'),
    ],
  },
  memo_update_wish: {
    title: '改心愿',
    say: '飞书任务的标题会跟着一起更新。',
    fields: [
      F('id', '心愿 ID', 'text', true, '数字,如 15'),
      F('content', '新内容', 'text', true, '改后的话'),
    ],
  },
  /* ── 打卡类 ──────────────────────────────────────────────────────── */
  memo_add_checkin: {
    title: '记打卡',
    say: '',
    fields: [
      F('content', '内容', 'text', true, '打卡内容,如 跑了 5 公里'),
      F('sub_category', '子分类(选填)', 'text', false, '2 字,如 跑步'),
    ],
  },
  memo_delete_checkin: {
    title: '删打卡',
    say: '',
    fields: [
      F('id', '打卡 ID', 'text', true, '数字,如 20'),
    ],
  },
  memo_update_checkin: {
    title: '改打卡',
    say: '',
    fields: [
      F('id', '打卡 ID', 'text', true, '数字,如 20'),
      F('content', '新内容', 'text', true, '改后的话'),
    ],
  },
  /* ── 情绪类 ──────────────────────────────────────────────────────── */
  memo_add_mood: {
    title: '记情绪',
    say: '',
    fields: [
      F('content', '内容', 'text', true, '情绪内容,如 今天很开心'),
      F('sub_category', '子分类(选填)', 'text', false, '2 字,如 工作'),
    ],
  },
  memo_delete_mood: {
    title: '删情绪',
    say: '',
    fields: [
      F('id', '情绪日记 ID', 'text', true, '数字,如 25'),
    ],
  },
  memo_update_mood: {
    title: '改情绪',
    say: '',
    fields: [
      F('id', '情绪日记 ID', 'text', true, '数字,如 25'),
      F('content', '新内容', 'text', true, '改后的话'),
    ],
  },
  /* ── 同步类／初始化类（零参） ──────────────────────────────────────── */
  memo_sync_feishu: {
    title: '备忘录同步',
    say: '三步对账:本地缺飞书任务的心愿自动补建;飞书那边完成的,拉回本地标记完成;飞书那边改了日期的,本地跟着改。最后回执 11 项统计。',
    fields: [],
  },
  memo_init_setup: {
    title: '首次使用',
    say: '我是第一次用,请按步骤帮我把环境搭起来:检查并配置运行环境、数据存储(全文搜索)、飞书联动(未安装就引导我安装并授权)、配置项,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装、怎么配。完成后生成初始化报告页给我,并带我浏览一遍全部功能。',
    fields: [],
  },
};

/** 重写表 → 一条资产的三个字段（`title`／`prompt_template`／`editable_fields`）。
 *  `value` 一律空串：不预置值，相对默认词只进 `hint`（PROMPT-REWRITE §1）。 */
export function applyRewrite(scene, entry) {
  const fields = entry.fields.map((f) => ({
    name: f.name, label: f.label, value: '', hint: f.hint, required: f.required,
    kind: f.kind, ...(f.options ? { options: f.options } : {}),
  }));
  return { ...scene, title: entry.title, prompt_template: composePrompt(scene.wake_word, entry.say, entry.fields),
    ...(fields.length ? { editable_fields: fields } : {}) };
}

/** 重写后正文里不许再出现的记号（骨架残留；与 `help-assets.data.mjs` 的实现记号表各管一半）。 */
export const REWRITE_FORBIDDEN = ['请按以下格式', '期望效果', '无需参数', '_____________', '____'];
