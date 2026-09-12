## Question

把「饼干记账到底怎么把 HELP 文件交到 AI 手上」逐件读懂，落成一张备忘录能照着做的清单。

**起点不是零**：兄弟图 `#183`（居家管家）的票 1 已产出 `docs/skills/skill-home/t184-bill-recipe.md`（22.5 KB：19 行逐件表 ＋ 18 条陷阱 ＋ 提交对账：`#146`=848b7a4／`#145`=f312f88／`#144`=bfc51bf／`#148`=1f86e7b／`#149`=0364326／`#150`=fe1117e`）。本票只做两件事：① 逐条复核那份报告里与本图相关的结论今天是否仍成立；② 查清备忘录与居家／账单**不同**的地方（老目录名、文件名主体、事实源形态、有没有第二事实源）。

要带上桌的事实：

- 照抄三件：`packages/skill-bill/src/output.ts`（`wx` 独占 ＋ `EEXIST` 递补 ＋ 绝对路径回执）／`src/render/helpPaths.ts`／`src/render/helpFile.ts`（`import { renderHelpShellHtml } from 'base-paint/help-shell'`）。
- 不抄两处：卡路里 `src/output.ts`（命令名映射／动态段／三态回退）与卡路里 `src/render/helpShell.ts`（转发件，违铁律五）。
- 两处禁手改生成物：`packages/base-render/src/helpShell.ts`（源是 `assets/help-template.html`，跑 `pnpm --filter base-paint gen:help-shell`）与 bill 的 `wake-assets.ts`（源生成器）。
- 用户 Q6 补充：冻结名单不是禁令，是现状断言（`tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN`）。
- 备忘录现状：`packages/skill-memo-ilife/src/help/lookup.ts` 只有速查表（喂 `scripts/build-help.mjs` 注入 `SKILL.md`），**没有** HELP 文件交付；`memo.help.lookup` 实测 `ERR 3: 未知联动 key`。

产出：`docs/skills/skill-memo-ilife/` 下本票号前缀的照抄清单（`t<本票号>-bill-recipe.md`），每条结论带「仓内路径:行号」；末尾单列「没读透／拿不准」几条，别猜。

## 进度：0%

下一步：派 research 子代理跑这张票。
