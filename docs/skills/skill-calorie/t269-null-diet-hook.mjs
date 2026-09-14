/** t269 终验用 · 加载钩子：把编译产物里的 `dist/diet/receipt.js` 换成恒返回 null 的替身。
 *  这样同一棵树、同一份编译产物跑出来的产物＝“本票那一行 `?? dietReceiptDoc(...)` 未接线”的行为。 */
const STUB = new URL('./t269-null-diet-stub.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  const r = await next(specifier, context);
  if (typeof r.url === 'string' && r.url.endsWith('/dist/diet/receipt.js')) {
    return { url: STUB, format: 'module', shortCircuit: true };   // 替身与真件同形，只导出 dietReceiptDoc
  }
  return r;
}
