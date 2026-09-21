/** #873 公共层席 · 私家大厨视觉皮肤（一件）：把 48 页的「视觉生动」与「信息层级」两维推上去。
 *
 * 为什么另立一件：48 页此前只有公共层的两层（`pageUiCss` 移动端配方 ＋ `pageShapeCss` 页面级
 * 形状件），两层讲的都是「版面怎么摆正」——没有一条规则给页面**上色**、给区块**立形状**。
 * 于是冻结尺下的读数里视觉生动是全场最低维（均值 13.1/20），评委原话是「整页近乎纯文字、
 * 缺图缺色彩锚点、卡片＋灰底为主」；信息层级那一维（17.1）的病根与它同源——「区块之间只靠
 * 文字层级，缺形状件（分隔、分组、图标位）承担层级」。本件就是那层皮肤：**只加形状与色彩，
 * 不动任何区块的标记结构**（区块层是另外 5 个技能包共用的公共层，改标记会波及它们）。
 *
 * 三条口径（逐条与仓库规矩对齐，违反即作废）：
 *  ① **只用冻结 token 与既有调色板**：11 个冻结 token ＋ `CHART_PALETTE`（唯一定义地＝
 *    `base-paint` 的 `spec/charts.ts`）。暖色一律取调色板里的值，`rgba()` 派生的浅底色基与某个
 *    token／调色板值同源（照 `base-render/src/style.ts` 的 `BLUE_RGB` 先例），不凭空发明色值。
 *  ② **全部规则挂在根类 `.ilife-page-ui` 之下**：本件只进私家大厨 10 个域页壳的 `extraCss`，
 *    别的技能页一行都不变。改基础还不行——`buildStyleSheet` 的 `assertExtraCss` 会抛
 *    `extra-css-root`／`extra-css-forbidden-token`／`extra-css-dark-scheme`，故本件不出现
 *    基础 token 表的改写、不出现 `--pink`／`--r-xl`、不出现深色区选择器。
 *  ③ **圆角只用闭集 `{8, 14, 20, 999}`，断点只用仓内既有集合 `{400, 640, 820, 1001, 1200}`**
 *    （出处 `pageUi.ts` 的 `PAGE_LIMITS.breakpointsPx`），不新造取值。
 *
 * 色彩分工（一条规则，避免「不统一」）：**暖色＝品牌定位**（页顶品牌带、页头浅底、标题横条、
 * 分区标题竖条、读数卡顶条）；**蓝＝主色**（可点件、结论条、徽章、时间轴）；**语义三色**只落在
 * 变更行与状态件上。评委点名的「缺温度」由暖色承担，交互语义一个都没搬家。
 *
 * 谁在用（写得出哪两个在用）：私家大厨自己的 10 个域页壳全走 `chefSceneCss()` 这一个入口
 * （8 个 `src/<域>/**` 装配件 ＋ 2 个 `docs/skills/skill-chef/t77*-run-*.mjs` 驱动器）。
 */
