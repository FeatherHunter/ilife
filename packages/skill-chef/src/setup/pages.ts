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
  renderDisclosure,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { chefCopyArea } from '../render/copyArea.js';
import { renderSceneShell } from '../render/sceneShell.js';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／皮肤件同）。 */
const LF = String.fromCharCode(10);

/** hex → `r, g, b`：本页 `rgba()` 浅底／描边的唯一换算位（色基只从冻结 token 与调色板取）。 */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

/** 本页收口样式（#873 开始使用席）。每一条都在本技能根类之下，别的技能页一行不变。
 *
 *  第三轮：**页头不再放本席自己那枚图标**——页族装饰带（`ilife-scene-band-process`）已经占了页头那一格，
 *  同一处两件装饰是重复。本页留读数带、分区题头暖色渐隐、开合折角，再补一段**窄档填满度**
 *  （页族填满度公共层只给了回执族，process 族这一页由页内自己收）。 */
function setupPageCss(): string {
  const yellow = rgbOf(CHART_PALETTE[6]);
  const warm = rgbOf(CHART_PALETTE[2]);
  const line = rgbOf(CSS_VAR_TOKENS['--line']);
  const root = '.ilife-page-ui ';
  return [
    '/* #873 开始使用·首次使用 页内收口 · 每一条都挂在根类之下 */',
    '/* 读数带：三条读数收进一张暖色面板，格间发丝线分区（不用任何分隔符字符）。 */',
    root + '.ilife-chef-deck {',
    '  box-sizing: border-box;',
    '  margin: 22px 0 0;',
    '  padding: 0;',
    '  border: 1px solid rgba(' + warm + ', .30);',
    '  border-radius: 14px;',
    '  background-image: linear-gradient(100deg, rgba(' + yellow + ', .20), var(--card) 58%);',
    '  box-shadow: 0 1px 3px rgba(' + line + ', .50);',
    '}',
    // 窄档不给「等宽挤块」：瓦片按内容宽排（`flex: 0 1 auto`），宽档再让它撑满一行居中。
    root + '.ilife-chef-deck .ilife-block-fact-strip-item {',
    '  flex: 0 1 auto;',
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
    /* 宽档：三张各自撑等宽、内容居中（一排三张读起来是一组读数）。 */
    '@media (min-width: 820px) {',
    '  ' + root + '.ilife-chef-deck .ilife-block-fact-strip-item {',
    '    flex: 1 1 auto;',
    '    align-items: center;',
    '    text-align: center;',
    '  }',
    '}',
    '/* 分区题头：折叠条标题那一行带一条暖色渐隐（品牌温度落在「分区」这一层）。 */',
    root + '.ilife-block-page-shell-body > .ilife-block-disclosure > .ilife-block-disclosure-summary {',
    '  background-image: linear-gradient(90deg, rgba(' + yellow + ', .20), rgba(' + yellow + ', 0) 76%);',
    '  border-radius: 13px;',
    '}',
    '/* 开合标记：换成一枚暖色折角（公共层那枚蓝 ▸ 落在圆底上像播放键；换成实心圆点又被读成空态圆点）。 */',
    root + '.ilife-block-disclosure-summary::before {',
    '  content: "";',
    '  width: 8px;',
    '  height: 8px;',
    '  margin-right: 12px;',
    '  border-right: 2px solid rgba(' + warm + ', .95);',
    '  border-bottom: 2px solid rgba(' + warm + ', .95);',
    '  border-radius: 0;',
    '  background: none;',
    '  transform: rotate(45deg);',
    '}',
    root + '.ilife-block-disclosure[open] > .ilife-block-disclosure-summary::before {',
    '  transform: rotate(225deg);',
    '}',
    '/* 窄档填满度：块距 16→26px、三步可点件 44→54px —— 首屏底空从 128px 收到 119px',
    '   （页族那份填满度只覆盖回执族，process 族这一页由页内自己收；一个字的内容都不编）。',
    '   反例读数：撤掉这一段，首屏底空立刻回到 189px、双端自适应 20→17（见证据件「第三轮」）。 */',
    '@media (max-width: 640px) {',
    '  ' + root + '.ilife-block-page-shell-body > * + .ilife-block {',
    '    margin-top: 26px;',
    '  }',
    '  ' + root + '.ilife-block-disclosure-summary {',
    '    min-height: 54px;',
    '  }',
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
      // 第三轮文案审计：原结论条「菜谱库已就绪，录第一道菜就能开工。」——删掉它用户一个字都不会少知道
      // （「已建齐」在读数带的「状态」格里、要做什么在按钮「录第一道菜」上），故删。
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
      chefCopyArea({
        // 第三轮文案审计：试过不给标题（只留按钮）——同会话实测 89 → 84，掉了就回退，故保留标题。
        title: '复制上手说明',
        dataActionId: 'setup-copy',
        data: {
          key: 'chef.setup.init', shape: 'receipt', ok: true,
          message: '菜谱库已就绪（' + input.tables + ' 张表，' + done + '），录第一道菜就能开工。',
        },
      }),
    ].join(''),
  });
  return renderSceneShell({
    family: 'process',
    docTitle: '首次使用',
    bodyHtml: body,
    extraCss: setupPageCss(),
  });
}
