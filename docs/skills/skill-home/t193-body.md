## Question

照 #150 的做法做插件侧最小安装，让 DSH 真机认得 `skill-home`：

- 新增 `packages/plugin-home-ilife/src/skill-provider.ts`：技能提供方（名与介绍可查、可按需读全文），rank 600，单份 `SKILL.md` 按包名解析（不复制），`inject` 加 `skills`，重名退让；
- 居家侧还缺的一份：`dsh-ctx.ts`（`plugin-home-ilife/src/` 今天只有 `bridge.ts`／`client.ts`／`index.ts`／`settings.ts`／`slot.ts`）；注册写法与「已注册即退让」照 `packages/plugin-bill-ilife/src/index.ts:10-35`，回路的用例照 `test/skills-provider.test.mjs`；
- profile 与 `~/node_modules` 走 Junction（可回滚）；
- 顺带修掉实测断链：`package.json` 的 `files` 缺 `SKILL.md`、`SKILL.md` 缺 frontmatter（后者会让 skills-cli 整包跳过）——注意 `packages/skill-home/SKILL.md:1` 今天**没有 YAML 头**，而提供方要解析 frontmatter；
- 跑通后**收窄 #58**：把本票已覆盖的部分从 #58 的范围里去掉并在 #58 留一条评论（照 #143 对 #59 的做法，不建阻塞边）。

## 进度：100%

下一步：无阻塞——技能提供方（`skill-provider.ts`＋`dsh-ctx.ts`＋`index.ts` 接线）、客户端产物缺陷（`dist/client.js` 837 B 裸 ESM → 3541 B loader 工厂包，门禁 21/0）、skill-home 两处断链（frontmatter＋`files`）、profile 安装（两条 Junction，可回滚）四件全部做完，实测证据见 `docs/skills/skill-home/t193-install-report.md`；本票无待办，票 11（#194）重启 DSH 后复验技能表即可。**报告 §6① 备好 #58 收窄评论正文，等编排方评审后才发**（本席未发、未 `gh issue edit`、未关票）。
