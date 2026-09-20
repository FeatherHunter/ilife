## Question

票 2 的形状定稿要落到盘上：21 条命令从 `cmd_read.ts` 的 switch 迁进 9 个域的能力目录，派生共用位重跑，门禁绿，既有用例全绿。

## 目标

按 `scene-pages-structure.md` 搬目录、建能力门与命令声明；跑 `pnpm gen` 派生共用位（`gen:check` 绿）；`cmd_read.ts` 瘦到只做分派；既有 CLI 用例与包内用例全绿；超线件按定稿处置，并在包 `AGENTS.md` 台账如实登记（含第五步「交付对账」）。

## 验收命令

`node tooling/run-locked.mjs --ticket <本票号> -- node node_modules/typescript/bin/tsc -b packages/skill-home` 与 `node tooling/run-locked.mjs --ticket <本票号> -- pnpm test` —— **两条 exit 0**，且搬前／搬后的用例读数逐条一致（迁移不改行为）。

## 不许动的东西

不改命令键名与出参形状（21 条键的对外契约不动）；不动页面模板内容（本票只搬结构）；不碰其它包与公共层。

## 交付物路径

`packages/skill-home/src/**`；包 `AGENTS.md` 台账；迁移对账 `docs/skills/skill-home/structure-landing.md`。

## 遗留出口

搬不动或按定稿留待处置的（如 `fetch/db.ts` 超线）逐条登记去处，不留在对话里。
