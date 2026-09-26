/** portion-gauge · **入参小件**（形状校验与数字写法；`model.ts` 只管「算什么」，本文件管「收不收」）。
 *
 *  为什么独立成件：本件两档（换算三栏／量感条）的行数与量感那一份都要逐字段校验，攒在 `model.ts` 里
 *  过了本包的行数告警线（350 行／LF 口径，见 `packages/base-render/AGENTS.md`）。分开之后：
 *   · **一个规矩只有一处**：读数怎么闸、键表怎么列、数怎么写，都只在本文件里；
 *   · **没有环**：本文件只依赖 `attrs.ts` 与 `shared/validate.ts`，`model.ts` 单向依赖它。
 *
 *  报错句的口径（别处也会读它）：每句都点名**路径**（`portion-gauge: input.rows[2].grams`）与**为什么**。
 */
import { assertDenseArray, assertPlainObject, badInput, optText, reqText } from '../shared/validate.js';
import {
  PORTION_GAUGE_MAX_ROWS,
  PORTION_GAUGE_MIN_ROWS,
  type PortionGaugeGauge,
  type PortionGaugeRow,
} from './attrs.js';
/** 必填文本：非空串**且不是全空白**（全空白的标题会在屏上留一块空白，那是“看得到的错”）。 */
export function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**（那会在屏上留一块空白）。 */
export function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可加性的量级上界（`Number.MAX_VALUE ÷ 2`）。**判据是「相加会不会溢出」，不是「好不好读」**：
 *  `|a| + |b| > Number.MAX_VALUE` 那一刻就是双精度的 `Infinity`，屏上写出 `1e+308` 这种读不出来的东西
 *  （本件实测：`grams = 1e308` 原样渲成 `1e+308 g`）。故 `1e21`／`1e-7`（十进制写法与指数写法的分界那一档）**照旧合法**。 */
const PORTION_GAUGE_MAGNITUDE_MAX = Number.MAX_VALUE / 2;

/** 读数的量级闸（上界住 `PORTION_GAUGE_MAGNITUDE_MAX`，那一档的数是**有限的**：`Number.isFinite(1e308)` 为真）。 */
function reqMagnitude(n: number, field: string): number {
  if (Math.abs(n) > PORTION_GAUGE_MAGNITUDE_MAX) {
    badInput(field + ' 的量级太大：两笔同量级的读数相加就溢出成 `Infinity`'
      + '（图上会写出 `1e+308` 这类读不出来的数；读数至多到 `Number.MAX_VALUE ÷ 2` 那一档）');
  }
  return n;
}

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉（先例：`relation-picker`／
 *  `kanban-columns` 的同名小件）。**两条都会被查到**（只走 `Object.keys` 会漏一半）：
 *   · `Object.getOwnPropertyNames` —— 自有的**全部**键，含**不可枚举**的；
 *   · `for…in` —— 走**整条原型链**（`Object.create({ zzUnknown: 1 })` 那种继承来的键就是这一路）。 */
export function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const bad: string[] = [];
  const note = (key: string): void => {
    if (!allowed.includes(key) && !bad.includes(key)) bad.push(key);
  };
  for (const key of Object.getOwnPropertyNames(raw)) note(key);
  for (const key in raw) note(key);
  if (bad.length > 0) {
    badInput(field + ' 里没有 `' + bad.join('`／`') + '` 这个键（入参表以外的键一律拒：写错的键静默吞掉会让'
      + '调用方以为自己设上了；继承来的与不可枚举的键同样算）');
  }
}

/** 顶层入参表的键（照 `attrs.ts` 的 `PortionGaugeInput` 列全：两个形态的字段都在表里——
 *  形状决定读哪一组，不读的那一组照收不误，**别把合法入参误拒**）。 */
export const INPUT_KEYS = ['title', 'form', 'stamp', 'tail', 'rows', 'gauge', 'note', 'missingCount', 'extraClass'] as const;
/** 换算一行的键（照 `attrs.ts` 的 `PortionGaugeRow`）。 */
const ROW_KEYS = ['name', 'kind', 'recipe', 'grams', 'basis', 'toLabel', 'shareOf', 'sharePct'] as const;
/** A 档那一份量感的键（照 `attrs.ts` 的 `PortionGaugeGauge`）。 */
const GAUGE_KEYS = ['name', 'usedPct', 'capText', 'refText', 'refPct', 'equiv'] as const;

/** 三位分组（`1200` → `1,200`；负号留在最前；小数部分原样）。
 *
 *  **指数写法原样返回**：量级大到（或小到）`String()` 只给指数写法时（`1e+21`／`1e-7`），
 *  按三位插逗号会把它切成 `1e,+21`／`1,e-7`——那是**读不出来的数**（同族先例
 *  `spread-dist/scale.ts` 的 `numText()`）。**非有限值一律 `badInput`**：写不出数的东西不上屏。 */
