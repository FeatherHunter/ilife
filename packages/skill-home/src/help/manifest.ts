/** #190 · 居家管家 HELP 产物的**三个落点值**（零逻辑、零 IO；导出面按铁律五只出值，不出函数）。
 *
 *  三个值＝调用者能给的最小信息：① 落点子目录名；② HELP 文件名主体；③ 速查支文件名主体。
 *  出口层（`src/cli/cmd_read.ts`）拿它拼出共用件 `base-paint/save-html` 要的 `{dir, stem}`，
 *  再交给 `src/help/output.ts` 那次调用——本件不碰 IO、不认 `SKILLS_DB_PATH`。
 *
 *  ⚠️ **时间戳通式（`YYYYMMDD_HHMMSS`）／同秒 `_N` 递补／独占写（`wx` ＋ `EEXIST`）／复用窗口／
 *  绝对路径回执一概不在这里**：`#237` 起唯一定义地是共用件 `saveHtmlFile`
 *  （`packages/base-render/src/output/saveHtml.ts`，账单／卡路里／大厨／作息／备忘五家在用）。
 *  写在这里就是同一件事的第二份定义（铁律二）——账单旧版的 `nextExclusiveCandidate`／
 *  `writeFileExclusiveWithRetry` 已经搬进共用件，**不许抄回来**。
 *
 *  老件对应物：老 `help_center.py` 的
 *  `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`（目录名逐字保留，无 `help/` 子层）。
 */

/** 落点子目录名：产物＝`<SKILLS_DB_PATH>/home_manager_html/…`（老家目录名逐字）。 */
export const HELP_HTML_DIR_NAME = 'home_manager_html' as const;

/** HELP 文件名主体：产物＝`居家管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`（老通式逐字；递补起步值走共用件缺省）。 */
export const HELP_FILE_STEM = '居家管家_HELP' as const;

/** 速查支的文件名主体：与 HELP 文件**分名**（照 #139 判法——别让用户按一个名字打开到另一个东西）。
 *  老家只有 HELP 一支、无老名可循；取名照样板图 #143（账单的 `饼干记账_速查表`／卡路里的 `卡路里_速查台`）同一后缀。 */
export const LOOKUP_FILE_STEM = '居家管家_速查表' as const;
