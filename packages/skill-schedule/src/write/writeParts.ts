/** #783 · 写入与同步域的**两处族级件**（页内自造件）：过去几小时推断回溯卡、蓝调 diff 面板。
 *
 *  为什么住这里（写得出哪几张页在用）：本域的「记作息结果」（老侧 f07）要第二件——把回溯窗口里
 *  每一段记录的**来源消息**与**推理说明**摆成卡（公共层给不出：它的列表行只有三格、摆不下两段长文）；
 *  「修正作息回执」（老侧 f09）要第三件——一段**改前改后逐格对照**，公共层 `renderChangeRows` 给了行，
 *  但「蓝调」这层底与标题得住族级样式件里。两件都只有本域在用，按结构标准「写不出第二个用法就留在
 *  能力目录」落这里，不进共用位。
 *
 *  **只认形状，不认领域**：进来的是摆好的数据（时间段怎么拼、来源怎么截、改前改后是什么值，都由
 *  `writeDocs.ts` 算好），出去的是 HTML 串。
 *
 *  **样式纪律（本票的代码层窄判据）**：本文件是**族级样式常量的唯一住处**——CSS 里的长度一律取下面
 *  那组具名常量、颜色一律取公共层 token（`var(--…)`）或 `CHART_PALETTE`，`px` 字面量一处也不写。
 *  断点只用仓内既有值 **820**（页内自造件那一档），不新造。
 */
import { renderChangeRows, renderChips, type ChangeRowInput } from 'base-paint/blocks';

/** 五字符转义（与公共层 `blocks.ts` 同口径；本件不引区块层内部件）。 */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

/** 族级样式常量（**本域 CSS 里所有长度的出处**；数值只在这里出现一次）。 */
const CARD_GAP = 8;
const CARD_PAD_Y = 12;
const CARD_PAD_X = 14;
const CARD_RADIUS = 12;
const RAIL_W = 3;
const HAIRLINE = 1;
const TIME_W = 108;
const FS_TITLE = 15;
const FS_BODY = 13;
const FS_SMALL = 12;
const NARROW = 820;

const px = (n: number): string => n + 'px';
const LF = String.fromCharCode(10);

/** 一张回溯卡要的东西（口径在 `writeDocs.ts`：时间怎么拼、来源怎么截都算好了再进来）。 */
export interface PastHourCard {
  /** 这一段的起止（人话串，范围用「至」）。 */
  readonly time: string;
  readonly activity: string;
  readonly category: string;
  readonly duration: string;
  /** 来源消息摘要（可能为空串＝这一段没有来源）。 */
  readonly source: string;
  /** 推理说明摘要（可能为空串）。 */
  readonly reasoning: string;
  /** 这一张是不是刚写入的那一条（绿框高亮）。 */
  readonly isNew: boolean;
}

/** 过去几小时推断回溯（老侧三件套的②）：一行标题 ＋ 一段卡片列。
 *  `cards` 为空＝出一句空态话（这一块**恒在页上**，不因数据空而消失）。 */
export function renderPastHours(input: {
  readonly title: string;
  readonly cards: readonly PastHourCard[];
  readonly emptyText: string;
}): string {
  const head = '<h2 class="sch-wr-h2">' + esc(input.title) + '</h2>';
  if (input.cards.length === 0) {
    return head + '<p class="sch-wr-empty">' + esc(input.emptyText) + '</p>';
  }
  const cards = input.cards.map((card) => {
    const rows = [
      '<div class="sch-wr-head">',
      '<span class="sch-wr-time">' + esc(card.time) + '</span>',
      '<span class="sch-wr-act">' + esc(card.activity) + '</span>',
      '<span class="sch-wr-tag">' + esc(card.category) + '</span>',
      '<span class="sch-wr-meta">' + esc(card.duration) + '</span>',
      card.isNew ? '<span class="sch-wr-new">刚记录</span>' : '',
      '</div>',
      card.source === '' ? '' : '<p class="sch-wr-line">来源 ' + esc(card.source) + '</p>',
      card.reasoning === '' ? '' : '<p class="sch-wr-line">推断 ' + esc(card.reasoning) + '</p>',
    ].filter((seg) => seg !== '').join('');
    return '<div class="sch-wr-card' + (card.isNew ? ' sch-wr-card-new' : '') + '">' + rows + '</div>';
  }).join('');
  return head + '<div class="sch-wr-past">' + cards + '</div>';
}

/** 蓝调 diff 面板（老侧修正作息回执的必现块「蓝调 diff」＋「多字段前后对照」）：
 *  一行标题 ＋ 一段逐格对照（改前／改后两栏，值由调用方给好）。 */
