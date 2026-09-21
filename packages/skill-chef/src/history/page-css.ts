/** 历史域四页共用的页内收口样式（在公共层皮肤 `chefSceneCss()` 之后追加，不拆两层）。
 *
 * 为什么另立一件：公共层皮肤（`src/render/skin.ts`）管的是 48 页共用的形状语言，它不知道
 * 每页摆几格——本域四页的读数卡是 3 张或 4 张、动作条是 3 颗按钮。公共层那条「宽档一行四格」
 * 在 3 张卡下会把第三张留在第四格里空着，在 5 张卡下会多出一张孤卡（#873 第 33 格的扣分项
 * 就是这个形状）；件数只有本域知道，故这条栅格口径住在本域。同一把尺也管动作条的末排。
 *
 * 只做两件事，只对本域四页生效：
 *   ① 读数卡栅格：**格子数反过来定列数**——宽档让 N 张平分整行（`grid-auto-flow: column`
 *      ＋ `grid-auto-columns`，不再固定四列）；窄档照公共层的两列排，奇数张时末张跨两列。
 *   ② 动作条：末排只剩一颗按钮时铺满整行（与 ① 同一条口径：末件不许占半格）。
 *
 * 取值口径：断点 640／1001 取仓内既有集合（`pageUi.ts` 的 `PAGE_LIMITS.breakpointsPx`），
 * 圆角一个都不写，**颜色一个都不写**（本件只动栅格与跨列，配色全归公共层皮肤）。
 * 宽档另收两条：读数卡与事实条收进正文列宽（公共层把读数卡铺满整屏，本域这几页的卡值都
 * 只有一两个字形，铺满 1240px 后每张卡留下大半片空白、事实条三枚瓦片挤在左半行）；时间轴的
 * 时间槽给一个下限宽（同一天的多条只印一次日期、续行印「同日」，不给下限时正文起始位会漂）。
 */

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 页内收口样式段（本件唯一出口）。恒返回非空 CSS 文本。 */
export function historyPageCss(): string {
  const root = '.ilife-page-ui';
  return [
    '/* #873 历史域页内收口 · 每一条规则都挂在根类 ' + root + ' 之下 */',
    /* 时间轴：时间槽给下限宽（「2026-09-21」这种 10 字日期占得住，续行的「同日」也占得住），
       同一列正文的起始位不随日期长短漂。 */
    root + ' .ilife-block-timeline-time {',
    '  min-width: 76px;',
    '}',
    '@media (max-width: 640px) {',
    /* 窄档两列排：末张落单时让它跨两列——右半边不留空，纵向也不再多出一截半宽的参差。
       跨列那张改成一行摆（标签贴左、数值贴右）：跨了整行却仍按两行摆，卡片里会多出一片
       空白，读起来像「这张卡没写完」。 */
    '  ' + root + ' .ilife-block-kpi-card-grid > .ilife-block-kpi-card:last-child:nth-child(odd) {',
    '    grid-column: 1 / -1;',
    '    flex-direction: row;',
    '    align-items: center;',
    '    justify-content: space-between;',
    '  }',
    '  ' + root + ' .ilife-block-kpi-card-grid > .ilife-block-kpi-card:last-child:nth-child(odd)',
    '    > .ilife-block-kpi-card-value-row {',
    '    margin-top: 0;',
    '  }',
    '  ' + root + ' .ilife-action-row > .ilife-action-btn:last-child:nth-child(odd) {',
    '    grid-column: 1 / -1;',
    '  }',
    '}',
    '@media (min-width: 1001px) {',
    /* 读数卡：收进正文列宽（880px）并与页头对齐——铺满整屏时每张卡左右各空一大片。
       列数跟着张数走：N 张平分这一行，恒无空格、恒无孤卡。 */
    '  ' + root + ' .ilife-block-kpi-card-grid {',
    '    max-width: 880px;',
    '    margin-left: auto;',
    '    margin-right: auto;',
    '    grid-auto-flow: column;',
    '    grid-auto-columns: minmax(0, 1fr);',
    '    grid-template-columns: none;',
    '  }',
    /* 事实条：瓦片按行平分——它与上面那条结论条、下面那排读数卡共用同一条 880px 版心；
       瓦片按内容宽挤在左边时右半边空着，与上下两块也不齐（复评实测：对齐错位扣分）。 */
    '  ' + root + ' .ilife-block-fact-strip-item {',
    '    flex: 1 1 0;',
    '  }',
    /* 动作条：几颗按钮都排在正文列里、按颗数平分（与上面那排读数卡同一条栅格节奏）。 */
    '  ' + root + ' .ilife-action-row {',
    '    grid-auto-flow: column;',
    '    grid-auto-columns: minmax(0, 1fr);',
    '    grid-template-columns: none;',
    '  }',
    '}',
  ].join(LF);
}
