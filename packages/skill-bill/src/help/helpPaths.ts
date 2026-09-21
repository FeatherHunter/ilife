/** #144 · 「饼干记账help」的**落点值**（目录名与两个文件名主体）。
 *
 * #237 改判（**就地改正上一轮 #147 的结论**）：#147 曾记「走 **(b) bill 自持一份最小管线**，不上移
 * `base-paint`（那是被 #96 主动冻结的渲染包，落盘是 IO、主题错位）」——该结论**已被维护者 2026-09-12
 * 裁决 8 推翻**，原话「不应该是一个独立的 base 包，放在 `base-paint` 吧，**是绘制出 html 后的相关操作**」
 * （地图 #208 的 Q7 同轮裁「乙」＝把命名与落盘收成共用位）。故时间戳格式 `YYYYMMDD_HHMMSS`（本地时间）与
 * 通式 `〈文件名主体〉_<stamp>[_N].html` **不再住这里**：唯一定义地是共用件 `base-paint/save-html` 的
 * `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`），本模块只剩「本技能自己的值」。
 *
 * #726 起**产物目录名**这一处取值改读配置文件（`html.dir`），与 `src/fetch/paths.ts` 同形：
 *   - **常量＝默认值表那一项的具名引用**（不是第二份定义地，改默认值表即跟变）；
 *   - **函数＝「配置非空即用它、空串＝默认」**那条通则（空串不是「没配」，是「按老落点」，老产物不会看起来丢了）。
 * #762 起两个文件名主体（`HELP_FILE_STEM`／`LOOKUP_FILE_STEM`）**回到代码常量**：配置项
 * `html.helpStem`／`html.quickRefStem` 已退休（#747 定稿），本件这里不再有第二个来源。
 * 落点算式与 `src/health.ts:418` 的体检报告同源：**产物目录 = `join(库目录, htmlDirName())`**。
 *
 * 老命名规则复刻（只读基线 `SKILLS\饼干记账\scripts\html_paths.py` ＋ 实物目录
 * `D:\2Study\StudyNotes\.db\biscuit_accountant_html\` 的四个 HELP 文件）：产物目录
 * `<库目录>/biscuit_accountant_html/`，文件名主体 `饼干记账_HELP`（老 `COMMAND_NAMES["help"]`）。
 */
import { BILL_CONFIG_DEFAULTS, loadBillConfig } from '../config.js';

/** HELP 产物子目录名（老 `SKILL_HTML_NAME + "_html"`）：配置项 `html.dir` 的具名引用。 */
export const HELP_HTML_DIR_NAME = BILL_CONFIG_DEFAULTS.html.dir;

/** 「速查／现找」那一支的产物名主体：与 HELP 文件**分名**（照 #139 判法：别让用户按一个名字
 *  打开到另一个东西）。老技能没有这一支，故无老名可循；取「饼干记账_速查表」与 HELP 并列。
 *  **#762 起是代码常量**（配置项 `html.quickRefStem` 已退休，本件不再读盘）。 */
export const LOOKUP_FILE_STEM = '饼干记账_速查表' as const;

/** 产物目录名：配置 `html.dir` 非空即用它，空串＝`HELP_HTML_DIR_NAME`。 */
export function htmlDirName(): string {
  const configured = loadBillConfig().values.html.dir;
  return configured !== '' ? configured : HELP_HTML_DIR_NAME;
}
