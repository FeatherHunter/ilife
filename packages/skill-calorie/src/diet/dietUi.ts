/** 饮食族页内窗口条（饮食自有件）：标题里的日期区间搬到正文首件成形。
 *
 * 负责人口径「标题不带日期时间，日期时间由顶部控件承载」在饮食族的落点——
 * 此前 9 种页把 `2026-09-09 ~ 2026-09-15` 直接拼进 H1（`rankingDocs`／`reviewDocs`／
 * `todayDocs`／`nutritionPortDocs`），与 `src/shared/docPage.ts` 的 B 线口径
 * （H1＝人话短标题、不带日期）不一致。形状抄体重族 `weightUi.windowStrip()` 的
 * 设计语言（两枚日期块＋箭头＋计数胶囊，单日退化成一枚块），代码归饮食所有、
 * 不跨能力引用别族的内部件。
 *
 * 用法：各页装配把 `dietUiCss()` 放进 parts 第一项，窗口条放在正文首件
 * （导航之前）；`chipText` 装条数／天数（不给即不出胶囊）。
 */
import { escapeHtml } from 'base-paint';

const esc = (s: string): string => escapeHtml(s);

/** 窗口条的形状（冻结 token，不新增变量；窄屏断点 820 与 HELP 同档）。
 *
 *  #587 C项3卡孤行占满行：读数卡网格在 2 列档（≤640）或 4 列档（≥1001）里遇 3 卡（或 5 卡）时，
 *  末行孤儿半宽悬空——末子逢奇即占满整行（`grid-column: 1 / -1`）。形状仍走公共层 `renderKpiGrid`
 *  现成件，本处只补孤行版式，不新造第七种形状。1 列档（≤400）与偶数卡不受影响（同值）。 */
export function dietUiCss(): string {
  return '<style>'
    + '.dui-window{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 0 10px}'
    + '.dui-date{font-size:13px;font-weight:600;color:var(--fg);background:var(--card);border:1px solid var(--line);'
    + 'border-radius:10px;padding:3px 9px;font-variant-numeric:tabular-nums}'
    + '.dui-arrow{color:var(--fg3);font-size:13px}'
    + '.dui-chip{font-size:12px;font-weight:700;color:var(--blue2);background:var(--soft);border-radius:999px;padding:3px 10px}'
    + '.ilife-block-kpi-card-grid>:last-child:nth-child(odd){grid-column:1/-1}'
    + '@media (max-width:820px){.dui-window{gap:6px}'
    + '.dui-date{padding:6px 10px;min-height:32px;display:inline-flex;align-items:center}}'
    + '</style>';
}

/** 窗口条：`起 → 止` ＋ 计数胶囊；`start === end`（单日）时只出一枚日期块、不出箭头。 */
export function windowStrip(start: string, end: string, chipText?: string): string {
  const chip = chipText === undefined || chipText === '' ? '' : '<span class="dui-chip">' + esc(chipText) + '</span>';
  if (start === end) {
    return '<div class="dui-window"><span class="dui-date">' + esc(start) + '（单日）</span>' + chip + '</div>';
  }
  return '<div class="dui-window">'
    + '<span class="dui-date">' + esc(start) + '</span>'
    + '<span class="dui-arrow">→</span>'
    + '<span class="dui-date">' + esc(end) + '</span>'
    + chip
    + '</div>';
}
