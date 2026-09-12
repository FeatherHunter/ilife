/** #227 · 备忘录 HELP 内容资产 · `wish` 域（心愿类）：2 个二级组／5 个场景
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` 产出。
 *    改内容＝改生成器里的声明表（prompt 清洗／字段清洗／别名），再跑
 *    `node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（仓外，全程只读）：
 *   ① 老实物契约载荷 `备忘录_HELP_20260820_162453.html`（老 `script/memo_render.py:527-599` 的产出，逐字零改写）；
 *   ② 老 `references/scenarios.yaml` 顶层 `version`（＝1.3.0，不写死第四份副本，裁决 9）。
 * 摘要锁：老 30 条 sha256＝0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c
 *           清洗后 30 条 sha256＝7c72fb924f8457e2130ebb0b331ae583c3aaaa64f4a04c27cf01da581c325827
 *
 * 与老骨架的**有意偏离**（逐条对账见 `docs/skills/skill-memo-ilife/t227-assets-report.md`）：
 *   1. 二级组 id 老 0 起 → 新 1 起（票 6 V8=A）；
 *   2. `prompt_template` 去命令化（用户 U6）＋ 去 DB／实现细节（老 yaml `:9`）；
 *      `title`／`label`／`hint` 同一条规则换说法（裁决 21 D5／D7 ＋ 复审 M1，逐条见对账表）；
 *   3. `editable_fields` 清洗（裁决 6）：剔 12 条 `html` 开关 ＋ 补 10 条中文名；
 *   4. 新增 `aliases`（住技能侧资产、渲染时剥离，裁决 5；老 yaml `:30` 的禁令管不到本仓）；
 *   5. `status` 全空串（用户 U1／U2／U3：HELP 是完整体，不是现状快照）。
 *
 * 本文件只给 1 个导出：`MEMO_HELP_WISH`＝该域**一个** `groups[]` 条目。
 */
export const MEMO_HELP_WISH = {
  id: "wish",
  icon: "🎯",
  label: "心愿类",
  subgroups: [
    {
      id: "wish_1",
      label: "心愿推进",
      scenes: [
        {
          id: "memo_complete_wish",
          title: "把心愿标记为已完成(转成打卡记录)",
          wake_word: "完成心愿",
          status: "",
          prompt_template: "请帮我把心愿标记为已完成(唤醒词:完成心愿):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n  打卡内容: _____________ (选填,默认拷贝心愿原文)\n\n期望效果:\n  AI 删除该心愿并新建一条打卡记录。\n  批量场景:先出一份完成向导页,你在页面上勾选 + 填打卡内容。",
          types: ["向导", "采集", "回执"],
          editable_fields: [
            { name: "ids", label: "笔记 ID", value: "", hint: "心愿 ID 列表(单条或多条)", required: false },
            { name: "content", label: "内容", value: "", hint: "打卡内容(默认拷贝心愿原文)", required: false },
          ],
          aliases: ["完成打卡"],
        },
        {
          id: "memo_wish_schedule",
          title: "给心愿设排期日期(同步到飞书)",
          wake_word: "心愿排期",
          status: "",
          prompt_template: "请帮我给心愿设排期日期(唤醒词:心愿排期):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,可多个,空格分隔,如\"15 18 22\")\n  排期日期: _____________ (YYYY-MM-DD,如 2026-07-30)\n\n期望效果:\n  AI 设置本地排期日期,并与飞书任务同步。\n  批量场景:先出一份排期向导页(可带建议日期),你在页面上微调。",
          types: ["向导", "采集", "回执"],
          editable_fields: [
            { name: "ids", label: "笔记 ID", value: "", hint: "心愿 ID 列表", required: false },
            { name: "due", label: "排期日期", value: "", hint: "期望完成日期 YYYY-MM-DD", required: false },
          ],
        },
      ],
    },
    {
      id: "wish_2",
      label: "心愿管理",
      scenes: [
        {
          id: "memo_add_wish",
          title: "快速添加心愿(自动心愿分类)",
          wake_word: "记心愿",
          status: "",
          prompt_template: "请帮我快速添加心愿(唤醒词:记心愿 · 子唤醒词自动带心愿分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (心愿内容,如\"想学 Python\")\n  子分类: _____________ (选填,2 字简短)\n  排  期: _____________ (选填,YYYY-MM-DD,放哪天完成)\n  飞书任务清单: _____________ (选填,留空=我的任务)\n\n期望效果:\n  AI 创建心愿笔记,自动建飞书任务并建立关联。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "content", label: "内容", value: "", hint: "心愿内容", required: false },
            { name: "sub_category", label: "子分类", value: "", hint: "自由文本", required: false },
            { name: "due", label: "排期日期", value: "", hint: "排期日期(可选)", required: false },
            { name: "tasklist_guid", label: "飞书任务清单", value: "", hint: "飞书任务清单 ID(可选)", required: false },
          ],
        },
        {
          id: "memo_delete_wish",
          title: "删心愿(自动心愿分类过滤)",
          wake_word: "删心愿",
          status: "",
          prompt_template: "请帮我删除心愿(唤醒词:删心愿 · 子唤醒词自动带心愿过滤):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n\n期望效果:\n  AI 删除这条心愿;若有飞书任务,会自动标完成。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "心愿 ID", required: false },
          ],
        },
        {
          id: "memo_update_wish",
          title: "改心愿(自动心愿分类过滤)",
          wake_word: "改心愿",
          status: "",
          prompt_template: "请帮我改心愿(唤醒词:改心愿 · 子唤醒词自动带心愿过滤):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新内容,飞书任务标题同步更新。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "心愿 ID", required: false },
            { name: "content", label: "内容", value: "", hint: "新内容", required: false },
          ],
        },
      ],
    },
  ],
};
