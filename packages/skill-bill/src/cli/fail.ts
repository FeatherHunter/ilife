/** #1198 · 记账出口的失败口（`ERR <码>: <报文>` ＋ `process.exit`）。
 *
 *  为什么单立一件：出口件 `cmd_read.ts` 正被 #686 棘轮钉着（只许变短），语言选择包装件要用同一只失败口，
 *  而两件互相 import 会成环——所以把这一行搬出来，两件都从这里取。 */
export function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}
