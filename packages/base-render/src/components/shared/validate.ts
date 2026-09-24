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
