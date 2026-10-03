/** entry-card · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 纸内明细卡（一张卡里一串带编号的明细行）——
 *
 *  它是什么：一个卡容器（原型 `.entry-card`：暖底 ＋ 发丝线外框 ＋ 12px 圆角）抱住一列 `<li>`；
 *  每行是「编号胶囊 ・ 正文（主行 ＋ 次行）・ 右侧金额」，实付那一行另出一层高亮底。
 *  判地＝`docs/skills/skill-bill/proto/query/w01-查今天-v2.1.html` 的内嵌 <style>；
 *  同族先例＝`say-field`／`say-opt`（照它们的出口四件套、类名槽助手与归一化写法）。
 *  它替掉哪几种错法：
 *   · 各技能各自拼明细行 —— 卡底／行间点线／编号胶囊三处各写一份，同一页上两处明细长得不一样；
 *   · 拿表格装明细 —— 列名要重复一遍、窄屏出横向滚动条；
 *   · 编号交给 CSS counter 或干脆不编号 —— 正文里「编号 1、2 ／ 共 2 笔」那种对账对不上，
 *     读屏也读不出「这是第几行」（本件的编号是**真实元素**，一个 `<span>` 一个字）；
 *   · 实付那一行只靠一个颜色混在普通行里 —— 换个皮肤就读不出「这一行是实付」。
 *  它不管什么：不管数据（不查库、不排序、不汇总、不格式化金额）、不管卡外的节标题与页码、
 *  不管点击与展开（本件没有运行时段）、不管编号的语义（显式给了就照抄，没给就按位次 1..n）。
 */
import { esc } from '../shared/escape.js';
import { assertDenseArray, assertPlainObject, badInput, optText, reqText } from '../shared/validate.js';

