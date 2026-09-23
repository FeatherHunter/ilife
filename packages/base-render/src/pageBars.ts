/** #950 · 页面级横条三件：**时间格带**（`renderDayStrip`）、**等式条**（`renderEquationBar`）、
 *  **态声明条**（`renderStateBanner`）。样式随本件出（`pageBarsCss()` 由 `pageShapeCss()` 汇总进页）。
 *
 *  为什么要这三件（第一性：**三种「一行说不完」的信息各有其形**）：
 *   · **时间格带**：N 天窗口里「哪几天有记录、哪几天缺数」此前被压成一句「有记录 1/7 天」——
 *     句子说得出数量，说不出**哪几天**。一格一天的形状把它画出来（缺数格留空槽，不补零）。
 *   · **等式条**：`A ＋ B ＝ C` 这类加减关系（摄入＋缺口＝消耗、收入−支出＝结余）此前写成一整句，
 *     句长随要素增长（实测 33 字把一张读数卡撑到同排最高）；两段轨道 ＋ 端点标签是它的最小形状。
 *   · **态声明条**：**「态」与「结论」不是一回事**——结论讲读数，态讲「这句话在什么前提下成立」
 *     （目标暂停中／首次使用／窗口内无记录）。公共层此前只有「提示」（可关闭的 toast 形）与
 *     「结论」（讲读数），中间这个位子空着，于是被写成结论句的前缀。
 *
 *  为什么另立一件（不并进 `pageShapes.ts`）：那一件已 452 行、越过本包 350 行告警线。
 *  **已超线，需要根据规则进行重构**（指 `pageShapes.ts`，非本件）：本件即按该拆法新立的姊妹件之一。
 *
 *  色值与圆角只用冻结 token 与圆角闭集 `{8,14,20,999}`，不新增。
 *  **单位归调用方**：本层的值位只吃「已经是给人看的样子」的串（数字取整与单位口径由各包显示层定），
 *  与 `pageShapes.ts` 的事实条同口径。
 */

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`pageShapes.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 五字符转义表（与 `blocks.ts` 的 `esc` 逐字同口径，本件不引区块层内部件）。 */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('pageBars: ' + field + ' 必须是非空字符串');
  }
  return value;
}

function optText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('pageBars: ' + field + ' 必须是字符串');
  return value === '' ? undefined : value;
}

function reqFinite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('pageBars: ' + field + ' 必须是有限数');
  }
  return value;
}

/* ══════════════════════════════════════════════════════════════
 * ① 时间格带：一格一天（有记录／缺数／今天三态）
 * ══════════════════════════════════════════════════════════════ */

/** 缺数占位（与全仓「缺数一律写 —」同字）。 */
export const DAY_STRIP_EMPTY_MARK = '\u2014';

/** 带下事实条的语气闭集（`plain` ＝ 中性灰，缺省）。 */
export const CAPTION_TONES = ['plain', 'ok', 'warn', 'danger'] as const;
export type CaptionTone = (typeof CAPTION_TONES)[number];

export interface DayCellInput {
  /** 格上的日期串（如 `09-17`；「今天」二字由调用方决定要不要带）。 */
  readonly label: string;
  /** 那天的读数（**已是给人看的样子**）；`null` ＝ 那天缺数（印 `emptyMark`、圆点转灰）。 */
  readonly value: string | null;
  /** 今天那格（高亮）；缺省 `false`。 */
  readonly today?: boolean;
}

export interface DayStripCaptionInput {
  /** 带下一句事实（如「本窗 1/7 天有记录」）。 */
  readonly text: string;
  readonly tone?: CaptionTone;
}

export interface DayStripInput {
  /** 逐天的格子（顺序＝时间顺序）；0 格＝空串。 */
  readonly days: readonly DayCellInput[];
  /** 缺数格里的占位字，缺省 `—`。 */
  readonly emptyMark?: string;
  /** 带下事实条；0 条＝不出那一条。 */
  readonly caption?: readonly DayStripCaptionInput[];
  /** 密度：`comfortable`（缺省）／`compact`（值字号降一档，用于卡内窄位）。 */
  readonly density?: 'comfortable' | 'compact';
  readonly extraClass?: string;
}

/** 时间格带：把「哪几天有记录」画出来。空数组出不了一个字。
 *  窄屏（≤640）由样式段收成「只留日号」，`today` 格靠高亮认，不再靠文字。 */
export function renderDayStrip(input: DayStripInput): string {
  const days = input.days;
  if (!Array.isArray(days)) throw new Error('pageBars: renderDayStrip: input.days 必须是数组');
  if (days.length === 0) return '';
  const emptyMark = optText(input.emptyMark, 'renderDayStrip: input.emptyMark') ?? DAY_STRIP_EMPTY_MARK;
  const density = input.density ?? 'comfortable';
  if (density !== 'comfortable' && density !== 'compact') {
    throw new Error('pageBars: renderDayStrip: input.density 必须是 comfortable／compact 之一');
  }
  const extra = optText(input.extraClass, 'renderDayStrip: input.extraClass');
  const cells = days.map((raw, i) => {
    const field = 'renderDayStrip: input.days[' + i + ']';
    const day = raw as DayCellInput;
    const label = reqText(day.label, field + '.label');
    const value = day.value === null || day.value === undefined ? null : reqText(day.value, field + '.value');
    const has = value !== null;
    const classes = 'ilife-block-day-strip-cell'
      + (has ? ' is-has' : '')
      + (day.today === true ? ' is-today' : '');
    return '<div class="' + classes + '">'
      + '<span class="ilife-block-day-strip-date">' + esc(label) + '</span>'
      + '<span class="ilife-block-day-strip-dot" aria-hidden="true"></span>'
      + '<span class="ilife-block-day-strip-val">' + esc(has ? value : emptyMark) + '</span>'
      + '</div>';
  }).join('');
  const capItems = input.caption === undefined ? [] : input.caption;
  if (!Array.isArray(capItems)) throw new Error('pageBars: renderDayStrip: input.caption 必须是数组');
  const cap = capItems.map((raw, i) => {
    const field = 'renderDayStrip: input.caption[' + i + ']';
    const item = raw as DayStripCaptionInput;
    const text = reqText(item.text, field + '.text');
    const tone = item.tone ?? 'plain';
    if (!(CAPTION_TONES as readonly string[]).includes(tone)) {
      throw new Error('pageBars: ' + field + '.tone 必须是 ' + CAPTION_TONES.join('／') + ' 之一');
    }
    return '<span class="ilife-block-day-strip-cap-item ilife-block-day-strip-cap-item-' + tone + '">'
      + esc(text) + '</span>';
  }).join('');
  return '<div class="ilife-block-day-strip is-' + density + (extra === undefined ? '' : ' ' + extra) + '">'
    + '<div class="ilife-block-day-strip-cells">' + cells + '</div>'
    + (cap === '' ? '' : '<div class="ilife-block-day-strip-cap">' + cap + '</div>')
    + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * ② 等式条：两段轨道 ＋ 端点标签（加减关系的最小形状）
 * ══════════════════════════════════════════════════════════════ */

export interface EquationSegmentInput {
  /** 这一段是什么（人话短名，如「摄入」「缺口」）。 */
  readonly label: string;
  /** 这一段的量（与 `total` 同单位）。 */
  readonly value: number;
}

export interface EquationBarInput {
  /** 两段（或三段）；0 段＝空串。宽度按 `value / total` 铺满。 */
  readonly segments: readonly EquationSegmentInput[];
  /** 等式右边那个量（`a+b=c` 的 `c`）；非零有限数，作宽度的分母。 */
  readonly total: number;
  /** 顶部一行：左标右值（值位是**结论数**，如「2012 卡」）。不给＝不出那行。 */
  readonly heading?: { readonly label: string; readonly value: string };
  /** 底部逐段读数后是否再补一枚「合计」格（`total`）。缺省 `false`。 */
  readonly endLabels?: boolean;
  readonly extraClass?: string;
}

/** 等式条：`A ＋ B ＝ C` 的形状。`total` 作分母；越界值夹到 0–100，不报错（同 `renderMiniBar` 口径）。 */
export function renderEquationBar(input: EquationBarInput): string {
  const segments = input.segments;
  if (!Array.isArray(segments)) throw new Error('pageBars: renderEquationBar: input.segments 必须是数组');
  if (segments.length === 0) return '';
  const total = reqFinite(input.total, 'renderEquationBar: input.total');
  if (total <= 0) throw new Error('pageBars: renderEquationBar: input.total 必须大于 0');
  const extra = optText(input.extraClass, 'renderEquationBar: input.extraClass');
  const parts = segments.map((raw, i) => {
    const field = 'renderEquationBar: input.segments[' + i + ']';
    const seg = raw as EquationSegmentInput;
    const label = reqText(seg.label, field + '.label');
    const value = reqFinite(seg.value, field + '.value');
    const pct = Math.min(100, Math.max(0, (value / total) * 100));
    const width = String(Math.round(pct * 10) / 10);
    return {
      fill: '<span class="ilife-block-equation-bar-seg is-' + (i === 0 ? 'a' : 'b')
        + '" style="width: ' + width + '%"></span>',
      cap: '<span class="ilife-block-equation-bar-cap-item">' + esc(label) + ' ' + esc(String(value)) + '</span>',
    };
  });
  const head = input.heading === undefined ? ''
    : '<div class="ilife-block-equation-bar-top">'
      + '<span class="ilife-block-equation-bar-label">' + esc(reqText(input.heading.label, 'renderEquationBar: input.heading.label')) + '</span>'
      + '<span class="ilife-block-equation-bar-value">' + esc(reqText(input.heading.value, 'renderEquationBar: input.heading.value')) + '</span>'
      + '</div>';
  const totalCap = input.endLabels === true
    ? '<span class="ilife-block-equation-bar-cap-item is-total">合计 ' + esc(String(total)) + '</span>'
    : '';
  return '<div class="ilife-block-equation-bar' + (extra === undefined ? '' : ' ' + extra) + '">'
    + head
    + '<div class="ilife-block-equation-bar-track">' + parts.map((x) => x.fill).join('') + '</div>'
    + '<div class="ilife-block-equation-bar-cap">' + parts.map((x) => x.cap).join('') + totalCap + '</div>'
    + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * ③ 态声明条：一句话成立的前提（目标暂停中／首次使用／窗口内无记录）
 * ══════════════════════════════════════════════════════════════ */

/** 语气闭集（`info` 中性说明／`warn` 前提未生效／`danger` 数据不足）。 */
export const STATE_TONES = ['info', 'warn', 'danger'] as const;
export type StateTone = (typeof STATE_TONES)[number];

export interface StateBannerInput {
  readonly tone: StateTone;
  /** 短词（如「目标暂停中」）；一枚徽标，不是一句话。 */
  readonly badge: string;
  /** 一句话说明（可省）。 */
  readonly text?: string;
  /** 可点动作：给 `actionId` 时页面运行时按 `data-action-id` 委派（本层不自建交互）。 */
  readonly action?: { readonly label: string; readonly actionId: string };
  readonly extraClass?: string;
}

/** 态声明条：一行「徽标 ＋ 说明（＋ 动作）」。语气色与状态徽章同一套语义色。 */
export function renderStateBanner(input: StateBannerInput): string {
  const tone = input.tone;
  if (!(STATE_TONES as readonly string[]).includes(tone)) {
    throw new Error('pageBars: renderStateBanner: input.tone 必须是 ' + STATE_TONES.join('／') + ' 之一');
  }
  const badge = reqText(input.badge, 'renderStateBanner: input.badge');
  const text = optText(input.text, 'renderStateBanner: input.text');
  const extra = optText(input.extraClass, 'renderStateBanner: input.extraClass');
  let action = '';
  if (input.action !== undefined) {
    const actionId = reqText(input.action.actionId, 'renderStateBanner: input.action.actionId');
    const label = reqText(input.action.label, 'renderStateBanner: input.action.label');
    action = '<button type="button" class="ilife-block-state-banner-action" data-action-id="'
      + esc(actionId) + '">' + esc(label) + '</button>';
  }
  return '<div class="ilife-block-state-banner is-' + tone + (extra === undefined ? '' : ' ' + extra) + '">'
    + '<span class="ilife-block-state-banner-badge">' + esc(badge) + '</span>'
    + (text === undefined ? '' : '<span class="ilife-block-state-banner-text">' + esc(text) + '</span>')
    + action
    + '</div>';
}

export { pageBarsCss } from './pageBarsCss.js';

