## Question

照 `#148`／`#191` 的做法，用**真 spawn 出口**的 CLI 级用例把出口口径钉死，防止以后改动悄悄改掉文件名或落盘行为。

照记账那张图的五例：① 名字通式 ② help 模板前后缀逐字 ③ 并发 6 次独占递补 ④ 三支互不串 ⑤ 退出码矩阵。

要点：

- 实现由出口票落地，故这五例的**红→绿**要用**变异自证**（改文件名主体 → ①④红；`wx` → `w` → ③红；还原全绿），并把变异前后的输出留证。
- 还原后须 `tsc -b --force` 干净重建，否则陈旧 `dist` 会假红（记账那张图踩过这一步）。
- 用例住 `packages/skill-memo-ilife/test/`（或仓根 `test/`，照新仓现行约定），在包内 `npm test` 脚本里挂得上——票 1 若查出「包内 `test` 脚本盖不到新用例」，本票同批修。

完成判据：五例在真 spawn 下全绿，且变异自证留证。

## 进度：100%

交付件（逐条证据见 `docs/skills/skill-memo-ilife/t230-report.md`）：

- **新增** `packages/skill-memo-ilife/test/cli-help-230.test.mjs`（251 LF／5 个顶层 `test()`，只经真 spawn，不直接调模块）；
- **改 1 行** `packages/skill-memo-ilife/package.json`：`scripts.test` → `"node --test ../../test/scaffold.test.mjs test/*.test.mjs"`（同批修裁决 5 §五-4；该文件另一半归票 8，未动）；
- **新增** 报告 `docs/skills/skill-memo-ilife/t230-report.md`。

实测（只构建本包，禁仓根 `tsc -b`）：

- 五例真 spawn **5/5 绿**（exit 0）；包内 `test/` 全量 **53/53 绿**（基线 48 ＋ 本票 5）。
- 变异自证：改文件名主体（`备忘录_HELP` → `备忘录_HELPX`）⇒ **①④红**（②③⑤仍绿）；`wx` → `w` ⇒ **③红**（其余仍绿，实测 6 次并发全落同一落点）。逐字还原后两个源件 sha256 与变异前**逐位相同**，删 `tsconfig.tsbuildinfo` ＋ `tsc --build … --force` 重建后**全绿**。
- 临时库全在 `%TEMP%`（`SKILLS_DB_PATH` 指过去）：**本票用例与探针零写入真库**（实测重跑整包 `test/*.test.mjs` 前后比对，真库 `memo_html` 新增 **0 件**）。真库今日另有 2 件（`13:44:56`／`13:50:29`，同 sha `7CBE622A…`）属编排会话的独立端到端回归，逐件归因见报告 §7。
- ⚠️ 完成判据**不含**「包内 `npm test` 绿」：`npm test` 今天仍红，红点是 `tooling/write-snapshot.mjs --check` 快照过期（裁决 18 已记在案的既有状态；该 sha 的输入只有 `packages/ilife-skills/package.json` ＋ `packages/base-combos/{combos.yaml,src/present.ts}`，不含本包任何一件）。
- 记账项（留给 `#237`／`#240`，本票不改）：`writeFileExclusiveWithRetry` 把 `mkdirSync` 的 `EEXIST` 误判成「候选已存在」，`memo_html` 被文件占位时会空转 1000 次重试（退出码仍是 5）。

下一步：待复审／终审对账。
