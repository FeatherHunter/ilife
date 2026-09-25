/** portion-gauge · **渲染**（纯函数产 HTML；本件只有换算三栏一种骨架）。
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
 *  三条硬口径（判据断的就是它们）：
 *   · **算数不在这里**：克数串、百分比、菜谱串都在 `model.ts` 算好；这一支只把**算好的数**
 *     写进两处（行头与换算栏各一处），静态规则一律住 `style.ts`；
 *   · **换算链三栏的数是同一份真值**：行头那句合计与右栏那个数是**同一个串**，
 *     出处句与左栏那个数是**同一个串**，占比那句的字与占比条的宽度是**同一个数**；
 *   · **本件不带可点元素、不带脚本**：没有 `runtime.ts`；调用方把某一行包成入口时，
 *     件里那条 `:focus-visible` 地板保证焦点看得见（见 `README.md`）。
 */
import { esc } from '../shared/escape.js';
import { PORTION_GAUGE_CLASS, portionGaugeSlot, type PortionGaugeForm } from './attrs.js';
import { normalizePortionGauge, type PortionGaugeModel, type PortionGaugeRowModel } from './model.js';

/** 卡头：标题 ＋ 口径那枚 ＋ 换算基准。 */
function headHtml(m: PortionGaugeModel): string {
  const parts: string[] = ['<div class="' + portionGaugeSlot('hd') + '">'];
  parts.push('<h4 class="' + portionGaugeSlot('title') + '">' + esc(m.title) + '</h4>');
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

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<PortionGaugeForm, (m: PortionGaugeModel) => string>> = {
  convert: renderConvert,
};

/** 渲染份量换算（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderPortionGauge(input: unknown): string {
  const m = normalizePortionGauge(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + PORTION_GAUGE_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
