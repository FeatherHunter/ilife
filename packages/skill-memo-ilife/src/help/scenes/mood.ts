/** #227 · 备忘录 HELP 内容资产 · `mood` 域（情绪类）：1 个二级组／3 个场景
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
 * 本文件只给 1 个导出：`MEMO_HELP_MOOD`＝该域**一个** `groups[]` 条目。
 */
export const MEMO_HELP_MOOD = {
  id: "mood",
  icon: "💭",
  label: "情绪类",
  subgroups: [
    {
      id: "mood_1",
      label: "基础",
      scenes: [
        {
          id: "memo_add_mood",
          title: "快速添加情绪日记(自动情绪日记分类)",
          wake_word: "记情绪",
          status: "",
          prompt_template: "请帮我快速添加情绪日记(唤醒词:记情绪 · 子唤醒词自动带情绪日记分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (情绪内容)\n  子分类: _____________ (选填,2 字简短)\n\n期望效果:\n  AI 创建一条情绪日记。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "content", label: "内容", value: "", hint: "情绪内容", required: false },
            { name: "sub_category", label: "子分类", value: "", hint: "自由文本", required: false },
          ],
          aliases: ["记情绪日记"],
        },
        {
          id: "memo_delete_mood",
          title: "删情绪(自动情绪日记分类过滤)",
          wake_word: "删情绪",
          status: "",
          prompt_template: "请帮我删除情绪日记(唤醒词:删情绪 · 子唤醒词自动带情绪日记过滤):\n\n请按以下格式填写你的参数:\n\n  情绪日记 ID: _____________ (数字,如 25)\n\n期望效果:\n  AI 删除这条情绪日记。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "情绪日记 ID", required: false },
          ],
          aliases: ["删情绪日记"],
        },
        {
          id: "memo_update_mood",
          title: "改情绪(自动情绪日记分类过滤)",
          wake_word: "改情绪",
          status: "",
          prompt_template: "请帮我改情绪日记(唤醒词:改情绪 · 子唤醒词自动带情绪日记过滤):\n\n请按以下格式填写你的参数:\n\n  情绪日记 ID: _____________ (数字,如 25)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新这条情绪日记的内容。",
          types: ["采集", "回执"],
          editable_fields: [
            { name: "id", label: "笔记 ID", value: "", hint: "情绪日记 ID", required: false },
            { name: "content", label: "内容", value: "", hint: "新内容", required: false },
          ],
          aliases: ["改情绪日记"],
        },
      ],
    },
  ],
};
