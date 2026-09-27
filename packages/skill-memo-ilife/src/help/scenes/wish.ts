/** #227 · 备忘录 HELP 内容资产 · `wish` 域（心愿类）：2 个二级组／5 个场景
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
          title: "完成心愿",
          wake_word: "完成心愿",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「完成心愿」。\n\n把一个心愿转成打卡记录:原心愿删除,新打卡记下内容。多个心愿时,先出一份完成向导页,你在页面上勾选并填打卡内容。\n\n心愿 ID:{{ids}}\n打卡内容(选填):{{content}}",
          types: ["向导", "采集", "回执"],
          editable_fields: [
            { name: "ids", label: "心愿 ID", value: "", hint: "数字,可多个,空格分隔,如 15 18 22", required: true, kind: "text" },
            { name: "content", label: "打卡内容(选填)", value: "", hint: "空＝拷贝心愿原文", required: false, kind: "text" },
          ],
          aliases: ["完成打卡"],
        },
        {
          id: "memo_wish_schedule",
          title: "心愿排期",
          wake_word: "心愿排期",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「心愿排期」。\n\n排期日期会同步到飞书任务;多个心愿时,先出一份排期向导页(可带建议日期),你在页面上微调。\n\n心愿 ID:{{ids}}\n排期日期:{{due}}",
          types: ["向导", "采集", "回执"],
          editable_fields: [
            { name: "ids", label: "心愿 ID", value: "", hint: "数字,可多个,空格分隔,如 15 18 22", required: true, kind: "text" },
            { name: "due", label: "排期日期", value: "", hint: "期望完成日期;格式 YYYY-MM-DD,如 2026-07-30", required: true, kind: "date" },
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
          title: "记心愿",
          wake_word: "记心愿",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「记心愿」。\n\n自动建好对应的飞书任务并建立关联。\n\n内容:{{content}}\n子分类(选填):{{sub_category}}\n排期日期(选填):{{due}}\n飞书任务清单(选填):{{tasklist_guid}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "content", label: "内容", value: "", hint: "如 想学游泳", required: true, kind: "text" },
            { name: "sub_category", label: "子分类(选填)", value: "", hint: "2 字,如 学习", required: false, kind: "text" },
            { name: "due", label: "排期日期(选填)", value: "", hint: "想哪天完成;格式 YYYY-MM-DD", required: false, kind: "date" },
            { name: "tasklist_guid", label: "飞书任务清单(选填)", value: "", hint: "任务清单 ID;空＝我的任务", required: false, kind: "text" },
          ],
        },
        {
          id: "memo_delete_wish",
          title: "删心愿",
          wake_word: "删心愿",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「删心愿」。\n\n它挂了飞书任务的话,会先把任务标完成;想连任务一起删掉,就说「彻底删除」。\n\n心愿 ID:{{id}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "心愿 ID", value: "", hint: "数字,如 15", required: true, kind: "text" },
          ],
        },
        {
          id: "memo_update_wish",
          title: "改心愿",
          wake_word: "改心愿",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「改心愿」。\n\n飞书任务的标题会跟着一起更新。\n\n心愿 ID:{{id}}\n新内容:{{content}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "心愿 ID", value: "", hint: "数字,如 15", required: true, kind: "text" },
            { name: "content", label: "新内容", value: "", hint: "改后的话", required: true, kind: "text" },
          ],
        },
      ],
    },
  ],
};
