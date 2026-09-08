---
"skill-calorie": patch
---

#95 打包与模板装载：6 模板随包发布 ＋ loader 真读（files／publish 门／CI 断言）

- skill-calorie `files` 加 `templates/*.html`：tsc 不复制非 TS 资源，模板只能靠 `files` 随包发；此前 `files=["dist","SKILL.md"]`，安装包里 `templates/` 根本不存在 → 模板不可达。
- 新增 `src/render/templates.ts`（`CALORIE_TEMPLATES` ＋ `loadTemplate`，范式同 skill-chef/skill-bill），经 `render/index.ts` 导出：未知模板抛 `bad-input`、文件缺失抛 `missing-data`，不返空。
- `tooling/check-publish.mjs`：`WITH_TEMPLATES` 收入 skill-calorie；G2 tarball 逐件点名 6 模板；G3 fresh 安装态**按应发清单逐件** `loadTemplate` 真读（安装产物内读文件，不看清单；少发一件即红）。
- CI `publish-gates` 增「模板资产门」：单包显式复跑 `--tarball --only skill-calorie` ＋ `--fresh-tmp --only skill-calorie` ＋ `--tmp-hygiene` ＋ `t95-g3-honesty`／打包实证三连。
- 返修（A1 FAIL 76／A2 FAIL 67 裁定）：
  - **临时根回仓外**：G3 的 `TMP_ROOT` 一律 `os.tmpdir()`。2×2 实测证明「`npm install` 空跑」的决定性变量是**安装目录缺最小 `package.json`**，与 `%TEMP%` 是否非 ASCII 无关——旧写法把临时根退回仓库内 `.scratch/`，等于在仓库内跑 `npm install`（违反 `.scratch/t75/concurrency-protocol.md` §2.1，与 2026-09-09 全仓事故同机制）。
  - **清理守卫**：`check-publish.mjs` 与 `docs/research/t95-publish-evidence.mjs` 的 `rmSync` 全部经路径守卫（须在独占临时根下、且不在 `node_modules`／`packages`／`docs`／`test`／`tooling`／`.git` 之下），失败即抛；临时目录用完即清（含 G3 的 DB 临时目录），新增 `--tmp-hygiene` 守「临时根在仓外 ＋ 仓内无残留」。
  - **门必须说真话**：G3 结论按 scope 分支——`--only skill-calorie` 下契约断言打印「未跑（本 scope 不含插件包）」，不再无条件打印「断言全绿／契约键打通」；安装态 `import('skill-calorie/render')` 的**公开出口断言如实记账为未跑**（registry `base-paint` 落后工作区缺 `ACTION_ID_ATTR`，**真崩**而非假红，待 base-paint 发版后补——本票不发布 base-paint）。
  - **`missing-data` 有守卫**：`skill-t11` 新增「缺文件必须抛 `missing-data`」断言（安装布局副本造缺件，不碰仓库内模板文件）。
- 未接线记账：`html.ts` 的 pageShell 仍自建壳，未走 loader（该文件不在 #95 写权限内）；6 模板补占位符槽／并入 HELP 重建归 **#107**。发版后待 HITL：`npm i skill-calorie@<新版>` 后从安装态 `loadTemplate` 可读 6 件。
