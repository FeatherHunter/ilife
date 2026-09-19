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
import { WINDOW_VOCAB, windowStrip as stripWindowStrip, windowStripCss } from '../shared/pageStrips.js';

/** 本族样式段：**共用位那段（窗口条的形状规则）＋ 本族自己那一段**。
 *
 *  拼成**一个** `<style>` 块（不是两块）——既有测试件 `exercise-text-shape-523` 按 `<style>` 标签
 *  切块、再断言「含本族窗口条类名的那一块恰好 1 个」，并列两块会把那条判据打红。
 *
 *  #587 C项3卡孤行占满行：读数卡网格在 2 列档（≤640）或 4 列档（≥1001）里遇 3 卡（或 5 卡）时，
 *  末行孤儿半宽悬空——末子逢奇即占满整行（`grid-column: 1 / -1`）。形状仍走公共层 `renderKpiGrid`
 *  现成件，本处只补孤行版式，不新造第七种形状。1 列档（≤400）与偶数卡不受影响（同值）。
 *  这一条与窗口条无关，留在本族。 */
export function dietUiCss(): string {
  return '<style>'
    + windowStripCss()
    + '.ilife-block-kpi-card-grid>:last-child:nth-child(odd){grid-column:1/-1}'
    + '</style>';
}

/** 窗口条：`起 → 止` ＋ 计数胶囊；`start === end`（单日）时只出一枚日期块、不出箭头。
 *  形状住 `src/shared/pageStrips.ts`；本件只把本族的类名词汇递给它。 */
export function windowStrip(start: string, end: string, chipText?: string): string {
  return stripWindowStrip(start, end, chipText, WINDOW_VOCAB.diet);
}
