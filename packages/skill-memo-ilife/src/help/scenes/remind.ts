/** #227 · 备忘录 HELP 内容资产 · `remind` 域（提醒类）：2 个二级组／4 个场景
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
 * 本文件只给 1 个导出：`MEMO_HELP_REMIND`＝该域**一个** `groups[]` 条目。
 */
export const MEMO_HELP_REMIND = {
  id: "remind",
  icon: "⏰",
  label: "提醒类",
  subgroups: [
    {
      id: "remind_1",
      label: "创建提醒",
      scenes: [
        {
          id: "memo_remind_with_note",
          title: "添加笔记 + 设置提醒(两步合一)",
          wake_word: "记提醒",
          status: "",
          prompt_template: "请帮我记一条提醒(唤醒词:记提醒 · 两步合一:添笔记 + 设提醒):\n\n请按以下格式填写你的参数:\n\n  笔记内容: _____________ (要提醒的事)\n  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)\n  重复类型: _____________ (选填,一次性/每天/每周/每月/每年)\n  重复规则: _____________ (选填,如每天=\"09:00\",每周=\"5 17:00\")\n\n期望效果:\n  AI 先创建笔记,再创建关联提醒,到点自动推送提醒。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "content", label: "内容", value: "", hint: "笔记内容", required: false },
            { name: "remind_at", label: "提醒时间", value: "", hint: "提醒时间 YYYY-MM-DD HH:MM", required: false },
            { name: "repeat_type", label: "重复类型", value: "", hint: "一次性(默认)/每天/每周/每月/每年", required: false },
            { name: "repeat_rule", label: "重复规则", value: "", hint: "重复规则(每天:HH:MM / 每周:W HH:MM / 每月:D HH:MM / 每年:MM-DD HH:MM)", required: false },
          ],
        },
        {
          id: "memo_remind_existing",
          title: "给已有笔记加提醒",
          wake_word: "设提醒",
          status: "",
          prompt_template: "请帮我给已有笔记加提醒(唤醒词:设提醒):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)\n  提醒内容: _____________ (选填,如\"该跑步了\")\n  重复类型: _____________ (选填,默认\"一次性\")\n  重复规则: _____________ (选填,见格式说明)\n\n期望效果:\n  AI 创建提醒,可关联或独立存在。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "note_id", label: "笔记 ID", value: "", hint: "笔记 ID(可选,可不关联具体笔记)", required: false },
            { name: "remind_at", label: "提醒时间", value: "", hint: "提醒时间", required: false },
            { name: "content", label: "内容", value: "", hint: "提醒内容", required: false },
            { name: "repeat_type", label: "重复类型", value: "", hint: "重复类型(默认一次性)", required: false },
            { name: "repeat_rule", label: "重复规则", value: "", hint: "重复规则", required: false },
          ],
        },
      ],
    },
    {
      id: "remind_2",
      label: "查看提醒",
      scenes: [
        {
          id: "memo_reminders_active",
          title: "查看所有有效提醒",
          wake_word: "看提醒",
          status: "",
          prompt_template: "请帮我查看有效提醒(唤醒词:看提醒):\n\n请按以下格式填写你的参数:\n\n  状  态: _____________ (选填,默认只看有效提醒)\n\n期望效果:\n  AI 按时间排序列出提醒。并生成可筛选的可视化页。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "status", label: "提醒状态", value: "", hint: "有效(默认)/已废弃", required: false },
          ],
          aliases: ["查提醒"],
        },
        {
          id: "memo_completed_reminders",
          title: "查询已触发的提醒与对应打卡",
          wake_word: "查已提醒备忘",
          status: "",
          prompt_template: "请帮我查看已提醒过的备忘(唤醒词:查已提醒备忘):\n\n无需参数,直接发送。\n\n期望效果:\n  AI 列出已触发的提醒 + 关联打卡笔记 + 触发时间。",
          types: ["查看", "回执"],
        },
      ],
    },
  ],
};
