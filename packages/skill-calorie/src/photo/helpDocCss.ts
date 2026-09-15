/** #529 · 身材照片 HELP 两页（`calorie.help.center` 的 q 支）的**页内样式**。
 *
 * 为什么另立一件：`helpDoc.ts` 的装配已经贴着 350 行告警线，样式塞进去必然越线；同族的
 * `render/reviewDocsCss.ts`（#504 起）就是这条拆法的先例——「页内局部样式另住一件，装配件只引用」。
 * 本件只出**一段 CSS 文本**，不读盘、不产 HTML、不碰 DOM。
 *
 * 三条口径：
 *  1. **只读冻结 token**（`base-render/src/spec/style.ts` 的 11 个 `--*` 名）：本件一律写 `var(--x)`，
 *     不新造变量名、不写死色值（本页一个色值都不需要新增——公共层的 token 足够表达这四档灰度）。
 *  2. **只补公共层没覆盖的**：公共区块样式（`blocksCss()`）已经把卡片／行／徽章／命令块都定好了，
 *     本件只做三件公共层不做的事——① 页内目录的**触摸区下限 44px**（公共 `.ilife-block-toc a` 是
 *     29px 胶囊，手机上点不准）；② 节头／命令行的层级与呼吸（公共层没有这一层结构）；
 *     ③ 折叠载荷的**长串折行**（命令原文里有很长的英文参数名，不折断会把窄屏顶出横向滚动）。
 *  3. **断点只用仓里既有的两个**：`640px`（页面档）与 `400px`（窄屏档）——与
 *     `packages/base-render/src/style.ts` 现有 `@media (max-width: 640px)`／`(max-width: 400px)`
 *     逐字同值，**不新造断点**。
 *
 * 类名前缀 `ilife-helpdoc-`：与全仓 `ilife-` 命名空间一致，且与公共区块类不撞名。
 */
/** 换行：仓库口径 `String.fromCharCode(10)`，不写字面转义。 */
const NL = String.fromCharCode(10);

/** 规则拼装（每条一行，便于台账与 diff 读）。 */
const RULES: readonly string[] = [
  /* ── 页内目录：手机端点得准 ─────────────────────────────────────────── */
  '.ilife-helpdoc-nav .ilife-block-toc{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}',
  '.ilife-helpdoc-nav .ilife-block-toc a{display:inline-flex;align-items:center;min-height:44px;'
    + 'padding:0 16px;font-size:14px;line-height:1.2}',

  /* ── 节头：一句话说清这一节是干什么的 ───────────────────────────────── */
  '.ilife-helpdoc-section{margin:24px 0 0;scroll-margin-top:16px}',
  '.ilife-helpdoc-section-title{margin:0;color:var(--fg);font-size:17px;font-weight:700;'
    + 'letter-spacing:-.01em;line-height:1.3}',
  '.ilife-helpdoc-section-title::before{content:"";display:inline-block;width:3px;height:15px;'
    + 'margin-right:8px;border-radius:999px;background:var(--blue);vertical-align:-2px}',
  '.ilife-helpdoc-section-lead{margin:6px 0 0;color:var(--fg3);font-size:13px;line-height:1.6}',

  /* ── 命令清单：一条一行，行距与分隔线比公共层紧一档（10 条同屏可扫） ── */
  '.ilife-helpdoc-list{margin:10px 0 0;padding:0;list-style:none;border:1px solid var(--line);'
    + 'border-radius:14px;background:var(--card)}',
  '.ilife-helpdoc-row{padding:14px 16px;border-top:1px solid var(--line)}',
  '.ilife-helpdoc-row:first-child{border-top:0}',
  '.ilife-helpdoc-name{margin:0;color:var(--fg);font-size:16px;font-weight:700;line-height:1.35;'
    + 'overflow-wrap:anywhere}',
  '.ilife-helpdoc-detail{margin:4px 0 0;color:var(--fg2);font-size:13.5px;line-height:1.6;'
    + 'overflow-wrap:anywhere}',

  /* ── 折叠载荷：默认收起；展开后那一格**不是代码块**，是一句人话（原文住复制按钮的属性里）
   *    加一条长串折行，防「属性/句式被顶宽」把窄屏撑出横向滚动 ── */
  '.ilife-helpdoc-row .ilife-block-disclosure{margin:10px 0 0}',
  '.ilife-helpdoc-row .ilife-block-pre-block{margin:0}',
  '.ilife-helpdoc-row .ilife-block-pre-block-code{background:var(--soft);color:var(--fg2);'
    + 'font-family:inherit;font-size:13px;line-height:1.6;white-space:normal;'
    + 'word-break:break-word;overflow-wrap:anywhere}',
  '.ilife-helpdoc-row .ilife-copy-btn{width:100%;margin-top:10px}',

  /* ── 页尾复制区：与上方清单留出一档呼吸 ─────────────────────────────── */
  '.ilife-helpdoc-copy{margin-top:24px}',
];

/** 窄屏档（640px）：节头与行内边距收一档，字号**不下调**（手机端字号下限是标杆判据）。 */
const NARROW: readonly string[] = [
  '.ilife-helpdoc-row{padding:12px 14px}',
  '.ilife-helpdoc-name{font-size:15.5px}',
  '.ilife-helpdoc-detail{font-size:13px}',
  '.ilife-helpdoc-section{margin-top:20px}',
];

/** 极窄档（400px）：目录转**一条可横滑的胶囊行**——五个节名满宽竖排会白占一屏多，把正文压到
 *  首屏之外；横滑保住「一屏内看得见正文」与「每颗胶囊仍是 44px 触摸区」两件事。 */
const TINY: readonly string[] = [
  '.ilife-helpdoc-nav .ilife-block-toc{flex-wrap:nowrap;overflow-x:auto;'
    + 'padding-bottom:2px;scrollbar-width:none}',
  '.ilife-helpdoc-nav .ilife-block-toc::-webkit-scrollbar{display:none}',
  '.ilife-helpdoc-nav .ilife-block-toc a{flex:0 0 auto;padding:0 14px}',
];

/** 页内样式文本（**自带 `<style>` 包裹**，与同族 `weightUiCss()`／`reviewViewCss()` 同口径：
 *  调用方把它拼进 `assembleDocPage` 的 `content` 最前——`assembleDocPage` 没有页内 CSS 入口，
 *  正文首件带上样式段是本仓既有的做法）。 */
export function photoHelpDocCss(): string {
  const media = (px: string, rules: readonly string[]): string =>
    '@media (max-width:' + px + '){' + NL + rules.join(NL) + NL + '}';
  return '<style>'
    + [
      '/* #529 身材照片 HELP 两页 · 页内样式（只用冻结 token；断点沿用 640／400） */',
      ...RULES,
      media('640px', NARROW),
      media('400px', TINY),
    ].join(NL)
    + '</style>';
}
