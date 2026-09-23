/** 搬件之后，「读源码的测试」一律读**族目录下的全部 .ts**。
 *
 *  为什么必须这样：目录化之后旧路径只剩一行薄转出——
 *   · 正向断言（从源码里抽 `cls('…')` 这类字面量）会抽到**空集**；
 *   · 否定式断言（`assert.ok(!src.includes('node:'))`）会**恒真**。
 *  两类都是假绿。批次④（charts）／⑤（controls）／⑥（style）各踩过一次，故提为共用小件。
 *
 *  用法：`readFamilySource('components/help')`（路径相对 `packages/base-render/src/`）。 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 读 `src/<relDir>/` 下全部 `.ts`，按文件名排序后拼起来（用 LF 连接，与仓库口径一致）。 */
export function readFamilySource(relDir) {
  const dir = fileURLToPath(new URL('../src/' + relDir + '/', import.meta.url));
  return readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()
    .map((f) => readFileSync(dir + f, 'utf8')).join(String.fromCharCode(10));
}

/** 同上，但读**产物面** `dist/<relDir>/` 下的全部 `.js`（依赖面断言要用它：
 *  旧路径 `dist/<件>.js` 在目录化之后只剩一行 `export *`，读它会得到空的依赖面）。 */
export function readFamilyDist(relDir) {
  const dir = fileURLToPath(new URL('../dist/' + relDir + '/', import.meta.url));
  return readdirSync(dir).filter((f) => f.endsWith('.js')).sort()
    .map((f) => readFileSync(dir + f, 'utf8')).join(String.fromCharCode(10));
}
