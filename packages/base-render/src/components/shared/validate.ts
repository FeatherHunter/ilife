/** 组件层共用：入参校验小件（口径与 `blocks.ts` 的同名小件逐条一致——**同一个规矩不在两处各写一套**）。
 *
 *  错误类型：`BlocksError`（与区块层同名同形）。组件层不新造错误类：调用方按 `error.name` 分辨即可。
 */

/** 入参违规：抛 `BlocksError`（`name` 与区块层一致，调用方一条判据通吃）。 */
export function badInput(message: string): never {
  const err = new Error(message);
  err.name = 'BlocksError';
  throw err;
}

/** 必须是普通对象（数组／null 一律拒）。 */
export function assertPlainObject(value: unknown, field: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) badInput(field + ' 必须是对象');
}

/** 必填非空字符串。 */
export function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') badInput(field + ' 必须是非空字符串');
  return value;
}

/** 可选字符串：`undefined` 透传；空串按"未给"处理（与区块层同口径）。 */
export function optText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') badInput(field + ' 必须是字符串');
  return value === '' ? undefined : value;
}

/** 可选数字：数字收 `String(value)`；字串须非空非空白且 `Number()` 有限。 */
export function optNumeric(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) badInput(field + ' 必须是有限数字');
    return String(value);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '' || !Number.isFinite(Number(s))) badInput(field + ' 必须是数字串');
    return s;
  }
  badInput(field + ' 必须是数字或数字串');
}

/** 可选附加类名：空格分隔、逐个过类名正则（防注入任意选择器）。 */
export function optExtraClass(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') badInput(field + ' 必须是非空字符串');
  const names = value.trim().split(/\s+/);
  for (const name of names) {
    if (!/^-?[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) badInput(field + ' 只许空格分隔的类名：' + name);
  }
  return names.join(' ');
}

/** 数组**不许有洞**（稀疏数组一律拒）：`new Array(3)` 这种数组 `length` 照算，可
 *  `Array.prototype.map`／`forEach` 会**跳过**空洞、`for…of` 又会把洞取成 `undefined`
 *  ⇒ 校验遍历被跳过、渲染那一头在 `undefined` 上读字段，抛出来的是一枚 `TypeError`，
 *  不是 `BlocksError`（「非法入参一律 `badInput`」当场破功，且报错点离真正的错处很远）。
 *
 *  逐下标查 `hasOwnProperty`：`[undefined]`（**显式**给了 `undefined` 的密数组）不算洞——
 *  那种会在各件自己的逐项校验里被拒（元素不是对象），报错点照样点得准。
 */
export function assertDenseArray(value: readonly unknown[], field: string): void {
  for (let i = 0; i < value.length; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, i)) {
      badInput(field + '[' + String(i) + '] 是个空洞（稀疏数组）'
        + '：每个下标上都要真有一项（`new Array(n)` 这种写法先填满再传）');
    }
  }
}
