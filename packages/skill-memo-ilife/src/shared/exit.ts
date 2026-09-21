/** 唯一出口的失败约定（票 #855 从 `cli/cmd_read.ts` 提到共用位）。
 *
 * 干什么：把「错在哪一档」写成退出码 ＋ 一行 `ERR <码>: <人话>` 到 **stderr**（stdout 只许 evelope 那一行）。
 * 退出码口径（对齐 skilllink 冻结）：1 预检／2 用法与参数／3 key／4 取数超时／5 envelope 渲染落盘。
 *
 * 谁在用（写得出哪两个在用）：出口 `src/cli/cmd_read.ts` 与各域运行件（`src/search/run.ts` 起）——
 * 域里的参数校验要与出口同一档退出码，各写一份迟早走散（铁律二）。
 */
export function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}
