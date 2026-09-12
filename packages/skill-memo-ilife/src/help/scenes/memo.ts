/** #227 · 备忘录 HELP 内容资产 · `memo` 域（备忘类）：2 个二级组／6 个场景
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
          title: "添加一条备忘笔记",
          wake_word: "记备忘",
          status: "",
          prompt_template: "请帮我记一条备忘(唤醒词:记备忘):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (你想记的话)\n  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  子分类: _____________ (选填,2 字简短描述,如\"工作\")\n  附  件: _____________ (选填,文件名,如 receipt.jpg)\n\n期望效果:\n  AI 创建一条备忘,告诉你 ID 和创建时间。心愿类还会自动建飞书任务。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "category", label: "分类", value: "", hint: "备忘(默认) / 心愿 / 打卡 / 情绪日记", required: false },
            { name: "sub_category", label: "子分类", value: "", hint: "自由文本,AI 智能推断 1 个 2 字", required: false },
            { name: "media", label: "附件", value: "", hint: "可选附件(图片/音频/视频)", required: false },
            { name: "due", label: "排期日期", value: "", hint: "仅心愿生效,YYYY-MM-DD", required: false },
          ],
          aliases: ["记一条", "添加笔记"],
        },
        {
          id: "memo_update_basic",
          title: "修改已有笔记",
          wake_word: "改备忘",
          status: "",
          prompt_template: "请帮我修改一条已有的备忘(唤醒词:改备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新内容: _____________ (改后的话)\n  新分类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  新子分类: _____________ (选填,2 字简短)\n\n期望效果:\n  AI 更新这条备忘的内容,告诉你修改后的结果。心愿类会同步飞书任务标题。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "必填,数字 ID", required: false },
            { name: "content", label: "内容", value: "", hint: "新内容(可选)", required: false },
            { name: "category", label: "分类", value: "", hint: "新顶层分类(可选)", required: false },
            { name: "sub_category", label: "子分类", value: "", hint: "新子分类(可选)", required: false },
          ],
        },
        {
          id: "memo_delete_basic",
          title: "删除笔记",
          wake_word: "删备忘",
          status: "",
          prompt_template: "请帮我删除一条或多条备忘(唤醒词:删备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (可多个,空格分隔,如\"15 18 22\")\n\n期望效果:\n  AI 删除这些备忘并告诉你改动了几条;有关联提醒时 AI 会先确认。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "必填,数字 ID,可多个", required: false },
            { name: "with_reminders", label: "连同关联提醒一起删", value: "", hint: "是否连同关联提醒一起删(默认否,有提醒则报错)", required: false },
            { name: "true", label: "跳过二次确认", value: "", hint: "跳过二次确认", required: false },
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
          title: "修改单条笔记的顶层分类",
          wake_word: "备忘改分类",
          status: "",
          prompt_template: "请帮我修改单条备忘的顶层分类(唤醒词:备忘改分类,单条):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新分类: _____________ (备忘/心愿/打卡/情绪日记)\n\n期望效果:\n  AI 改这条备忘的顶层分类;子分类不会被改动(它是内容的细分)。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "必填,数字 ID", required: false },
            { name: "category", label: "分类", value: "", hint: "目标分类(备忘/心愿/打卡/情绪日记)", required: false },
            { name: "bulk_indicator", label: "批量判定", value: "", hint: "多条一起改时,写「都」或「全部」", required: false },
          ],
        },
        {
          id: "memo_change_subcategory",
          title: "修改单条笔记的子分类",
          wake_word: "备忘改子分类",
          status: "",
          prompt_template: "请帮我修改单条备忘的子分类(唤醒词:备忘改子分类):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新子分类: _____________ (2 字简短,如\"工作\";留空=清除)\n\n期望效果:\n  AI 修改或清除这条备忘的子分类,适用于所有顶层分类。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "必填,数字 ID", required: false },
            { name: "sub_category", label: "子分类", value: "", hint: "新子分类(2 字自由文本,留空即清除)", required: false },
          ],
          aliases: ["改子分类"],
        },
        {
          id: "memo_batch_change_category",
          title: "批量改分类(网页向导)",
          wake_word: "备忘改分类",
          status: "",
          prompt_template: "请帮我批量改分类(唤醒词:备忘改分类 · 批量场景):\n\n请按以下格式填写你的参数:\n\n  原分类: _____________ (备忘/心愿/打卡/情绪日记)\n  目标分类: _____________ (建议目标,可在网页上改)\n\n期望效果:\n  AI 生成批量改分类向导网页,你在页面上勾选 + 选目标分类 → 采纳复制 → AI 逐条改分类。\n  注:子分类不会被改动。",
          types: ["向导", "采集", "回执"],
          editable_fields: [
            { name: "from_category", label: "原分类", value: "", hint: "原分类", required: false },
            { name: "to_category", label: "目标分类", value: "", hint: "建议目标分类(网页上可改)", required: false },
            { name: "bulk_indicator", label: "批量判定", value: "", hint: "一次改多条(原话含「都/全部/多个 ID」)", required: false },
          ],
          aliases: ["批量改分类"],
        },
      ],
    },
  ],
};
