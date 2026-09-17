// 心愿类·远端任务真删（#661 · 偏离 D-17／D-21）。
// 口径（本图负责人 2026-09-17 裁定 C）：删心愿**默认照老标完成**（飞书留「已完成」终态），
// 只有调用方显式带 `purge` 才走真删——两种语义用参数讲清，与契约「覆盖 vs 跳过由参数讲清」同一条道理。
// 真删走的是原生 resource `task tasks delete --task-guid <guid> --yes`（短路里没有 `+delete`，
// 本机 lark-cli 1.0.82 的 `task --help` 已核对）；老实现「只标完成」不是接口没有删除能力，
// 而是当时没走原生 resource 那条路（老代码自认的 `task 无 +delete shortcut` 一直是对的）。
import { listRelatedTasks } from '../fetch/tasks.js';
import { deleteTask } from '../fetch/taskWrite.js';

/** 真删远端任务。报错时先复核「是不是已经没有了」：远端任务早被手工删掉也算达成（幂等），
 *  否则才把失败上抛——免得任务被删过之后本地这条再也删不掉。 */
export function deleteRemoteWish(cli: string, taskId: string): void {
  try {
    deleteTask(cli, taskId);
    return;
  } catch (e) {
    const still = listRelatedTasks(cli).some((t) => t.guid === taskId);
    if (still) throw e;
  }
}
