/** #144 · 「饼干记账help」的**命名与落点**（零 IO，只出初候选）。
 *
 * 归属裁决＝地图 #143 的「落盘与命名管线的共享方式」票（[#147](https://github.com/FeatherHunter/ilife/issues/147)）：
 * 走 **(b) bill 自持一份最小管线**，不上移 `base-paint`（那是被 #96 主动冻结的渲染包，落盘是 IO、
 * 主题错位）、不让技能之间互相依赖。本模块只抄**通式**这一小块，calorie 的
 * `key→中文command`／`LEGACY_COMMAND_OVERRIDES`／动态段／内容标识段一律不搬。
 *
 * 老命名规则复刻（只读基线 `SKILLS\饼干记账\scripts\html_paths.py` ＋ 实物目录
 * `D:\2Study\StudyNotes\.db\biscuit_accountant_html\` 的四个 HELP 文件）：
 *   - 目录 `<SKILLS_DB_PATH>/biscuit_accountant_html/`，不存在则递归创建；
 *   - 文件名主体 `饼干记账_HELP`（老 `COMMAND_NAMES["help"]`），通式
 *     `〈文件名主体〉_<YYYYMMDD>_<HHMMSS>[_<N>].html`；
 *   - 时间戳取**本地**时区秒（老 `strftime("%Y%m%d_%H%M%S")`），同秒递补从 `_2` 起。
 *
 * 本模块只出**初候选**（零 IO）：最终名由 `output.ts:writeFileExclusiveWithRetry` 的 `wx` 独占
 * ＋`EEXIST` 递补仲裁——判存与写入之间无独占性，check-then-write 并发同秒必交叉覆盖
 * （#128 的因果，照抄不重演）。
 */
import { join, resolve } from 'node:path';

/** HELP 产物子目录名（老 `SKILL_HTML_NAME + "_html"`）。 */
export const HELP_HTML_DIR_NAME = 'biscuit_accountant_html';
/** 产物扩展名。 */
export const HELP_HTML_EXT = '.html';

/** 「速查／现找」那一支的产物名主体：与 HELP 文件**分名**（照 #139 判法：别让用户按一个名字
 *  打开到另一个东西）。老技能没有这一支，故无老名可循；取「饼干记账_速查表」与 HELP 并列。 */
export const LOOKUP_FILE_STEM = '饼干记账_速查表';

/** 老 `strftime("%Y%m%d_%H%M%S")` 等价物（本地时区，零填充；非法 Date 即抛，缺失阻断不返空）。 */
export function formatHelpStamp(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('[skill-bill] HELP 时间戳须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + p(now.getMonth() + 1) + p(now.getDate())
    + '_' + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());
}

/** 通式文件名 `〈文件名主体〉_<stamp>[_<n>].html`；主体原样拼入，不做清洗（老 `html_name` 同口径）。 */
export function buildHelpFileName(stem: string, date: Date, n?: number): string {
  if (typeof stem !== 'string' || stem.length === 0) {
    throw new Error('[skill-bill] buildHelpFileName stem 须为非空字符串（缺失阻断不返空）。');
  }
  const stamp = formatHelpStamp(date);
  return n === undefined
    ? stem + '_' + stamp + HELP_HTML_EXT
    : stem + '_' + stamp + '_' + String(n) + HELP_HTML_EXT;
}

/** 通式落点**初候选**（绝对路径、零 IO）：`<dbDir>/biscuit_accountant_html/〈主体〉_<stamp>.html`。
 *  目录不在此处建：写盘前由 `writeFileExclusiveWithRetry` 递归创建（老 `html_dir(mkdir=True)` 同效）。 */
export function resolveStemTarget(dbDir: string, stem: string, now: Date): string {
  return join(resolve(dbDir), HELP_HTML_DIR_NAME, buildHelpFileName(stem, now));
}
