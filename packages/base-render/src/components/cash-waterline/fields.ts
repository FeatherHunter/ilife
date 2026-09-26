/** cash-waterline · **入参小件**（格式化与校验；三个形态共用同一批，故单独一份）。
 *
 *  为什么独立成件：`model.ts` 里三形态的归一化已经够长，再叠这批小件就过本包的行数告警线
 *  （350 行／LF 口径，见 `packages/base-render/AGENTS.md`）。分开之后：
 *   · **一个规矩只有一处**：「千分位／负号写法」「越界的报错句」「形态与读数对不上就拒」都只在本文件里；
 *   · **没有环**：本文件只依赖 `attrs.ts` 与 `shared/validate.ts`，`model.ts` 单向依赖它。
 *
 *  报错句的口径（别处也会读它）：每句都点名**路径**（`cash-waterline: input.days[2].pct`）与**为什么**——
 *  调用方按句自证，皮肤矩阵判据也按句补样例（见 `test/皮肤矩阵.test.mjs` 的 `repairOnce`）。
 */
import { assertPlainObject, badInput, reqText } from '../shared/validate.js';
import {
  CASH_WATERLINE_MAX_DAYS,
  CASH_WATERLINE_MAX_LABEL_CHARS,
  CASH_WATERLINE_MAX_LINES,
  CASH_WATERLINE_MAX_WEEKS,
  type CashWaterlineDay,
  type CashWaterlineFlowLine,
  type CashWaterlineWeek,
} from './attrs.js';

/* ── 格式化 ─────────────────────────────────────────────────────── */

/** 千分位：每三位插一个空格（与 `stacked-bar`／`progress-list` 同款；读数一律 `tabular-nums`）。 */
function group(s: string): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ' ';
    out += body[i];
  }
  return (neg ? '-' : '') + out;
}

/** 负号统一写 U+2212（与原型墙和 `invoice-lines` 的减项同一个字；ASCII `-` 在钱数里太短）。 */
function minus(s: string): string {
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}

/** 大数（`|n| ≥ 1e21`）会长成指数记法（`1e+21`）：那种串**一个分组都不能插**——
 *  插进去就成了「1. 797 693 134 862 315 7e+ 308」这种读不出来的东西（2026-09-25 审查席实测抓到）。
 *  指数记法与 `Number.MAX_VALUE` 一律由这里收口，统一写成 `1.8e+21` 这种干净形状
 *  （先例：`scatter-fit` 的 `plainText` 同一条口径）。 */
function plain(n: number): string {
  const s = String(n);
  if (!/[eE]/.test(s)) return s;
  return n.toExponential(2).replace(/\.?0+e/, 'e');
}

/** 机器数 → 屏上的字：整数走千分位；小数最多两位（末尾的 0 去掉）；指数记法原样（**不分组**）。 */
export function fmtQty(n: number): string {
  const p = plain(n);
  if (/[eE]/.test(p)) return p;
  if (Number.isInteger(n)) return minus(group(p));
  const rounded = Math.round(n * 100) / 100;
  const s = String(rounded);
  const dot = s.indexOf('.');
  return minus(group(s.slice(0, dot)) + s.slice(dot));
}

/** 百分数 → 一位小数；整数不写 `.0`；大到走指数记法时原样（不分组、不补小数点）。 */
export function fmtPct(pct: number): string {
  const r = Math.round(pct * 10) / 10;
  const p = plain(r);
  if (/[eE]/.test(p)) return p;
  return minus(Number.isInteger(r) ? String(r) : r.toFixed(1));
}

/* ── 数 ─────────────────────────────────────────────────────────── */

/** 必须是有限数。 */
export function reqFinite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是有限数');
  }
  return value;
}

/** 有限数且落在 `[min, max]` 里。 */
function reqInRange(value: unknown, field: string, min: number, max: number): number {
  const n = reqFinite(value, field);
  if (n < min || n > max) {
    badInput(field + ' 必须在 ' + String(min) + '–' + String(max) + ' 之间（拿到 ' + String(n) + '）');
  }
  return n;
}

/** 有限数且 `> 0`。 */
export function reqPositive(value: unknown, field: string): number {
  const n = reqFinite(value, field);
  if (n <= 0) badInput(field + ' 必须大于 0');
  return n;
}

