/** T2-②a #133 · HELP 落盘的**本技能自己的值**（目录名、扩展名、速查台主体；零 IO、零逻辑）。
 *
 * #237 改判（**就地改正上一轮的结论**）：时间戳格式 `YYYYMMDD_HHMMSS`（本地时间）与通式
 * `〈文件名主体〉_<stamp>[_N].html` **不再住这里**——维护者 2026-09-12 裁决 8「不应该是一个独立的 base 包，
 * 放在 `base-paint` 吧，是绘制出 html 后的相关操作」＋ 地图 #208 的 Q7 裁「乙」（收成共用位）之后，
 * 命名的唯一定义地是共用件 `base-paint/save-html` 的 `saveHtmlFile`
 * （`packages/base-render/src/output/saveHtml.ts`）；原先本模块的 `formatHelpStamp`／
 * `buildHelpFileName`／`resolveStemTarget` 已随之删除（旧 `writeFileExclusiveWithRetry` 的递补口径由共用件持有）。
 *
 * 老命名规则复刻（只读基线 `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`）：
 *   - 文件名主体原样使用：可含中文／空格／`：`／`vs`／`_`（老 `html_name` 只 sanitize `suffix`，`command` 不洗）；
 *   - 输出目录：老 `db_path.parent / calorie_html`（`db_path` 为 db **文件**）≡
 *     TS 线 `join(dbDir, 'calorie_html')`（`dbDir` 为 `SKILLS_DB_PATH` **目录**，见 `src/paths.ts`）；
 *     目录不存在则递归创建（老 `html_dir(mkdir=True)`），不写死任何盘符。
 */

/** HELP 产物子目录名（老 `SKILL_HTML_NAME + "_html"`，卡路里 → `calorie_html`）。 */
export const HELP_HTML_DIR_NAME = 'calorie_html';
/** HELP 产物扩展名。 */
export const HELP_HTML_EXT = '.html';

/** 速查台（#88，须显式 `mode` 才出）的文件名主体：与 HELP 文件分名，两份产物不撞名。 */
export const SHEET_FILE_STEM = '卡路里_速查台';
