/** #526 · 身材照片**读侧族**的页内形状件（唯一产出者）：把原来靠 `·`／`；`／`／`／`、` 串起来的正文，
 *  落成有形状的元素。负责人口径（2026-09-15 第 2／5 条）与同型先例：`src/weight/weightUi.ts`、
 *  `src/exercise/sportUi.ts`——三族共用同一套口径，样式各住各的件。
 *
 * ── 为什么有这一件（第 5 条，逐字）──
 *  「当一个内容需要通过 `；` 和 `·` 分割时代表需要进行 UI 上的设计，该问题是用这些符号简化了 UI 展示的设计」。
 *  读侧四页（看身材照／查身材照两态／对比两张照片）改前节点级命中 59 处：图注 `日期 · 标签 · 相对时间`
 *  三件事串一行、`← 上一张 #16 · 下一张 #23 →` 两个动作串一行、KPI 明细 `8 张找不到文件 · 10 张太大未显示`
 *  两件事串一行、缺失清单 `#16 · 文件名 · 徽标` 三件事串一行。本件给它们各自的形状：
 *    - 并列小标签（编号／标签／相对时间／筛选／窗口）→ **`renderChips` 徽章列**（公共层件，本件只给容器）；
 *    - 「名字 ＋ 值」这类事实（原图大小／文件／备注名）→ `factRows()` 键值行；
 *    - 用户自己用斜杠连写的备注 → `noteSegments()` 分段（**同一件事换形状，不改一个字的用户数据**）；
 *    - 间隔天数 ＋ 两张日期 → `intervalStrip()`（大数字 ＋ 两枚日期块）。
 *  一条也不许再退回符号串：判据是 `scripts/audit-separators.mjs` 的**节点级命中共零**。
 *
 * ── 手机端口径照 HELP 页（断点 820，四条固定手法）──
 *   ① 触摸目标 ≥44px、`-webkit-tap-highlight-color:transparent`、`touch-action:manipulation`；
 *   ② 横向一行在窄屏塌成纵向一列（图注的键值行、间隔条都不例外）；
 *   ③ 窄屏收紧内距、字号落 12／13／15 三档（与 `weightUi`／`sportUi` 同一档位表，不新造 12.5 这类空档）；
 *   ④ 窄屏表格给「可以左右滑」这一行提示（`.phu-scroll-hint`，桌面不出）。
 *  共享区块自带的 **640** 段不撤：820 管本件自造的件，640 管共享件，两段同向、不打架。
 *
 * ── 与公共层的边界（不许越）──
 *  本件只产**本族专属**的类（`phu-` 前缀）与容器；徽章走 `base-paint/blocks` 的 `renderChips`，
 *  状态徽标走 `base-paint` 的 `renderStatusBadge`，卡片／表／复制区一律走公共层——本件不自造第二份。
 *  `packages/base-render/**` 归 #525，本族一行不碰。
 *
 * 用法：`photoUiCss()` 返回 `<style>` 串，由本族三个整页装配放进 `parts` 的第一项
 * （`assembleDocPage` 没有页内 CSS 入口，同 `weightUi.ts` 的处置）。
 */
import { escapeHtml, renderStatusBadge } from 'base-paint';
import { renderChips } from 'base-paint/blocks';

const esc = (s: string): string => escapeHtml(s);

/** 键值行的一行：左是名字，右是值（`v` 与 `vHtml` 二选一，`vHtml` 给已组合好的受信形状）。 */
export interface FactRow {
  readonly k: string;
  readonly v?: string;
  readonly vHtml?: string;
}

/** 用户备注里的**并列分隔符集**：与判据工具 `audit-separators.mjs` 的 `PARALLEL` 同源（同一件事
 *  只有一份定义地，抄散了两边迟早走散）。命中即在该处换形状——不是删字符，是把连写拆成段。 */
const PARALLEL_RE = /[·；;｜|／/、＋]/;

