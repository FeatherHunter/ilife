/** invoice-lines · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **说不出「为什么」的减项／加项一律拒**：这一件重做就是为了让每行读得出原因；
 *   3. **算得出来的都不许调用方再给**：实付金额、比原价少了多少、合几折、均摊每人多少、
 *      瀑布条的段宽，全部本件算——同一个数两处算，偏差无处可查。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  INVOICE_LINES_DECIMALS,
  INVOICE_LINES_FORMS,
  INVOICE_LINES_KIND_MARKS,
  INVOICE_LINES_SEGMENT_MIN_PCT,
  INVOICE_LINES_SHARE_WORD,
  INVOICE_LINES_SYMBOL,
  INVOICE_LINES_TOTAL_LABEL,
  INVOICE_LINE_KINDS,
  type InvoiceLine,
  type InvoiceLineKind,
  type InvoiceLinesForm,
  type InvoiceShare,
} from './attrs.js';

/** 归一化后的一行。 */
export interface InvoiceLineModel {
  readonly label: string;
  readonly kind: InvoiceLineKind;
  /** 正的量（原样留着：算总账用它）。 */
  readonly amount: number;
  /** 屏上那个金额（含符号与千分位：`−¥12.00`）。 */
  readonly amountText: string;
  readonly why?: string;
}

/** 瀑布条里的一段（段宽与金额等比）。 */
export interface InvoiceSegmentModel {
  readonly kind: 'total' | 'cut';
  readonly label: string;
  readonly amountText: string;
  /** 段宽（百分比，**两位小数**；这一段的金额 ÷ 条长满分）。 */
  readonly pct: number;
  /** 段够不够宽到能写字（不够就不写——金额仍然在图例里逐行出）。 */
  readonly wide: boolean;
}

/** 归一化后的入参。 */
export interface InvoiceLinesModel {
  readonly form: InvoiceLinesForm;
  readonly lines: readonly InvoiceLineModel[];
  /** 原价（第一行）。 */
  readonly base: number;
  readonly baseText: string;
  /** 减项合计（正数）。 */
  readonly cuts: number;
  /** 加项合计（正数）。 */
  readonly adds: number;
  /** 实付 ＝ 原价 − 减项合计 ＋ 加项合计。 */
  readonly total: number;
  readonly totalText: string;
  readonly totalLabel: string;
  readonly symbol: string;
  /** 实付行副语前半句（「比原价少 ¥34.00」／「比原价多 ¥8.00」／「与原价相同」）。 */
  readonly deltaText: string;
  /** 实付行副语里的折扣句（「合 8.04 折」）；没有减项时 `undefined`。 */
  readonly discountText?: string;
  /** 均摊那句（「均摊 2 人，每人 ¥67.00」）；没给 `share` 时 `undefined`。 */
  readonly shareText?: string;
  /** 均摊除不尽时那句补充。 */
  readonly shareNote?: string;
  /** 瀑布条的段（实付 ＋ 各减项，按行序）。 */
  readonly segments: readonly InvoiceSegmentModel[];
  /** 瀑布条的满分（原价 ＋ 加项合计）：段宽的分母。 */
  readonly span: number;
  readonly spanText: string;
  readonly note: readonly string[];
  readonly extraClass?: string;
}

/** 千分位（自算、不依赖 locale：同一入参在任何机器上排一样，判据才断得准）。 */
function groupThousands(s: string): string {
  const dot = s.indexOf('.');
  const int = dot < 0 ? s : s.slice(0, dot);
  const frac = dot < 0 ? '' : s.slice(dot);
  const sign = int.startsWith('-') ? '-' : '';
  const digits = sign === '' ? int : int.slice(1);
  const parts: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) parts.unshift(digits.slice(Math.max(0, i - 3), i));
  return sign + parts.join(',') + frac;
}

/** 金额 → 屏上的字（钱按两位小数：`1,093.25`）。 */
export function formatInvoiceAmount(value: number): string {
  if (!Number.isFinite(value)) badInput('invoice-lines: 要排的金额必须是有限数');
  return groupThousands((Math.round(Math.abs(value) * 100) / 100).toFixed(INVOICE_LINES_DECIMALS));
}

/** 有限数（必填）。 */
function reqNum(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数字');
  return value;
}

/** 一行：校验 ＋ 排金额（`money` 是**已经带上钱符号**的那条排法，本件只造一份）。 */
function lineModel(value: unknown, index: number, money: (n: number) => string): InvoiceLineModel {
  const field = 'invoice-lines: input.lines[' + index + ']';
  assertPlainObject(value, field);
  const raw = value as InvoiceLine;
  const kindGiven: unknown = raw.kind;
  if (!(INVOICE_LINE_KINDS as readonly unknown[]).includes(kindGiven)) {
    badInput(field + '.kind 必须是 ' + INVOICE_LINE_KINDS.join('／') + ' 之一');
  }
  const kind = kindGiven as InvoiceLineKind;
  if (index === 0 && kind !== 'base') badInput(field + '：第一行必须是 kind: "base" 的原价（没有原价就没有「拆」这件事）');
  if (index > 0 && kind === 'base') badInput(field + '：原价只许出现在第一行');
  const amount = reqNum(raw.amount, field + '.amount');
  if (amount <= 0) badInput(field + '.amount 必须是**正的量**（符号由 kind 定：减项前面挂 −）');
  const why = optText(raw.why, field + '.why');
  if (kind !== 'base' && why === undefined) {
    badInput(field + '.why 必填（' + (kind === 'cut' ? '减项' : '加项')
      + '说不出「为什么」，这一行就只剩一个金额——正是本件要替掉的那种读法）');
  }
  return {
    label: reqText(raw.label, field + '.label'),
    kind,
    amount,
    amountText: INVOICE_LINES_KIND_MARKS[kind] + money(amount),
    why,
  };
}

