/** portion-gauge · **渲染**（纯函数产 HTML；本件两档骨架：A 量感条／B 换算三栏）。
 *
 *  —— 形态 `convert`：换算三栏 ——
 *
 *  一行一样食材，每行三栏：第一栏是菜谱写的那一句（`2 份`），第二栏是营养库认的那一句
 *  （`700 g`），第三栏是实物占比（占比条 ＋ `占一天蛋白 70%`）。行头写清食材名、
 *  出处与这一行合计多少克，脚注写口径，缺换算的另起一行只报数。
 *  它替掉的两种错法：
 *   · 只给克数 —— 人对着 `200 g` 不知道这是多是少；
 *   · 单位靠人自己心算 —— 菜谱的份碗把与营养库的克各说各的。
 *
 *  —— 形态 `gauge`：量感条（占上限几成 ＋ 两条参照刻度）——
 *
 *  一条尺子（量程＝0…上限）：余量底是一根发丝线、已用那一段压在它上面、刻度是竖线（三级重量）；
 *  上面一档大字是占比，两枚参照刻度值（一餐建议／一天上限）**一高一低挂在自己那枚刻度上**；
 *  最下面一行是实物参照（`≈ 1 个拳头 ＋ 2 汤勺`）。
 *  它替掉的那一种错法：**只报一个百分比**（58% 是多少，人对着手比不出来）。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **算数不在这里**：克数串、百分比、菜谱串、刻度位置、无障碍名都在 `model.ts` 算好；
 *     这一支只把**算好的数**写进它该去的地方，静态规则一律住 `style.ts`；
 *   · **同一份真值只印一次**：换算三栏的行头与换算栏同引一个串；量感条的占比大字、已用那一段的
 *     宽度、无障碍名里的百分比是**同一个数**（`usedPct`）；
 *   · **本件不带可点元素、不带脚本**：没有 `runtime.ts`；调用方把某一行包成入口时，
 *     件里那条 `:focus-visible` 地板保证焦点看得见（见 `README.md`）。
 */
import { esc } from '../shared/escape.js';
import { badInput } from '../shared/validate.js';
import { PORTION_GAUGE_CLASS, portionGaugeSlot, type PortionGaugeForm } from './attrs.js';
import {
  normalizePortionGauge,
  type PortionGaugeGaugeModel,
  type PortionGaugeModel,
  type PortionGaugeRowModel,
} from './model.js';