/** 形状词汇的 CSS（冻结 token；不新增 `:root` 变量、不新造断点）。 */
export function photoUiCss(): string {
  return '<style>'
    // ── 徽章行（并列小标签）：容器只给间距，徽章本身就是公共层件 ──
    + '.phu-chips{margin:0 0 12px}'
    // ── 键值行：「名字 ＋ 值」，一行一件事 ──
    + '.phu-facts{margin:0}'
    + '.phu-fact{display:flex;gap:12px;align-items:baseline;padding:8px 0;border-top:1px solid var(--line);min-width:0}'
    + '.phu-fact:first-child{border-top:0;padding-top:0}'
    + '.phu-fk{flex:0 0 72px;font-size:12px;color:var(--fg3)}'
    + '.phu-fv{font-size:14px;color:var(--fg);min-width:0;overflow-wrap:anywhere}'
    // ── 备注分段：用户自己用斜杠连写的几件事，按段落到位（视觉上仍是一行，段间是细线不是符号）──
    + '.phu-segs{display:flex;flex-wrap:wrap;align-items:baseline}'
    + '.phu-seg{font-size:14px;overflow-wrap:anywhere}'
    + '.phu-seg + .phu-seg{padding-left:8px;margin-left:8px;border-left:1px solid var(--line)}'
    // ── 画廊网格：等高卡片（`aspect-ratio` 定框），宽屏多列、390 宽两列 ──
    + '.phu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px;margin:0}'
    + '.phu-card{display:flex;flex-direction:column;min-width:0;margin:0;background:var(--card);'
    + 'border:1px solid var(--line);border-radius:14px;overflow:hidden}'
    + '.phu-shot{position:relative;aspect-ratio:4/5;background:var(--soft);display:flex;'
    + 'align-items:center;justify-content:center;overflow:hidden}'
    // 图片容器有明确宽高比 ＋ `object-fit`：图按框裁切，绝不按天然像素撑破容器（高度的 `auto` 落在内联那侧）。
    + '.phu-shot img{display:block;width:100%;height:100%;object-fit:cover}'
    + '.phu-cap{display:flex;flex-direction:column;gap:6px;padding:8px 10px 10px;min-width:0}'
    + '.phu-when{font-size:13px;font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums}'
    + '.phu-file{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}'
    // 字号下限（#526 · t524 §3.2「390 档正文类 ≥12px」）：文件名小字块原 11px 是全页最小字号，
    // 抬到 12px 与同页徽章／键值行同档；层级由颜色（--fg2）与等宽字承担，不靠缩小字号。
    + '.phu-file code{font-size:12px;color:var(--fg2);overflow-wrap:anywhere}'
    // 占位（没图的那张）：明写**哪一份文件**与**为什么**，不留白框、不写内部原因码。
    + '.phu-miss{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;'
    + 'padding:14px 10px;text-align:center;color:var(--fg2);font-size:12px;line-height:1.6}'
    + '.phu-miss code{font-size:12px;overflow-wrap:anywhere;color:var(--fg2)}'
    // ── 间隔条（对比页）：大数字 ＋ 两张日期块，原来挤在页头标题那句 `·` 串里 ──
    + '.phu-interval{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 10px;margin:0 0 14px}'
    + '.phu-iv-n{font-size:30px;font-weight:700;line-height:1.1;color:var(--fg);font-variant-numeric:tabular-nums}'
    + '.phu-iv-u{font-size:13px;color:var(--fg2)}'
    + '.phu-date{font-size:13px;font-weight:600;color:var(--fg);background:var(--card);border:1px solid var(--line);'
    + 'border-radius:10px;padding:3px 9px;font-variant-numeric:tabular-nums}'
    // ── 页内定位条（上一张／下一张）：`[data-nav]` 是三条既有判据认的锚（不加类名，改属性选择器）──
    + '[data-nav]{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;margin:0 0 12px}'
    + '[data-nav] a{font-size:13px;font-weight:600;color:var(--blue2);text-decoration:none;'
    + 'border:1px solid var(--line);border-radius:999px;padding:0 12px;background:var(--card)}'
    + '[data-nav] a:hover{border-color:var(--blue2)}'
    + '[data-nav] span[aria-disabled="true"]{font-size:13px;color:var(--fg3)}'
    + '.phu-nav-id{color:var(--fg3);font-weight:400}'
    // ── 大图舞台的占位态（查身材照）：黑底 75vh contain 是本页的既有观看口径（#473／#438），
    // 只换「没图可看」那一态——虚线框＋浅底，写明哪一份文件、为什么、下一步 ──
    + '.phu-hero-miss{min-height:200px;border:1px dashed var(--line);border-radius:14px;background:var(--soft)}'
    // ── 动作块的说明句（「删掉这张照片」那一段）──
    + '.phu-act-s{font-size:13px;color:var(--fg2);margin:0 0 10px}'
    + '.phu-note{font-size:12px;color:var(--fg3);margin:8px 0 0}'
    // ── 候选行（#527 规划器：一行一张照片）：编号槽 ＋ 文件槽 ＋ 状态槽，不靠 `·`／`#N` 串 ──
    + '.phu-pl{border-top:1px solid var(--line)}'
    + '.phu-pl:first-child{border-top:0}'
    + '.phu-pl-row{display:flex;align-items:center;gap:10px;padding:10px 0;min-width:0}'
    + '.phu-pl-n{flex:0 0 auto;min-width:64px;font-size:12px;color:var(--fg3);font-variant-numeric:tabular-nums}'
    + '.phu-pl-file{flex:1 1 auto;min-width:0;font-size:13px;color:var(--fg);overflow-wrap:anywhere}'
    + '.phu-pl-tag{flex:0 0 auto;font-size:12px;color:var(--fg2)}'
    + '.phu-pl-meta{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:0 0 10px 74px;'
    + 'font-size:12px;color:var(--fg3);font-variant-numeric:tabular-nums}'
    // ── 表格列头抬到 12px 下限（#527 · t524 §3.2）：共享块层在 ≥641 档给 `th` 11.5px、
    //  ≤640 档给 11px，两档都低于本族页面正文的 12px 下限；本域页面自己把列头托起来
    //  （只动字号，不动块层的色与层级账——列头仍是最浅最弱的那一档）。──
    + '.ilife-block-data-table th{font-size:12px}'
    // ── 触摸目标 ≥44px（#527 · t524 §3.2「两档都 0 处不足」）：共享块层的复制按钮／菜单项
    //  在 >820 档只有 40px 高（390 档靠 #525 的 820 档配方已够）；本族页面自己把这两颗托到
    //  44px（原地加高，不改块层的排布与配色）。──
    + '.ilife-copy-btn,.ilife-copy-menu-item{min-height:44px}'
    // ── 窄屏表格提示：桌面不出，640 以下才出（表格本身照公共层的横滑口径走）──
    + '.phu-scroll-hint{display:none}'
    // ── 手机端（断点 820 = HELP）：留白收紧、字号落档、触摸面补齐 ──
    + '@media (max-width:820px){'
    + '  .phu-chips{margin-bottom:10px}'
    + '  .phu-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}'
    + '  .phu-fk{flex-basis:64px}'
    + '  .phu-iv-n{font-size:26px}'
    + '  .phu-pl-row{min-height:44px;padding:6px 0;-webkit-tap-highlight-color:transparent}'
    + '  .phu-pl-n{min-width:56px}'
    + '  .phu-pl-meta{padding-left:66px}'
    + '  [data-nav] a{min-height:44px;display:inline-flex;align-items:center}'
    + '  .phu-card,[data-nav] a,.phu-date{-webkit-tap-highlight-color:transparent;touch-action:manipulation}'
    + '}'
    + '@media (max-width:640px){'
    + '  .phu-scroll-hint{display:block;margin:6px 0 0;font-size:12px;color:var(--fg3)}'
    + '  .ilife-block-data-table th{font-size:12px}'
    // 键值行在 390 宽塌成「名字在上、值在下」：原来左栏 64px 会把值挤成一条窄柱。
    + '  .phu-fact{flex-direction:column;gap:2px}'
    + '  .phu-fk{flex:0 0 auto}'
    + '}'
    + '</style>';
}

