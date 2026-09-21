/** 行适配的**唯一定义地**（票 #855 从 `cli/cmd_read.ts` 提到共用位）。
 *
 * 干什么：把各域取数件吐出来的记录（`readonly object[]`，可能是实例或类实例）**摊平成纯记录**，
 * 再交给页面快照件（`querySnapshot`／`syncSnapshot`／`changeCategorySnapshot` 等）——快照件吃的是
 * 跨 JSON 边界的纯记录，不吃带原型的对象。
 *
 * 谁在用（写得出哪两个在用）：出口分派 `src/cli/cmd_read.ts` 与各域自己的运行件
 * （`src/wish/run.ts` 起）——同一个适配写两遍就是同一件事的第二处定义（铁律二）。
 */
export type PageRow = Record<string, unknown>;

/** 摊平：逐个浅拷贝成记录（不改原对象、不挑字段）。 */
export const toRows = (xs: readonly object[]): PageRow[] => xs.map((x) => ({ ...(x as PageRow) }));
