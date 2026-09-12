/** #227 · 备忘录 HELP 内容资产 · `sync` 域（同步类）：1 个二级组／1 个场景
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
 * 本文件只给 1 个导出：`MEMO_HELP_SYNC`＝该域**一个** `groups[]` 条目。
 */
export const MEMO_HELP_SYNC = {
  id: "sync",
  icon: "🔄",
  label: "同步类",
  subgroups: [
    {
      id: "sync_1",
      label: "基础",
      scenes: [
        {
          id: "memo_sync_feishu",
          title: "备忘录 ↔ 飞书双向对账",
          wake_word: "备忘录同步",
          status: "",
          prompt_template: "请帮我跑备忘录和飞书的双向对账(唤醒词:备忘录同步):\n\n无需参数,直接发送。\n\n期望效果:\n  AI 执行 3 步对账:\n  1. 本地补建(本地心愿还没有飞书任务 → 自动建)\n  2. 反向同步完成状态(飞书已完成 → 本地标记完成)\n  3. 反向同步排期日期(飞书那边改了日期 → 本地跟着改)\n  并生成同步报告页(11 项统计)。",
          types: ["查看", "回执"],
        },
      ],
    },
  ],
};
