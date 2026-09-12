/** #229 · 备忘录 HELP 产物的**命名清单**（只放值，逻辑在 `memoOutput.ts`）。
 *
 * 三条值都出自裁决正本 `docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md`：
 *  - `HELP_HTML_DIR_NAME`＝裁决 1（落盘目录**扁平** `<SKILLS_DB_PATH>/memo_html/`，**不加** `help/` 一层；
 *    老实物 `memo_html\备忘录_HELP_20260820_150143_2.html` 等 12 件以上同落此处，验收票 #233 要求「与老实物并排」）；
 *  - `HELP_FILE_STEM`＝裁决 1（缺省交付物主体）；
 *  - `LOOKUP_FILE_STEM`＝裁决 2（速查支产物名 `备忘录_速查表`，**与 HELP 分名**——照 #139 判法：
 *    别让用户按一个名字打开到另一个东西）。
 *
 * ⚠️ 本模块**只放值**：命名通式／独占递补／交付函数全在 `memoOutput.ts`（那边也从本模块转出口，
 * 故出口层只需 import 一处）。本件**不进** `src/help/index.ts` 的转发（裁决 16：不扩包根出口）。
 */

/** 产物子目录名（老 `SKILL_HTML_NAME + "_html"`；判决「扁平、不加 `help/`」见件头）。 */
export const HELP_HTML_DIR_NAME = 'memo_html';

/** 缺省（不给任何参数）那支的产物名主体：`备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`。 */
export const HELP_FILE_STEM = '备忘录_HELP';

/** 显式 `mode:"lookup"` 那支的产物名主体：`备忘录_速查表_<YYYYMMDD_HHMMSS>[_N].html`。 */
export const LOOKUP_FILE_STEM = '备忘录_速查表';
