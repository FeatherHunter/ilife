/** #215 · 私家大厨 HELP 产物的**落点值**（本技能自己的三个值）。
 *
 * 形状照 `docs/skills/skill-chef/t236-structure-design.md` §1.2 的 A2 行：① 落点子目录；② HELP 文件名主体；
 * ③ 速查支文件名主体。三个值都是**调用者能给的值**，装配层拿它拼出 `base-paint/save-html` 要的
 * `{dir, stem}`（`src/help/helpFile.ts`）。
 *
 * **#695 起值的唯一事实源是配置文件**（`~/.ilife/chef.yaml`，默认值表住 `src/config.ts`）：本件从配置取，
 * 空串回落到默认；目录那一项是**段串**（`cook_html/help`），段数由值自己决定——老技能里大厨／作息是两段、
 * 备忘／居家是一段，同一套配置形状要能表达「几段」。
 *
 * 命名与落盘的**逻辑**一概不在这里（维护者 2026-09-12 裁决 8：「放在 `base-paint` 吧，是绘制出 html 后的
 * 相关操作」）：时间戳格式 `YYYYMMDD_HHMMSS`、同秒 `_N` 递补、绝不静默覆盖，唯一定义地是
 * 共用件 `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`）。写在这里就是同一件事的
 * 第二份定义（铁律二）。
 *
 * 老件对应物：`SKILLS\私家大厨\scripts\render_help.py` 的 `$CHEF_OUTPUT_DIR/help/私家大厨_HELP_<stamp>.html`。
 * 落盘位置经用户 2026-09-12 改判：老目录 `CookHub/` 换成 `cook_html/`（与 `calorie_html/`／
 * `biscuit_accountant_html/`／`home_manager_html/` 同形），`help/` 子目录保留；文件名主体不变。
 */
import { loadChefConfig, splitDirSegments } from '../config.js';

/** 落点子目录的默认值（＝改造前的代码常量 `HELP_DIR_SEGMENTS` 两段；实测落点
 *  `D:\2Study\StudyNotes\.db\cook_html\help\`）。配置项 `html.dir` 空串即用它。 */
export const DEFAULT_HELP_DIR = 'cook_html/help' as const;

/** 落点子目录的段数组：配置 `html.dir`（空串＝默认）拆成段。 */
export function helpDirSegments(): string[] {
  const dir = loadChefConfig().values.html.dir;
  return splitDirSegments(dir === '' ? DEFAULT_HELP_DIR : dir);
}

/** HELP 文件名主体（配置 `files.help`；产物＝`<主体>_<YYYYMMDD_HHMMSS>[_N].html`，`_N` 从 1 起步）。 */
export function helpFileStem(): string {
  return loadChefConfig().values.files.help;
}

/** 速查支的文件名主体：与 HELP 文件**分名**（照 #139 判法——别让用户按一个名字打开到另一个东西）。
 *  老家只有 HELP 一支、无老名可循；取名照样板图 #143（记账的 `饼干记账_速查表`）的同一后缀。 */
export function lookupFileStem(): string {
  return loadChefConfig().values.files.lookup;
}
