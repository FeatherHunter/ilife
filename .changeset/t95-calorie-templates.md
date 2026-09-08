---
"skill-calorie": patch
---

#95 打包与模板装载：6 模板随包发布 ＋ loader 真读（files／publish 门／CI 断言）

- skill-calorie `files` 加 `templates/*.html`：tsc 不复制非 TS 资源，模板只能靠 `files` 随包发；此前 `files=["dist","SKILL.md"]`，安装包里 `templates/` 根本不存在 → 模板不可达。
- 新增 `src/render/templates.ts`（`CALORIE_TEMPLATES` ＋ `loadTemplate`，范式同 skill-chef/skill-bill），经 `render/index.ts` 导出：未知模板抛 `bad-input`、文件缺失抛 `missing-data`，不返空。
- `tooling/check-publish.mjs`：`WITH_TEMPLATES` 收入 skill-calorie；G2 tarball 逐件点名 6 模板；G3 fresh 安装态逐件 `loadTemplate` 真读（安装产物内读文件，不看清单）。
- CI `publish-gates` 增「模板资产门」：单包显式复跑 `--tarball --only skill-calorie` ＋ `--fresh-tmp --only skill-calorie`。
- 未接线记账：`html.ts` 的 pageShell 仍自建壳，未走 loader（该文件不在 #95 写权限内），接缝留给后续票。
- 发版后待 HITL：`npm i skill-calorie@<新版>` 后从安装态 `loadTemplate` 可读 6 件。