export function renderDiffPanel(input: {
  readonly title: string;
  readonly rows: readonly ChangeRowInput[];
}): string {
  if (input.rows.length === 0) return '';
  return '<h2 class="sch-wr-h2">' + esc(input.title) + '</h2>'
    + '<div class="sch-wr-diff">' + renderChangeRows({ rows: input.rows }) + '</div>';
}

/** 徽章列（老侧「建议细化」那句里并列的二级候选）。
 *
 *  **为什么必须包一层**：公共层 `renderChips` 是「**行即件**」——它只返一串 `<span class="ilife-block-chip">`，
 *  不返容器（见 `出页交接-页型配方怎么用.md` §四第 1 条）。直接当一块往页里塞，那几枚徽章会各自成为页壳
 *  正文的直接子件：桌面档下正文是栅格，每枚徽章各占一行的整宽（实测 1440 档从 880px 掉到 874px、
 *  且单列配方被打散）。包一层本域的容器，它们才回到「一行并列」该有的样子。 */
export function renderChipBand(items: readonly string[]): string {
  if (items.length === 0) return '';
  return '<div class="sch-wr-band">' + renderChips({ items: items.map((text) => ({ text })) }) + '</div>';
}

/** 这两处族级件的样式唯一产出者（只对用上它们的页面有作用）。
 *  颜色只取公共层冻结 token；长度只取上面那组常量——本串里不出现 `px` 字面量。 */
export function writePartsCss(): string {
  return [
    '/* #783 写入与同步域·族级件（断点只用仓内既有值 820） */',
    '.sch-wr-h2 { margin: 0 0 ' + px(CARD_GAP) + '; font-size: ' + px(FS_TITLE) + '; font-weight: 600; color: var(--fg); }',
    '.sch-wr-empty { margin: 0; color: var(--fg3); font-size: ' + px(FS_BODY) + '; }',
    '.sch-wr-past { display: flex; flex-direction: column; gap: ' + px(CARD_GAP) + '; }',
    '.sch-wr-card { display: flex; flex-direction: column; gap: ' + px(CARD_GAP) + ';',
    '  padding: ' + px(CARD_PAD_Y) + ' ' + px(CARD_PAD_X) + '; border: ' + px(HAIRLINE) + ' solid var(--line);',
    '  border-radius: ' + px(CARD_RADIUS) + '; background: var(--card); }',
    '.sch-wr-card-new { border-color: var(--ok); background: var(--soft); }',
    '.sch-wr-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: ' + px(CARD_GAP) + '; }',
    '.sch-wr-time { flex: 0 0 auto; width: ' + px(TIME_W) + '; color: var(--blue2); font-size: ' + px(FS_BODY) + ';',
    '  font-weight: 600; font-variant-numeric: tabular-nums; }',
    '.sch-wr-act { flex: 1 1 auto; min-width: 0; color: var(--fg); font-size: ' + px(FS_BODY) + '; font-weight: 600; }',
    '.sch-wr-tag { flex: 0 0 auto; padding: 0 ' + px(CARD_GAP) + '; border-radius: ' + px(CARD_RADIUS) + ';',
    '  background: var(--soft); color: var(--blue2); font-size: ' + px(FS_SMALL) + '; }',
    '.sch-wr-meta { flex: 0 0 auto; color: var(--fg3); font-size: ' + px(FS_SMALL) + '; font-variant-numeric: tabular-nums; }',
    '.sch-wr-new { flex: 0 0 auto; color: var(--ok); font-size: ' + px(FS_SMALL) + '; font-weight: 600; }',
    '.sch-wr-line { margin: 0; color: var(--fg2); font-size: ' + px(FS_SMALL) + '; line-height: 1.7; }',
    '.sch-wr-diff { padding: ' + px(CARD_PAD_Y) + ' ' + px(CARD_PAD_X) + '; border: ' + px(HAIRLINE) + ' solid var(--line);',
    '  border-left: ' + px(RAIL_W) + ' solid var(--blue); border-radius: ' + px(CARD_RADIUS) + '; background: var(--soft); }',
    '.sch-wr-band { display: flex; flex-wrap: wrap; align-items: center; gap: ' + px(CARD_GAP) + '; }',
    '@media (max-width: ' + px(NARROW) + ') {',
    '  .sch-wr-time { width: auto; }',
    '  .sch-wr-head { gap: ' + px(CARD_GAP) + '; }',
    '}',
  ].join(LF);
}
