## Question

`packages/skill-chef/src` 今天按「工种」分目录（`cli`／`fetch`／`policy`／`render`，只有 `help/` 站得住），10 个功能域在代码里没有落点；同一件事（命令的事实）全压在 `cmd_read.ts`（460 行，已超线）里。本图要新增四十多份产物与 7 张域票，**若不先定下按域的代码形状，产物会继续堆进一个文件**。用什么形状证明「按 HELP 一级分组」的形态走得通？

## 目标

1. 取**历史域**做最小试点：建 `src/history/{commands,routes,index}.ts` 三件套（能力自治 ＋ 能力门），把历史域的命令声明与路由声明搬进去。
2. 建**共用位派生链**：`scripts/gen-cli.mjs`（声明表 → `src/cli/keys.ts` 等生成物）＋ `--check` 比对门，并接进根 `package.json` 的 `gen:check`。
3. 新增配置键 `html.sceneDir`（默认 `cook_html`）；`html.dir` 的语义与默认值一动不动。
4. 交「必报五步」全额：影响清单、结构设计、超线报警、交付对账。

**本票只碰 `src/` 与配置面，不碰页面、不改任何命令的对外行为。**

## 验收命令

- 正例：`node tooling/run-locked.mjs --ticket 766 -- node packages/skill-chef/scripts/gen-cli.mjs --check` → exit 0
- 正例：`node tooling/run-locked.mjs --ticket 766 -- node node_modules/typescript/bin/tsc -b packages/skill-chef` → exit 0
- 正例：`node tooling/run-locked.mjs --ticket 766 -- node --test "packages/skill-chef/test/*.test.mjs"` → 全绿（含 HTML 快照 changed=0）
- 反例（必跑）：删掉 `src/history/commands.ts` 里一条声明 → `gen-cli.mjs --check` 必须 exit 1 并点名该条；改回即绿
- 反例（必跑）：把 `html.sceneDir` 默认值改坏 → 配置测试必须红

## 不许动的东西

- 老技能（`D:\2Study\StudyNotes\SKILLS\私家大厨`）一行不动（只读对照）。
- `html.dir` 的默认值与语义不许动——存量配置文件在盘上，改默认值会静默漂移（配置件无迁移机制）。
- 8 条命令的对外行为（argv 形态、envelope 字段、exit 码）不许变；本票是纯形状搬迁。
- 其余 9 个域**不许建目录**（只建 `history/` 一个试点域）。
- 其余五个技能包与 `base-render` 公共层：不碰。

## 交付物路径

- 代码：`packages/skill-chef/src/history/{commands,routes,index}.ts`、`packages/skill-chef/scripts/gen-cli.mjs`、生成物 `packages/skill-chef/src/cli/keys.ts`、`packages/skill-chef/src/config.ts`
- 文档：`docs/skills/skill-chef/t766-形状.md`（必报五步全额 ＋ 变异红／还原一致两行读数）

## 遗留出口

- 其余 9 个域的搬迁 → 资产票（②）与各域纵向票（⑤–⑪）。
- `cli/`／`fetch/`／`policy/`／`render/` 四个工种目录的最终去留：搬迁完成后另立小票，不在本票内。

## 进度：0%

下一步：先报必报五步第一步影响清单与第二步结构设计，等维护者点头再动源码（新建目录层级 ＋ 碰三个以上能力须先点头）。
