## Question

把「通用 help 模板要喂哪些值、备忘录该喂什么」查清。

**起点不是零**：兄弟图 `#183` 的票 3 已产出 `docs/skills/skill-home/t186-template-contract.md`（30 KB／227 行）。两条全局结论本票复核后可直接沿用：

1. 仓内有**两套** help 渲染：A 路＝老实物 help 模板（`packages/base-render/assets/help-template.html` → 生成物 `src/helpShell.ts` → `base-paint/help-shell` 的 `renderHelpShellHtml`，居家／记账走这条）；B 路＝组件式 TS 渲染（`packages/base-render/src/help.ts`）。**本图走 A 路**。
2. A 路是「前缀 ＋ 一段 JSON ＋ 页面运行时」：`subtitle` 与 `meta_blocks` 读完即弃（只进 `help-data`），`version`／`init_banner`／`contact`／`recommendations` 有渲染落点。

本票要出的是**备忘录专属取值表**：`skill_name`／`title`／`subtitle`／`meta_blocks`／`version`／`init_banner`／`contact`／`recommendations` 各取什么，逐项带证据（仓内或老仓路径:行号）。要特别查的备忘录事实：

- 老 V4 产物（`备忘录_HELP_20260813_161545.html`）实测**无** `meta_blocks`、**有** 76 个 `editable_fields`——`meta_blocks` 两块（HELP 汇总／HELP 唤醒词）备忘录要不要补、补什么。
- `init_banner` 的显隐口径：老家是「DB 文件存在＝已初始化」；新仓 `openMemoDb(join(SKILLS_DB_PATH,'memo'))` 会不会顺手建库、判初始化该怎么写才不建库。
- `contact` 取老 `memo_render.py` 的哪几项；`recommendations` 要不要传（居家裁定不传，理由是老家 HELP 全页没有「其他技能」段）。
- `types` 的原子集合（采集／查看／选择／向导／回执）是否全在模板配色表里。

产出：`docs/skills/skill-memo-ilife/` 下本票号前缀的取值表（`t<本票号>-template-contract.md`），逐项带证据；末尾单列「没读透／拿不准」。

## 进度：0%

下一步：派 research 子代理跑这张票。
