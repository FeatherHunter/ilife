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
import { renderChips } from 'base-paint/blocks';

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
    // ── 并列字段清单的行题（「本次写入的字段」这一行；字段名本身走 `renderChips` 的胶囊件）──
    + '.sui-fields-k{font-size:12px;color:var(--fg3);margin:12px 0 4px}'
    // ── 字段清单容器（`sportUi.fieldGrid()` 的两个形状；字段名本身走公共层 `renderChips`）──
    //    枚数多：等宽网格——**列数按 16 这个常见枚数定 8／4**，正好铺满 8×2（桌面）与 4×4（手机）
    //    行，行末不留孤格（#543 视觉复评 P1-A 第 5 条、页 01 手机第 4 条）。
    + '.sui-fieldgrid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin:4px 0 16px}'
    + '.sui-fieldgrid .ilife-block-chip{display:flex;align-items:center;justify-content:center;'
    + 'min-height:32px;padding-inline:6px;text-align:center}'
    //    枚数少（≤4，改单条／改三字段那类）：行内胶囊——1 枚落进 8 列网格会在右边留一大片空。
    + '.sui-caps .ilife-block-chip{min-height:32px;display:inline-flex;align-items:center}'
    // ── 页级覆盖（#543 视觉复评 P2-G／P2-I）：变更行的 `label{flex:1}` 把取值挤到卡片右缘（实测
    //    01／09／11 三页桌面档各留 790–880px 空档，两处右轴还差 32px）。改成**定宽键列**（128px）：
    //    取值紧跟在键后、三页取值起点落在同一条竖轴，行分隔线仍铺满卡片；字号从 14px 收回 13px 档
    //    （本页少一档字号）。只在本页样式段加规则，不碰共享层源码。──
    + '.ilife-page .ilife-block-change-row{font-size:13px}'
    + '.ilife-page .ilife-block-change-row-label{flex:0 0 128px}'
    // ── 页级覆盖（#543 视觉复评 P0-1 ＋ 表头字号）：共享块的表卡是「上限 680 ＋ 居中」，上方卡片是
    //    960 整列 ⇒ 表正文比卡正文内缩 126px（实测 x373 vs x247），一页两条对齐轴。本族页把表卡
    //    拉回内容轴、表头从 11.5px 抬到 12px 下限；只在本页样式段加规则，不碰共享层源码。──
    + '.ilife-page .ilife-block-data-table{max-width:none;margin-inline:0}'
    + '.ilife-page .ilife-block-data-table th{font-size:12px}'
    // ── 页级覆盖（视觉复评 r2 的 P0-A／P0-B）：页内导航的锚点是真 `<a href>`（可点）⇒ 抬到 44px
    //    触摸面；窄屏表格回退标签原来 11.5px，抬到 12px 下限。──
    + '.ilife-page .ilife-block-toc a{min-height:44px;display:inline-flex;align-items:center;padding-inline:14px}'
    // ── 页级覆盖（#523 返修 R3 硬伤②）：分布条的类名轨是公共层给的 `minmax(0,6em)` ＋ `nowrap` ＋
    //    `text-overflow:ellipsis`——类名超过 6em 的（「跪姿健腹轮前推」「对握式器械推胸」「把手式蝴蝶机飞鸟」）
    //    在**三档宽度下都被悄悄截断**（headless 实测 `clientWidth=78 / scrollWidth=104`，390／768／1440 同值，
    //    属信息丢失不是排版偏好）。本族页把类名轨放到容得下全称的宽度并**允许换行**：轨仍是定宽，
    //    八根条的起点继续对齐；超长类名折行，一个字不丢。窄屏（820）再塌成两段式（见下）。
    //    只在本页样式段加规则，不碰公共层源码——共享层那条 `6em` 是跨件改动，转公共层票（见证据件遗留节）。──
    + '.ilife-page .ilife-block-dist-row{grid-template-columns:minmax(0,9.5em) minmax(0,1fr) auto}'
    + '.ilife-page .ilife-block-dist-row-name{overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:anywhere}'
    // ── 页级覆盖（#543 视觉复评 P1-D／P1-F／页 11 手机第 1 条），都在窄屏 640 档：
    //    ① 读数卡组：基础段那条 `repeat(2,minmax(0,1fr))` 让第三张卡孤在半行（2＋1）；
    //       改回基础栅格的 `auto-fit`，一张卡时铺满、两张时并排，不留孤格；
    //    ② 页内导航：5 枚锚点各 82px ＋ 间距会折成 4＋1（`数据来源` 孤一行）；
    //       收紧内距与间距，5 枚并回一行（高度仍是 44px 触摸面，不缩目标）；
    //    ③ 字段网格塌成 4 列（16 枚＝4×4，无孤格）。──
    + '@media (max-width:640px){'
    + '.ilife-page .ilife-block-data-table td::before{font-size:12px}'
    + '.ilife-page .ilife-block-kpi-card-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}'
    + '.ilife-page .ilife-block-toc{gap:6px}'
    + '.ilife-page .ilife-block-toc a{padding-inline:6px}'
    + '.sui-fieldgrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}'
    + '}'
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
    // 分布条塌成两段式（#523 返修 R3）：类名独占第一行（可换行、不截断），第二行「条 ＋ 数值」。
    + '  .ilife-page .ilife-block-dist-row{grid-template-columns:minmax(0,1fr) auto;gap:4px 8px}'
    + '  .ilife-page .ilife-block-dist-row-name{grid-column:1 / -1;grid-row:1}'
    + '  .ilife-page .ilife-block-dist-row-bar{grid-column:1;grid-row:2}'
    + '  .ilife-page .ilife-block-dist-row-val{grid-column:2;grid-row:2}'
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

