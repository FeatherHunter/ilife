/** 饮食族页内窗口条（饮食自有件）：标题里的日期区间搬到正文首件成形。
 *
 * 负责人口径「标题不带日期时间，日期时间由顶部控件承载」在饮食族的落点——
 * 此前 9 种页把 `2026-09-09 ~ 2026-09-15` 直接拼进 H1（`rankingDocs`／`reviewDocs`／
 * `todayDocs`／`nutritionPortDocs`），与 `src/shared/docPage.ts` 的 B 线口径
 * （H1＝人话短标题、不带日期）不一致。
 *
 * **#719 起形状与样式都住共用位** `src/shared/pageStrips.ts`（窗口条原先三族各写一份，
 * 实测三份函数体逐字同构、只差类名前缀与几处几何值）。本件只留两件东西：
 * 本族的类名词汇（`dui-` 那一套）与把共享段拼进族样式段的那一行。
 * 原注释里那句「形状抄体重族 `weightUi.windowStrip()` 的设计语言、代码归饮食所有」到此为止——
 * 三族再也不各写一份，也就没有「抄哪一族」这回事。
 *
 * 用法：各页装配把 `dietUiCss()` 放进 parts 第一项，窗口条放在正文首件
 * （导航之前）；`chipText` 装条数／天数（不给即不出胶囊）。
 */
import { sheetCss } from 'base-paint/blocks';
import { WINDOW_VOCAB, windowStrip as stripWindowStrip, windowStripCss } from '../shared/pageStrips.js';

/** 小票版页面的**桌**（纸由公共层的 `sheetCss()` 给，桌面底色与纸的宽度由页面给——分工见
 *  `docs/base/base-render/单据族组件.md`）。只在 `dietUiCss({ sheet: true })` 时出这一段。 */
