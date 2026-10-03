/** sheet-head · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  ——票据纸页头（店头三行：品牌行 ＋ 结论标题 ＋ 副题）——
 *  判地＝`docs/skills/skill-bill/proto/acct-goal/` 十三件 v2.2 的 `.shop-head`；同族先例＝`sheet-frame`／`ticket-button`。
 *  它替掉哪几种错法：各域自己拼店头（品牌行／标题／副题三处各写一份，页与页之间字号与间距走散）；
 *  标题里的强调片段被整段转义（判地 `.hl` 那一段是**受信 HTML**，本件照透传）。
 *  它不管：页的其余部分（纸／段／按钮区）、标题里该不该有强调（那是调用方的事）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput } from '../shared/validate.js';

/** 本件的类名根（常量只住这里：样式从这里取，不各写一份）。 */
export const SHEET_HEAD_CLASS = 'ilife-sheet-head';
/** 三行的类名（唯一拼法）。 */
export const SHEET_HEAD_SLOTS = ['eyebrow', 'title', 'sub'] as const;
export type SheetHeadSlot = (typeof SHEET_HEAD_SLOTS)[number];
/** 槽类名。 */
export function sheetHeadSlot(slot: SheetHeadSlot, prefix = 'ilife-'): string {
  return prefix + 'sheet-' + slot;
}
/** 入参（四位）。 */
export interface SheetHeadInput {
  /** 品牌行（转义后上屏，如「饼干记账 · 新增账户」）。 */
  readonly brand: string;
  /** 结论标题（**受信 HTML**：调用方负责转义；判地允许内嵌 `<span class="hl">`）。 */
  readonly titleHtml: string;
  /** 副题（空串＝不出这一行）。 */
  readonly sub?: string;
}
/** 归一化后的入参。 */
export interface SheetHeadModel {
  readonly brand: string;
  readonly titleHtml: string;
  readonly sub?: string;
}
const ROOT_KEYS: readonly string[] = ['brand', 'titleHtml', 'sub'];
/** 入参归一化（唯一入口）。 */
export function normalizeSheetHead(input: unknown): SheetHeadModel {
  assertPlainObject(input, 'sheet-head');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (!ROOT_KEYS.includes(k)) badInput('sheet-head 不认识这个键：' + k);
  // **既有调用方零回归**（#1123 教训）：三格都收空串（落地前的 `sheetHead` 没有非空校验）。
  const str = (v: unknown): string => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
  const brand = str(raw.brand);
  const titleHtml = str(raw.titleHtml);
  const sub = str(raw.sub);
  return { brand, titleHtml, ...(sub === undefined || sub === '' ? {} : { sub }) };
}
/** 产店头三行（默认档＝判地那一版；字节与 skill 侧 `sheetHead` 逐字相同）。 */
export function renderSheetHead(input: unknown): string {
  const m = normalizeSheetHead(input);
  return '<header class="' + SHEET_HEAD_CLASS + '">'
    + '<p class="' + sheetHeadSlot('eyebrow') + '">' + esc(m.brand) + '</p>'
    + '<h1 class="' + sheetHeadSlot('title') + '">' + m.titleHtml + '</h1>'
    + (m.sub === undefined ? '' : '<p class="' + sheetHeadSlot('sub') + '">' + esc(m.sub) + '</p>')
    + '</header>';
}
