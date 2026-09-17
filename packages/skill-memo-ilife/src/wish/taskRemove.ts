// 心愿类·远端任务删除（#661 · 偏离 D-06）。
// 老行为：删心愿时本地硬删、远端只调 `complete_wish_sync` 标完成，飞书任务永远留着
// （`memo_cli.py:414-417`；代码自认「task 无 +delete shortcut」，`feishu_sync.py:834`）。
// 新行为：删心愿＝**两侧都确保没有**——远端先删，删干净了才删本地，不留不可回滚的半成品。
import { listRelatedTasks } from '../fetch/tasks.js';
import { deleteTask } from '../fetch/taskWrite.js';

/** 删远端任务。报错时先复核「是不是已经没有了」：远端任务早被手工删掉也算达成（幂等），
 *  否则才把失败上抛——免得好任务被删过后本地这条再也删不掉。 */
export function deleteRemoteWish(cli: string, taskId: string): void {
  try {
    deleteTask(cli, taskId);
    return;
  } catch (e) {
    const still = listRelatedTasks(cli).some((t) => t.guid === taskId);
    if (still) throw e;
  }
}
