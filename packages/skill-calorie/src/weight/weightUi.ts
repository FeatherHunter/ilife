/** 体重族「形状化」页内件（唯一产出者）：把原来靠 `·`／`；` 串起来的正文，落成有形状的元素。
 *
 * 负责人口径（2026-09-15 第 2／5 条）与同型先例：`src/render/reviewDocsCss.ts` 件头（运动域复盘页）。
 * 本件是那套做法在**体重族**的等价物——两族共用同一套口径，样式各住各的件。
 *
 * ── 手机端口径照 HELP 页面（断点 820，四条固定手法）──
 *   ① 触摸目标 ≥44px、`-webkit-tap-highlight-color:transparent`、`touch-action:manipulation`；
 *   ② 按钮行自约束宽度并居中（`.hm-actions{max-width:520px;margin:0 auto}`，防被容器拉成半屏宽）；
 *   ③ 横向一行在窄屏塌成纵向一列；
 *   ④ 窄屏收紧内距。
 *   共享区块自带的 **640** 段不撤：820 管本件自造的件，640 管共享件，两段同向、不打架。
 *
 * ── 样式与文本的分工（第 5 条）──
 *   **正文里不许再用 `·`／`；` 把好几件事串成一句话**——那种写法是拿符号顶替设计。
 *   凡是原来靠分隔符表达的结构，一律落成本件的形状：
 *     - 「2026-09-01 ~ 2026-09-07 · 共 7 条」→ `windowStrip()`（两枚日期块 ＋ 箭头 ＋ 条数胶囊）；
 *     - 「趋势上升 · 平均每天约 +10 克」→ `factStrip()`（两枚「标签 ＋ 值」，各自成形）；
 *     - 「首 70.1 → 末 70.4 kg」→ `pairStrip()`（两端值 ＋ 箭头，中缝写字）；
 *     - 「目标 68 kg · 截止 2026-12-31 · 目标线超出刻度」→ `factStrip()` ＋ `note()` 脚注；
 *     - 结论句里的 `；` 串 → 只留**一句话判语**（其余事实本就住在卡片里），必要时挂 `chip()`；
 *     - 提示块里「前提一；前提二；前提三」→ `bulletList()` 逐条成行。
 *   **允许保留的分隔符**（不是正文串）：日期区间里的 `~`；页脚口径行的 `｜`（`renderCaliberLine` 全仓同形）；
 *   复制载荷与命令原文（机器面）。**删符号不等于删事实**——每条事实都要有去处（换形状，不是丢）。
 *
 * 用法：`weightUiCss()` 返回 `<style>` 串，**由各族的整页装配把它放进 parts 的第一项**
 * （与 `reviewDocs.ts` 的 `reviewViewCss()` 同款；`assembleDocPage` 没有页内 CSS 入口）。
 * 本件只产**结构**：正文里不写内联样式，形状全在这里。
 *
 * ── #505 三处补丁（形态不变，只加落点）──
 *   ① `factStrip(facts, vertical, gap, asNote)` 的后两个位：`gap` 给「卡片的 `detail` 槽」用——那一槽里
 *      本件没有兄弟件可借距，原来会与值槽贴死（桌面 1200 实测贴字）；`asNote` 给「标签 ＋ 一句说明」那种
 *      用法（值退成脚注口气的字）。两者都是**整块**的落点，不是内联样式；
 *   ② 判语块的胶囊行（`.wui-verdict-row`）在 820 段塌成一栏：原来几枚胶囊横排会折行断在词中间；
 *   ③ `.wui-window-block`：窗口条与方向胶囊合成的一件（体重盘正文首件，窄屏照 ③ 塌一列）。
 */

import { escapeHtml } from 'base-paint';

const esc = (s: string): string => escapeHtml(s);

