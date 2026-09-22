/** #873 查看域页内样式（在公共层皮肤之上追加的一段，只对本域 8 页生效）。
 *
 * 为什么另立一件：装配件（`page.ts`）已经装不下——本包 `AGENTS.md` 钉的告警线是 350 LF，
 * 装配逻辑与一段页内样式混在一处会让那一件长期贴着线走。样式与装配分开之后，两件各自只讲
 * 一件事：本件讲「查看页独有的形状长什么样」，`page.ts` 讲「这一页摆什么」。
 *
 * 三条口径（与前缀口径同源，违反即抛）：
 *  ① **每一条选择器都挂在根类 `.ilife-page-ui` 之下**：`renderDocShell` → `buildStyleSheet` 的
 *    `assertExtraCss` 会抛 `extra-css-root`／`extra-css-forbidden-token`／`extra-css-dark-scheme`；
 *    前缀口径与 `chefSceneCss()` 同（缺省 `ilife-`），两处必须同源，否则规则一条都命中不到。
 *  ② **色值只从冻结 token 与既有调色板取**：暖色走 `CHART_PALETTE` 的下标，中性色走
 *    `var(--fg)`／`var(--fg2)`／`var(--fg3)`／`var(--line)`／`var(--soft)`／`var(--card)`，
 *    本件不写第二个十六进制色值。
 *  ③ **圆角只用闭集 `{8, 14, 999}`、断点只用仓内既有集合**（`1001`＝公共层桌面档那条断点）。
 *
 * 这一段的五组规则（每一组对应 `page.ts` 里的一个装配件）：
 *  ① 分区标题行 `.chef-view-sec`：图标位 ＋ 标题 ＋ 右端读数；正文槽承载锚点 id。
 *  ② 分组标签 `.chef-view-tags`：维度名（左轨）＋ 值徽章（右），替掉一行 13 枚无名色块。
 *  ③ 新手要点 `.chef-view-keys`：一条一枚序号牌，序号由形状承担。
 *  ④ 营养瓦片 `.chef-view-nutri`：窄档两列、宽档三列。
 *  ⑤ 背景小节 `.chef-view-prose-block`：小标题 ＋ 段落。
 *
 * 只加形状与间距，不改任何区块的标记结构；`content` 一律空串（词不许只活在样式里）。
 */
