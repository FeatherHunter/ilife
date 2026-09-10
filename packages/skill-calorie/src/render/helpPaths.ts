/** T2-②a #133 · HELP 落盘命名工具（只做命名，不碰渲染接线）。
 *
 * 老命名规则复刻（只读基线 `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`）：
 *   - 通式 `〈茎〉_<YYYYMMDD>_<HHMMSS>[_<n>].html`（`html_name`）
 *   - HELP 形即茎为 `卡路里_HELP` 的通式（`卡路里_HELP_<ts>.html`）
 *   - 文件名秒 ＝ 产出时刻秒（本地时区，`strftime("%Y%m%d_%H%M%S")`）
 *   - 同秒碰撞追加 `_2`／`_3`…（首个冲突 `_2`）
 *   - 茎原样使用：可含中文／空格／`：`／`vs`／`_`（老 `html_name` 只 sanitize `suffix`，`command` 不洗）
 *   - 输出目录：老 `db_path.parent / calorie_html`（`db_path` 为 db **文件**）≡
 *     TS 线 `join(dbDir, 'calorie_html')`（`dbDir` 为 `SKILLS_DB_PATH` **目录**，见 `src/paths.ts`）；
 *     目录不存在则递归创建（老 `html_dir(mkdir=True)`），不写死任何盘符。
 *
 * 与 `src/output.ts` 的分工：`output.ts` 是 CLI 默认落点全量管线（含 `--output` 覆盖、
 * `readdirSync` 计数、`wx` 并发重试）；本模块是 HELP 渲染接线（T2-②b）的前置小件。
 * 耦合实话（S3-1）：`exists` 回调注入只隔离「命名决策」（可单测），本模块仍做
 * `mkdirSync` 真 IO（`resolveHelpPath` 内）；真正零 IO 的是纯函数
 * `buildHelpFileName／formatHelpStamp`。②b 接线落盘**不用**本模块的 `exists` 循环
 * 定最终名（判存与写入之间无独占性，并发必交叉），只用 `buildHelpFileName` 算初候选，
 * 最终名由 `output.ts:writeFileExclusiveWithRetry` 的 `wx`＋`EEXIST` 重试仲裁。
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** HELP 产物子目录名（老 `SKILL_HTML_NAME + "_html"`，卡路里 → `calorie_html`）。 */
export const HELP_HTML_DIR_NAME = 'calorie_html';
/** HELP 产物扩展名。 */
export const HELP_HTML_EXT = '.html';

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

/** 通式文件名 `〈茎〉_<stamp>[_<n>].html`；茎原样拼入，不做任何清洗。 */
export function buildHelpFileName(stem: string, date: Date, n?: number): string {
  if (typeof stem !== 'string' || stem.length === 0) {
    throw new Error('[skill-calorie] buildHelpFileName stem 须为非空字符串（缺失阻断不返空）。');
  }
  const stamp = formatHelpStamp(date);
  return n === undefined ? stem + '_' + stamp + HELP_HTML_EXT : stem + '_' + stamp + '_' + String(n) + HELP_HTML_EXT;
}

/** HELP 落点绝对路径：`<dbDir>/calorie_html/〈茎〉_<stamp>[_<n>].html`。
 *
 * @param dbDir  DB 目录（`SKILLS_DB_PATH` 口径的目录，非 db 文件）。
 * @param stem   文件名茎（如 `卡路里_HELP`），原样使用。
 * @param date   产出时刻（文件名秒取其本地时区秒）。
 * @param exists 碰撞判定回调（接线时传 `existsSync`）；首候选已存在则 `_2` 起递增。
 * @returns 绝对路径；`calorie_html` 目录不存在则递归创建。
 */
export function resolveHelpPath(
  dbDir: string,
  stem: string,
  date: Date,
  exists: (candidateAbs: string) => boolean,
): string {
  const dir = join(resolve(dbDir), HELP_HTML_DIR_NAME);
  mkdirSync(dir, { recursive: true });
  let candidate = join(dir, buildHelpFileName(stem, date));
  let n = 2;
  while (exists(candidate)) {
    candidate = join(dir, buildHelpFileName(stem, date, n));
    n += 1;
  }
  return candidate;
}
