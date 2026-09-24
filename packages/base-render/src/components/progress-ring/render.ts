/** progress-ring · **渲染**（纯函数产 HTML；本件只有形态 A「半环 ＋ 环下大字 ＋ 右侧读数」一种骨架）。
 *
 *  —— 形态 A：半环 ＋ 环下大字 ＋ 右侧读数 ——
 *
 *  左边一格是**内联 SVG 画的半环**（180°）＋ 环下那行大字（值 ＋ 单位 ＋ 分母 ＋ 百分数），
 *  右边一列是「还能吃多少／还差多少／照此收尾」这类读数。它替掉的三种错法：
 *   · 只报一个百分数 —— 读者看不出「还差多少」；
 *   · 环心用 SVG `<text>` 写字 —— 字号随 SVG 一起缩放，窄容器里读数先糊；
 *     （本件的大字是 **HTML 叠在环下**，与别的读数同一套字号阶梯）
 *   · 超目标时把弧画到底就不管了（颜色不变、也不说超了多少）。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 弧长与读数**同一份真值**：`stroke-dasharray` 的实线长 ÷ `PROGRESS_RING_ARC_LEN`
 *     ＝ 那句百分数；超目标时弧**画满**（形状不变、只换色，与同族 `scale-bar` 的「满格」同一条口径）；
 *   · 超目标**不是错**：`value > goal` 合法，出 `is-over` ＋ 换色 ＋ 一句人话（调用方不给就本件算）；
 *   · 标记里不写分隔符与缺省占位：段间由列距与发丝线承担；缺值由调用方写成 `—`。
 */
import { esc } from '../shared/escape.js';
import {
  PROGRESS_RING_ARC_LEN,
  PROGRESS_RING_CLASS,
  PROGRESS_RING_RADIUS_PX,
  PROGRESS_RING_STROKE_PX,
  progressRingSlot,
  type ProgressRingForm,
} from './attrs.js';
import { normalizeProgressRing, type ProgressRingModel } from './model.js';

/** SVG 画布（px）：宽 ＝ 2r ＋ 两侧描边余量；高 ＝ 圆心 y ＋ 半描边 ＋ 一点余量。
 *  圆心 (90, 90)、半径 70、描边 16 ⇒ 弧顶 90 − 70 = 20，描边外沿 12 ⇒ 全在画布内。 */
const CX = 90;
const CY = 90;
const VIEW_BOX = '0 0 ' + String(2 * CX) + ' ' + String(CY + PROGRESS_RING_STROKE_PX / 2 + 4);

/** 半环的路径（M 左端点 → A 半径 半径 0 0 1 右端点）。两个端点与半径都从常量算，不抄字面量。 */
const ARC_PATH = 'M' + String(CX - PROGRESS_RING_RADIUS_PX) + ' ' + String(CY)
  + 'A' + String(PROGRESS_RING_RADIUS_PX) + ' ' + String(PROGRESS_RING_RADIUS_PX) + ' 0 0 1 '
  + String(CX + PROGRESS_RING_RADIUS_PX) + ' ' + String(CY);

/** 环：一条底轨 ＋ 一条填充弧。**`stroke-dasharray` 的两个数就是「画出来多少／整条多长」**。 */
function gaugeHtml(m: ProgressRingModel): string {
  const dash = String(m.dash) + ' ' + String(PROGRESS_RING_ARC_LEN);
  const parts: string[] = [];
  parts.push('<div class="' + progressRingSlot('gauge') + '">');
  parts.push('<svg class="' + progressRingSlot('svg') + '" viewBox="' + VIEW_BOX + '" role="img" aria-label="'
    + esc(m.title + m.ariaLabel) + '">');
  parts.push('<path class="' + progressRingSlot('trk') + '" d="' + ARC_PATH + '" fill="none" stroke-width="'
    + String(PROGRESS_RING_STROKE_PX) + '" stroke-linecap="butt"/>');
  parts.push('<path class="' + progressRingSlot('fil') + '" d="' + ARC_PATH + '" fill="none" stroke-width="'
    + String(PROGRESS_RING_STROKE_PX) + '" stroke-linecap="butt" stroke-dasharray="' + dash + '"/>');
  parts.push('</svg>');
  parts.push('<p class="' + progressRingSlot('hero') + '">');
  parts.push('<b class="' + progressRingSlot('value') + '">' + esc(m.valueText) + '</b>');
  if (m.unit !== undefined) {
    parts.push('<span class="' + progressRingSlot('unit') + '">' + esc(m.unit) + '</span>');
  }
  parts.push('<span class="' + progressRingSlot('denom') + '">／'
    + esc(m.goalText + (m.unit === undefined ? '' : ' ' + m.unit)) + '</span>');
  parts.push('<span class="' + progressRingSlot('pct') + '">' + esc(m.pctText + '%') + '</span>');
  parts.push('</p>');
  parts.push('</div>');
  return parts.join('');
}

/** 右侧读数：逐行「名字 ｜ 值」，值永不换行、永不截断（它是读者要看的那一个数）。 */
function rowsHtml(m: ProgressRingModel): string {
  if (m.rows.length === 0) return '';
  const parts: string[] = ['<div class="' + progressRingSlot('kvs') + '">'];
  for (const row of m.rows) {
    parts.push('<div class="' + progressRingSlot('kv') + '">');
    parts.push('<span class="' + progressRingSlot('kv-label') + '">' + esc(row.label) + '</span>');
    parts.push('<b class="' + progressRingSlot('kv-value') + '">' + esc(row.value) + '</b>');
    parts.push('</div>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 A 的骨架：卡头 → （环 ＋ 右侧读数）→ 脚注那句人话。 */
function renderArc(m: ProgressRingModel): string {
  const parts: string[] = [];
  parts.push('<div class="' + progressRingSlot('hd') + '">');
  parts.push('<h4 class="' + progressRingSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) {
    parts.push('<span class="' + progressRingSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('</div>');
  parts.push('<div class="' + progressRingSlot('split') + '">' + gaugeHtml(m) + rowsHtml(m) + '</div>');
  parts.push('<p class="' + progressRingSlot('note') + '">' + esc(m.note) + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<ProgressRingForm, (m: ProgressRingModel) => string>> = {
  arc: renderArc,
};

/** 渲染进度环（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderProgressRing(input: unknown): string {
  const m = normalizeProgressRing(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + PROGRESS_RING_CLASS + ' is-' + m.form + (m.over ? ' is-over' : '') + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