const SHEET_PAGE_CSS = 'body{background:#ebe6dc}'
  /* 纸宽只有**一个数**（`--sheet-col`）：纸、存根（复制区）、窗口条、页内导航全按它收列对齐。
     2026-09-24 用户图报「电脑端适配差、看着丑」——病根就是各处各写 max-width：纸写了 600，
     复制区没写 ⇒ 复制区跟着页宽（880）跑，同页于是出现三条互不对齐的左边线。 */
  + '.ilife-page-ui{--sheet-col:600px}'
  + '@media (min-width:1001px){'
  + '.ilife-page-ui .ilife-block-sheet{max-width:var(--sheet-col);margin-left:auto;margin-right:auto}'
  + '.ilife-page-ui .ilife-block-page-shell-body>*{max-width:var(--sheet-col);margin-left:auto;margin-right:auto}'
  + '}'
  /* ── 报头（2026-09-24 用户图报「顶部那些标签没有用新的样张做」）────────────────────────
   * 样张的报头＝眉标小字带字距 ／ 大号粗体页名 ／ 右侧一行日期 ／ 底下一条 2px 实线。
   * 我们这页的**页头三件（眉标／H1／副题）与窗口条是既有结构**（`551-diet-subtitle` 等测试钉着类名），
   * 所以这里只换**排印**：日期标签从「卡片底＋边框的胶囊」退回成纯文本日期，窗口条那一行下面压一条实线，
   * 眉标与副题按样张的字距与灰度走。结构一行未动。 */
  + '.ilife-page-ui .ilife-block-page-shell-eyebrow{color:var(--fg2);font-size:12px;letter-spacing:.3em}'
  + '.ilife-page-ui .ilife-block-page-shell-title{font-size:26px;font-weight:800;letter-spacing:-.01em}'
  + '.ilife-page-ui .ilife-block-page-shell-subtitle{color:var(--fg3);font-size:12.5px}'
  + '.ilife-page-ui .diet-window{border-bottom:2px solid var(--fg);padding-bottom:9px;margin:0 0 14px;justify-content:space-between}'
  + '.ilife-page-ui .diet-date{background:none;border:0;padding:0;color:var(--fg2);font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums}'
  + '.ilife-page-ui .diet-arrow{color:var(--fg3);font-size:12.5px}'
  + '.ilife-page-ui .diet-chip{background:none;padding:0;color:var(--fg3);font-size:11.5px;font-weight:600}'
  + '.ilife-page-ui .diet-facts{justify-content:flex-start;margin:0 0 10px}'
  /* 这一族的印章＝样张那枚朱红印（不管调用方给不给语气色：饮食族的"目标差额"只有一种印记）。
     **语气类必须一起覆盖**：`.stamp.is-warn` 是三个类，只写两个类的规则会被它压住（上一版就是这么失效的）。 */
  + '.ilife-page-ui .ilife-block-summary-head-stamp,'
  + '.ilife-page-ui .ilife-block-summary-head-stamp.is-ok,'
  + '.ilife-page-ui .ilife-block-summary-head-stamp.is-warn,'
  + '.ilife-page-ui .ilife-block-summary-head-stamp.is-danger{border-color:#b3402b;color:#b3402b}'
  /* ── 页内导航（2026-09-24 用户图报红框：那一排胶囊是老语汇，样张没有导航条）────────────
   * 类名与结构不动（`ilife-block-toc` 与六个锚点被测试钉着），只换**排印**：
   * 胶囊底/边/圆角全部撤掉，收成一行**字距小字**（样张那种"目录"读法），项间靠列距分开。 */
  + '.ilife-page-ui .ilife-block-toc{display:flex;flex-wrap:wrap;gap:6px 18px;margin:2px 0 12px}'
  + '.ilife-page-ui .ilife-block-toc a{background:none;border:0;border-radius:0;padding:0;color:var(--fg2);'
  + 'font-size:12px;font-weight:600;letter-spacing:.06em;text-decoration:none}'
  + '.ilife-page-ui .ilife-block-toc a:hover{color:var(--fg)}'
  /* ── 存根（2026-09-24 用户裁定：复制区**移进纸里**，且要有小票的巧思）───────────────────
   * 一条撕线（虚线＋两枚冲孔，语汇照公共层纸的裁切线）＋ 小字「存根」＋ 一句撕法 ＋ 控件原样的两枚按钮。
   * 皮肤只认**冻结的容器类名 ＋ `button` 元素**（不碰控件内部类名、不碰标记、不碰逻辑、不碰文案）：
   * 印色取纸族那支朱红，微斜照印章同角（-1.2deg）；手机档不斜（斜在窄格上会显脏）。 */
  + '.ilife-page-ui .ilife-stub-tear{position:relative;border-top:1px dashed #d8d2c2;margin:14px -20px 10px}'
  + '.ilife-page-ui .ilife-stub-tear::before,.ilife-page-ui .ilife-stub-tear::after{content:"";position:absolute;top:-5px;width:9px;height:9px;border-radius:50%;background:#ebe6dc}'
  + '.ilife-page-ui .ilife-stub-tear::before{left:8px}'
  + '.ilife-page-ui .ilife-stub-tear::after{right:8px}'
  + '.ilife-page-ui .ilife-stub-kicker{color:var(--fg3);font-size:11.5px;font-weight:700;letter-spacing:.22em}'
  + '.ilife-page-ui .ilife-stub-note{margin:3px 0 12px;color:var(--fg3);font-size:11.5px}'
  + '.ilife-page-ui .ilife-block-page-shell-body .ilife-block-copy-block button{border:1.5px solid #b3402b;'
  + 'background:transparent;color:#b3402b;border-radius:3px;font-weight:800;letter-spacing:.06em;'
  + 'transform:rotate(-1.2deg);box-shadow:none}'
  + '.ilife-page-ui .ilife-block-page-shell-body .ilife-block-copy-block button:hover{background:rgba(179,64,43,.07)}'
  + '.ilife-page-ui .ilife-block-page-shell-body .ilife-block-copy-block button:disabled{opacity:.45}'
  + '@media (max-width:640px){.ilife-page-ui .ilife-block-page-shell-body .ilife-block-copy-block button{transform:none}}';

/** 本族样式段：**共用位那段（窗口条的形状规则）＋ 本族自己那一段**。
 *
 *  拼成**一个** `<style>` 块（不是两块）——既有测试件 `exercise-text-shape-523` 按 `<style>` 标签
 *  切块、再断言「含本族窗口条类名的那一块恰好 1 个」，并列两块会把那条判据打红。
 *
 *  #587 C项3卡孤行占满行：读数卡网格在 2 列档（≤640）或 4 列档（≥1001）里遇 3 卡（或 5 卡）时，
 *  末行孤儿半宽悬空——末子逢奇即占满整行（`grid-column: 1 / -1`）。形状仍走公共层 `renderKpiGrid`
 *  现成件，本处只补孤行版式，不新造第七种形状。1 列档（≤400）与偶数卡不受影响（同值）。
 *  这一条与窗口条无关，留在本族。 */
