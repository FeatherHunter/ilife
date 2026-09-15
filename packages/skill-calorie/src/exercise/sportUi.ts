/** 运动族「形状化」页内件（唯一产出者）：把原来靠 `·`／`；` 串起来的正文，落成有形状的元素。
 *
 * 负责人口径（2026-09-15 第 4／5 条）与同型先例：`src/weight/weightUi.ts` 那一件——本件是它在
 * **运动族**的等价物，摆位、分工、允许保留的分隔符三处逐条照抄，不另立第二套口径。
 *
 * ── 手机端口径照 HELP 页面（断点 820，四条固定手法）──
 *   ① 触摸目标 ≥44px（`min-height`）＋ `-webkit-tap-highlight-color:transparent` ＋ `touch-action:manipulation`；
 *   ② 横排的一行在窄屏塌成纵列（键值行「标签贴左、值贴右」）；
 *   ③ 窄屏收紧内距；
 *   ④ 字号只取 12／13／15 三档，不新造空档。
 *   **共享区块自带的 640／400 两段不撤**：820 管本件自造的件，640／400 管共享件，两段同向、不打架。
 *   版面根宽高（`.ilife-block-page-shell` 的 `max-width:960px;margin:0 auto;padding:32px 20px 80px`）
 *   与 HELP 的 `.ilife-help-shell` **逐值相同**，本件不重写它。
 *
 * ── 样式与文本的分工（第 5 条）──
 *   **正文里不许再用 `·`／`；` 把好几件事串成一句话**——那种写法是拿符号顶替设计。
 *   凡是原来靠分隔符表达的结构，一律落成本件的形状：
 *     - 「2026-02-27 ~ 2026-09-15 · 共 201 天」→ `windowStrip()`（两枚日期块 ＋ 箭头 ＋ 天数胶囊）；
 *     - 「有数 46 天 · 数列合计 32123 卡」→ `factStrip()`（若干「标签 ＋ 值」，各自成形）；
 *     - 「消耗＝卡；时长＝分钟；距离＝km」→ `capsStrip()`（并列小胶囊）；
 *     - 口径行里「A；B；C」→ 每条一个 `renderCaliberLine`（公共层既有件，本件不重造）。
 *   **允许保留的分隔符**（不是正文串）：日期区间里的 `~`；复制载荷与命令原文（机器面）。
 *   **删符号不等于删事实**——每条事实都要有去处（换形状，不是丢）。
 *
 * ── 显示层取整（本件第 5 个对外名字）──
 *   `fmtNum()` 收口「页上不出现 ≥6 位小数」：库里的 `153.60000000000002`／`21053.499999985`
 *   这类原值一律在**呈现层**收到 1 位小数（整数不带小数点），取数口径一个字不改。
 */

import { escapeHtml } from 'base-paint';

const esc = (s: string): string => escapeHtml(s);

