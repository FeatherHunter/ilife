/** 做菜域五页共用的页内收口样式（在公共层皮肤 `chefSceneCss()` 之后追加，不拆两层）。
 *
 * 为什么另立一件：公共层皮肤（`src/render/skin.ts`）管 48 页共用的形状语言，它不知道**本页摆几格**
 * ——页头事实条在本域恒为四格（份量／步骤／预计／状态）、步骤参数条恒为三格（火候／时长／锅温）。
 * 公共层那条「按内容宽排、随内容换行」的规则在四格下会排出一截参差的右空（#873 第 1 格的扣分项
 * 就是三格宽窄不齐、标签与值不成列）。件数只有本域知道，故这两条栅格口径住在本域。
 *
 * 只做四件事，只对本域五页生效：
 *   ① 页头事实条四等分、步骤参数条三等分：标签与值各自成列（形状承担层级，不靠字重）；
 *   ② 当前步／已做步各有一套形状（主色左缘 ＋ 卡面深浅），「现在做哪一步」由卡面直接说；
 *   ③ 步骤正文与说明行：行高给足 ＋ 行尾留余量（390 档的「行距挤」与「长行末尾贴边」）；
 *   ④ 结论条与上方事实条之间留一条气口（此前两块首尾相接）；
 *   ⑤ 页头那件纯装饰图形（锅与热气）的位置与配色——图形本体在 `run.ts` 的 `COOK_HERO_ART`。
 *
 * 取值口径：颜色**一个都不新造**——只用冻结 token（`--blue`／`--blue2`／`--soft`／`--line`／
 * `--fg2`／`--shadow`）与公共层调色板的下标（热气那一色）；断点只用仓内既有集合
 * （`pageUi.ts` 的 `PAGE_LIMITS.breakpointsPx`）；本件不含任何 `:root` 改写、禁入 token
 * 与深色区选择器（公共层 `buildStyleSheet` 的三禁）。
 */
import { CHART_PALETTE } from 'base-paint';

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 页头装饰里的热气色：取公共层调色板的下标（色值的唯一定义地是 `spec/charts.ts`）。 */
const STEAM_COLOR = CHART_PALETTE[2];

/** 步骤卡的状态类（`run.ts` 挂在卡外层：当前步／已做步／未开始）。 */
export const COOK_STEP_CLASS = 'ilife-cook-step';

/** 步骤卡列表的外层类（`run.ts` 把六张卡收进这一层）。 */
export const COOK_STEPS_CLASS = 'ilife-cook-steps';

/** 步骤卡的侧栏类（参数三行 ＋ 本步用料；宽档与正文按 2:1 并排）。 */
export const COOK_STEP_SIDE_CLASS = 'ilife-cook-step-side';

