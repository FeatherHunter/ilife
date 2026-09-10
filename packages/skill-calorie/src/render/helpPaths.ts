/** T2-②a #133 · HELP 落盘命名工具（只做命名，不碰渲染接线）。
 *
 * 老命名规则复刻（只读基线 `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`）：
 *   - 通式 `〈文件名主体〉_<YYYYMMDD>_<HHMMSS>[_<n>].html`（`html_name`）
 *   - HELP 形即文件名主体为 `卡路里_HELP` 的通式（`卡路里_HELP_<ts>.html`）
 *   - 文件名秒 ＝ 产出时刻秒（本地时区，`strftime("%Y%m%d_%H%M%S")`）
 *   - 同秒碰撞追加 `_2`／`_3`…（首个冲突 `_2`）
 *   - 文件名主体原样使用：可含中文／空格／`：`／`vs`／`_`（老 `html_name` 只 sanitize `suffix`，`command` 不洗）
 *   - 输出目录：老 `db_path.parent / calorie_html`（`db_path` 为 db **文件**）≡
 *     TS 线 `join(dbDir, 'calorie_html')`（`dbDir` 为 `SKILLS_DB_PATH` **目录**，见 `src/paths.ts`）；
 *     目录不存在则递归创建（老 `html_dir(mkdir=True)`），不写死任何盘符。
 *
 * 本模块只出**初候选**（`resolveStemTarget`，零 IO）：最终名由
 * `output.ts:writeFileExclusiveWithRetry` 的 `wx` 独占＋`EEXIST` 递补仲裁——
 * 判存与写入之间无独占性，check-then-write 并发同秒必交叉覆盖（S2）。
 */
import { join, resolve } from 'node:path';

/** HELP 产物子目录名（老 `SKILL_HTML_NAME + "_html"`，卡路里 → `calorie_html`）。 */
export const HELP_HTML_DIR_NAME = 'calorie_html';
/** HELP 产物扩展名。 */
export const HELP_HTML_EXT = '.html';

/** 速查台（#88，须显式 `mode` 才出）的文件名主体：与 HELP 文件分名，两份产物不撞名。 */
export const SHEET_FILE_STEM = '卡路里_速查台';

/** 老 `strftime("%Y%m%d_%H%M%S")` 等价物（本地时区，零填充）。 */
export function formatHelpStamp(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('[skill-calorie] buildHelpFileName date 须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    p(now.getMonth() + 1) +
    p(now.getDate()) +
    '_' +
    p(now.getHours()) +
    p(now.getMinutes()) +
    p(now.getSeconds())
  );
}

/** 通式文件名 `〈文件名主体〉_<stamp>[_<n>].html`；主体原样拼入，不做任何清洗。 */
export function buildHelpFileName(stem: string, date: Date, n?: number): string {
  if (typeof stem !== 'string' || stem.length === 0) {
    throw new Error('[skill-calorie] buildHelpFileName stem 须为非空字符串（缺失阻断不返空）。');
  }
  const stamp = formatHelpStamp(date);
  return n === undefined ? stem + '_' + stamp + HELP_HTML_EXT : stem + '_' + stamp + '_' + String(n) + HELP_HTML_EXT;
}

/** 通式落点**初候选**（绝对路径、零 IO）：`<dbDir>/calorie_html/〈文件名主体〉_<stamp>.html`。
 *
 * 目录不在此处建：`writeFileExclusiveWithRetry` 落盘前 `mkdirSync(recursive)`（#83 返修 F4 同口径）。
 *
 * @param dbDir DB 目录（`SKILLS_DB_PATH` 口径的目录，非 db 文件）。
 * @param stem  文件名主体（如 `卡路里_HELP`），原样使用。
 * @param now   产出时刻（文件名秒取其本地时区秒）。
 */
export function resolveStemTarget(dbDir: string, stem: string, now: Date): string {
  return join(resolve(dbDir), HELP_HTML_DIR_NAME, buildHelpFileName(stem, now));
}
