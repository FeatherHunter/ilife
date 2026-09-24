/** section-head · **渲染**（纯函数产 HTML；本件只有形态 C「可折叠小节」一种骨架）。
 *
 *  —— 形态 C：可折叠小节（原生 `details`，零脚本）——
 *
 *  骨架：根 `<details class="… is-fd">` → 标题行 `<summary class="…-sum">`（序号／标题／计数／展开指示）
 *  → 正文 `<div class="…-body">`。
 *
 *  它替掉的两种错法：
 *   · 标题长了就拿 `…` 截断 —— 标题与计数抢同一行，读者看到的是「红烧肉的做法（含腌…」；
 *   · 计数跟着标题一起被压没 —— 计数是「这一节有多少条」的唯一落点，掉了就没人知道有 11 味还是 1 味。
 *
 *  两条硬口径（判据断的就是它们）：
 *   · **零脚本**：开合走 `<details>` 原生行为，标记里没有一行 JS、没有内联事件处理器；
 *     「展开／收起」两枚字由样式的 `::before` 按 `[open]` 换 —— 换字不跳版（`::after` 只旋转箭头）。
 *   · **标记里不写分隔符**：序号／标题／计数／指示之间的缝由样式的列距承担。
 */
import { esc } from '../shared/escape.js';
import {
  SECTION_HEAD_CLASS,
  sectionHeadSlot,
  type SectionHeadForm,
  type SectionHeadInput,
  type SectionHeadSlot,
} from './attrs.js';
import { normalizeSectionHead, type SectionHeadModel } from './model.js';

/** 序号的上屏字：十进、不补零（补零只在等宽对齐的账目里有意义）。 */
export function sectionHeadOrdinalText(seq: number): string {
  return String(seq);
}

/** 形态键 → 形态类名（**闭集里那一格**；`Record<SectionHeadForm, …>` 让"加了形态却忘了补类名"当场红）。 */
const FORM_SLOTS: Readonly<Record<SectionHeadForm, SectionHeadSlot>> = Object.freeze({
  fd: 'form-fd',
});

/** 根上的属性：形态类总是出，`id`／`open` 给了才出。 */
function rootAttrs(m: SectionHeadModel): string {
  let out = ' class="' + SECTION_HEAD_CLASS + ' ' + sectionHeadSlot(FORM_SLOTS[m.form])
    + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '"';
  if (m.id !== undefined) out += ' id="' + esc(m.id) + '"';
  if (m.open) out += ' open';
  return out;
}

/** 标题行：序号（可省）／标题／计数（可省）／展开指示（恒出）。 */
function summaryHtml(m: SectionHeadModel): string {
  const parts: string[] = ['<summary class="' + sectionHeadSlot('sum') + '">'];
  if (m.seq !== undefined) {
    /* 序号是**呈现位**：读屏从标题就知道这是什么，序号读出来只是噪音（`aria-hidden`）。 */
    parts.push('<span class="' + sectionHeadSlot('ordinal') + '" aria-hidden="true">'
      + esc(sectionHeadOrdinalText(m.seq)) + '</span>');
  }
  parts.push('<h4 class="' + sectionHeadSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.count !== undefined) {
    parts.push('<span class="' + sectionHeadSlot('count') + '">' + esc(m.count) + '</span>');
  }
  /* 展开指示是**空元素**：两枚字与箭头都由样式出（这样"展开／收起"的换字不用一行脚本）。 */
  parts.push('<span class="' + sectionHeadSlot('more') + '"></span>');
  parts.push('</summary>');
  return parts.join('');
}

/** 形态 C 的骨架。正文受信透传：`body` 是调用方已渲染好的标记，本件只把它放进正文槽、不再加壳。 */
function renderFolded(m: SectionHeadModel): string {
  return '<details' + rootAttrs(m) + '>' + summaryHtml(m)
    + '<div class="' + sectionHeadSlot('body') + '">' + m.body + '</div></details>';
}

const RENDERERS: Readonly<Record<SectionHeadForm, (m: SectionHeadModel) => string>> = Object.freeze({
  fd: renderFolded,
});

/** 可折叠小节头：一节的标题行 ＋ 可折叠正文。纯函数产标记，零 DOM、零脚本。 */
export function renderSectionHead(input: SectionHeadInput): string {
  const m = normalizeSectionHead(input);
  const render = RENDERERS[m.form];
  return render(m);
}