/** 有限数且 `≥ 0`（那天花了多少：**负的花费不存在**，静默上屏一句「那天花 −100 元」是在替调用方编账）。 */
export function reqNonNegative(value: unknown, field: string): number {
  const n = reqFinite(value, field);
  if (n < 0) badInput(field + ' 必须 ≥ 0（那天不可能花负数）');
  return n;
}

/** 整数且落在 `[min, max]` 里。 */
export function reqInt(value: unknown, field: string, min: number, max: number): number {
  const n = reqFinite(value, field);
  if (!Number.isInteger(n) || n < min || n > max) {
    badInput(field + ' 必须是 ' + String(min) + '–' + String(max) + ' 之间的整数（拿到 ' + String(n) + '）');
  }
  return n;
}

/** 可选整数（给了才校验）。 */
export function optInt(value: unknown, field: string, min: number, max: number): number | undefined {
  return value === undefined ? undefined : reqInt(value, field, min, max);
}

/** 可选数（给了才校验）。 */
export function optInRange(value: unknown, field: string, min: number, max: number): number | undefined {
  return value === undefined ? undefined : reqInRange(value, field, min, max);
}

/** 非空数组（件自己的报错点名**至少要几个**，皮肤矩阵判据按这句补样例）。 */
function reqList(value: unknown, field: string, max: number, what: string): readonly Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) {
    badInput(field + ' 必须是非空数组（' + what + '；至少要 1 个）');
  }
  if (value.length > max) {
    badInput(field + ' 最多 ' + String(max) + ' 个（再多就请调用方先归并）');
  }
  return value as readonly Record<string, unknown>[];
}

/** **形态与读数对不上就拒**：别的形态的键出现在这一形态里 ⇒ `badInput`。 */
export function forbid(raw: Record<string, unknown>, form: string, keys: readonly string[]): void {
  for (const key of keys) {
    if (raw[key] !== undefined) {
      badInput('cash-waterline: 形态 `' + form + '` 不吃 input.' + key
        + '（那是别的形态的读数；换形态请把 input.form 一起换，本件不替你挑一个）');
    }
  }
}

/* ── 键表与「未知键一律拒」 ───────────────────────────────────────
 *  **键在不在表里**由这一节管（写错键名＝拒）；**形态对不对**仍归上面的 `forbid`（报错句更具体：
 *  它说得清"那是别的形态的读数"）。两者分工：本节的顶层表收**全部形态的入参面**（`attrs.ts` 的
 *  `CashWaterlineInput` 逐字段），故形态专属键由 `forbid` 拦、真正的未知键由本节拦。 */

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉——写错的键被吞掉时，
 *  屏上只是静静地少一块，调用方却以为自己设上了。
 *
 *  **两条路都要走**（只走 `Object.keys` 会漏掉一半）：
 *   · `Object.getOwnPropertyNames` —— 自有的**全部**键，含**不可枚举**的（`Object.keys` 看不见它）；
 *   · `for…in` —— 走**整条原型链**（`Object.create({bogus:1})` 那种继承来的键就是这一路）。
 *  先例：`kanban-columns/model.ts` 与 `relation-picker/model.ts` 的同名小件。
 */
export function assertKeys(raw: object, allowed: readonly string[], field: string): void {
  const bad: string[] = [];
  const note = (key: string): void => {
    if (!allowed.includes(key) && !bad.includes(key)) bad.push(key);
  };
  for (const key of Object.getOwnPropertyNames(raw)) note(key);
  for (const key in raw) note(key);
  if (bad.length > 0) {
    badInput(field + ' 里没有 `' + bad.join('`／`') + '` 这个键（入参表以外的键一律拒：'
      + '写错的键静默吞掉会让调用方以为自己设上了；继承来的与不可枚举的键同样算）');
  }
}

/** `CashWaterlineInput` 的键（顶层入参表：三形态的入参面合起来，逐字段照 `attrs.ts` 列全）。 */
export const CASH_WATERLINE_INPUT_KEYS = ['title', 'stamp', 'form', 'thresholdPct', 'days',
  'todayIndex', 'weeks', 'budget', 'inflow', 'outflow', 'inflowCount', 'outflowCount',
  'elapsedDays', 'remainDays', 'unit', 'note', 'extraClass'] as const;

