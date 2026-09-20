## Question

形状票（票 1）只落历史域一个试点，其余 9 个域的命令实现仍住在共用位里（`cli/cmd_read.ts` 460 行、`fetch/db.ts` 451 行、`policy/*`、`render/*`）。若让 7 张域票各自去共用位里搬自己那一份，它们会在**同一批文件**上互相踩——这是并发设计上必须避免的强干扰。**这 9 个域该怎么落位，才能让后面 7 张票只碰自己的目录？**

## 目标

1. 把其余 9 个域按票 1 定的形状（`src/<域>/{commands,routes,index}.ts` ＋ 域内实现件）**机械落位**：只搬不改，对外行为逐字节不变。
2. 把 `cli`／`fetch`／`policy`／`render` 四个工种目录**逐个定去留**（删／并／留作共用位）；留在共用位的必须写得出「哪两个域在用」，写不出的留回域目录。
3. `pnpm gen:check` 覆盖**全部 10 个域**（不是只有 history）。
4. 交「并发前提」的证明：此后**新增或改一个域只碰该域目录**。

## 验收命令

- 正例：`node tooling/run-locked.mjs --ticket <本票号> -- node --test "packages/skill-chef/test/*.test.mjs"` 全绿，且 HTML 快照 changed=0（**行为不变的硬证据**）
- 正例：`node tooling/run-locked.mjs --ticket <本票号> -- pnpm gen:check` exit 0，且生成物里 10 个域齐
- 正例：`node docs/skills/skill-chef/t16-落位对账.mjs` → 打印 `域 10／共用位残留 0／对账偏差 0` 且 exit 0
- 反例（必跑）：从某个域目录里删掉一条命令声明 → `pnpm gen:check` 必须 exit 1 并点名该域

## 不许动的东西

- 老件一行不动；不改对外行为（argv 形态、envelope 字段、exit 码逐字节同）。
- 不改票 1 定下的 `html.dir`／`html.sceneDir` 语义。
- 不碰 `src/help/**`（说明面与 HELP 交付归票 18 与既有实现）。
- 不实现新功能——本票**只搬**，功能归 7 张域票。
- 本票与票 1、7 张域票**互斥**（同时只有一个写者），它必须先完成。

## 交付物路径

- 代码：`packages/skill-chef/src/<9 个域>/**`、`packages/skill-chef/src/{cli,fetch,policy,render}/**`（逐个定去留后的形状）
- 文档：`docs/skills/skill-chef/t16-落位对账.md`（影响清单／结构设计／交付对账 ＋ 四个工种目录的去留裁定）
- 器械：`docs/skills/skill-chef/t16-落位对账.mjs`

## 遗留出口

- 做不完当场再切一刀：按「分派与声明」（`cli` ＋ `policy`）／「数据与渲染件」（`fetch` ＋ `render`）两段拆。
- 旧共用位若有测试直接引用内部件 → 改成打接口（票 1 已立此规矩）。

## 进度：0%

下一步：先报必报五步第一／二步（会碰 4 个共用位 ＋ 9 个域目录），等维护者点头再动。
