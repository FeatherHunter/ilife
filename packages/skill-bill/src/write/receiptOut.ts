/** 写入域·写命令的结果载荷（#689 结构搬迁第三批：从 `src/render/views.ts` 的 `buildRecordReceipt` 来）。
 *  一件事实：写类命令的 envelope 载荷 `{ ok: true, message }`（形状照 `src/shared/commandSpec.ts` 的
 *  `WriteOut['data']` 前两格：`ok` ＋ `message`；`receipt` 那一格由 `./write.ts` 另加）。
 *  `src/render/views.ts` 已随本批拆散删除，载荷的唯一书写位就是本件。
 *
 *  谁在用（指名）：
 *    · `./write.ts`——记一笔／改记录两条命令写库成功后的回执载荷；
 *    · `src/cli/cmd_read.ts`——goal／account／link／setup 四族**尚未迁移**命令的分派（经 `./index.js` 门取），
 *      以及 setup 的导入分支；这些命令各自搬进本域后，那一处消费随之消失。 */
export function buildRecordReceipt(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
}
