---
"skill-calorie": patch
---

#107 HELP：6 个死模板并入重建（不再有「存在但零引用」）

- **诊断**：`templates/*.html` 6 件（home／diet／exercise／goal／photo-gallery／help，各 41 行）此前只被
  `src/render/templates.ts` 的装载器、`skill-t11` 测试与发布门读，**生产渲染链零消费**；内容＝页名 ＋
  取数命令 ＋ 空容器壳（`#118` 分型 `legacy`，无 `<!--CONTENT-->`／`<!--INJECT-DATA-->`，不可填充）。
- **处置：并入 HELP 重建**（地图 #63 D4）。落点 `src/render/helpCenter.ts` 新增 S3 段：逐件经 `loadTemplate`
  真读盘 → 抽取 `<h1>`（页名）／`<p class="lead">`（一句说明）／`<pre class="view-cli">`（取数命令）三锚点
  （恰 1 处，缺失/重复/空值抛 `missing-data`，命令非 `calorie-cmd-read` 开头抛 `bad-input`）→ 经
  base-paint 契约既有槽位 `SceneData.meta_blocks` 渲染进速查台「看板页入口」块。
- **真被渲染**：`file`／`inline` 走 `meta_blocks`（`help.ts:653-656`，落在 `<section id="ilife-help-shell">` 内），
  `text` 走 `[看板页入口]` 文本段；`renderHelpCenterHtml` **签名与三态语义不变**。生产可达：
  `calorie.help.center`（`cmd_read.ts:91`）即调该函数。
- **不回归**：`data-scene-id` 436／`data-subgroup-id` 54／`data-action-id` 1308 三计数不变、元素 id 全唯一、
  冻结标记残留 0（只读探针 25/25；`help-center-88.test.mjs` 与 `help-center-91.test.mjs` 全绿）。
- **测试同步**：`test/skill-t11.test.mjs` 文件名硬断言**保留**（6 件仍在）＋ 新增三锚点计数断言、
  「模板 6 件被 HELP 速查台真正渲染」（三态逐条落地、text 场景行恒 436）、入口块自负转义断言。
- **模板侧**：`<p class="lead">` 由「重复命令」改为一句说明；取数 `<pre>` 加 `class="view-cli"` 锚点；
  行数/标记形态/行号不变（`#118` 清单与 `t95` 打包门不受影响）。
- 未做：新函数未经 `src/render/index.ts` 公开导出（该文件不在本票路径所有权内）；速查台 file 态体积 ＋≈5 KB，
  `t88-final.md` 的体积登记值随之陈旧（禁改名单内，S3 记账）。
