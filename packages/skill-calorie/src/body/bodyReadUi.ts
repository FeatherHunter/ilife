/** 身体读侧族「形状化」页内件（唯一产出者）：把原来靠 `·`／`；` 串起来的正文，落成有形状的元素。
 *
 * 同型先例两件，本件是它们在**身体读侧族**的等价物，分工与边界逐条照抄、不另立第二套口径：
 * `src/exercise/sportUi.ts`（运动族，#523）与 `src/weight/weightUi.ts`（体重族，#504）。
 * 归属律：只属身体读侧四页（看体脂／看体脂趋势／看围度／看围度趋势）的页内形状住这里；
 * 跨域形状一律用公共层出口（`renderFactStrip`／`renderConclusionBar`／`renderDataTable`…），本件不自造。
 *
 * ── 手机端口径照 HELP 页面（断点 820／640，只用仓内既有值，不新造断点）──
 *   ① 触摸目标 ≥44px（`min-height`／键值行内距）＋ `-webkit-tap-highlight-color:transparent`；
 *   ② 窄屏把长表收束（横滑容器 ＋ 一行提示），不把列名逐行印 N 遍；
 *   ③ 字号下限 12px（正文类小字一档不落）；
 *   ④ 间距走 4／8 倍数。
 *   共享配方（`assembleDocPage({ pageUi: true })`）自带的 820／640 两段不撤：它管共享件，本件管本族件。
 *
 * ── 本件落的两件形状（第 5 条：拿符号顶替并列＝债）──
 *   `windowBar()`    「窗口：全部历史」——**一页只说一次**的窗口条（改前读数卡明细／表题／图题各说一遍）；
 *   `bodyReadUiCss()` 窗口条的样式 ＋ 两条页面级覆盖：读数卡值槽放大到 24px（值／正文 ≥1.6×）、
 *                     窄屏把记录表收成小表（共享配方默认的「一格两行」会把同一批列名逐行重复印）。
 *
 * ── 允许保留的符号（不是正文串）──
 *   复制载荷与命令原文（机器面）；`renderCaliberLine` 的 `｜`（它是**版式分隔**，落盘后文本里不留该字符）。
 */

import { escapeHtml } from 'base-paint';
import { renderDataTable } from 'base-paint/blocks';
import { MEASUREMENT_FIELDS, MEASUREMENT_ZH } from '../fetch/body.js';

const esc = (s: string): string => escapeHtml(s);

