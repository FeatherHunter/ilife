/** #227 · 备忘录 HELP 内容资产 · `remind` 域（提醒类）：2 个二级组／4 个场景
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` 产出。
 *    改内容＝改 `scripts/help-assets.rewrite.mjs`（30 场景重写表），再跑
 *    `node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（仓外，全程只读）：老实物契约载荷 `备忘录_HELP_20260820_162453.html`（老 `script/memo_render.py:527-599` 的产出）
 *   与老 `references/scenarios.yaml` 顶层 `version`（＝1.3.0）。老侧**只出身份与路由**
 *   （`id`／`wake_word`／`types`／`status`／域序／组序／别名挂载），两地逐条交叉复核 30/30。
 * 摘要锁：老 30 条 sha256＝0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c
 *           资产 30 条 sha256＝908589834f579476ab35dac16116fe2d57753f0bcd894c6efcd4b2465144d112
 *
 * **#974 起三件内容**（`title`／`prompt_template`／`editable_fields`）**逐句重写**，规范＝卡路里标杆
 * `.scratch/help-prompt-rewrite/PROMPT-REWRITE.md`（口径取其关闭后终态）：
 *   1. 首行＝`请你加载技能 备忘录,执行唤醒词「<唤醒词>」。`——唤醒词本体逐字取自冻结词表，路由一行不动；
 *   2. 正文只留「唤醒词与参数行没说到的信息」那一句人话；老骨架的 `请按以下格式填写你的参数:`／
 *      `期望效果:` 标签／`无需参数,直接发送。` 一律不写（页面用控件有无表达「没有要填的」）；
 *   3. 参数行＝`<标签>:{{<name>}}`，一行一参，标签＝字段 `label`（`required:false` 的带 `(选填)`）；
 *      `editable_fields` 按 kind 闭集标注：本家 60 条落在 `text`／`select`／`date`，
 *      `number`／`week` 零实例（缺省 kind＝`text`）；
 *   4. `aliases` 12 条随场景挂载、渲染时剥离（裁决 5）；`status` 全空串（U1／U2／U3：HELP 是完整体）。
 * 与老骨架的逐条对账见 `docs/skills/skill-memo-ilife/t227-assets-report.md`（#227 那一代）与
 * `docs/skills/skill-memo-ilife/t974-实施-证据.md`（#974 这一代）。
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
          title: "记提醒",
          wake_word: "记提醒",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「记提醒」。\n\n先建好笔记,再挂上关联提醒,到点自动推送。\n\n笔记内容:{{content}}\n提醒时间:{{remind_at}}\n重复类型(选填):{{repeat_type}}\n重复规则(选填):{{repeat_rule}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "content", label: "笔记内容", value: "", hint: "要提醒的事,如 取牛奶", required: true, kind: "text" },
            { name: "remind_at", label: "提醒时间", value: "", hint: "格式 YYYY-MM-DD HH:MM,如 2026-07-25 09:00", required: true, kind: "text" },
            { name: "repeat_type", label: "重复类型(选填)", value: "", hint: "空＝一次性", required: false, kind: "select", options: ["一次性", "每天", "每周", "每月", "每年"] },
            { name: "repeat_rule", label: "重复规则(选填)", value: "", hint: "每天 HH:MM;每周 周几 HH:MM;每月 几号 HH:MM;每年 MM-DD HH:MM", required: false, kind: "text" },
          ],
        },
        {
          id: "memo_remind_existing",
          title: "设提醒",
          wake_word: "设提醒",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「设提醒」。\n\n不填笔记 ID 也可以,那就单独建一条提醒。\n\n笔记 ID(选填):{{note_id}}\n提醒时间:{{remind_at}}\n提醒内容(选填):{{content}}\n重复类型(选填):{{repeat_type}}\n重复规则(选填):{{repeat_rule}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "note_id", label: "笔记 ID(选填)", value: "", hint: "数字,如 15", required: false, kind: "text" },
            { name: "remind_at", label: "提醒时间", value: "", hint: "格式 YYYY-MM-DD HH:MM,如 2026-07-25 09:00", required: true, kind: "text" },
            { name: "content", label: "提醒内容(选填)", value: "", hint: "如 该跑步了", required: false, kind: "text" },
            { name: "repeat_type", label: "重复类型(选填)", value: "", hint: "空＝一次性", required: false, kind: "select", options: ["一次性", "每天", "每周", "每月", "每年"] },
            { name: "repeat_rule", label: "重复规则(选填)", value: "", hint: "每天 HH:MM;每周 周几 HH:MM;每月 几号 HH:MM;每年 MM-DD HH:MM", required: false, kind: "text" },
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
          title: "看提醒",
          wake_word: "看提醒",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「看提醒」。\n\n按时间排序列出提醒,并出一份可筛选的可视化页。\n\n提醒状态(选填):{{status}}",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "status", label: "提醒状态(选填)", value: "", hint: "空＝只看有效提醒", required: false, kind: "select", options: ["有效", {"value":"已废弃","label":"已废弃(撤下提醒,笔记保留)"}] },
          ],
          aliases: ["查提醒"],
        },
        {
          id: "memo_completed_reminders",
          title: "查已提醒备忘",
          wake_word: "查已提醒备忘",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「查已提醒备忘」。\n\n列出已触发的提醒、关联的打卡笔记和触发时间。",
          types: ["查看", "回执"],
        },
      ],
    },
  ],
};