/** 形状词汇的 CSS（冻结 token；不新增 `:root` 变量）。 */
export function weightUiCss(): string {
  return '<style>'
    // ── 事实条：一行若干「标签 ＋ 值」，窄屏塌成一列 ──
    + '.wui-strip{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:baseline;margin:2px 0 10px}'
    + '.wui-strip-v{flex-direction:column;align-items:stretch;gap:8px}'
    // 空槽（`margin-top:16px`）：**卡片的 `detail` 槽**里本件没有兄弟件可借距（KPI 值槽之下直接是本条）。
    // 桌面一行若干枚，间距由 `.wui-strip` 的 `gap` 给；窄屏塌成纵列时由 `.wui-strip-v` 接管。
    + '.wui-strip-gap{margin-top:16px}'
    // 纵列里的一组「标签 ＋ 值」：标签在左、值贴右，行行对齐（窄屏的事实一栏读法）。
    + '.wui-strip-v .wui-fact{width:100%;justify-content:space-between;gap:12px}'
    // 「标签 ＋ **说明句**」那一型（`factStrip(facts, false, true, true)`）：值不是量值而是一句脚注口气的
    // 说明（「目标线超出刻度，图上没画」），整块退一档（同 `.wui-note` 的字号／行高／色），不跟量值抢眼。
    + '.wui-strip-note .wui-fact{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}'
    + '.wui-strip-note .wui-fact-k{font-size:12px;color:var(--fg2);font-weight:400;white-space:normal}'
    + '.wui-strip-note .wui-fact-v{font-size:12px;font-weight:400;color:var(--fg2);line-height:1.6}'
    + '.wui-fact{display:inline-flex;align-items:baseline;gap:6px;min-width:0}'
    + '.wui-fact-k{font-size:12px;color:var(--fg3);white-space:nowrap}'
    + '.wui-fact-v{font-size:13px;font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums}'
    // ── 窗口条：日期块 → 日期块 ＋ 天数胶囊（原来串在一行字里） ──
    + '.wui-window{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 0 10px}'
    // 窗口条 ＋ 方向胶囊合成的一件（体重盘正文首件，原来这两条挤在页头副标题那句 `·` 串里）。
    + '.wui-window-block{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 16px}'
    + '.wui-window-block .wui-window{margin:0}'
    + '.wui-date{font-size:13px;font-weight:600;color:var(--fg);background:var(--card);border:1px solid var(--line);'
    + 'border-radius:10px;padding:3px 9px;font-variant-numeric:tabular-nums}'
    + '.wui-arrow{color:var(--fg3);font-size:13px}'
    + '.wui-days{font-size:12px;font-weight:700;color:var(--blue2);background:var(--soft);border-radius:999px;padding:3px 10px}'
    // ── 两端值对比（首末日、两期、目标与实际）──
    // 留一点点上边距（#504）：本件常跟在 `.wui-note` 后面，而本页没有 `*{margin:0}` 复位 ⇒
    // 若写成 `margin:0`，会把上一条的 `margin:2px 0 0` 折成 0px（相邻外边距折叠，实测贴字）。
    + '.wui-pair{display:inline-flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:2px 0 0}'
    + '.wui-pair-v{font-size:15px;font-weight:700;color:var(--fg);font-variant-numeric:tabular-nums}'
    + '.wui-pair-mid{font-size:12px;color:var(--fg3)}'
    // ── 状态／方向胶囊（四色取冻结 token；不用裸颜色词） ──
    + '.wui-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;'
    + 'border-radius:999px;padding:3px 10px;background:var(--soft);color:var(--blue2)}'
    + '.wui-chip-ok{background:#e7f8ee;color:#1a7a3a}'
    + '.wui-chip-warn{background:#fff4e5;color:#a05a00}'
    + '.wui-chip-danger{background:#ffeceb;color:#c0392b}'
    + '.wui-chip-plain{background:var(--line);color:var(--fg2)}'
    // ── 脚注小字（口径说明、图例说明）──
    + '.wui-note{font-size:12px;line-height:1.6;color:var(--fg2);margin:2px 0 0}'
    // ── 逐条列表（替掉「前提一；前提二」那类分号串）──
    // 不留上边距（#504）：逐条列表紧跟页顶提示块出，那一块自带 `margin:16px 0`，再叠一条上边距就把
    // 「同类的一条说明」拆成两段。其余外边距交给 UA 缺省（本页没有 `*{margin:0}` 复位，见 blocks.ts:1370）。
    + '.wui-bullets{padding-left:18px}'
    // 「提示块 ＋ 它那几条逐条说明」读成一组（#504 两族都用这个搭法）：紧贴上一块时只留 8px，
    // 与「下一块」之间的 16px 拉开层次。`~` 只吃提示块的下一块，不牵动别处间距。
    + '.ilife-block-feedback-block + .wui-bullets{margin:8px 0 6px}'
    + '.wui-bullets li{font-size:12.5px;line-height:1.65;color:var(--fg2);margin:2px 0}'
    // ── 判语块（结论块正文：一句话 ＋ 可选胶囊），视觉上比正文重一档 ──
    + '.wui-verdict{font-size:15px;line-height:1.6;font-weight:600;color:var(--fg);margin:0}'
    + '.wui-verdict-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}'
    // ── 手机端（断点 820 = HELP）：横向塌纵向、内距收紧、触摸目标 ≥44px ──
    + '@media (max-width:820px){'
    + '  .wui-strip{gap:6px 14px}'
    + '  .wui-strip-v{gap:8px}'
    + '  .wui-window{gap:6px}'
    + '  .wui-fact-v{font-size:13px}'
    + '  .wui-date{padding:6px 10px;min-height:32px;display:inline-flex;align-items:center}'
    + '  .wui-days{padding:5px 10px}'
    + '  .wui-verdict{font-size:14.5px}'
    // 判语块的胶囊行在窄屏塌成一栏「标签 ＋ 值」：原来几枚胶囊横排会折行、断在词中间。
    + '  .wui-verdict-row{flex-direction:column;align-items:stretch;gap:6px}'
    + '}'
    // ── 触摸面（HELP 第 ①）──
    // 本族的提示块／结论块是**读者在手机上会按住的一块内容**（选中文本、点开复制区）：补上
    // `-webkit-tap-highlight-color:transparent`（点按不高亮一层系统灰）与 `touch-action:manipulation`
    // （去掉双击缩放那 300ms 迟滞）。共享层的 `.ilife-block-feedback-block` 与
    // `.ilife-block-disclosure`（`<details>/<summary>`）**一行不碰**，只在本族页内给这两块补这两条。
    + '.ilife-block-feedback-block,.wui-verdict,.wui-note{'
    + '-webkit-tap-highlight-color:transparent;touch-action:manipulation}'
    + '</style>';
}