/** 页内收口样式段（本件唯一出口）。恒返回非空 CSS 文本。 */
export function cookPageCss(): string {
  const root = '.ilife-page-ui';
  return [
    '/* #873 做菜域页内收口 · 每一条规则都挂在根类 ' + root + ' 之下 */',
    /* ① 页头事实条：四格四等分。格数住在本域，故列数也住在本域。 */
    root + ' .ilife-block-page-shell-body > .ilife-block-fact-strip {',
    '  display: grid;',
    '  grid-template-columns: repeat(4, minmax(0, 1fr));',
    '  gap: 12px;',
    '  margin-top: 14px;',
    '}',
    root + ' .ilife-block-page-shell-body > .ilife-block-fact-strip > .ilife-block-fact-strip-item {',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '}',
    /* ① 步骤参数：**一行一条**（标签一列、值一列）。恒三条（火候／时长／锅温）只有本域知道。
       第二轮返修换过一次形状：原来三条等分瓦片，390 档必然把整行铺满，同尺复评两轮都读成
       「手机端首步卡右侧三粒紧贴边缘几近溢出」。改成键值行之后，横向不再有铺满整行的块、
       标签与值各成一列，值短、右端自然留白；三条之间的发丝线仍把「这是三件事」摆出来。 */
    root + ' .' + COOK_STEP_SIDE_CLASS + ' > .ilife-block-fact-strip {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 1fr);',
    '  gap: 0;',
    '  margin-top: 14px;',
    '  padding-top: 10px;',
    '  border-top: 1px solid var(--line);',
    '}',
    root + ' .' + COOK_STEP_SIDE_CLASS + ' > .ilife-block-fact-strip > .ilife-block-fact-strip-item {',
    '  display: grid;',
    '  grid-template-columns: 52px minmax(0, 1fr);',
    '  align-items: baseline;',
    '  gap: 12px;',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '  padding: 7px 0;',
    '  border: 0;',
    '  border-top: 1px solid var(--line);',
    '  border-radius: 0;',
    '  background: none;',
    '}',
    root + ' .' + COOK_STEP_SIDE_CLASS + ' > .ilife-block-fact-strip > .ilife-block-fact-strip-item:first-child {',
    '  border-top: 0;',
    '  padding-top: 2px;',
    '}',
    root + ' .' + COOK_STEP_SIDE_CLASS + ' .ilife-block-fact-strip-label {',
    '  color: var(--blue2);',
    '}',
    root + ' .' + COOK_STEP_SIDE_CLASS + ' .ilife-block-fact-strip-value {',
    '  font-variant-numeric: tabular-nums;',
    '}',
    /* ② 步骤卡：卡与卡之间恒一条 16px 的气口（外层包了一层状态类与列表层，公共层那条
       「同级区块之间」的选择器命中不到包层，故这里自己给；首卡与进度卡之间多留 2px）。 */
    root + ' .' + COOK_STEPS_CLASS + ' {',
    '  margin-top: 18px;',
    '}',
    root + ' .' + COOK_STEP_CLASS + ' > .ilife-block-disclosure {',
    '  margin: 0;',
    '}',
    root + ' .' + COOK_STEP_CLASS + ' + .' + COOK_STEP_CLASS + ' {',
    '  margin-top: 16px;',
    '}',
    /* 当前步：主色左缘加粗 ＋ 卡面自上而下由浅底回到白（形状承担「现在做这一步」）。 */
    root + ' .' + COOK_STEP_CLASS + '-current > .ilife-block-disclosure {',
    '  border-left: 4px solid var(--blue);',
    '  background-image: linear-gradient(180deg, var(--soft), var(--card) 96px);',
    '  box-shadow: var(--shadow);',
    '}',
    root + ' .' + COOK_STEP_CLASS + '-current > .ilife-block-disclosure > .ilife-block-disclosure-summary::after {',
    '  content: "";',
    '  flex: 0 0 auto;',
    '  width: 8px;',
    '  height: 8px;',
    '  margin-left: 8px;',
    '  border-radius: 999px;',
    '  background: var(--blue);',
    '}',
    /* 已做步：左缘退成灰线、卡面收到浅底——与「还没做」的步一眼分得开。 */
    root + ' .' + COOK_STEP_CLASS + '-done > .ilife-block-disclosure {',
    '  border-left-color: var(--line);',
    '  background-color: var(--soft);',
    '}',
    root + ' .' + COOK_STEP_CLASS + '-done > .ilife-block-disclosure > .ilife-block-disclosure-summary {',
    '  color: var(--fg2);',
    '}',
    /* ③ 步骤正文：行高抬到 1.85（步与步之间读得开），行尾留 4px 余量（长行的末字不贴卡片右沿）。 */
    root + ' .ilife-block-disclosure-body > .ilife-block-prose {',
    '  margin-top: 10px;',
    '  padding-right: 4px;',
    '  line-height: 1.85;',
    '}',
    /* ③ 侧栏（参数三行 ＋ 本步用料）：与正文之间给一格气口；用料那行与参数条之间再给一档。 */
    root + ' .' + COOK_STEP_SIDE_CLASS + ' .ilife-block-chip-row {',
    '  margin-top: 12px;',
    '}',
    root + ' .' + COOK_STEP_SIDE_CLASS + ' > .ilife-block-caliber {',
    '  margin-top: 12px;',
    '  line-height: 1.75;',
    '}',
    root + ' .ilife-block-disclosure-body > .ilife-block-caliber,',
    root + ' .ilife-block-page-shell-body > .ilife-block-caliber {',
    '  margin-top: 10px;',
    '  line-height: 1.75;',
    '}',
    /* 本步用料那一行也拉开一档（此前紧贴参数条的下沿）。 */
    root + ' .ilife-block-disclosure-body > .ilife-block-chip-row {',
    '  margin-top: 10px;',
    '}',
    /* 时间轴注（库里的做菜反馈原文）：一条长句折行时两行不许贴在一起。 */
    root + ' .ilife-block-timeline-note {',
    '  line-height: 1.8;',
    '}',
    root + ' .ilife-block-timeline-row {',
    '  padding: 8px 0;',
    '}',
    /* ③ 当前进度卡：读数抬到 28px（一屏里最大的一个数），说明行与读数行之间给气口；
       进度条取主色——低档红条在这页读成「出错」，「做到第几步」本身没有告警语义。 */
    root + ' .ilife-block-kpi-card-value {',
    '  font-size: 28px;',
    '}',
    root + ' .ilife-block-kpi-card-detail {',
    '  margin-top: 8px;',
    '  line-height: 1.6;',
    '}',
    root + ' .ilife-block-kpi-card-bar-fill {',
    '  background: var(--blue);',
    '}',
    /* ④ 结论条：与上方事实条之间留一条气口（此前两块首尾相接）。 */
    root + ' .ilife-block-page-shell-body > .ilife-block-conclusion {',
    '  margin-top: 12px;',
    '}',
    /* ⑤ 页头装饰（锅与热气 ＋ 一条波线带）：都不占正文一行、也不参与命中区。
       第二轮返修把图形收成**一张与别的卡同色基、同描边、同圆角的牌**——同尺复评原话
       「插画与暖色渐变风格与卡片式表单略脱节」，脱节的根源就是它只有线稿、没有卡面。 */
    root + ' .ilife-block-page-shell {',
    '  position: relative;',
    '}',
    root + ' .ilife-cook-art {',
    '  position: absolute;',
    '  top: 14px;',
    '  right: 14px;',
    '  display: flex;',
    '  align-items: center;',
    '  padding: 5px 8px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 14px;',
    '  background: var(--card);',
    '  pointer-events: none;',
    '}',
    root + ' .ilife-cook-art svg {',
    '  display: block;',
    '  width: 68px;',
    '  height: 26px;',
    '}',
    root + ' .ilife-cook-art path {',
    '  fill: none;',
    '  stroke-width: 3;',
    '  stroke-linecap: round;',
    '}',
    root + ' .ilife-cook-art-wok {',
    '  stroke: var(--blue2);',
    '}',
    root + ' .ilife-cook-art-steam {',
    '  stroke: ' + STEAM_COLOR + ';',
    '}',
    /* 装饰带：大标题那条横线与事实条之间的一条波线（纯装饰、无数据、不可点）。 */
    root + ' .ilife-cook-band {',
    '  margin: 0;',
    '}',
    root + ' .ilife-cook-band svg {',
    '  display: block;',
    '  width: 100%;',
    '  height: 14px;',
    '}',
    root + ' .ilife-cook-band path {',
    '  fill: none;',
    '  stroke: ' + STEAM_COLOR + ';',
    '  stroke-width: 2;',
    '  stroke-linecap: round;',
    '  opacity: .42;',
    '}',
    /* 窄档：页头四格缩一档内距，值不许折行（「18 分钟」这种值折行会把格子撑成两行）；
       装饰牌上提到眉标那一行的右端（标题那两行一个字都不许被它压住）。 */
    '@media (max-width: 640px) {',
    '  ' + root + ' .ilife-block-page-shell-body > .ilife-block-fact-strip > .ilife-block-fact-strip-item {',
    '    padding-left: 8px;',
    '    padding-right: 8px;',
    '  }',
    '  ' + root + ' .ilife-cook-art {',
    '    top: 12px;',
    '    right: 12px;',
    '  }',
    '}',
    /* 宽档：**步骤卡保持单列满宽**（第二轮返修：双列时正文列被挤窄，同尺复评原话「桌面端
       步骤卡双列后左侧被严重挤压」，撤回第一轮的双列）；改成一栏之内**按 2:1 分栏**——
       正文与侧栏并排，正文列约 560px（一行读得完的宽度），卡也不再是「内容挤在上半张、
       下半张全空」。装饰牌放大一档，摆到标题右侧那片空里。 */
    '@media (min-width: 1001px) {',
    '  ' + root + ' .' + COOK_STEP_CLASS + ' .ilife-block-disclosure-body {',
    '    display: grid;',
    '    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);',
    '    gap: 10px 30px;',
    '    align-items: start;',
    '  }',
    '  ' + root + ' .' + COOK_STEP_CLASS + ' .ilife-block-disclosure-body > .ilife-block-prose {',
    '    grid-column: 1;',
    '    grid-row: 1;',
    '  }',
    '  ' + root + ' .' + COOK_STEP_CLASS + ' .' + COOK_STEP_SIDE_CLASS + ' {',
    '    grid-column: 2;',
    '    grid-row: 1;',
    '    padding: 12px 14px;',
    '    border-radius: 14px;',
    '    background: var(--soft);',
    '  }',
    /* 侧栏收成一张浅底面板之后，里面那条首行分隔线就不再需要了（面板边界已经说明「这是另一栏」）。 */
    '  ' + root + ' .' + COOK_STEP_CLASS + ' .' + COOK_STEP_SIDE_CLASS + ' > .ilife-block-fact-strip {',
    '    margin-top: 0;',
    '    padding-top: 0;',
    '    border-top: 0;',
    '  }',
    /* 宽档侧栏里的值靠右站：一栏一值（火候→中火、时长→5 分钟、锅温→180度）排成一张规格表，
       右侧那截空位从「缺内容」变成「留白」。窄档不靠右——卡片内沿与值之间不够一档内距。 */
    '  ' + root + ' .' + COOK_STEP_CLASS + ' .' + COOK_STEP_SIDE_CLASS + ' .ilife-block-fact-strip-value {',
    '    text-align: right;',
    '  }',
    '  ' + root + ' .ilife-cook-art {',
    '    top: 26px;',
    '    right: 24px;',
    '    padding: 7px 10px;',
    '  }',
    '  ' + root + ' .ilife-cook-art svg {',
    '    width: 110px;',
    '    height: 40px;',
    '  }',
    '}',
  ].join(LF);
}