export function groupNum(value: number): string {
  if (!Number.isFinite(value)) badInput('portion-gauge: 要写的数必须是有限数（读不到 ' + String(value) + '）');
  const s = String(value);
  if (s.includes('e') || s.includes('E')) return s;
  const dot = s.indexOf('.');
  const head = dot < 0 ? s : s.slice(0, dot);
  const frac = dot < 0 ? '' : s.slice(dot);
  const neg = head.startsWith('-');
  const body = neg ? head.slice(1) : head;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ',';
    out += body[i];
  }
  return (neg ? '-' : '') + out + frac;
}

/** 一行的克数（有限数、量级可读、且大于 0）：0 与负数不是“一行菜的量”，小数照收（`12.5 g`）。 */
function reqGrams(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是有限数（`NaN`／`Infinity` 这类"写不成数的东西"一律拒）');
  }
  if (!(value > 0)) badInput(field + ' 必须大于 0（一行菜没有克数就谈不上换算）');
  return reqMagnitude(value, field);
}

/** 占比（有限数且落在 0…100）：越界的占比画出来会顶出轨道，不静默夹。 */
function reqSharePct(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数');
  if (!(value >= 0 && value <= 100)) badInput(field + ' 必须落在 0 到 100 之间（越界的占比会顶出轨道）');
  return reqMagnitude(Math.round(value * 10) / 10, field);
}

/** 换算各行：1–8 行；每一行的名字、菜谱写法、克数、占比项、占比都得到位。 */
export function reqRows(value: unknown): readonly PortionGaugeRow[] {
  if (!Array.isArray(value) || value.length < PORTION_GAUGE_MIN_ROWS) {
    badInput('portion-gauge: input.rows 至少 ' + String(PORTION_GAUGE_MIN_ROWS)
      + ' 行（一道菜也要换算，请调用方至少给一行）');
  }
  if (value.length > PORTION_GAUGE_MAX_ROWS) {
    badInput('portion-gauge: input.rows 最多 ' + String(PORTION_GAUGE_MAX_ROWS)
      + ' 行（再多一屏读不完，请调用方先按餐分组）');
  }
  assertDenseArray(value, 'portion-gauge: input.rows');
  return value.map((item, i) => {
    const at = 'portion-gauge: input.rows[' + String(i) + ']';
    assertPlainObject(item, at);
    const r = item as Record<string, unknown>;
    assertKeys(r, ROW_KEYS, at);
    const row: PortionGaugeRow = {
      name: reqRealText(r.name, at + '.name'),
      recipe: reqRealText(r.recipe, at + '.recipe'),
      grams: reqGrams(r.grams, at + '.grams'),
      shareOf: reqRealText(r.shareOf, at + '.shareOf'),
      sharePct: reqSharePct(r.sharePct, at + '.sharePct'),
    };
    const kind = optRealText(r.kind, at + '.kind');
    const basis = optRealText(r.basis, at + '.basis');
    const toLabel = optRealText(r.toLabel, at + '.toLabel');
    return {
      ...row,
      ...(kind === undefined ? {} : { kind }),
      ...(basis === undefined ? {} : { basis }),
      ...(toLabel === undefined ? {} : { toLabel }),
    };
  });
}

/** 缺换算有几样（非负整数、量级可读；0＝没有缺的）。**写法与克数同一处出**：屏上那个数经 `groupNum()`。 */
export function reqMissingCount(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    badInput('portion-gauge: input.missingCount 必须是非负整数（缺几样就写几样，没有缺的就不给）');
  }
  return reqMagnitude(value, 'portion-gauge: input.missingCount');
}

/** A 档那一份量感：名字、已用几成、上限那个量必给；**建议那句与它落的位置成对给**。 */
export function reqGauge(value: unknown): PortionGaugeGauge {
  assertPlainObject(value, 'portion-gauge: input.gauge');
  const g = value as Record<string, unknown>;
  const at = 'portion-gauge: input.gauge';
  assertKeys(g, GAUGE_KEYS, at);
  const name = reqRealText(g.name, at + '.name');
  const usedPct = reqSharePct(g.usedPct, at + '.usedPct');
  const capText = reqRealText(g.capText, at + '.capText');
  const refText = optRealText(g.refText, at + '.refText');
  const refPct = g.refPct === undefined ? undefined : reqSharePct(g.refPct, at + '.refPct');
  if ((refText === undefined) !== (refPct === undefined)) {
    badInput(at + ' 的一餐建议要**成对**给（`refText` 那句字与 `refPct` 它落在几成处）——'
      + '只给一样，那句参照要么没地方挂，要么挂在编出来的位置上');
  }
  const equiv = optRealText(g.equiv, at + '.equiv');
  return {
    name,
    usedPct,
    capText,
    ...(refText === undefined ? {} : { refText, refPct }),
    ...(equiv === undefined ? {} : { equiv }),
  };
}
