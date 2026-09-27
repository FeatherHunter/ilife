/** #227 · 备忘录 HELP 内容资产 · `memo` 域（备忘类）：2 个二级组／6 个场景
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` 产出。
 *    改内容＝改 `scripts/help-assets.rewrite.mjs`（30 场景重写表），再跑
 *    `node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（仓外，全程只读）：老实物契约载荷 `备忘录_HELP_20260820_162453.html`（老 `script/memo_render.py:527-599` 的产出）
 *   与老 `references/scenarios.yaml` 顶层 `version`（＝1.3.0）。老侧**只出身份与路由**
 *   （`id`／`wake_word`／`types`／`status`／域序／组序／别名挂载），两地逐条交叉复核 30/30。
 * 摘要锁：老 30 条 sha256＝0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c
 *           资产 30 条 sha256＝5d0d0ab256e942366293c6c17dada82f391a855be48dff488c41cd266defa660
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
 * 本文件只给 1 个导出：`MEMO_HELP_MEMO`＝该域**一个** `groups[]` 条目。
 */
export const MEMO_HELP_MEMO = {
  id: "memo",
  icon: "📝",
  label: "备忘类",
  subgroups: [
    {
      id: "memo_1",
      label: "基础记录",
      scenes: [
        {
          id: "memo_add_basic",
          title: "记备忘",
          wake_word: "记备忘",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「记备忘」。\n\n记完告诉我这条笔记的 ID 和创建时间;分类选心愿时,会自动建好飞书任务。\n\n内容:{{content}}\n分类(选填):{{category}}\n子分类(选填):{{sub_category}}\n附件(选填):{{media}}\n排期日期(选填):{{due}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "content", label: "内容", value: "", hint: "如 买牛奶", required: true, kind: "text" },
            { name: "category", label: "分类(选填)", value: "", hint: "空＝备忘", required: false, kind: "select", options: ["备忘", "心愿", "打卡", "情绪日记"] },
            { name: "sub_category", label: "子分类(选填)", value: "", hint: "2 字,如 工作", required: false, kind: "text" },
            { name: "media", label: "附件(选填)", value: "", hint: "文件名,如 receipt.jpg", required: false, kind: "text" },
            { name: "due", label: "排期日期(选填)", value: "", hint: "仅心愿生效;格式 YYYY-MM-DD", required: false, kind: "date" },
          ],
          aliases: ["记一条", "添加笔记"],
        },
        {
          id: "memo_update_basic",
          title: "改备忘",
          wake_word: "改备忘",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「改备忘」。\n\n改完告诉我改成什么样了;分类是心愿时,飞书任务的标题会一起更新。\n\n笔记 ID:{{id}}\n新内容(选填):{{content}}\n新分类(选填):{{category}}\n新子分类(选填):{{sub_category}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "数字,如 15", required: true, kind: "text" },
            { name: "content", label: "新内容(选填)", value: "", hint: "改后的话", required: false, kind: "text" },
            { name: "category", label: "新分类(选填)", value: "", hint: "空＝不改", required: false, kind: "select", options: ["备忘", "心愿", "打卡", "情绪日记"] },
            { name: "sub_category", label: "新子分类(选填)", value: "", hint: "2 字;空＝不改", required: false, kind: "text" },
          ],
        },
        {
          id: "memo_delete_basic",
          title: "删备忘",
          wake_word: "删备忘",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「删备忘」。\n\n可以一次删多条,删完告诉我改动了几条;有关联提醒时,先告诉我再删。\n\n笔记 ID:{{id}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "数字,可多个,空格分隔,如 15 18 22", required: true, kind: "text" },
          ],
        },
      ],
    },
    {
      id: "memo_2",
      label: "分类调整",
      scenes: [
        {
          id: "memo_change_category_single",
          title: "备忘改分类",
          wake_word: "备忘改分类",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「备忘改分类」。\n\n一次只改一条;只动顶层分类,子分类不动。\n\n笔记 ID:{{id}}\n新分类:{{category}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "数字,如 15", required: true, kind: "text" },
            { name: "category", label: "新分类", value: "", hint: "", required: true, kind: "select", options: ["备忘", "心愿", "打卡", "情绪日记"] },
          ],
        },
        {
          id: "memo_change_subcategory",
          title: "备忘改子分类",
          wake_word: "备忘改子分类",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「备忘改子分类」。\n\n一次只改一条;所有分类的笔记都能改,新子分类留空就清除。\n\n笔记 ID:{{id}}\n新子分类(选填):{{sub_category}}",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "数字,如 15", required: true, kind: "text" },
            { name: "sub_category", label: "新子分类(选填)", value: "", hint: "2 字,如 工作;留空＝清除", required: false, kind: "text" },
          ],
          aliases: ["改子分类"],
        },
        {
          id: "memo_batch_change_category",
          title: "批量改分类(网页向导)",
          wake_word: "备忘改分类",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「备忘改分类」。\n\n先出一份批量改分类向导页,你在页面上勾选并选好目标分类,采纳复制后我逐条改。子分类不动。\n\n原分类:{{from_category}}\n目标分类:{{to_category}}",
          types: ["向导", "采集", "回执"],
          editable_fields: [
            { name: "from_category", label: "原分类", value: "", hint: "", required: true, kind: "select", options: ["备忘", "心愿", "打卡", "情绪日记"] },
            { name: "to_category", label: "目标分类", value: "", hint: "先给个建议值,页面上还能改", required: true, kind: "select", options: ["备忘", "心愿", "打卡", "情绪日记"] },
          ],
          aliases: ["批量改分类"],
        },
      ],
    },
  ],
};
