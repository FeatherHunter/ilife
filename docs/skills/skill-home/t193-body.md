## Question

照 #150 的做法做插件侧最小安装，让 DSH 真机认得 `skill-home`：

- 新增 `packages/plugin-home-ilife/src/skill-provider.ts`：技能提供方（名与介绍可查、可按需读全文），rank 600，单份 `SKILL.md` 按包名解析（不复制），`inject` 加 `skills`，重名退让；
- 居家侧还缺的一份：`dsh-ctx.ts`（`plugin-home-ilife/src/` 今天只有 `bridge.ts`／`client.ts`／`index.ts`／`settings.ts`／`slot.ts`）；注册写法与「已注册即退让」照 `packages/plugin-bill-ilife/src/index.ts:10-35`，回路的用例照 `test/skills-provider.test.mjs`；
- profile 与 `~/node_modules` 走 Junction（可回滚）；
- 顺带修掉实测断链：`package.json` 的 `files` 缺 `SKILL.md`、`SKILL.md` 缺 frontmatter（后者会让 skills-cli 整包跳过）——注意 `packages/skill-home/SKILL.md:1` 今天**没有 YAML 头**，而提供方要解析 frontmatter；
- 跑通后**收窄 #58**：把本票已覆盖的部分从 #58 的范围里去掉并在 #58 留一条评论（照 #143 对 #59 的做法，不建阻塞边）。

## 进度：100%

下一步：无阻塞——四件（技能提供方、客户端产物缺陷、skill-home 两处断链、profile 装到 agent 读得到的位置）已做完，并经**两名独立对抗审查**（88/100 通过；77/100 整改后通过）。整改已落实：新增用例接进 `test` 门（本包 9/9，修前 7 条锁不在任何门里）、补「他错重抛」锁并做反例自证（改成吞错→14 pass/2 fail 红，改回→16 pass/0 fail）、报告与回滚命令订正（含 `.dsh-module-fallback` 那条 Junction）。实测证据见 `docs/skills/skill-home/t193-install-report.md`，整改记录见 `t193-fix-report.md`。**#58 已按其收窄留一条评论（不建阻塞边）**；本票无待办，票 11（#194）重启 DSH 后复验技能表与端到端即可。