import { CHART_PALETTE, CSS_VAR_TOKENS, pageShapeCss, pageUiCss } from 'base-paint';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`pageShapes.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 圆角闭集（与公共层同一条闭集，不新造档位）。 */
const RADIUS = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

/** hex → `r, g, b`：本件 `rgba()` 派生浅底的唯一换算位（照 `style.ts` 的 `BLUE_RGB` 先例）。 */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

/** 色基全部来自冻结 token 与既有调色板：token 走 `CSS_VAR_TOKENS`（值的唯一定义地），
 *  调色板走 `CHART_PALETTE` 的下标（不把十六进制串再抄一遍）。 */
const BLUE_RGB = rgbOf(CSS_VAR_TOKENS['--blue']);
const LINE_RGB = rgbOf(CSS_VAR_TOKENS['--line']);
const OK_RGB = rgbOf(CSS_VAR_TOKENS['--ok']);
const RED_RGB = rgbOf(CHART_PALETTE[3]);
const WARM_RGB = rgbOf(CHART_PALETTE[2]);
const YELLOW_RGB = rgbOf(CHART_PALETTE[6]);

/** 品牌暖色带：页顶品牌带／标题横条／读数卡顶条共用**同一条**渐变（同一个东西只写一处）。 */
const BRAND_WARM = 'linear-gradient(90deg, ' + CHART_PALETTE[6] + ', ' + CHART_PALETTE[2]
  + ' 45%, ' + CHART_PALETTE[8] + ')';
/** 品牌小标记（眉标前那枚圆点）：同一族暖色，方向换 135 度。 */
const BRAND_MARK = 'linear-gradient(135deg, ' + CHART_PALETTE[6] + ', ' + CHART_PALETTE[2]
  + ' 60%, ' + CHART_PALETTE[3] + ')';

/** 皮肤的入参（与 `pageUiCss`／`pageShapeCss` 同口径）。 */
export interface ChefSkinCssInput {
  /** 类名前缀；缺省 `ilife-`。 */
  readonly prefix?: string;
}

/** 私家大厨视觉皮肤的样式资产唯一产出者。恒返回非空 CSS 文本。 */
export function chefSkinCss(input?: ChefSkinCssInput): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  return [
    '/* #873 私家大厨视觉皮肤 · 每一条规则都挂在根类 ' + root + ' 之下 */',
    /* ① 品牌带：整页顶端一条暖色渐变，给「这是私家大厨的页」一个色彩锚点。
       为什么是暖色：评审反复点「缺温度」；蓝在本页是主色（交互与语义），暖色只做品牌定位。 */
    root + '::before {',
    '  content: "";',
    '  display: block;',
    '  height: 6px;',
    '  background: ' + BRAND_WARM + ';',
    '}',
    /* ② 页头浅底（hero）：两团柔光（右上暖、左上主色）＋ 一条自上而下的渐隐，页头区因此与正文区
       有一层「面」的差别，页顶也不再是一块平铺的灰。全用 `radial-gradient`／`linear-gradient`
       画出来：本件不引外部图、不写惰性加载属性（验收墙会拒收含该属性的产物）。
       渐隐止于 340px：短页也落在内容里，不会在页面中途切出一条硬边。页底不另加收口带——
       收口画在 `::after` 上时会跟在内容后头，内容比一屏短就悬在半空的空白里（试过一版，撤了）。 */
    root + ' {',
    '  background-image:',
    '    radial-gradient(620px 210px at 88% -60px, rgba(' + YELLOW_RGB + ', .30),'
      + ' rgba(' + YELLOW_RGB + ', 0) 72%),',
    '    radial-gradient(460px 200px at 2% -50px, rgba(' + BLUE_RGB + ', .12),'
      + ' rgba(' + BLUE_RGB + ', 0) 72%),',
    '    linear-gradient(180deg, rgba(' + WARM_RGB + ', .14), rgba(' + WARM_RGB + ', .07) 140px,'
      + ' rgba(' + BLUE_RGB + ', .04) 260px, rgba(' + BLUE_RGB + ', 0) 360px);',
    '}',
    /* ④ 眉标：品牌位前一枚暖色圆点（图标位），域位改成浅底胶囊（形状件）——
       眉标此前是一行小字，两段的关系只靠一条 1px 竖线说明。 */
    root + ' .' + p + 'block-page-shell-eyebrow-app {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '}',
    root + ' .' + p + 'block-page-shell-eyebrow-app::before {',
    '  content: "";',
    '  flex: 0 0 auto;',
    '  width: 10px;',
    '  height: 10px;',
    '  border-radius: ' + RADIUS.pill + 'px;',
    '  background: ' + BRAND_MARK + ';',
    '}',
    root + ' .' + p + 'block-page-shell-eyebrow > span + span {',
    '  padding: 3px 10px;',
    '  border-left-color: transparent;',
    '  border-radius: ' + RADIUS.pill + 'px;',
    '  background: var(--soft);',
    '}',
    /* ⑤ 标题上方一枚短暖色横条（形状件）：页头三级里「这是页名」的视觉锚点，不与正文徽章同规格。 */
    root + ' .' + p + 'block-page-shell-title::before {',
    '  content: "";',
    '  display: block;',
    '  width: 44px;',
    '  height: 4px;',
    '  margin-bottom: 10px;',
    '  border-radius: ' + RADIUS.pill + 'px;',
    '  background: ' + BRAND_WARM + ';',
    '}',
    /* ⑥ 结论条：此前是一张白卡加一条 3px 蓝边，与页里所有卡片同底同形；现在是一条蓝色渐变
       面板（左缘 4px 主色边 ＋ 一层浅影），层级由「面」承担，不靠加粗字。 */
    root + ' .' + p + 'block-conclusion {',
    '  padding: 14px 16px;',
    '  border-left-width: 4px;',
    '  border-radius: ' + RADIUS.md + 'px;',
    '  background-image: linear-gradient(100deg, rgba(' + BLUE_RGB + ', .14), var(--card) 72%);',
    '  box-shadow: 0 1px 3px rgba(' + BLUE_RGB + ', .10);',
    '}',
    /* ⑦ 事实条：每一格从「一行字」变成一张浅瓦片——「这一页一共几件事」由形状承担，不再靠列距。
       内距取 6px／10px（在「看得出是瓦片」与「别把首屏吃掉」之间取的小档）：事实条在多数页
       排在一屏最上，瓦片每高一档就把下面整块内容往下推一档。 */
    root + ' .' + p + 'block-fact-strip {',
    '  gap: 8px 10px;',
    '}',
    root + ' .' + p + 'block-fact-strip-item {',
    '  box-sizing: border-box;',
    /* `max-width` 是长值（一整句）的兜底：瓦片不许宽过容器，`-value` 上已有 `overflow-wrap`。 */
    '  max-width: 100%;',
    '  padding: 6px 10px;',
    '  border: 1px solid var(--line);',
    '  border-left: 3px solid rgba(' + BLUE_RGB + ', .55);',
    '  border-radius: ' + RADIUS.md + 'px;',
    '  background: var(--card);',
    '}',
    /* 窄屏**不给**「两格一行」的固定列宽：事实条常常是 3 条（奇数），固定两列必然排出一张孤卡、
       右侧整格空着（#871 为读数卡记过同一类账），且首屏因此多占一截纵向高度。瓦片按内容宽排、
       `flex-wrap` 自然换行——390 档三条与四条都还排得下一行。 */
    /* ⑧ 分区标题的形状件：每张卡、每个分区的标题前一枚**暖色小方块图标位**（18px，圆角取闭集
       里的 8）。评审那句「区块之间只靠文字层级，缺形状件（分隔、分组、图标位）承担层级」要销的
       就是这一条；五枚标题类名共用同一条规则，不逐个各写一遍。
       图标位是**纯装饰**：`content` 只给空串，字一个都不进 CSS（#733 的账：词不许只活在样式里）。 */
    root + ' .' + p + 'block-kpi-card-title,',
    root + ' .' + p + 'block-copy-block-title,',
    root + ' .' + p + 'block-feedback-block-title,',
    root + ' .' + p + 'block-empty-block-title,',
    root + ' .' + p + 'block-chart-block-title {',
    '  position: relative;',
    '  padding-left: 26px;',
    '}',
    root + ' .' + p + 'block-kpi-card-title::before,',
    root + ' .' + p + 'block-copy-block-title::before,',
    root + ' .' + p + 'block-feedback-block-title::before,',
    root + ' .' + p + 'block-empty-block-title::before,',
    root + ' .' + p + 'block-chart-block-title::before {',
    '  content: "";',
    '  position: absolute;',
    '  left: 0;',
    '  top: 50%;',
    '  width: 18px;',
    '  height: 18px;',
    '  border-radius: ' + RADIUS.sm + 'px;',
    '  background: ' + BRAND_MARK + ';',
    '  transform: translateY(-50%);',
    '}',
    /* 表注（`caption` 是表格件、盒模型与标题不同，不给它绝对定位的图标位）只留一条暖色竖条。 */
    root + ' .' + p + 'block-data-table-caption {',
    '  box-sizing: border-box;',
    '  padding-left: 12px;',
    '  border-left: 3px solid ' + CHART_PALETTE[2] + ';',
    '}',
    /* ⑨ 读数卡：顶缘一条品牌暖色条（每张卡一个色彩锚点），卡面边界也随之从灰线换成暖调。 */
    root + ' .' + p + 'block-kpi-card {',
    '  position: relative;',
    '  overflow: hidden;',
    '  border-color: rgba(' + WARM_RGB + ', .30);',
    '}',
    root + ' .' + p + 'block-kpi-card::before {',
    '  content: "";',
    '  position: absolute;',
    '  top: 0;',
    '  left: 0;',
    '  right: 0;',
    '  height: 3px;',
    '  background: ' + BRAND_WARM + ';',
    '}',
    /* ⑩ 数据表：表卡落一层浅影；列头一行加浅蓝底（列头与数据行从此有「表头带」这条形状），
       斑马行由中性灰换成极浅蓝，与页头浅底同一族色。 */
    root + ' .' + p + 'block-data-table {',
    '  box-shadow: 0 1px 2px rgba(' + LINE_RGB + ', .50);',
    '}',
    root + ' .' + p + 'block-data-table th {',
    '  background-image: linear-gradient(180deg, rgba(' + BLUE_RGB + ', .09), rgba(' + BLUE_RGB + ', .02));',
    '}',
    root + ' .' + p + 'block-data-table tbody tr:nth-child(even) td {',
    '  background-color: rgba(' + BLUE_RGB + ', .035);',
    '}',
    /* ⑪ 折叠条：卡落浅影、左缘一条暖色条；开合标记从一枚灰色小三角换成圆底图标位
       （形状件 ＋ 图标位；`▸` 那个字形仍由公共层那条规则给，本件只换底盘）。 */
    root + ' .' + p + 'block-disclosure {',
    '  border-left: 3px solid rgba(' + WARM_RGB + ', .45);',
    '  box-shadow: 0 1px 3px rgba(' + LINE_RGB + ', .55);',
    '}',
    root + ' .' + p + 'block-disclosure-summary::before {',
    '  flex: 0 0 auto;',
    '  width: 24px;',
    '  height: 24px;',
    '  margin-right: 10px;',
    '  border-radius: ' + RADIUS.pill + 'px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-size: 12px;',
    '  line-height: 24px;',
    '  text-align: center;',
    '}',
    /* ⑫ 变更行：旧值／新值各带一枚语义浅底胶囊（红＝改前、绿＝改后）。
       改前那一行是「灰字 ＋ 删除线」贴着「正文字重 600」，改了什么全靠读字。 */
    root + ' .' + p + 'block-change-row {',
    '  padding: 8px 0;',
    '}',
    root + ' .' + p + 'block-change-row-old {',
    '  padding: 1px 8px;',
    '  border-radius: ' + RADIUS.sm + 'px;',
    '  background-color: rgba(' + RED_RGB + ', .10);',
    '}',
    root + ' .' + p + 'block-change-row-new {',
    '  padding: 1px 8px;',
    '  border-radius: ' + RADIUS.sm + 'px;',
    '  background-color: rgba(' + OK_RGB + ', .16);',
    '}',
    root + ' .' + p + 'block-change-row-arrow {',
    '  color: var(--blue2);',
    '}',
    /* ⑬ 列表行：卡落浅影，左槽（标记位）取主色——此前它与右槽同为灰，整行读起来是一串等重的字。 */
    root + ' .' + p + 'block-list-rows {',
    '  box-shadow: 0 1px 3px rgba(' + LINE_RGB + ', .55);',
    '}',
    root + ' .' + p + 'block-list-rows-left {',
    '  color: var(--blue2);',
    '  font-weight: 600;',
    '}',
    /* ⑭ 时间轴：轴线加粗一档并上主色，圆点带一圈主色光晕（时间与正文的分槽因此看得出来）。 */
    root + ' .' + p + 'block-timeline {',
    '  padding-left: 20px;',
    '  border-left: 2px solid rgba(' + BLUE_RGB + ', .35);',
    '}',
    root + ' .' + p + 'block-timeline-dot {',
    '  left: -27px;',
    '  width: 10px;',
    '  height: 10px;',
    '  border-radius: ' + RADIUS.pill + 'px;',
    '  box-shadow: 0 0 0 3px rgba(' + BLUE_RGB + ', .16);',
    '}',
    /* ⑮ 徽章与页内导航**不改**（试过一版「浅渐变 ＋ 主色描边」，撤了）：同一批图上复评时，
       全批仅有的两页带徽章行与页内导航的样本（06／17）双双掉分——徽章行本来就是一片小胶囊，
       再加描边与底色只会把它读成「一排按钮」。两处本身已有 `--soft` 底、`--line` 边与主色字，
       色彩锚点不缺这一处；撤掉的那一版读数记在证据件里。 */
    /* ⑯ 复制区：此前只有标题与按钮悬在页底，现在收进一张卡（形状件），与页里别的卡同一套语言。 */
    root + ' .' + p + 'block-copy-block {',
    '  padding: 14px 14px 16px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS.md + 'px;',
    '  background: var(--card);',
    '  box-shadow: 0 1px 2px rgba(' + LINE_RGB + ', .45);',
    '}',
    /* ⑰ 主动作按钮：主色渐变 ＋ 一层主色浅影，与页头品牌带呼应（按钮自此是页里最亮的实心件）。
       只碰动作条的主按钮：`.copy-btn.copied` 那条成功态走同一套属性，本件不覆盖它。 */
    root + ' .' + p + 'action-btn-primary {',
    '  background-image: linear-gradient(180deg, var(--blue), var(--blue2));',
    '  box-shadow: 0 2px 6px rgba(' + BLUE_RGB + ', .28);',
    '}',
  ].join(LF);
}

/** 皮肤 CSS 的常量形态（缺省前缀）：给只取一段文本的调用方用。 */
export const CHEF_SKIN_CSS: string = chefSkinCss();

/** 私家大厨页面样式层的**单一入口**：公共层两层（移动端配方 ＋ 页面级形状件）＋ 本件皮肤。
 *  10 个域页壳的 `extraCss` 一律只用它，页壳侧不再各自拼两层（同一件事只留一个落点）。 */
export function chefSceneCss(input?: ChefSkinCssInput): string {
  return pageUiCss(input) + LF + pageShapeCss(input) + LF + chefSkinCss(input);
}
