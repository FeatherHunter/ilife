#!/usr/bin/env node
/** 备忘录 HELP · **#974 重写前的正文与字段快照**（30 场景逐字，机器自 git 抽取，禁手改）。
 *
 * 为什么留这一份：本票的重写口径里有「不丢失任何信息」这一条，而「信息」只能对着**上一版用户看到的正文与字段**
 * 说才有意义——所以这里把重写前那一刻的 `prompt_template` 与 `editable_fields`（`name`／`label`／`hint`／`required`）
 * 逐字钉下来（快照源：提交 `2fac6346` 的 `packages/skill-memo-ilife/src/help/scenes/*.ts`），
 * 由 `help-assets.atoms.mjs` 的台账逐句对账、生成器逐条断言（老正文的每一句／每一括号／每个字段都必须有去处）。
 *
 * 与老实物载荷的区别：老实物（`备忘录_HELP_20260820_*.html`）是 #227 的**搬运源**，里面还带着命令与 DB
 * 实现细节（`--html`／`notes.due`／`task_guid` 等），那些字面是 #227 有意洗掉的、不属于「要保住的信息」；
 * 本快照是**洗过之后、用户真看到过的那一版**，重写的信息账要对着它算。
 *
 * 形状：`{ <场景 id>: { prompt: <正文逐字>, fields: [{ name, label, hint, required }] } }`。
 */