/** 页内形状的 CSS。只吃既有 token（`--fg`／`--fg3`／`--card`／`--line`／`--soft`），不新增 `:root` 变量。 */
export function bodyReadUiCss(): string {
  return '<style>'
    // ── 窗口条：一页一处说窗口。文本必须是**单个文本节点**（`窗口：全部历史`），
    //    #362 判据逐字认这一句；拆成两个 span 会被可见文本读成「窗口： 全部历史」而失配。──
    + '.bru-window{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:2px 0 14px}'
    + '.bru-window-v{font-size:13px;font-weight:700;color:var(--fg);background:var(--card);'
    + 'border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-variant-numeric:tabular-nums}'
    + '.bru-window-c{font-size:12px;font-weight:700;color:var(--fg2);background:var(--soft);'
    + 'border-radius:999px;padding:4px 10px;font-variant-numeric:tabular-nums}'
    // ── 读数卡：值槽与正文的比例（共享层 22px／正文 15px ＝ 1.47×，不足 1.6×）──
    + '.ilife-page-ui .ilife-block-kpi-card-value{font-size:24px}'
    // ── 窄屏横滚提示（只在窄屏出；宽屏那行表本来就放得下）──
    + '.bru-hint{display:none;font-size:12px;color:var(--fg3);margin:4px 0 0}'
    // ── 手机端（820＝HELP 的触摸档）──
    + '@media (max-width:820px){'
    + '  .bru-window-v{padding:6px 12px;min-height:32px;display:inline-flex;align-items:center}'
    + '  .bru-window-c{padding:6px 10px;min-height:32px;display:inline-flex;align-items:center}'
    + '}'
    // ── 窄屏（640）：记录表收成小表 ＋ 出横滚提示 ──
    //   共享配方在 640 档把每个数据格摊成「列名 ＋ 值」两行；本族记录表列短（日期／体脂率／来源／备注），
    //   4 列摊开会让 7 行记录变成 28 行标签。这里把列名收回表头一行，超宽时由容器横滑。
    //   选择器与共享规则同形（含 `:has(td[data-label])`）并多一层父类，确保在同层规则里胜过它。
    + '@media (max-width:640px){'
    + '  .ilife-page-ui .bru-table .ilife-block-data-table:has(td[data-label]) .ilife-block-data-table-table{display:table}'
    + '  .ilife-page-ui .bru-table .ilife-block-data-table:has(td[data-label]) tbody{display:table-row-group}'
    + '  .ilife-page-ui .bru-table .ilife-block-data-table:has(td[data-label]) thead{display:table-header-group}'
    + '  .ilife-page-ui .bru-table .ilife-block-data-table:has(td[data-label]) tr{display:table-row;padding:0}'
    + '  .ilife-page-ui .bru-table .ilife-block-data-table:has(td[data-label]) td,'
    + '  .ilife-page-ui .bru-table .ilife-block-data-table:has(td[data-label]) th{display:table-cell;'
    + 'width:auto;padding:6px 8px;font-size:12px;white-space:nowrap}'
    + '  .ilife-page-ui .bru-table .ilife-block-data-table td[data-label]::before{display:none;content:none}'
    + '  .bru-table{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}'
    + '  .bru-hint{display:block}'
    + '}'
    + '.bru-window{-webkit-tap-highlight-color:transparent}'
    + '</style>';
}

/** 窗口条：**一页只说一次**窗口（`窗口：全部历史`／`窗口：近 90 天`／`窗口：A → B`）。
 *  文本走单个文本节点——拆成标签＋值两个元素会被可见文本读出空格，`#362` 的窗口判据当场失配。
 *  `chipText`＝窗口内的条数（这一页的第二处、也是最后一处 `共 N 条` 读数：另一处在记录表题里）。 */
export function windowBar(windowText: string, chipText?: string): string {
  const chip = chipText === undefined || chipText === ''
    ? '' : '<span class="bru-window-c">' + esc(chipText) + '</span>';
  return '<div class="bru-window"><span class="bru-window-v">窗口：' + esc(windowText) + '</span>' + chip + '</div>';
}

/** 窄屏横滚提示：只在 640 档出（`.bru-hint` 的宽屏态是 `display:none`）。 */
export function scrollHint(text: string): string {
  return '<p class="bru-hint">' + esc(text) + '</p>';
}

/** 记录清单：体脂四列小表（日期／体脂／来源／备注）＋窄屏收束 ＋ 横滚提示 ＋ 页内锚点。
 *  表题由调用方给（`#362` 判据按表题里的「共 N 条」「窗口内另有 M 条」认读数）。 */
export function recordsSection(
  rows: readonly Readonly<Record<string, unknown>>[],
  caption: string,
  emptyText: string,
): string {
  const table = renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'pct', label: '体脂', align: 'right' },
      { key: 'source', label: '来源' },
      { key: 'note', label: '备注' },
    ],
    rows,
    caption,
    emptyText,
  });
  return '<section id="records"><div class="bru-table">' + table + '</div>'
    + scrollHint('表格较宽时，可以在表里左右滑。') + '</section>';
}

/** 皮褶 7 点小表（部位／毫米两列）：**日期只出现在表题一处、单位只出现在表头一处**。
 *  （改前 3 列，7 行各印一遍同一天，单位还印在表题里，两边各说一遍。）
 *  `#362` 判据按「皮褶 7 点原始值」认这张表（7 行逐点成行、缺槽位 `—`），表题措辞可调、这七个字不动。 */