/** 字段清单容器（#543 视觉复评 P1-A 第 5 条／页 09 第 4 条）：**枚数决定形状**——
 *  ≥5 枚走等宽网格（16 枚正好 8×2／4×4 铺满，行末不留孤格，也不是自由折行的参差行末）；
 *  ≤4 枚走行内胶囊（1 枚落进 8 列网格会在右边空掉七格，看着像漏渲染）。
 *  两分支都**含 `ilife-block-chip`**：形状换了，事实与形状件一个字不丢。 */
export function fieldGrid(chipsHtml: string, count: number): string {
  if (chipsHtml === '') return '';
  return count > 4 ? '<div class="sui-fieldgrid">' + chipsHtml + '</div>'
    : '<div class="sui-caps">' + chipsHtml + '</div>';
}

/** 整块「写入字段」（行题 ＋ 容器）：条数由行题自陈，**不再另立一张 KPI 卡**
 *  （原先「写入字段 16 项」卡与这块行题说的是同一件事，还让窄屏读数卡组落成 2＋1 的孤格）。
 *  传入的是**已换算好的中文标签**——域标签表的口径住 `receipt.ts`，本件只管形状。 */
export function fieldsBlock(labels: readonly string[]): string {
  if (labels.length === 0) return '';
  const chips = renderChips({ items: labels.map((text) => ({ text })) });
  return '<p class="sui-fields-k">写入字段（共 ' + labels.length + ' 项）</p>' + fieldGrid(chips, labels.length);
}

/** 明细表要不要出的形状决定（#543 视觉复评 P1-B）：**删类两条记录起才出**——一条记录时上面的
 *  快照已按字段并集列全（`SNAPSHOT_COLS` ⊇ 明细列），再摆一张同内容的表＝同一张记录两块各说一遍，
 *  手机档还白占 180–200px；批量／复制类照旧；零行时两张卡都不出。 */
export function detailTableWanted(op: string, n: number, isBatch: boolean, isCopy: boolean): boolean {
  if (n === 0) return false;
  return op === 'delete' ? n >= 2 : (isBatch || isCopy);
}

/** 回执副标题收成**一句结论**（#543 视觉复评 P1-A 第 2 条）：写命令摘要里第一个顶层 `：`
 *  之后那截是**这一条记录的值**（`慢跑 320 卡，30 分钟（2026-09-12）`／`新增 2 条`／
 *  `复制 1，跳过 5`），页下方的计数卡与明细卡逐条说过了。括号里的 `：` 是后果说明
 *  （`（软删除：行保留，……）`），**不切**——那句是读者最需要留住的。 */
export function shapedConclusion(s: string): string {
  const colon = s.indexOf('：');
  if (colon === -1) return s;
  const paren = s.indexOf('（');
  if (paren !== -1 && colon > paren) return s;
  return s.slice(0, colon);
}

/** 行文整形（回执副标题／单源措辞的显示层）：`·`／`；`／`;`／`、` 一律改行文逗号 `，`，
 *  **连它两侧的空白一起收**——`卡 · 30 分钟` 原文两侧有空格，只换符号会印成 `卡 ， 30 分钟`。
 *  `，` 不在探针并列集里（probe.mjs:39），事实一字不少，只换连接符；信封与库值不动。 */
export function inlineShaped(s: string): string {
  return s.replace(/\s*[·；;、]\s*/g, '，');
}

/** 回执来源名（显示层）：库表名 `exercise_log` 改读者看得懂的「运动记录」；
 *  机器值仍在复制日志来源段里（`copyLog` 原样透传，不动）。空来源回空串（键值行整条不出）。 */
export function receiptSource(source: string): string {
  const s = source.trim();
  if (s === '') return '';
  return s.includes('exercise_log') ? '运动记录' : s;
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
