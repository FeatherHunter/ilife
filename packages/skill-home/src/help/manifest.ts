/** #190 · 居家管家 HELP 产物的**三个落点值**（本技能自己的三个值；都是函数，值从配置文件取）。
 *
 *  三个值＝调用者能给的最小信息：① 落点子目录名；② HELP 文件名主体；③ 速查支文件名主体。
 *  出口层（`src/cli/cmd_read.ts`）拿它拼出共用件 `base-paint/save-html` 要的 `{dir, stem}`，
 *  再交给 `src/help/output.ts` 那次调用——本件不碰 IO、不认环境变量。
 *
 *  **#695 起值的唯一事实源是配置文件**（`~/.ilife/home.yaml`，默认值表住 `src/config.ts`）：本件从配置取，
 *  空串回落到默认；目录那一项是**段串**，段数由值自己决定——老技能里大厨／作息是两段，备忘／居家是**一段**
 *  （`home_manager_html`），同一套配置形状要能表达「几段」。
 *
 *  ⚠️ **时间戳通式（`YYYYMMDD_HHMMSS`）／同秒 `_N` 递补／独占写（`wx` ＋ `EEXIST`）／复用窗口／
 *  绝对路径回执一概不在这里**：`#237` 起唯一定义地是共用件 `saveHtmlFile`
 *  （`packages/base-render/src/output/saveHtml.ts`，账单／卡路里／大厨／作息／备忘五家在用）。
 *  写在这里就是同一件事的第二份定义（铁律二）——账单旧版的 `nextExclusiveCandidate`／
 *  `writeFileExclusiveWithRetry` 已经搬进共用件，**不许抄回来**。
 *
 *  老件对应物：老 `help_center.py` 的
 *  `<数据目录>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`（目录名逐字保留，无 `help/` 子层）。
 */
import { loadHomeConfig, splitDirSegments } from '../config.js';

/** 落点子目录的默认值：＝改造前的代码常量 `HELP_HTML_DIR_NAME`（一段，老家目录名逐字）。 */
export const DEFAULT_HELP_DIR_NAME = 'home_manager_html' as const;

/** 落点子目录名（配置项 `html.dir`，空串＝默认）：产物＝`<库目录>/<它>/…`。
 *  家是**一段**目录，故段串经 `splitDirSegments` 归一再拼回一个名字（配置若给多段，`join` 照样吃得下）。 */
export function helpDirName(): string {
  const dir = loadHomeConfig().values.html.dir;
  return splitDirSegments(dir === '' ? DEFAULT_HELP_DIR_NAME : dir).join('/');
}

/** HELP 文件名主体：产物＝`居家管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`（老通式逐字；递补起步值走共用件缺省）。 */
export function helpFileStem(): string {
  return loadHomeConfig().values.files.help;
}

/** 速查支的文件名主体：与 HELP 文件**分名**（照 #139 判法——别让用户按一个名字打开到另一个东西）。
 *  老家只有 HELP 一支、无老名可循；取名照样板图 #143（账单的 `饼干记账_速查表`／卡路里的 `卡路里_速查台`）同一后缀。 */
export function lookupFileStem(): string {
  return loadHomeConfig().values.files.lookup;
}
