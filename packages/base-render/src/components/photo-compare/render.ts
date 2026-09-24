/** photo-compare · **渲染**（纯函数产 HTML；本件只有形态 A「拖动对照」一种骨架）。
 *
 *  —— 形态 A：拖动对照（**三个读数一起给**）——
 *
 *  ① 台面上两张照片**叠着**（后一张从左边裁），中间一根竖线 ＋ 一个可拖的把手；
 *  ② **两张的日期标签**各自贴在自己那张的角上（左角／右角）；
 *  ③ 底下是**数值差值行**（体重 70.8 → 68.4 千克，Δ −2.4 千克）——拖动读不出来的那件事在这里读得出。
 *
 *  同一份标记**两档都用**：宽档两张重叠（`grid-area: 1/1`），窄档同一对 `<figure>`
 *  改成左右并排（`grid-area: auto`），拖动条收起、差值条上屏——**不是两套标记**。
 *  拖动位置只存一个**局部自定义属性**（根上的 `--photo-compare-split`，是个几何量，不是皮肤 token），
 *  竖线、把手、裁切三处都从它算 ⇒ 一个事实一处存。
 */
import { esc } from '../shared/escape.js';
import {
  PHOTO_COMPARE_CLASS,
  PHOTO_COMPARE_SPLIT_VAR,
  PHOTO_COMPARE_STEP,
  photoCompareSlot,
} from './attrs.js';
import { normalizePhotoCompare, type PhotoCompareDeltaModel, type PhotoCompareModel, type PhotoCompareSideModel } from './model.js';

/** 台面上那张照片的定形比例（窄档并排时由它定形；宽档台面自己带比例，框铺满）。 */
const FRAME_RATIO = '4-5';

/** 定形框上的比例类（与 `style.ts` 里那条 `aspect-ratio` 规则同一个名字）。 */
function frameClass(): string {
  return photoCompareSlot('frame') + '-' + FRAME_RATIO;
}

/** 一张：定形框（取景角标 ＋ 相机记号或真图）＋ 日期标签 ＋ 题注条。 */
function layerHtml(side: PhotoCompareSideModel, which: 'before' | 'after'): string {
  const parts: string[] = ['<figure class="' + photoCompareSlot('layer') + ' is-' + which + '">'];
  parts.push('<span class="' + photoCompareSlot('frame') + ' ' + frameClass() + '">');
  parts.push('<i class="' + photoCompareSlot('marks') + '" aria-hidden="true"></i>');
  if (side.src === undefined) {
    parts.push('<i class="' + photoCompareSlot('lens') + '" aria-hidden="true"></i>');
    parts.push('<span class="' + photoCompareSlot('alt') + '">' + esc(side.alt) + '</span>');
  } else {
    parts.push('<img class="' + photoCompareSlot('img') + '" src="' + esc(side.src) + '" alt="' + esc(side.alt)
      + '" loading="lazy" decoding="async">');
  }
  parts.push('</span>');
  parts.push('<span class="' + photoCompareSlot('tag') + '">' + esc(side.date) + '</span>');
  if (side.hasCaption) {
    const caps: string[] = [];
    if (side.caption !== undefined) caps.push('<span class="' + photoCompareSlot('text') + '">' + esc(side.caption) + '</span>');
    if (side.size !== undefined) caps.push('<span class="' + photoCompareSlot('size') + '">' + esc(side.size) + '</span>');
    parts.push('<figcaption class="' + photoCompareSlot('caption') + '">' + caps.join('') + '</figcaption>');
  }
  parts.push('</figure>');
  return parts.join('');
}

/** 一行差值：方向记号 ／ 读数名 ／ 前值 → 后值 ／ 变了多少。 */
function deltaHtml(d: PhotoCompareDeltaModel): string {
  return '<li class="' + photoCompareSlot('delta') + ' is-' + d.tone + '">'
    + '<span class="' + photoCompareSlot('delta-mark') + '" aria-hidden="true">' + esc(d.mark) + '</span>'
    + '<span class="' + photoCompareSlot('delta-label') + '">' + esc(d.label) + '</span>'
    + '<span class="' + photoCompareSlot('delta-value') + '"><b>' + esc(d.before) + '</b>'
    + '<span class="' + photoCompareSlot('delta-arrow') + '" aria-hidden="true">→</span>'
    + '<b>' + esc(d.after) + '</b></span>'
    + '<span class="' + photoCompareSlot('delta-change') + '">' + esc(d.change) + '</span>'
    + '</li>';
}

/** 形态 A 的骨架。 */
function renderDrag(m: PhotoCompareModel): string {
  const parts: string[] = [];
  parts.push('<div class="' + photoCompareSlot('stage') + '">');
  parts.push(layerHtml(m.before, 'before'));
  parts.push(layerHtml(m.after, 'after'));
  parts.push('<span class="' + photoCompareSlot('divider') + '" aria-hidden="true"></span>');
  /* 拖动条是**原生 `range`**：键盘 `←`／`→` 各一档（`step`），指针拖、触摸拖都由原生接管；
     命中盒铺满台面，把手 44×44（`PHOTO_COMPARE_MIN_HIT_PX`）——不靠脚本才成立。 */
  parts.push('<input class="' + photoCompareSlot('range') + '" type="range" min="0" max="100" step="'
    + String(PHOTO_COMPARE_STEP) + '" value="' + esc(String(m.position)) + '"'
    + ' aria-label="' + esc(m.rangeLabel) + '"'
    + ' aria-valuetext="' + esc('左 ' + m.before.date + '，右 ' + m.after.date) + '">');
  parts.push('</div>');
  if (m.verdict !== undefined) {
    parts.push('<p class="' + photoCompareSlot('verdict') + '">' + esc(m.verdict) + '</p>');
  }
  parts.push('<ul class="' + photoCompareSlot('deltas') + '">');
  for (const d of m.deltas) parts.push(deltaHtml(d));
  parts.push('</ul>');
  if (m.note !== undefined) {
    parts.push('<p class="' + photoCompareSlot('note') + '">' + esc(m.note) + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<PhotoCompareModel['form'], (m: PhotoCompareModel) => string>> = {
  drag: renderDrag,
};

/** 渲染前后对比（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderPhotoCompare(input: unknown): string {
  const m = normalizePhotoCompare(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + PHOTO_COMPARE_CLASS + ' is-' + m.form + extra + '"'
    + ' data-ilife-photo-compare=""'
    + ' style="' + PHOTO_COMPARE_SPLIT_VAR + ': ' + esc(String(m.position)) + '%">'
    + SKELETONS[m.form](m) + '</div>';
}
