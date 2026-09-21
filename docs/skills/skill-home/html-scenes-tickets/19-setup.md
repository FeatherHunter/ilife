## Question

开始使用域 4 条场景。这一域的四张老页面在老 `scripts/` 里**都没有渲染调用点**（实测：`scripts/` 全量搜四个模板名 0 命中，`scripts/开始使用/cli.py` 只有一行 `print(json.dumps(...))`，`scripts/render_开始使用.py` 的 `emit_sm8` 在 `scripts/` 内无调用者）。**一处须订正**：`first_use_wizard.html` 全库唯一调用点在**测试**里（老 `tests/test_开始使用.py:622`，且只测它）；另外 3 张在任何地方都没有渲染调用点，只被模板存在性清单与结构断言引用。新技能要按用户裁决（Q10）把它们做成真页面。

## 目标

逐条端到端走通（唤醒词 → 命令 → 默认落 HTML → 页面）：信息结构对齐下表的老页面、UI 走新仓共用件、双端自适应、无冗余文字、无分隔符懒政。4 条各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。注意 `SM8-1 首次使用` 是 **6 步向导**页（环境检测→配置→建库→建分类→引导→回执，幂等可重试）、`SM8-2 查异常` 是**八项检查＋勾选复制修复引导**页、`SM8-3 备份导出` 与 `SM8-4 导入恢复` 是**回执／预览**页，四张各有版式。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| SM8-1 | 首次使用 | `开始使用/first_use_wizard.html` |
| SM8-2 | 查异常 | `开始使用/health_report.html` |
| SM8-3 | 备份导出 | `开始使用/backup_receipt.html` |
| SM8-4 | 导入恢复 | `开始使用/import_restore.html` |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node --test packages/skill-home/test/<域>-*.test.mjs` exit 0（**只跑自己那份用例**——持锁只做一件事、缩短排队；全量 `pnpm test` 留给收口票）；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 开始使用-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0。
④ `node packages/skill-home/scripts/audit-page-blocks.mjs .scratch/<本票号>` exit 0 —— 本域每份产物的**必需块齐全**（按契约的族清单逐页断言，缺一块即红并点名）；

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不改 `scenarios.yaml`。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-setup.md`。

## 遗留出口

「老实现无调用点」这类 yaml 与实现的偏差，逐条写进本票对账文件，供票 2 裁是否回写 HELP 内容资产。

## 写集（并发用，机器验的那一份）

本票只写自己那几族：`packages/skill-home/templates/setup/<族>.html` 与 `packages/skill-home/src/setup/pages/<族>.ts`（族 = `first_use_wizard`、`health_report`、`backup_receipt`、`import_restore`），外加 `packages/skill-home/test/setup.test.mjs`、`docs/skills/skill-home/scene-setup.md`、`.scratch/816/`。

**不碰**：`src/render/**` 共用件、`src/cli/**`、`package.json`、`SKILL.md`、派生件、别人的域目录与页族（要改就回写票 3 或票 2）。

跑锁一律带 `--max-wait-ms 600000`（协议上限 10 分钟，不无限等）。
