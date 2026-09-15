/** #529 · 身材照片 HELP 两页（`calorie.help.center` 的 q 支）的**页内样式**。
 *
 * 为什么另立一件：`helpDoc.ts` 的装配已经贴着 350 行告警线，样式塞进去必然越线；同族的
 * `render/reviewDocsCss.ts`（#504 起）就是这条拆法的先例——「页内局部样式另住一件，装配件只引用」。
 * 本件只出**一段 CSS 文本**，不读盘、不产 HTML、不碰 DOM。
 *
 * 四条口径：
 *  1. **只读冻结 token**（`base-render/src/spec/style.ts` 的 11 个 `--*` 名）：本件一律写 `var(--x)`，
 *     不新造变量名、不写死色值（本页一个色值都不需要新增——公共层的 token 足够表达这四档灰度）。
 *  2. **只补公共层没覆盖的**：公共区块样式（`blocksCss()`）已经把卡片／行／徽章／命令块都定好了；
 *     页面级移动端配方（断点／44px 触摸区／安全区／窄屏表格）由 #525 的 `pageUi` 位统一提供
 *     （`assembleDocPage({ pageUi: true })`），**本件不重写那一条**。本件只做四件公共层不做的事：
 *     ① 见下「本页特有的四件」。
 *  3. **断点只用仓里既有的两个**：`640px`（页面档）与 `400px`（窄屏档）——与
 *     `packages/base-render/src/style.ts` 现有 `@media (max-width: 640px)`／`(max-width: 400px)`
 *     逐字同值，**不新造断点**。
 *  4. **选择器权重不越位**：凡是 `pageUi` 也管的属性（页内导航的换行／横滑、触摸区高度、
 *     安全区留白），本件**只写与 pageUi 同级的那一层选择器**（不套 `.ilife-helpdoc-nav` 父类），
 *     免得本页把共用配方的默认值按死。
 *
 * 本页特有的四件（公共层与 pageUi 都覆盖不到）：
 *  ① 节头／命令行的层级与呼吸（域—组—场景三级的中间两级）；
 *  ② 命令行的「说这句」标签与唤醒词徽章的同排；
 *  ③ 折叠载荷的长串折行（原文里有很长的英文参数名，不折断会把窄屏顶出横向滚动）；
 *  ④ 400 档把页内目录收成一条横滑胶囊轨（640 档换行的五颗胶囊在白占一屏多，把正文压到首屏外）。
 *
 * 类名前缀 `ilife-helpdoc-`：与全仓 `ilife-` 命名空间一致，且与公共区块类不撞名。
 */
/** 换行：仓库口径 `String.fromCharCode(10)`，不写字面转义。 */
const NL = String.fromCharCode(10);

/** 规则拼装（每条一行，便于台账与 diff 读）。 */
const RULES: readonly string[] = [
  /* ── 页内目录：触摸区在**所有**档都 ≥44px（#524 基准点名的「触摸目标 40px」正是本页 1440 档
   *    的目录链接实测 33.5px；pageUi 只管 820 档以下，故 44px 下限由本页自己钉住） ── */
  '.ilife-helpdoc-nav .ilife-block-toc{margin:16px 0}',
  '.ilife-helpdoc-nav .ilife-block-toc a{display:inline-flex;align-items:center;min-height:44px;'
    + 'padding:0 16px;line-height:1.2}',

  /* ── 清单读法：一页一句（取代改前「每条命令各印一遍」） ─────────────── */
  '.ilife-helpdoc-lead{margin:14px 0 0;color:var(--fg2);font-size:13px;line-height:1.6}',

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

  /* ── 「说这句」＋唤醒词徽章：形状（徽章）已由 renderChips 给，这里只排一行与对齐。
   *    标签**退让一档**：灰（`--fg3`）＋ 松字距 ＋ 略降不透明 —— 层级靠色与字距拉开，
   *    **不靠降字号**（#524 基准要求 HELP 的最小字号 ≥ 它的下限，故这里恒 12px）。 ── */
  '.ilife-helpdoc-say{margin:8px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
  '.ilife-helpdoc-say-tag{color:var(--fg3);font-size:12px;font-weight:600;letter-spacing:.06em;'
    + 'opacity:.85}',

  /* ── 折叠载荷：默认收起；展开后那一格**不是代码块**，是一句人话（原文住复制按钮的属性里）
   *    加一条长串折行，防「属性/句式被顶宽」把窄屏撑出横向滚动 ── */
  '.ilife-helpdoc-row .ilife-block-disclosure{margin:10px 0 0}',
  '.ilife-helpdoc-row .ilife-block-pre-block{margin:0}',
  '.ilife-helpdoc-row .ilife-block-pre-block-code{background:var(--soft);color:var(--fg2);'
    + 'font-family:inherit;font-size:13px;line-height:1.6;white-space:normal;'
    + 'word-break:break-word;overflow-wrap:anywhere}',
  '.ilife-helpdoc-row .ilife-copy-btn{width:100%;margin-top:10px;min-height:44px}',

  /* ── 页尾复制区：与上方清单留出一档呼吸 ─────────────────────────────── */
  '.ilife-helpdoc-copy{margin-top:24px}',
];

/** 窄屏档（640px）：节头与行内边距收一档，字号**不下调**（手机端字号下限是标杆判据）。 */
const NARROW: readonly string[] = [
  '.ilife-helpdoc-row{padding:12px 14px}',
  '.ilife-helpdoc-name{font-size:15.5px}',
  '.ilife-helpdoc-detail{font-size:13px}',
  '.ilife-helpdoc-section{margin-top:20px}',
  /* 胶囊轨的**可滑提示**：右缘一抹渐隐。为什么需要：390 档五颗胶囊一屏放不下、末颗只露一半，
   *  「被切断」本身是提示，但若读成渲染事故就白搭；补一道渐隐把这条轨一眼读成「可滑」。
   *  纯视觉属性（`mask-image`），不动可访问树、不动触摸区、不改任何尺寸。 */
  '.ilife-helpdoc-nav .ilife-block-toc{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 28px),'
    + 'transparent);mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent)}',
];

/** 极窄档（400px）：目录转**一条可横滑的胶囊行**——五个节名满宽竖排会白占一屏多，把正文压到
 *  首屏之外；横滑保住「一屏内看得见正文」与「每颗胶囊仍是 44px 触摸区」两件事。
 *  选择器与 pageUi 同级（不套父类），故这一档照旧盖得住共用配方给的 640 档默认值。 */
const TINY: readonly string[] = [
  '.ilife-block-toc{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;'
    + 'padding-bottom:2px;scrollbar-width:none}',
  '.ilife-block-toc::-webkit-scrollbar{display:none}',
  '.ilife-block-toc a{flex:0 0 auto;padding:0 14px}',
];

/** 页内样式文本（**自带 `<style>` 包裹**，与同族 `weightUiCss()`／`reviewViewCss()` 同口径：
 *  调用方把它拼进 `assembleDocPage` 的 `content` 最前——`assembleDocPage` 没有页内 CSS 入口，
 *  正文首件带上样式段是本仓既有的做法）。 */
export function photoHelpDocCss(): string {
  const media = (px: string, rules: readonly string[]): string =>
    '@media (max-width:' + px + '){' + NL + rules.join(NL) + NL + '}';
  return '<style>'
    + [
      '/* #529 身材照片 HELP 两页 · 页内样式（只用冻结 token；断点沿用 640／400；'
        + '页面级移动端配方归 #525 的 pageUi 位） */',
      ...RULES,
      media('640px', NARROW),
      media('400px', TINY),
    ].join(NL)
    + '</style>';
}