/** 卡头：标题（＋ A 档的「这一份叫什么」）＋ 口径那枚 ＋ 换算基准。 */
function headHtml(m: PortionGaugeModel): string {
  const parts: string[] = ['<div class="' + portionGaugeSlot('hd') + '">'];
  parts.push('<h4 class="' + portionGaugeSlot('title') + '">' + esc(m.title) + '</h4>');
  /* A 档才有「这一份叫什么」（`convert` 那一档的模型里 `gauge` 恒为 `null` ⇒ 这段不进标记）。 */
  if (m.gauge !== null) {
    parts.push('<b class="' + portionGaugeSlot('subject') + '">' + esc(m.gauge.name) + '</b>');
  }
  if (m.stamp !== undefined) {
    parts.push('<span class="' + portionGaugeSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  if (m.tail !== undefined) {
    parts.push('<span class="' + portionGaugeSlot('tail') + '">' + esc(m.tail) + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 一行：行头（名 ＋ 出处 ＋ 合计）→ 换算框（左栏 → 右栏）→ 实物占比（条 ＋ 那句）。 */
function rowHtml(r: PortionGaugeRowModel): string {
  const parts: string[] = ['<div class="' + portionGaugeSlot('row') + '">'];
  parts.push('<span class="' + portionGaugeSlot('head') + '">'
    + '<b class="' + portionGaugeSlot('name') + '">' + esc(r.name) + '</b>'
    + '<span class="' + portionGaugeSlot('sub') + '">' + esc(r.sub) + '</span>'
    + '<span class="' + portionGaugeSlot('same') + '">' + esc(r.gramsText) + '</span>'
    + '</span>');
  parts.push('<span class="' + portionGaugeSlot('eq') + '">'
    + '<span class="' + portionGaugeSlot('side') + '">'
    + '<b class="' + portionGaugeSlot('side-value') + '">' + esc(r.recipeText) + '</b>'
    + '<em class="' + portionGaugeSlot('side-label') + '">菜谱单位</em>'
    + '</span>'
    + '<span class="' + portionGaugeSlot('arrow') + '" aria-hidden="true">→</span>'
    + '<span class="' + portionGaugeSlot('side') + ' is-to">'
    + '<b class="' + portionGaugeSlot('side-value') + '">' + esc(r.gramsText) + '</b>'
    + '<em class="' + portionGaugeSlot('side-label') + '">' + esc(r.toLabelText) + '</em>'
    + '</span>'
    + '</span>');
  /* 占比条是纯装饰（那句占比已经把数说出来了）：填充宽度就是占比本身，与那句同源。 */
  parts.push('<span class="' + portionGaugeSlot('obj') + '">'
    + '<span class="' + portionGaugeSlot('bar') + '" aria-hidden="true">'
    + '<i class="' + portionGaugeSlot('fill') + '" style="width: ' + String(r.sharePct) + '%"></i>'
    + '</span>'
    + '<span class="' + portionGaugeSlot('share') + '">' + esc(r.shareText) + '</span>'
    + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 脚注一句人话 ＋（有缺换算时）缺的那一行。 */
function footHtml(m: PortionGaugeModel): string {
  const parts: string[] = ['<p class="' + portionGaugeSlot('note') + '">' + esc(m.note) + '</p>'];
  if (m.missingCount > 0) {
    /* 那个数在 `model.ts` 就定好形（与克数同一把分组）：这里只贴，不再自己 `String()` 一遍
       ——两处各拼一遍必然走散（同 `gramsText`／`shareText` 的口径）。 */
    parts.push('<p class="' + portionGaugeSlot('missing') + '">还差 ' + m.missingText
      + ' 样没有换算</p>');
  }
  return parts.join('');
}

/** 形态 `convert` 的骨架：卡头 → 一行一样 → 脚注。 */
function renderConvert(m: PortionGaugeModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + portionGaugeSlot('conv') + '">'
    + m.rows.map(rowHtml).join('') + '</div>');
  parts.push(footHtml(m));
  return parts.join('');
}

/** A 档那一份量感（归一化保证 `form === 'gauge'` 时它**不是** `null`；真缺了就当错报，不静默降级）。 */
function gaugeOf(m: PortionGaugeModel): PortionGaugeGaugeModel {
  if (m.gauge === null) badInput('portion-gauge: 形态 gauge 缺 input.gauge');
  return m.gauge;
}

/** 尺子：余量底 → 已用那一段 → 刻度竖线 → 参照刻度竖线（位置一律由 `model.ts` 定形）。 */
function railHtml(g: PortionGaugeGaugeModel): string {
  const parts: string[] = ['<span class="' + portionGaugeSlot('rail') + '" role="img" aria-label="'
    + esc(g.ariaText) + '">'];
  parts.push('<span class="' + portionGaugeSlot('rest') + '" aria-hidden="true"></span>');
  /* 已用那一段的宽度**就是占比本身**（与大字、与无障碍名同一个数）。 */
  parts.push('<span class="' + portionGaugeSlot('used') + '" aria-hidden="true" style="width: '
    + String(g.usedPct) + '%"></span>');
  for (const tick of g.ticks) {
    parts.push('<span class="' + portionGaugeSlot('tick') + (tick.major ? ' is-major' : '')
      + '" aria-hidden="true" style="' + tick.pos + '"></span>');
  }
  for (const mark of g.marks) {
    parts.push('<span class="' + portionGaugeSlot('mark') + ' is-' + mark.kind
      + '" aria-hidden="true" style="' + mark.pos + '"></span>');
  }
  parts.push('</span>');
  return parts.join('');
}

/** 形态 `gauge` 的骨架：卡头 → 占比大字 → 尺子（两枚参照刻度值 ＋ 轨道）→ 实物参照 →（给了才出）脚注。 */
function renderGauge(m: PortionGaugeModel): string {
  const g = gaugeOf(m);
  const parts: string[] = [headHtml(m)];
  parts.push('<p class="' + portionGaugeSlot('lead') + '"><b class="'
    + portionGaugeSlot('lead-value') + '">' + esc(g.usedText) + '</b></p>');
  const box: string[] = ['<span class="' + portionGaugeSlot('gauge') + '">'];
  /* 两枚参照刻度值一高一低：上面那行是上限，贴着轨道那行是建议（离得近的那一枚是「这一餐」）。 */
  box.push('<span class="' + portionGaugeSlot('mark-label') + ' is-cap" aria-hidden="true">'
    + esc(g.capLabel) + '</span>');
  if (g.refLabel !== undefined) {
    box.push('<span class="' + portionGaugeSlot('mark-label') + ' is-ref" aria-hidden="true"'
      + (g.refPad === undefined || g.refPad === '' ? '' : ' style="' + g.refPad + '"') + '>'
      + esc(g.refLabel) + '</span>');
  }
  box.push(railHtml(g));
  box.push('</span>');
  parts.push(box.join(''));
  if (g.equiv !== undefined) {
    parts.push('<p class="' + portionGaugeSlot('equiv') + '"><b>' + esc(g.equiv) + '</b></p>');
  }
  if (m.note !== '') parts.push('<p class="' + portionGaugeSlot('note') + '">' + esc(m.note) + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里；加形态就是在这里加一支）。 */
const SKELETONS: Readonly<Record<PortionGaugeForm, (m: PortionGaugeModel) => string>> = {
  convert: renderConvert,
  gauge: renderGauge,
};

/** 渲染份量换算（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderPortionGauge(input: unknown): string {
  const m = normalizePortionGauge(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + PORTION_GAUGE_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
