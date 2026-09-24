/** summary-head · **渲染**（主数字头：一页只该有一个"主要读数"）。
 *
 *  —— 主数字头 ——
 *
 *  形状：eyebrow（"当日摄入"）／主数字（`860` ＋ 可选单位）／分母（`/ 1850 卡`）／
 *  脚行（左：一句人话；右：一枚**印章**"还可吃 990 卡"）。
 *
 *  它替掉的是哪几种错法：
 *   · 同一个数在首屏说两到三遍（结论句一遍、KPI 卡一遍、"事实条"再一遍）；
 *   · 主数字与目标并排却**同级同字号** ⇒ 读者分不出哪个是读数、哪个是标尺；
 *   · 「还剩 990 卡」这类一句话没有落点，被塞进 KPI 卡的值位（与"目标"那一卡同形）。
 *
 *  为什么把**印章**放在本件里（而不是另立一个"徽标"组件）：`renderStatusBadge` 已经是
 *  「态」的形状（实心胶囊、四种语义色），而印章是「**这一页那一句要注意的话**」——一页至多一枚、
 *  描边、微斜。它只在本头的脚行里出现，立成独立组件就是给同一件事开第二条路。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

/** 主数字的字号档：`m`＝46px（**小票原型那一档**，缺省）／`l`＝56px（中间档）／`xl`＝92px（大字原型：整页只有一个数时用）。 */
export const SUMMARY_HEAD_SIZES = ['m', 'l', 'xl'] as const;
export type SummaryHeadSize = (typeof SUMMARY_HEAD_SIZES)[number];

/** 数字的字面：`sans`＝无衬线（缺省，界面语汇）／`serif`＝衬线（排版语汇，大数字当"标题"用）。 */
export const SUMMARY_HEAD_FACES = ['sans', 'serif'] as const;
export type SummaryHeadFace = (typeof SUMMARY_HEAD_FACES)[number];

/** 印章的语气闭集（与全仓语义色同一套；不给＝中性灰）。 */
export const SUMMARY_HEAD_STAMP_TONES = ['ok', 'warn', 'danger'] as const;
export type SummaryHeadStampTone = (typeof SUMMARY_HEAD_STAMP_TONES)[number];

export interface SummaryHeadInput {
  /** 这一行数字说的是什么（人话短标签，如「当日摄入」）。不给＝不出这一行。 */
  readonly eyebrow?: string;
  /** 主读数（**已是给人看的样子**；取整与单位口径由调用方定）。 */
  readonly value: string;
  /** 主读数的单位（`卡`／`ml`／`kg`）；给了就小一号跟在同一行。 */
  readonly unit?: string;
  /** 分母／标尺（如 `/ 1850 卡`）；给了就排在主数字之后。 */
  readonly denominator?: string;
  /** 脚行左侧那句人话（如「已吃目标的 46%」）。 */
  readonly note?: string;
  /** 脚行右侧那枚印章（一页至多一枚）。 */
  readonly stamp?: { readonly text: string; readonly tone?: SummaryHeadStampTone };
  readonly size?: SummaryHeadSize;
  readonly face?: SummaryHeadFace;
  readonly extraClass?: string;
}

/** 主数字头：一页的"主要读数"唯一的落点。 */
export function renderSummaryHead(input: SummaryHeadInput): string {
  assertPlainObject(input, 'renderSummaryHead: input');
  const value = reqText(input.value, 'summary-head: input.value');
  const size = input.size ?? 'l';
  if (!(SUMMARY_HEAD_SIZES as readonly string[]).includes(size)) {
    badInput('summary-head: input.size 必须是 ' + SUMMARY_HEAD_SIZES.join('／') + ' 之一');
  }
  const face = input.face ?? 'sans';
  if (!(SUMMARY_HEAD_FACES as readonly string[]).includes(face)) {
    badInput('summary-head: input.face 必须是 ' + SUMMARY_HEAD_FACES.join('／') + ' 之一');
  }
  const eyebrow = optText(input.eyebrow, 'summary-head: input.eyebrow');
  const unit = optText(input.unit, 'summary-head: input.unit');
  const denominator = optText(input.denominator, 'summary-head: input.denominator');
  const note = optText(input.note, 'summary-head: input.note');
  const extra = optExtraClass(input.extraClass, 'summary-head: input.extraClass');

  const parts: string[] = ['<div class="ilife-block-summary-head is-' + size + ' is-' + face
    + (extra === undefined ? '' : ' ' + extra) + '">'];
  if (eyebrow !== undefined) {
    parts.push('<span class="ilife-block-summary-head-eyebrow">' + esc(eyebrow) + '</span>');
  }
  parts.push('<span class="ilife-block-summary-head-line">');
  parts.push('<span class="ilife-block-summary-head-value">' + esc(value)
    + (unit === undefined ? '' : '<small>' + esc(unit) + '</small>') + '</span>');
  if (denominator !== undefined) {
    parts.push('<span class="ilife-block-summary-head-denom">' + esc(denominator) + '</span>');
  }
  parts.push('</span>');

  let stampHtml = '';
  if (input.stamp !== undefined) {
    assertPlainObject(input.stamp, 'summary-head: input.stamp');
    const stampText = reqText(input.stamp.text, 'summary-head: input.stamp.text');
    const tone = input.stamp.tone;
    if (tone !== undefined && !(SUMMARY_HEAD_STAMP_TONES as readonly string[]).includes(tone)) {
      badInput('summary-head: input.stamp.tone 必须是 ' + SUMMARY_HEAD_STAMP_TONES.join('／') + ' 之一');
    }
    stampHtml = '<span class="ilife-block-summary-head-stamp'
      + (tone === undefined ? '' : ' is-' + tone) + '">' + esc(stampText) + '</span>';
  }
  if (note !== undefined || stampHtml !== '') {
    parts.push('<span class="ilife-block-summary-head-foot">');
    parts.push(note === undefined ? '<span></span>' : '<span class="ilife-block-summary-head-note">' + esc(note) + '</span>');
    parts.push(stampHtml);
    parts.push('</span>');
  }
  parts.push('</div>');
  return parts.join('');
}
