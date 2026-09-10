# base-paint help模板铁律

1. 新页面只许 blocks 组装，禁新巨串：HTML/CSS/JS 大字面量不得进 `src`（走子路径 `base-paint/blocks` 组合或本 help模板管线）。
2. 改模板只改源：`assets/help-template.html`（唯一真相源；3 槽注释即契约；行尾 CRLF 禁转 LF）。
3. 改后跑 gen：一键 `pnpm --filter base-paint gen:help-shell`（重写 `src/helpShell.ts`＋测试哈希；`--check` 在 CI 验 drift）。
4. 过门：字节锁（`test/help-shell-136.test.mjs` 哈希）＋像素门（skill-calorie `help-shell-134` 双端/覆盖序）＋ `tsc -b` 全绿。
5. 手改生成物（`src/helpShell.ts`／测试哈希）必红：`--check` 非 0＋字节锁红。
6. 源不进包：`files` 仅 `dist`（省约 105KB；追溯靠仓库＋哈希锁），包内只留 `dist/helpShell.js`。