/** 徽章列（页头身份行／图注元数据）：并列小标签一律走公共层 `renderChips`，本件只给容器。
 *  空表＝空串（没内容不留空壳）。 */
export function chipRow(items: readonly string[]): string {
  const kept = items.filter((s) => s !== '');
  if (kept.length === 0) return '';
  return '<div class="phu-chips">' + renderChips({ items: kept.map((text) => ({ text })) }) + '</div>';
}

/** 键值行（详情页「这张照片的信息」那一块）：一行一件事，窄屏塌成上下两行。空表＝空串。 */
export function factRows(rows: readonly FactRow[]): string {
  const body = rows
    .filter((r) => (r.vHtml ?? r.v ?? '') !== '')
    .map((r) => '<div class="phu-fact"><span class="phu-fk">' + esc(r.k) + '</span>'
      + '<span class="phu-fv">' + (r.vHtml ?? esc(r.v as string)) + '</span></div>')
    .join('');
  return body === '' ? '' : '<div class="phu-facts">' + body + '</div>';
}

/** 用户自己连写的文本 → 分段形状：命中并列分隔符即拆段，段间由细线分（**用户数据一字不改**，
 *  只把「拿符号顶版面」换成「把版面画出来」）。无分隔符即原样一段。 */
export function noteSegments(text: string): string {
  const segs = text.split(PARALLEL_RE).map((s) => s.trim()).filter((s) => s !== '');
  if (segs.length === 0) return '';
  if (segs.length === 1) return '<span class="phu-seg">' + esc(segs[0] as string) + '</span>';
  return segs.map((s) => '<span class="phu-seg">' + esc(s) + '</span>').join('');
}