/** 串或串数组 → 段数组（与 `page-head` 同口径）。 */
function textList(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') {
    const one = optText(value, field);
    return one === undefined ? [] : [one];
  }
  if (!Array.isArray(value)) badInput(field + ' 必须是字符串，或字符串数组（逐段一枚）');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const one = optText(value[i], field + '[' + i + ']');
    if (one !== undefined) out.push(one);
  }
  return out;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `InvoiceLinesModel`。 */
export function normalizeInvoiceLines(input: unknown): InvoiceLinesModel {
  assertPlainObject(input, 'renderInvoiceLines: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? INVOICE_LINES_FORMS[0] : raw.form;
  if (!(INVOICE_LINES_FORMS as readonly unknown[]).includes(form)) {
    badInput('invoice-lines: input.form 必须是 ' + INVOICE_LINES_FORMS.join('／') + ' 之一');
  }

  const given: unknown = raw.lines;
  if (!Array.isArray(given)) badInput('invoice-lines: input.lines 必须是数组');
  if (given.length < 2) {
    badInput('invoice-lines: input.lines 至少要两行（只有原价＝没得拆；只有一行减项＝没有原价可比）');
  }
  /* 钱符号先定下来：**每一行的金额都带它**（只有实付带符号、减项不带，读者会以为减项不是钱）。 */
  const symbol = optText(raw.symbol, 'invoice-lines: input.symbol') ?? INVOICE_LINES_SYMBOL;
  const totalLabel = optText(raw.totalLabel, 'invoice-lines: input.totalLabel') ?? INVOICE_LINES_TOTAL_LABEL;
  const money = (n: number): string => symbol + formatInvoiceAmount(n);
  const lines = given.map((l, i) => lineModel(l, i, money));

  const baseLine = lines[0];
  const base = baseLine.amount;
  let cuts = 0;
  let adds = 0;
  for (const line of lines) {
    if (line.kind === 'cut') cuts += line.amount;
    else if (line.kind === 'add') adds += line.amount;
  }
  cuts = Math.round(cuts * 100) / 100;
  adds = Math.round(adds * 100) / 100;
  const total = Math.round((base - cuts + adds) * 100) / 100;
  if (total < 0) badInput('invoice-lines: 减项合计超过了原价（实付成了负数：' + money(total) + '）——先核对这几行的金额');

  const diff = Math.round((base - total) * 100) / 100;
  const deltaText = diff > 0 ? '比原价少 ' + money(diff)
    : (diff < 0 ? '比原价多 ' + money(-diff) : '与原价相同');
  /* 折扣：**折**是按十成算的（实付 ÷ 原价 × 10），不是百分数 —— 134／168 ＝ 8.0 折。 */
  const discountText = diff > 0 && base > 0
    ? '合 ' + (Math.round((total / base) * 100) / 10).toFixed(1) + ' 折'
    : undefined;

  /* 均摊：写进实付那一行的副语。除不尽时**说清差的那几分钱去哪了**，不四舍五入糊过去。 */
  let shareText: string | undefined;
  let shareNote: string | undefined;
  const shareGiven: unknown = raw.share;
  if (shareGiven !== undefined) {
    assertPlainObject(shareGiven, 'invoice-lines: input.share');
    const share = shareGiven as InvoiceShare;
    const people = reqNum(share.people, 'invoice-lines: input.share.people');
    if (!Number.isInteger(people) || people < 2) badInput('invoice-lines: input.share.people 必须是 >= 2 的整数');
    const each = Math.round((total / people) * 100) / 100;
    shareText = INVOICE_LINES_SHARE_WORD + ' ' + String(people) + ' 人，每人 ' + money(each);
    const rest = Math.round((total - each * people) * 100) / 100;
    shareNote = optText(share.note, 'invoice-lines: input.share.note')
      ?? (rest === 0 ? undefined
        : '除不尽：先按每人 ' + money(each) + ' 算，差的 ' + money(rest) + ' 记在付款人头上');
  }

  /* 瀑布条：条长满分 ＝ 原价 ＋ 加项合计（减项与实付合起来正好铺满；加项自己抬高了起点）。 */
  const span = Math.round((base + adds) * 100) / 100;
  const pctOf = (n: number): number => Math.round((n / span) * 10000) / 100;
  const segments: InvoiceSegmentModel[] = [{
    kind: 'total',
    label: totalLabel,
    amountText: money(total),
    pct: pctOf(total),
    wide: pctOf(total) >= INVOICE_LINES_SEGMENT_MIN_PCT,
  }];
  for (const line of lines) {
    if (line.kind !== 'cut') continue;
    const pct = pctOf(line.amount);
    segments.push({
      kind: 'cut', label: line.label, amountText: line.amountText, pct, wide: pct >= INVOICE_LINES_SEGMENT_MIN_PCT,
    });
  }

  return {
    form: form as InvoiceLinesForm,
    lines,
    base,
    baseText: money(base),
    cuts,
    adds,
    total,
    totalText: money(total),
    totalLabel,
    symbol,
    deltaText,
    discountText,
    shareText,
    shareNote,
    segments,
    span,
    spanText: money(span),
    note: textList(raw.note, 'invoice-lines: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'invoice-lines: input.extraClass'),
  };
}