/** 本件的类名根（**常量只住这里**：样式从这里取，不各写一份）。 */
export const ENTRY_CARD_CLASS = 'ilife-block-entry-card';
/** 槽位闭集（表 ・ 行 ・ 实付行 ・ 编号胶囊 ・ 正文 ・ 次行 ・ 等宽片段 ・ 金额）。 */
export const ENTRY_CARD_SLOTS = ['rows', 'row', 'pay', 'idx', 'text', 'sub', 'mono', 'amt'] as const;
export type EntryCardSlot = (typeof ENTRY_CARD_SLOTS)[number];
/** 槽类名（唯一拼法）。 */
export function entryCardSlot(slot: EntryCardSlot, prefix = 'ilife-'): string {
  return prefix + 'block-entry-card-' + slot;
}
/** 一条明细（6 位）。 */
export interface EntryCardEntry {
  /** 编号胶囊里的字（不给＝按它在 `entries` 里的位次 1..n）。 */
  readonly index?: number | string;
  /** 主行（备注那一行；必填）。 */
  readonly title: string;
  /** 次行纯文本（分类 ・ 账户 …）。 */
  readonly sub?: string;
  /** 次行里的等宽片段（时间戳那一档；跟在 `sub` 后面、同住 `-sub` 那格）。 */
  readonly subMono?: string;
  /** 次行整段的**受信透传** HTML（要给「分类 ・ 等宽时间 ・ #编号」这种交错片段时用它；
   *  与 `sub`／`subMono` 互斥；不许含会提前关掉外层标签的闭合标签）。 */
  readonly subHtml?: string;
  /** 右侧金额文本（**照抄**；本件不格式化数字、不算合计）。 */
  readonly amount?: string;
  /** 实付那一行：整行出一层高亮底 ＋ 描边（判地 `li.pay`）。 */
  readonly pay?: boolean;
}
/** entry-card 入参（一位：一串明细）。 */
export interface EntryCardInput {
  /** 明细逐条（**非空**：一条都没有＝调用方该改出空态那一件，本件不产空卡）。 */
  readonly entries: readonly EntryCardEntry[];
}
/** 归一化后的一条明细（内部形态；`index` 已经定下来是哪个字）。 */
export interface EntryCardEntryModel {
  readonly index: string;
  readonly title: string;
  readonly sub?: string;
  readonly subMono?: string;
  readonly subHtml?: string;
  readonly amount?: string;
  readonly pay: boolean;
}
/** 归一化后的入参（内部形态）。 */
export interface EntryCardModel {
  readonly entries: readonly EntryCardEntryModel[];
}
/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['entries'];
/** 一条明细只许带的键。 */
const ENTRY_KEYS: readonly string[] = ['index', 'title', 'sub', 'subMono', 'subHtml', 'amount', 'pay'];

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}
/** 可选布尔（本件与 `say-field`／`say-opt` 各持一份：`shared/validate.ts` 不在 #1114 的写集里，不许顺手改它）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔值');
  return value;
}
/** 编号：≥1 的整数，或非空字符串（不给＝按位次 1..n）。 */
function normIndex(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1) badInput(field + ' 必须是 ≥1 的整数');
    return String(value);
  }
  if (typeof value === 'string') {
    if (value === '') badInput(field + ' 不能是空串（不给这一位就是按位次编号）');
    return value;
  }
  badInput(field + ' 必须是整数或字符串');
}
/** 一条明细的归一化。 */
function normalizeEntry(one: unknown, i: number): EntryCardEntryModel {
  const at = 'renderEntryCard: input.entries[' + String(i) + ']';
  assertPlainObject(one, at);
  const raw = one as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput(at + ' 不得含内联事件字段：' + k);
  assertKeys(raw, ENTRY_KEYS, at);
  const sub = optText(raw.sub, at + '.sub');
  const subMono = optText(raw.subMono, at + '.subMono');
  const subHtml = optText(raw.subHtml, at + '.subHtml');
  if (subHtml !== undefined && (sub !== undefined || subMono !== undefined)) {
    badInput(at + '.subHtml 与 .sub／.subMono 二选一（透传那一格自己就是整段次行）');
  }
  if (subHtml !== undefined) {
    // 受信透传也要挡这一下：次行住在一个 <span> 里，混进下列闭合标签会把外层标签**提前关掉**，
    // 后面的行与页面其余部分就跑到卡外面去了（标记本身照样"渲染成功"，错处在版式上）。
    // `</span>` 不挡：判地次行里本来就嵌着一个 <span class="mono">，配平的那种是**正当**透传。
    const closed = /<\/(?:li|ol|div)\b/i.exec(subHtml);
    if (closed !== null) badInput(at + '.subHtml 不许含 ' + closed[0] + '（那会把外层标签提前关掉）');
  }
  return {
    index: normIndex(raw.index, at + '.index') ?? String(i + 1),
    title: reqText(raw.title, at + '.title'),
    sub,
    subMono,
    subHtml,
    amount: optText(raw.amount, at + '.amount'),
    pay: optBool(raw.pay, at + '.pay') === true,
  };
}
/** 入参归一化（唯一入口：`renderEntryCard` 只吃它产出的模型）。 */
export function normalizeEntryCard(input: unknown): EntryCardModel {
  assertPlainObject(input, 'renderEntryCard: input');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput('renderEntryCard: input 不得含内联事件字段：' + k);
  assertKeys(raw, ROOT_KEYS, 'renderEntryCard: input');
  const list = raw.entries;
  if (list === undefined) badInput('renderEntryCard: input.entries 必须给（这一件就是那张卡）');
  if (!Array.isArray(list)) badInput('renderEntryCard: input.entries 必须是数组');
  if (list.length === 0) badInput('renderEntryCard: input.entries 一条都没有（空卡不产：那种页面该用空态件）');
  assertDenseArray(list, 'renderEntryCard: input.entries');
  const entries = (list as readonly unknown[]).map((one, i) => normalizeEntry(one, i));
  return { entries };
}
/** 次行那一格（纯文本 ＋ 等宽片段，或整段透传；三样都不给就不出这一格）。 */
function subLine(e: EntryCardEntryModel): string {
  if (e.subHtml !== undefined) return '<span class="' + entryCardSlot('sub') + '">' + e.subHtml + '</span>';
  if (e.sub === undefined && e.subMono === undefined) return '';
  const mono = e.subMono === undefined
    ? '' : '<span class="' + entryCardSlot('mono') + '">' + esc(e.subMono) + '</span>';
  return '<span class="' + entryCardSlot('sub') + '">'
    + (e.sub === undefined ? '' : esc(e.sub)) + mono + '</span>';
}
/** 渲染一张卡（纯函数：同样入参恒产同样字节；只有读数面经 `esc`，`subHtml` 原样透传）。 */
export function renderEntryCard(input: unknown): string {
  const m = normalizeEntryCard(input);
  const rows = m.entries.map((e) => {
    const cls = entryCardSlot('row') + (e.pay ? ' ' + entryCardSlot('pay') : '');
    return '<li class="' + cls + '">'
      + '<span class="' + entryCardSlot('idx') + '">' + esc(e.index) + '</span>'
      + '<span class="' + entryCardSlot('text') + '">' + esc(e.title) + subLine(e) + '</span>'
      + (e.amount === undefined ? '' : '<span class="' + entryCardSlot('amt') + '">' + esc(e.amount) + '</span>')
      + '</li>';
  }).join('');
  return '<div class="' + ENTRY_CARD_CLASS + '">'
    + '<ol class="' + entryCardSlot('rows') + '">' + rows + '</ol></div>';
}
