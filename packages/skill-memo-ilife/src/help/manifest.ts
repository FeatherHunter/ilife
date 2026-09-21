/** #229 · 备忘录 HELP 产物的**命名与落点值**（本技能自己的三个值）。
 *
 * 三条值都出自裁决正本 `docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md`：
 *  - `html.dir`＝裁决 1（落盘目录**扁平** `<库目录>/memo_html/`，**不加** `help/` 一层；
 *    老实物 `memo_html\备忘录_HELP_20260820_150143_2.html` 等 12 件以上同落此处，验收票 #233 要求「与老实物并排」）；
 *  - `files.help`＝裁决 1（缺省交付物主体）；
 *  - `files.lookup`＝裁决 2（速查支产物名 `备忘录_速查表`，**与 HELP 分名**——照 #139 判法：
 *    别让用户按一个名字打开到另一个东西）。
 *
 * **#695 起落点目录值的唯一事实源是配置文件**（`~/.ilife/memo.yaml`，默认值表住 `src/config.ts`）：
 * 本件从配置取，空串回落到默认；`helpHtmlDirName` 的下标名字与老常量逐字对应
 * （`HELP_HTML_DIR_NAME`），只是从「常量」变成「取值函数」。
 * **#760 起两个产物名主体回代码常量**（`files.help`／`files.lookup` 删键，定稿 #759；照记账样板 #762 的
 * `HELP_FILE_STEM`／`LOOKUP_FILE_STEM`）：`helpFileStem()`／`lookupFileStem()` 不再读配置。
 *
 * ⚠️ 本模块**只放值**。命名与落盘的**逻辑**一概不在这里，也不在本包任何地方：时间戳格式
 * `YYYYMMDD_HHMMSS`（本地时区）、同秒 `_N` 递补（**从 `_2` 起**）、绝不静默覆盖、写后回读字节数、
 * 绝对路径回执——唯一定义地是**共用件** `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`，
 * 出口子路径 `base-paint/save-html`）。本包原先自持的那一小块（第 4 份同逻辑实现
 * `src/help/memoOutput.ts`）已由 [#240](https://github.com/FeatherHunter/ilife/issues/240) 迁走并删除，
 * 落盘改由出口 `src/cli/cmd_read.ts` 直接调共用件。
 * 本件**不进** `src/help/index.ts` 的转发（裁决 16：不扩包根出口）。
 */
import { loadMemoConfig } from '../config.js';

/** 产物子目录名的默认值（老 `SKILL_HTML_NAME + "_html"`；判决「扁平、不加 `help/`」见件头）。
 *  配置项 `html.dir` 空串即用它。 */
export const DEFAULT_HELP_HTML_DIR_NAME = 'memo_html';

/** 缺省交付物主体（#760 起回代码常量；老配置键 `files.help` 已退休，见 `MEMO_CONFIG_RETIRED`）。 */
export const HELP_FILE_STEM = '备忘录_HELP' as const;

/** 速查支产物主体（#760 起回代码常量；老配置键 `files.lookup` 已退休，见 `MEMO_CONFIG_RETIRED`）。 */
export const LOOKUP_FILE_STEM = '备忘录_速查表' as const;

/** 产物子目录名：配置 `html.dir`，空串＝默认（扁平一段，`memo_html`）。 */
export function helpHtmlDirName(): string {
  const dir = loadMemoConfig().values.html.dir;
  return dir === '' ? DEFAULT_HELP_HTML_DIR_NAME : dir;
}

/** 缺省（不给任何参数）那支的产物名主体：`备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`。 */
export function helpFileStem(): string {
  return HELP_FILE_STEM;
}

/** 显式 `mode:"lookup"` 那支的产物名主体：`备忘录_速查表_<YYYYMMDD_HHMMSS>[_N].html`。 */
export function lookupFileStem(): string {
  return LOOKUP_FILE_STEM;
}