/** 形状词汇的 CSS（冻结 token；不新增 `:root` 变量；间距一律落 4／8 网格）。 */
export function exerciseUiCss(): string {
  return '<style>'
    // ── 窗口条：两枚日期块 ＋ 箭头 ＋ 天数／条数胶囊（原来这三件事挤在页头一行 `·` 串里）──
    + '.sui-window{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 16px}'
    + '.sui-date{font-size:13px;font-weight:600;color:var(--fg);background:var(--card);'
    + 'border:1px solid var(--line);border-radius:8px;padding:4px 8px;font-variant-numeric:tabular-nums}'
    + '.sui-arrow{color:var(--fg3);font-size:13px}'
    + '.sui-days{font-size:12px;font-weight:700;color:var(--blue2);background:var(--soft);'
    + 'border-radius:999px;padding:4px 8px}'
    // ── 键值行：一行若干「标签 ＋ 值」。窄屏塌成一列（标签贴左、值贴右），行行对齐 ──
    + '.sui-facts{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;margin:8px 0 16px}'
    + '.sui-fact{display:inline-flex;align-items:baseline;gap:8px;min-width:0}'
    + '.sui-fact-k{font-size:12px;color:var(--fg3);white-space:nowrap}'
    + '.sui-fact-v{font-size:13px;font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums}'
    // ── 并列小胶囊（单位／筛选这类短词并排；`renderChips` 的件，本类只管行距与折行）──
    + '.sui-caps{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:4px 0 16px}'
    // ── 脚注小字（截断明示、口径旁注）──
    + '.sui-note{font-size:12px;line-height:1.6;color:var(--fg2);margin:8px 0 0}'
    // ── 目标环卡（`sportDocs.ringCard()` 那几个 `ilife-block-ring-*` 类）：此前全仓没有一条规则，
    //    环与它下面那行数字是裸的（#523 补 —— 形状住本件，正文里不写内联样式）。──
    + '.ilife-block-ring-card{display:flex;align-items:center;gap:24px;flex-wrap:wrap;padding:4px 0}'
    + '.ilife-block-ring-wrap{position:relative;width:132px;height:132px;flex:0 0 auto}'
    + '.ilife-block-ring-center{position:absolute;inset:20px;border-radius:50%;background:var(--card);'
    + 'display:flex;flex-direction:column;align-items:center;justify-content:center}'
    + '.ilife-block-ring-pct{font-size:24px;font-weight:700;line-height:1.1;color:var(--fg);'
    + 'font-variant-numeric:tabular-nums}'
    + '.ilife-block-ring-note{font-size:12px;color:var(--fg2);margin-top:2px}'
    + '.ilife-block-ring-side{flex:1 1 240px;min-width:0}'
    + '.ilife-block-ring-side .sui-facts{margin:0 0 12px}'
    // 判决胶囊：色值逐值照抄公共层 `statusBadge` 的 ok／warn（`style.ts:570-578`），不新造色。
    + '.ilife-block-verdict{display:inline-flex;align-items:center;gap:8px;border-radius:999px;'
    + 'padding:4px 16px;font-size:13px;font-weight:600;line-height:1.6;background:var(--soft);color:var(--fg2)}'
    + '.ilife-block-verdict.ok{background:#e6f7ec;color:#1f8c3d}'
    + '.ilife-block-verdict.no{background:#fff5e0;color:#a25b00}'
    // ── 手机端（断点 820 = HELP）：横向塌纵向、内距收紧、触摸目标 ≥44px ──
    + '@media (max-width:820px){'
    + '  .sui-window{gap:8px}'
    + '  .sui-date{padding:8px 12px;min-height:32px;display:inline-flex;align-items:center}'
    + '  .sui-days{padding:4px 12px}'
    // 键值行在窄屏塌成一列：原来几枚横排会折行、断在词中间（与 `.wui-strip-v` 同一处置）。
    + '  .sui-facts{flex-direction:column;align-items:stretch;gap:8px}'
    + '  .sui-fact{justify-content:space-between;gap:12px}'
    + '  .sui-caps{gap:8px}'
    // 环卡在窄屏塌成一列：环在上、数值在下，居中——横排会把环挤到 100px 出头。
    + '  .ilife-block-ring-card{flex-direction:column;align-items:center;gap:16px}'
    + '  .ilife-block-ring-side{flex:1 1 auto;width:100%;text-align:center}'
    + '  .ilife-block-ring-side .sui-facts{flex-direction:row;justify-content:center;gap:8px 16px}'
    + '}'
    // ── 触摸面（HELP 第 ①）：本族的键值行／胶囊是读者在手机上会按住的一块内容 ──
    + '.sui-facts,.sui-caps,.sui-window{-webkit-tap-highlight-color:transparent;touch-action:manipulation}'
    + '</style>';
}

/** 窗口条：`2026-02-27 → 2026-09-15` ＋ 天数（或条数）胶囊。`start === end`（单日窗）只出一枚
 *  日期块、不出箭头——不替读者断言一个不存在的跨度（同 `weightUi.windowStrip()` 的退化分支）。 */
export function windowStrip(start: string, end: string, chipText?: string): string {
  const chip = chipText === undefined || chipText === '' ? '' : '<span class="sui-days">' + esc(chipText) + '</span>';
  if (start === end) {
    return '<div class="sui-window"><span class="sui-date">' + esc(start) + '（单日）</span>' + chip + '</div>';
  }
  return '<div class="sui-window">'
    + '<span class="sui-date">' + esc(start) + '</span>'
    + '<span class="sui-arrow">→</span>'
    + '<span class="sui-date">' + esc(end) + '</span>'
    + chip
    + '</div>';
}

/** 键值行：一组「标签 ＋ 值」。`v` 为空串的那一条整条不出（缺值不留空槽）。 */
export function factStrip(facts: ReadonlyArray<{ k: string; v: string }>): string {
  const body = facts
    .filter((f) => f.v !== '')
    .map((f) => '<span class="sui-fact"><span class="sui-fact-k">' + esc(f.k) + '</span>'
      + '<span class="sui-fact-v">' + esc(f.v) + '</span></span>')
    .join('');
  return body === '' ? '' : '<div class="sui-facts">' + body + '</div>';
}

/** 并列小胶囊行（单位／筛选这类短词）：件走公共层 `renderChips`，本件只给行容器与间距。
 *  传入的是**已产好的** `renderChips` 串——本件不重造徽章形状（公共层是唯一产出者）。 */
export function capsStrip(chipsHtml: string): string {
  return chipsHtml === '' ? '' : '<div class="sui-caps">' + chipsHtml + '</div>';
}

/** 显示层取整（#523）：`153.60000000000002` → `153.6`；`21053.499999999985` → `21053.5`；
 *  整数不带小数点（`2500` 不写 `2500.0`）。`null`／`undefined` → `—`（缺值三态里的「无」）。
 *  **只改显示**：库里的原值与取数口径一个字不动。 */
export function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const k = Math.pow(10, digits);
  const r = Math.round(n * k) / k;
  return Number.isInteger(r) ? String(r) : r.toFixed(digits);
}
