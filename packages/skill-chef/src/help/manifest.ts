/** #215 · 私家大厨 HELP 产物的**落点值**（本技能自己的三个值；零逻辑、零 IO）。
 *
 * 形状照 `docs/skills/skill-chef/t236-structure-design.md` §1.2 的 A2 行：① 落点子目录两段；
 * ② HELP 文件名主体；③ 速查支文件名主体。三个值都是**调用者能给的值**，装配层拿它拼出
 * `base-paint/save-html` 要的 `{dir, stem}`（`src/help/helpFile.ts`）。
 *
 * 命名与落盘的**逻辑**一概不在这里（维护者 2026-09-12 裁决 8：「放在 `base-paint` 吧，是绘制出
 * html 后的相关操作」）：时间戳格式 `YYYYMMDD_HHMMSS`、同秒 `_N` 递补、绝不静默覆盖，唯一定义地是
 * 共用件 `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`）。写在这里就是同一件事的
 * 第二份定义（铁律二）。
 *
 * 老件对应物：`SKILLS\私家大厨\scripts\render_help.py` 的 `$CHEF_OUTPUT_DIR/help/私家大厨_HELP_<stamp>.html`。
 * 落盘位置经用户 2026-09-12 改判：老目录 `CookHub/` 换成 `cook_html/`（与 `calorie_html/`／
 * `biscuit_accountant_html/`／`home_manager_html/` 同形），`help/` 子目录保留；文件名主体不变。
 */

/** 落点子目录两段：`<SKILLS_DB_PATH>/cook_html/help/`（实机 `D:\2Study\StudyNotes\.db\cook_html\help\`）。 */
export const HELP_DIR_SEGMENTS = ['cook_html', 'help'] as const;

/** HELP 文件名主体：产物＝`私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`（老件通式逐字，`_N` 从 1 起步）。 */
export const HELP_FILE_STEM = '私家大厨_HELP' as const;

/** 速查支的文件名主体：与 HELP 文件**分名**（照 #139 判法——别让用户按一个名字打开到另一个东西）。
 *  老家只有 HELP 一支、无老名可循；取名照样板图 #143（记账的 `饼干记账_速查表`）的同一后缀。 */
export const LOOKUP_FILE_STEM = '私家大厨_速查表' as const;
