# 文档归属

仓里每份工作产出的文档都归一个件（技能／插件／公共层包），落在那个件自己的目录下。仓根和 `docs/` 根不放文档。

目录按需创建——第一份文档写进去时才建。

## 落点表

| 件 | 目录 | 例 |
| --- | --- | --- |
| 技能（`packages/skill-*`、装进来的技能） | `docs/skills/<件名>/` | `docs/skills/skill-calorie/` |
| 插件（`packages/plugin-*`、装进来的插件） | `docs/plugins/<件名>/` | `docs/plugins/plugin-calorie/` |
| 公共层包（`packages/base-*`） | `docs/base/<件名>/` | `docs/base/base-render/` |
| 跨件共用：工作纪律、环境、装机、发版、跨件诊断 | `docs/agents/` | `docs/agents/env.md` |
| 架构决策 | `docs/adr/` | `docs/adr/0001-hexagonal-architecture.md` |

**件名**＝`packages/` 下的目录名逐字。不写短名（`skill-calorie`，不是 `calorie`——`skill-` 与 `plugin-` 两头都有 `calorie`，短名两头撞）；也不写 npm 包名（目录 `base-render` 的包名是 `base-paint`，两者不一致时以目录名为准——目录名是仓内唯一存在、唯一无歧义的那个东西）。仓外的技能／插件没有仓内目录，用它的名字逐字（deck 的 `research` 技能 → `docs/skills/research/`）。

类别目录与件名前缀一一对应。出现新前缀（如 `packages/tool-*`）就新开一个同级目录 `docs/tool/<件名>/`，不往老类别里塞。

## 文件名

- 长期文档用主题名：`docs/skills/skill-calorie/architecture.md`。
- 跟票走的文档保留票号前缀：`docs/skills/skill-calorie/t87-output-naming.md`。同一票的脚本／快照／基线同目录同前缀（`.mjs`／`.md`／`.txt`）。
- 件名已经在目录里，文件名不重复它：写 `t87-output-naming.md`，不写 `t87-calorie-output-naming.md`。
- 同一件的两个票共用一个目录，靠 `t<票号>-` 前缀保持文件级不重叠；并发协议的路径所有权不因目录共用而放松。

## 例外

- 技能干活时生成的交付物（HTML 页面、回执、GIF）按技能自己的输出契约定落点，不按本表——卡路里＝`<SKILLS_DB_PATH>/calorie_html/`。
- 过程草稿落 `.scratch/t<票号>/`。
- 人自己写的文件不归本规矩管（如仓根 `我的想法.md`）；外部工具自己管的目录也不归（`.dsh-vision-router/`、`.dsh-mattskillsdeck-cache/`）。

## 存量

`docs/research/`（372 份）与 `docs/` 根（16 份）是按票号命名的历史归档，被 285 个受跟踪文件引用（含 CI 步骤、`tooling/` 缺省参数、测试断言）——不搬家，也**不再新增**：新文档一律写进归属件目录。

老文档下次被改动时，在那次改动里搬到位并同步改引用。全量搬家是另一件事（要另开票），不顺手做。

归档里写死的旧落点不算数（如 `docs/research/t123-release-runbook.md` 的「入仓证据落 `docs/research`」）：照那份文档干活时，产物按本表落归属件目录。

已归位：仓根 `bug-plugin-memo-ilife-webServer-inject.md` → `docs/agents/plugin-webserver-inject.md`（两个插件同一处声明缺失，属跨件诊断）；`docs/` 根 `calorie-core-approach.md` → `docs/skills/skill-calorie/core-approach.md`。

`docs/` 根现有 16 份的归属，搬动时按此表：

| 现位置 | 件名 | 搬后 |
| --- | --- | --- |
| `calorie-architecture.md`、`calorie-architecture.html`、`calorie-dual-path-acceptance.md`、`calorie-parity-39.md` | skill-calorie | `docs/skills/skill-calorie/` |
| `bill-migration-split.md` | skill-bill | `docs/skills/skill-bill/` |
| `chef-migration-split.md` | skill-chef | `docs/skills/skill-chef/` |
| `home-migration-split.md` | skill-home | `docs/skills/skill-home/` |
| `schedule-migration-split.md` | skill-schedule | `docs/skills/skill-schedule/` |
| `memo-migration-split.md` | skill-memo-ilife | `docs/skills/skill-memo-ilife/` |
| `base-paint-contract.md`（正本实现面在 `packages/base-render/src/spec/`） | base-render | `docs/base/base-render/contract-v1.md` |
| `visual-spec-help.md`、`visual-spec-blocks.md` | base-render | `docs/base/base-render/` |
| `env.md`、`public-installer-47.md`、`skill-landing-r2.md`、`p10-scaffold.md`、`subagent-concurrency-protocol.md` | 跨件 | `docs/agents/` |

`docs/research/` 里 372 份的「票号 → 件名」映射**不出现成表**：那份映射只在改动某一份老文档时才需要，判一次即可；手写索引迟早没人维护、变成说不清哪行还对的旧账。真要索引就写脚本生成。
