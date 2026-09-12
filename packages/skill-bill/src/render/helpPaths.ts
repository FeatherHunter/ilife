/** #144 · 「饼干记账help」的**落点值**（目录名与两个文件名主体；零 IO、零逻辑）。
 *
 * #237 改判（**就地改正上一轮 #147 的结论**）：#147 曾记「走 **(b) bill 自持一份最小管线**，不上移
 * `base-paint`（那是被 #96 主动冻结的渲染包，落盘是 IO、主题错位）」——该结论**已被维护者 2026-09-12
 * 裁决 8 推翻**，原话「不应该是一个独立的 base 包，放在 `base-paint` 吧，**是绘制出 html 后的相关操作**」
 * （地图 #208 的 Q7 同轮裁「乙」＝把命名与落盘收成共用位）。故时间戳格式 `YYYYMMDD_HHMMSS`（本地时间）与
 * 通式 `〈文件名主体〉_<stamp>[_N].html` **不再住这里**：唯一定义地是共用件 `base-paint/save-html` 的
 * `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`），本模块只剩「本技能自己的值」。
 *
 * 老命名规则复刻（只读基线 `SKILLS\饼干记账\scripts\html_paths.py` ＋ 实物目录
 * `D:\2Study\StudyNotes\.db\biscuit_accountant_html\` 的四个 HELP 文件）：产物目录
 * `<SKILLS_DB_PATH>/biscuit_accountant_html/`，文件名主体 `饼干记账_HELP`（老 `COMMAND_NAMES["help"]`）。
 */

/** HELP 产物子目录名（老 `SKILL_HTML_NAME + "_html"`）。 */
export const HELP_HTML_DIR_NAME = 'biscuit_accountant_html';

/** 「速查／现找」那一支的产物名主体：与 HELP 文件**分名**（照 #139 判法：别让用户按一个名字
 *  打开到另一个东西）。老技能没有这一支，故无老名可循；取「饼干记账_速查表」与 HELP 并列。 */
export const LOOKUP_FILE_STEM = '饼干记账_速查表';