export function caliperSection(date: string, sites: readonly { readonly label: string; readonly mm: number | null }[]): string {
  const table = renderDataTable({
    columns: [
      { key: 'site', label: '部位' },
      { key: 'mm', label: '皮褶（毫米）', align: 'right' },
    ],
    rows: sites.map((s) => ({ site: s.label, mm: s.mm === null ? '—' : s.mm })),
    caption: '皮褶 7 点原始值（' + date + '）',
    emptyText: '该记录无皮褶 7 点数据',
  });
  return '<section id="calipers"><div class="bru-table">' + table + '</div></section>';
}

/** 围度页页内样式：宽屏见表、窄屏（≤640）见卡（老 `body_measurements_view.html:128-151` 同口径）。
 *  `#361` 判据按 `.msr-card` 的 DOM 结构认窄屏卡，结构不动；本件只补字号下限（`.msr-note` 11→12px）。 */
export function measureUiCss(): string {
  return '<style>'
    + '.msr-cards{display:none}'
    + '.msr-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:10px}'
    + '.msr-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}'
    + '.msr-date{font-size:14px;font-weight:700}'
    + '.msr-note{font-size:12px;color:var(--fg3);max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.msr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}'
    + '.msr-item{display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:6px 8px;background:var(--soft);border-radius:8px}'
    + '.msr-k{color:var(--fg3)}'
    + '.msr-v{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}'
    + '.msr-empty{color:var(--fg3);font-size:12px;padding:4px 0}'
    + '@media (max-width:640px){.msr-table{display:none}.msr-cards{display:block}}'
    + '</style>';
}

/** 围度全量 13 项：宽表 ＋ 窄屏卡（同一份 `items`，同行同序）。
 *  卡片只列已填项（老 `:393-395` 的 `filter(c => r[c] != null)`）；可见「—」只落在宽表缺值格（裁定 2 表体）。 */
export function measureFullTable(
  items: readonly Record<string, unknown>[],
  caption: string,
  emptyText: string,
): string {
  const numOrDash = (x: unknown): number | string => (typeof x === 'number' ? x : '—');
  const strOrEmpty = (x: unknown): string => (typeof x === 'string' ? x : '');
  const table = renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      ...MEASUREMENT_FIELDS.map((f) => ({ key: f, label: MEASUREMENT_ZH[f] ?? f, align: 'right' as const })),
      { key: 'note', label: '备注' },
    ],
    rows: items.map((r) => {
      const row: Record<string, unknown> = { date: strOrEmpty(r['date']), note: strOrEmpty(r['note']) };
      for (const f of MEASUREMENT_FIELDS) row[f] = numOrDash(r[f]);
      return row;
    }),
    caption,
    emptyText,
  });
  const cards = items.map((r) => {
    const date = typeof r['date'] === 'string' ? (r['date'] as string) : '';
    const note = typeof r['note'] === 'string' ? (r['note'] as string) : '';
    const cells = MEASUREMENT_FIELDS
      .filter((f) => typeof r[f] === 'number')
      .map((f) => '<div class="msr-item"><span class="msr-k">'
        + escapeHtml(MEASUREMENT_ZH[f] ?? f) + '</span><span class="msr-v">'
        + escapeHtml(String(r[f])) + 'cm</span></div>')
      .join('');
    return '<div class="msr-card"><div class="msr-head"><span class="msr-date">'
      + escapeHtml(date) + '</span>'
      + (note === '' ? '' : '<span class="msr-note">' + escapeHtml(note) + '</span>')
      + '</div><div class="msr-grid">'
      + (cells === '' ? '<div class="msr-empty">未填围度</div>' : cells)
      + '</div></div>';
  }).join('');
  return '<div class="msr-table">' + table + '</div><div class="msr-cards">' + cards + '</div>';
}