export const BEFORE = {
  memo_add_basic: {
    prompt: "请帮我记一条备忘(唤醒词:记备忘):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (你想记的话)\n  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  子分类: _____________ (选填,2 字简短描述,如\"工作\")\n  附  件: _____________ (选填,文件名,如 receipt.jpg)\n\n期望效果:\n  AI 创建一条备忘,告诉你 ID 和创建时间。心愿类还会自动建飞书任务。",
    fields: [{ name: "category", label: "分类", hint: "备忘(默认) / 心愿 / 打卡 / 情绪日记", required: false }, { name: "sub_category", label: "子分类", hint: "自由文本,AI 智能推断 1 个 2 字", required: false }, { name: "media", label: "附件", hint: "可选附件(图片/音频/视频)", required: false }, { name: "due", label: "排期日期", hint: "仅心愿生效,YYYY-MM-DD", required: false }],
  },
  memo_update_basic: {
    prompt: "请帮我修改一条已有的备忘(唤醒词:改备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新内容: _____________ (改后的话)\n  新分类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  新子分类: _____________ (选填,2 字简短)\n\n期望效果:\n  AI 更新这条备忘的内容,告诉你修改后的结果。心愿类会同步飞书任务标题。",
    fields: [{ name: "id", label: "笔记 ID", hint: "必填,数字 ID", required: false }, { name: "content", label: "内容", hint: "新内容(可选)", required: false }, { name: "category", label: "分类", hint: "新顶层分类(可选)", required: false }, { name: "sub_category", label: "子分类", hint: "新子分类(可选)", required: false }],
  },
  memo_delete_basic: {
    prompt: "请帮我删除一条或多条备忘(唤醒词:删备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (可多个,空格分隔,如\"15 18 22\")\n\n期望效果:\n  AI 删除这些备忘并告诉你改动了几条;有关联提醒时 AI 会先确认。",
    fields: [{ name: "id", label: "笔记 ID", hint: "必填,数字 ID,可多个", required: false }, { name: "with_reminders", label: "连同关联提醒一起删", hint: "是否连同关联提醒一起删(默认否,有提醒则报错)", required: false }, { name: "true", label: "跳过二次确认", hint: "跳过二次确认", required: false }],
  },
  memo_change_category_single: {
    prompt: "请帮我修改单条备忘的顶层分类(唤醒词:备忘改分类,单条):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新分类: _____________ (备忘/心愿/打卡/情绪日记)\n\n期望效果:\n  AI 改这条备忘的顶层分类;子分类不会被改动(它是内容的细分)。",
    fields: [{ name: "id", label: "笔记 ID", hint: "必填,数字 ID", required: false }, { name: "category", label: "分类", hint: "目标分类(备忘/心愿/打卡/情绪日记)", required: false }, { name: "bulk_indicator", label: "批量判定", hint: "多条一起改时,写「都」或「全部」", required: false }],
  },
  memo_change_subcategory: {
    prompt: "请帮我修改单条备忘的子分类(唤醒词:备忘改子分类):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新子分类: _____________ (2 字简短,如\"工作\";留空=清除)\n\n期望效果:\n  AI 修改或清除这条备忘的子分类,适用于所有顶层分类。",
    fields: [{ name: "id", label: "笔记 ID", hint: "必填,数字 ID", required: false }, { name: "sub_category", label: "子分类", hint: "新子分类(2 字自由文本,留空即清除)", required: false }],
  },
  memo_batch_change_category: {
    prompt: "请帮我批量改分类(唤醒词:备忘改分类 · 批量场景):\n\n请按以下格式填写你的参数:\n\n  原分类: _____________ (备忘/心愿/打卡/情绪日记)\n  目标分类: _____________ (建议目标,可在网页上改)\n\n期望效果:\n  AI 生成批量改分类向导网页,你在页面上勾选 + 选目标分类 → 采纳复制 → AI 逐条改分类。\n  注:子分类不会被改动。",
    fields: [{ name: "from_category", label: "原分类", hint: "原分类", required: false }, { name: "to_category", label: "目标分类", hint: "建议目标分类(网页上可改)", required: false }, { name: "bulk_indicator", label: "批量判定", hint: "一次改多条(原话含「都/全部/多个 ID」)", required: false }],
  },
  memo_search_keyword: {
    prompt: "请帮我搜备忘录(唤醒词:搜备忘):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (搜的内容,如\"咖啡\")\n  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  子分类: _____________ (选填,2 字简短)\n  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)\n\n期望效果:\n  AI 列出含关键词的所有笔记。并生成可视化搜索结果页。",
    fields: [{ name: "keyword", label: "关键词", hint: "搜索词", required: false }, { name: "category", label: "分类", hint: "顶层分类过滤(可选)", required: false }, { name: "sub_category", label: "子分类", hint: "子分类过滤(可选)", required: false }, { name: "due", label: "排期日期", hint: "按排期日期过滤(可选,YYYY-MM-DD)", required: false }],
  },
  memo_search_alias: {
    prompt: "请帮我查备忘录(唤醒词:查备忘):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (搜的内容)\n\n期望效果:\n  AI 搜索含关键词的笔记,并生成可视化结果页。",
    fields: [{ name: "keyword", label: "关键词", hint: "搜索词", required: false }],
  },
  memo_get_detail: {
    prompt: "请帮我查看某条备忘的详情(唤醒词:看备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n\n期望效果:\n  AI 显示这条备忘的全部内容。并生成详情页。",
    fields: [{ name: "id", label: "笔记 ID", hint: "必填,数字 ID", required: false }],
  },
  memo_search_by_date: {
    prompt: "请帮我按时间范围搜索备忘录(唤醒词:按时间搜备忘):\n\n请按以下格式填写你的参数:\n\n  开始日期: _____________ (YYYY-MM-DD,如 2026-07-01)\n  结束日期: _____________ (YYYY-MM-DD,如 2026-07-07)\n  分  类:    _____________ (选填,备忘/心愿/打卡/情绪日记)\n\n期望效果:\n  AI 列出该日期范围内的所有笔记,按创建时间倒序。",
    fields: [{ name: "start", label: "开始日期", hint: "开始日期 YYYY-MM-DD", required: false }, { name: "end", label: "结束日期", hint: "结束日期 YYYY-MM-DD", required: false }, { name: "category", label: "分类", hint: "顶层分类过滤", required: false }],
  },
  memo_search_wish: {
    prompt: "请帮我查看心愿(唤醒词:查心愿):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)\n\n期望效果:\n  AI 自动按\"心愿\"分类过滤。",
    fields: [{ name: "keyword", label: "关键词", hint: "搜索词(可选)", required: false }, { name: "due", label: "排期日期", hint: "按排期日期过滤", required: false }],
  },
  memo_search_checkin: {
    prompt: "请帮我查看打卡记录(唤醒词:查打卡):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n\n期望效果:\n  AI 自动按\"打卡\"分类过滤,列出结果。",
    fields: [{ name: "keyword", label: "关键词", hint: "搜索词(可选)", required: false }],
  },
  memo_search_mood: {
    prompt: "请帮我查看情绪日记(唤醒词:查情绪):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n\n期望效果:\n  AI 自动按\"情绪日记\"分类过滤,列出结果。",
    fields: [{ name: "keyword", label: "关键词", hint: "搜索词(可选)", required: false }],
  },
  memo_remind_with_note: {
    prompt: "请帮我记一条提醒(唤醒词:记提醒 · 两步合一:添笔记 + 设提醒):\n\n请按以下格式填写你的参数:\n\n  笔记内容: _____________ (要提醒的事)\n  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)\n  重复类型: _____________ (选填,一次性/每天/每周/每月/每年)\n  重复规则: _____________ (选填,如每天=\"09:00\",每周=\"5 17:00\")\n\n期望效果:\n  AI 先创建笔记,再创建关联提醒,到点自动推送提醒。",
    fields: [{ name: "content", label: "内容", hint: "笔记内容", required: false }, { name: "remind_at", label: "提醒时间", hint: "提醒时间 YYYY-MM-DD HH:MM", required: false }, { name: "repeat_type", label: "重复类型", hint: "一次性(默认)/每天/每周/每月/每年", required: false }, { name: "repeat_rule", label: "重复规则", hint: "重复规则(每天:HH:MM / 每周:W HH:MM / 每月:D HH:MM / 每年:MM-DD HH:MM)", required: false }],
  },
  memo_remind_existing: {
    prompt: "请帮我给已有笔记加提醒(唤醒词:设提醒):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)\n  提醒内容: _____________ (选填,如\"该跑步了\")\n  重复类型: _____________ (选填,默认\"一次性\")\n  重复规则: _____________ (选填,见格式说明)\n\n期望效果:\n  AI 创建提醒,可关联或独立存在。",
    fields: [{ name: "note_id", label: "笔记 ID", hint: "笔记 ID(可选,可不关联具体笔记)", required: false }, { name: "remind_at", label: "提醒时间", hint: "提醒时间", required: false }, { name: "content", label: "内容", hint: "提醒内容", required: false }, { name: "repeat_type", label: "重复类型", hint: "重复类型(默认一次性)", required: false }, { name: "repeat_rule", label: "重复规则", hint: "重复规则", required: false }],
  },
  memo_reminders_active: {
    prompt: "请帮我查看有效提醒(唤醒词:看提醒):\n\n请按以下格式填写你的参数:\n\n  状  态: _____________ (选填,默认只看有效提醒)\n\n期望效果:\n  AI 按时间排序列出提醒。并生成可筛选的可视化页。",
    fields: [{ name: "status", label: "提醒状态", hint: "有效(默认)/已废弃(废弃=撤下这条提醒,笔记保留)", required: false }],
  },
  memo_completed_reminders: {
    prompt: "请帮我查看已提醒过的备忘(唤醒词:查已提醒备忘):\n\n无需参数,直接发送。\n\n期望效果:\n  AI 列出已触发的提醒 + 关联打卡笔记 + 触发时间。",
    fields: [],
  },
  memo_complete_wish: {
    prompt: "请帮我把心愿标记为已完成(唤醒词:完成心愿):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n  打卡内容: _____________ (选填,默认拷贝心愿原文)\n\n期望效果:\n  AI 删除该心愿并新建一条打卡记录。\n  批量场景:先出一份完成向导页,你在页面上勾选 + 填打卡内容。",
    fields: [{ name: "ids", label: "笔记 ID", hint: "心愿 ID 列表(单条或多条)", required: false }, { name: "content", label: "内容", hint: "打卡内容(默认拷贝心愿原文)", required: false }],
  },
  memo_wish_schedule: {
    prompt: "请帮我给心愿设排期日期(唤醒词:心愿排期):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,可多个,空格分隔,如\"15 18 22\")\n  排期日期: _____________ (YYYY-MM-DD,如 2026-07-30)\n\n期望效果:\n  AI 设置本地排期日期,并与飞书任务同步。\n  批量场景:先出一份排期向导页(可带建议日期),你在页面上微调。",
    fields: [{ name: "ids", label: "笔记 ID", hint: "心愿 ID 列表", required: false }, { name: "due", label: "排期日期", hint: "期望完成日期 YYYY-MM-DD", required: false }],
  },
  memo_add_wish: {
    prompt: "请帮我快速添加心愿(唤醒词:记心愿 · 子唤醒词自动带心愿分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (心愿内容,如\"想学 Python\")\n  子分类: _____________ (选填,2 字简短)\n  排  期: _____________ (选填,YYYY-MM-DD,放哪天完成)\n  飞书任务清单: _____________ (选填,留空=我的任务)\n\n期望效果:\n  AI 创建心愿笔记,自动建飞书任务并建立关联。",
    fields: [{ name: "content", label: "内容", hint: "心愿内容", required: false }, { name: "sub_category", label: "子分类", hint: "自由文本", required: false }, { name: "due", label: "排期日期", hint: "排期日期(可选)", required: false }, { name: "tasklist_guid", label: "飞书任务清单", hint: "飞书任务清单 ID(可选)", required: false }],
  },
  memo_delete_wish: {
    prompt: "请帮我删除心愿(唤醒词:删心愿 · 子唤醒词自动带心愿过滤):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n\n期望效果:\n  AI 删除这条心愿;若有飞书任务,会自动标完成(想连它一起删掉时说「彻底删除」)。",
    fields: [{ name: "id", label: "笔记 ID", hint: "心愿 ID", required: false }],
  },
  memo_update_wish: {
    prompt: "请帮我改心愿(唤醒词:改心愿 · 子唤醒词自动带心愿过滤):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新内容,飞书任务标题同步更新。",
    fields: [{ name: "id", label: "笔记 ID", hint: "心愿 ID", required: false }, { name: "content", label: "内容", hint: "新内容", required: false }],
  },
  memo_add_checkin: {
    prompt: "请帮我快速添加打卡(唤醒词:记打卡 · 子唤醒词自动带打卡分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (打卡内容,如\"跑了 5 公里\")\n  子分类: _____________ (选填,2 字简短,如\"跑步\")\n  关联提醒: _____________ (选填,提醒 ID,溯源用)\n\n期望效果:\n  AI 创建一条打卡记录。",
    fields: [{ name: "content", label: "内容", hint: "打卡内容", required: false }, { name: "sub_category", label: "子分类", hint: "自由文本", required: false }, { name: "reminder_id", label: "关联提醒", hint: "关联提醒 ID(可选,溯源用)", required: false }],
  },
  memo_delete_checkin: {
    prompt: "请帮我删除打卡(唤醒词:删打卡 · 子唤醒词自动带打卡过滤):\n\n请按以下格式填写你的参数:\n\n  打卡 ID: _____________ (数字,如 20)\n\n期望效果:\n  AI 删除这条打卡记录。",
    fields: [{ name: "id", label: "笔记 ID", hint: "打卡 ID", required: false }],
  },
  memo_update_checkin: {
    prompt: "请帮我改打卡(唤醒词:改打卡 · 子唤醒词自动带打卡过滤):\n\n请按以下格式填写你的参数:\n\n  打卡 ID: _____________ (数字,如 20)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新这条打卡的内容。",
    fields: [{ name: "id", label: "笔记 ID", hint: "打卡 ID", required: false }, { name: "content", label: "内容", hint: "新内容", required: false }],
  },
  memo_add_mood: {
    prompt: "请帮我快速添加情绪日记(唤醒词:记情绪 · 子唤醒词自动带情绪日记分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (情绪内容)\n  子分类: _____________ (选填,2 字简短)\n\n期望效果:\n  AI 创建一条情绪日记。",
    fields: [{ name: "content", label: "内容", hint: "情绪内容", required: false }, { name: "sub_category", label: "子分类", hint: "自由文本", required: false }],
  },
  memo_delete_mood: {
    prompt: "请帮我删除情绪日记(唤醒词:删情绪 · 子唤醒词自动带情绪日记过滤):\n\n请按以下格式填写你的参数:\n\n  情绪日记 ID: _____________ (数字,如 25)\n\n期望效果:\n  AI 删除这条情绪日记。",
    fields: [{ name: "id", label: "笔记 ID", hint: "情绪日记 ID", required: false }],
  },
  memo_update_mood: {
    prompt: "请帮我改情绪日记(唤醒词:改情绪 · 子唤醒词自动带情绪日记过滤):\n\n请按以下格式填写你的参数:\n\n  情绪日记 ID: _____________ (数字,如 25)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新这条情绪日记的内容。",
    fields: [{ name: "id", label: "笔记 ID", hint: "情绪日记 ID", required: false }, { name: "content", label: "内容", hint: "新内容", required: false }],
  },
  memo_sync_feishu: {
    prompt: "请帮我跑备忘录和飞书的双向对账(唤醒词:备忘录同步):\n\n无需参数,直接发送。\n\n期望效果:\n  AI 执行 3 步对账:\n  1. 本地补建(本地心愿还没有飞书任务 → 自动建)\n  2. 反向同步完成状态(飞书已完成 → 本地标记完成)\n  3. 反向同步排期日期(飞书那边改了日期 → 本地跟着改)\n  并回执 11 项统计。",
    fields: [],
  },
  memo_init_setup: {
    prompt: "请帮我初始化备忘录,我是第一次使用(唤醒词:首次使用):\n\n无需参数,直接发送。\n\n请按步骤帮我搭建好环境:检查并配置运行环境、数据存储(全文搜索)、飞书联动(未安装则引导我安装并授权)、配置项,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装/怎么配,完成后生成初始化报告页给我,并带我浏览一遍全部功能。\n\n期望效果:\n  AI 逐步引导我从零搭建环境(检测→安装/配置→验证),缺什么给具体指引,初始化数据库,生成初始化报告页,报告就绪情况。",
    fields: [],
  },
};
