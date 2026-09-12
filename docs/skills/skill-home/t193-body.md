## Question

照 #150 的做法做插件侧最小装机，让 DSH 真机认得 `skill-home`：

- 新增 `packages/plugin-home-ilife/src/skill-provider.ts`：技能提供方（名与介绍可查、可按需读全文），rank 600，单份 `SKILL.md` 按包名解析（不复制），`inject` 加 `skills`，重名退让；
- profile 与 `~/node_modules` 走 Junction（可回滚）；
- 顺带修掉实测断链：`package.json` 的 `files` 缺 `SKILL.md`、`SKILL.md` 缺 frontmatter（后者会让 skills-cli 整包跳过）；
- 跑通后**收窄 #58**：把本票已覆盖的部分从 #58 的范围里去掉并在 #58 留一条评论（照 #143 对 #59 的做法，不建阻塞边）。

## 进度：0%

下一步：无阻塞，可直接开工（本图唯一无阻塞的实施票）。