/** 窗口条：`2026-09-01 → 2026-09-07` ＋ 天数（或条数）胶囊。 */
export function windowStrip(start: string, end: string, chipText?: string): string {
  return '<div class="wui-window">'
    + '<span class="wui-date">' + esc(start) + '</span>'
    + '<span class="wui-arrow">→</span>'
    + '<span class="wui-date">' + esc(end) + '</span>'
    + (chipText === undefined || chipText === '' ? '' : '<span class="wui-days">' + esc(chipText) + '</span>')
    + '</div>';
}

/** 事实条：一组「标签 ＋ 值」。`vertical`＝整块恒纵列；`gap`＝整块与上一件之间空一行
 *  （KPI 卡的 `detail` 槽里本件没有兄弟件可借距，故那一槽要打开它）；`asNote`＝值退成脚注口气的字，
 *  「标签 ＋ 一句说明」那种用法走它（数字量值不用）。三个位都是**落点**，形状不变。 */
export function factStrip(
  facts: ReadonlyArray<{ k: string; v: string }>, vertical = false, gap = false, asNote = false,
): string {
  const body = facts
    .filter((f) => f.v !== '')
    .map((f) => '<span class="wui-fact"><span class="wui-fact-k">' + esc(f.k) + '</span>'
      + '<span class="wui-fact-v">' + esc(f.v) + '</span></span>')
    .join('');
  if (body === '') return '';
  return '<div class="wui-strip' + (vertical ? ' wui-strip-v' : '') + (gap ? ' wui-strip-gap' : '')
    + (asNote ? ' wui-strip-note' : '') + '">' + body + '</div>';
}

/** 两端值对比：`首 70.1 kg → 末 70.4 kg` 那类，中缝写一句关系词（缺省不写）。 */
export function pairStrip(left: string, right: string, mid = '→'): string {
  return '<span class="wui-pair"><span class="wui-pair-v">' + esc(left) + '</span>'
    + '<span class="wui-pair-mid">' + esc(mid) + '</span>'
    + '<span class="wui-pair-v">' + esc(right) + '</span></span>';
}

/** 「一枚标签 ＋ 一对两端值」的正式形状（#502 报缺：原来各页是用 `factStrip` ＋ `pairStrip` 现拼，
 *  拼法散在各处）。用在「首末日」「前后两期」「目标与实际」这类**成对**的量上；`mid` 缺省 `→`。 */
export function pairFact(label: string, left: string, right: string, mid = '→'): string {
  return '<div class="wui-strip"><span class="wui-fact">'
    + '<span class="wui-fact-k">' + esc(label) + '</span>' + pairStrip(left, right, mid)
    + '</span></div>';
}

/** 状态／方向胶囊。tone：ok／warn／danger／plain（缺省蓝）。 */
export function chip(text: string, tone: 'ok' | 'warn' | 'danger' | 'plain' | '' = ''): string {
  const cls = tone === '' ? '' : ' wui-chip-' + tone;
  return '<span class="wui-chip' + cls + '">' + esc(text) + '</span>';
}

/** 脚注小字（口径／图例说明）。 */
export function note(text: string): string {
  return '<p class="wui-note">' + esc(text) + '</p>';
}

/** 逐条列表：替掉「前提一；前提二；前提三」那类分号串。 */
export function bulletList(items: readonly string[]): string {
  const li = items.filter((s) => s !== '').map((s) => '<li>' + esc(s) + '</li>').join('');
  return li === '' ? '' : '<ul class="wui-bullets">' + li + '</ul>';
}

/** 判语块：一句话判语 ＋ 可选胶囊行（结论块的形状版）。 */
export function verdict(sentence: string, chips: readonly string[] = []): string {
  return '<p class="wui-verdict">' + esc(sentence) + '</p>'
    + (chips.length === 0 ? '' : '<div class="wui-verdict-row">' + chips.join('') + '</div>');
}
