---
"skill-calorie": patch
"dsh-calorie": patch
---

#56 卡路里样板：DSH 技能目录可查（插件注册打包技能提供方，badge 同形）

- skill-calorie：files 加 SKILL.md（单份技能正文随包发布，供 host 按包名解析；不复制，避修法②双份腐化）。
- dsh-calorie：host 侧注册打包技能提供方（inject 加 skills，candidate 名用 skill-calorie，rank 内联 600，source bundled；SKILL.md 按包名解析，content 取 frontmatter 后正文）；重名退让；面板/桥行为不变。
- cookbook §12 先落出处，HostCtx 镜像补 skills；agent 回路 test/skills-provider.test.mjs。
- 发版后待真机 HITL：一句确认 agent 会话查到 skill-calorie。
