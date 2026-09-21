/** 开始使用能力的页面装配（首次使用一页，全走公共层区块＋页内一段收口样式）。
 *
 * 老件骨架来源：`templates/开始使用/first_use_wizard.html`（环境检测→环境变量→建库→完成回执四步）。
 * 新页按同一四步组织，行为归宿主（页面只摆形状与状态，静态呈现）。
 *
 * #873 页内收口（公共层只给到形状那一层，层级的最后一档落在页内）：
 *  ① 读数三张**瓦片**（不是一条通栏面板）：标签与数值差 5px —— 「业务表／状态／建库时机」是列头，
 *    值才是正文；三张各自成卡，宽档不会读成一条呆板的通栏；
 *  ② 页头图标位（锅）＋ 品牌装饰带（都是内联 SVG，纯装饰，不载任何数据）；
 *  ③ 分区题头带一条暖色渐隐、开合标记换成暖色圆点（公共层那枚蓝 ▸ 落在圆底上读起来像播放键）；
 *  ④ 上屏文字去实现语与复述（「装前命令」「老库仅提示迁移」「只读不写」全部换人话；
 *    口径行与读数瓦片、结论条互为复述的那一句删掉，内容并进「建库」那一步的正文）。
 */

import { CHART_PALETTE, CSS_VAR_TOKENS, renderActionBar, renderFactStrip } from 'base-paint';
import {
  renderConclusionBar,
  renderCopyBlock,
  renderDisclosure,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { chefSceneCss } from '../render/skin.js';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／皮肤件同）。 */
const LF = String.fromCharCode(10);

/** hex → `r, g, b`：本页 `rgba()` 浅底／描边的唯一换算位（色基只从冻结 token 与调色板取）。 */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

/** 页头图标位（纯装饰的内联 SVG，`data:image/svg+xml` 直接进 CSS）：只做「这一页是什么」的图形锚，
 *  不承载任何数据、不进文档流文字。形状用调色板里的暖色描边（与品牌带同一族）。 */
function heroMark(art: string): string {
  return 'url("data:image/svg+xml,' + art + '")';
}

/** 汤锅（页头图标位）。 */
const TITLE_MARK = heroMark(
  '%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2064%2064%27%3E'
  + '%3Crect%20x=%2714%27%20y=%2728%27%20width=%2736%27%20height=%2724%27%20rx=%278%27'
  + '%20fill=%27%23ffcc00%27%20fill-opacity=%27.25%27%20stroke=%27%23ff9500%27%20stroke-width=%273%27/%3E'
  + '%3Cpath%20d=%27M14%2036H6M50%2036h8%27%20stroke=%27%23ff9500%27%20stroke-width=%273%27'
  + '%20stroke-linecap=%27round%27/%3E'
  + '%3Cpath%20d=%27M26%2028a6%206%200%200%201%2012%200%27%20fill=%27none%27'
  + '%20stroke=%27%23ff2d55%27%20stroke-width=%273%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E',
);

/** 本页收口样式（#873 开始使用席）。每一条都在本技能根类之下，别的技能页一行不变。 */
function setupPageCss(): string {
  const yellow = rgbOf(CHART_PALETTE[6]);
  const warm = rgbOf(CHART_PALETTE[2]);
  const line = rgbOf(CSS_VAR_TOKENS['--line']);
  const root = '.ilife-page-ui ';
  return [
    '/* #873 开始使用·首次使用 页内收口 · 每一条都挂在根类之下 */',
    '/* 页头图标位：页名右侧一枚锅（48px，纯装饰）。 */',
    root + '.ilife-block-page-shell-title {',
    '  position: relative;',
    '  padding-right: 56px;',
    '}',
    root + '.ilife-block-page-shell-title::after {',
    '  content: "";',
    '  position: absolute;',
    '  right: 0;',
    '  top: 0;',
    '  width: 48px;',
    '  height: 48px;',
    '  background-image: ' + TITLE_MARK + ';',
    '  background-repeat: no-repeat;',
    '  background-size: 48px 48px;',
    '}',
    '/* 读数带：三条读数收进一张暖色面板，格间发丝线分区（不用任何分隔符字符）。 */',
    root + '.ilife-chef-deck {',
    '  box-sizing: border-box;',
    '  margin: 16px 0 0;',
    '  padding: 0;',
    '  border: 1px solid rgba(' + warm + ', .30);',
    '  border-radius: 14px;',
    '  background-image: linear-gradient(100deg, rgba(' + yellow + ', .20), var(--card) 58%);',
    '  box-shadow: 0 1px 3px rgba(' + line + ', .50);',
    '}',
    root + '.ilife-chef-deck .ilife-block-fact-strip-item {',
    '  flex: 1 1 auto;',
    '  padding: 11px 12px;',
    '  border: 0;',
    '  border-radius: 0;',
    '  background-color: transparent;',
    '}',
    root + '.ilife-chef-deck .ilife-block-fact-strip-item + .ilife-block-fact-strip-item {',
    '  border-left: 1px solid rgba(' + line + ', .90);',
    '}',
    '/* 列头（标签）与正文（数值）差 5px：这一条销的就是「表头与正文同号、难辨列」。 */',
    root + '.ilife-chef-deck .ilife-block-fact-strip-label {',
    '  letter-spacing: .06em;',
    '}',
    root + '.ilife-chef-deck .ilife-block-fact-strip-value {',
    '  font-size: 17px;',
    '  font-weight: 700;',
    '}',
    /* 桌面档把瓦片内容居中：三张等宽时短值不再孤零零贴左，一排三张读起来是一组读数。 */
    '@media (min-width: 820px) {',
    '  ' + root + '.ilife-chef-deck .ilife-block-fact-strip-item {',
    '    align-items: center;',
    '    text-align: center;',
    '  }',
    '}',
    '/* 分区题头：折叠条标题那一行带一条暖色渐隐（品牌温度落在「分区」这一层）。 */',
    root + '.ilife-block-page-shell-body > .ilife-block-disclosure > .ilife-block-disclosure-summary {',
    '  background-image: linear-gradient(90deg, rgba(' + yellow + ', .20), rgba(' + yellow + ', 0) 76%);',
    '  border-radius: 13px;',
    '}',
    '/* 开合标记：换成暖色圆点（公共层那枚蓝 ▸ 落在圆底上读起来像一个播放键）。 */',
    root + '.ilife-block-page-shell-body > .ilife-block-disclosure > .ilife-block-disclosure-summary::before {',
    '  background-color: rgba(' + warm + ', .22);',
    '  color: transparent;',
    '}',
  ].join(LF);
}

/** 首次使用向导页（过程型：分节折叠＋动作行）。 */
export function setupInitPage(input: { tables: number; initialized: boolean }): string {
  const done = input.initialized ? '本次已建齐' : '此前已建齐';
  const body = renderPageShell({
    eyebrow: '私家大厨 ｜ 开始使用',
    title: '首次使用',
    content: [
      renderConclusionBar('菜谱库已就绪，录第一道菜就能开工。'),
      renderFactStrip({
        extraClass: 'ilife-chef-deck',
        items: [
          { label: '业务表', value: String(input.tables) + ' 张' },
          { label: '状态', value: done },
          { label: '建库时机', value: '用到时才建' },
        ],
      }),
      renderDisclosure({
        title: '环境检测',
        contentHtml: renderProseBlock({ text: '读写环境正常，有缺项会在这里列出来，并给出安装方法。' }),
      }),
      renderDisclosure({
        title: '建库',
        // 原口径行那一句（用到时才建／建好不再改动）并进这一步：三个折叠条里它本来就属于「建库」。
        contentHtml: renderProseBlock({ text: '缺的会补上，齐的直接跳过，旧数据只提醒，不自动搬动；建好以后不再改动文件。' }),
      }),
      renderDisclosure({
        title: '完成回执',
        contentHtml: renderProseBlock({ text: '初始化只做一次，以后每次进来都不会重复建。' }),
      }),
      renderActionBar({
        buttons: [
          { label: '录第一道菜', kind: 'primary', actionId: 'setup-first' },
          { label: '看看全部菜谱', kind: 'ghost', actionId: 'setup-list' },
        ],
      }),
      renderCopyBlock({
        title: '复制上手说明',
        dataActionId: 'setup-copy',
        dataText: '菜谱库已就绪（' + input.tables + ' 张表，' + done + '），录第一道菜就能开工。',
      }),
    ].join(''),
  });
  return renderDocShell({
    docTitle: '首次使用',
    bodyHtml: body,
    extraCss: chefSceneCss() + LF + setupPageCss(),
    pageUi: true,
  });
}
