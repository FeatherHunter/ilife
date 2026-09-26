/** reminder-setter · **本件自用的那几条入参守卫**（两个形态共用一份：抄第二份迟早走散）。
 *
 *  为什么提出来：本件两个形态（`decisions` ／ `track`）的校验分住 `model.ts` 与 `model-track.ts`，
 *  而「未知键一律拒」「文本不能全空白」「读数是有限数」这几条是**同一份口径**——
 *  两处各写一遍，改了一处另一处就成了漏网（本批已有件栽在「只有一半对象层查未知键」上）。
 *
 *  **非法入参一律 `badInput()`**（抛 `BlocksError`）：不静默降级、不「尽量猜」。
 */
import { assertDenseArray, assertPlainObject, badInput, reqText } from '../shared/validate.js';

/** 不可见字符：零宽与格式那一类（`\u200b` 零宽空格、`\u200c/\u200d` 连接符、`\u200e/\u200f` 方向标记、
 *  `\u2060` 词连接符、`\ufeff` 零宽不换行空格、`\u00ad` 软连字符）。**`String.prototype.trim()` 不管它们**
 *  ——它按 Unicode WhiteSpace 剥，这几个是格式类（Cf）——所以「全空白」的判定得先把它们剥掉。 */
const INVISIBLE_RE = /[\u00ad\u200b-\u200f\u2060\ufeff]/g;

/** 「在屏上就是一块空白」：剥掉不可见字符再 `trim()`，剩下的还是空。 */
export function isBlank(text: string): boolean {
  return text.replace(INVISIBLE_RE, '').trim() === '';
}

/** 机器值：非空、**只许标识符字符**（它要当 `data-*` 的值使）。 */
export function reqIdentifier(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(text)) {
    badInput(field + ' 只许标识符字符（字母、数字、下划线、连字符），它还要当 data-* 的值用');
  }
  return text;
}

/** 必填文本：非空串**且不是全空白**（全空白——含零宽那类不可见字符——会在屏上留一块空白，那是看得到的错）。 */
export function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (isBlank(text)) badInput(field + ' 必须是真正的文本（全空白不算，零宽字符这类不可见字符也不算）');
  return text;
}

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。
 *
 *  **两条都会被查到**（只走 `Object.keys` 会漏一半）：
 *   · `Object.getOwnPropertyNames` —— 自有的**全部**键，含**不可枚举**的；
 *   · `for…in` —— 走**整条原型链**（继承来的键就是这一路）。
 */
export function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
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

/** 可加性的量级上界（`Number.MAX_VALUE ÷ 2`）。**判据是「相加会不会溢出」，不是「好不好读」**——
 *  口径与先例 `gap-band/model.ts` 的 `reqNumber()` 同一份。 */
const MAGNITUDE_MAX = Number.MAX_VALUE / 2;

/** 一个读数：有限数（`NaN`／`Infinity`／数字串一律拒）**且在可加性上界之内**。
 *
 *  两道闸各管一半：**非有限即拒**（`NaN`／`±Infinity` 写不成数）；**可加性溢出即拒**
 *  （`1e308` 是有限数，可它与任何同量级的读数相加就成 `Infinity`，屏上会写出 `1e+308` 那种读不出来的数）。 */
export function reqNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是有限数（`NaN`／`Infinity` 这类"写不成数的东西"一律拒）');
  }
  if (Math.abs(value) > MAGNITUDE_MAX) {
    badInput(field + ' 的量级太大：两笔同量级的读数相加就溢出成 `Infinity`'
      + '（屏上会写出 `1e+308` 这类读不出来的数；读数至多到 `Number.MAX_VALUE ÷ 2` 那一档）');
  }
  return value;
}

/** 一排可点项 → 一行（逐字段校验；键在同排内唯一）。 */
export function reqOptions(value: unknown, field: string, min: number, max: number): { key: string; label: string }[] {
  if (!Array.isArray(value)) badInput(field + ' 必须是数组（一排 ' + String(min) + '–' + String(max) + ' 档）');
  assertDenseArray(value, field);
  if (value.length < min || value.length > max) {
    badInput(field + ' 要 ' + String(min) + '–' + String(max) + ' 档，读到 ' + String(value.length) + ' 档');
  }
  const seen = new Set<string>();
  return value.map((one, i) => {
    const at = field + '[' + String(i) + ']';
    assertPlainObject(one, at);
    const raw = one as Record<string, unknown>;
    assertKeys(raw, OPTION_KEYS, at);
    const key = reqIdentifier(raw.key, at + '.key');
    if (seen.has(key)) badInput(at + '.key 与这一排前面某一档重了（同一排内键唯一）');
    seen.add(key);
    const label = reqRealText(raw.label, at + '.label');
    return { key, label };
  });
}

/** `ReminderSetterOption` 的键（一档可选值的入参表）。 */
export const OPTION_KEYS = ['key', 'label'] as const;

/** 选中的那一档：必须真的在这一排里（不然屏上没有任何一枚是选中的，而复述会念出空档名）。 */
export function reqPicked(keys: readonly { key: string }[], value: unknown, field: string): string {
  const key = reqIdentifier(value, field);
  if (!keys.some((o) => o.key === key)) badInput(field + ' 没有命中那一排里的任何一档: ' + key);
  return key;
}

/** 勾上的那一串：0–`max` 个，每个都要命中 `keys`，且不许重复。 */
export function reqChosen(keys: readonly { key: string }[], value: unknown, field: string, max: number): string[] {
  if (!Array.isArray(value)) badInput(field + ' 必须是数组（一条通知都不勾请显式给 []）');
  assertDenseArray(value, field);
  const out: string[] = [];
  value.forEach((one, i) => {
    const at = field + '[' + String(i) + ']';
    const key = reqIdentifier(one, at);
    if (out.includes(key)) badInput(at + ' 与前面某一档重了（同一条通知勾两次没有意义）');
    if (!keys.some((o) => o.key === key)) badInput(at + ' 没有命中 routes 里的任何一档: ' + key);
    out.push(key);
  });
  if (out.length > max) badInput(field + ' 至多勾 ' + String(max) + ' 条，读到 ' + String(out.length) + ' 条');
  return out;
}
