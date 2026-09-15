/** T351-v10 · 场景 05 各页共用的**页面级**样式（页宽 ＋ 窄屏 ＋ 触屏三件 ＋ 按钮行宽度约束）。
 *
 * 为什么独立成件（结构纪律的「同族第二处用法才切」）：这套规则本来只有「看计划族」一处
 * （`./workoutPlanCss.ts` 的 `PAGE_CSS`），复盘族（`./reviewDocsCss.ts`）落地时又抄了一份，
 * 本轮写族（过程页／回执页）要第三次用——第三次还抄就是三份会各自走散的副本，故提为一件。
 * 只对**卡路里包内**的页面生效（不进 `packages/base-*`；提公共层要另开票）。
 *
 * 口径出处：`packages/base-render/src/helpShell.ts` 里 HELP 的四条手法
 * （负责人 2026-09-15 第 ② 条：手机端适配参考 help html）：
 *   ① 触摸目标 ≥44px、`-webkit-tap-highlight-color:transparent`、`touch-action:manipulation`；
 *   ② 按钮行**自约束宽度并居中**（`.hm-actions{max-width:520px;margin:0 auto}`，防被页宽拉成长条）；
 *   ③ 窄屏**横向一行塌成纵向一列**（各页在自己那段里做）；
 *   ④ 窄屏**收紧内距**。
 * 本件落 ①（触屏三件）、②、④ 与断点；③ 因页而异，留在各家自己的样式里。
 *
 * 断点用 HELP 的 **820**（不是老模板那处 640）：共享区块自己那处 640 不撤——820 管页内自造的件，
 * 640 管共享件，两段同向、不打架。
 *
 * 页宽走参数：看计划族 900（照老 `workout_plan_view` 的 `.app`）、复盘与写族 960
 * （照共享页面模板缺省；老 `exercise_review` 的 `.wrap` 也是 960）。
 */

/** 页面级样式块（含 `<style>` 包裹，照包内先例直插正文：晚于 head 的共享样式表，同特异性下本页胜）。 */
export function pageChromeCss(maxWidth: number): string {
  const w = Number.isFinite(maxWidth) && maxWidth > 0 ? Math.floor(maxWidth) : 960;
  return '<style>\n' + [
    '/* 页宽与上下内边距：老页 `*{box-sizing:border-box}`，故显式钉上（' + w + ' 是含内边距的总宽） */',
    '.ilife-block-page-shell{box-sizing:border-box;max-width:' + w + 'px;padding:32px 20px 60px}',
    '/* 触屏三件（照 HELP）：页面内可点的件不许出现系统蓝高亮块、不许双击缩放延迟。',
    '   触摸目标 ≥44px 由各页自己的可点件声明（页签／按钮各有各的档），本件只钉这两条通用属性。 */',
    '.ilife-block-page-shell button,.ilife-block-page-shell summary'
      + '{-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
    '/* 折叠头也是可点件（过程页／回执页都有），触摸目标按 HELP 的下限 44px 给足 */',
    '.ilife-block-page-shell summary{min-height:44px;display:flex;align-items:center}',
    '/* 按钮行自约束宽度并居中（照 HELP）：不加这条，复制胶囊会被页宽拉成半屏宽的长条 */',
    '.ilife-block-page-shell .ilife-action-bar{max-width:520px;margin:0 auto}',
    '/* 窄屏（820 · 同 HELP）的页面级部分：页壳收紧内距、指标卡两列＋奇数末位通栏 */',
    '@media (max-width:820px){',
    '.ilife-block-page-shell{padding:20px 16px 48px}',
    '.ilife-block-page-shell-title{font-size:26px}',
    '.ilife-block-kpi-card-grid{grid-template-columns:repeat(2,1fr)}',
    '.ilife-block-kpi-card-grid>.ilife-block-kpi-card:nth-child(odd):last-child{grid-column:span 2}',
    '}',
  ].join('\n') + '\n</style>';
}
