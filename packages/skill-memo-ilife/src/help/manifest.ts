/** #229 · 备忘录 HELP 产物的**命名与落点值**（本技能自己的三个值；零逻辑、零 IO）。
 *
 * 三条值都出自裁决正本 `docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md`：
 *  - `HELP_HTML_DIR_NAME`＝裁决 1（落盘目录**扁平** `<SKILLS_DB_PATH>/memo_html/`，**不加** `help/` 一层；
 *    老实物 `memo_html\备忘录_HELP_20260820_150143_2.html` 等 12 件以上同落此处，验收票 #233 要求「与老实物并排」）；
 *  - `HELP_FILE_STEM`＝裁决 1（缺省交付物主体）；
 *  - `LOOKUP_FILE_STEM`＝裁决 2（速查支产物名 `备忘录_速查表`，**与 HELP 分名**——照 #139 判法：
 *    别让用户按一个名字打开到另一个东西）。
 *
 * ⚠️ 本模块**只放值**。命名与落盘的**逻辑**一概不在这里，也不在本包任何地方：时间戳格式
 * `YYYYMMDD_HHMMSS`（本地时区）、同秒 `_N` 递补（**从 `_2` 起**）、绝不静默覆盖、写后回读字节数、
 * 绝对路径回执——唯一定义地是**共用件** `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`，
 * 出口子路径 `base-paint/save-html`）。本包原先自持的那一小块（第 4 份同逻辑实现
 * `src/help/memoOutput.ts`）已由 [#240](https://github.com/FeatherHunter/ilife/issues/240) 迁走并删除，
 * 落盘改由出口 `src/cli/cmd_read.ts` 直接调共用件。
 * 本件**不进** `src/help/index.ts` 的转发（裁决 16：不扩包根出口）。
 */

/** 产物子目录名（老 `SKILL_HTML_NAME + "_html"`；判决「扁平、不加 `help/`」见件头）。 */
export const HELP_HTML_DIR_NAME = 'memo_html';

/** 缺省（不给任何参数）那支的产物名主体：`备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`。 */
export const HELP_FILE_STEM = '备忘录_HELP';

/** 显式 `mode:"lookup"` 那支的产物名主体：`备忘录_速查表_<YYYYMMDD_HHMMSS>[_N].html`。 */
export const LOOKUP_FILE_STEM = '备忘录_速查表';
