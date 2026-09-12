/** #227 · 备忘录 HELP 内容资产 · `search` 域（查找类）：3 个二级组／7 个场景
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
 * 本文件只给 1 个导出：`MEMO_HELP_SEARCH`＝该域**一个** `groups[]` 条目。
 */
export const MEMO_HELP_SEARCH = {
  id: "search",
  icon: "🔍",
  label: "查找类",
  subgroups: [
    {
      id: "search_1",
      label: "基础查找",
      scenes: [
        {
          id: "memo_search_keyword",
          title: "按关键词搜索笔记",
          wake_word: "搜备忘",
          status: "",
          prompt_template: "请帮我搜备忘录(唤醒词:搜备忘):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (搜的内容,如\"咖啡\")\n  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  子分类: _____________ (选填,2 字简短)\n  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)\n\n期望效果:\n  AI 列出含关键词的所有笔记。并生成可视化搜索结果页。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "keyword", label: "关键词", value: "", hint: "搜索词", required: false },
            { name: "category", label: "分类", value: "", hint: "顶层分类过滤(可选)", required: false },
            { name: "sub_category", label: "子分类", value: "", hint: "子分类过滤(可选)", required: false },
            { name: "due", label: "排期日期", value: "", hint: "按排期日期过滤(可选,YYYY-MM-DD)", required: false },
          ],
        },
        {
          id: "memo_search_alias",
          title: "搜备忘的别名(同义触发)",
          wake_word: "查备忘",
          status: "",
          prompt_template: "请帮我查备忘录(唤醒词:查备忘):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (搜的内容)\n\n期望效果:\n  AI 搜索含关键词的笔记,并生成可视化结果页。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "keyword", label: "关键词", value: "", hint: "搜索词", required: false },
          ],
        },
        {
          id: "memo_get_detail",
          title: "查看单条笔记详情",
          wake_word: "看备忘",
          status: "",
          prompt_template: "请帮我查看某条备忘的详情(唤醒词:看备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n\n期望效果:\n  AI 显示这条备忘的全部内容。并生成详情页。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "必填,数字 ID", required: false },
          ],
        },
      ],
    },
    {
      id: "search_2",
      label: "时间查找",
      scenes: [
        {
          id: "memo_search_by_date",
          title: "按日期范围搜索笔记",
          wake_word: "按时间搜备忘",
          status: "",
          prompt_template: "请帮我按时间范围搜索备忘录(唤醒词:按时间搜备忘):\n\n请按以下格式填写你的参数:\n\n  开始日期: _____________ (YYYY-MM-DD,如 2026-07-01)\n  结束日期: _____________ (YYYY-MM-DD,如 2026-07-07)\n  分  类:    _____________ (选填,备忘/心愿/打卡/情绪日记)\n\n期望效果:\n  AI 列出该日期范围内的所有笔记,按创建时间倒序。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "start", label: "开始日期", value: "", hint: "开始日期 YYYY-MM-DD", required: false },
            { name: "end", label: "结束日期", value: "", hint: "结束日期 YYYY-MM-DD", required: false },
            { name: "category", label: "分类", value: "", hint: "顶层分类过滤", required: false },
          ],
        },
      ],
    },
    {
      id: "search_3",
      label: "分类查找",
      scenes: [
        {
          id: "memo_search_wish",
          title: "查所有心愿(自动带分类过滤)",
          wake_word: "查心愿",
          status: "",
          prompt_template: "请帮我查看心愿(唤醒词:查心愿):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)\n\n期望效果:\n  AI 自动按\"心愿\"分类过滤。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "keyword", label: "关键词", value: "", hint: "搜索词(可选)", required: false },
            { name: "due", label: "排期日期", value: "", hint: "按排期日期过滤", required: false },
          ],
        },
        {
          id: "memo_search_checkin",
          title: "查所有打卡记录",
          wake_word: "查打卡",
          status: "",
          prompt_template: "请帮我查看打卡记录(唤醒词:查打卡):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n\n期望效果:\n  AI 自动按\"打卡\"分类过滤,列出结果。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "keyword", label: "关键词", value: "", hint: "搜索词(可选)", required: false },
          ],
        },
        {
          id: "memo_search_mood",
          title: "查所有情绪日记",
          wake_word: "查情绪",
          status: "",
          prompt_template: "请帮我查看情绪日记(唤醒词:查情绪):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n\n期望效果:\n  AI 自动按\"情绪日记\"分类过滤,列出结果。",
          types: ["查看", "回执"],
          editable_fields: [
            { name: "keyword", label: "关键词", value: "", hint: "搜索词(可选)", required: false },
          ],
          aliases: ["查情绪日记"],
        },
      ],
    },
  ],
};