/** `CashWaterlineDay` 的键（一天：`label`／`axisLabel`／`pct`／`spend`）。 */
export const CASH_WATERLINE_DAY_KEYS = ['label', 'axisLabel', 'pct', 'spend'] as const;

/** `CashWaterlineWeek` 的键（一周：`label`／`inflow`／`outflow`——**净与累计已用是本件算的**）。 */
export const CASH_WATERLINE_WEEK_KEYS = ['label', 'inflow', 'outflow'] as const;

/** `CashWaterlineFlowLine` 的键（进出水的一行：`name`／`amount`）。 */
export const CASH_WATERLINE_FLOW_LINE_KEYS = ['name', 'amount'] as const;

/* ── 各形态的读数（形状） ───────────────────────────────────────── */

/** 一天：逐字段校验（**日期非空且够短、余量 0–100、花费 ≥ 0**）。 */
export function reqDays(value: unknown): readonly CashWaterlineDay[] {
  return reqList(value, 'cash-waterline: input.days', CASH_WATERLINE_MAX_DAYS, '逐日读数，一天一条').map((one, i) => {
    assertPlainObject(one, 'cash-waterline: input.days[' + String(i) + ']');
    const day = one as Record<string, unknown>;
    const at = 'cash-waterline: input.days[' + String(i) + ']';
    assertKeys(day, CASH_WATERLINE_DAY_KEYS, at);
    const label = reqText(day.label, at + '.label');
    if (label.length > CASH_WATERLINE_MAX_LABEL_CHARS) {
      badInput(at + '.label 至多 ' + String(CASH_WATERLINE_MAX_LABEL_CHARS)
        + ' 个字符（点名那块只放得下短日期——请调用方给短日期）');
    }
    const axisLabel = day.axisLabel === undefined ? undefined
      : reqText(day.axisLabel, at + '.axisLabel');
    if (axisLabel !== undefined && axisLabel.length > CASH_WATERLINE_MAX_LABEL_CHARS) {
      badInput(at + '.axisLabel 至多 ' + String(CASH_WATERLINE_MAX_LABEL_CHARS)
        + ' 个字符（那一格只有一根柱子那么宽，长了会在窄档折成好几行）');
    }
    return {
      label,
      axisLabel,
      pct: reqInRange(day.pct, at + '.pct', 0, 100),
      spend: day.spend === undefined ? undefined : reqNonNegative(day.spend, at + '.spend'),
    };
  });
}

/** 一周：`inflow`／`outflow` 都是 ≥0 的有限数（净额与占比由本件算，**调用方不给**）。 */
export function reqWeeks(value: unknown): readonly CashWaterlineWeek[] {
  return reqList(value, 'cash-waterline: input.weeks', CASH_WATERLINE_MAX_WEEKS, '逐周读数，一周一条').map((one, i) => {
    assertPlainObject(one, 'cash-waterline: input.weeks[' + String(i) + ']');
    const w = one as Record<string, unknown>;
    const at = 'cash-waterline: input.weeks[' + String(i) + ']';
    assertKeys(w, CASH_WATERLINE_WEEK_KEYS, at);
    return {
      label: reqText(w.label, at + '.label'),
      inflow: reqNonNegative(w.inflow, at + '.inflow'),
      outflow: reqNonNegative(w.outflow, at + '.outflow'),
    };
  });
}

/** 进出水的一行（名字非空、金额 **> 0**：零金额的行看不见，也不该占一行）。 */
export function reqFlowLines(value: unknown, field: string): readonly CashWaterlineFlowLine[] {
  return reqList(value, field, CASH_WATERLINE_MAX_LINES, '明细行，一行一条').map((one, i) => {
    assertPlainObject(one, field + '[' + String(i) + ']');
    const line = one as Record<string, unknown>;
    assertKeys(line, CASH_WATERLINE_FLOW_LINE_KEYS, field + '[' + String(i) + ']');
    return {
      name: reqText(line.name, field + '[' + String(i) + '].name'),
      amount: reqPositive(line.amount, field + '[' + String(i) + '].amount'),
    };
  });
}
