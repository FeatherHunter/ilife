/** say-opt · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 选填组（「补充选填项」那一折）——
 *
 *  它是什么：原生 <details> 一折 —— 收起时是一行表头（＋ ・ 组名 ・ 副语 ・ 计数），
 *  展开后是组内表单 ＋ 组尾提示行。即原型 `.say-opt`（判地＝
 *  `docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html` 的内嵌 <style>）。
 *  它替掉哪几种错法：
 *   · 选填项跟必填项混在一列里 —— 用户一屏看到十个格子，分不出哪几个可以不管；
 *   · 自己拿 div ＋ 脚本做折叠 —— 脚本没跑到就展不开，触屏上也点不动（原生 details 白送展开行为）；
 *   · 组内一个字段都没有也照样出一折 —— 点开来是空的，读数与实在的东西对不上。
 *  它不管什么：不管组内表单本身（`contentHtml` 是**受信透传**：只许传本层 `renderSayField` 的产物）、
 *  不管计数怎么算（`countText` 是调用方算好的读数 —— 本件没有运行时段，不会自己去数）、
 *  不管展开态的记忆（`open` 只是照抄进标记那一下）。
 */
import { assertPlainObject, badInput, optText, reqText } from '../shared/validate.js';
import { esc } from '../shared/escape.js';

/** 本件的类名根（**常量只住这里**：样式从这里取，不各写一份）。 */
export const SAY_OPT_CLASS = 'ilife-block-say-opt';
/** 槽位闭集（表头四格 ＋ 组内表单 ＋ 组尾提示行）。 */
export const SAY_OPT_SLOTS = ['lbl', 'plus', 'sub', 'cnt', 'form', 'note'] as const;
export type SayOptSlot = (typeof SAY_OPT_SLOTS)[number];
/** 槽类名（唯一拼法）。 */
export function sayOptSlot(slot: SayOptSlot, prefix = 'ilife-'): string {
  return prefix + 'block-say-opt-' + slot;
}
/** 本件出的字（表头那一枚是全角加号 —— 判地逐字：`＋`）。 */
export const SAY_OPT_TEXT = Object.freeze({ plus: '＋' });
/** say-opt 入参（6 位）。 */
export interface SayOptInput {
  /** 组名（如「补充选填项」）。 */
  readonly label: string;
  /** 副语：组里有哪些项（收起时也看得见的一句话）。 */
  readonly sub?: string;
  /** 计数读数（如「已补 2 项」；**调用方算好**，不给就不出那一格）。 */
  readonly countText?: string;
  /** 组内表单（**受信透传**：本层 `renderSayField` 的产物；原样进 HTML，不转义）。 */
  readonly contentHtml: string;
  /** 组尾提示行（如「不填就留空…」）。 */
  readonly note?: string;
  /** 渲染时就展开（`<details open>`）。 */
  readonly open?: boolean;
}
/** 归一化后的入参（内部形态）。 */
export interface SayOptModel {
  readonly label: string;
  readonly sub?: string;
  readonly countText?: string;
  readonly contentHtml: string;
  readonly note?: string;
  readonly open: boolean;
}
/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['label', 'sub', 'countText', 'contentHtml', 'note', 'open'];

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}
/** 可选布尔（本件与 `say-field` 各持一份：`shared/validate.ts` 不在 #1114 的写集里，不许顺手改它）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔值');
  return value;
}
/** 入参归一化（唯一入口：`renderSayOpt` 只吃它产出的模型）。 */
export function normalizeSayOpt(input: unknown): SayOptModel {
  assertPlainObject(input, 'renderSayOpt: input');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput('renderSayOpt: input 不得含内联事件字段：' + k);
  assertKeys(raw, ROOT_KEYS, 'renderSayOpt: input');
  const contentHtml = reqText(raw.contentHtml, 'renderSayOpt: input.contentHtml');
  // 受信透传也要挡这一下：组内表单里混进一个 </details> 会把这一折**提前关掉**，
  // 后面的提示行与页面其余部分就跑到折子外面去了（页面结构错位，而标记本身照样"渲染成功"）。
  if (/<\/details/i.test(contentHtml)) {
    badInput('renderSayOpt: input.contentHtml 不许含 </details>（那会把这一折提前关掉）');
  }
  return {
    label: reqText(raw.label, 'renderSayOpt: input.label'),
    sub: optText(raw.sub, 'renderSayOpt: input.sub'),
    countText: optText(raw.countText, 'renderSayOpt: input.countText'),
    contentHtml,
    note: optText(raw.note, 'renderSayOpt: input.note'),
    open: optBool(raw.open, 'renderSayOpt: input.open') === true,
  };
}
/** 渲染一折（纯函数：同样入参恒产同样字节；只有读数面经 `esc`，`contentHtml` 原样透传）。 */
export function renderSayOpt(input: unknown): string {
  const m = normalizeSayOpt(input);
  const parts: string[] = ['<details class="' + SAY_OPT_CLASS + '"' + (m.open ? ' open' : '') + '>'];
  parts.push('<summary>');
  parts.push('<span class="' + sayOptSlot('plus') + '">' + SAY_OPT_TEXT.plus + '</span>');
  parts.push('<span class="' + sayOptSlot('lbl') + '">' + esc(m.label) + '</span>');
  if (m.sub !== undefined) parts.push('<span class="' + sayOptSlot('sub') + '">' + esc(m.sub) + '</span>');
  if (m.countText !== undefined) parts.push('<span class="' + sayOptSlot('cnt') + '">' + esc(m.countText) + '</span>');
  parts.push('</summary>');
  parts.push('<div class="' + sayOptSlot('form') + '">' + m.contentHtml + '</div>');
  if (m.note !== undefined) parts.push('<p class="' + sayOptSlot('note') + '">' + esc(m.note) + '</p>');
  parts.push('</details>');
  return parts.join('');
}
