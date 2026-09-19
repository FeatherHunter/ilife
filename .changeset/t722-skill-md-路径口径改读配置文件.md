---
'skill-calorie': patch
'skill-chef': patch
'skill-home': patch
'skill-memo-ilife': patch
'skill-schedule': patch
---

五家技能的说明面 `SKILL.md` 路径口径改读配置文件（#722）

**对外行为有没有变**：技能的命令、参数、落点、退出码**一条没变**——这一票只改说明面与一处测试断言，`packages/*/src/**` 一行未动。

**变的是「照 SKILL.md 去配什么」这件事**：

- 原来写「`SKILLS_DB_PATH` 必设、无默认值」以及 `CHEF_FORCE_PROD`／`HOME_FORCE_PROD`／`CALORIE_PHOTOS_DIR`／`CALORIE_TODAY` 等**已删变量的用法**，照它配环境变量不会生效，还会让人以为「不设它就失败」。
- 现在一律写成「配置文件里的哪一项 ＋ 空值回落到哪」：库目录＝`db.dir`（空串＝数据目录 `~/.ilife/data/`）、产物目录＝`html.dir`、照片目录＝`photos.dir`、飞书 CLI＝`lark.cliPath` 等，配置文件默认落 `~/.ilife/<技能>.yaml`，`ILIFE_CONFIG_DIR` 可整体接管配置目录。**空串是「按默认落点」，不是「没配就失败」。**

同轮把 `docs/env.md` 按当刻实况重写（六家 `SKILL.md` 都写「见 docs/env.md」，它原全文仍是环境变量那一套），并给 `skill-calorie` 的 `SKILL.md` 断言加了一条负向看守：已删变量名一旦被写回说明面，测试即红。