/* ── #551 · 窗口条与事实条（页头形状） ──────────────────────────────────────────
 *
 * 2026-09-24 从小票版改造起**搬到本件**：它是饮食族的页头形状（窗口页在用），
 * 与窗口条同族同层；窗口页装配（`src/render/dietDocs.ts`）此前为它保留了 12 行，搬来即两边都轻。
 * 类名与结构一字未动（`diet-window`／`diet-facts`／`diet-fact-v` 被 `551-diet-subtitle` 钉着）。 */
const DIET_SHAPE_CSS = '<style>.diet-window,.diet-facts{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin:4px 0 12px}'
  + '.diet-date{font-size:13px;font-weight:600;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:4px 8px}'
  + '.diet-arrow{font-size:13px;color:var(--fg3)}.diet-chip{font-size:12px;font-weight:700;color:var(--blue2);background:var(--soft);border-radius:999px;padding:4px 8px}'
  + '.diet-fact{display:inline-flex;gap:8px;align-items:baseline}.diet-fact-k{font-size:12px;color:var(--fg3);white-space:nowrap}'
  + '.diet-fact-v{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}'
  + '@media (max-width:820px){.diet-facts{flex-direction:column;align-items:stretch;gap:8px}.diet-fact{justify-content:space-between}}</style>';
const dietEsc = (s: string): string => s.replace(/[&<>"']/g, (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;');

/** 页头：`起 → 止`（或单日）＋ 计数胶囊 ＋ 一排事实（形状住本件，窗口页装配只递数据）。 */
export function dietHead(start: string, end: string, chip: string, facts: ReadonlyArray<readonly [string, string]>): string {
  const mid = start === end ? '<span class="diet-date">' + dietEsc(start) + '（单日）</span>' : '<span class="diet-date">' + dietEsc(start) + '</span><span class="diet-arrow">→</span><span class="diet-date">' + dietEsc(end) + '</span>';
  return DIET_SHAPE_CSS + '<div class="diet-window">' + mid + '<span class="diet-chip">' + dietEsc(chip) + '</span></div><div class="diet-facts">'
    + facts.map(([k, v]) => '<span class="diet-fact"><span class="diet-fact-k">' + dietEsc(k) + '</span><span class="diet-fact-v">' + dietEsc(v) + '</span></span>').join('') + '</div>';
}

/** 小票版那一族样式：**纸**（公共层 `sheetCss()`：纸面／主数字头／刻度条／账目行／明细行）＋ **桌**（本页自己那一段）。
 *  三张族页共用：今日页经 `dietUiCss({ sheet: true })` 拼进本族样式段；窗口页与喝水页自己没有窗口条件，直接挂一段。 */
export function sheetStyleCss(): string {
  return sheetCss() + SHEET_PAGE_CSS;
}

/** 纸里的**存根**：把复制区那两枚按钮包成小票下缘那一联（撕线 ＋ 小字「存根」＋ 撕法 ＋ 控件原样的按钮）。
 *
 *  三张族页（今日／窗口／喝水）共用这一份标记——落点只有一处，免得三页各写一遍走散。
 *  复制区控件（`base-paint` 的 `ilife-block-copy-block`）的**标记、文案、顺序、`data-*` 一个字不动**：
 *  这里只加外壳，外观由 `SHEET_PAGE_CSS` 里那三条按容器类名＋`button` 元素的皮肤规则给。 */
export function receiptStub(inner: string): string {
  return '<div class="ilife-stub">'
    + '<div class="ilife-stub-tear" aria-hidden="true"></div>'
    + '<div class="ilife-stub-kicker">存根</div>'
    + '<p class="ilife-stub-note">沿虚线撕下，把这一联带走。</p>'
    + inner + '</div>';
}

export function dietUiCss(input?: { readonly sheet?: boolean }): string {
  return '<style>'
    + windowStripCss()
    + '.ilife-block-kpi-card-grid>:last-child:nth-child(odd){grid-column:1/-1}'
    + (input !== undefined && input !== null && input.sheet === true ? sheetStyleCss() : '')
    + '</style>';
}

/** 窗口条：`起 → 止` ＋ 计数胶囊；`start === end`（单日）时只出一枚日期块、不出箭头。
 *  形状住 `src/shared/pageStrips.ts`；本件只把本族的类名词汇递给它。 */
export function windowStrip(start: string, end: string, chipText?: string): string {
  return stripWindowStrip(start, end, chipText, WINDOW_VOCAB.diet);
}
