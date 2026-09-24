/** page-head · **渲染**（纯函数产 HTML；本件只有形态 B「读数当第二行」一种骨架）。
 *
 *  —— 形态 B：读数当第二行 ——
 *
 *  第一行是「这一页叫什么」（眉标 ＋ `<h1>` 并成一排），**第二行是那个数**（大字），
 *  之后才是副题（时间窗／范围／条数）与口径行（这一页的数字怎么算的）。
 *  它替掉的两种错法：
 *   · 把口径写成一句灰字塞在标题下面 —— 读者分不清哪一行是「标题」、哪一行是「算法说明」；
 *   · 主读数与标题抢同一行 —— 窄容器下标题被挤成一列孤字，主读数被压成正文大小。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 主读数字号**严格大于**页标题，且**不小于正文的 2 倍**（尺寸事实住在 `style.ts` 的
 *     `PAGE_HEAD_READING_SCALE`，随皮肤一起缩放）；
 *   · 长标题／眉标／副题**不许 `…` 截断**（可以换行）；
 *   · 标记里**不写分隔符与缺省占位**：段间分隔由列距与发丝线承担；缺值写成 `—`。
 */
import { esc } from '../shared/escape.js';
import {
  PAGE_HEAD_CALIBER_LABEL,
  PAGE_HEAD_CLASS,
  PAGE_HEAD_FORMS,
  pageHeadSlot,
  type PageHeadForm,
} from './attrs.js';
import { normalizePageHead, type PageHeadModel } from './model.js';

/** 眉标：品牌位（技能名）＋ 范围位（域），中间那条细竖线由样式的 `::before` 画。 */
function eyebrowHtml(m: PageHeadModel): string {
  const parts: string[] = ['<p class="' + pageHeadSlot('eyebrow') + '">'];
  parts.push('<i class="' + pageHeadSlot('mark') + '" aria-hidden="true"></i>');
  parts.push('<b class="' + pageHeadSlot('skill') + '">' + esc(m.skill) + '</b>');
  if (m.domain !== undefined) {
    parts.push('<span class="' + pageHeadSlot('domain') + '">' + esc(m.domain) + '</span>');
  }
  parts.push('</p>');
  return parts.join('');
}

/** 主读数行：值（＋单位）／分母／说明——附属位比值小一号，随 `flex-wrap` 自己折行。 */
function readingHtml(m: PageHeadModel): string {
  const r = m.reading;
  const parts: string[] = ['<p class="' + pageHeadSlot('reading') + '">'];
  parts.push('<b class="' + pageHeadSlot('value') + '">' + esc(r.value)
    + (r.unit === undefined ? '' : '<small class="' + pageHeadSlot('unit') + '">' + esc(r.unit) + '</small>')
    + '</b>');
  if (r.denominator !== undefined) {
    parts.push('<span class="' + pageHeadSlot('denominator') + '">' + esc(r.denominator) + '</span>');
  }
  if (r.note !== undefined) {
    parts.push('<span class="' + pageHeadSlot('note') + '">' + esc(r.note) + '</span>');
  }
  parts.push('</p>');
  return parts.join('');
}

/** 逐段一枚 `<span>`（**不写分隔符**：段间那道缝由样式的列距／发丝线承担）。 */
function segmentHtml(slot: 'sub', segments: readonly string[]): string {
  const spans = segments.map((s) => '<span>' + esc(s) + '</span>').join('');
  return '<p class="' + pageHeadSlot(slot) + '">' + spans + '</p>';
}

/** 口径行：左端一枚标签（「口径」）＋ 逐段一枚 `<span>`（段间一条发丝线）。 */
function caliberHtml(segments: readonly string[]): string {
  const spans = segments.map((s) => '<span>' + esc(s) + '</span>').join('');
  return '<p class="' + pageHeadSlot('caliber') + '"><b>' + esc(PAGE_HEAD_CALIBER_LABEL) + '</b>' + spans + '</p>';
}

/** 形态 B 的骨架。**眉标与页标题住在同一排**（`top`）——正是这一步让主读数落成「第二行」：
 *  拆成两排的话，读数是第三行，形态就变了。容器够窄时眉标与工具位自己折上去，标题不掉字。 */
function renderHero(m: PageHeadModel): string {
  const parts: string[] = [];
  parts.push('<div class="' + pageHeadSlot('top') + '">');
  parts.push(eyebrowHtml(m));
  parts.push('<h1 class="' + pageHeadSlot('title') + '">' + esc(m.title) + '</h1>');
  if (m.tool !== undefined) {
    parts.push('<span class="' + pageHeadSlot('tool') + '">' + esc(m.tool) + '</span>');
  }
  parts.push('</div>');
  parts.push(readingHtml(m));
  if (m.sub.length > 0) parts.push(segmentHtml('sub', m.sub));
  if (m.caliber.length > 0) parts.push(caliberHtml(m.caliber));
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<PageHeadForm, (m: PageHeadModel) => string>> = {
  hero: renderHero,
};

/** 渲染页头（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderPageHead(input: unknown): string {
  const m = normalizePageHead(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + PAGE_HEAD_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