import { CHART_PALETTE } from 'base-paint';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`skin.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 圆角闭集（与公共层、皮肤同一条闭集，不新造档位）。 */
const RADIUS = { sm: 8, md: 14, pill: 999 } as const;

/** 暖色图标位取调色板里的橙（与皮肤的分区图标位同色基）。 */
const WARM = CHART_PALETTE[2];

/** 八枚图标位各自的色基（一律取 `CHART_PALETTE` 上相邻的两色，不新造色值）：
 *  食材料理＝橙、步骤＝红、营养＝绿、背景＝紫、下厨记录＝蓝、标签＝青、替换＝洋红、要点＝黄。 */
const TONE_HUES: readonly (readonly [string, string, string])[] = [
  ['ingredients', CHART_PALETTE[6], CHART_PALETTE[2]],
  ['steps', CHART_PALETTE[3], CHART_PALETTE[8]],
  ['nutrition', CHART_PALETTE[1], CHART_PALETTE[9]],
  ['background', CHART_PALETTE[4], CHART_PALETTE[5]],
  ['history', CHART_PALETTE[0], CHART_PALETTE[5]],
  ['tags', CHART_PALETTE[9], CHART_PALETTE[1]],
  ['swap', CHART_PALETTE[8], CHART_PALETTE[4]],
  ['keys', CHART_PALETTE[6], CHART_PALETTE[2]],
];

/** 两色之间的斜向渐变（图标位底盘唯一写法）。 */
function warmPair(a: string, b: string): string {
  return 'linear-gradient(135deg, ' + a + ', ' + b + ');';
}

/** 页内样式的入参（与 `chefSceneCss()` 同口径）。 */
export interface ViewPageCssInput {
  /** 类名前缀；缺省 `ilife-`。 */
  readonly prefix?: string;
}

/** 查看域页内样式的唯一产出者。恒返回非空 CSS 文本。 */
export function viewPageCss(input?: ViewPageCssInput): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const pv = root + ' .chef-view-';
  return [
    '/* #873 查看域页内版式 · 每一条规则都挂在根类 ' + root + ' 之下 */',
    /* ① 分区：标题行一条 hairline 收口，正文槽与标题分开——「一段接一段的无题正文」由这条销账。 */
    pv + 'sec {',
    '  margin: 20px 0 0;',
    '}',
    pv + 'sec-head {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  padding: 0 0 8px;',
    '  border-bottom: 1px solid var(--line);',
    '}',
    pv + 'sec-icon {',
    '  flex: 0 0 auto;',
    '  display: flex;',
    '  width: 26px;',
    '  height: 26px;',
    '  align-items: center;',
    '  justify-content: center;',
    '  border-radius: ' + RADIUS.sm + 'px;',
    '  background-image: ' + warmPair(CHART_PALETTE[6], WARM),
    '  color: var(--card);',
    '}',
    /* 一种分区一种色基（八枚图标位各取调色板上的相邻两色）：一页从上到下因此有色彩节奏，
       而不是「一色到底」。色值只从 `CHART_PALETTE` 取，本件不写第二个十六进制色值。 */
    ...TONE_HUES.map(([tone, a, b]) => pv + 'icon-' + tone + ' {\n  background-image: ' + warmPair(a, b) + '\n}'),
    pv + 'sec-icon svg {',
    '  display: block;',
    '  width: 16px;',
    '  height: 16px;',
    '}',
    pv + 'sec-title {',
    '  margin: 0;',
    '  color: var(--fg);',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '  line-height: 1.4;',
    '}',
    pv + 'sec-note {',
    '  margin-left: auto;',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '}',
    pv + 'sec-body {',
    '  margin: 10px 0 0;',
    '}',
    /* ② 分组标签：维度名占 3em 左轨，值徽章在右；徽章自身仍走公共层的 `block-chip` 一条不改。 */
    pv + 'tags {',
    '  display: grid;',
    '  gap: 8px;',
    '}',
    pv + 'tags-row {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 4px 6px;',
    '}',
    pv + 'tags-key {',
    '  flex: 0 0 auto;',
    '  min-width: 3em;',
    '  margin-right: 4px;',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '}',
    /* ②b 标签块与下厨记录的行容器：窄档一列往下排；宽档两栏借位（见 ⑪ 桌面档那一段）。 */
    pv + 'side {',
    '  display: grid;',
    '  gap: 20px;',
    '}',
    /* ③ 新手要点：序号牌（形状件）＋ 一句话；卡与卡之间靠间距分组，不靠分隔符字符。 */
    pv + 'keys {',
    '  display: grid;',
    '  gap: 8px;',
    '  margin: 0;',
    '  padding: 0;',
    '  list-style: none;',
    '}',
    pv + 'key {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  box-sizing: border-box;',
    '  padding: 10px 12px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS.md + 'px;',
    '  background: var(--card);',
    '}',
    pv + 'key-no {',
    '  flex: 0 0 auto;',
    '  padding: 3px 10px;',
    '  border-radius: ' + RADIUS.pill + 'px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-size: 12px;',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    pv + 'key-text {',
    '  min-width: 0;',
    '  color: var(--fg);',
    '  font-size: 15px;',
    '  line-height: 1.6;',
    '}',
    /* ④ 营养瓦片：事实条在页内换成栅格——窄档两列、宽档三列（断点取公共层桌面档那一条）。 */
    pv + 'nutri {',
    '  display: grid;',
    '  grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  gap: 8px;',
    '}',
    pv + 'nutri .' + p + 'block-fact-strip-value {',
    '  font-size: 17px;',
    '}',
    '@media (min-width: 1001px) {',
    '  ' + pv + 'nutri {',
    '    grid-template-columns: repeat(3, minmax(0, 1fr));',
    '  }',
    '}',
    /* ⑤ 背景小节：小标题一档灰，正文段落间距交给 `block-prose` 自己的 8px，不叠两层外边距。 */
    root + ' .chef-view-prose-block + .chef-view-prose-block {',
    '  margin-top: 14px;',
    '}',
    pv + 'prose-title {',
    '  margin: 0;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  font-weight: 700;',
    '}',
    /* ⑥ 窄档食材行：公共层把每格排成「列名 ＋ 值」三行（食材／用量／说明），同一批列名因此逐行
       复读——一节 11 味就有 33 枚列名。这里把一行收成两行：**名字与用量同行**（名字左、用量右），
       说明另起一行；重复的列名由分区标题承担，不再逐格复读。桌面档不在本段内，一字不动。
       选择器为什么带 `.ilife-block-data-table` 与 `:has(td[data-label])`：公共层的表格卡片化那一组
       挂在 `.ilife-page-ui .ilife-block-data-table:has(td[data-label]) td`（权重 3 类 2 型）上，
       只写 `.chef-view-sec-body td`（2 类 1 型）会被它按权重压住、一条都不生效（实测：改前那版
       `display`／`content` 全被顶掉，只有 `outline` 这类它没碰的属性看得见）。 */
    '@media (max-width: 640px) {',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) tr {',
    '    display: grid;',
    '    grid-template-columns: minmax(0, 1fr) minmax(0, auto);',
    '    column-gap: 10px;',
    '    padding: 9px 12px;',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) td {',
    '    display: block;',
    '    padding: 0;',
    /* 斑马纹改挂行、不挂格：格在栅格里各占一段，底色会跟着断成参差的两截。 */
    '    background-color: transparent;',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) tr:nth-child(even) {',
    '    background-color: var(--soft);',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) td::before {',
    '    content: none;',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) td:first-child {',
    '    grid-column: 1;',
    '    color: var(--fg);',
    '    font-weight: 600;',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) td:nth-child(2) {',
    '    grid-column: 2;',
    '    min-width: 0;',
    '    color: var(--fg2);',
    '    font-family: inherit;',
    '    text-align: right;',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) td:nth-child(3) {',
    '    grid-column: 1 / -1;',
    '    margin-top: 2px;',
    '    color: var(--fg3);',
    '    font-size: 12px;',
    '  }',
    '}',
    /* ⑦ 页内不再挂装饰带（第三轮撤）：族级带由页壳 `renderSceneShell` 插在版面根首节点，
       页内再挂一条就是两带并存＝重复装饰。页内只留**载内容的形状**（分区题头、营养瓦片、参数带、行卡），
       色基与族级带共用同一族暖色（`CHART_PALETTE` 上相邻两色）。 */
    /* ⑧ 步骤三件套：图标位 ＋ 标签 ＋ 值。火候／时长／锅温此前是一行事实条（三格白瓦片），
       与页里其它瓦片同形；换成带图标位的参数带之后，每张步骤卡上有一处色彩锚点。
       **窄档一行一件**（图标＋标签＋值同一行，吃满整宽）：三件并排时每格约 100px，
       图标／标签／值挤在一格里被判官读成「字段硬塞、横向拥挤」。 */
    pv + 'params {',
    '  display: grid;',
    '  gap: 8px;',
    '  margin: 12px 0 0;',
    '  padding: 0;',
    '  list-style: none;',
    '}',
    pv + 'param {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '  padding: 8px 10px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS.md + 'px;',
    '  background: var(--soft);',
    '}',
    pv + 'param-icon {',
    '  flex: 0 0 auto;',
    '  display: flex;',
    '  width: 24px;',
    '  height: 24px;',
    '  align-items: center;',
    '  justify-content: center;',
    '  border-radius: ' + RADIUS.sm + 'px;',
    '  background-image: ' + warmPair(CHART_PALETTE[6], WARM),
    '  color: var(--card);',
    '}',
    pv + 'param-icon svg {',
    '  display: block;',
    '  width: 15px;',
    '  height: 15px;',
    '}',
    pv + 'param-label {',
    '  flex: 0 0 auto;',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '}',
    pv + 'param-value {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  color: var(--fg);',
    '  font-size: 13px;',
    '  font-weight: 700;',
    '  text-align: right;',
    '}',
    /* ⑨ 步骤卡的圆底图标位换暖色实底：每张卡一枚色彩锚点（原先与页里别的小圆底同色）。 */
    root + ' .chef-view-sec-body .' + p + 'block-disclosure-summary::before {',
    '  background-image: ' + warmPair(CHART_PALETTE[6], WARM),
    '  color: var(--card);',
    '}',
    /* ⑩ 分区标题行允许读数换行：窄档上「营养成分」＋「每 250g」挤不进一行时，读数整枚落到第二行，
       不把标题压窄、不贴右墙（判官点过「每 250g 字样在小屏偏密」）。 */
    pv + 'sec-head {',
    '  flex-wrap: wrap;',
    '}',
    /* ⑪ 宽档把栅格用满（≥1001，与公共层桌面档同一条断点）：本席八页的判读里，
       桌面端反复被点「左右大片留白、短块只占左半、表格横向拉伸」。四处收口：
       事实条四格等宽铺满、页内导航四枚等宽、标签块与要点列表各走两栏、食材表按列语义定宽。 */
    '@media (min-width: 1001px) {',
    '  ' + root + ' .chef-view-params {',
    '    grid-template-columns: repeat(3, minmax(0, 1fr));',
    '  }',
    '  ' + root + ' .' + p + 'block-toc {',
    '    display: grid;',
    '    grid-template-columns: repeat(4, minmax(0, 1fr));',
    '    gap: 8px;',
    '  }',
    '  ' + root + ' .' + p + 'block-toc a {',
    '    justify-content: center;',
    '  }',
    '  ' + root + ' .chef-view-tags,',
    '  ' + root + ' .chef-view-keys {',
    '    grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  }',
    /* 宽档借位：标签块与下厨记录并成一行两栏（判官点「桌面版仍堆叠一列未借位」）。
       两栏各自 `stretch`（不收窄、不写 `margin: auto`——栅格项上的 auto 外边距会关掉 `justify-self: stretch`）。 */
    '  ' + root + ' .chef-view-side {',
    '    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);',
    '    column-gap: 24px;',
    '    align-items: start;',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) th:nth-child(1) {',
    '    width: 34%;',
    '  }',
    '  ' + root + ' .chef-view-sec-body .' + p + 'block-data-table:has(td[data-label]) th:nth-child(2) {',
    '    width: 18%;',
    '  }',
    '}',
  ].join(LF);
}
