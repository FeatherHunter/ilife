---
'skill-calorie': minor
---

#139（map #131 目的地①）· `calorie.help.center` 缺省交付物改判：缺省＝老实物同款 HELP 文件（`卡路里_HELP_<TS>.html`，V4 三级目录壳，约 300 KB），与老技能同名同视觉；速查台（#88）改为**显式** `--params '{"mode":"file"|"inline"|"text"}'` 才出，独立命名 `卡路里_速查台_<TS>.html`（两份产物不撞名）。

同时删掉 T2-②b 那座「只被单测调用」的孤岛：`render/helpFile.ts:runHelpFile` 及其自带落盘／根镜像／唤醒词闭集全部移除，落点命名与写盘统一回 CLI 交付管线（`output.ts:deliverHtml`，`wx` 独占＋`EEXIST` 递补＋绝对路径回执）；`resolveHelpPath` 的判存循环一并删除（check-then-write 语义）。

**改动**：`src/cli/cmd_read.ts`（help.center 按 `mode` 分流＋`DispatchOut.target` 透传）、`src/render/helpPaths.ts`（新增 `resolveStemTarget`／`SHEET_FILE_STEM`）、`src/render/helpFile.ts`（收成纯内容模块，零 IO）、`SKILL.md`（HELP 节改口径）；测试新增 `test/help-delivery-139.test.mjs`（CLI 级锁：真跑出口断文件名／壳／回执／`_2` 递补），`help-center-91`／`delivery-83`／`help-paths-133` 按新标准更新，删除 `help-file-133`（孤岛测试）。

**证据**：真机口径（`SKILLS_DB_PATH=D:\2Study\StudyNotes\.db`）实跑 → `D:\2Study\StudyNotes\.db\calorie_html\卡路里_HELP_20260910_185925.html`（297,655 B，`delivery.template=doc-shell`），与老实物 `卡路里_HELP_20260906_220726.html`（303,199 B）同壳同量级；速查台 `mode:'file'` → `卡路里_速查台_<TS>.html`（1,264,952 B，`help-shell`）不回退。