/** 间隔条（对比页）：大数字＋单位＋两张日期块——「间隔 N 天」原来只是页头标题里的半句话。 */
export function intervalStrip(days: number, left: string, right: string): string {
  return '<div class="phu-interval">'
    + '<span class="phu-date">' + esc(left) + '</span>'
    + '<span class="phu-iv-n">' + String(days) + '</span>'
    + '<span class="phu-iv-u">天</span>'
    + '<span class="phu-date">' + esc(right) + '</span>'
    + '</div>';
}

/** 候选行的一行（#527 规划器）：编号槽／文件槽／标签槽／异常徽标槽 ＋ 次要行的事实。 */
export interface PhotoPickRowInput {
  /** 编号槽（人话，如「照片 31」）。 */
  readonly no: string;
  /** 文件槽（文件名；**不内嵌字节**，只有名字）。 */
  readonly file: string;
  /** 标签槽（本张的标签，短词）。 */
  readonly tag?: string;
  /** 异常徽标（正常张不给——「存在」是零信息值）。 */
  readonly badge?: { readonly tone: 'ok' | 'warn' | 'danger'; readonly text: string };
  /** 次要行（日期／整图或裁剪这类事实）；空数组＝不出这一行。 */
  readonly meta?: readonly string[];
}

/** 候选行（#527 规划器）：原来六列表在窄屏被挤成长串，改「一行一张照片」——编号、文件名、
 *  标签、异常徽标各占一槽，次要事实走第二行的徽章列。**不印 `#N`**（那是内部标识符口径），
 *  改「照片 31」这种读者话；行高在 820 以下补到 44px 触摸面。 */
export function photoPickRows(rows: readonly PhotoPickRowInput[]): string {
  const body = rows.map((r) => {
    const badge = r.badge === undefined ? ''
      : ' ' + renderStatusBadge({ status: r.badge.tone, text: r.badge.text });
    const meta = r.meta === undefined || r.meta.length === 0
      ? '' : '<div class="phu-pl-meta">' + renderChips({ items: r.meta.map((text) => ({ text })) }) + '</div>';
    return '<li class="phu-pl"><div class="phu-pl-row">'
      + '<span class="phu-pl-n">' + esc(r.no) + '</span>'
      + '<span class="phu-pl-tag">' + esc(r.tag ?? '') + '</span>'
      + '<span class="phu-pl-file">' + esc(r.file) + '</span>'
      + badge + '</div>' + meta + '</li>';
  }).join('');
  return body === '' ? '' : '<ol class="phu-pl">' + body + '</ol>';
}
